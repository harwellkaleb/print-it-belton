import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { apiUrl, authHeaders } from "../utils/api";
import { publicAnonKey } from "/utils/supabase/info";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  description: string;
  available: boolean;
}

const categoryMeta: Record<string, { label: string; desc: string }> = {
  "t-shirts": {
    label: "T-Shirts & Apparel",
    desc: "Custom t-shirts, jerseys, polos, and more",
  },
  "vehicle-graphics": {
    label: "Vehicle Graphics",
    desc: "Full wraps, decals, fleet branding, and vinyl graphics",
  },
  "signs-banners": {
    label: "Signs & Banners",
    desc: "Vinyl banners, yard signs, storefront signs, and more",
  },
  "wall-wraps": {
    label: "Wall Wraps",
    desc: "Office murals, retail displays, and wall graphics",
  },
};

const ALL_CATEGORIES = ["t-shirts", "vehicle-graphics", "signs-banners", "wall-wraps"];

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const activeCategory = searchParams.get("category") || "";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure seeded
      await fetch(apiUrl("/seed"), {
        method: "POST",
        headers: authHeaders(publicAnonKey),
      });
      const url = activeCategory
        ? apiUrl(`/products/category/${activeCategory}`)
        : apiUrl("/products");
      const res = await fetch(url, { headers: authHeaders(publicAnonKey) });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setCategory = (cat: string) => {
    if (cat) {
      setSearchParams({ category: cat });
    } else {
      setSearchParams({});
    }
  };

  const filtered = products.filter((p) =>
    searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const currentMeta = activeCategory ? categoryMeta[activeCategory] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2B3272] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            {currentMeta ? currentMeta.label : "All Products"}
          </h1>
          <p className="text-blue-200 text-sm">
            {currentMeta
              ? currentMeta.desc
              : "Browse our full catalog of graphic printing services"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <SlidersHorizontal className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setCategory("")}
              className={`whitespace-nowrap px-4 py-2 rounded text-sm font-semibold transition-all flex-shrink-0 ${
                !activeCategory
                  ? "bg-red-700 text-white shadow-sm"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded text-sm font-semibold transition-all flex-shrink-0 ${
                  activeCategory === cat
                    ? "bg-red-700 text-white shadow-sm"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {categoryMeta[cat].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded overflow-hidden animate-pulse border border-gray-100">
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">No products found</p>
            <p className="text-gray-300 text-sm">Try adjusting your search or filter</p>
            <button
              onClick={() => { setCategory(""); setSearchQuery(""); }}
              className="mt-4 text-red-700 hover:text-red-900 font-semibold text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}{" "}
              {activeCategory ? `in ${categoryMeta[activeCategory]?.label}` : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="group bg-white rounded overflow-hidden hover:-translate-y-0.5 transition-all hover:shadow-md border border-gray-100"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {!product.available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="bg-red-700 text-white text-xs font-bold px-3 py-1 rounded">
                          Unavailable
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-red-700 font-semibold uppercase tracking-wider">
                      {categoryMeta[product.category]?.label || product.category}
                    </span>
                    <h3 className="text-gray-900 font-bold mt-1 mb-2 leading-tight group-hover:text-[#2B3272] transition-colors text-sm">
                      {product.name}
                    </h3>
                    <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-[#2B3272]">
                        ${product.price.toFixed(2)}
                      </span>
                      <span className="text-xs bg-red-700 text-white px-3 py-1.5 rounded font-semibold group-hover:bg-red-800 transition-colors">
                        Order
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}