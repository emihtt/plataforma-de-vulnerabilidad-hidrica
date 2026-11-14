import { Boton, Tarjeta } from '../componentes/ui'
import { useEstado } from '../lib/contexto'

const AUDIENCIAS = [
  ['Comunidades y comités de agua', 'Contrastar la línea base con su experiencia, reconocer lo que falta y preparar preguntas sobre acceso y continuidad del servicio.'],
  ['Organizaciones de la sociedad civil', 'Preparar visitas y conversaciones con criterios visibles. La elección de una solución requiere trabajo de campo y diseño técnico.'],
  ['Fundaciones y organizaciones aliadas', 'Explorar preguntas de colaboración y posibles pilotos. La demo no acredita impacto, presupuesto disponible ni financiamiento obtenido.'],
  ['Gobiernos y academia', 'Revisar datos, discutir supuestos y acordar qué información hace falta antes de usar el análisis en planeación.'],
]
const FASES = [
  ['Después del evento', 'Recoger preguntas de quienes vean la demo; corregir la candidata y acordar el alcance del piloto.', 'Depende de: revisión del equipo, responsables y prioridades. Esfuerzo y recursos por estimar.'],
  ['Validación científica y con comunidades', 'Revisar universos censales y cruces, sensibilidad del índice, lluvia comparable y balance de captación. Contrastar necesidades y datos actuales con las comunidades.', 'Depende de: participación y consentimiento, especialistas, estaciones y datos públicos con permisos claros. Sin compromisos de terceros.'],
  ['Nuevos módulos, uno por uno', 'Evaluar cuencas, ríos y lagos, sequía, precipitación, salud ecosistémica, conservación, restauración y derecho al agua. Publicar solo lo que se pueda validar y mantener.', 'Depende de: pregunta de uso, fuente y licencia, metodología, pruebas y responsable de actualización para cada módulo.'],
  ['Cobertura nacional y sostenibilidad', 'Probar el método en otros territorios antes de escalar hacia un observatorio ciudadano del agua para México.', 'Depende de: comparabilidad entre territorios, gobernanza, accesibilidad, operación, mantenimiento y un modelo de financiamiento por definir. Sin presupuesto ni alianzas asegurados.'],
]

export default function Usos() {
  const { ir, iniciarRecorrido } = useEstado()
  return <div className="space-y-3 p-4">
    <h1>Un piloto local. Una visión compartida.</h1>
    <p className="page-lead">Valle de Bravo es el primer territorio de prueba. La visión es construir un observatorio ciudadano del agua para México, con información útil para comunidades, organizaciones y gobiernos.</p>
    <Tarjeta titulo="Qué existe hoy y qué está por construir">
      <dl className="maturity-list"><div><dt>Disponible</dt><dd>Datos censales, mapa, fuentes y fichas del piloto.</dd></div><div><dt>Demo local</dt><dd>Perfiles, proyectos, aportes y seguimiento con ejemplos simulados. Unidades hidrográficas modeladas incluidas.</dd></div><div><dt>Prototipo</dt><dd>Prioridad relativa, agregaciones territoriales y captación histórica; requieren validación.</dd></div><div><dt>Planeado</dt><dd>Cuentas compartidas, verificación de proyectos, cartografía oficial validada y cobertura nacional.</dd></div></dl>
    </Tarjeta>
    <h2 className="pt-5 text-[24px] font-extrabold">Para qué puede servir esta conversación</h2>
    <button type="button" className="primary-action" onClick={() => ir('perfiles')}>Elegir una experiencia →</button>
    <div className="use-grid">{AUDIENCIAS.map(([titulo, texto]) => <Tarjeta key={titulo} titulo={titulo}><p className="m-0 text-[15px]">{texto}</p></Tarjeta>)}</div>
    <Tarjeta titulo="Hoja de ruta · fases propuestas">
      <ol className="roadmap">{FASES.map(([titulo, texto, dependencia]) => <li key={titulo}><h3>{titulo}</h3><p>{texto}</p><small>{dependencia}</small></li>)}</ol>
    </Tarjeta>
    <Tarjeta titulo="Una invitación a construir, con expectativas claras">
      <p className="m-0">La oportunidad de conseguir apoyo existe; todavía no hay financiamiento asegurado. Las instituciones citadas aportan datos públicos, no avalan la plataforma.</p>
    </Tarjeta>
    <div className="flex flex-wrap gap-3 pt-3"><Boton onClick={iniciarRecorrido}>Repetir recorrido</Boton><Boton secundario onClick={() => ir('fuentes')}>Revisar fuentes y límites</Boton></div>
  </div>
}
