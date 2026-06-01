# GeoAI PM Viva Prep

Tài liệu này dùng để ôn vấn đáp theo hướng PM cho dự án GeoAI. Trọng tâm không phải kể công nghệ trước, mà chứng minh nhóm hiểu bài toán, stakeholder, phạm vi, user story, epic, use case, function point và cách nghiệm thu.

## 1. Câu chuyện sản phẩm trong 3 phút

GeoAI là hệ thống quản lý tài sản đô thị Đà Nẵng trên bản đồ. Bài toán gốc không phải "làm AI cho hay", mà là dữ liệu tài sản đô thị đang phân tán, khó tra cứu, thiếu bản đồ tập trung, thiếu cảnh báo rủi ro, phản ánh công dân còn thủ công và báo cáo hỗ trợ quyết định chưa đủ nhanh.

Stakeholder chính gồm:

- Admin/Cán bộ CNTT: quản trị người dùng, phân quyền, cấu hình, sao lưu, audit log.
- Cán bộ quản lý đô thị: quản lý tài sản, kiểm tra dữ liệu, khai thác bản đồ, phân tích không gian, xem báo cáo.
- Người dùng/Công dân: xem thông tin công khai, tìm kiếm vị trí/tài sản, gửi phản ánh sự cố.

Giá trị sản phẩm:

- Tập trung hóa dữ liệu tài sản đô thị.
- Trực quan hóa tài sản và rủi ro trên nền WebGIS.
- Hỗ trợ tìm kiếm, lọc, thống kê, báo cáo và phân tích không gian.
- Dùng AI như một năng lực hỗ trợ: truy vấn thông minh, phân tích ảnh, gợi ý báo cáo, không thay thế vai trò xác định yêu cầu của PM.

Câu chốt nên dùng:

> Điểm quan trọng không phải AI code nhanh, mà là yêu cầu đủ rõ để AI, dev, tester và stakeholder hiểu cùng một hành vi cần nghiệm thu.

## 2. Backlog nhìn theo epic

Backlog hiện có 500 user story, tổng 2632 Function Points. Không nên học thuộc 500 dòng. Hãy học theo capability:

| Epic | Số story | FP | Ý nghĩa PM |
|---|---:|---:|---|
| EPIC-01 - Hiển thị & Tương tác Bản đồ | 135 | 669 | Nền trải nghiệm chính của sản phẩm: xem, điều hướng, lớp bản đồ, tài sản, tìm kiếm, xuất/chia sẻ. |
| EPIC-02 - Quản trị hệ thống | 136 | 682 | Bảo đảm hệ thống vận hành được trong môi trường tổ chức: user, role, permission, log, API key, backup. |
| EPIC-03 - Quản lý Tài sản | 85 | 465 | Capability nghiệp vụ lõi: hồ sơ tài sản, CRUD, import/export, dashboard, bảo trì. |
| EPIC-04 - AI - Truy vấn thông minh | 80 | 450 | Năng lực nâng cao: natural language query, SQL có kiểm soát, nhận dạng ảnh, báo cáo AI, dự báo bảo trì. |
| EPIC-05 - Phân tích Không gian | 64 | 366 | Ra quyết định trên dữ liệu GIS: heatmap, đo đạc, vùng đệm, thống kê hành chính, tối ưu tuyến. |

Câu trả lời mẫu khi bị hỏi "tại sao 500 story":

> 500 story là cách nhóm phân rã phạm vi để estimate, kiểm soát scope và tính Function Point, không phải 500 màn hình hay 500 task code. Nhóm gom chúng theo 5 epic/capability lớn để PM ưu tiên, dev triển khai, tester nghiệm thu và stakeholder hiểu giá trị nghiệp vụ.

## 3. Khung trả lời user story

Format chuẩn:

> Là [actor], tôi muốn [capability], để [business value].

Một user story tốt nên kiểm tra theo INVEST:

- Independent: có thể triển khai/kiểm thử tương đối độc lập.
- Negotiable: là lời hứa trao đổi, không phải đặc tả kỹ thuật đóng cứng.
- Valuable: có giá trị rõ cho actor hoặc tổ chức.
- Estimable: đủ rõ để ước lượng.
- Small: đủ nhỏ để đưa vào sprint.
- Testable: có thể viết acceptance criteria và kiểm thử.

Điểm yếu cần chủ động thừa nhận:

> Backlog hiện có nhiều story đúng format, có actor, loại FP, độ phức tạp và điểm FP. Tuy nhiên nếu đưa vào sprint planning chuẩn thì còn thiếu acceptance criteria, priority, sprint/release, dependency và business value score.

Cách bảo vệ:

> File hiện tại là product backlog nền để mô tả phạm vi và tính FP. Ở bước sprint planning, nhóm sẽ bổ sung acceptance criteria dạng Given/When/Then, DoD, priority theo MoSCoW hoặc RICE, dependency và owner.

## 4. Story đại diện để luyện

### EPIC-01 - Bản đồ

Story: EP01-046

> Là người dùng, tôi muốn tải dữ liệu tài sản theo khu vực đang xem để tăng tốc hiển thị.

Ý nghĩa PM: đây là story hiệu năng/trải nghiệm, không chỉ là kỹ thuật lazy loading. Nó giúp bản đồ vẫn dùng được khi dữ liệu lớn.

Acceptance criteria mẫu:

- Given người dùng đang xem bản đồ ở một bounding box cụ thể, When bản đồ tải lớp tài sản, Then hệ thống chỉ lấy tài sản trong khu vực đang xem.
- Given người dùng pan/zoom sang khu vực mới, When bbox thay đổi đáng kể, Then hệ thống gọi lại dữ liệu phù hợp.
- Given API lỗi, Then UI giữ bản đồ hoạt động và hiển thị trạng thái lỗi không làm mất phiên làm việc.

Module code liên quan: `map/assets`, `properties`, `MapWorkspace`, `useMapLayers`.

### EPIC-02 - Quản trị

Story: EP02-135

> Là Admin, tôi muốn áp dụng xác thực nhiều lớp cho tài khoản có quyền cao để tăng an toàn.

Ý nghĩa PM: đây là yêu cầu bảo mật cho tài khoản rủi ro cao, bám với đề xuất ATTT cấp 3 trong báo cáo. Nếu chưa triển khai đầy đủ MFA, cần nói đây là backlog nâng cao, không nói quá.

Acceptance criteria mẫu:

- Given tài khoản có vai trò Admin, When đăng nhập, Then hệ thống yêu cầu bước xác thực bổ sung.
- Given mã xác thực sai hoặc hết hạn, Then hệ thống từ chối phiên đăng nhập và ghi log.
- Given tài khoản thường, Then chính sách MFA áp dụng theo cấu hình role.

Module code liên quan: `auth`, `admin`, `rbac`, `audit-log`.

### EPIC-03 - Quản lý tài sản

Story: EP03-022

> Là Cán bộ quản lý, tôi muốn lưu giá trị tài sản và biến động giá trị theo thời gian để phục vụ quản lý đầu tư.

Ý nghĩa PM: đây là story quản trị vòng đời tài sản, phục vụ quyết định đầu tư/bảo trì. Không chỉ lưu một record tài sản mà cần lịch sử thay đổi.

Acceptance criteria mẫu:

- Given cán bộ cập nhật giá trị tài sản, When lưu, Then hệ thống lưu giá trị mới và mốc thời gian.
- Given có nhiều lần cập nhật, When xem chi tiết tài sản, Then cán bộ xem được lịch sử biến động.
- Given người không đủ quyền, When truy cập dữ liệu tài chính tài sản, Then hệ thống từ chối.

Module code liên quan: `properties`, `map-assets`, `dashboard/assets`.

### EPIC-04 - AI/truy vấn thông minh

Story: EP04-025

> Là Cán bộ quản lý, tôi muốn giới hạn SQL chỉ đọc dữ liệu để bảo vệ cơ sở dữ liệu sản xuất.

Ý nghĩa PM: đây là story kiểm soát rủi ro khi dùng AI sinh truy vấn. PM phải chứng minh hiểu rằng AI không được phép tự do ghi/xóa dữ liệu.

Acceptance criteria mẫu:

- Given AI sinh SQL, When câu lệnh không phải truy vấn đọc, Then hệ thống chặn trước khi chạy.
- Given SQL đọc dữ liệu hợp lệ, When chạy, Then hệ thống trả kết quả kèm giới hạn số dòng.
- Given truy vấn bị chặn, Then hệ thống giải thích lý do và ghi audit log.

Module code liên quan: `groq`, `properties`, `poi/semantic-search`, `rbac`.

### EPIC-05 - Phân tích không gian

Story: EP05-010

> Là Cán bộ quản lý, tôi muốn kết hợp heatmap với ranh giới hành chính để phân tích sâu hơn theo khu vực.

Ý nghĩa PM: đây là story ra quyết định theo vùng, giúp trả lời câu hỏi "khu vực nào có mật độ tài sản/rủi ro cao?".

Acceptance criteria mẫu:

- Given cán bộ bật heatmap, When chọn quận/phường, Then heatmap được lọc hoặc overlay theo ranh giới đó.
- Given dữ liệu lớn, When tải heatmap, Then hệ thống phản hồi trong ngưỡng hiệu năng chấp nhận được.
- Given không có dữ liệu trong khu vực, Then UI hiển thị trạng thái rỗng rõ ràng.

Module code liên quan: `properties/heatmap`, `risk-zones`, `admin-boundaries`, `dashboard`.

## 5. Truy vết từ báo cáo sang backlog sang code

Traceability chain 1 - Quản lý tài sản:

- Pain point: dữ liệu tài sản phân tán, khó tra cứu.
- Báo cáo/use case: thêm/sửa/xóa tài sản, tìm kiếm/lọc tài sản, import/export dữ liệu.
- Epic/story: EPIC-03, các story về hồ sơ tài sản, CRUD, import/export, dashboard.
- Code: `properties`, `map-assets`, `AssetForm`, `AssetListTable`, `dashboard/assets`.
- Test cần có: tạo tài sản, sửa tài sản, xóa mềm, lọc theo khu vực/trạng thái, import lỗi định dạng.

Traceability chain 2 - Quản trị và an toàn:

- Pain point: hệ thống dùng trong tổ chức nhà nước cần phân quyền, log, phục hồi.
- Báo cáo/use case: quản lý người dùng và phân quyền, audit log, cấu hình, sao lưu.
- Epic/story: EPIC-02, user/role/permission/log/API key/backup.
- Code: `auth`, `admin`, `rbac`, `audit-log`, `notifications`.
- Test cần có: login/logout, gán role, chặn quyền sai, ghi log thao tác nhạy cảm.

Traceability chain 3 - AI/GIS hỗ trợ quyết định:

- Pain point: cần phân tích nhanh theo không gian, cảnh báo rủi ro, báo cáo.
- Báo cáo/use case: AI phân tích ảnh, dashboard, thống kê, báo cáo, phân tích không gian.
- Epic/story: EPIC-04 và EPIC-05.
- Code: `analyze`, `groq`, `poi`, `properties/heatmap`, `risk-zones`, `report`.
- Test cần có: truy vấn ngôn ngữ tự nhiên, heatmap theo vùng, risk overlay, timeout/error khi AI hoặc API ngoài lỗi.

## 6. 10 câu hỏi dễ bị hỏi vặn

### 1. Tại sao cần 500 user story?

500 story là decomposition để estimate và kiểm soát phạm vi. Nếu chỉ có vài yêu cầu lớn, nhóm khó tính FP, khó chia sprint, khó kiểm thử. Tuy nhiên 500 story không có nghĩa làm 500 màn hình; nhóm gom chúng theo 5 epic và module nghiệp vụ.

### 2. Epic khác gì user story?

Epic là capability lớn, thường chứa nhiều business outcome và cần chia nhỏ trước khi triển khai. User story là lát cắt nhỏ hơn, có actor, nhu cầu, giá trị và có thể viết acceptance criteria để nghiệm thu.

### 3. MVP của dự án là gì?

MVP gồm đăng nhập/RBAC cơ bản, bản đồ nền, hiển thị/lọc/tìm tài sản, CRUD tài sản, dashboard cơ bản, phản ánh sự cố và một luồng AI/GIS minh họa. Các phần như tối ưu tuyến, dự báo bảo trì, AI nâng cao hoặc MFA đầy đủ là giai đoạn sau nếu chưa đủ nguồn lực.

### 4. Acceptance criteria đâu?

CSV hiện chưa có cột acceptance criteria. Đây là điểm nhóm cần bổ sung khi chuyển từ product backlog tổng sang sprint backlog. Cách làm là mỗi story quan trọng sẽ có Given/When/Then, rule dữ liệu, phân quyền, trạng thái lỗi và điều kiện nghiệm thu.

### 5. AI có thay PM được không?

Không. AI có thể giúp sinh code, test, tài liệu và phân tích nhanh khi yêu cầu rõ. PM vẫn phải xác định đúng stakeholder, pain point, priority, scope, risk, acceptance criteria và trade-off.

### 6. Vì sao có Function Point trong backlog?

Function Point giúp ước lượng quy mô chức năng độc lập với ngôn ngữ lập trình. Trong báo cáo kinh tế kỹ thuật, FP hỗ trợ giải thích khối lượng phần mềm, độ phức tạp và cơ sở dự toán.

### 7. Làm sao chứng minh story có giá trị?

Mỗi story phải nối được với pain point hoặc outcome. Ví dụ tải tài sản theo khu vực đang xem giúp bản đồ nhanh hơn khi dữ liệu lớn; phân quyền giúp hệ thống vận hành trong môi trường nhiều vai trò; heatmap giúp cán bộ ra quyết định theo khu vực.

### 8. Nếu thầy nói backlog thiếu priority thì sao?

Thừa nhận đúng. File hiện là backlog nền để mô tả phạm vi và tính FP. Nếu làm sprint planning thật, nhóm sẽ thêm priority theo MoSCoW/RICE, dependency, release, owner và acceptance criteria.

### 9. Code hiện tại có khớp hoàn toàn với 500 story không?

Không nên nói khớp 100%. Cách trả lời tốt hơn: code hiện thực các capability lõi để demo và chứng minh kiến trúc, còn backlog rộng hơn để mô tả phạm vi sản phẩm và lộ trình. Một số story là nâng cao hoặc giai đoạn sau.

### 10. Tại sao không bắt đầu từ công nghệ?

Vì công nghệ là phương tiện. PM phải bắt đầu từ vấn đề: ai dùng, họ đau ở đâu, giá trị nào cần tạo, nghiệm thu bằng gì. Sau đó mới chọn WebGIS, PostGIS, AI, NestJS hay Next.js để hiện thực.

## 7. Checklist luyện trước buổi hỏi

- Nói được câu chuyện sản phẩm trong 3 phút, không sa vào stack kỹ thuật.
- Thuộc 5 epic, số story và FP của từng epic ở mức tương đối.
- Chọn được 1 story đại diện cho mỗi epic và nói được actor, value, acceptance criteria, module code, test.
- Nói được 3 traceability chain từ pain point đến code/test.
- Chuẩn bị sẵn câu thừa nhận điểm yếu backlog thiếu acceptance criteria/priority/dependency.
- Khi bị hỏi AI, luôn kéo về nguyên tắc: yêu cầu rõ trước, AI là accelerator sau.

