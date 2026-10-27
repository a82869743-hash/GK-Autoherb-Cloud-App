/**
 * Job card pipeline — the stages a car moves through in the studio.
 * Each change is shown on the customer's live tracker and sent on WhatsApp.
 */
const JOB_STAGES = [
  { key: 'received', label: 'Vehicle received', note: 'Your car is checked in at the studio.' },
  { key: 'inspection', label: 'Inspection', note: 'Our technician is inspecting your car and noting its condition.' },
  { key: 'washing', label: 'Washing', note: 'Your car is in the wash bay.' },
  { key: 'detailing', label: 'Detailing & treatment', note: 'The detailing / treatment work is in progress.' },
  { key: 'curing', label: 'Coating & curing', note: 'Protective coating is curing — this step needs a little time.' },
  { key: 'quality_check', label: 'Quality check', note: 'A senior technician is doing the final quality check.' },
  { key: 'ready', label: 'Ready for pickup', note: 'Your car is ready! You can collect it or we will deliver it.' },
  { key: 'delivered', label: 'Delivered', note: 'Your car has been handed over. Thank you!' },
];

const STAGE_KEYS = JOB_STAGES.map((s) => s.key);

function getStage(key) {
  return JOB_STAGES.find((s) => s.key === key) || JOB_STAGES[0];
}

module.exports = { JOB_STAGES, STAGE_KEYS, getStage };

/** Short signed token so the public tracker link can't be guessed by changing the id. */
function trackingToken(jobId) {
  const crypto = require('crypto');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(`job:${jobId}`).digest('hex').slice(0, 12);
}

function trackingUrl(jobId) {
  const base = (process.env.APP_BASE_URL || 'https://gkautobook.cloud').replace(/\/$/, '');
  return `${base}/job/${jobId}?t=${trackingToken(jobId)}`;
}

module.exports.trackingToken = trackingToken;
module.exports.trackingUrl = trackingUrl;
