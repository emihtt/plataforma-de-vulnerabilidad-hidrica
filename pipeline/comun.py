"""Utilidades comunes del pipeline: rutas, parámetros, descarga con caché y registro de fuentes."""
from __future__ import annotations

import json
import math
import re
import time
from datetime import date
from pathlib import Path

import requests
import yaml

RAIZ = Path(__file__).resolve().parent.parent
CRUDO = RAIZ / "data" / "crudo"
PROCESADO = RAIZ / "data" / "procesado"
SEMILLA = RAIZ / "data" / "semilla"
PUBLICO = RAIZ / "public" / "data"
FUENTES_JSON = PUBLICO / "fuentes.json"
ESTADO_MD = RAIZ / "ESTADO_DATOS.md"

AGENTE = {"User-Agent": "plataforma-agua-pipeline/0 (requests)"}

for _d in (CRUDO, PROCESADO, PUBLICO):
    _d.mkdir(parents=True, exist_ok=True)


def hoy() -> str:
    return date.today().isoformat()


def parametros() -> dict:
    with open(RAIZ / "config" / "parametros.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)


def descargar(url: str, destino: Path, timeout: int = 120, reintentos: int = 2,
              verificar_ssl: bool = True, **kwargs) -> Path:
    """Descarga a `destino` si no existe ya (caché). Devuelve la ruta."""
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    ultimo = None
    for intento in range(reintentos + 1):
        try:
            with requests.get(url, headers=AGENTE, timeout=timeout, stream=True,
                              verify=verificar_ssl, **kwargs) as r:
                r.raise_for_status()
                tmp = destino.with_suffix(destino.suffix + ".parcial")
                with open(tmp, "wb") as f:
                    for trozo in r.iter_content(1 << 16):
                        f.write(trozo)
                tmp.replace(destino)
                return destino
        except Exception as e:  # noqa: BLE001
            ultimo = e
            time.sleep(2 * (intento + 1))
    raise RuntimeError(f"No se pudo descargar {url}: {ultimo}")


def leer_json(ruta: Path, defecto=None):
    ruta = Path(ruta)
    if not ruta.exists():
        return defecto
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)


def _limpiar(o):
    """Convierte NaN/inf y tipos de numpy a valores JSON válidos."""
    try:
        import numpy as np
    except ImportError:  # pragma: no cover
        np = None
    if isinstance(o, dict):
        return {str(k): _limpiar(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_limpiar(v) for v in o]
    if np is not None:
        if isinstance(o, np.integer):
            return int(o)
        if isinstance(o, np.floating):
            o = float(o)
        if isinstance(o, np.bool_):
            return bool(o)
        if isinstance(o, np.ndarray):
            return _limpiar(o.tolist())
    if isinstance(o, float) and (math.isnan(o) or math.isinf(o)):
        return None
    return o


def escribir_json(ruta: Path, datos, compacto: bool = False) -> None:
    ruta = Path(ruta)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        if compacto:
            json.dump(_limpiar(datos), f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        else:
            json.dump(_limpiar(datos), f, ensure_ascii=False, indent=1, allow_nan=False)


def registrar_fuente(clave: str, **campos) -> None:
    """Crea o actualiza una entrada de public/data/fuentes.json.

    Campos esperados: nombre, institucion, url, fecha_dato, fecha_descarga, licencia,
    estado ('ok' | 'respaldo' | 'sin_dato'), nota, usada_en.
    """
    fuentes = leer_json(FUENTES_JSON, {"generado": hoy(), "fuentes": {}})
    entrada = fuentes["fuentes"].get(clave, {})
    entrada.update(campos)
    entrada.setdefault("fecha_descarga", hoy())
    fuentes["fuentes"][clave] = entrada
    fuentes["generado"] = hoy()
    escribir_json(FUENTES_JSON, fuentes)


def anotar_estado(titulo: str, texto: str) -> None:
    """Agrega (o reemplaza) una nota con título en la bitácora de ESTADO_DATOS.md."""
    contenido = ESTADO_MD.read_text(encoding="utf-8") if ESTADO_MD.exists() else "# Estado de los datos\n"
    if "## Bitácora" not in contenido:
        contenido = contenido.rstrip() + "\n\n## Bitácora\n"
    cabeza, bitacora = contenido.split("## Bitácora", 1)
    patron = re.compile(r"\n### " + re.escape(titulo) + r"\n.*?(?=\n### |\Z)", re.S)
    bitacora = patron.sub("", bitacora).rstrip()
    bitacora += f"\n\n### {titulo}\n{hoy()}. {texto.strip()}\n"
    ESTADO_MD.write_text(cabeza + "## Bitácora" + bitacora, encoding="utf-8")


# ---------- funciones puras reutilizadas ----------

_RE_GMS = re.compile(
    r"(\d+)\s*[°ºd]\s*(\d+)\s*['′’m]\s*([\d.]+)\s*(?:\"|″|”|''|s)?\s*([NSEWO])?", re.I)


def gms_a_decimal(texto, negativo_por_defecto: bool = False):
    """Convierte '100°07'52.303" W' a grados decimales. Oeste y sur son negativos."""
    if texto is None:
        return None
    s = str(texto).strip()
    if not s or s in ("*", "N/D"):
        return None
    m = _RE_GMS.search(s)
    if not m:
        try:
            return float(s)
        except ValueError:
            return None
    g, mi, se, hemi = m.groups()
    valor = int(g) + int(mi) / 60 + float(se) / 3600
    hemi = (hemi or "").upper()
    if hemi in ("W", "O", "S") or (not hemi and negativo_por_defecto):
        valor = -valor
    return valor


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


# ---------- localidades.geojson compartido entre pasos ----------

RUTA_LOCALIDADES = PUBLICO / "localidades.geojson"


def cargar_localidades() -> dict:
    datos = leer_json(RUTA_LOCALIDADES)
    if datos is None:
        raise RuntimeError("Falta public/data/localidades.geojson: corre primero el paso 01")
    return datos


def actualizar_localidades(nuevas: dict, quitar: tuple = ()) -> None:
    """Mezcla propiedades por cvegeo en localidades.geojson. `quitar` borra claves viejas antes."""
    datos = cargar_localidades()
    for rasgo in datos["features"]:
        p = rasgo["properties"]
        for k in quitar:
            p.pop(k, None)
        p.update(nuevas.get(p["cvegeo"], {}))
    escribir_json(RUTA_LOCALIDADES, datos, compacto=True)


def actualizar_resumen(**campos) -> None:
    resumen = leer_json(PUBLICO / "resumen.json", {})
    resumen.update(campos)
    escribir_json(PUBLICO / "resumen.json", resumen)
