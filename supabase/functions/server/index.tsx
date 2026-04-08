import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";
import * as db from "./db.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-User-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET_NAME = "make-991222a2-designs";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

async function getUser(c: any) {
  // User JWT travels in X-User-Token (safe from gateway rejection).
  // Fall back to stripping Authorization so existing callers still work.
  const token =
    c.req.header("X-User-Token") ||
    (c.req.header("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token === "") return null;
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) {
    console.log("getUser error:", error.message);
    return null;
  }
  return user;
}

async function getUserProfile(userId: string) {
  return await db.get(`userprofile:${userId}`);
}

async function isManagerUser(user: any): Promise<boolean> {
  if (!user) return false;
  const profile = await getUserProfile(user.id);
  return profile?.role === "manager";
}

async function isManager(c: any): Promise<boolean> {
  const user = await getUser(c);
  return isManagerUser(user);
}

async function resolveImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl || !imageUrl.startsWith("storage:")) return imageUrl;
  const path = imageUrl.replace("storage:", "");
  const supabase = getServiceClient();
  const { data } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);
  return data?.signedUrl || imageUrl;
}

async function resolveProduct(product: any) {
  if (!product) return product;
  return { ...product, imageUrl: await resolveImageUrl(product.imageUrl) };
}

// ─── STARTUP: init storage bucket ────────────────────────────────────────────

(async () => {
  try {
    const supabase = getServiceClient();
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);
    if (!exists) {
      await supabase.storage.createBucket(BUCKET_NAME);
      console.log(`Created bucket: ${BUCKET_NAME}`);
    }
  } catch (e) {
    console.log("Bucket init error:", e);
  }
})();

// ─── HEALTH ──────────────────────────────────────────────────────────────────

app.get("/make-server-991222a2/health", (c) => c.json({ status: "ok" }));

// ─── AUTH ────────────────────────────────────────────────────────────────────

app.post("/make-server-991222a2/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;
    if (!email || !password || !name)
      return c.json({ error: "Email, password, and name are required" }, 400);

    const supabase = getServiceClient();
    let userId: string;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      // If the auth user already exists (e.g. a previous attempt failed mid-way
      // after creating the auth row but before writing the profile), look up
      // the existing user so we can still upsert the profile below.
      if (!error.message.toLowerCase().includes("already registered")) {
        return c.json({ error: `Signup error: ${error.message}` }, 400);
      }
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) return c.json({ error: `Signup error: ${error.message}` }, 400);
      userId = existing.id;
    } else {
      userId = data.user.id;
    }

    await db.set(`userprofile:${userId}`, {
      id: userId,
      name,
      email,
      role: "customer",
      phone: "",
      createdAt: new Date().toISOString(),
    }, userId);
    return c.json({ success: true, userId });
  } catch (e) {
    console.log("Signup error:", e);
    return c.json({ error: `Signup failed: ${e}` }, 500);
  }
});

app.post("/make-server-991222a2/auth/manager-signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, managerCode } = body;
    if ((managerCode ?? "").trim().toUpperCase() !== "PRINTIT2024")
      return c.json({ error: "Invalid manager access code" }, 403);

    const supabase = getServiceClient();
    let userId: string;

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true,
    });

    if (error) {
      // If the auth user already exists (e.g. a previous attempt failed mid-way),
      // find them so we can still write / overwrite the manager profile.
      if (!error.message.toLowerCase().includes("already registered")) {
        return c.json({ error: `Manager signup error: ${error.message}` }, 400);
      }
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u: any) => u.email === email);
      if (!existing) return c.json({ error: `Manager signup error: ${error.message}` }, 400);
      userId = existing.id;
    } else {
      userId = data.user.id;
    }

    await db.set(`userprofile:${userId}`, {
      id: userId,
      name,
      email,
      role: "manager",
      phone: "",
      createdAt: new Date().toISOString(),
    }, userId);
    return c.json({ success: true, userId });
  } catch (e) {
    console.log("Manager signup error:", e);
    return c.json({ error: `Manager signup failed: ${e}` }, 500);
  }
});

// ─── USER PROFILE ─────────────────────────────────────────────────────────────

app.get("/make-server-991222a2/user/profile", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  let profile = await getUserProfile(user.id);
  if (!profile) {
    profile = {
      id: user.id,
      name: user.user_metadata?.name || "",
      email: user.email,
      role: "customer",
      phone: "",
      createdAt: new Date().toISOString(),
    };
    await db.set(`userprofile:${user.id}`, profile, user.id);
  }
  return c.json(profile);
});

app.put("/make-server-991222a2/user/profile", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const updates = await c.req.json();
  const existing = (await getUserProfile(user.id)) || {};
  const updated = {
    ...existing,
    ...updates,
    id: user.id,
    role: existing.role || "customer",
  };
  await db.set(`userprofile:${user.id}`, updated, user.id);
  return c.json(updated);
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

app.get("/make-server-991222a2/products", async (c) => {
  try {
    const products = await db.getByPrefix("product:");
    const resolved = await Promise.all((products || []).map(resolveProduct));
    return c.json(resolved.filter(Boolean));
  } catch (e) {
    console.log("Get products error:", e);
    return c.json({ error: `Failed to get products: ${e}` }, 500);
  }
});

app.get("/make-server-991222a2/products/category/:category", async (c) => {
  try {
    const category = c.req.param("category");
    const products = await db.getByPrefix("product:");
    const filtered = (products || []).filter(
      (p: any) => p.category === category
    );
    const resolved = await Promise.all(filtered.map(resolveProduct));
    return c.json(resolved.filter(Boolean));
  } catch (e) {
    return c.json({ error: `Failed to get products by category: ${e}` }, 500);
  }
});

app.get("/make-server-991222a2/products/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const product = await db.get(`product:${id}`);
    if (!product) return c.json({ error: "Product not found" }, 404);
    return c.json(await resolveProduct(product));
  } catch (e) {
    return c.json({ error: `Failed to get product: ${e}` }, 500);
  }
});

app.post("/make-server-991222a2/products", async (c) => {
  if (!(await isManager(c)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const product = {
      id,
      ...data,
      available: data.available !== undefined ? data.available : true,
      createdAt: new Date().toISOString(),
    };
    await db.set(`product:${id}`, product);
    return c.json(product);
  } catch (e) {
    return c.json({ error: `Failed to create product: ${e}` }, 500);
  }
});

app.put("/make-server-991222a2/products/:id", async (c) => {
  if (!(await isManager(c)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const id = c.req.param("id");
    const existing = await db.get(`product:${id}`);
    if (!existing) return c.json({ error: "Product not found" }, 404);
    const updates = await c.req.json();
    const updated = { ...existing, ...updates, id };
    await db.set(`product:${id}`, updated);
    return c.json(updated);
  } catch (e) {
    return c.json({ error: `Failed to update product: ${e}` }, 500);
  }
});

app.delete("/make-server-991222a2/products/:id", async (c) => {
  if (!(await isManager(c)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const id = c.req.param("id");
    await db.del(`product:${id}`);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: `Failed to delete product: ${e}` }, 500);
  }
});

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────

app.post("/make-server-991222a2/upload-image", async (c) => {
  if (!(await isManager(c)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    if (!file) return c.json({ error: "No file provided" }, 400);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `designs/${crypto.randomUUID()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const supabase = getServiceClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, arrayBuffer, { contentType: file.type });
    if (error)
      return c.json({ error: `Upload failed: ${error.message}` }, 500);
    const { data: signedData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, 3600);
    return c.json({
      path,
      storagePath: `storage:${path}`,
      signedUrl: signedData?.signedUrl,
    });
  } catch (e) {
    console.log("Upload error:", e);
    return c.json({ error: `Upload failed: ${e}` }, 500);
  }
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

app.post("/make-server-991222a2/orders", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const profile = await getUserProfile(user.id);
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const order = {
      id,
      userId: user.id,
      userEmail: user.email,
      userName: profile?.name || user.email,
      items: data.items,
      total: data.total,
      shippingAddress: data.shippingAddress,
      notes: data.notes || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      paymentMethod: data.paymentMethod ?? "manual",
      paymentId: data.paymentId ?? null,
      paymentStatus: data.paymentStatus ?? "unpaid",
    };
    await db.set(`order:${id}`, order, user.id);
    await notifyManagersOfNewOrder(order);
    await sendOrderConfirmationToCustomer(order);
    return c.json(order);
  } catch (e) {
    console.log("Create order error:", e);
    return c.json({ error: `Failed to create order: ${e}` }, 500);
  }
});

app.get("/make-server-991222a2/orders/my", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const orders = await db.getByPrefix("order:");
    const userOrders = (orders || []).filter(
      (o: any) => o.userId === user.id
    );
    return c.json(
      userOrders.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  } catch (e) {
    return c.json({ error: `Failed to get orders: ${e}` }, 500);
  }
});

app.get("/make-server-991222a2/orders", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const orders = await db.getByPrefix("order:");
    return c.json(
      (orders || []).sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
  } catch (e) {
    return c.json({ error: `Failed to get orders: ${e}` }, 500);
  }
});

app.put("/make-server-991222a2/orders/:id/status", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user)))
    return c.json({ error: "Unauthorized - manager access required" }, 403);
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();
    const validStatuses = [
      "pending", "confirmed", "in-production", "ready", "completed", "cancelled",
    ];
    if (!validStatuses.includes(status))
      return c.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        400
      );
    const order = await db.get(`order:${id}`);
    if (!order) return c.json({ error: "Order not found" }, 404);
    const updated = { ...order, status, updatedAt: new Date().toISOString() };
    await db.set(`order:${id}`, updated, order.userId ?? db.SYSTEM_USER_ID);
    return c.json(updated);
  } catch (e) {
    return c.json({ error: `Failed to update order status: ${e}` }, 500);
  }
});

app.delete("/make-server-991222a2/orders/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const id = c.req.param("id");
    const order = await db.get(`order:${id}`);
    if (!order) return c.json({ error: "Order not found" }, 404);

    const managerAccess = await isManagerUser(user);

    if (!managerAccess) {
      if (order.userId !== user.id)
        return c.json({ error: "Unauthorized: you do not own this order" }, 403);
      if (order.status !== "pending")
        return c.json(
          { error: `Cannot cancel order with status "${order.status}". Only pending orders can be cancelled.` },
          400
        );
    }

    await db.del(`order:${id}`);
    console.log(`Order ${id} deleted by ${managerAccess ? "manager" : "customer"} ${user.id}`);
    return c.json({ success: true, deletedOrderId: id });
  } catch (e) {
    console.log("Delete order error:", e);
    return c.json({ error: `Failed to delete order: ${e}` }, 500);
  }
});

// ─── NOTIFICATION PREFERENCES ────────────────────────────────────────────────

// Env-var fallback (still works if no KV config saved yet)
const ENV_RESEND_KEY = Deno.env.get("RESEND_API_KEY");

/** Fetch the store-wide email provider config from KV. */
async function getEmailProviderConfig(): Promise<{
  resendApiKey: string | null;
  fromName: string;
  fromAddress: string;
  siteUrl: string;
} | null> {
  try {
    const cfg = await db.get("settings:emailprovider");
    if (cfg) return { siteUrl: "", ...cfg };
    // Fall back to env-var defaults so the app works before the UI is configured
    if (ENV_RESEND_KEY) {
      return { resendApiKey: ENV_RESEND_KEY, fromName: "Print It Belton", fromAddress: "onboarding@resend.dev", siteUrl: "" };
    }
    return null;
  } catch {
    return null;
  }
}

/** Mask an API key so only the first 6 and last 4 chars are visible. */
function maskApiKey(key: string): string {
  if (!key || key.length < 12) return "••••••••••••••••";
  return key.slice(0, 6) + "•".repeat(Math.max(4, key.length - 10)) + key.slice(-4);
}

/** Send a pending-order notification email via Resend. */
async function sendPendingOrderEmail(toEmail: string, order: any, cfg: { resendApiKey: string; fromName: string; fromAddress: string }) {
  const itemsHtml = (order.items ?? [])
    .map(
      (item: any) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">$${(item.price ?? 0).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#dc2626;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">
          🖨️ New Pending Order — ${cfg.fromName}
        </h1>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
        <p style="margin:0 0 16px;color:#374151;font-size:15px;">
          A new order has been placed and is awaiting your review.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;">Item</th>
              <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;">Qty</th>
              <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
          <div>
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Order ID</p>
            <p style="margin:0;font-size:14px;color:#111827;font-weight:700;font-family:monospace;">#${order.id.slice(0,8).toUpperCase()}</p>
          </div>
          <div>
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Customer</p>
            <p style="margin:0;font-size:14px;color:#111827;font-weight:700;">${order.userName}</p>
            <p style="margin:0;font-size:12px;color:#6b7280;">${order.userEmail}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Total</p>
            <p style="margin:0;font-size:22px;color:#dc2626;font-weight:900;">$${order.total.toFixed(2)}</p>
          </div>
        </div>
        <a href="${SUPABASE_URL}/manager/orders"
           style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;">
          View Order in Dashboard →
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
          You're receiving this because you enabled pending-order notifications in your manager dashboard.
        </p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.fromName} <${cfg.fromAddress}>`,
        to: [toEmail],
        subject: `New Pending Order #${order.id.slice(0, 8).toUpperCase()} — $${order.total.toFixed(2)}`,
        html,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      console.log("Resend error:", JSON.stringify(result));
    } else {
      console.log("Notification email sent to", toEmail, "— id:", result.id);
    }
  } catch (err) {
    console.log("Failed to send notification email:", err);
  }
}

/** Fire-and-forget: notify all managers who opted in. */
async function notifyManagersOfNewOrder(order: any) {
  try {
    const cfg = await getEmailProviderConfig();
    if (!cfg?.resendApiKey) {
      console.log("No email provider configured — skipping order notification");
      return;
    }
    const allPrefs = await db.getByPrefix("notifprefs:");
    if (!allPrefs || allPrefs.length === 0) return;
    for (const pref of allPrefs) {
      if (pref?.pendingOrders && pref?.email) {
        await sendPendingOrderEmail(pref.email, order, cfg as any);
      }
    }
  } catch (err) {
    console.log("notifyManagersOfNewOrder error:", err);
  }
}

/** Send an order confirmation email to the customer. */
async function sendOrderConfirmationToCustomer(order: any) {
  try {
    const cfg = await getEmailProviderConfig();
    if (!cfg?.resendApiKey) {
      console.log("No email provider configured — skipping customer confirmation email");
      return;
    }

    const trackingUrl = cfg.siteUrl
      ? `${cfg.siteUrl.replace(/\/$/, "")}/track/${order.id}`
      : null;

    const itemsHtml = (order.items ?? [])
      .map(
        (item: any) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${item.name}${item.size ? ` <span style="color:#9ca3af;font-size:12px;">(${item.size})</span>` : ""}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">$${(item.price ?? 0).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0f1e3c;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
          <p style="margin:0 0 6px;color:#ef4444;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">Order Confirmation</p>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
            Thank you, ${order.userName.split(" ")[0]}!
          </h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">
            We've received your order and it's under review.
          </p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Order ID</p>
              <p style="margin:0;font-size:16px;font-weight:900;font-family:monospace;color:#111827;">#${order.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div style="text-align:right;">
              <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">Status</p>
              <span style="display:inline-flex;align-items:center;gap:4px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;border:1px solid #fde68a;">
                ⏳ Pending Review
              </span>
            </div>
          </div>

          <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Your Items</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align:right;padding:12px 12px 0;border-top:2px solid #f3f4f6;margin-bottom:24px;">
            <span style="font-size:12px;color:#6b7280;font-weight:600;">Total: </span>
            <span style="font-size:20px;color:#dc2626;font-weight:900;">$${order.total.toFixed(2)}</span>
          </div>

          ${trackingUrl ? `
          <a href="${trackingUrl}"
             style="display:block;text-align:center;background:#dc2626;color:#fff;font-weight:800;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;letter-spacing:-0.2px;margin-bottom:20px;">
            📦 Track My Order →
          </a>
          ` : `
          <div style="text-align:center;margin-bottom:20px;padding:14px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
            <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">Log in to your account to track this order.</p>
          </div>
          `}

          ${order.shippingAddress ? `
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
            <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Delivery / Pickup</p>
            <p style="margin:0;font-size:14px;color:#374151;">${order.shippingAddress}</p>
          </div>
          ` : ""}

          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
            Our team will review your order shortly. You'll receive updates as your order progresses through production.
          </p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Questions? Reply to this email or contact <strong>${cfg.fromName}</strong>.
          </p>
        </div>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.fromName} <${cfg.fromAddress}>`,
        to: [order.userEmail],
        subject: `Order Confirmed #${order.id.slice(0, 8).toUpperCase()} — ${cfg.fromName}`,
        html,
      }),
    });
    const result = await res.json();
    if (!res.ok) {
      console.log("Customer confirmation email Resend error:", JSON.stringify(result));
    } else {
      console.log("Order confirmation sent to", order.userEmail, "— id:", result.id);
    }
  } catch (err) {
    console.log("sendOrderConfirmationToCustomer error:", err);
  }
}

// ─── EMAIL PROVIDER SETTINGS (store-wide) ─────────────────────────────────────

app.get("/make-server-991222a2/manager/settings/email-provider", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);

  const cfg = await db.get("settings:emailprovider");
  const envKeyAvailable = !!ENV_RESEND_KEY;

  if (!cfg) {
    return c.json({
      hasKey: envKeyAvailable,
      keySource: envKeyAvailable ? "env" : "none",
      keyMasked: envKeyAvailable ? maskApiKey(ENV_RESEND_KEY!) : null,
      fromName: "Print It Belton",
      fromAddress: "onboarding@resend.dev",
    });
  }

  return c.json({
    hasKey: !!(cfg.resendApiKey),
    keySource: "kv",
    keyMasked: cfg.resendApiKey ? maskApiKey(cfg.resendApiKey) : null,
    fromName: cfg.fromName || "Print It Belton",
    fromAddress: cfg.fromAddress || "onboarding@resend.dev",
    siteUrl: cfg.siteUrl || "",
    updatedAt: cfg.updatedAt,
    updatedBy: cfg.updatedBy,
  });
});

app.put("/make-server-991222a2/manager/settings/email-provider", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);

  try {
    const body = await c.req.json();
    const existing = await db.get("settings:emailprovider");

    // Only update the key if a new non-masked value is provided
    const newKey = body.resendApiKey;
    const isNewKey = newKey && !newKey.includes("•") && newKey.trim() !== "";
    const resendApiKey = isNewKey ? newKey.trim() : (existing?.resendApiKey ?? null);

    const cfg = {
      resendApiKey,
      fromName: (body.fromName ?? existing?.fromName ?? "Print It Belton").trim(),
      fromAddress: (body.fromAddress ?? existing?.fromAddress ?? "onboarding@resend.dev").trim(),
      siteUrl: (body.siteUrl ?? existing?.siteUrl ?? "").trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };

    await db.set("settings:emailprovider", cfg, user.id);
    console.log(`Email provider config updated by ${user.email}`);

    return c.json({
      hasKey: !!resendApiKey,
      keySource: "kv",
      keyMasked: resendApiKey ? maskApiKey(resendApiKey) : null,
      fromName: cfg.fromName,
      fromAddress: cfg.fromAddress,
      siteUrl: cfg.siteUrl,
      updatedAt: cfg.updatedAt,
      updatedBy: cfg.updatedBy,
    });
  } catch (e) {
    console.log("Update email provider config error:", e);
    return c.json({ error: `Failed to update email provider config: ${e}` }, 500);
  }
});

app.delete("/make-server-991222a2/manager/settings/email-provider/key", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);

  try {
    const existing = await db.get("settings:emailprovider");
    const cfg = {
      ...(existing ?? {}),
      resendApiKey: null,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };
    await db.set("settings:emailprovider", cfg, user.id);
    console.log(`Email provider API key removed by ${user.email}`);
    return c.json({ success: true, hasKey: false });
  } catch (e) {
    return c.json({ error: `Failed to remove API key: ${e}` }, 500);
  }
});

app.post("/make-server-991222a2/manager/settings/test-email", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);

  try {
    const cfg = await getEmailProviderConfig();
    if (!cfg?.resendApiKey) {
      return c.json({ error: "No API key configured. Save an API key first." }, 400);
    }

    const { toEmail } = await c.req.json().catch(() => ({}));
    const recipient = toEmail || user.email;

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#0f1e3c;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:18px;font-weight:900;">
            ✅ Test Email — ${cfg.fromName}
          </h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 12px;color:#374151;font-size:15px;">
            Your email notification system is working correctly.
          </p>
          <p style="margin:0 0 20px;color:#6b7280;font-size:13px;">
            When a customer places an order and you have pending-order alerts enabled, you will receive a notification at this address.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
            <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:700;text-transform:uppercase;">Sent via</p>
            <p style="margin:0;font-size:13px;color:#374151;font-weight:600;">${cfg.fromName} &lt;${cfg.fromAddress}&gt;</p>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">
            Sent from your Print It Belton Manager Dashboard.
          </p>
        </div>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${cfg.fromName} <${cfg.fromAddress}>`,
        to: [recipient],
        subject: `✅ Test Email from ${cfg.fromName} Dashboard`,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.log("Test email Resend error:", JSON.stringify(result));
      return c.json({ error: `Resend rejected the request: ${result?.message ?? JSON.stringify(result)}` }, 400);
    }

    console.log(`Test email sent to ${recipient} by ${user.email} — id:`, result.id);
    return c.json({ success: true, sentTo: recipient, messageId: result.id });
  } catch (e) {
    console.log("Test email error:", e);
    return c.json({ error: `Failed to send test email: ${e}` }, 500);
  }
});

// ─── NOTIFICATION PREFERENCES (per-manager) ───────────────────────────────────

app.get("/make-server-991222a2/manager/notification-prefs", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user)))
    return c.json({ error: "Manager access required" }, 403);
  const prefs = await db.get(`notifprefs:${user.id}`);
  // Return prefs (or sensible defaults)
  return c.json(prefs ?? { pendingOrders: false, email: user.email });
});

app.put("/make-server-991222a2/manager/notification-prefs", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user)))
    return c.json({ error: "Manager access required" }, 403);
  try {
    const body = await c.req.json();
    const prefs = {
      userId: user.id,
      email: body.email ?? user.email,
      pendingOrders: !!body.pendingOrders,
      updatedAt: new Date().toISOString(),
    };
    await db.set(`notifprefs:${user.id}`, prefs, user.id);
    console.log(`Notification prefs updated for ${user.email}:`, prefs);
    return c.json(prefs);
  } catch (e) {
    console.log("Update notification prefs error:", e);
    return c.json({ error: `Failed to update prefs: ${e}` }, 500);
  }
});

// ─── MANAGER REPAIR ──────────────────────────────────────────────────────────
// Allows an existing auth user to re-apply for manager role by providing the
// correct access code.  Safe to call multiple times (idempotent).

app.post("/make-server-991222a2/auth/make-manager", async (c) => {
  try {
    const { userToken, managerCode } = await c.req.json();

    // Verify the user JWT directly with the service-role client —
    // this bypasses the Supabase gateway JWT check that was causing 401s.
    const supabaseAdmin = getServiceClient();
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken ?? "");
    if (userError || !user) {
      console.log("make-manager: invalid userToken —", userError?.message);
      return c.json({ error: "Session invalid or expired — please sign out and sign in again." }, 401);
    }

    // Get the current access code from KV store
    const codeConfig = await db.get("manager:access-code");
    const currentCode = (codeConfig?.code ?? "PRINTIT2024").trim().toUpperCase();

    const received = (managerCode ?? "").trim().toUpperCase();
    console.log(`make-manager: user=${user.email}, code="${received}"`);
    if (received !== currentCode)
      return c.json({ error: `Invalid manager access code (received: "${received}")` }, 403);

    const existing = await db.get(`userprofile:${user.id}`);
    const profile = {
      ...(existing || {}),
      id: user.id,
      name: existing?.name || user.user_metadata?.name || user.email,
      email: user.email,
      role: "manager",
      phone: existing?.phone || "",
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    await db.set(`userprofile:${user.id}`, profile, user.id);
    console.log(`User ${user.id} (${user.email}) upgraded to manager`);
    return c.json({ success: true, profile });
  } catch (e) {
    console.log("make-manager error:", e);
    return c.json({ error: `Failed to apply manager role: ${e}` }, 500);
  }
});

// ─── MANAGER ACCESS CODE ──────────────────────────────────────────────────────
// Get and update the manager access code (only callable by managers)

app.get("/make-server-991222a2/manager/settings/access-code", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await getUserProfile(user.id);
    if (profile?.role !== "manager") {
      return c.json({ error: "Forbidden: Only managers can access this" }, 403);
    }

    const codeConfig = await db.get("manager:access-code");
    const code = codeConfig?.code ?? "PRINTIT2024";
    const lastChangedBy = codeConfig?.lastChangedBy;
    const lastChangedAt = codeConfig?.lastChangedAt;

    return c.json({
      code: code,
      lastChangedBy,
      lastChangedAt,
    });
  } catch (e) {
    console.log("get access-code error:", e);
    return c.json({ error: `Failed to get access code: ${e}` }, 500);
  }
});

app.put("/make-server-991222a2/manager/settings/access-code", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await getUserProfile(user.id);
    if (profile?.role !== "manager") {
      return c.json({ error: "Forbidden: Only managers can access this" }, 403);
    }

    const { newCode } = await c.req.json();
    if (!newCode || typeof newCode !== "string") {
      return c.json({ error: "Invalid request: newCode must be a non-empty string" }, 400);
    }

    const sanitized = newCode.trim().toUpperCase();
    if (sanitized.length < 4) {
      return c.json({ error: "Access code must be at least 4 characters long" }, 400);
    }

    if (sanitized.length > 50) {
      return c.json({ error: "Access code must be no more than 50 characters long" }, 400);
    }

    const codeConfig = {
      code: sanitized,
      lastChangedBy: profile.name || user.email,
      lastChangedAt: new Date().toISOString(),
    };

    await db.set("manager:access-code", codeConfig, user.id);
    console.log(`Manager access code changed by ${user.email}`);

    return c.json({
      success: true,
      code: sanitized,
      lastChangedBy: profile.name || user.email,
      lastChangedAt: codeConfig.lastChangedAt,
    });
  } catch (e) {
    console.log("put access-code error:", e);
    return c.json({ error: `Failed to update access code: ${e}` }, 500);
  }
});

// ─── SEED DATA ────────────────────────────────────────────────────────────────

app.post("/make-server-991222a2/seed", async (c) => {
  try {
    const existing = await db.getByPrefix("product:");
    if (existing && existing.length > 0)
      return c.json({ message: "Already seeded", count: existing.length });

    const seedProducts = [
      {
        id: "seed-tshirt-1",
        name: "Classic Logo Tee",
        category: "t-shirts",
        description: "Premium 100% cotton t-shirt featuring your custom logo or design in vivid, long-lasting print.",
        price: 24.99,
        imageUrl: "https://images.unsplash.com/photo-1738636591539-18fe0e351c0d?w=600",
        available: true,
      },
      {
        id: "seed-tshirt-2",
        name: "Sports Team Jersey",
        category: "t-shirts",
        description: "Moisture-wicking performance jersey with custom numbers and names — perfect for teams and leagues.",
        price: 39.99,
        imageUrl: "https://images.unsplash.com/photo-1773098577991-699f54a55e22?w=600",
        available: true,
      },
      {
        id: "seed-tshirt-3",
        name: "Custom Embroidered Polo",
        category: "t-shirts",
        description: "Professional-grade embroidered polo shirts ideal for corporate events, staff uniforms, and trade shows.",
        price: 44.99,
        imageUrl: "https://images.unsplash.com/photo-1758813531001-3af022b8f449?w=600",
        available: true,
      },
      {
        id: "seed-tshirt-4",
        name: "All-Over Sublimation Tee",
        category: "t-shirts",
        description: "Full-color all-over sublimation printing for maximum visual impact — no design limits.",
        price: 34.99,
        imageUrl: "https://images.unsplash.com/photo-1676474506761-c10692809fd9?w=600",
        available: true,
      },
      {
        id: "seed-vehicle-1",
        name: "Full Vehicle Wrap",
        category: "vehicle-graphics",
        description: "Complete vehicle transformation with premium cast vinyl wrapping — turn your vehicle into a moving billboard.",
        price: 2499.99,
        imageUrl: "https://images.unsplash.com/photo-1770383912786-39816ce1e607?w=600",
        available: true,
      },
      {
        id: "seed-vehicle-2",
        name: "Fleet Truck Decals",
        category: "vehicle-graphics",
        description: "Bold commercial branding graphics for trucks, vans, and fleet vehicles. Durable outdoor-grade vinyl.",
        price: 799.99,
        imageUrl: "https://images.unsplash.com/photo-1573495407648-e62631194e2e?w=600",
        available: true,
      },
      {
        id: "seed-vehicle-3",
        name: "Window & Bumper Decals",
        category: "vehicle-graphics",
        description: "Custom cut vinyl decals for windows, bumpers, and body panels — perfect for personal or business use.",
        price: 49.99,
        imageUrl: "https://images.unsplash.com/photo-1605513524006-063ed6ed31e7?w=600",
        available: true,
      },
      {
        id: "seed-sign-1",
        name: "Vinyl Event Banner",
        category: "signs-banners",
        description: "Large-format vinyl banners with grommets — ideal for events, promotions, grand openings, and trade shows.",
        price: 89.99,
        imageUrl: "https://images.unsplash.com/photo-1700667877838-e9c93ca95f05?w=600",
        available: true,
      },
      {
        id: "seed-sign-2",
        name: "Yard & Real Estate Signs",
        category: "signs-banners",
        description: "Weather-resistant corrugated plastic signs for real estate listings, political campaigns, and events.",
        price: 29.99,
        imageUrl: "https://images.unsplash.com/photo-1628077445456-34d5d9991da7?w=600",
        available: true,
      },
      {
        id: "seed-sign-3",
        name: "Business Storefront Sign",
        category: "signs-banners",
        description: "Professional illuminated or flat-panel storefront signs to make your business stand out.",
        price: 199.99,
        imageUrl: "https://images.unsplash.com/photo-1664079555378-54fc572639b8?w=600",
        available: true,
      },
      {
        id: "seed-wall-1",
        name: "Office Wall Mural",
        category: "wall-wraps",
        description: "Transform any workspace with a stunning custom wall mural — brand graphics, inspirational art, or scenic imagery.",
        price: 599.99,
        imageUrl: "https://images.unsplash.com/photo-1599580546605-a86af98dbdb0?w=600",
        available: true,
      },
      {
        id: "seed-wall-2",
        name: "Retail Display Wall",
        category: "wall-wraps",
        description: "High-impact retail wall graphics designed to attract customers, tell your brand story, and boost sales.",
        price: 449.99,
        imageUrl: "https://images.unsplash.com/photo-1773499129567-ebf8268defd0?w=600",
        available: true,
      },
    ];

    await Promise.all(
      seedProducts.map((p) =>
        db.set(`product:${p.id}`, { ...p, createdAt: new Date().toISOString() })
      )
    );
    return c.json({ message: "Seeded successfully", count: seedProducts.length });
  } catch (e) {
    console.log("Seed error:", e);
    return c.json({ error: `Seed failed: ${e}` }, 500);
  }
});

// ─── PUBLIC ORDER TRACKING ────────────────────────────────────────────────────
// No auth required — order UUID acts as an unguessable secret link.

app.get("/make-server-991222a2/track/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const order = await db.get(`order:${id}`);
    if (!order) return c.json({ error: "Order not found" }, 404);
    // Return a safe subset — no userId, no full email beyond first/last chars
    const emailPreview = order.userEmail
      ? order.userEmail.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : null;
    return c.json({
      id: order.id,
      status: order.status,
      items: order.items,
      total: order.total,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customerName: order.userName,
      customerEmailPreview: emailPreview,
    });
  } catch (e) {
    console.log("Track order error:", e);
    return c.json({ error: `Failed to load order: ${e}` }, 500);
  }
});

// ─── PAYMENT GATEWAY SETTINGS ─────────────────────────────────────────────────

async function getPayPalAccessToken(clientId: string, clientSecret: string, sandbox: boolean): Promise<string | null> {
  try {
    const base = sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const creds = btoa(`${clientId}:${clientSecret}`);
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: { "Authorization": `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const data = await res.json();
    if (!res.ok) { console.log("PayPal token error:", JSON.stringify(data)); return null; }
    return data.access_token;
  } catch (e) { console.log("getPayPalAccessToken error:", e); return null; }
}

app.get("/make-server-991222a2/manager/settings/payment", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);
  const cfg = await db.get("settings:paymentgateway") ?? {};
  return c.json({
    enabledMethods: cfg.enabledMethods ?? ["manual"],
    stripe: { enabled: cfg.stripe?.enabled ?? false, publishableKey: cfg.stripe?.publishableKey ?? "", secretKeyMasked: cfg.stripe?.secretKey ? maskApiKey(cfg.stripe.secretKey) : null, hasSecretKey: !!(cfg.stripe?.secretKey) },
    paypal: { enabled: cfg.paypal?.enabled ?? false, clientId: cfg.paypal?.clientId ?? "", clientSecretMasked: cfg.paypal?.clientSecret ? maskApiKey(cfg.paypal.clientSecret) : null, hasClientSecret: !!(cfg.paypal?.clientSecret), sandbox: cfg.paypal?.sandbox ?? true },
    manual: { enabled: cfg.manual?.enabled ?? true, instructions: cfg.manual?.instructions ?? "Pay in-store at pickup, or we will send an invoice." },
    updatedAt: cfg.updatedAt,
    updatedBy: cfg.updatedBy,
  });
});

app.put("/make-server-991222a2/manager/settings/payment", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await isManagerUser(user))) return c.json({ error: "Manager access required" }, 403);
  try {
    const body = await c.req.json();
    const existing = await db.get("settings:paymentgateway") ?? {};
    const newSS = body.stripe?.secretKey;
    const stripeSecretKey = (newSS && !newSS.includes("•") && newSS.trim()) ? newSS.trim() : (existing.stripe?.secretKey ?? null);
    const newPS = body.paypal?.clientSecret;
    const paypalClientSecret = (newPS && !newPS.includes("•") && newPS.trim()) ? newPS.trim() : (existing.paypal?.clientSecret ?? null);
    const cfg = {
      stripe: { enabled: body.stripe?.enabled ?? existing.stripe?.enabled ?? false, publishableKey: (body.stripe?.publishableKey ?? existing.stripe?.publishableKey ?? "").trim(), secretKey: stripeSecretKey },
      paypal: { enabled: body.paypal?.enabled ?? existing.paypal?.enabled ?? false, clientId: (body.paypal?.clientId ?? existing.paypal?.clientId ?? "").trim(), clientSecret: paypalClientSecret, sandbox: body.paypal?.sandbox ?? existing.paypal?.sandbox ?? true },
      manual: { enabled: body.manual?.enabled ?? existing.manual?.enabled ?? true, instructions: (body.manual?.instructions ?? existing.manual?.instructions ?? "Pay in-store at pickup, or we will send an invoice.").trim() },
      enabledMethods: [...(body.stripe?.enabled ? ["stripe"] : []), ...(body.paypal?.enabled ? ["paypal"] : []), ...((body.manual?.enabled ?? true) ? ["manual"] : [])],
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    };
    await db.set("settings:paymentgateway", cfg, user.id);
    console.log(`Payment gateway config updated by ${user.email}`);
    return c.json({
      enabledMethods: cfg.enabledMethods,
      stripe: { enabled: cfg.stripe.enabled, publishableKey: cfg.stripe.publishableKey, secretKeyMasked: cfg.stripe.secretKey ? maskApiKey(cfg.stripe.secretKey) : null, hasSecretKey: !!(cfg.stripe.secretKey) },
      paypal: { enabled: cfg.paypal.enabled, clientId: cfg.paypal.clientId, clientSecretMasked: cfg.paypal.clientSecret ? maskApiKey(cfg.paypal.clientSecret) : null, hasClientSecret: !!(cfg.paypal.clientSecret), sandbox: cfg.paypal.sandbox },
      manual: cfg.manual,
      updatedAt: cfg.updatedAt,
      updatedBy: cfg.updatedBy,
    });
  } catch (e) {
    console.log("Update payment config error:", e);
    return c.json({ error: `Failed to update payment config: ${e}` }, 500);
  }
});

app.get("/make-server-991222a2/payment/config", async (c) => {
  try {
    const cfg = await db.get("settings:paymentgateway") ?? {};
    return c.json({
      enabledMethods: cfg.enabledMethods ?? ["manual"],
      stripe: cfg.stripe?.enabled ? { publishableKey: cfg.stripe.publishableKey ?? "" } : null,
      paypal: cfg.paypal?.enabled ? { clientId: cfg.paypal.clientId ?? "", sandbox: cfg.paypal.sandbox ?? true } : null,
      manual: (cfg.manual?.enabled !== false) ? { instructions: cfg.manual?.instructions ?? "Pay in-store at pickup, or we will send an invoice." } : null,
    });
  } catch (e) { return c.json({ error: `Failed to load payment config: ${e}` }, 500); }
});

app.post("/make-server-991222a2/payment/stripe/create-intent", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const cfg = await db.get("settings:paymentgateway");
    if (!cfg?.stripe?.enabled || !cfg.stripe?.secretKey) return c.json({ error: "Stripe is not configured" }, 400);
    const { amount } = await c.req.json();
    if (!amount || amount <= 0) return c.json({ error: "Invalid amount" }, 400);
    const params = new URLSearchParams({ amount: String(Math.round(amount * 100)), currency: "usd", "automatic_payment_methods[enabled]": "true", description: "Print It Belton — Order payment", "metadata[userId]": user.id, "metadata[userEmail]": user.email ?? "" });
    const res = await fetch("https://api.stripe.com/v1/payment_intents", { method: "POST", headers: { "Authorization": `Bearer ${cfg.stripe.secretKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    const intent = await res.json();
    if (!res.ok) { console.log("Stripe create intent error:", JSON.stringify(intent)); return c.json({ error: intent.error?.message ?? "Stripe error" }, 400); }
    console.log(`Stripe PaymentIntent ${intent.id} created for $${amount} by ${user.email}`);
    return c.json({ clientSecret: intent.client_secret, intentId: intent.id });
  } catch (e) { console.log("Stripe create-intent error:", e); return c.json({ error: `Failed to create payment intent: ${e}` }, 500); }
});

app.post("/make-server-991222a2/payment/paypal/create-order", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const cfg = await db.get("settings:paymentgateway");
    if (!cfg?.paypal?.enabled || !cfg.paypal?.clientId || !cfg.paypal?.clientSecret) return c.json({ error: "PayPal is not configured" }, 400);
    const { amount } = await c.req.json();
    if (!amount || amount <= 0) return c.json({ error: "Invalid amount" }, 400);
    const token = await getPayPalAccessToken(cfg.paypal.clientId, cfg.paypal.clientSecret, cfg.paypal.sandbox);
    if (!token) return c.json({ error: "Failed to authenticate with PayPal" }, 500);
    const base = cfg.paypal.sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const res = await fetch(`${base}/v2/checkout/orders`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ amount: { currency_code: "USD", value: Number(amount).toFixed(2) }, description: "Print It Belton Order" }] }) });
    const order = await res.json();
    if (!res.ok) { console.log("PayPal create order error:", JSON.stringify(order)); return c.json({ error: order.message ?? "PayPal error" }, 400); }
    console.log(`PayPal order ${order.id} created for $${amount} by ${user.email}`);
    return c.json({ id: order.id });
  } catch (e) { console.log("PayPal create-order error:", e); return c.json({ error: `Failed to create PayPal order: ${e}` }, 500); }
});

app.post("/make-server-991222a2/payment/paypal/capture/:paypalOrderId", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  try {
    const cfg = await db.get("settings:paymentgateway");
    if (!cfg?.paypal?.clientId || !cfg.paypal?.clientSecret) return c.json({ error: "PayPal is not configured" }, 400);
    const paypalOrderId = c.req.param("paypalOrderId");
    const token = await getPayPalAccessToken(cfg.paypal.clientId, cfg.paypal.clientSecret, cfg.paypal.sandbox);
    if (!token) return c.json({ error: "Failed to authenticate with PayPal" }, 500);
    const base = cfg.paypal.sandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
    const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } });
    const capture = await res.json();
    if (!res.ok) { console.log("PayPal capture error:", JSON.stringify(capture)); return c.json({ error: capture.message ?? "PayPal capture failed" }, 400); }
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    console.log(`PayPal capture ${captureId}: ${capture.status} by ${user.email}`);
    return c.json({ status: capture.status, captureId, orderId: paypalOrderId });
  } catch (e) { console.log("PayPal capture error:", e); return c.json({ error: `Failed to capture PayPal payment: ${e}` }, 500); }
});

// ─── FALLBACKS (must be after all routes) ────────────────────────────────────
// Ensures the server always returns JSON — never plain-text "404 Not Found"
// or "Internal Server Error" which would cause res.json() to throw a SyntaxError.

app.notFound((c) => {
  console.log("404 not found:", c.req.method, c.req.url);
  return c.json({ error: `Route not found: ${c.req.method} ${new URL(c.req.url).pathname}` }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled server error:", err);
  return c.json({ error: err.message || "Internal server error" }, 500);
});

Deno.serve(app.fetch);