import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Datos } from './datos'
import { cambioIndicador, crearEjemplos, importarProyectos, validarProyecto } from './proyectos'
import { lineaBase, priorizarTerritorios, rangos, territorios } from './territorios'
const leer = (f: string) => JSON.parse(readFileSync(`public/data/${f}`, 'utf-8'))
const datos = { resumen: leer('resumen.json'), hidricas: leer('unidades_hidricas.json'), localidades: leer('localidades.geojson').features.map((f: { properties: object; geometry: { coordinates: number[] } }) => ({ ...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] })), fuentes: null, normales: null, nacional: null, smn: null, presa: null } as Datos

it('conserva población y conteos al agrupar las unidades, sin duplicar localidades', () => {
  for (const escala of ['cuenca', 'microcuenca'] as const) {
    const unidades = territorios(datos, escala)
    const claves = unidades.flatMap((t) => t.localidades.map((l) => l.cvegeo))
    expect(claves).toHaveLength(72); expect(new Set(claves).size).toBe(72)
    const bases = unidades.map(lineaBase)
    expect(bases.reduce((s, b) => s + b.poblacion, 0)).toBe(datos.resumen.censo.pob_total)
    expect(bases.reduce((s, b) => s + (b.agua.valor ?? 0), 0)).toBe(datos.resumen.censo.viv_sin_agua)
    expect(bases.reduce((s, b) => s + b.conDatos, 0)).toBe(66)
  }
})
it('agrega tasas con denominadores y cotas por vivienda, sin promediar porcentajes', () => {
  const t = territorios(datos, 'cuenca')[0], b = lineaBase(t)
  expect(b.agua.proporcion).toBeCloseTo(b.agua.valor! / b.agua.n, 12)
  expect(b.almacenamiento!.minimo).toBeLessThanOrEqual(b.almacenamiento!.maximo)
  expect(b.almacenamiento!.n).toBe(b.agua.n)
  expect(b.conDatos).toBeLessThan(b.totalLocalidades)
})
it('no crea una clase muy alta al haber una sola cuenca', () => {
  const p = { ...datos.resumen.parametros.indice_prioridad.pesos }
  for (const k of Object.keys(p) as (keyof typeof p)[]) p[k] = k === 'sin_agua_entubada' ? 1 : 0
  const r = priorizarTerritorios(territorios(datos, 'cuenca'), p)
  expect(r).toHaveLength(1); expect(r[0].clase).toBeNull()
  expect(rangos([0, 0, null, 1])).toEqual([1 / 3, 1 / 3, null, 5 / 6])
})
it('los tres ejemplos son ficticios y tienen territorios y relaciones válidas', () => {
  const ejemplos = crearEjemplos(datos)
  expect(ejemplos).toHaveLength(3)
  ejemplos.forEach((p) => { expect(p.ejemplo).toBe(true); expect(() => validarProyecto(p)).not.toThrow() })
  expect(importarProyectos(JSON.stringify({ schemaVersion: 1, proyectos: ejemplos }), [], datos)).toEqual(ejemplos)
  // Dos financiadores del mismo componente no crean otra meta ni beneficiarios únicos.
  expect(ejemplos[0].aportes[0].componentes).toEqual(ejemplos[0].aportes[1].componentes)
  expect(ejemplos[0].componentes[0].personas).toBe(80)
})
it('rechaza conflictos, montos inválidos, relaciones rotas y cambios parciales de una importación', () => {
  const p = crearEjemplos(datos)[0]
  expect(() => importarProyectos(JSON.stringify({ schemaVersion: 1, proyectos: [p] }), [p], datos)).toThrow('ya existe')
  const roto = structuredClone(p); roto.aportes[0].componentes = ['no-existe']
  expect(() => validarProyecto(roto)).toThrow()
  roto.aportes = []; roto.componentes[0].personas = -1
  expect(() => validarProyecto(roto)).toThrow()
  const desconocido = { ...p, territorioId: 'inventado' }
  expect(() => importarProyectos(JSON.stringify({ schemaVersion: 1, proyectos: [desconocido] }), [], datos)).toThrow('Territorio desconocido')
  expect(() => importarProyectos('{"schemaVersion":2,"proyectos":[]}', [], datos)).toThrow('incompatible')
})
it('no inventa cambio relativo con base cero ni convierte faltantes en ceros', () => {
  const i = crearEjemplos(datos)[0].indicadores[0]
  expect(cambioIndicador(i)?.absoluto).toBe(8); expect(cambioIndicador(i)?.relativo).toBeNull()
  i.mediciones.push({ fecha: '2026-12-01', valor: null, nota: 'faltante' })
  expect(cambioIndicador(i)?.ultima.fecha).toBe('2026-11-01')
  i.mediciones = [i.mediciones[0]]; expect(cambioIndicador(i)).toBeNull()
})
