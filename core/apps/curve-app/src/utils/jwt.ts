export class JwtDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtDecodeError';
  }
}

export const parseJwt = (token: string) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new JwtDecodeError('Invalid JWT format');
    }

    const base64Url = parts[1];
    if (!base64Url) throw new JwtDecodeError('JWT payload is missing');
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    if (error instanceof JwtDecodeError) throw error;
    throw new JwtDecodeError(`Failed to decode JWT: ${error}`);
  }
};
