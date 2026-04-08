import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Upload,
  Trash2,
  Edit2,
  Save,
  X,
  ImageIcon,
  ToggleLeft,
  ToggleRight,
  Search,
  Eye,
  EyeOff,
  Tag,
  DollarSign,
  Layers,
  RefreshCw,
} from "lucide-react";
import { apiUrl, authHeaders, authHeadersOnly } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  available: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: "t-shirts",         label: "T-Shirts & Apparel",   color: "bg-red-100 text-red-700" },
  { value: "vehicle-graphics", label: "Vehicle Graphics",      color: "bg-blue-100 text-blue-700" },
  { value: "signs-banners",    label: "Signs & Banners",       color: "bg-green-100 text-green-700" },
  { value: "wall-wraps",       label: "Wall Wraps",            color: "bg-violet-100 text-violet-700" },
];

const emptyForm = {
  name: "",
  category: "t-shirts",
  description: "",
  price: "",
  imageUrl: "",
  available: true,
};

function catLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
function catColor(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.color ?? "bg-gray-100 text-gray-600";
}

export default function ImageManagement() {
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchProducts = async () => {
    if (!session) return;
    try {
      const res = await fetch(apiUrl("/products"), { headers: authHeaders(session.access_token) });
      if (res.ok) setProducts(await res.json());
    } catch (e) {
      console.error("Fetch products error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [session]);

  const setField = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleImageUpload = async (file: File) => {
    if (!session) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl("/upload-image"), {
        method: "POST",
        headers: authHeadersOnly(session.access_token),
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      setField("imageUrl", data.storagePath);
      toast.success("Image uploaded!");
    } catch (e: any) {
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.price || isNaN(parseFloat(form.price as string))) { toast.error("Valid price is required"); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price as string) };
      const url = editingId ? apiUrl(`/products/${editingId}`) : apiUrl("/products");
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(session?.access_token), body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      toast.success(editingId ? "Product updated!" : "Product created!");
      closeForm();
      await fetchProducts();
    } catch (e: any) {
      toast.error(e.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price.toString(),
      imageUrl: product.imageUrl,
      available: product.available,
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!session || !window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      const res = await fetch(apiUrl(`/products/${id}`), {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      if (res.ok) {
        toast.success("Product deleted.");
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error("Failed to delete product.");
      }
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  const toggleAvailable = async (product: Product) => {
    if (!session) return;
    try {
      const res = await fetch(apiUrl(`/products/${product.id}`), {
        method: "PUT",
        headers: authHeaders(session.access_token),
        body: JSON.stringify({ available: !product.available }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, available: !p.available } : p))
        );
        toast.success(`Product ${!product.available ? "shown" : "hidden"} in store.`);
      }
    } catch {
      toast.error("Failed to update product.");
    }
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q);
    return matchSearch && (!filterCat || p.category === filterCat);
  });

  const isStorageUrl = (url: string) => url?.startsWith("storage:");
  const isWebUrl = (url: string) => url?.startsWith("http");

  // Drop handler
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Products & Images</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage your catalog — {products.length} product{products.length !== 1 ? "s" : ""},&nbsp;
            {products.filter((p) => p.available).length} visible in store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 font-semibold px-3 py-2 rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { closeForm(); setShowForm(true); }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-2xl border border-red-200 shadow-xl mb-7 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0f1e3c] to-[#1a3060] border-b border-[#1a3060]">
            <div>
              <h2 className="font-black text-white">
                {editingId ? "Edit Product" : "New Product"}
              </h2>
              <p className="text-white/50 text-xs mt-0.5">
                {editingId ? "Update the product details below" : "Fill in the details to add a new product"}
              </p>
            </div>
            <button onClick={closeForm} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Product Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Classic Logo Tee"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <select
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white appearance-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={3}
                placeholder="Describe what makes this product special…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                Base Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  placeholder="29.99"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            {/* Availability */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Availability</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setField("available", true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    form.available
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  <Eye className="w-4 h-4" /> Visible
                </button>
                <button
                  type="button"
                  onClick={() => setField("available", false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                    !form.available
                      ? "border-gray-400 bg-gray-100 text-gray-700"
                      : "border-gray-200 bg-white text-gray-400"
                  }`}
                >
                  <EyeOff className="w-4 h-4" /> Hidden
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Image</label>
              <div className="flex gap-4 items-start">
                {/* Preview */}
                <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center">
                  {form.imageUrl && isWebUrl(form.imageUrl) ? (
                    <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : form.imageUrl && isStorageUrl(form.imageUrl) ? (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                      <span className="text-xs text-green-600 font-semibold">Uploaded ✓</span>
                    </div>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-200" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl px-4 py-5 cursor-pointer transition-all ${
                      dragOver
                        ? "border-red-400 bg-red-50"
                        : "border-gray-300 hover:border-red-400 bg-gray-50 hover:bg-red-50"
                    }`}
                  >
                    {uploading ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm font-semibold">Uploading…</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-sm font-semibold text-gray-600">
                          Drop image here or <span className="text-red-600">click to browse</span>
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, WebP — max 10 MB</span>
                      </>
                    )}
                  </div>
                  <div className="text-center text-xs text-gray-400">— or paste an image URL —</div>
                  <input
                    type="url"
                    value={isStorageUrl(form.imageUrl) ? "" : form.imageUrl}
                    onChange={(e) => setField("imageUrl", e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm ${
                saving
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : editingId ? "Update Product" : "Create Product"}
            </button>
            <button
              onClick={closeForm}
              className="border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-52"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat("")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              !filterCat
                ? "bg-[#0f1e3c] text-white border-[#0f1e3c]"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All ({products.length})
          </button>
          {CATEGORIES.map((c) => {
            const cnt = products.filter((p) => p.category === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(filterCat === c.value ? "" : c.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  filterCat === c.value
                    ? `${c.color} border-current`
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {c.label.split(" ")[0]} ({cnt})
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} of {products.length} product{products.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                <div className="h-3.5 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <ImageIcon className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-semibold">No products found</p>
          {(search || filterCat) ? (
            <button
              onClick={() => { setSearch(""); setFilterCat(""); }}
              className="mt-3 text-sm text-red-600 hover:text-red-700 font-bold"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors mx-auto text-sm"
            >
              <Plus className="w-4 h-4" /> Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-all group ${
                product.available ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"
              }`}
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                {product.imageUrl && isWebUrl(product.imageUrl) ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <ImageIcon className="w-10 h-10 text-gray-200" />
                    {product.imageUrl && isStorageUrl(product.imageUrl) && (
                      <span className="text-xs text-gray-400 font-medium">Stored image</span>
                    )}
                  </div>
                )}
                {!product.available && (
                  <div className="absolute top-2 left-2 bg-gray-800/80 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <EyeOff className="w-2.5 h-2.5" /> Hidden
                  </div>
                )}
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleEdit(product)}
                    className="bg-white text-gray-900 rounded-xl p-2 shadow-lg hover:bg-gray-50 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleAvailable(product)}
                    className="bg-white text-gray-900 rounded-xl p-2 shadow-lg hover:bg-gray-50 transition-colors"
                    title={product.available ? "Hide from store" : "Show in store"}
                  >
                    {product.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-red-600 text-white rounded-xl p-2 shadow-lg hover:bg-red-700 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1.5 ${catColor(product.category)}`}>
                  {catLabel(product.category).split(" ")[0]}
                </span>
                <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1 mb-1">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="font-black text-gray-900 text-sm">${product.price.toFixed(2)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1 text-gray-400 hover:text-[#0f1e3c] rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleAvailable(product)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      title={product.available ? "Hide" : "Show"}
                    >
                      {product.available
                        ? <ToggleRight className="w-3.5 h-3.5 text-green-500" />
                        : <ToggleLeft className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
