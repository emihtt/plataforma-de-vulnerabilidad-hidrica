"""Paso 01. Localidades del área de estudio con el ITER del Censo 2020 (INEGI).

Escribe public/data/localidades.geojson (sin análisis todavía) y public/data/resumen.json.
"""
from __future__ import annotations

import zipfile

import pandas as pd
from formulas import limites_almacenamiento

from comun import (CRUDO, PUBLICO, descargar, escribir_json, gms_a_decimal, haversine_km, hoy,
                   parametros, registrar_fuente)

URL_ITER = "https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_15csv20.zip"
NUMERICAS = ["POBTOT", "VIVTOT", "TVIVHAB", "TVIVPARHAB", "VIVPARH_CV", "OCUPVIVPAR", "PROM_OCUP",
             "VPH_AGUADV", "VPH_AEASP", "VPH_AGUAFV", "VPH_TINACO", "VPH_CISTER", "VPH_DRENAJ",
             "VPH_NODREN", "VPH_C_ELEC", "VPH_S_ELEC", "VPH_PISOTI", "VPH_REFRI", "P3YM_HLI",
             "PHOG_IND", "POBHOG", "P15YM_AN", "P15YM_SE", "ALTITUD"]


def leer_iter(ruta_zip) -> pd.DataFrame:
    with zipfile.ZipFile(ruta_zip) as z:
        nombre = next(n for n in z.namelist() if n.lower().endswith(".csv"))
        for cod in ("utf-8-sig", "latin-1"):
            try:
                with z.open(nombre) as f:
                    return pd.read_csv(f, dtype=str, encoding=cod)
            except UnicodeDecodeError:
                continue
    raise RuntimeError("No se pudo leer el ITER")


def a_numero(serie: pd.Series) -> pd.Series:
    """'*' (enmascarado) y 'N/D' pasan a nulo."""
    return pd.to_numeric(serie.where(~serie.isin(["*", "N/D"])), errors="coerce")


def preparar(df: pd.DataFrame, municipio_nombre: str, clave_esperada: str):
    """Devuelve (localidades, fila_municipio, fila_9998, fila_9999, clave_municipio)."""
    mun = df[df["NOM_MUN"].str.strip() == municipio_nombre].copy()
    claves = mun["MUN"].unique().tolist()
    if len(claves) != 1:
        raise RuntimeError(f"Se esperaba un municipio llamado {municipio_nombre}; claves: {claves}")
    clave = claves[0].zfill(3)
    mun["enmascarada"] = mun["VPH_AGUAFV"].eq("*") | mun["VIVPARH_CV"].eq("*")
    for c in NUMERICAS:
        mun[c] = a_numero(mun[c])
    mun["loc_num"] = mun["LOC"].astype(int)
    total = mun[mun["loc_num"] == 0].iloc[0]
    f9998 = mun[mun["loc_num"] == 9998]
    f9999 = mun[mun["loc_num"] == 9999]
    locs = mun[~mun["loc_num"].isin([0, 9998, 9999])].copy()
    locs["cvegeo"] = (locs["ENTIDAD"].str.zfill(2) + locs["MUN"].str.zfill(3) + locs["LOC"].str.zfill(4))
    locs["lon"] = locs["LONGITUD"].map(lambda s: gms_a_decimal(s, negativo_por_defecto=True))
    locs["lat"] = locs["LATITUD"].map(gms_a_decimal)
    return locs, total, (f9998.iloc[0] if len(f9998) else None), (f9999.iloc[0] if len(f9999) else None), clave


def calcular_indicadores(locs: pd.DataFrame) -> pd.DataFrame:
    den = locs["VIVPARH_CV"]
    locs["pct_sin_agua"] = locs["VPH_AGUAFV"] / den
    locs["pers_sin_agua_est"] = locs["VPH_AGUAFV"] * locs["PROM_OCUP"]
    locs["pct_sin_drenaje"] = locs["VPH_NODREN"] / den
    locs["pct_tinaco"] = locs["VPH_TINACO"] / den
    locs["pct_cisterna"] = locs["VPH_CISTER"] / den
    limites = [limites_almacenamiento(n, t, c) for n, t, c in zip(den, locs["VPH_TINACO"], locs["VPH_CISTER"])]
    locs["pct_sin_almacenamiento_min"] = [v[0] if v else float("nan") for v in limites]
    locs["pct_sin_almacenamiento_max"] = [v[1] if v else float("nan") for v in limites]
    locs["pct_hog_indigena"] = (locs["PHOG_IND"] / locs["POBHOG"]).clip(upper=1)
    cab = locs[locs["loc_num"] == 1].iloc[0]
    locs["dist_cabecera_km"] = [haversine_km(la, lo, cab["lat"], cab["lon"]) for la, lo in zip(locs["lat"], locs["lon"])]
    locs["dif_altitud_m"] = locs["ALTITUD"] - cab["ALTITUD"]
    return locs


def r(x, nd=4):
    return None if pd.isna(x) else round(float(x), nd)


def e(x):
    return None if pd.isna(x) else int(x)


def main() -> None:
    p = parametros()["area_de_estudio"]
    zip_iter = descargar(URL_ITER, CRUDO / "iter_15csv20.zip")
    df = leer_iter(zip_iter)
    locs, total, f9998, f9999, clave = preparar(df, p["municipio_nombre"], p["municipio_clave_esperada"])
    locs = calcular_indicadores(locs)

    # Prueba de aceptación: la suma de localidades debe igualar el total municipal.
    suma = int(locs["POBTOT"].sum())
    suma_agregados = sum(int(f["POBTOT"]) for f in (f9998, f9999) if f is not None)
    pob_enmasc = int(locs.loc[locs["enmascarada"], "POBTOT"].sum())
    if suma == int(total["POBTOT"]):
        nota_suma = "Las localidades de una y dos viviendas vienen fila por fila; las filas 9998 y 9999 repiten su suma."
    elif suma + suma_agregados == int(total["POBTOT"]):
        nota_suma = "Las localidades de una y dos viviendas solo vienen agregadas en las filas 9998 y 9999."
    else:
        raise RuntimeError(f"La suma de población ({suma}) no coincide con el municipio ({int(total['POBTOT'])})")

    rasgos = []
    for _, f in locs.sort_values("loc_num").iterrows():
        base = {
            "cvegeo": f["cvegeo"], "nombre": f["NOM_LOC"].strip(), "enmascarada": bool(f["enmascarada"]),
            "es_cabecera": bool(f["loc_num"] == 1),
            "pob_total": e(f["POBTOT"]), "viv_total": e(f["VIVTOT"]), "viv_hab": e(f["TVIVHAB"]),
            "altitud_m": e(f["ALTITUD"]), "dist_cabecera_km": r(f["dist_cabecera_km"], 2),
            "dif_altitud_m": e(f["dif_altitud_m"]),
        }
        if not f["enmascarada"]:
            base.update({
                "viv_caract": e(f["VIVPARH_CV"]), "prom_ocup": r(f["PROM_OCUP"], 2),
                "viv_sin_agua": e(f["VPH_AGUAFV"]), "pct_sin_agua": r(f["pct_sin_agua"]),
                "pers_sin_agua_est": r(f["pers_sin_agua_est"], 0),
                "viv_sin_drenaje": e(f["VPH_NODREN"]), "pct_sin_drenaje": r(f["pct_sin_drenaje"]),
                "viv_tinaco": e(f["VPH_TINACO"]), "viv_cisterna": e(f["VPH_CISTER"]),
                "pct_tinaco": r(f["pct_tinaco"]), "pct_cisterna": r(f["pct_cisterna"]),
                "pct_sin_almacenamiento_max": r(f["pct_sin_almacenamiento_max"]),
                "pct_sin_almacenamiento_min": r(f["pct_sin_almacenamiento_min"]),
                "pob_hog_indigena": e(f["PHOG_IND"]), "pct_hog_indigena": r(f["pct_hog_indigena"]),
                "hablantes_li": e(f["P3YM_HLI"]),
            })
        rasgos.append({"type": "Feature",
                       "geometry": {"type": "Point", "coordinates": [round(f["lon"], 6), round(f["lat"], 6)]},
                       "properties": base})
    escribir_json(PUBLICO / "localidades.geojson", {"type": "FeatureCollection", "features": rasgos}, compacto=True)

    con_dato = locs[~locs["enmascarada"]]
    cab = locs[locs["loc_num"] == 1].iloc[0]

    def agregado(f):
        if f is None:
            return None
        return {"pob_total": e(f["POBTOT"]), "viv_total": e(f["VIVTOT"]), "viv_hab": e(f["TVIVHAB"]),
                "viv_sin_agua": e(f["VPH_AGUAFV"]), "enmascarada": bool(f["enmascarada"])}

    resumen = {
        "generado": hoy(),
        "municipio": {"nombre": p["municipio_nombre"], "clave": "15" + clave,
                      "cabecera": {"cvegeo": cab["cvegeo"], "lat": round(cab["lat"], 6), "lon": round(cab["lon"], 6),
                                   "altitud_m": e(cab["ALTITUD"])}},
        "censo": {
            "fuente": "INEGI. Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER)",
            "anio": 2020,
            "pob_total": e(total["POBTOT"]),
            "viv_hab": e(total["TVIVPARHAB"]),
            "viv_caract": e(total["VIVPARH_CV"]),
            "prom_ocup": r(total["PROM_OCUP"], 2),
            "viv_sin_agua_municipio": e(total["VPH_AGUAFV"]),
            "viv_sin_drenaje_municipio": e(total["VPH_NODREN"]),
            "pob_hog_indigena_municipio": e(total["PHOG_IND"]),
            "hablantes_li_municipio": e(total["P3YM_HLI"]),
            "localidades_total": int(len(locs)),
            "localidades_con_datos": int(len(con_dato)),
            "localidades_enmascaradas": int(locs["enmascarada"].sum()),
            "pob_localidades_enmascaradas": pob_enmasc,
            "viv_sin_agua": e(con_dato["VPH_AGUAFV"].sum()),
            "pers_sin_agua_est": r(con_dato["pers_sin_agua_est"].sum(), 0),
            "localidades_con_viv_sin_agua": int((con_dato["VPH_AGUAFV"] > 0).sum()),
            "viv_sin_drenaje": e(con_dato["VPH_NODREN"].sum()),
            "pob_hog_indigena": e(con_dato["PHOG_IND"].sum()),
            "fila_9998_una_vivienda": agregado(f9998),
            "fila_9999_dos_viviendas": agregado(f9999),
            "nota_suma": nota_suma,
            "denominador": "VIVPARH_CV (viviendas particulares habitadas con características captadas)",
        },
    }
    previo = PUBLICO / "resumen.json"
    from comun import leer_json
    anterior = leer_json(previo, {})
    for k, v in anterior.items():      # conserva lo que agregan pasos posteriores
        if k not in resumen:
            resumen[k] = v
    resumen["supuestos"] = {k: v for k, v in parametros().items() if isinstance(v, dict) and v.get("estado") == "supuesto"}
    escribir_json(previo, resumen)

    registrar_fuente(
        "censo_iter", nombre="Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER), Estado de México",
        institucion="INEGI", url="https://www.inegi.org.mx/app/scitel/default?ev=9", descarga=URL_ITER,
        fecha_dato="2020 (levantamiento del 2 al 27 de marzo de 2020)", fecha_descarga=hoy(),
        licencia="Términos de libre uso del INEGI", estado="ok",
        usada_en="Población, viviendas, agua entubada, drenaje, tinaco, cisterna, hogares indígenas, coordenadas y altitud",
        nota=("Denominador de los porcentajes: viviendas particulares habitadas con características captadas "
              "(VIVPARH_CV); en el municipio, viviendas con agua entubada más viviendas sin agua entubada suman ese total. "
              + nota_suma + " Personas sin agua entubada: estimación (viviendas sin agua entubada por promedio de ocupantes)."))
    print(f"Localidades: {len(locs)} ({len(con_dato)} con datos, {int(locs['enmascarada'].sum())} enmascaradas). "
          f"Población: {int(total['POBTOT']):,}. Sin agua entubada: {int(con_dato['VPH_AGUAFV'].sum())} viviendas, "
          f"{con_dato['pers_sin_agua_est'].sum():.0f} personas est. en {(con_dato['VPH_AGUAFV'] > 0).sum()} localidades. {nota_suma}")


if __name__ == "__main__":
    main()
