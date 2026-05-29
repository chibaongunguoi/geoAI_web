import os

# Tạo thư mục tables nếu chưa tồn tại
os.makedirs('tables', exist_ok=True)

# Từ điển chứa tên file và nội dung LaTeX tương ứng
bang_du_lieu = {
    "bang_tong_hop_chi_phi.tex": r"""\begin{longtable}{|c|p{4.5cm}|p{3.5cm}|c|r|}
\caption{Bảng tổng hợp chi phí phần mềm nội bộ \label{tab:tong_hop_chi_phi}} \\
\hline
\textbf{TT} & \textbf{Khoản mục chi phí} & \textbf{Cách tính} & \textbf{Ký hiệu} & \textbf{Thành tiền (đồng)} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Khoản mục chi phí} & \textbf{Cách tính} & \textbf{Ký hiệu} & \textbf{Thành tiền (đồng)} \\ \hline
\endhead
\hline
\multicolumn{5}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Chi phí trực tiếp XD, PT, MR phần mềm nội bộ & $G=1,4\times E\times P\times H$ & G & 222.324.862 \\ \hline
2 & Chi phí chung & $G\times 65\%$ & C & 144.511.160 \\ \hline
3 & Thu nhập chịu thuế tính trước & $(G+C)\times 6\%$ & TL & 22.010.161 \\ \hline
4 & Chi phí XD, PT, MR phần mềm nội bộ & $G+C+TL$ & GPM & 388.846.184 \\ \hline
5 & Chi phí dự phòng & Theo quy định & Gdp & 38.884.618 \\ \hline
\multicolumn{3}{|c|}{\textbf{TỔNG CỘNG}} & \textbf{Gpm} & \textbf{427.730.802} \\ \hline
\end{longtable}""",

    "bang_tong_hop_du_toan.tex": r"""\begin{longtable}{|c|p{4cm}|c|p{3.2cm}|r|r|r|}
\caption{Bảng tổng hợp dự toán \label{tab:tong_hop_du_toan}} \\
\hline
\textbf{Stt} & \textbf{Nội dung chi phí} & \textbf{Ký hiệu} & \textbf{Công thức} & \textbf{Giá trị trước thuế} & \textbf{VAT} & \textbf{Giá trị sau thuế} \\ \hline
\endfirsthead
\hline
\textbf{Stt} & \textbf{Nội dung chi phí} & \textbf{Ký hiệu} & \textbf{Công thức} & \textbf{Giá trị trước thuế} & \textbf{VAT} & \textbf{Giá trị sau thuế} \\ \hline
\endhead
\hline
\multicolumn{7}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
I & Chi phí phần mềm nội bộ & GPM & Theo QĐ 671/QĐ-BTTTT & 427.730.802 & & 427.730.802 \\ \hline
II & Chi phí quản lý dự án & GQL & GPM \times tỷ lệ \% & 7.934.406 & & 7.934.406 \\ \hline
III & Chi phí tư vấn đầu tư & GTV & GTV1+GTV2+GTV3+GTV4 & 23.569.401 & 600.000 & 24.169.401 \\ \hline
1 & Chi phí lập báo cáo kinh tế - kỹ thuật & GTV1 & GPM \times tỷ lệ \%, min 10tr & 15.569.401 & & 15.569.401 \\ \hline
2 & Chi phí thẩm tra dự toán & GTV2 & GPM \times tỷ lệ \%, min 2tr & 2.000.000 & & 2.000.000 \\ \hline
3 & Chi phí lập hồ sơ mời thầu & GTV3 & GPM \times tỷ lệ \%, min 3tr & 3.000.000 & 300.000 & 3.300.000 \\ \hline
4 & Chi phí đánh giá hồ sơ dự thầu & GTV4 & GPM \times tỷ lệ \%, min 3tr & 3.000.000 & 300.000 & 3.300.000 \\ \hline
IV & Chi phí khác & GK & & 5.000.000 & 500.000 & 5.500.000 \\ \hline
1 & Chi phí kiểm thử chức năng PM & GKT & Lập dự toán & 0 & & 0 \\ \hline
2 & Chi phí kiểm thử ATANTT & GKTATTT & Lập dự toán & 0 & & 0 \\ \hline
3 & Chi phí thẩm định HSMT & GK1 & GPM \times 0,1\%, min 2tr & 2.000.000 & 200.000 & 2.200.000 \\ \hline
4 & Chi phí thẩm định kết quả đấu thầu & GK2 & GPM \times 0,1\%, min 3tr & 3.000.000 & 300.000 & 3.300.000 \\ \hline
V & Chi phí dự phòng & GDP & (GPM+GQL+GTV+GK)\times 10\% & 46.423.461 & & 46.423.461 \\ \hline
\multicolumn{2}{|c|}{\textbf{TỔNG CỘNG}} & \textbf{G} & GPM+GQL+GTV+GK+GDP & \textbf{510.658.071} & \textbf{1.100.000} & \textbf{511.758.071} \\ \hline
\end{longtable}""",

    "bang_danh_sach_tac_nhan.tex": r"""\begin{longtable}{|c|p{3cm}|p{6cm}|p{2cm}|c|}
\caption{Danh sách các tác nhân \label{tab:danh_sach_tac_nhan}} \\
\hline
\textbf{TT} & \textbf{Tên tác nhân} & \textbf{Mô tả tác nhân} & \textbf{Phân loại} & \textbf{Trọng số} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Tên tác nhân} & \textbf{Mô tả tác nhân} & \textbf{Phân loại} & \textbf{Trọng số} \\ \hline
\endhead
\hline
\multicolumn{5}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Cán bộ CNTT (Admin) & Quản lý toàn bộ hệ thống, cấu hình và phân quyền & Phức tạp & 3 \\ \hline
2 & Cán bộ quản lý đô thị & Quản lý tài sản, lập kế hoạch bảo trì, xem báo cáo & Phức tạp & 3 \\ \hline
3 & Công dân & Xem bản đồ công khai, gửi phản ánh sự cố hạ tầng & Phức tạp & 3 \\ \hline
\end{longtable}""",

    "bang_taw.tex": r"""\begin{longtable}{|c|p{4cm}|c|c|c|}
\caption{Bảng tính điểm tác nhân không hiệu chỉnh (TAW) \label{tab:taw}} \\
\hline
\textbf{TT} & \textbf{Loại Actor} & \textbf{Trọng số} & \textbf{Số tác nhân} & \textbf{Điểm} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Loại Actor} & \textbf{Trọng số} & \textbf{Số tác nhân} & \textbf{Điểm} \\ \hline
\endhead
\hline
\multicolumn{5}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Đơn giản & 1 & 0 & 0 \\ \hline
2 & Trung bình & 2 & 0 & 0 \\ \hline
3 & Phức tạp & 3 & 3 & 9 \\ \hline
\multicolumn{2}{|c|}{Cộng (1+2+3)} & & \textbf{3} & \textbf{9} \\ \hline
\multicolumn{4}{|c|}{\textbf{TAW}} & \textbf{9} \\ \hline
\end{longtable}""",

    "bang_tbf.tex": r"""\begin{longtable}{|c|p{4cm}|c|c|c|c|}
\caption{Bảng tính điểm các trường hợp sử dụng (use case) \label{tab:tbf}} \\
\hline
\textbf{STT} & \textbf{Loại} & \textbf{Trọng số} & \textbf{Hệ số BMT} & \textbf{Số UC} & \textbf{Điểm} \\ \hline
\endfirsthead
\hline
\textbf{STT} & \textbf{Loại} & \textbf{Trọng số} & \textbf{Hệ số BMT} & \textbf{Số UC} & \textbf{Điểm} \\ \hline
\endhead
\hline
\multicolumn{6}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & B - Đơn giản & 5 & 1 & 11 & 55 \\ \hline
  & B - Trung bình & 10 & 1 & 9 & 90 \\ \hline
  & B - Phức tạp & 15 & 1 & 0 & 0 \\ \hline
2 & M - Đơn giản & 5 & 1.2 & 1 & 6 \\ \hline
  & M - Trung bình & 10 & 1.2 & 0 & 0 \\ \hline
  & M - Phức tạp & 15 & 1.2 & 0 & 0 \\ \hline
3 & T - Đơn giản & 5 & 1.5 & 0 & 0 \\ \hline
  & T - Trung bình & 10 & 1.5 & 1 & 15 \\ \hline
  & T - Phức tạp & 15 & 1.5 & 0 & 0 \\ \hline
\multicolumn{2}{|c|}{Cộng (1+2+3)} & & & \textbf{22} & \textbf{166} \\ \hline
\multicolumn{5}{|c|}{\textbf{TBF}} & \textbf{166} \\ \hline
\end{longtable}""",

    "bang_tcf.tex": r"""\begin{longtable}{|c|p{5cm}|c|c|c|p{3cm}|}
\caption{Bảng hệ số phức tạp kỹ thuật – công nghệ (TCF) \label{tab:tcf}} \\
\hline
\textbf{TT} & \textbf{Các hệ số KT-CN} & \textbf{Trọng số (Wi)} & \textbf{Giá trị xếp hạng (Fi)} & \textbf{Kết quả ($Wi \times Fi$)} & \textbf{Ghi chú} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Các hệ số KT-CN} & \textbf{Trọng số (Wi)} & \textbf{Giá trị xếp hạng (Fi)} & \textbf{Kết quả ($Wi \times Fi$)} & \textbf{Ghi chú} \\ \hline
\endhead
\hline
\multicolumn{6}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
\multicolumn{6}{|l|}{\textbf{I. Hệ số KT-CN (TFW)}} \\ \hline
T1 & Xử lý phân tán & 2 & 0 & 0 & 0-5 \\ \hline
T2 & Mức độ quan trọng của hiệu năng & 1 & 2 & 2 & 0-5 \\ \hline
T3 & Hiệu quả sử dụng cho người dùng & 1 & 2 & 2 & 0-5 \\ \hline
T4 & Độ phức tạp của xử lý bên trong & 1 & 2 & 2 & 0-5 \\ \hline
T5 & Khả năng tái sử dụng mã nguồn & 1 & 0 & 0 & 0-5 \\ \hline
T6 & Dễ cài đặt & 0.5 & 1 & 0.5 & 0-5 \\ \hline
T7 & Dễ vận hành & 0.5 & 3 & 1.5 & 0-5 \\ \hline
T8 & Khả năng chuyển đổi & 2 & 0 & 0 & 0-5 \\ \hline
T9 & Dễ dàng bảo trì & 1 & 3 & 3 & 0-5 \\ \hline
T10 & Xử lý đồng thời & 1 & 1 & 1 & 0-5 \\ \hline
T11 & Mức độ hỗ trợ bảo mật & 1 & 2 & 2 & 0-5 \\ \hline
T12 & Sự phụ thuộc vào mã lệnh bên thứ ba & 1 & 1 & 1 & 0-5 \\ \hline
T13 & Mức độ hỗ trợ đào tạo người sử dụng & 1 & 2 & 2 & 0-5 \\ \hline
\multicolumn{4}{|l|}{$TFW = Tổng(Wi \times Fi)$} & \textbf{17} & \\ \hline
\multicolumn{6}{|l|}{\textbf{II. Hệ số phức tạp KT-CN (TCF)}} \\ \hline
\multicolumn{4}{|l|}{$TCF = 0.6 + (0.01 \times TFW)$} & \textbf{0.77} & \\ \hline
\multicolumn{4}{|l|}{$UUCP = TAW + TBF$} & 175 & Điểm UC chưa hiệu chỉnh \\ \hline
\multicolumn{4}{|l|}{$AUCP = UUCP \times TCF \times EF$} & \textbf{85.56625} & ĐIỂM USE CASE SAU HIỆU CHỈNH \\ \hline
\end{longtable}""",

    "bang_ecf.tex": r"""\begin{longtable}{|c|p{5cm}|c|c|c|}
\caption{Bảng tính toán hệ số tác động môi trường, nhóm làm việc (ECF) \label{tab:ecf}} \\
\hline
\textbf{TT} & \textbf{Các hệ số môi trường} & \textbf{Trọng số (Wi)} & \textbf{Giá trị xếp hạng (Fi)} & \textbf{Kết quả ($Wi \times Fi$)} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Các hệ số môi trường} & \textbf{Trọng số (Wi)} & \textbf{Giá trị xếp hạng (Fi)} & \textbf{Kết quả ($Wi \times Fi$)} \\ \hline
\endhead
\hline
\multicolumn{5}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
E1 & Quen thuộc với quy trình phát triển PM & 1.5 & 5 & 7.5 \\ \hline
E2 & Kinh nghiệm về ứng dụng & 0.5 & 5 & 2.5 \\ \hline
E3 & Kinh nghiệm về hướng đối tượng & 1 & 3 & 3 \\ \hline
E4 & Năng lực chủ trì phân tích & 0.5 & 5 & 2.5 \\ \hline
E5 & Động lực làm việc & 1 & 5 & 5 \\ \hline
E6 & Yêu cầu ổn định & 2 & 5 & 10 \\ \hline
E7 & Nhân viên bán thời gian & -1 & 0 & 0 \\ \hline
E8 & Ngôn ngữ lập trình khó & -1 & 5 & -5 \\ \hline
\multicolumn{4}{|l|}{$EFW = Tổng(Wi \times Fi)$} & \textbf{25.5} \\ \hline
\multicolumn{4}{|l|}{$ECF = 1.4 + (-0.03 \times EFW)$} & \textbf{0.635} \\ \hline
\end{longtable}""",

    "bang_luong_nhan_cong.tex": r"""\begin{longtable}{|c|p{3.5cm}|c|p{2.5cm}|r|r|r|}
\caption{Bảng tính lương nhân công \label{tab:luong_nhan_cong}} \\
\hline
\textbf{TT} & \textbf{Hạng mục} & \textbf{Ký hiệu} & \textbf{Cách tính} & \textbf{Kỹ sư bậc 1} & \textbf{Kỹ sư bậc 2} & \textbf{Kỹ sư bậc 3} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Hạng mục} & \textbf{Ký hiệu} & \textbf{Cách tính} & \textbf{Kỹ sư bậc 1} & \textbf{Kỹ sư bậc 2} & \textbf{Kỹ sư bậc 3} \\ \hline
\endhead
\hline
\multicolumn{7}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Hệ số cấp bậc & HCB & & 2.34 & 2.65 & 2.96 \\ \hline
2 & Hệ số phụ cấp lương & HPC & & 0.00 & 0.00 & 0.00 \\ \hline
3 & Mức lương cơ sở & MLCS & & 2.340.000 & 2.340.000 & 2.340.000 \\ \hline
4 & Lương cơ bản & LCB & $HCB \times MLCS$ & 5.475.600 & 6.201.000 & 6.926.400 \\ \hline
5 & Hệ số điều chỉnh tăng thêm tiền lương & HĐC & & 0.9 & 0.9 & 0.9 \\ \hline
6 & Các khoản đóng góp theo lương & BHLĐ & $BHXH + BHYT + BHTN$ & 1.177.254 & 1.333.215 & 1.489.176 \\ \hline
6.1 & Bảo hiểm xã hội (17,5\%) & BHXH & $17,5\% \times LCB$ & 958.230 & 1.085.175 & 1.212.120 \\ \hline
6.2 & Bảo hiểm y tế (3\%) & BHYT & $3\% \times LCB$ & 164.268 & 186.030 & 207.792 \\ \hline
6.3 & Bảo hiểm thất nghiệp (1\%) & BHTN & $1\% \times LCB$ & 54.756 & 62.010 & 69.264 \\ \hline
7 & Số ngày công trong tháng & t & & 26 & 26 & 26 \\ \hline
8 & Giá ngày công & GNC & $[(HCB+HPC)\times MLCS \times (1+HĐC)+BHLD]/t$ & 445.419 & 504.428 & 563.436 \\ \hline
9 & Giá giờ công & GGC & $GNC / 8$ & 55.677,38 & 63.053,44 & 70.429,50 \\ \hline
10 & Số nhân công & & & 3 & 0 & 0 \\ \hline
11 & Mức lương lao động bình quân (H) & H & BQ có trọng số theo số NC & 55.677,38 & & \\ \hline
\end{longtable}""",

    "bang_chi_phi_truc_tiep.tex": r"""\begin{longtable}{|c|p{3.5cm}|p{3cm}|c|r|p{3cm}|}
\caption{Bảng tính toán chi phí trực tiếp xây dựng phần mềm nội bộ \label{tab:chi_phi_truc_tiep}} \\
\hline
\textbf{TT} & \textbf{Hạng mục} & \textbf{Diễn giải} & \textbf{Ký hiệu} & \textbf{Giá trị} & \textbf{Ghi chú} \\ \hline
\endfirsthead
\hline
\textbf{TT} & \textbf{Hạng mục} & \textbf{Diễn giải} & \textbf{Ký hiệu} & \textbf{Giá trị} & \textbf{Ghi chú} \\ \hline
\endhead
\hline
\multicolumn{6}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
\multicolumn{6}{|l|}{\textbf{I. Tính điểm trường hợp sử dụng (Use case)}} \\ \hline
1 & Điểm Actor (TAW) & Phụ lục IV & TAW & 9 & \\ \hline
2 & Điểm Use case (TBF) & Phụ lục V & TBF & 166 & \\ \hline
3 & Tính điểm UUCP & $UUCP = TAW + TBF$ & UUCP & 175 & \\ \hline
4 & Hệ số phức tạp KT-CN (TCF) & $TCF = 0,6 + (0,01 \times TFW)$ & TCF & 0.77 & Phụ lục VI \\ \hline
5 & Hệ số phức tạp môi trường (EF) & $EF = 1,4 + (-0,03 \times EFW)$ & EF & 0.635 & Phụ lục VII \\ \hline
6 & Tính điểm AUCP & $UUCP \times TCF \times EF$ & AUCP & 85.56625 & \\ \hline
\textbf{II} & \textbf{Nội suy thời gian lao động (P)} & Giờ công/điểm UC & P & 20 & Nội suy từ PL VII (20-28 giờ) \\ \hline
\textbf{III} & \textbf{Giá trị nỗ lực thực tế (E)} & $E = 10/6 \times AUCP$ & E & 142.6104167 & Hệ số điều chỉnh nỗ lực \\ \hline
\textbf{IV} & \textbf{Mức lương lao động BQ (H)} & đồng/giờ & H & 55.677,38 & Theo QĐ 320/QĐ-BKHCN \\ \hline
\textbf{V} & \textbf{Chi phí trực tiếp PM nội bộ (G)} & $G = 1,4 \times E \times P \times H$ & G & 222.324.862 & đồng \\ \hline
\end{longtable}""",

    "bang_tien_do.tex": r"""\begin{longtable}{|c|p{6cm}|c|c|}
\caption{Tiến độ triển khai \label{tab:tien_do}} \\
\hline
\textbf{Stt} & \textbf{Hạng mục công việc} & \textbf{Thời gian bắt đầu} & \textbf{Thời gian kết thúc} \\ \hline
\endfirsthead
\hline
\textbf{Stt} & \textbf{Hạng mục công việc} & \textbf{Thời gian bắt đầu} & \textbf{Thời gian kết thúc} \\ \hline
\endhead
\hline
\multicolumn{4}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Khảo sát yêu cầu, lập hồ sơ thuyết minh thiết kế kỹ thuật, tổng dự toán & 02/2025 & 03/2025 \\ \hline
2 & Phân tích và thiết kế hệ thống & 03/2025 & 03/2025 \\ \hline
3 & Thiết kế giao diện & 03/2025 & 03/2025 \\ \hline
4 & Xây dựng phần mềm & 03/2025 & 06/2025 \\ \hline
5 & Nghiệm thu và đưa phần mềm vào sử dụng & 06/2025 & 06/2025 \\ \hline
\end{longtable}""",

    "bang_phu_luc_2.tex": r"""\begin{longtable}{|c|p{4cm}|p{3.5cm}|p{5cm}|}
\caption{Bảng thống kê dữ liệu tài sản đô thị \label{tab:phu_luc_2}} \\
\hline
\textbf{STT} & \textbf{Loại tài sản đô thị} & \textbf{Số lượng ước tính} & \textbf{Ghi chú} \\ \hline
\endfirsthead
\hline
\textbf{STT} & \textbf{Loại tài sản đô thị} & \textbf{Số lượng ước tính} & \textbf{Ghi chú} \\ \hline
\endhead
\hline
\multicolumn{4}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & Cây xanh đô thị & $\sim$450.000 cây & Toàn \gls{tptp} \\ \hline
2 & Đèn chiếu sáng công cộng & $\sim$120.000 bóng & Đường phố và công viên \\ \hline
3 & Biển báo giao thông & $\sim$80.000 biển & Các loại biển báo, hiệu lệnh \\ \hline
4 & Hố ga thoát nước & $\sim$200.000 hố ga & Hệ thống thoát nước \\ \hline
5 & Trụ điện công cộng & $\sim$60.000 trụ & Lưới điện hạ thế \\ \hline
6 & Bảng điện tử quảng cáo & $\sim$5.000 bảng & Màn hình LCD, bảng led \\ \hline
7 & Đường giao thông (phân đoạn) & $\sim$15.000 đoạn & Theo lý trình đường \\ \hline
8 & Cầu, hầm chui & $\sim$1.200 công trình & Cầu các loại \\ \hline
9 & Trạm bơm, cống điều tiết & $\sim$3.000 công trình & Hệ thống thủy lợi nội thị \\ \hline
10 & Camera giám sát công cộng & $\sim$18.000 camera & Đường phố và giao lộ \\ \hline
\end{longtable}""",

    "bang_phu_luc_3.tex": r"""\begin{longtable}{|c|p{4cm}|p{4cm}|p{4.5cm}|}
\caption{Yêu cầu hạ tầng triển khai \label{tab:phu_luc_3}} \\
\hline
\textbf{STT} & \textbf{Thành phần} & \textbf{Cấu hình tối thiểu} & \textbf{Ghi chú} \\ \hline
\endfirsthead
\hline
\textbf{STT} & \textbf{Thành phần} & \textbf{Cấu hình tối thiểu} & \textbf{Ghi chú} \\ \hline
\endhead
\hline
\multicolumn{4}{r}{{Tiếp theo trang sau}} \\
\endfoot
\hline
\endlastfoot
1 & GeoServer (GIS Engine) & 8 CPU, 32GB RAM, SSD 500GB & Có thể cluster 2 node \\ \hline
2 & \gls{ai} Processing Server & GPU NVIDIA A 100/ 16 CPU/64GB RAM & Cho inference \gls{ai} real-time \\ \hline
3 & PostgreSQL + PostGIS & 16 CPU, 64GB RAM, NVMe 2TB & CSDL không gian địa lý \\ \hline
4 & Application Server (API) & 8 CPU, 32GB RAM x 2 (HA) & FastAPI + load balancer \\ \hline
5 & MinIO Object Storage & 4 CPU, 16GB RAM, HDD 10TB & Lưu ảnh tài sản \\ \hline
6 & Redis Cache & 4 CPU, 16GB RAM & Cache bản đồ và phiên \\ \hline
7 & Kafka Message Queue & 8 CPU, 32GB RAM, SSD 500GB & Stream \gls{iot} data \\ \hline
8 & Monitoring Stack & 4 CPU, 8GB RAM & Prometheus + Grafana \\ \hline
\end{longtable}"""
}

# Tiến hành tạo và ghi dữ liệu vào các file
for ten_file, noi_dung in bang_du_lieu.items():
    duong_dan_file = os.path.join('tables', ten_file)
    with open(duong_dan_file, 'w', encoding='utf-8') as f:
        f.write(noi_dung)
    print(f"Đã tạo thành công: {duong_dan_file}")

print("\nHoàn tất! Tất cả 12 file .tex đã được lưu trong thư mục 'tables'.")