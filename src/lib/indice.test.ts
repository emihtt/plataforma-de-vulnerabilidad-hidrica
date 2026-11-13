import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Localidad, Pesos, Resumen } from './datos'
import { indicePonderado, priorizar } from './indice'

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
})
