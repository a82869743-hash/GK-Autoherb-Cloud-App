-- 092: in-app notification inbox + web push subscriptions (free phone notifications).
--   Every customer message/reminder is also saved here and pushed to the user's phones.
--   Additive only, no sample data, safe to re-run.

CREATE TABLE IF NOT EXISTS app_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  url VARCHAR(300) NULL,
  event VARCHAR(60) NULL,
  ref_type VARCHAR(40) NULL,
  ref_id INT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  pushed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_appnotif_user (user_id, is_read, created_at)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  endpoint VARCHAR(600) NOT NULL,
  p256dh VARCHAR(200) NOT NULL,
  auth VARCHAR(100) NOT NULL,
  user_agent VARCHAR(255) NULL,
  fail_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  UNIQUE KEY uq_push_endpoint (endpoint(255)),
  INDEX idx_push_user (user_id)
);
