import { useEffect, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Package,
  RefreshCw,
  Trash2,
  MapPin,
  StickyNote,
  Calendar,
  User,
  Hash,
  AlertTriangle,
  CreditCard,
  Banknote,
} from "lucide-react";
import { apiUrl, authHeaders } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

interface OrderItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  size?: string;
  color?: string;
  notes?: string;
}

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  total: number;
  status: string;
  shippingAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  paymentId?: string | null;
  paymentStatus?: string;
}

const STATUSES = [
  { value: "pending",       label: "Pending",       icon: Clock,         ring: "border-amber-400",  badge: "bg-amber-100 text-amber-800",   btn: "hover:border-amber-400 hover:bg-amber-50" },
  { value: "confirmed",     label: "Confirmed",     icon: CheckCircle2,  ring: "border-blue-400",   badge: "bg-blue-100 text-blue-800",     btn: "hover:border-blue-400 hover:bg-blue-50" },
  { value: "in-production", label: "In Production", icon: AlertCircle,   ring: "border-violet-400", badge: "bg-violet-100 text-violet-800", btn: "hover:border-violet-400 hover:bg-violet-50" },
  { value: "ready",         label: "Ready",         icon: Package,       ring: "border-green-400",  badge: "bg-green-100 text-green-800",   btn: "hover:border-green-400 hover:bg-green-50" },
  { value: "completed",     label: "Completed",     icon: CheckCircle2,  ring: "border-gray-300",   badge: "bg-gray-100 text-gray-600",     btn: "hover:border-gray-400 hover:bg-gray-50" },
  { value: "cancelled",     label: "Cancelled",     icon: XCircle,       ring: "border-red-400",    badge: "bg-red-100 text-red-800",       btn: "hover:border-red-400 hover:bg-red-50" },
];

const CATEGORY_LABELS: Record<string, string> = {
  "t-shirts": "T-Shirts",
  "vehicle-graphics": "Vehicle Graphics",
  "signs-banners": "Signs & Banners",
  "wall-wraps": "Wall Wraps",
};

const getStatus = (v: string) => STATUSES.find((s) => s.value === v) ?? STATUSES[0];

function formatDate(iso: string, full = false) {
  const d = new Date(iso);
  if (full)
    return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function OrderManagement() {
  const { session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchOrders = async (showRefresh = false) => {
    if (!session) return;
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch(apiUrl("/orders"), { headers: authHeaders(session.access_token) });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error("Fetch orders error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [session]);

  const updateStatus = async (orderId: string, status: string) => {
    if (!session) return;
    setUpdatingStatus(orderId);
    try {
      const res = await fetch(apiUrl(`/orders/${orderId}/status`), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o))
        );
        toast.success(`Status updated to "${getStatus(status).label}"`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update status");
      }
    } catch (e) {
      toast.error("Failed to update order status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!session) return;
    setDeletingOrder(orderId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(apiUrl(`/orders/${orderId}`), {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success("Order deleted.");
      } else {
        toast.error(data.error || "Failed to delete order.");
      }
    } catch (e) {
      toast.error("Failed to delete order.");
    } finally {
      setDeletingOrder(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      o.userName?.toLowerCase().includes(q) ||
      o.userEmail?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q) ||
      o.items?.some((i) => i.name.toLowerCase().includes(q));
    return matchSearch && (!filterStatus || o.status === filterStatus);
  });

  const statusCounts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s.value] = orders.filter((o) => o.status === s.value).length;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {orders.length} total order{orders.length !== 1 ? "s" : ""}
            {filtered.length !== orders.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <button
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setFilterStatus("")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            !filterStatus
              ? "bg-[#0f1e3c] text-white shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All ({orders.length})
        </button>
        {STATUSES.map((s) => {
          const cnt = statusCounts[s.value] ?? 0;
          const active = filterStatus === s.value;
          return (
            <button
              key={s.value}
              onClick={() => setFilterStatus(active ? "" : s.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                active
                  ? `${s.badge} ${s.ring} shadow-sm`
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <s.icon className="w-3 h-3" />
              {s.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search customer, order ID, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-20 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 font-medium">No orders found</p>
          {search || filterStatus ? (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); }}
              className="mt-3 text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => {
            const sc = getStatus(order.status);
            const StatusIcon = sc.icon;
            const isExpanded = expanded.has(order.id);
            const isUpdating = updatingStatus === order.id;
            const isDeleting = deletingOrder === order.id;
            const isPendingDelete = confirmDeleteId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  isPendingDelete
                    ? "border-red-300 shadow-md shadow-red-100"
                    : "border-gray-100 hover:shadow-sm"
                }`}
              >
                {/* Inline delete confirmation banner */}
                {isPendingDelete && (
                  <div className="flex items-center justify-between gap-3 px-5 py-3 bg-red-50 border-b border-red-200">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                      <span className="text-sm font-semibold">
                        Permanently delete order #{order.id.slice(0, 8).toUpperCase()}? This cannot be undone.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                        disabled={isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors disabled:opacity-60"
                      >
                        {isDeleting ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Row */}
                <div
                  className="flex flex-wrap items-center gap-3 px-5 py-4 cursor-pointer select-none"
                  onClick={() => {
                    if (isPendingDelete) { setConfirmDeleteId(null); return; }
                    toggleExpand(order.id);
                  }}
                >
                  {/* Order ID + customer */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Hash className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${sc.badge}`}>
                          <StatusIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm mt-0.5 truncate">{order.userName}</p>
                      <p className="text-xs text-gray-400 truncate">{order.userEmail}</p>
                    </div>
                  </div>

                  {/* Meta + actions */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {order.items?.reduce((s, i) => s + i.quantity, 0)} item
                        {order.items?.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="font-black text-gray-900 text-lg">${order.total.toFixed(2)}</span>

                    {/* Delete button — toggles the confirmation banner */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(isPendingDelete ? null : order.id);
                      }}
                      disabled={isDeleting}
                      title={isPendingDelete ? "Cancel delete" : "Delete order"}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                        isPendingDelete
                          ? "text-red-600 bg-red-100 hover:bg-red-200"
                          : "text-gray-300 hover:text-red-500 hover:bg-red-50"
                      }`}
                    >
                      {isDeleting ? (
                        <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-300" />
                      : <ChevronDown className="w-4 h-4 text-gray-300" />}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/60 p-5 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Items */}
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                          Order Items
                        </h4>
                        <div className="space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-xl p-3.5 border border-gray-100 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {CATEGORY_LABELS[item.category] ?? item.category}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-black text-gray-900 text-sm">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-400">× {item.quantity} @ ${item.price.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.size && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                    Size: {item.size}
                                  </span>
                                )}
                                {item.color && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                    Color: {item.color}
                                  </span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-2 italic">
                                  "{item.notes}"
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between mt-3 px-1">
                          <span className="text-sm text-gray-500 font-semibold">Order Total</span>
                          <span className="font-black text-gray-900">${order.total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Order Details
                        </h4>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                          <div className="flex items-start gap-3 p-3.5">
                            <User className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                              <p className="text-sm font-semibold text-gray-800">{order.userName}</p>
                              <p className="text-xs text-gray-500">{order.userEmail}</p>
                            </div>
                          </div>

                          {order.shippingAddress && (
                            <div className="flex items-start gap-3 p-3.5">
                              <MapPin className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Delivery / Pickup</p>
                                <p className="text-sm text-gray-800">{order.shippingAddress}</p>
                              </div>
                            </div>
                          )}

                          {order.notes && (
                            <div className="flex items-start gap-3 p-3.5">
                              <StickyNote className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400 mb-0.5">Notes</p>
                                <p className="text-sm text-gray-700 italic">"{order.notes}"</p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-start gap-3 p-3.5">
                            <Calendar className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Ordered</p>
                              <p className="text-sm text-gray-800">{formatDate(order.createdAt, true)}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Updated {formatDate(order.updatedAt, true)}</p>
                            </div>
                          </div>

                          {/* Payment info */}
                          <div className="flex items-start gap-3 p-3.5">
                            {order.paymentMethod === "stripe" ? (
                              <CreditCard className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Banknote className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                            )}
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-800 capitalize">
                                  {order.paymentMethod === "stripe" ? "Stripe" : order.paymentMethod === "paypal" ? "PayPal" : order.paymentMethod ?? "Manual"}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                  {order.paymentStatus === "paid" ? "Paid" : "Unpaid / Pay at Pickup"}
                                </span>
                              </div>
                              {order.paymentId && (
                                <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">{order.paymentId}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete from detail panel */}
                        <button
                          onClick={() => setConfirmDeleteId(isPendingDelete ? null : order.id)}
                          disabled={isDeleting}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete this order
                        </button>
                      </div>
                    </div>

                    {/* Status Update */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                        Update Status
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {STATUSES.map((s) => {
                          const isActive = order.status === s.value;
                          return (
                            <button
                              key={s.value}
                              onClick={() => !isActive && !isUpdating && updateStatus(order.id, s.value)}
                              disabled={isActive || isUpdating}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                isActive
                                  ? `${s.badge} ${s.ring} cursor-default shadow-sm`
                                  : `bg-white border-gray-200 text-gray-600 ${s.btn} cursor-pointer`
                              } ${isUpdating && !isActive ? "opacity-50" : ""}`}
                            >
                              {isUpdating && !isActive ? (
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <s.icon className="w-3 h-3" />
                              )}
                              {s.label}
                              {isActive && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}