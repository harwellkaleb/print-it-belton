import { Link, useNavigate } from "react-router";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";

const categoryLabels: Record<string, string> = {
  "t-shirts": "T-Shirts & Apparel",
  "vehicle-graphics": "Vehicle Graphics",
  "signs-banners": "Signs & Banners",
  "wall-wraps": "Wall Wraps",
};

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-300" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">
            Browse our products and add something to get started.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold px-8 py-3 rounded transition-colors"
          >
            <ShoppingCart className="w-5 h-5" /> Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-900">
            Your Cart{" "}
            <span className="text-gray-400 font-normal text-xl">
              ({itemCount} item{itemCount !== 1 ? "s" : ""})
            </span>
          </h1>
          <button
            onClick={clearCart}
            className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            Clear cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
              >
                <div className="flex gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-red-700 font-semibold uppercase tracking-wide">
                          {categoryLabels[item.category] || item.category}
                        </span>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {item.size && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                              {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium">
                              {item.color}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-2 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-black text-gray-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-black text-gray-900 text-lg mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-600 truncate flex-1 mr-2">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="text-gray-900 font-medium flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">Subtotal</span>
                  <span className="text-2xl font-black text-gray-900">
                    ${total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Final pricing confirmed after order review
                </p>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold py-4 rounded transition-all"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/shop"
                className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}