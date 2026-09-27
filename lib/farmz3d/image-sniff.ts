export type ImageKind = { contentType: string; ext: string };

// Trust the file bytes, not the browser's declared type or file name.
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { contentType: 'image/jpeg', ext: 'jpg' };
  if (bytes.length >= 8 && ascii(0, 8) === '\x89PNG\r\n\x1a\n') return { contentType: 'image/png', ext: 'png' };
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return { contentType: 'image/webp', ext: 'webp' };
  if (bytes.length >= 12 && ascii(4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'heis'].includes(ascii(8, 12))) {
    return { contentType: 'image/heic', ext: 'heic' };
  }
  return null;
}
