# Agua y territorio · Laboratorio Valle de Bravo (versión 0)

Aplicación web para computadora y celular que reúne datos públicos sobre el acceso al agua en las localidades del municipio de Valle de Bravo, Estado de México. Es un proyecto de Regenera Consultora.

**Versión 0 · índices preliminares en validación.** Los índices, umbrales y supuestos son puntos de partida pendientes de revisión científica y comunitaria. No es una medición oficial.

## Candidata con perfiles · mejoras propuestas

- Cinco entradas agrupadas en gestión (organizaciones, financiadores y gobiernos) y consulta (comunidades y cuidado de cuenca). Son vistas locales; no cuentas ni permisos de servidor.
- Localidades y unidades modeladas HydroBASINS en dos escalas: una regional y once de detalle que intersectan el piloto. No equivalen a delimitaciones oficiales mexicanas. Estadísticas únicamente de localidades de Valle de Bravo.
- Variables graduales, comenzando con agua entubada; fichas territoriales imprimibles y agregaciones con denominadores válidos.
- Proyectos locales con componentes, metas agregadas y aportes financieros separados. Tres ejemplos simulados; capturas propias sin verificar. Persistencia en el navegador, respaldo/importación JSON y archivo reversible.
- Seguimiento con indicadores definidos y mediciones fechadas. No se imputan faltantes ni se atribuye causalidad; metas y resultados permanecen separados.

La guía de presentación es interna y se entrega aparte. Cambios, pruebas y pendientes en [docs/REVISION_DEMO.html](docs/REVISION_DEMO.html). Las instrucciones de publicación están en [docs/GITHUB_PAGES.md](docs/GITHUB_PAGES.md).

La compilación incluye los datos y la licencia HydroSHEDS en `public/licencias/`. Los ZIP continentales se conservan fuera de Git y no se distribuyen como un producto de datos independiente. Para reconstruir únicamente estas unidades: `python pipeline/13_unidades_hidricas.py`. No hace falta regenerar el censo ni ejecutar el pipeline completo para abrir la candidata.

Pruebas: `npm test`, `python -m pytest pipeline/tests -q`. Para el recorrido de navegador: servir `dist` por HTTP y ejecutar `python scripts/qa_perfiles.py http://127.0.0.1:4180/` con Playwright/Chromium instalados.

## Qué muestra

- **Panorama y perfiles:** introducción, línea base censal y acceso a experiencias de gestión y consulta.
- **Mapa:** las localidades del Censo 2020, con su carencia de agua entubada, su prioridad, su potencial de captación de lluvia y su población en hogares indígenas.
- **Ficha de localidad:** agua y saneamiento, vulnerabilidad, prioridad desglosada, captación de lluvia e intervenciones candidatas a evaluar.
- **Prioridades:** lista ordenada con pesos que se pueden mover, ejercicio de presupuesto y exportación en CSV.
- **Contexto hídrico:** registros históricos y manuales de presa, consulta externa de lluvia y pronóstico; comparación climática exploratoria por validar.
- **Fuentes y límites:** cada fuente con su fecha, y cada supuesto a la vista.

Después de una primera visita completa y de que se instale la caché PWA, los datos incluidos y las vistas abren sin conexión. La lluvia y el mapa de calles externos requieren internet. La aplicación avisa cuando hay una versión nueva y espera a que la persona decida recargar.

## GitHub Pages

La aplicación es estática: no necesita servidor de API ni claves. Usa rutas con `#` para que recargar una sección no produzca un 404 en Pages.

```bash
npm ci
npm test
npm run build:pages
```

Se publica únicamente `dist/`, con la base `/plataforma-de-vulnerabilidad-hidrica/`. El workflow `.github/workflows/validar-y-publicar.yml` comprueba código, datos y navegador en las propuestas; solo prepara publicaciones después de una ejecución exitosa en `main`.

**Origen de publicación:** se conserva la rama `gh-pages` configurada por el dueño. CI valida `main` y genera el artefacto; `scripts/publicar_gh_pages.py` permite publicarlo con una cuenta autorizada. Si el dueño cambia el origen a GitHub Actions, el mismo workflow activa la publicación automática. Véase [la guía completa](docs/GITHUB_PAGES.md).

## Fuentes de datos

| Dato | Fuente | Licencia |
|---|---|---|
| Población, viviendas y servicios por localidad | INEGI. Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER) | Términos de libre uso del INEGI |
| Marginación por localidad | Conapo, índice de marginación por localidad 2020 | Datos abiertos del Gobierno de México |
| Límite municipal, agua, ríos, caminos | © colaboradores de OpenStreetMap | ODbL |
| Lluvia diaria por localidad | Daymet versión 4 (ORNL DAAC, NASA) | Datos abiertos |
| Lluvia reciente, normales y pronóstico | Open-Meteo | CC BY 4.0; uso gratuito no comercial |
| Almacenamiento de la presa | Conagua (servicio de datos y notas de prensa que la citan) | Datos abiertos del Gobierno de México |
| Pronóstico por municipio | Servicio Meteorológico Nacional (Conagua) | Datos abiertos del Gobierno de México |
| Mapa base con conexión | OpenFreeMap, OpenMapTiles | Datos de OpenStreetMap |
| Unidades hidrográficas modeladas | HydroBASINS v1c, niveles 6 y 12 (HydroSHEDS / WWF) | Términos incluidos en `public/licencias/` |

Las instituciones aparecen como fuente de los datos. Ninguna participa en este proyecto ni lo avala.

El estado de cada fuente (cuál respondió, cuál se sustituyó por su respaldo) está en [`ESTADO_DATOS.md`](ESTADO_DATOS.md) y en `public/data/fuentes.json`.

## Límites

- Las cifras de vivienda y población son del Censo 2020. No dicen cómo está hoy cada comunidad.
- "Agua entubada" no significa agua todos los días ni agua potable.
- La lluvia viene de modelos en malla, no de una estación en cada comunidad.
- El censo no publica servicios en localidades de una o dos viviendas; no aparecen en la lista de prioridades.
- El índice de prioridad combina carencias con pesos que se pueden cambiar.
- Las intervenciones que se sugieren son candidatas a evaluar en campo con la comunidad; no son recomendaciones técnicas.

## Cómo reproducir

La versión se prueba con Node 24 LTS y Python 3.13. Se requiere Node 24 o superior; `.nvmrc` selecciona la misma versión principal que CI.

```bash
# Datos
python -m venv .venv
source .venv/bin/activate            # en Windows: .venv\Scripts\activate
pip install -r pipeline/requirements.txt
python pipeline/ejecutar.py          # corre todo; usa lo ya descargado en data/crudo/
python pipeline/ejecutar.py --solo 04   # un solo paso
pytest pipeline/tests -q

# Aplicación
npm ci
npm run dev
npm test
npm run build && npm run preview
```

El pipeline descarga de las fuentes de la tabla, guarda lo crudo en `data/crudo/` (fuera del repositorio) y escribe en `public/data/` lo que consume la aplicación. La línea base proviene de esos archivos; la presa incluye registros manuales identificados por fuente. Los proyectos, metas, aportes y mediciones precargados son simulaciones rotuladas; las capturas nuevas se almacenan localmente y no se confunden con el censo.

Los pesos del índice, los umbrales y los supuestos de captación de lluvia están en [`config/parametros.yaml`](config/parametros.yaml). Cambiarlos y volver a correr el pipeline actualiza toda la aplicación. Las fórmulas están en `pipeline/formulas.py`, con sus pruebas en `pipeline/tests/`.

## Estructura

```
config/parametros.yaml   supuestos, pesos y umbrales
pipeline/                scripts numerados, fórmulas y pruebas
data/semilla/            datos capturados a mano, con su fuente
public/data/             archivos que consume la aplicación
src/                     aplicación (React, TypeScript, MapLibre, Tailwind, Recharts)
ESTADO_DATOS.md          bitácora de fuentes
```

## Privacidad

La base territorial contiene datos agregados por localidad. Los proyectos nuevos se guardan en el navegador y en los respaldos que exporte la persona; no se envían a un servidor compartido. No hay cuentas ni registro individual de beneficiarios. La aplicación no usa analítica de terceros; las consultas opcionales de cartografía y meteorología contactan a sus proveedores.

## Licencia

La licencia del código está por definirse. Los datos conservan la licencia de su fuente.

## Contacto

contacto@regeneraconsultora.com.mx
