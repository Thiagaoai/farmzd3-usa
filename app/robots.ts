import type { MetadataRoute } from 'next';

const siteUrl = process.env.FARMZ3D_SITE_URL || 'https://farmz3d.shop';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
