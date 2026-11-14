import { Component, type ReactNode } from 'react'

export default class Recuperacion extends Component<{ children: ReactNode }, { fallo: boolean }> {
  state = { fallo: false }
  static getDerivedStateFromError() { return { fallo: true } }
  render() {
    if (!this.state.fallo) return this.props.children
    return <div className="recovery-panel" role="alert"><h1>No se pudo abrir esta vista.</h1>
      <p>Recarga la aplicación para volver a intentarlo. Los proyectos guardados en este navegador se conservan.</p>
      <button type="button" className="primary-action" onClick={() => { window.location.hash = '/panorama'; window.location.reload() }}>Volver al panorama</button>
    </div>
  }
}
