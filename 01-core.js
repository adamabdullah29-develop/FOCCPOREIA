/* =========================================================================
   FOCC — 01-core.js
   Bahagian paling asas: constants, TABLES, ROUTES, NAV_STRUCTURE,
   formatting utils, dan semua fungsi helper yang fungsi lain guna.
   ========================================================================= */

/* ============================================================
   4.1 FORMATTING UTILITIES — FMT, badgeFor, fmtDate
============================================================= */

const FMT = {
  pct: (v, decimals = 1) => (v == null || v === '') ? '-' : (Math.round(v * 100 * Math.pow(10, decimals)) / Math.pow(10, decimals)) + '%',
  num: v => (v == null || v === '') ? '-' : Number(v).toLocaleString(),
  money: v => (v == null || v === '') ? '-' : 'RM ' + Number(v).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}),
};

function badgeFor(value){
  const v = (value ?? '').toString().trim();
  const goodWords = ['complete','can running','paid','open-ok','ok','active','yes'];
  const badWords = ['exp','cannot use','not complete','breakdown','open'];
  const warnWords = ['please renew','pending','follow','repairing','under repair'];
  const lower = v.toLowerCase();
  if (!v || v === '-') return `<span class="badge neutral">-</span>`;
  if (warnWords.some(w => lower.includes(w))) return `<span class="badge warn">${v}</span>`;
  if (badWords.some(w => lower.includes(w))) return `<span class="badge bad">${v}</span>`;
  if (goodWords.some(w => lower.includes(w))) return `<span class="badge good">${v}</span>`;
  return `<span class="badge neutral">${v}</span>`;
}

function fmtDate(v){
  if (!v) return '-';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d)) return d.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
  }
  return v;
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

/* ---------------------------------------------------------------------
   TABLE DEFINITIONS
   Each column: {id, label, type: 'text'|'number'|'date'|'select'|'badge'|'pct'|'money', options?}
--------------------------------------------------------------------- */

/* ---- 4.2 FLEET CONSTANTS — Trucks, Trailers, Drivers ---- */

const TRUCKS = ['CDM 5679','CDM 5682','CDM 5683','CDM 6088','CDM 7669','CDM 7704','CDN 557','CDN 7965','CDQ 723','CDQ 724','CDQ 725','CDJ 8526','CDJ 9136','CDJ 9337','CDN 5440','CDQ 4519','CDN 7507','CDN 7508'];
const TRAILERS = [' T/BC 5206',' T/BC 5204',' T/BC 5202',' T/BC 5210',' T/BC 5211'];
const DRIVERS = ['RAJA SAMSUL SAIFUL HAIZAN BIN RAJA SALLEH','CHE JEFRI BIN CHE GHAZALI','MOHAMAD IRMAN BIN MAT HARUN','AZLAN BIN ISMAIL','ZULKIFLI BIN OTHMAN','FAIZAL BIN AHMAD','ROSLAN BIN KASSIM'];

/* ---- 4.3 TABLES — Column Definitions (all modules) ---- */

const TABLES = {

  operationKPI: {
    label: 'Operation KPI',
    storageKey: 'kor-operation-kpi',
    columns: [
      {id:'date', label:'Date', type:'date'},
      {id:'month', label:'Month', type:'text'},
      {id:'year', label:'Year', type:'text'},
      {id:'vessel', label:'Vessel Name', type:'text'},
      {id:'totalTruck', label:'Total Truck', type:'number'},
      {id:'repairTruck', label:'Repair Truck', type:'number'},
      {id:'activeTruck', label:'Active Truck', type:'number'},
      {id:'utilization', label:'Truck Utilization', type:'pct', decimals:0},
      {id:'operation', label:'Operation', type:'select', options:['Inbound','Outbound','Direct']},
      {id:'operationStart', label:'Operation Start', type:'time'},
      {id:'operationEnd', label:'Operation End', type:'time'},
      {id:'totalHours', label:'Total Operation Hours', type:'text'},
      {id:'targetTon', label:'Target (Kilogram)', type:'number'},
      {id:'actualTon', label:'Actual (Kilogram)', type:'number'},
      {id:'tonMetric', label:'Ton (Metric)', type:'number'},
      {id:'trips', label:'Total Trips', type:'number'},
      {id:'achievement', label:'Achievement %', type:'pct', decimals:0},
      {id:'kpiSummary', label:'KPI Summary', type:'badge'},
      {id:'companyManpower', label:'Company Manpower', type:'number'},
      {id:'outsideManpower', label:'Outside Manpower', type:'number'},
      {id:'manpower', label:'Total Manpower', type:'number'},
      {id:'foodCost', label:'Food Cost', type:'money'},
      {id:'reason', label:'Reason Fail', type:'text'},
    ],
    seed: [],
  },

  containerOperationKPI: {
    label: 'Container Operation KPI',
    storageKey: 'kor-container-operation-kpi',
    columns: [
      {id:'date', label:'Date', type:'date'},
      {id:'month', label:'Month', type:'text'},
      {id:'year', label:'Year', type:'text'},
      {id:'totalOrder', label:'Total Order', type:'number'},
      {id:'actualComplete', label:'Actual Complete', type:'number'},
      {id:'achievement', label:'Achievement %', type:'pct', decimals:0},
      {id:'totalTruck', label:'Total Truck', type:'number'},
      {id:'repairTruck', label:'Repair Truck', type:'number'},
      {id:'activeTruck', label:'Active Truck', type:'number'},
      {id:'utilization', label:'Truck Utilization', type:'pct', decimals:0},
      {id:'operation', label:'Operation', type:'select', options:['Inbound','Outbound','Direct']},
      {id:'operationStart', label:'Operation Start', type:'time'},
      {id:'operationEnd', label:'Operation End', type:'time'},
      {id:'totalHours', label:'Total Operation Hours', type:'text'},
      {id:'reason', label:'Reason Fail', type:'text'},
    ],
    seed: [],
  },

  driverKPI: {
    label: 'Driver KPI',
    storageKey: 'kor-driver-kpi',
    columns: [
      {id:'date', label:'Date', type:'date'},
      {id:'month', label:'Month', type:'text'},
      {id:'year', label:'Year', type:'text'},
      {id:'truck', label:'Truck No', type:'select', options: TRUCKS},
      {id:'driver', label:'Driver Name', type:'select', options: DRIVERS},
      {id:'vessel', label:'Vessel Name', type:'text'},
      {id:'operation', label:'Operation', type:'select', options:['Inbound','Outbound','Direct']},
      {id:'targetTrip', label:'Target Trip', type:'number'},
      {id:'actualTrip', label:'Actual Trip', type:'number'},
      {id:'lostTrip', label:'Lost Trip (Breakdown)', type:'number'},
      {id:'adjTarget', label:'Adjusted Target', type:'number'},
      {id:'productivity', label:'Daily Productivity %', type:'pct'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {date:'2026-07-15', month:'July', year:'2026', truck:'CDM 5679', driver:'RAJA SAMSUL SAIFUL HAIZAN BIN RAJA SALLEH', vessel:'Vessel 1', operation:'Inbound', targetTrip:4, actualTrip:4, lostTrip:1, adjTarget:4, productivity:1.0, remark:''},
      {date:'2026-08-12', month:'August', year:'2026', truck:'CDM 5682', driver:'CHE JEFRI BIN CHE GHAZALI', vessel:'Vessel 1', operation:'Inbound', targetTrip:4, actualTrip:3, lostTrip:0, adjTarget:4, productivity:0.75, remark:'Traffic jam'},
      {date:'2026-08-12', month:'August', year:'2026', truck:'CDM 6088', driver:'AZLAN BIN ISMAIL', vessel:'Vessel 1', operation:'Outbound', targetTrip:5, actualTrip:5, lostTrip:0, adjTarget:5, productivity:1.0, remark:''},
      {date:'2026-08-13', month:'August', year:'2026', truck:'CDN 557', driver:'ZULKIFLI BIN OTHMAN', vessel:'Vessel 1', operation:'Direct', targetTrip:4, actualTrip:2, lostTrip:2, adjTarget:4, productivity:0.5, remark:'Breakdown - tyre'},
    ],
  },

  mileage: {
    label: 'Mileage',
    storageKey: 'kor-mileage',
    columns: [
      {id:'truck', label:'Truck No', type:'select', options: TRUCKS},
      {id:'month', label:'Month', type:'select', options:['January','February','March','April','May','June','July','August','September','October','November','December']},
      {id:'year', label:'Year', type:'text'},
      {id:'startMileage', label:'Start Mileage', type:'number'},
      {id:'endMileage', label:'End Mileage', type:'number'},
      {id:'totalMileage', label:'Total Mileage', type:'number'},
    ],
    seed: [
      {truck:'CDM 5679', month:'August', year:'2026', startMileage:65565.3, endMileage:63210.6, totalMileage:2354.7},
      {truck:'CDM 5682', month:'August', year:'2026', startMileage:54835.1, endMileage:52580.7, totalMileage:2254.4},
      {truck:'CDM 5683', month:'August', year:'2026', startMileage:58511.4, endMileage:56237.8, totalMileage:2273.6},
    ],
  },

  maintenanceLog: {
    label: 'Maintenance Log',
    storageKey: 'kor-maintenance-log',
    columns: [
      {id:'truck', label:'Truck No', type:'select', options: TRUCKS},
      {id:'vessel', label:'Vessel Name', type:'text'},
      {id:'scenePlace', label:'Scene Place', type:'text'},
      {id:'reason', label:'Reason', type:'text'},
      {id:'action', label:'Action Taken', type:'text'},
      {id:'repairPlace', label:'Repair Place', type:'text'},
      {id:'vendor', label:'Vendor Name', type:'text'},
      {id:'dateIn', label:'Date In', type:'date'},
      {id:'dateOut', label:'Date Out', type:'date'},
      {id:'daysRepair', label:'Days Repair', type:'computed-days-repair'},
      {id:'status', label:'Status', type:'computed-repair-status'},
      {id:'invoiceDate', label:'Invoice Date', type:'date'},
      {id:'invoiceNo', label:'Invoice No', type:'text'},
      {id:'cost', label:'Cost', type:'money'},
      {id:'paymentStatus', label:'Payment Status', type:'select', options:['Pending','Paid']},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {truck:'CDM 5682', vessel:'Vessel 1', scenePlace:'Side Road', reason:'Breakdown Tyre', action:'Repair At The Same Place', repairPlace:'Side Road', vendor:'Adli Tyre', dateIn:'2026-08-13', dateOut:'', daysRepair:0, status:'Repairing', invoiceDate:'', invoiceNo:'', cost:15000, paymentStatus:'Pending', remark:''},
      {truck:'CDM 6088', vessel:'Vessel 1', scenePlace:'Puspakom', reason:'Puspakom Fail', action:'Repair At CJKX', repairPlace:'CJKX Workshop', vendor:'Self Repair', dateIn:'2026-08-13', dateOut:'', daysRepair:0, status:'Repairing', invoiceDate:'', invoiceNo:'', cost:0, paymentStatus:'Pending', remark:''},
      {truck:'CDN 557', vessel:'Vessel 1', scenePlace:'Workshop', reason:'Engine Overheat', action:'Full Service', repairPlace:'Main Workshop', vendor:'Adli Tyre', dateIn:'2026-08-05', dateOut:'2026-08-07', daysRepair:2, status:'Completed', invoiceDate:'2026-08-07', invoiceNo:'INV-2201', cost:2450, paymentStatus:'Paid', remark:''},
    ],
  },

  machineryLog: {
    label: 'Machinery Log',
    storageKey: 'kor-machinery-log',
    columns: [
      {id:'equipment', label:'Equipment', type:'text'},
      {id:'category', label:'Category', type:'text'},
      {id:'repairDate', label:'Repair Date', type:'date'},
      {id:'serviceDate', label:'Service Date', type:'date'},
      {id:'mobDemobDate', label:'Mob/Demob Date', type:'date'},
      {id:'vendor', label:'Vendor Name', type:'text'},
      {id:'invoiceDate', label:'Invoice Date', type:'date'},
      {id:'invoiceNo', label:'Invoice No', type:'text'},
      {id:'cost', label:'Cost', type:'money'},
      {id:'paymentStatus', label:'Payment Status', type:'select', options:['Pending','Paid']},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {equipment:'Wheel Loader', category:'Repair', repairDate:'2026-08-13', serviceDate:'', mobDemobDate:'', vendor:'', invoiceDate:'', invoiceNo:'', cost:0, paymentStatus:'Pending', remark:''},
      {equipment:'Wheel Loader', category:'Service', repairDate:'', serviceDate:'2026-08-13', mobDemobDate:'', vendor:'', invoiceDate:'', invoiceNo:'', cost:0, paymentStatus:'Paid', remark:''},
      {equipment:'Excavator', category:'Service', repairDate:'', serviceDate:'2026-07-30', mobDemobDate:'', vendor:'Heavy Equip Sdn Bhd', invoiceDate:'2026-07-31', invoiceNo:'INV-889', cost:1800, paymentStatus:'Paid', remark:''},
    ],
  },

  speedingIdling: {
    label: 'Speeding & Idling',
    storageKey: 'kor-speeding-idling',
    columns: [
      {id:'branch', label:'Branch', type:'text'},
      {id:'driver', label:'Driver Name', type:'select', options: DRIVERS},
      {id:'truck', label:'Truck No', type:'select', options: TRUCKS},
      {id:'date', label:'Date', type:'date'},
      {id:'month', label:'Month', type:'computed-month'},
      {id:'idleDuration', label:'Idle Duration (HH:MM)', type:'text'},
      {id:'idleFuel', label:'Idling Fuel Usage (L)', type:'number'},
      {id:'idleCost', label:'Idle Cost (RM)', type:'money'},
      {id:'over80', label:'>80 km/h', type:'number'},
      {id:'over90', label:'>90 km/h', type:'number'},
      {id:'over100', label:'>100 km/h', type:'number'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {driver:'RAJA SAMSUL SAIFUL HAIZAN BIN RAJA SALLEH', truck:'CDN 7507', date:'2026-07-21', month:'July', idleDuration:'23:59', idleFuel:72, idleCost:368.38, over80:2, over90:0, over100:0},
      {driver:'AZLAN BIN ISMAIL', truck:'CDM 6088', date:'2026-08-02', month:'August', idleDuration:'02:15', idleFuel:9, idleCost:41.20, over80:0, over90:1, over100:0},
    ],
  },

  misconduct: {
    label: 'Misconduct',
    storageKey: 'kor-misconduct',
    columns: [
      {id:'caseDate', label:'Case Date', type:'date'},
      {id:'driver', label:'Driver Name', type:'select', options: DRIVERS},
      {id:'nextStep', label:'Next Step', type:'computed-misconduct-next'},
      {id:'daysOpen', label:'Days Open', type:'computed-misconduct-days'},
      {id:'branch', label:'Branch', type:'select', options: []},
      {id:'truck', label:'Truck No', type:'select', options: TRUCKS},
      {id:'category', label:'Case Category', type:'select', options:['Property Damage','Speeding','Absent Without Notice','Accident','Other']},
      {id:'latitude', label:'Latitude', type:'text'},
      {id:'longitude', label:'Longitude', type:'text'},
      {id:'description', label:'Case Description', type:'text'},
      {id:'interview', label:'Driver Interview', type:'date'},
      {id:'form', label:'Misconduct Form', type:'date'},
      {id:'emailHr', label:'Email To HR', type:'date'},
      {id:'driverSignForm', label:'Driver Sign Form', type:'date'},
      {id:'emailCustomer', label:'Email To Customer', type:'date'},
      {id:'investigationReport', label:'Investigation Report', type:'date'},
      {id:'fishboneAnalysis', label:'Fishbone Analysis', type:'date'},
      {id:'managementPresentation', label:'Management Presentation', type:'date'},
      {id:'emailResultCustomer', label:'Email Result to Customer', type:'date'},
      {id:'status', label:'Case Status', type:'badge'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {caseDate:'2026-07-20', driver:'MOHAMAD IRMAN BIN MAT HARUN', category:'Property Damage', description:'Hit Warehouse Door', interview:'', form:'', emailHr:'', driverSignForm:'', emailCustomer:'', investigationReport:'', fishboneAnalysis:'', managementPresentation:'', emailResultCustomer:'', status:'Open'},
      {caseDate:'2026-07-21', driver:'', category:'Property Damage', description:'Hit Warehouse Door', interview:'', form:'', emailHr:'', driverSignForm:'', emailCustomer:'', investigationReport:'', fishboneAnalysis:'', managementPresentation:'', emailResultCustomer:'', status:'Open'},
    ],
  },

  safetyEquipment: {
    label: 'Safety Equipment',
    storageKey: 'kor-safety-equipment',
    columns: [
      {id:'category', label:'Category', type:'select', options:['Truck','Staff']},
      {id:'asset', label:'Asset / Staff', type:'select', options: TRUCKS},
      {id:'branch', label:'Branch', type:'text'},
      {id:'inspectionDate', label:'Inspection Date', type:'date'},
      {id:'firstAid', label:'First Aid Kit', type:'date'},
      {id:'triangle', label:'Triangle', type:'date'},
      {id:'cone', label:'Cone (5 unit)', type:'date'},
      {id:'wheelChock', label:'Wheel Chock', type:'date'},
      {id:'reflectiveString', label:'Reflective String', type:'date'},
      {id:'torchlight', label:'Torchlight', type:'date'},
      {id:'helmet', label:'Helmet', type:'date'},
      {id:'safetyShoes', label:'Safety Shoes', type:'date'},
      {id:'reflectiveVest', label:'Reflective Vest', type:'date'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {category:'Truck', asset:'CDM 5679', branch:'Kemaman', inspectionDate:'', firstAid:'2026-08-13', triangle:'2026-08-13', cone:'2026-08-13', wheelChock:'2026-08-13', reflectiveString:'2026-08-13', torchlight:'2026-08-13', fireExt:'2026-08-13', helmet:'', safetyShoes:'', reflectiveVest:'', remark:''},
      {category:'Truck', asset:'CDM 5682', branch:'Kemaman', inspectionDate:'', firstAid:'2026-08-13', triangle:'2026-08-13', cone:'2026-08-13', wheelChock:'2026-08-13', reflectiveString:'2026-08-13', torchlight:'2026-08-13', fireExt:'2026-08-13', helmet:'', safetyShoes:'', reflectiveVest:'', remark:''},
      {category:'Truck', asset:'CDM 5683', branch:'Kemaman', inspectionDate:'', firstAid:'2026-08-13', triangle:'', cone:'2026-08-13', wheelChock:'', reflectiveString:'2026-08-13', torchlight:'2026-08-13', fireExt:'2026-08-13', helmet:'', safetyShoes:'', reflectiveVest:'', remark:''},
      {category:'Truck', asset:'CDJ 9337', branch:'Kemaman', inspectionDate:'', firstAid:'2026-08-13', triangle:'', cone:'', wheelChock:'2026-08-13', reflectiveString:'2026-08-13', torchlight:'', fireExt:'2026-08-13', helmet:'', safetyShoes:'', reflectiveVest:'', remark:''},
    ],
  },

  feg: {
    label: 'FEG (Fire Extinguisher)',
    storageKey: 'kor-feg',
    columns: [
      {id:'assetType', label:'Category',         type:'select', options:['Asset','Building']},
      {id:'assetRef',  label:'Asset / Location', type:'text'},
      {id:'branch',    label:'Branch',           type:'text'},
      {id:'unitSummary', label:'Units',          type:'computed-feg-units'},
      {id:'createdInfo', label:'Created By',     type:'computed-feg-created'},
    ],
    seed: [],
  },

  primeMover: {
    label: 'Prime Mover',
    storageKey: 'kor-prime-mover',
    columns: [
      {id:'lorry', label:'Truck No.', type:'text'},
      {id:'bdm', label:'BDM (kg)', type:'number'},
      {id:'registerYear', label:'Register Year', type:'text'},
      {id:'branch', label:'Branch', type:'text'},
      {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
      {id:'roadtax', label:'Roadtax Expiry Date', type:'date'},
      {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
      {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
      {id:'puspakomNo', label:'Puspakom No.', type:'text'},
      {id:'puspakom', label:'Puspakom Expiry Date', type:'date'},
      {id:'insuranceNo', label:'Insurance No.', type:'text'},
      {id:'insurance', label:'Insurance Expiry Date', type:'date'},
      {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
      {id:'rfidNo', label:'RFID No.', type:'text'},
      {id:'pmaOwner', label:'PMA Owner', type:'text'},
      {id:'pmaNo', label:'PMA No.', type:'text'},
      {id:'pmaCategory', label:'PMA Category', type:'text'},
      {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {lorry:'CDM 5679', bdm:'', registerYear:'2014', branch:'Kemaman', roadtaxNo:'', roadtax:'2026-08-06', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakom:'2026-08-06', insuranceNo:'', insurance:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
      {lorry:'CDM 5682', bdm:'', registerYear:'2014', branch:'Kemaman', roadtaxNo:'', roadtax:'2026-08-26', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakom:'2026-08-26', insuranceNo:'', insurance:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
      {lorry:'CDM 5683', bdm:'', registerYear:'2014', branch:'Kemaman', roadtaxNo:'', roadtax:'2026-07-24', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakom:'2026-07-24', insuranceNo:'', insurance:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
    ],
  },

  trailer: {
    label: 'Trailer',
    storageKey: 'kor-trailer',
    columns: [
      {id:'lorry', label:'Trailer No.', type:'text'},
      {id:'type', label:'Trailer Type', type:'select', options:['Container','Flatbed','Lowbed','Tanker','Curtainside','General Cargo','Other']},
      {id:'bdm', label:'BDM (kg)', type:'number'},
      {id:'registerYear', label:'Register Year', type:'text'},
      {id:'branch', label:'Branch', type:'text'},
      {id:'assignedPrimeMover', label:'Assigned Prime Mover', type:'text'},
      {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
      {id:'roadtaxExpiry', label:'Roadtax Expiry Date', type:'date'},
      {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
      {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
      {id:'puspakomNo', label:'Puspakom No.', type:'text'},
      {id:'puspakomExpiry', label:'Puspakom Expiry Date', type:'date'},
      {id:'insuranceNo', label:'Insurance No.', type:'text'},
      {id:'insuranceExpiry', label:'Insurance Expiry Date', type:'date'},
      {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
      {id:'pmaOwner', label:'PMA Owner', type:'text'},
      {id:'pmaNo', label:'PMA No.', type:'text'},
      {id:'pmaCategory', label:'PMA Category', type:'text'},
      {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
      {id:'remark', label:'Remark', type:'text'},
    ],
    seed: [
      {lorry:'T/BC 5206', type:'Container', bdm:'', registerYear:'2008', branch:'Kemaman', assignedPrimeMover:'', roadtaxNo:'', roadtaxExpiry:'2026-07-24', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakomExpiry:'2026-07-24', insuranceNo:'', insuranceExpiry:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
      {lorry:'T/BC 5204', type:'Container', bdm:'', registerYear:'2008', branch:'Kemaman', assignedPrimeMover:'', roadtaxNo:'', roadtaxExpiry:'2026-08-26', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakomExpiry:'2026-08-26', insuranceNo:'', insuranceExpiry:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
      {lorry:'T/BC 5202', type:'Container', bdm:'', registerYear:'2008', branch:'Kemaman', assignedPrimeMover:'', roadtaxNo:'', roadtaxExpiry:'2026-07-24', singaporeRoadtaxNo:'', singaporeRoadtaxExpiry:'', puspakomNo:'', puspakomExpiry:'2026-07-24', insuranceNo:'', insuranceExpiry:'2026-09-14', insuranceSumAssured:'', rfidNo:'', pmaOwner:'', pmaNo:'', pmaCategory:'', pmaExpiry:'', remark:''},
    ],
  },

  staffDatabase: {
    label: 'Staff Database',
    storageKey: 'kor-staff-database',
    columns: [
      {id:'staffName',      label:'Staff Name',      type:'text'},
      {id:'icNumber',       label:'IC Number',       type:'ic'},
      {id:'dateOfBirth',    label:'Date of Birth',   type:'date'},
      {id:'age',            label:'Age',             type:'computed-age'},
      {id:'nationality',    label:'Nationality',     type:'text'},
      {id:'employeeId',     label:'Employee ID',     type:'text'},
      {id:'designation',    label:'Designation',     type:'text'},
      {id:'branch',         label:'Branch',          type:'text'},
      {id:'dateHired',      label:'Date Hired',      type:'date'},
      {id:'tenure',         label:'Tenure',          type:'computed-tenure'},
      {id:'employmentType', label:'Employment Type', type:'select', options:['Full Time','Contract','Part Time','Intern','Probation']},
      {id:'employmentStatus', label:'Employee Status', type:'computed-employment-status'},
      {id:'resignationDate',  label:'Resignation Date', type:'date'},
      {id:'phone',          label:'Phone Number',    type:'phone'},
      {id:'whatsapp',       label:'WhatsApp',        type:'computed-whatsapp'},
      {id:'personalEmail',  label:'Personal Email',  type:'text'},
      {id:'workEmail',      label:'Work Email',      type:'text'},
      {id:'address',        label:'Address',         type:'text'},
      {id:'licenseNumber',  label:'License Number',  type:'text'},
      {id:'licenseExpiry',  label:'License Expiry',  type:'date'},
      {id:'gdlNumber',      label:'GDL Number',      type:'text'},
      {id:'gdlExpiry',      label:'GDL Expiry',      type:'date'},
      {id:'passportNo',     label:'Passport No.',    type:'text'},
      {id:'passportExpiry', label:'Passport Expiry', type:'date'},
      {id:'drugTest',       label:'Drug Test',       type:'date'},
      {id:'alcoholTest',    label:'Alcohol Test',    type:'date'},
      {id:'medicalStatus',  label:'Medical Test',    type:'date'},
    ],
    seed: [
      {designation:'Driver', employeeId:'LTTSB909', staffName:'CHE JEFRI BIN CHE GHAZALI', phone:'012-345 6789', email:'jefripersona@gmail.com', address:'', icNumber:'900615-14-5271', dateHired:'2024-06-01', dateOfBirth:'1990-06-15', licenseExpiry:'2027-12-06', licenseNumber:'', gdlExpiry:'2026-12-06', gdlNumber:'', drugTest:'2026-02-01', alcoholTest:'2026-02-01', medicalStatus:'2026-01-15'},
      {designation:'Driver', employeeId:'LTTSB910', staffName:'RAJA SAMSUL SAIFUL HAIZAN BIN RAJA SALLEH', phone:'', email:'', address:'', icNumber:'', dateHired:'2023-03-14', dateOfBirth:'', licenseExpiry:'2028-02-10', licenseNumber:'', gdlExpiry:'2027-02-10', gdlNumber:'', drugTest:'', alcoholTest:'', medicalStatus:''},
      {designation:'Mechanic', employeeId:'LTTSB911', staffName:'AZLAN BIN ISMAIL', phone:'', email:'', address:'', icNumber:'', dateHired:'2022-01-10', dateOfBirth:'', licenseExpiry:'', licenseNumber:'', gdlExpiry:'', gdlNumber:'', drugTest:'', alcoholTest:'', medicalStatus:''},
      {designation:'Supervisor', employeeId:'LTTSB912', staffName:'ZULKIFLI BIN OTHMAN', phone:'', email:'', address:'', icNumber:'', dateHired:'2020-05-19', dateOfBirth:'', licenseExpiry:'2027-06-01', licenseNumber:'', gdlExpiry:'', gdlNumber:'', drugTest:'', alcoholTest:'', medicalStatus:''},
    ],
  },

  apadDocuments: {
    label: 'APAD Document',
    storageKey: 'kor-apad-documents',
    columns: [
      {id:'title', label:'Document Name', type:'text'},
      {id:'category', label:'Category', type:'select', options:['ICOP','Pekeliling','Guideline','Portal','Other']},
      {id:'description', label:'Description', type:'text'},
      {id:'url', label:'Link', type:'url'},
    ],
    seed: [
      {title:'Buku Panduan SPAD ICOP — Keselamatan Pengendali Kenderaan Barangan (Ed.2)', category:'ICOP', description:'Official safety handbook for goods vehicle operators (3.1 MB).', url:'https://www.apad.gov.my/index.php/en/source-of-information/guideline/garis-panduan-kenderaan-barangan'},
      {title:'Pekeliling Pelaksanaan ICOP Keselamatan', category:'Pekeliling', description:'Implementation circular — ICOP safety as licence condition.', url:'https://www.apad.gov.my/index.php/sumber-maklumat1/pekeliling/pekeliling-kenderaan-barangan/217-pelaksanaan-kod-amalan-industri-s-p-a-d-keselamatan-untuk-pengendali-berlesen-perkhidmatan-kenderaan-barangan/file'},
      {title:'Garis Panduan Kenderaan Barangan (Hub)', category:'Guideline', description:'All APAD freight guidelines in one place.', url:'https://www.apad.gov.my/index.php/en/source-of-information/guideline/garis-panduan-kenderaan-barangan'},
      {title:'Portal iSPKP', category:'Portal', description:'APAD licensing & compliance portal.', url:'https://iportal.ispkp.gov.my'},
    ],
  },

  notificationContact: {
    label: 'Notification Contact',
    storageKey: 'kor-notification-contact',
    columns: [
      {id:'name', label:'Name', type:'text'},
      {id:'designation', label:'Designation', type:'text'},
      {id:'branch', label:'Branch', type:'text'},
      {id:'department', label:'Department', type:'text'},
      {id:'phone', label:'Phone Number', type:'phone'},
      {id:'status', label:'Status', type:'select', options:['Active','Inactive']},
      {id:'createdDate', label:'Created Date', type:'date'},
    ],
    seed: [],
  },

  whatsappGroups: {
    label: 'WhatsApp Groups',
    storageKey: 'kor-whatsapp-groups',
    columns: [
      {id:'groupName', label:'Group Name', type:'text'},
      {id:'groupLink', label:'Group Link', type:'url'},
      {id:'branch', label:'Branch', type:'text'},
      {id:'status', label:'Status', type:'select', options:['Active','Inactive']},
    ],
    seed: [],
  },

  notificationHistory: {
    label: 'Notification History',
    storageKey: 'kor-notification-history',
    columns: [
      {id:'date', label:'Date', type:'date'},
      {id:'time', label:'Time', type:'time'},
      {id:'module', label:'Module', type:'text'},
      {id:'asset', label:'Asset', type:'text'},
      {id:'recipient', label:'Recipient', type:'text'},
      {id:'phone', label:'Phone Number', type:'phone'},
      {id:'message', label:'Message', type:'text'},
      {id:'sentBy', label:'Sent By', type:'text'},
      {id:'status', label:'Status', type:'badge'},
    ],
    seed: [],
  },

  HIRARC_MASTER: {
    label: 'HIRARC Register',
    storageKey: 'kor-hirarc-master',
    columns: [
      {id:'refNo', label:'Reference No', type:'text'},
      {id:'department', label:'Department', type:'text'},
      {id:'process', label:'Process', type:'text'},
      {id:'location', label:'Process / Activity Location', type:'text'},
      {id:'originalDate', label:'Original Date', type:'date'},
      {id:'lastReviewDate', label:'Last Review Date', type:'date'},
      {id:'nextReviewDate', label:'Review Date', type:'date'},
      {id:'raLeader', label:'RA Leader', type:'text'},
      {id:'raMember1', label:'RA Member 1', type:'text'},
      {id:'raMember2', label:'RA Member 2', type:'text'},
      {id:'raMember3', label:'RA Member 3', type:'text'},
      {id:'approvedBy', label:'Approved By', type:'text'},
      {id:'status', label:'Status', type:'badge'},
    ],
    seed: [],
  },

  HIRARC_HAZARDS: {
    label: 'HIRARC Hazards',
    storageKey: 'kor-hirarc-hazards',
    columns: [
      {id:'parentRefNo', label:'Ref No', type:'text'},
      {id:'workActivity', label:'Work Activity', type:'text'},
      {id:'hazard', label:'Hazard', type:'text'},
      {id:'possibleInjury', label:'Possible Injury / Ill Health', type:'text'},
      {id:'existingControls', label:'Existing Risk Controls', type:'text'},
      {id:'s', label:'S', type:'number'},
      {id:'l', label:'L', type:'number'},
      {id:'rpn', label:'RPN', type:'number'},
      {id:'additionalControls', label:'Additional Controls', type:'text'},
      {id:'s2', label:'S', type:'number'},
      {id:'l2', label:'L', type:'number'},
      {id:'rpn2', label:'RPN', type:'number'},
      {id:'implementationPerson', label:'Implementation Person', type:'text'},
      {id:'remarks', label:'Remarks', type:'text'},
    ],
    seed: [],
  },
};

/* ---------------------------------------------------------------------
   COMPUTED FIELD HELPERS
--------------------------------------------------------------------- */

// Calculate repair duration in days from Date In to Date Out (0 while still repairing)
function calcDaysRepair(dateIn, dateOut){
  if (!dateIn || !dateOut) return 0;
  const din = new Date(`${dateIn}T00:00:00`);
  const dout = new Date(`${dateOut}T00:00:00`);
  if (isNaN(din.getTime()) || isNaN(dout.getTime())) return 0;
  const diff = Math.round((dout - din) / 86400000);
  return diff >= 0 ? diff : 0;
}

// Repair status: still open (no Date Out) vs completed
function calcRepairStatus(dateOut){
  return dateOut ? 'Completed' : 'Repairing';
}

// Format a Date object as YYYY-MM-DD using its local calendar fields (no UTC shift)
function toISODateLocal(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Next Service = one calendar month after Service Date
function calcNextService(serviceDate){
  if (!serviceDate) return '';
  const d = new Date(`${serviceDate}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toISODateLocal(next);
}

// Derive the month name (e.g. "August") from a Date value
function calcMonthName(dateStr){
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {month:'long'});
}

const MISCONDUCT_FLOW = [
  ['interview','Driver Interview'],
  ['form','Misconduct Form'],
  ['emailHr','Email To HR'],
  ['driverSignForm','Driver Sign Form'],
  ['emailCustomer','Email To Customer'],
  ['investigationReport','Investigation Report'],
  ['fishboneAnalysis','Fishbone Analysis'],
  ['managementPresentation','Management Presentation'],
  ['emailResultCustomer','Email Result to Customer'],
];

function calcMisconductNext(row){
  if (!row) return '-';
  for (const [id, label] of MISCONDUCT_FLOW){
    if (!String(row[id] || '').trim()) return label;
  }
  return 'Complete ✓';
}

function calcMisconductDaysOpen(row){
  if (!row || !row.caseDate) return '-';
  const d = new Date(String(row.caseDate) + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((today - d) / 86400000);
  return diff >= 0 ? String(diff) : '-';
}

/* Chip "Created By" untuk FEG List — nama pengguna + tarikh (2 baris). */
function fegCreatedCell(row){
  const who = String((row && row.createdBy) || '').trim();
  const day = (row && row.createdAt) ? String(row.createdAt).slice(0,10) : '';
  const when = day ? fmtDate(day) : '';
  if (!who && !when) return '<span style="color:var(--muted)">-</span>';
  return (who ? escapeHtml(who) : '<span style="color:var(--muted)">-</span>')
       + (when ? `<div style="font-size:11px;color:var(--muted);white-space:nowrap;">${escapeHtml(when)}</div>` : '');
}

function cellDisplay(col, value, row){
  if (col.type === 'computed-tenure') return calcTenure(row ? row.dateHired : '', row ? row.resignationDate : '');
  if (col.type === 'url' && value){
    const href = /^https?:\/\//i.test(String(value)) ? value : 'https://' + value;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="color:var(--teal);font-weight:600;text-decoration:none;white-space:nowrap" onclick="event.stopPropagation()">Open &#8599;</a>`;
  }
  if (col.type === 'computed-days-repair'){
    return FMT.num(calcDaysRepair(row ? row.dateIn : '', row ? row.dateOut : ''));
  }
  if (col.type === 'computed-repair-status'){
    return badgeFor(calcRepairStatus(row ? row.dateOut : ''));
  }
  if (col.type === 'computed-next-service'){
    const v = calcNextService(row ? row.serviceDate : '');
    return v ? fmtDate(v) : '-';
  }
  if (col.type === 'computed-month'){
    const v = calcMonthName(row ? row.date : '');
    return v || '-';
  }
  if (col.type === 'computed-age'){
    const a = calcAgeFromDOB(row ? row.dateOfBirth : '');
    return (a === '' || a == null) ? '-' : a;
  }
  if (col.type === 'computed-employment-status'){
    const resigned = !!(row && row.resignationDate);
    return `<span class="badge ${resigned ? 'bad' : 'good'}">${resigned ? 'Resigned' : 'Active'}</span>`;
  }
  if (col.type === 'computed-feg-units') return fegUnitsCell(row);
  if (col.type === 'computed-feg-created') return fegCreatedCell(row);
  if (col.type === 'computed-misconduct-next') return calcMisconductNext(row);
  if (col.type === 'computed-misconduct-days') return calcMisconductDaysOpen(row);
  if (col.type === 'ic'){
    const f = formatIC(value);
    return f || '-';
  }
  if (col.type === 'phone'){
    const f = formatPhone(value);
    return f || '-';
  }
  if (col.type === 'computed-whatsapp'){
    const link = toWhatsAppLink(row ? row.phone : '');
    if (!link) return '-';
    return `<a href="${link}" target="_blank" rel="noopener noreferrer" class="wa-link" title="Chat on WhatsApp">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 4.99L2 22l5.2-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.86 14.06c-.25.7-1.25 1.28-2.03 1.44-.55.12-1.27.21-3.7-.79-2.75-1.14-4.65-3.7-4.8-3.9-.14-.19-1.15-1.53-1.15-2.92 0-1.39.72-2.06.98-2.34.25-.28.55-.35.73-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.85 2.08.92 2.23.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.56.16.28.71 1.18 1.53 1.92 1.05.95 1.94 1.24 2.22 1.38.28.14.44.12.6-.07.17-.19.72-.85.92-1.14.19-.28.38-.24.65-.14.27.1 1.72.82 2.01.97.29.14.48.21.55.34.07.13.07.72-.18 1.42z"/></svg>
      Chat
    </a>`;
  }
  if (col.id === 'paymentStatus') return badgeFor(value);
  if (col.type === 'badge') return badgeFor(value);
  if (col.type === 'pct') return FMT.pct(value, col.decimals);
  if (col.type === 'money') return FMT.money(value);
  if (col.type === 'date') return fmtDate(value);
  if (col.type === 'number') return (value === '' || value == null) ? '-' : FMT.num(value);
  return (value === '' || value == null) ? '-' : value;
}

/* ---------------------------------------------------------------------
   COMPUTED STAFF HELPERS
--------------------------------------------------------------------- */

function calcTenure(dateHired, endDate){
  if (!dateHired) return '-';
  const start = new Date(`${dateHired}T00:00:00`);
  if (isNaN(start.getTime())) return '-';
  const today = new Date(); today.setHours(0,0,0,0);
  let end = today;
  if (endDate){
    const e = new Date(`${endDate}T00:00:00`);
    if (!isNaN(e.getTime())) end = (e < today) ? e : today;
  }
  if (start > end) return '-';
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0){ years--; months += 12; }
  const yearLabel = years === 1 ? 'Year' : 'Years';
  const monthLabel = months === 1 ? 'Month' : 'Months';
  return `${years} ${yearLabel} ${months} ${monthLabel}`;
}

function calcAgeFromDOB(dateOfBirth){
  if (!dateOfBirth) return '';
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (isNaN(birth.getTime())) return '';
  const now = new Date();
  if (birth > now) return '';
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear = (now.getMonth() > birth.getMonth()) || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age--;
  return age >= 0 ? age : '';
}

/* ---------------------------------------------------------------------
   PHONE / IC / WHATSAPP HELPERS
--------------------------------------------------------------------- */

function formatPhone(raw){
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('60') && digits.length > 9) digits = '0' + digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 10){
    let out = digits.slice(0, 3);
    out += '-' + digits.slice(3, Math.min(6, digits.length));
    if (digits.length > 6) out += ' ' + digits.slice(6);
    return out;
  } else {
    let out = digits.slice(0, 3);
    out += '-' + digits.slice(3, Math.min(7, digits.length));
    if (digits.length > 7) out += ' ' + digits.slice(7);
    return out;
  }
}

function toWhatsAppLink(phone){
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  let waDigits = digits;
  if (waDigits.startsWith('60')){ /* already international */ }
  else if (waDigits.startsWith('0')) waDigits = '60' + waDigits.slice(1);
  else waDigits = '60' + waDigits;
  return `https://wa.me/${waDigits}`;
}

async function copyTextToClipboard(text){
  const str = String(text == null ? '' : text);
  try{
    if (navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(str);
      return true;
    }
  }catch(e){ /* jatuh ke fallback di bawah */ }
  try{
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  }catch(e){
    return false;
  }
}

function formatIC(raw){
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  let out = digits.slice(0, 6);
  if (digits.length > 6) out += '-' + digits.slice(6, 8);
  if (digits.length > 8) out += '-' + digits.slice(8, 12);
  return out;
}

/* ---------------------------------------------------------------------
   SHARED RUNTIME STATE
--------------------------------------------------------------------- */

const DATA_CACHE = {};
const DATA_VERSION = {};
window.IMPORT_BACKUPS = window.IMPORT_BACKUPS || {};

let saveChipTimer;
function flashSaved(){
  const chip = document.getElementById('savechip');
  if (!chip) return;
  chip.classList.add('show');
  clearTimeout(saveChipTimer);
  saveChipTimer = setTimeout(()=>chip.classList.remove('show'), 1200);
}

/* ---------------------------------------------------------------------
   TABLE OPTIONS CONFIG — Combo / Fixed picker fields
--------------------------------------------------------------------- */

const TRUCK_DROPDOWN_FIELDS = {
  driverKPI: 'truck',
  mileage: 'truck',
  maintenanceLog: 'truck',
  speedingIdling: 'truck',
};

const DRIVER_DROPDOWN_FIELDS = {
  driverKPI: 'driver',
  speedingIdling: 'driver',
  misconduct: 'driver',
};

const FIXED_PICKER_FIELDS = {
  notificationContact: ['status'],
  whatsappGroups: ['status'],
  staffDatabase: ['employmentType'],
  feg: ['assetType'],
};

const COMBO_OPTION_FIELDS = {
  maintenanceLog: ['scenePlace','reason','action','repairPlace','vendor'],
  machineryLog: ['equipment','category','vendor'],
  safetyEquipment: ['category','branch','asset'],
  misconduct: ['category','status'],
  staffDatabase: ['branch','designation','nationality'],
  trailer: ['pmaCategory'],
  primeMover: ['pmaCategory'],
  feg: [],
};

const COMBO_DEFAULT_OPTIONS = {
  maintenanceLog: {
    scenePlace: ['Side Road','Puspakom','Workshop'],
    reason: ['Breakdown Tyre','Puspakom Fail','Engine Overheat'],
    action: ['Repair At The Same Place','Repair At CJKX','Full Service'],
    repairPlace: ['Side Road','CJKX Workshop','Main Workshop'],
    vendor: ['Adli Tyre','Self Repair'],
  },
  machineryLog: {
    equipment: ['Wheel Loader','Excavator','Forklift'],
    category: ['Repair','Service','Mob/Demob'],
    vendor: ['Heavy Equip Sdn Bhd'],
  },
  safetyEquipment: {
    category: ['Truck','Staff'],
    branch: ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'],
  },
  misconduct: {
    category: ['Property Damage','Speeding','Absent Without Notice','Accident','Other'],
    status: ['Open','Closed'],
  },
  staffDatabase: {
    branch: ['HQ','Johor Bahru','Penang','Klang Valley'],
    designation: ['Driver','Mechanic','Supervisor','Admin','Clerk','Safety Officer'],
    nationality: ['Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde','Central African Republic','Chad','Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany','Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Italy','Ivory Coast','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe'],
  },
  trailer: { pmaCategory: [] },
  primeMover: {
    branch: ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'],
    pmaCategory: [],
  },
  feg: { assetRef: [] },
};

function comboStorageKey(tableKey, fieldId){
  if (tableKey === 'maintenanceLog') return 'kor-maintenance-log-options-' + fieldId;
  return `kor-combo-options-${tableKey}-${fieldId}`;
}

/* ---------------------------------------------------------------------
   AUTO FIELD LISTS — hidden from Add/Edit forms
--------------------------------------------------------------------- */

const OP_AUTO_FIELDS = ['month','year','activeTruck','utilization','totalHours','achievement','kpiSummary','tonMetric'];
const CONTAINER_OP_AUTO_FIELDS = ['month','year','activeTruck','utilization','totalHours','achievement'];
const DR_AUTO_FIELDS = ['month','year','adjTarget','productivity'];
const MILEAGE_AUTO_FIELDS = ['totalMileage'];
const STAFF_AUTO_FIELDS = ['tenure','age','whatsapp','employmentStatus'];

const STAFF_FORM_FIELDS = ['staffName','employeeId','designation','branch','dateHired','phone','employmentType','personalEmail','licenseNumber','licenseExpiry','gdlNumber','gdlExpiry','drugTest','alcoholTest','medicalStatus'];
const STAFF_FORM_HIDDEN = ['icNumber','dateOfBirth','nationality','address','workEmail','passportNo','passportExpiry','resignationDate','employmentStatus'];
const MAINT_AUTO_FIELDS = ['daysRepair','status'];
const MACHINERY_AUTO_FIELDS = ['nextService'];
const SPEEDING_AUTO_FIELDS = ['month'];

/* ---------------------------------------------------------------------
   FEG CONSTANTS
--------------------------------------------------------------------- */
const FEG_MAX_UNITS = 50;
const FEG_UNIT_PREFIXES  = ['MY','SG'];
const FEG_TYPES          = ['Dry Powder ABC','CO2','Foam'];
const FEG_CAPACITIES     = ['1kg','2kg','5kg','6kg','9kg'];
const FEG_MANUAL_STATUS  = ['In Service','In Use','Transfer','Under Inspection','Damaged','Missing','Expired'];
const FEG_CYLINDER_TEST_YEARS = 10;
const FEG_CYLINDER_REPLACE_MONTHS = 8;
const FEG_DISPOSAL_REASONS = ['Damaged','Expired','Lost / Missing','End of Life','Replaced','Others'];
const FEG_DISPOSAL_AUDIT_FIELD = 'disposalAudit';
const FEG_SERVICE_REASONS = ['Annual Service','Repair / Fault','Refill','Hydrostatic Test','Others'];
const FEG_INSPECTION_RESULTS = ['Pass','Pass with remarks','Fail'];

let FEG_PENDING_QTY = 0;
let FOCC_FEG_PAINT_SEQ = 0;

/* ---------------------------------------------------------------------
   SAFETY CONSTANTS
--------------------------------------------------------------------- */
const SF_INSPECTION_TABLE   = 'safetyInspection';
const SF_RECEIVING_TABLE    = 'safetyReceiving';
const SF_INSPECTION_RESULTS = ['Pass','Pass with remarks','Fail'];
const SF_CONDITIONS         = ['Good','Fair','Replace Soon','Damaged'];
const SF_OPEN_KEY           = 'focc-safety-open';

const SAFETY_TRUCK_ITEMS = [
  {id:'firstAid', label:'First Aid Kit'},
  {id:'triangle', label:'Triangle'},
  {id:'cone', label:'Cone (5 unit)'},
  {id:'wheelChock', label:'Wheel Chock'},
  {id:'reflectiveString', label:'Reflective String'},
  {id:'torchlight', label:'Torchlight'},
];
const SAFETY_STAFF_ITEMS = [
  {id:'helmet', label:'Helmet'},
  {id:'safetyShoes', label:'Safety Shoes'},
  {id:'reflectiveVest', label:'Reflective Vest'},
];
const PRIME_MOVER_EXPIRY_FIELDS = [
  {id:'permit', label:'Permit'},
  {id:'insurance', label:'Insurance'},
  {id:'puspakom', label:'Puspakom'},
  {id:'roadtax', label:'Roadtax'},
  {id:'lastService', label:'Service'},
];
const TRAILER_EXPIRY_FIELDS = [
  {id:'permit', label:'Permit'},
  {id:'insurance', label:'Insurance'},
  {id:'puspakom', label:'Puspakom'},
  {id:'roadtax', label:'Roadtax'},
  {id:'service', label:'Service'},
];
const STAFF_STATUS_FIELDS = [
  {id:'licenseExpiry', label:'License Expiry'},
  {id:'gdlExpiry', label:'GDL Expiry'},
  {id:'drugTest', label:'Drug Test', calc: calcNextDrugTest},
  {id:'alcoholTest', label:'Alcohol Test', calc: calcNextAlcoholTest},
  {id:'medicalStatus', label:'Medical Test', calc: calcNextMedical},
];

/* ---------------------------------------------------------------------
   PM / TL / ST DOCUMENT SLOTS
--------------------------------------------------------------------- */

const PM_DOCUMENT_SLOTS = [
  {id:'pma',                          label:'PMA'},
  {id:'roadtax',                      label:'Roadtax'},
  {id:'singaporeRoadtax',             label:'Singapore Roadtax'},
  {id:'puspakom',                     label:'Puspakom'},
  {id:'insurance',                    label:'Insurance'},
  {id:'vehicleRegistrationCertificate', label:'Vehicle Registration Certificate'},
  {id:'jpjVehicleWeightCertificate',  label:'JPJ Vehicle Weight Certificate'},
  {id:'truckPlanDwg',                 label:'Truck Plan DWG'},
];

const TL_DOCUMENT_SLOTS = [
  {id:'pma',                            label:'PMA'},
  {id:'roadtax',                        label:'Roadtax'},
  {id:'singaporeRoadtax',               label:'Singapore Roadtax'},
  {id:'puspakom',                       label:'Puspakom'},
  {id:'insurance',                      label:'Insurance'},
  {id:'vehicleRegistrationCertificate', label:'Vehicle Registration Certificate'},
  {id:'jpjVehicleWeightCertificate',    label:'JPJ Vehicle Weight Certificate'},
  {id:'trailerPlanDwg',                 label:'Trailer Plan DWG'},
];

const ST_DOCUMENT_SLOTS = [
  {id:'passport',    label:'Passport'},
  {id:'license',     label:'Driving License'},
  {id:'gdl',         label:'GDL'},
  {id:'drugTest',    label:'Drug Test'},
  {id:'alcoholTest', label:'Alcohol Test'},
  {id:'medicalTest', label:'Medical Test'},
  {id:'employmentContract', label:'Employment Contract'},
];

const FEG_DOCUMENT_SLOTS = [
  {id:'fireCert',      label:'Fire Certificate'},
  {id:'invoice',       label:'Purchase Invoice'},
];

const PM_DOC_FIELD_MAP = {
  roadtax:                'roadtax',
  roadtaxNo:              'roadtax',
  singaporeRoadtaxExpiry: 'singaporeRoadtax',
  singaporeRoadtaxNo:     'singaporeRoadtax',
  puspakom:               'puspakom',
  puspakomNo:             'puspakom',
  insurance:              'insurance',
  insuranceNo:            'insurance',
  pmaExpiry:              'pma',
  pmaNo:                  'pma',
};

const TL_DOC_FIELD_MAP = {
  roadtaxNo:              'roadtax',
  roadtaxExpiry:          'roadtax',
  singaporeRoadtaxNo:     'singaporeRoadtax',
  singaporeRoadtaxExpiry: 'singaporeRoadtax',
  puspakomNo:             'puspakom',
  puspakomExpiry:         'puspakom',
  insuranceNo:            'insurance',
  insuranceExpiry:        'insurance',
  pmaNo:                  'pma',
  pmaExpiry:              'pma',
};

const ST_DOC_FIELD_MAP = {
  passportNo:     'passport',
  passportExpiry: 'passport',
  licenseNumber:  'license',
  licenseExpiry:  'license',
  gdlNumber:      'gdl',
  gdlExpiry:      'gdl',
  drugTest:       'drugTest',
  alcoholTest:    'alcoholTest',
  medicalStatus:  'medicalTest',
};

const PM_DOC_EXPIRY_FIELD = {
  pma:              'pmaExpiry',
  roadtax:          'roadtax',
  singaporeRoadtax: 'singaporeRoadtaxExpiry',
  puspakom:         'puspakom',
  insurance:        'insurance',
};

const TL_DOC_EXPIRY_FIELD = {
  pma:              'pmaExpiry',
  roadtax:          'roadtaxExpiry',
  singaporeRoadtax: 'singaporeRoadtaxExpiry',
  puspakom:         'puspakomExpiry',
  insurance:        'insuranceExpiry',
};

const ST_DOC_EXPIRY_FIELD = {
  passport:    'passportExpiry',
  license:     'licenseExpiry',
  gdl:         'gdlExpiry',
  drugTest:    'drugTest',
  alcoholTest: 'alcoholTest',
  medicalTest: 'medicalStatus',
};

const FEG_DOC_EXPIRY_FIELD = {
  fireCert:      'serviceDate',
  invoice:       '',
};

const FEG_DOC_FIELD_SLOTS = [
  { field:'serviceDate', slots:['fireCert'] },
];

const PM_DOC_BUCKET    = 'focc-documents';
const PM_DOC_MAX_BYTES = 5 * 1024 * 1024;
const TL_DOC_BUCKET    = 'focc-documents';
const TL_DOC_MAX_BYTES = 5 * 1024 * 1024;
const ST_DOC_MAX_BYTES = 5 * 1024 * 1024;
const ST_ACCEPT_ATTR   = 'application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png';
const FEG_DOC_BUCKET = PM_DOC_BUCKET;
const FEG_INSPECTION_BUCKET = PM_DOC_BUCKET;
const FEG_INSPECTION_TABLE = 'fegInspection';

/* ---------------------------------------------------------------------
   PM / TL / ST / SF / FEG OPEN KEY (session persistence)
--------------------------------------------------------------------- */
const PM_OPEN_KEY = 'focc-pm-open';
const TL_OPEN_KEY = 'focc-tl-open';
const ST_OPEN_KEY = 'focc-st-open';
const FEG_OPEN_KEY = 'focc-feg-open';
const FEG_JUMP_KEY = 'focc-feg-jump';
const FEG_DOC_UNIT_KEY = 'focc-feg-doc-unit:';

/* ---------------------------------------------------------------------
   COMPLIANCE ALERT CONSTANTS--------------------------------------------------------------------- */
const COMPLIANCE_ALERT_FIELDS = [
  {id:'permit', label:'Permit'},
  {id:'insurance', label:'Insurance'},
  {id:'puspakom', label:'Puspakom'},
  {id:'roadtax', label:'Roadtax'},
];
const COMPLIANCE_ALERT_WINDOW_DAYS = 20;
const STAFF_COMPLIANCE_ALERT_WINDOW_DAYS = 10;

const COMPLIANCE_ALERT_CONFIG = {
  primeMover: {asset: 'Truck', title: 'PRIME MOVER COMPLIANCE ALERT'},
  trailer:    {asset: 'Trailer', title: 'TRAILER COMPLIANCE ALERT'},
  staffDatabase: {asset: 'Staff', title: 'STAFF COMPLIANCE ALERT'},
  feg: {asset: 'Truck', title: 'FIRE EXTINGUISHER COMPLIANCE ALERT'},
};

const STAFF_COMPLIANCE_ALERT_FIELDS = [
  {id:'licenseExpiry', label:'License', calc: calcLicenseDueDate},
  {id:'gdlExpiry',     label:'GDL', calc: calcGdlDueDate},
  {id:'drugTest',      label:'Next Drug Test', calc: calcNextDrugTest},
  {id:'alcoholTest',   label:'Next Alcohol Test', calc: calcNextAlcoholTest},
  {id:'medicalStatus', label:'Next Medical Test', calc: calcNextMedical},
];

const FEG_COMPLIANCE_ALERT_FIELDS = [
  {id:'cylinderDue', label:'Cylinder'},
  {id:'serviceDate', label:'Service'},
];

function calcLicenseDueDate(licenseExpiry){ return licenseExpiry || ''; }
function calcGdlDueDate(gdlExpiry){ return gdlExpiry || ''; }
function calcNextDrugTest(drugTest){
  if (!drugTest) return '';
  const d = new Date(`${drugTest}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 6, d.getDate());
  return toISODateLocal(next);
}
function calcNextAlcoholTest(alcoholTest){
  if (!alcoholTest) return '';
  const d = new Date(`${alcoholTest}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 6, d.getDate());
  return toISODateLocal(next);
}
function calcNextMedical(medicalStatus){
  if (!medicalStatus) return '';
  const d = new Date(`${medicalStatus}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
  return toISODateLocal(next);
}

/* ---------------------------------------------------------------------
   MISC CONSTANTS
--------------------------------------------------------------------- */
const FOCC_SESSION_KEY = 'focc-session';
const FOCC_ROUTE_KEY = 'focc-last-route';
const FOCC_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const SETTINGS_CONFIG_KEY = 'kor-settings-config';
const BACKUP_META_KEY = 'kor-backup-meta';
const SAFETY_BACKUP_KEY = 'kor-backup-safety-last';
const APP_VERSION = 'FOMS v1.0 (Phase 2)';
const MAX_BACKUP_HISTORY = 20;
const BUG_SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const RELEASE_TYPES = ['Feature', 'Fix', 'Improvement', 'Announcement'];
const FOCC_USER_ROLE_SUGGESTIONS = ['SuperAdmin', 'Admin', 'Manager', 'Operation', 'Maintenance', 'Safety', 'Viewer'];

const NOTIFY_AVATAR_COLORS = ['#1aa39a', '#26567f', '#e6a339', '#3f9a6e', '#d1554a', '#128077'];

/* ---------------------------------------------------------------------
   ROUTES + NAV_STRUCTURE — diletak di 13-boot.js sebab guna render* fungsi.
   Beberapa ROUTES entry diletakkan di sini sebab ia rujuk constant dalam fail ini.
--------------------------------------------------------------------- */

/* ---------------------------------------------------------------------
   FOCC SUPABASE (login) — diletak di 04-auth.js
   Backup API — diletak di 03-settings.js
--------------------------------------------------------------------- */

/* ---------------------------------------------------------------------
   Boot flag global
--------------------------------------------------------------------- */
let foccBooted = false;
let FOCC_VERSION = '';
let currentRoute = 'overview';

/* ---------------------------------------------------------------------
   ADMIN LIVE STATE
--------------------------------------------------------------------- */
const FOCC_ADMIN_LIVE_ROUTES = new Set(['userManager', 'companyManager', 'releaseManager']);
const FOCC_ADMIN_LIVE_MS = 5000;
const FOCC_ADMIN_LIVE_FOCUS_GAP_MS = 1000;

let FOCC_ADMIN_LIVE_TIMER = null;
let FOCC_ADMIN_LIVE_ROUTE = '';
let FOCC_ADMIN_LIVE_REFRESH = null;
let FOCC_ADMIN_LIVE_BUSY = false;
let FOCC_ADMIN_LIVE_LAST = 0;

/* ---------------------------------------------------------------------
   USER MANAGER POLLING
--------------------------------------------------------------------- */
const UM_POLL_MS = 5000;
let umPollTimer = null;

/* ---------------------------------------------------------------------
   REALTIME STATE
--------------------------------------------------------------------- */
let FOCC_RT_CHANNEL = null;
let FOCC_RT_COMPANY = '';
let FOCC_RT_QUEUE = Promise.resolve();
let FOCC_RT_REJOIN_TIMER = null;
let FOCC_RT_TRIES = 0;
const FOCC_RT_PULL_TIMERS = {};
const FOCC_RT_MUTE = {};

const FOCC_RT_DERIVED_ROUTES = {
  feg: ['fegDisposal', 'fegServiceHistory'],
};

let FOCC_SERVER_SUPABASE_TABLES = null;
let FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;

const SUPABASE_NATIVE_TABLES = new Set([
  'staffDatabase',
  'notificationContact',
  'whatsappGroups',
  'trailer',
  'primeMover',
  'feg',
  'fegInspection',
  'fegAssetRefs',
  'fegVendors',
  'fegDisposalAudit',
  'safetyInspection',
  'safetyReceiving'
]);

const FOCC_SUPABASE_ONLY = true;

/* ---------------------------------------------------------------------
   BUG BADGE POLLING
--------------------------------------------------------------------- */
const BUG_BADGE_POLL_MS = 60000;
let bugBadgeTimer = null;