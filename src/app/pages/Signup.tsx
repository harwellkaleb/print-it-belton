import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Eye, EyeOff, Anchor, ArrowRight, ShieldCheck } from "lucide-react";
import { apiUrl, authHeaders } from "../utils/api";
import { publicAnonKey } from "/utils/supabase/info";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isManagerMode = searchParams.get("manager") === "true";

  const [isManager, setIsManager] = useState(isManagerMode);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    managerCode: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const endpoint = isManager
        ? apiUrl("/auth/manager-signup")
        : apiUrl("/auth/signup");
      const body = isManager
        ? { ...form }
        : { name: form.name, email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(publicAnonKey),
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      // Auto-login after signup
      await login(form.email, form.password);
      toast.success(
        isManager ? "Manager account created!" : "Account created! Welcome!"
      );
      navigate(isManager ? "/manager" : "/account");
    } catch (err: any) {
      console.error("Signup error:", err);
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

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
            {isManager ? "Manager Sign Up" : "Create your account"}
          </h1>
          <p className="text-gray-500 text-sm">
            {isManager
              ? "Requires a manager access code"
              : "Start ordering prints online"}
          </p>
        </div>

        {/* Account type toggle */}
        <div className="flex rounded overflow-hidden border border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setIsManager(false)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              !isManager
                ? "bg-red-700 text-white"
                : "bg-white text-gray-500 hover:text-gray-800"
            }`}
          >
            Customer
          </button>
          <button
            type="button"
            onClick={() => setIsManager(true)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              isManager
                ? "bg-[#2B3272] text-white"
                : "bg-white text-gray-500 hover:text-gray-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Manager
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="John Smith"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <input
                required
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Repeat your password"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
              />
            </div>

            {isManager && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Manager Access Code
                </label>
                <input
                  required
                  type="password"
                  value={form.managerCode}
                  onChange={(e) => set("managerCode", e.target.value)}
                  placeholder="Enter your code"
                  className="w-full bg-gray-50 border border-[#2B3272] text-gray-900 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272] placeholder:text-gray-400"
                />
                <p className="text-xs text-[#2B3272] mt-1">
                  Contact the store owner for the manager access code.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded font-bold text-white transition-all mt-2 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : isManager
                  ? "bg-[#2B3272] hover:bg-[#1e2454]"
                  : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Create Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#2B3272] hover:text-red-700 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}