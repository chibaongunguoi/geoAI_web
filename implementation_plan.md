# Semantic POI Query Support cho Hải Châu

## Bối cảnh

Hệ thống hiện tại có:
- **`PropertiesService`** ([properties.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/properties/properties.service.ts)): Xử lý semantic search cho `BuildingProperty` (tòa nhà), hỗ trợ intent `density`, `count`, `list` với filter theo ward/district
- **`PoiService`** ([poi.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.service.ts)): Tìm kiếm POI theo category, chỉ support viewport bbox search, **không có semantic query**
- **`Place` table**: 18,114 POIs, trong đó Hải Châu có 5,530 POIs (1,114 quán cà phê, 1,097 nhà hàng, 478 khách sạn...) trải trên 13 phường

Yêu cầu: Hỗ trợ các câu hỏi semantic kiểu:
- "Quán cà phê có diện tích lớn nhất ở phường Hải Châu I"
- "Khu vực nào có nhiều quán cà phê nhất ở Hải Châu"
- "Phường nào dày đặc nhà hàng nhất ở Hải Châu"
- "Khu vực thưa thớt quán cà phê nhất ở Hải Châu"

## User Review Required

> [!IMPORTANT]
> **Thiếu dữ liệu diện tích POI**: Bảng `Place` không có cột `areaSqm` (diện tích). Overture Places data cũng không cung cấp thông tin này. Câu hỏi "quán cà phê có diện tích lớn nhất" sẽ **không trả về kết quả chính xác** trừ khi:
> 1. Thêm cột `areaSqm` vào `Place` và import từ nguồn khác
> 2. Hoặc ước tính diện tích từ geometry (nếu geometry là polygon, không phải point)
> 3. Hoặc trả về kết quả gần đúng kèm cảnh báo "Dữ liệu diện tích chưa có"
>
> **Đề xuất**: Thêm cột `areaSqm` vào schema, tính diện tích từ geometry cho các POI có polygon geometry, và trả warning cho các POI chỉ có point geometry.

> [!WARNING]
> **Elasticsearch chưa index POI data**: Hiện tại ES chỉ index `BuildingProperty`. Script indexing cần mở rộng để index cả `Place` table, nhưng đây là thay đổi lớn. Đề xuất: **Giai đoạn 1** chỉ dùng SQLite trực tiếp cho POI semantic queries (đủ nhanh cho 18k records), **Giai đoạn 2** mới mở rộng ES.

## Open Questions

1. **Diện tích POI**: Bạn muốn xử lý câu hỏi "diện tích lớn nhất" thế nào khi Place table không có areaSqm? Có nên tính từ geometry không?
2. **Phạm vi**: Có cần hỗ trợ tất cả các quận hay chỉ tập trung Hải Châu trước?
3. **Elasticsearch**: Có cần index POI vào ES ngay trong giai đoạn này không, hay SQLite trực tiếp là đủ?

## Proposed Changes

### Component 1: POI Search Intent Detection

Mở rộng `searchIntent()` trong `PropertiesService` để nhận diện câu hỏi POI, hoặc tốt hơn là thêm logic tương tự vào `PoiService`.

#### [MODIFY] [poi.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.service.ts)

Thêm method `semanticSearch()` — entry point mới cho POI semantic queries:

```typescript
// Thêm types mới
type PoiSemanticIntent = {
  type: "poi-density" | "poi-count" | "poi-list" | "poi-superlative";
  direction?: "highest" | "lowest" | "largest" | "smallest";
  superlative?: "area" | "count";
  categoryFilter?: string[];  // ["cafe", "coffee_shop"]
  filters: {
    ward?: string;
    district?: string;
  };
};

type PoiDensityRegion = {
  ward: string;
  district: string;
  count: number;
  center: { lat: number; lng: number };
};

// Thêm method:
async semanticSearch(query: string): Promise<PoiSemanticResult> {
  const intent = this.parseSemanticIntent(query);
  
  if (intent.type === "poi-density") {
    return this.poiDensityByWard(intent);
  }
  if (intent.type === "poi-superlative") {
    return this.poiSuperlative(intent);
  }
  if (intent.type === "poi-count") {
    return this.poiCount(intent);
  }
  return this.poiList(intent);
}
```

**Intent detection keywords** (Vietnamese normalized):
| Pattern | Intent |
|---------|--------|
| `"nhieu ... nhat"`, `"day dac"`, `"dong duc"` | `poi-density` direction=highest |
| `"it nhat"`, `"thua thot"`, `"vang"` | `poi-density` direction=lowest |
| `"dien tich lon nhat"`, `"rong nhat"` | `poi-superlative` superlative=area |
| `"bao nhieu"`, `"so luong"` | `poi-count` |
| `"danh sach"`, `"liet ke"`, `"tim"` | `poi-list` |

**Category detection** — tái sử dụng [CategoryMapper](file:///e:/DUAN/geoAI_web/apps/api/src/poi/category-mapper.ts):
- "quán cà phê" → `["cafe", "coffee_shop"]`
- "nhà hàng" → `["restaurant", "vietnamese_restaurant", ...]`
- "khách sạn" → `["hotel", "accommodation"]`

---

### Component 2: POI Density by Ward

#### [MODIFY] [poi.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.service.ts)

Thêm method query trực tiếp SQLite (thông qua `BetterSqliteService` giống `PropertiesService`):

```sql
-- POI density by ward trong Hải Châu
SELECT 
  ward,
  district,
  COUNT(*) as count,
  AVG(latitude) as centerLat,
  AVG(longitude) as centerLng
FROM "Place"
WHERE district = 'Hải Châu'
  AND category IN ('cafe', 'coffee_shop')
GROUP BY ward
ORDER BY count DESC  -- hoặc ASC cho thưa thớt
LIMIT 10
```

---

### Component 3: POI Superlative Queries (diện tích lớn nhất)

#### [MODIFY] [schema.prisma](file:///e:/DUAN/geoAI_web/apps/api/prisma/schema.prisma)

Thêm cột `areaSqm` vào `Place` model:

```prisma
model Place {
  // ... existing fields
  areaSqm       Float?    // Diện tích m², tính từ geometry nếu có polygon
}
```

#### [NEW] [scripts/backfill_place_area.py](file:///e:/DUAN/geoAI_web/scripts/backfill_place_area.py)

Script tính areaSqm cho Place records có geometry dạng Polygon:

```python
# Dùng shapely để tính diện tích polygon geometry
from shapely.geometry import shape
from pyproj import Geod

geod = Geod(ellps="WGS84")
area = abs(geod.geometry_area_perimeter(polygon)[0])
```

---

### Component 4: POI Controller Endpoint

#### [MODIFY] [poi.controller.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.controller.ts)

Thêm endpoint mới:

```typescript
@Get("semantic-search")
@RequirePermissions("search.use")
semanticSearch(@Query("q") q: string) {
  return this.poiService.semanticSearch(q || "");
}
```

---

### Component 5: BetterSqliteService Integration

#### [MODIFY] [poi.module.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.module.ts)

Inject `BetterSqliteService` vào `PoiModule` để `PoiService` có thể chạy raw SQL queries trực tiếp trên SQLite.

#### [MODIFY] [poi.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.service.ts)

Inject `BetterSqliteService` vào constructor:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly categoryMapper: CategoryMapper,
  @Optional() @Inject(BetterSqliteService) private readonly sqlite?: BetterSqliteService
) {}
```

---

### Component 6: Response Format

Kết quả semantic search POI sẽ trả về format tương thích với frontend hiện tại:

```typescript
type PoiSemanticResult = {
  items: PoiSearchItem[];
  answer: {
    type: "poi-density" | "poi-count" | "poi-superlative";
    text: string;  // Vietnamese answer
    count: number;
    filters: { ward?: string; district?: string; category?: string };
  };
  regions?: PoiDensityRegion[];  // Cho density queries
  meta: {
    searchMode: "sqlite-poi-semantic";
    categories: string[];
    intent: string;
  };
};
```

**Ví dụ answer text**:
- "Phường Hải Châu I có nhiều quán cà phê nhất trong quận Hải Châu với 156 quán."
- "Phường Nam Dương có ít quán cà phê nhất trong quận Hải Châu với 23 quán."
- "Có tổng cộng 1,114 quán cà phê trong quận Hải Châu."

---

### Tóm tắt files thay đổi

| File | Action | Mô tả |
|------|--------|-------|
| [poi.service.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.service.ts) | MODIFY | Thêm `semanticSearch()`, intent detection, density/count/superlative queries |
| [poi.controller.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.controller.ts) | MODIFY | Thêm `GET /poi/semantic-search` endpoint |
| [poi.module.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/poi.module.ts) | MODIFY | Inject BetterSqliteService |
| [schema.prisma](file:///e:/DUAN/geoAI_web/apps/api/prisma/schema.prisma) | MODIFY | Thêm `areaSqm` vào Place model |
| [category-mapper.ts](file:///e:/DUAN/geoAI_web/apps/api/src/poi/category-mapper.ts) | MODIFY | Thêm aliases cho semantic detection |
| [backfill_place_area.py](file:///e:/DUAN/geoAI_web/scripts/backfill_place_area.py) | NEW | Script tính areaSqm từ geometry |

## Verification Plan

### Automated Tests
```bash
# Build check
cd apps/api && npx tsc --noEmit

# Run existing + new tests  
npm test -- --testPathPattern=poi

# Manual API test
curl "localhost:3000/poi/semantic-search?q=quan+ca+phe+nhieu+nhat+o+hai+chau"
curl "localhost:3000/poi/semantic-search?q=phuong+nao+it+nha+hang+nhat+o+hai+chau"
curl "localhost:3000/poi/semantic-search?q=bao+nhieu+quan+ca+phe+o+phuong+Hai+Chau+I"
```

### Manual Verification
- Test từng loại câu hỏi semantic (density, count, superlative, list)
- Verify ward/district detection chính xác cho Hải Châu
- Verify category mapping hoạt động đúng
- Check response format phù hợp với frontend
