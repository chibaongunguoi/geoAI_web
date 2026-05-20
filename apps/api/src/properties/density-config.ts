const DEFAULT_LIMIT = 1500;
const MIN_LIMIT = 500;
const MAX_LIMIT = 2000;

/**
 * Resolves the density object limit from an environment variable value.
 *
 * - Returns 1500 when envValue is undefined or empty string
 * - Returns 1500 when envValue is non-numeric
 * - Clamps the parsed value to [500, 2000] range
 * - Logs a warning to console when clamping occurs
 */
export function resolveDensityObjectLimit(envValue?: string): number {
  if (envValue === undefined || envValue === "") {
    return DEFAULT_LIMIT;
  }

  const parsed = Number(envValue);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  const intValue = Math.round(parsed);

  if (intValue < MIN_LIMIT) {
    console.warn(
      `DENSITY_OBJECT_LIMIT value ${intValue} is below minimum ${MIN_LIMIT}. Clamping to ${MIN_LIMIT}.`
    );
    return MIN_LIMIT;
  }

  if (intValue > MAX_LIMIT) {
    console.warn(
      `DENSITY_OBJECT_LIMIT value ${intValue} exceeds maximum ${MAX_LIMIT}. Clamping to ${MAX_LIMIT}.`
    );
    return MAX_LIMIT;
  }

  return intValue;
}

/**
 * The resolved density object limit, read from process.env.DENSITY_OBJECT_LIMIT.
 */
export const DENSITY_OBJECT_LIMIT = resolveDensityObjectLimit(
  process.env.DENSITY_OBJECT_LIMIT
);
