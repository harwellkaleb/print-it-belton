# Print It Belton — Database Schema Reference

## ⚠️ Important Note About the Current Implementation

The live app currently uses a **Key-Value (KV) store** — a single flexible table (`kv_store_991222a2`) that ships pre-configured with this project. **No setup is required for the app to work as-is.**

This document serves two purposes:
1. Describe how data is structured inside the KV store right now
2. Provide equivalent **SQL table schemas** you can reference if you ever want to migrate to a fully relational Postgres setup in Supabase

> ⚠️ Migrating to custom Postgres tables would require rewriting the backend server. The current code would no longer work without that rewrite.

---

## Part 1 — Current KV Store Structure

All data is stored as JSON values with prefixed string keys in the `kv_store_991222a2` table.

### Key Naming Conventions

| Prefix | Description | Example Key |
|---|---|---|
| `product:{id}` | A single product/design | `product:seed-tshirt-1` |
| `order:{id}` | A single order | `order:3f2a1b...` |
| `userprofile:{userId}` | A user's profile | `userprofile:ab12cd...` |

---

### Product Object

Stored at key: `product:{uuid}`

```json
{
  "id": "seed-tshirt-1",
  "name": "Classic Logo Tee",
  "category": "t-shirts",
  "description": "Premium 100% cotton t-shirt with your custom logo.",
  "price": 24.99,
  "imageUrl": "https://... OR storage:/designs/uuid.jpg",
  "available": true,
  "createdAt": "2025-04-06T00:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID or slug (e.g. `seed-tshirt-1`) |
| `name` | string | Product display name |
| `category` | string | One of: `t-shirts`, `vehicle-graphics`, `signs-banners`, `wall-wraps` |
| `description` | string | Full product description |
| `price` | number | Base price in USD |
| `imageUrl` | string | Either a full URL or `storage:{path}` for uploaded images |
| `available` | boolean | Whether the product is shown to customers |
| `createdAt` | ISO 8601 string | Creation timestamp |

---

### Order Object

Stored at key: `order:{uuid}`

```json
{
  "id": "3f2a1b00-...",
  "userId": "ab12cd34-...",
  "userEmail": "customer@example.com",
  "userName": "Jane Smith",
  "items": [
    {
      "productId": "seed-tshirt-1",
      "name": "Classic Logo Tee",
      "category": "t-shirts",
      "quantity": 3,
      "price": 24.99,
      "size": "L",
      "color": "Black",
      "notes": "Please print in white ink"
    }
  ],
  "total": 74.97,
  "shippingAddress": "In-Store Pickup - Belton, TX",
  "notes": "Need by Friday",
  "status": "pending",
  "createdAt": "2025-04-06T10:00:00.000Z",
  "updatedAt": "2025-04-06T11:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `userId` | string | Supabase Auth user ID |
| `userEmail` | string | Customer email |
| `userName` | string | Customer display name |
| `items` | array | See Order Item structure below |
| `total` | number | Sum of all item subtotals |
| `shippingAddress` | string | Delivery address or "In-Store Pickup" |
| `notes` | string | Customer notes for the whole order |
| `status` | string | See status values below |
| `createdAt` | ISO 8601 string | When order was placed |
| `updatedAt` | ISO 8601 string | Last status change timestamp |

**Order Item fields:**

| Field | Type | Notes |
|---|---|---|
| `productId` | string | References a product key |
| `name` | string | Product name at time of order |
| `category` | string | Product category |
| `quantity` | number | Number of units |
| `price` | number | Unit price at time of order |
| `size` | string (optional) | e.g. `L`, `2XL`, `3'x6'` |
| `color` | string (optional) | Garment color preference |
| `notes` | string (optional) | Per-item design instructions |

**Order Status Values:**

| Value | Meaning |
|---|---|
| `pending` | Just placed, awaiting manager review |
| `confirmed` | Manager has reviewed and confirmed |
| `in-production` | Being printed/produced |
| `ready` | Ready for pickup or delivery |
| `completed` | Fulfilled and closed |
| `cancelled` | Cancelled by manager or customer |

---

### User Profile Object

Stored at key: `userprofile:{supabase-auth-user-id}`

```json
{
  "id": "ab12cd34-...",
  "name": "Jane Smith",
  "email": "customer@example.com",
  "phone": "254-555-1234",
  "role": "customer",
  "createdAt": "2025-04-06T00:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Mirrors Supabase Auth `user.id` |
| `name` | string | Display name |
| `email` | string | Email address |
| `phone` | string | Phone number (optional) |
| `role` | string | `customer` or `manager` |
| `createdAt` | ISO 8601 string | Account creation time |

> **Manager access code:** `PRINTIT2024` — used at signup to create a manager account.

---

### File Storage

Uploaded design images are stored in Supabase Storage:

- **Bucket name:** `make-991222a2-designs`
- **Bucket type:** Private (signed URLs generated on request, valid 1 hour)
- **Upload path pattern:** `designs/{uuid}.{ext}`
- **Reference in KV:** `storage:designs/{uuid}.jpg` (the `storage:` prefix tells the API to resolve a signed URL)

---

## Part 2 — Equivalent SQL Table Schemas (Migration Reference)

> These are for **planning and reference only**. Using them requires rewriting the backend API routes from KV-store queries to SQL queries (via `supabase-js` or direct Postgres).

---

### `profiles` table
Extends Supabase Auth users.

```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'manager')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can manage own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);
```

---

### `products` table

```sql
CREATE TABLE products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('t-shirts', 'vehicle-graphics', 'signs-banners', 'wall-wraps')),
  description  TEXT,
  price        NUMERIC(10, 2) NOT NULL,
  image_url    TEXT,
  available    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public read access; only managers can write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available products"
  ON products FOR SELECT
  USING (available = TRUE);

CREATE POLICY "Managers can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
    )
  );
```

---

### `orders` table

```sql
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  user_name        TEXT,
  user_email       TEXT,
  total            NUMERIC(10, 2) NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'in-production', 'ready', 'completed', 'cancelled')),
  shipping_address TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers see only their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Customers can insert their own orders
CREATE POLICY "Users can place orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Managers can view and update all orders
CREATE POLICY "Managers can manage all orders"
  ON orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'manager'
    )
  );
```

---

### `order_items` table

```sql
CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON SET NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  quantity    INT NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10, 2) NOT NULL,
  size        TEXT,
  color       TEXT,
  notes       TEXT
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Inherit access from the parent orders table
CREATE POLICY "Order items follow order access"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND (orders.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'manager'
          )
        )
    )
  );
```

---

### `order_status_history` table *(optional — for audit trail)*

```sql
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note        TEXT
);
```

---

## Part 3 — Entity Relationship Overview

```
auth.users (Supabase Auth)
    │
    ├─── profiles (1:1)
    │        role: customer | manager
    │
    ├─── orders (1:many)
    │        status: pending → confirmed → in-production → ready → completed
    │        │
    │        └─── order_items (1:many)
    │                 └─── products (many:1, nullable on delete)
    │
    └─── [Storage Bucket: make-991222a2-designs]
             └─── designs/{uuid}.jpg  ← linked from products.image_url
```

---

## Part 4 — Useful Supabase SQL Helper Functions

### Auto-update `updated_at` trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Part 5 — Category Reference

| Slug | Display Label |
|---|---|
| `t-shirts` | T-Shirts & Apparel |
| `vehicle-graphics` | Vehicle Graphics |
| `signs-banners` | Signs & Banners |
| `wall-wraps` | Wall Wraps |

---

## Summary

| What you need now | What requires migration |
|---|---|
| ✅ KV store — works out of the box, no setup | 🔄 Custom Postgres tables — requires backend rewrite |
| ✅ Supabase Auth — already configured | 🔄 RLS policies — must be set in Supabase dashboard |
| ✅ Storage bucket — auto-created on first deploy | 🔄 Relational joins & triggers — Postgres only |

For the current prototype, **no Supabase table setup is needed**. Use this document as a blueprint if you scale to a full relational schema in the future.
