# PM Defense Pack: AI Agent Automation Cho GeoAI

Tài liệu này dùng để trả lời thầy khi bị hỏi về yêu cầu "dự án phải tự động hóa hoàn toàn với AI", "đội quân agent", "một agent ra lệnh cho các sub-agent", và vai trò PM trong bối cảnh AI code được rất nhiều phần.

Quan điểm bảo vệ: nói thật, nhưng nói theo tư duy PM. Trong phạm vi đồ án, nhóm không nên nhận vơ là đã xây một production multi-agent system hoàn chỉnh nếu thực tế chủ yếu dùng một agent trung tâm. Cách nói chắc hơn:

> Trong phạm vi đồ án, nhóm vận hành theo mô hình agentic PM orchestration: PM đặt mục tiêu, backlog và tiêu chí nghiệm thu; một lead agent trung tâm hỗ trợ phân rã công việc, sinh phương án, triển khai, kiểm thử và tài liệu. Các "sub-agent" hiện được mô phỏng bằng vai trò logic trong cùng một agent. Nếu production hóa, nhóm sẽ tách các vai trò đó thành agent chuyên biệt có handoff, guardrail, tracing và quality gate rõ ràng.

## 1. Câu trả lời mở đầu

### Bản 30 giây

> Tự động hóa bằng AI không có nghĩa PM biến mất. PM chuyển từ người giao việc thủ công sang người thiết kế hệ thống giao việc: xác định mục tiêu, user story, acceptance criteria, priority, scope, risk và Definition of Done. Với GeoAI, nhóm dùng một agent trung tâm theo mô hình lead-agent orchestration: agent hỗ trợ phân rã backlog, đề xuất kiến trúc, sinh code/test/tài liệu; PM kiểm tra output bằng traceability và tiêu chí nghiệm thu. Nếu triển khai production, mô hình này có thể tách thành nhiều sub-agent thật.

### Bản 1 phút

> Em chia mức tự động hóa AI thành 3 mức. Mức 1 là AI assistant đơn lẻ hỗ trợ viết code hoặc tài liệu. Mức 2 là agentic workflow: một lead agent nhận mục tiêu, phân vai logic như BA, Architect, Coder, Tester, Reviewer, Documentation, rồi trả kết quả qua các quality gate. Mức 3 là multi-agent production thật: nhiều agent chuyên biệt có handoff, tracing, guardrails và quyền riêng. Với đồ án GeoAI, nhóm đang ở mức 2: dùng một agent trung tâm nhưng vận hành theo quy trình agentic. Em không nói quá là đã có đội quân agent chạy song song production. Vai trò PM vẫn là thiết kế backlog, ưu tiên phạm vi, định nghĩa thế nào là đúng, kiểm soát rủi ro và duyệt output cuối.

### Bản 3 phút

> Nếu thầy yêu cầu dự án tự động hóa hoàn toàn với AI, em hiểu "hoàn toàn" không phải là bỏ PM hoặc để AI tự quyết định mọi thứ. Trong quản trị dự án, tự động hóa đúng nghĩa là tự động hóa phần lặp lại và có tiêu chí rõ: phân rã task, gợi ý acceptance criteria, sinh test, rà soát lỗi, cập nhật tài liệu, tạo checklist, kiểm tra traceability. Còn PM vẫn chịu trách nhiệm về mục tiêu, phạm vi, giá trị nghiệp vụ, rủi ro, ưu tiên và quyết định nghiệm thu.
>
> Với GeoAI, em mô hình hóa quy trình như 1 PM + 1 Lead Agent + nhiều sub-agent logic. PM chọn epic/story từ backlog 500 user story, nêu mục tiêu và Definition of Done. Lead Agent phân rã thành các vai trò: Business Analyst kiểm tra stakeholder và acceptance criteria; Architect kiểm tra module/data flow; Coding Agent triển khai; Testing Agent sinh unit/e2e checklist; Reviewer/Security Agent rà scope, permission, dữ liệu nhạy cảm; Documentation Agent cập nhật báo cáo và traceability. Trong thực tế đồ án, các vai trò này được chạy qua một agent trung tâm, nhưng quy trình đã chuẩn bị để tách thành sub-agent thật nếu production hóa.
>
> Điểm quan trọng là PM không bị AI thay thế. PM trở thành người thiết kế hệ điều hành cho đội AI: giao đúng việc, đặt guardrail, yêu cầu bằng chứng, kiểm tra output và chịu trách nhiệm cuối. Nếu user story mơ hồ, AI code nhanh cũng chỉ tạo sai nhanh hơn.

## 2. Ba mức AI automation cần phân biệt

| Mức | Tên | Mô tả | GeoAI đang ở đâu | Cách trả lời |
|---|---|---|---|---|
| 1 | AI assistant | Một AI hỗ trợ viết code, test, tài liệu theo prompt rời rạc | Có dùng | "Đây là mức thấp nhất, chưa đủ gọi là orchestration." |
| 2 | Agentic workflow | Một lead agent vận hành theo quy trình, phân vai logic, có checklist/quality gate | Nên đặt GeoAI ở đây | "Trong đồ án, nhóm dùng một agent trung tâm nhưng tổ chức theo nhiều vai trò PM-agent." |
| 3 | Production multi-agent | Nhiều agent thật, chạy tách biệt, có handoff, tracing, guardrail, permission riêng | Roadmap | "Nếu sản phẩm hóa, nhóm sẽ tách các vai trò thành sub-agent thật." |

Câu chốt:

> Em không nhận rằng nhóm đã có multi-agent production đầy đủ. Em nhận rằng nhóm đã thiết kế và vận hành theo agentic workflow ở mức đồ án, còn multi-agent thật là hướng mở rộng hợp lý.

## 3. Mô hình 1 PM + 1 Lead Agent + nhiều sub-agent logic

Sơ đồ lời nói:

```text
PM defines goal
  -> Lead Agent decomposes work
  -> Business Analyst Agent checks user story and acceptance criteria
  -> Architect Agent checks module, API, data flow
  -> Coding Agent implements or proposes implementation
  -> Testing Agent creates/runs test checklist
  -> Reviewer/Security Agent checks risks, permission, data safety
  -> Documentation Agent updates report/backlog/traceability
  -> Guardrails and quality gates check output
  -> PM accepts/rejects
  -> Backlog/test/report updated
```

Điểm PM cần nhấn:

- PM không làm tất cả thủ công nữa.
- PM thiết kế pipeline làm việc.
- PM quyết định đầu vào đúng, tiêu chí đúng, output đạt hay chưa.
- Agent làm tăng tốc, nhưng PM chịu trách nhiệm về outcome.

## 4. Bảng vai trò agent trong mô hình GeoAI

| Vai trò | Nếu là sub-agent thật thì làm gì | Trong đồ án 1 agent mô phỏng thế nào | Output PM cần nhận |
|---|---|---|---|
| PM/Orchestrator | Chọn mục tiêu, epic/story, ưu tiên, DoD, risk | Người dùng/PM prompt rõ mục tiêu và ràng buộc | Goal, scope, acceptance criteria, decision |
| Lead Agent | Phân rã task, gọi đúng specialist, tổng hợp kết quả | Một agent trung tâm đọc repo, backlog, báo cáo rồi chia bước | Work breakdown, synthesis, final answer |
| Business Analyst Agent | Phân tích stakeholder, pain point, user story, use case | Agent kiểm tra story theo INVEST, Given/When/Then | User story refined, AC, traceability |
| Architect Agent | Đề xuất module, API, data flow, dependency | Agent đọc codebase và nêu module liên quan | Architecture notes, module map |
| Coding Agent | Sửa code theo task đã rõ | Agent thực hiện patch khi được yêu cầu | Code diff, implementation summary |
| Testing Agent | Sinh/chạy unit, integration, e2e checklist | Agent đề xuất hoặc chạy test hiện có | Test result, gaps, regression risk |
| Reviewer/Security Agent | Review bug, permission, injection, data exposure | Agent kiểm tra rủi ro theo checklist | Findings, mitigation |
| Documentation Agent | Cập nhật tài liệu, report, backlog traceability | Agent tạo docs/markdown, bảng Q&A | Docs, PM defense notes |

Cách nói nếu thầy hỏi "agent nào chỉ huy agent nào?":

> PM là người đặt outcome và quyền quyết định. Lead Agent là điều phối kỹ thuật/quy trình. Các specialist agent chỉ xử lý một loại công việc và trả bằng chứng. Không có agent nào được tự ý đổi scope hoặc tự nghiệm thu. Nghiệm thu cuối thuộc PM dựa trên acceptance criteria.

## 5. Nối agent workflow với backlog 500 user story

Backlog không chỉ để trình bày. Trong agentic PM, backlog là "ngôn ngữ giao việc" cho agent.

Luồng chuẩn:

1. PM chọn epic/story từ backlog.
2. PM xác định mục tiêu, actor, business value, priority, risk.
3. Lead Agent phân rã story thành task.
4. Business Analyst Agent bổ sung acceptance criteria.
5. Architect Agent map sang module/API/data.
6. Coding Agent triển khai.
7. Testing Agent sinh/chạy test theo acceptance criteria.
8. Reviewer/Security Agent kiểm tra lỗi và rủi ro.
9. Documentation Agent cập nhật traceability.
10. PM duyệt hoặc reject.

Ví dụ với story bản đồ:

> Là người dùng, tôi muốn tải dữ liệu tài sản theo khu vực đang xem để tăng tốc hiển thị.

Agentic decomposition:

- BA Agent: xác định actor là người dùng/cán bộ, value là hiệu năng bản đồ, AC là query theo bbox.
- Architect Agent: map sang `map/assets`, `properties`, `useMapLayers`.
- Coding Agent: chỉnh API/UI nếu cần.
- Testing Agent: kiểm tra request bbox, pan/zoom, empty/error state.
- Reviewer Agent: kiểm tra performance, rate limit, dữ liệu lớn.
- PM: duyệt nếu bản đồ vẫn dùng được và không tải toàn bộ dữ liệu.

Ví dụ với story AI:

> Là Cán bộ quản lý, tôi muốn giới hạn SQL chỉ đọc dữ liệu để bảo vệ cơ sở dữ liệu sản xuất.

Agentic decomposition:

- BA Agent: xác nhận value là kiểm soát rủi ro AI.
- Architect Agent: xác định vị trí guardrail trước khi query DB.
- Coding Agent: thêm chặn `INSERT/UPDATE/DELETE/DROP` nếu scope cho phép.
- Testing Agent: test SQL đọc hợp lệ và SQL ghi bị chặn.
- Security Agent: kiểm tra prompt injection, bypass, logging.
- PM: duyệt vì story này bảo vệ hệ thống khỏi AI hành động quá quyền.

## 6. Guardrails, handoffs, tracing nói sao cho dễ hiểu

Các thuật ngữ thầy có thể thích:

- Handoff: agent chính chuyển việc cho agent chuyên biệt.
- Guardrail: rào kiểm soát đầu vào/đầu ra/hành động tool.
- Tracing: lưu lại ai làm gì, agent nào gọi tool nào, output nào được sinh ra.
- Quality gate: cổng kiểm tra trước khi chuyển sang bước tiếp theo.
- Human-in-the-loop: con người duyệt các quyết định rủi ro cao.

Cách nói bằng ngôn ngữ PM:

> Handoff giống giao việc giữa các vai trò trong team. Guardrail giống quy định PM đặt ra để agent không làm sai phạm vi. Tracing giống nhật ký dự án để truy vết quyết định. Quality gate giống Definition of Done ở từng bước.

Ứng dụng vào GeoAI:

- Agent không được tự ý đổi backlog.
- Agent không được tự ý bỏ acceptance criteria.
- Agent không được chạy thao tác nguy hiểm nếu chưa có approval.
- Agent phải để lại bằng chứng: diff, test result, reasoning summary, tài liệu cập nhật.
- PM duyệt story dựa trên DoD, không duyệt vì "AI nói xong".

## 7. Câu trả lời trung thực nhưng không yếu

### Nếu thầy hỏi: "Em có thật sự dùng multi-agent không?"

Không nên nói:

> Dạ có, em có đội quân agent chạy song song đầy đủ.

Nên nói:

> Nếu hiểu multi-agent production là nhiều agent độc lập có handoff và tracing riêng thì trong phạm vi đồ án em chưa triển khai đầy đủ. Nhưng em đã vận hành theo agentic workflow: một lead agent trung tâm nhận mục tiêu, phân vai logic thành BA, Architect, Coder, Tester, Reviewer, Documentation và kiểm tra output theo backlog/acceptance criteria. Đây là bước trung gian hợp lý trước khi tách thành multi-agent thật.

### Nếu thầy hỏi: "Vậy tự động hóa hoàn toàn ở đâu?"

> Tự động hóa hoàn toàn ở đây là tự động hóa pipeline hỗ trợ phát triển và quản trị: đọc backlog, phân rã task, sinh phương án, sinh code/test/docs, rà rủi ro, tạo traceability. Nhưng các quyết định quản trị như scope, priority, acceptance criteria và nghiệm thu vẫn do PM giữ. Nếu bỏ PM khỏi các quyết định này thì rủi ro là AI tối ưu sai mục tiêu.

### Nếu thầy hỏi: "Một agent thì khác gì ChatGPT bình thường?"

> Khác ở quy trình. Chat bình thường là hỏi đáp rời rạc. Agentic workflow có goal, context repo, role logic, checklist, quality gate, test, tracing và final acceptance. Một agent vẫn có thể mô phỏng nhiều vai trò nếu prompt và quy trình đủ chặt, nhưng production scale thì nên tách thành sub-agent chuyên biệt.

### Nếu thầy hỏi: "Tại sao không dùng nhiều agent thật?"

> Vì phạm vi đồ án cần chứng minh quy trình PM và sản phẩm GeoAI trước. Multi-agent thật có chi phí điều phối, debug, bảo mật và kiểm soát cao hơn. Nhóm chọn một lead agent để giảm overhead, sau đó thiết kế roadmap tách vai trò khi cần scale.

### Nếu thầy hỏi: "Có phải em đang nói giảm vì chưa làm được không?"

> Em đang phân biệt đúng maturity level. Nhận sai mức sẽ nguy hiểm cho PM. PM giỏi không chỉ nói hệ thống làm được gì, mà còn nói rõ hiện đang ở mức nào, rủi ro gì, điều kiện nào để lên mức tiếp theo.

## 8. 30 câu hỏi khó và câu trả lời mẫu

### 1. Nếu AI làm hết thì PM làm gì?

PM không biến mất. PM chuyển sang thiết kế hệ thống công việc: problem, scope, backlog, priority, acceptance criteria, risk, quality gate và quyết định nghiệm thu. AI làm nhanh phần thực thi, nhưng PM quyết định làm cái gì và thế nào là đúng.

### 2. Vì sao thầy nói user story tốt thì AI code được?

Vì user story tốt làm rõ actor, value và hành vi cần nghiệm thu. AI cần đầu vào rõ. Nếu story mơ hồ, AI vẫn code được nhưng dễ code sai.

### 3. Agentic workflow khác automation script thế nào?

Automation script chạy các bước cố định. Agentic workflow có khả năng đọc context, phân rã mục tiêu, chọn công cụ, tạo output và tự điều chỉnh trong phạm vi guardrail.

### 4. Multi-agent khác single-agent thế nào?

Single-agent là một agent làm nhiều việc. Multi-agent là nhiều agent chuyên biệt phối hợp, thường có lead agent điều phối, handoff và tracing.

### 5. Dự án GeoAI đang ở mức nào?

Ở mức 2: agentic workflow với một lead agent trung tâm và nhiều vai trò logic. Chưa nên nhận là mức 3 production multi-agent.

### 6. Nếu chỉ dùng một agent thì tại sao vẫn nói "đội quân agent"?

Nên nói "đội quân vai trò agent" hoặc "sub-agent logic", không nói là đội quân agent production. Một agent có thể lần lượt đóng vai BA, Architect, Tester, Reviewer theo quy trình PM.

### 7. Agent nào kiểm soát agent nào?

PM kiểm soát goal và acceptance. Lead Agent điều phối. Reviewer/Security Agent kiểm tra rủi ro. Testing Agent kiểm tra hành vi. Không agent nào tự nghiệm thu.

### 8. Nếu agent sinh code sai thì ai chịu trách nhiệm?

PM và nhóm phát triển chịu trách nhiệm cuối. Vì vậy phải có acceptance criteria, test, review và quality gate. Không thể đổ lỗi cho AI.

### 9. Nếu agent tự đổi scope thì sao?

Không được. Scope change phải quay lại PM. Agent có thể đề xuất thay đổi, nhưng không được tự phê duyệt.

### 10. Tự động hóa hoàn toàn có nguy hiểm không?

Có, nếu hiểu là bỏ hết kiểm soát con người. Đúng hơn là tự động hóa có kiểm soát: guardrail, tracing, approval và rollback.

### 11. PM có cần biết tech không?

PM không cần code sâu như dev, nhưng cần hiểu đủ về khả năng, rủi ro, phụ thuộc, dữ liệu và quality gate để ra quyết định đúng.

### 12. PM hơn AI ở điểm nào?

PM hiểu stakeholder, chính trị tổ chức, trade-off, trách nhiệm, đạo đức, ngân sách và ưu tiên. AI hỗ trợ phân tích và thực thi, nhưng không chịu trách nhiệm xã hội/dự án.

### 13. Làm sao đánh giá agent làm đúng?

Dựa trên acceptance criteria, test pass, review pass, traceability rõ, không vượt scope và output có thể demo/nghiệm thu.

### 14. Agent có cần Definition of Done không?

Có. Agent càng tự động càng cần DoD rõ: code/test/docs/security/acceptance criteria đầy đủ.

### 15. AI có thể viết user story không?

Có thể gợi ý, nhưng PM phải duyệt. AI có thể viết câu đúng format nhưng chưa chắc đúng stakeholder/value.

### 16. AI có thể ưu tiên backlog không?

Có thể gợi ý theo RICE/MoSCoW, nhưng PM phải quyết định vì priority phụ thuộc chiến lược, ràng buộc, deadline và stakeholder.

### 17. AI có thể tự nghiệm thu không?

Không nên. AI có thể self-check, nhưng nghiệm thu cuối cần PM/human-in-the-loop, nhất là với dữ liệu, bảo mật, nghiệp vụ nhà nước.

### 18. Vì sao cần tracing?

Để biết agent đã làm gì, dùng nguồn nào, gọi tool nào, output nào, lỗi ở đâu. Không có tracing thì rất khó debug và audit.

### 19. Vì sao cần guardrail?

Vì agent có thể hiểu sai, gọi tool sai, sinh code sai hoặc vượt quyền. Guardrail giúp chặn trước khi gây hại.

### 20. Guardrail trong GeoAI là gì?

Ví dụ: SQL chỉ đọc, không hardcode secret, không sửa dữ liệu ngoài scope, không bỏ quyền RBAC, không chấp nhận story thiếu acceptance criteria.

### 21. Handoff trong GeoAI là gì?

Ví dụ Lead Agent chuyển story cho BA Agent viết AC, chuyển cho Architect Agent map module, chuyển cho Tester Agent sinh test. Trong đồ án, handoff này mô phỏng bằng các bước role logic.

### 22. Nếu sub-agent mâu thuẫn nhau thì sao?

Lead Agent tổng hợp, nhưng PM quyết định. Ví dụ Architect muốn tối ưu nhanh, Security Agent báo rủi ro, PM chọn phương án cân bằng.

### 23. Dự án này tự động hóa PM chỗ nào?

Tự động hóa việc phân rã backlog, tạo checklist, viết acceptance criteria mẫu, map story sang module, sinh test plan, review rủi ro, cập nhật tài liệu.

### 24. Dự án này chưa tự động hóa chỗ nào?

Chưa có production multi-agent thật, chưa có dashboard agent runtime, chưa có tracing/handoff tool chính thức cho từng sub-agent. Đây là roadmap.

### 25. Nếu thầy yêu cầu "hoàn toàn tự động" thì trả lời sao?

> Em hiểu "hoàn toàn" theo nghĩa pipeline tự động hóa tối đa các bước có tiêu chí rõ. Nhưng quyết định PM rủi ro cao vẫn cần human approval. Nếu bỏ human approval thì đó không phải PM tốt, đó là mất kiểm soát.

### 26. Agent có thay tester không?

Không thay hoàn toàn. Agent có thể sinh test và chạy regression, nhưng tester/PM vẫn phải kiểm tra kịch bản nghiệp vụ, dữ liệu biên và trải nghiệm thực tế.

### 27. Agent có thay BA không?

Không thay hoàn toàn. Agent giúp draft story/use case, nhưng BA/PM xác nhận stakeholder, pain point và quy trình thật.

### 28. Agent có thay dev không?

Một phần công việc dev có thể được tự động hóa. Nhưng thiết kế, review, xử lý lỗi khó, quyết định trade-off và chịu trách nhiệm vẫn cần con người.

### 29. Nếu agent làm nhanh nhưng sai hướng thì sao?

Đó là lý do cần PM. PM đặt mục tiêu, AC, priority và review. AI tăng tốc execution; PM giữ direction.

### 30. Nếu được nâng cấp lên multi-agent thật, em làm gì đầu tiên?

Tách vai trò BA, Architect, Tester, Reviewer thành agent riêng; thêm handoff, tracing, guardrail; định nghĩa quyền tool theo agent; thêm dashboard theo dõi output và human approval ở các bước rủi ro cao.

## 9. Năm câu "cứu nguy" khi thầy bắt bẻ em chỉ dùng một agent

### Cứu nguy 1

> Đúng là em chưa triển khai nhiều agent độc lập. Em triển khai một lead agent theo quy trình nhiều vai trò. Điểm PM em muốn chứng minh là orchestration logic: cách giao việc, kiểm tra, trace và nghiệm thu. Multi-agent thật là bước scale tiếp theo.

### Cứu nguy 2

> Nếu em nói đã có production multi-agent thì không trung thực. Cách đúng là nói dự án đang ở maturity level 2: agentic workflow. Maturity level 3 sẽ cần handoff, tracing, guardrail và quyền riêng cho từng agent.

### Cứu nguy 3

> Một agent không có nghĩa là một vai trò. Trong quy trình em dùng, cùng một agent lần lượt đóng vai BA, Architect, Tester, Reviewer theo checklist. Nó chưa tối ưu bằng sub-agent thật, nhưng đã thể hiện cách PM thiết kế đội AI.

### Cứu nguy 4

> Em ưu tiên kiểm soát chất lượng hơn phô diễn số lượng agent. Nhiều agent nhưng không có acceptance criteria và guardrail thì chỉ tạo thêm nhiễu. PM phải thiết kế quality gate trước khi tăng số agent.

### Cứu nguy 5

> Với đồ án, điều quan trọng là chứng minh tư duy PM: biến backlog thành quy trình tự động có kiểm soát. Việc tách thành nhiều agent thật là triển khai kỹ thuật tiếp theo, không thay đổi logic quản trị.

## 10. Roadmap nếu production hóa đội quân agent

### Giai đoạn 1 - Chuẩn hóa đầu vào

- Bổ sung priority, acceptance criteria, dependency, release cho backlog.
- Chuẩn hóa Definition of Done theo loại story.
- Tạo prompt template cho từng vai trò agent.

### Giai đoạn 2 - Tách specialist agents

- BA Agent chỉ xử lý story/use case/AC.
- Architect Agent chỉ xử lý module/API/data flow.
- Testing Agent chỉ xử lý test plan/test execution.
- Reviewer Agent chỉ xử lý code review/security/scope.
- Documentation Agent chỉ xử lý docs/report/traceability.

### Giai đoạn 3 - Thêm handoff và tracing

- Lead Agent giao task cho specialist.
- Mỗi specialist trả output theo schema.
- Lưu trace: input, output, tool calls, test result, decision.

### Giai đoạn 4 - Thêm guardrail và permission

- Agent nào được đọc gì, sửa gì, chạy tool gì.
- Chặn hành động nguy hiểm: secret exposure, destructive command, SQL write, scope creep.
- Human approval cho bước rủi ro cao.

### Giai đoạn 5 - Đo hiệu quả

- Lead time/story.
- Tỷ lệ test pass.
- Số lỗi review phát hiện.
- Số lần agent vượt scope.
- Tỷ lệ story có AC đầy đủ.
- Mức độ traceability từ backlog sang code/test.

## 11. Cách kéo câu trả lời về PM, không sa vào dev/tech

Nếu thầy hỏi về code:

> Phần code chỉ là output. Ở góc PM, em quan tâm hơn là story nào sinh ra code đó, acceptance criteria là gì, test nào chứng minh đúng, và risk nào đã được kiểm soát.

Nếu thầy hỏi về agent framework:

> Framework có thể thay đổi. Logic PM không đổi: lead agent, specialist role, guardrail, tracing, quality gate, PM approval.

Nếu thầy hỏi về AI coding:

> AI coding chỉ hiệu quả khi backlog đủ rõ. Nếu backlog yếu thì AI tạo code nhanh nhưng sai hướng. Vì vậy PM càng quan trọng hơn trong thời AI.

Nếu thầy hỏi về "dev không cần":

> Dev truyền thống có thể giảm vai trò ở phần viết code lặp lại, nhưng năng lực engineering vẫn cần để review kiến trúc, security, dữ liệu và vận hành. PM không thay dev bằng niềm tin vào AI; PM thiết kế hệ thống kiểm soát để AI/dev tạo đúng outcome.

## 12. Nguồn tham khảo để nói có căn cứ

- OpenAI Agents SDK: mô hình agent có tools, handoffs, tracing. https://platform.openai.com/docs/guides/agents-sdk/
- OpenAI Agents Guardrails: guardrails cho input/output/tool để kiểm soát workflow. https://openai.github.io/openai-agents-js/guides/guardrails
- Anthropic multi-agent research system: mô hình lead agent điều phối subagents cho task phức tạp. https://www.anthropic.com/engineering/built-multi-agent-research-system
- Atlassian AI agents in project management: AI agents xử lý busywork, PM tập trung chiến lược và stakeholder. https://www.atlassian.com/agile/project-management/ai-agents
- PMI AI Essentials for Project Professionals: AI hỗ trợ planning, risk, communication và decision support cho PM. https://www.pmi.org/-/media/pmi/documents/public/pdf/artificial-intelligence/ai-essentials-for-project-professionals.pdf

## 13. Đoạn kết luận nên dùng

> Em nghĩ điểm quan trọng của PM trong thời AI là không cố làm mọi thứ bằng tay, nhưng cũng không buông quyền kiểm soát cho AI. PM phải biến backlog thành hệ thống giao việc có kiểm soát: rõ mục tiêu, rõ story, rõ acceptance criteria, rõ risk, rõ Definition of Done. Với GeoAI, nhóm đang ở mức agentic workflow: một lead agent trung tâm mô phỏng nhiều vai trò specialist. Đây là nền để nâng lên multi-agent thật khi có handoff, tracing, guardrail và human approval đầy đủ.

