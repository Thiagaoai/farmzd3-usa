import type { NextConfig } from "next";

// `next dev` runs on plain http://localhost. Safari applies upgrade-insecure-requests
// and HSTS even there, so CSS/JS would be requested over https and fail to load.
// Development gets the same policy minus those https-only rules.
const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]),
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // React needs eval() for dev tooling only; production stays without 'unsafe-eval'.
      isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://d8j0ntlcm91z4.cloudfront.net",
      "font-src 'self' data:",
      "media-src 'self'",
      // Dev hot reload uses a WebSocket; older Safari does not treat ws: as 'self'.
      isDev ? "connect-src 'self' ws://localhost:*" : "connect-src 'self'",
      isDev ? null : "upgrade-insecure-requests",
    ]
      .filter(Boolean)
      .join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        // Farmz3D product imagery generated with Higgsfield.
        protocol: 'https',
        hostname: 'd8j0ntlcm91z4.cloudfront.net',
        pathname: '/user_3C3uSI3vU6b29vcS2xQJeq4dOn8/**',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/:all*(svg|png|jpg|jpeg|webp|avif|ico|mp4)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
