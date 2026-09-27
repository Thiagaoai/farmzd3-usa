import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#F5F5F3] px-6 text-center text-[#0B0C0E]">
      <div>
        <p className="text-sm tracking-[0.25em] text-[#2B5BFF]">404</p>
        <h1 className="mt-3 text-3xl font-semibold">This page is not printed yet.</h1>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-[#0B0C0E] px-6 py-3 text-sm font-semibold text-white">
          Back to the shop
        </Link>
      </div>
    </main>
  );
}
