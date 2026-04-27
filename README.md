# Social App (Full-stack) 

Ứng dụng mạng xã hội full-stack kèm trang quản trị (admin dashboard). Hệ thống hỗ trợ đăng nhập/đăng ký (JWT), upload media (Cloudinary) và chat/cập nhật trạng thái online theo thời gian thực (Socket.IO).

## Demo online

- Ứng dụng người dùng: `https://social-app-cyan-nine.vercel.app/`
- Trang quản trị: `https://socialappadmin.vercel.app/`

## Công nghệ sử dụng

- **Frontend (User)**: React + Vite, Tailwind CSS, React Router, Axios, Socket.IO Client, Framer Motion
- **Frontend (Admin)**: React + Vite, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express, Socket.IO, MySQL (`mysql2`), JWT, bcryptjs, Multer, Cloudinary
- **Triển khai**: Vercel (frontend), Render (backend), Railway (MySQL)

## Cấu trúc dự án

```
  social_app/
    backend/      # Node.js + Express API + Socket.IO
    my_social/    # Web app người dùng (Vite + React)
    admin/        # Dashboard quản trị (Vite + React)
```

## Yêu cầu trước khi chạy

- Node.js 18+ (khuyến nghị)
- npm (đi kèm Node)
- MySQL (cài local hoặc dùng Railway MySQL)
- (Tuỳ chọn) Tài khoản Cloudinary để lưu trữ ảnh/file

## Biến môi trường (Environment variables)

Repo đã có sẵn các file mẫu:

- `social_app/backend/.env.example`
- `social_app/my_social/.env.example`
- `social_app/admin/.env.example`

Tạo file `.env` cho local bằng cách copy từ các file mẫu trên.

### Backend (`social_app/backend/.env`)

Cần cấu hình:

- `PORT=5000`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:5174`
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB_NAME` (hoặc dùng `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)
- `CLOUDINARY_CLOUD_NAME=...`
- `CLOUDINARY_API_KEY=...`
- `CLOUDINARY_API_SECRET=...`

### Frontend (`social_app/my_social/.env`, `social_app/admin/.env`)

- `VITE_API_ORIGIN=http://localhost:5000` (khi chạy local)

## Chạy local (development)

Mở 3 terminal và chạy lần lượt:

### 1) Backend API + Socket.IO

```bash
cd social_app/backend
npm install
npm start
```

Backend mặc định: `http://localhost:5000`.

### 2) Ứng dụng người dùng

```bash
cd social_app/my_social
npm install
npm run dev
```

User app mặc định: `http://localhost:5173`.

### 3) Trang quản trị (Admin)

```bash
cd social_app/admin
npm install
npm run dev
```

Admin app mặc định: `http://localhost:5174`.

## Tổng quan API

Backend mount các route:

- `/api/users`
- `/api/admin`
- `/api/posts`
- `/api/comments`
- `/api/chats`
- `/api/tasks`
- `/api/documents`
- `/api/classes`

Phục vụ file upload:

- `/uploads` (static)
- `/api/files/:filename` (tải xuống)

## Ghi chú triển khai (Deployment)

Xem `social_app/DEPLOY.md` để tham khảo hướng dẫn deploy gốc. Luồng triển khai thường dùng:

- **Railway**: tạo MySQL và set `DATABASE_URL`
- **Render**: deploy `social_app/backend` (build: `npm install`, start: `npm start`)
- **Vercel**: deploy `social_app/my_social` và `social_app/admin` (set `VITE_API_ORIGIN` trỏ về URL backend trên Render)

<img width="639" height="402" alt="image" src="https://github.com/user-attachments/assets/96ec7f73-959f-4145-bec1-2bd5fd0d812b" />
<img width="492" height="316" alt="image" src="https://github.com/user-attachments/assets/bbeba440-2a3f-4963-aede-8a8ecaec246c" />
<img width="736" height="407" alt="image" src="https://github.com/user-attachments/assets/2804d40d-9260-49a1-9ec4-061608a19e85" />
<img width="578" height="345" alt="image" src="https://github.com/user-attachments/assets/51a5c8b2-2dfc-4cfc-8ccc-621063c8c5f9" />
<img width="741" height="415" alt="image" src="https://github.com/user-attachments/assets/63221885-47d6-4c1c-968c-b6ee5931587c" />
<img width="733" height="412" alt="image" src="https://github.com/user-attachments/assets/57025e89-1e22-4749-9ac2-3cbab7d55a7b" />
<img width="547" height="313" alt="image" src="https://github.com/user-attachments/assets/0744f23d-3ae6-48a5-82b0-f46c4ba6991a" />
<img width="673" height="413" alt="image" src="https://github.com/user-attachments/assets/75e05c98-f3a1-4277-bbc4-e0b5738a8548" />
<img width="733" height="396" alt="image" src="https://github.com/user-attachments/assets/3af80388-dcc0-44a3-ab9c-bd343ba0d7c6" />
<img width="739" height="436" alt="image" src="https://github.com/user-attachments/assets/50e2c391-85ad-42d0-9b69-3c110ee86cdf" />
<img width="744" height="447" alt="image" src="https://github.com/user-attachments/assets/d537ef9a-17f3-464f-afc9-e66d741454e8" />









