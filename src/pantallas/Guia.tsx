import { Fragment } from 'react'
import { fechaLarga } from '../lib/formato'
import { APARTADOS, fragmentos, guia } from '../lib/guia'

const ENLACE = 'font-bold text-verde-texto underline'

function EnLinea({ texto }: { texto: string }) {
  return <>{fragmentos(texto).map((f, i) => {
    if (f.tipo === 'negrita') return <strong key={i}>{f.texto}</strong>
    if (f.tipo === 'enlace') return <a key={i} className={`${ENLACE} break-all`} href={f.href} target="_blank" rel="noopener noreferrer">{f.texto}</a>
    if (f.tipo === 'correo') return <a key={i} className={`${ENLACE} break-all`} href={f.href}>{f.texto}</a>
    if (f.tipo === 'telefono') return <a key={i} className={`${ENLACE} whitespace-nowrap`} href={f.href}>{f.texto}</a>
    return <Fragment key={i}>{f.texto}</Fragment>
  })}</>
}

function Lista({ items }: { items: string[] }) {
  return <ul className="m-0 list-disc space-y-1.5 pl-5">{items.map((t) => <li key={t}><EnLinea texto={t} /></li>)}</ul>
}

export default function Guia() {
  const { titulo, aviso, avisoDetalle, fechaCorte, notaCorte, antes, situaciones, encabezadoEstado, canales } = guia
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:p-8">
    <header className="rounded-xl border border-borde bg-white p-5 sm:p-8">
      <p className="m-0 text-sm font-bold text-verde-texto">Guía ciudadana · Valle de Bravo</p>
      <h1 className="mt-2 mb-3 text-3xl font-extrabold sm:text-4xl">{titulo}</h1>
      <div className="space-y-2 rounded-lg bg-fondo p-3 text-sm">
        <p className="m-0"><strong>{aviso}</strong> {avisoDetalle}</p>
        <p className="m-0"><strong>Fecha de corte:</strong> <time dateTime={fechaCorte}>{fechaLarga(fechaCorte)}</time>. {notaCorte}</p>
      </div>
      <p className="mt-3 mb-0 text-sm text-gris">Puedes leer esta guía sin internet. Los formularios en línea sí necesitan conexión; los teléfonos y correos se abren desde tu celular.</p>
    </header>
    <section className="space-y-3 rounded-xl border border-borde bg-white p-5 sm:p-6" aria-labelledby="antes-guia">
      <h2 id="antes-guia" className="m-0 text-xl font-extrabold">Antes de empezar</h2>
      <Lista items={antes} />
    </section>
    <section className="space-y-3" aria-labelledby="situaciones-guia">
      <h2 id="situaciones-guia" className="m-0 text-xl font-extrabold">Elige la situación que más se parece a lo que viste</h2>
      {situaciones.map((s) => <details key={s.id} id={`guia-${s.id}`} className="rounded-xl border border-borde bg-white">
        <summary className="cursor-pointer p-4 font-extrabold"><span className="mr-2 text-verde-texto">{s.numero}.</span><span>{s.titulo}</span></summary>
        <dl className="m-0 space-y-4 border-t border-borde p-4">
          {APARTADOS.map((a) => <div key={a.clave}><dt className="mb-1 font-bold">{a.titulo}</dt><dd className="m-0"><Lista items={s.apartados[a.clave]} /></dd></div>)}
        </dl>
      </details>)}
    </section>
    <section className="space-y-3 rounded-xl border border-borde bg-white p-5 sm:p-6" aria-labelledby="canales-guia">
      <h2 id="canales-guia" className="m-0 text-xl font-extrabold">Canales revisados</h2>
      <p className="m-0 text-sm text-gris">{encabezadoEstado}.</p>
      <ul className="m-0 list-disc space-y-2 pl-5 text-sm">{canales.map((c) => <li key={c.canal}>
        {c.enlace ? <a className={ENLACE} href={c.enlace} target="_blank" rel="noopener noreferrer">{c.canal}</a> : <strong>{c.canal}</strong>}: {c.estado}
      </li>)}</ul>
    </section>
    <a className="text-action inline-block" href="#/panorama">← Volver al panorama</a>
  </div>
}
