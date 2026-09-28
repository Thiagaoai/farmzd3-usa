import { PRODUCT_IMAGE_BUCKET } from '@/lib/farmz3d/products';
import { getObject } from '@/lib/farmz3d/storage';

export const runtime = 'nodejs';

// Public product photos uploaded in the panel. Keys are random and never reused,
// so the response can be cached forever.
export async function GET(_request: Request, { params }: { params: Promise<{ month: string; file: string }> }) {
  const { month, file } = await params;
  const image = await getObject(PRODUCT_IMAGE_BUCKET, `${month}/${file}`);
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(Buffer.from(image.bytes), {
    headers: {
      'Content-Type': image.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
