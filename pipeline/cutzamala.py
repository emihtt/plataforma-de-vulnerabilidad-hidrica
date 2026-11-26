"""Lectura de los reportes diarios «Almacenamiento en presas del Sistema Cutzamala» de Conagua
(Organismo de Cuenca Aguas del Valle de México). Funciones puras, con prueba en pipeline/tests/.

Cada reporte mensual es un PDF con una fila por día y, por presa, almacenamiento (millones de m³),
porcentaje de llenado y lluvia. El orden de las columnas no se da por sabido: la pareja
(almacenamiento, porcentaje) de Valle de Bravo se reconoce porque cumple
porcentaje = almacenamiento / capacidad × 100 con la capacidad de esa presa.
"""
from __future__ import annotations

import re

CAPACIDAD_VALLE_DE_BRAVO_MM3 = 394.390
MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE",
         "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
_NUMERO = re.compile(r"^\d{1,3}\.\d{1,3}$")
_SUMA = re.compile(r"^\d{2,3},\d{3},\d{3}$")
ALMACENAMIENTO_MINIMO_MM3 = 20.0     # por debajo no es un almacenamiento creíble de esta presa


_LETRA = "A-ZÁÉÍÓÚÑ"


def anio_de_pagina(texto: str):
    m = re.search(r"SISTEMA\s+CUTZAMALA\s+(20\d{2})", texto.upper())
    return int(m.group(1)) if m else None


def mes_de_pagina(texto: str):
    """Mes del encabezado de la página. Devuelve None si no hay ninguno o si hay más de uno distinto."""
    mayus = texto.upper()
    hallados = {i + 1 for i, m in enumerate(MESES) if re.search(rf"(?<![{_LETRA}]){m}(?![{_LETRA}])", mayus)}
    return hallados.pop() if len(hallados) == 1 else None


def periodo_del_reporte(texto: str):
    """Devuelve (año, mes) leídos del encabezado de una página, o None si no se reconocen."""
    anio, mes = anio_de_pagina(texto), mes_de_pagina(texto)
    return (anio, mes) if anio and mes else None


def filas_valle_de_bravo(texto: str, capacidad: float = CAPACIDAD_VALLE_DE_BRAVO_MM3, tolerancia: float = 0.06):
    """Devuelve [(día, almacenamiento_mm3, porcentaje)] de Valle de Bravo.

    Se descartan los días sin dato y cualquier fila donde no haya exactamente una pareja
    consistente con la capacidad de la presa: no se estima ni se corrige nada.
    """
    salida = []
    for linea in texto.splitlines():
        partes = linea.split()
        if len(partes) < 3 or not partes[0].isdigit() or not 1 <= int(partes[0]) <= 31:
            continue
        valores = partes[1:]
        # Solo filas de la tabla de almacenamiento: traen la suma del sistema en m³ (p. ej. 748,778,000).
        # Así no se confunden con otras tablas del mismo PDF, como la de calidad del agua.
        if not any(_SUMA.match(v) for v in valores):
            continue
        candidatas = []
        for a, p in zip(valores, valores[1:]):
            if not (_NUMERO.match(a) and _NUMERO.match(p)):
                continue
            alm, pct = float(a), float(p)
            if alm < ALMACENAMIENTO_MINIMO_MM3:
                continue
            if abs(alm / capacidad * 100 - pct) <= tolerancia:
                candidatas.append((alm, pct))
            elif pct < 1.5 and abs(alm / capacidad - pct) <= 0.006:
                # Algunos reportes traen el llenado como fracción con dos decimales (0.67):
                # el porcentaje se calcula entonces con el almacenamiento publicado.
                candidatas.append((alm, round(alm / capacidad * 100, 2)))
        if len(candidatas) == 1:
            salida.append((int(partes[0]), candidatas[0][0], candidatas[0][1]))
    return salida
