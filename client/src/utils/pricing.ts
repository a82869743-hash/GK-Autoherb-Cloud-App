/**
 * Vehicle-segment pricing — mirrors server/src/utils/vehicleCategory.js.
 * A customer only ever sees the price for their own car's segment.
 */
import { getCategoryForModel } from './carData';

export type Segment = 'hatchback' | 'medium_hatchback' | 'sedan' | 'premium_sedan' | 'suv' | 'luxury';

export const SEGMENT_LABEL: Record<string, string> = {
  hatchback: 'Hatchback',
  medium_hatchback: 'Premium Hatchback',
  sedan: 'Sedan',
  premium_sedan: 'Premium Sedan',
  suv: 'SUV',
  luxury: 'Luxury',
  bike: 'Bike',
};

const LUXURY_BRANDS = ['rolls-royce', 'rolls royce', 'bentley', 'lamborghini', 'ferrari', 'maybach', 'mclaren', 'aston martin'];

export function segmentForVehicle(v?: { category?: string | null; brand?: string; make?: string; model?: string } | null): Segment {
  if (!v) return 'sedan';
  if (v.category && SEGMENT_LABEL[v.category]) return v.category as Segment;
  const b = (v.brand || v.make || '').toLowerCase();
  if (LUXURY_BRANDS.some((x) => b.includes(x))) return 'luxury';
  return getCategoryForModel(v.brand || v.make || '', v.model || '') as Segment;
}

const FALLBACKS: Record<string, Segment[]> = {
  hatchback: ['hatchback', 'medium_hatchback', 'sedan'],
  medium_hatchback: ['medium_hatchback', 'hatchback', 'sedan'],
  sedan: ['sedan', 'medium_hatchback', 'premium_sedan'],
  premium_sedan: ['premium_sedan', 'sedan', 'suv'],
  suv: ['suv', 'premium_sedan', 'sedan'],
  luxury: ['luxury', 'suv', 'premium_sedan', 'sedan'],
};

export function priceForSegment(service: any, segment: Segment | string): number {
  const chain = FALLBACKS[segment] || FALLBACKS.sedan;
  for (const seg of chain) {
    const p = Number(service?.[`price_${seg}`]);
    if (p > 0) return p;
  }
  return Number(service?.price) || 0;
}

export function formatPrice(n: number): string {
  return n > 0 ? `₹${Math.round(n).toLocaleString('en-IN')}` : 'Price on inspection';
}
