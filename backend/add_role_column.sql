-- Script để thêm cột role vào bảng users
-- Chạy script này trong MySQL nếu cột role chưa tồn tại
-- Lưu ý: Nếu cột đã tồn tại, sẽ có lỗi, nhưng không ảnh hưởng

-- Thêm cột role nếu chưa có
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' 
AFTER email;

-- Cập nhật giá trị mặc định cho các user hiện có (nếu chưa có role)
UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';

