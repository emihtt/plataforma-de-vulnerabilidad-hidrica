import { describe, expect, it } from 'vitest'
import { limitesAlmacenamiento } from './almacenamiento'

describe('límites de almacenamiento sin cruce censal', () => {
  it('acota todos los cruces posibles, no solo el máximo', () => {
    for (let cruce = 0; cruce <= 30; cruce++) {
      const sinNinguno = (100 - (60 + 30 - cruce)) / 100
      const limites = limitesAlmacenamiento(100, 60, 30)!
      expect(sinNinguno).toBeGreaterThanOrEqual(limites.minimo - 1e-12)
      expect(sinNinguno).toBeLessThanOrEqual(limites.maximo + 1e-12)
    }
    expect(limitesAlmacenamiento(100, 60, 30)?.minimo).toBeCloseTo(.1)
    expect(limitesAlmacenamiento(100, 60, 30)?.maximo).toBeCloseTo(.4)
    expect(limitesAlmacenamiento(100, 80, 70)).toEqual({ minimo: 0, maximo: .19999999999999996 })
  })
  it('omite universos incompletos o inválidos', () => {
    for (const caso of [[0, 0, 0], [100, 101, 0], [100, -1, 0], [100, null, 30], [NaN, 2, 3]]) {
      expect(limitesAlmacenamiento(...caso as [number, number | null, number])).toBeNull()
    }
  })
})
