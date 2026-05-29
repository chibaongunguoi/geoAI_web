Hướng dẫn viết LaTeX & cài trình biên dịch (Windows)

Mục đích
- Tài liệu này hướng dẫn cách cài đặt LaTeX trên Windows, cấu hình soạn thảo và lệnh để biên dịch file `main.tex` trong dự án.

Yêu cầu cơ bản
- Hệ điều hành: Windows 10/11
- Quy ước: lưu file `.tex` ở mã hóa UTF-8 (quan trọng cho Tiếng Việt)

Cài đặt LaTeX
- MiKTeX (nhẹ, dễ cài trên Windows):
  1. Vào https://miktex.org/download và tải MiKTeX Installer cho Windows.
  2. Chạy installer, chọn "Install missing packages on-the-fly" để tự động cài gói thiếu.

- TeX Live (đầy đủ, dung lượng lớn):
  1. Vào https://tug.org/texlive/ và tải installer.
  2. Cài theo hướng dẫn (cần nhiều dung lượng và thời gian).

Cài trình soạn thảo
- TeXstudio: thân thiện với LaTeX, có nút Build/View.
- Visual Studio Code + extension `LaTeX Workshop` (khuyến nghị nếu bạn dùng VS Code):
  1. Cài VS Code: https://code.visualstudio.com/
  2. Mở Extensions, tìm `LaTeX Workshop` và cài.
  3. Cấu hình extension nếu cần (thường tự nhận `latexmk`/`pdflatex`/`xelatex`).

Cấu hình cho Tiếng Việt
- Khuyến nghị dùng XeLaTeX (hỗ trợ Unicode và font hệ thống):
  - Lưu file `.tex` ở mã hóa UTF-8.
  - Sử dụng `fontspec` và `polyglossia` (hoặc `babel` với `vietnamese`):

Ví dụ preamble tối thiểu cho XeLaTeX:

```tex
\documentclass[12pt]{article}
\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage{vietnamese}
\setmainfont{Times New Roman}
\begin{document}
Xin chào thế giới tiếng Việt: Có dấu, chữ ă, đ, ô, ê.
\end{document}
```

Lệnh build (thường dùng)
- Dùng `latexmk` (tự xử lý nhiều lần biên dịch, biber/bibtex):

```bash
latexmk -xelatex -pdf main.tex
```

Các lệnh LaTeX cơ bản
- Section / Subsection:

```tex
\section{Tiêu đề chương}
\subsection{Tiêu đề phần}
\subsubsection{Tiêu đề mục nhỏ}
```

- Danh sách (không đánh số / đánh số):

```tex
\begin{itemize}
  \item Mục không đánh số 1
  \item Mục không đánh số 2
\end{itemize}

\begin{enumerate}
  \item Mục đánh số 1
  \item Mục đánh số 2
\end{enumerate}
```

- Chèn hình (cần `\usepackage{graphicx}` trong preamble):

```tex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.6\textwidth]{figures/images/example.png}
  \caption{Mô tả hình}
  \label{fig:example}
\end{figure}

Gọi tham chiếu: \ref{fig:example}
```

- Chèn bảng cơ bản (khuyến nghị dùng `booktabs` cho bảng đẹp):

```tex
\begin{table}[htbp]
  \centering
  \caption{Bảng ví dụ}
  \label{tab:example}
  \begin{tabular}{lrr}
    	oprule
    Tên & Số lượng & Giá \\
    \midrule
    A & 10 & 100 \\
    B & 20 & 200 \\
    \bottomrule
  \end{tabular}
\end{table}

Gọi tham chiếu: \ref{tab:example}
```

Lưu ý:
- Sử dụng `htbp` để gợi ý vị trí float (here, top, bottom, page).
- Đặt `\label` sau `\caption` để tham chiếu đúng số.
- Đường dẫn ảnh nên là đường dẫn tương đối từ thư mục gốc dự án.


- Nếu không có `latexmk`, cách biên dịch thủ công với XeLaTeX + biber:

```bash
xelatex -interaction=nonstopmode -synctex=1 main.tex
biber main      # nếu dùng biblatex+biber
xelatex -interaction=nonstopmode main.tex
xelatex -interaction=nonstopmode main.tex
```

- Dùng `pdflatex` + `bibtex` (nếu không cần Unicode chuyên sâu):

```bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Gợi ý cho VS Code (LaTeX Workshop)
- Mở file `main.tex`, dùng lệnh "LaTeX Workshop: Build" (Ctrl+Alt+B theo mặc định) hoặc click nút Build.
- Trong settings, bạn có thể chọn engine là `xelatex` hoặc `latexmk`.

Xử lý lỗi thường gặp
- Missing packages: nếu MiKTeX bật cài gói tự động, thường nó sẽ tự cài. Nếu không, cài thủ công qua MiKTeX Console.
- Lỗi font hoặc tiếng Việt bị lệch: chuyển sang XeLaTeX và dùng `fontspec`.
- Lỗi encoding: đảm bảo file được lưu ở UTF-8 (VS Code: Save with Encoding -> UTF-8).

Mẹo
- Nên dùng `latexmk` để tiết kiệm công, nó gọi đúng engine và chạy nhiều lần khi cần.
- Nếu dùng Windows, cài SumatraPDF để xem PDF nhanh (hỗ trợ reload tự động).

Thử build dự án hiện tại
- Tại thư mục gốc dự án (nơi có `main.tex`), chạy:

```bash
latexmk -xelatex -pdf main.tex
```

Nếu bạn muốn, tôi có thể:
- Chạy thử build cho bạn (nếu cho phép), hoặc
- Cấu hình `settings.json` cho VS Code để tự động build.

Xem file này: [README.md](README.md)
