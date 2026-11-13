"""Paso 11. Pronóstico oficial por municipio del Servicio Meteorológico Nacional (si el servicio responde)."""
from __future__ import annotations

import gzip
import json

import requests

from comun import AGENTE, CRUDO, PUBLICO, anotar_estado, escribir_json, hoy, parametros, registrar_fuente

URL = "https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1"
DOC = "https://smn.conagua.gob.mx/es/web-service-api"


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def main() -> None:
    p = parametros()["area_de_estudio"]
    destino = PUBLICO / "pronostico_smn.json"
    try:
        r = requests.get(URL, headers=AGENTE, timeout=90)
        r.raise_for_status()
        crudo = r.content
        (CRUDO / "smn").mkdir(parents=True, exist_ok=True)
        (CRUDO / "smn" / f"pronostico_{hoy()}.gz").write_bytes(crudo)
        try:
            texto = gzip.decompress(crudo).decode("utf-8")
        except OSError:
            texto = crudo.decode("utf-8")
        datos = json.loads(texto)
        regs = [d for d in datos if str(d.get("ides")) == p["entidad"] and str(d.get("nmun", "")).strip() == p["municipio_nombre"]]
        if not regs:
            raise RuntimeError("El archivo no trae registros de Valle de Bravo")
    except Exception as e:  # noqa: BLE001
        if destino.exists():
            destino.unlink()
        registrar_fuente("smn_pronostico", nombre="Pronóstico por municipio",
                         institucion="Servicio Meteorológico Nacional (Conagua)", url=DOC, fecha_dato=None,
                         fecha_descarga=hoy(), licencia="Datos abiertos del Gobierno de México", estado="sin_dato",
                         usada_en="Pronóstico oficial",
                         nota="El servicio no respondió; la pantalla Agua ahora se queda con el pronóstico de Open-Meteo.")
        anotar_estado("Pronóstico oficial (Servicio Meteorológico Nacional)",
                      f"No respondió ({type(e).__name__}); no se generó pronostico_smn.json.")
        print(f"SMN: sin dato ({e})")
        return
    dias = []
    for d in sorted(regs, key=lambda x: int(x["ndia"])):
        dl = str(d["dloc"])                       # por ejemplo 20261113T00
        dias.append({"fecha": f"{dl[0:4]}-{dl[4:6]}-{dl[6:8]}", "ndia": int(d["ndia"]),
                     "tmax_c": num(d.get("tmax")), "tmin_c": num(d.get("tmin")),
                     "lluvia_mm": num(d.get("prec")), "prob_lluvia_pct": num(d.get("probprec")),
                     "cielo": d.get("desciel")})
    escribir_json(destino, {"municipio": regs[0]["nmun"], "idmun": str(regs[0]["idmun"]),
                            "emision": dias[0]["fecha"], "descarga": hoy(),
                            "fuente": "Servicio Meteorológico Nacional (Conagua), pronóstico por municipio", "dias": dias})
    registrar_fuente("smn_pronostico", nombre="Pronóstico por municipio a cuatro días",
                     institucion="Servicio Meteorológico Nacional (Conagua)", url=DOC, descarga=URL,
                     fecha_dato=dias[0]["fecha"], fecha_descarga=hoy(), licencia="Datos abiertos del Gobierno de México",
                     estado="ok", usada_en="Pronóstico oficial en Agua ahora",
                     nota="Se descarga al correr el pipeline, no al abrir la aplicación; la pantalla oculta los días que ya pasaron.")
    anotar_estado("Pronóstico oficial (Servicio Meteorológico Nacional)",
                  f"Respondió. Emisión del {dias[0]['fecha']}, {len(dias)} días para {regs[0]['nmun']} "
                  f"(clave de municipio {regs[0]['idmun']}). Campos leídos del archivo: tmax, tmin, prec, probprec, desciel.")
    print(f"SMN: {len(dias)} días desde {dias[0]['fecha']}")


if __name__ == "__main__":
    main()
