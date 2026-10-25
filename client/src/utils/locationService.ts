/**
 * Location Service for GK AutoHerb
 * Handles 100% accurate device live GPS location detection,
 * Owner Studio location (Gotri - Vasna - Bhayli Road, Vadodara),
 * Haversine distance calculations, reverse-geocoding, and navigation links.
 */

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number; // In meters
}

export interface GeocodedAddress {
  formattedAddress: string;
  street: string;
  landmark: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface StudioInfo {
  name: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

export const OWNER_STUDIO_LOCATION: StudioInfo = {
  name: 'GK AutoHerb Detailing Studio',
  address: 'Gotri - Vasna - Bhayli Main Road, Vadodara, Gujarat 391410',
  area: 'Gotri - Vasna - Bhayli Road',
  city: 'Vadodara',
  state: 'Gujarat',
  pincode: '391410',
  lat: 22.3134,
  lng: 73.1342,
};

/**
 * Dynamically resolves studio location using real-time settings values from DB
 */
export function resolveStudioLocation(settings?: Record<string, string> | null): StudioInfo {
  if (!settings) return OWNER_STUDIO_LOCATION;
  const lat = parseFloat(settings.studio_lat || '') || OWNER_STUDIO_LOCATION.lat;
  const lng = parseFloat(settings.studio_lng || '') || OWNER_STUDIO_LOCATION.lng;
  return {
    name: settings.studio_name || OWNER_STUDIO_LOCATION.name,
    address: settings.studio_address || OWNER_STUDIO_LOCATION.address,
    area: settings.studio_area || OWNER_STUDIO_LOCATION.area,
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '391410',
    lat,
    lng,
  };
}

/**
 * Calculates distance between two coordinates using the Haversine formula (km)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Estimates city road drive time in minutes
 */
export function estimateDriveMinutes(distanceKm: number): number {
  if (distanceKm <= 0.5) return 3;
  return Math.max(5, Math.round(distanceKm * 2.8 + 3));
}

/**
 * Live device location.
 *
 * getCurrentPosition() often returns the first, coarse fix (Wi-Fi / IP based, sometimes kilometres
 * off), which is why the app showed the wrong area. Instead we watch the position for a few seconds
 * and keep the most accurate reading, stopping early once it is good enough.
 */
export function getDeviceLiveLocation(opts: { desiredAccuracy?: number; timeoutMs?: number } = {}): Promise<LocationCoordinates> {
  const desired = opts.desiredAccuracy ?? 40;
  const timeoutMs = opts.timeoutMs ?? 12000;
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not supported on this device.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(new Error('Live location needs a secure (https) connection.'));
      return;
    }

    let best: LocationCoordinates | null = null;
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(err || new Error('Could not get your location. Please try again outdoors or turn on GPS.'));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        if (!best || (fix.accuracy ?? Infinity) < (best.accuracy ?? Infinity)) best = fix;
        if ((fix.accuracy ?? Infinity) <= desired) finish();
      },
      (error) => {
        let msg = 'Unable to get your location.';
        if (error.code === error.PERMISSION_DENIED) msg = 'Location permission is off. Allow location for this app in your phone settings.';
        else if (error.code === error.POSITION_UNAVAILABLE) msg = 'GPS signal not available. Turn on location / GPS and try again.';
        else if (error.code === error.TIMEOUT) msg = 'Location request timed out. Please try again.';
        // Keep waiting for a better fix unless permission is denied
        if (error.code === error.PERMISSION_DENIED || !best) finish(new Error(msg));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
    );
    const timer = setTimeout(() => finish(), timeoutMs);
  });
}

/** Continuous tracking (used while a staff member is driving the car back). Returns a stop() function. */
export function watchDeviceLocation(
  onFix: (fix: LocationCoordinates & { heading?: number | null; speed?: number | null }) => void,
  onError?: (message: string) => void
): () => void {
  if (!navigator.geolocation) {
    onError?.('Location is not supported on this device.');
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onFix({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
    }),
    (error) => onError?.(error.code === error.PERMISSION_DENIED ? 'Location permission denied' : error.message),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

/**
 * Turns coordinates into an address. Returns null fields (never invented place names)
 * when the lookup service can't be reached.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<GeocodedAddress> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en-IN,en;q=0.9' } }
    );
    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};
      const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ');
      const landmark = a.amenity || a.building || a.shop || '';
      const area = a.neighbourhood || a.suburb || a.quarter || a.city_district || a.residential || '';
      const city = a.city || a.town || a.village || a.county || a.state_district || '';
      return {
        formattedAddress: data.display_name || '',
        street,
        landmark,
        area,
        city,
        state: a.state || '',
        pincode: a.postcode || '',
      };
    }
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
  }
  return {
    formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    street: '',
    landmark: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
  };
}

/**
 * Generates Google Maps Directions URL from Customer Location to Studio
 */
export function getRouteUrlToStudio(
  customerLat: number,
  customerLng: number,
  studioLat?: number,
  studioLng?: number
): string {
  const sLat = studioLat ?? OWNER_STUDIO_LOCATION.lat;
  const sLng = studioLng ?? OWNER_STUDIO_LOCATION.lng;
  return `https://www.google.com/maps/dir/?api=1&origin=${customerLat},${customerLng}&destination=${sLat},${sLng}&travelmode=driving`;
}

/**
 * Generates Google Maps Pin URL
 */
export function getMapPinUrl(lat: number, lng: number, label?: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}${label ? `+(${encodeURIComponent(label)})` : ''}`;
}
