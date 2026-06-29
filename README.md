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
