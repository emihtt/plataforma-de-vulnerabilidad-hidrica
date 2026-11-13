"""Paso 02. Capas de contexto del mapa (OpenStreetMap vía Overpass), simplificadas.

Escribe public/data/contexto.geojson con la propiedad `capa`: limite, agua, rio, camino, area_protegida.
"""
from __future__ import annotations

import json
import math
import time

import requests
from shapely.geometry import LineString, MultiPolygon, Polygon, box, mapping
from shapely.ops import linemerge, polygonize, unary_union

from comun import (AGENTE, CRUDO, PUBLICO, anotar_estado, cargar_localidades, escribir_json, hoy,
                   parametros, registrar_fuente)

SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
MARGEN_KM = 3.0
LIMITE_BYTES = 1_500_000


def caja_localidades() -> tuple[float, float, float, float]:
    pts = [f["geometry"]["coordinates"] for f in cargar_localidades()["features"]]
    lons, lats = [p[0] for p in pts], [p[1] for p in pts]
    dlat = MARGEN_KM / 111.0
    dlon = MARGEN_KM / (111.0 * math.cos(math.radians(sum(lats) / len(lats))))
    return (min(lons) - dlon, min(lats) - dlat, max(lons) + dlon, max(lats) + dlat)  # oeste, sur, este, norte


def consultar(nombre: str, consulta: str) -> dict:
    destino = CRUDO / "osm" / f"{nombre}.json"
    if destino.exists():
        return json.loads(destino.read_text(encoding="utf-8"))
    destino.parent.mkdir(parents=True, exist_ok=True)
    ultimo = None
    for servidor in SERVIDORES:
        for intento in range(2):
            try:
                r = requests.post(servidor, data={"data": consulta}, headers=AGENTE, timeout=180)
                r.raise_for_status()
                datos = r.json()
                destino.write_text(json.dumps(datos), encoding="utf-8")
                return datos
            except Exception as e:  # noqa: BLE001
                ultimo = e
                time.sleep(5)
    raise RuntimeError(f"Overpass no respondió para {nombre}: {ultimo}")


def unir(lineas):
    u = unary_union(lineas)
    return u if u.geom_type == "LineString" else linemerge(u)


def linea(geom) -> LineString | None:
    pts = [(p["lon"], p["lat"]) for p in geom or [] if p]
    return LineString(pts) if len(pts) >= 2 else None


def poligono_de_relacion(el: dict):
    ext, inte = [], []
    for m in el.get("members", []):
        if m.get("type") != "way":
            continue
        ln = linea(m.get("geometry"))
        if ln is None:
            continue
        (inte if m.get("role") == "inner" else ext).append(ln)
    if not ext:
        return None
    pol = unary_union(list(polygonize(unary_union(ext))))
    if inte:
        huecos = unary_union(list(polygonize(unary_union(inte))))
        if not huecos.is_empty:
            pol = pol.difference(huecos)
    return None if pol.is_empty else pol


def poligono_de_via(el: dict):
    pts = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
    if len(pts) >= 4 and pts[0] == pts[-1]:
        p = Polygon(pts)
        return p if p.is_valid else p.buffer(0)
    return None


def redondear(geom, nd=5):
    def rec(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [rec(x) for x in c]
    g = mapping(geom)
    return {"type": g["type"], "coordinates": rec(g["coordinates"])}


def rasgo(geom, capa: str, **props):
    return {"type": "Feature", "geometry": redondear(geom), "properties": {"capa": capa, **{k: v for k, v in props.items() if v}}}


def main() -> None:
    p = parametros()["area_de_estudio"]
    o, s, e, n = caja_localidades()
    bb = f"{s:.5f},{o:.5f},{n:.5f},{e:.5f}"
    marco = box(o, s, e, n)
    rasgos = []

    # Límite municipal
    d = consultar("limite", f'[out:json][timeout:120];relation["boundary"="administrative"]["admin_level"="6"]'
                            f'["name"="{p["municipio_nombre"]}"]({bb});out geom;')
    limite = None
    for el in d["elements"]:
        if el["type"] == "relation" and el.get("tags", {}).get("INEGI:MUNID", "15110") == "15110":
            limite = poligono_de_relacion(el)
    if limite is None:
        raise RuntimeError("No se obtuvo el límite municipal de OpenStreetMap")
    rasgos.append(rasgo(limite.simplify(0.0003), "limite", nombre=p["municipio_nombre"]))

    # Cuerpos de agua
    d = consultar("agua", f'[out:json][timeout:120];(way["natural"="water"]({bb});relation["natural"="water"]({bb}););out geom;')
    for el in d["elements"]:
        pol = poligono_de_relacion(el) if el["type"] == "relation" else poligono_de_via(el)
        if pol is None or pol.is_empty:
            continue
        pol = pol.intersection(marco)
        area_km2 = pol.area * 111 * 111 * math.cos(math.radians(s))
        if area_km2 < 0.02:           # descarta estanques y jagüeyes muy pequeños
            continue
        nombre = el.get("tags", {}).get("name")
        rasgos.append(rasgo(pol.simplify(0.0002), "agua", nombre=nombre, embalse=area_km2 > 5))

    # Ríos y arroyos
    d = consultar("rios", f'[out:json][timeout:120];way["waterway"~"^(river|stream)$"]({bb});out geom;')
    por_tipo: dict[tuple, list] = {}
    for el in d["elements"]:
        ln = linea(el.get("geometry"))
        if ln is None:
            continue
        t = el.get("tags", {})
        por_tipo.setdefault((t.get("waterway"), t.get("name")), []).append(ln)
    for (tipo, nombre), lineas in por_tipo.items():
        g = unir(lineas).intersection(marco).simplify(0.0004)
        if not g.is_empty:
            rasgos.append(rasgo(g, "rio", tipo=tipo, nombre=nombre))

    # Caminos
    d = consultar("caminos", f'[out:json][timeout:160];way["highway"~"^(trunk|primary|secondary|tertiary|unclassified|track)$"]({bb});out geom;')
    clases = {"trunk": "principal", "primary": "principal", "secondary": "principal",
              "tertiary": "secundario", "unclassified": "secundario", "track": "brecha"}
    por_clase: dict[str, list] = {}
    for el in d["elements"]:
        ln = linea(el.get("geometry"))
        if ln is not None:
            por_clase.setdefault(clases[el["tags"]["highway"]], []).append(ln)
    caminos = {c: unir(l).intersection(marco) for c, l in por_clase.items()}

    # Áreas protegidas
    d = consultar("protegidas", f'[out:json][timeout:160];(relation["boundary"="protected_area"]({bb});way["boundary"="protected_area"]({bb}););out geom;')
    for el in d["elements"]:
        pol = poligono_de_relacion(el) if el["type"] == "relation" else poligono_de_via(el)
        if pol is None or pol.is_empty:
            continue
        pol = pol.intersection(marco)
        if pol.is_empty or pol.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        rasgos.append(rasgo(pol.simplify(0.0006), "area_protegida", nombre=el.get("tags", {}).get("name")))

    def armar(tolerancia: float, con_brechas: bool):
        salida = list(rasgos)
        for clase, g in caminos.items():
            if clase == "brecha" and not con_brechas:
                continue
            gs = g.simplify(tolerancia)
            if not gs.is_empty:
                salida.append(rasgo(gs, "camino", clase=clase))
        return {"type": "FeatureCollection", "bbox": [round(o, 5), round(s, 5), round(e, 5), round(n, 5)], "features": salida}

    nota_tam = ""
    for tolerancia, con_brechas in [(0.0003, True), (0.0006, True), (0.0006, False), (0.001, False)]:
        fc = armar(tolerancia, con_brechas)
        tam = len(json.dumps(fc, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        if tam <= LIMITE_BYTES:
            break
        nota_tam = " Se simplificó más (o se quitaron brechas) para no pasar de 1.5 MB."
    escribir_json(PUBLICO / "contexto.geojson", fc, compacto=True)

    # ¿Los puntos caen dentro del límite?
    from shapely.geometry import Point
    fuera = [f["properties"]["nombre"] for f in cargar_localidades()["features"]
             if not limite.buffer(0.002).contains(Point(f["geometry"]["coordinates"]))]
    conteo = {}
    for r_ in fc["features"]:
        conteo[r_["properties"]["capa"]] = conteo.get(r_["properties"]["capa"], 0) + 1
    registrar_fuente(
        "osm_contexto", nombre="Límite municipal, cuerpos de agua, ríos, caminos y áreas protegidas",
        institucion="OpenStreetMap (colaboradores)", url="https://www.openstreetmap.org/copyright",
        descarga=SERVIDORES[0], fecha_dato=hoy(), fecha_descarga=hoy(), licencia="ODbL. © colaboradores de OpenStreetMap",
        estado="ok", usada_en="Capas de contexto del mapa",
        nota=f"Geometrías simplificadas para celular; recorte a la caja de las localidades más {MARGEN_KM:.0f} km.{nota_tam}")
    anotar_estado("Contexto geográfico (OpenStreetMap)",
                  f"Overpass respondió a las consultas reales (la página de estado no contestó en la prueba inicial). "
                  f"Capas: {conteo}; archivo de {tam / 1e6:.2f} MB.{nota_tam} "
                  + (f"Localidades cuyo punto cae fuera del límite municipal de OpenStreetMap (más de unos 200 m): {', '.join(fuera)}." if fuera
                     else "Todas las localidades caen dentro del límite municipal."))
    print(f"Contexto: {conteo}, {tam / 1e6:.2f} MB; fuera del límite: {fuera}")


if __name__ == "__main__":
    main()
