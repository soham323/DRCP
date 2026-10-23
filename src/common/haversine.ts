export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * on Earth using the Haversine formula.
 *
 * @param origin - Origin coordinate with latitude and longitude in degrees
 * @param destination - Destination coordinate with latitude and longitude in degrees
 * @returns Distance in kilometers rounded to two decimal places
 */
export function calculateHaversineDistanceKm(origin: Coordinates, destination: Coordinates): number {
  const EARTH_RADIUS_KM = 6371.0;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180.0;

  const lat1Rad = toRadians(origin.latitude);
  const lon1Rad = toRadians(origin.longitude);
  const lat2Rad = toRadians(destination.latitude);
  const lon2Rad = toRadians(destination.longitude);

  const deltaLat = lat2Rad - lat1Rad;
  const deltaLon = lon2Rad - lon1Rad;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = EARTH_RADIUS_KM * c;

  return Math.round(distanceKm * 100) / 100;
}
