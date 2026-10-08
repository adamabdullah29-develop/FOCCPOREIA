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

# FOCC — Fleet Operations Command Center
## Master Task List & Roadmap

**Poreia Technologies** — FOMS v1.0 (Phase 2)
**Last updated:** 2026
**Next review:** Selepas FASA 1 complete

---

## 📊 OVERVIEW — Roadmap Keseluruhan

```
FASA 1 — BLOCKER    (Minggu 1–3)   → Wajib siap sebelum customer pertama
FASA 2 — PILOT      (Minggu 4–6)   → Wajib siap sebelum data customer real
FASA 3 — STABILIZE  (Minggu 7–10)  → Wajib siap sebelum 10 customer
FASA 4 — SCALE      (Minggu 11–16) → Siap bila ada revenue stable
FASA 5 — KEMUDIAN   (Ongoing)      → Bila customer minta / ada masa
HOLD — Jangan buat lagi
```

**Legend:**
- 🔴 BLOCKER = mesti siap sebelum customer pertama
- 🟡 PILOT = mesti siap sebelum data customer sebenar masuk
- 🟢 KEMUDIAN = bila-bila selepas ada customer
- ⏸ HOLD = sengaja tunggu, jangan buat lagi

---

# 🔴 FASA 1 — BLOCKER (Minggu 1–3)

**Target:** Customer boleh sign DPA + login + reset password + import data.
**Jangan terima customer sebelum fasa ni siap.**

---

## TASK A — LEGAL DOCUMENTS 🔴

**Kenapa:** Tanpa ini, customer tak boleh sign. PDPA & ToS = legal shield.
**Fail:** `index.html` (section `<div id="foccLegalPage">`)
**Estimasi:** 1–2 hari
**Owner:** Founder

### A.1 Isi tempat kosong dalam legal docs

Cari dengan `Ctrl+F: [FILL` dalam `index.html` — akan jumpa ~15 tempat.

| # | Item | Fail kena isi | Jumlah tempat |
|---|------|---------------|---------------|
| 1 | SSM No. | Privacy (EN+BM), ToS (EN+BM) | 4 |
| 2 | Alamat berdaftar | Privacy, ToS, PDPA CT | 6 |
| 3 | Region Supabase | Privacy, PDPA CT | 4 |
| 4 | Tarikh kuatkuasa | Semua 5 legal docs (EN+BM) | 10 |

**Cadangan region:** `ap-southeast-1` (Singapore) — paling dekat dengan Malaysia.

### A.2 Setup emel korporat

- [ ] `privacy@poreiatech.com` — aktif (forward ke inbox)
- [ ] `security@poreiatech.com` — aktif
- [ ] `hello@poreiatech.com` — aktif
- [ ] `support@poreiatech.com` — aktif (baru — untuk support ticket)

**Tools:** Google Workspace (RM 25/user/mo) atau Zoho Mail (free tier).

### A.3 MFA (Multi-Factor Auth) — SEMUA akses kritikal

- [ ] Supabase Dashboard → MFA ON
- [ ] GitHub → MFA ON
- [ ] Hosting (Netlify/Vercel) → MFA ON
- [ ] Emel (Google Workspace) → MFA ON
- [ ] Domain registrar → MFA ON
- [ ] Payment gateway (Stripe/Billplz) → MFA ON

### A.4 DPA (Data Processing Agreement)

- [ ] Template DPA untuk customer tandatangan
- [ ] Simpan dalam Google Drive (shareable link)
- [ ] Link dalam ToS section 6
- [ ] Sediakan versi PDF + e-sign (DocuSign atau tandatangan manual dulu)

### A.5 Review legal docs dengan lawyer

- [ ] Hantar ke lawyer untuk review (RM 500–1500)
- [ ] Fix apa-apa yang perlu
- [ ] Save final version

---

## TASK F — AUTH & EMAIL 🔴

**Kenapa:** Sekarang HANYA SuperAdmin boleh reset password. Customer tersangkut = support ticket manual setiap kali.
**Fail:** `04-auth.js`, `index.html`, Supabase Dashboard
**Estimasi:** 2 hari
**Owner:** Dev

### F.1 Konfigurasi Supabase Auth email

- [ ] Supabase Dashboard → Auth → SMTP Settings
- [ ] Pilih provider: **Resend** (free 100 email/day) atau SMTP sendiri
- [ ] Set sender: `noreply@poreiatech.com`
- [ ] Test email delivery

### F.2 Customize email templates

- [ ] Auth → Email Templates → Confirm signup
- [ ] Auth → Email Templates → Reset password
- [ ] Auth → Email Templates → Magic link
- [ ] Auth → Email Templates → Change email
- [ ] Auth → Email Templates → Invite user

**Branding:** Poreia logo + footer "Fleet Operations Command Center".

### F.3 Add "Forgot Password" link

**Fail:** `index.html` (login card)

```html
<a href="#" onclick="foccForgotPassword(); return false;">Forgot password?</a>
```

### F.4 Fungsi forgot password

**Fail:** `04-auth.js`

```js
async function foccForgotPassword() {
  const email = prompt('Enter your email:');
  if (!email) return;
  const { error } = await FOCC_SUPABASE.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/#/reset-password'
  });
  if (error) alert('Error: ' + error.message);
  else alert('Check your email for reset link.');
}
```

### F.5 Halaman reset password

**Fail:** `index.html` (new screen) + `04-auth.js`

**Detect hash:**

```js
if (window.location.hash.includes('access_token=')) {
  showResetPasswordScreen();
}
```

**Form:** New password + confirm password → `updateUser({ password })`.

### F.6 Uji hantar email + tukar password

- [ ] Buat test account
- [ ] Request reset
- [ ] Check inbox (termasuk spam folder)
- [ ] Click link → set new password
- [ ] Login dengan password baru

### F.7 (Pilihan) Email invite bila add user

**Fail:** `03-settings.js` (`foccAddUser`)

**Sekarang:** `adminInvoke('create_user')` + `alert()` temp password.
**Target:** `inviteUserByEmail(email)` → user terima email, set own password.

**Kelebihan:** Lebih secure (SuperAdmin tak tahu password user).

---

## TASK G — BULK IMPORT 🔴

**Kenapa:** Customer baru dengan fleet 50 trak = 50 × 21 field = 1050 entry manual. Onboarding gagal sebelum mula.
**Fail:** `05-ui-helpers.js` (extend `renderDataPage`)
**Estimasi:** 5 hari
**Owner:** Dev

**Sekarang:** Import CSV dah ada — tapi:
- ❌ Tiada preview
- ❌ Tiada column mapping
- ❌ Tiada row-by-row error
- ❌ Tiada template download
- ❌ Tiada support `.xlsx`

### G.1 Upload .xlsx + .csv

- [ ] Guna SheetJS yang dah ada (`XLSX.read`)
- [ ] Detect file type (extension + MIME)
- [ ] Parse ke array of objects

### G.2 Preview table

- [ ] Show 10 rows pertama
- [ ] Show total row count
- [ ] Highlight duplicate rows

### G.3 Column mapping UI

- [ ] Dropdown per column: "Sheet column → FOCC field"
- [ ] Auto-detect by column name (fuzzy match)
- [ ] Save mapping untuk re-use

**Contoh UI:**

```
Sheet Column      →  FOCC Field
─────────────────────────────
"Truck No"        →  [lorry ▼]
"Branch"          →  [branch ▼]
"Register Year"   →  [registerYear ▼]
```

### G.4 Template download

- [ ] Generate `.xlsx` dengan header + 2 contoh rows
- [ ] Button "Download Template" di toolbar
- [ ] Per table ada template sendiri

### G.5 Row-by-row validation

- [ ] Check date format (`YYYY-MM-DD`)
- [ ] Check required fields (lorry, staffName, dll)
- [ ] Check duplicate (lorry number dah wujud)
- [ ] Check referential integrity (branch wujud ke tak)

### G.6 Error report

- [ ] Table: Row #, Column, Value, Error message
- [ ] Highlight error rows dalam preview
- [ ] Skip error rows option

### G.7 Confirm import

- [ ] Dialog: "Import 47 rows, skip 3 errors?"
- [ ] Progress bar
- [ ] Success message + link ke list

### G.8 Priority tables

1. **Prime Mover** (21 field) — paling penting
2. **Trailer** (20 field)
3. **Staff Database** (28 field)
4. FEG (nanti — structure berbeza, unit-based)

---

## TASK J — ONBOARDING & IN-APP HELP 🔴

**Kenapa:** Customer baru buka app, tak tahu mula mana. Churn dalam 7 hari pertama.
**Fail:** `07-pages-ops.js` (overview), `index.html`, `11-pages-admin.js`
**Estimasi:** 3 hari
**Owner:** Dev + Designer

### J.1 Onboarding checklist

**Fail:** `07-pages-ops.js` (`renderOverview`)

**Steps:**

| # | Step | Condition | Link |
|---|------|-----------|------|
| 1 | Add first staff | `staffDatabase.length > 0` | → Staff Database |
| 2 | Add first truck | `primeMover.length > 0` | → Prime Mover |
| 3 | Upload first document | Any `docs.*.fileName` exists | → Prime Mover Detail |
| 4 | Setup notification | `notificationContact.length > 0` | → Notification Contact |
| 5 | Send first alert | `notificationHistory.length > 0` | → Compliance Dashboard |

**UI:** Progress bar `2/5 steps complete` di atas hero.

**Hide bila complete semua** — atau tampal sebagai badge kecil.

### J.2 "How to Use" page

- [ ] Route baru: `howToUse`
- [ ] 5 section (satu per module utama)
- [ ] Screenshot placeholder
- [ ] Link dari sidebar (di bawah Main Menu)
- [ ] Content: Quick start, tips, FAQ

### J.3 Tooltip / nota pada medan penting

**Tambah tooltip pada:**

- [ ] Field "Reason Fail" — "Kenapa KPI tak capai target?"
- [ ] Field "Assigned Prime Mover" — "Auto-sync dari Prime Mover page"
- [ ] Field "Cylinder Test Due" — dah ada ✓
- [ ] Field "Manual Status" — "Pilih dari dropdown"
- [ ] Field "Final Status" — "Auto-calculate dari data"

**Component:** `<span class="tooltip" data-tip="...">?</span>`

### J.4 Empty state mengajar

**Sekarang:**

```html
<div>No records.</div>
```

**Target:**

```html
<div class="empty-state">
  <svg>...</svg>
  <h3>No Prime Mover records yet</h3>
  <p>Add your first truck manually, or import from Excel.</p>
  <button class="btn primary">+ Add Row</button>
  <button class="btn">📥 Download Template</button>
  <button class="btn">📤 Import Excel</button>
</div>
```

**Apply ke:** Semua `renderDataPage` yang ada empty state.

### J.5 Welcome video / GIF

- [ ] 60-second overview video (optional)
- [ ] Embed dalam overview page
- [ ] Host di YouTube (unlisted) atau self-host

### J.6 Sample data toggle

**Idea baru:** Bagi customer pilihan "Load sample data" untuk explore.

- [ ] Button "Try with sample data"
- [ ] Load 5 truck, 5 staff, 3 trailer dummy
- [ ] Button "Clear sample data" bila nak start real

---

# 🟡 FASA 2 — PILOT (Minggu 4–6)

**Target:** Customer boleh onboard sendiri + data isolated + billing enforced.

---

## TASK B — PLAN LIMITS PER COMPANY 🟡

**Kenapa:** Tanpa limit, customer bayar Starter (10 vehicles) tapi guna 50. Rugi.
**Fail:** `01-core.js`, `03-settings.js`, `11-pages-admin.js`, Supabase migrations
**Estimasi:** 4 hari
**Owner:** Dev + Supabase

### B.1 Schema migration

```sql
ALTER TABLE companies ADD COLUMN plan_code TEXT DEFAULT 'starter';
ALTER TABLE companies ADD COLUMN vehicle_limit INT DEFAULT 10;
ALTER TABLE companies ADD COLUMN user_limit INT DEFAULT 5;
ALTER TABLE companies ADD COLUMN limit_grace_until DATE;
ALTER TABLE companies ADD COLUMN billing_status TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN plan_started_at TIMESTAMPTZ DEFAULT NOW();
```

### B.2 Plan structure

| Plan | Code | Vehicle Limit | User Limit | Harga |
|------|------|---------------|------------|-------|
| Starter | `starter` | 10 | 5 | RM299 |
| Growth | `growth` | 25 | 15 | RM499 |
| Professional | `pro` | 50 | 30 | RM799 |
| Enterprise | `enterprise` | NULL (unlimited) | NULL (unlimited) | Custom |

### B.3 Set plan untuk company sedia ada

- [ ] SQL UPDATE untuk company existing
- [ ] Manual dulu, automation nanti

### B.4 Company Manager: dropdown plan

**Fail:** `11-pages-admin.js` (`openCompanyFormModal`)

- [ ] Dropdown: Starter / Growth / Professional / Enterprise
- [ ] Auto-set `vehicle_limit` + `user_limit` bila pilih plan
- [ ] Save ke `companies` table

### B.5 UI: counter display

**Fail:** Semua list page

- [ ] Prime Mover list: `8/10 vehicles` di section head
- [ ] Staff Database list: `4/5 users` di section head
- [ ] Color: hijau (<80%), kuning (80-99%), merah (100%)
- [ ] Tooltip: "Upgrade untuk tambah lagi"

### B.6 Disable Add button bila full

**Fail:** `05-ui-helpers.js` (`renderDataPage`)

```js
if (isAtLimit(tableKey)) {
  addRowBtn.disabled = true;
  addRowBtn.title = 'Limit reached. Upgrade plan.';
  addRowBtn.textContent = '🔒 Limit Reached';
}
```

### B.7 Edge Function: check user_limit

**Fail:** `admin-provision` Edge Function

- [ ] `create_user` action: check `user_limit` sebelum insert
- [ ] Return error: "User limit reached. Upgrade plan."

### B.8 DB trigger: check vehicle_limit

**Fail:** Supabase migration

```sql
CREATE OR REPLACE FUNCTION check_vehicle_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.table_key = 'primeMover' THEN
    -- Check count vs limit
    IF (SELECT COUNT(*) FROM jsonb_array_elements(NEW.payload)) >= 
       (SELECT vehicle_limit FROM companies WHERE company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'Vehicle limit reached';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### B.9 Grace period logic

```
IF user tries to ADD when at limit:
  IF billing_status = 'past_due' AND today < limit_grace_until:
    ALLOW (dengan warning banner)
  ELSE:
    BLOCK (tunjuk upgrade CTA)
```

### B.10 Uji dengan 2 company

- [ ] Company A: Starter (10 vehicles) — coba add 11th
- [ ] Company B: Growth (25 vehicles) — OK
- [ ] Test downgrade: Growth → Starter (dengan 20 vehicles)
- [ ] Test grace period: Over limit + past_due + dalam grace

---

## TASK K — DEV WORKFLOW & STAGING 🟡

**Kenapa:** Sekarang SQL edit terus dalam production. Satu silap = data rosak. Tak boleh rollback.
**Fail:** Baru: `supabase/migrations/` folder
**Estimasi:** 2 hari
**Owner:** Dev

### K.1 Projek Supabase STAGING

- [ ] Buat projek baru Supabase
- [ ] Copy schema dari production (dump + restore)
- [ ] Set sebagai staging environment
- [ ] Configure environment variables

### K.2 Init migrations folder

```bash
cd project
supabase init
supabase link --project-ref <production-ref>
```

### K.3 Guna `supabase db push`

- [ ] Jangan guna SQL Editor production
- [ ] Semua perubahan via migration file
- [ ] Format: `YYYYMMDDHHMMSS_description.sql`

### K.4 Secrets dalam env

- [ ] Pindah `FOCC_SUPABASE_URL` → Netlify env
- [ ] Pindah `FOCC_SUPABASE_KEY` → Netlify env
- [ ] Pindah `FOCC_BACKUP_API` → Netlify env
- [ ] Service role key → **server-side sahaja** (Edge Function secrets)

### K.5 Uji migration di staging

- [ ] Write migration
- [ ] `supabase db push --linked staging`
- [ ] Test feature di staging
- [ ] Review data integrity

### K.6 Push ke production

- [ ] Backup production dulu
- [ ] `supabase db push --linked production`
- [ ] Verify

### K.7 Git workflow

- [ ] Branch: `main` (production), `dev` (development)
- [ ] PR review sebelum merge
- [ ] Netlify deploy preview untuk PR

---

## TASK I — SECURITY HARDENING 🟡

**Kenapa:** Belum uji betul-betul. RLS boleh bocor, storage boleh leak.
**Fail:** Supabase Dashboard + testing checklist
**Estimasi:** 3 hari
**Owner:** Dev + QA

### I.1 Signup awam OFF

- [ ] Supabase Auth → Disable signup
- [ ] Hanya admin boleh create user

### I.2 CAPTCHA login

- [ ] Supabase Auth → Enable hCaptcha
- [ ] Configure hCaptcha keys

### I.3 Uji cross-company RLS

- [ ] Login Company A
- [ ] Try read Company B data via browser console:

```js
await supabase.from('tenant_tables').select('*').eq('company_id', 'B-uuid');
// Expected: 0 rows
```

- [ ] Try write ke Company B
- [ ] Try delete Company B

### I.4 Uji Storage cross-company

- [ ] Get signed URL untuk file company B path
- [ ] Expected: 403 Forbidden
- [ ] Try upload ke company B folder

### I.5 Uji Edge Function

- [ ] Invoke `admin-provision` tanpa token → 401
- [ ] Invoke sebagai non-SuperAdmin → 403
- [ ] Rate limit test

### I.6 Realtime DELETE event

**Fail:** `02-storage.js` (`startFOCCRealtime`)

**Sekarang:** Listen INSERT + UPDATE sahaja.
**Target:** Tambah DELETE listener.

```js
.on('postgres_changes', 
  { event: 'DELETE', schema: 'public', table: 'tenant_tables', filter: 'company_id=eq.' + companyId },
  foccRealtimeOnChange)
```

### I.7 Backup/restore test

- [ ] Buat backup JSON
- [ ] Buat test company
- [ ] Restore backup ke test company
- [ ] Verify data betul
- [ ] Delete test company

### I.8 Rate limiting

- [ ] Edge Function: limit 10 req/min per user
- [ ] Supabase: enable rate limit untuk auth

### I.9 Password policy

- [ ] Minimum 8 char
- [ ] Supabase Auth settings

### I.10 Session management

- [ ] Session expire: 24 jam (dah ada)
- [ ] Force logout bila role changed
- [ ] Concurrent session limit (optional)

---

## TASK H — AUDIT LOG UMUM 🟡

**Kenapa:** Ada separa (notificationHistory, fegDisposalAudit, createdBy). Tapi takde central audit trail.
**Fail:** Baru: `14-audit.js`
**Estimasi:** 3 hari
**Owner:** Dev

### H.1 Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,       -- 'create' | 'update' | 'delete'
  table_key TEXT NOT NULL,
  record_id TEXT,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_company_date ON audit_log(company_id, created_at DESC);
```

### H.2 Capture points

**Fail:** `05-ui-helpers.js`, `03-settings.js`

- [ ] `openAddRowModal` → commitAddRow (create)
- [ ] `openEditRowModal` → saveModal (update)
- [ ] `wireTable` → delBtn (delete)
- [ ] `foccAddUser` (user create)
- [ ] `foccUpdateUser` (user update)
- [ ] `foccDeleteUser` (user delete)
- [ ] `foccSetUserStatus` (user status change)

### H.3 PII scrubbing

**IMPORTANT:** Jangan log PII values dalam `changes`.

```js
// BAD:
changes: { icNumber: { from: '900615-14-5271', to: '910101-14-1234' } }

// GOOD:
changes: { icNumber: { changed: true } }
```

**Scrub list:** icNumber, passportNo, licenseNumber, gdlNumber, personalEmail, phone, address, medicalStatus, drugTest, alcoholTest.

### H.4 Page Audit Log

- [ ] Route baru: `auditLog`
- [ ] SuperAdmin + Admin sahaja
- [ ] Table: Date, User, Action, Table, Record, Changes
- [ ] Filter: date range, user, table, action
- [ ] Export CSV

### H.5 Retention policy

- [ ] Auto-delete audit log > 1 tahun
- [ ] Cron job via Supabase

---

## TASK L — OPS & RELIABILITY 🟡

**Kenapa:** Kalau app down, tak tahu. Customer call, baru tahu.
**Fail:** External tools
**Estimasi:** 1 hari setup + ongoing
**Owner:** Founder + Dev

### L.1 Uptime monitor

- [ ] Sign up Better Stack / UptimeRobot
- [ ] Monitor: `https://app.poreiatech.com`
- [ ] Check interval: 3 minit
- [ ] Alert: Telegram + SMS

### L.2 Status page awam

- [ ] Sign up Better Stack Status Page
- [ ] URL: `https://status.poreiatech.com`
- [ ] Auto-update dari monitor

### L.3 Runbook

**Fail:** Notion / Google Docs

**Content:**

1. **Backup & Restore**
   - Cara buat manual backup
   - Cara restore dari backup
   - Cara verify data betul

2. **Rollback**
   - Cara rollback migration
   - Cara rollback deployment

3. **Incident template**

```
[FOCC INCIDENT] <time>
Status: Investigating / Resolved
Impact: <who affected>
Action: <what we're doing>
ETA: <time>
```

4. **Common issues + fix**

### L.4 Support inbox

- [ ] WhatsApp Business API (RM 100/mo) atau Help Scout
- [ ] Auto-reply untuk off-hours
- [ ] Ticket tracking

### L.5 Upgrade Supabase

**IMPORTANT:** Supabase Free TIADA backup automatik.

- [ ] Upgrade ke Pro ($25/mo)
- [ ] Enable daily backup
- [ ] Enable point-in-time recovery

### L.6 Monitoring dashboard

- [ ] Supabase Dashboard → check daily
- [ ] Storage usage
- [ ] DB size
- [ ] Auth errors

---

# 🟢 FASA 3 — STABILIZE (Minggu 7–10)

**Target:** Siap sebelum 10 customer aktif.

---

## TASK C — SYSTEM FEEDBACK (Toast/Popup) 🟢

**Kenapa:** Sekarang guna `alert()` — UX kasar, menyusahkan.
**Fail:** Baru: `15-toast.js`
**Estimasi:** 2 hari
**Owner:** Dev

### C.1 Bina helper foccToast

```js
foccToast('Saved successfully', 'success');
foccToast('Upload failed', 'error');
foccToast('Loading...', 'info');
foccToast('Warning: 3 items due', 'warning');
```

### C.2 CSS blob (gooey filter)

- [ ] SVG gooey filter
- [ ] Position: kanan bawah (tapi tidak overlap mascot)
- [ ] Animation: slide + fade

### C.3 Toast positioning

- [ ] Selalu kanan bawah
- [ ] Stack: max 3 toast sekali
- [ ] Auto-dismiss: 3s (info), 5s (error)

### C.4 Migrate alert() → foccToast() BERPERINGKAT

**Batch 1:** Save success (dari `flashSaved`)
**Batch 2:** Upload/download errors
**Batch 3:** Delete confirmations
**Kekal `alert()`:** Destructive actions atau guna `confirmModal()`

### C.5 Audio feedback (optional)

- [ ] Success: soft "ding"
- [ ] Error: "buzz"
- [ ] Toggle ON/OFF di Settings

---

## TASK D — ROLE & PERMISSION MATRIX 🟢

**Kenapa:** Sekarang **semua user dalam company boleh baca/tulis/padam**. Bahaya.
**Fail:** Supabase RLS policies + `01-core.js`
**Estimasi:** 5 hari
**Owner:** Dev + Supabase
**Blocked by:** Semua page siap & diuji

### D.1 Matrix definition

| Route | SuperAdmin | Admin | Manager | Operation | Maintenance | Safety | Viewer |
|-------|-----------|-------|---------|-----------|-------------|--------|--------|
| overview | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| primeMover | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ | 👁 |
| trailer | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ | 👁 |
| staffDatabase | ✅ | ✅ | ✅ | 👁 | 👁 | ✅ | 👁 |
| maintenanceLog | ✅ | ✅ | ✅ | 👁 | ✏️ | 👁 | 👁 |
| feg | ✅ | ✅ | ✅ | 👁 | ✏️ | ✏️ | 👁 |
| misconduct | ✅ | ✅ | ✅ | 👁 | 👁 | ✏️ | 👁 |
| settings | ✅ | ✏️ | 👁 | ❌ | ❌ | ❌ | ❌ |
| userManager | ✅ | ✏️ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend:** ✅ = full, ✏️ = edit, 👁 = view only, ❌ = no access

### D.2 Storage policies

**Fail:** Supabase Storage RLS

```sql
-- SELECT: hanya role tertentu
CREATE POLICY "read_docs" ON storage.objects FOR SELECT
USING (
  bucket_id = 'focc-documents' AND
  (storage.foldername(name))[1] = (SELECT company_id FROM profiles WHERE id = auth.uid())::text AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Admin', 'Manager', 'Safety')
);

-- DELETE: hanya Admin + Manager
CREATE POLICY "delete_docs" ON storage.objects FOR DELETE
USING (
  bucket_id = 'focc-documents' AND
  (storage.foldername(name))[1] = (SELECT company_id FROM profiles WHERE id = auth.uid())::text AND
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('SuperAdmin', 'Admin', 'Manager')
);
```

### D.3 tenant_tables: Viewer = read-only

```sql
CREATE POLICY "viewer_read_only" ON tenant_tables FOR INSERT
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) != 'Viewer'
);
```

### D.4 PII protection (column-level)

**Fail:** `09-pages-fleet.js` (staff detail)

- [ ] Passport, IC, License, GDL, Employment Contract
- [ ] Hanya `Admin` + `Manager` boleh lihat
- [ ] Viewer + Operation: show `****`

**Implement:**

```js
function maskPII(value) {
  const role = getUserRole();
  if (['Admin', 'Manager', 'SuperAdmin'].includes(role)) return value;
  return value ? '•••••' + value.slice(-4) : '-';
}
```

### D.5 Uji setiap role

- [ ] Login dengan 1 akaun per role
- [ ] Test 2 company berasingan
- [ ] Verify akses betul

### D.6 UI: hide button

**Fail:** `05-ui-helpers.js`

- [ ] Hide "Add Row" kalau no permission
- [ ] Hide "Delete" kalau no permission
- [ ] Hide "Edit" kalau read-only

---

## TASK — QUICK WINS (Boleh buat sambil Fasa 3)

### QW.1 Driver KPI — Implement 🟡

**Kenapa:** `driverKPI` table dah ada seed. Cuma tak render.
**Fail:** `13-boot.js`

**Sekarang:**

```js
tipperDriverKPI: { render: () => renderModuleSkeleton('tipperDriverKPI') }
```

**Target:**

```js
tipperDriverKPI: { 
  render: () => renderDataPage('driverKPI', { 
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['truck', 'driver'],
  })
}
```

**Estimasi:** 1 jam

### QW.2 Trailer assignedPrimeMover — Guna assetId 🟡

**Kenapa:** Kalau rename truck, semua trailer assign hilang.
**Fail:** `09-pages-fleet.js` (`syncTrailerPrimeMover`)

**Sekarang:**

```js
map.set(a, String(pm.lorry || ''));
```

**Target:**

```js
map.set(a, String(pm.assetId || ''));
// Display: cari pm.lorry dari assetId
```

**Migration:** SQL update semua trailer lama → assetId.
**Estimasi:** 2 jam

### QW.3 Notification History — Filter date range 🟡

**Fail:** `13-boot.js` (`notificationHistory` route)

**Sekarang:** `filterFields: ['module', 'status']`
**Target:** Tambah date range picker.

**Estimasi:** 2 jam

### QW.4 Export PDF untuk semua table 🟡

**Fail:** `05-ui-helpers.js` (`renderDataPage`)

**Sekarang:** Export CSV sahaja.
**Target:** Dropdown: CSV / PDF / Excel.

**PDF layout:**

- Header: Company name, table name, date
- Table: semua column
- Footer: Page number

**Estimasi:** 4 jam (guna jsPDF yang dah ada)

### QW.5 Misconduct map — Sabah/Sarawak bounds 🟢

**Fail:** `08-pages-safety.js` (`createMisconductMapController`)

**Sekarang:**

```js
const bounds = L.latLngBounds([[0.7,99.4],[7.6,105.7]]);
```

**Target:**

```js
const bounds = L.latLngBounds([[0.7,99.4],[7.6,119.3]]);
```

**Estimasi:** 30 minit

### QW.6 Fix duplicate `fegDocSlotLabel` 🟢

**Kenapa:** Fungsi ni define 2 kali — dalam `05-ui-helpers.js` dan `10-pages-notify.js`. Yang kedua overwrite yang pertama.
**Fail:** `10-pages-notify.js` (line: `function fegDocSlotLabel(slotId)`)

**Action:** Padam satu (yang dalam `10-pages-notify.js`, kerana ia lebih ringkas).

**Estimasi:** 5 minit

### QW.7 Fix "goey-toast" typo 🟢

**Fail:** `TODO.txt` — sebut "goey-toast" tapi patut "gooey-toast".
**Action:** Update TODO.

**Estimasi:** 1 minit

---

# 🟢 FASA 4 — SCALE (Minggu 11–16)

**Target:** Bila ada revenue stable + 10+ customer.

---

## TASK E — MONITORING & ANALYTICS 🟢

**Kenapa:** Nak tahu app sehat ke tak, user guna apa, error apa.
**Fail:** Edge Function `system_metrics` + `11-pages-admin.js`
**Estimasi:** 3 hari
**Owner:** Dev

### E.1 Sentry setup

- [ ] Sign up Sentry (free 5k errors/month)
- [ ] Install: `<script src="...sentry.js"></script>`
- [ ] Init dengan scrub PII:

```js
Sentry.init({ 
  dsn: '...',
  beforeSend(event) {
    // Scrub PII
    return event;
  },
  replaysSessionSampleRate: 0, // OFF
  replaysOnErrorSampleRate: 0  // OFF
})
```

### E.2 Scrub PII

- [ ] Passport, IC, License, GDL — regex replace
- [ ] Email, phone — mask
- [ ] Session Replay: OFF (PII risk)

### E.3 Edge Function: system_metrics

```js
async function getSystemMetrics() {
  const sentryRes = await fetch('https://sentry.io/api/0/projects/.../issues/', {
    headers: { 'Authorization': 'Bearer ' + process.env.SENTRY_TOKEN }
  });
  return sentryRes.json();
}
```

### E.4 UI: kad "Errors" dalam System Health

- [ ] Error count (last 24h)
- [ ] Top errors (top 5)
- [ ] Affected users

### E.5 GA4

- [ ] Pasang bila mula **marketing sahaja**
- [ ] Bukan untuk audit data
- [ ] Track: page views, signup, demo booking

### E.6 Clarity

- [ ] **SKIP** dalam app berlogin (PII)
- [ ] Landing page awam sahaja

---

## TASK M — OWNER TOOLS 🟢

**Kenapa:** Support jadi susah bila tak tahu customer punya screen.
**Fail:** `11-pages-admin.js` (System Health extend)
**Estimasi:** 5 hari
**Owner:** Dev

### M.1 Login as user (impersonate)

- [ ] SuperAdmin klik "Impersonate" di User Manager
- [ ] Edge Function `impersonate_user` → generate temporary session
- [ ] App show banner: "🔴 Impersonating: user@company.com | [Exit]"
- [ ] Session expire: 30 minit
- [ ] **WAJIB:** log ke `audit_log` setiap kali

### M.2 Feature flags

```sql
CREATE TABLE feature_flags (
  company_id UUID,
  flag_name TEXT,
  enabled BOOLEAN,
  PRIMARY KEY (company_id, flag_name)
);
```

- [ ] UI: toggle di Company Manager- [ ] Guna: `isFeatureEnabled('new_dashboard')`

### M.3 Customer health

- [ ] Sign: company senyap (no login > 7 hari)
- [ ] Sign: no data added > 30 hari
- [ ] Sign: storage > 80%
- [ ] Display di System Health

### M.4 Bulk actions

- [ ] Suspend multiple users
- [ ] Reset password multiple users
- [ ] Export user list

---

## TASK N — TASK MANAGEMENT 🟢

**Kenapa:** Customer nak assign task ke staff (servis, renew roadtax).
**Fail:** Baru: `16-task.js`
**Estimasi:** 7 hari
**Owner:** Dev
**Blocked by:** F, D, B

### N.1 Schema

```sql
CREATE TABLE task_records (
  task_id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  asset_type TEXT,  -- 'primeMover' | 'trailer' | 'staff' | null
  asset_id TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open',
  assignee_staff_id UUID NOT NULL,  -- ⚠️ GUNA STAFF ID
  assigned_by TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

CREATE TABLE task_updates (
  update_id UUID PRIMARY KEY,
  task_id UUID REFERENCES task_records(task_id),
  note TEXT,
  attachment_path TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### N.2 ⚠️ CRITICAL: Assignee WAJIB dari Staff Database

- [ ] Dropdown dari `staffDatabase` — **BUKAN** taip bebas
- [ ] Simpan `assignee_staff_id` (UUID), bukan email
- [ ] Sebab: HR tukar email/nama → task kekal pada orang yang sama

### N.3 HR padam staff → arkib, jangan cascade

- [ ] Arkibkan staff (`archived: true`)
- [ ] Jangan cascade padam task
- [ ] Kekalkan nama assignee dalam sejarah task

### N.4 Task flow

```
Manager create task
  → Assign to staff
  → Staff nampak di "My Tasks"
  → Staff buat kerja, isi progress note
  → Staff tekan "Submit for Approval"
  → Manager Approve / Send back
  → Task closed
```

### N.5 UI

- [ ] Task list (manager view) — semua task
- [ ] My Tasks (staff view) — task dia sahaja
- [ ] Task detail — timeline + updates
- [ ] Create task form
- [ ] Submit/Approve buttons

### N.6 Notification

- [ ] Email bila task assigned (guna Task F)
- [ ] Email bila task submitted
- [ ] Email bila task approved

### N.7 Reports

- [ ] Task completion rate per staff
- [ ] Overdue tasks
- [ ] Task history

---

# 🟢 FASA 5 — KEMUDIAN (Ongoing)

**Bila ada customer minta / ada masa.**

---

## TASK O — MODULE SKELETON IMPLEMENT

### O.1 Tipper Operation KPI
**Table:** `operationKPI` (dah ada seed) · **Route:** `tipperOperationKPI` · **Estimasi:** 1 hari

### O.2 Container Operation KPI
**Table:** `containerOperationKPI` (dah ada seed) · **Route:** `containerOperationKPI` · **Estimasi:** 1 hari

### O.3 Tipper Driver KPI
**Table:** `driverKPI` (dah ada seed) · **Route:** `tipperDriverKPI` · **Estimasi:** 1 hari (dah sebut QW.1)

### O.4 Container Driver KPI
**Table:** Baru — `containerDriverKPI` · **Estimasi:** 2 hari

### O.5 Tanker Operation KPI
**Table:** Baru — `tankerOperationKPI` · **Estimasi:** 2 hari

### O.6 Tanker Driver KPI
**Table:** Baru — `tankerDriverKPI` · **Estimasi:** 2 hari

### O.7 Tipper Ops Dashboard
**Estimasi:** 3 hari

### O.8 Container Ops Dashboard
**Estimasi:** 3 hari

### O.9 Tanker Ops Dashboard
**Estimasi:** 3 hari

### O.10 Logistics Dashboard
**Estimasi:** 3 hari

### O.11 Order Planning
**Estimasi:** 3 hari

### O.12 Route Planning
**Estimasi:** 3 hari

### O.13 Delivery Planning
**Estimasi:** 3 hari

### O.14 POD Management
**Estimasi:** 4 hari

### O.15 JISA
**Estimasi:** 3 hari

### O.16 Invoice Management
**Estimasi:** 3 hari

### O.17 Vendor Management
**Estimasi:** 3 hari

### O.18 Petty Cash
**Estimasi:** 3 hari

---

## TASK P — MULTI-BRANCH PER USER 🟢

**Kenapa:** Sekarang 1 company = 1 branch access. Kalau manager handle 2 branch, tak boleh.
**Fail:** `01-core.js`, `profiles` table
**Estimasi:** 2 hari
**Owner:** Dev

### P.1 Schema

```sql
ALTER TABLE profiles ADD COLUMN allowed_branches TEXT[];
```

### P.2 UI: multi-select branch

- [ ] User form: multi-checkbox branch
- [ ] Save ke `allowed_branches`

### P.3 Filter data

```js
function filterByUserBranches(rows) {
  const session = getSession();
  const branches = session.allowed_branches || [];
  if (!branches.length) return rows;  // all access
  return rows.filter(r => branches.includes(r.branch));
}
```

### P.4 Apply ke semua list page

- [ ] Prime Mover
- [ ] Trailer
- [ ] Staff
- [ ] FEG
- [ ] Maintenance
- [ ] Compliance Dashboard

---

## TASK Q — ADVANCED FEATURES 🟢

### Q.1 System Health — trend chart
**Fail:** `11-pages-admin.js` · **Estimasi:** 3 jam

### Q.2 Notification — scheduled reminders
**Kenapa:** Sekarang manual. Nak auto-hantar tiap pagi.
**Fail:** `06-compliance.js` · **Estimasi:** 5 hari

### Q.3 Report builder
**Kenapa:** Customer nak custom report. · **Estimasi:** 7 hari

### Q.4 Mobile app (PWA)
**Kenapa:** Staff nak akses dari phone. · **Estimasi:** 5 hari
- [ ] Add manifest.json
- [ ] Add service worker
- [ ] Offline support
- [ ] Push notifications

### Q.5 Two-factor authentication (TOTP)
**Kenapa:** Security tambahan. · **Estimasi:** 3 hari

### Q.6 API untuk customer
**Kenapa:** Customer nak integrate dengan system lain. · **Estimasi:** 7 hari

### Q.7 Webhook
**Kenapa:** Customer nak receive event (contoh: new task created). · **Estimasi:** 3 hari

### Q.8 Custom fields
**Kenapa:** Customer nak tambah field sendiri. · **Estimasi:** 5 hari

### Q.9 Multi-language support
**Kenapa:** Sekarang English + BM. Nak tambah Chinese, Tamil. · **Estimasi:** 3 hari

### Q.10 Dark mode improvements
**Kenapa:** Sekarang OK tapi boleh improve. · **Estimasi:** 2 hari

---

# ⏸ HOLD — JANGAN BUAT LAGI

## Task D (Role & Permission)
**Tunggu:** Semua page siap & diuji. Sekarang masih ada module skeleton.
**Move to:** Fasa 3.

## Task N (Task Management)
**Tunggu:** A, B, D, F siap.
**Move to:** Fasa 4.

## Feature Flags (M.2)
**Tunggu:** Ada 10+ customer.
**Move to:** Fasa 5.

## Multi-branch (P)
**Tunggu:** Ada customer multi-branch.
**Move to:** Fasa 5.

---

# 📋 URUTAN BUAT (RECOMMENDED)

```
MINGGU 1–2 (FASA 1):
  Day 1–2:   Task A (Legal) — isi tempat kosong + setup emel + MFA
  Day 3–4:   Task F (Auth email) — SMTP + forgot password
  Day 5–7:   Task G.1–G.4 (Bulk import) — upload + preview + mapping
  Day 8–10:  Task G.5–G.8 (Bulk import) — validation + error + priority
  Day 11–14: Task J (Onboarding) — checklist + how to use + tooltip

MINGGU 3 (FASA 1 sambungan):
  Day 15–16: Test + bug fix
  Day 17–18: Task K (Staging setup)
  Day 19–21: Buffer + polish

MINGGU 4–5 (FASA 2):
  Day 22–25: Task B (Plan limits) — schema + UI + Edge Function
  Day 26–28: Task I (Security) — RLS test + backup test + realtime DELETE
  Day 29–31: Task H (Audit log) — schema + capture + page

MINGGU 6 (FASA 2 sambungan):
  Day 32:    Task L (Ops) — uptime monitor + status page + runbook
  Day 33:    QW.1 (Driver KPI) — 1 jam
  Day 34:    QW.2 (Trailer assetId) — 2 jam
  Day 35:    QW.3 (Notification filter) — 2 jam
  Day 36:    QW.4 (Export PDF) — 4 jam
  Day 37–38: Test + bug fix

MINGGU 7–8 (FASA 3 — Stabilize):
  Day 39–40: Task C (Toast)
  Day 41–45: Task D (Role & Permission) — tunggu semua page siap
  Day 46–47: QW.5 (Misconduct bounds) + QW.6 (Duplicate function)

MINGGU 9–10 (FASA 3 sambungan):
  Test dengan 2 company
  Bug fix
  Buffer

MINGGU 11–16 (FASA 4 — Scale):
  Task E (Monitoring)
  Task M (Owner tools)
  Task N (Task Management) — block by A, B, D, F

MINGGU 17+ (FASA 5):
  Module skeleton implement
  Advanced features
  Multi-branch
```

---

# 🎯 SUCCESS METRICS PER FASA

| Fasa | Metric |
|------|--------|
| FASA 1 | ✅ Customer boleh sign DPA + login + reset password + import Excel |
| FASA 2 | ✅ Customer onboard sendiri + data isolated + billing enforced |
| FASA 3 | ✅ 10 customer aktif + support ticket turun 50% |
| FASA 4 | ✅ 30 customer aktif + revenue stable + owner tools ready |
| FASA 5 | ✅ 50+ customer + advanced features + API |

---

# 📞 CONTACT & OWNERSHIP

| Task | Owner | Backup |
|------|-------|--------|
| A (Legal) | Founder | Lawyer |
| F (Auth) | Dev | Founder |
| G (Bulk import) | Dev | — |
| J (Onboarding) | Dev + Designer | Founder |
| B (Plan limits) | Dev + Supabase | — |
| K (Staging) | Dev | — |
| I (Security) | Dev + QA | Founder |
| H (Audit log) | Dev | — |
| L (Ops) | Founder + Dev | — |
| C (Toast) | Dev | — |
| D (Permission) | Dev + Supabase | — |
| E (Monitoring) | Dev | — |
| M (Owner tools) | Dev | Founder |
| N (Task mgmt) | Dev | — |
| O (Module skeleton) | Dev | — |
| P (Multi-branch) | Dev | — |
| Q (Advanced) | Dev | — |

---

# 📝 NOTA PENTING

1. **Jangan terima customer sebelum FASA 1 siap** — legal + auth + import = wajib
2. **Jangan deploy ke production tanpa staging** — Task K crucial
3. **Jangan skip security test** — Task I sebelum data real
4. **Jangan buat Task D & N awal** — tunggu semua page siap
5. **Backup production dulu sebelum migration**
6. **Log semua error, tapi JANGAN log PII**
7. **Test dengan 2 company** — pastikan RLS betul

---

*Last updated: 2026 — FOMS v1.0 (Phase 2)*
*Next review: selepas FASA 1 complete*