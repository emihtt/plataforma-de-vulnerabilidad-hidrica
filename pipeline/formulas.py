"""Fórmulas de la versión 0, como funciones puras. Cada una tiene su prueba en pipeline/tests/.

La aplicación repite `indice_ponderado` y `clases_por_quintil` en src/lib/indice.ts para que
los controles de pesos recalculen en el navegador con la misma fórmula.
"""
from __future__ import annotations

import math
from typing import Sequence

import numpy as np

CLASES = ["Muy alta", "Alta", "Media", "Baja", "Muy baja"]


def limites_almacenamiento(n, tinacos, cisternas):
    """Sin cruce entre equipamientos: max(0,1-(T+C)/N) <= sin ambos <= 1-max(T,C)/N.

    No se interpreta el extremo superior como una carencia mínima. Los tres conteos
    deben corresponder al mismo universo; valores faltantes o inválidos no se estiman.
    """
    if any(v is None or not math.isfinite(v) for v in (n, tinacos, cisternas)):
        return None
    if n <= 0 or not 0 <= tinacos <= n or not 0 <= cisternas <= n:
        return None
    return max(0, 1 - (tinacos + cisternas) / n), 1 - max(tinacos, cisternas) / n


# ---------- 3.1 Índice de prioridad ----------

def rango_percentil(valores: Sequence) -> list:
    """r_i = (menores que x_i + 0.5 × iguales a x_i, contándose a sí misma) / n.

    Los nulos se quedan nulos y no cuentan en n.
    """
    con_dato = [v for v in valores if v is not None and not (isinstance(v, float) and math.isnan(v))]
    n = len(con_dato)
    salida = []
    for v in valores:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            salida.append(None)
            continue
        menores = sum(1 for x in con_dato if x < v)
        iguales = sum(1 for x in con_dato if x == v)
        salida.append((menores + 0.5 * iguales) / n)
    return salida


def indice_ponderado(rangos: dict, pesos: dict):
    """Σ peso_k × r_k. Si falta un componente se reparte su peso entre los demás.

    Devuelve (índice o None, lista de componentes faltantes).
    """
    presentes = {k: rangos.get(k) for k in pesos if rangos.get(k) is not None}
    faltantes = [k for k in pesos if k not in presentes]
    suma_pesos = sum(pesos[k] for k in presentes)
    if suma_pesos <= 0:
        return None, faltantes
    return sum(pesos[k] * presentes[k] for k in presentes) / suma_pesos, faltantes


def n_grupo_superior(n: int, clases: int = 5) -> int:
    return math.ceil(n / clases)


def clases_por_quintil(indices: Sequence[float], clases: int = 5) -> list[str]:
    """Quintiles por posición: se ordena de mayor a menor y cada grupo tiene ceil(n/5) lugares
    (el último grupo absorbe la diferencia). Los empates se rompen por posición original."""
    n = len(indices)
    tam = n_grupo_superior(n, clases)
    orden = sorted(range(n), key=lambda i: (-indices[i], i))
    salida = [""] * n
    for pos, i in enumerate(orden):
        salida[i] = CLASES[min(pos // tam, clases - 1)]
    return salida


# ---------- 3.3 Robustez ----------

def robustez(matriz_rangos: np.ndarray, pesos_base: Sequence[float], simulaciones: int,
             concentracion: float, semilla: int) -> np.ndarray:
    """Proporción de simulaciones (pesos Dirichlet de parámetro concentración × pesos base) en que
    cada localidad queda en el grupo de mayor prioridad. `matriz_rangos`: localidades × componentes,
    con NaN donde falta el componente (su peso se reparte)."""
    rng = np.random.default_rng(semilla)
    w = rng.dirichlet(np.asarray(pesos_base, dtype=float) * concentracion, size=simulaciones)   # sims × k
    presente = ~np.isnan(matriz_rangos)
    r = np.where(presente, matriz_rangos, 0.0)
    numer = w @ r.T                                    # sims × n
    denom = w @ presente.T.astype(float)
    idx = numer / denom
    n = matriz_rangos.shape[0]
    tope = n_grupo_superior(n)
    orden = np.argsort(-idx, axis=1, kind="stable")[:, :tope]
    cuenta = np.zeros(n)
    for fila in orden:
        cuenta[fila] += 1
    return cuenta / simulaciones


# ---------- 3.2 Captación de lluvia ----------

def balance_captacion(lluvia_mm: Sequence[float], personas: float, area_m2: float, coef: float,
                      primer_lavado_mm: float, dotacion_l: float, tanque_l: float,
                      dias_calentamiento: int = 0, meses: Sequence[int] | None = None,
                      anios: Sequence[int] | None = None) -> dict:
    """Balance diario de un tanque. Arranca vacío; el excedente se derrama.

    Devuelve series (captación, abasto, volumen al final del día) e indicadores calculados
    después de descartar `dias_calentamiento`.
    """
    demanda = personas * dotacion_l
    v = 0.0
    captacion, abasto, volumen = [], [], []
    for p in lluvia_mm:
        c = max(p - primer_lavado_mm, 0.0) * area_m2 * coef       # 1 mm sobre 1 m² = 1 litro
        v = min(tanque_l, v + c)
        a = min(v, demanda)
        v -= a
        captacion.append(c)
        abasto.append(a)
        volumen.append(v)
    k = dias_calentamiento
    ab, n = abasto[k:], len(abasto[k:])
    cubiertos = [a >= demanda - 1e-9 for a in ab]
    racha = mayor = 0
    for ok in cubiertos:
        racha = 0 if ok else racha + 1
        mayor = max(mayor, racha)
    salida = {
        "captacion": captacion, "abasto": abasto, "volumen": volumen, "demanda_l_dia": demanda,
        "confiabilidad_volumen": (sum(ab) / (demanda * n)) if n and demanda > 0 else None,
        "confiabilidad_dias": (sum(cubiertos) / n) if n else None,
        "racha_seca_max_dias": mayor,
    }
    if meses is not None and anios is not None:
        por_mes: dict[tuple, list] = {}
        for a, m, y in zip(ab, list(meses)[k:], list(anios)[k:]):
            por_mes.setdefault((y, m), [0.0, 0])
            por_mes[(y, m)][0] += a
            por_mes[(y, m)][1] += 1
        n_anios = len({y for y, _ in por_mes})
        buenos = sum(1 for s, d in por_mes.values() if s >= 0.9 * demanda * d)
        salida["meses_autonomia"] = buenos / n_anios if n_anios else None
    return salida


def litros_captables_anio(lluvia_mm: Sequence[float], n_anios: float, area_m2: float, coef: float,
                          primer_lavado_mm: float) -> float:
    return sum(max(p - primer_lavado_mm, 0.0) * area_m2 * coef for p in lluvia_mm) / n_anios


def cobertura_potencial(litros_anio: float, demanda_l_dia: float) -> float:
    return min(1.0, litros_anio / (demanda_l_dia * 365))


def meses_secos_consecutivos(mensual_mm: Sequence[float], umbral_mm: float) -> int:
    """Racha más larga de meses consecutivos con lluvia promedio menor al umbral (el año es circular)."""
    secos = [m < umbral_mm for m in mensual_mm]
    if all(secos):
        return len(secos)
    mayor = racha = 0
    for s in secos + secos:
        racha = racha + 1 if s else 0
        mayor = max(mayor, racha)
    return min(mayor, len(secos))


# ---------- 3.5 Semáforo ----------

def semaforo(valor, verde_desde: float, atencion_desde: float) -> str | None:
    if valor is None:
        return None
    if valor >= verde_desde:
        return "verde"
    if valor >= atencion_desde:
        return "atencion"
    return "alerta"
