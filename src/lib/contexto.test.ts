import { afterEach, expect, it, vi } from 'vitest'
import { hashTerritorio, leerHash } from './contexto'
afterEach(() => vi.unstubAllGlobals())
it('mantiene enlaces antiguos y descarta filtros incompatibles sin inventar unidades', () => {
  vi.stubGlobal('window', { location: { hash: '#/mapa?loc=151100037' } })
  expect(leerHash()).toMatchObject({ ruta: 'mapa', loc: '151100037', escala: 'localidad', variables: ['sin_agua_entubada'] })
  window.location.hash = '#/mapa?escala=cuenca&variables=sin_agua_entubada,marginacion'
  expect(leerHash()).toMatchObject({ escala: 'cuenca', variables: ['sin_agua_entubada'], aviso: true })
  window.location.hash = '#/mapa?escala=inventada&variables=no-existe'
  expect(leerHash()).toMatchObject({ escala: 'localidad', variables: ['sin_agua_entubada'], aviso: true })
})
it('conserva escala, unidad y variables en un enlace compartible', () => {
  vi.stubGlobal('window', { location: { hash: '#' + hashTerritorio('territorio', 'microcuenca', 'hb12-123', ['sin_agua_entubada', 'sin_drenaje']) } })
  expect(leerHash()).toMatchObject({ ruta: 'territorio', escala: 'microcuenca', unidad: 'hb12-123', variables: ['sin_agua_entubada', 'sin_drenaje'], aviso: false })
})
