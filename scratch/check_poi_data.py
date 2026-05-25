import sqlite3, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

conn = sqlite3.connect("geoai_data/geoai.db")
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM Place")
print("Place count:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM Place WHERE district = 'Hải Châu'")
print("Hai Chau Places:", cur.fetchone()[0])

cur.execute("SELECT DISTINCT ward FROM Place WHERE district = 'Hải Châu' LIMIT 20")
print("Hai Chau wards:", [r[0] for r in cur.fetchall()])

cur.execute("SELECT category, COUNT(*) as cnt FROM Place WHERE district = 'Hải Châu' GROUP BY category ORDER BY cnt DESC LIMIT 15")
print("\nHai Chau category counts (top 15):")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

cur.execute("SELECT ward, COUNT(*) as cnt FROM Place WHERE district = 'Hải Châu' GROUP BY ward ORDER BY cnt DESC")
print("\nHai Chau ward counts:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# Check BuildingProperty counts
cur.execute("SELECT COUNT(*) FROM BuildingProperty WHERE deletedAt IS NULL")
print("\nBuildingProperty count:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM BuildingProperty WHERE district = 'Hải Châu' AND deletedAt IS NULL")
print("Hai Chau BuildingProperty:", cur.fetchone()[0])

# Check for cafe places
cur.execute("SELECT COUNT(*) FROM Place WHERE (category = 'cafe' OR category = 'coffee_shop') AND district = 'Hải Châu'")
print("\nHai Chau cafes:", cur.fetchone()[0])

# Check sample cafe data
cur.execute("SELECT name, ward, district, category FROM Place WHERE (category = 'cafe' OR category = 'coffee_shop') AND district = 'Hải Châu' LIMIT 5")
print("\nSample Hai Chau cafes:")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[1]} | {r[2]} | {r[3]}")

# Check if Place table has any spatial data we can work with
cur.execute("SELECT sql FROM sqlite_master WHERE name = 'Place'")
print("\nPlace table schema:")
print(cur.fetchone()[0])

conn.close()
