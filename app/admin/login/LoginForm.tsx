'use client';

import { FormEvent, useState } from 'react';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string; redirectTo?: string; user?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.message ?? 'Não foi possível entrar.');
      }

      // The "who is using" switch in the panel starts with whoever logged in.
      const person = data.user?.toLowerCase();
      if (person === 'thiago' || person === 'bruna') {
        try {
          window.localStorage.setItem('farmz3d-decider', person);
        } catch {
          // storage unavailable: the switch keeps its default
        }
      }
      window.location.href = data.redirectTo ?? '/admin';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[34px] border border-white/10 bg-zinc-950/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur md:p-8">
      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Admin access</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Entrar no painel</h1>
        </div>
      </div>

      <label className="block text-sm font-semibold text-zinc-300">
        Usuário
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/60"
          autoComplete="username"
        />
      </label>

      <label className="mt-5 block text-sm font-semibold text-zinc-300">
        Senha
        <div className="mt-2 flex rounded-2xl border border-white/10 bg-black/50 focus-within:border-cyan-300/60">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? 'text' : 'password'}
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="px-4 text-zinc-500 transition-colors hover:text-white"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </label>

      {message ? <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{message}</p> : null}

      <button
        disabled={busy}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-black transition-colors hover:bg-cyan-100 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
        Entrar
      </button>
    </form>
  );
}
