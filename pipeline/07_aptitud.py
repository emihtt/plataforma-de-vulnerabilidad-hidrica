"""Paso 07. Intervenciones candidatas por localidad con reglas visibles (sección 3.4)."""
from __future__ import annotations

from comun import actualizar_localidades, cargar_localidades, haversine_km, parametros


def pct(x) -> str:
    return f"{round(x * 100)} %"


def main() -> None:
    par = parametros()
    u, cap = par["aptitud_intervenciones"], par["captacion_lluvia"]
    rasgos = [f for f in cargar_localidades()["features"] if not f["properties"]["enmascarada"]]
    con_red = [f for f in rasgos if (f["properties"]["pob_total"] or 0) >= u["red_poblacion_vecina_minima"]
               and (1 - f["properties"]["pct_sin_agua"]) >= u["red_cobertura_vecina_minima"]]
    nuevas = {}
    for f in rasgos:
        p, lista = f["properties"], []
        sc = p.get("scall")
        if p["pct_sin_agua"] > 0 and sc:
            c = sc["cobertura_potencial"]
            if c >= u["scall_cobertura_minima"]:
                lista.append({"tipo": "Captación de lluvia domiciliaria",
                              "razon": f"La lluvia captable en un techo de {cap['area_techo_m2']} m² cubriría {pct(c)} "
                                       "de la demanda básica de una vivienda en el año; en los meses secos hace falta "
                                       "almacenamiento grande u otra fuente."})
            else:
                lista.append({"tipo": "Captación de lluvia como complemento",
                              "razon": f"La lluvia sola no alcanza (cubriría {pct(c)} de la demanda básica); sirve como complemento."})
        if p["pct_sin_almacenamiento_max"] >= u["almacenamiento_carencia_minima"]:
            lista.append({"tipo": "Almacenamiento",
                          "razon": f"Al menos {pct(p['pct_sin_almacenamiento_max'])} de las viviendas no tiene tinaco ni cisterna (aproximado)."})
        if p["pct_sin_drenaje"] >= u["saneamiento_carencia_minima"]:
            lista.append({"tipo": "Saneamiento descentralizado",
                          "razon": f"{pct(p['pct_sin_drenaje'])} de las viviendas no tiene drenaje."})
        if p["viv_sin_agua"] > 0:
            lo, la = f["geometry"]["coordinates"]
            vecinas = []
            for g in con_red:
                if g["properties"]["cvegeo"] == p["cvegeo"]:
                    continue
                glo, gla = g["geometry"]["coordinates"]
                dkm = haversine_km(la, lo, gla, glo)
                if dkm <= u["red_distancia_maxima_km"]:
                    vecinas.append((dkm, g["properties"]))
            if vecinas:
                dkm, v = min(vecinas, key=lambda t: t[0])
                lista.append({"tipo": "Evaluar extensión de red",
                              "razon": f"Está a {dkm:.1f} km en línea recta de {v['nombre']}, donde {pct(1 - v['pct_sin_agua'])} "
                                       "de las viviendas tiene agua entubada."})
        nuevas[p["cvegeo"]] = {"intervenciones": lista}
    actualizar_localidades(nuevas)
    conteo = {}
    for v in nuevas.values():
        for i in v["intervenciones"]:
            conteo[i["tipo"]] = conteo.get(i["tipo"], 0) + 1
    print(f"Aptitud: {conteo}")


if __name__ == "__main__":
    main()
