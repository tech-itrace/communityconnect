# Bulk Import Members Feature

## Overview

The bulk import feature allows administrators to import multiple community members at once using a CSV file upload through the dashboard. This significantly speeds up the onboarding process when adding many members to the system.

## Features

✅ **CSV File Upload** - Drag & drop or browse to upload CSV files  
✅ **Validation** - Validates required fields and phone number uniqueness  
✅ **Duplicate Detection** - Automatically skips members with existing phone numbers  
✅ **Error Reporting** - Detailed error messages for failed imports  
✅ **Progress Tracking** - Shows success/failure counts and detailed error logs  
✅ **Template Download** - Built-in CSV template download for correct formatting  

## How to Use

### Step 1: Access Bulk Import

1. Navigate to the **Members** page in the dashboard
2. Click the **"Bulk Import"** button (next to "Add Member")
3. The bulk import dialog will open

### Step 2: Prepare Your CSV File

Download the CSV template by clicking "Download CSV Template" in the dialog, or use the template at `/docs/members_import_template.csv`.

**Required Columns:**
- `name` - Full name of the member (required)
- `phone` - Phone number, must be unique (required)

**Optional Columns:**
- `email` - Email address
- `city` - City or location
- `working_knowledge` - Skills, expertise, or working knowledge
- `degree` - Educational degree
- `branch` - Branch of study
- `organization_name` - Current organization
- `designation` - Job title or designation

**CSV Format Example:**
```csv
name,phone,email,city,working_knowledge,degree,branch,organization_name,designation
John Doe,9876543210,john@example.com,Chennai,Software Development,B.E,Computer Science,Tech Corp,Senior Developer
Jane Smith,9876543211,jane@example.com,Bangalore,Data Science,M.Sc,Statistics,Data Inc,Data Scientist
```

### Step 3: Upload and Import

1. **Drag and drop** your CSV file into the upload area, or **click to browse**
2. Review the file information displayed
3. Click **"Import Members"** to start the import process
4. Wait for the import to complete

### Step 4: Review Results

After import completes, you'll see:
- ✓ **Successfully imported** - Number of members added
- ✗ **Failed to import** - Number of members that couldn't be added
- ⚠ **Duplicates skipped** - Number of duplicate phone numbers
- **Error details** - First 10 errors with row numbers and reasons

## Technical Implementation

### Backend API

**Endpoint:** `POST /api/members/bulk/import`  
**Authorization:** Requires Admin or Super Admin role  
**Content-Type:** `multipart/form-data`

**Request:**
```
FormData with 'file' field containing the CSV file
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed: 8 members imported successfully",
  "data": {
    "successCount": 8,
    "failedCount": 2,
    "duplicates": 1,
    "totalProcessed": 10,
    "errors": [
      {
        "row": 5,
        "error": "Missing required fields (phone or name)",
        "data": { ... }
      }
    ]
  }
}
```

### Backend Components

#### 1. Service Layer (`/Server/src/services/memberService.ts`)

```typescript
export async function bulkCreateMembers(membersData: Array<{...}>): Promise<{
    successCount: number;
    failedCount: number;
    errors: Array<{ row: number; error: string; data: any }>;
    duplicates: number;
}>
```

**Features:**
- Validates required fields (name, phone)
- Checks for duplicate phone numbers
- Inserts members one by one with error handling
- Returns detailed success/failure statistics

#### 2. Controller Layer (`/Server/src/controllers/memberController.ts`)

```typescript
export async function bulkImportMembersHandler(req: Request, res: Response)
```

**Features:**
- Validates file upload
- Parses CSV using `csv-parse`
- Maps CSV columns to member fields (flexible column naming)
- Calls bulkCreateMembers service
- Returns import results

#### 3. Routes (`/Server/src/routes/members.ts`)

```typescript
router.post('/bulk/import', 
  requireAnyRole(['admin', 'super_admin']), 
  upload.single('file'), 
  bulkImportMembersHandler
);
```

**Middleware:**
- `requireAnyRole(['admin', 'super_admin'])` - Authorization
- `upload.single('file')` - Multer file upload (5MB max, CSV only)

### Frontend Components

#### 1. BulkImportDialog Component (`/dashboard/src/components/BulkImportDialog.tsx`)

**Features:**
- Drag & drop file upload
- CSV file validation
- Template download
- Import progress display
- Error reporting UI

#### 2. API Client (`/dashboard/src/lib/api.ts`)

```typescript
bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/members/bulk/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
}
```

#### 3. Members Page Integration

Added "Bulk Import" button next to "Add Member" button with dialog integration.

## File Size & Limits

- **Maximum file size:** 5MB
- **File format:** CSV only (`.csv`)
- **Encoding:** UTF-8 (with BOM support)
- **Row limit:** No hard limit, but recommended max 1000 rows per import

## CSV Column Name Variations

The system accepts multiple column name variations:

| Standard Field | Accepted Variations |
|---------------|-------------------|
| `phone` | `phone`, `Phone`, `Phone number` |
| `name` | `name`, `Name` |
| `email` | `email`, `Email` |
| `city` | `city`, `City`, `City / Town of Living` |
| `working_knowledge` | `working_knowledge`, `Working Knowledge`, `skills`, `Skills` |
| `degree` | `degree`, `Degree` |
| `branch` | `branch`, `Branch` |
| `organization_name` | `organization_name`, `Organization Name`, `Organization Name:` |
| `designation` | `designation`, `Designation`, `Designation:` |

## Error Handling

### Common Errors

1. **Missing required fields**
   - Error: "Missing required fields (phone or name)"
   - Solution: Ensure all rows have both name and phone

2. **Duplicate phone numbers**
   - Error: "Member with this phone number already exists"
   - Solution: Remove duplicate entries or update existing members manually

3. **Invalid CSV format**
   - Error: "Failed to parse CSV file"
   - Solution: Check CSV formatting, encoding (use UTF-8), and column headers

4. **File too large**
   - Error: "File size exceeds 5MB limit"
   - Solution: Split the CSV into smaller files

5. **Invalid file type**
   - Error: "Only CSV files are allowed"
   - Solution: Ensure file has `.csv` extension

## Best Practices

1. **Validate your CSV** - Test with a small file first (5-10 rows)
2. **Remove duplicates** - Check for duplicate phone numbers before importing
3. **Use the template** - Download and use the provided template for correct formatting
4. **Clean your data** - Remove empty rows and unnecessary columns
5. **Batch imports** - For very large datasets (>500 rows), split into multiple files
6. **Review errors** - Check error messages and fix issues before re-importing

## Security

- ✅ **Role-based access** - Only Admins and Super Admins can import
- ✅ **File validation** - Only CSV files accepted
- ✅ **Size limits** - 5MB maximum file size
- ✅ **Duplicate prevention** - Phone numbers must be unique
- ✅ **Error isolation** - Failed rows don't affect successful imports

## Testing

### Test the Feature

1. **Start the backend server:**
   ```bash
   cd Server
   npm run dev
   ```

2. **Start the dashboard:**
   ```bash
   cd dashboard
   npm run dev
   ```

3. **Login to the dashboard** with a Super Admin account

4. **Use the sample template:**
   - Download from dialog or use `/docs/members_import_template.csv`

5. **Test scenarios:**
   - ✅ Valid import (all fields correct)
   - ✅ Missing required fields
   - ✅ Duplicate phone numbers
   - ✅ Large file (500+ rows)
   - ✅ Invalid CSV format

## Files Modified

### Backend
- `/Server/src/services/memberService.ts` - Added `bulkCreateMembers()`
- `/Server/src/controllers/memberController.ts` - Added `bulkImportMembersHandler()`
- `/Server/src/routes/members.ts` - Added bulk import route with multer

### Frontend
- `/dashboard/src/components/BulkImportDialog.tsx` - New dialog component
- `/dashboard/src/components/ui/dialog.tsx` - New dialog UI component
- `/dashboard/src/lib/api.ts` - Added `bulkImport()` to memberAPI
- `/dashboard/src/pages/Members.tsx` - Added bulk import button

### Documentation
- `/docs/members_import_template.csv` - Sample CSV template
- `/docs/BULK-IMPORT-MEMBERS.md` - This file

### Dependencies
- `multer` - File upload handling
- `@types/multer` - TypeScript types for multer
- `csv-parse` - CSV parsing (already installed)

## Future Enhancements

- [ ] Excel (.xlsx) file support
- [ ] Preview imported data before confirming
- [ ] Update existing members option
- [ ] Background job processing for large imports
- [ ] Email notification on completion
- [ ] Import history and rollback
- [ ] Custom field mapping UI
- [ ] Validation rules configuration

---

**Status:** ✅ Complete and Ready to Use  
**Version:** 1.0  
**Date:** October 22, 2025
