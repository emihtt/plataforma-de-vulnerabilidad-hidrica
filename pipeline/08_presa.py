"""Paso 08. Presa Valle de Bravo.

Fuente principal: reportes diarios «Almacenamiento en presas del Sistema Cutzamala» de Conagua
(Organismo de Cuenca Aguas del Valle de México), un PDF por mes.
Respaldos, solo para fechas que los reportes no cubran: servicio de datos de Conagua (SINA) y,
al final, la semilla capturada a mano. Nunca se interpola.
"""
from __future__ import annotations

import html
import json
import re
import time
from datetime import date, timedelta

import pandas as pd
from pypdf import PdfReader

from comun import CRUDO, PUBLICO, SEMILLA, anotar_estado, descargar, escribir_json, hoy, registrar_fuente
from cutzamala import CAPACIDAD_VALLE_DE_BRAVO_MM3, anio_de_pagina, filas_valle_de_bravo, mes_de_pagina

PAGINA = "https://www.gob.mx/conagua/documentos/almacenamiento-en-presas-del-sistema-cutzamala"
BASE = "https://www.gob.mx"
URL_SINA = "https://sinav30.conagua.gob.mx:8080/PresasPG/presas/reporte/{fecha}"
CLAVE_SINA = "VBRMX"
DESDE = 2019                       # la serie mensual empieza en enero de 2019
NAVEGADOR = {"User-Agent": "Mozilla/5.0 (pipeline de datos públicos)"}
DIR = CRUDO / "conagua_cutzamala"
por_nombre: list[str] = []          # meses cuyo mes se tomó del nombre del archivo
detalle_conflictos: list[tuple] = []


def enlaces_de_reportes() -> list[str]:
    """Direcciones de los PDF mensuales listados en la página de Conagua (la página se vuelve a bajar en cada corrida)."""
    destino = DIR / "pagina.html"
    if destino.exists():
        destino.unlink()
    descargar(PAGINA, destino, timeout=60, headers=NAVEGADOR)
    texto = destino.read_text(encoding="utf-8", errors="ignore")
    vistos, salida = set(), []
    for ruta in re.findall(r'(/cms/uploads/attachment/file/\d+/[^"\']+\.pdf)', texto):
        ruta = html.unescape(ruta)
        if ruta not in vistos:
            vistos.add(ruta)
            salida.append(BASE + ruta)
    return salida


def leer_reportes(enlaces: list[str]):
    """Devuelve ({fecha: (almacenamiento, porcentaje, url)}, avisos, número de fechas con valores distintos entre reportes).

    Los archivos se leen página por página: varios traen más de un mes, y el nombre del archivo
    no siempre coincide con el mes que contiene. Manda el encabezado de cada página.
    """
    diario, avisos, conflictos = {}, [], 0
    por_nombre.clear()
    hoy_ = date.today()
    # Del más antiguo al más reciente: si dos reportes difieren en un día, queda el publicado después.
    for url in sorted(enlaces, key=lambda u: int(u.split("/file/")[1].split("/")[0])):
        numero = url.split("/file/")[1].split("/")[0]
        destino = DIR / f"{numero}_{url.rsplit('/', 1)[1]}"
        nuevo = not destino.exists()
        try:
            descargar(url, destino, timeout=90, reintentos=1, headers=NAVEGADOR)
            if nuevo:
                time.sleep(0.6)
            paginas = [(p.extract_text() or "") for p in PdfReader(str(destino)).pages]
        except Exception as e:  # noqa: BLE001
            avisos.append(f"no se pudo leer {url} ({type(e).__name__})")
            continue
        anio_doc = next((a for a in map(anio_de_pagina, paginas) if a), None)
        leidas, mes_en_curso = 0, False
        for texto in paginas:
            filas = filas_valle_de_bravo(texto)
            if not filas:
                continue
            anio, mes = anio_de_pagina(texto) or anio_doc, mes_de_pagina(texto)
            if anio and not mes and sum(1 for t in paginas if filas_valle_de_bravo(t)) == 1:
                # La página no trae el mes como texto: se toma del nombre del archivo y se deja constancia.
                mes = mes_de_pagina(url.rsplit("/", 1)[1].replace("_", " ").replace(".pdf", ""))
                if mes:
                    por_nombre.append(f"{anio}-{mes:02d}")
            if not anio or not mes:
                avisos.append(f"página con datos pero sin año o mes reconocible en {url}")
                continue
            if anio < DESDE:
                continue
            mes_en_curso = mes_en_curso or (anio, mes) == (hoy_.year, hoy_.month)
            for dia, alm, pct in filas:
                try:
                    f = date(anio, mes, dia)
                except ValueError:
                    continue
                if f > hoy_:
                    continue
                clave = f.isoformat()
                if clave in diario and abs(diario[clave][0] - alm) > 0.01:
                    conflictos += 1
                    detalle_conflictos.append((clave, diario[clave][0], alm))
                diario[clave] = (alm, pct, url)
                leidas += 1
        # El reporte del mes en curso cambia cada día: no se conserva en caché.
        if mes_en_curso:
            destino.unlink(missing_ok=True)
    return diario, avisos, conflictos


def consultar_sina(fecha: str):
    destino = CRUDO / "presas" / f"{fecha}.json"
    try:
        descargar(URL_SINA.format(fecha=fecha), destino, timeout=40, reintentos=1)
        datos = json.loads(destino.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None
    for reg in datos:
        if reg.get("clavesih") == CLAVE_SINA and "Valle de Bravo" in reg.get("nommunicipio", ""):
            if reg.get("almacenaactual") is not None and reg.get("namoalmac"):
                return reg
    return None


def main() -> None:
    DIR.mkdir(parents=True, exist_ok=True)
    diario, avisos, conflictos = {}, [], 0
    try:
        enlaces = enlaces_de_reportes()
        diario, avisos, conflictos = leer_reportes(enlaces)
    except Exception as e:  # noqa: BLE001
        avisos.append(f"no se pudo abrir la página de reportes ({type(e).__name__})")

    serie = []
    if diario:
        fechas = sorted(diario)
        ultima = fechas[-1]
        # Un corte por semana (lunes) y, además, el último día publicado.
        for f in fechas:
            if date.fromisoformat(f).weekday() == 0 or f == ultima:
                alm, pct, _ = diario[f]
                serie.append({"fecha": f, "porcentaje": pct, "almacenamiento_mm3": alm, "origen": "reporte"})
    n_reporte = len(serie)

    # Respaldo 1: servicio SINA, solo para semanas que los reportes no cubran (desde 2023).
    cubiertas = {s["fecha"] for s in serie}
    n_sina = 0
    f, fin = date(2023, 1, 2), date.today()
    while f <= fin and not (diario and f.isoformat() >= min(diario)):
        reg = consultar_sina(f.isoformat())
        if reg and f.isoformat() not in cubiertas:
            cap = float(reg["namoalmac"])
            serie.append({"fecha": f.isoformat(), "porcentaje": round(100 * float(reg["almacenaactual"]) / cap, 2),
                          "almacenamiento_mm3": round(float(reg["almacenaactual"]), 3), "origen": "servicio"})
            n_sina += 1
        f += timedelta(days=7)

    # Respaldo 2: semilla capturada a mano, solo si no hay ningún dato oficial posterior.
    n_semilla = 0
    semilla = pd.read_csv(SEMILLA / "presa_valle_de_bravo.csv")
    ultima_oficial = max((s["fecha"] for s in serie), default="")
    for _, r in semilla.iterrows():
        if r["fecha"] > ultima_oficial:
            n_semilla += 1
            serie.append({"fecha": r["fecha"], "porcentaje": float(r["porcentaje_llenado"]),
                          "almacenamiento_mm3": None if pd.isna(r["almacenamiento_mm3"]) else float(r["almacenamiento_mm3"]),
                          "origen": "semilla", "fuente": r["fuente"], "url": r["url"]})
    serie.sort(key=lambda s: s["fecha"])
    if not serie:
        raise RuntimeError("No hay ningún dato de la presa: ni reportes, ni servicio, ni semilla")
    ultimo = serie[-1]

    # Promedio mensual de los días publicados (para contrastes con otras series mensuales).
    mensual = []
    if diario:
        tabla = pd.DataFrame([(f[:7], a, p) for f, (a, p, _) in diario.items()], columns=["mes", "alm", "pct"])
        for mes, g in tabla.groupby("mes"):
            mensual.append({"mes": mes, "almacenamiento_mm3": round(float(g["alm"].mean()), 3),
                            "porcentaje": round(float(g["pct"].mean()), 2), "dias": int(len(g))})

    esperados = [f"{a}-{m:02d}" for a in range(DESDE, date.today().year + 1) for m in range(1, 13)
                 if (a, m) <= (date.today().year, date.today().month)]
    faltantes = [m for m in esperados if m not in {x["mes"] for x in mensual}] if diario else esperados
    url_ultimo = diario[ultimo["fecha"]][2] if ultimo["origen"] == "reporte" else None
    escribir_json(PUBLICO / "presa.json", {
        "presa": "Valle de Bravo", "capacidad_mm3": CAPACIDAD_VALLE_DE_BRAVO_MM3,
        "capacidad_nota": "Capacidad que indica el reporte de Conagua para la presa",
        "origen": ultimo["origen"], "ultima_actualizacion": ultimo["fecha"],
        "fuente": {"institucion": "Conagua, Organismo de Cuenca Aguas del Valle de México",
                   "nombre": "Almacenamiento en presas del Sistema Cutzamala (reporte diario)",
                   "url": PAGINA, "url_ultimo_reporte": url_ultimo},
        "desde": serie[0]["fecha"], "generado": hoy(), "serie": serie, "mensual": mensual}, compacto=True)

    registrar_fuente(
        "conagua_presas", nombre="Almacenamiento en presas del Sistema Cutzamala, reportes diarios por mes",
        institucion="Conagua, Organismo de Cuenca Aguas del Valle de México", url=PAGINA,
        fecha_dato=f"{serie[0]['fecha']} a {ultimo['fecha']}", fecha_descarga=hoy(),
        licencia="Datos abiertos del Gobierno de México",
        estado="ok" if ultimo["origen"] == "reporte" else ("respaldo" if n_reporte else "sin_dato"),
        usada_en="Serie y último registro del llenado de la presa; semáforo de presa",
        nota=(f"{len(diario):,} días leídos de los reportes en PDF; en pantalla, un corte por semana (lunes) y el último día "
              f"publicado. El porcentaje es almacenamiento entre capacidad ({CAPACIDAD_VALLE_DE_BRAVO_MM3} millones de m³). "
              "Cada fila se acepta solo si almacenamiento y porcentaje son consistentes con esa capacidad."
              + f" Meses sin reporte legible: {', '.join(faltantes) if faltantes else 'ninguno'}."
              + (f" En {conflictos} días dos reportes dan valores distintos; se usa el publicado después." if conflictos else "")))
    registrar_fuente(
        "presa_semilla", nombre="Cortes de la presa capturados a mano (respaldo)",
        institucion="Conagua, reportes diarios; capturados a mano",
        url=PAGINA, fecha_dato=str(semilla["fecha"].max()), fecha_descarga="2026-11-26",
        licencia="Datos abiertos del Gobierno de México", estado="ok" if n_semilla == 0 else "respaldo",
        usada_en="Solo si los reportes de Conagua no pueden leerse",
        nota=("No se usó en esta corrida: todos los datos vienen de los reportes oficiales." if n_semilla == 0
              else f"Se usaron {n_semilla} cortes de respaldo posteriores al último dato oficial. No se interpola."))
    anotar_estado("Presa Valle de Bravo (Conagua)",
                  f"Fuente principal: reportes diarios del Organismo de Cuenca Aguas del Valle de México ({PAGINA}). "
                  f"Se leyeron {len(diario):,} días entre {min(diario) if diario else 'sin dato'} y {max(diario) if diario else 'sin dato'}; "
                  f"la serie publicada tiene {n_reporte} cortes de esos reportes, {n_sina} del servicio SINA y {n_semilla} de la semilla. "
                  f"Último registro: {ultimo['fecha']}, {ultimo['porcentaje']} % ({ultimo['origen']}). "
                  f"Meses sin reporte legible: {', '.join(faltantes) if faltantes else 'ninguno'}. "
                  f"Días con valores distintos entre dos reportes: {conflictos}. "
                  + (f"Mes tomado del nombre del archivo porque la página no lo trae como texto: {', '.join(sorted(set(por_nombre)))}. " if por_nombre else "")
                  +
                  "Ya no se usan notas de prensa. "
                  + ("Avisos: " + "; ".join(avisos[:8]) + ("…" if len(avisos) > 8 else "") if avisos else "Sin avisos de lectura."))
    print(f"Presa: {len(diario):,} días de reportes ({min(diario) if diario else '-'} a {max(diario) if diario else '-'}); "
          f"serie: {n_reporte} reporte, {n_sina} SINA, {n_semilla} semilla; último {ultimo['fecha']} {ultimo['porcentaje']} % ({ultimo['origen']}); "
          f"{len(mensual)} meses; faltan {faltantes}; conflictos {conflictos}; avisos: {len(avisos)}")
    for a in avisos[:12]:
        print("  aviso:", a)


if __name__ == "__main__":
    main()
