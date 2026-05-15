const DEFAULT_DEV_JWT_SECRET = 'super-secret-key';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEFAULT_DEV_JWT_SECRET;
}
