# XeGo â€” Frontend Ä‘áº·t vÃ© xe khÃ¡ch

Giao diá»‡n web cho há»‡ thá»‘ng Ä‘áº·t vÃ© xe khÃ¡ch liÃªn tá»‰nh (Ä‘á»“ Ã¡n J2EE). Má»™t á»©ng dá»¥ng React gá»“m hai khu:

- **Khu khÃ¡ch hÃ ng** (`/`) â€” tÃ¬m chuyáº¿n, xem chi tiáº¿t nhÃ  xe, chá»n gháº¿, giá»¯ chá»— 10 phÃºt, thanh toÃ¡n,
  nháº­n vÃ© QR, tra cá»©u vÃ©, quáº£n lÃ½ Ä‘Æ¡n vÃ  Ä‘Ã¡nh giÃ¡. Äáº·t vÃ© Ä‘Æ°á»£c cáº£ khi **chÆ°a Ä‘Äƒng nháº­p** (khÃ¡ch vÃ£ng lai).
- **Khu quáº£n trá»‹** (`/admin`) â€” thá»‘ng kÃª doanh thu, quáº£n lÃ½ chuyáº¿n xe, tuyáº¿n, Ä‘á»‹a Ä‘iá»ƒm, nhÃ  xe, Ä‘Æ¡n hÃ ng,
  khuyáº¿n mÃ£i, kiá»ƒm duyá»‡t Ä‘Ã¡nh giÃ¡, ngÆ°á»i dÃ¹ng.

> **Tráº¡ng thÃ¡i: cháº¡y báº±ng Dá»® LIá»†U Cá»¨NG, chÆ°a ná»‘i backend.** KhÃ´ng cáº§n cháº¡y `ride_booking_backend`.
> CÃ¡ch ná»‘i backend á»Ÿ má»¥c 7.

---

## 1. Cháº¡y nhanh

YÃªu cáº§u: Node.js â‰¥ 18 vÃ  npm.

```bash
cd ride_booking_frontend
npm install
npm run dev
```

Má»Ÿ http://localhost:5173.

| Lá»‡nh | Viá»‡c |
|---|---|
| `npm run dev` | Cháº¡y dev server cÃ³ hot reload á»Ÿ cá»•ng 5173 |
| `npm run build` | Kiá»ƒm tra kiá»ƒu TypeScript rá»“i build báº£n production vÃ o `dist/` |
| `npm run preview` | Xem thá»­ báº£n build trong `dist/` |
| `npm run lint` | ESLint (hiá»‡n 0 lá»—i, 7 cáº£nh bÃ¡o "fast refresh" chá»‰ áº£nh hÆ°á»Ÿng hot reload) |

## 2. TÃ i khoáº£n dÃ¹ng thá»­

| Vai trÃ² | Email | Máº­t kháº©u | Sau khi Ä‘Äƒng nháº­p |
|---|---|---|---|
| KhÃ¡ch hÃ ng | `user@xego.vn` | `123456` | CÃ³ sáºµn Ä‘Æ¡n á»Ÿ cáº£ 3 tab: sáº¯p Ä‘i, Ä‘Ã£ Ä‘i (1 chÆ°a Ä‘Ã¡nh giÃ¡), Ä‘Ã£ huá»·/háº¿t háº¡n |
| Quáº£n trá»‹ | `admin@xego.vn` | `admin123` | Tá»± chuyá»ƒn sang `/admin` |

Trang **ÄÄƒng nháº­p** cÃ³ hai nÃºt Ä‘iá»n sáºµn cÃ¡c tÃ i khoáº£n nÃ y. TÃ i khoáº£n Ä‘Äƒng kÃ½ má»›i cÅ©ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c (trong phiÃªn Ä‘Ã³).

MÃ£ giáº£m giÃ¡ máº«u:

| MÃ£ | Äiá»u kiá»‡n | DÃ¹ng Ä‘á»ƒ thá»­ |
|---|---|---|
| `XEGO10` | Giáº£m 10%, tá»‘i Ä‘a 50.000Ä‘, Ä‘Æ¡n tá»« 200.000Ä‘ | Ãp mÃ£ thÃ nh cÃ´ng |
| `SAPA50K` | Giáº£m 50.000Ä‘, chá»‰ tuyáº¿n HÃ  Ná»™i - Sa Pa | Sai tuyáº¿n â†’ bÃ¡o lá»—i |
| `KINGBUS15` | Giáº£m 15%, chá»‰ nhÃ  xe KINGBUS | Sai nhÃ  xe â†’ bÃ¡o lá»—i |
| `SINHVIEN` | Giáº£m 30.000Ä‘, Ä‘Æ¡n tá»« 150.000Ä‘, chá»‰ cÃ²n 2 lÆ°á»£t | DÃ¹ng 2 láº§n lÃ  bÃ¡o háº¿t lÆ°á»£t |
| `TET2026` | ÄÃ£ háº¿t háº¡n | MÃ£ háº¿t háº¡n |

## 3. Chá»©c nÄƒng

### KhÃ¡ch hÃ ng

| Trang | ÄÆ°á»ng dáº«n | Chá»©c nÄƒng chÃ­nh |
|---|---|---|
| Trang chá»§ | `/` | Ã” tÃ¬m chuyáº¿n: gá»£i Ã½ Ä‘á»‹a Ä‘iá»ƒm (gÃµ khÃ´ng dáº¥u Ä‘Æ°á»£c), nÃºt Ä‘á»•i chiá»u, lá»‹ch chá»n ngÃ y cÃ³ **lá»‹ch Ã¢m** vÃ  ngÃ y lá»…; tÃ¬m kiáº¿m gáº§n Ä‘Ã¢y; Æ°u Ä‘Ã£i ná»•i báº­t; tuyáº¿n phá»• biáº¿n kÃ¨m giÃ¡ "tá»«" |
| Káº¿t quáº£ tÃ¬m kiáº¿m | `/xe-khach/ha-noi-di-sa-pa?date=2026-10-25` | Dáº£i 7 ngÃ y; lá»c giá» Ä‘i, giÃ¡ tá»‘i Ä‘a, nhÃ  xe, loáº¡i xe, Ä‘iá»ƒm Ä‘Ã³n, Ä‘iá»ƒm tráº£; sáº¯p xáº¿p; "Xem thÃªm". Má»i bá»™ lá»c náº±m trÃªn URL (F5, chia sáº» link váº«n giá»¯). Báº¥m tab trÃªn tháº» Ä‘á»ƒ xá»• chi tiáº¿t: **Giáº£m giÃ¡ Â· ÄÃ³n/tráº£ Â· ÄÃ¡nh giÃ¡ Â· ChÃ­nh sÃ¡ch Â· HÃ¬nh áº£nh Â· Tiá»‡n Ã­ch** |
| Chi tiáº¿t chuyáº¿n | `/chuyen/:tripId` | CÃ¹ng 6 tab, má»Ÿ báº±ng link trá»±c tiáº¿p |
| Äáº·t vÃ© | `/dat-ve/:tripId` | 4 bÆ°á»›c cÃ³ thanh tiáº¿n trÃ¬nh. SÆ¡ Ä‘á»“ gháº¿ theo 3 loáº¡i xe (Limousine 29, Cabin Ä‘Ã´i 22 phÃ²ng 2 táº§ng, GiÆ°á»ng náº±m 45), tá»‘i Ä‘a 10 gháº¿, gháº¿ Ä‘Ã´i cÃ³ phá»¥ thu, tá»± lÃ m má»›i 15 giÃ¢y/láº§n; chá»n Ä‘iá»ƒm Ä‘Ã³n/tráº£; thÃ´ng tin liÃªn há»‡ (tá»± Ä‘iá»n náº¿u Ä‘Ã£ Ä‘Äƒng nháº­p); Ã¡p mÃ£ giáº£m giÃ¡ |
| Thanh toÃ¡n | `/dat-ve/thanh-toan/:bookingId` | Äá»“ng há»“ Ä‘áº¿m ngÆ°á»£c 10 phÃºt (Ä‘á» khi < 2 phÃºt, háº¿t giá» thÃ¬ bÃ¡o chá»n láº¡i gháº¿); Stripe Checkout hoáº·c Thanh toÃ¡n demo; rá»i trang thÃ¬ há»i **Giá»¯ chá»— hay huá»· chá»—?** |
| Káº¿t quáº£ | `/dat-ve/ket-qua?bookingId=` | VÃ© Ä‘iá»‡n tá»­, **mÃ£ QR**, in vÃ© / lÆ°u PDF; khÃ¡ch vÃ£ng lai Ä‘Æ°á»£c má»i táº¡o tÃ i khoáº£n |
| Tra cá»©u vÃ© | `/tra-cuu-ve` | MÃ£ vÃ© + SÄT â†’ xem vÃ©, thanh toÃ¡n tiáº¿p hoáº·c huá»· giá»¯ chá»— |
| Æ¯u Ä‘Ã£i | `/uu-dai` | Danh sÃ¡ch khuyáº¿n mÃ£i Ä‘ang hiá»‡u lá»±c, sao chÃ©p mÃ£ |
| ÄÄƒng nháº­p Â· ÄÄƒng kÃ½ Â· QuÃªn máº­t kháº©u | `/dang-nhap` Â· `/dang-ky` Â· `/quen-mat-khau` | ÄÄƒng nháº­p xong quay láº¡i trang Ä‘ang xem (`?redirect=`) |
| TÃ i khoáº£n | `/tai-khoan/thong-tin` | Sá»­a há» tÃªn, SÄT, ngÃ y sinh, giá»›i tÃ­nh |
| ÄÆ¡n hÃ ng cá»§a tÃ´i | `/tai-khoan/don-hang` | 3 tab **Hiá»‡n táº¡i / ÄÃ£ Ä‘i / ÄÃ£ huá»·**; thanh toÃ¡n tiáº¿p, huá»·, xem vÃ©, Ä‘Ã¡nh giÃ¡; **ThÃªm vÃ© Ä‘Ã£ Ä‘áº·t** (gáº¯n vÃ© Ä‘áº·t lÃºc chÆ°a Ä‘Äƒng nháº­p báº±ng mÃ£ vÃ© + SÄT) |
| ÄÃ¡nh giÃ¡ | `/tai-khoan/danh-gia/:bookingId`, `/tai-khoan/danh-gia` | Chá»n 1â€“5 sao, gá»£i Ã½ nhanh, tá»‘i Ä‘a 1000 kÃ½ tá»±; sá»­a/xoÃ¡ Ä‘Ã¡nh giÃ¡ cá»§a mÃ¬nh |
| Báº£o máº­t | `/tai-khoan/bao-mat` | Äá»•i máº­t kháº©u, Ä‘Äƒng xuáº¥t má»i thiáº¿t bá»‹ |

Giao diá»‡n khÃ¡ch hÃ ng dÃ¹ng Ä‘Æ°á»£c trÃªn Ä‘iá»‡n thoáº¡i (bá»™ lá»c thÃ nh bottom sheet, sÆ¡ Ä‘á»“ gháº¿ xem tá»«ng táº§ng).

### Quáº£n trá»‹ (`/admin`, chá»‰ tÃ i khoáº£n ADMIN; tÃ i khoáº£n thÆ°á»ng vÃ o sáº½ tháº¥y trang 403)

| Trang | Chá»©c nÄƒng |
|---|---|
| Tá»•ng quan | Chá»n ká»³ (hÃ´m nay / 7 / 30 ngÃ y / tuá»³ chá»n) vÃ  nhÃ  xe; doanh thu, vÃ© bÃ¡n, tá»· lá»‡ láº¥p Ä‘áº§y, Ä‘Æ¡n chá» thanh toÃ¡n, so vá»›i ká»³ trÆ°á»›c; biá»ƒu Ä‘á»“ doanh thu theo ngÃ y, Ä‘Æ¡n theo tráº¡ng thÃ¡i, vÃ© theo tuyáº¿n; chuyáº¿n cháº¡y trong 24 giá» tá»›i |
| Chuyáº¿n xe | Lá»c theo tráº¡ng thÃ¡i, tuyáº¿n, nhÃ  xe, ngÃ y; thÃªm/sá»­a (giá» Ä‘áº¿n tá»± gá»£i Ã½ theo tuyáº¿n, khoÃ¡ Ä‘á»•i loáº¡i xe khi Ä‘Ã£ bÃ¡n gháº¿); **HoÃ n táº¥t ngay**; **Huá»· chuyáº¿n** (bÃ¡o danh sÃ¡ch Ä‘Æ¡n cáº§n hoÃ n tiá»n); xoÃ¡ chuyáº¿n chÆ°a bÃ¡n |
| Chi tiáº¿t chuyáº¿n | Tab ThÃ´ng tin Â· Äiá»ƒm Ä‘Ã³n/tráº£ (thÃªm, xoÃ¡) Â· SÆ¡ Ä‘á»“ gháº¿ (rÃª chuá»™t xem hÃ nh khÃ¡ch) Â· HÃ nh khÃ¡ch (**In**, **Xuáº¥t CSV**) |
| Tuyáº¿n Â· Äá»‹a Ä‘iá»ƒm Â· NhÃ  xe | ThÃªm/sá»­a/xoÃ¡; tuyáº¿n cÃ³ áº£nh vÃ  cá» "ná»•i báº­t trang chá»§"; Ä‘á»‹a Ä‘iá»ƒm tá»± sinh slug |
| Ná»™i dung nhÃ  xe | HÃ¬nh áº£nh (URL), tiá»‡n Ã­ch, chÃ­nh sÃ¡ch, báº£ng % hoÃ n tiá»n khi huá»· |
| ÄÆ¡n hÃ ng | TÃ¬m theo mÃ£ vÃ©/tÃªn/SÄT/email, lá»c tráº¡ng thÃ¡i, khÃ¡ch vÃ£ng lai/thÃ nh viÃªn, ngÃ y Ä‘áº·t; xem chi tiáº¿t; huá»· Ä‘Æ¡n kÃ¨m lÃ½ do |
| Khuyáº¿n mÃ£i | ThÃªm/sá»­a/xoÃ¡; giáº£m % hoáº·c sá»‘ tiá»n, tráº§n giáº£m, Ä‘Æ¡n tá»‘i thiá»ƒu, pháº¡m vi nhÃ  xe/tuyáº¿n, thá»i gian, giá»›i háº¡n lÆ°á»£t, cá»™t "Ä‘Ã£ dÃ¹ng x/y" |
| ÄÃ¡nh giÃ¡ | Lá»c theo nhÃ  xe, sá»‘ sao; áº©n/hiá»‡n |
| NgÆ°á»i dÃ¹ng | TÃ¬m kiáº¿m, xem tráº¡ng thÃ¡i xÃ¡c minh email, sá»‘ Ä‘Æ¡n; gá»¡ khoÃ¡ Ä‘Äƒng nháº­p |

## 4. Ká»‹ch báº£n demo (khoáº£ng 5 phÃºt)

1. **ChÆ°a Ä‘Äƒng nháº­p**, Trang chá»§ â†’ NÆ¡i xuáº¥t phÃ¡t **HÃ  Ná»™i**, NÆ¡i Ä‘áº¿n **Sa Pa**, ngÃ y mai â†’ **TÃ¬m kiáº¿m**.
2. TrÃªn má»™t tháº» chuyáº¿n, báº¥m vÃ i tab (ÄÃ¡nh giÃ¡, HÃ¬nh áº£nhâ€¦) â†’ **Chá»n chuyáº¿n**.
3. Chá»n 2 gháº¿, nháº­p mÃ£ `XEGO10` â†’ **Ãp dá»¥ng** â†’ Tiáº¿p tá»¥c â†’ chá»n Ä‘iá»ƒm Ä‘Ã³n â†’ nháº­p tÃªn, SÄT, email, tÃ­ch Ä‘á»“ng Ã½ â†’ **Giá»¯ chá»— & thanh toÃ¡n**.
4. á»ž trang thanh toÃ¡n báº¥m logo Ä‘á»ƒ rá»i trang â†’ tháº¥y há»™p thoáº¡i **Giá»¯ chá»— hay huá»· chá»—?** â†’ *Tiáº¿p tá»¥c thanh toÃ¡n*.
5. Chá»n **Tháº» quá»‘c táº¿** â†’ **Thanh toÃ¡n** â†’ **Tráº£ â€¦** â†’ nháº­n vÃ© + QR. Ghi láº¡i **mÃ£ vÃ©**.
6. Menu **Tra cá»©u vÃ©** â†’ nháº­p mÃ£ vÃ© + SÄT â†’ tháº¥y vÃ©.
7. **ÄÄƒng nháº­p** `user@xego.vn` â†’ ÄÆ¡n hÃ ng cá»§a tÃ´i â†’ **+ ThÃªm vÃ© Ä‘Ã£ Ä‘áº·t** (mÃ£ + SÄT á»Ÿ bÆ°á»›c 6) â†’ vÃ© hiá»‡n á»Ÿ tab Hiá»‡n táº¡i.
8. Tab **ÄÃ£ Ä‘i** â†’ **ÄÃ¡nh giÃ¡** â†’ 5 sao â†’ Gá»­i.
9. ÄÄƒng xuáº¥t, Ä‘Äƒng nháº­p `admin@xego.vn` â†’ **ÄÆ¡n hÃ ng** â†’ tÃ¬m theo mÃ£ vÃ© â†’ báº¥m dÃ²ng Ä‘Æ¡n â†’ báº¥m link chuyáº¿n trong khung chi tiáº¿t
   â†’ tab **HÃ nh khÃ¡ch** tháº¥y khÃ¡ch vá»«a Ä‘áº·t â†’ **Huá»· chuyáº¿n** â†’ tháº¥y Ä‘Æ¡n cáº§n hoÃ n tiá»n.
10. **Tá»•ng quan** â†’ Ä‘á»•i ká»³ 7 ngÃ y / 30 ngÃ y.

> LÃ m cáº£ ká»‹ch báº£n **trong má»™t láº§n má»Ÿ trang, khÃ´ng F5** â€” xem má»¥c 5.

## 5. Vá» dá»¯ liá»‡u cá»©ng â€” cáº§n biáº¿t khi demo

- Dá»¯ liá»‡u náº±m trong `src/mock/db.ts`, láº¥y danh má»¥c theo seed cá»§a backend: 20 Ä‘á»‹a Ä‘iá»ƒm, 6 nhÃ  xe, 15 tuyáº¿n;
  khoáº£ng 1.200 chuyáº¿n (10 ngÃ y trÆ°á»›c â†’ 14 ngÃ y tá»›i so vá»›i **hÃ´m nay**), hÆ¡n 2.000 Ä‘Æ¡n vÃ  500 Ä‘Ã¡nh giÃ¡.
  Sinh báº±ng random cÃ³ seed nÃªn **má»—i láº§n táº£i trang ra cÃ¹ng má»™t bá»™ dá»¯ liá»‡u**.
- Má»i thay Ä‘á»•i (Ä‘áº·t vÃ©, thanh toÃ¡n, CRUD admin) chá»‰ lÆ°u **trong bá»™ nhá»› tab**. **F5 hoáº·c má»Ÿ tab má»›i lÃ  quay vá» dá»¯ liá»‡u ban Ä‘áº§u.**
  Chá»‰ phiÃªn Ä‘Äƒng nháº­p (localStorage) vÃ  token khÃ¡ch vÃ£ng lai (sessionStorage) Ä‘Æ°á»£c giá»¯.
- Má»—i lá»i gá»i "API" cÃ³ Ä‘á»™ trá»… giáº£ 100â€“900 ms Ä‘á»ƒ tháº¥y tráº¡ng thÃ¡i loading.
- áº¢nh láº¥y ngáº«u nhiÃªn tá»« picsum.photos (cáº§n Internet); logo nhÃ  xe lÃ  chá»¯ viáº¿t táº¯t.
- **Stripe** dùng Checkout Session thật khi cấu hình `STRIPE_SECRET_KEY` và webhook; nếu chưa có key, chọn Thanh toán demo.
- ÄÆ¡n giá»¯ chá»— quÃ¡ 10 phÃºt tá»± chuyá»ƒn "Háº¿t háº¡n thanh toÃ¡n" vÃ  tráº£ gháº¿, giá»‘ng job cá»§a backend.

## 6. Cáº¥u trÃºc mÃ£

```
src/
â”œâ”€ api/            # "Lá»›p API": má»—i hÃ m á»©ng vá»›i má»™t endpoint backend (ghi trong comment)
â”‚  â”œâ”€ client.ts    # apiClient (Axios, refresh JWT, X-Guest-Token) vÃ  helper mock()
â”‚  â””â”€ catalog Â· trips Â· bookings Â· promotions Â· reviews Â· auth Â· admin .api.ts
â”œâ”€ mock/db.ts      # dá»¯ liá»‡u cá»©ng trong bá»™ nhá»›
â”œâ”€ types/          # DTO trÃ¹ng tÃªn trÆ°á»ng vá»›i JSON backend
â”œâ”€ stores/         # Zustand: authStore (phiÃªn Ä‘Äƒng nháº­p), bookingStore (token khÃ¡ch vÃ£ng lai, tÃ¬m kiáº¿m gáº§n Ä‘Ã¢y)
â”œâ”€ hooks/          # useAsync, useCountdown, useDebounce, useDocumentTitle
â”œâ”€ components/
â”‚  â”œâ”€ common/      # Modal, Toast, Skeleton, Empty, ErrorBox, Stars, CompanyLogo, StatusBadge, Field
â”‚  â”œâ”€ search/      # SearchForm, LunarDatePicker
â”‚  â”œâ”€ trip/        # TripCard, TripDetailTabs (6 tab)
â”‚  â”œâ”€ seat/        # SeatMap, SeatLegend
â”‚  â””â”€ booking/     # BookingStepper, HoldTimer, BookingLayout, TicketView (vÃ© + QR)
â”œâ”€ layouts/        # CustomerLayout (header/footer), AccountLayout, AdminLayout (Ant Design)
â”œâ”€ pages/          # customer/ Â· auth/ Â· account/ Â· admin/
â”œâ”€ router/         # báº£ng route, RequireAuth, RequireAdmin, trang 403/404; khu admin táº£i lÆ°á»i (bundle riÃªng)
â””â”€ utils/          # format tiá»n/ngÃ y/giá», seatLayout (dá»±ng lÆ°á»›i gháº¿ tá»« tÃªn gháº¿)
```

**CÃ´ng nghá»‡:** React 18, TypeScript, Vite 5, React Router 6, Tailwind CSS 3 (khu khÃ¡ch hÃ ng), Ant Design 5 (khu admin),
Recharts (biá»ƒu Ä‘á»“), Zustand, dayjs, lunar-javascript (lá»‹ch Ã¢m), qrcode.react, lucide-react (icon).

**Quy Æ°á»›c:**
- Trang **khÃ´ng** Ä‘á»c `mock/db.ts` trá»±c tiáº¿p, chá»‰ gá»i hÃ m trong `src/api/`.
- Giá, ghế trống, hạn giữ chỗ đều lấy từ server (lớp API); frontend chỉ cộng để hiển thị tạm.
- Lỗi nghiệp vụ hiển thị nguyên văn thông điệp (toast hoặc dưới ô nhập); danh sách luôn có trạng thái đang tải / rỗng / lỗi.
- Màu chính `#2474E5`, nút hành động `#FFC700`, font Be Vietnam Pro.
