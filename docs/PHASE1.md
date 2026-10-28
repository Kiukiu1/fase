# Phase 1 – Chia LEAD & chăm sóc LEAD

## Đã làm

### Chung
- FR-COM-01/02: đăng nhập username + mật khẩu (bcrypt), đăng xuất, đổi mật khẩu – CRM dùng session, Sales dùng JWT + refresh token. Manager không vào được Fase-Sales, Sales không vào được Fase-CRM.
- FR-COM-03: thông báo in-app (được phân, sắp hết hạn nhận còn 30 phút, bị trả về kho, bị thu hồi, đến giờ gọi lại, tự chuyển Từ bỏ). Fase-Sales polling 30s.

### Fase-CRM (`/cms`, trưởng phòng)
| Màn hình | Yêu cầu |
|---|---|
| Tổng quan | đếm LEAD theo trạng thái, tỷ lệ chốt (bản đơn giản) |
| Import LEAD | FR-CRM-01/02, BR-09: upload xlsx → xem trước từng dòng (Thêm mới / Ghi đè / Lỗi + lý do) → xác nhận; tải file mẫu |
| Kho LEAD | FR-CRM-03: lọc trạng thái, gói, nhân viên, khoảng ngày quan tâm, tìm MST/SĐT, phân trang |
| Phân LEAD | FR-CRM-04: tick nhiều LEAD → chia đều hoặc chia thủ công theo số lượng |
| Thu hồi / Mở lại / Phân lại | FR-CRM-05, BR-07, BR-08 |
| Chi tiết LEAD | FR-CRM-08: thông tin + dòng thời gian (phân/nhận/trả, cuộc gọi, đổi trạng thái) |
| Nhân viên | FR-CRM-06: số LEAD chờ nhận / đang chăm sóc / kết thúc / đã chốt của từng người |

### Fase-Sales (React, nhân viên)
| Màn hình | Yêu cầu |
|---|---|
| Chờ nhận | FR-SAL-01/02: đồng hồ đếm ngược theo giờ hành chính (server tính), nút "Nhận & gọi" mở `tel:` và form ghi kết quả |
| LEAD của tôi | FR-SAL-05/06: tab Đang chăm sóc / Gọi lại hôm nay / Cần gọi tiếp hôm nay / Sắp hết hạn 7 ngày, bộ đếm x/7 |
| Chi tiết LEAD | FR-SAL-03/04/07: ghi cuộc gọi, đổi trạng thái, hẹn gọi lại, lịch sử |
| Thông báo, Đổi mật khẩu | FR-COM-02/03 |

### Quy tắc tự động
| Rule | Cách làm |
|---|---|
| BR-01 | cron mỗi phút, `UPDATE ... WHERE status='ASSIGNED' AND receive_deadline <= now()` + `FOR UPDATE SKIP LOCKED` → chạy trùng không trả 2 lần |
| BR-02 | tính ngay lúc ghi cuộc gọi (`planCall`), đủ 7 ngày → tự chuyển Từ bỏ |
| BR-03 | cron 10 phút/lần |
| BR-04 | mọi đổi trạng thái đi qua `LeadStatusBean`, luôn ghi `lead_status_history` |
| BR-05 | kiểm tra trong `LeadCareBean.lockOwnLead` (403) |
| BR-06 | `assertSalesTransition` – Dừng bắt buộc lý do |

## API Fase-Sales (chi tiết ở `/swagger`)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | `{username, password}` → `{accessToken, refreshToken, user}` |
| POST | `/api/auth/refresh-token` | làm mới token |
| PUT | `/api/auth/password` | đổi mật khẩu |
| GET | `/api/sales/summary` | đếm theo trạng thái + các hạn cần làm |
| GET | `/api/sales/leads/pending` | LEAD chờ nhận + `countdown` |
| GET | `/api/sales/leads?status=&due=&keyword=&page=` | LEAD của tôi |
| GET | `/api/sales/leads/:id` | chi tiết + `callOutcomes` + `timeline` |
| POST | `/api/sales/leads/:id/receive` | nhận LEAD |
| POST | `/api/sales/leads/:id/calls` | `{result, status?, durationMinutes?, note?, reason?}` |
| POST | `/api/sales/leads/:id/status` | `{status, reason?}` |
| PUT | `/api/sales/leads/:id/callback` | `{callbackAt | null}` |
| GET/POST | `/api/notifications`, `/unread-count`, `/read-all`, `/:id/read` | thông báo |

## Phase sau
FR-CRM-07/09, FR-SAL-08 (dashboard, thống kê nhân viên), toàn bộ AI mục 8, migration DB thay cho `synchronize`.
