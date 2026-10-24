export interface LocationCoordinates {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Curated geographic dictionary for instant, zero-network fallback resolution.
 * All keys stored in normalized lowercase.
 */
export const LOCATION_DICTIONARY: Record<string, LocationCoordinates> = {
  // New York Metro Area
  'manhattan, nyc': { name: 'Manhattan, NYC', latitude: 40.7831, longitude: -73.9712 },
  'manhattan': { name: 'Manhattan, NYC', latitude: 40.7831, longitude: -73.9712 },
  'brooklyn, nyc': { name: 'Brooklyn, NYC', latitude: 40.6782, longitude: -73.9442 },
  'brooklyn': { name: 'Brooklyn, NYC', latitude: 40.6782, longitude: -73.9442 },
  'queens, nyc': { name: 'Queens, NYC', latitude: 40.7282, longitude: -73.7949 },
  'queens': { name: 'Queens, NYC', latitude: 40.7282, longitude: -73.7949 },
  'bronx': { name: 'The Bronx, NYC', latitude: 40.8448, longitude: -73.8648 },
  'staten island': { name: 'Staten Island, NYC', latitude: 40.5795, longitude: -74.1502 },
  'new york city': { name: 'New York City, NY', latitude: 40.7128, longitude: -74.006 },
  'nyc': { name: 'New York City, NY', latitude: 40.7128, longitude: -74.006 },

  // Indian Metros
  'mumbai': { name: 'Mumbai, Maharashtra', latitude: 19.076, longitude: 72.8777 },
  'delhi': { name: 'New Delhi, India', latitude: 28.6139, longitude: 77.209 },
  'new delhi': { name: 'New Delhi, India', latitude: 28.6139, longitude: 77.209 },
  'bangalore': { name: 'Bengaluru, Karnataka', latitude: 12.9716, longitude: 77.5946 },
  'bengaluru': { name: 'Bengaluru, Karnataka', latitude: 12.9716, longitude: 77.5946 },
  'kolkata': { name: 'Kolkata, West Bengal', latitude: 22.5726, longitude: 88.3639 },
  'chennai': { name: 'Chennai, Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },

  // International High-Frequency Disaster Hubs
  'san francisco': { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 },
  'los angeles': { name: 'Los Angeles, CA', latitude: 34.0522, longitude: -118.2437 },
  'miami': { name: 'Miami, FL', latitude: 25.7617, longitude: -80.1918 },
  'london': { name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
  'tokyo': { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
  'sydney': { name: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
};

/**
 * Default fallback centroid (e.g. Manhattan NYC) if entity cannot be determined
 */
export const DEFAULT_FALLBACK_LOCATION: LocationCoordinates = {
  name: 'General Disaster Zone',
  latitude: 40.7831,
  longitude: -73.9712,
};
