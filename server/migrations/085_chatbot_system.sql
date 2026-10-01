-- ==========================================================
-- 085_chatbot_system.sql
-- Chatbot conversations, messages, and studio knowledge base
-- ==========================================================

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(100) NOT NULL UNIQUE,
  user_id INT NULL,
  customer_name VARCHAR(150) NULL,
  customer_phone VARCHAR(50) NULL,
  customer_email VARCHAR(150) NULL,
  lead_status ENUM('active', 'lead_captured', 'inquiry_created', 'closed') DEFAULT 'active',
  inquiry_id INT NULL,
  summary VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_user (user_id),
  INDEX idx_lead_status (lead_status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender ENUM('user', 'bot', 'admin') NOT NULL,
  message TEXT NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conv (conversation_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_knowledge (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) DEFAULT 'general',
  keywords VARCHAR(255) NOT NULL,
  question VARCHAR(255) NOT NULL,
  answer TEXT NOT NULL,
  action_url VARCHAR(255) NULL,
  action_label VARCHAR(100) NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cat (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed of Curated GK AutoHerb Studio Knowledge Base
INSERT IGNORE INTO chatbot_knowledge (id, category, keywords, question, answer, action_url, action_label, sort_order) VALUES
(1, 'helpline', 'contact,phone,helpline,call,number,support,whatsapp,reach,emergency', 'What is the studio helpline number and how can I contact you?', 'You can reach GK AutoHerb Studio directly at our customer helpline: +91 98765 43210. Our team is available 7 days a week from 9:00 AM to 8:00 PM for booking assistance, service updates, and emergency support.', '/customer/booking', 'Book a Slot Online', 1),
(2, 'services', 'ceramic,coating,9h,10h,shine,paint,protection,scratch', 'What is Ceramic Coating and what are its benefits?', 'GK AutoHerb Ceramic Coating provides ultra-hydrophobic 9H/10H nano-ceramic shielding against UV rays, acid rain, swirl marks, bird droppings, and harsh oxidation. It delivers an intense mirror gloss, deep wet-look reflection, and lasts 2 to 5 years depending on the tier chosen.', '/customer/services', 'Explore Detailing Services', 2),
(3, 'services', 'ppf,paint protection film,tpu,self healing,stone chips,wrap', 'What is PPF (Paint Protection Film) and do you offer it?', 'Yes! We apply premium self-healing TPU Paint Protection Film (PPF) that protects your car against stone chips, highway debris, key scratches, and parking blemishes. It features instantaneous heat-activated self-healing and comes with up to a 5-10 year warranty.', '/customer/services', 'View Paint Protection Services', 3),
(4, 'packages', 'packages,membership,gold,silver,bronze,diamond,platinum,plans,subscription', 'What packages or memberships does GK AutoHerb offer?', 'We offer 5 tiers of Car Care Packages: Bronze, Silver, Gold (Bestseller with 12 washes & 3 wax coats), Diamond, and Platinum. Subscribing gives you massive savings of up to 40% over individual service bookings, priority bay allocation, and complimentary wash vouchers!', '/customer/buy-packages', 'Compare All Packages', 4),
(5, 'products', 'products,store,accessories,vacuum,inflator,cushion,cloth,microfiber,buy,shop', 'What car accessories and detailing products can I buy in the store?', 'Our studio store features verified genuine accessories: Memory Foam Ergonomic Cushion Pillows, 150 PSI Digital Tyre Inflators, High-Suction Portable Car Vacuums, Premium 800 GSM Microfiber Towels, and Acoustic Damping Sheets. You can order online directly with doorstep delivery or studio pickup.', '/customer/products', 'Browse Studio Store', 5),
(6, 'pickup_drop', 'pickup,drop,doorstep,driver,home,concierge,delivery,valet', 'Do you provide doorstep vehicle pickup and drop service?', 'Yes! GK AutoHerb offers convenient Concierge Pickup & Drop. Our certified driver inspects and collects your vehicle from your home or office, brings it to our detailing studio, and safely delivers it back once gleaming clean. You can track the driver live on your dashboard!', '/customer/booking', 'Schedule with Pickup', 6),
(7, 'loyalty', 'loyalty,points,credits,rewards,free wash,wax,coins,burn,redeem', 'How does the GK Loyalty & Rewards program work?', 'Every invoice earns you loyalty points (1 point per ₹100 spend). Points convert 1:1 into direct invoice cash discounts! Furthermore, membership packages and special studio visits grant you Complimentary Wash Vouchers and Wax sessions redeemable during any booking.', '/customer/loyalty', 'Check My Loyalty Wallet', 7),
(8, 'general', 'timing,hours,open,sunday,location,address,where,visit', 'What are your studio operational timings and address?', 'GK AutoHerb Studio is open 7 days a week from 9:00 AM to 8:00 PM. We are located at GK AutoHerb Detailing Studio, Premium Auto Boulevard, Gujarat. Walk-ins and pre-booked slots are warmly welcomed!', '/customer/booking', 'Reserve Bay Slot', 8);
