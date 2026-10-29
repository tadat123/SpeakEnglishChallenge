# 🎙️ SPEAK RIGHT DAILY CHALLENGE 2026

Nền tảng tổ chức cuộc thi luyện phát âm và từ vựng tiếng Anh công sở kéo dài **30 ngày** dành cho nhân viên công ty. Thiết kế theo chuẩn **Mobile-First PWA (Progressive Web App)**, tối ưu trải nghiệm trên **Điện thoại, Máy tính bảng (Tablet) và Máy tính (Desktop)** với kiến trúc chịu tải cao phục vụ **27.000+ nhân viên**.

---

## ✨ Tính năng nổi bật

1. **Bảo mật & Định danh Nhân viên Nội bộ:**
   - **Số GEN (`employeeId`):** Bắt buộc đúng **8 chữ số** (`/^\d{8}$/`), tự động mở bàn phím số trên điện thoại.
   - **Mật khẩu bảo mật:** Tối thiểu 8 ký tự, bắt buộc bao gồm **chữ HOA, chữ thường, chữ số và ký tự đặc biệt**.
   - **Chặn tên miền nội bộ:** Chỉ cho phép đăng ký bằng Gmail/Email cá nhân, **chặn tuyệt đối `*@samsung.com`** ở cả giao diện và Backend API.
   - **Khôi phục mật khẩu miễn phí qua Gmail:** Hỗ trợ đồng thời **Mã xác thực OTP 6 chữ số** và **Nút bấm khôi phục nhanh (Magic Link)** trong email.

2. **Hệ thống Thử thách 30 Ngày (Daily Pronunciation Challenge):**
   - **Trang chủ trực quan (1-Tap Dashboard):** Hiển thị ngay Bài thử thách hôm nay, Tiến độ số ngày đã hoàn thành (`X/30 hôm`), Tổng điểm và Bảng xếp hạng Top 5 + Hạng hiện tại của bạn.
   - **Bộ 10 câu hỏi đa dạng mỗi ngày:**
     - *Multiple Choice – Chọn audio phát âm đúng* (Nghe 4 nút `Audio A`, `Audio B`, `Audio C`, `Audio D` cho các từ như *Approval*, *Equipment*).
     - *True / False – Nghe và xác định nhận định* (Nghe audio đánh vần `M – E – G` hoặc `Tool` rồi đối chiếu nhận định).
     - *Nghe audio – Chọn từ đúng* (*Yield rate*, *Measurement*, *Development*).
     - *Nghĩa của từ & từ viết tắt công sở* (*DOE*, *Metal*, *Model*).
   - **Chế độ "Tự sang câu":** Giảm tối đa thao tác chạm khi làm bài trên điện thoại.
   - **Chống gian lận (Server-side Validation):** Không trả đáp án đúng về Client trước khi nộp bài; tính thời gian làm bài thực tế từ Server.

3. **Bảng xếp hạng & Quản trị (Admin CMS):**
   - Xếp hạng theo **Toàn công ty** và **Bộ phận/Phòng ban** (ưu tiên Điểm cao $\rightarrow$ Thời gian làm bài nhanh hơn).
   - Trang **Admin CMS** hỗ trợ mở/khóa nhanh từng ngày, nạp lại dữ liệu gốc (Re-seed) với 1 nút bấm và **Xuất file Excel/CSV** danh sách trao giải.

---

## 📂 Cấu trúc Dự án (Monorepo)

```text
SpeakEnglishChallenge/
├── apps/
│   ├── api/                 # Backend API (Fastify + TypeScript + Prisma + Nodemailer)
│   │   ├── prisma/          # schema.prisma & seed.ts (Bộ 10 câu hỏi chuẩn x 30 ngày)
│   │   └── src/
│   │       ├── services/    # store.ts, seedData.ts, mailer.ts
│   │       ├── utils/       # validators.ts (Kiểm tra GEN 8 số, Password, Chặn @samsung.com)
│   │       └── server.ts    # REST API Server (Cổng 4000)
│   └── web/                 # Frontend PWA (React 18 + Vite + Tailwind CSS + Lucide Icons)
│       ├── public/          # manifest.json (Cấu hình cài đặt App PWA)
│       └── src/
│           ├── components/  # AuthScreen.tsx, InstallPwaModal.tsx
│           ├── utils/       # audio.ts, validation.ts
│           └── App.tsx      # Giao diện chính (Home, 30 Ngày, Làm bài, Kết quả, Xếp hạng, Admin)
├── nginx/
│   └── nginx.conf           # Cấu hình Load Balancer & Rate Limiting
├── docker-compose.yml       # Triển khai Docker Cluster (Nginx, API, Postgres, PgBouncer, Redis)
└── package.json
```

---

## 🚀 Hướng dẫn Chạy Nhanh trên Máy (Local)

Dự án đã tích hợp sẵn **Local Persistent Store (`apps/api/data/db.json`)** được nạp sẵn 30 ngày thử thách và Bộ 10 Câu Hỏi chuẩn, giúp bạn chạy ngay lập tức mà không cần cài đặt Database ngoài:

```bash
# 1. Cài đặt thư viện cho cả Frontend và Backend
npm install

# 2. Chạy Backend API (http://localhost:4000)
npm run dev:api

# 3. Mở terminal mới và chạy Frontend Web (http://localhost:5173)
npm run dev:web
```

### 🔑 Tài khoản mẫu có sẵn (Bấm 1 chạm trên màn hình Đăng nhập)
| Vai trò | Số GEN (8 số) | Mật khẩu | Gmail |
| :--- | :--- | :--- | :--- |
| **Nhân viên (Nguyễn Thị Thảo)** | `20261234` | `Speak@2026` | `thaonguyen.work@gmail.com` |
| **Quản trị viên (Admin CMS)** | `88888888` | `Admin@2026` | `admin.speakright@gmail.com` |

---

## ☁️ Hướng dẫn Deploy Miễn Phí (0đ)

1. **Frontend (`apps/web`) — Cloudflare Pages hoặc Vercel:**
   - Root Directory: `apps/web`
   - Build Command: `npm run build`
   - Output Directory: `dist`
2. **Backend (`apps/api`) — Render.com (Web Service Free):**
   - Root Directory: `apps/api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Biến môi trường tùy chọn (`.env`): Xem chi tiết trong `apps/api/.env.example` (hỗ trợ kết nối **Supabase PostgreSQL Free Tier** và **Gmail SMTP App Password** miễn phí 100%).
