// Verifies that downloaded bytes really are the image type the upstream claimed.

export function isValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/gif') {
    const header = buffer.toString('ascii', 0, 6);
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (mimeType === 'image/webp') {
    const riff = buffer.toString('ascii', 0, 4);
    const webp = buffer.toString('ascii', 8, 12);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (mimeType === 'image/avif') {
    const ftyp = buffer.toString('ascii', 4, 8);
    const brand = buffer.toString('ascii', 8, 12);
    return ftyp === 'ftyp' && (brand === 'avif' || brand === 'avis' || brand === 'mif1');
  }

  return false;
}
