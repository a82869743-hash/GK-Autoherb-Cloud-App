const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── HELPER: Fetch Studio Operational Settings ──────────────────────────────
async function getStudioSettings() {
  try {
    const [rows] = await pool.query('SELECT key_name, value FROM settings');
    const map = {};
    for (const r of rows) map[r.key_name] = r.value;
    return {
      studio_name: map.studio_name || 'GK AutoHerb Studio',
      studio_mobile: map.studio_mobile || '+91 98765 43210',
      studio_email: map.studio_email || 'support@gkautoherb.com',
      studio_address: map.studio_address || 'GK AutoHerb Detailing Studio, Premium Auto Boulevard, Gujarat',
      timings: 'Monday to Sunday, 9:00 AM – 8:00 PM',
      concierge_rate: map.concierge_fixed_rate ? `₹${map.concierge_fixed_rate}` : 'Nominal flat rate'
    };
  } catch {
    return {
      studio_name: 'GK AutoHerb Studio',
      studio_mobile: '+91 98765 43210',
      studio_email: 'support@gkautoherb.com',
      studio_address: 'GK AutoHerb Detailing Studio, Premium Auto Boulevard, Gujarat',
      timings: 'Monday to Sunday, 9:00 AM – 8:00 PM',
      concierge_rate: 'Nominal flat rate'
    };
  }
}

// ─── HELPER: Fetch User Workshop Profile (if logged in) ──────────────────────
async function getUserContext(userId) {
  if (!userId) return null;
  try {
    const [vehicles] = await pool.query('SELECT * FROM vehicles WHERE user_id = ?', [userId]);
    const [activeJobs] = await pool.query(`
      SELECT jc.*, v.brand, v.model, v.registration_no
      FROM job_carts jc
      JOIN vehicles v ON jc.vehicle_id = v.id
      WHERE v.user_id = ? AND jc.status NOT IN ('delivered', 'cancelled')
      ORDER BY jc.created_at DESC LIMIT 1
    `, [userId]);

    const [packages] = await pool.query(`
      SELECT up.*, p.name as package_name, p.free_washes_count, p.wax_coat_count
      FROM user_packages up
      JOIN packages p ON up.package_id = p.id
      WHERE up.user_id = ? AND up.status = 'active'
      LIMIT 1
    `, [userId]);

    const [loyalty] = await pool.query('SELECT * FROM loyalty WHERE customer_id = ? LIMIT 1', [userId]);

    return {
      vehicles: vehicles || [],
      activeJob: activeJobs.length ? activeJobs[0] : null,
      activePackage: packages.length ? packages[0] : null,
      loyalty: loyalty.length ? loyalty[0] : null
    };
  } catch (err) {
    console.warn('Could not fetch user context for chatbot:', err.message);
    return null;
  }
}

// ─── HELPER: Intelligent Knowledge Response Generator ────────────────────────
async function generateBotReply(userMessage, conversation, userCtx) {
  const q = (userMessage || '').trim().toLowerCase();
  const settings = await getStudioSettings();

  // 1. Check custom admin knowledge base overrides first
  try {
    const [kbRows] = await pool.query('SELECT * FROM chatbot_knowledge WHERE is_active = 1 ORDER BY sort_order ASC');
    for (const kb of kbRows) {
      const keywords = (kb.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const matched = keywords.some(k => q.includes(k));
      if (matched) {
        return {
          reply: kb.answer,
          intent: kb.category,
          actionUrl: kb.action_url,
          actionLabel: kb.action_label,
          chips: ['Book a Slot', 'Membership Packages', 'Store Accessories', 'Helpline Number']
        };
      }
    }
  } catch (kbErr) {
    console.warn('Knowledge query error:', kbErr.message);
  }

  // 2. Active Car & Live Job Status Tracking Intent
  if (q.includes('where is my car') || q.includes('car status') || q.includes('job status') || q.includes('my vehicle') || q.includes('tracking') || q.includes('track')) {
    if (userCtx?.activeJob) {
      const job = userCtx.activeJob;
      const stageName = job.status === 'in_progress' ? 'Detailing & Wash Bay (In Progress)' 
                      : job.status === 'qc' ? 'Final Quality Inspection' 
                      : job.status === 'ready' ? 'Ready for Pickup / Out for Delivery' 
                      : 'Intake Bay Inspection';
      return {
        reply: `🚗 **Live Status for ${job.brand} ${job.model} (${job.registration_no})**\n\nYour vehicle is currently in **${stageName}**.\nJob Card: #${job.id || job.job_card_number || 'N/A'}\n\nOur certified detailers are working on it with utmost precision!`,
        intent: 'job_tracking',
        actionUrl: `/job/${job.id}`,
        actionLabel: 'View Progress & Live Photos',
        chips: ['Call Studio', 'Book Next Visit', 'Store Products']
      };
    } else if (userCtx?.vehicles?.length) {
      const car = userCtx.vehicles[0];
      return {
        reply: `You have registered vehicle **${car.brand} ${car.model} (${car.registration_no})**, but there is currently no vehicle actively checked into the studio bay.\n\nWould you like to schedule an appointment for today or upcoming days?`,
        intent: 'job_tracking',
        actionUrl: '/customer/booking',
        actionLabel: 'Book Detailing Appointment',
        chips: ['Explore Wash Packages', 'Helpline Number', 'Store Products']
      };
    } else {
      return {
        reply: `To check live vehicle progress, please log in to your registered customer account or enter your Vehicle Registration Number below so our team can pull up your studio status!`,
        intent: 'job_tracking',
        actionUrl: '/customer/booking',
        actionLabel: 'Book a Slot',
        chips: ['Helpline Number', 'Services & Rates', 'Packages']
      };
    }
  }

  // 3. Ceramic & PPF Detailing Services Intent
  if (q.includes('ceramic') || q.includes('coating') || q.includes('ppf') || q.includes('paint protection') || q.includes('detailing') || q.includes('wax') || q.includes('polish')) {
    return {
      reply: `🛡️ **GK AutoHerb Paint Protection & Detailing Suite**:\n\n• **9H/10H Nano-Ceramic Coating**: Deep wet-look gloss, 99% UV rejection, hydrophobic water-beading, swirl protection (Durability: 2–5 Years).\n• **TPU Self-Healing PPF**: Military-grade shield against gravel, rock chips, key scratches, and highway debris with heat self-healing technology.\n• **Body Hybrid Ceramic Wax Coat**: High-luster protective seal included in our Gold & Platinum tiers.\n\nWould you like a custom quote for your car's model?`,
      intent: 'services_detailing',
      actionUrl: '/customer/services',
      actionLabel: 'View Detailed Service Menu',
      chips: ['Book Detailing Slot', 'Packages Comparison', 'Call Studio Manager']
    };
  }

  // 4. Wash & Pricing Intent
  if (q.includes('wash') || q.includes('cleaning') || q.includes('price') || q.includes('rate') || q.includes('cost') || q.includes('charges')) {
    return {
      reply: `💧 **GK AutoHerb Wash & Care Pricing**:\n\n• **Full Foam Wash**: pH-neutral snow foam, underbody wash, alloy wheel de-greasing, microfiber dual-bucket hand wash, interior vacuuming & tire dressing.\n• **Two-Wheeler Wash**: High-pressure clean, engine degrease & gloss glaze coat.\n• **Deep Interior Sanitization**: Steam extraction, fabric deep shampoo, leather conditioning & AC vent disinfection.\n\n*Pricing is calibrated transparently based on vehicle category (Hatchback / Sedan / SUV). Members save up to 40% with packages!*`,
      intent: 'services_wash',
      actionUrl: '/customer/booking',
      actionLabel: 'Check Pricing & Book Slot',
      chips: ['Compare Packages', 'Doorstep Pickup Info', 'Helpline Number']
    };
  }

  // 5. Membership Packages Intent
  if (q.includes('package') || q.includes('membership') || q.includes('subscription') || q.includes('plan') || q.includes('gold') || q.includes('silver') || q.includes('bronze') || q.includes('platinum')) {
    return {
      reply: `💎 **GK AutoHerb Car Care Memberships**:\n\n1. **Bronze**: 4 Full Foam Washes + 1 Body Wax Coat\n2. **Silver**: 7 Full Foam Washes + 2 Body Wax Coats + 1 Two-Wheeler Wash\n3. **Gold (Most Popular ⭐)**: 12 Full Foam Washes + 3 Body Wax Coats + Two-Wheeler benefits\n4. **Diamond**: 16 Full Foam Washes + 2 Body Hybrid Ceramic Wax Coats + Bike Washes\n5. **Platinum (VIP)**: 20 Full Foam Washes + 3 Ceramic Wax Coats + Complete Interior Deep Cleaning\n\nAll packages include priority lane allocation, validity up to 1 year, and free complimentary voucher transfers!`,
      intent: 'packages',
      actionUrl: '/customer/buy-packages',
      actionLabel: 'Subscribe to Package',
      chips: ['Book from Package', 'Store Products', 'Call Helpline']
    };
  }

  // 6. Store Products & Car Accessories Intent
  if (q.includes('product') || q.includes('store') || q.includes('accessory') || q.includes('vacuum') || q.includes('inflator') || q.includes('cushion') || q.includes('cloth') || q.includes('towel') || q.includes('damping')) {
    return {
      reply: `🛍️ **GK AutoHerb Genuine Accessories & Studio Store**:\n\n• **ASTONISH Memory Foam Cushion Pillow**: Ergonomic high-density lumbar support with red racing stitch.\n• **Digital Tyre Inflator (150 PSI)**: Quick auto shut-off, backlit LCD pressure gauge & built-in LED flashlight.\n• **High-Power Portable Car Vacuum**: Wet & dry cyclonic suction with HEPA filter.\n• **800 GSM Microfiber Detailing Towels**: Ultra-plush edgeless lint-free drying cloths.\n• **Acoustic Sound Damping Sheets**: Eliminates cabin road noise & rattles.\n\nAll items are tested in our detailing studio and shipped with warranty!`,
      intent: 'store_products',
      actionUrl: '/customer/products',
      actionLabel: 'Shop Accessories Store',
      chips: ['View Packages', 'Book a Slot', 'Helpline Number']
    };
  }

  // 7. Helpline, Contact, Address & Timings Intent
  if (q.includes('help') || q.includes('contact') || q.includes('call') || q.includes('phone') || q.includes('number') || q.includes('address') || q.includes('location') || q.includes('timing') || q.includes('hours')) {
    return {
      reply: `📍 **GK AutoHerb Detailing Studio Headquarters**:\n\n• **Direct Helpline**: [${settings.studio_mobile}](tel:${settings.studio_mobile.replace(/\s+/g, '')})\n• **Email Support**: ${settings.studio_email}\n• **Studio Address**: ${settings.studio_address}\n• **Operating Hours**: ${settings.timings}\n• **Doorstep Concierge**: Valet vehicle pickup & drop available across city limits!\n\nOur customer relationship executives are ready to assist you anytime.`,
      intent: 'helpline',
      actionUrl: `tel:${settings.studio_mobile.replace(/\s+/g, '')}`,
      actionLabel: `Call Helpline (${settings.studio_mobile})`,
      chips: ['Book a Slot', 'Doorstep Pickup Info', 'Packages']
    };
  }

  // 8. Doorstep Pickup & Drop Concierge Intent
  if (q.includes('pickup') || q.includes('drop') || q.includes('doorstep') || q.includes('home') || q.includes('concierge') || q.includes('valet')) {
    return {
      reply: `🚗 **GK AutoHerb Doorstep Valet Concierge**:\n\nNo time to drive to the studio? We've got you covered!\n\n1. Select **'Doorstep Pickup & Drop'** during appointment booking.\n2. Our certified driver arrives at your home or workplace.\n3. Digital check-in with pre-wash walkaround inspection photos.\n4. Live driver GPS tracking on your customer dashboard.\n5. Vehicle delivered back in immaculate showroom shine!`,
      intent: 'concierge_pickup',
      actionUrl: '/customer/booking',
      actionLabel: 'Schedule Pickup Booking',
      chips: ['Helpline Number', 'Package Details', 'Detailing Rates']
    };
  }

  // 9. Loyalty & Free Wash Vouchers Intent
  if (q.includes('loyalty') || q.includes('points') || q.includes('free wash') || q.includes('reward') || q.includes('coins')) {
    let loyaltyMsg = 'Earn 1 Loyalty Point for every ₹100 spent. Points automatically convert into cash discounts at checkout!';
    if (userCtx?.loyalty) {
      const l = userCtx.loyalty;
      loyaltyMsg = `⭐ **Your Current Loyalty Rewards**:\n• Cash Credits: **₹${l.credits || 0}**\n• Complimentary Washes: **${l.free_washes || 0} Vouchers**\n• Wax Sessions: **${l.wax_count || 0} Remaining**\n\nYou can apply these directly when booking or paying for studio services!`;
    }
    return {
      reply: loyaltyMsg,
      intent: 'loyalty',
      actionUrl: '/customer/loyalty',
      actionLabel: 'View Loyalty Wallet',
      chips: ['Book a Slot', 'Membership Packages', 'Call Studio']
    };
  }

  // 10. Direct Lead Capture / Callback Request Detection
  const phoneRegex = /(\+?91[\s-]?)?[6-9]\d{9}/;
  if (q.includes('call me') || q.includes('callback') || q.includes('quote') || q.includes('inquiry') || phoneRegex.test(q)) {
    const phoneMatch = q.match(phoneRegex);
    const extractedPhone = phoneMatch ? phoneMatch[0] : null;

    if (extractedPhone || conversation.customer_phone) {
      // Auto-create lead in inquiries
      try {
        const leadPhone = extractedPhone || conversation.customer_phone;
        const leadName = conversation.customer_name || 'Chatbot Inquirer';
        await pool.query(
          'INSERT INTO inquiries (source, name, mobile, services_interested) VALUES (?, ?, ?, ?)',
          ['chatbot', leadName, leadPhone, `Chat inquiry: ${userMessage}`]
        );
        await pool.query(
          'UPDATE chatbot_conversations SET lead_status = "lead_captured", customer_phone = ? WHERE id = ?',
          [leadPhone, conversation.id]
        );
      } catch (leadErr) {
        console.warn('Lead capture error:', leadErr.message);
      }

      return {
        reply: `✅ **Callback Request Confirmed!**\n\nThank you! Our detailing studio manager has received your inquiry and contact details. We will call you back within 15–30 minutes with full details and the best offers for your vehicle.`,
        intent: 'lead_captured',
        actionUrl: `tel:${settings.studio_mobile.replace(/\s+/g, '')}`,
        actionLabel: 'Or Call Us Directly',
        chips: ['Explore Packages', 'Book a Slot Online', 'Store Products']
      };
    } else {
      return {
        reply: `I would be delighted to arrange an immediate callback from our head studio detailing manager!\n\nPlease reply with your **Mobile Number** (and car model if possible), and our team will get in touch right away.`,
        intent: 'lead_prompt',
        actionUrl: null,
        actionLabel: null,
        chips: ['Call Helpline Now', 'Book a Slot Online', 'Services Menu']
      };
    }
  }

  // 11. Default Smart Concierge Fallback
  return {
    reply: `👋 Hello! Welcome to **GK AutoHerb Studio AI Concierge**.\n\nI can assist you instantly with:\n• **Active Car Tracking**: Check live wash & detailing progress\n• **Services & Rates**: Foam wash, PPF wrap, ceramic coating & polish\n• **Packages**: 5 tiers with massive savings & free wash vouchers\n• **Accessories Store**: Genuine digital inflators, vacuums & cushions\n• **Helpline & Valet**: Concierge doorstep vehicle pickup & drop\n\nHow can I help care for your vehicle today?`,
    intent: 'general_welcome',
    actionUrl: '/customer/booking',
    actionLabel: 'Book Studio Appointment',
    chips: ['🏎️ Track My Car', '💎 Membership Packages', '🛠️ Detailing Rates', '🛍️ Store Products', '📞 Call Helpline', '📝 Request Callback']
  };
}

// ─── API: Initialize or Resume Conversation Session ─────────────────────────
exports.initSession = async (req, res) => {
  try {
    const { session_id, customer_name, customer_phone, customer_email } = req.body;
    const userId = req.user ? req.user.id : null;

    let targetSessionId = session_id || uuidv4();
    let conv = null;

    if (session_id) {
      const [existing] = await pool.query('SELECT * FROM chatbot_conversations WHERE session_id = ?', [session_id]);
      if (existing.length) conv = existing[0];
    }

    if (!conv) {
      const uName = customer_name || (req.user ? req.user.name : null);
      const uPhone = customer_phone || (req.user ? req.user.mobile : null);
      const uEmail = customer_email || (req.user ? req.user.email : null);

      const [resInsert] = await pool.query(
        'INSERT INTO chatbot_conversations (session_id, user_id, customer_name, customer_phone, customer_email) VALUES (?, ?, ?, ?, ?)',
        [targetSessionId, userId, uName, uPhone, uEmail]
      );
      const [newConv] = await pool.query('SELECT * FROM chatbot_conversations WHERE id = ?', [resInsert.insertId]);
      conv = newConv[0];

      // Insert initial warm welcome from bot
      const welcome = {
        reply: `👋 Welcome to **GK AutoHerb Detailing Studio**! I am your AI Workshop Concierge. How can I assist you today? Feel free to ask about our ceramic coatings, package memberships, car accessories, or track your ongoing job.`,
        chips: ['🏎️ Track My Car', '💎 Membership Packages', '🛠️ Wash & Detailing Rates', '🛍️ Store Products', '📞 Call Studio']
      };
      await pool.query(
        'INSERT INTO chatbot_messages (conversation_id, sender, message, metadata) VALUES (?, "bot", ?, ?)',
        [conv.id, welcome.reply, JSON.stringify({ chips: welcome.chips })]
      );
    } else if (userId && !conv.user_id) {
      await pool.query('UPDATE chatbot_conversations SET user_id = ? WHERE id = ?', [userId, conv.id]);
      conv.user_id = userId;
    }

    // Fetch message history for this session
    const [messages] = await pool.query(
      'SELECT id, sender, message, metadata, created_at FROM chatbot_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 50',
      [conv.id]
    );

    res.json({
      success: true,
      data: {
        conversation: conv,
        messages: messages.map(m => ({
          ...m,
          metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata
        }))
      }
    });
  } catch (err) {
    console.error('chatbot initSession error:', err);
    res.status(500).json({ success: false, error: 'Failed to initialize chat session' });
  }
};

// ─── API: Send Message & Get Intelligent Reply ──────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { session_id, message, customer_name, customer_phone } = req.body;
    if (!session_id || !message) {
      return res.status(400).json({ success: false, error: 'session_id and message are required' });
    }

    let [convRows] = await pool.query('SELECT * FROM chatbot_conversations WHERE session_id = ?', [session_id]);
    if (!convRows.length) {
      return res.status(404).json({ success: false, error: 'Conversation session not found' });
    }
    const conv = convRows[0];

    // Update customer phone/name if provided
    if (customer_name || customer_phone) {
      await pool.query(
        'UPDATE chatbot_conversations SET customer_name = COALESCE(?, customer_name), customer_phone = COALESCE(?, customer_phone) WHERE id = ?',
        [customer_name || null, customer_phone || null, conv.id]
      );
    }

    // 1. Save user message
    await pool.query(
      'INSERT INTO chatbot_messages (conversation_id, sender, message) VALUES (?, "user", ?)',
      [conv.id, message]
    );

    // 2. Fetch context if logged in
    const userId = req.user ? req.user.id : conv.user_id;
    const userCtx = await getUserContext(userId);

    // 3. Generate bot reply
    const botResult = await generateBotReply(message, conv, userCtx);

    // 4. Save bot message
    const [botMsgRes] = await pool.query(
      'INSERT INTO chatbot_messages (conversation_id, sender, message, metadata) VALUES (?, "bot", ?, ?)',
      [conv.id, botResult.reply, JSON.stringify({
        intent: botResult.intent,
        actionUrl: botResult.actionUrl,
        actionLabel: botResult.actionLabel,
        chips: botResult.chips
      })]
    );

    // 5. Update conversation summary and timestamp
    await pool.query(
      'UPDATE chatbot_conversations SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [message.slice(0, 100), conv.id]
    );

    res.json({
      success: true,
      data: {
        id: botMsgRes.insertId,
        sender: 'bot',
        message: botResult.reply,
        metadata: {
          intent: botResult.intent,
          actionUrl: botResult.actionUrl,
          actionLabel: botResult.actionLabel,
          chips: botResult.chips
        },
        created_at: new Date()
      }
    });
  } catch (err) {
    console.error('chatbot sendMessage error:', err);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
};

// ─── API: Explicit Lead Capture from Chatbot ────────────────────────────────
exports.captureLead = async (req, res) => {
  try {
    const { session_id, name, mobile, email, vehicle_brand, vehicle_model, inquiry_notes } = req.body;
    if (!mobile) return res.status(400).json({ success: false, error: 'Mobile number is required' });

    const [convRows] = await pool.query('SELECT * FROM chatbot_conversations WHERE session_id = ?', [session_id]);
    const convId = convRows.length ? convRows[0].id : null;

    const [inquiryRes] = await pool.query(
      'INSERT INTO inquiries (source, name, mobile, email, vehicle_brand, vehicle_model, services_interested) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['chatbot', name || 'Website Visitor', mobile, email || null, vehicle_brand || null, vehicle_model || null, inquiry_notes || 'Requested via AI Chatbot']
    );

    if (convId) {
      await pool.query(
        'UPDATE chatbot_conversations SET lead_status = "lead_captured", inquiry_id = ?, customer_name = COALESCE(?, customer_name), customer_phone = ? WHERE id = ?',
        [inquiryRes.insertId, name || null, mobile, convId]
      );
    }

    res.json({ success: true, message: 'Inquiry registered successfully', data: { inquiry_id: inquiryRes.insertId } });
  } catch (err) {
    console.error('chatbot captureLead error:', err);
    res.status(500).json({ success: false, error: 'Failed to register lead' });
  }
};

// ─── ADMIN API: List All Conversations ──────────────────────────────────────
exports.adminGetConversations = async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    let where = '1=1';
    const params = [];

    if (status && status !== 'all') {
      where += ' AND c.lead_status = ?';
      params.push(status);
    }

    if (search) {
      where += ' AND (c.customer_name LIKE ? OR c.customer_phone LIKE ? OR c.summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [conversations] = await pool.query(`
      SELECT 
        c.*, 
        u.name as auth_user_name, 
        u.mobile as auth_user_mobile,
        (SELECT COUNT(*) FROM chatbot_messages m WHERE m.conversation_id = c.id) as message_count,
        (SELECT message FROM chatbot_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chatbot_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_time
      FROM chatbot_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE ${where}
      ORDER BY c.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total FROM chatbot_conversations c WHERE ${where}
    `, params);

    res.json({
      success: true,
      data: conversations,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('adminGetConversations error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN API: Get Full Message Transcript ─────────────────────────────────
exports.adminGetMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const [convRows] = await pool.query(`
      SELECT c.*, u.name as auth_user_name, u.mobile as auth_user_mobile, u.email as auth_user_email
      FROM chatbot_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [id]);

    if (!convRows.length) return res.status(404).json({ success: false, error: 'Conversation not found' });

    const [messages] = await pool.query(
      'SELECT * FROM chatbot_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    );

    res.json({
      success: true,
      data: {
        conversation: convRows[0],
        messages: messages.map(m => ({
          ...m,
          metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata
        }))
      }
    });
  } catch (err) {
    console.error('adminGetMessages error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN API: Intervene / Send Admin Message ──────────────────────────────
exports.adminSendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'Message cannot be empty' });

    const [result] = await pool.query(
      'INSERT INTO chatbot_messages (conversation_id, sender, message, metadata) VALUES (?, "admin", ?, ?)',
      [id, message, JSON.stringify({ sent_by_admin: req.user ? req.user.name : 'Studio Admin' })]
    );

    await pool.query('UPDATE chatbot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Admin message posted to chat channel',
      data: { id: result.insertId }
    });
  } catch (err) {
    console.error('adminSendMessage error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN API: Knowledge Base FAQs CRUD ────────────────────────────────────
exports.adminGetKnowledge = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM chatbot_knowledge ORDER BY sort_order ASC, id DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch knowledge base' });
  }
};

exports.adminSaveKnowledge = async (req, res) => {
  try {
    const { id, category, keywords, question, answer, action_url, action_label, is_active } = req.body;
    if (!keywords || !question || !answer) {
      return res.status(400).json({ success: false, error: 'Keywords, question and answer are required' });
    }

    if (id) {
      await pool.query(`
        UPDATE chatbot_knowledge 
        SET category = ?, keywords = ?, question = ?, answer = ?, action_url = ?, action_label = ?, is_active = ?
        WHERE id = ?
      `, [category || 'general', keywords, question, answer, action_url || null, action_label || null, is_active !== undefined ? is_active : 1, id]);
      res.json({ success: true, message: 'Knowledge item updated' });
    } else {
      const [result] = await pool.query(`
        INSERT INTO chatbot_knowledge (category, keywords, question, answer, action_url, action_label, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [category || 'general', keywords, question, answer, action_url || null, action_label || null, is_active !== undefined ? is_active : 1]);
      res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Knowledge item created' });
    }
  } catch (err) {
    console.error('adminSaveKnowledge error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.adminDeleteKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM chatbot_knowledge WHERE id = ?', [id]);
    res.json({ success: true, message: 'Knowledge item deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ─── ADMIN API: Chatbot Metrics & Stats ─────────────────────────────────────
exports.adminGetStats = async (req, res) => {
  try {
    const [totalConv] = await pool.query('SELECT COUNT(*) as total FROM chatbot_conversations');
    const [totalMsgs] = await pool.query('SELECT COUNT(*) as total FROM chatbot_messages');
    const [leadsCaptured] = await pool.query('SELECT COUNT(*) as total FROM chatbot_conversations WHERE lead_status IN ("lead_captured", "inquiry_created")');
    const [activeKnowledge] = await pool.query('SELECT COUNT(*) as total FROM chatbot_knowledge WHERE is_active = 1');

    res.json({
      success: true,
      data: {
        total_conversations: totalConv[0].total,
        total_messages: totalMsgs[0].total,
        leads_captured: leadsCaptured[0].total,
        active_knowledge_items: activeKnowledge[0].total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
