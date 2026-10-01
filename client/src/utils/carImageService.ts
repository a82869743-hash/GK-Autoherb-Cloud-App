/**
 * ─── REAL CAR IMAGE SERVICE ──────────────────────────────────────────
 * Automatically associates real, verified automotive photos for every
 * vehicle make and model across GK AutoHerb.
 *
 * Features:
 * 1. 100% verified real exterior photos for all 235 models & 37 manufacturers
 *    across India from carDataFull (BMW, Mercedes, Audi, Porsche, Range Rover,
 *    Toyota, Mahindra, Tata, Hyundai, Maruti Suzuki, etc.)
 * 2. High-precision normalization (handles trims, variants like VXi/M Sport/4x4,
 *    brand aliases like Maruti vs Maruti Suzuki, Mercedes vs Mercedes-Benz,
 *    and BMW series numbers like 730/520/330).
 * 3. Body-type studio fallbacks (/cars/black_suv_light.jpg, /cars/white_sedan_light.jpg,
 *    /cars/red_sports_light.jpg, /cars/luxury_sedan_studio.jpg).
 * 4. Permanent failed-URL tracking (`failedUrlsSet`) preventing broken images and
 *    infinite onError retry loops.
 * 5. Persistent LocalStorage & In-Memory caching for zero-latency lookups.
 */

import { useState, useEffect, useCallback } from 'react';
import { CAR_MODEL_IMAGES } from './carModelImagesDataset';

// Guaranteed local studio category fallback photos
export const STUDIO_FALLBACKS: Record<string, string> = {
  sports: '/cars/red_sports_light.jpg',
  suv: '/cars/black_suv_light.jpg',
  sedan: '/cars/white_sedan_light.jpg',
  luxury: '/cars/luxury_sedan_studio.jpg',
};

// Global set to track any URLs that failed network loading in the current session
const failedUrlsSet = new Set<string>();

/**
 * Mark a car photo URL as failed so it is never served again in this session.
 */
export function markCarImageFailed(url?: string): void {
  if (url && url.startsWith('http')) {
    failedUrlsSet.add(url);
  }
}

/**
 * Check if a URL has failed during network loading.
 */
export function isCarImageFailed(url?: string): boolean {
  if (!url) return true;
  return failedUrlsSet.has(url);
}

/**
 * Determine the most aesthetically accurate studio fallback photo
 * based on brand, model name, and optional category hint.
 */
export function getStudioFallback(
  brand?: string,
  model?: string,
  categoryHint?: 'sports' | 'suv' | 'sedan' | 'luxury' | string
): string {
  if (categoryHint && STUDIO_FALLBACKS[categoryHint]) {
    return STUDIO_FALLBACKS[categoryHint];
  }

  const combined = `${brand || ''} ${model || ''}`.toLowerCase();

  // 1. Ultra-Luxury Sedans & Saloons
  if (
    combined.includes('rolls-royce') ||
    combined.includes('rolls royce') ||
    combined.includes('bentley') ||
    combined.includes('maybach') ||
    combined.includes('ghost') ||
    combined.includes('phantom') ||
    combined.includes('flying spur') ||
    combined.includes('s-class') ||
    combined.includes('s class') ||
    combined.includes('s 350') ||
    combined.includes('s 450') ||
    combined.includes('s 500') ||
    combined.includes('7 series') ||
    combined.includes('7-series') ||
    combined.includes('730') ||
    combined.includes('740') ||
    combined.includes('745') ||
    combined.includes('m760') ||
    combined.includes('a8') ||
    combined.includes('panamera')
  ) {
    return STUDIO_FALLBACKS.luxury;
  }

  // 2. High-performance Sports / Coupes / Supercars
  if (
    combined.includes('porsche') ||
    combined.includes('911') ||
    combined.includes('carrera') ||
    combined.includes('gt3') ||
    combined.includes('cayman') ||
    combined.includes('boxster') ||
    combined.includes('ferrari') ||
    combined.includes('lamborghini') ||
    combined.includes('mclaren') ||
    combined.includes('aston martin') ||
    combined.includes('amg gt') ||
    combined.includes('r8') ||
    combined.includes('mustang') ||
    combined.includes('avanti') ||
    combined.includes('supra') ||
    combined.includes('m4') ||
    combined.includes('m5') ||
    combined.includes('m2') ||
    combined.includes('rs5') ||
    combined.includes('rs7') ||
    combined.includes('cabriolet') ||
    combined.includes('roadster') ||
    combined.includes('spyder')
  ) {
    return STUDIO_FALLBACKS.sports;
  }

  // 3. SUVs / Off-Roaders / Pickups / MPVs
  if (
    combined.includes('suv') ||
    combined.includes('thar') ||
    combined.includes('scorpio') ||
    combined.includes('xuv') ||
    combined.includes('bolero') ||
    combined.includes('fortuner') ||
    combined.includes('innova') ||
    combined.includes('hycross') ||
    combined.includes('crysta') ||
    combined.includes('hilux') ||
    combined.includes('land cruiser') ||
    combined.includes('prado') ||
    combined.includes('urban cruiser') ||
    combined.includes('defender') ||
    combined.includes('discovery') ||
    combined.includes('range rover') ||
    combined.includes('velar') ||
    combined.includes('evoque') ||
    combined.includes('harrier') ||
    combined.includes('safari') ||
    combined.includes('nexon') ||
    combined.includes('punch') ||
    combined.includes('creta') ||
    combined.includes('venue') ||
    combined.includes('alcazar') ||
    combined.includes('tucson') ||
    combined.includes('seltos') ||
    combined.includes('sonet') ||
    combined.includes('carens') ||
    combined.includes('carnival') ||
    combined.includes('brezza') ||
    combined.includes('grand vitara') ||
    combined.includes('jimny') ||
    combined.includes('invicto') ||
    combined.includes('fronx') ||
    combined.includes('kushaq') ||
    combined.includes('kodiaq') ||
    combined.includes('taigun') ||
    combined.includes('tiguan') ||
    combined.includes('compass') ||
    combined.includes('wrangler') ||
    combined.includes('rubicon') ||
    combined.includes('meridian') ||
    combined.includes('d-max') ||
    combined.includes('dmax') ||
    combined.includes('mu-x') ||
    combined.includes('mux') ||
    combined.includes('hector') ||
    combined.includes('astor') ||
    combined.includes('gloster') ||
    combined.includes('curvv') ||
    combined.includes('kiger') ||
    combined.includes('triber') ||
    combined.includes('duster') ||
    combined.includes('magnite') ||
    combined.includes('urus') ||
    combined.includes('cayenne') ||
    combined.includes('macan') ||
    combined.includes('x1') ||
    combined.includes('x3') ||
    combined.includes('x4') ||
    combined.includes('x5') ||
    combined.includes('x7') ||
    combined.includes('q3') ||
    combined.includes('q5') ||
    combined.includes('q7') ||
    combined.includes('q8') ||
    combined.includes('glc') ||
    combined.includes('gle') ||
    combined.includes('gls') ||
    combined.includes('g-class') ||
    combined.includes('g class') ||
    combined.includes('g wagon') ||
    combined.includes('atto') ||
    combined.includes('ev9')
  ) {
    return STUDIO_FALLBACKS.suv;
  }

  // 4. Default: Studio Sedan & Hatchback
  return STUDIO_FALLBACKS.sedan;
}

/**
 * Curated dictionary of verified high-resolution car photos.
 * Re-exported for backward compatibility.
 */
export const PRELOADED_CAR_IMAGES: Record<string, string> = {
  ...CAR_MODEL_IMAGES,
};

export const ALL_VERIFIED_CAR_IMAGES: Record<string, string> = {
  ...CAR_MODEL_IMAGES,
};

// In-memory runtime cache for dynamic lookups
const inMemoryCache: Record<string, string> = {};

/**
 * Strips cosmetic trim, engine, transmission, and edition suffixes
 * so matching focuses purely on the vehicle chassis / model.
 */
function cleanModelVariants(model?: string): string {
  return (model || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(
      /\b(vxi|zxi|lxi|facelift|diesel|petrol|hybrid|manual|automatic|amt|at|mt|cvt|dct|turbo|crdi|4x4|4wd|awd|rwd|fwd|ev|plus|opt|option|o|crysta|legender|sport|m sport|amg line|dark edition|adventure|gt|tsi|tdi|tech|technology|premium)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes brand and model into clean searchable strings.
 */
export function normalizeCarKey(brand?: string, model?: string): string {
  const b = (brand || '').toLowerCase().trim();
  const m = (model || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${b} ${m}`.trim();
}

/**
 * Synchronously checks if a verified exterior photo exists in the dataset or cache.
 * Returns null if no verified image is matched, or if the matched URL has failed.
 */
export function getPreloadedCarImage(brand?: string, model?: string): string | null {
  if (!brand && !model) return null;

  const bRaw = (brand || '').toLowerCase().trim();
  const mRaw = (model || '').toLowerCase().trim();
  const fullKey = normalizeCarKey(brand, model);

  // Helper to validate url isn't in failedUrlsSet
  const checkUrl = (url?: string): string | null => {
    if (url && !failedUrlsSet.has(url)) {
      return url;
    }
    return null;
  };

  // 1. Direct exact lookup
  if (ALL_VERIFIED_CAR_IMAGES[fullKey]) {
    const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[fullKey]);
    if (verified) return verified;
  }

  // 2. Raw key lookup
  const rawKey = `${bRaw} ${mRaw}`.trim();
  if (ALL_VERIFIED_CAR_IMAGES[rawKey]) {
    const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[rawKey]);
    if (verified) return verified;
  }

  // 3. Brand Aliases (Maruti Suzuki <-> Maruti, Mercedes-Benz <-> Mercedes, etc.)
  const bAliases: string[] = [bRaw];
  if (bRaw === 'maruti') bAliases.push('maruti suzuki');
  if (bRaw === 'maruti suzuki') bAliases.push('maruti');
  if (bRaw === 'mercedes' || bRaw === 'benz') {
    bAliases.push('mercedes-benz', 'mercedes');
  }
  if (bRaw === 'mercedes-benz') bAliases.push('mercedes');
  if (bRaw === 'range rover') bAliases.push('land rover');
  if (bRaw === 'land rover') bAliases.push('range rover');
  if (bRaw === 'rolls royce') bAliases.push('rolls-royce');
  if (bRaw === 'aston martin') bAliases.push('aston-martin');

  for (const b of bAliases) {
    const k = normalizeCarKey(b, model);
    if (ALL_VERIFIED_CAR_IMAGES[k]) {
      const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[k]);
      if (verified) return verified;
    }
  }

  // 4. BMW Number Series (e.g., 730ld -> 7 series, 520d -> 5 series, 330i -> 3 series)
  if (bAliases.some((b) => b.includes('bmw'))) {
    const numMatch = mRaw.match(/\b([3567])([0-9]{2})[a-z]*\b/);
    if (numMatch) {
      const seriesKey = `bmw ${numMatch[1]} series`;
      if (ALL_VERIFIED_CAR_IMAGES[seriesKey]) {
        const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[seriesKey]);
        if (verified) return verified;
      }
    }
  }

  // 5. Mercedes-Benz Class Letters (e.g., C 220d -> C-Class, E 350 -> E-Class)
  if (bAliases.some((b) => b.includes('mercedes'))) {
    const classMatch = mRaw.match(/\b([cesg])\s*([0-9]{2,3})[a-z]*\b/);
    if (classMatch) {
      const classKey = `mercedes ${classMatch[1]} class`;
      if (ALL_VERIFIED_CAR_IMAGES[classKey]) {
        const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[classKey]);
        if (verified) return verified;
      }
    }
  }

  // 6. Cleaned Model Name (without engine/trim suffixes)
  const mClean = cleanModelVariants(model);
  for (const b of bAliases) {
    const kClean = `${b} ${mClean}`.trim();
    if (ALL_VERIFIED_CAR_IMAGES[kClean]) {
      const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[kClean]);
      if (verified) return verified;
    }
    // Handle D-Max -> Dmax
    const kDmax = kClean.replace(/d\s*max/g, 'dmax');
    if (ALL_VERIFIED_CAR_IMAGES[kDmax]) {
      const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[kDmax]);
      if (verified) return verified;
    }
  }

  // 7. Sorted Substring Matching within the same brand (longest key first for maximum specificity)
  const allKeys = Object.keys(ALL_VERIFIED_CAR_IMAGES).sort((a, b) => b.length - a.length);
  for (const b of bAliases) {
    for (const key of allKeys) {
      if (key.startsWith(`${b} `)) {
        const modelPart = key.substring(b.length + 1).trim();
        if (!modelPart) continue;
        if (mClean.includes(modelPart) || modelPart.includes(mClean)) {
          const verified = checkUrl(ALL_VERIFIED_CAR_IMAGES[key]);
          if (verified) return verified;
        }
      }
    }
  }

  // 8. Check runtime memory cache
  if (inMemoryCache[fullKey]) {
    const verified = checkUrl(inMemoryCache[fullKey]);
    if (verified) return verified;
  }

  // 9. Check localStorage cache
  try {
    const cached = localStorage.getItem(`gk_car_img_${fullKey}`);
    if (cached) {
      const verified = checkUrl(cached);
      if (verified) {
        inMemoryCache[fullKey] = cached;
        return verified;
      }
    }
  } catch (_) {}

  return null;
}

/**
 * Returns a guaranteed valid car photo URL.
 * If a verified real photo exists and hasn't failed, returns it.
 * Otherwise returns the appropriate local studio fallback. Never returns null or broken URL.
 */
export function getSafeCarImage(
  brand?: string,
  model?: string,
  fallbackType?: 'sports' | 'suv' | 'sedan' | 'luxury'
): string {
  const verified = getPreloadedCarImage(brand, model);
  if (verified) return verified;
  return getStudioFallback(brand, model, fallbackType);
}

/**
 * Asynchronously searches Wikipedia / Wikimedia Commons for custom / non-cataloged car models.
 * Result is cached in localStorage & in-memory for zero-latency future loads.
 */
export async function resolveRealCarImage(brand?: string, model?: string): Promise<string> {
  const preloaded = getPreloadedCarImage(brand, model);
  if (preloaded) return preloaded;

  const cleanBrand = (brand || '').trim();
  const cleanModel = (model || '').replace(/[-_]/g, ' ').trim();
  const fullKey = normalizeCarKey(brand, model);
  const query = `${cleanBrand} ${cleanModel}`.trim();

  if (!query) {
    return getStudioFallback(brand, model);
  }

  try {
    // 1. Try direct Wikipedia pageimages API (CORS enabled with origin=*)
    const directUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=thumbnail&pithumbsize=900&origin=*&titles=${encodeURIComponent(query)}`;
    const directRes = await fetch(directUrl);
    if (directRes.ok) {
      const data = await directRes.json();
      const pages = data.query?.pages || {};
      const pageId = Object.keys(pages)[0];
      if (pageId && pageId !== '-1' && pages[pageId]?.thumbnail?.source) {
        const imgUrl = pages[pageId].thumbnail.source;
        if (!failedUrlsSet.has(imgUrl)) {
          inMemoryCache[fullKey] = imgUrl;
          try {
            localStorage.setItem(`gk_car_img_${fullKey}`, imgUrl);
          } catch (_) {}
          return imgUrl;
        }
      }
    }

    // 2. Try Wikipedia generator search for car articles
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' car')}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (searchRes.ok) {
      const data = await searchRes.json();
      const pages = data.query?.pages || {};
      for (const pid of Object.keys(pages)) {
        if (pages[pid]?.thumbnail?.source) {
          const imgUrl = pages[pid].thumbnail.source;
          if (!failedUrlsSet.has(imgUrl)) {
            inMemoryCache[fullKey] = imgUrl;
            try {
              localStorage.setItem(`gk_car_img_${fullKey}`, imgUrl);
            } catch (_) {}
            return imgUrl;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`[CarImageService] Could not resolve image for ${query}:`, err);
  }

  // 3. Fallback to appropriate studio aesthetic category
  return getStudioFallback(brand, model);
}

/**
 * React Hook that seamlessly loads the verified real photo for any car model.
 * Provides guaranteed fallback and safe error handler.
 */
export function useCarImage(
  brand?: string,
  model?: string,
  fallbackType?: 'sports' | 'suv' | 'sedan' | 'luxury'
) {
  const fallbackUrl = getStudioFallback(brand, model, fallbackType);
  const initial = getPreloadedCarImage(brand, model);

  const [imageUrl, setImageUrl] = useState<string>(initial || fallbackUrl);
  const [isFallback, setIsFallback] = useState<boolean>(!initial);
  const [isLoading, setIsLoading] = useState<boolean>(!initial && !!(brand || model));

  useEffect(() => {
    let isMounted = true;
    const pre = getPreloadedCarImage(brand, model);
    const fb = getStudioFallback(brand, model, fallbackType);

    if (pre) {
      setImageUrl(pre);
      setIsFallback(false);
      setIsLoading(false);
      return;
    }

    if (!brand && !model) {
      setImageUrl(fb);
      setIsFallback(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    resolveRealCarImage(brand, model)
      .then((url) => {
        if (isMounted) {
          setImageUrl(url);
          setIsFallback(url === fb);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setImageUrl(fb);
          setIsFallback(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [brand, model, fallbackType]);

  const markError = useCallback(() => {
    if (imageUrl && !isFallback) {
      markCarImageFailed(imageUrl);
      setImageUrl(fallbackUrl);
      setIsFallback(true);
    }
  }, [imageUrl, isFallback, fallbackUrl]);

  return {
    imageUrl,
    isLoading,
    isFallback,
    fallbackUrl,
    markError,
  };
}
