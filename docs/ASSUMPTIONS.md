# Giả định đang dùng – cần hỏi lại trưởng phòng

Các điểm requirement v1.2 (mục 10.2) còn mở. Code đang chạy theo giả định dưới đây; đổi được mà không phải sửa nhiều.

| # | Điểm mở | Đang làm thế nào | Đổi ở đâu |
|---|---|---|---|
| 1 | Khung giờ hành chính | T2–T6, 08:00–12:00 và 13:30–17:30, nghỉ trưa không tính. Phân lúc 17:00 → hạn 09:30 sáng hôm sau; phân thứ 6 17:00 → 09:30 thứ 2. Ngày lễ khai báo trong `HOLIDAYS`. | `.env`: `BUSINESS_DAYS`, `BUSINESS_HOURS`, `HOLIDAYS` |
| 2 | Bỏ sót ngày trong quy tắc 7 cuộc / 7 ngày | Bộ đếm x/7 đếm **số ngày khác nhau** đã gọi mà khách không nghe (mỗi ngày tối đa 1). Bỏ sót ngày **không phạt, không kéo dài**, chỉ hiện cảnh báo "Hôm nay chưa gọi" và tab "Cần gọi tiếp hôm nay". Ngày cuối tuần vẫn gọi được và vẫn được tính. | `lead-status.rules.ts` → `planCall` |
| 3 | Ghi đè LEAD trùng khi import | Trùng theo MST **hoặc** SĐT trong kho của chính trưởng phòng đó → chỉ cập nhật MST, SĐT, địa chỉ, gói dịch vụ, ngày quan tâm. **Giữ nguyên** trạng thái, người được phân, lịch sử cuộc gọi/trạng thái. Nếu MST khớp một LEAD còn SĐT khớp LEAD khác → báo lỗi dòng đó, không đoán. | `lead-import.bean.ts` → `classify` |
| 4 | Mốc 7 ngày của "Đã liên hệ" (đã chốt) | Tính theo ngày lịch từ `received_at`. Job chạy 10 phút/lần. | `CONTACTED_CARE_DAYS` trong `constants` |
| 5 | Trạng thái "Đã chốt" có mở lại được không | BR-08 không liệt kê "Đã chốt" nên **không** cho mở lại / phân lại LEAD đã chốt. | `REOPENABLE_STATUSES` |
| 6 | Sau khi nhận LEAD nhưng chưa ghi kết quả | Thêm trạng thái kỹ thuật **"Đã nhận – đang gọi"** (`RECEIVED`) giữa lúc nhận và lúc ghi kết quả cuộc gọi đầu. | `LeadStatus.RECEIVED` |
| 7 | "Không nghe máy / Từ bỏ" bằng tay | Nhân viên **không** tự chọn được; chỉ hệ thống chuyển (đủ 7 ngày, hoặc BR-03). Muốn dừng sớm thì chọn "Dừng" + lý do. | `SALES_TRANSITIONS` |
| 8 | Phân lại khi LEAD đang được người khác giữ | Cho phép khi trưởng phòng tick "Cho phép phân lại"; người cũ bị thu hồi + nhận thông báo, bộ đếm x/7 và lịch gọi lại được đặt lại cho lượt mới. | `LeadAssignmentBean.assign` |
| 9 | Hạn nhận khi phân nhiều LEAD cùng lúc | Tất cả LEAD trong một lần phân có chung hạn nhận (tính từ lúc bấm phân). | `LeadAssignmentBean.assign` |
