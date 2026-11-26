"""Lectura de los reportes diarios de Conagua del Sistema Cutzamala."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))

from cutzamala import (CAPACIDAD_VALLE_DE_BRAVO_MM3, anio_de_pagina, filas_valle_de_bravo,  # noqa: E402
                       mes_de_pagina, periodo_del_reporte)

# Fragmento real del reporte «Noviembre 2026» (Villa Victoria, Valle de Bravo, El Bosque, suma del sistema).
PAGINA = """ALMACENAMIENTO EN PRESAS DEL SISTEMA CUTZAMALA 2026
NOVIEMBRE
CAPACIDAD  185.731 Mm3 CAPACIDAD 394.390 Mm3 CAPACIDAD 202.400 Mm3
LLUVIA MENOR DE 20.0 mm
4 161.295 86.84 0.0 389.295 98.71 0.0 197.915 97.78 0.0 748,505,000 95.65
5 161.845 87.14 3.0 389.925 98.87 0.0 197.008 97.34 0.0 748,778,000 95.69
6 161.845 87.14 0.0 390.347 98.97 INAP 196.812 97.24 0.0 749,004,000 95.72
24 160.745 86.55 1.0 389.505 98.76 0.0 199.870 98.75 1.0 750,120,000 95.86
25 0.0 0.0 0.0
"""


def test_periodo_del_encabezado():
    assert periodo_del_reporte(PAGINA) == (2026, 11)
    assert anio_de_pagina("sin encabezado") is None
    # el mes pegado a otra palabra sí se reconoce; «MAYOR» no es mayo
    assert mes_de_pagina("CAPACIDAD 202.400 Mm3ENERO") == 1
    assert mes_de_pagina("LLUVIA MAYOR DE 70.0 mm") is None
    # dos meses distintos en la misma página: no se adivina
    assert mes_de_pagina("JUNIO ... JULIO") is None


def test_filas_de_valle_de_bravo():
    filas = dict((d, (a, p)) for d, a, p in filas_valle_de_bravo(PAGINA))
    assert filas[5] == (389.925, 98.87)
    assert filas[24] == (389.505, 98.76)
    assert filas[6] == (390.347, 98.97)          # «INAP» en la lluvia no rompe la lectura
    assert 25 not in filas                        # día sin dato: no se estima


def test_ignora_otras_tablas_y_valores_inconsistentes():
    # fila de calidad del agua (sin la suma del sistema) y fila con porcentaje que no cuadra con la capacidad
    texto = "8 108.872 7.32 1.86 0.5\n9 161.0 86.7 0.0 389.925 91.00 0.0 197.0 97.3 0.0 748,778,000 95.69\n"
    assert filas_valle_de_bravo(texto) == []


def test_llenado_como_fraccion_se_calcula_con_el_almacenamiento():
    texto = "1 96.220 0.52 0.0 265.260 0.67 0.0 124.298 0.61 0.0 485,778,000 62.08\n"
    assert filas_valle_de_bravo(texto) == [(1, 265.260, round(265.260 / CAPACIDAD_VALLE_DE_BRAVO_MM3 * 100, 2))]


def test_presa_publicada_es_consistente():
    ruta = PIPELINE.parent / "public" / "data" / "presa.json"
    if not ruta.exists():
        pytest.skip("Falta presa.json: corre el paso 08")
    d = json.loads(ruta.read_text(encoding="utf-8"))
    fechas = [s["fecha"] for s in d["serie"]]
    assert fechas == sorted(fechas) and len(fechas) == len(set(fechas))
    for s in d["serie"]:
        assert s["origen"] in ("reporte", "servicio", "semilla")
        assert 0 < s["porcentaje"] <= 115
        if s["origen"] == "reporte":
            assert abs(s["almacenamiento_mm3"] / d["capacidad_mm3"] * 100 - s["porcentaje"]) <= 0.06
    por_fecha = {s["fecha"]: s for s in d["serie"]}
    if "2026-11-02" in por_fecha:      # lunes cubierto por el reporte de noviembre de 2026
        assert por_fecha["2026-11-02"]["porcentaje"] == 98.39
