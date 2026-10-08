# FOCCPOREIA# FOCC — Fleet Operations Command Center
### Poreia Technologies — System Documentation

> **Version:** FOMS v1.0 (Phase 2)
> **Stack:** Vanilla JS + Supabase (PostgreSQL + Auth + Storage + Realtime)
> **Frontend:** Single-page app, no framework, modular files loaded by `index.html`

---

## 📁 FILE STRUCTURE — "Page tu duk file mana?"

Setiap page (`render...Page()`) **TIDAK** semua dalam satu file.
Ia dipecahkan ikut **domain**. Ini peta lengkap:

| File | Fungsi Utama | Page / Module Yang Dikandung |
|------|--------------|-------------------------------|
| **01-core.js** | Asas — constants, TABLES, ROUTES, helpers, formatting | Tiada page. Semua constants + `FMT`, `badgeFor`, `fmtDate`, `calcDaysRepair`, `TABLES{}` (definisi semua column) |
| **02-storage.js** | Data layer — Supabase client, provider routing, realtime | Tiada page. `loadTableData`, `saveTableData`, `getData`, `persist`, `SupabaseProvider`, `LocalStorageProvider` |
| **03-settings.js** | Settings config, backup/restore, Google Sheet, admin API | Tiada page. `getSettingsConfig`, `runBackup`, `restoreFromBackupPayload`, `adminInvoke`, `fetchFoccUsers` |
| **04-auth.js** | Login Supabase, session, bug report | Login screen, Bug Report modal, Bug Badge |
| **05-ui-helpers.js** | Table engine, modal, picker, combo | Tiada page. `buildTableHTML`, `renderDataPage`, `openAddRowModal`, `openEditRowModal`, `wireComboFields`, semua picker |
| **06-compliance.js** | Compliance Alert engine, KPI helpers, FEG helpers | Tiada page. `openComplianceAlertModal`, `kpiCard`, `rankTable`, `fegFinalStatus`, `fegStartService` |
| **07-pages-ops.js** | Operation pages | `renderOverview` (Main Menu), `renderMaintenanceDashboard` |
| **08-pages-safety.js** | Safety/Compliance pages | `renderComplianceDashboard`, `renderMisconductPage` (map), `renderSafetyPage` |
| **09-pages-fleet.js** | Fleet/Asset pages | `renderPrimeMoverPage`, `renderTrailerPage`, `renderStaffPage`, `renderHirarcRegisterPage` |
| **10-pages-notify.js** | FEG module (notification-adjacent) | `renderFegPage`, `renderFegDisposalPage`, `renderFegServiceHistoryPage`, `renderFegDetailView` |
| **11-pages-admin.js** | Admin pages | `renderSettingsPage`, `renderReleaseManagerPage`, `renderUserManagerPage`, `renderCompanyManagerPage`, `renderSystemHealthPage`, `renderModuleSkeleton` |
| **12-mascot.js** | Maskot burung hantu | Tiada page. Overlay UI sahaja |
| **13-boot.js** | ROUTES, NAV_STRUCTURE, router | `goTo`, `buildNav`, `initFOCC`, theme toggle, sidebar auto-hide |
| **index.html** | Shell | Landing page, login screen, legal pages, app shell |

### 🔑 Cari page? Guna table ni:

| Page | Fungsi | File |
|------|--------|------|
| Main Menu | `renderOverview` | 07-pages-ops.js |
| Maintenance Dashboard | `renderMaintenanceDashboard` | 07-pages-ops.js |
| Compliance Dashboard | `renderComplianceDashboard` | 08-pages-safety.js |
| Misconduct (Map) | `renderMisconductPage` | 08-pages-safety.js |
| Safety Equipment | `renderSafetyPage` | 08-pages-safety.js |
| **Prime Mover** | `renderPrimeMoverPage` | **09-pages-fleet.js** (Bahagian A) |
| **Trailer** | `renderTrailerPage` | **09-pages-fleet.js** (Bahagian B) |
| **Staff Database** | `renderStaffPage` | **09-pages-fleet.js** (Bahagian C) |
| HIRARC | `renderHirarcRegisterPage` | 09-pages-fleet.js (Bahagian C) |
| **FEG** | `renderFegPage` | **10-pages-notify.js** (Bahagian A) |
| FEG Disposal | `renderFegDisposalPage` | 10-pages-notify.js |
| FEG Service History | `renderFegServiceHistoryPage` | 10-pages-notify.js |
| Settings | `renderSettingsPage` | 11-pages-admin.js |
| Release Manager | `renderReleaseManagerPage` | 11-pages-admin.js |
| User Manager | `renderUserManagerPage` | 11-pages-admin.js |
| Company Manager | `renderCompanyManagerPage` | 11-pages-admin.js |
| System Health | `renderSystemHealthPage` | 11-pages-admin.js |
| Module Skeleton | `renderModuleSkeleton(key)` | 11-pages-admin.js |

---

## 🗺️ SETIAP PAGE — FUNGSI APA?

### 1. **Main Menu (`renderOverview`)** — `07-pages-ops.js`
- **Fungsi:** Papar hero banner + 3 group card (Operation / Maintenance / Compliance)
- **Link ke:** Tipper Ops, Container Ops, Tanker Ops, Mileage, Maintenance Dashboard, Maintenance Log, Machinery Log, Compliance Dashboard, Speeding, Misconduct, Safety Equipment, FEG, Prime Mover, Trailer, Staff Database
- **Tidak baca data** — statik sahaja

### 2. **Maintenance Dashboard (`renderMaintenanceDashboard`)** — `07-pages-ops.js`
- **Fungsi:** Kalendar + KPI maintenance harian
- **Data:** `maintenanceLog`, `machineryLog`
- **Feature:**
  - Kalendar (klik tarikh → filter)
  - KPI: total repair, vendor count, repair by date, total cost, payment status
  - Top Trucks — Most Repairs (By Date / All toggle)
  - Machinery Status (Wheel Loader, Excavator)
  - Table: Maintenance Log — Currently Repairing

### 3. **Compliance Dashboard (`renderComplianceDashboard`)** — `08-pages-safety.js`
- **Fungsi:** Central compliance monitoring — 5 tab
- **Data:** `speedingIdling`, `misconduct`, `safetyEquipment`, `feg`, `primeMover`, `trailer`, `staffDatabase`
- **Tab:**
  1. **Speeding & Idling** — Top speeding drivers, top idling drivers, filter by range (All / 7d / 30d / month / custom)
  2. **Misconduct** — Open cases only
  3. **Safety Equipment** — Truck + Staff (≤30 hari expiry)
  4. **Expiry Watch** — FEG, Prime Mover, Trailer, Documents Pending Upload (≤20 hari)
  5. **Staff** — Coverage matrix + staff nearing expiry
- **Filter:** Range presets + custom date
- **Auto warning:** Warning jika expiry ≤20 hari (Prime Mover/Trailer/FEG), ≤30 hari (Safety), ≤10 hari (Staff)

### 4. **Misconduct (`renderMisconductPage`)** — `08-pages-safety.js`
- **Fungsi:** Peta Peninsular Malaysia + table misconduct
- **Data:** `misconduct`, `staffDatabase`, `primeMover`
- **Feature:**
  - Leaflet map — klik untuk set lokasi + buka form
  - Marker per kes misconduct
  - Klik marker → popup (driver, date, category, lat/long)
  - Klik row → focus marker
  - Form: caseDate, branch, driver, truck, category, latitude, longitude, description, interview, form, emailHr, driverSignForm, emailCustomer, investigationReport, fishboneAnalysis, managementPresentation, emailResultCustomer, status, remark
  - Filter: branch

### 5. **Safety Equipment (`renderSafetyPage`)** — `08-pages-safety.js`
- **Fungsi:** Register peralatan keselamatan (Truck vs Staff)
- **Data:** `safetyEquipment`, `safetyInspection` (Supabase native), `safetyReceiving` (Supabase native), `feg`, `primeMover`, `staffDatabase`
- **Category:**
  - **Truck:** First Aid Kit, Triangle, Cone, Wheel Chock, Reflective String, Torchlight
  - **Staff:** Helmet, Safety Shoes, Reflective Vest
- **Detail View — 4 kad (View mode):**
  1. Group Info
  2. Equipment Items (item dates + next due +1 year)
  3. Inspection Form (list rekod + upload PDF/JPG/PNG)
  4. Receiving Form (list rekod + upload)
- **Staff mode:** Inspection Form **hidden** (hanya Receiving)
- **FEG link:** Kad Equipment Items ada button "Open FEG →" untuk truck
- **Detail View — Edit mode:** Card 1 (Group Info) + Card 2 (Equipment Items) + Card 3 (Inspection Form) + Card 4 (Receiving Form)
- **Receiving Form PDF:** Download template (Staff sahaja) — `downloadSafetyReceivingForm`
- **Compliance Alert button** → `openComplianceAlertModal('safetyEquipment')`

### 6. **Prime Mover (`renderPrimeMoverPage`)** — `09-pages-fleet.js` (Bahagian A)
- **Fungsi:** Register lori kepala (truck) + documents
- **Data:** `primeMover`, `trailer`, `staffDatabase`
- **List view:**
  - Table dengan link pada Truck No.
  - Filter: branch
  - Compliance Alert button
  - Add Row → `openAddRowModal` dengan `completeLabel: 'Save & Complete Details'`
- **Detail View:**
  - **5 section read-only/edit:**
    1. Vehicle Identity (lorry, branch, chassisNo, make, model, registerYear, goodsType)
    2. Specification (bdm, tankInfo, electricalSystem, deviceType)
    3. Cards & Identification (tngNo, fleetCardNo, rfidNo)
    4. Compliance Documents (roadtax, SG roadtax, puspakom, insurance)
    5. PMA & Notes
  - **Card 6:** Assigned Trailers (multi-select dari Trailer page) — `pmAssignedTrailersCardHtml`
  - **Card 7:** Documents (8 slot) — `pmDocumentsCardHtml`
    - PMA, Roadtax, SG Roadtax, Puspakom, Insurance, Vehicle Registration Cert, JPJ Weight Cert, Truck Plan DWG
    - Upload/Download/Delete (PDF max 5MB)
    - Pending upload indicator (jika expiry date berubah tapi file tak upload)
  - **Document update declaration:** Bila expiry date berubah → wajib pilih "Correction Only" atau "Document Renewal / Update"
  - **Trailer assignment:** Multi-checkbox, baca dari Trailer page (`assignedPrimeMover` auto-sync)
- **Extra field:** chassisNo, make, model, goodsType, tankInfo, electricalSystem, deviceType, tngNo, fleetCardNo (di export CSV sahaja)

### 7. **Trailer (`renderTrailerPage`)** — `09-pages-fleet.js` (Bahagian B)
- **Fungsi:** Register trailer + documents
- **Data:** `trailer`, `primeMover`
- **List view:**
  - Table dengan link pada Trailer No.
  - Filter: branch
  - Compliance Alert button
  - Add Row → `openAddRowModal` dengan `completeLabel: 'Save & Complete Details'`
- **Detail View:**
  - **4 section:**
    1. Trailer Identity (lorry, branch, chassisNo, make, model, type, registerYear)
    2. Specification (bdm, goodsType, capacity)
    3. Compliance Documents (roadtax, SG roadtax, puspakom, insurance)
    4. PMA & Notes
  - **Card 5:** Documents (8 slot) — `tlDocumentsCardHtml`
    - PMA, Roadtax, SG Roadtax, Puspakom, Insurance, Vehicle Registration Cert, JPJ Weight Cert, Trailer Plan DWG
  - **Assigned Prime Mover:** Auto-sync dari Prime Mover page (`syncTrailerPrimeMover`)
  - **Document update declaration:** Sama macam Prime Mover
- **Extra field:** chassisNo, make, model, goodsType, capacity (di export CSV sahaja)

### 8. **Staff Database (`renderStaffPage`)** — `09-pages-fleet.js` (Bahagian C)
- **Fungsi:** Register pekerja + documents
- **Data:** `staffDatabase`
- **List view:**
  - Table dengan link pada Staff Name
  - Filter: branch
  - Compliance Alert button
  - Visible columns: staffName, designation, employeeId, branch, workEmail, whatsapp, icNumber, tenure, age, licenseExpiry, gdlExpiry, drugTest, alcoholTest, medicalStatus, passportExpiry, employmentType, employmentStatus
  - Add Row → `openAddRowModal` dengan `completeLabel: 'Save & Complete Details'`
- **Detail View:**
  - **5 section:**
    1. Personal Details (staffName, icNumber, dateOfBirth, age, nationality)
    2. Employment (employeeId, designation, branch, dateHired, tenure, employmentType, employmentStatus, resignationDate)
    3. Contact (phone, whatsapp, personalEmail, workEmail, address)
    4. Driving & Travel Documents (licenseNumber, licenseExpiry, gdlNumber, gdlExpiry, passportNo, passportExpiry)
    5. Tests & Medical (drugTest, alcoholTest, medicalStatus)
  - **Card:** Documents (7 slot) — `stDocumentsCardHtml`
    - Passport, License, GDL, Drug Test, Alcohol Test, Medical Test, Employment Contract
    - Upload/Download/Delete (PDF/JPG/PNG max 5MB)
  - **Auto field:** whatsapp, tenure, age, employmentStatus
- **Auto-calculation:**
  - Drug Test → next +6 bulan
  - Alcohol Test → next +6 bulan
  - Medical → next +1 tahun

### 9. **HIRARC Register (`renderHirarcRegisterPage`)** — `09-pages-fleet.js` (Bahagian C)
- **Fungsi:** Hazard Identification, Risk Assessment & Risk Control register
- **Data:** `HIRARC_MASTER`, `HIRARC_HAZARDS`
- **List view:**
  - Table: refNo, department, process, location, raLeader, nextReviewDate, status
  - Add Row → `openNewHirarcModal` (auto-generate refNo `HIRARC-0001`)
  - Extra action: **Download PDF** (icon PDF)
- **Editor View (`renderHirarcEditorView`):**
  - Section 1: Master info (refNo, department, process, location, raLeader, approvedBy)
  - Section 2: Hazard table (workActivity, hazard, possibleInjury, existingControls, S, L, RPN, additionalControls, S2, L2, RPN2, implementationPerson, remarks)
  - Add hazard row, delete hazard row
  - Auto-calculate RPN = S × L
  - Auto-bullet: focus field → `• `, Enter → new line `\n• `
  - **Save Hazards** → persist ke `HIRARC_MASTER` + `HIRARC_HAZARDS`
- **PDF Export (`downloadHirarcPdf`):** HTML template + html2pdf.js (16 column, colored RPN)

### 10. **FEG (`renderFegPage`)** — `10-pages-notify.js` (Bahagian A)
- **Fungsi:** Fire Extinguisher register (per truck/location)
- **Data:** `feg`, `staffDatabase`, `primeMover`, `trailer`
- **List view:**
  - Table: assetType, assetRef, branch, unitSummary, createdInfo
  - Filter: branch
  - Compliance Alert button
  - **Import/Undo disabled** (sebab FEG guna unit-based structure)
- **Detail View (`renderFegDetailView`):**
  - **3 kad (View mode):**
    1. Group Info (assetType, assetRef, branch, created) — locked
    2. Extinguisher Units — table dengan 12 kolum + action (Service / Dispose)
    3. Documents — per unit, 2 unit side-by-side, pager ‹ 1/2 ›
  - **3 kad (Edit mode):**
    1. Group Info (locked)
    2. Extinguisher Units — editable, grid 2 kolum
    3. Inspection Form — list rekod + upload PDF/JPG/PNG
  - **Unit fields:**
    - serialPrefix (MY/SG), serialNo
    - driver, fegType (Dry Powder ABC/CO2/Foam), capacity (1kg/2kg/5kg/6kg/9kg)
    - mfgDate, serviceDate, inspectionDate, cylinderDue (auto: mfgDate + 10 tahun)
    - vendor (editable combo), manualStatus (In Service/In Use/Transfer/Under Inspection/Damaged/Missing/Expired)
    - remark (trigger final status), note (bebas)
  - **Unit Actions (jika `fegCanDispose()`):**
    - **Service** → `openFegServiceModal` → `fegStartService`
    - **Cancel Service** → `fegCancelService`
    - **Dispose** → `openFegDisposeModal` → `fegDisposeUnit`
    - **Restore** → `fegRestoreUnit`
  - **Final Status logic (`fegFinalStatus`):**
    - Disposed → `Disposed`
    - Under Service → `Under Service`
    - Cylinder replace zone → `Cylinder Due`
    - Service overdue → `Service Due`
    - No serial → `Draft`
    - Else → manualStatus / `In Service`
  - **Cylinder Replace Zone:** 8 bulan sebelum cylinderDue → tak boleh service, kena replace
  - **Documents (per unit):** Fire Cert + Purchase Invoice (PDF/JPG/PNG max 5MB)
- **FEG constants:**
  - `FEG_MAX_UNITS = 50`
  - `FEG_CYLINDER_TEST_YEARS = 10`
  - `FEG_CYLINDER_REPLACE_MONTHS = 8`

### 11. **FEG Disposal (`renderFegDisposalPage`)** — `10-pages-notify.js` (Bahagian A)
- **Fungsi:** Senarai unit yang telah dispose
- **Data:** `feg`
- **Table:** Date Disposed, Asset, Category, Branch, Serial, Type, Capacity, Vendor, Reason, Disposed By, Action (Restore)
- **Filter:** Search + Branch
- **Export CSV**
- **Restore button:** `fegRestoreUnit` (jika `fegCanDispose()`)
- **Empty state:** "No disposed units yet"

### 12. **FEG Service History (`renderFegServiceHistoryPage`)** — `10-pages-notify.js` (Bahagian A)
- **Fungsi:** Senarai service records (Active + Completed)
- **Data:** `feg` (via `fegServiceEntries()`)
- **Table:** Date Service, Asset, Category, Branch, Serial, Type, Capacity, Vendor, Reason, Service By, Status, Action
- **Filter:** Search + Branch
- **Export CSV**
- **Actions:**
  - **Complete Service** (jika Active) → `openFegCompleteServiceModal` → `fegCompleteService`
  - **Cancel** (jika Active) → `fegCancelService`
  - **Delete** (jika `canDelete`) → `fegDeleteServiceRecord`
- **Auto-jump:** Complete Service → jump ke FEG Detail + focus Fire Cert + Invoice (via `fegJumpSet`)

### 13. **Settings (`renderSettingsPage`)** — `11-pages-admin.js`
- **Fungsi:** Config, backup, restore
- **Section:**
  1. **Database Settings** (hidden) — Company Name, Sheet ID, Apps Script URL, Database Type (Local / Google Sheet), Test Connection, Save Configuration
  2. **Backup & Restore** — Backup Mode (Auto / Manual), Backup Email Distribution, Backup Now, Restore Backup, Backup Summary, Next Scheduled Backup, Backup History
  3. **System Information** — Version, Database Type, Last Backup, Total Records, Storage Usage
- **Backup History:** Table dengan Date, Time, File, Trigger, User, Status, Delete
- **Auto Backup:** Setiap Sabtu (jika app terbuka) — `checkAutoBackup()`
- **Backup Email:** Hantar JSON + Excel via `FOCC_BACKUP_API`

### 14. **Release Manager (`renderReleaseManagerPage`)** — `11-pages-admin.js`
- **Fungsi:** Publish release + manage bug reports
- **Layout:** 2 kolum (Publish Release | Bug Reports) + Release History di bawah
- **Publish Release:**
  - Version, Type (Feature/Fix/Improvement/Announcement), Title, Description
  - Publish Release button
  - Bug linking: dari Bug Reports → "Prepare Fix Release" → auto-fill form + link bugId
  - Publish → bug ditanda Fixed
- **Bug Reports:**
  - Table: Ref, Reported, By, Page, Severity, Title, Status, Actions
  - Klik View → `openBugDetailModal`
  - Set status: New / On Repairing / Ready for Release / Rejected / Fixed
  - Prepare Fix Release → pre-fill publish form
- **Release History:**
  - Table: Version, Date, Type, Title, Description, Actions
  - Latest release **dilindungi** (🔒 Latest) — tak boleh delete
  - Delete → `adminInvoke('delete_release')`
- **Admin Live Polling:** Refresh setiap 5s

### 15. **User Manager (`renderUserManagerPage`)** — `11-pages-admin.js`
- **Fungsi:** Manage user accounts
- **Metrics:** Total Users, Active, Suspended, Expiring Soon (≤30 hari)
- **Table:** Email, Company, Role, Status, Expiry Date, Version, Actions (Edit / Delete)
- **Filter:** Email, Company, Role
- **Add User** → `openUserFormModal` (email, company picker, companyId, role picker, expiryDate, status, **Allowed Access** per-module)
- **Edit User** → sama + Reset Password button
- **Delete User** → `foccDeleteUser`
- **Reset Version** → `foccResetUserVersion`
- **Allowed Access fieldset:** Build dari `NAV_STRUCTURE` — group by section, checkbox per route, "Grant ALL Access" toggle
- **Admin Live Polling:** Refresh setiap 5s

### 16. **Company Manager (`renderCompanyManagerPage`)** — `11-pages-admin.js`
- **Fungsi:** Manage companies
- **Table:** Company ID, Company, Google Sheet ID, Apps Script URL, Status, Actions (Edit / Delete)
- **Filter:** Search company name
- **Add Company** → `openCompanyFormModal` (company, companyId auto, googleSheetId, appsScriptUrl, status)
- **Edit Company** → sama
- **Delete Company** → `foccDeleteCompany`
- **Admin Live Polling:** Refresh setiap 5s

### 17. **System Health (`renderSystemHealthPage`)** — `11-pages-admin.js`
- **Fungsi:** SuperAdmin sahaja — health monitoring
- **Data:** `adminInvoke('system_health')`
- **Section:**
  1. **Web Status** — Healthy / Filling up / Nearly full / Attention, Last check, Round trip, DB query, Refresh button
  2. **Storage & Database** — Storage Used, Database Used, Uploaded Files, Largest Company, Speed, Storage Trend
  3. **Largest Tables** — dari Postgres
  4. **Company Activity & Usage** — 24h rolling window, table per company (Last sign-in, Data changed, Last upload, Storage, Files)
- **Storage Trend:** Disimpan di `localStorage` (`focc-sh-storage-trend-v1`), baseline per hari
- **Note:** Data computed live dari Supabase — tiada server-side storage

### 18. **Module Skeleton (`renderModuleSkeleton`)** — `11-pages-admin.js`
- **Fungsi:** Placeholder untuk module dalam development
- **Modules:** Tipper Ops Dashboard, Container Ops Dashboard, Tanker Ops Dashboard, Logistics Dashboard, Order Planning, Route Planning, Delivery Planning, POD Management, JISA, Invoice Management, Vendor Management, Petty Cash, Tipper Driver KPI, Container Driver KPI, Tanker Ops KPI, Tanker Driver KPI
- **Feature:** KPI cards (kosong), filter bar (disabled), table kosong, chart placeholder, "Skeleton · In Development" badge

---

## 📊 DATA TABLE MAPPING — "Data apa duduk mana?"

| Table Key | Storage Key | Provider | Supabase Native? | Digunakan oleh |
|-----------|-------------|----------|------------------|----------------|
| `operationKPI` | `kor-operation-kpi` | Supabase / Local | ❌ | Tipper Operation KPI |
| `containerOperationKPI` | `kor-container-operation-kpi` | Supabase / Local | ❌ | Container Operation KPI |
| `driverKPI` | `kor-driver-kpi` | Supabase / Local | ❌ | (Driver KPI — skeleton) |
| `mileage` | `kor-mileage` | Supabase / Local | ❌ | Mileage |
| `maintenanceLog` | `kor-maintenance-log` | Supabase / Local | ❌ | Maintenance Dashboard, Maintenance Log |
| `machineryLog` | `kor-machinery-log` | Supabase / Local | ❌ | Maintenance Dashboard, Machinery Log |
| `speedingIdling` | `kor-speeding-idling` | Supabase / Local | ❌ | Compliance Dashboard, Speeding |
| `misconduct` | `kor-misconduct` | Supabase / Local | ❌ | Compliance Dashboard, Misconduct |
| `safetyEquipment` | `kor-safety-equipment` | Supabase / Local | ❌ | Compliance Dashboard, Safety Equipment |
| `feg` | `kor-feg` | Supabase / Local | ❌ | Compliance Dashboard, FEG, FEG Disposal, FEG Service History |
| `primeMover` | `kor-prime-mover` | Supabase / Local | ❌ | Compliance Dashboard, Prime Mover |
| `trailer` | `kor-trailer` | Supabase / Local | ❌ | Compliance Dashboard, Trailer |
| `staffDatabase` | `kor-staff-database` | Supabase / Local | ❌ | Compliance Dashboard, Staff Database |
| `apadDocuments` | `kor-apad-documents` | Supabase / Local | ❌ | APAD Documents |
| `notificationContact` | `kor-notification-contact` | **Supabase** ✅ | ✅ | Compliance Alert |
| `whatsappGroups` | `kor-whatsapp-groups` | **Supabase** ✅ | ✅ | Compliance Alert |
| `notificationHistory` | `kor-notification-history` | Supabase / Local | ❌ | Notification History |
| `HIRARC_MASTER` | `kor-hirarc-master` | Supabase / Local | ❌ | HIRARC |
| `HIRARC_HAZARDS` | `kor-hirarc-hazards` | Supabase / Local | ❌ | HIRARC |
| `fegInspection` | (Supabase native) | **Supabase** ✅ | ✅ | FEG Detail |
| `fegAssetRefs` | (Supabase native) | **Supabase** ✅ | ✅ | FEG option list |
| `fegVendors` | (Supabase native) | **Supabase** ✅ | ✅ | FEG option list |
| `fegDisposalAudit` | (Supabase native) | **Supabase** ✅ | ✅ | FEG disposal audit |
| `safetyInspection` | (Supabase native) | **Supabase** ✅ | ✅ | Safety Equipment |
| `safetyReceiving` | (Supabase native) | **Supabase** ✅ | ✅ | Safety Equipment |

**Supabase Native Tables (direct Postgres, bukan `tenant_tables`):**
`staffDatabase`, `notificationContact`, `whatsappGroups`, `trailer`, `primeMover`, `feg`, `fegInspection`, `fegAssetRefs`, `fegVendors`, `fegDisposalAudit`, `safetyInspection`, `safetyReceiving`

> **Nota:** Walaupun `staffDatabase`, `trailer`, `primeMover`, `feg` ada dalam senarai native, `FOCC_SUPABASE_ONLY = true` → semua table guna Supabase provider.

---

## 🎯 COMPUTED FIELDS — Auto-calculate

| Field | Table | Formula |
|-------|-------|---------|
| `activeTruck` | operationKPI, containerOperationKPI | `totalTruck - repairTruck` |
| `utilization` | operationKPI, containerOperationKPI | `(active - repair) / active` |
| `totalHours` | operationKPI, containerOperationKPI | `operationEnd - operationStart` (HH:MM) |
| `achievement` | operationKPI, containerOperationKPI | `actualTon / targetTon` |
| `kpiSummary` | operationKPI | `<80%` / `<90%` / `<100%` / `Above 100%` |
| `tonMetric` | operationKPI | `actualTon / 1000` |
| `adjTarget` | driverKPI | `targetTrip - lostTrip` |
| `productivity` | driverKPI | `actualTrip / adjTarget` |
| `totalMileage` | mileage | `endMileage - startMileage` |
| `daysRepair` | maintenanceLog | `dateOut - dateIn` (0 jika tiada dateOut) |
| `status` | maintenanceLog | `Completed` / `Repairing` |
| `month` | operationKPI, containerOperationKPI, driverKPI, speedingIdling | Dari `date` |
| `age` | staffDatabase | Dari `dateOfBirth` |
| `tenure` | staffDatabase | Dari `dateHired` (+ `resignationDate`) |
| `whatsapp` | staffDatabase | WhatsApp link dari `phone` |
| `employmentStatus` | staffDatabase | `Active` / `Resigned` |
| `nextService` | machineryLog | `serviceDate + 1 bulan` |
| `inspectionDue` | FEG | `inspectionDate + 1 bulan` |
| `cylinderDue` | FEG | `mfgDate + 10 tahun` |
| `finalStatus` | FEG | Complex logic (lihat `fegFinalStatus`) |
| `serviceCount` | FEG | Bilangan completed service |
| `nextServiceNo` | FEG | `max(serviceNo) + 1` |
| `misconductNext` | misconduct | Field kosong pertama dalam flow |
| `misconductDaysOpen` | misconduct | `today - caseDate` |

---

## 🔐 AUTH & PERMISSION

### Login (`04-auth.js`)
1. `foccAutoLogin()` — baca session dari `localStorage` (`focc-session`)
2. Session max age: **24 jam**
3. Sahkan dengan Supabase Auth (`signInWithPassword`)
4. Baca `profiles` table (company, role, routes, expiry)
5. Baca `companies` table (google_sheet_id, apps_script_url, status)
6. Bina session object:
```js
{
  email, company, companyId, googleSheetId, appsScriptUrl,
  role, routes, expiryDate, version, loginTimestamp
}