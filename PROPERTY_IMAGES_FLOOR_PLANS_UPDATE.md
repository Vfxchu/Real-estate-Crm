# Property Images & Floor Plans Update

## Overview
Updated the Properties sidebar (PropertyDetailDrawer) to have a better organized Images section with two sub-tabs: "Images" and "Floor Plan & Layouts". Implemented real-time synchronization across the entire CRM system.

## Changes Made

### 1. PropertyDetailDrawer - Two Sub-Tabs Structure
**File**: `src/components/properties/PropertyDetailDrawer.tsx`

- Replaced the single Images tab with a nested tab structure:
  - **Main Tab**: Images (visible to all authenticated users)
  - **Sub-Tab 1**: Images - displays property photos
  - **Sub-Tab 2**: Floor Plan & Layouts - displays uploaded floor plans and layout diagrams

- Added real-time event listener to refresh the drawer when properties are updated:
  ```typescript
  useEffect(() => {
    const handlePropertyRefresh = () => {
      if (property?.id && open) {
        loadActivities();
        loadFiles();
        onUpdate?.();
      }
    };

    window.addEventListener('properties:refresh', handlePropertyRefresh);
    
    return () => {
      window.removeEventListener('properties:refresh', handlePropertyRefresh);
    };
  }, [property?.id, open, onUpdate]);
  ```

### 2. PropertyLayoutGallery - Real-time Updates
**File**: `src/components/properties/PropertyLayoutGallery.tsx`

- Added Supabase real-time subscription to listen for changes to `property_files` table:
  ```typescript
  useEffect(() => {
    if (!propertyId) return;

    const channel = supabase
      .channel(`property-files-${propertyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_files',
        filter: `property_id=eq.${propertyId}`
      }, (payload) => {
        console.log('Property files changed:', payload);
        loadLayouts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propertyId]);
  ```

- This ensures that when floor plans are added, updated, or deleted, the gallery refreshes automatically for all users viewing the property.

### 3. PropertyEditForm - Cross-Component Sync
**File**: `src/components/forms/PropertyEditForm.tsx`

- Added `window.dispatchEvent(new CustomEvent('properties:refresh'))` after:
  - File uploads (both images and floor plans)
  - File deletions (both images and floor plans)

- This triggers a refresh across all open property detail views and ensures consistency.

### 4. PropertyImageGallery - Refresh Support
**File**: `src/components/properties/PropertyImageGallery.tsx`

- Added event listener for `properties:refresh` event to reload images when updates occur:
  ```typescript
  useEffect(() => {
    const handleRefresh = () => {
      setImageUrls([]);
    };

    window.addEventListener('properties:refresh', handleRefresh);
    
    return () => {
      window.removeEventListener('properties:refresh', handleRefresh);
    };
  }, []);
  ```

## Visibility and Permissions

### Floor Plan & Layouts Tab
- **Visible to**: All authenticated users (both Admin and Agent)
- **Edit permissions**: 
  - Admins can edit all properties
  - Agents can only edit their own properties
  - Delete and upload operations respect these permissions

### Images Tab
- **Visible to**: All authenticated users (both Admin and Agent)
- **Edit permissions**: Same as Floor Plan & Layouts

### Documents Tab
- **Visible to**: Users with `canViewSensitive` permission
- Remains separate from the Images section

## Real-time Synchronization Flow

1. **User uploads or deletes a file** via PropertyEditForm
   - File is saved to Supabase Storage (`property-images` or `property-layouts` bucket)
   - For layouts, a record is created in `property_files` table
   - `properties:refresh` event is dispatched

2. **All components listen for updates**:
   - PropertyDetailDrawer refreshes activities and files
   - PropertyLayoutGallery subscription receives database change notification
   - PropertyImageGallery reloads images
   - useProperties hook updates the properties list via real-time subscription

3. **Result**: All open views update automatically, ensuring consistency across:
   - Admin Panel
   - Agent Panel  
   - Property Detail Drawer
   - DKV Inventory
   - Agent Inventory

## Technical Implementation

### Storage Buckets
- `property-images`: Stores property photos
- `property-layouts`: Stores floor plans and layout diagrams

### Database Tables
- `properties`: Contains `images` array field for property photos
- `property_files`: Contains records for floor plans with fields:
  - `property_id`: FK to properties
  - `name`: Original filename
  - `path`: Storage path
  - `type`: 'layout'
  - `size`: File size in bytes
  - `created_by`: User who uploaded

### Events
- `properties:refresh`: Custom window event for cross-component synchronization
- Supabase real-time subscriptions on:
  - `properties` table (UPDATE, INSERT, DELETE)
  - `property_files` table (all events for specific property)

## Testing Scenarios

1. **Upload floor plan as Admin**:
   - Floor plan appears immediately in Floor Plan & Layouts tab
   - All agents viewing the property see the update
   - Edit sidebar shows the new floor plan

2. **Delete image as Agent** (own property):
   - Image disappears from Images tab immediately
   - Admin panel reflects the change
   - Property list thumbnails update

3. **Multiple users viewing same property**:
   - Any change by one user propagates to all viewers
   - No manual refresh needed

4. **Agent tries to edit another agent's property**:
   - Floor Plan & Layouts tab is visible (view only)
   - Upload/delete buttons are disabled
   - Clear permissions message shown

## Future Enhancements (Optional)

1. Add drag-and-drop reordering of images
2. Add image cropping/editing capabilities
3. Implement batch upload with progress indicator
4. Add image compression before upload
5. Generate thumbnails automatically
6. Add watermarking for property images
