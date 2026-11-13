"""Paso 03. Índice de marginación por localidad 2020 (Conapo)."""
from __future__ import annotations

import warnings
import zipfile

import pandas as pd

from comun import (CRUDO, actualizar_localidades, anotar_estado, cargar_localidades, descargar, hoy,
                   registrar_fuente)

warnings.filterwarnings("ignore")
URL = "https://conapo.segob.gob.mx/work/models/CONAPO/Datos_Abiertos/Localidad/IML_2020.zip"
PAGINA = "https://www.gob.mx/conapo/documentos/indices-de-marginacion-2020-284372"
ORDEN_GRADOS = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"]


def componente_marginacion(imn: float) -> float:
    """Valor que crece con la marginación. En la metodología 2020 de Conapo el índice
    normalizado (IMN_2020) es MAYOR cuando hay MENOS marginación, así que se invierte."""
    return 1.0 - float(imn)


def main() -> None:
    z = descargar(URL, CRUDO / "IML_2020.zip", timeout=300)
    xls = CRUDO / "IML_2020.xls"
    if not xls.exists():
        with zipfile.ZipFile(z) as f:
            f.extract("IML_2020.xls", CRUDO)
    hojas = pd.read_excel(xls, sheet_name=None, dtype={"CVE_LOC": str})
    tabla = pd.concat([h for n, h in hojas.items() if n.startswith("IML_2020_") and "2viv" not in n])
    tabla["CVE_LOC"] = tabla["CVE_LOC"].str.zfill(9)
    tabla = tabla.set_index("CVE_LOC")

    # Comprobación de dirección con todo el país: 'Muy alto' debe tener índice menor que 'Muy bajo'.
    medias = tabla.groupby("GM_2020")["IMN_2020"].mean()
    assert medias["Muy alto"] < medias["Muy bajo"], "La dirección del índice de Conapo no es la esperada"

    locs = cargar_localidades()["features"]
    nuevas, faltan = {}, []
    for rasgo in locs:
        p = rasgo["properties"]
        if p["enmascarada"]:
            continue
        cve = p["cvegeo"]
        if cve in tabla.index:
            f = tabla.loc[cve]
            nuevas[cve] = {"marg_grado": str(f["GM_2020"]), "marg_indice": round(float(f["IM_2020"]), 3),
                           "marg_valor": round(componente_marginacion(f["IMN_2020"]), 4),
                           "marg_fuente": "Conapo, índice de marginación por localidad 2020"}
        else:
            faltan.append(p["nombre"])
            nuevas[cve] = {"marg_grado": None, "marg_indice": None, "marg_valor": None, "marg_fuente": None}
    actualizar_localidades(nuevas)
    registrar_fuente(
        "conapo_marginacion", nombre="Índice de marginación por localidad 2020", institucion="Conapo",
        url=PAGINA, descarga=URL, fecha_dato="2020 (con base en el Censo 2020)", fecha_descarga=hoy(),
        licencia="Datos abiertos del Gobierno de México", estado="ok",
        usada_en="Grado de marginación y componente de marginación del índice de prioridad",
        nota=("En la metodología 2020 un índice más alto significa menos marginación; el componente del índice "
              "de prioridad usa 1 menos el índice normalizado para que crezca con la marginación. "
              + (f"Sin dato de Conapo: {', '.join(faltan)}." if faltan else "Todas las localidades con datos censales tienen índice.")))
    anotar_estado("Marginación (Conapo)", "Se descargó la base por localidad desde el enlace de la página oficial. "
                  "Dirección comprobada: el grado 'Muy alto' tiene índice normalizado menor que 'Muy bajo'. "
                  "No se usó el índice de carencias propio de respaldo.")
    grados = pd.Series([v["marg_grado"] for v in nuevas.values()]).value_counts().to_dict()
    print(f"Marginación: {len(nuevas) - len(faltan)} localidades con índice; grados {grados}; sin dato {faltan}")


if __name__ == "__main__":
    main()
