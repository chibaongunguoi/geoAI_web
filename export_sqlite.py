import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), 'geoai_data', 'geoai.db')
out_path = os.path.join(os.path.dirname(__file__), 'geoai_data', 'buildings.jsonl')

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM BuildingProperty")
columns = [column[0] for column in cursor.description]

count = 0
with open(out_path, 'w', encoding='utf-8') as f:
    while True:
        rows = cursor.fetchmany(10000)
        if not rows:
            break
        for row in rows:
            row_dict = dict(row)
            f.write(json.dumps(row_dict, ensure_ascii=False) + '\n')
        count += len(rows)
        print(f"Exported {count} rows")

print("Done exporting!")
