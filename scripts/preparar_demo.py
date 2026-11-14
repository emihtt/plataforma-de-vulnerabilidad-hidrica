"""Empaqueta dist y un CPython Windows existente. No descarga ni publica nada."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--runtime-dir', type=Path, required=True)
ap.add_argument('--output', type=Path, required=True)
args = ap.parse_args()
repo = Path(__file__).resolve().parents[1]
if not (repo / 'dist/index.html').is_file():
    raise SystemExit('Primero: npm run build')
if args.output.exists():
    raise SystemExit('El destino ya existe. Usa una carpeta nueva para conservar versiones.')
if not (args.runtime_dir / 'python.exe').is_file() or not (args.runtime_dir / 'LICENSE.txt').is_file():
    raise SystemExit('No se encontro el runtime Python y su licencia.')
args.output.mkdir(parents=True)
shutil.copytree(repo / 'dist', args.output / 'sitio')
runtime = args.output / 'runtime'
runtime.mkdir()
for f in args.runtime_dir.iterdir():
    if f.is_file() and (f.suffix.lower() in {'.exe', '.dll', '.pyd', '.zip', '.cat'} or f.name == 'LICENSE.txt'):
        shutil.copy2(f, runtime / f.name)
(runtime / 'python312._pth').write_text('python312.zip\n.\n', encoding='ascii')
shutil.copy2(repo / 'scripts/iniciar_demo.py', args.output / 'iniciar_demo.py')
(args.output / 'ABRIR_DEMO.cmd').write_text('@echo off\r\n"%~dp0runtime\\python.exe" "%~dp0iniciar_demo.py"\r\nif errorlevel 1 pause\r\n', encoding='ascii')
(args.output / 'ABRIR_DEMO_Mac.command').write_text('#!/bin/sh\ncd "$(dirname "$0")"\npython3 iniciar_demo.py\n', encoding='utf-8')
# La guía de presentación es un documento interno: no vive en el repositorio público.
guia = repo / 'interno/GUIA_PRESENTACION.html'
if guia.is_file():
    shutil.copy2(guia, args.output / 'GUIA_PRESENTACION.html')
shutil.copy2(repo / 'docs/REVISION_DEMO.html', args.output / 'REVISION_DEMO.html')
shutil.copy2(repo / 'docs/LEEME_DEMO.txt', args.output / 'LEEME_PRIMERO.txt')
marker = {'candidate': 'Valle-de-Bravo-perfiles-2026-11-14',
          'index_sha256': hashlib.sha256((repo / 'dist/index.html').read_bytes()).hexdigest(),
          'build_sha256': hashlib.sha256((repo / 'dist/index.html').read_bytes() + (repo / 'dist/sw.js').read_bytes()).hexdigest()}
(args.output / 'sitio/demo-id.json').write_text(json.dumps(marker), encoding='utf-8')
files = {str(p.relative_to(args.output)).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p in args.output.rglob('*') if p.is_file()}
(args.output / 'integridad.json').write_text(json.dumps(files, indent=2), encoding='utf-8')
print(json.dumps({'output': str(args.output), 'files': len(files), 'bytes': sum(p.stat().st_size for p in args.output.rglob('*') if p.is_file())}))
