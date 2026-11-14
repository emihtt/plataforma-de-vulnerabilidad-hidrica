import { useMemo, useState } from 'react'
import { Boton, Pie, Supuesto, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'
import { num, pct } from '../lib/formato'
import { COLOR_CLASE, COMPONENTES, pesosIguales } from '../lib/indice'
import { useControlesPesos } from '../lib/useControlesPesos'
import ControlesTerritorio from '../componentes/ControlesTerritorio'
import ListaUnidades from '../componentes/ListaUnidades'
import PesosUnidades from '../componentes/PesosUnidades'

function sinAcentos(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function aNumero(t: string): number | null {
  const v = Number(t.replace(/[^\d.]/g, ''))
  return t.trim() !== '' && Number.isFinite(v) && v > 0 ? v : null
}

export default function Prioridades() {
  const { ranking, pesos, pesosBase, abrirFicha, datos, variables, escala } = useEstado()
  const { puntos, mover, restablecer } = useControlesPesos()
  const [busca, setBusca] = useState('')
  const [controles, setControles] = useState(() => window.matchMedia('(min-width: 701px)').matches)
  const [presupuesto, setPresupuesto] = useState('')
  const [costo, setCosto] = useState('')
  const cambiado = !pesosIguales(pesos, pesosBase)

  const visibles = useMemo(() => {
    const q = sinAcentos(busca.trim())
    return q ? ranking.filter((r) => sinAcentos(r.loc.nombre).includes(q)) : ranking
  }, [ranking, busca])

  // ¿Y con un presupuesto? Recorre la lista en orden hasta agotar el dinero.
  const ejercicio = useMemo(() => {
    const p = aNumero(presupuesto)
    const c = aNumero(costo)
    if (p === null || c === null) return null
    let viviendas = Math.floor(p / c)
    const total = viviendas
    let localidades = 0
    let completas = 0
    let ultima = ''
    for (const r of ranking) {
      const v = r.loc.viv_sin_agua ?? 0
      if (v === 0) continue
      if (viviendas <= 0) break
      localidades++
      ultima = r.loc.nombre
      if (viviendas >= v) completas++
      viviendas -= Math.min(v, viviendas)
    }
    return { atendidas: total - viviendas, localidades, completas, ultima, sobrante: viviendas * c }
  }, [presupuesto, costo, ranking])

  const exportar = () => {
    const comillas = (t: string) => `"${t.replace(/"/g, '""')}"`
    const filas = [
      ['lugar', 'clave', 'localidad', 'clase_prioridad', 'indice', 'poblacion_2020', 'viviendas_sin_agua_entubada', 'porcentaje_sin_agua_entubada', 'personas_sin_agua_estimacion', 'grado_marginacion', 'distancia_cabecera_km'].join(','),
      ...ranking.map((r) =>
        [
          r.lugar,
          r.loc.cvegeo,
          comillas(r.loc.nombre),
          comillas(r.clase),
          r.indice.toFixed(4),
          r.loc.pob_total,
          r.loc.viv_sin_agua ?? '',
          r.loc.pct_sin_agua !== undefined ? (r.loc.pct_sin_agua * 100).toFixed(1) : '',
          r.loc.pers_sin_agua_est ?? '',
          comillas(r.loc.marg_grado ?? ''),
          r.loc.dist_cabecera_km,
        ].join(','),
      ),
      '',
      comillas(`Versión 0, índices preliminares en validación. Pesos: ${COMPONENTES.map((c) => `${c.nombre} ${Math.round(pesos[c.clave] * 100)} %`).join('; ')}.`),
      comillas(`Fuentes: INEGI, Censo de Población y Vivienda 2020; Conapo, índice de marginación 2020. Generado el ${datos.resumen.generado}.`),
    ]
    const blob = new Blob(['﻿' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'prioridades_valle_de_bravo_v0.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-3 p-4">
      <h1>Prioridades para hacer mejores preguntas.</h1>
      <p className="page-lead">Elige una escala y agrega variables gradualmente. Los pesos son exploratorios: cambiar la lista no demuestra qué intervención funcionará.</p>
      <ControlesTerritorio />
      {escala !== 'localidad' ? <><PesosUnidades /><ListaUnidades /></> : <>
      <div className="priorities-layout">
      <Tarjeta
        titulo={
          <>
            Qué pesa en la prioridad <Supuesto>pesos por validar</Supuesto>
          </>
        }
      >
        <p className="m-0 text-[15px] text-gris">
          El índice ordena las {ranking.length} localidades con datos según sus carencias. Mueve los controles: la lista y el mapa se reordenan al instante.
        </p>
        <button type="button" onClick={() => setControles((v) => !v)} aria-expanded={controles} className="mt-2 min-h-10 border-0 bg-transparent p-0 font-bold text-verde-texto underline">
          {controles ? 'Ocultar controles' : 'Mostrar controles'}
        </button>
        {controles && (
          <div className="mt-1 space-y-2">
            {COMPONENTES.filter((c) => variables.includes(c.clave)).map((c) => (
              <label key={c.clave} className="block">
                <span className="flex items-baseline justify-between gap-2 text-[15px]">
                  <span>
                    <strong>{c.nombre}</strong> <span className="text-[13px] text-meta">{c.detalle}</span>
                  </span>
                  <span className="cifra shrink-0 font-extrabold">{Math.round(pesos[c.clave] * 100)} %</span>
                </span>
                {variables.length > 1 && <input type="range" min={0} max={100} step={5} value={puntos[c.clave]} onChange={(e) => { const v = Number(e.target.value); if (variables.some((k) => k !== c.clave && puntos[k] > 0) || v > 0) mover(c.clave, v) }} aria-label={`Peso de ${c.nombre}`} />}
              </label>
            ))}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] text-meta">{cambiado ? 'Estás usando pesos distintos a los de arranque.' : 'Pesos de arranque.'}</span>
              <Boton secundario onClick={restablecer} className="min-h-11">
                Restablecer
              </Boton>
            </div>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Lista de prioridades">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar localidad"
          aria-label="Buscar localidad"
          className="mb-2 min-h-12 w-full rounded-lg border border-borde bg-white px-3"
        />
        <ol className="priority-results m-0 list-none p-0">
          {visibles.map((r) => (
            <li key={r.loc.cvegeo} className="border-b border-borde last:border-b-0">
              <button type="button" onClick={() => abrirFicha(r.loc.cvegeo)} className="flex min-h-14 w-full items-center gap-2.5 border-0 bg-transparent px-0 py-1.5 text-left">
                <span className="cifra w-7 shrink-0 text-right text-[15px] font-extrabold text-gris">{r.lugar}</span>
                <span className="h-9 w-2.5 shrink-0 rounded-sm border border-tinta/30" style={{ background: COLOR_CLASE[r.clase] }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.loc.nombre}</span>
                  <span className="block text-[13px] text-gris">
                    {r.clase} · sin agua entubada: {num(r.loc.viv_sin_agua)} de {num(r.loc.viv_caract)} viviendas ({pct(r.loc.pct_sin_agua)})
                  </span>
                </span>
                <span className="cifra shrink-0 text-[15px] font-bold">{r.indice.toFixed(2)}</span>
              </button>
            </li>
          ))}
          {visibles.length === 0 && <li className="py-3 text-gris">Ninguna localidad con ese nombre.</li>}
        </ol>
        <Pie>
          No aparecen las {datos.resumen.censo.localidades_enmascaradas} localidades de una o dos viviendas: el censo no publica sus datos. El índice habla de
          intensidad de la carencia, no de cuánta gente: por eso se muestran también las viviendas.
        </Pie>
        <Boton secundario onClick={exportar} className="mt-3 w-full">
          Exportar la lista en CSV
        </Boton>
      </Tarjeta>
      </div>

      <details className="rounded-xl border border-borde p-4"><summary className="cursor-pointer font-extrabold">Ejercicio opcional de presupuesto · sin costos validados</summary>
      <Tarjeta titulo="Explorar un supuesto de costo">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[14px] font-bold">
            Presupuesto (pesos)
            <input inputMode="numeric" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-borde px-3 font-normal" />
          </label>
          <label className="block text-[14px] font-bold">
            Costo por vivienda atendida
            <input inputMode="numeric" value={costo} onChange={(e) => setCosto(e.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-borde px-3 font-normal" />
          </label>
        </div>
        {ejercicio && (
          <p className="m-0 mt-3">
            Alcanzaría para <strong className="cifra">{num(ejercicio.atendidas)}</strong> viviendas sin agua entubada en{' '}
            <strong className="cifra">{num(ejercicio.localidades)}</strong> localidades, siguiendo el orden de la lista ({num(ejercicio.completas)} completas
            {ejercicio.ultima ? `; la última sería ${ejercicio.ultima}` : ''}).
          </p>
        )}
        <Pie>Solo divide un presupuesto entre un costo uniforme aportado por quien usa la herramienta. No calcula obra, tratamiento, mantenimiento ni viabilidad; no prueba que una vivienda quedaría abastecida. No hay una cotización ni recursos comprometidos.</Pie>
      </Tarjeta>
      </details>

      <Pie>Fuentes: INEGI, Censo de Población y Vivienda 2020; Conapo, índice de marginación por localidad 2020. Datos generados el {datos.resumen.generado}.</Pie>
      </>}
    </div>
  )
}
