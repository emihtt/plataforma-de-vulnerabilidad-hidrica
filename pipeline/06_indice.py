"""Paso 06. Índice de prioridad hídrica comunitaria (3.1), clases por quintil y robustez (3.3)."""
from __future__ import annotations

import numpy as np

from comun import actualizar_localidades, actualizar_resumen, cargar_localidades, parametros
from formulas import clases_por_quintil, indice_ponderado, n_grupo_superior, rango_percentil, robustez

# componente del índice -> propiedad de la localidad (todas crecen con la prioridad)
ORIGEN = {
    "sin_agua_entubada": "pct_sin_agua",
    "marginacion": "marg_valor",
    "aislamiento": "dist_cabecera_km",
    "sin_almacenamiento": "pct_sin_almacenamiento_max",
    "sin_drenaje": "pct_sin_drenaje",
    "hogares_indigenas": "pct_hog_indigena",
}


def main() -> None:
    par = parametros()
    pesos = par["indice_prioridad"]["pesos"]
    assert abs(sum(pesos.values()) - 1) < 1e-9, "Los pesos del índice deben sumar 1"
    assert set(pesos) == set(ORIGEN)
    props = [f["properties"] for f in cargar_localidades()["features"] if not f["properties"]["enmascarada"]]
    rangos = {k: rango_percentil([p.get(ORIGEN[k]) for p in props]) for k in pesos}
    indices, faltantes = [], []
    for i in range(len(props)):
        idx, falt = indice_ponderado({k: rangos[k][i] for k in pesos}, pesos)
        indices.append(idx)
        faltantes.append(falt)
    clases = clases_por_quintil(indices, par["indice_prioridad"]["clases"])
    matriz = np.array([[np.nan if rangos[k][i] is None else rangos[k][i] for k in pesos] for i in range(len(props))])
    rb = par["robustez"]
    rob = robustez(matriz, [pesos[k] for k in pesos], rb["simulaciones"], rb["concentracion_dirichlet"], rb["semilla"])
    orden = sorted(range(len(props)), key=lambda i: (-indices[i], i))
    lugar = {i: pos + 1 for pos, i in enumerate(orden)}
    nuevas = {}
    for i, p in enumerate(props):
        nuevas[p["cvegeo"]] = {
            "iphc": round(indices[i], 4), "iphc_clase": clases[i], "iphc_lugar": lugar[i],
            "iphc_componentes": {k: (None if rangos[k][i] is None else round(rangos[k][i], 4)) for k in pesos},
            "iphc_faltantes": faltantes[i], "iphc_robustez": round(float(rob[i]), 3)}
    actualizar_localidades(nuevas)
    actualizar_resumen(indice={"nombre": par["indice_prioridad"]["nombre"], "pesos": pesos,
                               "localidades": len(props), "grupo_superior": n_grupo_superior(len(props)),
                               "simulaciones": rb["simulaciones"], "origen_componentes": ORIGEN})
    print("Índice: primeros cinco lugares:")
    for i in orden[:5]:
        print(f"  {lugar[i]}. {props[i]['nombre']}: {indices[i]:.3f} ({clases[i]}), robustez {rob[i]:.2f}")


if __name__ == "__main__":
    main()
