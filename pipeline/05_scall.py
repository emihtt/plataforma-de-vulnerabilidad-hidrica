"""Paso 05. Potencial de captación de lluvia por localidad (balance diario de un tanque, sección 3.2)."""
from __future__ import annotations

import pandas as pd

from comun import PROCESADO, actualizar_localidades, cargar_localidades, parametros
from formulas import balance_captacion, cobertura_potencial


def main() -> None:
    pr = parametros()["captacion_lluvia"]
    A, Ce, FF, d = pr["area_techo_m2"], pr["coef_escurrimiento"], pr["primer_lavado_mm"], pr["dotacion_l_persona_dia"]
    series: dict[str, pd.DataFrame] = {}
    nuevas = {}
    for f in cargar_localidades()["features"]:
        p = f["properties"]
        if p["enmascarada"] or not p.get("lluvia_celda") or not p.get("prom_ocup"):
            continue
        celda = p["lluvia_celda"]
        if celda not in series:
            series[celda] = pd.read_csv(PROCESADO / "lluvia" / f"{celda}.csv")
        s = series[celda]
        lluvia, meses, anios = s["mm"].tolist(), s["mes"].tolist(), s["anio"].tolist()
        n_anios = s["anio"].nunique()
        calentamiento = int((s["anio"] == s["anio"].min()).sum())      # se descarta el primer año
        personas = p["prom_ocup"]
        demanda = personas * d
        cap_dia = [max(x - FF, 0.0) * A * Ce for x in lluvia]
        litros_anio = sum(cap_dia) / n_anios
        mensual = (pd.Series(cap_dia).groupby(s["mes"]).sum() / n_anios).reindex(range(1, 13)).fillna(0)
        tanques = {}
        for S in pr["tanques_litros"]:
            b = balance_captacion(lluvia, personas, A, Ce, FF, d, S, calentamiento, meses, anios)
            tanques[str(S)] = {"confiabilidad_volumen": round(b["confiabilidad_volumen"], 3),
                               "confiabilidad_dias": round(b["confiabilidad_dias"], 3),
                               "meses_autonomia": round(b["meses_autonomia"], 1),
                               "racha_seca_max_dias": int(b["racha_seca_max_dias"])}
        nuevas[p["cvegeo"]] = {"scall": {
            "personas_por_vivienda": personas, "demanda_l_dia": round(demanda, 1),
            "litros_captables_anio": round(litros_anio),
            "cobertura_potencial": round(cobertura_potencial(litros_anio, demanda), 3),
            "captable_mensual_l": [round(float(x)) for x in mensual], "tanques": tanques}}
    actualizar_localidades(nuevas)
    cob = [v["scall"]["cobertura_potencial"] for v in nuevas.values()]
    lit = [v["scall"]["litros_captables_anio"] for v in nuevas.values()]
    print(f"Captación: {len(nuevas)} localidades; litros captables al año entre {min(lit):,} y {max(lit):,}; "
          f"cobertura potencial entre {min(cob):.2f} y {max(cob):.2f}")


if __name__ == "__main__":
    main()
