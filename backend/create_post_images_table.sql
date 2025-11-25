-- Script để tạo bảng post_images cho nhiều ảnh
CREATE TABLE IF NOT EXISTS post_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  image VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

