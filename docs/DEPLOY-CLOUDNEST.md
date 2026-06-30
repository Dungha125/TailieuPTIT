# Deploy TailieuPTIT lên CloudNest VPS

Hướng dẫn chạy **Backend + PostgreSQL + Redis + MinIO** trên [CloudNest](https://cloudnest.vn) VPS.  
Frontend deploy riêng trên **Vercel**.

- Website: [cloudnest.vn](https://cloudnest.vn)
- Portal quản lý: [client.cloudnest.vn](https://client.cloudnest.vn/)

```
Vercel (React)  ──HTTPS──►  api.tenban.com (CloudNest VPS)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               FastAPI         PostgreSQL         Redis
                    │
                    ▼
                 MinIO (lưu file)
```

---

## Phần 1 — Đăng ký & mua VPS

### 1.1 Tạo tài khoản

1. Truy cập [client.cloudnest.vn](https://client.cloudnest.vn/) → **Đăng ký ngay**
2. Xác minh email, đăng nhập Portal

### 1.2 Chọn gói VPS

Vào **Đăng ký dịch vụ → Cloud VPS** hoặc [cloudnest.vn](https://cloudnest.vn) → Xem bảng giá.

| Gói khuyến nghị | Cấu hình | Giá |
|-----------------|----------|-----|
| **Cloud VPS 2-4-60** (phổ biến) | 2 vCPU, **4 GB RAM**, 60 GB NVMe | **~160.000đ/tháng** |
| Gói nhỏ hơn | 1 vCPU, 1–2 GB RAM | ~80.000đ/tháng (hơi chật) |

> 4GB RAM dư sức chạy Backend + Postgres + Redis + MinIO.

### 1.3 Cấu hình khi đặt hàng

| Mục | Chọn |
|-----|------|
| **Hệ điều hành** | **Ubuntu 22.04** |
| **Datacenter** | Hà Nội / TP.HCM (gần user nhất) |
| **IPv4** | Có (mặc định 1 IP public) |

Thanh toán → VPS kích hoạt **tự động** sau vài phút (email + thông tin trong Portal).

### 1.4 Lấy thông tin đăng nhập

Trên [client.cloudnest.vn](https://client.cloudnest.vn/):

1. **Dịch vụ của tôi** → chọn VPS `tailieuptit`
2. Ghi lại:
   - **IP public** (ví dụ `103.xxx.xxx.xxx`)
   - **Username**: thường là `root`
   - **Mật khẩu** hoặc SSH key (nếu đã cấu hình)

### 1.5 Firewall trên CloudNest

Trong Portal VPS → **Firewall / Bảo mật** (nếu có), mở:

| Port | Mục đích |
|------|----------|
| **22** | SSH |
| **80** | HTTP (Caddy SSL) |
| **443** | HTTPS API |

**Không mở** 5432, 6379, 9000, 9001.

Nếu Portal không có firewall riêng, dùng `ufw` trên server (xem Phần 2).

### 1.6 Trỏ DNS

```
api.tenban.com   A   <IP_VPS_CLOUDNEST>
```

Frontend Vercel: domain riêng (`tenban.com` hoặc `xxx.vercel.app`).

---

## Phần 2 — SSH vào VPS

### Windows PowerShell

```powershell
ssh root@<IP_VPS>
# Nhập mật khẩu từ email/Portal
```

### Bật firewall (khuyến nghị)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

---

## Phần 3 — Cài Docker

```bash
apt update && apt upgrade -y

curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin git

docker --version
docker compose version
```

---

## Phần 4 — Đưa code lên server

### Cách A: Git clone

```bash
mkdir -p /opt/tailieuptit && cd /opt/tailieuptit
git clone https://github.com/<user>/<repo>.git .
```

### Cách B: Upload từ máy Windows (SCP)

```powershell
scp -r e:\DEV\docportal\* root@<IP_VPS>:/opt/tailieuptit/
```

---

## Phần 5 — Cấu hình `.env`

```bash
cd /opt/tailieuptit
cp .env.production.example .env
nano .env
```

```env
POSTGRES_USER=tailieuptit
POSTGRES_PASSWORD=MatKhauPostgres_ManH_2026!
POSTGRES_DB=tailieuptit

MINIO_ROOT_USER=tailieuptit_minio
MINIO_ROOT_PASSWORD=MatKhauMinio_ManH_2026!

JWT_SECRET_KEY=chuoi-ngau-nhien-dai-it-nhat-32-ky-tu
ADMIN_USERNAME=admin
ADMIN_PASSWORD=MatKhauAdmin_ManH_2026!

# URL frontend Vercel (HTTPS, phân cách dấu phẩy)
CORS_ORIGINS=https://tailieuptit.vercel.app,https://tenban.com
DOMAIN=api.tenban.com
```

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

Kỳ vọng: `{"status":"ok"}` và 4 container `running`.

---

## Phần 7 — HTTPS với Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

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

> DNS `api.tenban.com` phải trỏ đúng IP VPS trước khi Caddy xin SSL.

```bash
curl https://api.tenban.com/health
```

---

## Phần 8 — Cấu hình Vercel

| Setting | Giá trị |
|---------|---------|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env | `VITE_API_URL=https://api.tenban.com` |

Redeploy sau khi thêm biến môi trường.

Admin: `https://<vercel-domain>/internal-admin-portal/login`

---

## Phần 9 — Quản lý qua CloudNest Portal

Trên [client.cloudnest.vn](https://client.cloudnest.vn/) bạn có thể:

| Thao tác | Mô tả |
|----------|--------|
| Bật / Tắt / Restart | Khởi động lại VPS |
| Console (VNC) | Truy cập khi SSH lỗi |
| Cài lại OS | Ubuntu 22.04 miễn phí |
| Nâng cấp | Tăng CPU/RAM/SSD không downtime |
| Gia hạn | Thanh toán VNĐ, MoMo, chuyển khoản |

---

## Phần 10 — Vận hành

```bash
# Log
docker compose -f docker-compose.vps.yml logs -f backend

# Cập nhật code
git pull && docker compose -f docker-compose.vps.yml --env-file .env up -d --build

# Backup DB
docker exec tailieuptit-postgres pg_dump -U tailieuptit tailieuptit > /root/backup.sql
```

---

## Xử lý lỗi

### CORS trên trình duyệt
- Kiểm tra `CORS_ORIGINS` khớp URL Vercel
- `docker compose -f docker-compose.vps.yml restart backend`

### Không SSH được
- Kiểm tra IP, mật khẩu trong Portal
- Dùng **Console** trên client.cloudnest.vn

### Container restart liên tục
```bash
docker compose -f docker-compose.vps.yml logs backend
```
Thường do sai `.env` hoặc thiếu RAM.

### Vercel gọi API chậm
CloudNest băng thông quốc tế ~10Mbps — user VN truy cập API nhanh; Vercel (server nước ngoài) gọi API VN có thể chậm hơn một chút. User cuối ở VN vẫn ổn.

---

## Chi phí ước tính

| Hạng mục | Giá |
|----------|-----|
| CloudNest VPS 2-4-60 | **~160.000đ/tháng** (+ VAT 10%) |
| Vercel Frontend | Free |
| Domain | ~100–300k/năm |

---

## Tóm tắt nhanh

```
1. Đăng ký client.cloudnest.vn
2. Mua Cloud VPS 2-4-60, Ubuntu 22.04
3. SSH → cài Docker → clone code → .env → docker compose up
4. Caddy: api.tenban.com → 127.0.0.1:8000
5. Vercel: VITE_API_URL=https://api.tenban.com
```

| Thành phần | Nơi deploy |
|------------|------------|
| Frontend | Vercel |
| Backend + DB + Redis + MinIO | CloudNest VPS |
