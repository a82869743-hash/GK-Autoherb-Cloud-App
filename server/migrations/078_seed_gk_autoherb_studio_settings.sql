-- Migration 078: Ensure GK AutoHerb Studio Profile and Geo-Location Settings
INSERT INTO settings (key_name, value) VALUES
  ('studio_name',          'GK AutoHerb Detailing Studio'),
  ('studio_address',       'Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410'),
  ('studio_area',          'Gotri - Vasna - Bhayli Road, Vadodara'),
  ('studio_mobile',        '9408424541'),
  ('studio_email',         'gaurav.itm2006@gmail.com'),
  ('studio_gst',           '24AKUPK0446L1ZT'),
  ('invoice_prefix',       'GKA'),
  ('admin_whatsapp',       '919408424541'),
  ('studio_lat',           '22.3134'),
  ('studio_lng',           '73.1342')
ON DUPLICATE KEY UPDATE value = VALUES(value);
