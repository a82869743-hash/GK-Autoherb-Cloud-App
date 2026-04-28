/**
 * ─── CAR BRAND & MODEL DATASET ──────────────────────────────
 * Used in registration, add car modal, and booking forms.
 * Brand → Array of models. "Other" option triggers manual input.
 */

export const carData: Record<string, string[]> = {
  "Maruti Suzuki": ["Alto","Alto K10","S-Presso","WagonR","Celerio","Swift","Baleno","Ignis","Dzire","Ciaz","Ertiga","XL6","Brezza","Grand Vitara","Fronx","Jimny","Other"],
  "Hyundai": ["Santro","i10","Grand i10","i20","Aura","Verna","Exter","Venue","Creta","Alcazar","Tucson","Kona","Other"],
  "Tata": ["Nano","Tiago","Tigor","Punch","Altroz","Nexon","Harrier","Safari","Curvv","Other"],
  "Mahindra": ["Bolero","Bolero Neo","Thar","Scorpio","Scorpio N","XUV300","XUV400","XUV700","Marazzo","Other"],
  "Honda": ["Amaze","City","City Hybrid","WR-V","Elevate","Jazz","Other"],
  "Toyota": ["Glanza","Urban Cruiser","Innova Crysta","Innova Hycross","Fortuner","Camry","Vellfire","Other"],
  "Kia": ["Sonet","Seltos","Carens","EV6","Other"],
  "MG": ["Comet","Astor","Hector","Gloster","ZS EV","Other"],
  "Renault": ["Kwid","Triber","Kiger","Duster","Other"],
  "Nissan": ["Magnite","Kicks","Other"],
  "Skoda": ["Slavia","Kushaq","Octavia","Superb","Other"],
  "Volkswagen": ["Polo","Virtus","Taigun","Tiguan","Other"],
  "Ford": ["Figo","Aspire","EcoSport","Endeavour","Other"],
  "BMW": ["3 Series","5 Series","7 Series","X1","X3","X5","X7","Other"],
  "Mercedes-Benz": ["A-Class","C-Class","E-Class","S-Class","GLA","GLC","GLE","GLS","Other"],
  "Audi": ["A4","A6","A8","Q3","Q5","Q7","Q8","Other"],
  "Volvo": ["XC40","XC60","XC90","S90","Other"],
  "Jeep": ["Compass","Meridian","Wrangler","Other"],
  "Land Rover": ["Defender","Discovery","Range Rover","Other"],
  "Others": ["Other"],
};

/** Sorted list of brand names for dropdowns */
export const carBrands = Object.keys(carData);

/** Get models for a given brand, returns empty array if brand not found */
export function getModelsForBrand(brand: string): string[] {
  return carData[brand] || [];
}
