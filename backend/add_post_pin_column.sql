-- Script to add is_pinned column to posts table
-- Run this in MySQL to enable pin/unpin feature

ALTER TABLE posts
ADD COLUMN is_pinned TINYINT(1) NOT NULL DEFAULT 0
AFTER image;


