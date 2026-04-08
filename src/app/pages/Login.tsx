import {
  Eye,
  EyeOff,
  Anchor,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { useAuth, supabase } from "../context/AuthContext";
import { apiUrl, authHeaders } from "../utils/api";
import { publicAnonKey } from "/utils/supabase/info";
import { toast } from "sonner";

export default function Login() {
  const { login, session, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Manager access panel
  const [showManager, setShowManager] = useState(false);
  const [managerCode, setManagerCode] = useState("");
  const [showCode, setShowCode] = useState(false);

  /** Apply manager role using a valid token. Returns the profile on success, null on failure. */
  const applyManagerRole = async (userToken: string): Promise<any | null> => {
    try {
      const res = await fetch(apiUrl("/auth/make-manager"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          userToken,
          managerCode: managerCode.trim(),
        }),
      });

      let data: any = {};
      try { data = await res.json(); } catch { data = {}; }

      console.log("make-manager →", res.status, JSON.stringify(data));

      if (!res.ok) {
        toast.error(data.error || `Server error ${res.status} — check console`);
        return null;
      }
      return data.profile ?? true;
    } catch (err: any) {
      console.error("make-manager fetch error:", err);
      toast.error(`Network error: ${err.message}`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Sign in
      await login(email, password);

      // 2. Get the fresh session token
      const {
        data: { session: sess },
      } = await supabase.auth.getSession();

      if (!sess?.access_token) {
        toast.error("Login succeeded but session could not be retrieved.");
        return;
      }

      // 3. If manager panel is open and a code was entered, apply the role now
      if (showManager && managerCode.trim()) {
        const ok = await applyManagerRole(sess.access_token);
        if (!ok) {
          // Wrong code — stay on page so user can correct it
          setLoading(false);
          return;
        }
        await refreshProfile();
        toast.success("Manager access granted! Redirecting to dashboard…");
        navigate("/manager");
        return;
      }

      // 4. Normal login — check role and redirect
      let destination = from || "/account";
      try {
        const res = await fetch(apiUrl("/user/profile"), {
          headers: authHeaders(sess.access_token),
        });
        if (res.ok) {
          const profile = await res.json();
          if (profile.role === "manager") {
            destination = from || "/manager";
          }
        }
      } catch {
        /* use default destination */
      }

      toast.success("Welcome back!");
      navigate(destination);
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  /**
   * "Apply" button used when the user is ALREADY logged in
   */
  const handleApplyExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session: fresh } } = await supabase.auth.getSession();
      console.log("handleApplyExisting — fresh session:", fresh?.access_token ? "✓ token present" : "✗ NO TOKEN");
      if (!fresh?.access_token) {
        toast.error("Session expired — please sign in again.");
        navigate("/login");
        return;
      }
      const result = await applyManagerRole(fresh.access_token);
      if (!result) return;
      // Refresh profile with fresh token so ManagerLayout sees role="manager"
      await refreshProfile();
      toast.success("Manager access granted! Redirecting to dashboard…");
      navigate("/manager");
    } finally {
      setLoading(false);
    }
  };

  const alreadyLoggedIn = !!session;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#2B3272] rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors">
              <Anchor className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-black text-lg text-[#2B3272] tracking-tight">
              PRINT IT BELTON
            </span>
          </Link>
          <h1 className="text-xl font-bold text-gray-800 mt-5 mb-1">
            {alreadyLoggedIn ? "You're signed in" : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm">
            {alreadyLoggedIn
              ? `Signed in as ${profile?.email || session?.user?.email || "your account"}.`
              : "Sign in to your account"}
          </p>
          {alreadyLoggedIn && (
            <button
              onClick={async () => { await logout(); navigate("/login"); }}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          )}
        </div>

        {/* ── Login form (hide when already logged in) ───────────────── */}
        {!alreadyLoggedIn && (
          <div className="bg-white border border-gray-200 rounded shadow-sm p-8 mb-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] focus:border-transparent placeholder:text-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] focus:border-transparent placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Manager code field — shown inline when panel is open */}
              {showManager && (
                <div className="bg-[#2B3272]/5 border border-[#2B3272]/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-[#2B3272] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Manager access code
                  </p>
                  <div className="relative">
                    <input
                      type={showCode ? "text" : "password"}
                      value={managerCode}
                      onChange={(e) => setManagerCode(e.target.value)}
                      placeholder="Enter your code"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="w-full bg-white border border-[#2B3272]/30 text-gray-900 rounded px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Sign in and activate manager access in one step.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded font-bold text-white transition-all mt-2 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : showManager && managerCode.trim()
                    ? "bg-[#2B3272] hover:bg-[#1e2454]"
                    : "bg-red-700 hover:bg-red-800"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {showManager && managerCode.trim()
                      ? "Signing in & activating…"
                      : "Signing in…"}
                  </>
                ) : (
                  <>
                    {showManager && managerCode.trim() ? (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Sign In as Manager
                      </>
                    ) : (
                      <>
                        Sign In <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#2B3272] hover:text-red-700 font-semibold transition-colors"
              >
                Create one free
              </Link>
            </div>
          </div>
        )}

        {/* ── Manager access panel ────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowManager((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-[#2B3272] hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Manager access
            </span>
            {showManager ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showManager && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
              {alreadyLoggedIn ? (
                /* Already signed in — just need the code */
                <>
                  <p className="text-xs text-gray-500">
                    Enter your manager access code to activate dashboard
                    permissions for your current account.
                  </p>
                  <form onSubmit={handleApplyExisting} className="space-y-2">
                    <div className="relative">
                      <input
                        type={showCode ? "text" : "password"}
                        value={managerCode}
                        onChange={(e) => setManagerCode(e.target.value)}
                        placeholder="Manager access code  e.g. PRINTIT2024"
                        required
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        className="w-full bg-gray-50 border border-[#2B3272]/30 text-gray-900 rounded px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCode((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !managerCode.trim()}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#2B3272] hover:bg-[#1e2454] disabled:bg-gray-300 text-white font-semibold px-4 py-2.5 rounded text-sm transition-colors"
                    >
                      {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      Apply Manager Access
                    </button>
                  </form>
                </>
              ) : (
                /* Not signed in — explain the combined flow */
                <p className="text-xs text-gray-500">
                  Enter your email, password, and manager access code above,
                  then click{" "}
                  <span className="font-semibold text-[#2B3272]">
                    Sign In as Manager
                  </span>{" "}
                  to sign in and activate manager access in one step.
                </p>
              )}

              <p className="text-xs text-gray-400 pt-1">
                New manager?{" "}
                <Link
                  to="/signup?manager=true"
                  className="text-[#2B3272] hover:underline font-semibold"
                >
                  Create a manager account
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}