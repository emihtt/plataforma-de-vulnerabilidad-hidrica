# Licencia de los datos, los textos y las notas de método

Este repositorio tiene tres tipos de contenido, cada uno con su licencia.

| Contenido | Licencia |
|---|---|
| Código (`src/`, `pipeline/`, `scripts/`, configuración) | Apache 2.0, archivo [`LICENSE`](LICENSE) |
| Datos, textos y notas de método elaborados por Regenera Consultora | Creative Commons Atribución 4.0 Internacional (CC BY 4.0) |
| Datos y capas de otras fuentes | La licencia de cada fuente, con su crédito |

## Lo que se comparte con CC BY 4.0

Lo que elaboró Regenera Consultora:

- Los textos de la aplicación, este repositorio y su documentación.
- Las notas de método, las fórmulas descritas y los supuestos de `config/parametros.yaml`.
- Los resultados calculados por el pipeline: índice de prioridad, estimaciones de captación de lluvia y agregaciones por localidad.
- Los proyectos, metas, aportes y mediciones de ejemplo, que son simulaciones rotuladas como tales.

Cualquier persona puede copiarlos, adaptarlos y redistribuirlos, incluso con fines comerciales, si da el crédito, enlaza la licencia e indica si hizo cambios.

Texto de la licencia: https://creativecommons.org/licenses/by/4.0/legalcode.es

Crédito sugerido: «Agua y territorio, Regenera Consultora (2026). CC BY 4.0».

Los resultados calculados parten de datos de otras fuentes. Quien los reutilice debe dar también el crédito de la fuente original y respetar sus términos.

## Lo que conserva la licencia de su fuente

| Dato o capa | Fuente | Licencia o términos |
|---|---|---|
| Población, viviendas y servicios por localidad | INEGI. Censo de Población y Vivienda 2020. Principales resultados por localidad (ITER) | Términos de libre uso de la información del INEGI |
| Marginación por localidad | Conapo, índice de marginación por localidad 2020 | Datos abiertos del Gobierno de México |
| Límite municipal, cuerpos de agua, ríos y caminos | © colaboradores de OpenStreetMap | Open Database License (ODbL) |
| Lluvia diaria por localidad | Daymet versión 4 (ORNL DAAC, NASA) | Datos abiertos; citar a Thornton y colaboradores |
| Lluvia reciente, normales y pronóstico | Open-Meteo | CC BY 4.0; uso gratuito no comercial del servicio |
| Almacenamiento de la presa | Conagua, reporte diario de almacenamiento del Sistema Cutzamala | Datos abiertos del Gobierno de México |
| Pronóstico por municipio | Servicio Meteorológico Nacional (Conagua) | Datos abiertos del Gobierno de México |
| Mapa base con conexión | OpenFreeMap, OpenMapTiles | Datos de OpenStreetMap (ODbL) |
| Unidades hidrográficas modeladas | HydroBASINS v1c (HydroSHEDS / WWF) | Licencia de HydroSHEDS versión 1 (© World Wildlife Fund, Inc.); términos y atribución requerida en [`public/licencias/`](public/licencias/) |

Estas instituciones aparecen como fuente de los datos. Ninguna participa en este proyecto ni lo avala. La fecha y el estado de cada fuente están en [`ESTADO_DATOS.md`](ESTADO_DATOS.md) y en `public/data/fuentes.json`.

Las capas derivadas de OpenStreetMap siguen bajo ODbL: quien las adapte y las publique debe compartirlas con la misma licencia.
