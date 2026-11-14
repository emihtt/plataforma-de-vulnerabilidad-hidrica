"""Prepara únicamente las unidades del piloto; no regenera el censo ni sus análisis.

Alternativa modelada autorizada: HydroBASINS v1c estándar, niveles 6 y 12.
Los archivos continentales quedan en data/crudo (ignorados por Git).
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import requests
import geopandas as gpd
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'data/crudo/hidrobasins'
PUBLIC = ROOT / 'public/data'
LICENSE = 'https://data.hydrosheds.org/file/technical-documentation/HydroSHEDS_TechDoc_v1_4.pdf'


def download(url, path):
    if path.exists() and path.stat().st_size:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=(15, 120)) as response:
        response.raise_for_status()
        with path.with_suffix('.parcial').open('wb') as f:
            for chunk in response.iter_content(1024 * 256):
                f.write(chunk)
    path.with_suffix('.parcial').replace(path)


def main():
    context = json.loads((PUBLIC / 'contexto.geojson').read_text(encoding='utf-8'))
    municipality = next(shape(f['geometry']) for f in context['features'] if f['properties']['capa'] == 'limite')
    locations = json.loads((PUBLIC / 'localidades.geojson').read_text(encoding='utf-8'))['features']
    checks = []
    for url in ['https://idefor.cnf.gob.mx/geoserver/wms?service=WMS&request=GetCapabilities',
                'https://sigagis.conagua.gob.mx/ArcGIS/rest/services/LocREPDA/MapServer/18?f=json']:
        try:
            response = requests.get(url, timeout=12)
            checks.append({'url': url, 'status': response.status_code})
        except requests.RequestException as e:
            checks.append({'url': url, 'error': type(e).__name__})
    features, memberships, sources = [], {}, []
    to_m = Transformer.from_crs(4326, 32614, always_xy=True).transform
    to_ll = Transformer.from_crs(32614, 4326, always_xy=True).transform
    for scale, level in [('cuenca', 6), ('microcuenca', 12)]:
        url = f'https://data.hydrosheds.org/file/hydrobasins/standard/hybas_na_lev{level:02d}_v1c.zip'
        archive = RAW / f'hybas_na_lev{level:02d}_v1c.zip'
        download(url, archive)
        # El índice SBN antiguo del proveedor no es compatible con algunos GDAL.
        # Leer secuencialmente evita usarlo y no altera ninguna geometría.
        frame = gpd.read_file(f'zip://{archive.as_posix()}').to_crs(4326)
        frame = frame[frame.geometry.intersects(municipality)].sort_values('HYBAS_ID')
        assert len(frame), f'No hay unidades en {scale}'
        source = {'id': f'hydrobasins-{level}', 'nombre': f'HydroBASINS v1c estándar · nivel {level}',
                  'url': url, 'documentacion': 'https://www.hydrosheds.org/products/hydrobasins',
                  'licencia': 'licencias/HydroSHEDS_TechDoc_v1_4.pdf',
                  'sha256_crudo': hashlib.sha256(archive.read_bytes()).hexdigest(),
                  'atribucion': 'Lehner, B. y Grill, G. (2013). HydroBASINS / HydroSHEDS, WWF.',
                  'tipo': 'modelo', 'crs': 'EPSG:4326', 'nivel': level}
        sources.append(source)
        units = []
        for _, row in frame.iterrows():
            uid = f'hb{level}-{int(row.HYBAS_ID)}'
            geom = row.geometry
            assert geom.is_valid and not geom.is_empty
            units.append((uid, geom))
            display = transform(to_ll, transform(to_m, geom).simplify(25, preserve_topology=True))
            features.append({'type': 'Feature', 'geometry': mapping(display), 'properties': {
                'id': uid, 'escala': scale, 'nombre': f'Unidad modelada {int(row.HYBAS_ID)}',
                'fuente_id': source['id'], 'nivel': level, 'tipo': 'modelo',
                'localidades': []}})
        for loc in locations:
            key = loc['properties']['cvegeo']
            point = shape(loc['geometry'])
            matches = [uid for uid, geom in units if geom.covers(point)]
            result = {'unidad': matches[0] if len(matches) == 1 else None,
                      'estado': 'asignada' if len(matches) == 1 else 'frontera_ambigua' if matches else 'sin_correspondencia'}
            memberships.setdefault(key, {})[scale] = result
            if result['unidad']:
                next(f for f in features if f['properties']['id'] == result['unidad'])['properties']['localidades'].append(key)
        print(scale, 'unidades', len(frame), 'asignadas', sum(v[scale]['estado'] == 'asignada' for v in memberships.values()), flush=True)
    download(LICENSE, ROOT / 'public/licencias/HydroSHEDS_TechDoc_v1_4.pdf')
    result = {'type': 'FeatureCollection', 'features': features, 'adscripciones': memberships,
              'fuentes': sources, 'generado': datetime.now(timezone.utc).isoformat(),
              'cobertura_estadistica': 'Solo localidades de Valle de Bravo; no representa la población total de las unidades.',
              'limites': 'Unidades hidrográficas modeladas. No son delimitaciones oficiales mexicanas de cuenca o microcuenca. Geometría simplificada 25 m solo para dibujo; adscripción con geometría original.',
              'pruebas_fuentes_oficiales': checks}
    (PUBLIC / 'unidades_hidricas.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
