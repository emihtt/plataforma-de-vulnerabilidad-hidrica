"""Paso 09. Lluvia normal (1991–2020) por ventana de 30 días en la cabecera municipal (Open-Meteo, archivo)."""
from __future__ import annotations

import json

import pandas as pd

from comun import CRUDO, PUBLICO, anotar_estado, descargar, escribir_json, hoy, leer_json, registrar_fuente

URL = ("https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
       "&start_date=1991-01-01&end_date=2020-12-31&daily=precipitation_sum&timezone=America%2FMexico_City")


def main() -> None:
    cab = leer_json(PUBLICO / "resumen.json")["municipio"]["cabecera"]
    lat, lon = round(cab["lat"], 4), round(cab["lon"], 4)
    ruta = descargar(URL.format(lat=lat, lon=lon), CRUDO / "openmeteo" / "normal_cabecera_1991_2020.json", timeout=120)
    d = json.loads(ruta.read_text(encoding="utf-8"))
    s = pd.Series(d["daily"]["precipitation_sum"], index=pd.to_datetime(d["daily"]["time"])).fillna(0.0)
    acum30 = s.rolling(30).sum().dropna()          # suma de los 30 días que terminan en cada fecha
    acum90 = s.rolling(90).sum().dropna()
    n30 = acum30.groupby(acum30.index.strftime("%m-%d")).mean()
    n90 = acum90.groupby(acum90.index.strftime("%m-%d")).mean()
    mensual = s.groupby([s.index.year, s.index.month]).sum().groupby(level=1).mean()
    escribir_json(PUBLICO / "normales_lluvia.json", {
        "punto": {"lat": lat, "lon": lon, "nombre": "Cabecera municipal de Valle de Bravo"},
        "periodo": [1991, 2020], "generado": hoy(),
        "fuente": "Open-Meteo, archivo histórico (reanálisis ERA5)",
        "explicacion": "Promedio 1991–2020 de la lluvia acumulada en los 30 (o 90) días que terminan en cada día del año (mes-día).",
        "normal_30d_mm": {k: round(float(v), 1) for k, v in n30.items()},
        "normal_90d_mm": {k: round(float(v), 1) for k, v in n90.items()},
        "mensual_mm": [round(float(v), 1) for v in mensual],
        "anual_mm": round(float(mensual.sum()))}, compacto=True)
    registrar_fuente(
        "openmeteo", nombre="Open-Meteo: archivo histórico (normales 1991–2020), lluvia reciente y pronóstico",
        institucion="Open-Meteo", url="https://open-meteo.com/",
        fecha_dato="1991–2020 (normales); al abrir la aplicación (lluvia reciente y pronóstico)",
        fecha_descarga=hoy(), licencia="CC BY 4.0; uso gratuito no comercial", estado="ok",
        usada_en="Lluvia de los últimos 30 días frente a lo normal, pronóstico a 7 días y semáforo de lluvia",
        nota=("Modelo en malla (9 a 25 km), no una estación. La lluvia reciente y la normal vienen de la misma familia "
              "de datos y del mismo punto (cabecera municipal). Para un producto de pago hay que contratar el servicio "
              "o cambiar de fuente."))
    daymet = (leer_json(PUBLICO / "resumen.json").get("lluvia") or {}).get("anual_mm_promedio_localidades")
    anotar_estado("Diferencia entre mallas de lluvia",
                  f"Open-Meteo (reanálisis ERA5) da {mensual.sum():,.0f} mm al año en la cabecera (1991–2020); Daymet da en promedio "
                  f"{daymet} mm al año en las localidades (2004–2023). Son modelos distintos y difieren mucho. Por eso la captación de "
                  "lluvia usa solo Daymet, y la comparación de lluvia reciente contra lo normal usa solo Open-Meteo: nunca se mezclan. "
                  "Queda para el equipo experto decidir la fuente de lluvia y si se corrige con estaciones.")
    print(f"Normales: {mensual.sum():.0f} mm al año en la cabecera; normal de 30 días al 13 de noviembre: {n30['11-13']:.1f} mm")


if __name__ == "__main__":
    main()
