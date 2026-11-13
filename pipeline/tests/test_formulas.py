"""Pruebas mínimas de la sección 3.6 del catálogo de análisis."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import numpy as np
import pytest

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))

from comun import PUBLICO, gms_a_decimal, haversine_km, parametros  # noqa: E402
from formulas import (balance_captacion, clases_por_quintil, indice_ponderado, meses_secos_consecutivos,  # noqa: E402
                      rango_percentil, robustez, semaforo)


def modulo(nombre: str):
    spec = importlib.util.spec_from_file_location(nombre, PIPELINE / f"{nombre}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def localidades():
    ruta = PUBLICO / "localidades.geojson"
    if not ruta.exists():
        pytest.skip("Falta localidades.geojson: corre el pipeline")
    return [f["properties"] for f in json.loads(ruta.read_text(encoding="utf-8"))["features"]]


# 1. Coordenadas
def test_gms_a_decimal_oeste_negativo():
    assert gms_a_decimal('100°07\'52.303" W') == pytest.approx(-(100 + 7 / 60 + 52.303 / 3600))
    assert gms_a_decimal('19°11\'42.120" N') == pytest.approx(19 + 11 / 60 + 42.120 / 3600)
    assert gms_a_decimal("100°07'52.303\"", negativo_por_defecto=True) < 0
    assert gms_a_decimal("*") is None and gms_a_decimal(None) is None


def test_haversine():
    assert haversine_km(19, -100, 19, -100) == 0
    assert haversine_km(19, -100, 20, -100) == pytest.approx(111.2, abs=0.3)


# 2. Rango percentil (caso de 3.1)
def test_rango_percentil_caso():
    assert rango_percentil([0.1, 0.5, 0.5, 0.9]) == pytest.approx([0.125, 0.5, 0.5, 0.875])


def test_rango_percentil_nulos():
    assert rango_percentil([0.1, None, 0.9]) == [0.25, None, 0.75]


# 3. Balance de captación (caso de 3.2)
def test_balance_captacion_caso():
    b = balance_captacion([0, 10, 0.5, 25], personas=4, area_m2=60, coef=0.8, primer_lavado_mm=1,
                          dotacion_l=50, tanque_l=5000, dias_calentamiento=0)
    assert b["captacion"] == pytest.approx([0, 432, 0, 1152])
    assert b["demanda_l_dia"] == 200
    assert b["abasto"] == pytest.approx([0, 200, 200, 200])
    assert b["volumen"] == pytest.approx([0, 232, 32, 984])
    assert b["confiabilidad_dias"] == pytest.approx(0.75)
    assert b["confiabilidad_volumen"] == pytest.approx(0.75)


def test_captacion_orden_de_magnitud():
    # 1,100 mm al año en 110 días de 10 mm: unos 50 mil litros con 60 m² y Ce de 0.8
    lluvia = [10.0] * 110 + [0.0] * 255
    litros = sum(balance_captacion(lluvia, 4, 60, 0.8, 0, 50, 5000)["captacion"])
    assert 45_000 < litros < 56_000


def test_tanque_se_derrama():
    b = balance_captacion([500, 0], 4, 60, 0.8, 1, 50, 2500)
    assert b["volumen"][0] == 2300


# 4. Suma de población
def test_suma_poblacion_igual_al_municipio():
    resumen = json.loads((PUBLICO / "resumen.json").read_text(encoding="utf-8"))
    assert sum(p["pob_total"] for p in localidades()) == resumen["censo"]["pob_total"] == 61590


# 5. Pesos
def test_pesos_suman_uno():
    assert sum(parametros()["indice_prioridad"]["pesos"].values()) == pytest.approx(1.0)


# 6. Enmascaradas sin índice ni servicios
def test_enmascaradas_sin_indice():
    for p in localidades():
        if p["enmascarada"]:
            assert p.get("iphc") is None and p.get("viv_sin_agua") is None and p.get("scall") is None
            assert not p.get("intervenciones")


# 7. Dirección de la marginación
def test_direccion_marginacion():
    m = modulo("03_marginacion")
    # valores típicos de la base 2020: grado Muy alto ~0.55, grado Muy bajo ~0.95
    assert m.componente_marginacion(0.55) > m.componente_marginacion(0.95)
    locs = [p for p in localidades() if p.get("marg_grado")]
    orden = m.ORDEN_GRADOS
    por_grado = {}
    for p in locs:
        por_grado.setdefault(p["marg_grado"], []).append(p["marg_valor"])
    presentes = [g for g in orden if g in por_grado]
    medias = [np.mean(por_grado[g]) for g in presentes]
    assert medias == sorted(medias), "el componente debe crecer con el grado de marginación"


# Otras
def test_indice_reparte_peso_faltante():
    idx, falt = indice_ponderado({"a": 1.0, "b": None}, {"a": 0.5, "b": 0.5})
    assert idx == 1.0 and falt == ["b"]


def test_clases_quintiles():
    c = clases_por_quintil([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.0])
    assert c[:2] == ["Muy alta", "Muy alta"] and c[-2:] == ["Muy baja", "Muy baja"]


def test_robustez_dominante():
    m = np.array([[1.0, 1.0], [0.5, 0.5], [0.2, 0.2], [0.1, 0.1], [0.0, 0.0]])
    r = robustez(m, [0.5, 0.5], 200, 10, 1)
    assert r[0] == 1.0 and r[4] == 0.0


def test_meses_secos_circular():
    assert meses_secos_consecutivos([5, 5, 5, 30, 80, 200, 200, 200, 200, 80, 10, 5], 20) == 5


def test_semaforo_umbrales():
    assert semaforo(98.87, 75, 50) == "verde" and semaforo(60, 75, 50) == "atencion" and semaforo(36.8, 75, 50) == "alerta"


def test_orden_indice_coincide_con_lugar():
    locs = [p for p in localidades() if p.get("iphc") is not None]
    if not locs:
        pytest.skip("Aún no se corre el paso 06")
    pesos = parametros()["indice_prioridad"]["pesos"]
    for p in locs:
        idx, _ = indice_ponderado(p["iphc_componentes"], pesos)
        assert idx == pytest.approx(p["iphc"], abs=1e-3)
