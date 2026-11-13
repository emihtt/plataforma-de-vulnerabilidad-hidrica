"""Paso 08. Presa Valle de Bravo: servicio de Conagua donde responde y semilla capturada a mano."""
from __future__ import annotations

import json
from datetime import date, timedelta

import pandas as pd

from comun import CRUDO, PUBLICO, SEMILLA, anotar_estado, descargar, escribir_json, hoy, registrar_fuente

URL = "https://sinav30.conagua.gob.mx:8080/PresasPG/presas/reporte/{fecha}"
CLAVE = "VBRMX"


def consultar(fecha: str, cache: bool = True):
    """Registro de la presa para esa fecha, o None si el servicio no trae datos."""
    destino = CRUDO / "presas" / f"{fecha}.json"
    try:
        if not cache and destino.exists():
            destino.unlink()
        descargar(URL.format(fecha=fecha), destino, timeout=40, reintentos=1)
        datos = json.loads(destino.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None
    for reg in datos:
        if reg.get("clavesih") == CLAVE and "Valle de Bravo" in reg.get("nommunicipio", ""):
            return reg
    return None


def punto(fecha: str, reg: dict) -> dict:
    cap = float(reg["namoalmac"])
    return {"fecha": fecha, "porcentaje": round(100 * float(reg["almacenaactual"]) / cap, 2),
            "almacenamiento_mm3": round(float(reg["almacenaactual"]), 3), "origen": "servicio"}


def main() -> None:
    serie, capacidad = [], None
    f, fin = date(2023, 1, 2), date.today()
    while f <= fin:
        reg = consultar(f.isoformat())
        if reg and reg.get("almacenaactual") is not None and reg.get("namoalmac"):
            capacidad = float(reg["namoalmac"])
            serie.append(punto(f.isoformat(), reg))
        f += timedelta(days=7)
    for dias in range(1, 6):          # fecha más reciente; no se guarda en caché porque puede aparecer después
        reciente = (fin - timedelta(days=dias)).isoformat()
        reg = consultar(reciente, cache=False)
        if reg and reg.get("almacenaactual") is not None and reg.get("namoalmac"):
            if reciente not in {s["fecha"] for s in serie}:
                serie.append(punto(reciente, reg))
            break
    ultima_servicio = max((s["fecha"] for s in serie), default=None)
    n_serv = len(serie)

    semilla = pd.read_csv(SEMILLA / "presa_valle_de_bravo.csv")
    fechas_servicio = {s["fecha"] for s in serie}
    n_sem = 0
    for _, r in semilla.iterrows():
        if r["fecha"] in fechas_servicio:
            continue
        n_sem += 1
        serie.append({"fecha": r["fecha"], "porcentaje": float(r["porcentaje_llenado"]),
                      "almacenamiento_mm3": None if pd.isna(r["almacenamiento_mm3"]) else float(r["almacenamiento_mm3"]),
                      "origen": "semilla", "fuente": r["fuente"], "url": r["url"],
                      "nota": None if pd.isna(r["nota"]) else r["nota"]})
        if capacidad is None and not pd.isna(r["capacidad_mm3"]):
            capacidad = float(r["capacidad_mm3"])
    serie.sort(key=lambda s: s["fecha"])
    ultimo = serie[-1]
    escribir_json(PUBLICO / "presa.json", {
        "presa": "Valle de Bravo", "capacidad_mm3": capacidad,
        "capacidad_nota": "Capacidad al nivel de aguas máximas ordinarias, según Conagua",
        "origen": ultimo["origen"], "ultima_actualizacion": ultimo["fecha"], "ultima_fecha_servicio": ultima_servicio,
        "generado": hoy(), "serie": serie})
    registrar_fuente(
        "conagua_presas", nombre="Almacenamiento diario de las principales presas (Sistema Nacional de Información del Agua)",
        institucion="Conagua", url="https://sinav30.conagua.gob.mx:8080/",
        fecha_dato=f"2023-01-02 a {ultima_servicio}" if ultima_servicio else None, fecha_descarga=hoy(),
        licencia="Datos abiertos del Gobierno de México",
        estado="ok" if ultimo["origen"] == "servicio" else ("respaldo" if n_serv else "sin_dato"),
        usada_en="Serie histórica del llenado de la presa",
        nota=(f"El servicio devolvió datos hasta {ultima_servicio}; para fechas posteriores responde vacío. "
              f"{n_serv} cortes semanales. El porcentaje es almacenamiento entre capacidad al nivel de aguas máximas ordinarias."
              if n_serv else "El servicio no devolvió datos."))
    registrar_fuente(
        "presa_semilla", nombre="Nivel de la presa capturado a mano de notas de prensa que citan a Conagua",
        institucion="Conagua, citada por medios (cada corte conserva su nota de origen)",
        url=str(semilla.iloc[-1]["url"]), fecha_dato=str(semilla["fecha"].max()), fecha_descarga="2026-11-13",
        licencia="Cita de notas periodísticas", estado="respaldo" if ultimo["origen"] == "semilla" else "ok",
        usada_en="Último dato de la presa y cortes recientes",
        nota=f"{n_sem} cortes capturados a mano. No se interpola entre cortes.")
    origen_txt = ("la semilla: en pantalla dice «último dato capturado a mano»" if ultimo["origen"] == "semilla"
                  else "el servicio")
    anotar_estado("Presa Valle de Bravo (Conagua)",
                  f"El servicio de Conagua respondió, pero solo trae datos hasta {ultima_servicio}; para fechas recientes "
                  f"devuelve una lista vacía. Se usan {n_serv} cortes semanales del servicio y {n_sem} cortes de la semilla "
                  f"capturada a mano. El último dato ({ultimo['fecha']}, {ultimo['porcentaje']} %) viene de {origen_txt}. "
                  "El Sistema de Información Hidrológica respondió a la prueba, pero no se exploró como vía alterna.")
    print(f"Presa: {n_serv} cortes del servicio (hasta {ultima_servicio}), {n_sem} de semilla; "
          f"último {ultimo['fecha']} {ultimo['porcentaje']} % ({ultimo['origen']})")


if __name__ == "__main__":
    main()
