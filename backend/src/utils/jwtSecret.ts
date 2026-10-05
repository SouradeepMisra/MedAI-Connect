// Single source of truth for the JWT signing secret. Throws rather than
// falling back to an empty string — jwt.sign/jwt.verify against '' would
// mean anyone could forge a token for any role. index.ts calls this once at
// startup and exits if it throws, so in practice no request-handling code
// ever runs without a real secret in place.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}
