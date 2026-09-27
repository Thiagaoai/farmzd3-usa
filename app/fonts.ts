import { Geist, Geist_Mono, Unbounded } from 'next/font/google';

export const display = Unbounded({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--fz-display', display: 'swap' });
export const body = Geist({ subsets: ['latin'], variable: '--fz-body', display: 'swap' });
export const mono = Geist_Mono({ subsets: ['latin'], variable: '--fz-mono', display: 'swap' });
