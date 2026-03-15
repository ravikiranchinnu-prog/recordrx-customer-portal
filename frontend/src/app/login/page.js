'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, loading: authLoading } = useAuth();
  const router = useRouter();
  const canvasRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.role === 'customer' ? '/customer/dashboard' : '/admin/dashboard');
    }
  }, [user, authLoading, router]);

  // Nebula canvas animation (from original login.html — subtle clouds + connected stars)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const isDark = () => document.documentElement.classList.contains('dark');
    const dpr = () => Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    let width = 0, height = 0;
    function resize() {
      width = Math.floor(window.innerWidth);
      height = Math.floor(window.innerHeight);
      const ratio = dpr();
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const STAR_COUNT = 44;
    const MAX_DIST = 140;
    const MAX_CONNECTIONS = 2;

    const stars = Array.from({ length: STAR_COUNT }, () => {
      const speed = 0.12 + Math.random() * 0.18;
      const angle = Math.random() * Math.PI * 2;
      return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 0.8 + Math.random() * 1.2 };
    });

    const blobs = Array.from({ length: 4 }, () => {
      const speed = 0.03 + Math.random() * 0.05;
      const angle = Math.random() * Math.PI * 2;
      return { x: Math.random() * width, y: Math.random() * height, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: Math.min(width, height) * (0.28 + Math.random() * 0.22) };
    });

    function wrap(p, pad) {
      if (p.x < -pad) p.x = width + pad;
      if (p.x > width + pad) p.x = -pad;
      if (p.y < -pad) p.y = height + pad;
      if (p.y > height + pad) p.y = -pad;
    }

    let raf = 0;
    function draw() {
      ctx.clearRect(0, 0, width, height);

      for (const b of blobs) {
        b.x += b.vx; b.y += b.vy; wrap(b, b.r);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        if (isDark()) {
          g.addColorStop(0, 'rgba(148, 163, 184, 0.08)');
          g.addColorStop(0.55, 'rgba(100, 116, 139, 0.05)');
          g.addColorStop(1, 'rgba(2, 6, 23, 0)');
        } else {
          g.addColorStop(0, 'rgba(15, 23, 42, 0.06)');
          g.addColorStop(0.55, 'rgba(51, 65, 85, 0.03)');
          g.addColorStop(1, 'rgba(248, 250, 252, 0)');
        }
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
      }

      const starFill = isDark() ? 'rgba(226, 232, 240, 0.70)' : 'rgba(15, 23, 42, 0.35)';
      ctx.fillStyle = starFill;
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy; wrap(s, 24);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }

      const lineBase = isDark() ? [226, 232, 240] : [15, 23, 42];
      for (let i = 0; i < stars.length; i++) {
        let connections = 0;
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i], b = stars[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > MAX_DIST) continue;
          connections++;
          if (connections > MAX_CONNECTIONS) break;
          const alpha = (1 - d / MAX_DIST) * (isDark() ? 0.18 : 0.10);
          ctx.strokeStyle = `rgba(${lineBase[0]}, ${lineBase[1]}, ${lineBase[2]}, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }

      raf = window.requestAnimationFrame(draw);
    }

    raf = window.requestAnimationFrame(draw);
    const visChange = () => {
      if (document.hidden) { if (raf) window.cancelAnimationFrame(raf); raf = 0; }
      else if (!raf) { raf = window.requestAnimationFrame(draw); }
    };
    window.addEventListener('visibilitychange', visChange);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('visibilitychange', visChange);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="h-full bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <canvas ref={canvasRef} className="fixed inset-0 h-full w-full pointer-events-none" style={{ zIndex: 0 }} />

      <main className="relative min-h-screen flex items-start justify-center px-6 pt-12 pb-8 sm:pt-16" style={{ zIndex: 10 }}>
        <section className="w-full max-w-sm">
          {/* Brand */}
          <div className="relative mb-6 text-center">
            <div className="relative inline-block">
              <h1 className="login-logo-title text-3xl font-semibold tracking-tight sm:text-4xl">Radix</h1>
            </div>
            <p className="login-logo-tagline mt-2 text-compact italic text-slate-800 dark:text-slate-200 sm:text-base">The Root of Reliability</p>
          </div>

          <div className="card w-full border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950" style={{ borderRadius: '10px' }}>
            <div className="mb-5 text-center">
              <div className="text-compact font-semibold tracking-tight text-slate-900 dark:text-slate-100">Login Portal</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <p className="text-compact-sm text-red-600">{error}</p>
              )}

              <div>
                <label className="text-compact-sm text-slate-900 dark:text-slate-100" htmlFor="userId">User ID</label>
                <input id="userId" type="text" value={email} onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username" spellCheck="false" autoFocus
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-compact outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-teal-400" />
              </div>

              <div>
                <label className="text-compact-sm text-slate-900 dark:text-slate-100" htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-compact outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-teal-400" />
              </div>

              <button type="submit" disabled={loading}
                className="btn mt-2 w-full rounded-xl border border-teal-600/10 bg-teal-600 px-3 py-2 text-compact font-medium text-white hover:bg-teal-700 transition-colors dark:border-teal-400/10 dark:bg-teal-500 dark:text-white disabled:opacity-50">
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
