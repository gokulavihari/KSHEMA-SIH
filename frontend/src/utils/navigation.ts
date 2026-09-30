/**
 * Navigation & Google Maps Integration Utilities for Kshema
 * Provides strict coordinate validation and Google Maps URL construction.
 */

export interface CoordinateValidationResult {
  isValid: boolean;
  reason?: 'MISSING' | 'INVALID_TYPE' | 'OUT_OF_RANGE' | 'ZERO_COORDINATES' | 'VALID';
  message?: string;
}

/**
 * Validates geographic latitude and longitude coordinates.
 * Latitude range: [-90, 90]
 * Longitude range: [-180, 180]
 */
export function validateCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): CoordinateValidationResult {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return {
      isValid: false,
      reason: 'MISSING',
      message: 'Navigation unavailable — verified coordinates are not available for this relocation site.'
    };
  }

  const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
    return {
      isValid: false,
      reason: 'INVALID_TYPE',
      message: 'Navigation unavailable — the relocation site\'s location data could not be validated.'
    };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      isValid: false,
      reason: 'OUT_OF_RANGE',
      message: 'Navigation unavailable — the relocation site\'s location data could not be validated.'
    };
  }

  // Check for dummy (0, 0) coordinates which indicate uninitialized geospatial data
  if (lat === 0 && lng === 0) {
    return {
      isValid: false,
      reason: 'ZERO_COORDINATES',
      message: 'Navigation unavailable — verified coordinates are not available for this relocation site.'
    };
  }

  return {
    isValid: true,
    reason: 'VALID'
  };
}

/**
 * Checks if coordinates are valid for navigation.
 */
export function isValidCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return validateCoordinates(latitude, longitude).isValid;
}

/**
 * Constructs a standard Google Maps Directions destination URL using verified coordinates.
 * Format: https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE
 */
export function getGoogleMapsDirectionsUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  _siteName?: string
): string | null {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.isValid) {
    return null;
  }

  const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

  const formattedLat = lat.toFixed(6);
  const formattedLng = lng.toFixed(6);

  // Standard Google Maps Directions URL (api=1 allows standard web/app opening across Desktop & Mobile)
  return `https://www.google.com/maps/dir/?api=1&destination=${formattedLat},${formattedLng}`;
}

/**
 * Constructs a standard Google Maps Search/View URL for displaying location without directions.
 * Format: https://www.google.com/maps/search/?api=1&query=LATITUDE,LONGITUDE
 */
export function getGoogleMapsViewUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.isValid) {
    return null;
  }

  const lat = typeof latitude === 'string' ? parseFloat(latitude) : Number(latitude);
  const lng = typeof longitude === 'string' ? parseFloat(longitude) : Number(longitude);

  const formattedLat = lat.toFixed(6);
  const formattedLng = lng.toFixed(6);

  return `https://www.google.com/maps/search/?api=1&query=${formattedLat},${formattedLng}`;
}
