// Bruna's WhatsApp for Farmz3D customer service. US number (774) 722-5366.
// Override with NEXT_PUBLIC_FARMZ3D_WHATSAPP (digits with country code) without a code change.
export const FARMZ3D_WHATSAPP = (process.env.NEXT_PUBLIC_FARMZ3D_WHATSAPP || '17747225366').replace(/\D/g, '');

// Digits in international format for wa.me. A 10-digit number is treated as US (+1).
// Returns null when the number cannot be a valid WhatsApp number.
export function toWhatsappDigits(phone: string | null | undefined) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function whatsappLink(digits: string, text?: string) {
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function formatUsPhone(digits: string) {
  const match = digits.match(/^1?(\d{3})(\d{3})(\d{4})$/);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : `+${digits}`;
}
