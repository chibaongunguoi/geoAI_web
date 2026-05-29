# GeoAI Asset Management — Implementation Guide

> Hướng dẫn triển khai theo từng task nhỏ nhất.
> Mỗi task độc lập, có thể giao riêng cho Gemini thực hiện.

---

## Quyết định kỹ thuật (không thay đổi)

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Cơ sở dữ liệu | PostgreSQL + PostGIS | Spatial query native, ST_DWithin, ST_Within |
| Fuzzy search | pg_trgm extension | Tìm tên tài sản chịu được sai chính tả |
| LLM Provider | Groq API (free tier) | Không cần thẻ tín dụng, 14,400 req/ngày |
| Model demo | `llama-3.3-70b-versatile` | Chất lượng cao nhất trên free tier |
| Model fallback | `llama-3.1-8b-instant` | 14,400 req/ngày, dùng khi 70B hết quota |
| Dữ liệu nhà/đất | Overture Maps | Building footprint có sẵn |
| Dữ liệu rủi ro | JRC + MONRE + USGS | Polygon ngập lụt, trượt lở miễn phí |
| Coordinate system | EPSG:4326 (WGS84) | Chuẩn lat/lng toàn cầu |
| Đơn vị khoảng cách | Mét (geography cast) | ST_DWithin dùng geography, không dùng geometry |

### Thứ tự fallback model Groq
```
llama-3.3-70b-versatile         ← Dùng mặc định (demo)
  → meta-llama/llama-4-scout-17b-16e-instruct
  → qwen/qwen3-32b
  → llama-3.1-8b-instant        ← Cuối cùng (gần như không hết quota)
```

## PHASE 4 — Risk Zone Overlay

### T4.1 — Tạo bảng `risk_zones`
Schema:
- `id` — primary key
- `zone_type` — `flood | landslide | planning_corridor`
- `risk_level` — `high | medium | low`
- `source` — `JRC | MONRE | USGS | So_XD`
- `description` — mô tả thêm
- `geom` — `GEOMETRY(MultiPolygon, 4326)`
- Index GIST trên `geom`

### T4.2 — Import dữ liệu ngập lụt
Nguồn ưu tiên theo thứ tự:
1. **JRC Global Surface Water** — `global-surface-water.appspot.com` — GeoTIFF, miễn phí
2. **FATHOM Global Flood** — chi tiết hơn, có bản miễn phí giới hạn
3. **MONRE Việt Nam** — chính thức nhất, liên hệ trực tiếp
4. **OpenStreetMap** — tag `flood_prone=yes`, lấy qua Overpass API

Bước import:
1. Tải file GeoTIFF/Shapefile về
2. Nếu là GeoTIFF → convert sang vector polygon bằng `gdal_polygonize`
3. Dùng `ogr2ogr` import vào bảng `risk_zones` với `zone_type='flood'`
4. Verify bằng cách visualize trên QGIS hoặc geojson.io

### T4.3 — Import dữ liệu trượt lở
Nguồn:
1. **NASA Global Landslide Catalog** — `gpm.nasa.gov/landslides`
2. **USGS Landslide Hazards** — bản đồ susceptibility toàn cầu
3. **Viện Địa chất Việt Nam** — chính xác nhất cho VN, cần liên hệ

Import tương tự T4.2 với `zone_type='landslide'`

### T4.4 — Import hành lang quy hoạch
Nguồn:
- `quyhoach.gov.vn` — cổng chính thức
- Sở Xây dựng / Sở TN&MT tỉnh/thành phố
- Thường là PDF bản đồ → cần số hóa thủ công bằng QGIS
- Import với `zone_type='planning_corridor'`

### T4.5 — Auto-tag assets với risk_flags
Chạy 1 lần sau khi import đủ dữ liệu rủi ro:
1. Với mỗi asset trong bảng `assets`
2. Check `ST_Within(asset.geom, risk_zone.geom)` cho tất cả risk_zones
3. Gom kết quả thành JSON array
4. Lưu vào `assets.risk_flags`

Kết quả mẫu:
```json
[
  {"type": "flood", "level": "high", "source": "JRC"},
  {"type": "planning_corridor", "level": "medium", "source": "So_XD"}
]
```

Re-run task này mỗi khi có bản đồ rủi ro mới.

### T4.6 — Tool: Risk Query Handler
**Mục tiêu:** Trả lời "Tài sản nào đang nằm trong vùng ngập lụt?"

Logic:
1. Nhận `risk_type` từ intent (flood / landslide / planning_corridor)
2. Query `assets` where `risk_flags @> '[{"type": "flood"}]'`
3. Có thể kết hợp filter thêm theo khu vực (T2.3)
4. Sort theo `risk_level` DESC

---

## PHASE 5 — Change Detection

### T5.1 — Thêm tracking vào bảng `assets`
Bổ sung field:
- `scan_date` — ngày quét ảnh vệ tinh nguồn
- `status` — `active | demolished | modified | unverified`
- `first_detected_at` — timestamp lần đầu xuất hiện

### T5.2 — Tạo bảng `asset_history`
Mục đích: lưu snapshot mỗi lần quét, không overwrite
Schema giống `assets` + thêm `snapshot_date`

### T5.3 — Diff Engine
**Mục tiêu:** So sánh 2 thời điểm quét → phát hiện thay đổi

3 loại thay đổi cần detect:
- **Mới xuất hiện** — có trong scan mới, không có trong scan cũ (trong bán kính nhất định)
- **Biến mất** — có trong scan cũ, không có trong scan mới
- **Thay đổi hình dạng** — `ST_Area` hoặc `ST_Perimeter` khác nhau > ngưỡng

Logic:
1. Load 2 tập dữ liệu: `scan_old` và `scan_new`
2. Spatial join để tìm cặp tương ứng (ST_DWithin < 5m = cùng 1 tài sản)
3. Record không có cặp = mới hoặc mất
4. Record có cặp nhưng geometry khác = thay đổi

### T5.4 — Alert System
- Mỗi thay đổi phát hiện → insert vào bảng `change_alerts`
- Fields: `asset_id`, `change_type`, `detected_at`, `old_snapshot`, `new_snapshot`
- Có thể trigger webhook hoặc email notification

---

## PHASE 6 — Asset Scoring (Hỗ trợ định giá)

### T6.1 — Score tiện ích xung quanh
Với mỗi tài sản, tính điểm dựa trên số lượng và khoảng cách đến:
- Trường học (bán kính 500m, 1km, 2km)
- Bệnh viện (bán kính 1km, 3km)
- Chợ / siêu thị (bán kính 500m)
- Công viên (bán kính 300m)

Dùng T2.2 (Proximity Search) + COUNT để tính điểm từng hạng mục.

### T6.2 — Score tiếp cận đường
- Khoảng cách đến đường lớn nhất gần nhất
- Loại đường (primary / secondary / residential) từ OSM
- Tính bằng `ST_Distance(asset.geom, road.geom)`

### T6.3 — Score rủi ro (penalty)
- High flood risk: -30 điểm
- Medium flood risk: -15 điểm
- Landslide risk: -20 điểm
- Planning corridor (giải toả): -50 điểm

### T6.4 — Tổng hợp Composite Score
- Tổng điểm = tiện ích + tiếp cận đường - penalty rủi ro
- Lưu vào `assets.composite_score` (numeric)
- Re-calculate mỗi khi có dữ liệu mới
- Dùng để so sánh tương đối giữa các tài sản (không phải giá tuyệt đối)

---

## Thứ tự triển khai khuyến nghị

```
Phase 1 (Foundation)          ← Bắt buộc làm trước
    ↓
Phase 2 (Spatial Tools)       ← Lõi hệ thống
    ↓
Phase 3 (Agentic Pipeline)    ← Giao diện hỏi đáp
    ↓
Phase 4 (Risk Zones)          ← Giá trị cao, dữ liệu cần tìm thêm
    ↓
Phase 5 (Change Detection)    ← Cần có 2 lần quét trở lên
    ↓
Phase 6 (Scoring)             ← Sau khi Phase 4 và 5 ổn định
```

---

## Checklist kiểm tra trước khi chạy demo

- [ ] PostGIS + pg_trgm đã enable
- [ ] Bảng `assets` có spatial index (GIST)
- [ ] Bảng `risk_zones` có spatial index (GIST)
- [ ] Bảng `boundaries` (phường/quận) đã import
- [ ] `GROQ_API_KEY` đã set trong environment
- [ ] Test Entity Resolver với tên tài sản thực tế
- [ ] Test Proximity Search: kết quả trả về kèm `distance_m`
- [ ] Test Risk Query: `risk_flags` đã được auto-tag
- [ ] Model fallback hoạt động khi đổi sang model nhỏ hơn
