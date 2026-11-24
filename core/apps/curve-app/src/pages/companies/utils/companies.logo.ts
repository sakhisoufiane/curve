import { LOGO_MAX_BYTES, LOGO_MAX_DIMENSION } from './companies.constants';

export type LogoValidationResult = { ok: true } | { ok: false; reason: 'size' | 'dimensions' };

/**
 * Validates a logo file against the size and dimension limits before upload
 * (matches the Angular ngf-max-* rules). The caller maps the failure `reason`
 * to a user-facing toast.
 */
export async function validateLogoFile(file: File): Promise<LogoValidationResult> {
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }

  const withinDimensions = await new Promise<boolean>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth <= LOGO_MAX_DIMENSION && img.naturalHeight <= LOGO_MAX_DIMENSION);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });

  if (!withinDimensions) {
    return { ok: false, reason: 'dimensions' };
  }

  return { ok: true };
}
