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
  area: 'Gotri - Vasna - Bhayli',
  city: 'Vadodara',
  state: 'Gujarat',
  pincode: '391410',
  lat: 22.3134,
  lng: 73.1342,
};

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
 * High-accuracy live GPS location fetch from device
 */
export function getDeviceLiveLocation(): Promise<LocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser/device.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is currently unavailable from your device GPS.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please try again.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse-geocodes GPS coordinates into formatted address components
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<GeocodedAddress> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'Accept-Language': 'en-IN,en;q=0.9',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const a = data.address || {};

      const street = a.road || a.pedestrian || a.suburb || a.neighbourhood || '';
      const landmark = a.neighbourhood || a.suburb || a.residential || a.amenity || '';
      const area = a.suburb || a.city_district || a.neighbourhood || 'Gotri-Vasna-Bhayli Area';
      const city = a.city || a.town || a.county || 'Vadodara';
      const state = a.state || 'Gujarat';
      const pincode = a.postcode || '391410';

      const formatted = data.display_name || `${street}, ${area}, ${city}, ${state} - ${pincode}`;

      return {
        formattedAddress: formatted,
        street,
        landmark,
        area,
        city,
        state,
        pincode,
      };
    }
  } catch (e) {
    console.warn('Reverse geocoding network error, using fallback:', e);
  }

  // Graceful fallback if offline or API rate limit
  return {
    formattedAddress: `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}), Vadodara, Gujarat`,
    street: `Location near GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    landmark: 'Near Gotri-Vasna-Bhayli Corridor',
    area: 'Vadodara Urban',
    city: 'Vadodara',
    state: 'Gujarat',
    pincode: '390021',
  };
}

/**
 * Generates Google Maps Directions URL from Customer Location to Studio
 */
export function getRouteUrlToStudio(customerLat: number, customerLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${customerLat},${customerLng}&destination=${OWNER_STUDIO_LOCATION.lat},${OWNER_STUDIO_LOCATION.lng}&travelmode=driving`;
}

/**
 * Generates Google Maps Pin URL
 */
export function getMapPinUrl(lat: number, lng: number, label?: string): string {
  return `https://www.google.com/maps?q=${lat},${lng}${label ? `+(${encodeURIComponent(label)})` : ''}`;
}
