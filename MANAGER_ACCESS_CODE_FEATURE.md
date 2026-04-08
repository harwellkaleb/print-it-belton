# Manager Access Code Feature

## Overview
This feature allows managers to change the manager access code used during signup for new managers to join.

## Components Added/Modified

### 1. Backend API Endpoints (`supabase/functions/server/index.tsx`)

#### GET `/make-server-991222a2/manager/access-code`
- **Purpose**: Retrieve the current manager access code and change history
- **Authentication**: Required (manager role only)
- **Response**:
  ```json
  {
    "code": "NEWCODE123",
    "lastChangedBy": "Manager Name or Email",
    "lastChangedAt": "2025-04-08T12:00:00Z"
  }
  ```

#### PUT `/make-server-991222a2/manager/access-code`
- **Purpose**: Update the manager access code
- **Authentication**: Required (manager role only)
- **Request Body**:
  ```json
  {
    "newCode": "NEWCODE123"
  }
  ```
- **Validation**:
  - Minimum 4 characters
  - Maximum 50 characters
  - Converted to uppercase for consistency
  - Trimmed of whitespace
- **Response**: Updated code config with lastChangedBy and lastChangedAt

#### Modified: POST `/make-server-991222a2/auth/make-manager`
- Now fetches the current access code from KV store (`manager:access-code`)
- Falls back to default `"PRINTIT2024"` if not set
- Validates signup manager codes against the current stored code

### 2. Frontend UI (`src/app/pages/manager/ManagerSettings.tsx`)

#### New Section: "Manager Access Code"
Located in the Settings page after the "Send a Test Email" section.

**Features:**
- **Display current code** in a purple info callout box
- **Input field** to enter a new access code (with show/hide toggle)
- **Save button** with loading/success/error states
- **Last changed info** showing who changed it and when
- **Validation feedback** with helpful error messages

**UI Components:**
- Purple themed (Lock icon with purple accents)
- Masked input field with eye toggle to show/hide
- Real-time status indicators (saving, saved, error)
- Helpful text explaining the purpose and requirements

### 3. Data Storage
Manager access code is stored in the KV store at key: `manager:access-code`

**Structure**:
```json
{
  "code": "NEWCODE123",
  "lastChangedBy": "Manager Name",
  "lastChangedAt": "2025-04-08T12:00:00Z"
}
```

## How It Works

1. **Load**: When ManagerSettings page loads, it fetches the current code via GET endpoint
2. **Display**: Current code is shown in an info box
3. **Update**: Manager enters new code and clicks "Update Code"
4. **Validate**: Backend validates length (4-50 chars) and converts to uppercase
5. **Store**: New code is saved to KV store with manager info and timestamp
6. **Propagate**: Next manager signup attempt will use the new code

## Default Behavior
- If no custom code is set, the system uses `"PRINTIT2024"` (backward compatible)
- The code is case-insensitive (automatically converted to uppercase)
- Only managers can view/change the access code

## Security Considerations
- ✅ Backend validates code is a string and non-empty
- ✅ Only managers can access this endpoint (role check)
- ✅ Changes are logged with manager name and timestamp
- ✅ Code validation happens server-side (not in browser)
- ✅ Valid authentication token required

## Testing
To test this feature:

1. **As a manager**, go to Settings > "Manager Access Code" section
2. Enter a new code (e.g., `"NEWCODE2025"`)
3. Click "Update Code"
4. You should see a success message
5. Sign out and try to sign up with the new code to verify it works
