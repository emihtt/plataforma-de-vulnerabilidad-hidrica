import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from publicar_gh_pages import validar_artefacto


class PublicacionTest(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'data').mkdir()
        (self.root / 'index.html').write_bytes(b'<html>Prueba</html>')
        (self.root / 'sw.js').write_bytes(b'/* prueba */')
        (self.root / 'manifest.webmanifest').write_text('{}')
        (self.root / 'data/resumen.json').write_text('{}')
        self.version = {'source_commit': 'a' * 40, 'validation': 'passed', 'workflow_run': 'https://github.com/emihtt/plataforma-de-vulnerabilidad-hidrica/actions/runs/1', 'index_sha256': hashlib.sha256((self.root/'index.html').read_bytes()).hexdigest(), 'service_worker_sha256': hashlib.sha256((self.root/'sw.js').read_bytes()).hexdigest()}
        self.metadata()

    def metadata(self):
        (self.root / 'version.json').write_text(json.dumps(self.version))

    def test_acepta_artefacto_oficial_sin_archivos_ocultos(self):
        self.assertFalse((self.root/'.nojekyll').exists())
        self.assertEqual(validar_artefacto(self.root), self.version)

    def test_rechaza_compilacion_modificada(self):
        (self.root/'index.html').write_bytes(b'cambio posterior')
        with self.assertRaisesRegex(ValueError, 'cambi'):
            validar_artefacto(self.root)

    def test_rechaza_codigo_en_lugar_del_sitio_compilado(self):
        (self.root/'src').mkdir()
        with self.assertRaisesRegex(ValueError, 'solo el sitio compilado'):
            validar_artefacto(self.root)

    def test_rechaza_artefacto_sin_validacion(self):
        self.version['validation'] = 'failed'
        self.metadata()
        with self.assertRaisesRegex(ValueError, 'validaci'):
            validar_artefacto(self.root)


if __name__ == '__main__':
    unittest.main()
