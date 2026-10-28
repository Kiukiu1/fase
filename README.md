# FASE

Hệ thống website hỗ trợ **phòng Sales** chia và chăm sóc **LEAD** (khách hàng tiềm năng do phòng Marketing chuyển sang).

| Ứng dụng | Người dùng | Làm gì |
|---|---|---|
| **Fase-CRM** | Trưởng phòng | Import LEAD từ Excel, quản lý kho LEAD, phân LEAD cho nhân viên, thu hồi / mở lại, theo dõi nhân viên |
| **Fase-Sales** | Nhân viên Sales | Nhận LEAD trong 2 giờ, gọi điện, ghi kết quả, cập nhật trạng thái, hẹn gọi lại |

> Trạng thái: **Phase 1 – Chia LEAD & chăm sóc LEAD** đã xong. Dashboard thống kê chi tiết và AI Agent thuộc phase sau.

---

## Mục lục

1. [Tính năng](#1-tính-năng)
2. [Kiến trúc & công nghệ](#2-kiến-trúc--công-nghệ)
3. [Chạy bằng Docker (nhanh nhất)](#3-chạy-bằng-docker-nhanh-nhất)
4. [Chạy môi trường dev](#4-chạy-môi-trường-dev)
5. [Tài khoản mẫu & tạo tài khoản](#5-tài-khoản-mẫu--tạo-tài-khoản)
6. [Quy tắc nghiệp vụ](#6-quy-tắc-nghiệp-vụ)
7. [Cấu hình](#7-cấu-hình)
8. [Cấu trúc thư mục](#8-cấu-trúc-thư-mục)
9. [API](#9-api)
10. [Test](#10-test)
11. [Lỗi thường gặp](#11-lỗi-thường-gặp)
12. [Tài liệu khác](#12-tài-liệu-khác)

---

## 1. Tính năng

### Fase-CRM (trưởng phòng) – `/cms`
- **Import LEAD từ `.xlsx`:** kiểm tra từng dòng, xem trước kết quả *Thêm mới / Ghi đè / Lỗi* kèm lý do, bấm xác nhận mới lưu. LEAD trùng MST hoặc SĐT thì **ghi đè thông tin**, giữ nguyên trạng thái và lịch sử. Có file mẫu để tải.
- **Kho LEAD:** lọc theo trạng thái, gói dịch vụ, nhân viên, khoảng ngày quan tâm; tìm theo MST / SĐT.
- **Phân LEAD:** tick nhiều LEAD rồi **chia đều** hoặc **chia thủ công** (nhập số lượng cho từng người).
- **Thu hồi / Mở lại / Phân lại** LEAD đã phân, đã bị trả về hoặc đã kết thúc.
- **Chi tiết LEAD:** dòng thời gian gồm phân / nhận / trả kho, các cuộc gọi, các lần đổi trạng thái.
- **Nhân viên:** số LEAD chờ nhận, đang chăm sóc, đã kết thúc, đã chốt của từng người.
- Tổng quan kho, thông báo, đổi mật khẩu.

### Fase-Sales (nhân viên)
- **Chờ nhận:** đồng hồ đếm ngược hạn nhận 2 giờ, tính theo giờ hành chính (ngoài giờ thì đồng hồ dừng).
- **Nhận & gọi:** một nút vừa nhận LEAD, vừa mở cuộc gọi (`tel:`), vừa mở form ghi kết quả.
- **Ghi cuộc gọi:** nhân viên tự nhập (nghe máy / không nghe máy, thời lượng, ghi chú, trạng thái mới).
- **LEAD của tôi:** các tab *Đang chăm sóc*, *Gọi lại hôm nay*, *Cần gọi tiếp hôm nay*, *Sắp hết hạn 7 ngày*; bộ đếm **x/7**.
- Hẹn gọi lại, đổi trạng thái, xem lịch sử, thông báo, đổi mật khẩu.

---

## 2. Kiến trúc & công nghệ

```
                ┌──────────────── web (nginx :8080) ────────────────┐
 Trình duyệt ──►│  /            → Fase-Sales (React build)          │
                │  /api /cms    → proxy sang api:4000               │
                └───────────────────────────┬───────────────────────┘
                                            ▼
                ┌──────────────── api (NestJS :4000) ───────────────┐
                │  /api/**  JSON API cho Fase-Sales (JWT)           │
                │  /cms/**  Fase-CRM render server (session)        │
                │  job nền: trả LEAD quá hạn, BR-03, nhắc nhở       │
                └───────────────────────────┬───────────────────────┘
                                            ▼
                                 db (PostgreSQL 15 :5433)
```

| Phần | Công nghệ |
|---|---|
| `fase-be` | NestJS 11, TypeORM, PostgreSQL, Passport JWT, express-session (lưu trong Postgres), Handlebars + AdminLTE 3 (CRM), exceljs, @nestjs/schedule, Swagger |
| `fase-fe` | React 19, Vite, TypeScript, React Router 7, TanStack Query, react-hook-form + zod, Headless UI, CSS Modules |
| Hạ tầng | Docker Compose: `db` + `api` + `web` |

---

## 3. Chạy bằng Docker (nhanh nhất)

Cần: Docker Desktop.

```bash
git clone https://github.com/Kiukiu1/fase.git
cd fase
cp fase-be/.env.example fase-be/.env      # nhớ đổi các SECRET khi chạy thật
docker compose up -d --build
docker compose exec api node dist/database/seed.js    # tạo tài khoản mẫu + 30 LEAD
```

| Địa chỉ | Là gì |
|---|---|
| http://localhost:8080 | Fase-Sales (nhân viên) |
| http://localhost:8080/cms | Fase-CRM (trưởng phòng) |
| http://localhost:8080/swagger | Tài liệu API |

Dừng: `docker compose down`. Xoá luôn dữ liệu: `docker compose down -v`.

---

## 4. Chạy môi trường dev

Cần: Node.js 24+, Docker (để chạy PostgreSQL).

```bash
# 1. Database (PostgreSQL ở cổng 5433)
docker compose up -d db

# 2. Backend + Fase-CRM
cd fase-be
npm install
cp .env.example .env
npm run seed          # tài khoản mẫu + LEAD mẫu (chạy lại không bị trùng)
npm run dev           # http://localhost:4000  (/cms, /api, /swagger)

# 3. Fase-Sales (mở terminal khác)
cd fase-fe
npm install
npm run dev           # http://localhost:5173
```

Trên Windows có thể chạy `start-dev.bat` ở thư mục gốc để bật cả 3 phần.

Bảng được TypeORM tự tạo theo entity (`DB_SYNCHRONIZE=true`), không cần chạy migration.

---

## 5. Tài khoản mẫu & tạo tài khoản

Mật khẩu chung của tài khoản mẫu: **`Fase@123`**

| Username | Vai trò | Đăng nhập ở |
|---|---|---|
| `truongphong` | Trưởng phòng (`manager`) | Fase-CRM |
| `sales1`, `sales2`, `sales3` | Nhân viên (`sales`), thuộc `truongphong` | Fase-Sales |

Hệ thống **không có chức năng đăng ký**: quản trị viên tạo tài khoản trực tiếp trong DB.
- Cách dễ nhất: thêm người vào `fase-be/src/database/seed.ts` rồi chạy `npm run seed`.
- Hoặc insert tay vào bảng `"user"`: `password` là hash bcrypt, `role` là `manager` hoặc `sales`, `manager_id` của sales trỏ tới `id` của trưởng phòng.

Trưởng phòng không đăng nhập được Fase-Sales, nhân viên không vào được Fase-CRM.

---

## 6. Quy tắc nghiệp vụ

### Trạng thái LEAD

```
Trong kho ──phân──► Chờ nhận ──nhận & gọi──► Đã nhận – đang gọi ──► kết quả cuộc gọi đầu
   ▲                   │ quá 2h không nhận                              │
   └───────────────────┘ (tự trả về kho)                                ▼
 Không nghe máy / Gọi tiếp ─(đủ 7 ngày)─► Không nghe máy / Từ bỏ
 Đã liên hệ ─(quá 7 ngày kể từ lúc nhận)─► Không nghe máy / Từ bỏ
 Đã liên hệ → Đang chăm sóc → Đã demo / báo giá → Đã chốt
 Bất kỳ lúc nào đang chăm sóc: Không có nhu cầu · Không đáp ứng · Sai số · Dừng (bắt buộc lý do)
```

### Quy tắc tự động

| Mã | Quy tắc | Cách hệ thống làm |
|---|---|---|
| BR-01 | Không nhận trong **2 giờ hành chính** → trả về kho | Job chạy mỗi phút; dùng UPDATE có điều kiện + `SKIP LOCKED` nên chạy trùng không trả 2 lần |
| BR-02 | *Không nghe máy*: mỗi ngày tính 1 cuộc, đủ **7 ngày** vẫn không nghe → *Từ bỏ* | Tính ngay lúc ghi cuộc gọi |
| BR-03 | *Đã liên hệ* quá **7 ngày** kể từ lúc nhận mà chưa tiến triển → *Từ bỏ* | Job 10 phút/lần |
| BR-04 | Mọi lần đổi trạng thái đều ghi lịch sử | Tất cả đi qua `LeadStatusBean` |
| BR-05 | Chỉ nhân viên đang được phân mới được cập nhật LEAD | Trả 403 |
| BR-06 | *Dừng* bắt buộc nhập lý do | Validate cả FE và BE |
| BR-07/08 | LEAD bị trả về / đã kết thúc có thể phân lại / mở lại (trừ *Đã chốt*) | Fase-CRM |
| BR-09 | Import trùng MST hoặc SĐT → ghi đè thông tin | Màn hình xem trước import |

Hệ thống gửi thông báo in-app khi: được phân LEAD, còn 30 phút là hết hạn nhận, LEAD bị trả về kho / bị thu hồi, đến giờ gọi lại, LEAD tự chuyển *Từ bỏ*.

Những điểm requirement còn mở đang chạy theo giả định, xem **[docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)**.

---

## 7. Cấu hình

File `fase-be/.env` (mẫu ở `fase-be/.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `4000` | Cổng API |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_NAME` | `localhost` / `5433` / `postgres` / `postgres` / `fase` | Kết nối PostgreSQL |
| `DB_SYNCHRONIZE` | `true` | TypeORM tự tạo / cập nhật bảng. Production nên tắt và dùng migration |
| `SECRET_KEY`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET` | `change-me-...` | **Bắt buộc đổi khi chạy thật** |
| `FRONTEND_URL` | `http://localhost:5173` | Origin của Fase-Sales được phép gọi API (CORS) |
| `BUSINESS_DAYS` | `1,2,3,4,5` | Ngày làm việc (0 = CN … 6 = T7) |
| `BUSINESS_HOURS` | `08:00-12:00,13:30-17:30` | Khung giờ hành chính |
| `HOLIDAYS` | rỗng | Ngày lễ `YYYY-MM-DD`, cách nhau dấu phẩy |
| `SCHEDULER_ENABLED` | `true` | Bật / tắt job nền |
| `COOKIE_SECURE` | theo `NODE_ENV` | `true` khi chạy HTTPS; docker local để `false` |

`fase-fe`: `VITE_API_URL` là địa chỉ gốc của API (dev: `http://localhost:4000`; khi chạy sau nginx thì để rỗng).

---

## 8. Cấu trúc thư mục

```
fase/
├── docker-compose.yml
├── start-dev.bat
├── docs/                         # ASSUMPTIONS.md, PHASE1.md
├── fase-be/
│   └── src/
│       ├── cms/                  # Fase-CRM: controller, view (Handlebars), static (AdminLTE)
│       ├── domain/
│       │   ├── auth/             # đăng nhập, JWT, guard theo role
│       │   ├── business-hours/   # tính giờ hành chính (hạn nhận 2h)
│       │   ├── lead/             # entity, quy tắc trạng thái, phân/nhận, chăm sóc, import
│       │   ├── notification/
│       │   ├── sales/            # API cho Fase-Sales
│       │   ├── scheduler/        # job nền BR-01, BR-03, nhắc nhở
│       │   └── user/
│       └── database/             # seed, naming strategy
└── fase-fe/
    └── src/
        ├── components/           # common (Button, Dialog, ...), lead (CallLogDialog, Timeline, ...)
        ├── layouts/              # MainLayout, Header
        ├── pages/                # pending, leads, notifications, settings, auth
        ├── services/             # api, auth (token + refresh), http
        └── hooks/, types/, utils/
```

---

## 9. API

Chi tiết ở `/swagger`. Các API chính của Fase-Sales (cần header `Authorization: Bearer <accessToken>`):

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | `{ username, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh-token` | Làm mới token |
| PUT | `/api/auth/password` | Đổi mật khẩu |
| GET | `/api/sales/summary` | Số LEAD theo trạng thái và các việc cần làm |
| GET | `/api/sales/leads/pending` | LEAD chờ nhận + đồng hồ đếm ngược |
| GET | `/api/sales/leads?status=&due=&keyword=&page=` | LEAD của tôi |
| GET | `/api/sales/leads/:id` | Chi tiết + lịch sử + trạng thái được chọn |
| POST | `/api/sales/leads/:id/receive` | Nhận LEAD |
| POST | `/api/sales/leads/:id/calls` | Ghi cuộc gọi `{ result, status?, durationMinutes?, note?, reason? }` |
| POST | `/api/sales/leads/:id/status` | Đổi trạng thái `{ status, reason? }` |
| PUT | `/api/sales/leads/:id/callback` | Hẹn / huỷ gọi lại `{ callbackAt \| null }` |
| GET / POST | `/api/notifications`, `/unread-count`, `/read-all`, `/:id/read` | Thông báo |

---

## 10. Test

```bash
cd fase-be
npm test
```

Unit test bao phủ các phần nghiệp vụ quan trọng: tính giờ hành chính (nghỉ trưa, cuối tuần, ngày lễ), bảng chuyển trạng thái, bộ đếm 7 cuộc / 7 ngày, chia LEAD đều / thủ công, đọc và validate file import.

---

## 11. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `port 5433 is already allocated` | Đổi cổng `db` trong `docker-compose.yml` và `DB_PORT` trong `.env` |
| Đăng nhập CRM xong lại bị đẩy về trang login (chạy docker trên http) | Kiểm tra `COOKIE_SECURE=false` (đã đặt sẵn trong compose) |
| Fase-Sales báo "Không kết nối được máy chủ" | Kiểm tra API đang chạy và `VITE_API_URL` trong `fase-fe/.env.development` |
| Hạn nhận lệch giờ | Kiểm tra `BUSINESS_HOURS`, `BUSINESS_DAYS`, `HOLIDAYS` trong `.env` |
| `npm ci` lỗi khi build image | Dùng Node 24 / npm 11 để cập nhật `package-lock.json` (image cũng dùng `node:24-alpine`) |

---

## 12. Tài liệu khác

- [docs/PHASE1.md](docs/PHASE1.md) – phạm vi Phase 1, đối chiếu từng yêu cầu FR / BR
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) – các giả định cần trưởng phòng xác nhận
