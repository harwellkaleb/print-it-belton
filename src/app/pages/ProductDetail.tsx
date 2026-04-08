import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ShoppingCart,
  ArrowLeft,
  Check,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import { apiUrl, authHeaders } from "../utils/api";
import { publicAnonKey } from "/utils/supabase/info";
import { useCart } from "../context/CartContext";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  description: string;
  available: boolean;
}

const categoryMeta: Record<string, { label: string; sizes?: string[]; colors?: string[] }> = {
  "t-shirts": {
    label: "T-Shirts & Apparel",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    colors: ["White", "Black", "Navy", "Gray", "Red", "Royal Blue", "Forest Green"],
  },
  "vehicle-graphics": {
    label: "Vehicle Graphics",
    sizes: ["Small (Car)", "Medium (SUV/Van)", "Large (Truck)", "Custom"],
  },
  "signs-banners": {
    label: "Signs & Banners",
    sizes: ['2\'x4\'', '3\'x6\'', '4\'x8\'', '5\'x10\'', "Custom Size"],
  },
  "wall-wraps": {
    label: "Wall Wraps",
    sizes: ["Per Linear Foot (quote)", "Full Wall", "Partial Section", "Custom"],
  },
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/products/${id}`), {
          headers: authHeaders(publicAnonKey),
        });
        if (res.ok) {
          setProduct(await res.json());
        } else {
          navigate("/shop");
        }
      } catch (e) {
        console.error("Failed to load product:", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id, navigate]);

  const meta = product ? categoryMeta[product.category] : null;

  const handleAddToCart = () => {
    if (!product) return;
    if (meta?.sizes && meta.sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      notes: notes || undefined,
    });
    setAdded(true);
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Image */}
          <div className="space-y-3">
            <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <span className="inline-block text-xs text-orange-500 font-bold uppercase tracking-widest mb-2">
                {meta?.label || product.category}
              </span>
              <h1 className="text-3xl font-black text-gray-900 mb-3">
                {product.name}
              </h1>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>

            <div className="text-4xl font-black text-gray-900">
              ${product.price.toFixed(2)}
              <span className="text-base font-normal text-gray-400 ml-1">
                / unit
              </span>
            </div>

            {/* Availability */}
            {!product.available && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                <Info className="w-4 h-4 flex-shrink-0" />
                This product is currently unavailable. Contact us for details.
              </div>
            )}

            {/* Size Selection */}
            {meta?.sizes && meta.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {product.category === "t-shirts" ? "Size" : "Dimensions / Type"}
                  {meta.sizes.length > 0 && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {meta.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selectedSize === size
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {meta?.colors && meta.colors.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Garment Color (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {meta.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setSelectedColor(selectedColor === color ? "" : color)
                      }
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                        selectedColor === color
                          ? "border-orange-500 bg-orange-50 text-orange-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-bold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-2.5 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  Subtotal:{" "}
                  <strong className="text-gray-900">
                    ${(product.price * quantity).toFixed(2)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Special Instructions / Design Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Describe your design, upload requirements, colors, text, etc..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none"
              />
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.available || added}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all ${
                  !product.available
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : added
                    ? "bg-green-500 text-white"
                    : "bg-orange-500 hover:bg-orange-600 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/30"
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-5 h-5" /> Added to Cart!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" /> Add to Cart
                  </>
                )}
              </button>
              <Link
                to="/cart"
                className="border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 px-5 py-4 rounded-xl font-semibold transition-all"
              >
                View Cart
              </Link>
            </div>

            {/* Info blurb */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
              <strong>📋 How it works:</strong> After placing your order online,
              our team will review your request and reach out to confirm design
              details before production begins.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
