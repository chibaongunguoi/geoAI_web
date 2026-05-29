import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'geoai_data', 'geoai.db')
print(f"Checking {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM BuildingProperty")
    print(f"BuildingProperty count: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM Place")
    print(f"Place count: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM User")
    print(f"User count: {cursor.fetchone()[0]}")
except Exception as e:
    print(f"Error: {e}")
