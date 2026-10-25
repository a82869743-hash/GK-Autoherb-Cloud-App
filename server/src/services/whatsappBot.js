/**
 * WhatsApp auto-bot.
 *
 * Every incoming WhatsApp message (from the Cloud API webhook, or the admin "simulate"
 * tool) goes through handleIncoming():
 *   1. classify the message (confirm / cancel / reschedule / status / price / booking /
 *      complaint / feedback / greeting / other)
 *   2. act on it — confirm or cancel the customer's next booking, send a reschedule link,
 *      report live job status, quote prices for the customer's own car segment…
 *   3. auto-reply
 *   4. file it in whatsapp_inbox with a category so staff only see what needs a human.
 */
const pool = require('../config/db');
const messagingService = require('./messagingService');
const whatsapp = require('./whatsappProvider');
const bookingActions = require('./bookingActions');
const { getStage } = require('./jobStages');
const { resolveServicePrice, detectVehicleCategory } = require('../utils/vehicleCategory');

const SEGMENT_LABEL = {
  hatchback: 'Hatchback', medium_hatchback: 'Premium hatchback', sedan: 'Sedan',
  premium_sedan: 'Premium sedan', suv: 'SUV', luxury: 'Luxury',
};

// Order matters: the first rule that matches wins.
const RULES = [
  { category: 'confirmation', test: /^(yes|y|yess+|yeah|yep|ok|okay|confirm(ed)?|haan?|ha|ji|1|👍|booking_confirm)\b/i },
  { category: 'cancellation', test: /^(no|n|nope|nahi|na|2|booking_cancel)\b|\bcancel/i },
  { category: 'reschedule', test: /^(3|booking_reschedule)\b|re-?schedule|postpone|change (the )?(date|time|slot)|another (day|time)|prepone/i },
  { category: 'complaint', test: /complain|complaint|worst|bad service|not happy|unhappy|scratch|damage|dent(ed)?\b|refund|angry|disappoint|(?<!no )problem|(?<!no )issue|poor/i },
  { category: 'status_query', test: /status|where is my|is my (car|bike|vehicle)|ready\??$|how long|kab tak|update/i },
  { category: 'pricing_query', test: /price|prices|rate|rates|cost|charges?|kitna|how much|menu/i },
  { category: 'booking_query', test: /\bbook|booking|appointment|slot|available|tomorrow|today/i },
  { category: 'feedback', test: /thank|thanks|thx|great|excellent|awesome|amazing|good job|nice|loved?/i },
  { category: 'greeting', test: /^(hi+|hello|hey|hii+|namaste|good (morning|afternoon|evening))\b/i },
];

function classify(text) {
  const t = String(text || '').trim();
  if (!t) return 'other';
  // "yes"/"no"/"ok" only count as a reply to the reminder when the message is short —
  // "no issue, great work" or "ok what's the price" mean something else.
  const isShort = t.split(/\s+/).length <= 4;
  const rule = RULES.find((r) => {
    if ((r.category === 'confirmation' || r.category === 'cancellation') && !isShort && !/cancel|confirm/i.test(t)) return false;
    return r.test.test(t);
  });
  return rule ? rule.category : 'other';
}

async function findCustomer(phone) {
  const last10 = String(phone || '').replace(/\D/g, '').slice(-10);
  if (!last10) return null;
  const [rows] = await pool.query(
    "SELECT id, name, mobile FROM users WHERE RIGHT(REPLACE(mobile, ' ', ''), 10) = ? AND role = 'customer' ORDER BY id DESC LIMIT 1",
    [last10]
  );
  return rows[0] || null;
}

/** The booking a YES/NO/RESCHEDULE reply most likely refers to. */
async function findTargetBooking(customerId) {
  const [rows] = await pool.query(
    `SELECT b.id
     FROM bookings b JOIN slots s ON s.id = b.slot_id
     WHERE b.customer_id = ? AND b.status IN ('confirmed','pending_approval')
       AND TIMESTAMP(s.slot_date, s.start_time) >= NOW()
     ORDER BY (b.reminder_sent_at IS NULL), s.slot_date, s.start_time
     LIMIT 1`,
    [customerId]
  );
  return rows[0] ? bookingActions.loadBooking(pool, rows[0].id) : null;
}

async function reply(phone, customer, body) {
  await messagingService.sendWhatsApp(phone, 'auto_bot_reply', { body }, { customer_id: customer?.id || null, message_type: 'auto_bot' });
  return body;
}

async function handleIncoming({ from, name = null, text = '', providerMessageId = null }) {
  // Cloud API retries webhooks — ignore messages we already processed
  if (providerMessageId) {
    const [dupe] = await pool.query('SELECT id FROM whatsapp_inbox WHERE provider_message_id = ?', [providerMessageId]);
    if (dupe.length) return { duplicate: true };
  }

  const phone = whatsapp.normalizePhone(from);
  const customer = await findCustomer(phone);
  const firstName = (customer?.name || name || 'there').split(' ')[0];
  const category = classify(text);
  const base = messagingService.appBaseUrl();

  let autoReply = null;
  let action = null;
  let bookingId = null;
  let status = 'auto_resolved';

  try {
    if (['confirmation', 'cancellation', 'reschedule'].includes(category)) {
      const booking = customer ? await findTargetBooking(customer.id) : null;
      if (!booking) {
        autoReply = `Hi ${firstName}, we couldn't find an upcoming booking on this number. Book a slot here: ${base}/customer/bookings/new`;
        status = category === 'confirmation' ? 'auto_resolved' : 'needs_attention';
      } else {
        bookingId = booking.id;
        const when = { booking_date: bookingActions.formatSlotDate(booking), booking_time: bookingActions.formatSlotTime(booking) };

        if (category === 'confirmation') {
          await bookingActions.confirmAttendance(pool, booking.id);
          action = 'booking_confirmed';
          const tpl = await messagingService.getTemplate('BOOKING_CUSTOMER_CONFIRMED');
          autoReply = messagingService.renderTemplate(tpl?.message_body || 'Thank you {{customer_name}}! Your slot on {{booking_date}} at {{booking_time}} is confirmed.', {
            customer_name: firstName, vehicle_number: booking.vehicle_reg_no || `${booking.vehicle_brand || ''} ${booking.vehicle_model || ''}`.trim(), ...when,
          });
        } else if (category === 'cancellation') {
          const conn = await pool.getConnection();
          try {
            await conn.beginTransaction();
            const result = await bookingActions.cancelBooking(conn, booking.id, {
              by: 'whatsapp', reason: `Customer replied on WhatsApp: "${String(text).slice(0, 200)}"`, actorRole: 'customer',
            });
            if (result.ok) {
              await conn.commit();
              action = 'booking_cancelled';
              autoReply = `Done ${firstName} — booking #${booking.id} on ${when.booking_date} is cancelled. ${result.refundNote} Reply BOOK anytime to book again.`.replace(/\s+/g, ' ').trim();
            } else {
              await conn.rollback();
              action = 'cancel_blocked';
              status = 'needs_attention';
              autoReply = `Hi ${firstName}, we couldn't cancel booking #${booking.id} automatically (${result.error}). Our team will call you shortly.`;
            }
          } catch (err) {
            await conn.rollback();
            throw err;
          } finally {
            conn.release();
          }
        } else {
          await pool.query("UPDATE bookings SET customer_confirmation = 'reschedule_requested' WHERE id = ?", [booking.id]);
          action = 'reschedule_link_sent';
          const tpl = await messagingService.getTemplate('BOOKING_RESCHEDULE_LINK');
          autoReply = messagingService.renderTemplate(tpl?.message_body || 'Pick a new time for booking #{{booking_id}} here: {{reschedule_url}}', {
            customer_name: firstName, booking_id: booking.id, reschedule_url: `${base}/customer/bookings?reschedule=${booking.id}`,
          });
        }
      }
    } else if (category === 'status_query') {
      const [jobs] = customer ? await pool.query(
        `SELECT jc.id, jc.stage, jc.status, v.registration_no, v.brand, v.model
         FROM job_carts jc JOIN vehicles v ON v.id = jc.vehicle_id
         WHERE v.customer_id = ? AND jc.status IN ('draft','open') ORDER BY jc.created_at DESC LIMIT 1`,
        [customer.id]
      ) : [[]];
      if (jobs.length) {
        const job = jobs[0];
        const stage = getStage(job.stage);
        action = 'status_shared';
        autoReply = `Hi ${firstName}, your ${job.registration_no || `${job.brand} ${job.model}`} is at: *${stage.label}*. ${stage.note} Live tracker: ${require('./jobStages').trackingUrl(job.id)}`;
      } else {
        autoReply = `Hi ${firstName}, there's no car in our studio on this number right now. Your bookings: ${base}/customer/bookings`;
      }
    } else if (category === 'pricing_query') {
      let segment = 'sedan';
      if (customer) {
        const [veh] = await pool.query(
          'SELECT brand, model, category FROM vehicles WHERE customer_id = ? ORDER BY is_primary DESC, id DESC LIMIT 1',
          [customer.id]
        );
        if (veh.length) segment = veh[0].category || detectVehicleCategory(veh[0].brand, veh[0].model);
      }
      const [svcs] = await pool.query(
        "SELECT * FROM services WHERE is_active = 1 AND vehicle_type = 'car' ORDER BY sort_order, id LIMIT 8"
      );
      const lines = svcs
        .map((s) => ({ name: s.name, price: resolveServicePrice(s, segment) }))
        .filter((x) => x.price > 0)
        .map((x) => `• ${x.name}: ₹${x.price.toLocaleString('en-IN')}`);
      action = 'prices_shared';
      autoReply = `Hi ${firstName}, prices for your ${SEGMENT_LABEL[segment] || 'car'}:\n${lines.join('\n')}\n\nFull menu & booking: ${base}/customer/services`;
    } else if (category === 'booking_query') {
      action = 'booking_link_sent';
      autoReply = `Hi ${firstName}, book your slot in under a minute: ${base}/customer/bookings/new — pick a service, date and time. Reply here if you need help.`;
    } else if (category === 'complaint') {
      status = 'needs_attention';
      action = 'escalated';
      autoReply = `We're really sorry ${firstName}. Your message has been sent to our studio manager, who will call you shortly to sort this out.`;
    } else if (category === 'feedback') {
      action = 'thanked';
      autoReply = `Thank you so much ${firstName}! 🙏 It means a lot to the GK AutoHerb team.`;
    } else if (category === 'greeting') {
      autoReply = `Hi ${firstName}! 👋 Welcome to GK AutoHerb. Reply *BOOK* to book a service, *STATUS* for your car's status or *PRICE* for prices.`;
    } else {
      status = 'needs_attention';
      const tpl = await messagingService.getTemplate('AUTO_REPLY_FALLBACK');
      autoReply = messagingService.renderTemplate(tpl?.message_body || 'Thanks for messaging GK AutoHerb! Our team will reply shortly.', { customer_name: firstName });
    }
  } catch (err) {
    console.error('[WA BOT] handling error:', err);
    status = 'needs_attention';
    action = 'error';
  }

  if (autoReply) await reply(phone, customer, autoReply);

  const [ins] = await pool.query(
    `INSERT INTO whatsapp_inbox (customer_id, phone, contact_name, message_body, provider_message_id, category, booking_id, auto_reply, auto_action, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [customer?.id || null, phone, customer?.name || name, text, providerMessageId, category, bookingId, autoReply, action, status]
  );

  const io = global.__gkIo;
  if (io) {
    io.emit('whatsapp_inbox', { id: ins.insertId, category, status, phone, customer_name: customer?.name || name });
    if (action === 'booking_cancelled' || action === 'booking_confirmed') {
      io.emit('booking_updated', { bookingId, via: 'whatsapp', action });
    }
  }

  return { id: ins.insertId, category, status, action, auto_reply: autoReply, customer_id: customer?.id || null, booking_id: bookingId };
}

module.exports = { classify, handleIncoming };
