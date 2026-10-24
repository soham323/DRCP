import { config } from '../../config';
import { logger } from '../../common/logger';
import {
  LOCATION_DICTIONARY,
  DEFAULT_FALLBACK_LOCATION,
  LocationCoordinates,
} from './location-dictionary';

export class GeocodingService {
  /**
   * Extract named geographic entity from an unstructured narrative description.
   * Example: "Heavy flooding has affected Manhattan, NYC with subway stations submerged." -> "Manhattan, NYC"
   */
  public extractLocationName(description: string): string {
    const lower = description.toLowerCase();

    // 1. Direct dictionary key search (sorted by length descending for longest match)
    const sortedKeys = Object.keys(LOCATION_DICTIONARY).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (lower.includes(key)) {
        return LOCATION_DICTIONARY[key].name;
      }
    }

    // 2. Regex pattern heuristics for location indicators (in, at, near, affecting, affected)
    const prepositionPatterns = [
      /(?:affected|affecting|hit|in|near|around|at)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:,\s*[A-Z]{2,4})?)/,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*,\s*[A-Z]{2,4})/,
    ];

    for (const pattern of prepositionPatterns) {
      const match = description.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        // Ignore generic common words if matched by mistake
        if (!['Emergency', 'Disaster', 'Severe', 'Heavy', 'Urgent'].includes(candidate)) {
          return candidate;
        }
      }
    }

    // 3. Fallback to default
    return DEFAULT_FALLBACK_LOCATION.name;
  }

  /**
   * Resolve a location name into latitude and longitude coordinates.
   * Uses local dictionary first, then OpenStreetMap Nominatim with timeout, and fallback.
   */
  public async geocode(locationName: string): Promise<LocationCoordinates> {
    const normalizedKey = locationName.toLowerCase().trim();

    // 1. Check local dictionary first (instant zero-latency hit)
    if (LOCATION_DICTIONARY[normalizedKey]) {
      logger.info(`[Geocoding] Cache/Dictionary HIT for: "${locationName}"`);
      return LOCATION_DICTIONARY[normalizedKey];
    }

    // Check partial matches in dictionary
    for (const [key, coords] of Object.entries(LOCATION_DICTIONARY)) {
      if (normalizedKey.includes(key) || key.includes(normalizedKey)) {
        logger.info(`[Geocoding] Partial Dictionary match for "${locationName}" -> "${coords.name}"`);
        return coords;
      }
    }

    // 2. Query OpenStreetMap Nominatim API with resilient timeout
    try {
      logger.info(`[Geocoding] Querying OpenStreetMap Nominatim for: "${locationName}"`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.externalTimeoutMs);

      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        locationName
      )}&format=json&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'DRCP-DisasterPlatform/1.0 (Emergency Coordination Architecture)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as any[];
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          const result: LocationCoordinates = {
            name: locationName,
            latitude: parseFloat(data[0].lat),
            longitude: parseFloat(data[0].lon),
          };
          logger.info(`[Geocoding] Nominatim resolved "${locationName}" -> [${result.latitude}, ${result.longitude}]`);
          return result;
        }
      }
    } catch (err: any) {
      logger.warn(`[Geocoding] External Nominatim request failed or timed out: ${err.message}. Activating fallback.`);
    }

    // 3. Resilient fallback: Never fail incident creation
    logger.warn(`[Geocoding] Using default fallback coordinates for "${locationName}"`);
    return {
      name: locationName || DEFAULT_FALLBACK_LOCATION.name,
      latitude: DEFAULT_FALLBACK_LOCATION.latitude,
      longitude: DEFAULT_FALLBACK_LOCATION.longitude,
    };
  }

  /**
   * One-step convenience: extracts location from narrative description and resolves coordinates.
   */
  public async resolveFromDescription(description: string): Promise<LocationCoordinates> {
    const extractedName = this.extractLocationName(description);
    return this.geocode(extractedName);
  }
}

export const geocodingService = new GeocodingService();
