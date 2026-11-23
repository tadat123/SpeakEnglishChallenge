# 🎙️ SPEAK RIGHT DAILY CHALLENGE 2026

Nền tảng tổ chức cuộc thi luyện phát âm và từ vựng tiếng Anh công sở dành cho doanh nghiệp. Thiết kế theo chuẩn **Mobile-First PWA (Progressive Web App)**, tối ưu trải nghiệm trên **Điện thoại, Máy tính bảng và Máy tính** với kiến trúc **100% PostgreSQL Database + Multi-Instance Docker Cluster** chịu tải cho **30.000+ người dùng**.

---

## 🏗️ 1. Kiến Trúc Hệ Thống & Lưu Trữ (100% PostgreSQL — Không dùng `db.json`)

Hệ thống vận hành hoàn toàn trên cơ sở dữ liệu **PostgreSQL 16** (tuyệt đối **không** lưu dữ liệu qua file `db.json`):

* **`User` (PostgreSQL):** Lưu toàn bộ 30.000+ tài khoản nhân viên, mã số GEN 8 số, mật khẩu băm (`bcrypt`), điểm tổng, thời gian làm bài và mã OTP khôi phục mật khẩu.
* **`DailyChallenge` & `Question` (PostgreSQL):** Lưu lịch trình ngày thi (1–90 ngày) và ngân hàng câu hỏi.
* **`ChallengeAttempt` (PostgreSQL):** Lưu chi tiết từng lượt nộp bài, điểm số chính thức, điểm luyện tập và thời gian hoàn thành.
* **`AppStateStore` (PostgreSQL JSONB + Atomic Version):** Lưu trữ trạng thái điều phối sự kiện (`NOT_STARTED` / `COUNTDOWN` / `ACTIVE`), danh sách sự kiện Popup, cấu hình lịch Push PWA và đồng bộ thời gian thực giữa 3 container `api-1`, `api-2`, `api-3`.
* **`PwaPushSubscription` & `PushCampaign` (PostgreSQL):** Quản lý thiết bị đăng ký nhận thông báo đẩy PWA.

---

## 💰 2. Cấu Hình Máy Ảo Google Cloud Tối Ưu ($75 – $100/tháng cho 30.000 Người Dùng)

Với gói **$300 Free Trial Credit** của Google Cloud và ngân sách mục tiêu **$75 – $100/tháng**, cấu hình máy ảo (Compute Engine VM) tối ưu nhất để gánh **30.000 người dùng** (và **1.500 – 2.500 người truy cập đồng thời** vào khung giờ cao điểm 7h–8h sáng / 19h tối) là:

| Hạng mục | Cấu hình khuyên dùng ($75/tháng) | Cấu hình tối đa ($98/tháng) |
| :--- | :--- | :--- |
| **Loại máy (Machine Type)** | **`e2-custom-4-8192`** (4 vCPU, 8 GB RAM) | **`e2-standard-4`** (4 vCPU, 16 GB RAM) |
| **Khu vực (Region)** | `asia-southeast1` (Singapore) hoặc `asia-east1` (Đài Loan) | `asia-southeast1` (Singapore) |
| **Ổ cứng (Boot Disk)** | `30 GB - 50 GB Balanced Persistent Disk (SSD)` | `50 GB SSD Persistent Disk` |
| **Hệ điều hành** | Ubuntu 22.04 LTS hoặc Debian 12 | Ubuntu 22.04 LTS |
| **Chi phí ước tính** | **~$73 – $78 / tháng** (Trừ thẳng vào gói $300 Credit) | **~$98 / tháng** |

### 🔄 Cách nâng cấp máy ảo hiện tại của bạn trên Google Cloud (Không mất dữ liệu):
1. Vào **Google Cloud Console** ➔ **Compute Engine** ➔ **VM instances**.
2. Chọn máy ảo của bạn ➔ Bấm nút **STOP** (Đợi 30 giây cho máy tắt hẳn).
3. Bấm vào tên máy ảo ➔ Bấm **EDIT** ở thanh trên cùng.
4. Kéo xuống mục **Machine configuration**:
   - Chọn Series: **`E2`**
   - Chọn Machine type: **`Custom`** ➔ Kéo thanh trượt lên **4 vCPUs** và **8 GB Memory** (hoặc chọn preset **`e2-standard-4`**).
5. Bấm **SAVE** ➔ Bấm **START / RESUME** để bật lại máy ảo.

---

## ⚙️ 3. Hướng Dẫn Setup Backend Trong Máy Ảo (Từ A – Z)

### Bước 3.1: Cài đặt Docker, Docker Compose & Công cụ cơ bản trên Máy Ảo
Mở cửa sổ SSH vào máy ảo và chạy:

```bash
# Cập nhật hệ thống & cài đặt git, curl, nano
sudo apt update && sudo apt install -y git curl nano ca-certificates

# Cài đặt Docker & Docker Compose chính chủ
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

*(Tùy chọn) Tạo thêm 4GB RAM ảo (Swap) để bảo vệ hệ thống khi có đột biến tải:*
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

### Bước 3.2: Tải mã nguồn (Clone) hoặc Cập nhật mã nguồn mới nhất

* **Nếu cài mới lần đầu:**
  ```bash
  cd ~
  git clone https://github.com/tadat123/SpeakEnglishChallenge.git
  cd ~/SpeakEnglishChallenge
  ```
* **Nếu đã có sẵn thư mục dự án trên máy ảo:**
  ```bash
  cd ~/SpeakEnglishChallenge
  git pull origin master
  ```

---

### Bước 3.3: Cấu hình file môi trường `.env` (Gmail SMTP & Bảo mật)

Tại thư mục `~/SpeakEnglishChallenge`, tạo hoặc sửa file `.env`:

```bash
nano ~/SpeakEnglishChallenge/.env
```

Dán nội dung sau vào (thay Gmail và App Password 16 ký tự của bạn):

```env
JWT_SECRET=speak-right-2026-production-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASS=mat_khau_ung_dung_16_ky_tu_khong_dau_cach
SMTP_FROM="Speak Right Challenge 2026 <email_cua_ban@gmail.com>"
FRONTEND_URL=https://speak-english-challenge.vercel.app
```
*(Bấm `Ctrl + O` ➔ `Enter` để lưu, `Ctrl + X` để thoát).*

---

### Bước 3.4: Khởi chạy cụm Backend & Database PostgreSQL bằng Docker Compose

Chạy lệnh sau để build và khởi động toàn bộ cụm (`nginx`, `api-1`, `api-2`, `api-3`, `postgres`, `pgbouncer`, `redis`):

```bash
cd ~/SpeakEnglishChallenge
sudo docker compose up -d --build
sudo docker compose restart nginx
```

---

### Bước 3.5: Khởi tạo Bảng PostgreSQL & Xóa triệt để file `db.json` cũ (Nếu nâng cấp từ bản cũ)

Hệ thống tự động tạo bảng `AppStateStore` và di trú đề thi cũ sang PostgreSQL rồi tự xóa `db.json`. Để chắc chắn 100% các bảng PostgreSQL chuẩn đã được khởi tạo và không còn bất kỳ file `db.json` nào:

```bash
# 1. Đảm bảo toàn bộ bảng chuẩn (User, DailyChallenge, Question, ChallengeAttempt, AppStateStore) đã được tạo trong PostgreSQL
sudo docker compose exec -T postgres psql -U postgres -d speakright < ~/SpeakEnglishChallenge/apps/api/prisma/init.sql

# 2. Xóa vĩnh viễn mọi file db.json cũ trên volume (nếu còn sót từ phiên bản cũ)
sudo docker compose exec api-1 sh -c "rm -f /app/data/db.json /app/data/db.json.tmp*"
```

**Kiểm tra dữ liệu trực tiếp trong PostgreSQL:**
```bash
# Xem danh sách tài khoản trong PostgreSQL
sudo docker compose exec postgres psql -U postgres -d speakright -c 'SELECT "employeeId", "fullName", "email", "role", "totalScore" FROM "User" LIMIT 20;'

# Xem trạng thái lịch thi & đề thi đang lưu trong PostgreSQL AppStateStore
sudo docker compose exec postgres psql -U postgres -d speakright -c 'SELECT "key", "version", "updatedAt" FROM "AppStateStore";'
```

---

## 🌐 4. Hướng Dẫn Setup Frontend (2 Phương Án Tùy Chọn)

Bạn có thể chọn **Phương án A (Frontend trên Vercel)** hoặc **Phương án B (Chạy cả Frontend + Backend ngay trên Máy Ảo nếu đã có Domain)**.

---

### Phương Án A: Chạy Frontend trên Vercel + Backend trên Máy Ảo (Đang dùng)

#### 1. Mở kết nối HTTPS cho Backend trên Máy Ảo bằng Cloudflare Tunnel:
* **Cách 1: Dùng link nhanh miễn phí (`trycloudflare.com`)**
  ```bash
  pkill -f cloudflared || true
  nohup cloudflared tunnel --url http://localhost:80 > ~/cloudflare.log 2>&1 &
  sleep 5
  grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com' ~/cloudflare.log | head -n 1
  ```
* **Cách 2: Gắn Domain cố định vào Cloudflare Tunnel (Khuyên dùng để link không bao giờ đổi khi khởi động lại máy ảo)**
  1. Vào trang quản trị **Cloudflare Zero Trust** ➔ **Networks** ➔ **Tunnels** ➔ **Create a tunnel** (Chọn `Cloudflared`).
  2. Đặt tên Tunnel (VD: `speakright-api`) ➔ Copy câu lệnh cài đặt service có chứa token (`sudo cloudflared service install <TOKEN>`) dán vào SSH máy ảo.
  3. Tại tab **Public Hostname** trên Cloudflare:
     - Subdomain: `api` | Domain: `tenmiencuaban.com` (VD: `https://api.tenmiencuaban.com`)
     - Service Type: `HTTP` | URL: `localhost:80`

#### 2. Kết nối Frontend trên Vercel với Backend:
1. Mở **Vercel Dashboard** ➔ Chọn project **SpeakEnglishChallenge**.
2. Vào **Settings** ➔ **Environment Variables**:
   - Tên biến (`Key`): `VITE_API_URL`
   - Giá trị (`Value`): Link Cloudflare Tunnel hoặc `https://api.tenmiencuaban.com` *(Lưu ý: Không có dấu `/` ở cuối)*.
3. Sang tab **Deployments** ➔ Bấm dấu `...` ở bản build mới nhất ➔ Chọn **Redeploy**.

---

### Phương Án B: Chạy cả Frontend + Backend trực tiếp trong Máy Ảo (Khi đã có Domain riêng)

Trong `docker-compose.yml` và `nginx/nginx.conf` đã được cấu hình sẵn để **Nginx vừa phục vụ giao diện Frontend PWA (`/usr/share/nginx/html`), vừa định tuyến `/api/*` vào 3 container Backend** trên cùng một cổng `80`!

Khi chạy theo Phương án B, Frontend và Backend nằm chung trên 1 Domain (ví dụ `https://speakright.tenmiencuaban.com`), gọi API trực tiếp qua `/api/...` nên **không cần Vercel và không bao giờ bị lỗi CORS**.

#### Các bước thực hiện trên Máy Ảo:

**Bước 1: Cài đặt Node.js 20 trên Máy Ảo (nếu chưa có) để build giao diện Frontend**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

**Bước 2: Build gói giao diện Frontend (`apps/web/dist`) trên Máy Ảo**
```bash
cd ~/SpeakEnglishChallenge
# Để trống VITE_API_URL để Frontend gọi thẳng vào /api trên cùng domain của máy ảo
VITE_API_URL="" npm install
VITE_API_URL="" npm run build:web
```
*(Sau lệnh này, thư mục `~/SpeakEnglishChallenge/apps/web/dist` sẽ tự động được mount vào `/usr/share/nginx/html` của container `speakright-nginx`).*

**Bước 3: Khởi động lại Nginx & Trỏ Domain về Máy Ảo**
```bash
sudo docker compose restart nginx
```
Sau đó bạn chỉ cần trỏ Domain về máy ảo theo 1 trong 2 cách:
* **Qua Cloudflare Tunnel (Tự động có HTTPS miễn phí, không cần mở port Firewall):** Trỏ Public Hostname `speakright.tenmiencuaban.com` về `http://localhost:80`.
* **Qua DNS A Record truyền thống:** Trỏ bản ghi `A` của domain về **External IP** của máy ảo Google Cloud (và bật `Allow HTTP/HTTPS traffic` trong mục Firewall của VM).

---

## 🔑 5. Tài Khoản Quản Trị Viên (Admin CMS) Mặc Định

| Vai trò | Số GEN (8 số) | Mật khẩu | Gmail |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin CMS)** | `88888888` | `Admin@2026` | `admin.speakright@gmail.com` |

* **Cách vào trang Admin:** Đăng nhập bằng tài khoản Admin ➔ Mở tab **Cá nhân (Profile)** ➔ Bấm nút **"Vào Trang Quản Trị"**.

---

## 🧪 6. Kiểm Thử Chịu Tải với Grafana k6 (`load-tests/`)

Bộ kịch bản kiểm thử chịu tải Grafana k6 nằm trong thư mục `load-tests/`:

```bash
# 1. Kiểm tra Smoke Test & độ trễ cơ sở
k6 run -e BASE_URL=https://ten-link-backend-cua-ban load-tests/k6-baseline-smoke.js

# 2. Kiểm tra chịu tải 100 - 300 người thi đồng thời (Lấy đề -> Mở bài -> Nộp bài -> BXH)
k6 run -e BASE_URL=https://ten-link-backend-cua-ban -e MAX_VUS=100 load-tests/k6-exam-throughput.js

# 3. Tự động dọn sạch 100% tài khoản test (GEN 999xxxxx) khỏi PostgreSQL sau khi test
BASE_URL=https://ten-link-backend-cua-ban node load-tests/cleanup-test-users.mjs
```
