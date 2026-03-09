// ============================================================
// ProtectedRoute.tsx
// 未登入 → 導回 /login；loading 中顯示全螢幕載入
// ============================================================

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d1117]">
        <span className="text-white/40 text-sm">載入中…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
