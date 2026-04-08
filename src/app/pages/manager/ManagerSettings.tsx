import { useEffect, useState } from "react";
import {
  Mail,
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  SendHorizonal,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Info,
  ExternalLink,
  Settings,
  Lock,
  Zap,
} from "lucide-react";
import { apiUrl, authHeaders } from "../../utils/api";
import { useAuth, supabase } from "../../context/AuthContext";
import PaymentGatewaySettings from "../../components/PaymentGatewaySettings";

interface EmailProviderConfig {
  hasKey: boolean;
  keySource: "env" | "kv" | "none";
  keyMasked: string | null;
  fromName: string;
  fromAddress: string;
  siteUrl: string;
  updatedAt?: string;
  updatedBy?: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type TestState = "idle" | "sending" | "sent" | "error";

function StatusBadge({ hasKey, keySource }: { hasKey: boolean; keySource: string }) {
  if (!hasKey)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Not configured
      </span>
    );
  if (keySource === "env")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <AlertTriangle className="w-3 h-3" /> From environment (override with KV below)
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
}

export default function ManagerSettings() {
  const { session, profile } = useAuth();

  // ── Email provider config ───────────────────────────────────────────────────
  const [cfg, setCfg] = useState<EmailProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [fromName, setFromName] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [siteUrl, setSiteUrl] = useState("");

  // Save / test states
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [testState, setTestState] = useState<TestState>("idle");
  const [testError, setTestError] = useState("");
  const [testSentTo, setTestSentTo] = useState("");
  const [testEmail, setTestEmail] = useState("");

  // Remove key
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // ── Manager access code ──────────────────────────────────────────────────
  const [accessCode, setAccessCode] = useState("");
  const [newAccessCode, setNewAccessCode] = useState("");
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [accessCodeSaveState, setAccessCodeSaveState] = useState<SaveState>("idle");
  const [accessCodeError, setAccessCodeError] = useState("");
  const [accessCodeLastChangedBy, setAccessCodeLastChangedBy] = useState("");
  const [accessCodeLastChangedAt, setAccessCodeLastChangedAt] = useState("");
  const [accessCodeUpdateNotification, setAccessCodeUpdateNotification] = useState(false);

  const load = async () => {
    if (!session) return;
    try {
      const res = await fetch(apiUrl("/manager/settings/email-provider"), {
        headers: authHeaders(session.access_token),
      });
      if (res.ok) {
        const data: EmailProviderConfig = await res.json();
        setCfg(data);
        setFromName(data.fromName ?? "");
        setFromAddress(data.fromAddress ?? "");
        setSiteUrl(data.siteUrl ?? "");
        // Pre-fill test email with manager's own address
        if (!testEmail) setTestEmail(profile?.email ?? "");
      }
    } catch (e) {
      console.error("Failed to load email provider config:", e);
    }

    // Load access code info
    try {
      const res = await fetch(apiUrl("/manager/settings/access-code"), {
        headers: authHeaders(session.access_token),
      });
      if (res.ok) {
        const data = await res.json();
        setAccessCode(data.code ?? "");
        setAccessCodeLastChangedBy(data.lastChangedBy ?? "");
        setAccessCodeLastChangedAt(data.lastChangedAt ?? "");
        // Dismiss notification when fresh data is loaded
        setAccessCodeUpdateNotification(false);
      }
    } catch (e) {
      console.error("Failed to load access code:", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Realtime subscription for access code updates ────────────────────────
  useEffect(() => {
    if (!session) return;

    // Subscribe to the manager:access-code KV store changes via Supabase Realtime
    // We use the kv_store_991222a2 table and listen for changes to keys starting with "manager:access-code"
    const channel = supabase
      .channel("access-code-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kv_store_991222a2",
          filter: 'key=eq.manager:access-code',
        },
        (payload: any) => {
          // When the access code is updated, show a notification
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newData = payload.new?.value;
            if (newData) {
              setAccessCode(newData.code ?? "");
              setAccessCodeLastChangedBy(newData.lastChangedBy ?? "");
              setAccessCodeLastChangedAt(newData.lastChangedAt ?? "");
              // Show notification that code was updated
              setAccessCodeUpdateNotification(true);
              // Auto-dismiss after 5 seconds
              setTimeout(() => setAccessCodeUpdateNotification(false), 5000);
            }
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  useEffect(() => {
    load();
  }, [session, profile]);

  const handleSave = async () => {
    if (!session) return;
    setSaveState("saving");
    setSaveError("");
    try {
      const body: Record<string, string> = {
        fromName: fromName.trim() || "Print It Belton",
        fromAddress: fromAddress.trim() || "onboarding@resend.dev",
        siteUrl: siteUrl.trim() || "https://yourdomain.com",
      };
      // Only send the key if the user typed a new value (not the masked placeholder)
      if (apiKey && !apiKey.includes("•") && apiKey.trim() !== "") {
        body.resendApiKey = apiKey.trim();
      }
      const res = await fetch(apiUrl("/manager/settings/email-provider"), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setCfg(data);
      setApiKey(""); // Clear the field after save
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3500);
    } catch (e: any) {
      setSaveError(e.message ?? "Unknown error");
      setSaveState("error");
    }
  };

  const handleRemoveKey = async () => {
    if (!session) return;
    setRemoving(true);
    try {
      const res = await fetch(apiUrl("/manager/settings/email-provider/key"), {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      if (res.ok) {
        setConfirmRemove(false);
        await load();
      }
    } catch (e) {
      console.error("Remove key error:", e);
    } finally {
      setRemoving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!session) return;
    setTestState("sending");
    setTestError("");
    setTestSentTo("");
    try {
      const res = await fetch(apiUrl("/manager/settings/test-email"), {
        method: "POST",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ toEmail: testEmail || profile?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setTestSentTo(data.sentTo ?? testEmail);
      setTestState("sent");
      setTimeout(() => setTestState("idle"), 6000);
    } catch (e: any) {
      setTestError(e.message ?? "Unknown error");
      setTestState("error");
    }
  };

  const handleSaveAccessCode = async () => {
    if (!session) return;
    setAccessCodeSaveState("saving");
    setAccessCodeError("");
    try {
      const res = await fetch(apiUrl("/manager/settings/access-code"), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ newCode: newAccessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      
      // Update the display
      setAccessCode(data.code);
      setAccessCodeLastChangedBy(data.lastChangedBy);
      setAccessCodeLastChangedAt(data.lastChangedAt);
      setNewAccessCode(""); // Clear the input
      setAccessCodeSaveState("saved");
      setTimeout(() => setAccessCodeSaveState("idle"), 3500);
    } catch (e: any) {
      setAccessCodeError(e.message ?? "Unknown error");
      setAccessCodeSaveState("error");
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-40 mb-4" />
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded-xl" />
                <div className="h-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-[#0f1e3c] rounded-xl flex items-center justify-center shadow-sm">
            <Settings className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1 ml-12">
          Configure your store's email provider and other integrations.
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Email Provider ─────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Section header */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-50 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-base leading-tight">
                  Email Provider — Resend
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Used to send order notification emails to managers.
                </p>
              </div>
            </div>
            {cfg && <StatusBadge hasKey={cfg.hasKey} keySource={cfg.keySource} />}
          </div>

          <div className="p-6 space-y-6">
            {/* Info callout */}
            <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700 leading-relaxed">
                <span className="font-bold">How to get a Resend API key:</span> Create a free account
                at{" "}
                <a
                  href="https://resend.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold inline-flex items-center gap-0.5"
                >
                  resend.com <ExternalLink className="w-2.5 h-2.5" />
                </a>
                , verify your sending domain, then copy your API key from the dashboard.
                The API key is stored securely on the server — it is never exposed to the browser.
              </div>
            </div>

            {/* API Key field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-gray-400" />
                Resend API Key
              </label>
              {cfg?.hasKey && !apiKey && (
                <div className="mb-2 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="font-mono text-sm text-gray-600 tracking-wider flex-1">
                    {cfg.keyMasked}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">saved</span>
                </div>
              )}
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    cfg?.hasKey
                      ? "Enter new key to replace the saved one…"
                      : "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  }
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 pr-11 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 placeholder:font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Leave blank to keep the current key. The raw key is never returned to the browser.
              </p>
            </div>

            {/* From Name & From Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  From Name
                </label>
                <input
                  type="text"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Print It Belton"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Appears in the "From" field of notification emails.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  From Email Address
                </label>
                <input
                  type="email"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="notifications@yourdomain.com"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must be a verified sender in your Resend account.
                </p>
              </div>
            </div>

            {/* Site URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Site URL
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="https://yourdomain.com"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Used in email templates to link back to your store.
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saveState === "saving"}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  saveState === "saved"
                    ? "bg-green-600 text-white"
                    : saveState === "error"
                    ? "bg-red-600 text-white"
                    : "bg-[#0f1e3c] hover:bg-[#1a2d52] text-white"
                } disabled:opacity-60`}
              >
                {saveState === "saving" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : saveState === "saved" ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : saveState === "error" ? (
                  <><XCircle className="w-4 h-4" /> Failed</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Configuration</>
                )}
              </button>
              {saveState === "error" && saveError && (
                <p className="text-xs text-red-600 font-medium">{saveError}</p>
              )}
              {cfg?.updatedBy && saveState === "idle" && (
                <p className="text-xs text-gray-400">
                  Last saved by {cfg.updatedBy}
                  {cfg.updatedAt
                    ? ` · ${new Date(cfg.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Test Email ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 pt-6 pb-5 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <SendHorizonal className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                Send a Test Email
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Verify your Resend configuration is working correctly.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {!cfg?.hasKey && (
              <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium">
                  You must save a valid Resend API key above before sending a test email.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Recipient address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={profile?.email ?? "you@example.com"}
                  disabled={!cfg?.hasKey}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleTestEmail}
                  disabled={!cfg?.hasKey || testState === "sending"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                    testState === "sent"
                      ? "bg-green-600 text-white"
                      : testState === "error"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {testState === "sending" ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  ) : testState === "sent" ? (
                    <><CheckCircle2 className="w-4 h-4" /> Sent!</>
                  ) : testState === "error" ? (
                    <><XCircle className="w-4 h-4" /> Failed</>
                  ) : (
                    <><SendHorizonal className="w-4 h-4" /> Send Test</>
                  )}
                </button>
              </div>
            </div>

            {testState === "sent" && testSentTo && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 font-medium">
                  Test email sent to <span className="font-bold">{testSentTo}</span>. Check your inbox!
                </p>
              </div>
            )}
            {testState === "error" && testError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{testError}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Manager Access Code ────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 pt-6 pb-5 border-b border-gray-50 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base leading-tight">
                Manager Access Code
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Change the code required for new managers to join.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Info callout */}
            <div className="flex gap-3 bg-purple-50 border border-purple-100 rounded-xl p-4">
              <Info className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-700 leading-relaxed">
                <span className="font-bold">Current access code:</span>{" "}
                <span className="font-mono font-bold">{accessCode}</span>
                <br />
                <span className="text-purple-600 text-[11px]">
                  New managers use this code during signup to gain manager access.
                </span>
              </div>
            </div>

            {/* Realtime update notification */}
            {accessCodeUpdateNotification && (
              <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 animate-pulse">
                <Zap className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 font-medium leading-relaxed">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    Access code updated by {accessCodeLastChangedBy}!
                  </span>
                  <br />
                  <span className="text-blue-600 text-[11px] block mt-1">
                    New code: <span className="font-mono font-bold">{accessCode}</span>
                  </span>
                </div>
              </div>
            )}

            {/* New Access Code Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-400" />
                New Access Code
              </label>
              <div className="relative">
                <input
                  type={showAccessCode ? "text" : "password"}
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  placeholder="Enter a new code (min. 4 characters)…"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 pr-11 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-gray-400 placeholder:font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessCode((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Must be at least 4 characters long. Codes are case-insensitive.
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAccessCode}
                disabled={!newAccessCode.trim() || accessCodeSaveState === "saving"}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                  accessCodeSaveState === "saved"
                    ? "bg-green-600 text-white"
                    : accessCodeSaveState === "error"
                    ? "bg-red-600 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {accessCodeSaveState === "saving" ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : accessCodeSaveState === "saved" ? (
                  <><CheckCircle2 className="w-4 h-4" /> Saved!</>
                ) : accessCodeSaveState === "error" ? (
                  <><XCircle className="w-4 h-4" /> Failed</>
                ) : (
                  <><Save className="w-4 h-4" /> Update Code</>
                )}
              </button>
              {accessCodeSaveState === "error" && accessCodeError && (
                <p className="text-xs text-red-600 font-medium">{accessCodeError}</p>
              )}
              {accessCodeLastChangedBy && accessCodeSaveState === "idle" && (
                <p className="text-xs text-gray-400">
                  Last changed by {accessCodeLastChangedBy}
                  {accessCodeLastChangedAt
                    ? ` · ${new Date(accessCodeLastChangedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                    : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Danger Zone ────────────────────────────────────────── */}
        {cfg?.hasKey && cfg.keySource === "kv" && (
          <section className="bg-white rounded-2xl border border-red-100 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-red-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-red-800 text-base leading-tight">Danger Zone</h2>
                <p className="text-xs text-red-400 mt-0.5">
                  Irreversible actions — proceed with caution.
                </p>
              </div>
            </div>
            <div className="p-6">
              {!confirmRemove ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Remove saved API key</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Deletes the stored Resend API key. Email notifications will stop working until a new key is saved.
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmRemove(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Key
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-red-800">
                    Are you sure? Email notifications will stop working.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRemoveKey}
                      disabled={removing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
                    >
                      {removing ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Removing…</>
                      ) : (
                        <><Trash2 className="w-3.5 h-3.5" /> Yes, remove it</>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Payment Gateways ── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Payment Gateways</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Configure how customers pay for their orders at checkout.
            </p>
          </div>
          <PaymentGatewaySettings />
        </section>
      </div>
    </div>
  );
}