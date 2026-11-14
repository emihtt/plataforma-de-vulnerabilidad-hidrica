import json
from pathlib import Path
import pytest
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parents[2]


def test_adscripcion_y_geometrias_publicadas():
    data = json.loads((ROOT / 'public/data/unidades_hidricas.json').read_text(encoding='utf-8'))
    locs = json.loads((ROOT / 'public/data/localidades.geojson').read_text(encoding='utf-8'))['features']
    assert len(data['adscripciones']) == len(locs) == 72
    assert all(shape(f['geometry']).is_valid for f in data['features'])
    for escala in ['cuenca', 'microcuenca']:
        unidades = [f for f in data['features'] if f['properties']['escala'] == escala]
        miembros = [c for f in unidades for c in f['properties']['localidades']]
        assert len(miembros) == len(set(miembros)) == 72
        for loc in locs:
            c = loc['properties']['cvegeo']
            adscripcion = data['adscripciones'][c][escala]
            assert adscripcion['estado'] == 'asignada'
            u = next(f for f in unidades if f['properties']['id'] == adscripcion['unidad'])
            assert c in u['properties']['localidades']
            # La geometría dibujada puede variar 25 m por simplificación.
            assert shape(u['geometry']).buffer(.0005).covers(shape(loc['geometry']))


def test_adscripcion_con_geometria_original_si_esta_disponible():
    import geopandas as gpd
    data = json.loads((ROOT / 'public/data/unidades_hidricas.json').read_text(encoding='utf-8'))
    locs = json.loads((ROOT / 'public/data/localidades.geojson').read_text(encoding='utf-8'))['features']
    for escala, nivel in [('cuenca', 6), ('microcuenca', 12)]:
        archivo = ROOT / f'data/crudo/hidrobasins/hybas_na_lev{nivel:02d}_v1c.zip'
        if not archivo.exists():
            pytest.skip('Archivo continental no incluido; prueba pública de adscripción se ejecuta por separado')
        frame = gpd.read_file(f'zip://{archivo.as_posix()}').to_crs(4326)
        ids = {int(v[escala]['unidad'].split('-')[1]) for v in data['adscripciones'].values()}
        frame = frame[frame.HYBAS_ID.isin(ids)]
        for loc in locs:
            c = loc['properties']['cvegeo']
            matches = frame[frame.geometry.covers(shape(loc['geometry']))]
            assert len(matches) == 1
            assert data['adscripciones'][c][escala]['unidad'] == f'hb{nivel}-{int(matches.iloc[0].HYBAS_ID)}'
