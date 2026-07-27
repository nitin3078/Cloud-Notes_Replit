import React, { useState } from 'react';
import { useAuth } from '@workspace/replit-auth-web';
import { BookOpen, ArrowRight, Loader2 } from 'lucide-react';

type Mode = 'signin' | 'signup';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login-password';
      const body = mode === 'signup'
        ? { email, password, firstName: firstName || undefined }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      // Simplest reliable way to pick up the new session everywhere in the app.
      window.location.reload();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative notebook spine */}
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-sidebar border-r-2 border-border/60 shadow-[4px_0_12px_rgba(44,26,14,0.05)] z-0" />

      {/* Decorative stitches */}
      <div className="absolute left-3 md:left-6 top-12 bottom-12 flex flex-col justify-between z-10 opacity-20">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-2 md:w-4 h-1 bg-foreground rounded-full shadow-sm" />
        ))}
      </div>

      <div className="max-w-sm w-full relative z-10 flex flex-col items-center text-center pl-8 md:pl-0 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner border border-primary/20 rotate-3 transition-transform hover:rotate-6">
          <BookOpen className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>

        <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-2 tracking-tight">Folio</h1>

        <p className="text-base text-muted-foreground mb-8 font-serif italic max-w-xs leading-relaxed">
          A deeply personal, warm space for your thoughts, ideas, and daily notes.
        </p>

        {/* Sign in / Create account toggle */}
        <div className="w-full flex rounded-lg bg-muted p-1 mb-5">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3 text-left">
          {mode === 'signup' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="firstName" className="text-xs font-medium text-muted-foreground">Name (optional)</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jamie"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === 'signup' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>

        <div className="w-full flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={login}
          className="group bg-card hover:bg-muted text-foreground border border-border font-medium text-sm px-6 py-3 rounded-lg shadow-sm hover:shadow-md transition-all w-full flex items-center justify-center gap-2"
        >
          <span>Continue with Replit</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
