# Floor Plan & Layouts - Agent Panel Fix

## Problem Statement
Floor Plan & Layouts tab was not rendering properly for agents in the Agent panel. Agents could not view floor plans for properties in the DKV Inventory, even though they should have view/download access.

## Root Cause
The `property_files` table had an RLS policy (`property_files_select`) that only allowed:
- Admins to view all files
- Agents to view only files they created
- Agents to view only files for properties assigned to them (`p.agent_id = auth.uid()`)

This prevented agents from viewing floor plans for properties in the DKV Inventory that were assigned to other agents.

## Solution Implemented

### 1. Updated RLS Policy for property_files Table
**Migration**: Updated SELECT policy to allow all authenticated users to view floor plans

```sql
-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "property_files_select" ON property_files;

-- Create new policy allowing all authenticated users to view
CREATE POLICY "property_files_select_authenticated" 
ON property_files 
FOR SELECT 
TO authenticated
USING (true);
```

**Rationale**: 
- Floor plans are not sensitive information - they're marketing materials
- All authenticated CRM users should be able to view floor plans to help clients
- Edit/delete permissions remain restricted through separate policies

### 2. Existing Permission Controls (Already in Place)

#### PropertyLayoutGallery Component
The component already properly handles permissions:

```typescript
// Delete button only shown when canEdit is true
{canEdit && (
  <Button
    size="sm"
    variant="destructive"
    onClick={() => handleDeleteFile(file)}
  >
    <Trash2 className="w-4 h-4" />
  </Button>
)}
```

#### PropertyDetailDrawer
Correctly determines edit permissions:

```typescript
const isAdmin = profile?.role === 'admin';
const canEdit = isAdmin || property?.agent_id === user?.id;

// Passed to PropertyLayoutGallery
<PropertyLayoutGallery 
  propertyId={property.id} 
  canEdit={canEdit}
  onUpdate={onUpdate}
/>
```

### 3. RLS Policies Summary

After the fix, here's the complete permission matrix for `property_files`:

| Action | Admin | Agent (Assigned) | Agent (Not Assigned) |
|--------|-------|------------------|---------------------|
| **SELECT (View)** | ✅ All files | ✅ All files | ✅ All files |
| **INSERT (Upload)** | ✅ Any property | ✅ Own properties only | ❌ No |
| **UPDATE** | ✅ All files | ✅ Own files only | ❌ No |
| **DELETE** | ✅ All files | ✅ Own files only | ❌ No |

Existing policies (unchanged):
```sql
-- INSERT: Admins or assigned agents can upload
CREATE POLICY "property_files_insert" 
ON property_files FOR INSERT
USING (is_admin() OR (created_by = auth.uid()) AND (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = property_files.property_id 
    AND (p.agent_id = auth.uid() OR is_admin())
)));

-- UPDATE: Admins, creators, or assigned agents can update
CREATE POLICY "property_files_update"
ON property_files FOR UPDATE
USING (is_admin() OR (created_by = auth.uid()) OR (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
)));

-- DELETE: Admins, creators, or assigned agents can delete
CREATE POLICY "property_files_delete"
ON property_files FOR DELETE
USING (is_admin() OR (created_by = auth.uid()) OR (EXISTS (
  SELECT 1 FROM properties p 
  WHERE p.id = property_files.property_id 
    AND p.agent_id = auth.uid()
)));
```

## UI/UX Behavior

### For Agents (Viewing Own Properties)
- ✅ Can see "Floor Plan & Layouts" tab
- ✅ Can view all floor plans
- ✅ Can download floor plans (click image or "View" button)
- ✅ Can upload new floor plans (via Edit button)
- ✅ Can delete floor plans (trash icon visible)

### For Agents (Viewing Other Properties in DKV Inventory)
- ✅ Can see "Floor Plan & Layouts" tab
- ✅ Can view all floor plans
- ✅ Can download floor plans (click image or "View" button)
- ❌ Cannot upload (Edit button disabled or not shown)
- ❌ Cannot delete (trash icon hidden)

### For Admins (All Properties)
- ✅ Full CRUD access on all properties
- ✅ Can view, download, upload, and delete floor plans

## Real-time Synchronization

The following mechanisms ensure changes propagate across the CRM:

1. **Supabase Real-time Subscription** (PropertyLayoutGallery):
   ```typescript
   const channel = supabase
     .channel(`property-files-${propertyId}`)
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'property_files',
       filter: `property_id=eq.${propertyId}`
     }, (payload) => {
       loadLayouts();
     })
     .subscribe();
   ```

2. **Custom Events** (PropertyEditForm):
   ```typescript
   // After upload/delete
   window.dispatchEvent(new CustomEvent('properties:refresh'));
   ```

3. **Event Listeners** (PropertyDetailDrawer, PropertyImageGallery):
   ```typescript
   window.addEventListener('properties:refresh', handlePropertyRefresh);
   ```

## Testing Scenarios

### Scenario 1: Agent Views Own Property
1. Agent opens property detail drawer for their assigned property
2. Clicks "Images" tab
3. Clicks "Floor Plan & Layouts" sub-tab
4. **Expected**: Floor plans display with download and delete buttons
5. Agent clicks trash icon on a floor plan
6. **Expected**: Floor plan deletes, UI updates immediately

### Scenario 2: Agent Views Another Agent's Property (DKV Inventory)
1. Agent opens DKV Inventory
2. Opens property detail drawer for property assigned to another agent
3. Clicks "Images" tab
4. Clicks "Floor Plan & Layouts" sub-tab
5. **Expected**: Floor plans display with download button only (no delete/trash icon)
6. Agent clicks on floor plan image
7. **Expected**: Opens in new tab for download/view

### Scenario 3: Admin Views Any Property
1. Admin opens any property detail drawer
2. Clicks "Images" tab
3. Clicks "Floor Plan & Layouts" sub-tab
4. **Expected**: Floor plans display with both download and delete buttons
5. Admin deletes a floor plan
6. **Expected**: Floor plan deletes, all open views update (agent panels, inventory, etc.)

### Scenario 4: Real-time Sync Test
1. Admin uploads a floor plan to Property A
2. Agent has Property A detail drawer open in another browser
3. **Expected**: Agent sees the new floor plan appear automatically without refresh
4. Admin deletes the floor plan
5. **Expected**: Floor plan disappears from agent's view automatically

### Scenario 5: Multi-user Concurrent Edit
1. Admin uploads floor plan X
2. Agent (assigned to property) has drawer open
3. Agent sees floor plan X appear
4. Agent deletes floor plan X (has permission)
5. Admin sees floor plan X disappear from their view
6. **Expected**: Both users stay in sync throughout

## Files Modified

1. **Database Migration** (new file):
   - Updated `property_files` SELECT RLS policy

2. **src/components/properties/PropertyLayoutGallery.tsx** (previously updated):
   - Already has real-time subscription
   - Already respects `canEdit` prop for delete buttons

3. **src/components/properties/PropertyDetailDrawer.tsx** (previously updated):
   - Already has correct `canEdit` logic
   - Already passes `canEdit` to PropertyLayoutGallery

4. **src/components/forms/PropertyEditForm.tsx** (previously updated):
   - Already dispatches `properties:refresh` event
   - Already has floor plan upload/delete functionality

## Security Considerations

### Why This Is Safe
1. **Floor plans are marketing materials**: Not sensitive like financial data or personal information
2. **Helps all agents serve clients**: Agents need to see floor plans to answer client questions
3. **Edit/delete still protected**: Only admins and assigned agents can modify
4. **Audit trail maintained**: `created_by` field tracks who uploaded each file
5. **Follows principle of least privilege**: View-only access for non-assigned agents

### What Remains Protected
- **Documents tab**: Still requires `canViewSensitive` permission
- **Owner contact info**: Still restricted based on permissions
- **Financial data**: Not affected by this change
- **File uploads**: Only admins and assigned agents can upload
- **File deletions**: Only admins and assigned agents can delete

## Pre-existing Security Warning

The migration triggered a security linter warning:

```
WARN: Leaked Password Protection Disabled
Level: WARN
Description: Leaked password protection is currently disabled.
```

**Status**: This is a pre-existing Supabase Auth configuration issue, NOT related to our migration. It requires enabling in the Supabase Auth settings dashboard.

**Recommendation**: Enable leaked password protection in Supabase Dashboard:
1. Go to Authentication → Policies
2. Enable "Leaked Password Protection"
3. This prevents users from using passwords found in data breaches

## Conclusion

The Floor Plan & Layouts tab now works identically for both Admin and Agent panels:
- ✅ Visible to all authenticated users
- ✅ Proper permission-based UI (delete button shown/hidden based on canEdit)
- ✅ Real-time synchronization across all views
- ✅ Secure (view-only for non-assigned agents, full CRUD for admins/assigned agents)
- ✅ Consistent across DKV Inventory, Agent Panel, Admin Panel, and Property Detail views
