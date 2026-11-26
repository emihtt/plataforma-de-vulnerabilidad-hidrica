import { fechaLarga } from '../lib/formato'
import { guia } from '../lib/guia'

export default function Guia() {
  const { fechaBorrador, fechaCorte, situaciones } = guia
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-5 sm:p-8">
    <header className="rounded-xl border border-borde bg-white p-5 sm:p-8">
      <p className="m-0 text-sm font-bold text-verde-texto">Guía ciudadana · Valle de Bravo</p>
      <h1 className="mt-2 mb-3 text-3xl font-extrabold sm:text-4xl">Qué hacer si ves…</h1>
      <p className="m-0 max-w-prose">Elige la situación que más se parece a lo que viste. Aquí puedes revisar qué anotar y qué no se puede concluir solo con una observación.</p>
      <p className="mt-4 mb-0 rounded-lg bg-fondo p-3 text-sm">
        <strong>Información orientativa, no asesoría legal.</strong><br />
        Fecha de corte: {fechaCorte ? <time dateTime={fechaCorte}>{fechaLarga(fechaCorte)}</time> : 'pendiente de validación.'}
        {!fechaCorte && <> Borrador del <time dateTime={fechaBorrador}>{fechaLarga(fechaBorrador)}</time>. Las autoridades y los canales oficiales aún no se han verificado.</>}
      </p>
    </header>
    <section className="space-y-3" aria-labelledby="situaciones-guia">
      <h2 id="situaciones-guia" className="m-0 text-xl font-extrabold">Elige una situación</h2>
      <p className="m-0 text-sm text-gris">No entres en predios, no confrontes a nadie ni te acerques a sitios de riesgo para obtener evidencia. Esta guía no recibe reportes.</p>
      {situaciones.map((s) => <details key={s.id} className="rounded-xl border border-borde bg-white">
        <summary className="cursor-pointer p-4 font-extrabold">{s.titulo}</summary>
        <dl className="m-0 space-y-3 border-t border-borde p-4">
          <div><dt className="font-bold">Qué observar</dt><dd className="m-0">{s.observar}</dd></div>
          <div><dt className="font-bold">Autoridad competente</dt><dd className="m-0">{s.autoridad ?? 'Por validar.'}</dd></div>
          <div><dt className="font-bold">Canal oficial</dt><dd className="m-0">{fechaCorte && s.canal
            ? <><a className="font-bold text-verde-texto underline" href={s.canal.url}>{s.canal.nombre}</a> <span className="text-sm text-gris">(requiere internet)</span></>
            : 'Por validar. No hay enlace habilitado.'}</dd></div>
          <div><dt className="font-bold">Evidencia útil</dt><dd className="m-0">{s.evidencia}</dd></div>
          <div><dt className="font-bold">Qué no asumir</dt><dd className="m-0">{s.limite}</dd></div>
        </dl>
      </details>)}
    </section>
    <a className="text-action inline-block" href="#/panorama">← Volver al panorama</a>
  </div>
}
