# Manager Access Code - Quick Start Guide

## 🎯 What This Does

Allows managers to change the access code that new team members must enter when signing up as a manager.

**Before**: Code was hardcoded to `PRINTIT2024`  
**After**: Managers can change it to anything they want!

---

## 📍 Where to Find It

1. Log in as a manager
2. Go to **Settings** (gear icon in sidebar)
3. Scroll down to the **🔒 Manager Access Code** section

---

## 💡 Example Workflow

### Step 1: View Current Code
```
Manager opens Settings → Sees current code: "PRINTIT2024"
```

### Step 2: Change the Code
```
Manager types new code: "SUMMER2025"
Clicks "Update Code" button
```

### Step 3: Success!
```
✓ Saved!
Code is now: "SUMMER2025"
Last changed by: Manager Name
Last changed at: Apr 8, 2025
```

### Step 4: Share with Team
```
Manager tells new team member: "Use code SUMMER2025 to sign up"
New team member enters code during signup
They become a manager!
```

---

## 🔑 Code Rules

| Rule | Example |
|------|---------|
| **Minimum length** | 4 characters |
| **Maximum length** | 50 characters |
| **Case** | AUTO-UPPERCASE (SUMMER2025, not summer2025) |
| **Spaces** | Trimmed automatically |
| **Valid chars** | Letters, numbers, special symbols |

---

## ❌ Error Messages

| Error | Reason | Fix |
|-------|--------|-----|
| "Access code must be at least 4 characters long" | Too short | Enter at least 4 characters |
| "Access code must be no more than 50 characters long" | Too long | Use fewer than 50 characters |
| "Forbidden: Only managers can access this" | Not a manager | Contact an admin |
| "Unauthorized" | Not logged in | Sign in first |

---

## 🔐 Behind the Scenes

### Storage
The code is stored securely in the database at:
- **Key**: `manager:access-code`
- **Value**: The code + who changed it + when

### Validation
Every time someone signs up with a manager code:
1. Backend gets the current code from database
2. Compares it with what the user entered
3. If it matches (case-insensitive), they become a manager
4. If it doesn't match, signup fails

### Audit Trail
The system always tracks:
- ✅ Who changed the code (manager name)
- ✅ When it was changed (date/time)
- ✅ What code is currently active

---

## 🚀 Real Example

### Before (Hardcoded)
```
New manager signs up with code "PRINTIT2024"
→ Gets manager access

New manager tries code "SUMMER2025"
→ Error: Invalid manager access code ❌
```

### After (Dynamic)
```
Manager A changes code to "SUMMER2025"

New manager signs up with code "SUMMER2025"
→ Gets manager access ✅

New manager tries code "PRINTIT2024"
→ Error: Invalid manager access code ❌
```

---

## 💾 Data Storage Example

In the KV store, it looks like:

```json
{
  "manager:access-code": {
    "code": "SUMMER2025",
    "lastChangedBy": "Jane Manager",
    "lastChangedAt": "2025-04-08T14:30:00.000Z"
  }
}
```

---

## 🔄 Changing the Code Multiple Times

You can change the code as many times as you want:

```
Day 1: Change code to "SPRING2025"
Day 2: Change code to "SUMMER2025"
Day 3: Change code to "TEAM2025"

Only the latest code (TEAM2025) works for new signups!
```

---

## 🛡️ Security Notes

- ✅ Only managers can view/change the code
- ✅ You must be logged in to change it
- ✅ Changes are logged with your name and timestamp
- ✅ The code is validated on the server (can't be bypassed)
- ✅ No one can see the code except when you're logged in as a manager

---

## 🔧 What If I Want to Revert?

Just change it back! There's no version history, but you can always set it to:
- The old value (e.g., "PRINTIT2024")
- Or any new value you want

---

## 📱 Mobile Friendly

The interface works on:
- 📱 Mobile phones
- 💻 Tablets
- 🖥️ Desktop computers

All screens show the same features with a responsive layout.

---

## 🆘 Troubleshooting

### "Update Code button is grayed out"
**Cause**: You haven't typed a new code yet  
**Fix**: Enter a new code in the text field

### Can't see the Manager Access Code section
**Cause**: You're not a manager  
**Fix**: Ask an admin to upgrade your account to manager role

### Changes don't save
**Cause**: Network error or server issue  
**Fix**: Check your internet connection and try again

---

## 📚 Related Features

- **Settings page**: All other manager configurations
- **Signup page**: Where new managers enter the code
- **Manager Dashboard**: Main manager interface
- **Danger Zone**: Where you can remove stored API keys

