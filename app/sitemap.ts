import type { MetadataRoute } from 'next';

const siteUrl = process.env.FARMZ3D_SITE_URL || 'https://farmz3d.shop';

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 }];
}
