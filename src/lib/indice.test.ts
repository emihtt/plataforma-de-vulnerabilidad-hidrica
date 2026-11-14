import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Localidad, Pesos, Resumen } from './datos'
import { indicePonderado, normalizarPesos, pesosActivos, priorizar } from './indice'

const geo = JSON.parse(readFileSync('public/data/localidades.geojson', 'utf-8'))
const resumen = JSON.parse(readFileSync('public/data/resumen.json', 'utf-8')) as Resumen
const localidades: Localidad[] = geo.features.map((f: { properties: Localidad }) => f.properties)
const pesos: Pesos = resumen.parametros.indice_prioridad.pesos

describe('índice en el navegador', () => {
  it('con pesos base da el mismo orden, índice y clase que el pipeline', () => {
    const r = priorizar(localidades, pesos)
    expect(r.length).toBe(resumen.censo.localidades_con_datos)
    for (const x of r) {
      expect(x.lugar).toBe(x.loc.iphc_lugar)
      expect(x.clase).toBe(x.loc.iphc_clase)
      expect(x.indice).toBeCloseTo(x.loc.iphc!, 3)
    }
  })

  it('ninguna localidad enmascarada entra en la lista', () => {
    expect(priorizar(localidades, pesos).some((x) => x.loc.enmascarada)).toBe(false)
  })

  it('reparte el peso de un componente faltante', () => {
    const p = { ...pesos }
    expect(indicePonderado({ sin_agua_entubada: 1, marginacion: null, aislamiento: 1, sin_almacenamiento: 1, sin_drenaje: 1, hogares_indigenas: 1 }, p)).toBeCloseTo(1)
  })

  it('conserva prioridades al cambiar de escala con preferencias de variables inactivas', () => {
    const crudos = Object.fromEntries(Object.keys(pesos).map((k) => [k, k === 'marginacion' ? 100 : 0])) as Pesos
    const activos = pesosActivos(crudos, pesos, ['sin_agua_entubada'])
    expect(activos.sin_agua_entubada).toBe(1)
    expect(priorizar(localidades, activos)).toHaveLength(resumen.censo.localidades_con_datos)
    expect(activos.marginacion).toBe(0)
  })

  it('normaliza pesos grandes sin producir ceros por desbordamiento', () => {
    const p = Object.fromEntries(Object.keys(pesos).map((k) => [k, 1e308])) as Pesos
    const normalizados = normalizarPesos(p)
    expect(Object.values(normalizados).reduce((s, x) => s + x, 0)).toBeCloseTo(1)
    expect(Object.values(normalizados).every((x) => x > 0)).toBe(true)
    expect(indicePonderado({ sin_agua_entubada: NaN }, pesos)).toBeNull()
  })
})
