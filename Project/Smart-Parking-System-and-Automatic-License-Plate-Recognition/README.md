# Smart Parking

Hệ thống quản lý bãi xe và nhận diện biển số tự động, gồm dashboard vận hành React và API FastAPI cho OCR/đối soát lượt xe.

## Tính năng hiện có

- Dashboard theo dõi chỗ trống, xe đang đỗ, doanh thu và lưu lượng trong ngày.
- Ghi nhận xe vào với webcam trình duyệt hoặc nhập biển số thủ công.
- Ghi nhận xe ra theo phiên đang đỗ và tính phí theo loại xe/thời gian.
- Phân biệt vé lượt và thẻ thành viên trong dữ liệu phiên.
- Cảnh báo khi biển số lúc ra không trùng biển số lúc vào; không thể hoàn tất âm thầm nếu chưa xác nhận.
- FastAPI endpoint upload ảnh, OpenCV và EasyOCR tùy chọn.

## Công nghệ

- Frontend: React 19, TypeScript, Vite, `lucide-react`.
- Backend: Python, FastAPI, Pydantic, OpenCV, EasyOCR.
- Persistence hiện tại: memory repository; có thể thay bằng PostgreSQL hoặc MySQL mà không đổi contract frontend/API.

## Chạy frontend

```powershell
npm install
npm run dev
```

Mở `http://localhost:5173/`. Webcam cần quyền truy cập và chạy trên localhost hoặc HTTPS.

Kiểm tra production build:

```powershell
npm run build
npm run lint
```

## Chạy backend

Yêu cầu Python 3.11+.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

EasyOCR sẽ tải model ở lần chạy đầu. Nếu chưa cài các dependency OCR hoặc ảnh không hợp lệ, API trả lỗi 422 để frontend dùng phương án nhập tay.

## API chính

- `GET /api/health`: kiểm tra API.
- `POST /api/ocr`: upload multipart field `file` để đọc biển số.
- `GET /api/sessions`: lấy các phiên đang đỗ.
- `POST /api/sessions/entry`: tạo phiên xe vào.
- `POST /api/sessions/{session_id}/exit`: ghi nhận xe ra, đối soát và tính phí.

Ví dụ tạo phiên xe vào:

```json
{
  "plate": "51H-882.16",
  "vehicle_type": "car",
  "ticket_type": "hourly"
}
```

## Kiến trúc tiếp theo

Frontend hiện có dữ liệu demo để vận hành ngay và backend có memory store cho API. Giai đoạn production cần nối dashboard vào API, thêm database migration, chỉ mục theo biển số/trạng thái, xác thực nhân viên, lưu ảnh vào object storage và tách worker OCR khỏi request đồng bộ.