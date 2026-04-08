import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router";
import {
  ArrowLeft, Lock, CheckCircle2, CreditCard, Banknote,
  Loader2, AlertTriangle, ChevronRight, Package,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements, PaymentElement, useStripe, useElements,
} from "@stripe/react-stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { apiUrl, authHeaders } from "../utils/api";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentConfig {
  enabledMethods: string[];
  stripe: { publishableKey: string } | null;
  paypal: { clientId: string; sandbox: boolean } | null;
  manual: { instructions: string } | null;
}

interface ShippingForm {
  name: string; email: string; phone: string;
  address: string; city: string; state: string; zip: string;
  notes: string; pickupOrDelivery: "pickup" | "delivery";
}

const categoryLabels: Record<string, string> = {
  "t-shirts": "T-Shirts", "vehicle-graphics": "Vehicle Graphics",
  "signs-banners": "Signs & Banners", "wall-wraps": "Wall Wraps",
};

// ─── Stripe inner form (must live inside <Elements>) ─────────────────────────
function StripePaymentForm({
  total, onSuccess, disabled,
}: { total: number; onSuccess: (intentId: string) => void; disabled: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (err) {
      setError(err.message ?? "Payment failed");
      setPaying(false);
    } else if (paymentIntent?.status === "succeeded") {
      onSuccess(paymentIntent.id);
    } else {
      setError("Payment incomplete. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <button
        onClick={handlePay}
        disabled={!stripe || !elements || paying || disabled}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-[#0f1e3c] hover:bg-[#1a2d52] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg text-base"
      >
        {paying ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
        ) : (
          <><Lock className="w-4 h-4" /> Pay ${total.toFixed(2)}</>
        )}
      </button>
      <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3" /> Secured by Stripe · Card data never touches our servers
      </p>
    </div>
  );
}

// ─── Main Checkout component ──────────────────────────────────────────────────
export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { session, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"details" | "payment">("details");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Details form
  const [form, setForm] = useState<ShippingForm>({
    name: profile?.name || "", email: profile?.email || "", phone: profile?.phone || "",
    address: "", city: "", state: "TX", zip: "", notes: "", pickupOrDelivery: "pickup",
  });
  const set = (field: keyof ShippingForm, value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Payment
  const [payConfig, setPayConfig] = useState<PaymentConfig | null>(null);
  const [payConfigLoading, setPayConfigLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [intentLoading, setIntentLoading] = useState(false);

  // Load payment config when entering payment step
  useEffect(() => {
    if (step !== "payment" || payConfig) return;
    setPayConfigLoading(true);
    fetch(apiUrl("/payment/config"), { headers: authHeaders() })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed to load payment config");
        return data as PaymentConfig;
      })
      .then((cfg) => {
        setPayConfig(cfg);
        // Pick the first enabled method as default
        const first = cfg.enabledMethods?.[0] ?? "manual";
        setSelectedMethod(first);
      })
      .catch(() => toast.error("Failed to load payment options. Please refresh."))
      .finally(() => setPayConfigLoading(false));
  }, [step]);

  // Load Stripe when Stripe method is selected
  useEffect(() => {
    if (selectedMethod !== "stripe" || !payConfig?.stripe?.publishableKey) return;
    if (stripePromise) return;
    setStripePromise(loadStripe(payConfig.stripe.publishableKey));
  }, [selectedMethod, payConfig]);

  // Create PaymentIntent when Stripe is selected and loaded
  useEffect(() => {
    if (selectedMethod !== "stripe" || !stripePromise || clientSecret || !session || intentLoading) return;
    if (total <= 0) return;
    setIntentLoading(true);
    fetch(apiUrl("/payment/stripe/create-intent"), {
      method: "POST",
      headers: authHeaders(session.access_token),
      body: JSON.stringify({ amount: total }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.clientSecret) setClientSecret(d.clientSecret);
        else toast.error(d.error ?? "Failed to create payment session");
      })
      .catch(() => toast.error("Failed to initialize Stripe"))
      .finally(() => setIntentLoading(false));
  }, [selectedMethod, stripePromise, session]);

  // Re-create PaymentIntent if method switches back to Stripe and total changed
  const resetStripe = () => {
    setClientSecret("");
    setStripePromise(null);
  };

  const handleMethodChange = (method: string) => {
    if (method !== selectedMethod) {
      if (method !== "stripe") resetStripe();
      setSelectedMethod(method);
    }
  };

  // Create the order in the DB
  const createOrder = useCallback(async (paymentMethod: string, paymentId: string | null, paymentStatus: string) => {
    if (!session) return;
    const shippingAddress = form.pickupOrDelivery === "pickup"
      ? "In-Store Pickup — Belton, TX"
      : `${form.address}, ${form.city}, ${form.state} ${form.zip}`;

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/orders"), {
        method: "POST",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId, name: i.name, category: i.category,
            quantity: i.quantity, price: i.price, size: i.size, color: i.color, notes: i.notes,
          })),
          total,
          shippingAddress,
          notes: form.notes,
          paymentMethod,
          paymentId,
          paymentStatus,
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error ?? "Failed to place order");
      setOrderId(order.id);
      clearCart();
      setSuccess(true);
    } catch (e: any) {
      console.error("Create order error:", e);
      toast.error(e.message ?? "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [session, form, items, total]);

  // ── Stripe success callback ────────────────────────────────────────────────
  const handleStripeSuccess = async (intentId: string) => {
    await createOrder("stripe", intentId, "paid");
  };

  // ── PayPal ─────────────────────────────────────────────────────────────────
  const handlePayPalCreateOrder = async () => {
    if (!session) throw new Error("Not logged in");
    const res = await fetch(apiUrl("/payment/paypal/create-order"), {
      method: "POST",
      headers: authHeaders(session.access_token),
      body: JSON.stringify({ amount: total }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? "PayPal error");
    return d.id as string;
  };

  const handlePayPalApprove = async (data: { orderID: string }) => {
    if (!session) return;
    const res = await fetch(apiUrl(`/payment/paypal/capture/${data.orderID}`), {
      method: "POST",
      headers: authHeaders(session.access_token),
    });
    const capture = await res.json();
    if (!res.ok) {
      toast.error(capture.error ?? "PayPal capture failed");
      return;
    }
    await createOrder("paypal", capture.captureId, "paid");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-3">Sign In to Checkout</h2>
          <p className="text-gray-500 mb-6">You need an account to place an order and track your history.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login" className="bg-red-700 hover:bg-red-800 text-white font-bold px-6 py-3 rounded-xl">Log In</Link>
            <Link to="/signup" className="border-2 border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50">Create Account</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-2">
            Your order is confirmed. Check your email for a confirmation and tracking link.
          </p>
          <p className="text-xs text-gray-400 mb-8 font-mono bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
            Order #{orderId.slice(0, 8).toUpperCase()}
          </p>
          <div className="flex gap-3 justify-center">
            <Link to={`/track/${orderId}`} className="bg-[#0f1e3c] hover:bg-[#1a2d52] text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
              <Package className="w-4 h-4" /> Track Order
            </Link>
            <Link to="/shop" className="border-2 border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50">
              Keep Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const shippingAddress = form.pickupOrDelivery === "pickup"
    ? "In-Store Pickup — Belton, TX"
    : `${form.address}, ${form.city}, ${form.state} ${form.zip}`;

  // ── STEP INDICATOR ─────────────────────────────────────────────────────────
  const steps = [{ key: "details", label: "Details" }, { key: "payment", label: "Payment" }];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={() => step === "payment" ? setStep("details") : navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          {step === "payment" ? "Back to Details" : "Back to Cart"}
        </button>

        {/* Stepper */}
        <div className="flex items-center gap-3 mb-8">
          {steps.map((s, i) => {
            const isDone = step === "payment" && s.key === "details";
            const isActive = s.key === step;
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isDone ? "bg-green-500 text-white" : isActive ? "bg-[#0f1e3c] text-white" : "bg-gray-200 text-gray-500"}`}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-sm font-bold ${isActive ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                </div>
                {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="lg:col-span-2">

            {/* ── STEP 1: Details ────────────────────────────────────────── */}
            {step === "details" && (
              <form onSubmit={(e) => { e.preventDefault(); setStep("payment"); }} className="space-y-5">
                {/* Contact */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-lg mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                      <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                      <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                      <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-lg mb-4">Delivery Method</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {(["pickup", "delivery"] as const).map((opt) => (
                      <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.pickupOrDelivery === opt ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                        <input type="radio" name="delivery" value={opt} checked={form.pickupOrDelivery === opt}
                          onChange={() => setForm((f) => ({ ...f, pickupOrDelivery: opt }))} className="accent-red-600" />
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{opt === "pickup" ? "In-Store Pickup" : "Delivery"}</div>
                          <div className="text-xs text-gray-500">{opt === "pickup" ? "Free · Belton, TX" : "We'll contact you for details"}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {form.pickupOrDelivery === "delivery" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Street Address *</label>
                        <input required type="text" value={form.address} onChange={(e) => set("address", e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
                        <input required type="text" value={form.city} onChange={(e) => set("city", e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">State</label>
                          <input type="text" value={form.state} onChange={(e) => set("state", e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1.5">ZIP</label>
                          <input type="text" value={form.zip} onChange={(e) => set("zip", e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-lg mb-4">Additional Notes</h2>
                  <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
                    placeholder="Any additional instructions or details for your order…"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
                </div>

                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-[#0f1e3c] hover:bg-[#1a2d52] transition-all shadow-lg text-base">
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* ── STEP 2: Payment ────────────────────────────────────────── */}
            {step === "payment" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-bold text-gray-900 text-lg mb-5">Payment Method</h2>

                  {payConfigLoading ? (
                    <div className="flex items-center gap-3 text-gray-400 py-8 justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Loading payment options…</span>
                    </div>
                  ) : !payConfig || !payConfig.enabledMethods?.length ? (
                    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-semibold">
                        No payment methods are configured. Please contact the store to complete your order.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Method selector tabs */}
                      {(payConfig.enabledMethods?.length ?? 0) > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {payConfig.enabledMethods.map((m) => {
                            const labels: Record<string, string> = { stripe: "Credit / Debit Card", paypal: "PayPal", manual: "Pay at Pickup" };
                            const icons: Record<string, React.ReactNode> = {
                              stripe: <CreditCard className="w-4 h-4" />,
                              paypal: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/></svg>,
                              manual: <Banknote className="w-4 h-4" />,
                            };
                            const active = selectedMethod === m;
                            return (
                              <button key={m} onClick={() => handleMethodChange(m)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active ? "border-[#0f1e3c] bg-[#0f1e3c] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"}`}>
                                {icons[m]} {labels[m] ?? m}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Stripe card form */}
                      {selectedMethod === "stripe" && (
                        <div className="space-y-4 pt-2">
                          {intentLoading || !clientSecret ? (
                            <div className="flex items-center gap-3 text-gray-400 py-6 justify-center">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="text-sm">Setting up secure payment…</span>
                            </div>
                          ) : stripePromise && clientSecret ? (
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#0f1e3c", borderRadius: "12px" } } }}>
                              <StripePaymentForm total={total} onSuccess={handleStripeSuccess} disabled={submitting} />
                            </Elements>
                          ) : null}
                        </div>
                      )}

                      {/* PayPal */}
                      {selectedMethod === "paypal" && payConfig.paypal && (
                        <div className="pt-2">
                          <PayPalScriptProvider options={{ clientId: payConfig.paypal.clientId, currency: "USD", ...(payConfig.paypal.sandbox ? {} : {}) }}>
                            <PayPalButtons
                              style={{ layout: "vertical", shape: "rect", color: "blue", label: "pay" }}
                              createOrder={handlePayPalCreateOrder}
                              onApprove={handlePayPalApprove}
                              onError={(err) => { console.error("PayPal error:", err); toast.error("PayPal payment failed. Please try again."); }}
                            />
                          </PayPalScriptProvider>
                          {submitting && (
                            <div className="flex items-center justify-center gap-2 text-gray-500 mt-3">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Creating your order…</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Manual */}
                      {selectedMethod === "manual" && payConfig.manual && (
                        <div className="space-y-4 pt-2">
                          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <Banknote className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-amber-800 mb-1">Payment at Pickup / Invoice</p>
                              <p className="text-sm text-amber-700">{payConfig.manual.instructions}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => createOrder("manual", null, "unpaid")}
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-[#0f1e3c] hover:bg-[#1a2d52] transition-all shadow-lg text-base disabled:opacity-60"
                          >
                            {submitting ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Placing Order…</>
                            ) : (
                              <><CheckCircle2 className="w-4 h-4" /> Place Order (Pay Later)</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 className="font-black text-gray-900 text-lg mb-4">Your Order</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}{item.size ? ` · ${item.size}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {step === "payment" && (
                <div className="border-t border-gray-100 pt-3 mb-3 text-xs text-gray-500 space-y-1">
                  <div className="flex gap-2">
                    <span className="font-semibold text-gray-700 w-16 flex-shrink-0">Ship to:</span>
                    <span>{shippingAddress}</span>
                  </div>
                  {form.notes && (
                    <div className="flex gap-2">
                      <span className="font-semibold text-gray-700 w-16 flex-shrink-0">Notes:</span>
                      <span className="italic">{form.notes}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-black text-gray-900">${total.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Final pricing confirmed after design review</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}