import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Star,
  Clock,
  ChevronRight,
  Anchor,
  Phone,
} from "lucide-react";
import { apiUrl, authHeaders } from "../utils/api";
import { publicAnonKey } from "/utils/supabase/info";
import { useCart } from "../context/CartContext";

const HERO_IMG =
  "https://images.unsplash.com/photo-1773525912476-213bff96b8a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1600";

const categories = [
  {
    label: "T-Shirt Printing",
    slug: "t-shirts",
    image:
      "https://images.unsplash.com/photo-1589902860314-e910697dea18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    label: "Vehicle Graphics",
    slug: "vehicle-graphics",
    image:
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    label: "Signs & Banners",
    slug: "signs-banners",
    image:
      "https://images.unsplash.com/photo-1664079555378-54fc572639b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    label: "Wall Wraps",
    slug: "wall-wraps",
    image:
      "https://images.unsplash.com/photo-1773499129567-ebf8268defd0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

const features = [
  {
    icon: Zap,
    title: "Fast Turnaround",
    desc: "Most orders ready in 3–5 business days. Rush options available.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Guaranteed",
    desc: "Premium materials and industry-leading printing technology.",
  },
  {
    icon: Star,
    title: "Custom Designs",
    desc: "Our design team helps bring your vision to life.",
  },
  {
    icon: Clock,
    title: "Order Tracking",
    desc: "Real-time updates so you always know where your order stands.",
  },
];

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  description: string;
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const navigate = useNavigate();
  const { addItem } = useCart();

  useEffect(() => {
    const loadProducts = async () => {
      try {
        await fetch(apiUrl("/seed"), {
          method: "POST",
          headers: authHeaders(publicAnonKey),
        });
        const res = await fetch(apiUrl("/products"), {
          headers: authHeaders(publicAnonKey),
        });
        if (res.ok) {
          const data = await res.json();
          setFeaturedProducts(data.slice(0, 4));
        }
      } catch (e) {
        console.error("Failed to load featured products:", e);
      }
    };
    loadProducts();
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section
        className="relative min-h-[72vh] flex items-center justify-center"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Navy overlay matching original */}
        <div className="absolute inset-0 bg-[#2B3272]/85" />

        <div className="relative z-10 text-center px-4 py-20 max-w-2xl mx-auto">
          {/* Circular logo badge */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-2 border-white/70 bg-[#2B3272]/60 mb-6">
            <Anchor className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
            Locally Owned Sign and
            <br />
            Screen Printing
          </h1>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 border border-white/60 text-white hover:bg-white hover:text-[#2B3272] font-semibold px-8 py-3 rounded transition-all tracking-wide text-sm uppercase"
            >
              Shop Now
            </Link>
            <a
              href="tel:+12549333134"
              className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-8 py-3 rounded transition-all text-sm uppercase tracking-wide"
            >
              <Phone className="w-4 h-4" />
              Call Us Today
            </a>
          </div>
        </div>
      </section>

      {/* About blurb */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-gray-600 text-base leading-relaxed">
            Print-It is proud to offer a diversified selection of promotional
            products, customized logo imprinting, corporate gifts, embroidered
            materials and trade show giveaways.{" "}
            <a
              href="tel:+12549333134"
              className="text-[#2B3272] hover:text-red-700 font-medium transition-colors"
            >
              Call us today!
            </a>
          </p>
        </div>
      </section>

      {/* Categories — matching original layout */}
      <section className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                to={`/shop?category=${cat.slug}`}
                className="group text-center"
              >
                {/* Image box */}
                <div className="aspect-square overflow-hidden rounded border border-gray-200 bg-white shadow-sm group-hover:shadow-md transition-shadow mb-3">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <span className="text-red-700 font-semibold text-sm group-hover:text-red-900 transition-colors">
                  {cat.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 bg-[#2B3272] hover:bg-red-700 text-white font-semibold px-8 py-3 rounded transition-colors text-sm tracking-wide"
            >
              Browse All Products <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#2B3272] mb-1">
                  Popular Products
                </h2>
                <p className="text-gray-500 text-sm">Our most ordered items</p>
              </div>
              <Link
                to="/shop"
                className="hidden sm:flex items-center gap-1.5 text-red-700 hover:text-red-900 font-semibold text-sm transition-colors"
              >
                View All <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded border border-gray-200 overflow-hidden group hover:shadow-md transition-all"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Link
                      to={`/product/${product.id}`}
                      className="absolute bottom-3 left-3 right-3 bg-white text-[#2B3272] text-center py-1.5 rounded font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#2B3272] hover:text-white"
                    >
                      View Details
                    </Link>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-red-700 font-semibold uppercase tracking-wider">
                      {product.category.replace(/-/g, " ")}
                    </span>
                    <h3 className="text-gray-900 font-bold mt-1 mb-2 leading-tight text-sm">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-[#2B3272]">
                        ${product.price.toFixed(2)}
                      </span>
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded font-semibold transition-colors"
                      >
                        Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2B3272] mb-3">
              Why Choose Print It Belton?
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              We're more than a print shop — we're your local brand partner.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((f) => (
              <div key={f.title} className="text-center group">
                <div className="w-14 h-14 bg-[#2B3272] rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-red-700 transition-colors">
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">
                  {f.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-14 bg-red-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to print something amazing?
          </h2>
          <p className="text-red-100 text-base mb-8 max-w-xl mx-auto">
            Create an account and start your order online in minutes. Our team
            reviews every order personally.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/shop"
              className="bg-white text-red-700 font-bold px-8 py-3 rounded hover:bg-gray-100 transition-colors"
            >
              Start Your Order
            </Link>
            <Link
              to="/signup"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded hover:bg-red-800 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
