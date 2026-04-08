# Real-time Access Code Updates

## How It Works

When any manager changes the access code in the Settings page, **all other managers viewing the Settings page will see the update instantly** - without needing to refresh!

### Technology: Supabase Realtime

The implementation uses **Supabase's PostgreSQL Change Streams** to push updates in real-time:

```
Manager A changes code → Database updated → Realtime event triggered → Manager B sees update instantly
```

---

## Architecture

### 1. **Frontend Realtime Subscription** (`ManagerSettings.tsx`)

```typescript
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
      // Update UI with new code
      setAccessCode(payload.new?.value.code);
      setAccessCodeLastChangedBy(payload.new?.value.lastChangedBy);
      // Show notification
      setAccessCodeUpdateNotification(true);
    }
  )
  .subscribe();
```

### 2. **Backend: KV Store Updates** (`index.tsx`)

When a manager updates the code:

```typescript
await db.set("manager:access-code", codeConfig, user.id);
// This write to the KV table automatically triggers Realtime events
```

### 3. **Notification UI**

A blue notification bar appears briefly showing:
- ⚡ "Access code updated by [Manager Name]!"
- New code value
- Auto-dismisses after 5 seconds

---

## Data Flow

```
┌─ Manager A at Settings
│  └─ Enters new code "SUMMER2025"
│  └─ Clicks "Update Code"
│  └─ Frontend sends PUT /manager/settings/access-code
│
├─ Backend receives request
│  └─ Validates code
│  └─ Saves to KV: {"code": "SUMMER2025", "lastChangedBy": "Jane", ...}
│  └─ KV write triggers Postgres change event
│
├─ Supabase Realtime detects change
│  └─ Broadcasts to all subscribed clients
│
└─ Manager B (also viewing Settings)
   └─ Realtime subscription receives event
   └─ Updates local state with new code
   └─ Blue notification appears: "Code updated by Jane!"
   └─ Disappears after 5 seconds
```

---

## Features

### ✅ Instant Updates
- No polling needed
- Updates appear in real-time (< 1 second typically)

### ✅ Smart Notifications
- Shows who changed the code
- Shows the new code value
- Auto-dismisses after 5 seconds

### ✅ Automatic Cleanup
- Subscription unsubscribes when component unmounts
- No memory leaks

### ✅ Offline Resilient
- Supabase Realtime automatically reconnects on network issues
- Updates queue and deliver when back online

### ✅ No Polling Overhead
- Efficient WebSocket connection
- Much better than repeated HTTP polling

---

## UI Elements

### Realtime Notification Bar

When code is updated by another manager:

```
┌────────────────────────────────────────┐
│ ⚡ Access code updated by Jane!       │
│ New code: SUMMER2025                  │
│ [auto-dismisses in 5 seconds]          │
└────────────────────────────────────────┘
```

### Current Code Display

Always shows the active code:

```
┌────────────────────────────────────────┐
│ ℹ️  Current access code: SUMMER2025    │
│ New managers use this code to sign up  │
└────────────────────────────────────────┘
```

---

## Scenarios

### Scenario 1: Single Manager
- Manager opens Settings
- Updates code
- Success message appears
- Code is updated

### Scenario 2: Multiple Managers
1. **Manager A** has Settings page open
2. **Manager B** has Settings page open
3. **Manager C** updates code to "NEWCODE123"
   - Database updated
   - Realtime event triggered
4. **Manager A** automatically sees:
   - New code displayed: "NEWCODE123"
   - Blue notification: "Updated by Manager C!"
5. **Manager B** automatically sees:
   - New code displayed: "NEWCODE123"
   - Blue notification: "Updated by Manager C!"
6. Both notifications auto-dismiss after 5 seconds

### Scenario 3: Manager Offline
- **Manager A** is online viewing Settings
- **Manager B** (offline) and **Manager C** (offline) disconnect
- **Manager B** comes back online
- Misses the realtime event
- But next time they load Settings, they'll see the latest code

---

## Technical Implementation Details

### Supabase Realtime Features Used
- **PostgreSQL Change Streams**: Listens to `kv_store_991222a2` table
- **Row-level Filters**: Only listens to `manager:access-code` key
- **Automatic Reconnection**: Built-in retry logic

### Why This Approach?

| Aspect | Why Chosen |
|--------|-----------|
| **Realtime Subscriptions** | Instant updates, no polling overhead |
| **PostgreSQL Changes** | Works with existing KV table |
| **Supabase** | Already in use, no extra infrastructure |
| **WebSocket** | Efficient for real-time data |

---

## Code Location

**File**: `src/app/pages/manager/ManagerSettings.tsx`

**Key Parts**:
- **State**: Lines ~88-89 (`accessCodeUpdateNotification`)
- **Subscription**: Lines ~130-160 (useEffect with Realtime)
- **Notification UI**: Lines ~575-595 (Blue notification bar)

---

## Future Enhancements

Potential improvements:

1. **Sound Notification** - Play a chime when code changes
2. **Desktop Notification** - Browser notification API
3. **Activity Log** - Show history of code changes
4. **Code Rotation** - Automatic code expiration
5. **Multiple Codes** - Support multiple active codes simultaneously

---

## Troubleshooting

### Notification doesn't appear
- Check browser console for errors
- Verify Supabase credentials are correct
- Ensure user has manager role

### Updates delayed
- Check network connection
- Supabase Realtime might have latency (usually < 1 second)
- Refresh page if stuck

### Subscription not working
- Ensure `supabase` client is properly imported
- Check that Realtime is enabled in Supabase project settings
- Verify database table name matches: `kv_store_991222a2`

---

## Performance Considerations

- **Memory**: Each subscription uses minimal memory
- **Bandwidth**: Only sends deltas, very efficient
- **Latency**: Typically < 1 second for updates
- **Scalability**: Supabase handles thousands of concurrent connections

---

## Security

- ✅ Only managers can view/change codes (authenticated + role check)
- ✅ Realtime data is encrypted in transit (WSS)
- ✅ Supabase RLS policies apply to realtime subscriptions
- ✅ No sensitive data exposed in notifications

