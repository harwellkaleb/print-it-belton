import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  User,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  AlertCircle,
  ArrowRight,
  Edit2,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiUrl, authHeaders } from "../utils/api";
import { toast } from "sonner";

interface OrderItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  size?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "confirmed" | "in-production" | "ready" | "completed" | "cancelled";
  shippingAddress: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  pending: { label: "Pending Review", icon: Clock, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, color: "text-blue-600 bg-blue-50 border-blue-200" },
  "in-production": { label: "In Production", icon: AlertCircle, color: "text-purple-600 bg-purple-50 border-purple-200" },
  ready: { label: "Ready for Pickup", icon: Package, color: "text-green-600 bg-green-50 border-green-200" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-gray-600 bg-gray-50 border-gray-200" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-600 bg-red-50 border-red-200" },
};

export default function Account() {
  const { session, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(profile?.name || "");
  const [editPhone, setEditPhone] = useState(profile?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate("/login", { state: { from: "/account" } });
      return;
    }
    const fetchOrders = async () => {
      try {
        const res = await fetch(apiUrl("/orders/my"), {
          headers: authHeaders(session.access_token),
        });
        if (res.ok) setOrders(await res.json());
      } catch (e) {
        console.error("Failed to fetch orders:", e);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [session, navigate]);

  useEffect(() => {
    setEditName(profile?.name || "");
    setEditPhone(profile?.phone || "");
  }, [profile]);

  const saveProfile = async () => {
    if (!session) return;
    setSavingProfile(true);
    try {
      const res = await fetch(apiUrl("/user/profile"), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      if (res.ok) {
        await refreshProfile();
        setEditMode(false);
        toast.success("Profile updated!");
      }
    } catch (e) {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!session) return;
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setCancellingOrder(orderId);
    try {
      const res = await fetch(apiUrl(`/orders/${orderId}`), {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      const data = await res.json();
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast.success("Order cancelled successfully.");
      } else {
        console.error("Cancel order error:", data);
        toast.error(data.error || "Failed to cancel order.");
      }
    } catch (e) {
      console.error("Cancel order exception:", e);
      toast.error("Failed to cancel order.");
    } finally {
      setCancellingOrder(null);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2B3272]">My Account</h1>
            <p className="text-gray-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-red-700">
                {profile?.name}
              </span>
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 hover:bg-red-50 px-4 py-2 rounded transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 p-1 rounded mb-6 w-fit">
          {(["orders", "profile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-white shadow text-[#2B3272]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "orders" ? `Orders (${orders.length})` : "Profile"}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            {loadingOrders ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded p-6 animate-pulse border border-gray-100">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded border border-gray-100 p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  No orders yet
                </h3>
                <p className="text-gray-500 mb-6">
                  When you place your first order, it will appear here.
                </p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-bold px-6 py-3 rounded transition-colors"
                >
                  Browse Products <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const isCancelling = cancellingOrder === order.id;
                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow"
                    >
                      <div className="p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${status.color}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Placed{" "}
                              {new Date(order.createdAt).toLocaleDateString(
                                "en-US",
                                { month: "long", day: "numeric", year: "numeric" }
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-[#2B3272]">
                              ${order.total.toFixed(2)}
                            </span>
                            {order.status === "pending" && (
                              <button
                                onClick={() => cancelOrder(order.id)}
                                disabled={isCancelling}
                                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded font-semibold transition-colors disabled:opacity-50"
                                title="Cancel this order"
                              >
                                {isCancelling ? (
                                  <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                                {isCancelling ? "Cancelling..." : "Cancel Order"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 text-sm"
                            >
                              <div className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0" />
                              <span className="text-gray-700 font-medium">
                                {item.name}
                              </span>
                              <span className="text-gray-400">×{item.quantity}</span>
                              {item.size && (
                                <span className="text-xs text-gray-400">
                                  ({item.size})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {order.shippingAddress && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <Truck className="w-3.5 h-3.5" />
                            {order.shippingAddress}
                          </div>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          {["pending", "confirmed", "in-production", "ready", "completed"].map((s, i) => (
                            <div
                              key={s}
                              className={`h-1.5 flex-1 rounded-full ${
                                order.status === "cancelled"
                                  ? "bg-red-200"
                                  : ["pending", "confirmed", "in-production", "ready", "completed"].indexOf(order.status) >= i
                                  ? "bg-red-600"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between mt-1">
                          {["Pending", "Confirmed", "Production", "Ready", "Done"].map((label) => (
                            <span key={label} className="text-[10px] text-gray-400">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="bg-white rounded border border-gray-100 p-6 max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-[#2B3272] rounded-full flex items-center justify-center text-white text-xl font-black">
                  {profile?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{profile?.name}</p>
                  <p className="text-sm text-gray-500">{profile?.email}</p>
                </div>
              </div>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 text-sm text-[#2B3272] hover:text-red-700 font-semibold transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B3272]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-2.5 rounded text-sm transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="text-gray-500 hover:text-gray-700 font-semibold px-5 py-2.5 rounded text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {profile?.phone || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Role</span>
                  <span className={`text-sm font-semibold capitalize ${profile?.role === "manager" ? "text-[#2B3272]" : "text-gray-900"}`}>
                    {profile?.role}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Member Since</span>
                  <span className="text-sm text-gray-900">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}