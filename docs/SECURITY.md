# Security Hardening Guide — TailieuPTIT

> **Stack thực tế:** React (Vite) + **FastAPI** + PostgreSQL + Redis + MinIO + Docker/Caddy  
> (Không phải Laravel — các biện pháp được triển khai theo FastAPI.)

## Đã triển khai trong codebase

### Backend (FastAPI)

| Tính năng | Mô tả |
|-----------|--------|
| **Rate limiting** | Middleware Redis sliding-window: login 5/phút, upload 10/phút, search 60/phút, API 100/phút |
| **Auto-ban IP** | Ban 30 phút khi vượt burst hoặc brute-force login |
| **Login lockout** | 5 lần sai → ban IP |
| **Security headers** | HSTS, X-Frame-Options, CSP, Referrer-Policy, nosniff |
| **TrustedHost** | Cấu hình qua `TRUSTED_HOSTS` |
| **Body size limit** | Chặn request quá lớn tại middleware |
| **File upload validation** | Allowlist extension + magic bytes, chặn php/js/exe/sh |
| **Random object names** | UUID-based MinIO keys |
| **Per-IP download limit** | Redis counter theo `X-Forwarded-For` |
| **Fail-closed rate limit** | Redis lỗi → từ chối request (cấu hình được) |
| **Request logging** | `X-Request-Id`, log auth/upload/429/403 |
| **OpenAPI ẩn** | `/docs` tắt khi `ENVIRONMENT=production` |
| **Turnstile (tùy chọn)** | `TURNSTILE_SECRET_KEY` cho captcha login |
| **JWT** | Hết hạn mặc định 8h (`JWT_EXPIRE_MINUTES=480`) |

### Frontend (React)

| Tính năng | Mô tả |
|-----------|--------|
| **ProtectedRoute** | Validate token qua `/auth/me` |
| **Submit lock** | Chống double-submit login |
| **Idempotency key** | Header cho POST/PUT/DELETE |
| **429/403 handling** | Thông báo rate limit / ban |
| **Domain validation** | Cảnh báo host lạ (anti-phishing) |
| **Vercel security headers** | CSP, HSTS, X-Frame-Options |
| **Build hardening** | Terser minify, drop console, code splitting |

### Infrastructure

| File | Mô tả |
|------|--------|
| `deploy/nginx-api.conf` | limit_req, limit_conn, timeouts, body size |
| `deploy/Caddyfile` | HTTPS proxy + security headers |
| `frontend/nginx.conf` | CSP + proxy headers |
| `docker-compose.vps.yml` | Redis password, production env |
| `backend/Dockerfile` | Non-root user, healthcheck, proxy-headers |

---

## Biến môi trường bảo mật

Xem `.env.production.example`. Bắt buộc đổi trước khi deploy:

- `JWT_SECRET_KEY`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD`, `REDIS_PASSWORD`
- `CORS_ORIGINS` — chỉ domain frontend thật
- `TRUSTED_HOSTS` — domain API
- `ENVIRONMENT=production`

---

## Triển khai VPS (checklist)

```bash
# 1. Firewall
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 2. Caddy + HTTPS
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy

# 3. Docker với .env production
docker compose -f docker-compose.vps.yml --env-file .env up -d --build

# 4. Fail2Ban (tùy chọn)
sudo apt install fail2ban
# Tạo jail cho nginx/caddy 401/403/429
```

### Cloudflare (khuyến nghị)

- Bật proxy orange cloud cho API + frontend
- WAF managed rules
- Rate limiting rules
- Turnstile cho trang login admin

---

## Giới hạn cần hiểu

1. **Frontend không thể ẩn hoàn toàn** — chỉ minify/obfuscate; secrets không được đặt trong bundle.
2. **JWT trong localStorage** — an toàn hơn nếu chuyển sang httpOnly cookie (cần refactor CSRF).
3. **MinIO** — buckets private, file chỉ qua backend proxy; không public bucket policy.
4. **Antivirus scan** — hook placeholder: tích hợp ClamAV container nếu cần compliance.

---

## Rate limit rules

| Route | Limit | Window |
|-------|-------|--------|
| `POST /auth/login` | 5 | 60s |
| `POST /admin/upload` | 10 | 60s |
| `GET /documents/search` | 60 | 60s |
| Mọi route khác | 100 | 60s |
| Download | 30 | 60s (per IP) |

Vượt burst nhiều lần → ban IP 30 phút (Redis key `ban:ip:{ip}`).

---

## Giám sát

- Security events: Redis list `security:events` (10k entries)
- Application logs: request_id, IP, status, duration
- Khuyến nghị: ship logs tới Loki/Datadog/Sentry

---

## Báo cáo lỗ hổng

Liên hệ admin hệ thống. Không công khai JWT secrets hoặc `.env` trên repository.
