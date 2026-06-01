# GeoAI PM Viva Prep - Bản Cực Kì Chi Tiết

Tài liệu này dùng để ôn vấn đáp với thầy theo hướng Product/Project Management. Mục tiêu là nói như người hiểu bài toán và biết quản trị sản phẩm, không nói như người chỉ khoe stack hoặc "AI làm hết".

Nguyên tắc xuyên suốt:

- Bắt đầu từ vấn đề nghiệp vụ, không bắt đầu từ công nghệ.
- User story là công cụ giao tiếp giữa stakeholder, PM, dev, tester, không phải câu văn trang trí.
- Backlog 500 story là product backlog để phân rã phạm vi và tính Function Point, chưa phải sprint backlog hoàn chỉnh.
- AI là accelerator khi yêu cầu rõ; AI không thay PM trong việc xác định problem, scope, priority, risk và acceptance criteria.
- Code hiện tại chứng minh các capability lõi. Không nói quá rằng toàn bộ 500 story đã được hiện thực 100%.

## 1. Cách mở bài khi bị hỏi "em giới thiệu dự án đi"

### Bản 30 giây

> Dự án GeoAI giải quyết bài toán quản lý tài sản đô thị Đà Nẵng trên bản đồ. Hiện trạng là dữ liệu tài sản phân tán, khó tra cứu, thiếu bản đồ tập trung, phản ánh sự cố còn thủ công và thiếu công cụ phân tích hỗ trợ quyết định. Nhóm thiết kế sản phẩm theo 5 epic: bản đồ, quản trị hệ thống, quản lý tài sản, AI/truy vấn thông minh và phân tích không gian. AI chỉ là một phần hỗ trợ; trọng tâm PM của nhóm là phân rã đúng nghiệp vụ thành user story, use case, backlog và tiêu chí nghiệm thu.

### Bản 1 phút

> GeoAI là hệ thống WebGIS hỗ trợ quản lý tài sản đô thị tại Đà Nẵng. Nhóm xuất phát từ pain point: dữ liệu hạ tầng phân tán, cán bộ khó tra cứu theo không gian, thiếu dashboard/risk overlay, phản ánh công dân chưa minh bạch và báo cáo ra quyết định còn thủ công. Vì vậy nhóm chia sản phẩm thành 5 epic: bản đồ tương tác, quản trị hệ thống, quản lý tài sản, AI/truy vấn thông minh và phân tích không gian. Backlog hiện có 500 user story, tổng 2632 Function Points. Em không xem 500 story là 500 màn hình, mà là cách phân rã phạm vi để estimate, kiểm soát scope và nối từ yêu cầu trong báo cáo sang module code/test. Nếu chuyển sang sprint planning thật, nhóm sẽ bổ sung thêm acceptance criteria, priority, dependency và owner.

### Bản 3 phút

> Dự án GeoAI tập trung vào quản lý tài sản đô thị trên bản đồ cho bối cảnh Đà Nẵng. Bài toán không phải "dùng AI cho mới", mà là giải quyết một chuỗi vấn đề quản lý: dữ liệu tài sản nằm rải rác, khó thống nhất; cán bộ thiếu bản đồ tập trung để xem vị trí, trạng thái, rủi ro; phản ánh của công dân còn thủ công; báo cáo thống kê và phân tích không gian chưa đủ nhanh để hỗ trợ quyết định.
>
> Từ đó nhóm xác định stakeholder chính gồm Admin/Cán bộ CNTT, Cán bộ quản lý đô thị và Người dùng/Công dân. Admin cần quản lý người dùng, phân quyền, log, cấu hình và sao lưu. Cán bộ quản lý cần xem bản đồ, tìm tài sản, cập nhật hồ sơ, phân tích rủi ro, xem dashboard và báo cáo. Người dùng/Công dân cần xem thông tin công khai, tìm kiếm vị trí/tài sản và gửi phản ánh sự cố.
>
> Về backlog, nhóm phân rã thành 5 epic với 500 user story, tổng 2632 Function Points. EPIC-01 là bản đồ; EPIC-02 là quản trị hệ thống; EPIC-03 là quản lý tài sản; EPIC-04 là AI/truy vấn thông minh; EPIC-05 là phân tích không gian. Cách nhóm bảo vệ backlog là traceability: mỗi story phải nối được từ pain point hoặc use case trong báo cáo sang capability, API/UI tương ứng và test/acceptance criteria. Điểm nhóm chủ động thừa nhận là backlog CSV hiện là product backlog nền để mô tả phạm vi và tính FP, chưa phải sprint backlog đầy đủ vì thiếu cột priority, acceptance criteria và dependency.

## 2. Bản đồ tư duy stakeholder -> pain point -> outcome -> epic

| Stakeholder | Pain point | Outcome cần đạt | Epic liên quan | Cách nói khi bị hỏi |
|---|---|---|---|---|
| Admin/Cán bộ CNTT | Khó quản lý người dùng, role, permission, log, cấu hình, backup | Hệ thống vận hành an toàn, có kiểm soát, có audit trail | EPIC-02 | "Không có quản trị thì sản phẩm demo được nhưng không vận hành được trong tổ chức." |
| Cán bộ quản lý đô thị | Dữ liệu tài sản phân tán, khó tra cứu, khó cập nhật trên bản đồ | Quản lý tập trung hồ sơ tài sản, vị trí, trạng thái, lịch sử | EPIC-01, EPIC-03 | "Bản đồ là giao diện làm việc chính, tài sản là dữ liệu nghiệp vụ lõi." |
| Cán bộ quản lý/ra quyết định | Thiếu thống kê theo khu vực, thiếu phân tích rủi ro | Dashboard, heatmap, buffer, risk overlay, báo cáo | EPIC-03, EPIC-05 | "Giá trị không chỉ là lưu dữ liệu, mà là biến dữ liệu thành quyết định." |
| Người dùng/Công dân | Phản ánh sự cố thủ công, thiếu minh bạch trạng thái | Gửi phản ánh, theo dõi xử lý, nhận thông báo | EPIC-03, reports/notifications | "Cổng phản ánh giúp đóng vòng feedback giữa người dân và đơn vị quản lý." |
| Nhóm phát triển/tester | Yêu cầu lớn, dễ mơ hồ, khó nghiệm thu | User story nhỏ, có FP, actor, module, acceptance criteria | Tất cả epic | "Backlog giúp AI/dev/tester hiểu cùng một hành vi cần làm." |

## 3. Số liệu backlog cần nhớ

Tổng quan:

- 500 user story.
- 2632 Function Points.
- 5 epic.
- 3 actor trong CSV: Cán bộ quản lý 232 story, Admin 153 story, Người dùng 115 story.
- Loại FP: EI 195, EO 199, EQ 86, EIF 19, ILF 1.

Theo epic:

| Epic | Story | FP | Cách hiểu |
|---|---:|---:|---|
| EPIC-01 - Hiển thị & Tương tác Bản đồ | 135 | 669 | Lớp trải nghiệm chính: bản đồ nền, layer, tìm kiếm, lọc, hiển thị tài sản, xuất/chia sẻ. |
| EPIC-02 - Quản trị hệ thống | 136 | 682 | Lớp vận hành: user, role, permission, log, API key, cấu hình, backup. |
| EPIC-03 - Quản lý Tài sản | 85 | 465 | Lớp nghiệp vụ lõi: hồ sơ tài sản, CRUD, import/export, dashboard, bảo trì. |
| EPIC-04 - AI - Truy vấn thông minh | 80 | 450 | Lớp nâng cao: natural language query, SQL có kiểm soát, ảnh, báo cáo AI, dự báo. |
| EPIC-05 - Phân tích Không gian | 64 | 366 | Lớp phân tích GIS: heatmap, đo đạc, vùng đệm, thống kê hành chính, tuyến bảo trì. |

Câu trả lời mẫu:

> Em nhớ số tổng là 500 story và 2632 FP. Nhưng khi quản trị sản phẩm thì em không học rời từng story. Em học theo 5 capability lớn, rồi chọn một vài story đại diện cho từng epic để chứng minh traceability và tiêu chí nghiệm thu.

## 4. Giải thích user story cho đúng chất PM

### 4.1 User story là gì?

User story là mô tả ngắn gọn nhu cầu của người dùng theo cấu trúc:

> Là [actor], tôi muốn [capability], để [business value].

Điểm quan trọng là "để làm gì". Nếu thiếu business value, story dễ biến thành task kỹ thuật.

Ví dụ yếu:

> Là người dùng, tôi muốn có nút export.

Ví dụ tốt hơn:

> Là Cán bộ quản lý, tôi muốn xuất danh sách tài sản theo khu vực và trạng thái để gửi báo cáo định kỳ cho lãnh đạo.

### 4.2 INVEST

Nếu thầy hỏi "thế nào là user story tốt", trả lời theo INVEST:

- Independent: story không phụ thuộc quá chặt vào story khác.
- Negotiable: story còn có thể trao đổi, không khóa cứng implementation.
- Valuable: có giá trị rõ cho actor hoặc tổ chức.
- Estimable: đủ rõ để estimate.
- Small: đủ nhỏ để đưa vào sprint.
- Testable: có thể viết acceptance criteria.

Câu nói gọn:

> Một story tốt không chỉ đúng format "Là ai, muốn gì, để làm gì", mà còn phải test được. Nếu không test được thì khi giao cho AI hay dev cũng rất dễ sinh ra code đúng cú pháp nhưng sai ý.

### 4.3 User story khác use case thế nào?

| Khía cạnh | User story | Use case |
|---|---|---|
| Mục đích | Giao tiếp nhu cầu và giá trị | Mô tả luồng tương tác chi tiết |
| Độ dài | Ngắn | Dài hơn, có main flow/alternate flow |
| Dùng khi | Backlog, planning, prioritization | Phân tích nghiệp vụ, thiết kế, test scenario |
| Ví dụ | "Là Cán bộ quản lý, tôi muốn lọc tài sản theo quận..." | Actor chọn quận, hệ thống truy vấn, hiển thị kết quả, xử lý lỗi không có dữ liệu |

Câu trả lời:

> User story giúp chia nhỏ và ưu tiên backlog. Use case giúp mô tả luồng nghiệp vụ chi tiết hơn để thiết kế và test. Hai cái không thay nhau, mà bổ sung cho nhau.

## 5. Giải thích Function Point đủ để bảo vệ

Function Point là cách ước lượng quy mô chức năng từ góc nhìn người dùng, không phụ thuộc việc code bằng Next.js, NestJS hay Python. Trong báo cáo kinh tế kỹ thuật, FP giúp giải thích khối lượng phần mềm và cơ sở dự toán.

Các loại trong backlog:

| Loại | Nghĩa thực dụng | Ví dụ trong GeoAI | Cách giải thích |
|---|---|---|---|
| EI - External Input | Dữ liệu đi vào hệ thống | Thêm tài sản, cập nhật quyền, gửi phản ánh | "Người dùng nhập hoặc thay đổi dữ liệu." |
| EO - External Output | Hệ thống sinh dữ liệu đầu ra có xử lý | Dashboard, báo cáo, log, thống kê | "Hệ thống tính toán/tổng hợp rồi xuất kết quả." |
| EQ - External Inquiry | Truy vấn/xem dữ liệu, xử lý ít | Xem bản đồ, tìm kiếm, xem danh sách | "Người dùng hỏi, hệ thống trả dữ liệu." |
| ILF - Internal Logical File | Nhóm dữ liệu nội bộ hệ thống quản lý | Hồ sơ tài sản/giá trị tài sản | "Dữ liệu lõi do hệ thống sở hữu." |
| EIF - External Interface File | Dữ liệu/kết nối ngoài hệ thống dùng tham chiếu | Overture, tile map, kho backup ngoài, nguồn ranh giới | "Hệ thống dùng dữ liệu ngoài hoặc tích hợp ngoài." |

Nếu bị hỏi "vì sao có FP cao/thấp":

> FP phụ thuộc loại giao dịch và độ phức tạp. Một story chỉ xem dữ liệu thường thấp hơn một story tích hợp nguồn ngoài, xử lý dữ liệu lớn hoặc có yêu cầu bảo mật/phục hồi. Ví dụ cache bản đồ nền hoặc backup ra kho ngoài phức tạp hơn xem bản đồ mặc định.

Điểm cần tránh:

- Không nói FP là số ngày công trực tiếp.
- Không nói FP thay thế hoàn toàn estimate sprint.
- Không nói FP chứng minh code đã hoàn thành.

## 6. Phân tích 5 epic theo hướng thầy dễ hỏi

### 6.1 EPIC-01 - Hiển thị & Tương tác Bản đồ

Giá trị nghiệp vụ:

- Đây là "workspace" chính của sản phẩm.
- Cán bộ không chỉ xem danh sách tài sản, mà làm việc theo vị trí, lớp dữ liệu, vùng địa lý.
- Bản đồ tốt giúp giảm thời gian tra cứu và tăng khả năng phát hiện vấn đề theo không gian.

Actor chính:

- Người dùng.
- Cán bộ quản lý đô thị.

Module liên quan:

- Bản đồ nền.
- Quản lý lớp dữ liệu.
- Hiển thị tài sản trên bản đồ.
- Tìm kiếm/lọc.
- Đo đạc, xuất/chia sẻ.

MVP:

- Xem bản đồ nền.
- Zoom/pan.
- Bật/tắt lớp cơ bản.
- Hiển thị tài sản theo bbox.
- Tìm kiếm/lọc tài sản.

Nâng cao:

- Cache tile.
- Fallback nguồn bản đồ.
- Ghi nhớ cấu hình theo người dùng/đơn vị.
- Xuất/chia sẻ bản đồ.

Câu hỏi dễ bị hỏi:

- "Bản đồ khác gì Google Maps?"
- "Tại sao cần layer?"
- "Nếu dữ liệu 100.000 điểm thì xử lý thế nào?"

Câu trả lời mẫu:

> Google Maps chủ yếu là bản đồ nền. GeoAI dùng bản đồ như giao diện nghiệp vụ: hiển thị tài sản, ranh giới, rủi ro, heatmap, kết quả tìm kiếm và thao tác quản lý. Vì vậy layer, bbox loading, filter và quyền truy cập lớp dữ liệu là yêu cầu sản phẩm chứ không chỉ là UI.

### 6.2 EPIC-02 - Quản trị hệ thống

Giá trị nghiệp vụ:

- Một hệ thống dùng trong tổ chức nhà nước không thể chỉ có màn hình đẹp.
- Phải có người dùng, vai trò, quyền, log, backup, cấu hình, API key.
- Đây là phần giúp hệ thống vận hành và kiểm soát rủi ro.

Actor chính:

- Admin/Cán bộ CNTT.
- Cán bộ quản lý với quyền phụ.

Module liên quan:

- Auth.
- Admin user/role/permission.
- RBAC.
- Audit log.
- API key/config.
- Backup.

MVP:

- Đăng nhập/đăng xuất.
- Role cơ bản.
- Permission guard.
- Quản lý user/role.
- Audit log cho thao tác nhạy cảm.

Nâng cao:

- MFA.
- Backup ngoài hệ thống.
- API key lifecycle đầy đủ.
- Chính sách bảo mật nâng cao.

Câu hỏi dễ bị hỏi:

- "Tại sao quản trị hệ thống có nhiều story nhất?"
- "MFA đã làm chưa?"
- "Nếu chưa làm MFA thì sao lại ghi trong backlog?"

Câu trả lời mẫu:

> Quản trị có nhiều story vì nó không tạo ra một màn hình duy nhất, mà bao gồm nhiều năng lực vận hành: user, role, permission, log, cấu hình, API key, backup, bảo mật. Với MFA, nếu chưa triển khai đầy đủ thì em sẽ nói rõ đây là backlog nâng cao/giai đoạn sau, còn MVP hiện tập trung vào auth, RBAC và audit log.

### 6.3 EPIC-03 - Quản lý Tài sản

Giá trị nghiệp vụ:

- Đây là lõi dữ liệu của hệ thống.
- Nếu không quản lý tài sản tốt, bản đồ và AI chỉ là lớp trình diễn.
- Tài sản cần có vị trí, thuộc tính, trạng thái, nguồn dữ liệu, lịch sử và liên kết báo cáo/bảo trì.

Actor chính:

- Cán bộ quản lý đô thị.
- Admin hỗ trợ cấu hình/import/export.

Module liên quan:

- Properties.
- Map assets.
- Asset form/list/detail.
- Import/export.
- Dashboard assets.
- Maintenance/report liên quan.

MVP:

- CRUD tài sản.
- Hiển thị trên bản đồ.
- Tìm kiếm/lọc.
- Import/export cơ bản.
- Dashboard tổng quan.

Nâng cao:

- Lịch sử giá trị tài sản.
- Liên kết hợp đồng/nhà cung cấp.
- Lịch bảo trì định kỳ.
- Dự báo bảo trì.

Câu trả lời mẫu:

> EPIC-03 là nơi sản phẩm tạo ra giá trị nghiệp vụ trực tiếp. Bản đồ giúp nhìn, nhưng tài sản mới là đối tượng quản lý. Vì vậy nhóm ưu tiên CRUD, search/filter, import/export và dashboard trước; các phần như lịch sử giá trị, hợp đồng, bảo trì nâng cao có thể đi sau.

### 6.4 EPIC-04 - AI - Truy vấn thông minh

Giá trị nghiệp vụ:

- AI giúp giảm rào cản truy vấn dữ liệu không gian.
- Cán bộ có thể hỏi bằng tiếng Việt thay vì tự viết SQL/GIS query.
- AI có thể hỗ trợ phân tích ảnh, sinh báo cáo, gợi ý bảo trì, nhưng phải có kiểm soát.

Actor chính:

- Cán bộ quản lý.
- Dịch vụ AI/LLM là tác nhân phụ.

Module liên quan:

- Analyze.
- Groq/LLM service.
- POI semantic search.
- Properties search.
- SQL guard/readonly policy.
- Reports.

MVP:

- Một luồng truy vấn thông minh minh họa.
- Tìm kiếm ngữ nghĩa/POI.
- AI analyze có kiểm soát.

Nâng cao:

- Sinh SQL có kiểm duyệt.
- Nhận dạng ảnh.
- Sinh báo cáo AI.
- Dự báo bảo trì.

Câu hỏi dễ bị hỏi:

- "AI có thật sự cần không?"
- "AI sai thì sao?"
- "AI có được chạy SQL trực tiếp không?"

Câu trả lời mẫu:

> AI không được đứng một mình. AI chỉ có giá trị khi bám vào workflow: cán bộ cần hỏi dữ liệu nhanh hơn hoặc phân tích nhanh hơn. Nếu AI sinh SQL thì phải có guardrail: chỉ đọc, giới hạn dữ liệu, kiểm quyền, log, và fallback khi AI lỗi. PM phải định nghĩa ranh giới này trước khi giao AI hoặc dev code.

### 6.5 EPIC-05 - Phân tích Không gian

Giá trị nghiệp vụ:

- Dữ liệu đô thị có bản chất không gian.
- Quyết định quản lý thường là theo vùng: quận, phường, bán kính, tuyến đường, vùng rủi ro.
- Heatmap, buffer, đo đạc, thống kê hành chính giúp chuyển dữ liệu thành quyết định.

Actor chính:

- Cán bộ quản lý.
- Cán bộ ra quyết định.

Module liên quan:

- Properties heatmap.
- Risk zones.
- Admin boundaries.
- Measurement.
- Spatial draw.
- Dashboard/report.

MVP:

- Heatmap.
- Risk overlay.
- Thống kê theo khu vực.
- Đo khoảng cách/diện tích cơ bản.

Nâng cao:

- Buffer analysis.
- Route optimization.
- Phân tích giao cắt lớp dữ liệu.
- Kịch bản quy hoạch/bảo trì nâng cao.

Câu trả lời mẫu:

> Phân tích không gian là phần làm GeoAI khác một hệ thống CRUD thông thường. Ví dụ không chỉ biết có bao nhiêu tài sản, mà biết tài sản tập trung ở đâu, khu nào rủi ro cao, trong bán kính bao nhiêu mét có tiện ích gì, và tuyến bảo trì nào hợp lý.

## 7. 15 user story đại diện để luyện sâu

### Story 1 - Bản đồ mặc định

Backlog: EP01-001

> Là người dùng, tôi muốn xem bản đồ nền mặc định khi đăng nhập để bắt đầu làm việc ngay.

Actor/value:

- Actor: Người dùng.
- Value: giảm friction sau đăng nhập, đưa người dùng vào workspace chính.

Acceptance criteria:

- Given người dùng đăng nhập thành công, When vào trang chính, Then hệ thống hiển thị bản đồ nền mặc định.
- Given lớp nền mặc định lỗi, When tải bản đồ, Then hệ thống thông báo lỗi và dùng lớp nền fallback nếu có.
- Given người dùng chưa đăng nhập nếu hệ thống yêu cầu auth, When truy cập trang bản đồ, Then chuyển về login.

Dữ liệu liên quan:

- Cấu hình lớp nền.
- User session.
- Tile source.

Module code liên quan:

- `app/page.js`.
- `MapWorkspace`.
- `MapWrapper`.
- `map/layers`.

Test/điều kiện nghiệm thu:

- Vào trang chính thấy map render.
- Không có màn hình trắng khi tile lỗi.
- Auth flow không bypass.

Nếu thầy hỏi "đã làm chưa":

> Đây là capability lõi đã có trong phần web/map. Tuy nhiên các phần nâng cao như fallback nhiều nguồn tile hoặc cấu hình theo đơn vị có thể là backlog tiếp theo.

### Story 2 - Chuyển lớp bản đồ nền

Backlog: EP01-002

> Là người dùng, tôi muốn chuyển đổi giữa OSM, vệ tinh và địa hình để lựa chọn nền phù hợp với ngữ cảnh.

Actor/value:

- Actor: Người dùng/Cán bộ quản lý.
- Value: mỗi loại nền phù hợp một tác vụ: OSM để đọc đường, vệ tinh để kiểm tra hình ảnh thực địa, địa hình để hiểu bối cảnh.

Acceptance criteria:

- Given có nhiều lớp nền, When người dùng chọn lớp khác, Then bản đồ đổi lớp mà không mất vị trí hiện tại.
- Given lớp được chọn không khả dụng, Then hệ thống giữ lớp cũ hoặc chuyển fallback.
- Given người dùng đã chọn lớp nền, Then hệ thống có thể ghi nhớ tùy chọn nếu story lưu cấu hình được bật.

Dữ liệu liên quan:

- Danh sách layer.
- User layer config.

Module code liên quan:

- `map/layers`.
- `LayerPanel`.
- `MapStateContext`.

Test:

- Chuyển layer không reload toàn page.
- Không mất zoom/center.
- Trạng thái layer hiển thị đúng.

### Story 3 - Tải tài sản theo khu vực đang xem

Backlog: EP01-046

> Là người dùng, tôi muốn tải dữ liệu tài sản theo khu vực đang xem để tăng tốc hiển thị.

Actor/value:

- Actor: Người dùng.
- Value: đảm bảo bản đồ dùng được khi dữ liệu lớn, tránh tải toàn bộ tài sản.

Acceptance criteria:

- Given bản đồ có bbox hiện tại, When tải tài sản, Then API chỉ trả tài sản trong bbox.
- Given người dùng pan/zoom, When bbox thay đổi đáng kể, Then hệ thống tải lại dữ liệu phù hợp.
- Given API trả lỗi, Then UI giữ trạng thái bản đồ và thông báo lỗi hợp lý.

Dữ liệu liên quan:

- `BuildingProperty`.
- bbox/geometry.
- status/source.

Module code liên quan:

- `map/assets`.
- `properties`.
- `useMapLayers`.

Test:

- Query có bbox.
- Không gọi quá nhiều request khi pan nhẹ.
- Bản đồ không treo khi dữ liệu lớn.

Nếu bị hỏi "sao story này FP cao":

> Vì nó liên quan hiệu năng, dữ liệu không gian, API theo bbox và trạng thái UI. Đây không chỉ là một nút bấm.

### Story 4 - Quản lý người dùng và phân quyền

Nguồn báo cáo: Use case "Quản lý người dùng và phân quyền".

Story đại diện:

> Là Admin, tôi muốn gán vai trò cho người dùng để kiểm soát chức năng họ được phép sử dụng.

Actor/value:

- Actor: Admin.
- Value: bảo vệ dữ liệu và phù hợp phân công trong tổ chức.

Acceptance criteria:

- Given Admin mở danh sách người dùng, When chọn một user, Then thấy role hiện tại.
- Given Admin cập nhật role hợp lệ, When lưu, Then quyền của user thay đổi theo role.
- Given user không có quyền admin, When gọi API đổi role, Then hệ thống từ chối.
- Given role thay đổi, Then thao tác được ghi audit log.

Dữ liệu liên quan:

- `User`.
- `Role`.
- `Permission`.
- `UserRole`.
- `RolePermission`.
- `AuditLog`.

Module code liên quan:

- `auth`.
- `admin`.
- `rbac`.
- `audit-log`.

Test:

- Admin gán role thành công.
- Non-admin bị chặn.
- Permission guard hoạt động.
- Audit log có record.

### Story 5 - MFA cho tài khoản quyền cao

Backlog: EP02-135

> Là Admin, tôi muốn áp dụng xác thực nhiều lớp cho tài khoản có quyền cao để tăng an toàn.

Actor/value:

- Actor: Admin/Cán bộ CNTT.
- Value: giảm rủi ro khi tài khoản đặc quyền bị lộ mật khẩu.

Acceptance criteria:

- Given tài khoản có role đặc quyền, When đăng nhập, Then hệ thống yêu cầu bước xác thực bổ sung.
- Given mã xác thực sai/hết hạn, Then hệ thống từ chối phiên đăng nhập.
- Given đăng nhập thất bại nhiều lần, Then hệ thống ghi log và có thể cảnh báo.

Dữ liệu liên quan:

- User role.
- Session.
- Auth event/audit log.

Module code liên quan:

- `auth`.
- `admin`.
- `rbac`.

Nếu bị hỏi "đã làm chưa":

> Em sẽ không nói quá. MVP hiện có auth/RBAC/audit làm nền. MFA là story bảo mật nâng cao trong backlog, hợp lý với định hướng ATTT cấp 3 nhưng cần triển khai thêm nếu đưa vào release chính thức.

### Story 6 - Xem nhật ký kiểm toán

Nguồn báo cáo: Use case "Xem nhật ký và kiểm toán".

Story đại diện:

> Là Admin, tôi muốn xem nhật ký thao tác theo người dùng, thời gian và loại hành động để phục vụ kiểm tra vận hành.

Acceptance criteria:

- Given Admin vào trang audit log, When lọc theo user/action/time, Then hệ thống trả danh sách phù hợp.
- Given log có metadata, When mở chi tiết, Then hiển thị đối tượng bị tác động.
- Given người không đủ quyền, Then không xem được audit log.

Dữ liệu liên quan:

- `AuditLog`.
- User/action/entity.

Module code liên quan:

- `admin/audit-logs`.
- `audit-log.service`.

Test:

- Filter đúng.
- Permission đúng.
- Không lộ dữ liệu nhạy cảm trong metadata.

### Story 7 - Thêm tài sản mới trên bản đồ

Nguồn báo cáo: Use case 6.

> Là Cán bộ quản lý đô thị, tôi muốn thêm tài sản mới trên bản đồ để cập nhật dữ liệu hạ tầng phát sinh.

Actor/value:

- Actor: Cán bộ quản lý đô thị.
- Value: biến khảo sát/thực địa thành dữ liệu quản lý tập trung.

Acceptance criteria:

- Given cán bộ có quyền, When chọn vị trí và nhập thông tin bắt buộc, Then hệ thống tạo tài sản mới.
- Given tọa độ không hợp lệ hoặc thiếu trường bắt buộc, Then hệ thống báo lỗi trước khi lưu.
- Given tạo thành công, Then tài sản xuất hiện trên bản đồ và danh sách.
- Given tạo mới, Then hệ thống ghi thời gian tạo/nguồn dữ liệu.

Dữ liệu liên quan:

- `BuildingProperty`.
- geometry/centroid.
- district/ward/status/source.

Module code liên quan:

- `properties`.
- `AssetForm`.
- `MiniMapPicker`.
- `map/assets`.

Test:

- Tạo thành công.
- Validate lỗi.
- Asset xuất hiện ở map/list.
- Non-authorized user bị chặn.

### Story 8 - Chỉnh sửa thông tin tài sản

Nguồn báo cáo: Use case 7.

> Là Cán bộ quản lý đô thị, tôi muốn chỉnh sửa thông tin tài sản để dữ liệu luôn phản ánh hiện trạng mới nhất.

Acceptance criteria:

- Given tài sản tồn tại, When cán bộ chỉnh sửa thuộc tính hợp lệ, Then hệ thống lưu và cập nhật `updatedAt`.
- Given thay đổi vị trí/hình học, Then bản đồ hiển thị vị trí mới.
- Given dữ liệu không hợp lệ, Then hệ thống không lưu và hiển thị lỗi.
- Given thao tác sửa, Then nếu có audit/versioning thì ghi lại lịch sử thay đổi.

Dữ liệu liên quan:

- BuildingProperty.
- geometry/bbox.
- status.

Module code liên quan:

- `properties`.
- `AssetForm`.
- `AssetDetailPanel`.

Nếu bị hỏi "vì sao cần lịch sử":

> Với tài sản công, lịch sử thay đổi giúp truy vết trách nhiệm và kiểm tra dữ liệu khi có sai lệch.

### Story 9 - Import tài sản hàng loạt

Nguồn báo cáo: Use case 10.

> Là Admin/Cán bộ quản lý, tôi muốn import dữ liệu tài sản hàng loạt để khởi tạo hoặc cập nhật dữ liệu nhanh hơn nhập tay.

Acceptance criteria:

- Given file đúng định dạng, When import, Then hệ thống tạo/cập nhật các bản ghi hợp lệ.
- Given file có dòng lỗi, Then hệ thống báo rõ dòng lỗi và không làm hỏng dữ liệu đã có.
- Given có trùng mã tài sản, Then hệ thống xử lý theo chính sách update/skip đã định nghĩa.
- Given import xong, Then có báo cáo số dòng thành công/thất bại.

Dữ liệu liên quan:

- BuildingProperty.
- source/sourceVersion.
- geometry.

Module code liên quan:

- `properties/import`.
- `AssetImportClient`.
- scripts import Overture/assets.

Test:

- File hợp lệ.
- File thiếu cột.
- Geometry lỗi.
- Duplicate code.

### Story 10 - Dashboard tổng quan tài sản

Nguồn báo cáo: Use case 20.

> Là Cán bộ quản lý, tôi muốn xem dashboard tổng quan theo khu vực, loại tài sản và mức rủi ro để nắm tình hình nhanh.

Acceptance criteria:

- Given cán bộ vào dashboard, Then thấy tổng số tài sản, phân bố theo khu vực/trạng thái/rủi ro.
- Given chọn filter quận/phường, Then chỉ số và biểu đồ cập nhật theo filter.
- Given không có dữ liệu, Then hiển thị empty state rõ ràng.
- Given người không có quyền, Then không xem dữ liệu quản trị.

Dữ liệu liên quan:

- BuildingProperty.
- Risk flags.
- District/ward.

Module code liên quan:

- `dashboard/assets`.
- `DashboardClient`.
- `DashboardCharts`.

Test:

- Summary đúng theo filter.
- Loading/error state.
- Permission.

### Story 11 - Gửi phản ánh sự cố

Nguồn báo cáo: Use case 18.

> Là Công dân, tôi muốn gửi phản ánh sự cố hạ tầng kèm vị trí và ảnh để đơn vị quản lý tiếp nhận xử lý.

Acceptance criteria:

- Given người dùng nhập nội dung, vị trí và ảnh hợp lệ, When gửi phản ánh, Then hệ thống tạo report ở trạng thái `PENDING`.
- Given thiếu vị trí hoặc nội dung, Then hệ thống yêu cầu bổ sung.
- Given ảnh upload thành công, Then report lưu URL ảnh.
- Given report được tạo, Then cán bộ/đơn vị liên quan nhận thông báo nếu policy có.

Dữ liệu liên quan:

- `Report`.
- `Notification`.
- image/object storage.
- latitude/longitude.

Module code liên quan:

- `reports`.
- `notifications`.
- `upload`.
- `ReportToolPanel`.

Test:

- Submit report.
- Upload image.
- Update status receive/respond/resolve.
- Notification unread/read.

### Story 12 - Truy vấn ngôn ngữ tự nhiên

Backlog: EPIC-04, module "Truy vấn ngôn ngữ tự nhiên".

> Là Cán bộ quản lý, tôi muốn hỏi hệ thống bằng tiếng Việt để tìm tài sản/địa điểm theo điều kiện không gian mà không phải viết truy vấn kỹ thuật.

Acceptance criteria:

- Given câu hỏi tiếng Việt hợp lệ, When gửi truy vấn, Then hệ thống nhận diện intent và trả kết quả phù hợp.
- Given câu hỏi mơ hồ, Then hệ thống hỏi lại hoặc trả lỗi giải thích được.
- Given dịch vụ AI lỗi/timeout, Then UI không treo và có fallback.
- Given kết quả trả về, Then có thể hiển thị trên bản đồ hoặc danh sách.

Dữ liệu liên quan:

- BuildingProperty.
- Place.
- embedding/searchText.
- district/ward/category.

Module code liên quan:

- `groq`.
- `poi/semantic-search`.
- `properties/search`.
- `MapSearchContext`.

Nếu bị hỏi "AI có đáng tin không":

> AI không được dùng như nguồn chân lý tuyệt đối. Nó là lớp diễn giải intent. Kết quả vẫn phải truy xuất từ database có kiểm soát, có giới hạn và có UI cho người dùng kiểm tra.

### Story 13 - SQL chỉ đọc

Backlog: EP04-025

> Là Cán bộ quản lý, tôi muốn giới hạn SQL chỉ đọc dữ liệu để bảo vệ cơ sở dữ liệu sản xuất.

Acceptance criteria:

- Given AI sinh SQL, When SQL chứa `INSERT`, `UPDATE`, `DELETE`, `DROP` hoặc thao tác ghi, Then hệ thống chặn.
- Given SQL đọc hợp lệ, Then hệ thống chạy với limit và quyền phù hợp.
- Given SQL bị chặn, Then ghi audit log và trả thông báo dễ hiểu.

Dữ liệu liên quan:

- Query intent.
- Audit log.
- Permission.

Module code liên quan:

- `groq`.
- `properties`.
- `rbac`.

Điểm PM:

> Story này chứng minh nhóm không "cuồng AI". Nhóm hiểu AI phải có guardrail.

### Story 14 - Heatmap theo ranh giới hành chính

Backlog: EP05-010

> Là Cán bộ quản lý, tôi muốn kết hợp heatmap với ranh giới hành chính để phân tích sâu hơn theo khu vực.

Acceptance criteria:

- Given có lớp ranh giới quận/phường, When bật heatmap, Then hệ thống overlay heatmap đúng vùng.
- Given chọn một khu vực hành chính, Then heatmap/filter chỉ hiển thị dữ liệu liên quan.
- Given dữ liệu quá nhiều, Then hệ thống sampling/grid hoặc API tối ưu để không làm treo bản đồ.

Dữ liệu liên quan:

- BuildingProperty centroid.
- Admin boundaries.
- Heatmap grid.

Module code liên quan:

- `properties/heatmap`.
- `admin-boundaries`.
- `risk-zones`.
- `MapStateContext`.

Test:

- Heatmap đúng filter.
- Empty state.
- Performance.

### Story 15 - Risk overlay

Nguồn báo cáo: Risk Assessment.

> Là Cán bộ quản lý, tôi muốn xem tài sản giao với vùng rủi ro ngập lụt/sạt lở để ưu tiên kiểm tra và bảo trì.

Acceptance criteria:

- Given có lớp `RiskZone`, When bật overlay, Then bản đồ hiển thị vùng rủi ro theo mức high/medium/low.
- Given tài sản nằm trong vùng rủi ro, Then hệ thống gắn cờ hoặc hiển thị cảnh báo.
- Given filter theo risk level, Then chỉ hiển thị tài sản/vùng phù hợp.

Dữ liệu liên quan:

- `RiskZone`.
- `BuildingProperty.riskFlags`.
- geometry.

Module code liên quan:

- `risk-zones`.
- `properties`.
- `AssetDetailPanel`.
- `dashboard`.

Test:

- Risk zones render.
- Asset có risk flag.
- Filter theo risk level.

## 8. Traceability matrix: report -> backlog -> code -> test

| Báo cáo/use case | Backlog/epic | Code module | Test/nghiệm thu |
|---|---|---|---|
| Quản lý người dùng và phân quyền | EPIC-02 | `auth`, `admin`, `rbac` | Login, gán role, permission guard, audit log |
| Cấu hình hệ thống và bản đồ | EPIC-01, EPIC-02 | `map/layers`, `map/assets` | Lưu config, bật/tắt layer, export config |
| Xem nhật ký và kiểm toán | EPIC-02 | `admin/audit-logs` | Filter log, permission, metadata |
| Thêm tài sản mới trên bản đồ | EPIC-03 | `properties`, `AssetForm`, `map/assets` | Create asset, validate geometry, map update |
| Chỉnh sửa thông tin tài sản | EPIC-03 | `properties`, `AssetDetailPanel` | Patch asset, validate, updatedAt |
| Xóa tài sản | EPIC-03 | `properties` | Soft delete/status, permission, map removal |
| Tìm kiếm và lọc tài sản | EPIC-01, EPIC-03 | `properties/search`, `MapSearchContext` | Query/filter, bbox, empty/error state |
| Import dữ liệu tài sản | EPIC-03 | `properties/import`, scripts | Valid file, invalid row, duplicate |
| Xuất dữ liệu tài sản | EPIC-01, EPIC-03 | `map/assets/export`, `properties` | Export by filter, auth, format |
| AI phân tích ảnh/tài sản | EPIC-04 | `analyze`, `geoai_backend.py` | Valid scan, timeout, result overlay |
| Tạo/cập nhật bảo trì | EPIC-03, EPIC-04 | Backlog/nâng cao | Nếu chưa code, nói là roadmap |
| Gửi phản ánh sự cố | EPIC-03 | `reports`, `upload`, `notifications` | Create report, upload image, status flow |
| Dashboard tổng quan | EPIC-03, EPIC-05 | `dashboard/assets` | Summary, filter, chart, permission |
| Báo cáo thống kê | EPIC-03, EPIC-04 | `report` | List/export/respond if applicable |
| Heatmap/risk/spatial analysis | EPIC-05 | `properties/heatmap`, `risk-zones` | Overlay, filter, performance |

Câu nói khi bị hỏi "traceability là gì":

> Traceability là khả năng lần ngược từ yêu cầu nghiệp vụ sang backlog, thiết kế, code và test. Nếu một story không trace được về pain point hoặc use case, thì nó dễ là scope thừa.

## 9. Câu trả lời cứu nguy cho các điểm yếu

### 9.1 Thiếu acceptance criteria

Không nên chống chế. Nói:

> Đúng, CSV hiện chưa có cột acceptance criteria. Em xem đây là product backlog nền để mô tả phạm vi và tính FP. Khi vào sprint planning, mỗi story quan trọng phải có Given/When/Then, rule dữ liệu, phân quyền, trạng thái lỗi và điều kiện nghiệm thu.

Nếu thầy hỏi "vậy story chưa tốt à?":

> Story hiện đúng hướng về actor và value, nhưng chưa đủ để giao sprint một cách chuẩn. Điểm cải tiến rõ nhất là bổ sung acceptance criteria và priority.

### 9.2 Thiếu priority

Nói:

> Backlog hiện chưa có priority nên chưa thể dùng trực tiếp để plan sprint. Nếu làm tiếp, nhóm sẽ thêm MoSCoW hoặc RICE. MVP sẽ ưu tiên auth/RBAC, bản đồ, CRUD tài sản, search/filter, dashboard cơ bản, phản ánh và một luồng AI/GIS minh họa.

### 9.3 Code chưa khớp 100% backlog

Nói:

> Em không khẳng định code đã hoàn thành 500 story. Code hiện chứng minh các capability lõi và kiến trúc. Backlog rộng hơn để mô tả phạm vi sản phẩm và roadmap. Một số story như MFA đầy đủ, dự báo bảo trì, tối ưu tuyến là nâng cao/giai đoạn sau.

### 9.4 AI bị phóng đại

Nói:

> Vai trò AI trong dự án là hỗ trợ truy vấn, phân tích và tăng tốc xử lý. PM vẫn phải xác định đúng bài toán, dữ liệu, tiêu chí nghiệm thu và rủi ro. Nếu yêu cầu mơ hồ thì AI càng dễ sinh kết quả sai.

### 9.5 MFA/security chưa hoàn chỉnh

Nói:

> MVP hiện tập trung vào auth, RBAC và audit log. MFA là yêu cầu bảo mật nâng cao, phù hợp với định hướng ATTT cấp 3 nhưng cần đưa vào release tiếp theo hoặc scope triển khai chính thức.

### 9.6 Dữ liệu thật và dữ liệu demo

Nói:

> Hệ thống dùng dữ liệu Overture/OSM và dữ liệu địa phương ở mức demo/phân tích. Khi triển khai thật cần quy trình kiểm định dữ liệu, owner dữ liệu, lịch đồng bộ, và cơ chế cán bộ xác nhận trước khi dùng cho quyết định chính thức.

## 10. 40 câu hỏi khó và câu trả lời mẫu

### 1. Dự án này giải quyết vấn đề gì?

Giải quyết việc quản lý tài sản đô thị còn phân tán, khó tra cứu theo vị trí, thiếu bản đồ tập trung, thiếu phân tích rủi ro và phản ánh công dân chưa minh bạch.

### 2. Ai là người dùng chính?

Ba nhóm: Admin/Cán bộ CNTT, Cán bộ quản lý đô thị và Người dùng/Công dân. Mỗi nhóm có pain point và quyền khác nhau.

### 3. Tại sao phải dùng bản đồ?

Vì tài sản đô thị gắn với vị trí. Nếu chỉ xem bảng thì khó thấy phân bố, vùng rủi ro, khoảng cách, quan hệ với đường/tiện ích.

### 4. Tại sao cần AI?

AI giúp giảm rào cản truy vấn và phân tích. Nhưng AI không thay quy trình nghiệp vụ. Nó chỉ hỗ trợ khi dữ liệu và yêu cầu đã được kiểm soát.

### 5. AI có thay PM không?

Không. PM quyết định problem, scope, stakeholder, priority, acceptance criteria và trade-off. AI chỉ giúp tăng tốc triển khai khi yêu cầu rõ.

### 6. User story tốt là gì?

Story tốt có actor, capability, business value và kiểm tra được theo INVEST. Quan trọng nhất là testable.

### 7. Epic khác user story thế nào?

Epic là capability lớn cần chia nhỏ. User story là lát cắt nhỏ đủ để estimate, triển khai và nghiệm thu.

### 8. Backlog 500 story có quá nhiều không?

Không nếu xem là product backlog để phân rã scope và tính FP. Nhưng nếu sprint planning thì cần ưu tiên, gom release và thêm acceptance criteria.

### 9. Có phải 500 story là 500 task code?

Không. Story là nhu cầu người dùng. Một story có thể cần nhiều task kỹ thuật; ngược lại một task kỹ thuật có thể hỗ trợ nhiều story.

### 10. MVP gồm gì?

Auth/RBAC cơ bản, bản đồ nền, hiển thị/lọc/tìm tài sản, CRUD tài sản, dashboard cơ bản, phản ánh sự cố và một luồng AI/GIS minh họa.

### 11. Cái gì không thuộc MVP?

MFA đầy đủ, tối ưu tuyến bảo trì, dự báo bảo trì, AI sinh báo cáo phức tạp, backup/disaster recovery nâng cao.

### 12. Vì sao quản trị hệ thống nhiều story?

Vì vận hành tổ chức cần user, role, permission, log, config, API key, backup. Đây là điều kiện để hệ thống dùng thật, không chỉ demo.

### 13. Nếu thầy bảo story thiếu acceptance criteria?

Thừa nhận. CSV là product backlog nền. Khi vào sprint, nhóm bổ sung Given/When/Then, rule dữ liệu, permission, error state và DoD.

### 14. Nếu thầy bảo thiếu priority?

Thừa nhận. Bước tiếp theo là thêm MoSCoW/RICE. MVP sẽ ưu tiên capability lõi trước, nâng cao sau.

### 15. Nếu thầy hỏi story nào quan trọng nhất?

Với MVP: đăng nhập/RBAC, bản đồ, CRUD tài sản, search/filter, dashboard, phản ánh. Vì chúng tạo vòng nghiệp vụ tối thiểu.

### 16. Function Point dùng để làm gì?

Dùng để ước lượng quy mô chức năng độc lập công nghệ, hỗ trợ tính khối lượng và dự toán trong báo cáo kinh tế kỹ thuật.

### 17. EI là gì?

External Input: dữ liệu đi vào hệ thống, như thêm tài sản, cập nhật quyền, gửi phản ánh.

### 18. EO là gì?

External Output: hệ thống xử lý/tổng hợp rồi xuất ra, như dashboard, báo cáo, thống kê.

### 19. EQ là gì?

External Inquiry: truy vấn xem dữ liệu, ví dụ xem danh sách, tìm kiếm cơ bản, xem bản đồ.

### 20. ILF là gì?

Internal Logical File: nhóm dữ liệu nội bộ hệ thống quản lý, ví dụ hồ sơ tài sản.

### 21. EIF là gì?

External Interface File: dữ liệu/kết nối ngoài mà hệ thống dùng, ví dụ Overture, tile map, kho backup ngoài.

### 22. Tại sao không bắt đầu từ công nghệ?

Công nghệ là phương tiện. PM phải bắt đầu từ người dùng, vấn đề, giá trị và nghiệm thu. Sau đó mới chọn công nghệ phù hợp.

### 23. Code đã làm hết backlog chưa?

Không nói hết. Code chứng minh capability lõi và kiến trúc. Backlog rộng hơn để thể hiện scope và roadmap.

### 24. Dữ liệu tài sản lưu ở đâu?

Trong mô hình hiện tại, dữ liệu tài sản chính là `BuildingProperty`, có thông tin thuộc tính, vị trí, geometry, risk flags và các trường phục vụ tìm kiếm.

### 25. Phân quyền lưu ở đâu?

Mô hình có `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, kết hợp guard ở API/module.

### 26. Phản ánh công dân đi qua luồng nào?

Người dùng gửi report kèm vị trí/nội dung/ảnh, hệ thống lưu `Report`, cán bộ tiếp nhận/respond/resolve và notification cập nhật trạng thái.

### 27. Heatmap có giá trị gì?

Heatmap giúp thấy mật độ tài sản/rủi ro theo khu vực, hỗ trợ ưu tiên kiểm tra, bảo trì hoặc phân bổ nguồn lực.

### 28. Risk overlay có giá trị gì?

Nó cho thấy tài sản nào nằm trong vùng ngập/sạt lở hoặc vùng rủi ro, từ đó ưu tiên xử lý.

### 29. Nếu AI trả lời sai?

Phải có guardrail: giới hạn quyền, chỉ đọc, log, fallback, và để người dùng kiểm tra kết quả từ database thay vì tin AI tuyệt đối.

### 30. Nếu API ngoài lỗi?

Hệ thống phải degrade gracefully: thông báo lỗi, dùng cache/fallback nếu có, không làm mất dữ liệu hay treo UI.

### 31. Vì sao cần audit log?

Vì dữ liệu tài sản và phân quyền là nghiệp vụ nhạy cảm. Audit log giúp truy vết ai làm gì, khi nào, trên đối tượng nào.

### 32. Vì sao cần import/export?

Hệ thống quản lý tài sản thường có dữ liệu hiện hữu. Import giúp khởi tạo nhanh; export giúp báo cáo, liên thông và backup nghiệp vụ.

### 33. Vì sao cần dashboard?

Dashboard giúp lãnh đạo/cán bộ nắm tình hình nhanh: tổng số tài sản, phân bố, trạng thái, rủi ro, khu vực cần chú ý.

### 34. Nếu thầy hỏi "thầy chỉ cần user story tốt, AI code được hết"?

Em đồng ý một phần: user story tốt giúp AI/dev code nhanh hơn. Nhưng story tốt vẫn cần PM xác định đúng stakeholder, value, acceptance criteria, priority, dependency và risk. Nếu story sai thì AI code nhanh cũng chỉ tạo sai nhanh hơn.

### 35. Story và task khác nhau thế nào?

Story mô tả giá trị người dùng. Task mô tả việc kỹ thuật để hiện thực story.

### 36. Definition of Done nên có gì?

Code xong, test pass, acceptance criteria pass, permission/security đúng, error state có, tài liệu hoặc demo cập nhật nếu cần.

### 37. Làm sao chọn priority?

Dựa trên giá trị nghiệp vụ, rủi ro, phụ thuộc kỹ thuật và khả năng demo/nghiệm thu. Có thể dùng MoSCoW hoặc RICE.

### 38. Rủi ro lớn nhất của dự án là gì?

Ba rủi ro: dữ liệu không sạch/không đầy đủ, AI trả kết quả không ổn định, và backlog rộng hơn năng lực triển khai trong thời gian ngắn.

### 39. Cách giảm rủi ro là gì?

Giới hạn MVP, có dữ liệu mẫu kiểm chứng, traceability rõ, acceptance criteria rõ, test các luồng chính, không nói quá phần AI/nâng cao.

### 40. Nếu được làm tiếp, em cải thiện gì đầu tiên?

Thêm priority, acceptance criteria, dependency, release/sprint cho backlog; sau đó map từng story MVP sang test case và trạng thái triển khai.

## 11. Checklist ôn tập theo ngày

### Ngày 1 - Nắm sản phẩm

- Học bản mở bài 30 giây, 1 phút, 3 phút.
- Thuộc pain point và stakeholder.
- Nói được 5 epic và ý nghĩa từng epic.
- Không cần học thuộc 500 story.

### Ngày 2 - Nắm backlog và FP

- Thuộc số tổng: 500 story, 2632 FP.
- Thuộc story/FP từng epic ở mức tương đối.
- Hiểu EI, EO, EQ, ILF, EIF.
- Tập giải thích vì sao backlog hiện chưa phải sprint backlog.

### Ngày 3 - Nắm story đại diện

- Chọn ít nhất 1 story/epic để nói sâu.
- Với mỗi story, nói được actor, value, acceptance criteria, dữ liệu, module code, test.
- Tập nói "đã làm/chưa làm" một cách trung thực.

### Ngày 4 - Nắm traceability

- Luyện 3 chain:
  - Quản lý tài sản.
  - Quản trị/RBAC.
  - AI/GIS/heatmap/risk.
- Mỗi chain nói được từ pain point -> use case -> epic/story -> code -> test.

### Ngày 5 - Luyện phản biện

- Luyện 40 câu hỏi.
- Đặc biệt luyện các câu:
  - "Acceptance criteria đâu?"
  - "Priority đâu?"
  - "AI thay PM không?"
  - "Code đã làm hết 500 story chưa?"
  - "MVP là gì?"

## 12. Checklist trước khi vào phòng hỏi

- Đừng mở đầu bằng stack công nghệ.
- Đừng nói "AI làm hết".
- Đừng khẳng định đã hoàn thành 500 story.
- Khi bị hỏi khó, thừa nhận điểm yếu rồi nói hướng cải thiện.
- Luôn kéo câu trả lời về traceability: pain point -> stakeholder -> story -> acceptance criteria -> code/test.
- Nói ngắn trước, nếu thầy hỏi sâu mới mở rộng.
- Dùng ví dụ cụ thể thay vì nói chung chung.
- Nếu không chắc, nói "phần này em xem là backlog nâng cao/giai đoạn sau" thay vì bịa.

## 13. Một đoạn kết tốt nếu được hỏi "em rút ra gì?"

> Điều em rút ra là trong một dự án có AI, phần khó không chỉ là code model hay gọi API. Phần khó là xác định đúng bài toán, đúng stakeholder, đúng phạm vi và đúng tiêu chí nghiệm thu. Nếu user story đủ tốt, AI và dev có thể triển khai nhanh hơn nhiều. Nhưng để story đủ tốt thì PM phải hiểu nghiệp vụ, biết ưu tiên, biết chấp nhận trade-off và biết nói rõ thế nào là xong.

