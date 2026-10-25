/**
 * Car brand logos (client/public/brands), from the open-source car-logos-dataset
 * (github.com/filippofilip95/car-logos-dataset, MIT). Logos are always correct for
 * the brand, so they are shown whenever we don't have a verified photo of the exact model.
 */
const LOGOS: Record<string, string> = {
  'aston martin': 'aston-martin.png',
  audi: 'audi.png',
  bentley: 'bentley.png',
  bmw: 'bmw.png',
  bugatti: 'bugatti.png',
  byd: 'byd.png',
  chevrolet: 'chevrolet.png',
  citroen: 'citroen.png',
  datsun: 'datsun.png',
  ferrari: 'ferrari.png',
  fiat: 'fiat.png',
  force: 'force-motors.png',
  'force motors': 'force-motors.png',
  ford: 'ford.png',
  honda: 'honda.png',
  hyundai: 'hyundai.png',
  isuzu: 'isuzu.png',
  jaguar: 'jaguar.png',
  jeep: 'jeep.png',
  kia: 'kia.png',
  ktm: 'ktm.png',
  lamborghini: 'lamborghini.png',
  'land rover': 'land-rover.png',
  'range rover': 'land-rover.png',
  lexus: 'lexus.png',
  mahindra: 'mahindra.png',
  maruti: 'suzuki.png',
  'maruti suzuki': 'suzuki.png',
  suzuki: 'suzuki.png',
  maserati: 'maserati.png',
  mclaren: 'mclaren.png',
  mercedes: 'mercedes-benz.png',
  'mercedes benz': 'mercedes-benz.png',
  'mercedes-benz': 'mercedes-benz.png',
  benz: 'mercedes-benz.png',
  mg: 'mg.png',
  'mg motor': 'mg.png',
  mini: 'mini.png',
  mitsubishi: 'mitsubishi.png',
  nissan: 'nissan.png',
  porsche: 'porsche.png',
  renault: 'renault.png',
  'rolls royce': 'rolls-royce.png',
  'rolls-royce': 'rolls-royce.png',
  skoda: 'skoda.png',
  tata: 'tata.png',
  'tata motors': 'tata.png',
  tesla: 'tesla.png',
  toyota: 'toyota.png',
  triumph: 'triumph.png',
  volkswagen: 'volkswagen.png',
  vw: 'volkswagen.png',
  volvo: 'volvo.png',
};

/** Brands shown first in the "add car" picker (Indian market order). */
export const POPULAR_BRANDS = ['Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Kia', 'Toyota', 'Honda', 'MG', 'Skoda', 'Volkswagen', 'Renault', 'Nissan'];

export function brandLogo(brand?: string | null): string | null {
  if (!brand) return null;
  const k = brand.toLowerCase().replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ').trim();
  const file = LOGOS[k] || LOGOS[k.replace(/-/g, ' ')] || LOGOS[k.split(' ')[0]];
  return file ? `/brands/${file}` : null;
}

export function isBrandLogoUrl(url?: string | null): boolean {
  return !!url && url.startsWith('/brands/');
}
