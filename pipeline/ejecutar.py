"""Corre el pipeline completo en orden. Es idempotente y usa lo ya descargado en data/crudo/.

    python pipeline/ejecutar.py            # todo
    python pipeline/ejecutar.py --solo 04  # un paso
    python pipeline/ejecutar.py --desde 05 # de un paso en adelante
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
# El orden importa: lluvia antes de captación, y todo antes de aptitud. 99 copia los supuestos vigentes.
PASOS = ["01_localidades", "02_contexto_osm", "03_marginacion", "04_lluvia", "05_scall", "06_indice",
         "07_aptitud", "08_presa", "09_normales", "10_nacional", "11_pronostico_smn", "99_cierre"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--solo", help="número de paso, por ejemplo 04")
    ap.add_argument("--desde", help="corre desde este paso")
    ap.add_argument("--probar-fuentes", action="store_true", help="corre antes 00_probar_fuentes")
    a = ap.parse_args()
    pasos = PASOS
    if a.solo:
        pasos = [p for p in PASOS if p.startswith(a.solo)]
    elif a.desde:
        pasos = [p for p in PASOS if p[:2] >= a.desde]
    if a.probar_fuentes:
        pasos = ["00_probar_fuentes"] + pasos
    for paso in pasos:
        print(f"\n== {paso} ==", flush=True)
        r = subprocess.run([sys.executable, str(AQUI / f"{paso}.py")], cwd=AQUI)
        if r.returncode != 0:
            sys.exit(f"El paso {paso} falló; se detiene el pipeline.")
    print("\nPipeline terminado.")


if __name__ == "__main__":
    main()
