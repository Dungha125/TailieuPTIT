# TailieuPTIT - Hệ thống quản lý tài liệu công khai

Fullstack document management system **TailieuPTIT** — React + FastAPI + PostgreSQL + MinIO + Redis.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), React Router, Axios, Ant Design, SCSS |
| Backend | FastAPI, SQLAlchemy, JWT Auth |
| Database | PostgreSQL |
| Storage | MinIO (public-documents, public-images) |
| Cache | Redis |

## Cấu trúc thư mục

```
tailieuptit/   (thư mục dự án: docportal/)
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── dependencies.py
│       ├── models/          # User, Document, Tag
│       ├── schemas/         # Pydantic schemas
│       ├── routers/         # auth, documents, admin
│       ├── services/        # minio, redis, document
│       └── utils/           # security, hash
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/
        ├── components/
        ├── pages/
        ├── pages/admin/
        └── styles/
```

## Chạy với Docker Compose

```bash
cd docportal   # thư mục dự án TailieuPTIT
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin123) |

### Tài khoản Admin mặc định

- URL: http://localhost:3000/internal-admin-portal/login
- Username: `admin`
- Password: `admin123`

## Chạy development (local)

### Backend

```bash
cd backend
pip install -r requirements.txt
# Cần PostgreSQL, Redis, MinIO đang chạy
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

## API Endpoints

### Auth
- `POST /auth/login` - Đăng nhập admin
- `GET /auth/me` - Thông tin user (JWT required)

### Public
- `GET /documents` - Danh sách tài liệu (pagination)
- `GET /documents/{id}` - Chi tiết tài liệu
- `GET /documents/tag/{tag}` - Lọc theo tag
- `GET /documents/unclassified` - Tài liệu chưa phân loại
- `GET /documents/search?q=` - Tìm kiếm
- `GET /documents/download/{id}` - Download file
- `GET /documents/preview/{id}` - Presigned URL preview
- `GET /documents/tags/all` - Danh sách tags
- `GET /documents/hot` - Top downloads
- `GET /documents/recent` - Mới upload

### Admin (JWT required)
- `POST /admin/upload` - Upload file (multi-file)
- `POST /admin/tags` - Tạo tag mới
- `GET /admin/documents` - Danh sách tất cả tài liệu
- `PUT /admin/documents/{id}` - Cập nhật metadata
- `DELETE /admin/documents/{id}` - Xóa tài liệu

## Tính năng

- Upload drag & drop, multi-file
- Preview ảnh/PDF
- Duplicate detection (SHA-256 hash)
- Redis cache (documents 5 phút, tags 30 phút)
- Rate limit download
- Hot ranking & recent uploads
- Infinite scroll pagination
- Public/Private visibility
- Auto tag "Chưa phân loại"

## Theme

- Primary: `#C62828`
- Secondary: `#FFFFFF`
- Accent: `#EF5350`

---

## Deploy lên server (Production)

### Kiến trúc kết nối

```
Người dùng (trình duyệt)
        │
        ▼
   Frontend (Nginx :80)  ── /api/* ──►  Backend (FastAPI :8000)
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        ▼                     ▼                     ▼
                   PostgreSQL              Redis                  MinIO
                   (metadata)            (cache)              (file lưu trữ)
```

- **Frontend** chỉ serve giao diện React; mọi request API đi qua `/api` → Nginx proxy sang Backend.
- **Backend** kết nối Postgres, Redis, MinIO qua **tên service Docker** (`postgres`, `redis`, `minio`) — không cần IP public.
- **MinIO** lưu file thật (PDF, ảnh, DOCX…); Postgres chỉ lưu metadata (tên, tag, đường dẫn object…).

### Cách 1: Một VPS + Docker Compose (khuyến nghị)

Phù hợp VPS (DigitalOcean, Vultr, Viettel Cloud, …) RAM ≥ 2GB.

> **CloudNest + Vercel:** [docs/DEPLOY-CLOUDNEST.md](docs/DEPLOY-CLOUDNEST.md)  
> **DigitalOcean + Vercel:** [docs/DEPLOY-DIGITALOCEAN.md](docs/DEPLOY-DIGITALOCEAN.md)  
> **Viettel Cloud + Vercel:** [docs/DEPLOY-VIETTEL-CLOUD.md](docs/DEPLOY-VIETTEL-CLOUD.md)

**Frontend trên Vercel, backend stack trên VPS:**

```bash
docker compose -f docker-compose.vps.yml --env-file .env up -d --build
```

**Frontend + backend cùng VPS:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

**Bước 1 — Chuẩn bị server**

```bash
# Trên Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git
sudo systemctl enable docker && sudo systemctl start docker
```

**Bước 2 — Đưa code lên server**

```bash
git clone <repo-cua-ban> /opt/tailieuptit
cd /opt/tailieuptit
cp .env.production.example .env
nano .env   # đổi mật khẩu, domain, JWT secret
```

**Bước 3 — Chạy production**

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

**Bước 4 — Mở firewall**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # nếu dùng HTTPS
```

Truy cập: `http://IP-SERVER` hoặc domain trỏ về IP đó.

**Bước 5 — HTTPS (khuyến nghị)**

Dùng Caddy hoặc Nginx reverse proxy phía trước, hoặc certbot:

```bash
# Ví dụ Caddy (cài riêng trên host, proxy vào :80 của container)
# tailieu.ptit.edu.vn { reverse_proxy localhost:80 }
```

Nhớ cập nhật `CORS_ORIGINS=https://domain-cua-ban` trong `.env` rồi restart backend:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Cách 2: Tách Frontend / Backend (nâng cao)

| Thành phần | Gợi ý hosting | Kết nối |
|------------|---------------|---------|
| Frontend | Vercel, Netlify, Nginx static | Build với `VITE_API_URL=https://api.domain.com` |
| Backend | Railway, Render, Fly.io, VPS | Biến môi trường trỏ DB/Redis/MinIO |
| PostgreSQL | Supabase, Neon, RDS, VPS | `DATABASE_URL=postgresql://...` |
| Redis | Upstash, Redis Cloud, VPS | `REDIS_URL=redis://...` |
| MinIO / S3 | MinIO trên VPS, AWS S3 | `MINIO_ENDPOINT`, access key |

Backend **bắt buộc** có đủ 3 dịch vụ: Postgres + Redis + MinIO (hoặc S3 tương thích).

Ví dụ biến môi trường backend khi deploy tách:

```env
DATABASE_URL=postgresql://user:pass@db-host:5432/tailieuptit
REDIS_URL=redis://redis-host:6379/0
MINIO_ENDPOINT=minio-host:9000
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_SECURE=false
CORS_ORIGINS=https://tailieu.ptit.edu.vn
JWT_SECRET_KEY=...
```

### Kiểm tra sau deploy

```bash
# Health backend (từ trong mạng Docker)
docker exec tailieuptit-backend curl -s http://localhost:8000/health

# Xem log
docker compose -f docker-compose.prod.yml logs -f backend

# MinIO console (chỉ khi expose port 9001 — không khuyến nghị public)
# Upload thử file qua /internal-admin-portal
```

### Lưu ý bảo mật production

1. Đổi **tất cả** mật khẩu mặc định trong `.env`
2. Không public port Postgres (5432), Redis (6379) ra internet
3. Dùng `docker-compose.prod.yml` — Postgres/Redis/MinIO chỉ trong mạng `internal`
4. Đổi `JWT_SECRET_KEY` thành chuỗi ngẫu nhiên dài
5. Bật HTTPS trước khi đưa lên môi trường thật

