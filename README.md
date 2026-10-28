# FASE – Hệ thống hỗ trợ phòng Sales chia & chăm sóc LEAD

Dựng theo khuôn dự án ReviseHOU:

| Thư mục | Công nghệ | Vai trò |
|---|---|---|
| `fase-be` | NestJS 11 + TypeORM + PostgreSQL | API cho Fase-Sales (`/api`, JWT) **và** Fase-CRM render server (`/cms`, Handlebars + AdminLTE, session) |
| `fase-fe` | React 19 + Vite + React Query + react-hook-form/zod | **Fase-Sales** – web cho nhân viên |
| `docker-compose.yml` | db + api + web (nginx) | Chạy toàn bộ hệ thống |

Phạm vi hiện tại là **Phase 1: chia LEAD & chăm sóc LEAD** (xem `docs/PHASE1.md`). Dashboard đầy đủ và AI để phase sau.

## Chạy nhanh bằng Docker

```bash
cp fase-be/.env.example fase-be/.env      # sửa SECRET_KEY / REFRESH_TOKEN_SECRET / SESSION_SECRET
docker compose up -d --build
docker compose exec api node dist/database/seed.js   # tạo tài khoản mẫu + 30 LEAD
```

- Fase-Sales: http://localhost:8080
- Fase-CRM: http://localhost:8080/cms
- Swagger: http://localhost:8080/swagger

## Chạy dev (giống ReviseHOU)

```bash
docker compose up -d db                   # PostgreSQL ở cổng 5433

cd fase-be
npm install
cp .env.example .env
npm run seed                              # tài khoản mẫu + LEAD mẫu
npm run dev                               # http://localhost:4000 (/cms, /api, /swagger)

cd ../fase-fe
npm install
npm run dev                               # http://localhost:5173
```

Hoặc chạy `start-dev.bat` ở thư mục gốc (Windows) để bật cả DB, API và FE.

## Tài khoản mẫu (mật khẩu chung `Fase@123`)

| Username | Vai trò | Dùng ở |
|---|---|---|
| `truongphong` | Trưởng phòng (manager) | Fase-CRM `/cms` |
| `sales1`, `sales2`, `sales3` | Nhân viên Sales, thuộc `truongphong` | Fase-Sales |

Hệ thống không có đăng ký – quản trị viên tạo tài khoản trực tiếp trong DB (bảng `user`, mật khẩu bcrypt). Có thể sửa `src/database/seed.ts` hoặc insert tay, `manager_id` của sales trỏ tới trưởng phòng.

## Test

```bash
cd fase-be && npm test     # giờ hành chính, bảng chuyển trạng thái, x/7, chia LEAD, import xlsx
```

## Cấu hình nghiệp vụ (`fase-be/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `BUSINESS_DAYS` | `1,2,3,4,5` | Ngày làm việc (0 = CN) |
| `BUSINESS_HOURS` | `08:00-12:00,13:30-17:30` | Khung giờ hành chính để tính hạn nhận 2h |
| `HOLIDAYS` | rỗng | Ngày lễ `YYYY-MM-DD,...` |
| `SCHEDULER_ENABLED` | `true` | Bật job nền (trả LEAD quá hạn, BR-03, nhắc nhở) |
| `DB_SYNCHRONIZE` | `true` | TypeORM tự tạo bảng (giống ReviseHOU); production nên tắt và dùng migration |

Các giả định đang dùng cho những điểm requirement còn mở: `docs/ASSUMPTIONS.md`.
