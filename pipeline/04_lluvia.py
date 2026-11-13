"""Paso 04. Lluvia diaria por localidad (Daymet, malla de 1 km; respaldo Open-Meteo).

Guarda las series en data/procesado/lluvia/ y agrega a cada localidad: lluvia_anual_mm,
lluvia_mensual_mm (12 valores), meses_secos y lluvia_fuente.
"""
from __future__ import annotations

import io
import time

import numpy as np
import pandas as pd

from comun import (CRUDO, PROCESADO, actualizar_localidades, actualizar_resumen, anotar_estado,
                   cargar_localidades, descargar, hoy, parametros, registrar_fuente)
from formulas import meses_secos_consecutivos

URL_DAYMET = ("https://daymet.ornl.gov/single-pixel/api/data?lat={lat}&lon={lon}&vars=prcp"
              "&start={a0}-01-01&end={a1}-12-31")
URL_OM = ("https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}"
          "&start_date={a0}-01-01&end_date={a1}-12-31&daily=precipitation_sum&timezone=America%2FMexico_City")


def leer_daymet(ruta) -> pd.DataFrame:
    texto = ruta.read_text(encoding="utf-8")
    inicio = next(i for i, l in enumerate(texto.splitlines()) if l.lower().startswith("year,yday"))
    df = pd.read_csv(io.StringIO(texto), skiprows=inicio)
    df.columns = ["anio", "dia", "mm"]
    fechas = pd.to_datetime(df["anio"].astype(str), format="%Y") + pd.to_timedelta(df["dia"] - 1, unit="D")
    # Daymet usa años de 365 días: en bisiestos omite el 31 de diciembre, así que el día del año
    # se traduce con calendario no bisiesto.
    base = pd.to_datetime("2001-01-01") + pd.to_timedelta(df["dia"] - 1, unit="D")
    return pd.DataFrame({"anio": df["anio"].astype(int), "mes": base.dt.month.astype(int), "mm": df["mm"].astype(float)})


def leer_openmeteo(ruta) -> pd.DataFrame:
    import json
    d = json.loads(ruta.read_text(encoding="utf-8"))["daily"]
    f = pd.to_datetime(pd.Series(d["time"]))
    return pd.DataFrame({"anio": f.dt.year, "mes": f.dt.month, "mm": pd.Series(d["precipitation_sum"]).fillna(0.0)})


def main() -> None:
    pr = parametros()["captacion_lluvia"]
    a0, a1 = pr["anios_serie"]
    locs = [f for f in cargar_localidades()["features"] if not f["properties"]["enmascarada"]]
    (PROCESADO / "lluvia").mkdir(parents=True, exist_ok=True)

    celdas: dict[tuple, list] = {}
    for f in locs:
        lon, lat = f["geometry"]["coordinates"]
        celdas.setdefault((round(lat, 2), round(lon, 2)), []).append(f["properties"]["cvegeo"])

    series, fuente_por_celda, fallas = {}, {}, 0
    for i, (lat, lon) in enumerate(sorted(celdas)):
        destino = CRUDO / "daymet" / f"prcp_{lat:.2f}_{lon:.2f}_{a0}_{a1}.csv"
        try:
            nuevo = not destino.exists()
            descargar(URL_DAYMET.format(lat=lat, lon=lon, a0=a0, a1=a1), destino, timeout=90)
            if nuevo:
                time.sleep(1.1)       # una solicitud por segundo como máximo
            series[(lat, lon)] = leer_daymet(destino)
            fuente_por_celda[(lat, lon)] = "Daymet (malla de 1 km)"
        except Exception as e:  # noqa: BLE001
            fallas += 1
            destino = CRUDO / "openmeteo" / f"archivo_{lat:.2f}_{lon:.2f}_{a0}_{a1}.json"
            descargar(URL_OM.format(lat=lat, lon=lon, a0=a0, a1=a1), destino, timeout=90)
            series[(lat, lon)] = leer_openmeteo(destino)
            fuente_por_celda[(lat, lon)] = "Open-Meteo, archivo histórico (malla de 9 a 25 km)"
        if (i + 1) % 10 == 0:
            print(f"  lluvia: {i + 1}/{len(celdas)} celdas", flush=True)

    nuevas, mensuales = {}, []
    ultimo_anio = a1
    for celda, cves in celdas.items():
        s = series[celda]
        ultimo_anio = min(ultimo_anio, int(s["anio"].max()))
        s.to_csv(PROCESADO / "lluvia" / f"{celda[0]:.2f}_{celda[1]:.2f}.csv", index=False)
        n_anios = s["anio"].nunique()
        anual = s["mm"].sum() / n_anios
        mensual = (s.groupby("mes")["mm"].sum() / n_anios).reindex(range(1, 13)).fillna(0).tolist()
        for cve in cves:
            nuevas[cve] = {"lluvia_anual_mm": round(anual), "lluvia_mensual_mm": [round(x, 1) for x in mensual],
                           "meses_secos": meses_secos_consecutivos(mensual, pr["umbral_mes_seco_mm"]),
                           "lluvia_fuente": fuente_por_celda[celda], "lluvia_celda": f"{celda[0]:.2f}_{celda[1]:.2f}"}
            mensuales.append(mensual)
    actualizar_localidades(nuevas)
    regimen = np.mean(np.array(mensuales), axis=0)
    actualizar_resumen(lluvia={"periodo": [a0, ultimo_anio], "anual_mm_promedio_localidades": round(float(regimen.sum())),
                               "mensual_mm_promedio_localidades": [round(float(x), 1) for x in regimen],
                               "umbral_mes_seco_mm": pr["umbral_mes_seco_mm"],
                               "fuente": "Daymet" if fallas == 0 else "Daymet y Open-Meteo"})
    estado = "ok" if fallas == 0 else ("respaldo" if fallas == len(celdas) else "ok")
    registrar_fuente(
        "daymet_lluvia", nombre=f"Daymet versión 4, precipitación diaria por punto, {a0}–{ultimo_anio}",
        institucion="ORNL DAAC, NASA", url="https://daymet.ornl.gov/web_services",
        fecha_dato=f"{a0}–{ultimo_anio}", fecha_descarga=hoy(), licencia="Datos abiertos (NASA EOSDIS); citar Thornton et al.",
        estado=estado, usada_en="Lluvia anual y mensual por localidad; balance de captación de lluvia",
        nota=(f"Modelo en malla de 1 km, no una estación local. {len(celdas)} puntos para {len(locs)} localidades "
              "(las que comparten coordenada redondeada a 0.01° usan la misma serie). Años de 365 días."
              + (f" {fallas} puntos se tomaron del respaldo Open-Meteo." if fallas else "")))
    anotar_estado("Lluvia por localidad (Daymet)",
                  f"{len(celdas)} puntos descargados para {len(locs)} localidades, periodo {a0}–{ultimo_anio}. "
                  + (f"{fallas} puntos fallaron en Daymet y se tomaron de Open-Meteo (la interfaz lo dice en la ficha)." if fallas
                     else "No se usó el respaldo de Open-Meteo."))
    vals = [v["lluvia_anual_mm"] for v in nuevas.values()]
    print(f"Lluvia: {len(celdas)} celdas, {fallas} con respaldo; anual entre {min(vals)} y {max(vals)} mm")


if __name__ == "__main__":
    main()
