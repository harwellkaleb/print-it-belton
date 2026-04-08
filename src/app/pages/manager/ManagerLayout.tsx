import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  ImagePlus,
  ClipboardList,
  LogOut,
  Printer,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/manager", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/manager/orders", label: "Orders", icon: ClipboardList, end: false },
  { to: "/manager/images", label: "Products & Images", icon: ImagePlus, end: false },
  { to: "/manager/settings", label: "Settings", icon: Settings, end: false },
];

export default function ManagerLayout() {
  const { session, profile, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!session) {
        navigate("/login", { state: { from: "/manager" } });
      } else if (profile && profile.role !== "manager") {
        navigate("/");
      }
    }
  }, [loading, session, profile, navigate]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1e3c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-white/60 text-sm">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  // Not logged in → redirect handled by useEffect, show blank while redirecting
  if (!session) return null;

  // Logged in but profile didn't load or is wrong role
  if (!profile || profile.role !== "manager") {
    return (
      <div className="min-h-screen bg-[#0f1e3c] flex items-center justify-center px-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-white font-black text-xl mb-2">Manager Access Required</h2>
          <p className="text-white/50 text-sm mb-6">
            {profile
              ? "Your account doesn't have manager permissions yet."
              : "We couldn't load your account profile. This usually means your manager role needs to be re-applied."}
          </p>
          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
            >
              Go to Login &amp; Apply Manager Access
            </a>
            <button
              onClick={() => navigate("/")}
              className="block w-full text-white/40 hover:text-white text-sm transition-colors py-2"
            >
              Return to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-600 rounded-lg p-2 shadow-lg">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block font-black text-base text-white tracking-tight">
              PRINT IT
            </span>
            <span className="block text-[11px] text-red-400 font-bold tracking-[0.2em] -mt-0.5">
              BELTON
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 text-red-300 text-xs px-3 py-1.5 rounded-full w-fit font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Manager Portal
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? "bg-red-600 text-white shadow-lg shadow-red-900/30"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </NavLink>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/40 hover:text-white/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4" />
              View Store
            </div>
          </a>
        </div>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-md">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-bold truncate">{profile.name}</p>
            <p className="text-white/40 text-xs truncate">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout();
            navigate("/");
          }}
          className="w-full flex items-center gap-2 text-white/40 hover:text-red-400 text-sm transition-colors py-2 px-1 rounded-lg hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-[#0f1e3c] hidden lg:flex flex-col fixed h-full z-40 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`w-64 bg-[#0f1e3c] flex flex-col fixed h-full z-50 shadow-2xl transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute right-3 top-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/40 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Mobile Top Bar */}
        <header className="lg:hidden bg-[#0f1e3c] px-4 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-lg">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/70 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-red-600 rounded p-1">
              <Printer className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-white text-sm tracking-tight">
              PRINT IT BELTON
            </span>
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}