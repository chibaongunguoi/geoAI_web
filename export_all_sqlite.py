import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), 'geoai_data', 'geoai.db')
tables = ['Place', 'User', 'Role', 'Permission', 'UserRole', 'RolePermission', 'Session', 'AuditLog', 'LayerUserConfig', 'AssetDisplayUserConfig', 'Report', 'Notification', 'RiskZone', 'RoadSegment']

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

for table in tables:
    out_path = os.path.join(os.path.dirname(__file__), 'geoai_data', f'{table}.jsonl')
    try:
        cursor.execute(f"SELECT * FROM {table}")
        count = 0
        with open(out_path, 'w', encoding='utf-8') as f:
            while True:
                rows = cursor.fetchmany(10000)
                if not rows:
                    break
                for row in rows:
                    f.write(json.dumps(dict(row), ensure_ascii=False) + '\n')
                count += len(rows)
        print(f"Exported {count} rows for {table}")
    except Exception as e:
        print(f"Failed to export {table}: {e}")

print("Done exporting all!")
