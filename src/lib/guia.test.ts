import { expect, it } from 'vitest'
import { APARTADOS, fragmentos, fuenteGuia, guia, leerGuia } from './guia'

const TITULOS = ['Tala o desmonte', 'Descarga de aguas residuales', 'Obra o relleno en un cauce', 'Represa u olla que retiene un arroyo', 'Tiradero en barranca', 'Fuga o falta de agua']

it('cubre las seis situaciones acordadas, con los cinco apartados cada una', () => {
  expect(guia.situaciones.map(({ id }) => id)).toEqual(['tala', 'descarga', 'obra', 'retencion', 'tiradero', 'servicio'])
  expect(guia.situaciones.map(({ titulo }) => titulo)).toEqual(TITULOS)
  for (const s of guia.situaciones) {
    for (const a of APARTADOS) expect(s.apartados[a.clave].every((t) => t.trim()), `${s.titulo}: ${a.titulo}`).toBe(true)
  }
})

it('muestra el aviso y una fecha de corte válida', () => {
  expect(guia.aviso).toBe('Información orientativa, no asesoría legal.')
  expect(guia.fechaCorte).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(Number.isNaN(Date.parse(guia.fechaCorte))).toBe(false)
  expect(guia.notaCorte).toMatch(/enlaces/)
})

it('no publica marcas pendientes ni la palabra «ilegal»', () => {
  expect(fuenteGuia).not.toMatch(/\[(VERIFICAR|PENDIENTE)/i)
  expect(fuenteGuia).not.toMatch(/ilegal/i)
})

it('cada situación tiene al menos un canal que se puede abrir o marcar', () => {
  for (const s of guia.situaciones) {
    const tocables = s.apartados.canal.flatMap(fragmentos).filter((f) => f.tipo === 'enlace' || f.tipo === 'telefono')
    expect(tocables.length, s.titulo).toBeGreaterThan(0)
  }
})

it('convierte en enlace cada dirección del archivo y solo usa https, mailto o tel', () => {
  const textos = [guia.avisoDetalle, ...guia.antes, ...guia.situaciones.flatMap((s) => Object.values(s.apartados).flat())]
  const hrefs = textos.flatMap(fragmentos).flatMap((f) => ('href' in f ? [f.href] : []))
  const enTabla = guia.canales.flatMap((c) => (c.enlace ? [c.enlace] : []))
  const enArchivo = new Set(fuenteGuia.match(/https:\/\/[^\s<>|]*[^\s<>|.,;:)]/g))
  expect(new Set([...hrefs.filter((h) => h.startsWith('https://')), ...enTabla])).toEqual(enArchivo)
  for (const h of hrefs) expect(h).toMatch(/^(https:\/\/|mailto:|tel:)/)
})

it('reconoce teléfonos, correos y negritas sin tragarse la puntuación', () => {
  expect(fragmentos('**PROFEPA**, teléfono 800 776 3372. Correo: denuncias@profepa.gob.mx. Más: <https://www.gob.mx/profepa>')).toEqual([
    { tipo: 'negrita', texto: 'PROFEPA' },
    { tipo: 'texto', texto: ', teléfono ' },
    { tipo: 'telefono', texto: '800 776 3372', href: 'tel:+528007763372' },
    { tipo: 'texto', texto: '. Correo: ' },
    { tipo: 'correo', texto: 'denuncias@profepa.gob.mx', href: 'mailto:denuncias@profepa.gob.mx' },
    { tipo: 'texto', texto: '. Más: ' },
    { tipo: 'enlace', texto: 'https://www.gob.mx/profepa', href: 'https://www.gob.mx/profepa' },
  ])
  expect(fragmentos('llama al 911.')[1]).toEqual({ tipo: 'telefono', texto: '911', href: 'tel:911' })
})

it('lee el archivo con fin de línea de Windows y rechaza apartados desconocidos', () => {
  expect(leerGuia(fuenteGuia.replace(/\r?\n/g, '\r\n')).situaciones).toHaveLength(6)
  expect(() => leerGuia(fuenteGuia.replace('**Evidencia útil**', '**Pruebas**'))).toThrow(/Apartado desconocido/)
  expect(() => leerGuia(fuenteGuia.replace(/\n## 6\.[\s\S]*?(?=\n## Canales)/, ''))).toThrow(/6 situaciones/)
})
