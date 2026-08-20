# Hệ thống Điểm danh & Nhận diện Học viên

Quản lý lớp, thời khóa biểu, điểm danh bằng webcam (InsightFace + OpenCV), lưu lịch sử và xuất báo cáo tỷ lệ hiện diện.

## Yêu cầu

- Python 3.11+
- Node.js 18+
- Webcam trên máy giảng viên (trình duyệt)

## Chạy backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

Lần nhận diện đầu tiên sẽ tải model InsightFace `buffalo_sc` (ONNX) về thư mục người dùng.

Đăng nhập: `Huy` / `Huy123` (đổi trong `backend/.env`).

## Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173

## Cách dùng

1. Tạo lớp học.
2. Thêm học viên và đăng ký khuôn mặt (upload hoặc chụp webcam — ảnh phải có đúng 1 mặt).
3. (Tuỳ chọn) nhập thời khóa biểu. Mở phiên trong khung giờ sẽ gắn ca hiện tại.
4. Vào **Điểm danh** → mở phiên → đưa mặt vào camera. Học viên khớp một lần / phiên (`present` hoặc `late` sau 10 phút).
5. Đóng phiên: học viên chưa khớp được ghi **vắng**.
6. Xem **Lịch sử** và **Báo cáo**, xuất CSV.

## Giới hạn v1

- Không chống giả mạo (ảnh in / điện thoại).
- Ánh sáng, góc mặt, kính đậm ảnh hưởng độ chính xác.
- Nên 1 camera / 1 lớp. Ngưỡng cosine mặc định `FACE_THRESHOLD=0.50` trong `.env`.
