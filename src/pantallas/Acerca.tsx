import { useState } from 'react'
import { Boton, Pie, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'

export default function Acerca() {
  const { ir } = useEstado()
  const [conQR, setConQR] = useState(true)
  return (
    <div className="space-y-3 p-4">
      <h1 className="m-0 text-[22px] font-extrabold">Acerca de</h1>
      <Tarjeta>
        <p className="m-0">
          Agua y territorio es un proyecto de Regenera Consultora. Hacemos monitoreo, evaluación y aprendizaje, y productos de datos para organizaciones
          sociales, fundaciones y gobiernos.
        </p>
        <p className="mt-3 mb-0">Queremos que decidir dónde y cómo garantizar agua sea más fácil y más justo, y que después se pueda saber si funcionó.</p>
        <p className="mt-3 mb-0">
          <strong>Uso de inteligencia artificial.</strong> Parte del código y de los textos de este prototipo se elaboró con apoyo de asistentes de
          inteligencia artificial generativa. Las cifras no las genera ninguna inteligencia artificial: provienen de las fuentes públicas citadas en
          «Fuentes y límites», y los proyectos de ejemplo son simulaciones rotuladas como tales.
        </p>
        <p className="mt-3 mb-0">
          <strong>Licencias.</strong> El código es abierto, con licencia Apache 2.0. Los datos, textos y notas de método que elaboró Regenera
          Consultora se comparten con licencia Creative Commons Atribución 4.0 (CC BY 4.0). Los datos y capas de otras fuentes conservan la
          licencia de su fuente, con su crédito en «Fuentes y límites».{' '}
          <a
            className="text-verde-texto underline"
            href="https://github.com/emihtt/plataforma-de-vulnerabilidad-hidrica/blob/main/LICENCIA_DATOS.md"
            target="_blank"
            rel="noreferrer"
          >
            Ver el detalle de las licencias
          </a>
        </p>
        <p className="mt-3 mb-0">
          <a className="font-extrabold text-verde-texto" href="mailto:contacto@regeneraconsultora.com.mx">
            contacto@regeneraconsultora.com.mx
          </a>
        </p>
      </Tarjeta>
      {conQR && (
        <Tarjeta titulo="Abrir en otro celular">
          <img src={`${import.meta.env.BASE_URL}qr.png`} alt="Código QR con la dirección de esta página" width={200} height={200} className="mx-auto block" onError={() => setConQR(false)} />
          <Pie>Este QR lleva al sitio publicado original, que puede diferir de la candidata local. Para mostrar esta demo usa el paquete local. El modo sin internet requiere servir los archivos incluidos; no basta con abrir el HTML con doble clic.</Pie>
        </Tarjeta>
      )}
      <Boton secundario onClick={() => ir('fuentes')} className="w-full">
        Ver fuentes y límites
      </Boton>
    </div>
  )
}
