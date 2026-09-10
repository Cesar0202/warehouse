import os
import openpyxl
import json

EXCEL_PATH = r"C:\Users\CESAR\Downloads\LISTADO DE STOCK  SETIEMBRE.xlsx"
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(PUBLIC_DIR, exist_ok=True)

print(f"Leyendo archivo Excel: {EXCEL_PATH}...")
wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
ws = wb.active

records = []
for r_idx, row in enumerate(ws.iter_rows(values_only=True)):
    if r_idx < 2:  # Cabeceras en fila 1 (índice 1), datos desde fila 2
        continue
    
    # row[2]: Cod.Arti.
    # row[3]: Descripcion
    # row[4]: Familia
    # row[7]: Unidad de Medida
    # row[8]: Stock
    # row[11]: UBICACION
    if len(row) > 3 and row[2]:
        cod = str(row[2]).strip()
        desc = str(row[3]).strip() if row[3] is not None else ""
        familia = str(row[4]).strip() if len(row) > 4 and row[4] is not None else ""
        unidad = str(row[7]).strip() if len(row) > 7 and row[7] is not None else ""
        
        raw_stock = row[8] if len(row) > 8 else 0
        stock = 0.0
        try:
            if raw_stock not in (None, "", " "):
                stock = float(raw_stock)
        except Exception:
            stock = 0.0
            
        ubicacion = str(row[11]).strip() if len(row) > 11 and row[11] is not None else ""
        
        records.append({
            "cod_arti": cod,
            "descripcion": desc,
            "familia": familia,
            "unidad": unidad,
            "stock": stock,
            "ubicacion": ubicacion
        })

print(f"Total de registros procesados: {len(records)}")

catalogo_json_path = os.path.join(PUBLIC_DIR, "catalogo.json")
with open(catalogo_json_path, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print(f"Catálogo guardado en: {catalogo_json_path} ({os.path.getsize(catalogo_json_path) / 1024:.1f} KB)")

# Alias iniciales basados en jergas comunes y términos del briefing
# Busquemos códigos de ejemplo en el catálogo para asegurar que coincidan
cod_map = {r["descripcion"].upper(): r["cod_arti"] for r in records}
by_cod = {r["cod_arti"]: r for r in records}

# Mapeos automáticos y explícitos
initial_aliases = [
    # Mencionados en briefing
    {"alias": "drano", "cod_arti": "DES01", "nota": "Desatorador Sapolio / Químico"},
    {"alias": "draino", "cod_arti": "DES01", "nota": "Variación fonética drano"},
    {"alias": "desatorador sapolio", "cod_arti": "DES01", "nota": "Nombre comercial"},
    {"alias": "liquido destapacaños", "cod_arti": "DES01", "nota": "Jerga"},
    {"alias": "curva 3/4", "cod_arti": "CUR06", "nota": "Curva conduit 3/4"},
    {"alias": "curva conduit 3/4", "cod_arti": "CUR06", "nota": "Curva conduit 3/4"},
    {"alias": "curva conduit de 3/4", "cod_arti": "CUR06", "nota": "Curva conduit 3/4"},
    {"alias": "curva conduit 1", "cod_arti": "CUR07", "nota": "Curva conduit 1 pulg"},
    {"alias": "curva conduit 1/2", "cod_arti": "CUR09", "nota": "Curva conduit 1/2 pulg"},
    {"alias": "union conduit 1", "cod_arti": "UNI47", "nota": "Unión conduit 1"},
    {"alias": "union conduit de 1", "cod_arti": "UNI47", "nota": "Unión conduit 1"},
    
    # Jergas habituales de taller / obra
    {"alias": "teflon", "cod_arti": "CIN08", "nota": "Cinta teflón genérica"},
    {"alias": "cinta teflon", "cod_arti": "CIN08", "nota": "Cinta teflón"},
    {"alias": "teflon 2 rollos", "cod_arti": "CIN08", "nota": "Cinta teflón"},
    {"alias": "teflon 3/4", "cod_arti": "CIN08", "nota": "Cinta teflón"},
    {"alias": "cinta aislante", "cod_arti": "CIN01", "nota": "Cinta aislante eléctrica"},
    {"alias": "cinta 3m", "cod_arti": "CIN02", "nota": "Cinta aislante 3M / Vulcanizante"},
    {"alias": "cinta vulcanizante", "cod_arti": "CIN04", "nota": "Cinta vulcanizante"},
    {"alias": "franks", "cod_arti": "BRA01", "nota": "Abrazaderas tipo Frank / Caddy"},
    {"alias": "frank", "cod_arti": "BRA01", "nota": "Abrazadera Frank"},
    {"alias": "abrazadera frank", "cod_arti": "BRA01", "nota": "Abrazadera Frank"},
    {"alias": "silicona transparente", "cod_arti": "SIL01", "nota": "Silicona multiuso"},
    {"alias": "silicona", "cod_arti": "SIL01", "nota": "Silicona multiuso"},
    {"alias": "wd40", "cod_arti": "LUB01", "nota": "Lubricante aflojatodo"},
    {"alias": "aflojatodo", "cod_arti": "LUB01", "nota": "Lubricante en spray"},
    {"alias": "perno hexagonal", "cod_arti": "PER01", "nota": "Perno hexagonal"},
    {"alias": "tarugo 1/4", "cod_arti": "TAR01", "nota": "Tarugo plástico"},
    {"alias": "tarugo 5/16", "cod_arti": "TAR02", "nota": "Tarugo plástico"},
    {"alias": "tarugos", "cod_arti": "TAR01", "nota": "Tarugo plástico"},
    {"alias": "cintillo", "cod_arti": "CIN10", "nota": "Precinto de nylon / amarre"},
    {"alias": "precintos", "cod_arti": "CIN10", "nota": "Precinto de nylon / amarre"},
    {"alias": "amarras", "cod_arti": "CIN10", "nota": "Precintos"}
]

# Validar que los códigos existan en el catálogo o mapearlos a existentes
valid_aliases = []
for a in initial_aliases:
    code = a["cod_arti"]
    if code in by_cod:
        valid_aliases.append(a)
    else:
        # Buscar el más parecido o dejarlo si es estándar
        matches = [r for r in records if code.lower() in r["cod_arti"].lower() or any(w in r["descripcion"].lower() for w in a["alias"].split())]
        if matches:
            chosen = matches[0]["cod_arti"]
            valid_aliases.append({"alias": a["alias"], "cod_arti": chosen, "nota": a.get("nota", "")})
        else:
            valid_aliases.append(a)

alias_json_path = os.path.join(PUBLIC_DIR, "alias.json")
with open(alias_json_path, "w", encoding="utf-8") as f:
    json.dump(valid_aliases, f, ensure_ascii=False, indent=2)

print(f"Alias iniciales ({len(valid_aliases)}) guardados en: {alias_json_path}")
