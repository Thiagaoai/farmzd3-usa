'use client';

import dynamic from 'next/dynamic';

// three.js only runs in the browser; the server renders the glow placeholder.
const Hero3D = dynamic(() => import('./Hero3D'), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function HeroCanvas() {
  return <Hero3D accent="#5B7CFF" />;
}
