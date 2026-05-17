# Requirements Document

## Introduction

Spec này gom toàn bộ các bug và cải tiến cho luồng "semantic search nhà/đất" trong GeoAI Web vào **một** bugfix spec duy nhất, lý do gộp tuân theo DRY/YAGNI:

- Shared trigger: tất cả các bug đều phát sinh từ một entrypoint duy nhất ở phía web — form ô "Tìm kiếm nhà đất" trong `apps/web/components/MapWrapper.js` gọi `fetch("/api/properties?query=...")` → Next route `apps/web/app/api/properties/route.js` → Nest `apps/api/src/properties/properties.controller.ts` → `properties.service.ts::searchProperties()`. Bất kỳ cải tiến nào ở mức intent, projection, timeout, hay AbortController đều phải coexist trên cùng đường truyền này. Tách thành nhiều spec sẽ phải lặp Glossary, Out of Scope, Verification Matrix, và sẽ buộc duplicate helper (`isDensityQuestion`, `densityLocationFilters`, `selectLightPropertyFields`, `KNOWN_WARDS`).
- Shared blocking state: hai triệu chứng quan sát được cùng lúc — (a) UI treo "đang tải" do request density 10–60 s vì SQLite 4 GB scan toàn bảng và không có timeout backend; (b) câu hỏi tự nhiên kiểu "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc" không nhận diện được intent density / không match đúng phường, dẫn tới rơi xuống nhánh `list` và trả không liên quan. Hai triệu chứng này được fix bởi cùng một set helper (intent classifier mới, ward whitelist từ `locationNames()` cache, light projection, timeout + AbortController).

Treating đây là một bugfix spec là DRY: cùng một verification matrix (`npm run test:api`, `npm run test:web`, smoke `curl /properties`), cùng một response shape phải giữ (`items`, `answer`, `map`, `meta`), cùng một file gốc cần sửa (`properties.service.ts`, `elasticsearch-property-search.provider.ts`, `MapWrapper.js`). YAGNI: không build feature mới, không chuyển kiến trúc — chỉ ổn định luồng hiện có để câu hỏi tiếng Việt về mật độ/vùng/phường trả lời được trong < 1 s khi có ward, và không bao giờ treo > 8 s khi không có ward.

Acceptance flow user phải làm được sau khi spec này lands:

1. Chạy `start.bat` (đã thuộc spec `app-stabilization-local-overture`).
2. Mở `http://localhost:3000`, đăng nhập, mở map.
3. Gõ "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc" → phải trả density regions trong < 2 s.
4. Gõ "vùng nào thưa thớt nhất ở Liên Chiểu" → phải nhận density-low intent, sort tăng dần.
5. Gõ chuỗi mơ hồ → trong vòng 8 s phải có response hoặc thông báo "Vui lòng thu hẹp khu vực", không treo vô hạn.
6. Gõ liên tục nhiều ký tự → response cũ bị abort, không ghi đè response mới.

## Glossary

- **Bug Condition `C(X)`**: Predicate trên input hoặc runtime state, xác định invocation nào trigger defect. Fix check chạy trên `C(X)` true; preservation check chạy trên `NOT C(X)`.
- **Preservation Check**: Test cố định hành vi đúng hiện tại cho `NOT C(X)`. Phải pass cả trên code chưa fix và đã fix. Chống regression.
- **Fix Check**: Test trên `C(X)` true. Phải FAIL trên code chưa fix `F`, PASS trên code đã fix `F'`.
- **Light Projection**: Prisma `select` shape gọn nhẹ, omit `geometry`, `attributes`, `embedding` theo mặc định, vẫn giữ `bbox`, `centroidLat`, `centroidLng` cho map render. Có thể opt-in heavy fields qua tham số rõ ràng. (Khái niệm này lặp Requirement 9 của spec `app-stabilization-local-overture` nhưng spec đó chưa apply cho path search nhà/đất; spec này apply.)
- **AbortController**: Web API chuẩn để huỷ `fetch` đang chạy. Dùng cả backend (truyền `AbortSignal.timeout(ms)` vào `fetch` MiniLM và `client.search` Elasticsearch) và frontend (huỷ request cũ khi user gõ tiếp).
- **MiniLM**: Service Python `http://localhost:5055/embed` chạy `paraphrase-multilingual-MiniLM-L12-v2`, output 384-dim vector cho semantic search.
- **Elasticsearch script_score**: Hybrid search trong `ElasticsearchPropertySearchProvider`: BM25 trên `searchTextNormalized` cộng `cosineSimilarity(query_vector, 'embedding')` qua script_score.
- **Density Region**: Một vùng (cell hoặc ward/district) trong response `map.regions[]` với `count`, `center`, `bbox`, và mảng `objects[]` các building. Được render bởi `apps/web/src/features/map/property-search.js::densitySummaryRows`.
- **Ward Whitelist (`KNOWN_WARDS`)**: Tập tên phường chuẩn build một lần từ `locationNames()` cache (đọc từ SQLite `BuildingProperty.ward DISTINCT`). Tương tự `DANANG_DISTRICTS` đã có sẵn cho cấp quận.
- **`isBugCondition`**: Function chuẩn theo bugfix methodology của Kiro, return true cho input thoả mãn bug condition.
- **`F` / `F'`**: `F` = function gốc (chưa fix). `F'` = function sau fix.
- **Density Direction**: Chiều sort khi user hỏi mật độ. `"highest"` cho "nhiều nhất / dày đặc nhất", `"lowest"` cho "ít nhất / thưa thớt nhất".
- **Total UI Deadline**: Tổng thời gian tối đa từ lúc submit form đến lúc user thấy response hoặc thông báo lỗi rõ ràng, không bao gồm thời gian gõ.

## Assumptions

- `start.bat` đã chạy thành công, các service `localhost:3000`, `localhost:4000`, `localhost:5000`, `localhost:9200` đều healthy. Spec này không can thiệp startup flow.
- File SQLite `BuildingProperty` ~4 GB tồn tại tại đường dẫn cũ; không migrate, không re-index offline.
- MiniLM service `http://localhost:5055/embed` và Elasticsearch `http://localhost:9200` là **tuỳ chọn**: bật khi `PROPERTY_SEARCH_PROVIDER=elasticsearch` AND `intent.type === "list"`. Khi tắt hoặc lỗi, hệ thống phải fallback sang Postgres path (thực chất là Prisma + BetterSqlite trên SQLite).
- Tất cả copy UI là tiếng Việt; câu hỏi user dạng tự nhiên tiếng Việt không dấu sau khi đi qua `normalizeSearchText`.
- Response shape của `/api/properties` (các trường `items`, `answer`, `map`, `meta`) là contract với UI — không được đổi tên trường, không xoá trường. Có thể **thêm** trường mới (ví dụ `meta.warnings[]`, `meta.timedOut`) miễn UI hiện tại không vỡ.
- Frontend dùng "This is NOT the Next.js you know"; bất kỳ thay đổi nào trong `app/api/properties/route.js` phải tham chiếu `node_modules/next/dist/docs/` thay vì giả định API Next.js cũ. Spec này không đổi API Next.js, chỉ đi qua proxy hiện có.
- Người chạy thử spec có thể đăng nhập qua `start.bat` flow để có cookie phục vụ smoke `curl`.

## Out of Scope (YAGNI)

- KHÔNG thay đổi Prisma schema, KHÔNG migration, KHÔNG thêm column `embedding_dim`, `density_cell_id`, hay bất kỳ index nào ở mức Prisma schema.
- KHÔNG thêm dependency mới vào `package.json`, `requirements.txt`, `pyproject.toml`. Tất cả fix dùng API Web chuẩn (`AbortSignal.timeout`) và API Elasticsearch client / `better-sqlite3` đã có.
- KHÔNG đụng `start.bat`, runtime flags, hay startup preload — đã thuộc spec `app-stabilization-local-overture`.
- KHÔNG rebuild `ElasticsearchPropertySearchProvider` thành module mới; chỉ thêm timeout, propagate `AbortSignal`, fallback rõ ràng.
- KHÔNG chuyển `BetterSqliteService.all` sang worker thread, KHÔNG thay `better-sqlite3` bằng async driver. Thay vào đó dùng exact ward/district + index runtime + LIMIT để worst-case chạy < 1 s khi có ward.
- KHÔNG tạo CRUD endpoint mới ngoài việc thêm timeout/abort hiện tại; KHÔNG thêm `/properties/density-region/:id/objects` lazy-load endpoint (đã cân nhắc nhưng chọn hydrate top-K trong cùng response để giữ shape).
- KHÔNG thay đổi MiniLM service Python (`scripts/property_embedding_service.py`); chỉ thay đổi cách Nest gọi vào nó.
- KHÔNG split `properties.service.ts` thành nhiều file. Helper mới (`expandIntentKeywords`, `selectLightPropertyFields`, `KNOWN_WARDS`) đặt cùng file hoặc trong cùng folder `apps/api/src/properties/` theo style hiện tại.
- KHÔNG xử lý các câu hỏi vượt phạm vi nhà/đất Đà Nẵng (giá, lịch sử giao dịch, dự đoán, AI report).
- KHÔNG cập nhật tài liệu `README.md`, `STARTUP_GUIDE.md`. Spec này chỉ đụng code và test.

## Verification Matrix

Mọi Fix Check trong document phải được verify ít nhất một trong các lệnh sau, chạy được trên Windows cmd:

- `npm run test:api -- --runInBand`
- `npm run test:web -- --runInBand`
- `npm run build -w @geoai/api`
- `npm run build -w @geoai/web`
- Smoke (auth-gated, dùng cookie từ `start.bat` flow):
  - `curl "http://localhost:4000/properties?query=vung+nao+nhieu+nha+nhat+o+hoa+khanh+bac"` → response có `map.type === "property-density"` AND `map.regions.length > 0` trong < 2 s.
  - `curl "http://localhost:4000/properties?query=vung+nao+thua+thot+nhat+o+lien+chieu"` → response có `meta.densityDirection === "lowest"` trong < 2 s.
  - `curl "http://localhost:4000/properties?query=cho+toi+danh+sach+nha+o+hai+chau&limit=10"` → response < 1 s, mỗi item KHÔNG chứa `geometry` hay `attributes` hay `embedding`.
  - `curl "http://localhost:4000/properties?query=xyz+xyz+xyz"` (ward/district không match): response trả về trong ≤ 5 s với `meta.warnings` chứa thông báo "Vui lòng thu hẹp khu vực" hoặc tương đương.

## Requirements

### Requirement 1: C-SS-1 Mở rộng intent density (highest/lowest, synonym)

**User Story:** Là user gõ tiếng Việt tự nhiên, tôi muốn câu hỏi "vùng nào nhiều nhà nhất", "khu vực thưa thớt nhất", "vùng nào ít nhà ở Hòa Khánh Bắc", "mật độ cao nhất ở Liên Chiểu" đều được nhận diện đúng là intent density và sort theo chiều mong đợi (nhiều→ít hoặc ít→nhiều), để không bị rơi xuống nhánh `list` và nhận kết quả không liên quan.

**Bug Condition `C-SS-1(X)`:** `X` là một query string đến `/properties`. `C-SS-1(X)` holds khi `normalizeSearchText(X)` chứa ít nhất một trong các cụm density-intent KHÔNG nằm trong tập hiện tại (`day dac`, `mat do`, `dong nhat`, `nhieu nhat`) — cụ thể: `thua thot`, `it nha`, `it nhat`, `vang`, `dong duc`, `nhieu nha nhat`, `cao nhat`, `thap nhat`, `dong nhat` (dùng cho "đông nhất") — VÀ câu cũng chứa đối tượng nhà (`nha`, `toa nha`, `can nha`, `building`, `bat dong san`) VÀ chứa từ chỉ vùng (`vung`, `khu`, `noi`, `cho`). Khi đó hàm `isDensityQuestion()` hiện tại trả `false` (sai) → intent rơi xuống `list`.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-1(X)):

1.1 WHERE query đã match một trong các cụm hiện tại (`day dac`, `mat do`, `dong nhat`, `nhieu nhat`) AND có đủ tín hiệu vùng + nhà, THE backend SHALL CONTINUE TO trả intent `density` với `direction = "highest"` AND map response giữ shape `{ type: "property-density", regions: [...] }` không đổi.

1.2 WHERE query là intent `count` (ví dụ "có bao nhiêu nhà ở Hải Châu"), THE backend SHALL CONTINUE TO trả intent `count` AND không bị nhầm sang `density`.

1.3 WHERE query là intent `list` thuần (ví dụ "danh sách nhà ở Hải Châu"), THE backend SHALL CONTINUE TO trả intent `list` AND `map` field SHALL không có hoặc giữ shape hiện tại.

1.4 WHERE query đi qua nhánh Elasticsearch (`PROPERTY_SEARCH_PROVIDER=elasticsearch`), THE provider SHALL CONTINUE TO chỉ chạy cho `intent.type === "list"`; intent `density` (cũ và mở rộng) SHALL CONTINUE TO đi qua Postgres path.

Fix Acceptance Criteria (C-SS-1(X)):

1.5 WHEN `normalizeSearchText(query)` chứa bất kỳ cụm trong tập `{thua thot, it nha, it nhat, vang nha, dong duc, nhieu nha nhat, cao nhat, thap nhat, dong nhat}` AND có tín hiệu vùng + nhà, THEN `isDensityQuestion()` SHALL trả `true`.

1.6 THE `SearchIntent` SHALL bổ sung trường `direction: "highest" | "lowest"` (mặc định `"highest"` cho backward compat), được set bởi một helper mới `densityDirection(normalizedQuery)`.

1.7 WHEN query chứa cụm thuộc nhóm "ít / thưa thớt / vắng / thấp nhất" (`thua thot`, `it nha`, `it nhat`, `vang nha`, `thap nhat`), THEN `densityDirection()` SHALL trả `"lowest"`; ngược lại trả `"highest"`.

1.8 THE `densityRegions()` query SHALL truyền `direction` xuống ORDER BY: `"highest"` → `ORDER BY count DESC`, `"lowest"` → `ORDER BY count ASC`. Cả hai SHALL tiếp tục `LIMIT` bằng `DEFAULT_DENSITY_REGION_LIMIT` (6).

1.9 THE response `meta` SHALL bao gồm `meta.densityDirection: "highest" | "lowest"` khi `intent.type === "density"`, để UI có thể hiển thị nhãn phù hợp ("Vùng nhiều nhà nhất" vs "Vùng thưa thớt nhất").

1.10 WHEN `intent.type === "density"` AND `direction === "lowest"`, THEN `searchAnswer()` SHALL sinh `text` chứa cụm "thưa thớt nhất" hoặc "ít nhất" thay vì "nhiều nhất" hoặc "dày đặc nhất".

1.11 A unit test trong `apps/api/src/properties/properties.service.spec.ts` SHALL assert rằng với query `"vùng nào thưa thớt nhất ở Liên Chiểu"`, intent type là `"density"` AND `direction` là `"lowest"` AND ORDER BY là tăng dần.

1.12 THE helper mới `densityDirection()` SHALL được gọi từ ít nhất 3 chỗ (intent classifier, `densityRegions`, `searchAnswer`) — DRY.

### Requirement 2: C-SS-2 Hydrate objects cho top-K region density

**User Story:** Là user click một region khác (không phải region đầu tiên) trong panel kết quả density, tôi muốn thấy ngay danh sách nhà thuộc region đó mà không phải bấm thêm request, để không bị panel trống và không phải đoán region nào "có dữ liệu".

**Bug Condition `C-SS-2(X)`:** `X` là response từ `/properties` với `intent.type === "density"`. `C-SS-2(X)` holds khi `X.map.regions.length > 1` AND `X.map.regions[i].objects` rỗng hoặc undefined cho mọi `i > 0`. Hiện tại `attachDensityObjects()` chỉ chọn `regions[0]` để hydrate `objects`; các region khác đều `objects: []`.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-2(X)):

2.1 WHEN `X.map.regions.length === 1`, THE response SHALL CONTINUE TO chứa `regions[0].objects` đầy đủ như hiện tại.

2.2 THE giới hạn tổng số objects qua `DEFAULT_DENSITY_OBJECT_LIMIT` (350) SHALL CONTINUE TO được áp dụng để khống chế payload.

2.3 THE shape của mỗi `PropertyDensityObject` (các trường `id`, `type`, `center`, `bbox`, `geometry`, `geometrySource`, `properties`) SHALL CONTINUE TO không đổi.

2.4 THE thứ tự region trong `map.regions[]` (sort theo `count` theo `direction`) SHALL CONTINUE TO không đổi.

Fix Acceptance Criteria (C-SS-2(X)):

2.5 WHEN `X.map.regions.length > 1`, THEN `attachDensityObjects()` SHALL hydrate `objects` cho tất cả các region trong `regions[]`, không chỉ `regions[0]`.

2.6 THE phân bổ ngân sách object SHALL theo trọng số `count` của region: với tổng budget `DEFAULT_DENSITY_OBJECT_LIMIT = 350`, mỗi region `r_i` nhận `take_i = floor(350 * count_i / sum(count))`, làm tròn xuống và đảm bảo `take_i >= 1` cho mọi region có `count > 0`. Phần dư cộng vào `regions[0]`.

2.7 THE Prisma findMany cho mỗi region SHALL `WHERE centroidLat BETWEEN bbox.south AND bbox.north AND centroidLng BETWEEN bbox.west AND bbox.east` AND `take = take_i`. Có thể implement bằng nhiều `findMany` song song qua `Promise.all` hoặc một query union, miễn tổng số object trả về ≤ 350.

2.8 IF tổng `count` của tất cả region = 0 (không có region nào hydrate được), THEN response SHALL trả `regions: []` AND `meta.warnings` chứa thông báo "Không tìm thấy vùng phù hợp".

2.9 A unit test SHALL seed 3 region giả với `count = [100, 50, 10]` AND assert rằng `objects.length` của mỗi region tỷ lệ với `count` AND tổng `objects.length` ≤ 350.

2.10 WHEN smoke `curl "http://localhost:4000/properties?query=vung+nao+nhieu+nha+nhat+o+lien+chieu"`, mỗi `regions[i].objects` SHALL có ít nhất 1 phần tử cho mọi `i` mà `regions[i].count > 0`.

2.11 THE total response payload size SHALL không vượt quá kích thước hiện tại quá 30 % (đo bằng `Content-Length` header trong smoke run); nếu vượt, giảm `DEFAULT_DENSITY_OBJECT_LIMIT` xuống còn cho khớp.

### Requirement 3: C-SS-3 Loại LIKE scan, ưu tiên exact ward/district + index runtime

**User Story:** Là user hỏi density với phường/quận cụ thể (ví dụ "vùng nào nhiều nhà nhất ở Hòa Khánh Bắc"), tôi muốn câu trả lời trong dưới 1 giây thay vì chờ 10–60 giây vì backend đang LIKE-scan toàn bảng SQLite 4 GB.

**Bug Condition `C-SS-3(X)`:** `X` là intent density có `intent.filters.ward` hoặc `intent.filters.district` đã match được trong `locationNames()` cache. `C-SS-3(X)` holds khi `densityRegions()` hoặc `densityTotal()` vẫn dùng `LIKE '%term%'` trên `searchTextNormalized` (đường code có `termFilters` non-empty) thay vì đẳng thức `WHERE ward = ?` / `WHERE district = ?`.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-3(X)):

3.1 WHERE intent density không có ward/district nào match được trong `locationNames()` cache, THE behavior SHALL CONTINUE TO fallback theo Requirement 9 (timeout + thông báo "Vui lòng thu hẹp khu vực"); KHÔNG yêu cầu LIKE-scan toàn bảng phải nhanh.

3.2 THE shape của response density (`map.regions`, `answer`, `meta.total`) SHALL CONTINUE TO không đổi cho cả nhánh exact và nhánh LIKE.

3.3 WHERE `BetterSqliteService` không khả dụng (`this.sqlite` là undefined), THE behavior SHALL CONTINUE TO trả `regions: []` mà không crash.

3.4 THE Prisma schema SHALL CONTINUE TO không đổi; index runtime SHALL được tạo qua `CREATE INDEX IF NOT EXISTS` trong `BetterSqliteService` boot path, KHÔNG touch `prisma/schema.prisma`.

Fix Acceptance Criteria (C-SS-3(X)):

3.5 WHEN intent density có `filters.ward` match cache, THEN `densityRegions()` SHALL chỉ dùng `WHERE deletedAt IS NULL AND source = ? AND ward = ?` (không LIKE term nào trong path này), AND `terms` SHALL được set rỗng để bỏ qua block `termFilters`.

3.6 WHEN intent density có `filters.district` match cache (mà không có ward), THEN tương tự với `WHERE ... AND district = ?` (không LIKE).

3.7 WHEN cả ward và district match, THEN `WHERE ... AND ward = ? AND district = ?` (đẳng thức cả hai).

3.8 THE `BetterSqliteService` boot path SHALL chạy `CREATE INDEX IF NOT EXISTS idx_buildingproperty_ward_district ON BuildingProperty (deletedAt, source, ward, district)` AND `CREATE INDEX IF NOT EXISTS idx_buildingproperty_centroid ON BuildingProperty (centroidLat, centroidLng) WHERE deletedAt IS NULL` (idempotent — nếu chạy nhiều lần không crash, không tốn DDL nếu đã tồn tại).

3.9 THE việc tạo index SHALL đặt sau khi DB connection mở, log một dòng `[BetterSqlite] Ensured index idx_*` cho mỗi index. Nếu `CREATE INDEX` ném lỗi (ví dụ schema không có column), service SHALL log warning AND tiếp tục boot, KHÔNG crash Nest.

3.10 WHEN nhánh exact (ward hoặc district match) chạy trên smoke `curl "http://localhost:4000/properties?query=vung+nao+nhieu+nha+nhat+o+hoa+khanh+bac"`, response SHALL trả về trong < 1 s (đo bằng `time curl ...` hoặc tương đương).

3.11 A unit test trong `properties.service.spec.ts` SHALL mock `BetterSqliteService.all` AND assert rằng SQL chuẩn bị cho nhánh exact KHÔNG chứa substring `LIKE` trong WHERE clause.

3.12 THE helper `densityLocationFilters()` đã có SHALL được tận dụng (không viết lại); nếu cần thay đổi, change phải giữ contract `{ ward?: string, district?: string }` (DRY: được gọi từ `densityRegions`, `densityTotal`, `attachDensityObjects`).

### Requirement 4: C-SS-4 Light projection cho list & density objects

**User Story:** Là user request `/properties?query=...&limit=10` cho intent list, hoặc nhận response density với 350 building objects, tôi muốn payload không kéo theo `geometry` GeoJSON đầy đủ (có thể MB mỗi item) và `attributes` (object lớn) và `embedding` (384 floats), để response < 1 s và bandwidth thấp.

**Bug Condition `C-SS-4(X)`:** `X` là call tới `prisma.buildingProperty.findMany` từ `searchPropertiesPostgres` (intent list / count) hoặc `attachDensityObjects` (intent density). `C-SS-4(X)` holds khi call site KHÔNG có `select` field rõ ràng, mặc định Prisma trả full row bao gồm `geometry`, `attributes`, `embedding`. Spec `app-stabilization-local-overture` Requirement 9 đã yêu cầu `selectLightPropertyFields()` nhưng chưa apply cho path search nhà/đất; spec này apply.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-4(X)):

4.1 THE endpoint `GET /properties/:id` (detail single property) SHALL CONTINUE TO trả `geometry`, `attributes`, `embedding` đầy đủ như hiện tại.

4.2 THE response `items[]` cho intent list SHALL CONTINUE TO chứa mọi field UI hiện đọc (`id`, `code`, `name`, `addressLine`, `street`, `ward`, `district`, `city`, `propertyType`, `status`, `source`, `level`, `height`, `floors`, `areaSqm`, `centroidLat`, `centroidLng`, `bbox`, `searchText`, `createdAt`, `updatedAt`).

4.3 THE response density (`map.regions[].objects[]`) SHALL CONTINUE TO chứa `bbox` (để vẽ polygon hộp) AND `centroidLat`/`Lng` (qua `propertyObjectCenter`) — vì `densityObject()` cần cả hai.

4.4 THE export endpoint nếu có (e.g. `/properties/export`) explicit yêu cầu heavy fields SHALL CONTINUE TO trả `geometry`, `attributes`, `embedding`.

Fix Acceptance Criteria (C-SS-4(X)):

4.5 A helper mới `selectLightPropertyFields()` SHALL được tạo trong `apps/api/src/properties/property-light-select.ts` (hoặc cùng file `properties.service.ts` dưới dạng const), trả về Prisma `select` shape gồm tất cả field trong 4.2 nhưng **omit** `geometry`, `attributes`, `embedding`.

4.6 `searchPropertiesPostgres` cho intent list / count SHALL truyền `select: selectLightPropertyFields()` vào cả hai `findMany` (rank chính + fuzzy fallback). Response `items[]` SHALL không chứa key `geometry`, `attributes`, `embedding`.

4.7 `attachDensityObjects()` SHALL truyền `select: selectLightPropertyFields()` AND verify rằng `densityObject()` không phụ thuộc vào `row.geometry` hay `row.attributes`. Nếu `validGeoJsonGeometry(row.geometry)` hiện được dùng, hàm SHALL được điều chỉnh để chấp nhận `geometry === undefined` AND fallback sang `bbox` + `center` (đã có sẵn fallback).

4.8 THE helper `selectLightPropertyFields()` SHALL được dùng tại ít nhất 3 chỗ (`searchPropertiesPostgres` rank, `searchPropertiesPostgres` fuzzy fallback, `attachDensityObjects`) — DRY.

4.9 IF caller cần heavy fields, caller SHALL opt-in qua tham số rõ ràng `selectLightPropertyFields({ withGeometry: true })` HOẶC dùng helper riêng `selectFullPropertyFields()`. Mặc định KHÔNG kéo heavy.

4.10 A regression test SHALL seed một `BuildingProperty` có `geometry`, `attributes`, `embedding` non-null AND assert rằng response `/properties?query=...&limit=1` items[0] KHÔNG chứa key `geometry`, `attributes`, `embedding`.

4.11 A regression test cho density SHALL assert rằng `map.regions[0].objects[0]` chứa `bbox` AND `center` (từ centroid) AND **không** chứa `geometry` đầy đủ (chỉ `bbox`).

4.12 THE smoke `curl "http://localhost:4000/properties?query=cho+toi+danh+sach+nha+o+hai+chau&limit=10"` SHALL trả về trong < 1 s; payload size < 100 KB cho 10 items (đo bằng `Content-Length`).

4.13 WHERE Elasticsearch path đã chạy (`shouldUseElasticsearch` true), light projection cũng SHALL được apply ở bước hydrate Postgres sau khi nhận `ids` từ Elasticsearch hits (xem `ElasticsearchPropertySearchProvider.search` step "rowById"); KHÔNG apply cho hits raw từ Elasticsearch (Elasticsearch tự `_source` filter, ngoài phạm vi spec này).

### Requirement 5: C-SS-5 Backend timeout cho MiniLM/Elasticsearch + fallback rõ ràng

**User Story:** Là API engineer, tôi muốn nếu MiniLM service hoặc Elasticsearch treo (đứng yên không response), Nest request không block vô hạn — phải timeout sau ngưỡng cấu hình được, fallback xuống Postgres path, AND tags cảnh báo trong `meta.warnings` để frontend hiển thị.

**Bug Condition `C-SS-5(X)`:** `X` là call từ `ElasticsearchPropertySearchProvider`: (a) `this.fetchImpl(${url}/embed, ...)` trong `embed()`; hoặc (b) `this.client.search(...)` trong `searchHits()`. `C-SS-5(X)` holds khi call ấy không có `AbortSignal`, không có `requestTimeout`, AND service đối tác (MiniLM hoặc Elasticsearch) không trả response trong khoảng thời gian hợp lý (ví dụ > 10 s). Hiện tại Nest request đứng vô hạn.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-5(X)):

5.1 WHERE MiniLM AND Elasticsearch đều healthy AND response < 1 s, THE provider SHALL CONTINUE TO trả response thành công với `searchMode: "elasticsearch-minilm-hybrid"` AND `semanticModel` field như hiện tại.

5.2 WHERE `PROPERTY_SEARCH_PROVIDER` không phải `"elasticsearch"`, THE behavior SHALL CONTINUE TO bypass provider hoàn toàn; không có timeout nào liên quan.

5.3 THE shape của fallback response (Postgres path) SHALL CONTINUE TO giống response Postgres path đang chạy hôm nay (`searchMode: "postgres-normalized-*"`, đầy đủ `items`, `meta`).

5.4 WHEN Elasticsearch ping fail (`this.client.ping()` throw), THE behavior SHALL CONTINUE TO fallback xuống Postgres path qua try/catch hiện tại.

Fix Acceptance Criteria (C-SS-5(X)):

5.5 THE constant `EMBEDDING_TIMEOUT_MS` SHALL được khai báo trong `elasticsearch-property-search.provider.ts`, mặc định `4000` ms, override-able qua env `EMBEDDING_TIMEOUT_MS`. Validation: phải là số nguyên dương ≤ 30000; nếu không hợp lệ, fallback `4000`.

5.6 THE call `this.fetchImpl(${url}/embed, init)` trong `embed()` SHALL pass `signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS)` trong `init`. WHEN timeout fired, `fetch` reject với `AbortError`; `embed()` SHALL throw một Error có message bắt đầu bằng `"Embedding service timed out after"`.

5.7 THE constant `ELASTICSEARCH_TIMEOUT_MS` SHALL được khai báo, mặc định `5000` ms, override-able qua env `ELASTICSEARCH_TIMEOUT_MS`, cùng validation như 5.5.

5.8 THE call `this.client.search(...)` trong `searchHits()` SHALL pass option `requestTimeout: ELASTICSEARCH_TIMEOUT_MS` (qua API của `@elastic/elasticsearch` client). WHEN timeout fired, client throw `TimeoutError`; provider SHALL re-throw thành Error có message `"Elasticsearch search timed out after"`.

5.9 WHEN `embed()` HOẶC `searchHits()` throw timeout error, THE `searchProperties()` ở `properties.service.ts` SHALL catch trong try/catch hiện có AND fallback xuống `searchPropertiesPostgres(...)` AND **append** vào `meta.warnings[]` chính xác một trong các string:
   - `"MiniLM embedding timed out; used PostgreSQL fallback."`
   - `"Elasticsearch search timed out; used PostgreSQL fallback."`

5.10 THE `meta.warnings[]` SHALL không bị duplicate (một timeout chỉ tạo một warning).

5.11 A unit test SHALL inject một `fetchImpl` luôn block (return một Promise không resolve) AND assert rằng `embed()` reject trong vòng `EMBEDDING_TIMEOUT_MS + 200` ms với error message khớp pattern `"Embedding service timed out after"`.

5.12 A unit test cho service SHALL inject một `elasticsearchProvider` mà `search()` luôn throw timeout AND assert rằng response cuối cùng có `meta.warnings` chứa string từ 5.9 AND `searchMode` thuộc nhóm `"postgres-normalized-*"`.

5.13 IF Elasticsearch client API không hỗ trợ `requestTimeout` trong call site này, THEN provider SHALL wrap `client.search(...)` bằng `Promise.race([searchPromise, timeoutPromise])` với timeout promise reject sau `ELASTICSEARCH_TIMEOUT_MS`. Implementation chọn cách nào cũng được, miễn phù hợp acceptance còn lại.

### Requirement 6: C-SS-6 Ward whitelist từ locationNames cho intent

**User Story:** Là user gõ "ở Hòa Khánh Bắc" hoặc "tại phường Khuê Mỹ", tôi muốn intent classifier nhận đúng đó là phường (ward) mà không bị nhầm thành quận (district) hoặc nhầm sang token tìm kiếm thường, để density/list/count chạy với filter ward đúng.

**Bug Condition `C-SS-6(X)`:** `X` là một query có chứa tên phường thực tế trong DB. `C-SS-6(X)` holds khi `searchIntent(X)` set sai `filters.ward` (undefined hoặc một chuỗi khác với ward chuẩn trong `locationNames()` cache). Nguyên nhân: hiện tại không có whitelist phường (`KNOWN_WARDS`), `extractPhraseAfter` lấy đoạn sau marker rồi trim STOP_WORDS, dễ trượt khi câu có nhiễu (ví dụ "ở Hòa Khánh Bắc, quận Liên Chiểu" sẽ ưu tiên district trước).

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-6(X)):

6.1 WHERE query không chứa tên phường nào trong `locationNames().wards`, THE behavior SHALL CONTINUE TO chạy `extractPhraseAfter` như hiện tại (fallback). `filters.ward` có thể vẫn được set từ phrase sau marker `phuong` / `o`.

6.2 THE matching district qua `DANANG_DISTRICTS` SHALL CONTINUE TO không đổi cho các quận hiện có (`cam le`, `hai chau`, `hoa vang`, `lien chieu`, `ngu hanh son`, `son tra`, `thanh khe`).

6.3 THE behavior khi `BetterSqliteService` không khả dụng (cache không build được) SHALL CONTINUE TO fallback về `extractPhraseAfter` mà không crash.

6.4 THE `locationNames()` cache SHALL CONTINUE TO build-once trong lần gọi đầu tiên (lazy cache); spec này không yêu cầu invalidation.

Fix Acceptance Criteria (C-SS-6(X)):

6.5 THE `locationNames()` SHALL bổ sung tập `wards: Map<string, string>` được build từ `SELECT DISTINCT ward FROM BuildingProperty WHERE ward IS NOT NULL AND deletedAt IS NULL` (đã có trong code hiện tại nếu có; nếu không, thêm). Key là `normalizeSearchText(ward)`, value là tên ward gốc giữ dấu và case.

6.6 THE intent classifier SHALL áp dụng matching ưu tiên: **(1)** ward chính xác (`normalizedQuery.includes(normalizedKnownWard)`) → set `filters.ward`; **(2)** district chính xác (qua `matchKnownDistrict`) → set `filters.district`; **(3)** `extractPhraseAfter("phuong", ...)` cho ward fallback; **(4)** `extractPhraseAfter("quan"/"huyen"/"thuoc"/"o", ...)` cho district fallback.

6.7 WHEN một query chứa BOTH ward chính xác AND district chính xác (ví dụ "ở Hòa Khánh Bắc, quận Liên Chiểu"), THEN `filters.ward = "hoa khanh bac"` AND `filters.district = "lien chieu"` (cả hai cùng được set).

6.8 IF có nhiều ward khớp prefix/substring, THEN ward dài nhất (specific nhất) SHALL được chọn (ví dụ giữa "hoa khanh" và "hoa khanh bac", chọn "hoa khanh bac").

6.9 THE matching SHALL chạy trên `normalizedQuery` đã đi qua `normalizeSearchText` (loại dấu, lowercase) — tận dụng helper hiện có (DRY).

6.10 A unit test SHALL stub `locationNames()` trả về `wards = Map([["hoa khanh bac", "Hòa Khánh Bắc"], ["khue my", "Khuê Mỹ"]])` AND assert rằng query `"vung nao nhieu nha nhat o hoa khanh bac"` cho intent với `filters.ward === "hoa khanh bac"` AND `filters.district === undefined` (hoặc `"lien chieu"` nếu derive được, miễn không gán nhầm ward thành district).

6.11 A unit test SHALL assert rằng query `"o hoa khanh bac, quan lien chieu"` set CẢ ward AND district đúng.

6.12 THE helper mới `matchKnownWard(normalizedQuery, wardCache)` SHALL được tạo gọn và được gọi từ cả `searchIntent` AND `densityLocationFilters` nếu trùng logic — DRY (tối thiểu 2 chỗ; nếu được dùng ở 3+ chỗ thì càng tốt).

### Requirement 7: C-SS-7 Frontend AbortController + UI deadline cho property search

**User Story:** Là user gõ liên tục trong ô tìm kiếm, tôi muốn request cũ bị huỷ ngay khi tôi submit request mới (không có race), AND nếu request mất quá 8 s tôi muốn UI thông báo "Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn" thay vì spinner mãi.

**Bug Condition `C-SS-7(X)`:** `X` là một tương tác user trong `MapWrapper.js`, `runPropertySearch`. `C-SS-7(X)` holds khi: (a) user gọi `runPropertySearch` trong khi một fetch `/api/properties?query=...` trước đó vẫn đang chạy, AND fetch cũ không bị `AbortController.abort()`; HOẶC (b) một fetch chạy quá `TOTAL_UI_DEADLINE_MS` (mặc định 8000 ms) mà không có UI deadline timer cancel nó.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-7(X)):

7.1 WHERE chỉ có một request duy nhất AND response < 8 s, THE behavior SHALL CONTINUE TO render `items`, `answer`, `map` đúng như hôm nay.

7.2 THE behavior gõ "Enter" trong form, click sample question chip, click history chip SHALL CONTINUE TO trigger `runPropertySearch` đúng như hôm nay.

7.3 THE behavior cho `analyzeImage` (đã có AbortController riêng) SHALL CONTINUE TO không bị thay đổi bởi spec này.

7.4 THE `clearWorkspace` đã abort `abortControllerRef.current` SHALL CONTINUE TO chạy đúng.

Fix Acceptance Criteria (C-SS-7(X)):

7.5 `runPropertySearch` SHALL tạo một `AbortController` mới ở mỗi lần invoke. Trước khi tạo mới, nếu `propertySearchAbortRef.current` đang có controller active, gọi `controller.abort()` cho controller cũ. Ref này SHALL tách riêng với `abortControllerRef.current` (đã dùng cho `analyzeImage`) để không xung đột.

7.6 THE `fetch("/api/properties?...")` trong `runPropertySearch` SHALL pass `signal: controller.signal` trong init.

7.7 WHEN fetch reject với `AbortError`, `runPropertySearch` SHALL **không** update state (`setPropertyResults`, `setPropertyAnswer`, `setIsSearchingProperties(false)` etc.) — vì state thuộc về request mới.

7.8 THE `TOTAL_UI_DEADLINE_MS` SHALL được khai báo (constant trong file, default 8000). Một `setTimeout` SHALL gọi `controller.abort()` sau `TOTAL_UI_DEADLINE_MS`. WHEN timer fire AND fetch chưa xong, UI SHALL render trạng thái `propertySearchStatus = "Tìm kiếm quá lâu, vui lòng thu hẹp truy vấn"` (hoặc cờ `propertySearchTimedOut: true` được consume bởi UI text helper hiện có).

7.9 THE `setTimeout` SHALL được `clearTimeout` ngay khi fetch resolve / reject thành công, để timer không nổ sau khi response đã render.

7.10 THE `propertySearchAbortRef` SHALL được abort trong cleanup function của useEffect / khi component unmount, để ngăn memory leak.

7.11 A test trong `apps/web/src/features/map/property-search.test.js` HOẶC `apps/web/components/__tests__/MapWrapper.test.js` SHALL simulate hai lần gọi `runPropertySearch` liên tiếp (request A start, request B start trong khi A chưa resolve) AND assert rằng A bị abort (mock fetch nhận `AbortSignal` đã `aborted = true`) AND state cuối cùng phản ánh response của B.

7.12 A test SHALL inject một `fetch` không bao giờ resolve AND assert rằng sau `TOTAL_UI_DEADLINE_MS + 200` ms (dùng fake timers), UI hiển thị status "Tìm kiếm quá lâu" AND `controller.aborted === true`.

7.13 THE feature `apps/web/src/features/map/property-search.js` (helper xử lý `densitySummaryRows`, `propertySearchAnswerText`) SHALL CONTINUE TO không cần thay đổi shape input; spec này chỉ thêm xử lý error/timeout ở caller.

### Requirement 8: C-SS-8 Tách STOP_WORDS_FOR_TOKENS vs INTENT_KEYWORDS

**User Story:** Là maintainer, tôi muốn tập từ dùng để **lọc token tìm kiếm** tách rời với tập từ dùng để **nhận diện intent** (density / count / property type / ward marker), để không bao giờ rơi vào tình huống intent classifier loại bỏ tín hiệu density vì cùng từ đó nằm trong STOP_WORDS dùng để tokenize.

**Bug Condition `C-SS-8(X)`:** `X` là một query natural language. `C-SS-8(X)` holds khi `STOP_WORDS` hiện tại được dùng đồng thời cho cả mục đích lọc token search (`searchTokens`) lẫn cho `extractPhraseAfter` (loại bỏ filler trong cụm sau marker). Vì cùng một `Set`, các từ như `nhieu`, `mat`, `do`, `day`, `dac`, `nhat` bị treat như stop word — đúng cho tokenize search nhưng SAI cho intent (cần giữ lại để classifier nhận diện density).

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-8(X)):

8.1 THE `searchTokens()` SHALL CONTINUE TO loại bỏ các từ filler tiếng Việt khỏi token tìm kiếm (`cho`, `toi`, `danh`, `sach`, `cac`, `tai`, `va`, `co`, `theo`, `ve`, `cua`, `la`, `bao`, `nhung`, `tim`, `building`, ...).

8.2 THE `extractPhraseAfter()` cho marker `o`, `phuong`, `quan`, `huyen`, `thuoc` SHALL CONTINUE TO loại bỏ filler từ phrase sau marker, hành vi extract phường/quận hiện tại không vỡ.

8.3 THE response shape `meta.tokens` (mảng các token cuối cùng dùng để search) SHALL CONTINUE TO không đổi cho query `"cho toi danh sach nha o hai chau"`.

8.4 THE intent `count` (`isCountQuestion`) AND intent `list` SHALL CONTINUE TO hoạt động đúng cho các query đang pass test.

Fix Acceptance Criteria (C-SS-8(X)):

8.5 THE `STOP_WORDS` hiện tại SHALL được rename thành `STOP_WORDS_FOR_TOKENS` (intent: dùng cho `searchTokens` AND `extractPhraseAfter` nội bộ phrase trim).

8.6 THE tập mới `INTENT_KEYWORDS` SHALL được khai báo, gồm các từ classifier cần giữ: `{day dac, mat do, dong nhat, nhieu nhat, thua thot, it nha, vang, dong duc, cao nhat, thap nhat, bao nhieu, tong, dem, may, vung, khu, noi, cho, toa nha, can nha, nha, building, bat dong san}`. Tập này KHÔNG dùng để filter tokens.

8.7 `isDensityQuestion` AND `isCountQuestion` AND `densityDirection` SHALL match trên `normalizedQuery` gốc (chưa bị strip stop words) — đảm bảo intent keywords luôn còn nguyên trong chuỗi để regex/include hoạt động.

8.8 WHERE intent.type === "density" AND không có ward/district AND `densitySearchTerms` rỗng (vì stop words ăn hết tokens), THE behavior SHALL fallback sang Requirement 9 (timeout + thông báo "Vui lòng chỉ rõ phường/quận") chứ KHÔNG đếm toàn bộ source.

8.9 A unit test SHALL assert rằng `STOP_WORDS_FOR_TOKENS` AND `INTENT_KEYWORDS` không có overlap (assert `[...STOP_WORDS_FOR_TOKENS].every(w => !INTENT_KEYWORDS.has(w))`).

8.10 A unit test SHALL chạy `searchIntent("vung nao nhieu nha nhat")` AND assert intent type là `"density"` AND `direction` là `"highest"`, ngay cả khi `searchTokens` cho cùng query trả mảng rỗng.

8.11 A unit test SHALL chạy `searchTokens("cho toi danh sach nha o hai chau")` AND assert kết quả không chứa filler (`cho`, `toi`, `danh`, `sach`, `o`) — preservation hành vi tokenize cũ.

### Requirement 9: C-SS-9 Density query worst-case + fallback rõ ràng khi không có ward

**User Story:** Là user gõ một câu density mơ hồ ("vùng nào nhiều nhà nhất" không kèm phường/quận), tôi muốn không bị treo > 8 s — backend phải trả "Vui lòng thu hẹp khu vực" trong dưới 5 s thay vì cố scan toàn bảng SQLite 4 GB.

**Bug Condition `C-SS-9(X)`:** `X` là một intent density. `C-SS-9(X)` holds khi (a) có ward/district match nhưng query density vẫn > 1 s (worst-case khi index chưa kịp tạo / không tạo được); HOẶC (b) không có ward/district match AND `densitySearchTerms` rỗng / chỉ chứa từ < 3 ký tự, dẫn tới `densityRegions`/`densityTotal` LIKE-scan toàn bảng.

#### Acceptance Criteria

Preservation Acceptance Criteria (NOT C-SS-9(X)):

9.1 WHERE intent density có ward/district match AND index runtime tồn tại (Requirement 3.8), response density SHALL CONTINUE TO trả trong < 1 s — như fix check của Requirement 3.

9.2 THE flow density với ward/district không cần thông báo "Vui lòng thu hẹp khu vực" — UI text hiện tại của Requirement 1 áp dụng.

9.3 THE response shape (`map`, `answer`, `meta`) SHALL CONTINUE TO không đổi khi intent có ward/district.

9.4 WHERE không có ward/district nhưng có ≥1 search term ≥ 3 ký tự VÀ Postgres trả nhanh (< 3 s do may mắn dữ liệu nhỏ), THE behavior SHALL CONTINUE TO trả density bình thường.

Fix Acceptance Criteria (C-SS-9(X)):

9.5 THE constant `DENSITY_BACKEND_TIMEOUT_MS` SHALL được khai báo trong `properties.service.ts`, mặc định `5000` ms. Override-able qua env `DENSITY_BACKEND_TIMEOUT_MS`.

9.6 THE `searchPropertiesPostgres` cho intent density SHALL wrap `densityRegions(...)` AND `densityTotal(...)` trong một `Promise.race` với `setTimeout(reject, DENSITY_BACKEND_TIMEOUT_MS)`. WHEN timeout fire trước khi query xong, response SHALL trả:
   - `items: []`
   - `answer: { type: "density", count: 0, filters: {...}, text: "Vui lòng thu hẹp khu vực (phường hoặc quận) để câu hỏi mật độ chạy nhanh hơn." }`
   - `map: { type: "property-density", regions: [] }`
   - `meta.warnings: [..., "Density query timed out; please specify ward or district."]`
   - `meta.timedOut: true`
   - HTTP status `200` (không 500) để UI render answer text được.

9.7 WHERE intent density không có ward/district AND không có search terms ≥ 3 ký tự (case `densitySearchTerms` rỗng theo Requirement 8.8), THE backend SHALL trả response như 9.6 NGAY LẬP TỨC (không chạy SQL nào), với `meta.warnings` chứa string `"Density query requires a ward or district; none detected."` AND `meta.timedOut: false`.

9.8 WHERE `BetterSqliteService` chưa boot xong / không khả dụng, THE backend SHALL trả response shape giống 9.6 với warning `"BetterSqliteService unavailable for density query."`.

9.9 A unit test SHALL stub `densityRegions` để delay 6000 ms AND assert rằng response cuối cùng có `meta.timedOut === true` AND `answer.text` chứa cụm "Vui lòng thu hẹp khu vực" AND đến trong < 5500 ms.

9.10 A unit test SHALL chạy intent density không có ward/district AND không có term hợp lệ (mock `densitySearchTerms` trả `[]`), assert response trả về trong < 50 ms với `meta.warnings` chứa `"requires a ward or district"`.

9.11 THE smoke `curl "http://localhost:4000/properties?query=xyz+xyz+xyz"` (rác hoàn toàn): response SHALL về trong ≤ 5 s với `meta.warnings` non-empty.

9.12 THE Frontend Requirement 7 (`TOTAL_UI_DEADLINE_MS = 8000`) SHALL bao trùm cả backend timeout 5000 ms — nghĩa là UI luôn nhận được response hoặc abort trước 8 s, dù backend lỗi.

9.13 IF Requirement 9.6 timeout fire nhưng `BetterSqliteService.all` đang block synchronous (better-sqlite3 không thể abort giữa chừng), THEN backend SHALL log warning `"Density SQL still running after timeout; event loop may be blocked."` AND chấp nhận event loop bị block tới khi SQL xong (đây là hạn chế đã ghi nhận trong Out of Scope, không fix bằng worker thread). Response gửi đi vẫn theo timeout — node.js sẽ ưu tiên sync code chạy xong rồi flush response, nên timeout effect chủ yếu là không scan thêm sau khi SQL hiện tại return.
