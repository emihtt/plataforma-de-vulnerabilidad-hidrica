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
