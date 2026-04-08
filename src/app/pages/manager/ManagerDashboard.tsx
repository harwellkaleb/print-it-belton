import { useEffect, useState, useMemo } from "react";
import {
  Package,
  ShoppingBag,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Activity,
  Bell,
  BellOff,
  Mail,
  Loader2,
  Save,
} from "lucide-react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { apiUrl, authHeaders } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface Order {
  id: string;
  userEmail: string;
  userName: string;
  total: number;
  status: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
}

interface Product {
  id: string;
  name: string;
  category: string;
  available: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:       { label: "Pending",      color: "text-amber-700",  bg: "bg-amber-100" },
  confirmed:     { label: "Confirmed",    color: "text-blue-700",   bg: "bg-blue-100" },
  "in-production": { label: "In Production", color: "text-violet-700", bg: "bg-violet-100" },
  ready:         { label: "Ready",        color: "text-green-700",  bg: "bg-green-100" },
  completed:     { label: "Completed",    color: "text-gray-600",   bg: "bg-gray-100" },
  cancelled:     { label: "Cancelled",    color: "text-red-700",    bg: "bg-red-100" },
};

const CATEGORIES = [
  { slug: "t-shirts",         label: "T-Shirts & Apparel",  color: "#dc2626" },
  { slug: "vehicle-graphics", label: "Vehicle Graphics",     color: "#2563eb" },
  { slug: "signs-banners",    label: "Signs & Banners",      color: "#16a34a" },
  { slug: "wall-wraps",       label: "Wall Wraps",           color: "#9333ea" },
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ManagerDashboard() {
  const { session, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Notification prefs state ────────────────────────────────────────
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [pendingOrdersEnabled, setPendingOrdersEnabled] = useState(false);
  const [notifEmail, setNotifEmail] = useState("");

  const fetchData = async (showRefresh = false) => {
    if (!session) return;
    if (showRefresh) setRefreshing(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(apiUrl("/orders"), { headers: authHeaders(session.access_token) }),
        fetch(apiUrl("/products"), { headers: authHeaders(session.access_token) }),
      ]);
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [session]);

  // Load notification prefs on mount
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch(apiUrl("/manager/notification-prefs"), {
          headers: authHeaders(session.access_token),
        });
        if (res.ok) {
          const data = await res.json();
          setPendingOrdersEnabled(!!data.pendingOrders);
          setNotifEmail(data.email || profile?.email || "");
        }
      } catch (e) {
        console.error("Failed to load notification prefs:", e);
      } finally {
        setNotifLoading(false);
      }
    })();
  }, [session, profile]);

  const saveNotifPrefs = async () => {
    if (!session) return;
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      const res = await fetch(apiUrl("/manager/notification-prefs"), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ pendingOrders: pendingOrdersEnabled, email: notifEmail }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      } else {
        const err = await res.json();
        console.error("Save prefs error:", err);
      }
    } catch (e) {
      console.error("Failed to save notification prefs:", e);
    } finally {
      setNotifSaving(false);
    }
  };

  // Derived stats
  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const totalRevenue = orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0);
  const uniqueCustomers = new Set(orders.map((o) => o.userId ?? o.userEmail)).size;
  const availableProducts = products.filter((p) => p.available).length;

  // Revenue by category (from order items)
  const categoryRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    for (const order of orders) {
      if (order.status === "cancelled") continue;
      for (const item of order.items ?? []) {
        const cat = (item as any).category ?? "other";
        map[cat] = (map[cat] ?? 0) + (item.price ?? 0) * (item.quantity ?? 1);
      }
    }
    return CATEGORIES.map((c) => ({ name: c.label.split(" ")[0], value: Math.round(map[c.slug] ?? 0), color: c.color }));
  }, [orders]);

  // Status breakdown for donut-style list
  const statusBreakdown = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: orders.filter((o) => o.status === key).length,
  })).filter((s) => s.count > 0);

  const kpis = [
    {
      label: "Total Orders",
      value: loading ? "—" : orders.length,
      sub: `${activeOrders.length} active`,
      icon: ShoppingBag,
      iconBg: "bg-blue-600",
      border: "",
    },
    {
      label: "Pending Review",
      value: loading ? "—" : pendingOrders.length,
      sub: pendingOrders.length > 0 ? "Need attention" : "All clear",
      icon: Clock,
      iconBg: "bg-amber-500",
      border: pendingOrders.length > 0 ? "border-amber-300 shadow-amber-100 shadow-md" : "",
      alert: pendingOrders.length > 0,
    },
    {
      label: "Total Revenue",
      value: loading ? "—" : formatCurrency(totalRevenue),
      sub: "Excl. cancelled",
      icon: DollarSign,
      iconBg: "bg-emerald-600",
      border: "",
    },
    {
      label: "Products",
      value: loading ? "—" : products.length,
      sub: `${availableProducts} available`,
      icon: Package,
      iconBg: "bg-red-600",
      border: "",
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back — here's what's happening in your store.</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white rounded-2xl p-5 border ${kpi.border || "border-gray-100"} relative overflow-hidden`}
          >
            {kpi.alert && (
              <div className="absolute top-3 right-3">
                <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
            )}
            <div className={`${kpi.iconBg} w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl lg:text-3xl font-black text-gray-900 mb-0.5">{kpi.value}</div>
            <div className="text-sm font-bold text-gray-700">{kpi.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue by Category Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-gray-900">Revenue by Category</h2>
              <p className="text-xs text-gray-400 mt-0.5">From non-cancelled orders</p>
            </div>
            <Activity className="w-5 h-5 text-gray-300" />
          </div>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ) : categoryRevenue.every((c) => c.value === 0) ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No revenue data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryRevenue} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + "k" : v}`}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                  contentStyle={{ border: "none", borderRadius: 12, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {categoryRevenue.map((entry) => (
                    <Cell key={`bar-cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Order Status</h2>
            <TrendingUp className="w-5 h-5 text-gray-300" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">No orders yet</div>
          ) : (
            <div className="space-y-2">
              {statusBreakdown.map((s) => {
                const pct = Math.round((s.count / orders.length) * 100);
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className={`font-semibold ${s.color}`}>{s.label}</span>
                      <span className="font-bold text-gray-900">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bg.replace("bg-", "bg-").replace("-100", "-400")}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {statusBreakdown.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-4">No active orders</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link
              to="/manager/orders"
              className="text-sm text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-24" />
                    <div className="h-3.5 bg-gray-100 rounded w-36" />
                  </div>
                  <div className="h-5 bg-gray-100 rounded w-16" />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="px-6 py-14 text-center text-gray-400 text-sm">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No orders yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 7).map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                return (
                  <div key={order.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-400">
                            #{order.id.slice(0, 7).toUpperCase()}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">
                          {order.userName}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <span className="font-black text-gray-900 flex-shrink-0 ml-3">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-2.5">
              <Link
                to="/manager/orders"
                className="flex items-center justify-between p-3.5 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-amber-900 text-sm">Pending Orders</p>
                    <p className="text-xs text-amber-600">{pendingOrders.length} awaiting review</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/manager/images"
                className="flex items-center justify-between p-3.5 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-red-900 text-sm">Add Product</p>
                    <p className="text-xs text-red-600">{products.length} in catalog</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Catalog Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-bold text-gray-900 mb-4">Catalog by Category</h2>
            {loading ? (
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {CATEGORIES.map((cat) => {
                  const count = products.filter((p) => p.category === cat.slug).length;
                  const avail = products.filter((p) => p.category === cat.slug && p.available).length;
                  return (
                    <div key={cat.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-gray-600 truncate">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-xs text-gray-400">{avail}/{count}</span>
                        <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-lg min-w-[28px] text-center">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Email Notification Settings ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Email Notifications</h2>
              {pendingOrdersEnabled
                ? <Bell className="w-4 h-4 text-red-500" />
                : <BellOff className="w-4 h-4 text-gray-300" />}
            </div>

            {notifLoading ? (
              <div className="space-y-3">
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toggle row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">
                      Pending order alerts
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                      Send me an email whenever a customer places a new order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingOrdersEnabled((v) => !v)}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                      pendingOrdersEnabled ? "bg-red-600" : "bg-gray-200"
                    }`}
                    aria-checked={pendingOrdersEnabled}
                    role="switch"
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${
                        pendingOrdersEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Email address input */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3 h-3" />
                    Notify this address
                  </label>
                  <input
                    type="email"
                    value={notifEmail}
                    onChange={(e) => setNotifEmail(e.target.value)}
                    placeholder="manager@example.com"
                    disabled={!pendingOrdersEnabled}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  />
                  {pendingOrdersEnabled && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Defaults to your account email. Powered by Resend.
                    </p>
                  )}
                </div>

                {/* Save button */}
                <button
                  onClick={saveNotifPrefs}
                  disabled={notifSaving}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    notifSaved
                      ? "bg-green-50 border border-green-200 text-green-700"
                      : "bg-[#0f1e3c] hover:bg-[#1a2d52] text-white"
                  } disabled:opacity-60`}
                >
                  {notifSaving ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                  ) : notifSaved ? (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
                  ) : (
                    <><Save className="w-3.5 h-3.5" /> Save preferences</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}