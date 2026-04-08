import { useEffect, useState } from "react";
import {
  CreditCard, Save, Loader2, CheckCircle2, XCircle, Eye, EyeOff,
  ChevronDown, ChevronUp, AlertTriangle, ToggleLeft, ToggleRight,
  Info, ExternalLink, Banknote,
} from "lucide-react";
import { apiUrl, authHeaders } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

interface GatewayCfg {
  enabledMethods: string[];
  stripe: { enabled: boolean; publishableKey: string; secretKeyMasked: string | null; hasSecretKey: boolean };
  paypal: { enabled: boolean; clientId: string; clientSecretMasked: string | null; hasClientSecret: boolean; sandbox: boolean };
  manual: { enabled: boolean; instructions: string };
  updatedAt?: string;
  updatedBy?: string;
}

interface StripeForm { enabled: boolean; publishableKey: string; secretKey: string; }
interface PayPalForm { enabled: boolean; clientId: string; clientSecret: string; sandbox: boolean; }
interface ManualForm { enabled: boolean; instructions: string; }

const STRIPE_DOCS = "https://dashboard.stripe.com/apikeys";
const PAYPAL_DOCS = "https://developer.paypal.com/dashboard/applications";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${checked ? "bg-green-500" : "bg-gray-200"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function MaskedInput({ value, onChange, placeholder, showToggleLabel = "Show" }: { value: string; onChange: (v: string) => void; placeholder?: string; showToggleLabel?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        title={show ? "Hide" : showToggleLabel}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function PaymentGatewaySettings() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remote, setRemote] = useState<GatewayCfg | null>(null);

  const [stripe, setStripe] = useState<StripeForm>({ enabled: false, publishableKey: "", secretKey: "" });
  const [paypal, setPayPal] = useState<PayPalForm>({ enabled: false, clientId: "", clientSecret: "", sandbox: true });
  const [manual, setManual] = useState<ManualForm>({ enabled: true, instructions: "Pay in-store at pickup, or we will send an invoice." });

  const [openSection, setOpenSection] = useState<"stripe" | "paypal" | "manual" | null>(null);

  const fetchConfig = async () => {
    if (!session) return;
    try {
      const res = await fetch(apiUrl("/manager/settings/payment"), { headers: authHeaders(session.access_token) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to load payment config");
      const cfg: GatewayCfg = await res.json();
      setRemote(cfg);
      setStripe({ enabled: cfg.stripe.enabled, publishableKey: cfg.stripe.publishableKey, secretKey: cfg.stripe.secretKeyMasked ?? "" });
      setPayPal({ enabled: cfg.paypal.enabled, clientId: cfg.paypal.clientId, clientSecret: cfg.paypal.clientSecretMasked ?? "", sandbox: cfg.paypal.sandbox });
      setManual({ enabled: cfg.manual.enabled, instructions: cfg.manual.instructions });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load payment config");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/manager/settings/payment"), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ stripe, paypal, manual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setRemote(data);
      // After save, re-mask keys
      setStripe((s) => ({ ...s, secretKey: data.stripe.secretKeyMasked ?? "" }));
      setPayPal((p) => ({ ...p, clientSecret: data.paypal.clientSecretMasked ?? "" }));
      toast.success("Payment settings saved.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save payment settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading payment settings…</span>
      </div>
    );
  }

  const enabledCount = [stripe.enabled, paypal.enabled, manual.enabled].filter(Boolean).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base">Payment Gateways</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {enabledCount === 0 ? "No payment methods enabled" : `${enabledCount} method${enabledCount !== 1 ? "s" : ""} enabled`}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#0f1e3c] hover:bg-[#1a2d52] text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Stripe */}
      <div className="border-b border-gray-100">
        <div
          className={`px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors select-none`}
          onClick={() => setOpenSection(openSection === "stripe" ? null : "stripe")}
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#6772E5"/><path d="M10.585 9.02c0-.502.413-.695.99-.695.886 0 2.005.27 2.89.748V7.11a7.68 7.68 0 00-2.89-.531c-2.362 0-3.934 1.235-3.934 3.296 0 3.216 4.432 2.7 4.432 4.086 0 .59-.513.775-1.134.775-1.044 0-2.363-.434-3.407-1.016v2.02a8.6 8.6 0 003.407.72c2.419 0 4.083-1.198 4.083-3.288C14.96 9.82 10.585 10.447 10.585 9.02z" fill="#fff"/></svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">Stripe</p>
              {stripe.enabled ? (
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">Enabled</span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">Disabled</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Credit & debit cards via Stripe</p>
          </div>
          <Toggle checked={stripe.enabled} onChange={(v) => { setStripe((s) => ({ ...s, enabled: v })); if (v && openSection !== "stripe") setOpenSection("stripe"); }} />
          {openSection === "stripe" ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>
        {openSection === "stripe" && (
          <div className="px-6 pb-5 space-y-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center gap-2 pt-4">
              <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                Get your API keys from the{" "}
                <a href={STRIPE_DOCS} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-0.5">
                  Stripe Dashboard <ExternalLink className="w-3 h-3" />
                </a>.
                Use test keys (<code className="text-xs bg-gray-100 px-1 rounded">pk_test_</code> / <code className="text-xs bg-gray-100 px-1 rounded">sk_test_</code>) while testing.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Publishable Key</label>
              <input
                type="text"
                value={stripe.publishableKey}
                onChange={(e) => setStripe((s) => ({ ...s, publishableKey: e.target.value }))}
                placeholder="pk_test_..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">Safe to expose publicly — used in the checkout form.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Secret Key</label>
              <MaskedInput
                value={stripe.secretKey}
                onChange={(v) => setStripe((s) => ({ ...s, secretKey: v }))}
                placeholder={remote?.stripe.hasSecretKey ? "sk_test_•••••••• (saved — paste new key to replace)" : "sk_test_..."}
                showToggleLabel="Show key"
              />
              <p className="text-xs text-gray-400 mt-1">Never shared with clients — used server-side only.</p>
            </div>
            {remote?.stripe.hasSecretKey && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Secret key is saved. Paste a new key above to replace it.
              </div>
            )}
          </div>
        )}
      </div>

      {/* PayPal */}
      <div className="border-b border-gray-100">
        <div
          className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
          onClick={() => setOpenSection(openSection === "paypal" ? null : "paypal")}
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 00-.607-.541c-.013.076-.026.175-.041.254-.59 3.024-2.635 6.567-8.781 6.567h-2.19a2.126 2.126 0 00-2.1 1.799l-1.128 7.15h3.13l.697-4.421.044-.277c.082-.518.527-.9 1.051-.9h.663c4.298 0 7.664-1.747 8.647-6.797.416-2.14.12-3.566-.985-4.834h.6z" fill="#003087"/><path d="M6.355 9.072c.08-.511.524-.893 1.047-.893h6.666c.79 0 1.529.052 2.2.161.192.03.378.067.558.109.36.085.696.196 1.006.333.29-1.863-.002-3.13-1.012-4.28C15.708.543 13.7 0 11.13 0H3.67C3.146 0 2.697.382 2.615.9L.006 20.537a.641.641 0 00.633.74H4.6l1.755-11.176v-.029z" fill="#0070E0"/></svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">PayPal</p>
              {paypal.enabled ? (
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">Enabled</span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">Disabled</span>
              )}
              {paypal.enabled && paypal.sandbox && (
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">Sandbox</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">PayPal Checkout & Pay Later</p>
          </div>
          <Toggle checked={paypal.enabled} onChange={(v) => { setPayPal((p) => ({ ...p, enabled: v })); if (v && openSection !== "paypal") setOpenSection("paypal"); }} />
          {openSection === "paypal" ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>
        {openSection === "paypal" && (
          <div className="px-6 pb-5 space-y-4 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center gap-2 pt-4">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                Get your credentials from the{" "}
                <a href={PAYPAL_DOCS} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5">
                  PayPal Developer Dashboard <ExternalLink className="w-3 h-3" />
                </a>.
                Enable Sandbox mode while testing.
              </p>
            </div>
            {/* Sandbox toggle */}
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-amber-800">Sandbox Mode</p>
                <p className="text-xs text-amber-600 mt-0.5">Use PayPal's sandbox environment for testing. Disable for live payments.</p>
              </div>
              <Toggle checked={paypal.sandbox} onChange={(v) => setPayPal((p) => ({ ...p, sandbox: v }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Client ID</label>
              <input
                type="text"
                value={paypal.clientId}
                onChange={(e) => setPayPal((p) => ({ ...p, clientId: e.target.value }))}
                placeholder="AYj..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
              <p className="text-xs text-gray-400 mt-1">Used in the checkout form to initialize PayPal buttons.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Client Secret</label>
              <MaskedInput
                value={paypal.clientSecret}
                onChange={(v) => setPayPal((p) => ({ ...p, clientSecret: v }))}
                placeholder={remote?.paypal.hasClientSecret ? "•••••••• (saved — paste new secret to replace)" : "EH..."}
                showToggleLabel="Show secret"
              />
              <p className="text-xs text-gray-400 mt-1">Never shared with clients — used server-side to capture payments.</p>
            </div>
            {remote?.paypal.hasClientSecret && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Client secret is saved. Paste a new secret above to replace it.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manual */}
      <div>
        <div
          className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors select-none"
          onClick={() => setOpenSection(openSection === "manual" ? null : "manual")}
        >
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Banknote className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 text-sm">Manual / Pay at Pickup</p>
              {manual.enabled ? (
                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full border border-green-200">Enabled</span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">Disabled</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Cash, invoice, or pay in-store — no online payment required</p>
          </div>
          <Toggle checked={manual.enabled} onChange={(v) => setManual((m) => ({ ...m, enabled: v }))} />
          {openSection === "manual" ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>
        {openSection === "manual" && (
          <div className="px-6 pb-5 space-y-4 bg-gray-50/50 border-t border-gray-100 pt-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Customer Instructions</label>
              <textarea
                value={manual.instructions}
                onChange={(e) => setManual((m) => ({ ...m, instructions: e.target.value }))}
                rows={3}
                placeholder="e.g., Pay in-store at pickup. We accept cash, card, or invoice."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Shown to customers at checkout when they select this payment method.</p>
            </div>
          </div>
        )}
      </div>

      {/* No methods warning */}
      {enabledCount === 0 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 bg-amber-50 text-amber-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs font-semibold">
            No payment methods are enabled. Customers will not be able to check out. Enable at least one method above.
          </p>
        </div>
      )}

      {/* Last saved */}
      {remote?.updatedAt && (
        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
          Last saved {new Date(remote.updatedAt).toLocaleString()} by {remote.updatedBy}
        </div>
      )}
    </div>
  );
}
