# Deploy TailieuPTIT lên DigitalOcean

Hướng dẫn chạy **Backend + PostgreSQL + Redis + MinIO** trên **DigitalOcean Droplet**.  
Frontend deploy riêng trên **Vercel**.

```
Vercel (React)  ──HTTPS──►  api.tenban.com (Droplet DigitalOcean)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               FastAPI         PostgreSQL         Redis
                    │
                    ▼
                 MinIO (lưu file)
```

---

## Phần 1 — Tạo Droplet trên DigitalOcean

### 1.1 Đăng ký & đăng nhập

1. Truy cập [digitalocean.com](https://www.digitalocean.com) → **Sign Up**.
2. Xác minh email + thêm thẻ (tài khoản mới thường có **$200 credit / 60 ngày**).
3. Vào [Cloud Panel](https://cloud.digitalocean.com).

### 1.2 Tạo SSH Key (trên máy Windows)

Mở **PowerShell**:

```powershell
ssh-keygen -t ed25519 -C "tailieuptit" -f $env:USERPROFILE\.ssh\tailieuptit_do
```

Copy public key:

```powershell
Get-Content $env:USERPROFILE\.ssh\tailieuptit_do.pub
```

Trên DigitalOcean: **Settings → Security → SSH Keys → Add SSH Key**  
- Name: `tailieuptit`  
- Paste nội dung file `.pub`

### 1.3 Tạo Droplet

**Create → Droplets** (hoặc [link trực tiếp](https://cloud.digitalocean.com/droplets/new))

| Mục | Chọn |
|-----|------|
| **Region** | **Singapore** (`SGP1`) — gần Việt Nam |
| **Image** | **Ubuntu 22.04 (LTS) x64** |
| **Size** | **Basic → Regular** |
| | Khuyến nghị: **$12/mo** — 2 GB RAM / 1 vCPU / 50 GB SSD |
| | Tối thiểu: $6/mo — 1 GB RAM (hơi chật) |
| **Authentication** | SSH Key `tailieuptit` |
| **Hostname** | `tailieuptit` |
| **Backups** | Tắt (hoặc bật nếu cần, +20% giá) |

Bấm **Create Droplet**. Sau ~1 phút bạn có **Public IPv4** (ví dụ `164.92.xxx.xxx`).

### 1.4 Tạo Cloud Firewall

**Networking → Firewalls → Create Firewall**

**Inbound rules:**

| Type | Protocol | Port | Sources |
|------|----------|------|---------|
| SSH | TCP | 22 | All IPv4 (hoặc chỉ IP nhà bạn) |
| HTTP | TCP | 80 | All IPv4 |
| HTTPS | TCP | 443 | All IPv4 |

**Outbound rules:** giữ mặc định (All traffic).

**Apply to Droplets:** chọn `tailieuptit`.

> **Không mở** port 5432, 6379, 9000, 9001.

### 1.5 Trỏ DNS

Tại nhà cung cấp domain (Cloudflare, Namecheap, …):

```
api.tenban.com   A   164.92.xxx.xxx   (IP Droplet)
```

Frontend Vercel dùng domain riêng: `tenban.com` hoặc `xxx.vercel.app`.

---

## Phần 2 — SSH vào Droplet

```powershell
ssh -i $env:USERPROFILE\.ssh\tailieuptit_do root@<IP_DROPLET>
```

Lần đầu hỏi fingerprint → gõ `yes`.

Nếu dùng Git Bash / WSL:

```bash
ssh -i ~/.ssh/tailieuptit_do root@<IP_DROPLET>
```

---

## Phần 3 — Cài Docker trên Droplet

```bash
apt update && apt upgrade -y

curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git

docker --version
docker compose version
```

---

## Phần 4 — Đưa code lên server

### Cách A: Git clone (khuyến nghị)

```bash
mkdir -p /opt/tailieuptit
cd /opt/tailieuptit
git clone https://github.com/<user>/<repo>.git .
```

### Cách B: Upload từ máy local (SCP)

Trên Windows PowerShell (từ thư mục project):

```powershell
scp -i $env:USERPROFILE\.ssh\tailieuptit_do -r e:\DEV\docportal\* root@<IP_DROPLET>:/opt/tailieuptit/
```

---

## Phần 5 — Cấu hình `.env`

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

# URL frontend trên Vercel (HTTPS, phân cách bằng dấu phẩy)
CORS_ORIGINS=https://tailieuptit.vercel.app,https://tenban.com
DOMAIN=api.tenban.com
```

> `CORS_ORIGINS` phải khớp **chính xác** URL Vercel (có `https://`, không `/` cuối).

---

## Phần 6 — Chạy Backend stack

```bash
cd /opt/tailieuptit
docker compose -f docker-compose.vps.yml --env-file .env up -d --build
```

Kiểm tra:

```bash
docker compose -f docker-compose.vps.yml ps
curl http://127.0.0.1:8000/health
```

Kỳ vọng: `{"status":"ok"}`

4 container phải `running`: `postgres`, `redis`, `minio`, `backend`.

---

## Phần 7 — HTTPS với Caddy

Backend chỉ listen `127.0.0.1:8000`. Caddy nhận HTTPS public và proxy vào backend.

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Sửa Caddyfile:

```bash
nano /etc/caddy/Caddyfile
```

```caddy
api.tenban.com {
    reverse_proxy 127.0.0.1:8000
}
```

```bash
systemctl reload caddy
systemctl enable caddy
```

> DNS `api.tenban.com` phải trỏ đúng IP Droplet **trước** khi Caddy xin SSL Let's Encrypt.

Test:

```bash
curl https://api.tenban.com/health
```

Mở trình duyệt: `https://api.tenban.com/docs` → Swagger UI.

---

## Phần 8 — Cấu hình Vercel (Frontend)

1. [vercel.com](https://vercel.com) → Import repo
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://api.tenban.com` |

6. **Deploy** (hoặc Redeploy sau khi thêm env).

Truy cập admin: `https://<domain-vercel>/internal-admin-portal/login`

---

## Phần 9 — Kiểm tra end-to-end

| Bước | Hành động | Kỳ vọng |
|------|-----------|---------|
| 1 | `curl https://api.tenban.com/health` | `{"status":"ok"}` |
| 2 | Mở frontend Vercel → Tài liệu | Không lỗi CORS |
| 3 | Đăng nhập admin | Thành công |
| 4 | Upload file PDF/ảnh | Thành công |
| 5 | Download file | Tải được |

---

## Phần 10 — Vận hành

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

### Restart

```bash
docker compose -f docker-compose.vps.yml restart
```

### Backup PostgreSQL

```bash
docker exec tailieuptit-postgres pg_dump -U tailieuptit tailieuptit > /root/backup_$(date +%Y%m%d).sql
```

### Backup MinIO

```bash
docker run --rm \
  -v tailieuptit_minio_data:/data \
  -v /root:/backup \
  alpine tar czf /backup/minio_$(date +%Y%m%d).tar.gz -C /data .
```

### Nâng cấp Droplet (khi hết RAM)

DigitalOcean Panel → Droplet → **Resize** → chọn plan lớn hơn (ví dụ $18 hoặc $24/mo).

---

## Xử lý lỗi thường gặp

### CORS error trên trình duyệt

- Kiểm tra `CORS_ORIGINS` trong `.env` có đúng URL Vercel.
- Restart backend:
  ```bash
  docker compose -f docker-compose.vps.yml restart backend
  ```

### Caddy không xin được SSL

- DNS chưa trỏ đúng IP Droplet → đợi propagate (5–30 phút).
- Port 80/443 bị chặn → kiểm tra Cloud Firewall.

### `docker compose up` báo lỗi build

```bash
docker compose -f docker-compose.vps.yml logs backend
```

Thường do sai mật khẩu `.env` hoặc thiếu RAM (nâng lên 2GB).

### Upload OK nhưng preview ảnh/PDF lỗi

Presigned URL MinIO trỏ hostname nội bộ. Cần cấu hình thêm `MINIO_PUBLIC_ENDPOINT` (liên hệ để bổ sung).

### Hết dung lượng disk

```bash
df -h
docker system df
```

Dọn image cũ: `docker system prune -a` (cẩn thận). Hoặc resize Droplet / thêm Volume trên DigitalOcean.

---

## Chi phí ước tính

| Hạng mục | Giá |
|----------|-----|
| Droplet 2GB (Singapore) | **$12/tháng** |
| Vercel Frontend | Free |
| Domain | ~$10–15/năm (tuỳ chọn) |
| Credit mới | $200 / 60 ngày (đủ test lâu) |

---

## Tóm tắt nhanh

```bash
# 1. Tạo Droplet Ubuntu 22.04, Singapore, $12/mo, SSH key
# 2. Firewall: mở 22, 80, 443
# 3. DNS: api.tenban.com → IP Droplet

ssh -i ~/.ssh/tailieuptit_do root@<IP>
apt update && curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git
git clone <repo> /opt/tailieuptit && cd /opt/tailieuptit
cp .env.production.example .env && nano .env
docker compose -f docker-compose.vps.yml --env-file .env up -d --build

# Caddy: api.tenban.com → 127.0.0.1:8000

# Vercel: VITE_API_URL=https://api.tenban.com
```

| Thành phần | Nơi deploy |
|------------|------------|
| Frontend | Vercel |
| Backend API | DigitalOcean Droplet |
| PostgreSQL | Docker trên Droplet |
| Redis | Docker trên Droplet |
| MinIO | Docker trên Droplet |
