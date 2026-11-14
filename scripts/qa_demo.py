"""Entrada compatible: ejecuta la prueba vigente de la demo con perfiles."""
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name('qa_perfiles.py')), run_name='__main__')
