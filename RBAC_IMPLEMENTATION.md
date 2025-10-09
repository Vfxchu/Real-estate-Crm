# Role-Based Access Control (RBAC) Implementation

## Overview
Strict role-based access control for admin and agent roles, enforced at both database (RLS) and UI layers.

---

## Database Layer (RLS Policies)

### Roles
- **admin/superadmin**: Full access to all entities
- **agent**: Limited access based on ownership

### Helper Function
```sql
is_admin() -- Returns true if current user has admin or superadmin role
```

### Entity Policies

#### 1. Leads
- **Agent View**: Only leads where `agent_id = auth.uid()`
- **Agent Edit**: Only own leads
- **Agent Create**: Can create with self as agent
- **Admin**: Full access (view/edit/delete all)

#### 2. Contacts
- **Agent View**: Only contacts where `created_by = auth.uid()`
- **Agent Edit**: Only own contacts
- **Agent Create**: Can create with self as creator
- **Admin**: Full access (view/edit/delete all)

#### 3. Properties
- **Agent View**: Can view **ALL** properties (read-only access)
- **Agent Edit**: **NO** edit access
- **Agent Create**: **NO** create access
- **Admin**: Full access (create/edit/delete)

#### 4. Contact Files
- **Agent View**: Only files where `created_by = auth.uid()`
- **Agent Edit/Delete**: Only own uploads
- **Agent Create**: Can upload files
- **Admin**: Full access

#### 5. Property Files
- **Agent View**: Only files where `created_by = auth.uid()`
- **Agent Edit/Delete**: Only own uploads
- **Agent Create**: **NO** - Only admins can upload property files
- **Admin**: Full access

---

## UI Layer Guards

### Properties Page (`/properties`)

#### Buttons Hidden for Agents:
- ✅ "Add Property" button (admins only)
- ✅ "Edit" button on property cards (admins only)
- ✅ "Delete" button on property cards (admins only)

#### Agent Access:
- ✅ Can view all properties
- ✅ Can schedule viewings
- ✅ Can share properties

### Leads Manager (`/leads`)
- ✅ Agents see only their assigned leads (RLS enforced)
- ✅ Agents can create/edit/delete only own leads
- ✅ Admins see all leads

### Contacts (`/contacts`)
- ✅ Agents see only contacts they created (RLS enforced)
- ✅ Agents can create/edit contacts they own
- ✅ Admins see all contacts

### Documents/Files
- ✅ Agents see only files they uploaded
- ✅ Contact files: Agents can upload
- ✅ Property files: Only admins can upload
- ✅ Admins see all files

---

## Audit Logging

### Audited Tables
- `leads` (INSERT, UPDATE, DELETE)
- `contacts` (INSERT, UPDATE, DELETE)
- `properties` (INSERT, UPDATE, DELETE)

### Audit Table: `access_audit`
Columns:
- `user_id` - Who performed the action
- `action` - INSERT/UPDATE/DELETE
- `entity_type` - Table name
- `entity_id` - Record ID
- `timestamp` - When it occurred
- `ip_address` - User's IP (optional)
- `user_agent` - Browser info (optional)

### Access
- ✅ Admins can view audit logs
- ✅ System automatically logs all write operations

---

## Testing Checklist

### Agent Tests
- [ ] Agent A cannot see Agent B's leads
- [ ] Agent A cannot see Agent B's contacts
- [ ] Agent A can view all properties but cannot edit/delete them
- [ ] Agent A can only see documents they uploaded
- [ ] Agent A cannot bypass restrictions via direct API calls

### Admin Tests
- [ ] Admin can see all leads from all agents
- [ ] Admin can see all contacts from all agents
- [ ] Admin can create/edit/delete properties
- [ ] Admin can see all documents regardless of uploader
- [ ] Admin can view audit logs

### Security Tests
- [ ] Attempting to edit another agent's lead via API returns error
- [ ] Attempting to upload property file as agent returns error
- [ ] RLS policies enforce restrictions even if UI is bypassed
- [ ] Audit logs capture all write operations

---

## Migration Applied
- ✅ Created `is_admin()` helper function
- ✅ Updated RLS policies for leads, contacts, properties
- ✅ Updated RLS policies for contact_files, property_files
- ✅ Added `created_by` column to file tables
- ✅ Created `access_audit` table with triggers
- ✅ Applied audit triggers to key tables

## UI Updates Applied
- ✅ Properties page: Hidden Add/Edit/Delete buttons for agents
- ✅ Analytics page: Fixed agent count query
- ✅ Role checks use secure `user_roles` table

---

## Important Notes

### Security
- **Deny by default**: All access is denied unless explicitly allowed
- **Server-side enforcement**: RLS policies cannot be bypassed
- **No client-side security**: UI guards are for UX only, not security

### Maintenance
- When adding new entities, follow the same RLS pattern
- Always test with both admin and agent accounts
- Review audit logs regularly for suspicious activity

### Role Assignment
- Roles are stored in `user_roles` table (separate from profiles)
- Use `assignUserRole()` function to grant roles
- Only admins can assign/remove roles
- Default role is 'agent' for new users
