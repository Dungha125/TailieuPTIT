# Deploy TailieuPTIT lên Viettel Cloud VPS

Hướng dẫn chạy **Backend + PostgreSQL + Redis + MinIO** trên VPS Viettel Cloud.  
Frontend deploy riêng trên **Vercel**.

```
Vercel (React)  ──HTTPS──►  api.tenban.com (VPS Viettel Cloud)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               FastAPI         PostgreSQL         Redis
                    │
                    ▼
                 MinIO (lưu file)
```

---

## Phần 1 — Tạo VPS trên Viettel Cloud

### 1.1 Đăng nhập & tạo máy ảo

1. Truy cập [Viettel Cloud](https://viettelcloud.vn) → đăng nhập console.
2. Vào **Elastic Cloud Server (ECS)** hoặc **Cloud Server** → **Tạo máy chủ**.
3. Chọn cấu hình tối thiểu:

| Thông số | Khuyến nghị |
|----------|-------------|
| OS | **Ubuntu 22.04 LTS** |
| CPU | 2 vCPU |
| RAM | **2 GB** (tối thiểu) — 4 GB nếu nhiều user |
| Disk | 40 GB SSD |
| Region | Hà Nội / TP.HCM (gần user nhất) |

4. Tạo hoặc chọn **SSH Key** (khuyến nghị) hoặc dùng mật khẩu root.
5. Gán **Elastic IP** (IP public cố định) — bắt buộc nếu không IP sẽ đổi khi reboot.

### 1.2 Mở port (Security Group / Firewall)

Trong **Security Group** của VPS, mở các port:

| Port | Mục đích |
|------|----------|
| **22** | SSH (chỉ IP của bạn nếu được) |
| **80** | HTTP (Caddy tự redirect HTTPS) |
| **443** | HTTPS (API public) |

**Không mở** port 5432 (Postgres), 6379 (Redis), 9000/9001 (MinIO) ra internet.

### 1.3 Trỏ DNS

Tại nhà cung cấp domain (hoặc DNS Viettel Cloud):

```
api.tenban.com   A   <ELASTIC_IP_VPS>
```

Vercel frontend dùng domain riêng, ví dụ `tenban.com` hoặc `xxx.vercel.app`.

---

## Phần 2 — Cài đặt trên VPS

### 2.1 SSH vào server

```bash
ssh root@<ELASTIC_IP>
# hoặc
ssh ubuntu@<ELASTIC_IP>
```

### 2.2 Cập nhật hệ thống & cài Docker

```bash
sudo apt update && sudo apt upgrade -y

# Cài Docker (official)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Cài Docker Compose plugin
sudo apt install -y docker-compose-plugin git

# Đăng xuất SSH rồi vào lại để group docker có hiệu lực
exit
```

SSH lại và kiểm tra:

```bash
docker --version
docker compose version
```

### 2.3 Clone mã nguồn

```bash
sudo mkdir -p /opt/tailieuptit
sudo chown $USER:$USER /opt/tailieuptit
cd /opt/tailieuptit

git clone https://github.com/<user>/<repo>.git .
# Hoặc upload code bằng scp:
# scp -r ./docportal/* user@IP:/opt/tailieuptit/
```

### 2.4 Tạo file `.env`

```bash
cd /opt/tailieuptit
cp .env.production.example .env
nano .env
```

Nội dung mẫu (đổi toàn bộ mật khẩu):

```env
POSTGRES_USER=tailieuptit
POSTGRES_PASSWORD=MatKhauPostgres_ManH_2026!
POSTGRES_DB=tailieuptit

MINIO_ROOT_USER=tailieuptit_minio
MINIO_ROOT_PASSWORD=MatKhauMinio_ManH_2026!

JWT_SECRET_KEY=chuoi-ngau-nhien-dai-it-nhat-32-ky-tu-abc123xyz
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MatKhauAdmin_ManH_2026!

# Domain frontend trên Vercel (có https)
CORS_ORIGINS=https://tenban.vercel.app,https://tenban.com
DOMAIN=api.tenban.com
```

> `CORS_ORIGINS` phải khớp **chính xác** URL Vercel (kể cả `https://`, không dấu `/` cuối).

### 2.5 Chạy stack Docker

```bash
cd /opt/tailieuptit
docker compose -f docker-compose.vps.yml --env-file .env up -d --build
```

Kiểm tra container:

```bash
docker compose -f docker-compose.vps.yml ps
```

Kỳ vọng: 4 container `running` (postgres, redis, minio, backend).

Test API nội bộ:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok"}
```

---

## Phần 3 — HTTPS với Caddy (khuyến nghị)

Backend đang listen `127.0.0.1:8000`. Caddy trên host nhận HTTPS public và proxy vào backend.

### 3.1 Cài Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

### 3.2 Cấu hình Caddy

```bash
sudo nano /etc/caddy/Caddyfile
```

Dán (sửa domain):

```
api.tenban.com {
    reverse_proxy 127.0.0.1:8000
}
```

Khởi động lại:

```bash
sudo systemctl reload caddy
sudo systemctl enable caddy
```

Caddy tự xin chứng chỉ Let's Encrypt khi DNS đã trỏ đúng IP.

Test:

```bash
curl https://api.tenban.com/health
```

---

## Phần 4 — Cấu hình Vercel (Frontend)

1. Vercel → Project → **Settings** → **Environment Variables**:

```
VITE_API_URL = https://api.tenban.com
```

2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. Redeploy project.

Truy cập admin: `https://tenban.vercel.app/internal-admin-portal/login`

---

## Phần 5 — Kiểm tra end-to-end

| Bước | Lệnh / Hành động | Kỳ vọng |
|------|------------------|---------|
| Health API | `curl https://api.tenban.com/health` | `{"status":"ok"}` |
| API docs | Mở `https://api.tenban.com/docs` | Swagger UI |
| Danh sách tài liệu | Mở frontend → trang Tài liệu | Không lỗi CORS |
| Đăng nhập admin | `/internal-admin-portal/login` | Login thành công |
| Upload file | Admin → Upload | File lưu vào MinIO |

---

## Phần 6 — Vận hành hàng ngày

### Xem log

```bash
cd /opt/tailieuptit
docker compose -f docker-compose.vps.yml logs -f backend
docker compose -f docker-compose.vps.yml logs -f minio
```

### Cập nhật code

```bash
cd /opt/tailieuptit
git pull
docker compose -f docker-compose.vps.yml --env-file .env up -d --build
```

### Backup Postgres

```bash
docker exec tailieuptit-postgres pg_dump -U tailieuptit tailieuptit > backup_$(date +%Y%m%d).sql
```

### Backup MinIO data

```bash
docker run --rm -v tailieuptit_minio_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/minio_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Restart toàn bộ

```bash
docker compose -f docker-compose.vps.yml restart
```

---

## Phần 7 — Xử lý lỗi thường gặp

### Lỗi CORS trên trình duyệt

- Kiểm tra `CORS_ORIGINS` trong `.env` có đúng URL Vercel.
- Restart backend: `docker compose -f docker-compose.vps.yml restart backend`

### `curl: connection refused` port 8000 từ ngoài

- Đúng thiết kế: port 8000 chỉ bind localhost. Dùng `https://api.tenban.com` qua Caddy.

### Container backend restart liên tục

```bash
docker compose -f docker-compose.vps.yml logs backend
```

Thường do Postgres chưa sẵn sàng hoặc sai `DATABASE_URL` / mật khẩu `.env`.

### Upload thành công nhưng preview ảnh/PDF lỗi

Presigned URL MinIO trỏ hostname nội bộ `minio:9000`. Cần thêm biến public endpoint (liên hệ để cấu hình thêm `MINIO_PUBLIC_ENDPOINT`).

### Hết RAM

```bash
free -h
docker stats
```

Nâng cấp VPS lên 4GB hoặc giới hạn container.

---

## Tóm tắt nhanh

```bash
# Trên Viettel Cloud VPS
git clone <repo> /opt/tailieuptit && cd /opt/tailieuptit
cp .env.production.example .env && nano .env
docker compose -f docker-compose.vps.yml --env-file .env up -d --build

# Caddy: api.tenban.com → 127.0.0.1:8000

# Trên Vercel
VITE_API_URL=https://api.tenban.com
```

| Thành phần | Ở đâu |
|------------|-------|
| Frontend | Vercel |
| Backend API | VPS — `https://api.tenban.com` |
| PostgreSQL | Docker trên VPS (nội bộ) |
| Redis | Docker trên VPS (nội bộ) |
| MinIO | Docker trên VPS (nội bộ) |
