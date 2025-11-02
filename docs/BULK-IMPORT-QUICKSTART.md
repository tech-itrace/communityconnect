# Quick Start Guide: Bulk Import Members

## 🚀 Quick Test (2 minutes)

### 1. Start the Servers

**Terminal 1 - Backend:**
```bash
cd Server
npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd dashboard
npm run dev
```

### 2. Open Dashboard

Navigate to: http://localhost:5173

### 3. Set Your Phone (for testing)

Open browser console and run:
```javascript
localStorage.setItem("userPhone", "9876543210")
```

Then refresh the page.

### 4. Go to Members Page

Click on "Members" in the sidebar.

### 5. Click "Bulk Import"

You'll see a button "Bulk Import" next to "Add Member".

### 6. Upload CSV

**Option A: Download Template**
- Click "Download CSV Template" in the dialog
- Use the provided sample

**Option B: Use Existing Template**
- Use the file: `/docs/members_import_template.csv`

### 7. Import!

1. Drag & drop the CSV file or click to browse
2. Click "Import Members"
3. Wait for completion
4. Review the results

## ✅ What to Expect

**Success Result:**
```
✓ Successfully imported: 10 members
✗ Failed to import: 0 members
⚠ Duplicates skipped: 0 members
Total processed: 10 rows
```

**If You Get Errors:**
- Check CSV formatting (UTF-8 encoding)
- Ensure required fields: name, phone
- Verify phone numbers are unique
- File size must be under 5MB

## 📋 CSV Format

**Minimum Required:**
```csv
name,phone
John Doe,9876543210
Jane Smith,9876543211
```

**Full Example:**
```csv
name,phone,email,city,working_knowledge,degree,branch,organization_name,designation
John Doe,9876543210,john@example.com,Chennai,Software Development,B.E,Computer Science,Tech Corp,Senior Developer
```

## 🔧 Troubleshooting

### "No file uploaded" Error
- Make sure you selected a CSV file
- Check that file has `.csv` extension

### "CSV parse error"
- Open CSV in a text editor and check formatting
- Ensure first row has column headers
- Save as UTF-8 encoding

### "Member already exists"
- Phone numbers must be unique
- Remove duplicate phone numbers from CSV

### Can't see the import button
- You must be logged in as Admin or Super Admin
- Set your phone in localStorage as shown in step 3

## 📊 Test Data

Use the sample template at:
`/docs/members_import_template.csv`

Contains 10 sample members ready to import.

## 🎯 Next Steps

After successful import:
1. View imported members in the table
2. Search/filter to verify data
3. Edit individual members if needed
4. Try importing more members

---

**Need Help?** See full documentation: `/docs/BULK-IMPORT-MEMBERS.md`
