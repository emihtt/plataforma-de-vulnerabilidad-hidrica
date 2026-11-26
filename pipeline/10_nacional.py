"""Paso 10. Población potencial nacional: viviendas y personas sin agua entubada en el país (ITER nacional)."""
from __future__ import annotations

import zipfile

import pandas as pd

from comun import CRUDO, PUBLICO, anotar_estado, descargar, escribir_json, hoy, registrar_fuente

URL = "https://www.inegi.org.mx/contenidos/programas/ccpv/iter/zip/iter2020/iter_nalcsv20.zip"
COLS = ["ENTIDAD", "NOM_ENT", "MUN", "LOC", "POBTOT", "TAMLOC", "VIVPARH_CV", "VPH_AGUAFV", "PROM_OCUP"]
TAMANOS = [("Menos de 250 habitantes", 1, 1), ("250 a 2,499 habitantes", 2, 4),
           ("2,500 a 14,999 habitantes", 5, 7), ("15,000 habitantes o más", 8, 14)]
REFERENCIA_VIV, REFERENCIA_PERS = 1_200_000, 4_600_000     # cifra difundida del Censo 2020 (prueba de cordura)


def num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.where(~s.isin(["*", "N/D"])), errors="coerce")


def main() -> None:
    try:
        ruta = descargar(URL, CRUDO / "iter_nalcsv20.zip", timeout=600)
    except Exception as e:  # noqa: BLE001
        registrar_fuente("censo_iter_nacional", nombre="Censo 2020, ITER nacional", institucion="INEGI", url=URL,
                         fecha_dato="2020", estado="sin_dato", licencia="Términos de libre uso del INEGI",
                         usada_en="Usos y escala", nota="No se pudo descargar; la pantalla omite la cifra nacional.")
        anotar_estado("ITER nacional (INEGI)", f"No se pudo descargar ({type(e).__name__}); sin cifra nacional.")
        print("Nacional: sin dato")
        return
    with zipfile.ZipFile(ruta) as z:
        nombre = next(n for n in z.namelist() if n.lower().endswith(".csv") and "iter" in n.lower())
        for cod in ("utf-8-sig", "latin-1"):
            try:
                with z.open(nombre) as f:
                    df = pd.read_csv(f, dtype=str, encoding=cod, usecols=COLS)
                break
            except UnicodeDecodeError:
                continue
    for c in ("POBTOT", "TAMLOC", "VIVPARH_CV", "VPH_AGUAFV", "PROM_OCUP"):
        df[c] = num(df[c])
    ent, mun, loc = df["ENTIDAD"].astype(int), df["MUN"].astype(int), df["LOC"].astype(int)
    pais = df[(ent == 0) & (mun == 0) & (loc == 0)].iloc[0]
    estados = df[(ent > 0) & (mun == 0) & (loc == 0)].copy()
    locs = df[(ent > 0) & (mun > 0) & (~loc.isin([0, 9998, 9999]))].copy()
    con_dato = locs[locs["VPH_AGUAFV"].notna() & (locs["VIVPARH_CV"] > 0)].copy()
    con_dato["pers"] = con_dato["VPH_AGUAFV"] * con_dato["PROM_OCUP"]

    estados["pers"] = estados["VPH_AGUAFV"] * estados["PROM_OCUP"]
    viv, pers = int(pais["VPH_AGUAFV"]), float(estados["pers"].sum())
    desv_v, desv_p = viv / REFERENCIA_VIV - 1, pers / REFERENCIA_PERS - 1
    if abs(desv_v) > 0.10 or abs(desv_p) > 0.10:
        raise RuntimeError(f"Prueba de cordura nacional fuera de 10 %: {viv:,} viviendas, {pers:,.0f} personas")

    por_tam = []
    for etiqueta, a, b in TAMANOS:
        g = con_dato[con_dato["TAMLOC"].between(a, b)]
        por_tam.append({"tamano": etiqueta, "localidades": int(len(g)), "viviendas": int(g["VPH_AGUAFV"].sum()),
                        "personas_est": round(float(g["pers"].sum()))})
    resto_v = viv - int(con_dato["VPH_AGUAFV"].sum())
    por_tam.append({"tamano": "Localidades de una y dos viviendas (el censo solo publica el agregado)", "localidades": None,
                    # Las personas de este grupo no se estiman: restar dos estimaciones hechas con
                    # promedios distintos (por entidad y por localidad) da un número sin sentido.
                    "viviendas": resto_v, "personas_est": None})
    mitad = con_dato[con_dato["VPH_AGUAFV"] / con_dato["VIVPARH_CV"] >= 0.5]
    por_ent = [{"entidad": r["NOM_ENT"].strip(), "viviendas": int(r["VPH_AGUAFV"]), "personas_est": round(float(r["pers"]))}
               for _, r in estados.sort_values("VPH_AGUAFV", ascending=False).iterrows()]
    escribir_json(PUBLICO / "nacional.json", {
        "generado": hoy(), "fuente": "INEGI. Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER), nacional",
        "viviendas_sin_agua": viv, "personas_est": round(pers),
        "nota_personas": "Estimación: viviendas sin agua entubada por promedio de ocupantes de cada entidad.",
        "localidades_mitad_o_mas": int(len(mitad)), "localidades_con_dato": int(len(con_dato)),
        "por_tamano": por_tam, "por_entidad": por_ent})
    registrar_fuente(
        "censo_iter_nacional", nombre="Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER), nacional",
        institucion="INEGI", url="https://www.inegi.org.mx/app/scitel/default?ev=9", descarga=URL, fecha_dato="2020",
        fecha_descarga=hoy(), licencia="Términos de libre uso del INEGI", estado="ok", usada_en="Usos y escala: población potencial nacional",
        nota=(f"Prueba de cordura: {viv:,} viviendas ({desv_v:+.1%} frente a la cifra difundida de 1.2 millones) y "
              f"{pers:,.0f} personas estimadas ({desv_p:+.1%} frente a 4.6 millones)."))
    anotar_estado("ITER nacional (INEGI)",
                  f"Descargado. Viviendas sin agua entubada: {viv:,}; personas estimadas: {pers:,.0f}; "
                  f"localidades con la mitad o más de sus viviendas sin agua entubada: {len(mitad):,}. "
                  f"Diferencia con la cifra difundida: {desv_v:+.1%} en viviendas y {desv_p:+.1%} en personas (tolerancia 10 %).")
    print(f"Nacional: {viv:,} viviendas, {pers:,.0f} personas est., {len(mitad):,} localidades con la mitad o más")


if __name__ == "__main__":
    main()
