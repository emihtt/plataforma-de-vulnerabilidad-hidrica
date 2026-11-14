"""Publica un artefacto validado de main usando la cuenta Git de la persona.

Usar solo si Pages ya publica desde gh-pages. No configura permisos ni guarda
credenciales. La cuenta y el correo son los de la configuración Git del repo.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def git(*args, cwd=ROOT):
    return subprocess.check_output(['git', *args], cwd=cwd, text=True).strip()


def publicar(artifact):
    artifact = artifact.resolve()
    if git('status', '--porcelain'):
        raise RuntimeError('Guarda los cambios del código antes de publicar.')
    for name in ['src', 'interno', 'node_modules', '.git']:
        if (artifact / name).exists():
            raise ValueError('El directorio debe contener solo el sitio compilado.')
    if any(p.is_symlink() for p in artifact.rglob('*')):
        raise ValueError('No se publican enlaces simbólicos.')
    version = json.loads((artifact / 'version.json').read_text(encoding='utf-8'))
    for name, key in [('index.html', 'index_sha256'), ('sw.js', 'service_worker_sha256')]:
        if hashlib.sha256((artifact / name).read_bytes()).hexdigest() != version[key]:
            raise ValueError('El artefacto cambió después de las pruebas de CI.')
    if version.get('validation') != 'passed':
        raise ValueError('Falta la validación del artefacto.')
    for required in ['manifest.webmanifest', 'data/resumen.json', '.nojekyll']:
        if not (artifact / required).is_file():
            raise ValueError(f'Falta {required} en la compilación.')
    subprocess.run(['git', 'fetch', 'origin', 'main', 'gh-pages'], cwd=ROOT, check=True)
    if version['source_commit'] != git('rev-parse', 'origin/main'):
        raise ValueError('El artefacto no corresponde a main vigente.')
    identity = {'name': git('config', 'user.name'), 'email': git('config', 'user.email')}
    if not all(identity.values()):
        raise ValueError('Configura tu nombre y correo Git antes de publicar.')
    previous = git('rev-parse', 'origin/gh-pages')
    checkout = Path(tempfile.mkdtemp(prefix='pages-publicacion-', dir=ROOT.parent)).resolve()
    if checkout.parent != ROOT.parent.resolve() or not checkout.name.startswith('pages-publicacion-'):
        raise ValueError('Destino de publicación fuera del espacio esperado.')
    added = False
    try:
        subprocess.run(['git', 'worktree', 'add', '--detach', str(checkout), previous], cwd=ROOT, check=True)
        added = True
        if Path(git('rev-parse', '--show-toplevel', cwd=checkout)).resolve() != checkout:
            raise ValueError('El worktree aislado no coincide con el destino.')
        subprocess.run(['git', 'rm', '-r', '--ignore-unmatch', '.'], cwd=checkout, check=True, stdout=subprocess.DEVNULL)
        shutil.copytree(artifact, checkout, dirs_exist_ok=True)
        subprocess.run(['git', 'add', '-A'], cwd=checkout, check=True)
        subprocess.run(['git', 'commit', '-m', f'Publica version 0 desde main {version["source_commit"][:7]}'], cwd=checkout, check=True)
        published = git('rev-parse', 'HEAD', cwd=checkout)
        subprocess.run(['git', 'push', 'origin', 'HEAD:refs/heads/gh-pages'], cwd=checkout, check=True)
        print(json.dumps({'source_commit': version['source_commit'], 'published_commit': published, 'previous_publication': previous, 'identity': identity, 'workflow_run': version['workflow_run']}, ensure_ascii=True))
    finally:
        if added:
            subprocess.run(['git', 'worktree', 'remove', '--force', str(checkout)], cwd=ROOT, check=True)
        elif checkout.exists():
            checkout.rmdir()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact', required=True, type=Path, help='Directorio extraído del artefacto github-pages de CI')
    publicar(parser.parse_args().artifact)
