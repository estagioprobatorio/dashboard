import csv
import json
import os

csv_filename = "planilha-dados-atualizado.csv"
json_filename = os.path.join("src", "data_fallback.json")

print(f"Lendo CSV: {csv_filename}")
records = []

with open(csv_filename, mode="r", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    cleaned_fieldnames = [field.strip() for field in reader.fieldnames]
    reader.fieldnames = cleaned_fieldnames
    
    for row in reader:
        record = {}
        for key, value in row.items():
            if key:
                clean_key = key.strip()
                clean_value = value.strip() if value else ""
                
                if clean_key == "e-mail":
                    record["e-mail"] = clean_value
                    record["email"] = clean_value
                elif clean_key == "e-mail_formador":
                    record["e-mail_formador"] = clean_value
                    record["email_formador"] = clean_value
                elif clean_key == "e-mail_nre":
                    record["e-mail_nre"] = clean_value
                    record["email_nre"] = clean_value
                elif clean_key == "link":
                    record["link"] = clean_value
                    record["Link Classroom"] = clean_value
                elif clean_key == "id-classroom":
                    record["id_classroom"] = clean_value
                elif clean_key == "turmas":
                    record["turmas"] = clean_value
                elif clean_key == "cpf":
                    record["cpf"] = clean_value
                    record["cpf_cursista"] = clean_value
                else:
                    record[clean_key] = clean_value
        
        if "cgm" in record and record["cgm"]:
            cgm_val = record["cgm"]
            if "." in cgm_val:
                try:
                    cgm_val = str(int(float(cgm_val)))
                except ValueError:
                    pass
            record["cgm"] = cgm_val

        records.append(record)

records = [r for r in records if any(v for v in r.values())]
print(f"Total de registros: {len(records)}")

with open(json_filename, mode="w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("Conversao concluida!")
