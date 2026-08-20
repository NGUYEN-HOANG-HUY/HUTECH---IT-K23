# Student Attendance (HUTECH-IT-K23) — Codebase Overview

## Summary
Hệ thống điểm danh học viên bằng nhận diện khuôn mặt (InsightFace `buffalo_sc` + OpenCV). Backend FastAPI + SQLAlchemy (SQLite), frontend React 18 + Vite. Giảng viên tạo lớp, đăng ký khuôn mặt học viên, mở phiên điểm danh, webcam quét mặt → khớp embedding → ghi nhận `present`/`late`/`absent`, xem lịch sử và xuất báo cáo CSV.

## 🔑 CHẨN ĐOÁN ĐĂNG NHẬP (trọng tâm yêu cầu)

### Nguyên nhân gần như chắc chắn: sai thông tin đăng nhập
Luồng đăng nhập **trong code là nhất quán và hoạt động đúng**. Vấn đề nằm ở **sự lệch credentials giữa 3 nơi**:

| Nơi | Giá trị |
|---|---|
| `backend/.env` (thực tế đang chạy) | `ADMIN_USERNAME=Huy`, `ADMIN_PASSWORD=Huy123` |
| `frontend/src/pages/Login.jsx` (pre-fill ô input) | `admin` / `admin123` |
| `README.md` (tài liệu) | `admin` / `admin123` |

→ Nếu người dùng nhập `admin`/`admin123` (đúng theo form mặc định hoặc README), backend trả về **HTTP 401** với detail `"Sai tài khoản hoặc mật khẩu"` (từ `backend/app/auth.py` → `login()`). **Phải nhập `Huy` / `Huy123`** — hoặc thống nhất lại credentials.

### Cách xác minh trong 10 giây
Mở DevTools → tab Network → gửi form đăng nhập → nhìn request `POST /api/auth/login`:
- Nếu response **401** kèm `detail: "Sai tài khoản hoặc mật khẩu"` → đúng là lệch credentials.
- Nếu **Failed to fetch / 502 / ECONNREFUSED** → backend chưa chạy hoặc không ở cổng 8000 (xem Nguyên nhân 2).

### Nguyên nhân phụ khác
2. **Backend chưa chạy / sai cổng:** `frontend/vite.config.js` proxy mọi `/api` → `http://127.0.0.1:8000`. Uvicorn phải chạy ở cổng 8000 (README: `uvicorn app.main:app --reload --port 8000` từ thư mục `backend/`).
3. **CORS:** backend chỉ cho phép origin `http://localhost:5173` và `http://127.0.0.1:5173`. Khi dev qua Vite proxy thì request là same-origin nên không sao; chỉ lỗi nếu mở frontend bằng origin khác (ví dụ IP LAN).
4. *(Không phải lỗi)* `config.py` nạp `.env` bằng đường dẫn tuyệt đối `BASE_DIR / ".env"` (BASE_DIR = `backend/`) nên chạy từ đâu cũng tìm đúng file. Không có vấn đề "không nạp được .env".

### Fix đề xuất (chuyển sang Act Mode để thực hiện)
- **Cách 1 (nhanh nhất):** sửa pre-fill trong `frontend/src/pages/Login.jsx` thành `Huy`/`Huy123` cho khớp `.env` (hoặc đổi thành placeholder rỗng để không gây hiểu lầm), đồng thời cập nhật README.
- **Cách 2 (đồng bộ tài liệu):** đổi `backend/.env` về `admin`/`admin123` để khớp README + form hiện tại.
- Lưu ý bảo mật: `.env` đang dùng `SECRET_KEY=doi-secret-nay-khi-chay-that` (giá trị mặc định) — nên đổi khi chạy thật.

> ⚠️ Tôi đang ở **Explore Mode** — chỉ phân tích, không chạy lệnh và không sửa code được. Để áp dụng fix, chuyển sang **Act Mode** (bộ chọn chế độ ở cuối chat). Toàn bộ phân tích trên sẽ được giữ làm ngữ cảnh.

---

## Architecture
- **Pattern:** Layered REST — `routers` (HTTP) → service logic nằm ngay trong router → SQLAlchemy ORM models → SQLite. Frontend React SPA gọi API qua Vite dev proxy.
- **Nhận diện khuôn mặt:** singleton `FaceEngine` (`backend/app/face_service.py`) lazy-load model InsightFace `buffalo_sc` (CPU, ONNX). Lần gọi đầu tiên sẽ tự tải model về thư mục người dùng. So khớp bằng **cosine similarity** trên `normed_embedding`, ngưỡng `FACE_THRESHOLD` (0.45).
- **Auth:** KHÔNG dùng JWT/OAuth. Token là chuỗi `HMAC-SHA256(SECRET_KEY, "username:password")` — stateless, **không hết hạn**, bị vô hiệu ngay khi đổi `SECRET_KEY`/`ADMIN_USERNAME`/`ADMIN_PASSWORD` (vì token được tính lại mỗi request). Frontend lưu token trong `localStorage["sa_token"]`, gửi qua header `Authorization: Bearer <token>`.
- **Khởi động:** `backend/app/main.py` tạo thư mục uploads, `Base.metadata.create_all(engine)` tự tạo bảng, mount static `/uploads`, include 6 router với prefix `/api`. Frontend: `main.jsx` → `BrowserRouter` → `App.jsx` → route guard `Guard` (có token mới vào `/`, không thì redirect `/login`).

## Directory Structure
```
student-attendance/
├── README.md                       — Hướng dẫn chạy, tài khoản mặc định, giới hạn v1
├── package-lock.json               — (root, không dùng cho frontend/backend)
├── backend/
│   ├── .env                        — ⚠️ Credentials THỰC TẾ: Huy/Huy123
│   ├── .env.example                — Mẫu: admin/admin123
│   ├── requirements.txt            — FastAPI, SQLAlchemy, insightface, opencv, onnxruntime…
│   └── app/
│       ├── main.py                 — FastAPI app, CORS, static mounts, create_all
│       ├── config.py               — Đọc .env, hằng số, đường dẫn uploads
│       ├── database.py             — Engine + SessionLocal + Base + get_db
│       ├── auth.py                 — login(), require_admin(), HMAC token
│       ├── models.py               — ClassRoom, Student, TimetableSlot, AttendanceSession, AttendanceRecord
│       ├── schemas.py              — Pydantic request/response models
│       ├── face_service.py         — FaceEngine (InsightFace), cosine, match, pack/unpack
│       └── routers/
│           ├── auth.py             — POST /api/auth/login, GET /api/auth/me
│           ├── classes.py          — CRUD lớp
│           ├── students.py         — CRUD học viên + đăng ký khuôn mặt (multipart)
│           ├── timetable.py        — CRUD tiết học
│           ├── sessions.py         — Mở/đóng phiên, nhận diện điểm danh
│           └── reports.py          — Báo cáo tỷ lệ hiện diện + xuất CSV (BOM UTF-8)
│   └── uploads/                    — faces/, snapshots/ (tạo tự động)
└── frontend/
    ├── vite.config.js              — Port 5173, proxy /api + /uploads → 127.0.0.1:8000
    ├── package.json                — React 18, react-router-dom 6, Vite 5
    └── src/
        ├── api.js                  — fetch wrapper + token localStorage + api object
        ├── App.jsx                 — Routes + Guard (auth redirect)
        ├── main.jsx                — React root + BrowserRouter
        ├── styles.css
        ├── components/Layout.jsx   — Sidebar nav + logout
        └── pages/                  — Login, Attendance, Classes, Students, Timetable, History, Reports
```

## Key Abstractions

### `FaceEngine` (singleton)
- **File:** `backend/app/face_service.py` (dòng ~10)
- **Trách nhiệm:** lazy-load InsightFace FaceAnalysis, decode ảnh, tạo embedding, cắt crop khuôn mặt.
- **Interface:** `enroll_embedding(bytes) → (emb, crop)` — đúng 1 mặt, lỗi nếu 0 hoặc >1; `embeddings_from_frame(bytes) → [(emb, bbox)]`; `decode_image(bytes)`.
- **Điểm đáng chú ý:** lock threading + lazy init — model chỉ tải 1 lần, chia sẻ bởi mọi request; request đầu tiên có thể chậm vài giây (tải model).

### `match_student(query, gallery, threshold) → (sid, score)`
- **File:** `backend/app/face_service.py`
- So embedding khuôn mặt vào gallery `[(student_id, embedding)]`, chọn cosine cao nhất; trả `None` nếu dưới ngưỡng.

### `require_admin` / `login`
- **File:** `backend/app/auth.py`
- Tất cả router (trừ login) đều `Depends(require_admin)`. Token = `hmac_sha256(SECRET_KEY, f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}")`, so sánh bằng `hmac.compare_digest`. Mọi tài khoản đều là admin — chỉ có 1 cặp credentials duy nhất.

### `AttendanceSession` / `AttendanceRecord`
- **File:** `backend/app/models.py`
- Session có status `open|closed`; record có `present|late|absent`, ràng buộc unique `(session_id, student_id)` — mỗi học viên chỉ 1 record/phiên. Khi quét lại: cập nhật status từ `absent`→`present/late` (không tạo mới).

### `_current_slot` / `_attendance_status`
- **File:** `backend/app/routers/sessions.py`
- Tự gắn slot đang diễn ra (theo weekday + giờ) khi mở phiên không truyền `slot_id`. `late` nếu quá `grace_minutes` (mặc định 10 phút) kể từ `opened_at`.

### `request()` wrapper
- **File:** `frontend/src/api.js`
- Tự đính `Authorization` (trừ khi token rỗng), tự set JSON Content-Type (trừ FormData), parse lỗi `detail` (kể cả mảng validation), tự logout + redirect `/login` khi 401 (ngoại trừ chính endpoint login).

## Data Flow — Đăng nhập
1. `Login.jsx` submit → `api.login(username, password)` → `POST /api/auth/login` body JSON.
2. Vite proxy (`vite.config.js`) chuyển tiếp tới `http://127.0.0.1:8000`.
3. `routers/auth.py:do_login()` → `auth.login()` so sánh `hmac.compare_digest` với `.env`.
4. Đúng → trả `TokenOut{access_token}`; sai → **401 `{"detail":"Sai tài khoản hoặc mật khẩu"}`**.
5. `api.login` trả về `{...data, token: data.access_token}`; `Login.jsx` lấy `access_token ?? token` → `setToken()` lưu `localStorage.sa_token` → `nav("/diem-danh")`.
6. Các request sau: `request()` đính `Authorization: Bearer <token>`; backend tính lại token để xác thực.

## Data Flow — Điểm danh
1. `Attendance.jsx` gọi `api.openSession(classId, slotId)` → tạo session `open` (cấm 2 phiên mở cùng lớp).
2. Camera gửi frame liên tục → `api.recognize(sessionId, blob)` (multipart) → `sessions.py:recognize()`.
3. `FaceEngine.embeddings_from_frame()` → so với gallery embedding của học viên trong lớp → `match_student()`.
4. Khớp → tạo/cập nhật `AttendanceRecord` (status theo grace period), lưu snapshot crop.
5. Đóng phiên: mọi học viên chưa có record bị ghi `absent`; report tính tỷ lệ trên các session `closed`.

## Non-Obvious Behaviors & Design Decisions
- **Token không hết hạn và không theo phiên:** an toàn vừa phải cho công cụ nội bộ nhưng không nên dùng production. Đổi mật khẩu/secret = đăng xuất toàn bộ client.
- **Mỗi học viên chỉ được điểm danh 1 lần/phiên** (unique constraint); quét lại chỉ sửa `status`/`confidence`/`snapshot`, `newly_marked` báo frontend biết lần đầu.
- **Embedding lưu dạng blob** (`packing()` = float32 raw bytes); model `buffalo_sc` bị khóa cứng, `det_size=(640,640)`, CPU chỉ định.
- **Điểm danh so khớp theo từng lớp đang mở** (gallery = `session.classroom.students`), không phải toàn hệ thống → nhanh hơn, đúng ngữ cảnh.
- **Report CSV có BOM `\ufeff`** để Excel mở tiếng Việt không bị lỗi font.
- **Check slot theo giờ địa phương** (`datetime.now()`) nhưng `opened_at`/`recognized_at` lại dùng `datetime.utcnow()` — có thể lệch múi giờ nếu server không phải UTC+7 (chênh 7h sẽ làm sai deadline `late` và filter báo cáo). Đây là lỗi tiềm ẩn cho môi trường ngoài Việt Nam.
- **CORS chỉ cho 2 origin localhost** — triển khai thật phải cấu hình lại.
- **`GRACE_MINUTES` lưu cả trong `.env` lẫn `SessionOpenIn.grace_minutes`** — ưu tiên giá trị từ request.

## Module Reference
| File | Mục đích |
|------|----------|
| `backend/app/main.py` | Khởi tạo FastAPI, CORS, tạo bảng, mount static, include routers |
| `backend/app/config.py` | Nạp `.env` (BASE_DIR tuyệt đối), hằng số cấu hình, đường dẫn upload |
| `backend/app/auth.py` | Sinh/xác thực HMAC token, `require_admin` guard |
| `backend/app/models.py` | 5 bảng ORM: classes, students, timetable_slots, attendance_sessions, attendance_records |
| `backend/app/schemas.py` | Pydantic models; chú ý các field alias linh hoạt (`code`/`student_code`, `name`/`student_name`, `student_name`/`full_name`) để frontend không cần map |
| `backend/app/face_service.py` | Nhận diện khuôn mặt, embedding, so khớp cosine, pack/unpack blob |
| `backend/app/routers/auth.py` | Login + /me |
| `backend/app/routers/classes.py` | CRUD lớp, đếm số học viên |
| `backend/app/routers/students.py` | CRUD học viên, đăng ký khuôn mặt (upload/camera, multipart form) |
| `backend/app/routers/timetable.py` | CRUD tiết học, validate HH:MM, start < end |
| `backend/app/routers/sessions.py` | Mở/đóng phiên, auto-gắn slot, endpoint recognize (lõi điểm danh) |
| `backend/app/routers/reports.py` | Báo cáo tỷ lệ hiện diện + CSV có BOM |
| `frontend/src/api.js` | Fetch wrapper, token storage, toàn bộ API client |
| `frontend/src/App.jsx` | Routes + auth Guard |
| `frontend/src/components/Layout.jsx` | Sidebar, logout |
| `frontend/src/pages/Login.jsx` | ⚠️ Form login pre-fill `admin`/`admin123` — lệch với `.env` (`Huy`/`Huy123`) |
| `frontend/src/pages/Attendance.jsx` | Trang điểm danh (webcam + recognize loop) |
| `frontend/src/pages/Classes.jsx` / `Students.jsx` / `Timetable.jsx` | CRUD UI tương ứng |
| `frontend/src/pages/History.jsx` / `Reports.jsx` | Xem lịch sử phiên, báo cáo + tải CSV |
| `frontend/vite.config.js` | Dev server 5173, proxy `/api` + `/uploads` → 127.0.0.1:8000 |

## Suggested Reading Order
1. `README.md` — bối cảnh, cách chạy, credentials mặc định.
2. `backend/app/main.py` — cách hệ thống khởi động và nối các module.
3. `backend/app/auth.py` + `backend/app/config.py` — hiểu cơ chế đăng nhập/token và nguồn credentials (liên quan trực tiếp yêu cầu hiện tại).
4. `backend/app/models.py` + `backend/app/schemas.py` — cấu trúc dữ liệu và hợp đồng API.
5. `backend/app/routers/sessions.py` — logic lõi: mở phiên, nhận diện, đóng phiên.
6. `frontend/src/api.js` + `frontend/src/pages/Login.jsx` — luồng gọi API từ UI, nơi cần sửa pre-fill login.

---

**Báo cáo đã được lưu vào `project_info__1.md` ở thư mục gốc dự án.**

**Tóm tắt cho yêu cầu của bạn:** Hệ thống đăng nhập hoạt động đúng — vấn đề là `backend/.env` đang để tài khoản **`Huy` / `Huy123`** trong khi form và README hiển thị `admin` / `admin123`. Hãy thử đăng nhập bằng `Huy` / `Huy123`. Nếu muốn sửa code (đổi pre-fill form, README, hoặc đổi `.env`) cho đồng bộ, vui lòng chuyển sang **Act Mode** để tôi thực hiện thay đổi.