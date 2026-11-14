import { expect, it } from 'vitest'
import { resumirLluvia, type LluviaGuardada } from './lluvia'

const guardado = (): LluviaGuardada => ({ consultado: '2026-11-14T12:00:00Z', dias: Array.from({ length: 44 }, (_, i) => ({ fecha: new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10), mm: 1, prob: null, tmax: null, tmin: null })) })
it('acumula exactamente los 30 dias calendario anteriores a la consulta', () => {
  const r = resumirLluvia(guardado(), null)
  expect(r.acumulado30).toBe(30)
  expect(r.ultimos30[0].fecha).toBe('2026-10-15')
  expect(r.hasta).toBe('2026-11-13')
})
it('no inventa ceros ni rellena huecos con datos anteriores', () => {
  const g = guardado()
  g.dias.find((d) => d.fecha === '2026-11-05')!.mm = null
  expect(resumirLluvia(g, null).acumulado30).toBeNull()
  g.dias = g.dias.filter((d) => d.fecha !== '2026-11-05')
  expect(resumirLluvia(g, null).acumulado30).toBeNull()
  expect(resumirLluvia(g, null).pctNormal).toBeNull()
})
