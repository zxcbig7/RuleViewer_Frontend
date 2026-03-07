// ============================================================
// AuthPage.tsx
// 登入頁：仿 Catalyst AuthLayout 的置中卡片式設計
// 路由：/login（獨立頁面，不使用 HomePage sidebar 佈局）
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Auth Layout ───────────────────────────────────────────────
// 置中容器，仿 Catalyst AuthLayout：全螢幕高度、水平置中
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0d1117] px-4 py-12">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </main>
  );
}

// ── Login Page ────────────────────────────────────────────────
export default function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("請填寫帳號與密碼。");
      return;
    }

    setLoading(true);
    // 模擬驗證延遲，接入真實 API 時替換此段
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);

    // Mock：任意帳密皆可登入，導向 dashboard
    navigate("/dashboard", { replace: true });
  }

  return (
    <AuthLayout>
      {/* Logo / Brand */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1677ff]/20 border border-[#1677ff]/30">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1677ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 17h7M17.5 14v7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">RTD Rule Viewer</h1>
        <p className="text-sm text-[#8b9ab8]">登入以繼續使用</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/8 bg-[#161b2e] p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b9ab8]" htmlFor="email">
              NT 帳號
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-lg border border-white/12 bg-white/5 px-3 text-sm text-white
                placeholder:text-white/25 outline-none transition-colors
                focus:border-[#1677ff]/60 focus:bg-white/7 focus:ring-2 focus:ring-[#1677ff]/20"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8b9ab8]" htmlFor="password">
              密碼
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/12 bg-white/5 px-3 pr-9 text-sm text-white
                  placeholder:text-white/25 outline-none transition-colors
                  focus:border-[#1677ff]/60 focus:bg-white/7 focus:ring-2 focus:ring-[#1677ff]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
              >
                {showPassword ? (
                  // Eye-off
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  // Eye
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-9 w-full rounded-lg bg-[#1677ff] text-sm font-semibold text-white
              transition-colors hover:bg-[#4096ff] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>
      </div>

      {/* Footer hint */}
      <p className="mt-5 text-center text-xs text-[#4b5a72]">
        想了解更多？
        <button className="ml-1 text-[#1677ff] hover:text-[#4096ff] transition-colors cursor-pointer">
          tKMS 說明
        </button>
      </p>
    </AuthLayout>
  );
}
