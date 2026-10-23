# XeGo — Frontend đặt vé xe khách

Giao diện web cho hệ thống đặt vé xe khách liên tỉnh (đồ án J2EE). Một ứng dụng React gồm hai khu:

- **Khu khách hàng** (`/`) — tìm chuyến, xem chi tiết nhà xe, chọn ghế, giữ chỗ 10 phút, thanh toán,
  nhận vé QR, tra cứu vé, quản lý đơn và đánh giá. Đặt vé được cả khi **chưa đăng nhập** (khách vãng lai).
- **Khu quản trị** (`/admin`) — thống kê doanh thu, quản lý chuyến xe, tuyến, địa điểm, nhà xe, đơn hàng,
  khuyến mãi, kiểm duyệt đánh giá, người dùng.

> **Trạng thái: chạy bằng DỮ LIỆU CỨNG, chưa nối backend.** Không cần chạy `ride_booking_backend`.
> Cách nối backend ở mục 7.

---

## 1. Chạy nhanh

Yêu cầu: Node.js ≥ 18 và npm.

```bash
cd ride_booking_frontend
npm install
npm run dev
```

Mở http://localhost:5173.

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy dev server có hot reload ở cổng 5173 |
| `npm run build` | Kiểm tra kiểu TypeScript rồi build bản production vào `dist/` |
| `npm run preview` | Xem thử bản build trong `dist/` |
| `npm run lint` | ESLint (hiện 0 lỗi, 7 cảnh báo "fast refresh" chỉ ảnh hưởng hot reload) |

## 2. Tài khoản dùng thử

| Vai trò | Email | Mật khẩu | Sau khi đăng nhập |
|---|---|---|---|
| Khách hàng | `user@xego.vn` | `123456` | Có sẵn đơn ở cả 3 tab: sắp đi, đã đi (1 chưa đánh giá), đã huỷ/hết hạn |
| Quản trị | `admin@xego.vn` | `admin123` | Tự chuyển sang `/admin` |

Trang **Đăng nhập** có hai nút điền sẵn các tài khoản này. Tài khoản đăng ký mới cũng đăng nhập được (trong phiên đó).

Mã giảm giá mẫu:

| Mã | Điều kiện | Dùng để thử |
|---|---|---|
| `XEGO10` | Giảm 10%, tối đa 50.000đ, đơn từ 200.000đ | Áp mã thành công |
| `SAPA50K` | Giảm 50.000đ, chỉ tuyến Hà Nội - Sa Pa | Sai tuyến → báo lỗi |
| `KINGBUS15` | Giảm 15%, chỉ nhà xe KINGBUS | Sai nhà xe → báo lỗi |
| `SINHVIEN` | Giảm 30.000đ, đơn từ 150.000đ, chỉ còn 2 lượt | Dùng 2 lần là báo hết lượt |
| `TET2026` | Đã hết hạn | Mã hết hạn |

## 3. Chức năng

### Khách hàng

| Trang | Đường dẫn | Chức năng chính |
|---|---|---|
| Trang chủ | `/` | Ô tìm chuyến: gợi ý địa điểm (gõ không dấu được), nút đổi chiều, lịch chọn ngày có **lịch âm** và ngày lễ; tìm kiếm gần đây; ưu đãi nổi bật; tuyến phổ biến kèm giá "từ" |
| Kết quả tìm kiếm | `/xe-khach/ha-noi-di-sa-pa?date=2026-10-25` | Dải 7 ngày; lọc giờ đi, giá tối đa, nhà xe, loại xe, điểm đón, điểm trả; sắp xếp; "Xem thêm". Mọi bộ lọc nằm trên URL (F5, chia sẻ link vẫn giữ). Bấm tab trên thẻ để xổ chi tiết: **Giảm giá · Đón/trả · Đánh giá · Chính sách · Hình ảnh · Tiện ích** |
| Chi tiết chuyến | `/chuyen/:tripId` | Cùng 6 tab, mở bằng link trực tiếp |
| Đặt vé | `/dat-ve/:tripId` | 4 bước có thanh tiến trình. Sơ đồ ghế theo 3 loại xe (Limousine 29, Cabin đôi 22 phòng 2 tầng, Giường nằm 45), tối đa 10 ghế, ghế đôi có phụ thu, tự làm mới 15 giây/lần; chọn điểm đón/trả; thông tin liên hệ (tự điền nếu đã đăng nhập); áp mã giảm giá |
| Thanh toán | `/dat-ve/thanh-toan/:bookingId` | Đồng hồ đếm ngược 10 phút (đỏ khi < 2 phút, hết giờ thì báo chọn lại ghế); Stripe (giả lập) hoặc Thanh toán demo; rời trang thì hỏi **Giữ chỗ hay huỷ chỗ?** |
| Kết quả | `/dat-ve/ket-qua?bookingId=` | Vé điện tử, **mã QR**, in vé / lưu PDF; khách vãng lai được mời tạo tài khoản |
| Tra cứu vé | `/tra-cuu-ve` | Mã vé + SĐT → xem vé, thanh toán tiếp hoặc huỷ giữ chỗ |
| Ưu đãi | `/uu-dai` | Danh sách khuyến mãi đang hiệu lực, sao chép mã |
| Đăng nhập · Đăng ký · Quên mật khẩu | `/dang-nhap` · `/dang-ky` · `/quen-mat-khau` | Đăng nhập xong quay lại trang đang xem (`?redirect=`) |
| Tài khoản | `/tai-khoan/thong-tin` | Sửa họ tên, SĐT, ngày sinh, giới tính |
| Đơn hàng của tôi | `/tai-khoan/don-hang` | 3 tab **Hiện tại / Đã đi / Đã huỷ**; thanh toán tiếp, huỷ, xem vé, đánh giá; **Thêm vé đã đặt** (gắn vé đặt lúc chưa đăng nhập bằng mã vé + SĐT) |
| Đánh giá | `/tai-khoan/danh-gia/:bookingId`, `/tai-khoan/danh-gia` | Chọn 1–5 sao, gợi ý nhanh, tối đa 1000 ký tự; sửa/xoá đánh giá của mình |
| Bảo mật | `/tai-khoan/bao-mat` | Đổi mật khẩu, đăng xuất mọi thiết bị |

Giao diện khách hàng dùng được trên điện thoại (bộ lọc thành bottom sheet, sơ đồ ghế xem từng tầng).

### Quản trị (`/admin`, chỉ tài khoản ADMIN; tài khoản thường vào sẽ thấy trang 403)

| Trang | Chức năng |
|---|---|
| Tổng quan | Chọn kỳ (hôm nay / 7 / 30 ngày / tuỳ chọn) và nhà xe; doanh thu, vé bán, tỷ lệ lấp đầy, đơn chờ thanh toán, so với kỳ trước; biểu đồ doanh thu theo ngày, đơn theo trạng thái, vé theo tuyến; chuyến chạy trong 24 giờ tới |
| Chuyến xe | Lọc theo trạng thái, tuyến, nhà xe, ngày; thêm/sửa (giờ đến tự gợi ý theo tuyến, khoá đổi loại xe khi đã bán ghế); **Hoàn tất ngay**; **Huỷ chuyến** (báo danh sách đơn cần hoàn tiền); xoá chuyến chưa bán |
| Chi tiết chuyến | Tab Thông tin · Điểm đón/trả (thêm, xoá) · Sơ đồ ghế (rê chuột xem hành khách) · Hành khách (**In**, **Xuất CSV**) |
| Tuyến · Địa điểm · Nhà xe | Thêm/sửa/xoá; tuyến có ảnh và cờ "nổi bật trang chủ"; địa điểm tự sinh slug |
| Nội dung nhà xe | Hình ảnh (URL), tiện ích, chính sách, bảng % hoàn tiền khi huỷ |
| Đơn hàng | Tìm theo mã vé/tên/SĐT/email, lọc trạng thái, khách vãng lai/thành viên, ngày đặt; xem chi tiết; huỷ đơn kèm lý do |
| Khuyến mãi | Thêm/sửa/xoá; giảm % hoặc số tiền, trần giảm, đơn tối thiểu, phạm vi nhà xe/tuyến, thời gian, giới hạn lượt, cột "đã dùng x/y" |
| Đánh giá | Lọc theo nhà xe, số sao; ẩn/hiện |
| Người dùng | Tìm kiếm, xem trạng thái xác minh email, số đơn; gỡ khoá đăng nhập |

## 4. Kịch bản demo (khoảng 5 phút)

1. **Chưa đăng nhập**, Trang chủ → Nơi xuất phát **Hà Nội**, Nơi đến **Sa Pa**, ngày mai → **Tìm kiếm**.
2. Trên một thẻ chuyến, bấm vài tab (Đánh giá, Hình ảnh…) → **Chọn chuyến**.
3. Chọn 2 ghế, nhập mã `XEGO10` → **Áp dụng** → Tiếp tục → chọn điểm đón → nhập tên, SĐT, email, tích đồng ý → **Giữ chỗ & thanh toán**.
4. Ở trang thanh toán bấm logo để rời trang → thấy hộp thoại **Giữ chỗ hay huỷ chỗ?** → *Tiếp tục thanh toán*.
5. Chọn **Thẻ quốc tế** → **Thanh toán** → **Trả …** → nhận vé + QR. Ghi lại **mã vé**.
6. Menu **Tra cứu vé** → nhập mã vé + SĐT → thấy vé.
7. **Đăng nhập** `user@xego.vn` → Đơn hàng của tôi → **+ Thêm vé đã đặt** (mã + SĐT ở bước 6) → vé hiện ở tab Hiện tại.
8. Tab **Đã đi** → **Đánh giá** → 5 sao → Gửi.
9. Đăng xuất, đăng nhập `admin@xego.vn` → **Đơn hàng** → tìm theo mã vé → bấm dòng đơn → bấm link chuyến trong khung chi tiết
   → tab **Hành khách** thấy khách vừa đặt → **Huỷ chuyến** → thấy đơn cần hoàn tiền.
10. **Tổng quan** → đổi kỳ 7 ngày / 30 ngày.

> Làm cả kịch bản **trong một lần mở trang, không F5** — xem mục 5.

## 5. Về dữ liệu cứng — cần biết khi demo

- Dữ liệu nằm trong `src/mock/db.ts`, lấy danh mục theo seed của backend: 20 địa điểm, 6 nhà xe, 15 tuyến;
  khoảng 1.200 chuyến (10 ngày trước → 14 ngày tới so với **hôm nay**), hơn 2.000 đơn và 500 đánh giá.
  Sinh bằng random có seed nên **mỗi lần tải trang ra cùng một bộ dữ liệu**.
- Mọi thay đổi (đặt vé, thanh toán, CRUD admin) chỉ lưu **trong bộ nhớ tab**. **F5 hoặc mở tab mới là quay về dữ liệu ban đầu.**
  Chỉ phiên đăng nhập (localStorage) và token khách vãng lai (sessionStorage) được giữ.
- Mỗi lời gọi "API" có độ trễ giả 100–900 ms để thấy trạng thái loading.
- Ảnh lấy ngẫu nhiên từ picsum.photos (cần Internet); logo nhà xe là chữ viết tắt.
- **Stripe** là hộp thoại giả lập, không trừ tiền thật. **Email** (xác minh, vé) không được gửi.
- Đơn giữ chỗ quá 10 phút tự chuyển "Hết hạn thanh toán" và trả ghế, giống job của backend.

## 6. Cấu trúc mã

```
src/
├─ api/            # "Lớp API": mỗi hàm ứng với một endpoint backend (ghi trong comment)
│  ├─ client.ts    # mock() giả độ trễ, ApiError(status, message), paginate()
│  └─ catalog · trips · bookings · promotions · reviews · auth · admin .api.ts
├─ mock/db.ts      # dữ liệu cứng trong bộ nhớ
├─ types/          # DTO trùng tên trường với JSON backend
├─ stores/         # Zustand: authStore (phiên đăng nhập), bookingStore (token khách vãng lai, tìm kiếm gần đây)
├─ hooks/          # useAsync, useCountdown, useDebounce, useDocumentTitle
├─ components/
│  ├─ common/      # Modal, Toast, Skeleton, Empty, ErrorBox, Stars, CompanyLogo, StatusBadge, Field
│  ├─ search/      # SearchForm, LunarDatePicker
│  ├─ trip/        # TripCard, TripDetailTabs (6 tab)
│  ├─ seat/        # SeatMap, SeatLegend
│  └─ booking/     # BookingStepper, HoldTimer, BookingLayout, TicketView (vé + QR)
├─ layouts/        # CustomerLayout (header/footer), AccountLayout, AdminLayout (Ant Design)
├─ pages/          # customer/ · auth/ · account/ · admin/
├─ router/         # bảng route, RequireAuth, RequireAdmin, trang 403/404; khu admin tải lười (bundle riêng)
└─ utils/          # format tiền/ngày/giờ, seatLayout (dựng lưới ghế từ tên ghế)
```

**Công nghệ:** React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3 (khu khách hàng), Ant Design 5 (khu admin),
Recharts (biểu đồ), Zustand, dayjs, lunar-javascript (lịch âm), qrcode.react, lucide-react (icon).

**Quy ước:**
- Trang **không** đọc `mock/db.ts` trực tiếp, chỉ gọi hàm trong `src/api/`.
- Giá, ghế trống, hạn giữ chỗ đều lấy từ "server" (lớp API); FE chỉ cộng để hiển thị tạm.
- Lỗi nghiệp vụ hiện nguyên văn thông điệp (toast hoặc dưới ô nhập); danh sách luôn có trạng thái đang tải / rỗng / lỗi.
- Màu chính `#2474E5`, nút hành động `#FFC700`, font Be Vietnam Pro (thiết kế ở `../HUONG_DAN_FRONTEND.md` B4).
