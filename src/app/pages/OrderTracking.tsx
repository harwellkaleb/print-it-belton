import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  MapPin,
  StickyNote,
  ArrowLeft,
  Loader2,
  Printer,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { apiUrl } from "../utils/api";

interface TrackedOrder {
  id: string;
  status: string;
  items: {
    name: string;
    category: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
  }[];
  total: number;
  shippingAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmailPreview: string;
}

const STEPS = [
  { key: "pending",       label: "Order Placed",    icon: Clock },
  { key: "confirmed",     label: "Confirmed",       icon: CheckCircle2 },
  { key: "in-production", label: "In Production",   icon: Printer },
  { key: "ready",         label: "Ready",           icon: Package },
  { key: "completed",     label: "Completed",       icon: CheckCircle2 },
];

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  pending:       { label: "Pending Review",   badge: "bg-amber-100 text-amber-800 border-amber-200",    icon: Clock },
  confirmed:     { label: "Confirmed",        badge: "bg-blue-100 text-blue-800 border-blue-200",       icon: CheckCircle2 },
  "in-production": { label: "In Production", badge: "bg-violet-100 text-violet-800 border-violet-200", icon: AlertCircle },
  ready:         { label: "Ready for Pickup", badge: "bg-green-100 text-green-800 border-green-200",    icon: Package },
  completed:     { label: "Completed",        badge: "bg-gray-100 text-gray-700 border-gray-200",       icon: CheckCircle2 },
  cancelled:     { label: "Cancelled",        badge: "bg-red-100 text-red-800 border-red-200",          icon: XCircle },
};

const CATEGORY_LABELS: Record<string, string> = {
  "t-shirts": "T-Shirts",
  "vehicle-graphics": "Vehicle Graphics",
  "signs-banners": "Signs & Banners",
  "wall-wraps": "Wall Wraps",
};

function getStepIndex(status: string) {
  return STEPS.findIndex((s) => s.key === status);
}

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("No order ID provided."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl(`/track/${id}`));
        if (res.status === 404) { setError("Order not found. Please check the link in your confirmation email."); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load order");
        setOrder(data);
      } catch (e: any) {
        setError(e.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-[#0f1e3c] shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-red-600 rounded-lg p-1.5 shadow">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <span className="block font-black text-sm text-white tracking-tight">PRINT IT</span>
              <span className="block text-[10px] text-red-400 font-bold tracking-[0.2em] -mt-0.5">BELTON</span>
            </div>
          </Link>
          <Link
            to="/account"
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-semibold transition-colors"
          >
            My Account <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
        {/* Back */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Store
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">Order Tracking</h1>
          {order && (
            <p className="text-gray-500 text-sm mt-0.5">
              Order{" "}
              <span className="font-mono font-bold text-gray-700">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>{" "}
              · Placed{" "}
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Loading your order…</p>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">{error}</p>
            <Link
              to="/account"
              className="inline-flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#1a2d52] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              View My Orders
            </Link>
          </div>
        )}

        {/* ── Order ── */}
        {!loading && order && (() => {
          const sc = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
          const StatusIcon = sc.icon;
          const isCancelled = order.status === "cancelled";
          const currentStep = getStepIndex(order.status);

          return (
            <div className="space-y-5">
              {/* Status card */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-[#0f1e3c] px-6 py-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">
                      Current Status
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${sc.badge}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {sc.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Total</p>
                    <p className="text-2xl font-black text-white">${order.total.toFixed(2)}</p>
                  </div>
                </div>

                {/* Progress stepper */}
                {!isCancelled && (
                  <div className="px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-0">
                      {STEPS.map((step, idx) => {
                        const isCompleted = currentStep > idx;
                        const isActive = currentStep === idx;
                        const StepIcon = step.icon;
                        const isLast = idx === STEPS.length - 1;
                        return (
                          <div key={step.key} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                  isCompleted
                                    ? "bg-red-600 text-white"
                                    : isActive
                                    ? "bg-[#0f1e3c] text-white ring-2 ring-offset-2 ring-[#0f1e3c]"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                              >
                                <StepIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className={`text-[10px] font-bold text-center leading-tight hidden sm:block ${
                                isActive ? "text-[#0f1e3c]" : isCompleted ? "text-red-600" : "text-gray-400"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            {!isLast && (
                              <div
                                className={`h-0.5 flex-1 mx-1 transition-all ${
                                  currentStep > idx ? "bg-red-600" : "bg-gray-200"
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Mobile current step label */}
                    <p className="sm:hidden mt-3 text-center text-xs font-bold text-[#0f1e3c]">
                      {STEPS[currentStep]?.label}
                    </p>
                  </div>
                )}

                {isCancelled && (
                  <div className="px-6 py-4 border-b border-gray-100 bg-red-50 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">
                      This order has been cancelled. Please contact us if you have questions.
                    </p>
                  </div>
                )}

                {/* Metadata row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y sm:divide-y-0 divide-gray-100 text-sm">
                  <div className="px-5 py-4">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Order ID</p>
                    <p className="font-mono font-black text-gray-800">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Placed</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="px-5 py-4 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Last Updated</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(order.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900">
                    Items Ordered
                    <span className="ml-2 text-xs font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {order.items?.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  </h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {CATEGORY_LABELS[item.category] ?? item.category}
                          {item.size && ` · ${item.size}`}
                          {item.color && ` · ${item.color}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-gray-900 text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">×{item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                  <span className="text-sm font-bold text-gray-600">Order Total</span>
                  <span className="text-xl font-black text-[#0f1e3c]">${order.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Details */}
              {(order.shippingAddress || order.notes) && (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                  {order.shippingAddress && (
                    <div className="flex items-start gap-3 px-6 py-4">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Delivery / Pickup</p>
                        <p className="text-sm text-gray-700 font-medium">{order.shippingAddress}</p>
                      </div>
                    </div>
                  )}
                  {order.notes && (
                    <div className="flex items-start gap-3 px-6 py-4">
                      <StickyNote className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-sm text-gray-700 italic">"{order.notes}"</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  to="/account"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#0f1e3c] hover:bg-[#1a2d52] text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  View All My Orders
                </Link>
                <Link
                  to="/shop"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-bold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>

              {/* Reassurance */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-700">
                <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <p>
                  <span className="font-bold">Have questions?</span> Reply to your order confirmation
                  email or{" "}
                  <Link to="/" className="underline font-semibold">
                    contact us
                  </Link>{" "}
                  — our team is happy to help.
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
