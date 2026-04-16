# GeoAI Startup Guide - Hướng dẫn chạy ứng dụng

## 🚀 Cách chạy nhanh nhất

### Option 1: Chạy tất cả (Frontend + Backend) - **KHUYÊN DÙNG**

**Windows:**
```bash
# Từ folder geoAI_web
start_geoai.bat
```

**Linux/Mac:**
```bash
# Từ folder geoAI_web
chmod +x start_geoai.sh
./start_geoai.sh
```

---

## 📂 Cấu trúc thư mục

```
c:\xampp\htdocs\geoAI_web/                          # Thư mục chính
├── start_geoai.bat                 # ✅ Chạy cả frontend + backend
├── start_geoai.sh                  # ✅ Chạy cả frontend + backend (Linux/Mac)
├── start_frontend_only.bat         # Chạy chỉ frontend
├── start_backend.bat               # Chạy chỉ backend
├── start_backend.sh                # Chạy chỉ backend (Linux/Mac)
├── geoai_backend.py               # Flask server (Python backend)
├── requirements.txt                # Dependencies Python
├── src/
│   ├── app/
│   │   └── api/analyze/route.js   # Node.js API gateway
│   └── components/
│       ├── Map.js
│       └── MapWrapper.js
└── package.json
```

---

## 3️⃣ Các cách chạy

### Cách 1: Chạy tất cả cùng lúc (KHUYÊN DÙNG)

**Windows:**
```bash
cd c:\xampp\htdocs\geoAI_web
start_geoai.bat
```

- Sẽ tự động:
  - ✅ Cài dependencies (npm, pip)
  - ✅ Start Python backend trên port 5000
  - ✅ Start Web frontend trên port 3000
  - ✅ Mở trang http://localhost:3000

**Linux/Mac:**
```bash
cd /path/to/geoAI_web
./start_geoai.sh
```

---

### Cách 2: Chạy riêng rẽ (từng terminal)

**Terminal 1 - Python Backend:**

Windows:
```bash
cd c:\xampp\htdocs\geoAI_web
start_backend.bat
```

Linux/Mac:
```bash
cd /path/to/geoAI_web
chmod +x start_backend.sh
./start_backend.sh
```

Output sẽ hiển thị:
```
WARNING in werkzeug: Running on http://0.0.0.0:5000
```

**Terminal 2 - Web Frontend:**

Windows:
```bash
cd c:\xampp\htdocs\geoAI_web
start_frontend_only.bat
```

Linux/Mac:
```bash
cd /path/to/geoAI_web
npm run dev
```

Output sẽ hiển thị:
```
▲ Next.js 16.2.2
- Local: http://localhost:3000
✓ Ready in 652ms
```

---

## ⚡ Troubleshooting

### ❌ "bash: start_geoai.bat: command not found"

**Nguyên nhân:** Bạn đang chạy trong bash terminal, không phải Command Prompt

**Giải pháp:**
- Windows: Chạy từ **Command Prompt (cmd)** hoặc **PowerShell**
- Linux/Mac: Dùng `start_geoai.sh` thay vì `.bat`

```bash
# Windows - Mở Command Prompt sau đó:
cd c:\xampp\htdocs\geoAI_web
start_geoai.bat

# Linux/Mac:
chmod +x /path/to/geoAI_web/start_geoai.sh
./start_geoai.sh
```

---

### ❌ "ModuleNotFoundError: No module named 'flask'"

**Giải pháp:**
```bash
cd c:\xampp\htdocs\qlda_geoAI
pip install -r requirements.txt
```

---

### ❌ "Port 3000 is already in use"

**Giải pháp:**
```bash
# Windows
netstat -aon | find "3000"
taskkill /F /PID <PID>

# Linux/Mac
lsof -ti :3000 | xargs kill -9
```

---

### ❌ "GeoAI backend không khả dụng"

**Kiểm tra:**
1. Python backend đã start chưa?
   ```bash
   curl http://localhost:5000/health
   ```

2. Port 5000 có bị chiếm không?
   ```bash
   # Windows
   netstat -aon | find "5000"
   
   # Linux/Mac
   lsof -ti :5000
   ```

3. Dependencies đã cài chưa?
   ```bash
   pip install -r requirements.txt
   ```

---

## 📊 Kiểm tra trạng thái

### Python Backend Health Check
```bash
curl http://localhost:5000/health
```

Kết quả: `{"status": "ok", "message": "GeoAI Backend is running"}`

### Web Frontend
Truy cập: `http://localhost:3000`

---

## 🔧 Cài đặt dependencies (nếu cần)

**Node.js / npm** (Frontend):
```bash
cd c:\xampp\htdocs\geoAI_web
npm install
```

**Python** (Backend):
```bash
cd c:\xampp\htdocs\geoAI_web
pip install -r requirements.txt
```

---

## 📝 Ghi chú

- Script `start_geoai.bat/sh` sẽ tự động cài dependencies nếu chưa có
- Python backend sẽ chạy trong cửa sổ riêng (Windows)
- Nếu stop web server, Python backend cũng sẽ dừng (khi dùng `start_geoai.bat/sh`)
- Để chỉ test frontend mà không cần backend mock, dùng `start_frontend_only.bat`

---

## ✅ Khi chạy thành công

1. Python backend chạy trên `http://localhost:5000`
2. Web frontend chạy trên `http://localhost:3000`
3. Mở browser vào `http://localhost:3000`
4. Vẽ rectangle trên bản đồ để test

---

Bất kỳ vấn đề gì, kiểm tra:
- ✅ Terminal output
- ✅ Browser console (F12)
- ✅ Các port (3000, 5000) có bị chiếm không