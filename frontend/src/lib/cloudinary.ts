/**
 * Inserts on-the-fly Cloudinary transformations into an upload URL.
 * Uses smart gravity (g_auto) so the subject stays centered when cropping.
 *
 * Example:
 *   cldTransform(url, { width: 600, ar: '4:5' })
 *   → https://res.cloudinary.com/.../upload/c_fill,g_auto,w_600,ar_4:5,q_auto,f_auto/v123/...
 */
export function cldTransform(
  url: string | null | undefined,
  opts: { width?: number; ar?: string } = {},
): string {
  if (!url) return '';
  if (!url.includes('/image/upload/')) return url;

  const parts: string[] = ['c_fill', 'g_auto'];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.ar) parts.push(`ar_${opts.ar}`);
  parts.push('q_auto', 'f_auto');

  return url.replace('/image/upload/', `/image/upload/${parts.join(',')}/`);
}
