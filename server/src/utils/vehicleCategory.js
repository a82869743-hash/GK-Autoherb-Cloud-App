/**
 * Vehicle segment detection (server copy of client/src/utils/carData.ts getCategoryForModel).
 * The segment decides which price column a customer is charged.
 */

const modelCategoryMap = {
  // Nissan
  "kicks": "suv",
  "magnite": "suv",
  "x-trail": "suv",
  // Maruti
  "alto": "hatchback",
  "alto k10": "hatchback",
  "s-presso": "hatchback",
  "celerio": "hatchback",
  "wagonr": "hatchback",
  "swift": "hatchback",
  "baleno": "medium_hatchback",
  "ignis": "hatchback",
  "fronx": "suv",
  "brezza": "suv",
  "grand vitara": "suv",
  "jimny": "suv",
  "ertiga": "suv",
  "xl6": "suv",
  "invicto": "suv",
  // Hyundai
  "grand i10": "hatchback",
  "grand i10 nios": "hatchback",
  "i10": "hatchback",
  "i20": "medium_hatchback",
  "exter": "medium_hatchback",
  "venue": "suv",
  "creta": "suv",
  "alcazar": "suv",
  "tucson": "suv",
  "verna": "sedan",
  // Tata
  "tiago": "hatchback",
  "tigor": "sedan",
  "altroz": "medium_hatchback",
  "punch": "medium_hatchback",
  "nexon": "suv",
  "curvv": "suv",
  "harrier": "suv",
  "safari": "suv",
  // Mahindra
  "bolero": "suv",
  "bolero neo": "suv",
  "thar": "suv",
  "xuv 3xo": "suv",
  "xuv300": "suv",
  "xuv500": "suv",
  "xuv700": "suv",
  "scorpio": "suv",
  "scorpio n": "suv",
  "scorpio classic": "suv",
  "kuv100": "hatchback",
  "kuv100 nxt": "hatchback",
  // Kia
  "sonet": "suv",
  "seltos": "suv",
  "carens": "suv",
  "syros": "suv",
  "carnival": "suv",
  "ev6": "suv",
  // Toyota
  "glanza": "hatchback",
  "taisor": "suv",
  "hyryder": "suv",
  "innova": "suv",
  "innova crysta": "suv",
  "innova hycross": "suv",
  "fortuner": "suv",
  "camry": "sedan",
  "land cruiser": "suv",
  // Honda
  "amaze": "sedan",
  "city": "sedan",
  "elevate": "suv",
  // Skoda
  "kylaq": "suv",
  "kushaq": "suv",
  "slavia": "sedan",
  "superb": "premium_sedan",
  "kodiaq": "suv",
  "octavia": "sedan",
  // Volkswagen
  "virtus": "sedan",
  "taigun": "suv",
  "tiguan": "suv",
  "polo": "hatchback",
  "vento": "sedan",
  "passat": "sedan",
  // MG
  "comet": "hatchback",
  "astor": "suv",
  "hector": "suv",
  "windsor": "suv",
  "zs ev": "suv",
  "gloster": "suv",
  // Renault
  "kwid": "hatchback",
  "kiger": "suv",
  "triber": "suv",
  "duster": "suv",
  // Citroen
  "c3": "hatchback",
  "basalt": "suv",
  "aircross": "suv",
  // Jeep
  "compass": "suv",
  "meridian": "suv",
  "wrangler": "suv",
  "grand cherokee": "suv",
  // BYD
  "atto 3": "suv",
  "seal": "sedan",
  "sealion": "suv",
  // BMW
  "2 series": "sedan",
  "3 series": "sedan",
  "5 series": "sedan",
  "7 series": "premium_sedan",
  "x1": "suv",
  "x3": "suv",
  "x5": "suv",
  "x7": "suv",
  "i4": "sedan",
  "ix": "suv",
  // Mercedes
  "a-class": "sedan",
  "c-class": "sedan",
  "e-class": "sedan",
  "s-class": "premium_sedan",
  "gla": "suv",
  "glc": "suv",
  "gle": "suv",
  "gls": "suv",
  "g-class": "suv",
  "eqs": "sedan",
  // Audi
  "a4": "sedan",
  "a6": "sedan",
  "a8": "premium_sedan",
  "q3": "suv",
  "q5": "suv",
  "q7": "suv",
  "q8": "suv",
  // Land Rover / Range Rover
  "defender": "suv",
  "discovery": "suv",
  "evoque": "suv",
  "velar": "suv",
  "range rover": "suv",
  // Porsche
  "macan": "suv",
  "cayenne": "suv",
  "panamera": "premium_sedan",
  "taycan": "sedan",
  // Ford
  "mustang": "premium_sedan",
  "ecosport": "suv",
  "endeavour": "suv",
};

function getCategoryForModel(brand, model) {
  const b = brand ? brand.toLowerCase().trim() : '';
  const m = model ? model.toLowerCase().trim() : '';
  
  const cleanModel = m.replace(/\s+ev$/, '').replace(/^electric\s+/, '');
  
  if (modelCategoryMap[cleanModel]) {
    return modelCategoryMap[cleanModel];
  }
  
  for (const [key, cat] of Object.entries(modelCategoryMap)) {
    if (cleanModel.includes(key) || key.includes(cleanModel)) {
      return cat;
    }
  }

  if (m.includes('audi') || m.includes('bmw') || b.includes('mercedes') || b.includes('audi') || b.includes('bmw') || b.includes('porsche') || b.includes('jaguar')) {
    if (m.includes('q') || m.includes('x') || m.includes('macan') || m.includes('cayenne') || m.includes('gl')) {
      return 'suv';
    }
    return 'premium_sedan';
  }

  if (m.includes('suv') || m.includes('xuv') || m.includes('sport') || m.includes('cross') || m.includes('ranger') || m.includes('safari') || m.includes('harrier') || m.includes('nexon') || m.includes('creta') || m.includes('seltos') || m.includes('fortuner') || m.includes('innova') || m.includes('scorpio') || m.includes('bolero') || m.includes('thar')) {
    return 'suv';
  }
  if (m.includes('sedan') || m.includes('verna') || m.includes('city') || m.includes('amaze') || m.includes('slavia') || m.includes('virtus') || m.includes('ciaz') || m.includes('dzire')) {
    return 'sedan';
  }
  if (m.includes('alto') || m.includes('wagon') || m.includes('celerio') || m.includes('presso') || m.includes('i10') || m.includes('tiago') || m.includes('kwid')) {
    return 'hatchback';
  }
  if (m.includes('i20') || m.includes('baleno') || m.includes('altroz') || m.includes('glanza') || m.includes('punch') || m.includes('exter')) {
    return 'medium_hatchback';
  }

  return 'sedan';
}

const LUXURY_BRANDS = ["rolls-royce", "rolls royce", "bentley", "lamborghini", "ferrari", "maybach", "mclaren", "aston martin"];

/** Segment for a vehicle, adding the luxury tier on top of the shared map. */
function detectVehicleCategory(brand, model) {
  const b = (brand || "").toLowerCase();
  const m = (model || "").toLowerCase();
  if (LUXURY_BRANDS.some((x) => b.includes(x) || m.includes(x))) return "luxury";
  return getCategoryForModel(brand || "", model || "");
}

const VALID_CATEGORIES = ["hatchback", "medium_hatchback", "sedan", "premium_sedan", "suv", "luxury"];

// When a service has no price for a segment, fall back to the closest priced one
const PRICE_FALLBACKS = {
  hatchback: ["hatchback", "medium_hatchback", "sedan"],
  medium_hatchback: ["medium_hatchback", "hatchback", "sedan"],
  sedan: ["sedan", "medium_hatchback", "premium_sedan"],
  premium_sedan: ["premium_sedan", "sedan", "suv"],
  suv: ["suv", "premium_sedan", "sedan"],
  luxury: ["luxury", "suv", "premium_sedan", "sedan"],
};

/** Price of a service for a vehicle segment (never mixes segments when the exact one is priced). */
function resolveServicePrice(service, category) {
  const chain = PRICE_FALLBACKS[category] || PRICE_FALLBACKS.sedan;
  for (const cat of chain) {
    const p = Number(service["price_" + cat]);
    if (p > 0) return p;
  }
  return Number(service.price) || 0;
}

module.exports = { detectVehicleCategory, getCategoryForModel, resolveServicePrice, VALID_CATEGORIES };
