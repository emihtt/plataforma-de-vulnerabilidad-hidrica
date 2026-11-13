"""Hito 0. Prueba cada fuente de la versión 0 con una solicitud pequeña (20 s) y escribe ESTADO_DATOS.md."""
from __future__ import annotations

import warnings
from datetime import date, timedelta

import requests

from comun import AGENTE, ESTADO_MD, PROCESADO, escribir_json, hoy

warnings.filterwarnings("ignore")
LIMITE = 20
AYER = (date.today() - timedelta(days=2)).isoformat()

# (clave, nombre, método, url, respaldo si falla, opciones)
FUENTES = [
    ("iter_15", "Censo 2020, ITER Estado de México (INEGI)", "HEAD",
     "https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_15csv20.zip",
     "Descarga manual desde SCITEL a data/crudo/", {}),
    ("iter_nal", "Censo 2020, ITER nacional (INEGI)", "HEAD",
     "https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_nalcsv20.zip",
     "Sin cifra nacional (pantalla la omite)", {}),
    ("iter_dicc", "Diccionario de datos del ITER (INEGI)", "HEAD",
     "https://www.inegi.org.mx/app/scitel/doc/descriptor/fd_iter_cpv2020.csv",
     "Diccionario incluido en el zip del ITER", {}),
    ("overpass", "OpenStreetMap, API Overpass", "GET",
     "https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%281%29%3Bout%3B", "Overpass kumi.systems", {}),
    ("overpass_kumi", "OpenStreetMap, Overpass (respaldo kumi.systems)", "GET",
     "https://overpass.kumi.systems/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%281%29%3Bout%3B", "Envolvente de localidades, 'contorno aproximado'", {}),
    ("conapo", "Índice de marginación por localidad 2020 (Conapo)", "GET",
     "https://www.gob.mx/conapo/documentos/indices-de-marginacion-2020-284372",
     "Índice de carencias propio con el ITER", {}),
    ("daymet", "Daymet, lluvia diaria por punto (ORNL DAAC)", "GET",
     "https://daymet.ornl.gov/single-pixel/api/data?lat=19.195&lon=-100.131&vars=prcp&start=2023-12-01&end=2023-12-31",
     "Open-Meteo, archivo histórico", {}),
    ("openmeteo_archivo", "Open-Meteo, archivo histórico", "GET",
     "https://archive-api.open-meteo.com/v1/archive?latitude=19.195&longitude=-100.131&start_date=2023-12-01&end_date=2023-12-05&daily=precipitation_sum&timezone=America%2FMexico_City",
     "Sin normales de lluvia", {}),
    ("openmeteo_pronostico", "Open-Meteo, pronóstico", "GET",
     "https://api.open-meteo.com/v1/forecast?latitude=19.195&longitude=-100.131&daily=precipitation_sum&past_days=1&forecast_days=1&timezone=America%2FMexico_City",
     "Pantalla muestra último dato guardado", {}),
    ("conagua_presas", "Conagua, almacenamiento diario de presas (SINA)", "GET",
     f"https://sinav30.conagua.gob.mx:8080/PresasPG/presas/reporte/{AYER}",
     "Semilla capturada a mano", {}),
    ("conagua_sih", "Conagua, Sistema de Información Hidrológica", "GET",
     "https://sih.conagua.gob.mx/", "Semilla capturada a mano", {}),
    ("smn_pronostico", "Servicio Meteorológico Nacional, pronóstico por municipio", "GET",
     "https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1",
     "Solo pronóstico de Open-Meteo", {}),
    ("openfreemap", "OpenFreeMap, estilo de mapa base", "GET",
     "https://tiles.openfreemap.org/styles/positron", "Solo capas propias", {}),
]


def probar(metodo: str, url: str, opciones: dict) -> tuple[bool, str]:
    try:
        r = requests.request(metodo, url, headers=AGENTE, timeout=LIMITE, stream=True,
                             allow_redirects=True, **opciones)
        primer = b""
        if metodo == "GET":
            primer = next(r.iter_content(2048), b"")
        tam = r.headers.get("Content-Length")
        detalle = f"HTTP {r.status_code}"
        if tam:
            detalle += f", {int(tam) / 1e6:.1f} MB"
        tipo = r.headers.get("Content-Type", "").split(";")[0]
        if tipo:
            detalle += f", {tipo}"
        r.close()
        ok = r.status_code == 200 and (metodo == "HEAD" or len(primer) > 0)
        return ok, detalle
    except Exception as e:  # noqa: BLE001
        return False, type(e).__name__ + ": " + str(e)[:90].replace("|", "/").replace("\n", " ")


def main() -> None:
    filas, resultado = [], {}
    for clave, nombre, metodo, url, respaldo, opc in FUENTES:
        ok, detalle = probar(metodo, url, opc)
        resultado[clave] = {"ok": ok, "detalle": detalle, "url": url}
        estado = "Respondió" if ok else "No respondió"
        filas.append(f"| {nombre} | <{url}> | {estado} ({detalle}) | {hoy()} | {respaldo} |")
        print(f"{'OK ' if ok else 'XX '} {clave:22s} {detalle}")
    escribir_json(PROCESADO / "prueba_fuentes.json", {"fecha": hoy(), "fuentes": resultado})

    tabla = "\n".join([
        "<!-- tabla:inicio -->",
        f"Prueba de fuentes del {hoy()} (una solicitud pequeña por fuente, límite de {LIMITE} segundos). "
        "Es solo una prueba rápida: lo que finalmente se usó de cada fuente está en la bitácora de abajo y en `public/data/fuentes.json`.",
        "",
        "| Fuente | Dirección probada | Respuesta a la prueba | Fecha | Respaldo previsto si falla |",
        "|---|---|---|---|---|",
        *filas,
        "<!-- tabla:fin -->",
    ])
    previo = ESTADO_MD.read_text(encoding="utf-8") if ESTADO_MD.exists() else ""
    if "<!-- tabla:inicio -->" in previo:
        antes = previo.split("<!-- tabla:inicio -->")[0]
        despues = previo.split("<!-- tabla:fin -->")[1]
        nuevo = antes + tabla + despues
    else:
        nuevo = ("# Estado de los datos\n\n"
                 "Bitácora pública de las fuentes de la Plataforma de Agua · Laboratorio Valle de Bravo "
                 "(versión 0). Dice qué fuente respondió, cuál se sustituyó por su respaldo y qué quedó sin dato.\n\n"
                 "## Prueba de fuentes\n\n" + tabla + "\n\n## Bitácora\n")
    ESTADO_MD.write_text(nuevo, encoding="utf-8")


if __name__ == "__main__":
    main()
