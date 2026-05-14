# Plan: Ổn định Start.bat, Local Overture Mode, Dọn Rác Và Xanh Toàn Bộ Test

## Summary

Mục tiêu ưu tiên: sau khi Docker Desktop đã bật, người dùng chỉ chạy `start.bat`, rồi truy cập `http://localhost:3000` để dùng app. App mặc định dùng dữ liệu Overture local cũ, không tải/cập nhật Overture/GADM/GeoTIFF mới, không chạy AI scan runtime. Sau đó dọn rác repo, refactor các điểm đang rối, và đưa API tests, web tests, builds, Python compile, smoke test về xanh.

## Key Interfaces

- `start.bat`: entrypoint chính cho local dev.
- `GEOAI_LOCAL_DATA_ONLY=true`: không tải/cập nhật dữ liệu mới.
- `GEOAI_FORCE_OVERTURE_SCAN=true`: mọi scan dùng Overture local.
- `GEOAI_DEFAULT_SCAN_MODE=overture`: default scan mode.
- `GEOAI_SKIP_STARTUP_PRELOAD=true`: Python backend không preload nặng lúc start.
- `USE_ELASTICSEARCH=1`: optional, bật embedding service + Elasticsearch search provider.

## Atomic Task Breakdown

### A. Baseline Và Không Làm Mất Code

1. Chụp `git status --short` hiện tại vào ghi chú nội bộ.
2. Phân loại file dirty: backend runtime, frontend UI, tests, docs, generated/rác.
3. Với từng file dirty tracked, xác định là thay đổi người dùng hay thay đổi cần giữ từ phiên trước.
4. Không revert bất kỳ file dirty nào nếu chưa xác định rõ.
5. Chạy lại baseline: `npm run test:api -- --runInBand`.
6. Chạy lại baseline: `npm run test:web -- --runInBand`.
7. Chạy lại baseline: `npm run build -w @geoai/api`.
8. Chạy lại baseline: `npm run build -w @geoai/web`.
9. Chạy Python compile: `.\.venv310\Scripts\python.exe -m py_compile geoai_backend.py scripts\property_embedding_service.py`.
10. Ghi danh sách lỗi thật sự còn lại vào `BACKEND_COMMANDS.md` hoặc docs phù hợp.

### B. Làm `start.bat` Thành Một Lệnh Tin Cậy

11. Kiểm tra cú pháp quoting của mọi lệnh `start "... " cmd /k ...`.
12. Tách biến env local-data-only thành block rõ ràng.
13. Thêm check `.venv310`, fallback `.venv`, fallback `python`.
14. Thêm check `node`, `npm`, `docker`, `docker info`.
15. Thêm check `docker compose version`.
16. Chuyển port check từ warning chung sang kết quả rõ từng port.
17. Nếu port bận bởi process không thuộc repo, dừng với hướng dẫn cụ thể.
18. Nếu port bận bởi process node/python thuộc repo, plan cho auto-kill an toàn theo command line chứa `geoAI_web`.
19. Không kill process lạ chỉ vì trùng port.
20. Bật Elasticsearch bằng `docker compose -f docker-compose.search.yml up -d`.
21. Health-check Elasticsearch `/_cluster/health`.
22. Start Python backend `:5000` với local-data-only env.
23. Health-check Python `/health` trước khi báo sẵn sàng.
24. Start NestJS API `:4000`.
25. Health-check Nest API bằng `/auth/me` hoặc endpoint nhẹ hợp lệ, chấp nhận `401/200` là service sống.
26. Start Next web `:3000`.
27. Health-check web root hoặc `/login`.
28. In cuối script: URL, trạng thái từng service, cách đọc cửa sổ lỗi.
29. Nếu service fail, script không nói “ready”.
30. Giữ `USE_ELASTICSEARCH=1` optional; mặc định không ép API dùng Elasticsearch semantic search.

### C. Khóa Local Overture, Không Tải Dữ Liệu Mới

31. Giữ `GEOAI_LOCAL_DATA_ONLY=true` mặc định trong backend.
32. Chặn `refresh_danang_gpkg()` khi local-only bật.
33. Chặn `write_danang_gpkg()` khi local-only bật.
34. Chặn `download_overture_buildings()` trong mọi request path khi local-only bật.
35. Chặn GADM download nếu thiếu local boundary; dùng fallback bbox.
36. Chặn GeoTIFF download nếu cache thiếu.
37. Chặn endpoint `/download-data` bằng `409`.
38. Ép `scanMode=geoai` thành `overture` khi `GEOAI_FORCE_OVERTURE_SCAN=true`.
39. Giữ code AI scan nhưng comment rõ “disabled by flag”.
40. Đảm bảo response scan trả `scanMode: "overture"` và `dataSource` local Overture.
41. Thêm test backend hoặc Python-level smoke cho flag local-only nếu khả thi.
42. Thêm web API route test bảo toàn `scanMode=overture`.

### D. Sửa Lỗi Test Web Đang Đỏ

43. Sửa `MeasurementToolbar.test.js`: đổi matcher tiếng Anh sang tiếng Việt hiện tại.
44. Kiểm tra đủ button: `Đo khoảng cách`, `Đo diện tích`, `Hoàn tác`, `Xóa`, `Sao chép`, `Lưu`, `Xuất JSON`.
45. Sửa checkbox matcher từ `/snap/i` sang label tiếng Việt.
46. Sửa permission test giữ expected `"Permission required."` nếu UI còn tiếng Anh, hoặc đổi UI/test cùng ngôn ngữ nhất quán.
47. Sửa `MapWrapperMeasurement.test.js`: đổi `"Measurement tools"` sang `"Đo khoảng cách/diện tích"`.
48. Nếu section collapsed làm test không thấy button, click trigger trước khi assert.
49. Sửa `LayerPanel.test.js`: cập nhật group label thực tế sau Việt hóa.
50. Sửa `LayerPanel.test.js`: cập nhật search query từ `"runtime"` sang text/layer hiện có.
51. Chạy focused tests cho 3 file đỏ.
52. Chạy lại toàn bộ `npm run test:web -- --runInBand`.

### E. Sửa Lỗi Runtime/API Đã Ghi Trong Log

53. Xác minh `DashboardModule` đã import `AuthModule`; nếu đã đúng, thêm test regression cho guard injection.
54. Xử lý lỗi session refresh token unique: đảm bảo refresh token có `jti` và test không mock token cố định gây collision.
55. Kiểm tra `PrismaSessionRepository.create`: nếu duplicate vẫn có thể xảy ra, retry 1 lần hoặc revoke/upsert theo policy rõ.
56. Kiểm tra lỗi Prisma NAPI khi đọc SQLite 4GB ở dashboard.
57. Ưu tiên dùng `BetterSqliteService` cho dashboard aggregation lớn thay vì Prisma đọc nhiều JSON/string.
58. Thêm test dashboard service cho aggregation không cần load toàn bộ geometry/embedding.
59. Kiểm tra `/api/properties?limit=3` chậm 5-15s; xác định query đang đọc field nặng nào.
60. Giảm select fields mặc định cho list/search để không kéo `geometry`, `attributes`, `embedding` khi không cần.
61. Thêm test properties list đảm bảo response vẫn đủ field UI cần.
62. Chạy `npm run test:api -- --runInBand`.

### F. Dọn Rác Và Chuẩn Hóa Repo

63. Lập danh sách file rác root: `.tmp-*.log`, `*-dev.log`, `embedding-service*.log`, `.next`, `scratch`.
64. Đảm bảo `.gitignore` đã ignore logs/cache/build output.
65. Xóa chỉ file rác untracked/generated, không xóa dữ liệu local `geoai_data`.
66. Không xóa `.env`, `.venv`, `.venv310`, `geoai_data`.
67. Nếu cần giữ ví dụ log, chuyển sang docs ngắn thay vì log thật.
68. Dọn `BACKEND_COMMANDS.md`: chỉ giữ lệnh vận hành hiện tại.
69. Cập nhật `README.md`/`STARTUP_GUIDE.md`: `start_geoai.bat` cũ không còn recommended.
70. Ghi rõ: Docker Desktop trước, rồi `.\start.bat`, rồi mở `localhost:3000`.
71. Ghi rõ chế độ dữ liệu: local Overture only, không download mới.
72. Ghi rõ cách bật lại AI sau này bằng env flags, không xóa code.

### G. Refactor Nhỏ, Không Đổi Hành Vi

73. Tách constants/env parsing Python thành block rõ `Runtime flags`.
74. Gom các guard local-only vào helper nhỏ: `is_local_data_only()`.
75. Không refactor lớn `geoai_backend.py` sang nhiều file trong pass đầu.
76. Trong web, đổi `geoai-disabled` thành hằng số nếu còn dùng UI option disabled.
77. Đảm bảo UI không gửi `geoai-disabled` làm scan mode.
78. Nếu giữ option disabled, test rằng selected mode vẫn là `overture`.
79. Rà các text “GeoAI scan” trên UI; đổi sang “Kết quả quét / Overture” nếu đang gây hiểu nhầm.
80. Không đổi layout lớn trong đợt ổn định này.

## Test Plan

- API unit/regression: `npm run test:api -- --runInBand`.
- Web unit/regression: `npm run test:web -- --runInBand`.
- API build: `npm run build -w @geoai/api`.
- Web build: `npm run build -w @geoai/web`.
- Python compile: `.\.venv310\Scripts\python.exe -m py_compile geoai_backend.py scripts\property_embedding_service.py`.
- Startup smoke: Docker Desktop running, then `.\start.bat`.
- Browser smoke: open `http://localhost:3000`, verify login/register page loads, map page loads, Overture scan mode selected, no automatic download logs appear.
- Service smoke: `localhost:3000`, `localhost:4000`, `localhost:5000/health`, `localhost:9200/_cluster/health`.

## Acceptance Criteria

- `start.bat` brings up Elasticsearch, Python backend, Nest API, and Next web without manual extra commands.
- User can use the app from `http://localhost:3000`.
- No startup path downloads Overture, GADM, or GeoTIFF data.
- Scan requests use Overture/local GeoPackage, not runtime AI extraction.
- All API tests pass.
- All web tests pass.
- Both builds pass.
- Python compile passes.
- Repo no longer contains unnecessary root logs/cache artifacts except intentionally ignored local data.
- Docs match the actual startup path.

## Assumptions

- “test 2a2” means “test tất cả”.
- Priority is “chạy được trước”, then dọn rác/refactor.
- Existing `geoai_data` must be preserved.
- Docker Desktop is started manually before `start.bat`.
- Elasticsearch container is required to be up, but API semantic Elasticsearch search remains optional unless `USE_ELASTICSEARCH=1`.
