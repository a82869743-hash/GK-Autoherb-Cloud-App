SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'gk_autoherb' AND TABLE_NAME = 'bookings' AND COLUMN_NAME IN ('job_type', 'wash_status', 'queue_position');
DESCRIBE deliveries;
