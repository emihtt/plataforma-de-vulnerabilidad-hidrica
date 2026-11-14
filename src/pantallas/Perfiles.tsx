import { useEstado } from '../lib/contexto'
import { PERFILES } from '../lib/proyectos'

export default function Perfiles() {
  const { perfil, setPerfil, ir } = useEstado()
  return <div className="workspace-page">
    <h1>¿Desde dónde quieres participar?</h1><p className="page-lead">Dos experiencias para hacer preguntas distintas sobre el mismo territorio. Puedes cambiar de vista en cualquier momento.</p>
    <div className="profile-columns">{(['gestion', 'consulta'] as const).map((familia) => <section key={familia} className="profile-family"><span className="family-number">{familia === 'gestion' ? '01' : '02'}</span><h2>{familia === 'gestion' ? 'Organizaciones y gobierno' : 'Comunidades y territorio'}</h2><p>{familia === 'gestion' ? 'Prioriza, prepara fichas y organiza proyectos con sus intervenciones, aportes y seguimiento.' : 'Conoce tu territorio y consulta los proyectos e indicadores visibles en esta demostración.'}</p><div className="profile-options">{PERFILES.filter((p) => p.familia === familia).map((p) => <button type="button" key={p.id} aria-pressed={perfil === p.id} onClick={() => setPerfil(p.id)}><strong>{p.nombre}<span aria-hidden>{perfil === p.id ? '✓' : '↗'}</span></strong><span>{p.texto}</span></button>)}</div></section>)}</div>
    <div className="workspace-actions"><button type="button" className="primary-action" onClick={() => ir('mapa')}>Explorar territorio →</button><button type="button" className="secondary-action" onClick={() => ir('proyectos')}>Consultar proyectos</button></div>
    <p className="workspace-note">Prototipo local: el perfil adapta las herramientas visibles, no autentica usuarios ni protege registros mediante permisos de servidor. Los proyectos se guardan en este navegador y no se sincronizan con otras computadoras.</p>
  </div>
}
