import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** Las versiones nuevas esperan a que la persona termine de capturar su proyecto. */
export default function Actualizacion() {
  const [aviso, setAviso] = useState('')
  const { needRefresh: [pendiente, setPendiente], updateServiceWorker } = useRegisterSW({ immediate: true })
  if (!pendiente) return null
  return <aside className="update-notice no-print" role="status" aria-label="Actualización disponible">
    <strong>Hay una nueva versión disponible.</strong>
    <p>Guarda tus cambios antes de actualizar. Tus proyectos guardados permanecerán en este navegador.</p>
    {aviso && <p role="alert">{aviso}</p>}
    <div className="workspace-actions"><button type="button" className="primary-action" onClick={() => {
      if (document.querySelector('[data-cambios-pendientes="true"]')) { setAviso('Guarda o cancela la edición del proyecto antes de actualizar.'); return }
      void updateServiceWorker(true).catch(() => setAviso('No se pudo actualizar. Comprueba la conexión y vuelve a intentarlo.'))
    }}>Actualizar y recargar</button><button type="button" className="secondary-action" onClick={() => setPendiente(false)}>Más tarde</button></div>
  </aside>
}
