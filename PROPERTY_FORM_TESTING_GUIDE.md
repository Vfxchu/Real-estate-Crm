# Property Form Testing Guide - Phase 3 Validation

## Overview
This guide provides comprehensive test cases to validate that all property creation and contact linking workflows are now stable and error-free.

---

## ✅ Test Case 1: Normal Property Creation
**Objective:** Verify basic property creation flow with existing contact as owner

**Steps:**
1. Log in as an agent
2. Navigate to Properties page
3. Click "Add Property"
4. Fill in all required fields:
   - Title: "Test Villa Dubai Marina"
   - Segment: Residential
   - Subtype: Villa
   - Offer Type: Sale
   - Price: 2500000
   - Location: Dubai Marina
   - Address: "Marina Gate 1"
   - City: Dubai
   - Status: Vacant
   - Owner: Select an existing contact (e.g., "Dinesh")
5. Upload 1 image and 1 document
6. Click "Create Property"

**Expected Results:**
- ✅ Property created successfully
- ✅ Success toast appears
- ✅ Property appears in properties list
- ✅ Contact has "Seller" tag (check Contacts page)
- ✅ Contact shows linked property in their profile
- ✅ contact_properties table has correct link
- ✅ No console errors
- ✅ No authentication errors

**Validation Queries:**
```sql
-- Verify property was created
SELECT id, title, owner_contact_id FROM properties 
WHERE title = 'Test Villa Dubai Marina';

-- Verify contact has Seller tag
SELECT id, name, interest_tags FROM leads 
WHERE 'Seller' = ANY(interest_tags);

-- Verify contact_properties link
SELECT * FROM contact_properties 
WHERE property_id = (SELECT id FROM properties WHERE title = 'Test Villa Dubai Marina');
```

---

## ✅ Test Case 2: Property Creation with Session Near Expiry
**Objective:** Ensure session refresh works automatically

**Steps:**
1. Log in and wait 50+ minutes (near token expiry time)
   - OR manually set session to expire soon in browser DevTools
2. Open property form (leave it open for a few minutes)
3. Fill in property details
4. Submit the form

**Expected Results:**
- ✅ Session automatically refreshes in background
- ✅ Property created successfully without "Please sign in" error
- ✅ Console shows: "Session refreshed proactively"
- ✅ No session expired warnings

**Alternative Test (Manual Session Invalidation):**
1. Log in normally
2. Open DevTools → Application → Local Storage
3. Clear auth tokens
4. Try to create a property

**Expected Results:**
- ✅ Form detects unhealthy session
- ✅ Shows error: "Session Expired - Please refresh the page before submitting"
- ✅ Form submission is blocked
- ✅ After page refresh, form works normally

---

## ✅ Test Case 3: Property Creation with Invalid Owner
**Objective:** Verify validation catches non-existent owners

**Steps:**
1. Open browser DevTools → Network tab
2. Create a property and select an owner
3. Before submitting, intercept the request and change owner_contact_id to a fake UUID
4. Submit the form

**Expected Results:**
- ✅ Validation catches invalid owner before database operation
- ✅ Clear error message: "Selected owner contact does not exist. Please refresh and try again."
- ✅ Property NOT created in database
- ✅ No partial data saved

---

## ✅ Test Case 4: Property Creation During Network Issues
**Objective:** Test error handling with poor connectivity

**Steps:**
1. Open DevTools → Network tab
2. Set network throttling to "Slow 3G" or "Offline"
3. Attempt to create a property
4. Restore normal network

**Expected Results:**
- ✅ Clear network error message appears
- ✅ Form stays open with data intact
- ✅ Error message: "Network connection failed. Please check your internet and try again."
- ✅ User can retry after network is restored
- ✅ No duplicate properties created on retry

---

## ✅ Test Case 5: Concurrent Property Creation
**Objective:** Validate simultaneous property creation by multiple agents

**Steps:**
1. Open app in 2 different browsers (or incognito + normal)
2. Log in as Agent A in Browser 1
3. Log in as Agent B in Browser 2
4. Both agents simultaneously create properties with the same owner contact ("John Smith")
   - Agent A: Creates sale property → should add "Seller" tag
   - Agent B: Creates rent property → should add "Landlord" tag
5. Submit both forms at nearly the same time

**Expected Results:**
- ✅ Both properties created successfully
- ✅ Owner contact has BOTH tags: ["Seller", "Landlord"]
- ✅ No tag conflicts or overwriting
- ✅ contact_properties has 2 links (one per property)
- ✅ No duplicate contact_properties entries
- ✅ Real-time updates visible across both sessions

**Validation Query:**
```sql
-- Check contact has both tags
SELECT id, name, interest_tags FROM leads 
WHERE name = 'John Smith';

-- Should show: interest_tags = {Seller,Landlord}

-- Verify no duplicate contact_properties
SELECT contact_id, property_id, role, COUNT(*) 
FROM contact_properties 
GROUP BY contact_id, property_id, role 
HAVING COUNT(*) > 1;

-- Should return 0 rows (no duplicates)
```

---

## ✅ Test Case 6: Property Update (Change Owner/Offer Type)
**Objective:** Verify tag sync when updating existing properties

**Setup:**
- Create property "Villa A" with Owner "Alice" (sale) → Alice gets "Seller" tag
- Create property "Apartment B" with Owner "Alice" (rent) → Alice gets "Landlord" tag
- Alice now has tags: ["Seller", "Landlord"]

**Test Steps:**
1. Edit "Villa A" and change offer_type from "sale" to "rent"
2. Save changes
3. Check Alice's tags

**Expected Results:**
- ✅ Property updated successfully
- ✅ Alice still has "Landlord" tag (correct - she has 2 rent properties now)
- ✅ Alice loses "Seller" tag (correct - she has no sale properties)

**Test Steps (Part 2):**
1. Edit "Villa A" and change owner from "Alice" to "Bob"
2. Save changes
3. Check both Alice's and Bob's tags

**Expected Results:**
- ✅ Alice loses "Landlord" tag (no longer owns Villa A)
- ✅ Bob gains "Landlord" tag (new owner of rent property)
- ✅ contact_properties updated correctly
- ✅ Real-time updates visible

---

## ✅ Test Case 7: Data Consistency Check
**Objective:** Verify the database consistency checker catches issues

**Steps:**
1. Run the consistency check function:
```sql
SELECT * FROM check_property_contact_consistency();
```

**Expected Results:**
- ✅ Returns 0 rows (no issues) after fresh data migration
- ✅ OR returns specific issues if any exist

**Manual Corruption Test (Advanced):**
1. Manually create an inconsistency:
```sql
-- Create a property with non-existent owner
UPDATE properties 
SET owner_contact_id = '00000000-0000-0000-0000-000000000000'
WHERE title = 'Test Villa Dubai Marina';
```

2. Run consistency check again:
```sql
SELECT * FROM check_property_contact_consistency();
```

**Expected Results:**
- ✅ Function detects issue: "invalid_owner"
- ✅ Returns property details and clear message
- ✅ Can use this to identify and fix data issues

3. Fix the issue:
```sql
-- Restore correct owner
UPDATE properties 
SET owner_contact_id = (SELECT id FROM leads WHERE name = 'Dinesh')
WHERE title = 'Test Villa Dubai Marina';
```

---

## ✅ Test Case 8: File Upload Validation
**Objective:** Ensure file uploads work correctly and don't block property creation

**Steps:**
1. Create a property with 5 images, 2 layouts, and 3 documents
2. Verify all files upload successfully
3. Create another property with 1 invalid file (wrong format)
4. Create a third property with NO files

**Expected Results:**
- ✅ Test 1: All files uploaded and linked to property
- ✅ Test 2: Invalid file rejected with clear error message
- ✅ Test 2: Property still created if user removes invalid file
- ✅ Test 3: Property created successfully without files
- ✅ Files stored in correct bucket paths
- ✅ property_files and contact_files tables updated
- ✅ No orphaned files in storage

---

## 🔍 Monitoring & Debugging

### Console Logs to Monitor
During testing, watch for these log patterns:
```
✅ GOOD: [prop-submit-1234567] Starting property submission
✅ GOOD: [prop-submit-1234567] Session validated successfully
✅ GOOD: [prop-submit-1234567] Property created/updated: abc123
✅ GOOD: [prop-submit-1234567] Successfully synced Seller/Landlord tags
✅ GOOD: [prop-submit-1234567] File operations completed
✅ GOOD: [prop-submit-1234567] Property verification successful
✅ GOOD: [prop-submit-1234567] Submission successful - closing form
✅ GOOD: Session refreshed proactively
```

### Red Flags (Should NOT Appear)
```
❌ BAD: Please sign in to continue
❌ BAD: Error updating property
❌ BAD: row-level security policy violation
❌ BAD: Failed to sync owner tags (without graceful handling)
❌ BAD: Property verification failed
❌ BAD: Session validation failed (without proper error message)
```

---

## 📊 Post-Testing Verification

### Database Integrity Check
Run these queries after all tests to verify data integrity:

```sql
-- 1. Check for properties with invalid owners
SELECT * FROM check_property_contact_consistency()
WHERE issue_type = 'invalid_owner';
-- Should return: 0 rows

-- 2. Check for missing contact_properties links
SELECT * FROM check_property_contact_consistency()
WHERE issue_type = 'missing_link';
-- Should return: 0 rows

-- 3. Check for outdated "Owner" tags
SELECT * FROM check_property_contact_consistency()
WHERE issue_type = 'outdated_owner_tag';
-- Should return: 0 rows

-- 4. Verify all sale property owners have Seller tag
SELECT l.name, l.interest_tags, COUNT(p.id) as property_count
FROM leads l
JOIN contact_properties cp ON cp.contact_id = l.id
JOIN properties p ON p.id = cp.property_id
WHERE p.offer_type = 'sale' AND cp.role = 'owner'
GROUP BY l.id, l.name, l.interest_tags
HAVING NOT ('Seller' = ANY(l.interest_tags));
-- Should return: 0 rows

-- 5. Check for duplicate contact_properties
SELECT contact_id, property_id, role, COUNT(*) as count
FROM contact_properties
GROUP BY contact_id, property_id, role
HAVING COUNT(*) > 1;
-- Should return: 0 rows
```

### Performance Check
```sql
-- Check average property creation time (from logs)
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as properties_created,
  AVG(updated_at - created_at) as avg_creation_time
FROM properties
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY day
ORDER BY day DESC;
```

---

## 🎯 Success Criteria

All test cases PASS if:
- ✅ No "Please sign in to continue" errors occur during active sessions
- ✅ All properties sync correctly with contact tags (Seller/Landlord)
- ✅ Real-time updates work across all panels (Properties, Contacts, Sidebar)
- ✅ Database consistency check returns 0 issues
- ✅ Session monitor proactively refreshes tokens
- ✅ Form validation catches all edge cases before submission
- ✅ Clear, actionable error messages for all failure scenarios
- ✅ No console errors or TypeScript warnings
- ✅ No orphaned data in database
- ✅ File uploads work reliably

---

## 🐛 Troubleshooting

### If "Please sign in" error still appears:
1. Check console for submission logs
2. Verify session monitor is active: `sessionHealthy` state
3. Check auth logs in Supabase dashboard
4. Ensure `useSessionMonitor` hook is imported and used in PropertyForm

### If tags don't sync:
1. Check `sync_owner_tags_from_properties` function execution
2. Verify contact_properties table has correct links
3. Run consistency checker to identify specific issues
4. Check if errors are being caught and logged gracefully

### If form blocks submission:
1. Verify session is healthy (check console)
2. Ensure all required fields are filled
3. Check for validation errors in form state
4. Verify owner_contact_id exists in database

---

## 📝 Reporting Issues

If any test fails, report with:
1. **Test case number** (e.g., Test Case 3)
2. **Exact error message** from toast/console
3. **Browser console logs** (full `[prop-submit-*]` sequence)
4. **Database state** (run relevant validation queries)
5. **Steps to reproduce**
6. **Expected vs Actual behavior**

---

## 🎉 Completion

Once all test cases pass:
- ✅ Property form is production-ready
- ✅ Real-time sync is stable
- ✅ Error handling is comprehensive
- ✅ Data integrity is maintained
- ✅ Session management is robust
- ✅ No authentication errors occur

**Status:** All Phases Implemented ✅
- Phase 1: Session validation & error handling ✅
- Phase 2: Real-time sync & data integrity ✅
- Phase 3: Monitoring, testing & prevention ✅
