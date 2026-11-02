# 🛠️ HƯỚNG DẪN CÀI ĐẶT & TRIỂN KHAI BACKEND API (SPEAK RIGHT 2026)

Tài liệu chi tiết hướng dẫn thiết lập Backend API cho cuộc thi **Speak Right Daily Challenge 2026** từ môi trường phát triển (Local) đến môi trường sản xuất (Docker / Cloud / VPS) phục vụ từ quy mô thử nghiệm đến **20.000+ nhân viên**.

---

## 📋 Mục Lục
1. [Thông tin Tài khoản Quản trị viên (Admin) Mặc định](#1-thông-tin-tài-khoản-quản-trị-viên-admin-mặc-định)
2. [Cách 1: Chạy Local Nhanh (Node.js / TypeScript - 0đ)](#2-cách-1-chạy-local-nhanh-nodejs--typescript---0đ)
3. [Cách 2: Triển khai Cụm Docker Chịu Tải Cao (Postgres + PgBouncer + Redis + Nginx)](#3-cách-2-triển-khai-cụm-docker-chịu-tải-cao-postgres--pgbouncer--redis--nginx)
4. [Cách 3: Triển khai Đám Mây Miễn Phí (Render.com + Supabase + Upstash)](#4-cách-3-triển-khai-đám-mây-miễn-phí-rendercom--supabase--upstash)
5. [Cấu hình Gửi Email Khôi Phục Mật Khẩu (Gmail SMTP)](#5-cấu-hình-gửi-email-khôi-phục-mật-khẩu-gmail-smtp)
6. [Cấu hình Biến Môi Trường (.env)](#6-cấu-hình-biến-môi-trường-env)
7. [Danh sách API Endpoints Chính](#7-danh-sách-api-endpoints-chính)

---

## 1. Thông tin Tài khoản Quản trị viên (Admin) Mặc định

Toàn bộ dữ liệu giả lập (mock data) của nhân viên đã được dọn sạch hoàn toàn. Hệ thống chỉ giữ lại duy nhất 1 tài khoản Ban Tổ Chức (Admin) với điểm khởi tạo bằng **0**:

| Thông tin | Giá trị |
| :--- | :--- |
| **Số GEN (8 số)** | `88888888` |
| **Mật khẩu** | `Admin@2026` |
| **Email** | `admin.speakright@gmail.com` |
| **Vai trò** | `ADMIN` (Truy cập Admin CMS Portal tại `#admin`) |

> 💡 **Nhân viên thật tham gia cuộc thi:** Bấm tab **"Đăng ký"** trên giao diện, nhập Số GEN 8 chữ số, Họ tên, Gmail cá nhân (hệ thống chặn email nội bộ `@samsung.com` theo đúng yêu cầu bảo mật), và Mật khẩu chuẩn (hoa, thường, số, ký tự đặc biệt).

---

## 2. Cách 1: Chạy Local Nhanh (Node.js / TypeScript - 0đ)

Hệ thống tích hợp sẵn **JSON Persistent Store (`apps/api/data/db.json`)** đã nạp sẵn 30 ngày thi và Bộ 10 câu hỏi chuẩn, không bắt buộc phải cài PostgreSQL ngoài khi chạy thử nghiệm.

### Các bước thực hiện:

```bash
# 1. Di chuyển vào thư mục dự án
cd e:/Speak

# 2. Cài đặt toàn bộ dependencies (Workspaces Monorepo)
npm install

# 3. Tạo file cấu hình môi trường cho Backend
cp apps/api/.env.example apps/api/.env

# 4. Khởi động Backend API (Cổng 4000)
npm run dev:api

# 5. Mở một Terminal khác và khởi động Frontend Web (Cổng 5173)
npm run dev:web
```

- **Backend API URL:** `http://localhost:4000`
- **Frontend Web URL:** `http://localhost:5173`
- **Kiểm tra sức khỏe Backend:** Truy cập `http://localhost:4000/api/health` trả về `{"status":"ok"}`.

---

## 3. Cách 2: Triển khai Cụm Docker Chịu Tải Cao (Postgres + PgBouncer + Redis + Nginx)

Dành cho môi trường chạy thử nghiệm tải hoặc sản xuất trên VPS (DigitalOcean, Hetzner, AWS, Viettel IDC, FPT Cloud) phục vụ **20.000 – 27.000 nhân viên**.

Cụm Docker bao gồm 6 dịch vụ được cấu hình sẵn trong `docker-compose.yml`:
1. **nginx:** Reverse proxy, cân bằng tải Least-Connections, chống DDoS & Rate Limiting.
2. **api-1, api-2, api-3:** 3 instances Backend chạy song song không điểm nghẽn.
3. **pgbouncer:** Connection pooler duy trì tối đa 5.000 kết nối đồng thời.
4. **postgres:** Cơ sở dữ liệu quan hệ PostgreSQL 16 Alpine.
5. **redis:** Bộ nhớ đệm bảng xếp hạng (Leaderboard ZSET) và Rate Limiter.

### Các lệnh khởi chạy:

```bash
# Khởi động toàn bộ cụm container ở chế độ background
docker compose up -d --build

# Kiểm tra trạng thái các container
docker compose ps

# Xem log thời gian thực của cụm API
docker compose logs -f api-1

# Nạp dữ liệu gốc 30 ngày vào PostgreSQL container (chỉ chạy 1 lần đầu)
docker compose exec api-1 npm run db:push
docker compose exec api-1 npm run db:seed

# Tắt cụm khi cần bảo trì
docker compose down
```

---

## 4. Cách 3: Triển khai Đám Mây Miễn Phí (Render.com + Supabase + Upstash)

Nếu bạn không muốn quản lý máy chủ VPS, bạn có thể triển khai hoàn toàn miễn phí trên Cloud:

### Bước 4.1: Tạo Database PostgreSQL Miễn phí trên Supabase hoặc Neon
1. Đăng ký tại **https://supabase.com** (hoặc **https://neon.tech**) bằng tài khoản GitHub.
2. Tạo New Project (chọn khu vực Singapore để có độ trễ thấp nhất về Việt Nam).
3. Copy chuỗi kết nối: `DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"`

### Bước 4.2: Tạo Redis Miễn phí trên Upstash (Tùy chọn)
1. Đăng nhập **https://upstash.com** bằng GitHub.
2. Tạo New Redis Database.
3. Copy chuỗi kết nối: `REDIS_URL="rediss://default:[TOKEN]@[HOST]:6379"`

### Bước 4.3: Deploy Backend lên Render.com từ file render.yaml
File **`render.yaml`** đã được cấu hình sẵn ở thư mục gốc:
1. Đăng nhập **https://dashboard.render.com** bằng GitHub `tadat123`.
2. Bấm **New +** $\rightarrow$ **Blueprint** $\rightarrow$ Chọn repo `tadat123/SpeakEnglishChallenge`.
3. Render sẽ tự động cấu hình:
   - Root Directory: `apps/api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Điền các biến môi trường:
   - `DATABASE_URL`: Dán link Supabase PostgreSQL
   - `REDIS_URL`: Dán link Upstash Redis
   - `SMTP_USER`: Gmail của bạn
   - `SMTP_PASS`: Mật khẩu ứng dụng Gmail (16 ký tự)
   - `FRONTEND_URL`: Link GitHub Pages `https://tadat123.github.io/SpeakEnglishChallenge`
5. Bấm **Apply**. Sau khoảng 2 phút, Render sẽ cấp cho bạn một URL Backend, ví dụ:
   `https://speak-right-2026-api.onrender.com`

### Bước 4.4: Nối Frontend GitHub Pages với Backend Render
1. Mở trang quản lý biến GitHub:
   👉 **https://github.com/tadat123/SpeakEnglishChallenge/settings/variables/actions**
2. Bấm **New repository variable**:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://speak-right-2026-api.onrender.com` (URL backend Render của bạn)
3. Vào tab **Actions** $\rightarrow$ chọn workflow **Deploy Speak Right 2026 to GitHub Pages** $\rightarrow$ bấm **Re-run all jobs**. Frontend trên GitHub Pages sẽ tự động trỏ về Backend thật!

---

## 5. Cấu hình Gửi Email Khôi Phục Mật Khẩu (Gmail SMTP)

Backend sử dụng `nodemailer` hỗ trợ gửi mã OTP 6 chữ số và Magic Link đặt lại mật khẩu trực tiếp về hòm thư Gmail của nhân viên:

1. Truy cập trang Quản lý Tài khoản Google: **https://myaccount.google.com/security**
2. Bật **Xác minh 2 bước (2-Step Verification)** (nếu chưa bật).
3. Tìm kiếm **"Mật khẩu ứng dụng" (App Passwords)**.
4. Đặt tên ứng dụng là `SpeakRight` $\rightarrow$ bấm **Tạo**.
5. Google sẽ cấp một mật khẩu gồm **16 ký tự** (dạng `abcd efgh ijkl mnop`).
6. Dán vào file `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=ten_email_cua_ban@gmail.com
   SMTP_PASS=abcdefghijklmnop
   SMTP_FROM="Speak Right Challenge 2026 <no-reply@speakright2026.com>"
   ```

*(Lưu ý: Nếu không cấu hình SMTP_USER và SMTP_PASS, Backend sẽ tự động chuyển sang chế độ **Demo Preview**, trả về mã OTP trực tiếp trên giao diện để thuận tiện test thử nghiệm).*

---

## 6. Cấu hình Biến Môi Trường (.env)

Tạo file `apps/api/.env` dựa trên bảng mẫu sau:

```env
# ==================== CẤU HÌNH SERVER ====================
PORT=4000
NODE_ENV=production
JWT_SECRET=speak-right-2026-super-secret-jwt-key
FRONTEND_URL=https://tadat123.github.io/SpeakEnglishChallenge

# ==================== CƠ SỞ DỮ LIỆU (TÙY CHỌN) ====================
# Để trống nếu muốn chạy Local JSON Store (apps/api/data/db.json)
DATABASE_URL=""
DIRECT_URL=""

# ==================== REDIS CACHE (TÙY CHỌN) ====================
# Để trống nếu muốn dùng In-Memory Leaderboard Cache tích hợp sẵn
REDIS_URL=""

# ==================== GMAIL SMTP GỬI MAIL THẬT ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Speak Right Challenge 2026 <no-reply@speakright2026.com>"
```

---

## 7. Danh sách API Endpoints Chính

| Method | Endpoint | Quyền | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Kiểm tra trạng thái máy chủ |
| `POST` | `/api/auth/register` | Public | Đăng ký tài khoản (chặn `@samsung.com`) |
| `POST` | `/api/auth/login` | Public | Đăng nhập bằng GEN (8 số) hoặc Gmail |
| `POST` | `/api/auth/forgot-password` | Public | Gửi mã OTP khôi phục mật khẩu |
| `POST` | `/api/auth/reset-password` | Public | Xác thực OTP & đổi mật khẩu mới |
| `GET` | `/api/challenges` | User / Admin | Lấy danh sách 30 ngày thử thách |
| `POST` | `/api/challenges/:day/start` | User / Admin | Bắt đầu làm bài thi (Tạo đề thi Snapshot) |
| `GET` | `/api/challenges/:day/session-status` | User / Admin | Kiểm tra khóa khẩn cấp thời gian thực |
| `POST` | `/api/challenges/:day/submit` | User / Admin | Nộp bài thi & Server chấm điểm |
| `GET` | `/api/leaderboard` | User / Admin | Bảng xếp hạng Top 50 toàn công ty / phòng ban |
| `GET` | `/api/profile/me` | User / Admin | Thông tin cá nhân & lịch sử các ngày thi |
| `GET` | `/api/admin/challenges/:day` | **Admin only** | Chi tiết ngày thi kèm đáp án & người thi trực tuyến |
| `PUT` | `/api/admin/challenges/:day/unlock` | **Admin only** | Mở/Khóa ngày thi (Hỗ trợ Soft Lock & Force Lock) |
| `POST` | `/api/admin/challenges/:day/questions`| **Admin only** | Thêm câu hỏi (Chữ, Âm thanh, Video) |
| `PUT` | `/api/admin/challenges/:day/questions/:id`| **Admin only** | Sửa nội dung/đáp án câu hỏi |
| `DELETE`| `/api/admin/challenges/:day/questions/:id`| **Admin only** | Xóa câu hỏi |
| `POST` | `/api/admin/challenges/:day/clone-to-all` | **Admin only** | Đồng bộ đề của 1 ngày sang cả 30 ngày |
| `POST` | `/api/admin/upload-media` | **Admin only** | Tải lên file Audio (.mp3/.wav) hoặc Video (.mp4) |
| `POST` | `/api/admin/reseed` | **Admin only** | Nạp lại 30 ngày và Bộ 10 câu hỏi chuẩn gốc |
