// Lluvia reciente y pronóstico (Open-Meteo), consultados desde el navegador y guardados para uso sin conexión.
import { useEffect, useState } from 'react'
import type { Normales } from './datos'
import { fechaMexico } from './formato'

export interface DiaLluvia {
  fecha: string
  mm: number | null
  prob: number | null
  tmax: number | null
  tmin: number | null
}

export interface LluviaGuardada {
  consultado: string // fecha y hora de la consulta
  dias: DiaLluvia[]
}

export type EstadoLluvia = 'cargando' | 'actual' | 'guardado' | 'sin_dato'

const CLAVE = 'plataforma-agua:lluvia:v1'

export function validarLluvia(v: unknown): v is LluviaGuardada {
  if (!v || typeof v !== 'object') return false
  const g = v as LluviaGuardada
  if (typeof g.consultado !== 'string' || !Number.isFinite(Date.parse(g.consultado)) || !Array.isArray(g.dias) || g.dias.length > 400) return false
  const valor = (n: unknown, min = -Infinity, max = Infinity) => n === null || typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max
  const fechas = new Set<string>()
  return g.dias.every((d) => {
    if (!d || typeof d.fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || !Number.isFinite(Date.parse(d.fecha)) || new Date(d.fecha).toISOString().slice(0, 10) !== d.fecha || fechas.has(d.fecha)) return false
    fechas.add(d.fecha)
    return valor(d.mm, 0) && valor(d.prob, 0, 100) && valor(d.tmax) && valor(d.tmin)
  })
}

export function leerLluviaGuardada(raw: string | null): LluviaGuardada | null {
  try { const g: unknown = JSON.parse(raw ?? 'null'); return validarLluvia(g) ? g : null } catch { return null }
}

function leerGuardado(): LluviaGuardada | null {
  try {
    const t = localStorage.getItem(CLAVE)
    return leerLluviaGuardada(t)
  } catch {
    return null
  }
}

export function useLluvia(punto: { lat: number; lon: number } | undefined, activa = true) {
  const [datos, setDatos] = useState<LluviaGuardada | null>(() => leerGuardado())
  const [estado, setEstado] = useState<EstadoLluvia>('cargando')

  useEffect(() => {
    if (!punto || !activa) return
    let vivo = true
    setEstado('cargando')
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${punto.lat}&longitude=${punto.lon}` +
      '&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min' +
      '&past_days=92&forecast_days=7&timezone=America%2FMexico_City'
    const control = new AbortController()
    const limite = setTimeout(() => control.abort(), 12000)
    fetch(url, { signal: control.signal, cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((j) => {
        const d = j.daily
        const dias: DiaLluvia[] = d.time.map((fecha: string, i: number) => ({
          fecha,
          mm: d.precipitation_sum[i],
          prob: d.precipitation_probability_max?.[i] ?? null,
          tmax: d.temperature_2m_max?.[i] ?? null,
          tmin: d.temperature_2m_min?.[i] ?? null,
        }))
        const nuevo = { consultado: new Date().toISOString(), dias }
        if (!validarLluvia(nuevo)) throw new Error('La respuesta de lluvia no tiene datos válidos.')
        try {
          localStorage.setItem(CLAVE, JSON.stringify(nuevo))
        } catch {
          /* sin almacenamiento local: se sigue sin guardar */
        }
        if (vivo) {
          setDatos(nuevo)
          setEstado('actual')
        }
      })
      .catch(() => {
        if (vivo) setEstado(leerGuardado() ? 'guardado' : 'sin_dato')
      })
      .finally(() => clearTimeout(limite))
    return () => {
      vivo = false
      control.abort()
    }
  }, [punto?.lat, punto?.lon, activa])

  return { datos, estado }
}

export interface ResumenLluvia {
  ultimos30: DiaLluvia[]
  pronostico: DiaLluvia[]
  acumulado30: number | null
  normal30: number | null
  pctNormal: number | null
  hasta: string | null // último día observado
}

/** Compara la lluvia de los 30 días que terminan ayer con la normal de esa misma ventana. */
export function resumirLluvia(g: LluviaGuardada | null, normales: Normales | null): ResumenLluvia {
  const vacio: ResumenLluvia = { ultimos30: [], pronostico: [], acumulado30: null, normal30: null, pctNormal: null, hasta: null }
  if (!validarLluvia(g)) return vacio
  // "hoy" es el día de la consulta, no el día en que se mira un dato guardado
  const hoy = fechaMexico(new Date(g.consultado))
  const inicio = new Date(`${hoy}T12:00:00Z`)
  inicio.setUTCDate(inicio.getUTCDate() - 30)
  const desde = inicio.toISOString().slice(0, 10)
  const ultimos30 = g.dias.filter((d) => d.fecha >= desde && d.fecha < hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const pronostico = g.dias.filter((d) => d.fecha >= hoy).slice(0, 7)
  // No sustituir días faltantes por cero ni completar la ventana con días más antiguos.
  if (ultimos30.length !== 30 || new Set(ultimos30.map((d) => d.fecha)).size !== 30 || ultimos30.some((d) => d.mm === null || !Number.isFinite(d.mm))) return { ...vacio, ultimos30, pronostico }
  const acumulado30 = ultimos30.reduce((s, d) => s + d.mm!, 0)
  const hasta = ultimos30[ultimos30.length - 1].fecha
  const normal = normales?.normal_30d_mm[hasta.slice(5)]
  const normal30 = typeof normal === 'number' && Number.isFinite(normal) && normal > 0 ? normal : null
  const pctNormal = normal30 && normal30 > 0 ? (100 * acumulado30) / normal30 : null
  return { ultimos30, pronostico, acumulado30, normal30, pctNormal, hasta }
}

export type Senal = 'verde' | 'atencion' | 'alerta'

export function senal(valor: number | null | undefined, verdeDesde: number, atencionDesde: number): Senal | null {
  if (valor === null || valor === undefined) return null
  if (valor >= verdeDesde) return 'verde'
  if (valor >= atencionDesde) return 'atencion'
  return 'alerta'
}
