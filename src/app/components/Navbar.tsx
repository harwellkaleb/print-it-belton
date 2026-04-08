import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import {
  ShoppingCart,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Anchor,
  Facebook,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const categories = [
  { label: "T-Shirts", slug: "t-shirts" },
  { label: "Vehicle Graphics", slug: "vehicle-graphics" },
  { label: "Signs & Banners", slug: "signs-banners" },
  { label: "Wall Wraps", slug: "wall-wraps" },
];

export function Navbar() {
  const { profile, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setUserOpen(false);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top Info Bar */}
      <div className="bg-red-700 text-white text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3" />
              Call Us Today: (254) 933-3134
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Mail className="w-3 h-3" />
              PrintItG@gmail.com
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-200 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a
              href="mailto:PrintItG@gmail.com"
              className="hover:text-red-200 transition-colors"
              aria-label="Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setMobileOpen(false)}
            >
              <div className="w-9 h-9 bg-[#2B3272] rounded-full flex items-center justify-center group-hover:bg-red-700 transition-colors">
                <Anchor className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="font-black text-base tracking-tight text-[#2B3272] group-hover:text-red-700 transition-colors">
                  PRINT IT BELTON
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-7">
              <Link
                to="/"
                className={`text-sm font-medium transition-colors hover:text-red-700 ${
                  location.pathname === "/" ? "text-red-700" : "text-gray-700"
                }`}
              >
                Home
              </Link>

              {/* Shop dropdown */}
              <div className="relative">
                <button
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-red-700 ${
                    location.pathname.startsWith("/shop")
                      ? "text-red-700"
                      : "text-gray-700"
                  }`}
                  onMouseEnter={() => setShopOpen(true)}
                  onMouseLeave={() => setShopOpen(false)}
                >
                  Shop
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {shopOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded shadow-lg py-1 z-50"
                    onMouseEnter={() => setShopOpen(true)}
                    onMouseLeave={() => setShopOpen(false)}
                  >
                    <Link
                      to="/shop"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-700 hover:text-white transition-colors"
                      onClick={() => setShopOpen(false)}
                    >
                      All Products
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        to={`/shop?category=${cat.slug}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-700 hover:text-white transition-colors"
                        onClick={() => setShopOpen(false)}
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/"
                className="text-sm font-medium text-gray-700 hover:text-red-700 transition-colors"
              >
                About Print-It
              </Link>

              <Link
                to="/"
                className="text-sm font-medium text-gray-700 hover:text-red-700 transition-colors"
              >
                Contact
              </Link>

              {profile?.role === "manager" && (
                <Link
                  to="/manager"
                  className="flex items-center gap-1.5 text-sm font-medium text-[#2B3272] hover:text-red-700 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Manager
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 rounded hover:bg-gray-100 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCart className="w-5 h-5 text-gray-700" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </Link>

              {/* Auth */}
              {profile ? (
                <div className="relative hidden md:block">
                  <button
                    className="flex items-center gap-2 border border-gray-200 hover:border-red-300 rounded px-3 py-1.5 text-sm transition-colors"
                    onClick={() => setUserOpen(!userOpen)}
                  >
                    <div className="w-6 h-6 bg-red-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-700 max-w-20 truncate">
                      {profile.name}
                    </span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </button>
                  {userOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg py-1 z-50">
                      <Link
                        to="/account"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserOpen(false)}
                      >
                        <User className="w-4 h-4" />
                        My Account
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/login"
                    className="text-sm text-gray-700 hover:text-red-700 transition-colors px-3 py-1.5"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-red-700 hover:bg-red-800 text-white text-sm font-semibold px-4 py-1.5 rounded transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 rounded hover:bg-gray-100 transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? (
                  <X className="w-5 h-5 text-gray-700" />
                ) : (
                  <Menu className="w-5 h-5 text-gray-700" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-2">
            <Link
              to="/"
              className="block py-2 text-gray-700 hover:text-red-700 transition-colors font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/shop"
              className="block py-2 text-gray-700 hover:text-red-700 transition-colors font-medium"
              onClick={() => setMobileOpen(false)}
            >
              All Products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/shop?category=${cat.slug}`}
                className="block py-2 pl-4 text-gray-500 hover:text-red-700 transition-colors text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {cat.label}
              </Link>
            ))}
            {profile?.role === "manager" && (
              <Link
                to="/manager"
                className="block py-2 text-[#2B3272] hover:text-red-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Manager Dashboard
              </Link>
            )}
            <div className="border-t border-gray-200 pt-3 mt-2">
              {profile ? (
                <>
                  <Link
                    to="/account"
                    className="block py-2 text-gray-700 hover:text-red-700 font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Account ({profile.name})
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="block py-2 text-red-600 hover:text-red-800 font-medium w-full text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex gap-3">
                  <Link
                    to="/login"
                    className="flex-1 text-center py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 text-center py-2 bg-red-700 rounded text-white font-semibold hover:bg-red-800 transition-colors text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
