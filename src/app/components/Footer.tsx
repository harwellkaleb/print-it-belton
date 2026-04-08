import { Link } from "react-router";
import { Anchor, Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#1a1f3c] text-gray-400 border-t border-[#2B3272]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                <Anchor className="w-5 h-5 text-[#2B3272]" />
              </div>
              <span className="font-black text-base tracking-tight text-white">
                PRINT IT BELTON
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Locally owned sign and screen printing. Quality prints, fast
              turnaround, and unbeatable service in Belton, TX.
            </p>
            <div className="flex gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 bg-[#2B3272] rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 text-white" />
              </a>
              <a
                href="mailto:PrintItG@gmail.com"
                className="w-8 h-8 bg-[#2B3272] rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                aria-label="Email"
              >
                <Mail className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Services
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "T-Shirts & Apparel", slug: "t-shirts" },
                { label: "Vehicle Graphics", slug: "vehicle-graphics" },
                { label: "Signs & Banners", slug: "signs-banners" },
                { label: "Wall Wraps", slug: "wall-wraps" },
              ].map((item) => (
                <li key={item.slug}>
                  <Link
                    to={`/shop?category=${item.slug}`}
                    className="hover:text-red-400 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Account
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  to="/login"
                  className="hover:text-red-400 transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="hover:text-red-400 transition-colors"
                >
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  to="/account"
                  className="hover:text-red-400 transition-colors"
                >
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className="hover:text-red-400 transition-colors"
                >
                  My Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>Belton, TX</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 flex-shrink-0" />
                <a
                  href="tel:+12549333134"
                  className="hover:text-red-400 transition-colors"
                >
                  (254) 933-3134
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-500 flex-shrink-0" />
                <a
                  href="mailto:PrintItG@gmail.com"
                  className="hover:text-red-400 transition-colors"
                >
                  PrintItG@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#2B3272] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <p>© {new Date().getFullYear()} Print It Belton. All rights reserved.</p>
          <p className="text-gray-600">Belton, Texas</p>
        </div>
      </div>
    </footer>
  );
}
