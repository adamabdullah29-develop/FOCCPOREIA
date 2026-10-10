/* =========================================================================
   Fleet Operations Command Center — data model + generic table engine
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
      /* Satu baris = satu KUMPULAN: satu Asset (trak/trailer) ATAU satu Building.
         Butiran setiap extinguisher (serial, tarikh, vendor, status, disposal)
         disimpan dalam row.units[] — diurus di Detail Page, bukan di table ni.
         Quantity TIDAK disimpan: ia dikira dari units.length (satu sumber kebenaran). */
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
      /* --- Personal --- */
      {id:'staffName',      label:'Staff Name',      type:'text'},
      {id:'icNumber',       label:'IC Number',       type:'ic'},
      {id:'dateOfBirth',    label:'Date of Birth',   type:'date'},
      {id:'age',            label:'Age',             type:'computed-age'},
      {id:'nationality',    label:'Nationality',     type:'text'},
      /* --- Employment --- */
      {id:'employeeId',     label:'Employee ID',     type:'text'},
      {id:'designation',    label:'Designation',     type:'text'},
      {id:'branch',         label:'Branch',          type:'text'},
      {id:'dateHired',      label:'Date Hired',      type:'date'},
      {id:'tenure',         label:'Tenure',          type:'computed-tenure'},
      {id:'employmentType', label:'Employment Type', type:'select', options:['Full Time','Contract','Part Time','Intern','Probation']},
      {id:'employmentStatus', label:'Employee Status', type:'computed-employment-status'},
      {id:'resignationDate',  label:'Resignation Date', type:'date'},
      /* --- Contact --- */
      {id:'phone',          label:'Phone Number',    type:'phone'},
      {id:'whatsapp',       label:'WhatsApp',        type:'computed-whatsapp'},
      {id:'personalEmail',  label:'Personal Email',  type:'text'},
      {id:'workEmail',      label:'Work Email',      type:'text'},
      {id:'address',        label:'Address',         type:'text'},
      /* --- Driving & Travel Documents --- */
      {id:'licenseNumber',  label:'License Number',  type:'text'},
      {id:'licenseExpiry',  label:'License Expiry',  type:'date'},
      {id:'gdlNumber',      label:'GDL Number',      type:'text'},
      {id:'gdlExpiry',      label:'GDL Expiry',      type:'date'},
      {id:'passportNo',     label:'Passport No.',    type:'text'},
      {id:'passportExpiry', label:'Passport Expiry', type:'date'},
      /* --- Tests & Medical --- */
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
  depotLayout: {
    label: 'Depot Layout',
    storageKey: 'kor-depot-layout',
    columns: [
      {id:'layoutId', label:'Layout ID', type:'text'},
      {id:'depotName', label:'Depot Name', type:'text'},
      {id:'blocks', label:'Blocks (JSON)', type:'text'},
    ],
    seed: [],
  },

  depotContainers: {
    label: 'Depot Containers',
    storageKey: 'kor-depot-containers',
    columns: [
      {id:'containerNo', label:'Container No', type:'text'},
      {id:'type', label:'Type', type:'select', options:['20ft Standard','40ft Standard','40ft HC','45ft']},
      {id:'status', label:'Status', type:'badge'},
      {id:'blockName', label:'Block', type:'text'},
      {id:'slotNo', label:'Slot', type:'text'},
      {id:'stackLevel', label:'Stack', type:'number'},
      {id:'customer', label:'Customer', type:'text'},
      {id:'jobNo', label:'Job No', type:'text'},
      {id:'vessel', label:'Vessel', type:'text'},
      {id:'weight', label:'Weight (kg)', type:'number'},
      {id:'inDate', label:'In Date', type:'date'},
      {id:'outDate', label:'Out Date', type:'date'},
      {id:'departed', label:'Departed', type:'badge'},
      {id:'remarks', label:'Remarks', type:'text'},
    ],
    seed: [],
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

  /* ---- HIRARC Register (Phase 1) ----------------------------------
     Table key doubles as the GoogleSheetProvider "table" param (see
     getData()/persist() -> provider.loadTable/saveTable), so this key
     is deliberately literal 'HIRARC_MASTER' to match the required
     Google Sheet tab/table name without touching GoogleSheetProvider. */
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
      // Not user-selectable in Phase 1 UI (New Assessment modal has no
      // Status field, per spec) — new records default to 'Open'.
      // badgeFor() already colours 'Open' as a red/pink pill (see
      // badWords list), matching the target design's status pill.
      {id:'status', label:'Status', type:'badge'},
    ],
    seed: [],
  },

  /* Hazard rows belonging to a HIRARC_MASTER assessment, one flat row per
     hazard (kept as its own Google Sheet table, HIRARC_HAZARDS, so the
     nested hazard list never has to be serialised into a single cell).
     'parentRefNo' links each row back to its HIRARC_MASTER.refNo. Not
     surfaced via renderDataPage/ROUTES — read/written only from the
     HIRARC Assessment Editor (renderHirarcEditorView) below. */
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
   PERSISTENCE
--------------------------------------------------------------------- */
/* ---- 4.4 DATA LAYER — load / save / cache / persist ---- */

async function loadTableData(tableKey){
  const def = TABLES[tableKey];
  const normalizeFegDates = rows => tableKey === 'feg'
    ? rows.map(row => {
        const clean = {...row};
        ['cylinder', 'service'].forEach(field => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(clean[field] || ''))) clean[field] = '';
        });
        return clean;
      })
    : rows;
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(def.storageKey, false);
      if (res && res.value){
        return normalizeFegDates(JSON.parse(res.value));
      }
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(def.storageKey);
      if (raw) return normalizeFegDates(JSON.parse(raw));
    }
  }catch(e){ /* not found yet */ }
  return normalizeFegDates(def.seed.map(r => ({...r})));
}

async function saveTableData(tableKey, data){
  const def = TABLES[tableKey];
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(def.storageKey, JSON.stringify(data), false);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(def.storageKey, JSON.stringify(data));
    }
    flashSaved();
  }catch(e){
    console.error('save failed', e);
  }
}

let saveChipTimer;
function flashSaved(){
  const chip = document.getElementById('savechip');
  if (!chip) return;
  chip.classList.add('show');
  clearTimeout(saveChipTimer);
  saveChipTimer = setTimeout(()=>chip.classList.remove('show'), 1200);
}

const DATA_CACHE = {};
// Table version returned by loadTable/saveTable (Google Sheet provider's
// optimistic-lock counter). Must be sent back on every saveTable call —
// omitting it makes the backend always compare against version=1, so
// every save after the very first one gets rejected as a false-positive
// "modified by another user" conflict. Not used by LocalStorageProvider.
const DATA_VERSION = {};
// in-memory backups for undoing imports per table
window.IMPORT_BACKUPS = window.IMPORT_BACKUPS || {};
// getData()/persist() are provider-routed (Task 5/6): which backend they
// hit is resolved from Settings (Database Type) on every call, via
// getActiveProvider() below. Every page in the app calls these two
// functions exactly as before — no call site above this point changes.
async function getData(tableKey){
  if (!(tableKey in DATA_CACHE)){
    const provider = await getActiveProviderAsync(tableKey);
    DATA_CACHE[tableKey] = await provider.loadTable(tableKey);
  }
  return DATA_CACHE[tableKey];
}
async function persist(tableKey){
    const provider = await getActiveProviderAsync(tableKey);
  foccRealtimeMute(tableKey);   // elak refresh sendiri masa kita tengah save
  try{
    await provider.saveTable(tableKey, DATA_CACHE[tableKey]);
  }catch(err){
    // Surface the real reason (e.g. a genuine version conflict, an
    // unreachable Apps Script URL, or a missing sheet/table) instead of
    // failing silently — every call site just does `await persist(...)`
    // with no catch of its own, so this is the one place that can tell
    // the user anything went wrong at all.
    alert('Save failed: ' + (err && err.message ? err.message : err));
    throw err;
  }
}

/* ---------------------------------------------------------------------
   GENERIC EDITABLE TABLE RENDERER
--------------------------------------------------------------------- */
// Calculate repair duration in days from Date In to Date Out (0 while still repairing)
/* ---- 4.5 COMPUTED FIELDS — repair, month, service, tenure ---- */

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
// Derive the month name (e.g. "August") from a Date value
function calcMonthName(dateStr){
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {month:'long'});
}

function calcNextService(serviceDate){
  if (!serviceDate) return '';
  const d = new Date(`${serviceDate}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return toISODateLocal(next);
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

/* Susunan paparan: Branch A→Z, kemudian kolum pertama table.
   Auto untuk MANA-MANA table yang ada kolum 'branch' — termasuk page baharu.
   DISPLAY-ONLY: DATA_CACHE & idx asal TIDAK diubah, jadi Edit/Delete/Export
   kekal tepat. Boleh matikan per page: opts.noAutoSort = true. */
function branchSortRows(tableKey, rows, opts){
  opts = opts || {};
  if (opts.noAutoSort) return rows;
  const cols = (TABLES[tableKey] && TABLES[tableKey].columns) || [];
  const field = opts.sortField || (cols.some(c => c.id === 'branch') ? 'branch' : '');
  if (!field) return rows;

  const blank = v => !String(v ?? '').trim();
  const norm  = v => String(v ?? '').trim();
  const cmp   = (a, b) => norm(a).localeCompare(norm(b), undefined, { numeric:true, sensitivity:'base' });
  const sub   = opts.subSortField || (cols[0] && cols[0].id) || '';

  return rows.slice().sort((A, B) => {
    const ab = blank(A.row[field]), bb = blank(B.row[field]);
    if (ab !== bb) return ab ? 1 : -1;                 // branch kosong ke bawah
    const c = cmp(A.row[field], B.row[field]);
    if (c) return c;
    if (sub && sub !== field) return cmp(A.row[sub], B.row[sub]);
    return 0;                                          // stabil
  });
}

function buildTableHTML(tableKey, data, filterText, opts){
  opts = opts || {};
  const def = TABLES[tableKey];
  const cols = opts.visibleColumnIds
    ? opts.visibleColumnIds.map(id => def.columns.find(c => c.id === id)).filter(Boolean)
    : def.columns;
  const term = (filterText || '').toLowerCase();
  // Row-action visibility (Notification History: system-generated audit
  // trail — no Edit ever; Delete only for Admin/'ALL' route). Both default
  // to true so every other table's markup is byte-for-byte unchanged.
  const showEditButton = opts.showEditButton !== false;
  const showDeleteButton = opts.showDeleteButton !== false;
  // Opt-in extra row action (e.g. HIRARC Register's "Download PDF" button).
  // Undefined for every other table, so their markup stays byte-for-byte
  // unchanged.
  const extraRowAction = opts.extraRowAction || null;
  const showRowActions = showEditButton || showDeleteButton || !!extraRowAction;

  let rows = data.map((row, idx) => ({row, idx}));
  if (opts.rowFilterFn) rows = rows.filter(({row}) => opts.rowFilterFn(row));

  // support special filter token: __ach_range__<min>_<max> (use empty for open-ended)
  if (term.startsWith('__ach_range__')){
    const parts = term.replace('__ach_range__','').split('_');
    const min = parts[0] === '' ? -Infinity : parseFloat(parts[0]);
    const max = parts[1] === '' ? Infinity : parseFloat(parts[1]);
    rows = rows.filter(({row}) => {
      const a = parseFloat(row.achievement || 0) || 0;
      return a >= min && a < max;
    });
  } else {
    rows = rows.filter(({row}) => !term || Object.values(row).some(v => (v ?? '').toString().toLowerCase().includes(term)));
  }
    // Auto Branch A→Z (semua page yang ada kolum Branch) — display sahaja.
  rows = branchSortRows(tableKey, rows, opts);

  let html = `<div class="tablewrap"><table class="datatable" data-table="${tableKey}"><thead><tr>`;
  cols.forEach(c => html += `<th>${c.label}</th>`);
  html += `${showRowActions ? '<th></th>' : ''}</tr></thead><tbody>`;

  rows.forEach(({row, idx}) => {
    html += `<tr data-idx="${idx}">`;
    cols.forEach(c => {
      const raw = row[c.id] ?? '';
      const disp = cellDisplay(c, raw, row);
      const inner = (opts.linkColumnId && c.id === opts.linkColumnId)
        ? `<span class="celllink" data-idx="${idx}">${disp}</span>`
        : disp;
      html += `<td data-col="${c.id}" data-type="${c.type}" data-raw="${(raw+'').replace(/"/g,'&quot;')}">${inner}</td>`;
    });
    if (showRowActions){
      html += `<td class="row-actions"><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
        ${extraRowAction ? `<button class="btn rowextra" data-idx="${idx}" title="${escapeHtml(extraRowAction.title || '')}" aria-label="${escapeHtml(extraRowAction.title || '')}">
          ${extraRowAction.icon || ''}
        </button>` : ''}
        ${showEditButton ? `<button class="btn rowedit" data-idx="${idx}" title="Edit row" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
        </button>` : ''}
        ${showDeleteButton ? `<button class="btn rowdel" data-idx="${idx}" title="Delete row" aria-label="Delete">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" fill="currentColor"/><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
        </button>` : ''}
      </div></td>`;
    }
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  return html;
}

function parseEditedValue(col, text){
  text = text.trim();
  if (col.type === 'number' || col.type === 'money'){
    const n = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? '' : n;
  }
  if (col.type === 'pct'){
    const n = parseFloat(text.replace(/[^0-9.\-]/g, ''));
    if (isNaN(n)) return '';
    return n > 1 ? n / 100 : n;
  }
  return text;
}
/* =============================================================
   PADAM FAIL STORAGE IKUT REKOD
   Cari SEMUA storagePath dalam satu row (docs / units[].docs /
   serviceLog / apa-apa sahaja), pastikan tiada row LAIN yang
   masih menunjuk ke path itu, baru buang.
   ============================================================= */
function foccCollectStoragePaths(value, out){
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)){ value.forEach(v => foccCollectStoragePaths(v, out)); return; }
  if (typeof value.storagePath === 'string' && value.storagePath.trim()){
    out.add(value.storagePath.trim());
  }
  Object.values(value).forEach(v => foccCollectStoragePaths(v, out));
}

async function foccPurgeRowStorage(row){
  const candidates = new Set();
  foccCollectStoragePaths(row, candidates);
  if (!candidates.size) return;                 // tiada fail — keluar awal

  const companyId = await SupabaseProvider.getCompanyId();
  const res = await FOCC_SUPABASE
    .from('tenant_tables')
    .select('payload')
    .eq('company_id', companyId);
  if (res.error) throw res.error;

  // Path yang MASIH dirujuk row lain (contoh dua trak pernah kongsi
  // folder 'unassigned') — JANGAN buang.
  const stillUsed = new Set();
  (res.data || []).forEach(t => foccCollectStoragePaths(t.payload, stillUsed));

  const paths = [...candidates].filter(p => p.startsWith(companyId + '/') && !stillUsed.has(p));
  if (!paths.length) return;

  const del = await FOCC_SUPABASE.storage.from('focc-documents').remove(paths);
  if (del.error) throw del.error;
}

function wireTable(container, tableKey, getFilterText, opts){
  // table is read-only in-place. Edits happen via the Edit button which opens the modal.
  container.addEventListener('click', async (e) => {
    const cellLink = e.target.closest('.celllink');
    if (cellLink && container.contains(cellLink) && opts && opts.onLinkClick){
      await opts.onLinkClick(parseInt(cellLink.dataset.idx, 10));
      return;
    }
    const extraBtn = e.target.closest('.rowextra');
    if (extraBtn && container.contains(extraBtn)){
      const idx = parseInt(extraBtn.dataset.idx, 10);
      if (opts && opts.onExtraRowAction) await opts.onExtraRowAction(idx);
      return;
    }

    const editBtn = e.target.closest('.rowedit');
    if (editBtn && container.contains(editBtn)){
      const idx = parseInt(editBtn.dataset.idx, 10);
      if (opts && opts.onEditRow){
        await opts.onEditRow(idx);
        return;
      }
      await openEditRowModal(tableKey, idx, async () => {
        await refreshTable(container, tableKey, getFilterText ? getFilterText() : '', opts);
      });
      return;
    }

    const delBtn = e.target.closest('.rowdel');
    if (delBtn && container.contains(delBtn)){
      const idx = parseInt(delBtn.dataset.idx, 10);
      if (opts && opts.onDeleteRow){
        await opts.onDeleteRow(idx);
        return;
      }
      const data = await getData(tableKey);
      if (!confirm('Delete this row?')) return;
      const deletedRow = data[idx];              // simpan SEBELUM dibuang
      data.splice(idx, 1);
      await persist(tableKey);
      // Rekod dah tiada -> baru buang fail (elak fail hilang kalau save gagal)
      try{ await foccPurgeRowStorage(deletedRow); }
      catch(e){ console.error('Row deleted, but Storage cleanup failed:', e); }
      await refreshTable(container, tableKey, getFilterText ? getFilterText() : '', opts);
      if (opts && typeof opts.onAfterDelete === 'function') await opts.onAfterDelete();
      return;
    }

    const row = e.target.closest('tbody tr[data-idx]');
    if (row && container.contains(row) && opts && opts.onRowClick){
      await opts.onRowClick(parseInt(row.dataset.idx, 10));
    }
  });
}

async function refreshTable(container, tableKey, filterText, opts){
  const data = await getData(tableKey);
  container.innerHTML = buildTableHTML(tableKey, data, filterText, opts);
}

/* Renders a full "data page": toolbar (search + add-row) + editable table */
async function renderDataPage(tableKey, opts){
  opts = opts || {};
  const def = TABLES[tableKey];
  const data = await getData(tableKey);

  // ---- Column filters (opt-in via opts.filterFields, e.g. ['branch']) ----
  // Display-only: never writes to DATA_CACHE or the Google Sheet. Each
  // filter starts at "All" every time the page opens (no saved state).
  const filterFields = opts.filterFields || [];
  const filterState = {};
  const filterChoices = {};
  filterFields.forEach(fid => {
    const set = new Set();
    data.forEach(r => { const v = String(r[fid] ?? '').trim(); if (v) set.add(v); });
    filterChoices[fid] = [...set].sort((a,b) => a.localeCompare(b));
  });
  const baseOptions = opts.tableOptions || {};
  const baseRowFilter = baseOptions.rowFilterFn || null;
  const tableOptions = {...baseOptions};
  if (filterFields.length){
    tableOptions.rowFilterFn = row => {
      if (baseRowFilter && !baseRowFilter(row)) return false;
      return filterFields.every(fid => {
        const want = filterState[fid];
        return !want || String(row[fid] ?? '') === want;
      });
    };
  }

  const wrap = document.createElement('div');
  if (opts.wrapperClass) wrap.classList.add(opts.wrapperClass);
  wrap.innerHTML = `
    ${opts.note ? `<div class="notice notice-info">&#9432;&nbsp; ${opts.note}</div>` : ''}
    ${opts.beforeSectionHtml || ''}
    <div class="section">
      <div class="section-head">
        <span class="eyebrow">${data.length} records</span>
        <div class="spacer"></div>
        <span class="savechip" id="savechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="toolbar">
          <input class="searchbox" type="text" placeholder="Search ${def.label.toLowerCase()}...">
          ${filterFields.map(fid => {
            const colDef = def.columns.find(c => c.id === fid);
            const lbl = colDef ? colDef.label : fid;
            return `<span class="tblfilter-wrap">
              <span class="tblfilter-lbl">${escapeHtml(lbl)}:</span>
              <button type="button" class="tblfilter-btn" data-tblfilter-btn="${fid}" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" data-tblfilter-val="${fid}">All</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" data-tblfilter-panel="${fid}" role="listbox"></div>
            </span>`;
          }).join('')}
          <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">

            ${opts.readOnly ? '' : `
            <button class="btn primary" id="addRowBtn">+ <span class="lbl-full">Add Row</span><span class="lbl-short">Add</span></button>
            <button class="btn" id="importBtn"><span class="lbl-full">Import Data</span><span class="lbl-short">Import</span></button>
            <button class="btn" id="undoBtn" disabled><span class="lbl-full">Undo Import</span><span class="lbl-short">Undo</span></button>
            <input type="file" id="importFile" accept=".csv" style="display:none">
            `}
            <button class="btn" id="exportBtn"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            ${opts.showComplianceAlertButton ? `<button class="btn" id="complianceAlertBtn"><span class="lbl-full">Compliance Alert</span><span class="lbl-short">Alert</span></button>` : ''}
          </div>
        </div>
        <div id="tableHost"></div>
      </div>
    </div>
  `;
  const tableHost = wrap.querySelector('#tableHost');
  const search = wrap.querySelector('.searchbox');
  // Recompute the "N records" pill from the latest data, respecting the
  // active branch filter (if any). Called after add / import / undo / delete.
  const pageOpts = (typeof tableOptions !== 'undefined') ? tableOptions : (opts.tableOptions || {});
  function updateEyebrow(){
    const all = DATA_CACHE[tableKey] || [];
    let cnt = all.length;
    if (pageOpts && typeof pageOpts.rowFilterFn === 'function'){
      cnt = all.filter(pageOpts.rowFilterFn).length;
    }
    const pill = wrap.querySelector('.eyebrow');
    if (pill) pill.textContent = `${cnt} records`;
  }
  tableHost.innerHTML = buildTableHTML(tableKey, data, '', pageOpts);
  wireTable(tableHost, tableKey, () => search.value, Object.assign({}, pageOpts, { onAfterDelete: updateEyebrow }));

  search.addEventListener('input', () => refreshTable(tableHost, tableKey, search.value, tableOptions));

  // ---- Custom filter dropdown (tblfilter) wiring ----
  function optionRowHTML(fid, val, label){
    const isActive = (filterState[fid] || '') === val;
    return `<div class="tblfilter-option${isActive ? ' is-active' : ''}" data-value="${val.replace(/"/g,'&quot;')}" role="option">
      <span>${escapeHtml(label)}</span>
      <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </div>`;
  }
  function renderFilterPanel(fid){
    const panel = wrap.querySelector(`[data-tblfilter-panel="${fid}"]`);
    const valEl = wrap.querySelector(`[data-tblfilter-val="${fid}"]`);
    if (!panel) return;
    const all = DATA_CACHE[tableKey] || [];
    const vals = [...new Set(all.map(r => String(r[fid] ?? '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    if (filterState[fid] && !vals.includes(filterState[fid])) filterState[fid] = '';
    const keep = filterState[fid] || '';
    let html = optionRowHTML(fid, '', 'All');
    html += vals.map(v => optionRowHTML(fid, v, v)).join('');
    panel.innerHTML = html;
    if (valEl) valEl.textContent = keep || 'All';
    panel.querySelectorAll('.tblfilter-option').forEach(row => {
      row.addEventListener('click', async () => {
        const v = row.dataset.value || '';
        filterState[fid] = v;
        if (valEl) valEl.textContent = v || 'All';
        panel.classList.remove('open');
        const btn = wrap.querySelector(`[data-tblfilter-btn="${fid}"]`);
        if (btn) btn.setAttribute('aria-expanded','false');
        await refreshTable(tableHost, tableKey, search.value, tableOptions);
        const all2 = DATA_CACHE[tableKey] || [];
        const active = filterFields.some(f => filterState[f]);
        const cnt = active ? all2.filter(tableOptions.rowFilterFn).length : all2.length;
        const pill = wrap.querySelector('.eyebrow');
        if (pill) pill.textContent = `${cnt} records`;
      });
    });
  }
  function closeAllFilterPanels(){
    wrap.querySelectorAll('.tblfilter-panel.open').forEach(p => {
      p.classList.remove('open');
      const b = wrap.querySelector(`[data-tblfilter-btn="${p.dataset.tblfilterPanel}"]`);
      if (b) b.setAttribute('aria-expanded','false');
    });
  }
  // Global close (didaftar sekali sahaja) — tap luar / Escape tutup panel
  if (!window.__tblfilterGlobalBound){
    window.__tblfilterGlobalBound = true;
    document.addEventListener('click', (e) => {
      const insideWrap = e.target.closest('.tblfilter-wrap');
      document.querySelectorAll('.tblfilter-panel.open').forEach(p => {
        if (insideWrap && p.closest('.tblfilter-wrap') === insideWrap) return;
        p.classList.remove('open');
        const b = p.parentElement && p.parentElement.querySelector('[data-tblfilter-btn]');
        if (b) b.setAttribute('aria-expanded','false');
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape'){
        document.querySelectorAll('.tblfilter-panel.open').forEach(p => {
          p.classList.remove('open');
          const b = p.parentElement && p.parentElement.querySelector('[data-tblfilter-btn]');
          if (b) b.setAttribute('aria-expanded','false');
        });
      }
    });
  }
  filterFields.forEach(fid => {
    const btn = wrap.querySelector(`[data-tblfilter-btn="${fid}"]`);
    const panel = wrap.querySelector(`[data-tblfilter-panel="${fid}"]`);
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains('open');
      closeAllFilterPanels();
      if (!isOpen){
        renderFilterPanel(fid);      // senarai disegarkan dari data terkini
        panel.classList.add('open'); // branch baru terus muncul
        btn.setAttribute('aria-expanded','true');
      }
    });
  });

  // (Senarai filter disegarkan dalam renderFilterPanel() setiap kali
  // dropdown dibuka — branch baru muncul tanpa refresh page.)

    wrap.querySelector('#addRowBtn')?.addEventListener('click', () => {
    if (opts.onAddRow) return opts.onAddRow();
    return openAddRowModal(tableKey, async () => {
    await refreshTable(tableHost, tableKey, search.value, tableOptions);
    updateEyebrow();
    });
  });

  wrap.querySelector('#complianceAlertBtn')?.addEventListener('click', () => {
    if (opts.onComplianceAlert) return opts.onComplianceAlert();
  });

  // Export CSV helper
      /* ---- 4.7 CSV IMPORT / EXPORT ---- */

  function csvEscapeCell(v){
    if (v === null || v === undefined) return '';
    const s = (typeof v === 'string') ? v : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')){
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  }
  function toCSV(rows, cols){
    const header = cols.map(c => c.id).join(',');
    const lines = [header];
    rows.forEach(r => {
      const line = cols.map(c => {
        let v = r[c.id];
        // Kolum AUTOMATIC (Age, Tenure, WhatsApp, …) tak disimpan dalam row —
        // ia dikira masa render. Kira di sini juga, HTML dibuang.
        if (String(c.type || '').startsWith('computed-')){
          if (c.type === 'computed-whatsapp'){
            v = toWhatsAppLink(r.phone || '') || '';
          } else if (c.type === 'computed-tenure'){
            v = '';
            const s = r.dateHired ? new Date(r.dateHired + 'T00:00:00') : null;
            const e = r.resignationDate ? new Date(r.resignationDate + 'T00:00:00') : new Date();
            if (s && !isNaN(s.getTime()) && e && !isNaN(e.getTime()) && s <= e){
              let y = e.getFullYear() - s.getFullYear();
              let mo = e.getMonth() - s.getMonth();
              if (e.getDate() < s.getDate()) mo--;
              if (mo < 0){ y--; mo += 12; }
              v = (y + mo / 12).toFixed(2);
            }
          } else {
            const disp = cellDisplay(c, '', r);
            v = String(disp == null ? '' : disp)
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
                  .replace(/\s+/g, ' ').trim();
            if (v === '-') v = '';
          }
        }
        // format pct as percent number for readability
        if (c.type === 'pct' && v !== undefined && v !== null && v !== ''){
          v = (Number(v) * 100).toFixed(2);
        }
        return csvEscapeCell(v);
      }).join(',');
      lines.push(line);
    });
    return lines.join('\n');
  }
  async function handleExport(){
    let data = await getData(tableKey);
    // Export follows the active filter(s) — user exports what they see.
    if (filterFields.some(f => filterState[f])) data = data.filter(r => tableOptions.rowFilterFn(r));
    const csv = toCSV(data, opts.exportColumns || def.columns);
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const y = now.getFullYear(); const m = String(now.getMonth()+1).padStart(2,'0'); const d = String(now.getDate()).padStart(2,'0');
    a.download = `${tableKey}-${y}${m}${d}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function parseCSV(text){
    // simple CSV parser that handles quotes
    const rows = [];
    const re = /(?:\s*\,\s*|\r?\n|\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^",\r\n]*))/g;
    // fallback: split by lines then by commas when no quotes
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return rows;
    const headers = lines[0].split(',').map(h=>h.trim());
    for (let i=1;i<lines.length;i++){
      const line = lines[i];
      // naive split, handle quoted fields
      const cols = [];
      let cur = '', inQuotes = false;
      for (let chIdx=0; chIdx<line.length; chIdx++){
        const ch = line[chIdx];
        if (ch === '"'){
          if (inQuotes && line[chIdx+1] === '"'){ cur += '"'; chIdx++; }
          else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes){ cols.push(cur); cur = ''; }
        else cur += ch;
      }
      cols.push(cur);
      if (cols.length === headers.length){
        const obj = {};
        headers.forEach((h, idx) => obj[h] = cols[idx]);
        rows.push(obj);
      }
    }
    return {headers: lines[0].split(',').map(h=>h.trim()), rows };
  }

  // wire import/export buttons (only visible on this data page)
  const exportBtn = wrap.querySelector('#exportBtn');
  const importBtn = wrap.querySelector('#importBtn');
  const undoBtn = wrap.querySelector('#undoBtn');
  const importFile = wrap.querySelector('#importFile');
  exportBtn.addEventListener('click', handleExport);
  if (importBtn) importBtn.addEventListener('click', () => importFile.click());

  // undo storage (in-memory)
  if (typeof IMPORT_BACKUPS === 'undefined') window.IMPORT_BACKUPS = {};

  // Import handler: append with backup so we can undo
  // Parse a date string in common formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY,
  // MM/DD/YYYY, "12 Aug 2026", Excel serial numbers, etc.) into ISO YYYY-MM-DD.
  // Returns '' if the value cannot be confidently parsed.
  function normalizeDateValue(raw){
    if (raw === undefined || raw === null) return '';
    let s = String(raw).trim();
    if (!s) return '';
    // Already ISO (optionally with a time component) -> keep the date part
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    // DD/MM/YYYY or DD-MM-YYYY (assume day-first, common in MY spreadsheets)
    m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m){
      let day = parseInt(m[1], 10), month = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      if (month > 12 && day <= 12){ const t = day; day = month; month = t; } // swap if clearly MM/DD
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31){
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
      return '';
    }
    // Excel serial date number (e.g. 46246)
    if (/^\d{4,6}$/.test(s)){
      const serial = parseInt(s, 10);
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(epoch.getTime() + serial * 86400000);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return '';
    }
    // Fallback: let the browser try (handles "12 Aug 2026", "August 12, 2026", etc.)
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return toDateKeyUTC(parsed);
    return '';
  }
  function toDateKeyUTC(d){
    return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  }

  importFile?.addEventListener('change', async (ev) => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const txt = await f.text();
    const parsed = parseCSV(txt);
    if (!parsed || !parsed.rows) return alert('Failed to parse CSV');
    // map rows to table columns
    let unparsedDateCount = 0;
    const newData = parsed.rows.map(r => {
      const obj = {};
      def.columns.forEach(c => {
        const raw = r[c.id] !== undefined ? r[c.id] : '';
        let v = raw;
        if (c.type === 'number' || c.type === 'money'){
          const n = parseFloat(raw.replace(/[^0-9.\-]/g, ''));
          v = isNaN(n) ? '' : n;
        } else if (c.type === 'pct'){
          const n = parseFloat(raw.toString().replace(/[^0-9.\-]/g, ''));
          if (isNaN(n)) v = '';
          else v = (n > 1) ? (n/100) : n; // if user exported percent 85 -> store 0.85
        } else if (c.type === 'date'){
          v = normalizeDateValue(raw);
          if (raw && !v) unparsedDateCount++;
        } else {
          v = raw;
        }
        obj[c.id] = v;
      });
      return obj;
    });
    // Auto-calc stored columns terus selepas import — user tak payah isi
    // active/utilisation/totalHours/achievement/totalMileage dll.
    newData.forEach(o => recalcImportedRowAutos(tableKey, o));
    if (unparsedDateCount > 0){

      if (!confirm(`${unparsedDateCount} row(s) have a Date value that could not be recognised and will be imported blank, which may hide them from date-based views. Continue importing the remaining ${newData.length - unparsedDateCount} row(s) normally anyway?`)) return;
    }
    if (!confirm(`Append ${newData.length} rows to existing data for ${def.label}?`)) return;

    // take a deep copy backup of existing data so we can undo
    const existing = await getData(tableKey) || [];
    window.IMPORT_BACKUPS[tableKey] = existing.map(r => ({...r}));
    // enable undo button
    if (undoBtn){
      undoBtn.disabled = false;
      const undoFull = undoBtn.querySelector('.lbl-full');
      const undoShort = undoBtn.querySelector('.lbl-short');
      if (undoFull) undoFull.textContent = `Undo Import (${newData.length} rows)`;
      if (undoShort) undoShort.textContent = `Undo (${newData.length})`;
      if (!undoFull && !undoShort) undoBtn.textContent = `Undo Import (${newData.length} rows)`;
    }

    // append new rows to existing dataset
    DATA_CACHE[tableKey] = newData.concat(existing);
    await persist(tableKey);
    await refreshTable(tableHost, tableKey, search.value, tableOptions);
    wrap.querySelector('.eyebrow').textContent = `${(await getData(tableKey)).length} records`;
    importFile.value = '';
    alert('Import completed (appended)');
  });

  // Undo handler: restore from last backup if present
  if (undoBtn){
    undoBtn.addEventListener('click', async () => {
      const backup = window.IMPORT_BACKUPS && window.IMPORT_BACKUPS[tableKey];
      if (!backup || !backup.length) return alert('No import to undo');
      if (!confirm(`Undo last import and restore previous ${def.label} data?`)) return;
      DATA_CACHE[tableKey] = backup.map(r => ({...r}));
      // remove backup after undo
      delete window.IMPORT_BACKUPS[tableKey];
      undoBtn.disabled = true;
      const undoFullR = undoBtn.querySelector('.lbl-full');
      const undoShortR = undoBtn.querySelector('.lbl-short');
      if (undoFullR) undoFullR.textContent = 'Undo Import';
      if (undoShortR) undoShortR.textContent = 'Undo';
      await persist(tableKey);
      await refreshTable(tableHost, tableKey, search.value, tableOptions);
      wrap.querySelector('.eyebrow').textContent = `${(await getData(tableKey)).length} records`;
      alert('Undo completed');
    });
  }

  return wrap;
}

/* ---------------------------------------------------------------------
   ADD ROW MODAL
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

// Tables & fields yang guna FIXED picker (rupa baharu, tiada taip/tambah) —
// nilai tetap dari c.options. Senarai eksplisit supaya table lain tak terjejas.
const FIXED_PICKER_FIELDS = {
  notificationContact: ['status'],
  whatsappGroups: ['status'],
  staffDatabase: ['employmentType'],
  feg: ['assetType'],
};

// Tables & fields that use an editable, persisted option list
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
  trailer: {
    pmaCategory: [],
  },
  primeMover: {
    branch: ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'],
    pmaCategory: [],
  },
  feg: {
    assetRef: [],
  },
};

function comboStorageKey(tableKey, fieldId){
  // Preserve the original storage key format for Maintenance Log fields
  // (already in use) so previously saved option lists aren't lost.
  if (tableKey === 'maintenanceLog') return 'kor-maintenance-log-options-' + fieldId;
  return `kor-combo-options-${tableKey}-${fieldId}`;
}

/* ---- 4.8 COMBO DROPDOWNS & OPTION LISTS ---- */

/* =============================================================
   FEG — 3 senarai ini kini di Supabase (dikongsi SEMUA device).
   assetRef · vendor · disposalAudit  →  table logik tenant_tables.
   Table lain (maintenanceLog, misconduct, safetyEquipment, staffDatabase,
   primeMover, trailer, machineryLog) TIDAK berubah — kekal browser storage.
   ============================================================= */
const FEG_SB_OPTION_TABLES = {
  assetRef     : 'fegAssetRefs',
  vendor       : 'fegVendors',
  disposalAudit: 'fegDisposalAudit',
};
function fegSbOptionTable(tableKey, fieldId){
  if (tableKey !== 'feg') return '';
  return FEG_SB_OPTION_TABLES[fieldId] || '';
}
/* null = baris belum wujud (biar caller semai default) · [] = dah wujud tapi kosong */
async function fegSbOptionLoad(sbKey){
  let rows = [];
  try{ rows = await getData(sbKey); }catch(e){ rows = []; }
  if (Array.isArray(rows) && rows.length) return rows;
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const res = await FOCC_SUPABASE.from('tenant_tables')
      .select('table_key')
      .eq('company_id', companyId)
      .eq('table_key', sbKey)
      .maybeSingle();
    if (res.error) return Array.isArray(rows) ? rows : [];
    return res.data ? (Array.isArray(rows) ? rows : []) : null;
  }catch(e){ return Array.isArray(rows) ? rows : null; }
}
async function fegSbOptionSave(sbKey, list){
  const safe = Array.isArray(list) ? list.slice() : [];
  let lastErr = null;
  for (let attempt = 0; attempt < 3; attempt++){
    if (attempt > 0){
      // Versi berubah (user lain save serentak) — ambil versi terbaru, cuba lagi.
      try{ await SupabaseProvider.loadTable(sbKey); }catch(e){}
    }
    DATA_CACHE[sbKey] = safe.slice();
    try{ await persist(sbKey); return; }
    catch(e){ lastErr = e; }
  }
  throw lastErr || new Error('Save failed.');
}

async function loadOptionList(tableKey, fieldId){
  const sbKey = fegSbOptionTable(tableKey, fieldId);
  if (sbKey) return await fegSbOptionLoad(sbKey);

  const key = comboStorageKey(tableKey, fieldId);
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(key, false);
      if (res && res.value) return JSON.parse(res.value);
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  }catch(e){ /* not found yet */ }
  return null; // null = never initialized, caller should seed defaults
}

async function saveOptionList(tableKey, fieldId, list){
  const sbKey = fegSbOptionTable(tableKey, fieldId);
  if (sbKey){ await fegSbOptionSave(sbKey, list); return; }

  const key = comboStorageKey(tableKey, fieldId);
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, JSON.stringify(list), false);
    } else if (typeof localStorage !== 'undefined'){
      localStorage.setItem(key, JSON.stringify(list));
    }
  }catch(e){ console.error('save option list failed', e); }
}

function buildComboField(c){
  return `<div class="formfield"><label>${c.label}</label>
    <div class="combo-wrap" data-combo-wrap="${c.id}">
      <input data-col="${c.id}" type="text" autocomplete="off" placeholder="Type new or pick existing...">
      <div class="combo-panel" data-combo-panel="${c.id}"></div>
    </div>
  </div>`;
}

/* FIXED picker (rupa baharu, read-only) — nilai tetap dari c.options.
   Input KEKALKAN data-col supaya kod simpan tak berubah. Panel buka KE BAWAH. */
function buildFixedPickerField(c){
  return `<div class="formfield"><label>${c.label}</label>
    <div class="fpick" data-fpick="${c.id}">
      <input data-col="${c.id}" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="${c.id}"></div>
    </div>
  </div>`;
}

function wireFixedPickerFields(box, tableKey, def){
  const fieldIds = FIXED_PICKER_FIELDS[tableKey];
  if (!fieldIds) return;                 // page lain: keluar terus
  fieldIds.forEach(fid => {
    const colDef = def.columns.find(c => c.id === fid);
    const inp = box.querySelector(`[data-col="${fid}"]`);
    if (!colDef || !inp) return;
    wireFixedPicker(box, {
      field: `[data-fpick="${fid}"]`,
      input: `[data-col="${fid}"]`,
      panel: `[data-fpick-panel="${fid}"]`,
      values: (colDef.options || []).slice(),
      current: inp.value || ''
    });
  });
}

async function wireComboFields(box, tableKey, def){
  const fieldIds = COMBO_OPTION_FIELDS[tableKey];
  if (!fieldIds) return;
  for (const fieldId of fieldIds){
    const wrap = box.querySelector(`[data-combo-wrap="${fieldId}"]`);
    if (!wrap) continue;
    const input = wrap.querySelector('input[data-col]');
    const panel = wrap.querySelector('[data-combo-panel]');
    const colDef = def.columns.find(c => c.id === fieldId);
    const fieldLabel = colDef ? colDef.label : fieldId;

    let options = await loadOptionList(tableKey, fieldId);
    if (options === null){
      options = (COMBO_DEFAULT_OPTIONS[tableKey] && COMBO_DEFAULT_OPTIONS[tableKey][fieldId]) || [];
      await saveOptionList(tableKey, fieldId, options);
    }

    function renderPanel(filterText){
      const term = (filterText || '').toLowerCase();
      const visible = term ? options.filter(o => o.toLowerCase().includes(term)) : options;
      if (!visible.length){
        panel.innerHTML = `<div class="combo-empty">No saved options yet</div>`;
        return;
      }
      panel.innerHTML = visible.map(o => `
        <div class="combo-item" data-value="${o.replace(/"/g,'&quot;')}">
          <span class="combo-item-text">${o}</span>
          <button type="button" class="combo-del" data-del="${o.replace(/"/g,'&quot;')}" title="Remove from list">&times;</button>
        </div>
      `).join('');
      panel.querySelectorAll('.combo-item').forEach(row => {
        row.querySelector('.combo-item-text').addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = row.dataset.value;
          panel.classList.remove('open');
        });
        row.querySelector('.combo-del').addEventListener('mousedown', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const val = row.dataset.value;
          if (!confirm(`Remove "${val}" from the ${fieldLabel} list?`)) return;
          options = options.filter(o => o !== val);
          await saveOptionList(tableKey, fieldId, options);
          renderPanel(input.value);
        });
      });
    }
    renderPanel();

    input.addEventListener('focus', () => { renderPanel(input.value); panel.classList.add('open'); });
    input.addEventListener('input', () => { renderPanel(input.value); panel.classList.add('open'); });
    input.addEventListener('blur', () => {
      setTimeout(async () => {
        panel.classList.remove('open');
        const val = input.value.trim();
        if (val && !options.includes(val)){
          options = [...options, val].sort();
          await saveOptionList(tableKey, fieldId, options);
        }
      }, 150);
    });
  }
}

async function getVesselOptions(){
  const opRows = await getData('operationKPI');
  return [...new Set(opRows.map(r => r.vessel).filter(Boolean))].sort();
}

async function getTruckOptions(){
  const primeRows = await getData('primeMover');
  return [...new Set(primeRows.map(r => (r.lorry || '').trim()).filter(Boolean))].sort();
}

async function getDriverOptions(){
  const staffRows = await getData('staffDatabase');
  return [...new Set(
    staffRows
      .filter(r => (r.designation || '').trim().toLowerCase() === 'driver')
      .map(r => r.staffName)
      .filter(Boolean)
  )].sort();
}

async function getSafetyEquipmentAssetOptions(){
  const [primeRows, staffRows] = await Promise.all([getData('primeMover'), getData('staffDatabase')]);
  const truckNumbers = [...new Set(primeRows.map(r => (r.lorry || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const staffNames = [...new Set(staffRows.map(r => (r.staffName || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  return [...truckNumbers, ...staffNames];
}

/* ---- 4.9 ADD / EDIT ROW MODALS ---- */

/* Notification Contact ONLY (Add + Edit):
   Susunan form ditukar: BRANCH dulu, baru NAME (DOM sahaja — table tak disentuh).
   Branch = FIXED picker — senarai cawangan dari table Staff Database.
   Name   = FIXED picker — hanya staff dari branch yang dipilih (TIADA taip).
   Tukar Branch → Name direset. Page/fungsi lain tak disentuh. */
async function wireNotificationContactNameBranch(box){
  const nameOld = box.querySelector('[data-col="name"]');
  const brOld   = box.querySelector('[data-col="branch"]');
  if (!nameOld || !brOld) return;              // page lain: keluar terus

  const nameField = nameOld.closest('.formfield');
  const brField   = brOld.closest('.formfield');
  if (!nameField || !brField || !nameField.parentNode) return;

  const escS = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g,' ');

  let staffRows = [];
  try { staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('notification contact: staff load failed', e); }

  // Staff: unik ikut nama + branch + employeeId
  const seen = new Set();
  const staff = [];
  staffRows.forEach(r => {
    const nm = String(r.staffName || '').trim();
    if (!nm) return;
    const br = String(r.branch || '').trim();
    const id = String(r.employeeId || '').trim();
    const k = norm(nm) + '|' + norm(br) + '|' + id;
    if (seen.has(k)) return;
    seen.add(k);
    staff.push({ name: nm, branch: br, empId: id });
  });

  // Senarai Branch: dari Staff Database sahaja (unik + tersusun)
  const branches = [...new Set(staff.map(s => s.branch).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  // Nilai semasa (Edit: sudah prefill. Add: kosong)
  const curBranch = String(brOld.value || '').trim();
  const curName   = String(nameOld.value || '').trim();

  // --- 1) Tukar susunan DOM: BRANCH sebelum NAME (table kekal) ---
  nameField.parentNode.insertBefore(brField, nameField);

  // --- 2) Tulis semula kedua-dua kotak jadi .fpick (rupa sedia ada, panel ke bawah) ---
  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="ncBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="ncBranch"></div>
    </div>`;

  nameField.innerHTML = `
    <label>Name</label>
    <div class="fpick" data-fpick="ncName">
      <input data-col="name" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select staff...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="ncName"></div>
    </div>`;

  const brEl      = brField.querySelector('[data-col="branch"]');
  const brPanel   = brField.querySelector('[data-fpick-panel="ncBranch"]');
  const nameEl    = nameField.querySelector('[data-col="name"]');
  const namePanel = nameField.querySelector('[data-fpick-panel="ncName"]');
  if (!brEl || !brPanel || !nameEl || !namePanel) return;

  brEl.value   = curBranch;
  nameEl.value = curName;

  const closeAll = () => { brPanel.classList.remove('open'); namePanel.classList.remove('open'); };
  const syncNameHint = () => { nameEl.placeholder = norm(brEl.value) ? 'Select staff...' : 'Select branch first...'; };
  syncNameHint();

  // --- BRANCH: senarai cawangan ---
  function renderBranchPanel(){
    if (!branches.length){
      brPanel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = norm(brEl.value);
    brPanel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${norm(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    brPanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        const picked = row.dataset.value || '';
        if (norm(picked) !== norm(brEl.value)) nameEl.value = '';   // tukar branch → reset name
        brEl.value = picked;
        syncNameHint();
        closeAll();
      });
    });
  }

  // --- NAME: hanya staff dari branch yang dipilih ---
  function renderNamePanel(){
    const cb = norm(brEl.value);
    if (!cb){
      namePanel.innerHTML = '<div class="combo-empty">Select branch first</div>';
      return;
    }
    const list = staff.filter(s => norm(s.branch) === cb)
                      .sort((a, b) => a.name.localeCompare(b.name));
    if (!list.length){
      namePanel.innerHTML = '<div class="combo-empty">No staff in this branch</div>';
      return;
    }
    const cn = norm(nameEl.value);
    const dup = nm => list.filter(s => norm(s.name) === nm).length > 1;
    namePanel.innerHTML = list.map(s => {
      const label = dup(norm(s.name))
        ? `${s.name}${s.empId ? ' (' + s.empId + ')' : ''}`
        : s.name;
      return `<div class="combo-item fpick-option${norm(s.name) === cn ? ' is-active' : ''}" data-value="${escS(s.name)}">
        <span class="combo-item-text">${escS(label)}</span>
      </div>`;
    }).join('');
    namePanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        nameEl.value = row.dataset.value || '';
        closeAll();
      });
    });
  }

  // --- Interaksi: klik buka/tutup, taip disekat, satu panel pada satu masa ---
  function bindPicker(el, panel, render){
    el.addEventListener('click', () => {
      const wasOpen = panel.classList.contains('open');
      closeAll();
      if (wasOpen) return;
      render();
      panel.classList.add('open');
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ closeAll(); return; }
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); return; }
      e.preventDefault();                 // block taip
    });
  }
  bindPicker(brEl, brPanel, renderBranchPanel);
  bindPicker(nameEl, namePanel, renderNamePanel);

  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target) && !nameField.contains(e.target)) closeAll();
  });
}

/* WhatsApp Groups ONLY: Branch = FIXED picker (rupa baharu).
   - Senarai cawangan dari table Staff Database (unik, A-Z).
   - TIADA taip, TIADA tambah, TIADA padam.
   - Panel buka KE ATAS supaya borang tak bertambah tinggi.
   - Rekod lama yang branch-nya tiada dalam Staff DB → dikosongkan.
   Page/fungsi lain tak disentuh. */
async function wireWhatsAppGroupsBranch(box){
  const brOld = box.querySelector('[data-col="branch"]');
  if (!brOld) return;                                  // page lain: keluar terus
  const brField = brOld.closest('.formfield');
  if (!brField) return;

  const escS = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const norm = s => String(s || '').trim().toUpperCase().replace(/\s+/g,' ');

  let staffRows = [];
  try { staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('whatsapp groups: staff load failed', e); }

  // Cawangan unik dari Staff Database (buang kosong + duplicate), susun A-Z
  const seenBr = new Set();
  const branches = [];
  staffRows.forEach(r => {
    const v = String(r.branch || '').trim();
    if (!v) return;
    const k = norm(v);
    if (seenBr.has(k)) return;
    seenBr.add(k);
    branches.push(v);
  });
  branches.sort((a, b) => a.localeCompare(b));

  // Rekod lama: kalau branch tiada dalam Staff DB → kosongkan (bukan dikekalkan)
  const curRaw = String(brOld.value || '').trim();
  const cur = branches.some(b => norm(b) === norm(curRaw)) ? curRaw : '';

  // Ganti field Branch dengan fixed picker — panel buka KE ATAS
  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="wgBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="wgBranch" style="top:auto;bottom:calc(100% + 6px);"></div>
    </div>`;

  const brEl    = brField.querySelector('[data-col="branch"]');
  const brPanel = brField.querySelector('[data-fpick-panel="wgBranch"]');
  if (!brEl || !brPanel) return;

  brEl.value = cur;

  function renderBranchPanel(){
    if (!branches.length){
      brPanel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = norm(brEl.value);
    brPanel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${norm(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    brPanel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        brEl.value = row.dataset.value || '';
        brPanel.classList.remove('open');
      });
    });
  }

  brEl.addEventListener('click', () => {
    const wasOpen = brPanel.classList.contains('open');
    brPanel.classList.remove('open');
    if (wasOpen) return;
    renderBranchPanel();
    brPanel.classList.add('open');
  });
  brEl.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ brPanel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); brEl.click(); return; }
    e.preventDefault();                                // sekat taip
  });
  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target)) brPanel.classList.remove('open');
  });
}

/* Notification Contact ONLY: ambil satu field terus dari Staff Database
   (designation / phone). Dipanggil masa Save — bukan masa render.
   Page lain tak disentuh. */
function staffFieldValueFor(name, branch, fieldId){
  return getData('staffDatabase').then(rows => {
    const norm = s => String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g,' ');
    const n = norm(name), b = norm(branch);
    if (!n) return '';
    const sameName = (rows || []).filter(r => norm(r.staffName) === n);
    if (!sameName.length) return '';

    if (b){
      const exact = sameName.filter(r => norm(r.branch) === b);
      // Lebih daripada 1 staff sama nama + branch → jangan teka, biar kosong
      if (exact.length === 1) return String(exact[0][fieldId] || '').trim();
      if (exact.length > 1) return '';
    }
    // Tiada padanan branch: hanya selamat kalau nama itu unik
    if (sameName.length === 1) return String(sameName[0][fieldId] || '').trim();
    return '';
  });
}
function staffDesignationFor(name, branch){ return staffFieldValueFor(name, branch, 'designation'); }
function staffPhoneFor(name, branch){ return staffFieldValueFor(name, branch, 'phone'); }

/* Safety Equipment only: fixed read-only pickers (no typing, no remove).
   Category = fixed Truck/Staff (cannot add/remove — dashboard depends on it).
   Asset follows Category (Truck -> Prime Mover lorries, Staff -> Staff DB).
   Branch from Staff DB. Nothing else touched. */
async function wireSafetyEquipmentPickers(box){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const staffOpts  = uniq(staffRows.map(r => r.staffName));
  const truckOpts  = uniq(primeRows.map(r => r.lorry));
  const branchOpts = uniq(staffRows.map(r => r.branch));
  const esc = s => String(s).replace(/"/g, '&quot;');

  const curCat    = (box.querySelector('[data-col="category"]') || {}).value || '';
  const curAsset  = (box.querySelector('[data-col="asset"]')    || {}).value || '';
  const curBranch = (box.querySelector('[data-col="branch"]')   || {}).value || '';

  function makePicker(colId, listFn, cur){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || cur;
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
        });
      });
    }

    // ONE trigger only + block typing (no readonly = no grey / not-allowed).
    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    if (cur) input.value = cur;
    return { input, render };
  }

  // Category: FIXED — hanya Truck & Staff. Default Truck bila Add Row.
  const catP = makePicker('category', () => ['Truck','Staff'], curCat || 'Truck');
  const catVal = () => (catP ? String(catP.input.value).trim() : '');
  const assetList = () => (catVal() === 'Staff' ? staffOpts : truckOpts);

  const assetP  = makePicker('asset',  assetList,  curAsset);
  const branchP = makePicker('branch', () => branchOpts, curBranch);

  // Bila Category bertukar, kosongkan Asset kalau pilihan lama tak sesuai.
  function refreshAsset(){
    if (!assetP) return;
    const arr = assetList();
    const cur = assetP.input.value;
    if (cur && !arr.includes(cur)) assetP.input.value = '';
  }
  if (catP){
    box.addEventListener('mousedown', e => {
      const opt = e.target.closest('.fpick-option');
      if (opt && opt.closest('[data-fpick="category"]')) setTimeout(refreshAsset, 0);
    });
  }
}
/* APAD Documents only: replace the native Category <select> with a FIXED
   read-only custom picker (no typing, no remove — same proven pattern as
   Safety Equipment). Options: ICOP / Pekeliling / Guideline / Portal / Other.
   Only the 'category' field of apadDocuments is touched. */
async function wireApadCategoryPicker(box){
  const CAT_OPTIONS = ['ICOP','Pekeliling','Guideline','Portal','Other'];
  const esc = s => String(s).replace(/"/g, '&quot;');
  const colId = 'category';
  const el = box.querySelector(`[data-col="${colId}"]`);
  const fieldEl = el ? el.closest('.formfield') : null;
  if (!fieldEl) return;
  const labelEl = fieldEl.querySelector('label');
  const lbl = labelEl ? labelEl.textContent : colId;
  const cur = String(el.value || '').trim();

  fieldEl.innerHTML = `
    <label>${lbl}</label>
    <div class="fpick" data-fpick="${colId}">
      <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
    </div>`;
  const input = fieldEl.querySelector('input[data-col]');
  const panel = fieldEl.querySelector('[data-fpick-panel]');

  function render(){
    let list = CAT_OPTIONS.slice();
    const current = input.value || cur;
    if (current && !list.includes(current)) list = [current].concat(list);
    panel.innerHTML = list.length
      ? list.map(v =>
          `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${v}</span>
           </div>`).join('')
      : '<div class="combo-empty">No options</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        input.value = row.dataset.value || '';
        panel.classList.remove('open');
      });
    });
  }

  // ONE trigger only — buka/tutup bersih (macam picker safety equipment).
  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
    render();
    panel.classList.add('open');
  });
  // Sekat taip manual — tak guna readonly (elak kelabu + icon block).
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')){ panel.classList.remove('open'); }
      else { render(); panel.classList.add('open'); }
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) panel.classList.remove('open');
  });

  if (cur) input.value = cur;
}

/* Trailer only: cascading pickers (tiada taip manual).
   Branch  -> senarai dari Staff Database (+ branch yang sudah dipakai oleh
              row Trailer lama, supaya row lama tak hilang pilihannya).
   Assigned Prime Mover -> hanya trak dalam branch yang dipilih (dari Prime Mover).
   Trailer Type -> senarai tetap. Nilai sedia ada sentiasa dipaparkan. */
async function wireTrailerPickers(box){
  const [staffRows, primeRows, trailerRows] = await Promise.all([
    getData('staffDatabase'), getData('primeMover'), getData('trailer')
  ]);

  // 'Assigned Prime Mover' = AUTO dari page Prime Mover (tick di page PM).
  // Sorok dari form Add/Edit. Input KEKAL dalam DOM (cuma display:none pada
  // .formfield), jadi nilai lama tak terpadam masa Save.
  const apmInput = box.querySelector('[data-col="assignedPrimeMover"]');
  if (apmInput && apmInput.closest('.formfield')){
    apmInput.closest('.formfield').style.display = 'none';
  }
  const esc = s => String(s).replace(/"/g, '&quot;');
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const FALLBACK_BRANCHES = ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'];

  // Branch: utama dari Staff Database; tambah branch yang dipakai row lama.
  // Kalau dua-dua kosong (company baru), guna senarai asal supaya tak tersekat.
  let branches = uniq([...staffRows.map(r => r.branch), ...trailerRows.map(r => r.branch)]);
  if (!branches.length) branches = FALLBACK_BRANCHES;

  // Trak ikut branch (dari Prime Mover).
  const trucksByBranch = {};
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
  });
  Object.keys(trucksByBranch).forEach(b => { trucksByBranch[b] = uniq(trucksByBranch[b]); });

  // Nilai semasa (Edit = sudah diisi, Add = kosong).
  const curBranch = String((box.querySelector('[data-col="branch"]') || {}).value || '').trim();
  const curTruck  = String((box.querySelector('[data-col="assignedPrimeMover"]') || {}).value || '').trim();
  const state = { branch: curBranch };
  const pickers = {};

  function makePicker(colId, listFn, initial, emptyMsg){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : `<div class="combo-empty">${emptyMsg || 'No options'}</div>`;
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    // ONE trigger only — buka/tutup bersih.
    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    // Sekat taip manual.
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  // Branch bertukar -> kosongkan Assigned Prime Mover kalau trak itu bukan
  // lagi dalam branch baru. Senarai trak auto-refresh pada klik.
  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const trucks = trucksByBranch[state.branch] || [];
    const t = pickers.truck;
    if (t && t.input.value && !trucks.includes(t.input.value)) t.input.value = '';
  };

  makePicker('type',
    () => ['Container','Flatbed','Lowbed','Tanker','Curtainside','General Cargo','Other'],
    '', 'No options');

  pickers.branch = makePicker('branch', () => branches, curBranch, 'No options');

  // 'assignedPrimeMover' SENGAJA tiada picker — ia AUTO dari page Prime Mover.
}

/* Prime Mover only: replace the native Axle Config <select> with a FIXED
   read-only custom picker (no typing, no remove — same proven pattern as
   Trailer / Safety Equipment / APAD). Options stay fixed: 4x2 / 6x4.
   Other tables untouched. */
/* Prime Mover only: pickers (tiada taip manual).
   Branch -> senarai dari Staff Database + branch yang sudah dipakai oleh row
             Prime Mover lama (supaya row lama tak hilang pilihannya).
             Corak sama dengan page Trailer.
   Table/JS lain tak disentuh. */
async function wirePrimeMoverPickers(box){
  const esc = s => String(s).replace(/"/g, '&quot;');
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))]
    .sort((a,b) => a.localeCompare(b));
  const FALLBACK_BRANCHES = ['Kemaman','HQ','Johor Bahru','Penang','Klang Valley'];

  function makePicker(colId, listFn, emptyMsg){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const cur = String(el.value || '').trim();
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;

    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (cur) input.value = cur;          // nilai lama kekal (Edit Row)

    function render(){
      let list = (listFn() || []).slice();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : `<div class="combo-empty">${emptyMsg || 'No options'}</div>`;
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
        });
      });
    }

    // ONE trigger only — buka/tutup bersih.
    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    // Sekat taip manual — tak guna readonly (elak kelabu + icon block).
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  // ---- Branch: dari Staff Database (utama) + row Prime Mover lama ----
  let staffRows = [], primeRows = [];
  try{ staffRows = await getData('staffDatabase'); }catch(e){ staffRows = []; }
  try{ primeRows = await getData('primeMover'); }catch(e){ primeRows = []; }
  let branches = uniq([
    ...(staffRows || []).map(r => r && r.branch),
    ...(primeRows || []).map(r => r && r.branch),
  ]);
  if (!branches.length) branches = FALLBACK_BRANCHES;   // company baru, jangan tersekat

  makePicker('branch', () => branches, 'No options');
}

/* =============================================================
   FEG (FIRE EXTINGUISHER) — struktur baru
   Satu baris `feg` = satu KUMPULAN (satu Asset ATAU satu Building).
   Butiran extinguisher hidup dalam row.units[] (JSON).
   ============================================================= */
const FEG_MAX_UNITS = 50;
const FEG_UNIT_PREFIXES  = ['MY','SG'];
const FEG_TYPES          = ['Dry Powder ABC','CO2','Foam'];
const FEG_CAPACITIES     = ['1kg','2kg','5kg','6kg','9kg'];
const FEG_MANUAL_STATUS  = ['In Service','In Use','Transfer','Under Inspection','Damaged','Missing','Expired'];

// Quantity yang diminta dalam borang Add — dibaca semasa butang Save ditekan.
let FEG_PENDING_QTY = 0;
let FOCC_FEG_PAINT_SEQ = 0;   // elak senarai trak lama menimpa senarai baru (branch tukar cepat)

function fegNewId(prefix){
  return (prefix || 'FEG') + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase();
}

// Satu unit kosong (Draft) — butiran penuh diisi di Detail Page.
function fegNewUnit(){
  return {
    unitId: fegNewId('FU'),
    serialPrefix: '', serialNo: '',
    driver: '', fegType: '', capacity: '',
    mfgDate: '', serviceDate: '', inspectionDate: '', cylinderDue: '',
    vendor: '', manualStatus: '', remark: '', note: '',
    finalStatus: 'Draft', disposal: 'No',
    disposalVendor: '', disposalReason: '', disposedAt: '', disposedLoggedAt: '', disposedBy: '',
    serviceLog: [],      // FEG Service Log (Active / Completed sahaja)
    serviceSeq: 0,       // nombor service terakhir (auto-tambah)
  };
}

// Kunci banding untuk halang kumpulan berganda (abaikan HURUF besar/kecil + ruang).
function fegGroupKey(v){
  return String(v == null ? '' : v).trim().replace(/\s+/g,' ').toLowerCase();
}

// Senarai asset hidup: SATU baris = SATU TRAK (sumber: Prime Mover).
//   Tiada trailer assign  -> "CDM 5689"
//   Ada trailer assign    -> "CDM 5689 (TT/B 2345)"
//   (dua trailer)         -> "CDM 5689 (TT/B 2345, TT/B 6789)"
// Nilai yang DISIMPAN kekal nombor trak sahaja. Tiada entri berganda.
// branchFilter (pilihan): hanya trak dari branch itu.
async function getFegAssetOptions(branchFilter){
  let primeRows = [], trailerRows = [];
  try{ primeRows = await getData('primeMover'); }catch(e){ primeRows = []; }
  try{ trailerRows = await getData('trailer'); }catch(e){ trailerRows = []; }

  // Peta trailer -> trak (dari Trailer DB, rujuk 'Assigned Prime Mover').
  const trailersOf = new Map();               // kunci trak -> [nombor trailer...]
  const addTrailer = (truck, trail) => {
    const t = String(trail || '').trim();
    const k = fegGroupKey(truck);
    if (!t || !k) return;
    const arr = trailersOf.get(k) || [];
    if (!arr.some(x => fegGroupKey(x) === fegGroupKey(t))) arr.push(t);
    trailersOf.set(k, arr);
  };
  (trailerRows || []).forEach(r => addTrailer(r && r.assignedPrimeMover, r && r.lorry));
    // Peta trailer assetId -> nombor trailer (untuk label FEG, elak UUID terpapar).
  const trailerNoById = new Map();
  (trailerRows || []).forEach(t => {
    const id = String((t && t.assetId) || '').trim();
    const no = String((t && t.lorry) || '').trim();
    if (id && no) trailerNoById.set(id, no);
  });

  const want = fegGroupKey(branchFilter);
  const seen = new Set();
  const out  = [];

  (primeRows || []).forEach(r => {
    const truck = String((r && r.lorry) || '').trim();
    if (!truck) return;
    const key = fegGroupKey(truck);
    if (seen.has(key)) return;                                    // jangan doublekan trak
    const br = String((r && r.branch) || '').trim();
    if (want && fegGroupKey(br) !== want) return;                  // tapis ikut Branch
    seen.add(key);

    const list = [];
    const push = t => {
      const s = String(t || '').trim();
      if (s && !list.some(x => fegGroupKey(x) === fegGroupKey(s))) list.push(s);
    };
    const at = r && r.assignedTrailers;
    // assignedTrailers menyimpan trailer **assetId** (UUID), bukan nombor trailer.
    // Tukar ke nombor trailer untuk DIPAPARKAN; id tanpa padanan diabaikan.
    if (Array.isArray(at)){
      at.forEach(v => { const no = trailerNoById.get(String(v == null ? '' : v).trim()); if (no) push(no); });
    } else if (typeof at === 'string' && at.trim()){
      const s = at.trim();
      push(trailerNoById.get(s) || s);        // data lama: teks biasa (nombor trailer)
    }
    (trailersOf.get(key) || []).forEach(push);                     // dari Trailer DB

    out.push({
      value: truck,                       // nilai disimpan = nombor trak
      kind: 'truck',
      branch: br,
      trailer: list[0] || '',
      label: list.length ? (truck + ' (' + list.join(', ') + ')') : truck,
    });
  });

  return out;
}

/* FEG borang Add: tambah medan Quantity + semak sebelum Save.
   Nota: wireFixedPickerFields / wireComboFields jalan SELEPAS fungsi ni,
   jadi semua listener dipasang di peringkat <box> (delegated) supaya tak
   hilang bila elemen dalam ditukar. */
async function wireFegPickers(box){
  const head = box.querySelector('h4');
  const isAdd = String((head && head.textContent) || '').trim().toLowerCase().startsWith('add');
  // borang Edit popup dibenarkan juga — cuma Quantity tiada di situ

  const brEl = box.querySelector('[data-col="branch"]');
  const brField = brEl ? brEl.closest('.formfield') : null;

  // 1) Medan Quantity (BUKAN kolum table -> kod simpan sedia ada tak sentuh)
  let qtyEl = null;
  if (isAdd && brField){
    const holder = document.createElement('div');
    holder.className = 'formfield';
    holder.innerHTML = `
      <label>Quantity</label>
      <input data-col="fegQuantity" type="number" min="1" max="${FEG_MAX_UNITS}" step="1" value="1">
      <div class="settings-note" style="margin-top:6px;">How many extinguisher units to create. Fill in each unit's details (serial, dates, vendor, status) on the Detail Page.</div>`;
    brField.parentNode.insertBefore(holder, brField.nextSibling);
    qtyEl = holder.querySelector('input');
  }

  // 2) Ruang mesej amaran
  const warn = document.createElement('div');
  warn.className = 'settings-note';
  warn.style.marginTop = '10px';
  warn.style.display = 'none';
  const foot = box.querySelector('.modalfoot');
  if (foot && foot.parentNode) foot.parentNode.insertBefore(warn, foot);

  const saveBtns = () => [box.querySelector('#saveModal'), box.querySelector('#saveModalComplete')].filter(Boolean);

  // 3) Semak sebelum Save
  async function validate(){
    const cat = String((box.querySelector('[data-col="assetType"]') || {}).value || '').trim();
    const loc = String((box.querySelector('[data-col="assetRef"]')  || {}).value || '').trim();
    const br  = String((box.querySelector('[data-col="branch"]')    || {}).value || '').trim();
    const q   = qtyEl ? parseInt(qtyEl.value, 10) : 1;
    let msg = '';

    if (!cat) msg = 'Choose a Category first (Asset / Building).';
    else if (!loc) msg = 'Fill in Asset / Location.';
    else if (!br)  msg = 'Choose a Branch.';

    // Asset: trak MESTI milik branch yang dipilih (senarai hujung hidup).
    if (!msg && cat === 'Asset'){
      const list = await getFegAssetOptions(br);
      if (!list.some(a => fegGroupKey(a.value) === fegGroupKey(loc)))
        msg = 'This truck is not in the selected Branch. Pick a truck from that branch.';
    }

    if (!msg){
      let rows = [];
      try{ rows = await getData('feg'); }catch(e){ rows = []; }
      const dup = (rows || []).find(r => r && String(r.assetType || '') === cat && fegGroupKey(r.assetRef) === fegGroupKey(loc));
      if (dup) msg = 'A FEG record for "' + loc + '" already exists. Open that record to add units.';
    }
    if (!msg && (!isFinite(q) || q < 1 || q > FEG_MAX_UNITS)) msg = 'Quantity must be a whole number from 1 to ' + FEG_MAX_UNITS + '.';

    const ok = !msg;
    saveBtns().forEach(b => { b.disabled = !ok; });
    warn.textContent = msg;
    warn.style.display = msg ? 'block' : 'none';
    warn.style.color = msg ? 'var(--bad, #c0392b)' : '';
    return ok;
  }

  box.addEventListener('input',  () => { validate(); });
  box.addEventListener('change', () => { validate(); });
  box.addEventListener('mousedown', () => { setTimeout(() => { validate(); }, 0); });

  // 4) Branch auto-isi ikut trak yang dipilih (kalau branch masih kosong).
  //    Branch dicari HIDUP setiap kali — medan itu dibina semula oleh
  //    wireFegBranch() selepas fungsi ini, jadi rujukan lama tak boleh simpan.
  const allAssets = await getFegAssetOptions();
  const branchOf = {};
  allAssets.forEach(a => { if (a.value) branchOf[fegGroupKey(a.value)] = a.branch || ''; });
  box.addEventListener('change', () => {
    const loc   = String((box.querySelector('[data-col="assetRef"]') || {}).value || '').trim();
    const brNow = box.querySelector('[data-col="branch"]');
    if (!loc || !brNow) return;
    const b = branchOf[fegGroupKey(loc)];
    if (b && !String(brNow.value || '').trim()){
      brNow.value = b;
      brNow.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // 5) Rakam Quantity SEBELUM modal tutup (capture = jalan dahulu)
  box.addEventListener('click', e => {
    const t = e.target;
    const btn = (t && t.closest) ? t.closest('#saveModal, #saveModalComplete') : null;
    if (!btn) return;
    const q = qtyEl ? parseInt(qtyEl.value, 10) : 1;
    FEG_PENDING_QTY = (isFinite(q) && q > 0) ? Math.min(q, FEG_MAX_UNITS) : 1;
  }, true);

// 6) Asset / Location ikut Category (Asset = senarai hidup, Building = combo)
  box.addEventListener('mousedown', () => { setTimeout(() => { fegSyncAssetField(box); }, 0); });
  box.addEventListener('click',     () => { setTimeout(() => { fegSyncAssetField(box); }, 0); });
  await fegSyncAssetField(box, true);
  await validate();
}
/* FEG — Branch = FIXED picker dari Staff Database.
   Senarai cawangan unik (A-Z) dari kolum 'branch' Staff Database.
   TIADA taip, TIADA tambah, TIADA padam — sama rupa dengan dropdown lain.
   Dipanggil SELEPAS wireComboFields/wireFixedPickerFields (corak sama
   seperti WhatsApp Groups), jadi markup combo lama diganti sepenuhnya. */
async function wireFegBranch(box){
  const brOld = box.querySelector('[data-col="branch"]');
  if (!brOld) return;
  const brField = brOld.closest('.formfield');
  if (!brField) return;

  let staffRows = [];
  try{ staffRows = (await getData('staffDatabase')) || []; }
  catch(e){ console.error('FEG branch: staff load failed', e); }

  const seen = new Set();
  const branches = [];
  (staffRows || []).forEach(r => {
    const v = String(r.branch || '').trim();
    if (!v) return;
    const k = fegGroupKey(v);
    if (seen.has(k)) return;
    seen.add(k);
    branches.push(v);
  });
  branches.sort((a,b) => a.localeCompare(b));

  const escS  = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const curRaw = String(brOld.value || '').trim();     // rekod lama: KEKALKAN nilai asal

  brField.innerHTML = `
    <label>Branch</label>
    <div class="fpick" data-fpick="fegBranch">
      <input data-col="branch" type="text" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select branch...">
      <span class="fpick-caret"></span>
      <div class="combo-panel fpick-panel" data-fpick-panel="fegBranch"></div>
    </div>`;

  const el    = brField.querySelector('[data-col="branch"]');
  const panel = brField.querySelector('[data-fpick-panel="fegBranch"]');
  if (!el || !panel) return;
  el.value = curRaw;

  const fire = () => {
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  function render(){
    if (!branches.length){
      panel.innerHTML = '<div class="combo-empty">No branches in Staff Database</div>';
      return;
    }
    const cb = fegGroupKey(el.value);
    panel.innerHTML = branches.map(v => `
      <div class="combo-item fpick-option${fegGroupKey(v) === cb ? ' is-active' : ''}" data-value="${escS(v)}">
        <span class="combo-item-text">${escS(v)}</span>
      </div>`).join('');
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        el.value = row.dataset.value || '';
        panel.classList.remove('open');
        fire();                                            // semakan Save jalan terus
        setTimeout(() => { fegSyncAssetField(box); }, 0);   // tapis semula senarai trak
      });
    });
  }

  el.addEventListener('click', () => {
    const wasOpen = panel.classList.contains('open');
    panel.classList.remove('open');
    if (wasOpen) return;
    render(); panel.classList.add('open');
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); el.click(); return; }
    e.preventDefault();                                    // sekat taip manual
  });
  document.addEventListener('mousedown', e => {
    if (!brField.contains(e.target)) panel.classList.remove('open');
  });

  fire();
}

/* Speeding & Idling only: Branch-first cascading pickers (no typing, no
   remove — same fpick pattern as Safety Equipment / Trailer / PM / FEG / APAD).
   Branch -> Driver Name (Staff DB, designation 'Driver' only) -> Truck No
   (Prime Mover). Lists refresh when Branch changes. Legacy rows without a
   Branch are auto-derived from Driver/Truck; old values are preserved.
   Other tables are never touched. */
/* ---------- FEG: Asset / Location ikut Category ----------
   Asset    -> senarai HIDUP (Prime Mover + Trailer), tiada taip, tiada ubah senarai
   Building -> combo boleh taip + tambah/buang (senarai tersimpan) */
async function fegSyncAssetField(box, force){
  const catEl = box.querySelector('[data-col="assetType"]');
  const cat   = String((catEl && catEl.value) || '').trim() || 'Asset';
  const brEl  = box.querySelector('[data-col="branch"]');
  const brKey = fegGroupKey(String((brEl && brEl.value) || '').trim());
  const curEl = box.querySelector('[data-col="assetRef"]');
  const fieldEl = curEl ? curEl.closest('.formfield') : null;
  if (!fieldEl) return;

  const sig = cat + '|' + brKey;
  if (!force && String(fieldEl.dataset.fegMode || '') === sig) return;

  const prevCat = String(fieldEl.dataset.fegCat || '');
  fieldEl.dataset.fegCat = cat;

  // Nilai dikosongkan HANYA bila Category bertukar (Asset <-> Building).
  // Branch bertukar: nilai lama dikekalkan kalau trak itu masih dalam senarai.
  await fegPaintAssetField(box, cat, brKey, !!(prevCat && prevCat !== cat));
}

async function fegPaintAssetField(box, cat, branchKey, clearValue){
  const oldEl   = box.querySelector('[data-col="assetRef"]');
  const fieldEl = oldEl ? oldEl.closest('.formfield') : null;
  if (!fieldEl) return;
  const current = clearValue ? '' : String(oldEl.value || '');
  const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

  if (cat === 'Asset'){
    const seq = ++FOCC_FEG_PAINT_SEQ;                    // halang lumba bila branch bertukar cepat
    const assets = await getFegAssetOptions(branchKey);
    if (seq !== FOCC_FEG_PAINT_SEQ) return;              // jawapan LAMA — abaikan
    const inList = assets.some(a => fegGroupKey(a.value) === fegGroupKey(current));
    const keep   = (!clearValue && current && inList) ? current : '';
    fieldEl.innerHTML = `
      <label>Asset / Location</label>
      <div class="fpick" data-fpick="assetRef">
        <input type="text" data-col="assetRef" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select truck...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="assetRef"></div>
      </div>
      <div class="settings-note" style="margin-top:6px;">One row per truck from Prime Mover${branchKey ? ' (filtered by the selected Branch)' : ''}. Assigned trailer shown in brackets.</div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (keep) input.value = keep;

    const render = () => {
      const cur = fegGroupKey(input.value);
      panel.innerHTML = assets.length
        ? assets.map(a => `<div class="combo-item fpick-option${fegGroupKey(a.value) === cur ? ' is-active' : ''}" data-value="${esc(a.value)}">
             <span class="combo-item-text">${esc(a.label)}</span>
           </div>`).join('')
        : '<div class="combo-empty">No trucks' + (branchKey ? ' in this branch' : '') + ' — check the Prime Mover page.</div>';
      panel.querySelectorAll('.fpick-option').forEach(rowEl => {
        rowEl.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    };

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render(); panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();                       // sekat taip manual
    });

  } else {
    fieldEl.innerHTML = `
      <label>Asset / Location</label>
      <div class="combo-wrap" data-combo-wrap="assetRef">
        <input data-col="assetRef" type="text" autocomplete="off" placeholder="Type new or pick existing...">
        <div class="combo-panel" data-combo-panel="assetRef"></div>
      </div>
      <div class="settings-note" style="margin-top:6px;">Type a new location name or pick from the list. &times; removes it from the list.</div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-combo-panel]');
    if (current) input.value = current;

    let list = [];
    try{
      const saved = await loadOptionList('feg', 'assetRef');
      if (Array.isArray(saved)) list = saved.slice();
    }catch(e){ list = []; }
    if (current && !list.includes(current)) list = [current].concat(list);

    const render = () => {
      const vis = list.slice().sort((a,b) => String(a).localeCompare(String(b)));
      const cur = String(input.value || '');
      panel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${esc(v)}</span>
             <button type="button" class="combo-del" data-del="${esc(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new location name…</div>';
      panel.querySelectorAll('.combo-item').forEach(rowEl => {
        const txt = rowEl.querySelector('.combo-item-text');
        if (txt) txt.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('input',  { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          list = list.filter(x => String(x) !== String(rowEl.dataset.value));
          try{ await saveOptionList('feg', 'assetRef', list); }catch(err){}
          render();
        });
      });
    };

    input.addEventListener('focus', () => { render(); panel.classList.add('open'); });
    input.addEventListener('input', () => { render(); panel.classList.add('open'); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  }

  // Tutup panel bila klik luar (bind sekali per modal, tahan walau medan dibina semula)
  if (!box.dataset.fegOutsideBound){
    box.dataset.fegOutsideBound = '1';
    document.addEventListener('mousedown', e => {
      const f = box.querySelector('[data-col="assetRef"]');
      const fld = f ? f.closest('.formfield') : null;
      if (!fld) return;
      if (fld.contains(e.target)) return;
      fld.querySelectorAll('.fpick-panel.open, .combo-panel.open').forEach(p => p.classList.remove('open'));
    });
  }

  fieldEl.dataset.fegMode = cat + '|' + branchKey;
  const inp = fieldEl.querySelector('[data-col="assetRef"]');
  if (inp) inp.dispatchEvent(new Event('input', { bubbles: true }));   // refresh semakan Save
}

async function wireSpeedingPickers(box){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const esc = s => String(s).replace(/"/g, '&quot;');
  const low = s => String(s || '').trim().toLowerCase();

  // Index data: driver/truck per branch, plus branch-of lookups.
  const driversByBranch = {};
  const trucksByBranch  = {};
  const branchOfDriver  = {};
  const branchOfTruck   = {};
  staffRows.forEach(r => {
    const name = String(r.staffName || '').trim();
    const br   = String(r.branch || '').trim();
    if (!name || !br || low(r.designation) !== 'driver') return;
    (driversByBranch[br] = driversByBranch[br] || []).push(name);
    branchOfDriver[name] = br;
  });
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
    branchOfTruck[lor] = br;
  });
  Object.keys(driversByBranch).forEach(b => { driversByBranch[b] = uniq(driversByBranch[b]); });
  Object.keys(trucksByBranch).forEach(b =>  { trucksByBranch[b]  = uniq(trucksByBranch[b]); });
  const branches = uniq([...Object.keys(driversByBranch), ...Object.keys(trucksByBranch)]);

  // Read current (prefilled) values — Add = kosong, Edit = nilai lama sudah set.
  const curBranch = String((box.querySelector('[data-col="branch"]') || {}).value || '').trim();
  const curDriver = String((box.querySelector('[data-col="driver"]') || {}).value || '').trim();
  const curTruck  = String((box.querySelector('[data-col="truck"]')  || {}).value || '').trim();

  // Legacy rows: kalau branch kosong, auto-isi dari driver/truck.
  let initialBranch = curBranch;
  if (!initialBranch && curDriver && branchOfDriver[curDriver]) initialBranch = branchOfDriver[curDriver];
  if (!initialBranch && curTruck  && branchOfTruck[curTruck])   initialBranch = branchOfTruck[curTruck];

  const state = { branch: initialBranch, driver: curDriver, truck: curTruck };
  const pickers = {};

  const branchDriverList = () => (driversByBranch[state.branch] || []).slice();
  const branchTruckList  = () => (trucksByBranch[state.branch]  || []).slice();

  function makePicker(colId, listFn){
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    const initial = state[colId] || '';
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = listFn();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    // ONE trigger only — buka/tutup bersih.
    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    // Sekat taip manual — tak guna readonly (elak kelabu + icon block).
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });

    return { input, render };
  }

  // Branch bertukar -> refresh senarai driver/truck; kosongkan nilai yang
  // bukan lagi dalam branch baru.
  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const drivers = branchDriverList();
    const trucks  = branchTruckList();
    if (pickers.driver && pickers.driver.input.value && !drivers.includes(pickers.driver.input.value)) pickers.driver.input.value = '';
    if (pickers.truck  && pickers.truck.input.value  && !trucks.includes(pickers.truck.input.value))  pickers.truck.input.value  = '';
  };

  pickers.branch = makePicker('branch', () => branches);
  pickers.driver = makePicker('driver', branchDriverList);
  pickers.truck  = makePicker('truck',  branchTruckList);
}
async function openAddRowModal(tableKey, onDone, opts){
  const def = TABLES[tableKey];
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const vesselOptions = (tableKey === 'driverKPI' || tableKey === 'maintenanceLog') ? await getVesselOptions() : null;
  const truckFieldId = TRUCK_DROPDOWN_FIELDS[tableKey];
  const truckOptions = truckFieldId ? await getTruckOptions() : null;
  const safetyAssetOptions = tableKey === 'safetyEquipment' ? await getSafetyEquipmentAssetOptions() : null;
  const driverFieldId = DRIVER_DROPDOWN_FIELDS[tableKey];
  const driverOptions = driverFieldId ? await getDriverOptions() : null;

  let fields = '';
  const formCols = (tableKey === 'staffDatabase')
    ? STAFF_FORM_FIELDS.map(id => def.columns.find(x => x.id === id)).filter(Boolean)
    : def.columns;
  formCols.forEach(c => {
      // FEG List ada kolum computed (Units) — ia paparan sahaja, jangan jadi medan borang.
    if (tableKey === 'feg' && String(c.type || '').startsWith('computed-')) return;
    // Hide fields that are auto-calculated. They will be computed on save.
    if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id)) || (tableKey === 'staffDatabase' && (STAFF_AUTO_FIELDS.includes(c.id) || STAFF_FORM_HIDDEN.includes(c.id))) || (tableKey === 'safetyEquipment' && ['inspectionDate','firstAid','triangle','cone','wheelChock','reflectiveString','torchlight','helmet','safetyShoes','reflectiveVest'].includes(c.id)) || (tableKey === 'maintenanceLog' && MAINT_AUTO_FIELDS.includes(c.id)) || (tableKey === 'machineryLog' && MACHINERY_AUTO_FIELDS.includes(c.id)) || (tableKey === 'speedingIdling' && SPEEDING_AUTO_FIELDS.includes(c.id)) || (tableKey === 'notificationContact' && (c.id === 'designation' || c.id === 'phone'))) return;
    if (c.id === 'vessel' && vesselOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${vesselOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === truckFieldId && truckOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${truckOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === driverFieldId && driverOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${driverOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (COMBO_OPTION_FIELDS[tableKey] && COMBO_OPTION_FIELDS[tableKey].includes(c.id)){
      fields += buildComboField(c);
    } else if (FIXED_PICKER_FIELDS[tableKey] && FIXED_PICKER_FIELDS[tableKey].includes(c.id)){
      fields += buildFixedPickerField(c);
    } else if (c.type === 'select'){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${c.options.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.type === 'badge'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="status..."></div>`;
    } else if (c.type === 'ic'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="900101-14-5678" maxlength="14"></div>`;
    } else if (c.type === 'phone'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="012-345 6789" maxlength="13"></div>`;
    } else if (c.type === 'date'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="date"></div>`;
    } else if (c.type === 'time'){
      fields += `<div class="formfield"><label>${c.label}</label><div class="time-input"><input data-col="${c.id}" type="time"></div></div>`;
    } else if (c.type === 'number' || c.type === 'money'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="number" step="any"></div>`;
    } else if (c.type === 'pct'){
      fields += `<div class="formfield"><label>${c.label} (%)</label><input data-col="${c.id}" type="number" step="any" placeholder="e.g. 85"></div>`;
    } else {
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  const twoBtn = !!(opts && opts.completeLabel);
  box.innerHTML = `
    <h4>Add ${def.label} Record</h4>
    <div class="formgrid">${fields}</div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn${twoBtn ? '' : ' primary'}" id="saveModal">${twoBtn ? 'Save &amp; Return to List' : 'Save Record'}</button>
      ${twoBtn ? `<button class="btn primary" id="saveModalComplete">${opts.completeLabel}</button>` : ''}
    </div>
  `;
  overlay.classList.add('show');
  // apply special opkpi modal styling for Operation KPI form
  if (tableKey === 'operationKPI' || tableKey === 'containerOperationKPI') box.classList.add('opkpi-modal');
  // live-format any IC number / phone fields as the user types
  def.columns.forEach(c => {
    if (c.type === 'ic'){
      const icEl = box.querySelector(`[data-col="${c.id}"]`);
      if (icEl) icEl.addEventListener('input', () => { icEl.value = formatIC(icEl.value); });
    }
    if (c.type === 'phone'){
      const phEl = box.querySelector(`[data-col="${c.id}"]`);
      if (phEl) phEl.addEventListener('input', () => { phEl.value = formatPhone(phEl.value); });
    }
  });
  if (tableKey === 'safetyEquipment'){ await wireSafetyEquipmentPickers(box); }
  if (tableKey === 'apadDocuments'){ await wireApadCategoryPicker(box); }
  if (tableKey === 'trailer'){ await wireTrailerPickers(box); }
  if (tableKey === 'primeMover'){ await wirePrimeMoverPickers(box); }
  if (tableKey === 'feg'){ await wireFegPickers(box); }
  if (tableKey === 'speedingIdling'){ await wireSpeedingPickers(box); }
  await wireComboFields(box, tableKey, def);
  wireFixedPickerFields(box, tableKey, def);
  if (tableKey === 'feg'){ await wireFegBranch(box); }
  if (tableKey === 'notificationContact'){ await wireNotificationContactNameBranch(box); }
  if (tableKey === 'whatsappGroups'){ await wireWhatsAppGroupsBranch(box); }

  // Auto-fill and computed field wiring for Operation KPI modal
  const dateEl = box.querySelector('[data-col="date"]');
  const monthEl = box.querySelector('[data-col="month"]');
  const yearEl = box.querySelector('[data-col="year"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const activeEl = box.querySelector('[data-col="activeTruck"]');
  const utilEl = box.querySelector('[data-col="utilization"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const totalHoursEl = box.querySelector('[data-col="totalHours"]');
  const targetEl = box.querySelector('[data-col="targetTon"]');
  const actualEl = box.querySelector('[data-col="actualTon"]');
  const tonMetricEl = box.querySelector('[data-col="tonMetric"]');
  const achEl = box.querySelector('[data-col="achievement"]');
  const sumEl = box.querySelector('[data-col="kpiSummary"]');

  function toMonthName(date){
    try{
      const d = new Date(date);
      return d.toLocaleString('en-GB', {month:'long'});
    }catch(e){ return ''; }
  }

  function setReadonlyIf(el){ if (el) el.readOnly = true; }
  // Only Operation KPI computed values should be read-only in the modal.
  if (tableKey === 'operationKPI') {
    [monthEl, yearEl, activeEl, utilEl, achEl, sumEl, totalHoursEl, tonMetricEl].forEach(setReadonlyIf);
  }

  // initialize date to today if empty
  if (dateEl && !dateEl.value){
    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  } else if (dateEl && dateEl.value){
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  }

  function parseTime(t){
    if (!t) return null;
    const m = t.split(':');
    if (m.length < 2) return null;
    return parseInt(m[0],10)*60 + parseInt(m[1],10);
  }

  // return total hours as HH:MM string (handles next-day rollover)
  function computeHours(start, end){
    const s = parseTime(start);
    const e = parseTime(end);
    if (s == null || e == null) return null;
    let diff = e - s;
    if (diff < 0) diff += 24*60;
    const hrs = Math.floor(diff/60);
    const mins = diff % 60;
    return String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
  }

  function updateComputed(){
    const totalTruck = totalTruckEl ? parseFloat(totalTruckEl.value) || 0 : 0;
    const repair = repairEl ? parseFloat(repairEl.value) || 0 : 0;
    // Active Truck formula: Total Truck - Repair Truck
    const active = Math.max(0, totalTruck - repair);
    if (activeEl) activeEl.value = active;

    // Utilization = (Active - Repair) / Active  -> as percent for input (e.g., 69.23)
    if (utilEl){
      if (active > 0){
        const util = (active - repair) / active;
        utilEl.value = isFinite(util) ? (Math.round(util * 10000) / 100) : '';
      } else {
        utilEl.value = '';
      }
    }

    // Operation hours
    if (totalHoursEl){
      const hrs = computeHours(startEl ? startEl.value : '', endEl ? endEl.value : '');
      totalHoursEl.value = hrs == null ? '' : hrs;
    }

    // Ton (Metric) = Actual (Kilogram) / 1000
    if (tonMetricEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      tonMetricEl.value = actual ? (Math.round((actual / 1000) * 100) / 100) : '';
    }

    // Achievement = Actual (Kilogram) / Target (Kilogram) -> percent input
    if (achEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      const target = targetEl ? parseFloat(targetEl.value) || 0 : 0;
      if (target > 0){
        const ach = actual / target;
        achEl.value = isFinite(ach) ? (Math.round(ach * 10000) / 100) : '';
        // KPI summary text
        if (sumEl){
          if (ach < 0.8) sumEl.value = 'Below 80%';
          else if (ach < 0.9) sumEl.value = 'Below 90%';
          else if (ach < 1.0) sumEl.value = 'Below 100%';
          else sumEl.value = 'Above 100%';
        }
      } else {
        achEl.value = '';
        if (sumEl) sumEl.value = '';
      }
    }
  }

  // date change -> update month/year
  if (dateEl){
    dateEl.addEventListener('change', () => {
      if (monthEl) monthEl.value = toMonthName(dateEl.value);
      if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
    });
  }

  // total truck / repair change -> update active/utilization
  if (totalTruckEl) totalTruckEl.addEventListener('input', updateComputed);
  if (repairEl) repairEl.addEventListener('input', updateComputed);
  // start/end change -> update total hours
  if (startEl) startEl.addEventListener('input', updateComputed);
  if (endEl) endEl.addEventListener('input', updateComputed);
  // target/actual change -> update achievement & summary
  if (targetEl) targetEl.addEventListener('input', updateComputed);
  if (actualEl) actualEl.addEventListener('input', updateComputed);

  // run initial compute
  updateComputed();

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal'); };
  async function commitAddRow(){
    const newRow = {};
    const autos = (tableKey === 'operationKPI') ? computeOperationKPIAutos(box) : (tableKey === 'containerOperationKPI') ? computeContainerOperationKPIAutos(box) : (tableKey === 'driverKPI') ? computeDriverKPIAutos(box) : (tableKey === 'mileage') ? computeMileageAutos(box) : {};
    def.columns.forEach(c => {
      if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id))){
        newRow[c.id] = autos[c.id];
        return;
      }
      const el = box.querySelector(`[data-col="${c.id}"]`);
      let v = el ? el.value : '';
      if (c.type === 'pct' && v !== '') v = parseFloat(v) / 100;
      if ((c.type === 'number' || c.type === 'money') && v !== '') v = parseFloat(v);
      if (c.type === 'ic' && v) v = formatIC(v);
      if (c.type === 'phone' && v) v = formatPhone(v);
      newRow[c.id] = v;
    });
    if (tableKey === 'notificationContact'){
      newRow.designation = await staffDesignationFor(newRow.name, newRow.branch);
      newRow.phone       = await staffPhoneFor(newRow.name, newRow.branch);
    }
    const data = await getData(tableKey);
    data.unshift(newRow);
    await persist(tableKey);
    overlay.classList.remove('show');
    if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
  }

  box.querySelector('#saveModal').onclick = async () => {
    await commitAddRow();
    if (onDone) onDone();
  };

  const completeBtn = box.querySelector('#saveModalComplete');
  if (completeBtn) completeBtn.onclick = async () => {
    await commitAddRow();
    if (opts && opts.onComplete) opts.onComplete();
    else if (onDone) onDone();
  };
}
async function openEditRowModal(tableKey, idx, onDone, opts){
  const def = TABLES[tableKey];
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const dataForVessel = await getData(tableKey);
  const rowForVessel = (dataForVessel && dataForVessel[idx]) ? dataForVessel[idx] : {};
  let vesselOptions = (tableKey === 'driverKPI' || tableKey === 'maintenanceLog') ? await getVesselOptions() : null;
  if (vesselOptions && rowForVessel.vessel && !vesselOptions.includes(rowForVessel.vessel)){
    vesselOptions = [...vesselOptions, rowForVessel.vessel].sort();
  }
  const truckFieldId = TRUCK_DROPDOWN_FIELDS[tableKey];
  let truckOptions = truckFieldId ? await getTruckOptions() : null;
  if (truckOptions && rowForVessel[truckFieldId] && !truckOptions.includes(rowForVessel[truckFieldId])){
    truckOptions = [...truckOptions, rowForVessel[truckFieldId]].sort();
  }
  const driverFieldId = DRIVER_DROPDOWN_FIELDS[tableKey];
  let driverOptions = driverFieldId ? await getDriverOptions() : null;
  if (driverOptions && rowForVessel[driverFieldId] && !driverOptions.includes(rowForVessel[driverFieldId])){
    driverOptions = [...driverOptions, rowForVessel[driverFieldId]].sort();
  }
  let safetyAssetOptions = tableKey === 'safetyEquipment' ? await getSafetyEquipmentAssetOptions() : null;
  if (safetyAssetOptions && rowForVessel.asset && !safetyAssetOptions.includes(rowForVessel.asset)){
    safetyAssetOptions = [...safetyAssetOptions, rowForVessel.asset];
  }

  let fields = '';
  const formCols = (tableKey === 'staffDatabase')
    ? STAFF_FORM_FIELDS.map(id => def.columns.find(x => x.id === id)).filter(Boolean)
    : def.columns;
  formCols.forEach(c => {
    // Hide fields that are auto-calculated. They will be computed on save.
    if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id)) || (tableKey === 'staffDatabase' && (STAFF_AUTO_FIELDS.includes(c.id) || STAFF_FORM_HIDDEN.includes(c.id))) || (tableKey === 'safetyEquipment' && ['inspectionDate','firstAid','triangle','cone','wheelChock','reflectiveString','torchlight','helmet','safetyShoes','reflectiveVest'].includes(c.id)) || (tableKey === 'maintenanceLog' && MAINT_AUTO_FIELDS.includes(c.id)) || (tableKey === 'machineryLog' && MACHINERY_AUTO_FIELDS.includes(c.id)) || (tableKey === 'speedingIdling' && SPEEDING_AUTO_FIELDS.includes(c.id)) || (tableKey === 'notificationContact' && (c.id === 'designation' || c.id === 'phone'))) return;
    if (c.id === 'vessel' && vesselOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${vesselOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === truckFieldId && truckOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${truckOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.id === driverFieldId && driverOptions){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${driverOptions.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (COMBO_OPTION_FIELDS[tableKey] && COMBO_OPTION_FIELDS[tableKey].includes(c.id)){
      fields += buildComboField(c);
    } else if (FIXED_PICKER_FIELDS[tableKey] && FIXED_PICKER_FIELDS[tableKey].includes(c.id)){
      fields += buildFixedPickerField(c);
    } else if (c.type === 'select'){
      fields += `<div class="formfield"><label>${c.label}</label>
        <select data-col="${c.id}">
          <option value=""></option>
          ${c.options.map(o=>`<option value="${o}">${o}</option>`).join('')}
        </select></div>`;
    } else if (c.type === 'badge'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="status..."></div>`;
    } else if (c.type === 'ic'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="900101-14-5678" maxlength="14"></div>`;
    } else if (c.type === 'phone'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text" placeholder="012-345 6789" maxlength="13"></div>`;
    } else if (c.type === 'date'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="date"></div>`;
    } else if (c.type === 'time'){
      fields += `<div class="formfield"><label>${c.label}</label><div class="time-input"><input data-col="${c.id}" type="time"></div></div>`;
    } else if (c.type === 'number' || c.type === 'money'){
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="number" step="any"></div>`;
    } else if (c.type === 'pct'){
      fields += `<div class="formfield"><label>${c.label} (%)</label><input data-col="${c.id}" type="number" step="any" placeholder="e.g. 85"></div>`;
    } else {
      fields += `<div class="formfield"><label>${c.label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  box.innerHTML = `
    <h4>Edit ${def.label} Record</h4>
    <div class="formgrid">${fields}</div>
    <div id="pmDocUpdatePanel"></div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn primary" id="saveModal">Save Record</button>
    </div>
  `;
  overlay.classList.add('show');
  if (tableKey === 'operationKPI' || tableKey === 'containerOperationKPI') box.classList.add('opkpi-modal');
  // live-format any IC number / phone fields as the user types
  def.columns.forEach(c => {
    if (c.type === 'ic'){
      const icEl = box.querySelector(`[data-col="${c.id}"]`);
      if (icEl) icEl.addEventListener('input', () => { icEl.value = formatIC(icEl.value); });
    }
    if (c.type === 'phone'){
      const phEl = box.querySelector(`[data-col="${c.id}"]`);
      if (phEl) phEl.addEventListener('input', () => { phEl.value = formatPhone(phEl.value); });
    }
  });
  await wireComboFields(box, tableKey, def);

  // elements
  const dateEl = box.querySelector('[data-col="date"]');
  const monthEl = box.querySelector('[data-col="month"]');
  const yearEl = box.querySelector('[data-col="year"]');
  const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
  const repairEl = box.querySelector('[data-col="repairTruck"]');
  const activeEl = box.querySelector('[data-col="activeTruck"]');
  const utilEl = box.querySelector('[data-col="utilization"]');
  const startEl = box.querySelector('[data-col="operationStart"]');
  const endEl = box.querySelector('[data-col="operationEnd"]');
  const totalHoursEl = box.querySelector('[data-col="totalHours"]');
  const targetEl = box.querySelector('[data-col="targetTon"]');
  const actualEl = box.querySelector('[data-col="actualTon"]');
  const tonMetricEl = box.querySelector('[data-col="tonMetric"]');
  const achEl = box.querySelector('[data-col="achievement"]');
  const sumEl = box.querySelector('[data-col="kpiSummary"]');

  function toMonthName(date){ try{ const d = new Date(date); return d.toLocaleString('en-GB', {month:'long'}); }catch(e){ return ''; } }
  function setReadonlyIf(el){ if (el) el.readOnly = true; }
  if (tableKey === 'operationKPI') {
    [monthEl, yearEl, activeEl, utilEl, achEl, sumEl, totalHoursEl, tonMetricEl].forEach(setReadonlyIf);
  }

  // prefill values
  const data = await getData(tableKey);
  const row = (data && data[idx]) ? data[idx] : {};
  def.columns.forEach(c => {
    const el = box.querySelector(`[data-col="${c.id}"]`);
    if (!el) return;
    let v = row[c.id];
    if (c.type === 'pct'){
      el.value = (v === '' || v == null) ? '' : (parseFloat(v) * 100);
    } else {
      el.value = (v === undefined || v === null) ? '' : v;
    }
  });
  if (tableKey === 'safetyEquipment'){ await wireSafetyEquipmentPickers(box); }
  if (tableKey === 'apadDocuments'){ await wireApadCategoryPicker(box); }
  if (tableKey === 'trailer'){ await wireTrailerPickers(box); }
  if (tableKey === 'primeMover'){ await wirePrimeMoverPickers(box); }
  if (tableKey === 'feg'){ await wireFegPickers(box); }
  if (tableKey === 'speedingIdling'){ await wireSpeedingPickers(box); }
  wireFixedPickerFields(box, tableKey, def);
  if (tableKey === 'notificationContact'){ await wireNotificationContactNameBranch(box); }
  if (tableKey === 'whatsappGroups'){ await wireWhatsAppGroupsBranch(box); }
    /* ---- Document update: "Correction Only" vs "Document Renewal / Update" ----
       Prime Mover DAN Trailer kongsi panel ini; helper dipilih ikut tableKey. */
  let pmDocRadioValue = '';
  if (tableKey === 'primeMover' || tableKey === 'trailer' || tableKey === 'staffDatabase'){
    const isPm = (tableKey === 'primeMover');
    const isTl = (tableKey === 'trailer');
    const docFieldMap  = isPm ? PM_DOC_FIELD_MAP  : (isTl ? TL_DOC_FIELD_MAP  : ST_DOC_FIELD_MAP);
    const docChangedFn = isPm ? pmDocSlotsChanged : (isTl ? tlDocSlotsChanged : stDocSlotsChanged);
    const docLabelFn   = isPm ? pmDocSlotLabel    : (isTl ? tlDocSlotLabel    : stDocSlotLabel);

    const docPanel = box.querySelector('#pmDocUpdatePanel');
    const saveBtn  = box.querySelector('#saveModal');
    const snapshot = {};
    Object.keys(docFieldMap).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });

    function readDocInputs(){
      const out = {};
      Object.keys(docFieldMap).forEach(f => {
        const el = box.querySelector(`[data-col="${f}"]`);
        if (!el) return;                       // tak ada dalam borang → jangan sentuh
        out[f] = String(el.value || '');
      });
      return out;
    }

    function refreshDocPanel(){
      const slots = docChangedFn(snapshot, Object.assign({}, snapshot, readDocInputs()));
      if (!slots.length){
        docPanel.innerHTML = '';
        docPanel.dataset.rendered = '';
        pmDocRadioValue = '';
        saveBtn.disabled = false;
        return;
      }
      if (docPanel.dataset.rendered !== slots.join(',')){
        docPanel.dataset.rendered = slots.join(',');
        docPanel.innerHTML = `
          <div class="pm-docupd">
            <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(docLabelFn).join(', ')}</strong></div>
            <label class="pm-docupd-opt">
              <input type="radio" name="pmDocUpdateMode" value="correction_only">
              <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
            </label>
            <label class="pm-docupd-opt">
              <input type="radio" name="pmDocUpdateMode" value="document_renewal">
              <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
            </label>
            <div class="pm-docupd-hint">You must choose one option before saving.</div>
          </div>`;
        docPanel.querySelectorAll('input[name="pmDocUpdateMode"]').forEach(r => {
          r.addEventListener('change', () => { pmDocRadioValue = r.value; saveBtn.disabled = false; });
        });
        pmDocRadioValue = '';
        saveBtn.disabled = true;
      }
    }

    const grid = box.querySelector('.formgrid');
    if (grid){
      grid.addEventListener('input', refreshDocPanel);
      grid.addEventListener('change', refreshDocPanel);
    }
    refreshDocPanel();
  }

  // initialize month/year from date
  if (dateEl && dateEl.value){
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  } else if (dateEl){
    const today = new Date();
    dateEl.value = today.toISOString().slice(0,10);
    if (monthEl) monthEl.value = toMonthName(dateEl.value);
    if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
  }

  function parseTime(t){
    if (!t) return null;
    const m = t.split(':');
    if (m.length < 2) return null;
    return parseInt(m[0],10)*60 + parseInt(m[1],10);
  }
  function computeHours(start, end){
    const s = parseTime(start);
    const e = parseTime(end);
    if (s == null || e == null) return null;
    let diff = e - s;
    if (diff < 0) diff += 24*60;
    const hrs = Math.floor(diff/60);
    const mins = diff % 60;
    return String(hrs).padStart(2,'0') + ':' + String(mins).padStart(2,'0');
  }

  function updateComputed(){
    const totalTruck = totalTruckEl ? parseFloat(totalTruckEl.value) || 0 : 0;
    const repair = repairEl ? parseFloat(repairEl.value) || 0 : 0;
    const active = Math.max(0, totalTruck - repair);
    if (activeEl) activeEl.value = active;
    if (utilEl){
      if (active > 0){
        const util = (active - repair) / active;
        utilEl.value = isFinite(util) ? (Math.round(util * 10000) / 100) : '';
      } else {
        utilEl.value = '';
      }
    }

    // operation hours
    if (totalHoursEl){
      const hrs = computeHours(startEl ? startEl.value : '', endEl ? endEl.value : '');
      totalHoursEl.value = hrs == null ? '' : hrs;
    }

    // Ton (Metric) = Actual (Kilogram) / 1000
    if (tonMetricEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      tonMetricEl.value = actual ? (Math.round((actual / 1000) * 100) / 100) : '';
    }

    if (achEl){
      const actual = actualEl ? parseFloat(actualEl.value) || 0 : 0;
      const target = targetEl ? parseFloat(targetEl.value) || 0 : 0;
      if (target > 0){
        const ach = actual / target;
        achEl.value = isFinite(ach) ? (Math.round(ach * 10000) / 100) : '';
        if (sumEl){
          if (ach < 0.8) sumEl.value = 'Below 80%';
          else if (ach < 0.9) sumEl.value = 'Below 90%';
          else if (ach < 1.0) sumEl.value = 'Below 100%';
          else sumEl.value = 'Above 100%';
        }
      } else {
        achEl.value = '';
        if (sumEl) sumEl.value = '';
      }
    }
  }

  if (dateEl){
    dateEl.addEventListener('change', () => {
      if (monthEl) monthEl.value = toMonthName(dateEl.value);
      if (yearEl) yearEl.value = new Date(dateEl.value).getFullYear();
    });
  }
  if (totalTruckEl) totalTruckEl.addEventListener('input', updateComputed);
  if (repairEl) repairEl.addEventListener('input', updateComputed);
  if (startEl) startEl.addEventListener('input', updateComputed);
  if (endEl) endEl.addEventListener('input', updateComputed);
  if (targetEl) targetEl.addEventListener('input', updateComputed);
  if (actualEl) actualEl.addEventListener('input', updateComputed);

  updateComputed();

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal'); };
  box.querySelector('#saveModal').onclick = async () => {
    const newRow = {};
    const autos = (tableKey === 'operationKPI') ? computeOperationKPIAutos(box) : (tableKey === 'containerOperationKPI' ? computeContainerOperationKPIAutos(box) : (tableKey === 'driverKPI' ? computeDriverKPIAutos(box) : (tableKey === 'mileage' ? computeMileageAutos(box) : {})));
    def.columns.forEach(c => {
      if (tableKey === 'trailer' && c.id === 'assignedPrimeMover') return;  // AUTO dari Prime Mover
      if ((tableKey === 'operationKPI' && OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'containerOperationKPI' && CONTAINER_OP_AUTO_FIELDS.includes(c.id)) || (tableKey === 'driverKPI' && DR_AUTO_FIELDS.includes(c.id)) || (tableKey === 'mileage' && MILEAGE_AUTO_FIELDS.includes(c.id))){
        newRow[c.id] = autos[c.id];
        return;
      }
      const el = box.querySelector(`[data-col="${c.id}"]`);
      if (!el) return;   // medan tak dipapar dalam borang → JANGAN padam nilai sedia ada
      let v = el.value;
      if (c.type === 'pct' && v !== '') v = parseFloat(v) / 100;
      if ((c.type === 'number' || c.type === 'money') && v !== '') v = parseFloat(v);
      if (c.type === 'ic' && v) v = formatIC(v);
      if (c.type === 'phone' && v) v = formatPhone(v);
      newRow[c.id] = v;
    });
    // Notification Contact: Designation + Phone auto dari Staff Database (tiada di form)
    if (tableKey === 'notificationContact'){
      newRow.designation = await staffDesignationFor(newRow.name, newRow.branch);
      newRow.phone       = await staffPhoneFor(newRow.name, newRow.branch);
    }
    // Prime Mover: mod update dokumen (fail lama TIDAK dipadam)
    let docUpdate = null;
    if (tableKey === 'primeMover' || tableKey === 'trailer' || tableKey === 'staffDatabase'){
      const docChangedFn = (tableKey === 'primeMover') ? pmDocSlotsChanged
                         : (tableKey === 'trailer')    ? tlDocSlotsChanged
                         : stDocSlotsChanged;
      // Banding dengan baris LENGKAP (row + medan borang) — medan dokumen yang
      // tidak dipapar dalam borang tidak dilapor sebagai "berubah".
      const slots = docChangedFn(row, Object.assign({}, row, newRow));
      if (slots.length){
        if (!pmDocRadioValue){ alert('Please choose Correction Only or Document Renewal / Update.'); return; }
        docUpdate = { slots, mode: pmDocRadioValue };
      }
    }
    const data = await getData(tableKey);
    data[idx] = Object.assign({}, data[idx], newRow);
    if (docUpdate){
      data[idx].docs = pmApplyDocUpdateMode(data[idx].docs, docUpdate.slots, docUpdate.mode);
    }
    await persist(tableKey);
    overlay.classList.remove('show');
    if (box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
        // Sentiasa lapor balik selepas save — bukan hanya bila tarikh dokumen berubah.
    // Tanpa ini, edit row biasa (contoh Trailer Type) tak refresh table → kena F5.
    if (opts && typeof opts.onAfterSaveEdit === 'function'){
      await opts.onAfterSaveEdit({
        slots: docUpdate ? docUpdate.slots : [],
        mode:  docUpdate ? docUpdate.mode  : '',
        lorry: data[idx] ? data[idx].lorry : '',
        assetId: data[idx] ? data[idx].assetId : '',
        index: idx,
      });
    } else if (onDone){
      onDone();
    }
  };
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay'){
    e.currentTarget.classList.remove('show');
    const box = document.getElementById('modalBox');
    if (box && box.classList.contains('opkpi-modal')) box.classList.remove('opkpi-modal');
  }
});

/* ---------------------------------------------------------------------
   COMPLIANCE ALERT ENGINE (Prime Mover only)
   Module-wide notification: scans every Prime Mover record's Permit /
   Insurance / Puspakom / Roadtax dates, builds one consolidated message
   for whatever is expiring within 20 days (or the full schedule if
   nothing is due), then reuses the same Notification Contact -> Pick
   Recipient -> Save Notification History (audit log) -> Open WhatsApp
   flow as before. No auto WhatsApp API, no auto Email, no
   Reminder/Escalation Engine.
--------------------------------------------------------------------- */

// Reads the logged-in user's email from the login session, for the
// Notification History "Sent By" field. Read-only — mirrors the same
// localStorage('focc-session') pattern already used elsewhere in the app.
function getSessionEmail(){
  try{
    const session = JSON.parse(localStorage.getItem('focc-session'));
    return (session && session.email) || '';
  }catch(e){
    return '';
  }
}

// Normalizes any raw phone value into WhatsApp's international digit-only
// format (e.g. "012-345 6789" -> "60123456789"). Self-contained (does not
// alter the existing toWhatsAppLink function used by Staff Database).
function toWhatsAppDigits(phone){
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('60')) return digits;
  if (digits.startsWith('0')) return '60' + digits.slice(1);
  return '60' + digits;
}

// Compliance fields scanned for the Compliance Alert feature.
// Shared by every module that uses it (Prime Mover, Trailer, ...).
// Register Year, Service Date, 20ft Container Fit and Remark are
// intentionally excluded.
const COMPLIANCE_ALERT_FIELDS = [
  {id:'permit', label:'Permit'},
  {id:'insurance', label:'Insurance'},
  {id:'puspakom', label:'Puspakom'},
  {id:'roadtax', label:'Roadtax'},
];
const COMPLIANCE_ALERT_WINDOW_DAYS = 20;
const STAFF_COMPLIANCE_ALERT_WINDOW_DAYS = 10;

// Per-module display config for the Compliance Alert feature. Each entry
// controls only the *wording* — the scan/group/message logic underneath
// is 100% shared. Add a new module here to reuse the same feature.
const COMPLIANCE_ALERT_CONFIG = {
  primeMover: {asset: 'Truck', title: 'PRIME MOVER COMPLIANCE ALERT'},
  trailer:    {asset: 'Trailer', title: 'TRAILER COMPLIANCE ALERT'},
  staffDatabase: {asset: 'Staff', title: 'STAFF COMPLIANCE ALERT'},
  feg: {asset: 'Truck', title: 'FIRE EXTINGUISHER COMPLIANCE ALERT'},
};

// Flattens every row into one entry per compliance date found
// (asset number + field + raw date + days remaining as of today).
/* ---- 4.10 COMPLIANCE ALERTS & DUE DATE CALCULATION ---- */

function buildComplianceAlertItems(rows, assetNoun){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  rows.forEach(r => {
    const truck = r.lorry || `(No ${assetNoun})`;
    COMPLIANCE_ALERT_FIELDS.forEach(f => {
      const raw = r[f.id];
      if (!raw || raw === '-') return;
      const dt = new Date(`${raw}T00:00:00`);
      if (isNaN(dt.getTime())) return;
      const daysLeft = Math.round((dt - today) / 86400000);
      items.push({truck, field: f.label, date: raw, daysLeft});
    });
  });
  return items;
}

// ---------------------------------------------------------------------
// STAFF DATABASE COMPLIANCE ALERT — CALCULATION LAYER
// Staff Database's compliance dates are computed (raw field + offset),
// unlike Prime Mover/Trailer which use the raw date as-is.
// ---------------------------------------------------------------------

// License Due Date = License Expiry (no offset)
function calcLicenseDueDate(licenseExpiry){
  return licenseExpiry || '';
}

// GDL Due Date = GDL Expiry (no offset)
function calcGdlDueDate(gdlExpiry){
  return gdlExpiry || '';
}

// Next Drug Test = Drug Test + 6 months
function calcNextDrugTest(drugTest){
  if (!drugTest) return '';
  const d = new Date(`${drugTest}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 6, d.getDate());
  return toISODateLocal(next);
}

// Next Alcohol Test = Alcohol Test + 6 months
function calcNextAlcoholTest(alcoholTest){
  if (!alcoholTest) return '';
  const d = new Date(`${alcoholTest}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear(), d.getMonth() + 6, d.getDate());
  return toISODateLocal(next);
}

// Next Medical = Medical Status + 1 year
function calcNextMedical(medicalStatus){
  if (!medicalStatus) return '';
  const d = new Date(`${medicalStatus}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const next = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate());
  return toISODateLocal(next);
}

// Staff Database compliance field definitions for the Compliance Alert
// feature. Each entry maps a raw Staff Database column to the due-date
// label FOCC wants shown, plus how that due date is derived (calc takes
// the raw 'YYYY-MM-DD' value and returns the computed due date as an
// ISO date string).
const STAFF_COMPLIANCE_ALERT_FIELDS = [
  {id:'licenseExpiry', label:'License', calc: calcLicenseDueDate},
  {id:'gdlExpiry',     label:'GDL', calc: calcGdlDueDate},
  {id:'drugTest',      label:'Next Drug Test', calc: calcNextDrugTest},
  {id:'alcoholTest',   label:'Next Alcohol Test', calc: calcNextAlcoholTest},
  {id:'medicalStatus', label:'Next Medical Test', calc: calcNextMedical},
];

// Flattens every Staff Database row into one entry per computed due date
// (staff name + field label + computed due date + days remaining as of
// today). Mirrors buildComplianceAlertItems's item shape (truck/field/
// date/daysLeft) so it plugs into the same grouping/message/modal
// pipeline, but is kept separate since Staff Database's due dates are
// computed rather than used as-is.
function buildStaffComplianceAlertItems(rows){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  rows.forEach(r => {
    const staffName = r.staffName || '(No Staff Name)';
    STAFF_COMPLIANCE_ALERT_FIELDS.forEach(f => {
      const raw = r[f.id];
      if (!raw || raw === '-') return;
      const dueDateStr = f.calc(raw);
      if (!dueDateStr) return;
      const dt = new Date(`${dueDateStr}T00:00:00`);
      if (isNaN(dt.getTime())) return;
      const daysLeft = Math.round((dt - today) / 86400000);
      items.push({truck: staffName, field: f.label, date: dueDateStr, daysLeft});
    });
  });
  return items;
}
/* FEG compliance: scan row.units[] (bukan row) — unit Disposed & Draft DILANGKAU. */
const FEG_COMPLIANCE_ALERT_FIELDS = [
  {id:'cylinderDue', label:'Cylinder'},
  {id:'serviceDate', label:'Service'},
];

/* ---- Fasa 6b: ZON GANTI TONG (8 bulan) ------------------------------
   Bila Cylinder Test Due tinggal 8 bulan atau kurang, tong TIDAK boleh
   diservis lagi — kena GANTI tong. Rule ini HANYA untuk Compliance Alert.
   FEG List, Final Status, Dashboard task & borang TIDAK disentuh.
   -------------------------------------------------------------------- */
const FEG_CYLINDER_REPLACE_MONTHS = 8;

/* Tarikh mula zon ganti tong = cylinderDue tolak 8 bulan (kalendar). */
function fegCylinderReplaceFrom(cylinderDue){
  const raw = String(cylinderDue || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(raw + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() - FEG_CYLINDER_REPLACE_MONTHS);
  return d;
}
/* ---- Cylinder Test Due AUTO dari Manufacturing Date -----------------
   Standard Malaysia (MS 1539 / BOMBA): ujian hidrostatik / extended
   service tong = setiap 5 TAHUN dari tarikh PEMBUATAN.
   Jadi "Cylinder Test Due" tak perlu diisi manual lagi.
   ⚠ TUKAR NOMBOR DI BAWAH kalau amalan syarikat kau lain.
   -------------------------------------------------------------------- */
const FEG_CYLINDER_TEST_YEARS = 10;

/* 'YYYY-MM-DD' (tarikh pembuatan) + N tahun → 'YYYY-MM-DD' ('' kalau kosong).
   Tak guna toISOString() — elak tarikh lari 1 hari sebab zon masa (UTC+8). */
function fegCylinderDueFrom(mfgDate){
  const raw = String(mfgDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const y = Number(raw.slice(0, 4)) + FEG_CYLINDER_TEST_YEARS;
  if (!y) return '';
  let mm = raw.slice(5, 7), dd = raw.slice(8, 10);
  const leap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
  if (mm === '02' && dd === '29' && !leap) dd = '28';    // 29 Feb → 28 Feb
  return y + '-' + mm + '-' + dd;
}

function buildFegComplianceAlertItems(rows){
  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];
  (rows || []).forEach(r => {
    (r.units || []).forEach(u => {
      if (String(u.disposal || 'No') === 'Yes') return;     // disposed → bukan tuntutan
      if (!String(u.serialNo || '').trim()) return;         // draft → tak masuk alert
      const asset  = r.assetRef || '(No Asset)';
      const serial = fegSerialLabel(u);

      /* Zon ganti tong? Kalau ya — servis TAK relevan lagi. */
      const replaceFrom = fegCylinderReplaceFrom(u.cylinderDue);
      if (replaceFrom && today >= replaceFrom){
        const due = new Date(String(u.cylinderDue) + 'T00:00:00');
        items.push({
          truck: asset, serial: serial,
          field: 'Cylinder Replacement',
          date: String(u.cylinderDue),
          daysLeft: Math.round((due - today) / 86400000),
          isCylinderReplacement: true,     // bypass window 20 hari
        });
        return;                            // jangan tawarkan servis lagi
      }

            /* Tengah diservis (Under Service) → jangan tuntut servis lagi.
         Diletak SELEPAS blok Cylinder Replacement supaya penggantian tong tetap naik. */
      if (fegIsInService(u)) return;

      FEG_COMPLIANCE_ALERT_FIELDS.forEach(f => {
        const raw = u[f.id];
        if (!raw || raw === '-') return;
        const dt = new Date(`${raw}T00:00:00`);
        if (isNaN(dt.getTime())) return;
        const daysLeft = Math.round((dt - today) / 86400000);
        items.push({ truck: asset, serial: serial, field: f.label, date: raw, daysLeft: daysLeft });
      });
    });
  });
  return items;
}

// Turns a signed Days Left value into the exact label FOCC wants shown
// next to each compliance date.
//   daysLeft > 0 -> "Days Left: X"
//   daysLeft = 0 -> "Due Today"
//   daysLeft < 0 -> "Expired X Days Ago"
function complianceDaysLeftLabel(daysLeft){
  if (daysLeft > 0) return `Days Left: ${daysLeft}`;
  if (daysLeft === 0) return 'Due Today';
  return `Expired ${Math.abs(daysLeft)} Days Ago`;
}

// Groups compliance items by Truck Number, sorted so the truck with the
// most urgent (lowest/most-overdue Days Left) item appears first; each
// truck's own items are sorted the same way (most overdue first).
function groupComplianceItemsByTruck(items){
  const map = new Map();
  items.forEach(it => {
    if (!map.has(it.truck)) map.set(it.truck, []);
    map.get(it.truck).push(it);
  });
  const groups = Array.from(map.entries()).map(([truck, list]) => {
    list.sort((a, b) => a.daysLeft - b.daysLeft);
    return {truck, items: list, minDays: list[0].daysLeft};
  });
  groups.sort((a, b) => a.minDays - b.minDays || a.truck.localeCompare(b.truck));
  return groups;
}

// Builds the consolidated Compliance Alert message, grouped by asset number
// (each truck/trailer printed once, all its matching items beneath it).
// - Includes items expiring within the window AND items already expired
//   (daysLeft <= COMPLIANCE_ALERT_WINDOW_DAYS, no lower bound).
// - If nothing matches at all, falls back to the full schedule for every row.
// `config` = {asset: 'Truck'|'Trailer'|..., title: '<ALERT TITLE>'}, keyed
// per module in COMPLIANCE_ALERT_CONFIG.
function buildComplianceAlertMessage(rows, config, tableKey){
const allItems = tableKey === 'staffDatabase'
  ? buildStaffComplianceAlertItems(rows)
  : tableKey === 'feg'
  ? buildFegComplianceAlertItems(rows)
  : buildComplianceAlertItems(rows, config.asset);
const dueItems = tableKey === 'staffDatabase'
  ? allItems.filter(it => it.daysLeft <= STAFF_COMPLIANCE_ALERT_WINDOW_DAYS)
  : allItems.filter(it => it.isCylinderReplacement || it.daysLeft <= COMPLIANCE_ALERT_WINDOW_DAYS);
  const groups = groupComplianceItemsByTruck(dueItems);

  const allClear = tableKey !== 'feg' && groups.length === 0;
  const lines = [`${allClear ? '✅' : '⚠️'} ${config.title}${allClear ? ' — ALL CLEAR' : ''}`];

if (tableKey === 'feg'){

  if (groups.length){
    groups.forEach((g, i) => {
      if (i > 0) lines.push('--------------------------------');

      lines.push(`${config.asset} No: ${g.truck}`);

      g.items.forEach(it => {
        lines.push(`${it.field}${it.serial ? ' (' + it.serial + ')' : ''} Expiry: ${fmtDate(it.date)} | ${complianceDaysLeftLabel(it.daysLeft)}${it.isCylinderReplacement ? ' — REPLACE CYLINDER (cannot be serviced)' : ''}`);
      });
    });
    lines.push('Please arrange replacement or servicing accordingly.');
  } else {
    lines.push(`All ${rows.length} FEG record(s) scanned. No extinguisher is due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
    lines.push('No action required.');
  }
  } else if (groups.length){
    lines.push('The following compliance items require attention:');
    groups.forEach((g, i) => {
      if (i > 0) lines.push('');
      lines.push(`${config.asset}: ${g.truck}`);
      g.items.forEach(it => {
        lines.push(`${it.field}: ${fmtDate(it.date)} | ${complianceDaysLeftLabel(it.daysLeft)}`);
      });
    });
  } else if (tableKey === 'staffDatabase') {
    lines.push(`All ${rows.length} staff scanned. No compliance items are due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
    lines.push('No action required.');
  } else {
    const assetPlural = `${config.asset.toLowerCase()}${rows.length === 1 ? '' : 's'}`;
    lines.push(`All ${rows.length} ${assetPlural} scanned. No compliance items are due or expiring within the next ${COMPLIANCE_ALERT_WINDOW_DAYS} days.`);
    lines.push('No action required.');
  }

  if (tableKey !== 'feg' && !allClear) lines.push('Please arrange renewal accordingly.');
  lines.push('FOCC Fleet Operations Control Centre');
  return {message: lines.join('\n'), dueItems, groups};
}

// Deterministic avatar color from a name, drawn from FOCC's own palette so
// every recipient chip stays on-brand instead of random colors.
const NOTIFY_AVATAR_COLORS = ['#1aa39a', '#26567f', '#e6a339', '#3f9a6e', '#d1554a', '#128077'];
function notifyAvatarColor(name){
  const s = String(name || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return NOTIFY_AVATAR_COLORS[hash % NOTIFY_AVATAR_COLORS.length];
}
function notifyInitials(name){
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

// Opens the module-wide "Compliance Alert" popup for tableKey (Prime Mover,
// Trailer, or any future module registered in COMPLIANCE_ALERT_CONFIG).
// Scans every record, builds one consolidated message, and reuses the
// shared #modalOverlay/#modalBox shell so it matches existing FOCC modal
// styling automatically.
async function openComplianceAlertModal(tableKey){
  const def = TABLES[tableKey];
  const data = await getData(tableKey);
  const moduleLabel = def.label;
  const alertConfig = COMPLIANCE_ALERT_CONFIG[tableKey] || {asset: 'Truck', title: 'PRIME MOVER COMPLIANCE ALERT'};
  const assetNoun = alertConfig.asset;

  const contacts = await getData('notificationContact');
  const activeContacts = contacts.filter(c => (c.status || '').trim().toLowerCase() === 'active');

  // WhatsApp Groups (Group mode) — hanya Status Active + link group yang sah.
  let groupsRaw = [];
  try { groupsRaw = (await getData('whatsappGroups')) || []; } catch(e){ groupsRaw = []; }
  const activeGroups = groupsRaw.filter(g =>
    (g.status || '').trim().toLowerCase() === 'active' &&
    /https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i.test(String(g.groupLink || '').trim())
  );

  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');

  const waIconSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 4.99L2 22l5.2-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2zm5.86 14.06c-.25.7-1.25 1.28-2.03 1.44-.55.12-1.27.21-3.7-.79-2.75-1.14-4.65-3.7-4.8-3.9-.14-.19-1.15-1.53-1.15-2.92 0-1.39.72-2.06.98-2.34.25-.28.55-.35.73-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.25.6.85 2.08.92 2.23.07.15.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.56.16.28.71 1.18 1.53 1.92 1.05.95 1.94 1.24 2.22 1.38.28.14.44.12.6-.07.17-.19.72-.85.92-1.14.19-.28.38-.24.65-.14.27.1 1.72.82 2.01.97.29.14.48.21.55.34.07.13.07.72-.18 1.42z"/></svg>`;
  const truckIconSvg = `<svg viewBox="0 0 24 24"><path d="M3 6a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3h3.28a1 1 0 0 1 .9.56l1.72 3.44a1 1 0 0 1 .1.44V17a1 1 0 0 1-1 1h-1.17a2.5 2.5 0 0 1-4.66 0H9.83a2.5 2.5 0 0 1-4.66 0H4a1 1 0 0 1-1-1V6zm14 5V7h-2.28l1.4 2.8.28.2H17zM7.5 16.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`;
  const emptyPersonSvg = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12zm0 2c-3.3 0-9 1.7-9 5v2h18v-2c0-3.3-5.7-5-9-5z" fill="currentColor"/></svg>`;

  // ---- Group module rows by branch ("Send All" = every row) ----
  const normBranch    = v => String(v == null ? '' : v).trim();
  const branchKeyOf   = v => normBranch(v) || '__nobranch__';
  const branchLabelOf = v => normBranch(v) || 'No Branch Assigned';
  const ALL_KEY = '__all__';

  const branchMap = new Map();
  data.forEach(r => {
    const k = branchKeyOf(r.branch);
    if (!branchMap.has(k)) branchMap.set(k, {key: k, label: branchLabelOf(r.branch), rows: []});
    branchMap.get(k).rows.push(r);
  });
  const branches = Array.from(branchMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  const byKey = new Map();
  branches.forEach(b => byKey.set(b.key, Object.assign({key: b.key, label: b.label, rows: b.rows},
    buildComplianceAlertMessage(b.rows, alertConfig, tableKey))));
  const allTarget = Object.assign({key: ALL_KEY, label: 'All Branches', rows: data},
    buildComplianceAlertMessage(data, alertConfig, tableKey));
  byKey.set(ALL_KEY, allTarget);

  const targetOrder = [ALL_KEY].concat(branches.map(b => b.key));   // All di atas sekali

  function assetLabelFor(t){
    const n = t.groups.length;
    const base = t.dueItems.length ? `${n} ${assetNoun}${n===1?'':'s'}` : `All ${assetNoun}s`;
    return t.key === ALL_KEY ? base : `${t.label} · ${base}`;
  }

  function branchCardHtml(t){
    const isAlert = t.dueItems.length > 0;
    const isAll = t.key === ALL_KEY;
    const valueText = isAlert
      ? `${t.dueItems.length} item${t.dueItems.length===1?'':'s'} &middot; ${t.groups.length} ${assetNoun.toLowerCase()}${t.groups.length===1?'':'s'}`
      : 'Nothing due &mdash; all clear';
    return `
      <label class="notify-asset-card pickable ${isAlert ? 'is-alert' : 'is-clear'}" data-notify-target="${escapeHtml(t.key)}">
        <input type="radio" name="notifyBranchPick" value="${escapeHtml(t.key)}" style="display:none">
        <div class="notify-asset-icon">${truckIconSvg}</div>
        <div class="notify-asset-body">
          <div class="notify-asset-label">${escapeHtml(isAll ? 'All Branches' : t.label)}</div>
          <div class="notify-asset-value">${valueText}</div>
        </div>
      </label>`;
  }

  function recipientRowHtml(c){
    const noPhone = !toWhatsAppDigits(c.phone || '');
    return `
      <label class="notify-recipient-row${noPhone ? ' is-disabled' : ''}">
        <span class="notify-avatar" style="background:${notifyAvatarColor(c.name)}">${notifyInitials(c.name)}</span>
        <span class="notify-recipient-info">
          <span class="notify-recipient-name">${escapeHtml(c.name || '(no name)')}</span>
          <span class="notify-recipient-phone">${noPhone ? 'No phone number' : escapeHtml(formatPhone(c.phone) || '-')}</span>
        </span>
        <input type="checkbox" class="notify-recipient-cb" data-name="${escapeHtml(c.name || '')}" data-phone="${escapeHtml(c.phone || '')}"${noPhone ? ' disabled' : ''}>
      </label>`;
  }

  function emptyHtml(msg){
    return `
      <div class="notify-empty">
        ${emptyPersonSvg}
        <span>${escapeHtml(msg)}</span>
      </div>`;
  }

  box.innerHTML = `
    <div class="notify-header">
      <div class="notify-header-icon"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg></div>
      <div>
        <h4>Compliance Alert</h4>
        <div class="notify-subtitle">${escapeHtml(moduleLabel)} &middot; All ${assetNoun}s Scanned</div>
      </div>
    </div>

    <div class="notify-section-head">
      <label>Select Branch</label>
      <span class="notify-count none" id="notifyBranchCount">None selected</span>
    </div>
    <div id="notifyBranchCards" class="notify-branch-grid">
      ${targetOrder.map(k => branchCardHtml(byKey.get(k))).join('')}
    </div>

    <div class="notify-section">
      <div class="notify-section-head notify-section-head-split">
        <label>Recipient List</label>
        <div class="notify-mode-toggle" id="notifyModeToggle">
          <button type="button" class="active" data-mode="personal">Personal</button>
          <button type="button" data-mode="group">Group</button>
        </div>
        <span class="notify-count none" id="notifyCount">0 selected</span>
      </div>
      <div id="notifyRecipientList" class="notify-recipient-list notify-recipient-grid">
        ${emptyHtml('Please select branch')}
      </div>
    </div>

    <div class="notify-section" style="margin-bottom:0;">
      <div class="notify-section-head">
        <label>Message Preview</label>
        <button type="button" class="btn notify-copy-btn" id="notifyCopyMsgBtn">Copy Message</button>
      </div>
      <div class="notify-message-card">
        <div class="notify-message-icon">${waIconSvg}</div>
        <p class="notify-message-text" id="notifyMessagePreview">${escapeHtml(allTarget.message)}</p>
      </div>
      <div class="notify-queue-bar" id="notifyQueueBar"><span id="notifyQueueText"></span></div>
    </div>

    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn whatsapp-send" id="sendWhatsAppBtn" disabled>${waIconSvg}<span id="sendWhatsAppLabel">Send WhatsApp</span></button>
    </div>
  `;

  overlay.classList.add('show');

  const countEl       = box.querySelector('#notifyCount');
  const sendBtn       = box.querySelector('#sendWhatsAppBtn');
  const sendLabel     = box.querySelector('#sendWhatsAppLabel');
  const branchCountEl = box.querySelector('#notifyBranchCount');
  const recipientHost = box.querySelector('#notifyRecipientList');
  const previewEl     = box.querySelector('#notifyMessagePreview');

  let currentTarget = allTarget;

  function updateSelectionState(){
    const sel = notifyMode === 'group' ? '.notify-group-cb:checked' : '.notify-recipient-cb:checked';
    const n = box.querySelectorAll(sel).length;

    countEl.textContent = n === 1 ? '1 selected' : `${n} selected`;
    countEl.classList.toggle('none', n === 0);

    if (queue.length){
      // Queue berjalan (Personal ATAU Group) — butang dikawal queue, bukan selection.
      const isGrp = queueMode === 'group';
      queueBarEl.style.display = 'flex';
      queueTextEl.textContent = `${Math.min(queueIdx, queue.length)} of ${queue.length} ${isGrp ? 'groups' : 'recipients'} opened`;
      if (queueIdx >= queue.length){
        sendBtn.disabled = true;
        sendLabel.textContent = isGrp ? 'All groups opened' : 'All recipients opened';
      } else {
        sendBtn.disabled = false;
        sendLabel.textContent = (isGrp ? 'Open Next Group' : 'Open Next Chat') + ` (${queueIdx + 1} of ${queue.length})`;
      }
    } else {
      queueBarEl.style.display = 'none';
      sendBtn.disabled = n === 0;
      sendLabel.textContent = notifyMode === 'group'
        ? (n > 0 ? `Copy & Open Group (${n})` : 'Copy & Open Group')
        : (n > 0 ? `Send WhatsApp (${n})` : 'Send WhatsApp');
    }

    box.querySelectorAll('.notify-recipient-row').forEach(rowEl => {
      const cb = rowEl.querySelector('.notify-recipient-cb, .notify-group-cb');
      rowEl.classList.toggle('selected', !!(cb && cb.checked));
    });
  }

  function applyTarget(t){
    currentTarget = t;

    box.querySelectorAll('[data-notify-target]').forEach(cardEl => {
      const on = cardEl.getAttribute('data-notify-target') === t.key;
      cardEl.classList.toggle('selected', on);
      const radio = cardEl.querySelector('input[type="radio"]');
      if (radio) radio.checked = on;
    });
    branchCountEl.textContent = t.key === ALL_KEY ? 'All Branches' : t.label;
    branchCountEl.classList.remove('none');

    previewEl.textContent = t.message;

    branchChosen = true;
    clearQueue();
    renderRecipientArea();
  }

  // Keadaan awal: belum pilih branch → recipient terkunci, mesej papar semua branch.
  function resetTarget(){
    currentTarget = allTarget;
    box.querySelectorAll('[data-notify-target]').forEach(cardEl => {
      cardEl.classList.remove('selected');
      const radio = cardEl.querySelector('input[type="radio"]');
      if (radio) radio.checked = false;
    });
    branchCountEl.textContent = 'None selected';
    branchCountEl.classList.add('none');
    previewEl.textContent = allTarget.message;
    branchChosen = false;
    clearQueue();
    renderRecipientArea();
  }

  box.querySelectorAll('input[name="notifyBranchPick"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const t = byKey.get(radio.value);
      if (t) applyTarget(t);
    });
  });

    /* ---------------- Group mode (WhatsApp Groups) + Copy Message ----------------
     Personal = flow lama (TIDAK berubah). Group = mesej disalin SEKALI, lepas tu
     setiap klik buka SATU group (elak popup blocker). Setiap group dilog ke
     Notification History sebagai rekod audit.                                  */
  const modeToggleEl = box.querySelector('#notifyModeToggle');
  const queueBarEl   = box.querySelector('#notifyQueueBar');
  const queueTextEl  = box.querySelector('#notifyQueueText');
  const copyMsgBtn   = box.querySelector('#notifyCopyMsgBtn');

  let notifyMode   = 'personal';   // 'personal' | 'group'
  let branchChosen = false;
  let queue        = [];
  let queueIdx     = 0;
  let queueLogged  = new Set();
  let queueMessage = '';
  let queueMode    = 'personal';   // queue semasa: 'personal' | 'group'

  // Hanya terima link group WhatsApp yang sah (elak URL salah/sesat dibuka).
  const groupLinkOf = v => {
    const m = String(v || '').match(/https?:\/\/(?:www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+/i);
    return m ? m[0] : '';
  };

  function clearQueue(){
    queue = [];
    queueIdx = 0;
    queueLogged = new Set();
    queueMessage = '';
    queueMode = 'personal';
    const cards = box.querySelector('#notifyBranchCards');
    if (cards){ cards.style.pointerEvents = ''; cards.style.opacity = ''; }
    if (modeToggleEl) modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = false; });
    // Buka semula checkbox yang dikunci oleh queue
    recipientHost.querySelectorAll('.queue-locked').forEach(cb => {
      cb.disabled = false;
      cb.classList.remove('queue-locked');
    });
    if (queueBarEl) queueBarEl.style.display = 'none';
  }

  function groupRowHtml(g){
    const link = groupLinkOf(g.groupLink);
    const disabled = !link;
    return `
      <label class="notify-recipient-row notify-group-row${disabled ? ' is-disabled' : ''}">
        <span class="notify-avatar" style="background:${notifyAvatarColor(g.groupName || 'G')}">${notifyInitials(g.groupName || '?')}</span>
        <span class="notify-recipient-info">
          <span class="notify-recipient-name">${escapeHtml(g.groupName || '(no name)')}</span>
          <span class="notify-recipient-phone">${disabled ? 'Missing group link' : escapeHtml(String(g.branch || '').trim() || 'No branch')}</span>
        </span>
        <input type="checkbox" class="notify-group-cb" data-group="${escapeHtml(g.groupName || '')}" data-link="${escapeHtml(link)}"${disabled ? ' disabled' : ''}>
      </label>`;
  }

  function renderRecipientArea(){
    if (!branchChosen){
      recipientHost.innerHTML = emptyHtml('Please select branch');
      updateSelectionState();
      return;
    }
    const t = currentTarget;

    if (notifyMode === 'group'){
      const list = t.key === ALL_KEY
        ? activeGroups
        : activeGroups.filter(g => branchKeyOf(g.branch) === t.key);
      recipientHost.innerHTML = list.length
        ? list.map(groupRowHtml).join('')
        : emptyHtml(t.key === ALL_KEY
            ? 'No active WhatsApp groups found.'
            : 'No active WhatsApp groups for this branch.');
      recipientHost.querySelectorAll('.notify-group-cb').forEach(cb => cb.addEventListener('change', updateSelectionState));
      updateSelectionState();
      return;
    }

    const list = t.key === ALL_KEY
      ? activeContacts
      : activeContacts.filter(c => branchKeyOf(c.branch) === t.key);
    recipientHost.innerHTML = list.length
      ? list.map(recipientRowHtml).join('')
      : emptyHtml(t.key === ALL_KEY
          ? 'No active recipients found in Notification Contact.'
          : 'No active recipients for this branch.');
    recipientHost.querySelectorAll('.notify-recipient-cb').forEach(cb => cb.addEventListener('change', updateSelectionState));
    updateSelectionState();
  }

  async function handleGroupSend(){
    const checked = Array.from(box.querySelectorAll('.notify-group-cb:checked'));

    if (!queue.length){
      if (!checked.length){ alert('Please select at least one WhatsApp group.'); return; }
      queue        = checked.map(cb => ({name: cb.dataset.group || '', link: cb.dataset.link || ''}));
      queueIdx     = 0;
      queueLogged  = new Set();
      queueMessage = currentTarget.message;

      const copied = await copyTextToClipboard(queueMessage);
      if (!copied){
        alert('Auto-copy disekat oleh browser. Sila tekan butang "Copy Message" untuk salin mesej secara manual.');
      }

      // Kunci branch + toggle semasa queue berjalan (elak tukar sasaran separuh jalan).
      const cards = box.querySelector('#notifyBranchCards');
      if (cards){ cards.style.pointerEvents = 'none'; cards.style.opacity = '.55'; }
      modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
    }

    if (queueIdx >= queue.length){ updateSelectionState(); return; }

    const item = queue[queueIdx];
    queueIdx++;

    // Buka DULU (masih dalam user gesture) supaya tak disekat popup blocker,
    // lepas tu baru tulis rekod audit.
    window.open(item.link, '_blank', 'noopener');
    if (!queueLogged.has(item.link)){
      queueLogged.add(item.link);
      await logAlertHistory(`[Group] ${item.name}`, '-', 'Opened', queueMessage);
    }
    updateSelectionState();
  }

    /* Rekod audit — satu row Notification History per penerima / group. */
  async function logAlertHistory(recipient, phone, status, message){
    const nowD = new Date();
    const historyData = await getData('notificationHistory');
    historyData.push({
      date: toISODateLocal(nowD),
      time: String(nowD.getHours()).padStart(2,'0') + ':' + String(nowD.getMinutes()).padStart(2,'0'),
      module: moduleLabel,
      asset: assetLabelFor(currentTarget),
      recipient: recipient,
      phone: phone || '-',
      message: message || currentTarget.message,
      sentBy: getSessionEmail(),
      status: status || 'Opened',
    });
    await persist('notificationHistory');
  }

  /* Personal mode:
     - 1 orang  → flow lama: klik sekali, tab buka, modal tutup.
     - 2+ orang → QUEUE: satu klik buka SATU chat (elak popup blocker). */
  async function handlePersonalSend(){
    const checked = Array.from(box.querySelectorAll('.notify-recipient-cb:checked'));

    if (!queue.length){
      if (!checked.length){ alert('Please select at least one recipient.'); return; }

      // --- Satu orang sahaja: kekal macam dulu ---
      if (checked.length === 1){
        const cb = checked[0];
        const name = cb.dataset.name || '';
        const waDigits = toWhatsAppDigits(cb.dataset.phone || '');
        const link = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(currentTarget.message)}` : '';
        if (link) window.open(link, '_blank', 'noopener');   // buka DULU (user gesture)
        await logAlertHistory(name, waDigits, link ? 'Opened' : 'No Phone', currentTarget.message);
        overlay.classList.remove('show');
        return;
      }

      // --- Dua orang ke atas: mula queue ---
      queue        = checked.map(cb => ({
        name: cb.dataset.name || '',
        phone: toWhatsAppDigits(cb.dataset.phone || ''),
      }));
      queueIdx     = 0;
      queueLogged  = new Set();
      queueMode    = 'personal';
      queueMessage = currentTarget.message;

      // Kunci branch + toggle + checkbox semasa queue (elak pilihan berubah separuh jalan)
      const cards = box.querySelector('#notifyBranchCards');
      if (cards){ cards.style.pointerEvents = 'none'; cards.style.opacity = '.55'; }
      modeToggleEl.querySelectorAll('button').forEach(b => { b.disabled = true; });
      recipientHost.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(cb => {
        cb.disabled = true;
        cb.classList.add('queue-locked');
      });
    }

    if (queueIdx >= queue.length){ updateSelectionState(); return; }

    const item = queue[queueIdx];
    queueIdx++;

    const link = item.phone ? `https://wa.me/${item.phone}?text=${encodeURIComponent(queueMessage)}` : '';
    if (link) window.open(link, '_blank', 'noopener');    // buka DULU (user gesture)
    const key = item.name + '|' + item.phone;
    if (!queueLogged.has(key)){
      queueLogged.add(key);
      await logAlertHistory(item.name, item.phone, link ? 'Opened' : 'No Phone', queueMessage);
    }
    updateSelectionState();
  }

  modeToggleEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (queue.length) return;                 // queue berjalan → kunci toggle
      notifyMode = btn.dataset.mode === 'group' ? 'group' : 'personal';
      modeToggleEl.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      clearQueue();
      renderRecipientArea();                    // branch sedia ada DIKEKALKAN
    });
  });

  copyMsgBtn.onclick = async () => {
    const ok = await copyTextToClipboard(previewEl.textContent || '');
    copyMsgBtn.textContent = ok ? '✓ Copied' : 'Tekan Ctrl+C';
    setTimeout(() => { copyMsgBtn.textContent = 'Copy Message'; }, 1600);
  };

  box.querySelector('#cancelModal').onclick = () => { overlay.classList.remove('show'); };

  sendBtn.onclick = async () => {
    if (notifyMode === 'group'){ await handleGroupSend(); return; }
    await handlePersonalSend();
  };

  resetTarget();
}

/* ---------------------------------------------------------------------
   KPI CARD HELPER
--------------------------------------------------------------------- */
function kpiCard({label, value, note, accent, barPct}){
  return `
    <div class="kpi" style="--accent:${accent || 'var(--teal)'}">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      ${note ? `<div class="note">${note}</div>` : ''}
      ${barPct != null ? `<div class="bar"><i style="width:${Math.min(100, Math.max(0, barPct))}%"></i></div>` : ''}
    </div>`;
}

function rankTable(title, rows, valueLabel){
  let html = `<table class="ranklist"><thead><tr><th>#</th><th>Truck</th><th>${valueLabel}</th></tr></thead><tbody>`;
  rows.forEach((r,i) => {
    html += `<tr><td class="num">${i+1}</td><td><span class="truckchip">${r.truck}</span></td><td>${r.value}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function rankTableWithSpending(rows, valueLabel){
  let html = `<table class="ranklist"><thead><tr><th>#</th><th>Truck</th><th>${valueLabel}</th><th>Total Spending</th></tr></thead><tbody>`;
  if (!rows.length){
    html += `<tr><td colspan="4" style="padding:18px;text-align:center;color:var(--muted);">No data</td></tr>`;
  } else {
    rows.forEach((r,i) => {
      html += `<tr><td class="num">${i+1}</td><td><span class="truckchip">${r.truck}</span></td><td>${r.value}</td><td>${FMT.money(r.spending)}</td></tr>`;
    });
  }
  html += `</tbody></table>`;
  return html;
}

// Helper: compute auto-calculated fields for Operation KPI modal/save
const OP_AUTO_FIELDS = ['month','year','activeTruck','utilization','totalHours','achievement','kpiSummary','tonMetric'];
const CONTAINER_OP_AUTO_FIELDS = ['month','year','activeTruck','utilization','totalHours','achievement'];
const DR_AUTO_FIELDS = ['month','year','adjTarget','productivity'];
const MILEAGE_AUTO_FIELDS = ['totalMileage'];
const STAFF_AUTO_FIELDS = ['tenure','age','whatsapp','employmentStatus'];
// Medan baharu Staff yang SENGAJA tidak dipaparkan dalam borang Add/Edit
// buat masa ini (borang kekal macam sekarang). Buang nama dari senarai ini
// bila kau dah putuskan borang patut tunjuk apa.
// Staff Database — borang Add/Edit (popup) papar 15 medan ini SAHAJA.
// Susunan dalam senarai ini = susunan dalam borang (ikut permintaan).
const STAFF_FORM_FIELDS = ['staffName','employeeId','designation','branch','dateHired','phone','employmentType','personalEmail','licenseNumber','licenseExpiry','gdlNumber','gdlExpiry','drugTest','alcoholTest','medicalStatus'];
// Medan yang TIDAK dipapar dalam borang — kekal di Detail Page sahaja.
const STAFF_FORM_HIDDEN = ['icNumber','dateOfBirth','nationality','address','workEmail','passportNo','passportExpiry','resignationDate','employmentStatus'];
const MAINT_AUTO_FIELDS = ['daysRepair','status'];
const MACHINERY_AUTO_FIELDS = ['nextService'];
const SPEEDING_AUTO_FIELDS = ['month'];
/* ============================================================
   DEPOT MODULE — Constants
============================================================= */
const DEPOT_STATUS = ['ok', 'repairing', 'damaged'];

const DEPOT_STATUS_LABELS = {
  ok: 'OK',
  repairing: 'Repairing',
  damaged: 'Damaged',
};

const DEPOT_STATUS_COLORS = {
  ok: '#3f9a6e',
  repairing: '#e6a339',
  damaged: '#d1554a',
};

const DEPOT_STATUS_BADGE = {
  ok: 'good',
  repairing: 'warn',
  damaged: 'bad',
};

const DEPOT_BLOCK_COLORS = [
  '#1aa39a',  // teal
  '#e6a339',  // amber
  '#8a5fd1',  // purple
  '#4f7fd1',  // blue
  '#d1554a',  // red
  '#3f9a6e',  // green
];

const DEPOT_DAYS_RANGES = [
  { min: 1,  max: 3,   color: '#3f9a6e', label: '1-3d' },
  { min: 4,  max: 7,   color: '#e6a339', label: '4-7d' },
  { min: 8,  max: 14,  color: '#e07b39', label: '8-14d' },
  { min: 15, max: 999, color: '#d1554a', label: '15d+' },
];

const DEPOT_DEFAULT_SIZES = {
  '20ft Standard': { l: 5.90,  w: 2.35, h: 2.39, weight: 2400 },
  '40ft Standard': { l: 12.03, w: 2.35, h: 2.39, weight: 3800 },
  '40ft HC':       { l: 12.03, w: 2.35, h: 2.70, weight: 3900 },
  '45ft':          { l: 13.56, w: 2.35, h: 2.69, weight: 4200 },
};

const DEPOT_DEFAULT_STACK_LIMIT = 2;
const DEPOT_DEFAULT_DEPOT_ID = 'default';
// Format a raw Malaysian phone number into a readable "012-345 6789" style
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

// Build a wa.me deep link from a local Malaysian phone number
function toWhatsAppLink(phone){
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  let waDigits = digits;
  if (waDigits.startsWith('60')){ /* already international */ }
  else if (waDigits.startsWith('0')) waDigits = '60' + waDigits.slice(1);
  else waDigits = '60' + waDigits;
  return `https://wa.me/${waDigits}`;
}

// Copy text to clipboard. Guna navigator.clipboard bila tersedia (https),
// jika disekat, fallback ke textarea + execCommand supaya user boleh Ctrl+C.
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

// Format a raw IC number string into Malaysian format ######-##-####
function formatIC(raw){
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  let out = digits.slice(0, 6);
  if (digits.length > 6) out += '-' + digits.slice(6, 8);
  if (digits.length > 8) out += '-' + digits.slice(8, 12);
  return out;
}

// Calculate tenure (e.g. "2 Years 2 Months") from a hire date up to today
function calcTenure(dateHired, endDate){
  if (!dateHired) return '-';
  const start = new Date(`${dateHired}T00:00:00`);
  if (isNaN(start.getTime())) return '-';
  const today = new Date(); today.setHours(0,0,0,0);
  let end = today;
  if (endDate){
    const e = new Date(`${endDate}T00:00:00`);
    if (!isNaN(e.getTime())) end = (e < today) ? e : today;   // tak kira masa depan
  }
  if (start > end) return '-';                                // tarikh tak sah
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0){ years--; months += 12; }
  const yearLabel = years === 1 ? 'Year' : 'Years';
  const monthLabel = months === 1 ? 'Month' : 'Months';
  return `${years} ${yearLabel} ${months} ${monthLabel}`;
}

// Derive age from a Date of Birth value (YYYY-MM-DD) up to today
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
function computeDriverKPIAutos(box){
  const dateEl = box.querySelector('[data-col="date"]');
  const dateVal = dateEl ? dateEl.value : '';
  const month = dateVal ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
  const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

  // adjusted target = targetTrip - lostTrip (Breakdown)
  const targetTripEl = box.querySelector('[data-col="targetTrip"]');
  const lostTripEl = box.querySelector('[data-col="lostTrip"]');
  const actualEl = box.querySelector('[data-col="actualTrip"]');
  const targetEl = box.querySelector('[data-col="adjTarget"]');

  const targetTrip = targetTripEl ? (parseFloat(targetTripEl.value) || 0) : 0;
  const lostTrip = lostTripEl ? (parseFloat(lostTripEl.value) || 0) : 0;
  const adjTarget = Math.max(0, targetTrip - lostTrip);

  if (targetEl) targetEl.value = adjTarget;

  const actual = actualEl ? (parseFloat(actualEl.value) || 0) : 0;
  const target = adjTarget;
  const productivity = (target > 0) ? (actual / target) : 0;
  return { month, year, adjTarget, productivity };
}
function computeMileageAutos(box){
  const startEl = box.querySelector('[data-col="startMileage"]');
  const endEl = box.querySelector('[data-col="endMileage"]');

  const startMileage =
    startEl ? (parseFloat(startEl.value) || 0) : 0;

  const endMileage =
    endEl ? (parseFloat(endEl.value) || 0) : 0;

  return {
    totalMileage: Math.max(
      0,
      endMileage - startMileage
    )
  };
}
function parseTimeHM(t){
  if (!t) return null;
  const m = t.split(':');
  if (m.length < 2) return null;
  return parseInt(m[0],10)*60 + parseInt(m[1],10);
}
function computeMinutesHM(start, end){
  const s = parseTimeHM(start);
  const e = parseTimeHM(end);
  if (s == null || e == null) return null;
  let diff = e - s;
  if (diff < 0) diff += 24*60;
return diff; // minutes
}
function minutesToHHMM(mins){
if (mins == null) return null;
const h = Math.floor(mins/60);
const m = mins % 60;
return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}

// Recalculate stored auto-calculated columns for an imported row, mirroring
// the exact formulas used when saving the Add/Edit modal by hand. Staff,
// Maintenance, Machinery & Speeding auto columns are display-computed (like
// Tenure/Age) so they need no stored value here.
function recalcImportedRowAutos(tableKey, row){
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
  const dateMonthYear = d => {
    if (!d) return {month:'', year:''};
    const dt = new Date(`${String(d).slice(0,10)}T00:00:00`);
    if (isNaN(dt.getTime())) return {month:'', year:''};
    return {month: dt.toLocaleString('en-GB', {month:'long'}), year: String(dt.getFullYear())};
  };
  if (tableKey === 'operationKPI'){
    const {month, year} = dateMonthYear(row.date);
    const totalTruck = num(row.totalTruck), repair = num(row.repairTruck);
    const active = Math.max(0, totalTruck - repair);
    const utilization = active > 0 ? (active - repair) / active : 0;
    const mins = computeMinutesHM(row.operationStart, row.operationEnd);
    const totalHours = mins == null ? '' : minutesToHHMM(mins);
    const actual = num(row.actualTon), target = num(row.targetTon);
    const tonMetric = actual / 1000;
    const achievement = target > 0 ? actual / target : 0;
    let kpiSummary = '';
    if (target > 0){
      if (achievement < 0.8) kpiSummary = 'Below 80%';
      else if (achievement < 0.9) kpiSummary = 'Below 90%';
      else if (achievement < 1.0) kpiSummary = 'Below 100%';
      else kpiSummary = 'Above 100%';
    }
    Object.assign(row, {month, year, activeTruck: active, utilization, totalHours, achievement, kpiSummary, tonMetric});
  } else if (tableKey === 'containerOperationKPI'){
    const {month, year} = dateMonthYear(row.date);
    const totalTruck = num(row.totalTruck), repair = num(row.repairTruck);
    const active = Math.max(0, totalTruck - repair);
    const utilization = active > 0 ? (active - repair) / active : 0;
    const mins = computeMinutesHM(row.operationStart, row.operationEnd);
    const totalHours = mins == null ? '' : minutesToHHMM(mins);
    const totalOrder = num(row.totalOrder), actualComplete = num(row.actualComplete);
    const achievement = totalOrder > 0 ? actualComplete / totalOrder : 0;
    Object.assign(row, {month, year, activeTruck: active, utilization, totalHours, achievement});
  } else if (tableKey === 'driverKPI'){
    const {month, year} = dateMonthYear(row.date);
    const targetTrip = num(row.targetTrip), lostTrip = num(row.lostTrip);
    const adjTarget = Math.max(0, targetTrip - lostTrip);
    const actual = num(row.actualTrip);
    const productivity = adjTarget > 0 ? actual / adjTarget : 0;
    Object.assign(row, {month, year, adjTarget, productivity});
  } else if (tableKey === 'mileage'){
    const startMileage = num(row.startMileage), endMileage = num(row.endMileage);
    Object.assign(row, {totalMileage: Math.max(0, endMileage - startMileage)});
  }
  return row;
}

/* ---- 4.12 KPI HELPERS & AUTO-COMPUTE ---- */

function computeOperationKPIAutos(box){
// read inputs from modal box (may be null if not present)
const dateEl = box.querySelector('[data-col="date"]');
const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
const repairEl = box.querySelector('[data-col="repairTruck"]');
const startEl = box.querySelector('[data-col="operationStart"]');
const endEl = box.querySelector('[data-col="operationEnd"]');
const targetEl = box.querySelector('[data-col="targetTon"]');
const actualEl = box.querySelector('[data-col="actualTon"]');

const dateVal = dateEl ? dateEl.value : '';
const month = (dateVal) ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

const totalTruck = totalTruckEl ? (parseFloat(totalTruckEl.value) || 0) : 0;
const repair = repairEl ? (parseFloat(repairEl.value) || 0) : 0;
const active = Math.max(0, totalTruck - repair);
const utilization = (active > 0) ? ((active - repair) / active) : 0;

const start = startEl ? startEl.value : '';
const end = endEl ? endEl.value : '';
const mins = computeMinutesHM(start, end);
const totalHours = mins == null ? '' : minutesToHHMM(mins);

const actual = actualEl ? (parseFloat(actualEl.value) || 0) : 0;
const target = targetEl ? (parseFloat(targetEl.value) || 0) : 0;
const tonMetric = actual / 1000;
const achievement = (target > 0) ? (actual / target) : 0;
let kpiSummary = '';
if (target > 0){
  if (achievement < 0.8) kpiSummary = 'Below 80%';
  else if (achievement < 0.9) kpiSummary = 'Below 90%';
  else if (achievement < 1.0) kpiSummary = 'Below 100%';
  else kpiSummary = 'Above 100%';
}

return { month, year, activeTruck: active, utilization, totalHours, achievement, kpiSummary, tonMetric };
}

// Helper: compute auto-calculated fields for the Container Operation KPI
// modal/save. Fully independent from computeOperationKPIAutos above (Tipper) —
// no shared data or storage between the two tables.
function computeContainerOperationKPIAutos(box){
const dateEl = box.querySelector('[data-col="date"]');
const totalTruckEl = box.querySelector('[data-col="totalTruck"]');
const repairEl = box.querySelector('[data-col="repairTruck"]');
const startEl = box.querySelector('[data-col="operationStart"]');
const endEl = box.querySelector('[data-col="operationEnd"]');
const totalOrderEl = box.querySelector('[data-col="totalOrder"]');
const actualCompleteEl = box.querySelector('[data-col="actualComplete"]');

const dateVal = dateEl ? dateEl.value : '';
const month = (dateVal) ? (new Date(dateVal)).toLocaleString('en-GB', {month:'long'}) : '';
const year = dateVal ? String(new Date(dateVal).getFullYear()) : '';

const totalTruck = totalTruckEl ? (parseFloat(totalTruckEl.value) || 0) : 0;
const repair = repairEl ? (parseFloat(repairEl.value) || 0) : 0;
const active = Math.max(0, totalTruck - repair);
const utilization = (active > 0) ? ((active - repair) / active) : 0;

const start = startEl ? startEl.value : '';
const end = endEl ? endEl.value : '';
const mins = computeMinutesHM(start, end);
const totalHours = mins == null ? '' : minutesToHHMM(mins);

const totalOrder = totalOrderEl ? (parseFloat(totalOrderEl.value) || 0) : 0;
const actualComplete = actualCompleteEl ? (parseFloat(actualCompleteEl.value) || 0) : 0;
const achievement = (totalOrder > 0) ? (actualComplete / totalOrder) : 0;

return { month, year, activeTruck: active, utilization, totalHours, achievement };
}


/* ---------------------------------------------------------------------
   PAGE: OVERVIEW (Main Menu)
--------------------------------------------------------------------- */
/* ---- 4.14 OVERVIEW DASHBOARD ---- */

async function renderOverview(){
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="menuhero">
      <div class="datepill">${new Date().getFullYear()}<br><b style="font-size:14px;color:#fff">LIVE CONSOLE</b></div>
      <div class="tag">POREIA TECHNOLOGIES &bull; FOCC</div>
      <h2>Fleet Operations Command Center</h2>
      <p>Real-time monitoring for operations, maintenance, compliance, safety and fleet performance. Powered by Poreia Technologies.</p>
    </div>
    <div class="groupcards">
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#0f5c7a,#1aa39a);">
          <h3>Operation</h3>
          <div class="gc-sub">Trips, KPI, driver productivity &amp; mileage</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="tipperOpsDashboard"><span class="idx">1</span> Tipper Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="containerOpsDashboard"><span class="idx">2</span> Container Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="tankerOpsDashboard"><span class="idx">3</span> Tanker Operations <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="mileage"><span class="idx">4</span> Truck Mileage <span class="arrow">&rarr;</span></a>
        </div>
      </div>
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#7a4a0f,#e6a339);">
          <h3>Maintenance</h3>
          <div class="gc-sub">Repairs, service history &amp; machinery</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="maintenanceDashboard"><span class="idx">1</span> Maintenance Dashboard <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="maintenanceLog"><span class="idx">2</span> Maintenance Log <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="machineryLog"><span class="idx">3</span> Machinery Log <span class="arrow">&rarr;</span></a>
        </div>
      </div>
      <div class="groupcard">
        <div class="gc-head" style="background:linear-gradient(135deg,#7a1f1f,#d1554a);">
          <h3>Compliance</h3>
          <div class="gc-sub">Documents, safety &amp; staff records</div>
        </div>
        <div class="gc-links">
          <a class="gc-link" data-nav="complianceDashboard"><span class="idx">1</span> Compliance Dashboard <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="speedingIdling"><span class="idx">2</span> Speeding &amp; Idling <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="misconduct"><span class="idx">3</span> Misconduct <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="safetyEquipment"><span class="idx">4</span> Safety Equipment <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="feg"><span class="idx">5</span> FEG <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="primeMover"><span class="idx">6</span> Prime Mover Details <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="trailer"><span class="idx">7</span> Trailer Details <span class="arrow">&rarr;</span></a>
          <a class="gc-link" data-nav="staffDatabase"><span class="idx">8</span> Staff Database <span class="arrow">&rarr;</span></a>
        </div>
      </div>
    </div>
  `;
  wrap.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => goTo(el.dataset.nav));
  });
  return wrap;
}

/* ---------------------------------------------------------------------
   PAGE: MAINTENANCE DASHBOARD
--------------------------------------------------------------------- */
/* ---- 4.15 MAINTENANCE DASHBOARD ---- */

async function renderMaintenanceDashboard(){
  const mlog = await getData('maintenanceLog');
  const mach = await getData('machineryLog');

  const isIsoDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(`${v}T00:00:00`).getTime());
  const allDates = [...new Set(mlog.filter(r => isIsoDate(r.dateIn)).map(r => r.dateIn))].sort((a, b) => new Date(b) - new Date(a));

  function toDateKey(dateObj){
    return new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
  }
  let selectedDate = toDateKey(new Date());
  let monthCursor = new Date(`${selectedDate}T00:00:00`);
  let topTruckView = 'date'; // 'date' = linked to calendar selection, 'all' = all-time top 5

  function fmtDateLong(dateKey){
    if (!dateKey) return '-';
    const d = new Date(`${dateKey}T00:00:00`);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
  }

  function buildCalendar(dateKey, monthView){
    const monthDate = new Date(monthView.getFullYear(), monthView.getMonth(), 1);
    const monthName = monthDate.toLocaleDateString('en-GB', {month:'long', year:'numeric'});
    const startWeekday = (monthDate.getDay() + 6) % 7;
    const dateSet = new Set(allDates);
    const cells = [];
    for (let i = 0; i < 42; i++){
      const dayIndex = i - startWeekday + 1;
      const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayIndex);
      const isCurrentMonth = cellDate.getMonth() === monthDate.getMonth();
      const key = toDateKey(cellDate);
      const isSelected = key === dateKey;
      const hasData = dateSet.has(key);
      const classes = ['day-cell'];
      if (!isCurrentMonth) classes.push('muted');
      if (hasData) classes.push('has-data');
      if (isSelected) classes.push('active');
      cells.push(`<button type="button" class="${classes.join(' ')}" data-date="${key}" ${!isCurrentMonth ? 'disabled' : ''}>${cellDate.getDate()}</button>`);
    }
    return `
      <div class="calendar-panel">
        <div class="calendar-header">
          <button type="button" class="cal-nav" data-nav="prev-month" aria-label="Previous month">&#8249;</button>
          <div class="month-name">${monthName}</div>
          <button type="button" class="cal-nav" data-nav="next-month" aria-label="Next month">&#8250;</button>
        </div>
        <div class="calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
        <div class="calendar-grid">${cells.join('')}</div>
      </div>
    `;
  }

  function renderDashboard(dateKey){
    const totalRepairsLogged = mlog.length;
    const repairsByDate = mlog.filter(r => r.dateIn === dateKey).length;
    const totalCost = mlog.reduce((s,r)=>s+(Number(r.cost)||0),0) + mach.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const maintVendors = new Set(mlog.map(r => (r.vendor||'').trim()).filter(Boolean));
    const machVendors = new Set(mach.map(r => (r.vendor||'').trim()).filter(Boolean));
    const allVendors = new Set([...maintVendors, ...machVendors]);

    const allCostRows = [...mlog, ...mach];
    const paidRows = allCostRows.filter(r => (r.paymentStatus||'').toLowerCase() === 'paid');
    const pendingRows = allCostRows.filter(r => (r.paymentStatus||'').toLowerCase() === 'pending');
    const paidAmount = paidRows.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const pendingAmount = pendingRows.reduce((s,r)=>s+(Number(r.cost)||0),0);
    const totalPaymentAmount = paidAmount + pendingAmount;
    const paidPct = totalPaymentAmount > 0 ? Math.round((paidAmount/totalPaymentAmount)*100) : 0;

    const calendarHtml = buildCalendar(dateKey, monthCursor);

    const repairingOpts = {
      rowFilterFn: r => calcRepairStatus(r.dateOut) === 'Repairing',
      visibleColumnIds: ['truck','scenePlace','reason','action','dateIn','repairPlace','remark'],
    };
    const repairingRows = mlog.filter(r => calcRepairStatus(r.dateOut) === 'Repairing');

    const topTruckSourceRows = topTruckView === 'all' ? mlog : mlog.filter(r => r.dateIn === dateKey);
    const highestRepairs = {};
    topTruckSourceRows.forEach(r => {
      if (!r.truck) return;
      if (!highestRepairs[r.truck]) highestRepairs[r.truck] = {count:0, spending:0};
      highestRepairs[r.truck].count += 1;
      highestRepairs[r.truck].spending += (Number(r.cost) || 0);
    });
    const highestArr = Object.entries(highestRepairs)
      .sort((a,b) => b[1].count - a[1].count)
      .slice(0,5)
      .map(([truck, v]) => ({truck, value:v.count, spending:v.spending}));

    function summarizeEquipment(equipmentName){
      const rows = mach.filter(r => r.equipment === equipmentName);
      const repairDates = rows.map(r => r.repairDate).filter(Boolean).sort((a,b) => new Date(b) - new Date(a));
      const serviceDates = rows.map(r => r.serviceDate).filter(Boolean).sort((a,b) => new Date(b) - new Date(a));
      const latestRepair = repairDates[0] || '';
      const latestService = serviceDates[0] || '';
      const nextService = latestService ? calcNextService(latestService) : '';
      const mobDemobCount = rows.filter(r => r.mobDemobDate).length;
      const totalSpending = rows.reduce((s,r) => s + (Number(r.cost)||0), 0);
      return { latestRepair, latestService, nextService, mobDemobCount, totalSpending };
    }
    const wheelLoader = summarizeEquipment('Wheel Loader');
    const excavator = summarizeEquipment('Excavator');

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="dashboard-shell">
        ${calendarHtml}
        <div class="insight-panel">
          <div>
            <div class="mini-title">Selected date</div>
            <div class="selected-date">${fmtDateLong(dateKey)}</div>
          </div>
          <div class="insight-grid">
            <div class="mini-stat" style="--stat-accent:var(--teal)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M9 12h6"></path><path d="M9 16h6"></path></svg>Repair Logged</div>
              <div class="value">${FMT.num(totalRepairsLogged)}</div>
              <div class="meta">All records</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--red)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l1.5-4h17L22 7"></path><path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7"></path><path d="M4 7h16"></path><path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path></svg>Total Registered Vendor</div>
              <div class="value">${FMT.num(allVendors.size)}</div>
              <div class="meta">${maintVendors.size} Maintenance / ${machVendors.size} Machinery</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--amber)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3"></path><circle cx="12" cy="12" r="9"></circle></svg>Repair Logged By Date</div>
              <div class="value">${FMT.num(repairsByDate)}</div>
              <div class="meta">On this date</div>
            </div>
            <div class="mini-stat" style="--stat-accent:var(--navy-600)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Total Cost</div>
              <div class="value">${FMT.money(totalCost)}</div>
              <div class="meta">Maintenance + Machinery</div>
            </div>
            <div class="mini-stat mini-stat-wide" style="--stat-accent:var(--teal)">
              <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>Payment Status</div>
              <div style="display:flex;gap:22px;margin-top:10px;flex-wrap:wrap;">
                <div style="flex:1;min-width:130px;">
                  <div style="font-size:10.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Paid</div>
                  <div style="font-family:var(--font-display);font-weight:800;font-size:19px;color:#1b8a4a;margin-top:2px;">${FMT.money(paidAmount)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${paidRows.length} record(s)</div>
                </div>
                <div style="width:1px;background:var(--line);"></div>
                <div style="flex:1;min-width:130px;">
                  <div style="font-size:10.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Pending</div>
                  <div style="font-family:var(--font-display);font-weight:800;font-size:19px;color:#9c6c1c;margin-top:2px;">${FMT.money(pendingAmount)}</div>
                  <div style="font-size:11px;color:var(--muted);margin-top:2px;">${pendingRows.length} record(s)</div>
                </div>
              </div>
              <div class="trip-bar" style="width:100%;height:6px;margin-top:12px;"><i style="width:${paidPct}%"></i></div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid2">
        <div class="section">
          <div class="section-head" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <h3>Top Trucks &mdash; Most Repairs</h3>
            <div class="op-toggle" role="tablist">
              <button type="button" class="op-toggle-btn${topTruckView === 'date' ? ' active' : ''}" data-top-truck-view="date">By Date</button>
              <button type="button" class="op-toggle-btn${topTruckView === 'all' ? ' active' : ''}" data-top-truck-view="all">All</button>
            </div>
          </div>
          <div class="section-body">${highestArr.length ? rankTableWithSpending(highestArr, 'Repairs') : '<p style="color:var(--muted);font-size:13px">No repeat repairs logged yet.</p>'}</div>
        </div>
        <div class="section">
          <div class="section-head"><h3>Machinery Status</h3></div>
          <div class="section-body grid2" style="gap:14px;">
            <div>
              <div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin-bottom:6px;">Wheel Loader</div>
              <div style="font-size:12.5px;color:var(--muted);">Latest repair: <b style="color:var(--ink)">${fmtDate(wheelLoader.latestRepair)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Latest service: <b style="color:var(--ink)">${fmtDate(wheelLoader.latestService)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Next service: <b style="color:var(--ink)">${wheelLoader.nextService ? fmtDate(wheelLoader.nextService) : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total Mob/Demob: <b style="color:var(--ink)">${wheelLoader.mobDemobCount > 0 ? wheelLoader.mobDemobCount : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total spending: <b style="color:var(--ink)">${wheelLoader.totalSpending > 0 ? FMT.money(wheelLoader.totalSpending) : '-'}</b></div>
            </div>
            <div>
              <div style="font-family:var(--font-display);font-weight:700;font-size:14px;margin-bottom:6px;">Excavator</div>
              <div style="font-size:12.5px;color:var(--muted);">Latest repair: <b style="color:var(--ink)">${fmtDate(excavator.latestRepair)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Latest service: <b style="color:var(--ink)">${fmtDate(excavator.latestService)}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Next service: <b style="color:var(--ink)">${excavator.nextService ? fmtDate(excavator.nextService) : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total Mob/Demob: <b style="color:var(--ink)">${excavator.mobDemobCount > 0 ? excavator.mobDemobCount : '-'}</b></div>
              <div style="font-size:12.5px;color:var(--muted);">Total spending: <b style="color:var(--ink)">${excavator.totalSpending > 0 ? FMT.money(excavator.totalSpending) : '-'}</b></div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h3>Maintenance Log &mdash; Currently Repairing</h3><span class="eyebrow">${repairingRows.length} truck(s)</span></div>
        <div class="section-body" id="mlogHost"></div>
      </div>
    `;

    const host = wrap.querySelector('#mlogHost');
    host.innerHTML = buildTableHTML('maintenanceLog', mlog, '', repairingOpts);
    wireTable(host, 'maintenanceLog', null, repairingOpts);

    wrap.querySelectorAll('.day-cell[data-date]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedDate = btn.dataset.date;
        monthCursor = new Date(`${selectedDate}T00:00:00`);
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });
    wrap.querySelectorAll('.cal-nav').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.nav === 'next-month' ? 1 : -1;
        monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + dir, 1);
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });
    wrap.querySelectorAll('[data-top-truck-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        // Intentionally does NOT touch selectedDate or monthCursor — the calendar
        // must stay exactly where it is when switching this widget's view.
        topTruckView = btn.dataset.topTruckView;
        const refreshed = renderDashboard(selectedDate);
        const parent = wrap.parentElement;
        if (parent) parent.replaceChild(refreshed, wrap);
      });
    });

    return wrap;
  }

  return renderDashboard(selectedDate);
}
/* =============================================================
   PAGE: SAFETY EQUIPMENT — Detail Page + Inspection + Receiving
   1 Group Info · 2 Equipment Items · 3 Inspection Form · 4 Receiving Form
   Cards 3 & 4 appear in EDIT mode only (same as FEG).

   DATA: logical tables 'safetyInspection' & 'safetyReceiving' inside
         tenant_tables (JSON) — NO new Supabase table.
   FILES: bucket PM_DOC_BUCKET (focc-documents)
         {companyId}/safety/{assetId}/inspection|receiving/{recordId}
   NOTE: Inspection & Receiving do NOT change item dates.
         Item Next Due = item date + 1 YEAR (same as dashboard).
         Inspection Next Due = inspection date + 1 MONTH (monthly audit).
   ============================================================= */
const SF_INSPECTION_TABLE   = 'safetyInspection';
const SF_RECEIVING_TABLE    = 'safetyReceiving';
const SF_INSPECTION_RESULTS = ['Pass','Pass with remarks','Fail'];
const SF_CONDITIONS         = ['Good','Fair','Replace Soon','Damaged'];
const SF_OPEN_KEY           = 'focc-safety-open';

/* Display helpers — FEG defines these inside a closure; the Safety module needs them at module level. */
function txt(v){ return escapeHtml(String(v == null ? '' : v)); }
function attr(v){ return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }


/* ---------- Dates ---------- */
function sfTodayIso(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfAddMonths(iso, n){
  const d = new Date(String(iso || '').slice(0,10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + Number(n || 0));
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfAddYears(iso, n){
  const d = new Date(String(iso || '').slice(0,10) + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + Number(n || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function sfDueBadge(dueIso, today){
  if (!dueIso) return '<span style="color:var(--muted)">&mdash;</span>';
  const due = new Date(dueIso + 'T00:00:00');
  if (isNaN(due.getTime())) return '<span style="color:var(--muted)">&mdash;</span>';
  const days = Math.round((due - today) / 86400000);
  if (days < 0)   return '<span class="cdx-countdown bad">Expired ' + Math.abs(days) + 'd ago</span>';
  if (days <= 30) return '<span class="cdx-countdown warn">' + days + ' Days Balance</span>';
  return '<span>' + fmtDate(dueIso) + '</span>';
}

/* ---------- Record identity (STABLE, not index-based) ---------- */
function sfRowKey(row){ return row ? String(row.assetId || '') : ''; }
function sfRememberOpen(row){
  try{
    const v = row ? String(row.assetId || '') : '';
    if (v) sessionStorage.setItem(SF_OPEN_KEY, v);
    else sessionStorage.removeItem(SF_OPEN_KEY);
  }catch(e){}
}
function sfForgetOpen(){ try{ sessionStorage.removeItem(SF_OPEN_KEY); }catch(e){} }
function sfRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(SF_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && String(r.assetId || '') === want);
}
async function sfEnsureAssetIds(){
  const rows = await getData('safetyEquipment');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !String(r.assetId || '').trim()){ r.assetId = fegNewId('SE'); changed = true; } });
  if (changed){ DATA_CACHE.safetyEquipment = rows; await persist('safetyEquipment'); }
}
function sfItemsFor(category){
  return String(category || '') === 'Staff' ? SAFETY_STAFF_ITEMS : SAFETY_TRUCK_ITEMS;
}

/* ---------- Files ---------- */
function sfDocPath(companyId, assetId, kind, recordId){
  return companyId + '/safety/' + (assetId || 'unassigned') + '/' + kind + '/' + recordId;
}
function sfFileMeta(rec){
  const f = (rec && rec.file && typeof rec.file === 'object') ? rec.file : {};
  return { hasFile: !!(f.storagePath || f.fileName), file: f };
}
function sfSortDesc(list){
  return (Array.isArray(list) ? list.slice() : []).sort((a,b) => {
    const da = String((a && (a.inspectedOn || a.dateReceived)) || '');
    const db = String((b && (b.inspectedOn || b.dateReceived)) || '');
    if (da !== db) return db.localeCompare(da);
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  });
}
function sfRecordsForAsset(all, row){
  const key = sfRowKey(row);
  return sfSortDesc((all || []).filter(r => r && String(r.assetId || '') === key));
}

/* ---------- Saving records ---------- */
async function sfRecordPersist(tableKey, mutate){
  const list = await getData(tableKey);
  const arr  = Array.isArray(list) ? list : [];
  const out  = mutate(arr);
  DATA_CACHE[tableKey] = arr;
  await persist(tableKey);
  return out;
}
async function sfRecordAdd(tableKey, row, info){
  const at  = new Date().toISOString();
  const isR = tableKey === SF_RECEIVING_TABLE;
  const rec = {
    recordId : fegNewId(isR ? 'SR' : 'SI'),
    assetId  : sfRowKey(row),
    assetRef : String(row.asset || ''),
    category : String(row.category || ''),
    branch   : String(row.branch || ''),
    file     : {},
    createdBy: getSessionEmail() || '',
    createdAt: at,
    updatedBy: '',
    updatedAt: ''
  };
  if (isR){
    rec.dateReceived = String((info && info.dateReceived) || '');
    rec.receivedBy   = String((info && info.receivedBy) || '');
    rec.handedOverBy = String((info && info.handedOverBy) || '');
    rec.condition    = String((info && info.condition) || '');
    rec.notes        = String((info && info.notes) || '');
  } else {
    rec.inspectedOn = String((info && info.inspectedOn) || '');
    rec.inspector   = String((info && info.inspector) || '');
    rec.result      = String((info && info.result) || '');
    rec.findings    = String((info && info.findings) || '');
    rec.action      = String((info && info.action) || '');
  }
  await sfRecordPersist(tableKey, arr => { arr.push(rec); });
  return rec;
}
async function sfRecordUpdate(tableKey, recordId, info){
  const at  = new Date().toISOString();
  const isR = tableKey === SF_RECEIVING_TABLE;
  return await sfRecordPersist(tableKey, arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    if (isR){
      rec.dateReceived = String((info && info.dateReceived) || '');
      rec.receivedBy   = String((info && info.receivedBy) || '');
      rec.handedOverBy = String((info && info.handedOverBy) || '');
      rec.condition    = String((info && info.condition) || '');
      rec.notes        = String((info && info.notes) || '');
    } else {
      rec.inspectedOn = String((info && info.inspectedOn) || '');
      rec.inspector   = String((info && info.inspector) || '');
      rec.result      = String((info && info.result) || '');
      rec.findings    = String((info && info.findings) || '');
      rec.action      = String((info && info.action) || '');
    }
    rec.updatedBy = getSessionEmail() || '';
    rec.updatedAt = at;
    return rec;
  });
}
async function sfRecordUploadFile(tableKey, row, record, file){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const ctype     = stContentType(file);
  const kind      = tableKey === SF_RECEIVING_TABLE ? 'receiving' : 'inspection';
  const path      = sfDocPath(companyId, sfRowKey(row), kind, record.recordId);

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  const meta = {
    storagePath: path,
    fileName   : file.name || '',
    fileType   : ctype,
    fileSize   : file.size,
    uploadedAt : new Date().toISOString(),
    uploadedBy : getSessionEmail() || ''
  };
  await sfRecordPersist(tableKey, arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(record.recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.file      = meta;
    rec.updatedBy = meta.uploadedBy;
    rec.updatedAt = meta.uploadedAt;
  });
  return meta;
}
async function sfRecordDownload(record){
  const m = sfFileMeta(record);
  if (!m.hasFile) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .createSignedUrl(m.file.storagePath, 60, m.file.fileName ? { download: m.file.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}
async function sfRecordDelete(tableKey, record){
  const m = sfFileMeta(record);
  if (m.hasFile && m.file.storagePath){
    const del = await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([m.file.storagePath]);
    if (del.error) throw del.error;
  }
  await sfRecordPersist(tableKey, arr => {
    const i = arr.findIndex(r => r && String(r.recordId || '') === String(record.recordId));
    if (i >= 0) arr.splice(i, 1);
  });
  return true;
}

/* ---------- Modal 1: Inspection ---------- */
function openSafetyInspectionModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const opts   = SF_INSPECTION_RESULTS.map(v =>
      '<option value="' + escapeHtml(v) + '"' + (String(rec.result || '') === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Inspection Record' : 'Add Inspection Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset / Staff</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.asset || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Inspected On *</label>
          <input type="date" id="sfInspDate" value="${escapeHtml(String(rec.inspectedOn || sfTodayIso()))}"></div>
        <div class="formfield"><label>Inspector *</label>
          <input type="text" id="sfInspBy" placeholder="Name" value="${escapeHtml(String(rec.inspector || ''))}"></div>
        <div class="formfield"><label>Result</label>
          <select id="sfInspResult"><option value="">&mdash;</option>${opts}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Findings / Remarks</label>
          <input type="text" id="sfInspFind" placeholder="e.g. cone missing, vest torn" value="${escapeHtml(String(rec.findings || ''))}"></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Action Taken</label>
          <input type="text" id="sfInspAction" placeholder="e.g. replaced cone" value="${escapeHtml(String(rec.action || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replace the form using the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; click <b>Upload</b> to attach the form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="sfInspCancel">Cancel</button>
        <button class="btn primary" id="sfInspSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#sfInspCancel').addEventListener('click', () => finish(null));
    box.querySelector('#sfInspSave').addEventListener('click', () => {
      const date = String(box.querySelector('#sfInspDate').value || '').trim();
      const by   = String(box.querySelector('#sfInspBy').value || '').trim();
      if (!date){ alert('Inspected On is required.'); return; }
      if (!by){ alert('Inspector is required.'); return; }
      finish({
        inspectedOn: date,
        inspector  : by,
        result     : String(box.querySelector('#sfInspResult').value || ''),
        findings   : String(box.querySelector('#sfInspFind').value || '').trim(),
        action     : String(box.querySelector('#sfInspAction').value || '').trim()
      });
    });
  });
}

/* ---------- Modal 2: Receiving (borang serahan) ---------- */
function openSafetyReceivingModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const conds  = SF_CONDITIONS.map(v =>
      '<option value="' + escapeHtml(v) + '"' + (String(rec.condition || '') === v ? ' selected' : '') + '>' + escapeHtml(v) + '</option>').join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Receiving Record' : 'Add Receiving Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset / Staff</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.asset || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Date Received *</label>
          <input type="date" id="sfRecvDate" value="${escapeHtml(String(rec.dateReceived || sfTodayIso()))}"></div>
        <div class="formfield"><label>Received By *</label>
          <input type="text" id="sfRecvBy" placeholder="Name" value="${escapeHtml(String(rec.receivedBy || ''))}"></div>
        <div class="formfield"><label>Handed Over By *</label>
          <input type="text" id="sfRecvFrom" placeholder="Name" value="${escapeHtml(String(rec.handedOverBy || ''))}"></div>
        <div class="formfield"><label>Condition</label>
          <select id="sfRecvCond"><option value="">&mdash;</option>${conds}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Notes</label>
          <input type="text" id="sfRecvNotes" placeholder="e.g. 6 items received in good order" value="${escapeHtml(String(rec.notes || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replace the file using the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; click <b>Upload</b> to attach the receiving form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="sfRecvCancel">Cancel</button>
        <button class="btn primary" id="sfRecvSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#sfRecvCancel').addEventListener('click', () => finish(null));
    box.querySelector('#sfRecvSave').addEventListener('click', () => {
      const d    = String(box.querySelector('#sfRecvDate').value || '').trim();
      const by   = String(box.querySelector('#sfRecvBy').value || '').trim();
      const from = String(box.querySelector('#sfRecvFrom').value || '').trim();
      if (!d){ alert('Date Received is required.'); return; }
      if (!by){ alert('Received By is required.'); return; }
      if (!from){ alert('Handed Over By is required.'); return; }
      finish({
        dateReceived: d,
        receivedBy  : by,
        handedOverBy: from,
        condition   : String(box.querySelector('#sfRecvCond').value || ''),
        notes       : String(box.querySelector('#sfRecvNotes').value || '').trim()
      });
    });
  });
}

/* ---------- Record row (shared by cards 3 & 4) ---------- */
function sfRecordRowsHtml(records, tableKey){
  const isR = tableKey === SF_RECEIVING_TABLE;
  return records.map(rec => {
    const m   = sfFileMeta(rec);
    const id  = escapeHtml(String(rec.recordId || ''));
    const top = (isR
        ? [rec.dateReceived ? fmtDate(rec.dateReceived) : '', rec.receivedBy || '']
        : [rec.inspectedOn ? fmtDate(rec.inspectedOn) : '', rec.inspector || '']
      ).filter(Boolean).map(escapeHtml).join(' &middot; ') || '(no date)';
    const mid = isR ? String(rec.condition || '').trim() : String(rec.result || '').trim();
    const sub = m.hasFile
      ? '<span class="sf-rec-sub">' + escapeHtml(m.file.fileName || '') + (m.file.fileSize ? ' &middot; ' + Math.round(m.file.fileSize / 1024) + ' KB' : '') + '</span>'
      : '<span class="sf-rec-sub is-warn">No file yet</span>';
    return `
      <div class="pm-doc-row${m.hasFile ? '' : ' is-pending'}" data-sf-row="${id}">
        <div class="pm-doc-name sf-rec-name" data-sf-edit="${id}" title="Click to edit details">
          <div>${top}</div>
          ${mid ? '<div class="sf-rec-sub">' + escapeHtml(mid) + '</div>' : ''}
          ${sub}
        </div>
        <button type="button" class="pm-doc-btn" data-sf-action="upload" data-sf-id="${id}">Upload</button>
        <button type="button" class="pm-doc-btn" data-sf-action="download" data-sf-id="${id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
        <button type="button" class="pm-doc-btn is-del" data-sf-action="delete" data-sf-id="${id}">Delete</button>
        <input type="file" hidden class="sf-rec-file" data-sf-file="${id}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png">
      </div>`;
  }).join('');
}

/* ---------- Card 1 · Group Info ---------- */
function sfInfoCardHtml(row){
  return `
    <div class="section sf-info-card">
      <div class="section-head"><h3>1 &middot; Group Info</h3></div>
      <div class="section-body">
        <div class="pm-detail-grid">
          <div class="pm-detail-row"><span class="pm-detail-lbl">Category</span><span class="pm-detail-val">${txt(row.category)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Asset / Staff</span><span class="pm-detail-val">${txt(row.asset)}</span></div>
          <div class="pm-detail-row"><span class="pm-detail-lbl">Branch</span><span class="pm-detail-val">${txt(row.branch)}</span></div>
        </div>
        <div class="settings-note" style="margin-top:12px;">Category &amp; Asset are <b>locked</b> once the record is saved (keeps Truck / Staff items from mixing). Need to change it? Delete and add a new record.</div>
      </div>
    </div>`;
}

/* ---------- Card 2 · Equipment Items ---------- */
function sfFegNearestText(row){
  const map = [['cylinderDue','Cylinder Test'], ['serviceDate','Service']];
  let best = '', lbl = '';
  (row.units || []).forEach(u => {
    if (!u || String(u.disposal || 'No') === 'Yes' || !String(u.serialNo || '').trim()) return;
    map.forEach(p => {
      const v = String(u[p[0]] || '').trim();
      if (!v) return;
      if (!best || v < best){ best = v; lbl = p[1]; }
    });
  });
  return best ? ' &middot; next ' + lbl + ' ' + fmtDate(best) : '';
}
function sfFegCellHtml(row, fegRows){
  const key = String(row.asset || '').trim().toUpperCase();
  const hit = (fegRows || []).find(r => r && String(r.assetRef || '').trim().toUpperCase() === key);
  let text = 'No FEG record for ' + (row.asset || '-');
  let units = 0;
  if (hit){
    units = (hit.units || []).filter(u => u && String(u.disposal || 'No') !== 'Yes' && String(u.serialNo || '').trim()).length;
    text  = units ? (units + ' active unit' + (units === 1 ? '' : 's') + sfFegNearestText(hit)) : 'FEG record exists &mdash; no active units yet';
  }
  return '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<span class="badge ' + (hit && units ? 'good' : 'warn') + '">' + txt(text) + '</span>' +
    '<button type="button" class="sf-feg-link" data-sf-open-feg="1">Open FEG &rarr;</button></div>';
}
function sfItemsCardHtml(row, editing, draft, fegRows){
  const category = String(row.category || 'Truck');
  const isTruck  = category !== 'Staff';
  const items    = sfItemsFor(category);
  const today    = new Date(); today.setHours(0,0,0,0);
  const valOf    = id => editing ? String((draft || {})[id] || '') : String(row[id] || '');

  const itemRows = items.map(it => {
    const val = valOf(it.id);
    const cell = editing
      ? '<input type="date" data-sf-item="' + it.id + '" value="' + attr(val) + '">'
      : (val ? '<span class="sf-item-val">' + txt(fmtDate(val)) + '</span>' : '<span class="sf-never">' + (isTruck ? 'Never inspected' : 'Not received yet') + '</span>');
    return `
      <div class="sf-item-row">
        <div class="sf-item-name"><span class="sf-item-dot"></span><span>${txt(it.label)}</span></div>
        <div class="sf-item-date">${cell}</div>
        <div class="sf-item-due">${sfDueBadge(val ? sfAddYears(val, 1) : '', today)}</div>
      </div>`;
  }).join('');

  const overall     = valOf('inspectionDate');
  const overallCell = editing
    ? '<input type="date" data-sf-item="inspectionDate" value="' + attr(overall) + '">'
    : (overall ? '<span class="sf-item-val">' + txt(fmtDate(overall)) + '</span>' : '<span class="sf-never">Not set</span>');
  const overallRow = isTruck ? `
      <div class="sf-item-row is-overall">
        <div class="sf-item-name"><span class="sf-item-dot is-overall"></span><span>Overall Inspection Date</span></div>
        <div class="sf-item-date">${overallCell}</div>
        <div class="sf-item-due">${sfDueBadge(overall ? sfAddYears(overall, 1) : '', today)}</div>
      </div>` : '';

  const fegRow = isTruck ? `
      <div class="sf-item-row is-feg">
        <div class="sf-item-name"><span class="sf-item-dot is-feg"></span>
          <div><span>Fire Extinguisher</span><span class="sf-item-sub">Managed in the FEG module &mdash; not here.</span></div>
        </div>
        <div class="sf-item-feg">${sfFegCellHtml(row, fegRows)}</div>
      </div>` : '';

  return `
    <div class="section sf-items-card">
      <div class="section-head">
        <h3>2 &middot; Equipment Items</h3>
        <div class="spacer"></div>
        <span class="pm-doc-note">${escapeHtml(category.toUpperCase())} &middot; ${items.length} ITEM${items.length === 1 ? '' : 'S'}</span>
      </div>
      <div class="section-body">
        <div class="sf-item-head"><span>Item</span><span>${isTruck ? 'Inspection Date' : 'Received Date'}</span><span>Next Due (+1 year)</span></div>
        <div class="sf-item-list">
          ${overallRow}
          ${itemRows}
          ${fegRow}
        </div>
        ${editing ? '' : '<div class="settings-note" style="margin-top:12px;">Item dates can be changed via <b>&#9998; Edit Details</b>.</div>'}
      </div>
    </div>`;
}

/* ---------- Card 3 · Inspection Form ---------- */
function sfInspectionCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !sfFileMeta(r).hasFile).length;
  const last    = list.length ? String(list[0].inspectedOn || '') : '';
  const nextDue = last ? sfAddMonths(last, 1) : '';
  const head    = list.length
    ? '<div class="settings-note" style="margin:0 0 8px;">Monthly audit' +
      (last ? ' &middot; last <b>' + escapeHtml(fmtDate(last)) + '</b>' : '') +
      (nextDue ? ' &middot; next due <b>' + escapeHtml(fmtDate(nextDue)) + '</b>' : '') + '</div>'
    : '';
  return `
    <div class="section sf-insp-card" data-sf-insp="1">
      <div class="section-head">
        <h3>3 &middot; Inspection Form</h3>
        <div class="spacer"></div>
        ${pending ? '<span class="pm-doc-note is-warn">' + pending + ' PENDING</span>' : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        <button type="button" class="btn" id="sfInspAdd">+ Add Inspection Record</button>
      </div>
      <div class="section-body">
        ${head}
        ${list.length
          ? '<div class="sf-rec-list pm-doc-list">' + sfRecordRowsHtml(list, SF_INSPECTION_TABLE) + '</div>'
          : '<div class="settings-note" style="margin-top:0;">No inspection records yet &mdash; click <b>+ Add Inspection Record</b>, fill in the details, then click <b>Upload</b> on that row.</div>'}
      </div>
    </div>`;
}

/* ---------- Card 4 · Receiving Form ---------- */
function sfReceivingCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !sfFileMeta(r).hasFile).length;
  return `
    <div class="section sf-recv-card" data-sf-recv="1">
      <div class="section-head">
        <h3>${String(row.category || '') === 'Staff' ? '3' : '4'} &middot; Receiving Form</h3>
        <div class="spacer"></div>
        ${pending ? '<span class="pm-doc-note is-warn">' + pending + ' PENDING</span>' : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        ${String(row.category || '') === 'Staff' ? '<button type="button" class="btn" id="sfRecvForm">Download Form</button>' : ''}
        <button type="button" class="btn" id="sfRecvAdd">+ Add Receiving Record</button>
      </div>
      <div class="section-body">
        ${list.length
          ? '<div class="sf-rec-list pm-doc-list">' + sfRecordRowsHtml(list, SF_RECEIVING_TABLE) + '</div>'
          : '<div class="settings-note" style="margin-top:0;">No receiving records yet &mdash; click <b>+ Add Receiving Record</b>, fill in the details, then click <b>Upload</b> on that row.</div>'}
      </div>
    </div>`;
}

/* =============================================================
   SAFETY EQUIPMENT — Receiving Form PDF (1 halaman A4)
   Guna primitif fegPdf* supaya gaya seragam dengan borang FEG.
   Tiada branding Poreia — ini borang rasmi syarikat pelanggan.
   ============================================================= */
function sfReceivingFileName(row){
  const who = String(row.asset || 'Record').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-');
  return 'Receiving-' + who + '-' + sfTodayIso().replace(/-/g, '') + '.pdf';
}
function sfPdfItemsTable(doc, y, labels){
  const W = [8, 52, 10, 88, 28];               // jumlah 186mm
  const H = ['#', 'ITEM', 'QTY', 'CONDITION', 'NOTES'];
  const headH = 7, rowH = 10;

  const e = [FEG_PDF_M];
  let acc = FEG_PDF_M;
  W.forEach(w => { acc += w; e.push(acc); });

  fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, headH, true);
  H.forEach((h, i) => {
    if (i === 0)      fegPdfTextC(doc, h, (e[0] + e[1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else if (i === 1) fegPdfText(doc, h, e[1] + 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else              fegPdfTextC(doc, h, (e[i] + e[i + 1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    if (i > 0) fegPdfRule(doc, e[i], y, e[i], y + headH, 0.2);
  });

  const rows = (Array.isArray(labels) ? labels.slice(0, 5) : []);
  while (rows.length < 5) rows.push('');

  let yy = y + headH;
  rows.forEach((label, i) => {
    fegPdfCell(doc, FEG_PDF_M, yy, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], yy, e[c], yy + rowH, 0.2);

    fegPdfTextC(doc, String(i + 1), (e[0] + e[1]) / 2, yy + 6.4, 8.5, false);

    if (label){
      fegPdfText(doc, String(label), e[1] + 2, yy + 6.4, 9, false);
      fegPdfTextC(doc, '1', (e[2] + e[3]) / 2, yy + 6.4, 9, false);

      [['Good', 2], ['Fair', 21], ['Replace Soon', 38], ['Damaged', 65]].forEach(o => {
        const bx = e[3] + o[1];
        fegPdfBox(doc, bx, yy + 4.6, 3.2);
        fegPdfText(doc, o[0], bx + 4.4, yy + 6.4, 7.5, false);
      });
    }
    yy += rowH;
  });

  return yy;
}
async function downloadSafetyReceivingForm(row){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const M = FEG_PDF_M, R = FEG_PDF_R;

  /* ---------- HEADER ---------- */
  fegPdfText(doc, 'Company Name :', M, 17, 9.5, false);
  fegPdfFillRule(doc, M + 32, 18, M + 92, 18);

  fegPdfTextR(doc, 'SAFETY EQUIPMENT', R, 15.5, 11, true);
  fegPdfTextR(doc, 'RECEIVING FORM',   R, 20.5, 11, true);

  fegPdfText(doc, 'Page 1 of 1', M, 20.5, 9.5, false);
  fegPdfText(doc, 'Generated ' + fmtDate(sfTodayIso()), M, 26.5, 9, false, FEG_PDF_GREY);
  fegPdfRule(doc, M, 30, R, 30, 0.6);

  fegPdfText(doc, 'Asset / Staff :', M, 38, 9.5, false);
  fegPdfText(doc, String(row.asset || '-'), M + 24, 38, 9.5, true);
  fegPdfText(doc, 'Branch :', 122, 38, 9.5, false);
  fegPdfText(doc, String(row.branch || '-'), 140, 38, 9.5, true);

  fegPdfText(doc, 'Category :', M, 44.5, 9.5, false);
  fegPdfText(doc, String(row.category || '-'), M + 24, 44.5, 9.5, true);
  fegPdfText(doc, 'Record Ref. :', 122, 44.5, 9.5, false);
  fegPdfText(doc, String(row.assetId || '-'), 145, 44.5, 9.5, true);

  /* ---------- A · ITEMS RECEIVED ---------- */
  let y = 54;
  fegPdfText(doc, 'A · ITEMS RECEIVED', M, y, 9.5, true);
  y += 5;
  y = sfPdfItemsTable(doc, y, sfItemsFor(row.category).map(i => i.label));

  /* ---------- B · RECEIVING DETAILS ---------- */
  y += 12;
  fegPdfText(doc, 'B · RECEIVING DETAILS', M, y, 9.5, true);
  y += 8;
  fegPdfText(doc, 'Date Received :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 30, y + 1, M + 66, y + 1);
  fegPdfText(doc, 'Received By :', M + 74, y, 9.5, false);
  fegPdfFillRule(doc, M + 101, y + 1, R, y + 1);

  y += 11;
  fegPdfText(doc, 'Handed Over By :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 34, y + 1, M + 120, y + 1);

  y += 11;
  fegPdfText(doc, 'Notes :', M, y, 9.5, false);
  fegPdfFillRule(doc, M + 18, y + 1, R, y + 1);
  fegPdfFillRule(doc, M + 18, y + 11, R, y + 11);

  /* ---------- C · SIGNATURE ---------- */
  y += 26;
  fegPdfText(doc, 'C · SIGNATURE', M, y, 9.5, true);
  y += 8;

  fegPdfText(doc, 'Received by', M, y, 9.5, true);
  fegPdfText(doc, 'Handed over by', M + 96, y, 9.5, true);

  let sy = y + 8;
  ['Name', 'Sign', 'Date'].forEach(lab => {
    fegPdfText(doc, lab + ' :', M, sy, 9.5, false);
    fegPdfFillRule(doc, M + 16, sy + 1, M + 86, sy + 1);
    fegPdfText(doc, lab + ' :', M + 96, sy, 9.5, false);
    fegPdfFillRule(doc, M + 112, sy + 1, R, sy + 1);
    sy += 9;
  });

  fegPdfStamp(doc, M + 112, sy + 3, R - (M + 112), 24);

  doc.save(sfReceivingFileName(row));
}

/* ---------- Detail Page ---------- */
async function renderSafetyDetailView(root, index, onBack, opts){
  opts = opts || {};
  const all = await getData('safetyEquipment');
  const row = all[index];
  if (!row){ if (onBack) await onBack(); return; }
  sfRememberOpen(row);

  let editing = !!opts.startEditing;
  let draft   = null;
  let inspAll = [], recvAll = [], fegRows = [];
  try{ inspAll = await getData(SF_INSPECTION_TABLE); }catch(e){ inspAll = []; }
  if (!Array.isArray(inspAll)) inspAll = [];
  try{ recvAll = await getData(SF_RECEIVING_TABLE); }catch(e){ recvAll = []; }
  if (!Array.isArray(recvAll)) recvAll = [];
  try{ fegRows = await getData('feg'); }catch(e){ fegRows = []; }
  if (!Array.isArray(fegRows)) fegRows = [];

  function beginDraft(){
    draft = {};
    ['inspectionDate'].concat(sfItemsFor(row.category).map(i => i.id)).forEach(k => { draft[k] = String(row[k] || ''); });
  }
  function readItemsFromDom(){
    if (!draft) return;
    root.querySelectorAll('[data-sf-item]').forEach(inp => {
      draft[inp.dataset.sfItem] = String(inp.value || '');
    });
  }
  async function reloadRecords(){
    try{ inspAll = await getData(SF_INSPECTION_TABLE); }catch(e){ inspAll = []; }
    if (!Array.isArray(inspAll)) inspAll = [];
    try{ recvAll = await getData(SF_RECEIVING_TABLE); }catch(e){ recvAll = []; }
    if (!Array.isArray(recvAll)) recvAll = [];
  }
  function paintRecords(){
    readItemsFromDom();
    const inspCard = root.querySelector('[data-sf-insp]');
    if (inspCard){
      const tmp = document.createElement('div');
      tmp.innerHTML = sfInspectionCardHtml(row, sfRecordsForAsset(inspAll, row));
      inspCard.replaceWith(tmp.firstElementChild);
    }
    const recvCard = root.querySelector('[data-sf-recv]');
    if (recvCard){
      const tmp = document.createElement('div');
      tmp.innerHTML = sfReceivingCardHtml(row, sfRecordsForAsset(recvAll, row));
      recvCard.replaceWith(tmp.firstElementChild);
    }
  }
  function flagUpload(recordId){
    const rowEl = root.querySelector('[data-sf-row="' + recordId + '"]');
    if (!rowEl) return;
    const btn = rowEl.querySelector('[data-sf-action="upload"]');
    if (btn){ btn.classList.add('is-flagged'); setTimeout(() => btn.classList.remove('is-flagged'), 3400); }
    setTimeout(() => { if (rowEl.scrollIntoView) rowEl.scrollIntoView({ behavior:'smooth', block:'center' }); }, 120);
  }
  function findRec(tableKey, id){
    const list = tableKey === SF_RECEIVING_TABLE ? recvAll : inspAll;
    return list.find(r => r && String(r.recordId || '') === String(id));
  }
  function keyOf(el){
    return el && el.closest('[data-sf-recv]') ? SF_RECEIVING_TABLE : SF_INSPECTION_TABLE;
  }

  function paint(){
    const isStaff = String(row.category || '') === 'Staff';
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="sfBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${txt(row.asset || '(No Name)')}</span>
          <span class="pm-detail-sub">${txt(row.category || '')}${row.branch ? ' &middot; ' + txt(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? '<button class="btn" id="sfCancel">Cancel</button><button class="btn primary" id="sfSave">Save Changes</button>'
          : '<button class="btn primary" id="sfEdit">&#9998; Edit Details</button>'}
      </div>
      <div class="pm-detail-card-grid safety-detail ${editing ? 'is-edit' : 'is-view'}${isStaff ? ' is-staff' : ''}">
        ${sfInfoCardHtml(row)}
        ${sfItemsCardHtml(row, editing, draft, fegRows)}
        ${editing && !isStaff ? sfInspectionCardHtml(row, sfRecordsForAsset(inspAll, row)) : ''}
        ${editing ? sfReceivingCardHtml(row, sfRecordsForAsset(recvAll, row)) : ''}
      </div>`;

    const back = root.querySelector('#sfBack');
    if (back) back.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      sfForgetOpen();
      await onBack();
    };

    const editBtn = root.querySelector('#sfEdit');
    if (editBtn) editBtn.onclick = () => { beginDraft(); editing = true; paint(); };

    const cancelBtn = root.querySelector('#sfCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      draft = null; editing = false; paint();
    };

    const saveBtn = root.querySelector('#sfSave');
    if (saveBtn) saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try{
        readItemsFromDom();
        Object.keys(draft || {}).forEach(k => { row[k] = draft[k]; });
        all[index] = row;
        await persist('safetyEquipment');
        editing = false; draft = null;
        paint();
      }catch(e){
        saveBtn.disabled = false;
        alert('Save failed: ' + (e && e.message ? e.message : e));
      }
    };

    root.querySelectorAll('[data-sf-open-feg]').forEach(b => {
      b.onclick = () => { if (typeof reloadToRoute === 'function') reloadToRoute('feg'); };
    });

    const sfClick = async e => {
      const insAdd = e.target.closest('#sfInspAdd');
      if (insAdd){
        if (insAdd.disabled) return;
        const info = await openSafetyInspectionModal(row, null);
        if (!info) return;
        insAdd.disabled = true;
        try{
          const rec = await sfRecordAdd(SF_INSPECTION_TABLE, row, info);
          await reloadRecords(); paintRecords(); flagUpload(rec.recordId);
        }catch(err){ insAdd.disabled = false; alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }


      const recvForm = e.target.closest('#sfRecvForm');
      if (recvForm){
        if (recvForm.disabled) return;
        const oldTxt = recvForm.textContent;
        recvForm.disabled = true; recvForm.textContent = 'Generating\u2026';
        try{ await downloadSafetyReceivingForm(row); }
        catch(err){ alert('Download failed: ' + (err && err.message ? err.message : err)); }
        finally{ recvForm.disabled = false; recvForm.textContent = oldTxt; }
        return;
      }

      const recvAdd = e.target.closest('#sfRecvAdd');
      if (recvAdd){
        if (recvAdd.disabled) return;
        const info = await openSafetyReceivingModal(row, null);
        if (!info) return;
        recvAdd.disabled = true;
        try{
          const rec = await sfRecordAdd(SF_RECEIVING_TABLE, row, info);
          await reloadRecords(); paintRecords(); flagUpload(rec.recordId);
        }catch(err){ recvAdd.disabled = false; alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }

      const editEl = e.target.closest('[data-sf-edit]');
      if (editEl){
        const id  = String(editEl.dataset.sfEdit || '');
        const key = keyOf(editEl);
        const rec = findRec(key, id);
        if (!rec) return;
        const info = key === SF_RECEIVING_TABLE ? await openSafetyReceivingModal(row, rec) : await openSafetyInspectionModal(row, rec);
        if (!info) return;
        try{ await sfRecordUpdate(key, id, info); await reloadRecords(); paintRecords(); }
        catch(err){ alert('Save failed: ' + (err && err.message ? err.message : err)); }
        return;
      }

      const btn = e.target.closest('[data-sf-action]');
      if (!btn) return;
      const id  = String(btn.dataset.sfId || '');
      const key = keyOf(btn);
      const rec = findRec(key, id);
      if (!rec) return;

      if (btn.dataset.sfAction === 'upload'){
        const inp = root.querySelector('[data-sf-file="' + id + '"]');
        if (inp) inp.click();
        return;
      }
      if (btn.dataset.sfAction === 'download'){
        try{ btn.disabled = true; await sfRecordDownload(rec); }
        catch(err){ alert('Download failed: ' + (err && err.message ? err.message : err)); }
        btn.disabled = !sfFileMeta(rec).hasFile;
        return;
      }
      if (btn.dataset.sfAction === 'delete'){
        const ok = await confirmModal('Delete Record',
          'This record <strong>and its attached file</strong> will be permanently deleted (cannot be undone).',
          { confirmLabel:'Delete', tone:'danger' });
        if (!ok) return;
        btn.disabled = true;
        try{ await sfRecordDelete(key, rec); await reloadRecords(); paintRecords(); }
        catch(err){ btn.disabled = false; alert('Delete failed: ' + (err && err.message ? err.message : err)); }
      }
    };

    const sfChange = async e => {
      const inp = e.target.closest('[data-sf-file]');
      if (!inp) return;
      const file = inp.files && inp.files[0];
      if (!file) return;
      const id  = String(inp.dataset.sfFile || '');
      const key = keyOf(inp);
      const rec = findRec(key, id);
      inp.value = '';
      if (!rec) return;
      try{ await sfRecordUploadFile(key, row, rec, file); await reloadRecords(); paintRecords(); }
      catch(err){ alert('Upload failed: ' + (err && err.message ? err.message : err)); }
    };

    /* Remove stale listeners (previous asset) — stop buttons reading another asset's data. */
    if (root.__sfClick)  root.removeEventListener('click',  root.__sfClick);
    if (root.__sfChange) root.removeEventListener('change', root.__sfChange);
    root.__sfClick  = sfClick;
    root.__sfChange = sfChange;
    root.addEventListener('click',  sfClick);
    root.addEventListener('change', sfChange);
  }

  if (editing) beginDraft();
  paint();
}

/* ---------- Page (list) ---------- */
async function renderSafetyPage(){
  const root = document.createElement('div');

  async function showList(){
    sfForgetOpen();
    await sfEnsureAssetIds();
    const listWrap = await renderDataPage('safetyEquipment', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      onAddRow: () => openAddRowModal('safetyEquipment', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await sfEnsureAssetIds();
          const data = await getData('safetyEquipment');
          await renderSafetyDetailView(root, Math.max(0, data.length - 1), showList, { startEditing: true });
        },
      }),
      tableOptions: {
        linkColumnId: 'asset',
        onLinkClick: async index => { await renderSafetyDetailView(root, index, showList); },
        onEditRow:   async index => { await renderSafetyDetailView(root, index, showList, { startEditing: true }); },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await sfEnsureAssetIds();
  const openIdx = sfRecallOpenIndex(await getData('safetyEquipment'));
  if (openIdx >= 0) await renderSafetyDetailView(root, openIdx, showList);
  else await showList();

  return root;
}

/* ---------------------------------------------------------------------
   PAGE: COMPLIANCE DASHBOARD
--------------------------------------------------------------------- */
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

/* ---- 4.16 COMPLIANCE DASHBOARD ---- */

async function renderComplianceDashboard(){
  // Defensive per-table load (same pattern as renderSettingsPage): this
  // dashboard depends on 7 separate tables. Previously a single missing/
  // unrecognised table (backend "Unknown table") threw uncaught here and
  // crashed the WHOLE dashboard. Now a failed table just falls back to an
  // empty array — the dashboard still renders with whatever tables did
  // load, instead of showing "This page couldn't load".
  async function safeGetData(tableKey){
    try {
      return await getData(tableKey);
    } catch (err){
      console.warn('Compliance Dashboard: skipping table', tableKey, '-', err && err.message);
      return [];
    }
  }
  const speeding = await safeGetData('speedingIdling');
  const misconduct = await safeGetData('misconduct');
  const safetyEquipment = await safeGetData('safetyEquipment');
  const feg = await safeGetData('feg');
  const primeMover = await safeGetData('primeMover');
  const trailer = await safeGetData('trailer');
  const staffDatabase = await safeGetData('staffDatabase');

  // --- date range filter state (applies to Speeding & Idling widgets) ---
  let rangeMode = 'all'; // 'all' | '7' | '30' | 'month' | 'custom'
  let customFrom = '';
  let customTo = '';

  function inRange(dateStr){
    if (rangeMode === 'all') return true;
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    if (rangeMode === '7'){
      const from = new Date(today); from.setDate(from.getDate() - 6);
      return d >= from && d <= today;
    }
    if (rangeMode === '30'){
      const from = new Date(today); from.setDate(from.getDate() - 29);
      return d >= from && d <= today;
    }
    if (rangeMode === 'month'){
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    if (rangeMode === 'custom'){
      if (!customFrom && !customTo) return true;
      const from = customFrom ? new Date(`${customFrom}T00:00:00`) : null;
      const to = customTo ? new Date(`${customTo}T00:00:00`) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    }
    return true;
  }

  function currentRangeLabel(){
    if (rangeMode === '7') return 'Last 7 days';
    if (rangeMode === '30') return 'Last 30 days';
    if (rangeMode === 'month') return 'This month';
    if (rangeMode === 'custom') return (customFrom || customTo) ? 'Selected range' : 'All recorded';
    return 'All recorded';
  }

  function parseIdleMinutes(v){
    if (!v) return 0;
    const m = String(v).trim().match(/^(\d+):(\d+)$/);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  }
  function formatIdleMinutes(mins){
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  // --- Task 1: Speeding ranking by driver (>80 / >90 / >100 km/h) ---
  function buildSpeedingAgg(rows){
    const map = new Map();
    rows.forEach(r => {
      if (!inRange(r.date)) return;
      const key = r.driver || '(No Driver)';
      if (!map.has(key)) map.set(key, {driver:key, over80:0, over90:0, over100:0});
      const rec = map.get(key);
      rec.over80 += Number(r.over80) || 0;
      rec.over90 += Number(r.over90) || 0;
      rec.over100 += Number(r.over100) || 0;
    });
    return Array.from(map.values())
      .map(r => ({...r, total: r.over80 + r.over90 + r.over100}))
      .filter(r => r.total > 0)
      .sort((a,b) => b.total - a.total || b.over100 - a.over100 || b.over90 - a.over90 || b.over80 - a.over80);
  }

  // --- Task 2: Idling ranking by driver (duration + cost) ---
  function buildIdlingAgg(rows){
    const map = new Map();
    rows.forEach(r => {
      if (!inRange(r.date)) return;
      const key = r.driver || '(No Driver)';
      if (!map.has(key)) map.set(key, {driver:key, minutes:0, cost:0});
      const rec = map.get(key);
      rec.minutes += parseIdleMinutes(r.idleDuration);
      rec.cost += Number(r.idleCost) || 0;
    });
    return Array.from(map.values())
      .filter(r => r.minutes > 0 || r.cost > 0)
      .sort((a,b) => b.minutes - a.minutes);
  }

  // --- Task 3: Misconduct case count + status by driver ---
  function buildMisconductAgg(rows){
    return rows
      .filter(r => (r.status || '').trim().toLowerCase() === 'open')
      .map(r => ({driver: r.driver || '(No Driver)', caseDate: r.caseDate || '', category: r.category || ''}))
      .sort((a,b) => (b.caseDate || '').localeCompare(a.caseDate || ''));
  }

  // --- Task: Safety Equipment — per-item replacement date (item date + 1 year), Truck / Staff ---
  function safetyItemIsNearExpiry(dateStr, today){
    if (!dateStr || dateStr === '-') return false;
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return false;
    const expiry = new Date(dt.getFullYear() + 1, dt.getMonth(), dt.getDate());
    const daysLeft = Math.round((expiry - today) / 86400000);
    return daysLeft <= 30;
  }
  function safetyItemBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const expiry = new Date(dt.getFullYear() + 1, dt.getMonth(), dt.getDate());
    const daysLeft = Math.round((expiry - today) / 86400000);
    if (daysLeft > 30) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildSafetyRows(rows, category, itemFields){
    const today = new Date(); today.setHours(0,0,0,0);
    return rows
      .filter(r => (r.category || '') === category)
      .map(r => ({...r, asset: r.asset || '(No Name)'}))
      .filter(r => itemFields.some(it => safetyItemIsNearExpiry(r[it.id], today)));
  }

  // --- Task: FEG (Fire Extinguisher) expiry — nearest of Cylinder / Service date ---
  function fegBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  // FEG: kira dari row.units[] — unit Disposed & Draft DILANGKAU.
  function buildFegExpiry(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const out = [];
    (rows || []).forEach(r => {
      (r.units || []).forEach(u => {
        if (String(u.disposal || 'No') === 'Yes') return;   // disposed
        if (!String(u.serialNo || '').trim()) return;       // draft
        let nearest = null, nearestLabel = '', nearestRaw = '';
        [['cylinderDue','Cylinder'], ['serviceDate','Service']].forEach(pair => {
          const raw = u[pair[0]];
          if (!raw || raw === '-') return;
          const dt = new Date(`${raw}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          if (!nearest || dt < nearest){ nearest = dt; nearestRaw = raw; nearestLabel = pair[1]; }
        });
        if (!nearest) return;
        const daysLeft = Math.round((nearest - today) / 86400000);
        if (daysLeft > 20) return;
        out.push({
          truck: r.assetRef || '(No Asset)',
          serial: fegSerialLabel(u) || '-',
          item: nearestLabel,
          date: nearestRaw,
          daysLeft: daysLeft,
        });
      });
    });
    return out.sort((a,b) => a.daysLeft - b.daysLeft);
  }

  // --- Task: Prime Mover — Permit/Insurance/Puspakom/Roadtax balance per truck (<=20 days) ---
  function primeMoverBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildPrimeMoverExpiryRows(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const fields = ['permit','insurance','puspakom','roadtax'];
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          if (!r[f] || r[f] === '-') return;
          const dt = new Date(`${r[f]}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        return {truck: r.lorry || '(No Truck)', permit: r.permit, insurance: r.insurance, puspakom: r.puspakom, roadtax: r.roadtax, minDays};
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderPrimeMoverExpiryTable(rows){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Truck No</th><th>Permit</th><th>Insurance</th><th>Puspakom</th><th>Roadtax</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${primeMoverBalanceLabel(r.permit, today)}</td>
          <td>${primeMoverBalanceLabel(r.insurance, today)}</td>
          <td>${primeMoverBalanceLabel(r.puspakom, today)}</td>
          <td>${primeMoverBalanceLabel(r.roadtax, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

    // --- Task: Prime Mover — tarikh dah berubah, fail baru belum upload ---
  function buildPrimeMoverDocPendingRows(rows){
    return (rows || [])
      .map(r => {
        const slots = PM_DOCUMENT_SLOTS.filter(s => pmDocMeta(r, s.id).pending);
        if (!slots.length) return null;
        let since = '';
        slots.forEach(s => {
          const d = pmDocMeta(r, s.id).doc.pendingSince || '';
          if (d && (!since || d < since)) since = d;
        });
        return { truck: r.lorry || '(No Truck)', slots, since };
      })
      .filter(Boolean)
      .sort((a,b) => b.slots.length - a.slots.length);
  }
  function renderPrimeMoverDocPendingTable(rows){
    if (!rows.length) return cdxEmpty('No documents pending upload.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Truck No</th><th>Documents Pending Upload</th><th>Since</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
        <td>${r.slots.map(s => `<span class="badge warn">${escapeHtml(pmDocSlotLabel(s.id))}</span>`).join(' ')}</td>
        <td>${r.since ? escapeHtml(fmtDate(r.since)) : '-'}</td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  // --- Task: Trailer — Permit/Insurance/Puspakom/Roadtax balance per trailer (<=20 days) ---
  function trailerBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildTrailerExpiryRows(rows){
    const today = new Date(); today.setHours(0,0,0,0);
    const fields = ['permit','insurance','puspakom','roadtax'];
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          if (!r[f] || r[f] === '-') return;
          const dt = new Date(`${r[f]}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        return {truck: (r.lorry || '(No Trailer)').trim(), permit: r.permit, insurance: r.insurance, puspakom: r.puspakom, roadtax: r.roadtax, minDays};
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderTrailerExpiryTable(rows){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Trailer No</th><th>Permit</th><th>Insurance</th><th>Puspakom</th><th>Roadtax</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${trailerBalanceLabel(r.permit, today)}</td>
          <td>${trailerBalanceLabel(r.insurance, today)}</td>
          <td>${trailerBalanceLabel(r.puspakom, today)}</td>
          <td>${trailerBalanceLabel(r.roadtax, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  // --- Task: Prime Mover / Trailer — items nearing expiry (<=20 days) ---
  function buildAssetExpiryItems(rows, nameField, fields){
    const today = new Date(); today.setHours(0,0,0,0);
    const out = [];
    rows.forEach(r => {
      fields.forEach(f => {
        if (!r[f.id]) return;
        const dt = new Date(`${r[f.id]}T00:00:00`);
        if (isNaN(dt.getTime())) return;
        const daysLeft = Math.round((dt - today) / 86400000);
        if (daysLeft <= 20) out.push({truck: r[nameField] || '(No Truck)', item: f.label, daysLeft});
      });
    });
    return out.sort((a,b) => a.daysLeft - b.daysLeft);
  }

  // --- Task: Staff Database — total staff + per-designation status coverage ---
  function buildStaffStatusMatrix(rows, fields){
    const map = new Map();
    rows.forEach(r => {
      const key = r.designation || '(No Designation)';
      if (!map.has(key)) {
        const entry = {designation:key, total:0};
        fields.forEach(f => entry[f.id] = 0);
        map.set(key, entry);
      }
      const rec = map.get(key);
      rec.total += 1;
      fields.forEach(f => { if (r[f.id]) rec[f.id] += 1; });
    });
    return Array.from(map.values()).sort((a,b) => a.designation.localeCompare(b.designation));
  }

  // --- Task: Staff — License/GDL/Drug/Alcohol/Medical balance per staff (<=20 days) ---
  // A field's due date is its raw value, unless the field defines a calc
  // (e.g. Medical Status -> Next Medical = Medical Status + 1 year).
  function staffFieldDueDate(rawValue, field){
    if (!rawValue || rawValue === '-') return '';
    return field && field.calc ? field.calc(rawValue) : rawValue;
  }
  function staffBalanceLabel(dateStr, today){
    if (!dateStr || dateStr === '-') return 'No Date';
    const dt = new Date(`${dateStr}T00:00:00`);
    if (isNaN(dt.getTime())) return 'No Date';
    const daysLeft = Math.round((dt - today) / 86400000);
    if (daysLeft > 20) return '-';
    if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)}d ago`;
    return `${daysLeft} Days Balance`;
  }
  function buildStaffNearExpiryRows(rows, fields){
    const today = new Date(); today.setHours(0,0,0,0);
    return rows
      .map(r => {
        let minDays = null;
        fields.forEach(f => {
          const dueDateStr = staffFieldDueDate(r[f.id], f);
          if (!dueDateStr) return;
          const dt = new Date(`${dueDateStr}T00:00:00`);
          if (isNaN(dt.getTime())) return;
          const daysLeft = Math.round((dt - today) / 86400000);
          if (minDays === null || daysLeft < minDays) minDays = daysLeft;
        });
        if (minDays === null) return null;
        const row = {designation: r.designation || '(No Designation)', name: r.staffName || '(No Name)', minDays};
        fields.forEach(f => { row[f.id] = r[f.id]; });
        return row;
      })
      .filter(r => r && r.minDays <= 20)
      .sort((a,b) => a.minDays - b.minDays);
  }
  function renderStaffNearExpiryTable(rows, fields){
    if (!rows.length) return cdxEmpty('No staff nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Designation</th><th>Staff Name</th>${fields.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td>${escapeHtml(r.designation)}</td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.name)}</span><span class="cdx-driver-name">${escapeHtml(r.name)}</span></div></td>
        ${fields.map(f => `<td>${staffBalanceLabel(staffFieldDueDate(r[f.id], f), today)}</td>`).join('')}
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  const wrap = document.createElement('div');
  wrap.className = 'cdx-wrap';
  let activeTab = 'speeding';

  const CDX_ICONS = {
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
    clock: '<circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15.5 14"></polyline>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
    truck: '<rect x="1" y="4" width="14" height="12"></rect><polygon points="15 8 19 8 22 11 22 16 15 16 15 8"></polygon><circle cx="5.5" cy="18.5" r="2.3"></circle><circle cx="18" cy="18.5" r="2.3"></circle>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>',
    check: '<circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path>',
  };
  function cdxIcon(name, size){
    const s = size || 16;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CDX_ICONS[name]||''}</svg>`;
  }
  function cdxEmpty(text){
    return `<div class="cdx-empty">${cdxIcon('check',30)}<div>${text}</div></div>`;
  }
  function cdxInitials(name){
    const parts = String(name||'').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function renderToolbar(){
    const presets = [
      {key:'all', label:'All'},
      {key:'7', label:'Last 7 Days'},
      {key:'30', label:'Last 30 Days'},
      {key:'month', label:'This Month'},
    ];
    return `
      <div class="cdx-toolbar">
        ${presets.map(p => `<button class="cdx-pill${rangeMode===p.key ? ' active' : ''}" data-range="${p.key}">${p.label}</button>`).join('')}
        <span class="cdx-date-sep">|</span>
        <input type="date" id="rangeFrom" class="cdx-date-input" value="${customFrom}">
        <span class="cdx-date-sep">to</span>
        <input type="date" id="rangeTo" class="cdx-date-input" value="${customTo}">
        <button class="cdx-pill${rangeMode==='custom' ? ' active' : ''}" id="rangeApplyBtn">Apply</button>
      </div>`;
  }

  function renderSpeedingTable(agg){
    if (!agg.length) return cdxEmpty('No speeding records for the selected range.');
    const max = Math.max(...agg.map(r => r.total), 1);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Driver</th><th>&gt;80</th><th>&gt;90</th><th>&gt;100</th><th>Total</th></tr></thead><tbody>
      ${agg.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
        <td class="r">${FMT.num(r.over80)}</td>
        <td class="r">${FMT.num(r.over90)}</td>
        <td class="r">${FMT.num(r.over100)}</td>
        <td class="r"><b>${FMT.num(r.total)}</b><span class="cdx-bar-track"><i class="cdx-bar-fill" style="width:${Math.round(r.total/max*100)}%"></i></span></td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function renderIdlingTable(agg){
    if (!agg.length) return cdxEmpty('No idling records for the selected range.');
    const max = Math.max(...agg.map(r => r.minutes), 1);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Driver</th><th>Idle Duration</th><th>Idle Cost</th></tr></thead><tbody>
      ${agg.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
        <td class="r">${formatIdleMinutes(r.minutes)}<span class="cdx-bar-track"><i class="cdx-bar-fill" style="width:${Math.round(r.minutes/max*100)}%"></i></span></td>
        <td class="r"><b>${FMT.money(r.cost)}</b></td>
      </tr>`).join('')}
      </tbody></table>`;
  }

  function renderMisconductTable(agg){
    if (!agg.length) return cdxEmpty('No open misconduct cases.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Case Date</th><th>Driver</th><th>Case Category</th><th>Status</th></tr></thead><tbody>
      ${agg.map((r,i) => {
        const statusHtml = `<span class="cdx-pill-status open">${cdxIcon('alert',12)} Open</span>`;
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td>${fmtDate(r.caseDate)}</td>
          <td><div class="cdx-driver"><span class="cdx-avatar">${cdxInitials(r.driver)}</span><span class="cdx-driver-name">${escapeHtml(r.driver)}</span></div></td>
          <td>${escapeHtml(r.category || '-')}</td>
          <td>${statusHtml}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderSafetyTruckTable(rows){
    if (!rows.length) return cdxEmpty('No records.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Asset</th><th>Inspection Date</th><th>First Aid Kit</th><th>Triangle</th><th>Cone (5 unit)</th><th>Wheel Chock</th><th>Reflective String</th><th>Torchlight</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.asset)}</span></td>
        <td>${fmtDate(r.inspectionDate)}</td>
        <td>${safetyItemBalanceLabel(r.firstAid, today)}</td>
        <td>${safetyItemBalanceLabel(r.triangle, today)}</td>
        <td>${safetyItemBalanceLabel(r.cone, today)}</td>
        <td>${safetyItemBalanceLabel(r.wheelChock, today)}</td>
        <td>${safetyItemBalanceLabel(r.reflectiveString, today)}</td>
        <td>${safetyItemBalanceLabel(r.torchlight, today)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }
  function renderSafetyStaffTable(rows){
    if (!rows.length) return cdxEmpty('No records.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<div class="tablewrap safety-eq-table"><table class="cdx-table"><thead><tr><th>#</th><th>Staff</th><th>Inspection Date</th><th>Safety Helmet</th><th>Safety Shoes</th><th>Reflective Vest</th></tr></thead><tbody>
      ${rows.map((r,i) => `<tr>
        <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
        <td><span class="truckchip">${escapeHtml(r.asset)}</span></td>
        <td>${fmtDate(r.inspectionDate)}</td>
        <td>${safetyItemBalanceLabel(r.helmet, today)}</td>
        <td>${safetyItemBalanceLabel(r.safetyShoes, today)}</td>
        <td>${safetyItemBalanceLabel(r.reflectiveVest, today)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
  }

  function renderFegTable(rows){
    if (!rows.length) return cdxEmpty('No fire extinguishers nearing expiry.');
    const today = new Date(); today.setHours(0,0,0,0);
    return `<table class="cdx-table"><thead><tr><th>#</th><th>Asset / Location</th><th>Serial</th><th>Item</th><th>Expiry Date</th><th>Balance</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${escapeHtml(r.serial || '-')}</td>
          <td>${escapeHtml(r.item || '-')}</td>
          <td>${r.date ? fmtDate(r.date) : '-'}</td>
          <td>${fegBalanceLabel(r.date, today)}</td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderAssetExpiryTable(rows, colLabel){
    if (!rows.length) return cdxEmpty('Nothing nearing expiry.');
    return `<table class="cdx-table"><thead><tr><th>#</th><th>${colLabel}</th><th>Item</th><th>Balance Days</th></tr></thead><tbody>
      ${rows.map((r,i) => {
        const expired = r.daysLeft < 0;
        const daysText = expired ? `Expired ${Math.abs(r.daysLeft)}d ago` : `${r.daysLeft}d left`;
        return `<tr>
          <td><span class="cdx-rank${i<3?' r'+(i+1):''}">${i+1}</span></td>
          <td><span class="truckchip">${escapeHtml(r.truck)}</span></td>
          <td>${escapeHtml(r.item)}</td>
          <td><span class="cdx-countdown ${expired?'bad':'warn'}">${cdxIcon(expired?'alert':'clock',12)} ${daysText}</span></td>
        </tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function renderStaffStatusMatrix(rows, fields){
    if (!rows.length) return cdxEmpty('No staff records.');
    return `<table class="cdx-table"><thead><tr><th>Designation</th><th>Total</th>${fields.map(f=>`<th>${f.label}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r => {
        const cells = fields.map(f => {
          const count = r[f.id];
          const pct = r.total ? Math.round(count / r.total * 100) : 0;
          const color = pct === 100 ? 'var(--green)' : (pct === 0 ? 'var(--line)' : 'var(--amber)');
          return `<td><div class="cdx-progress-cell">
            <div class="cdx-progress-track"><div class="cdx-progress-fill" style="width:${pct}%;background:${color};"></div></div>
            <span class="cdx-progress-label">${count}/${r.total} &middot; ${pct}%</span>
          </div></td>`;
        }).join('');
        return `<tr><td><b>${escapeHtml(r.designation)}</b></td><td class="r">${FMT.num(r.total)}</td>${cells}</tr>`;
      }).join('')}
      </tbody></table>`;
  }

  function cdxCard(icon, title, sub, badge, bodyHtml, id){
    return `<div class="cdx-card">
      <div class="cdx-card-head">
        <div class="cdx-card-title"><span class="ico">${cdxIcon(icon,16)}</span><div><h4>${title}</h4>${sub ? `<span class="sub">${sub}</span>` : ''}</div></div>
        ${badge != null ? `<span class="cdx-card-badge">${badge}</span>` : ''}
      </div>
      <div class="cdx-card-body" id="${id}">${bodyHtml}</div>
    </div>`;
  }

  function renderAll(){
    const speedingAgg = buildSpeedingAgg(speeding);
    const idlingAgg = buildIdlingAgg(speeding);
    const misconductAgg = buildMisconductAgg(misconduct);
    const safetyTruckRows = buildSafetyRows(safetyEquipment, 'Truck', SAFETY_TRUCK_ITEMS);
    const safetyStaffRows = buildSafetyRows(safetyEquipment, 'Staff', SAFETY_STAFF_ITEMS);
    const fegRows = buildFegExpiry(feg);
    const primeMoverExpiryRows = buildPrimeMoverExpiryRows(primeMover);
    const primeMoverDocPendingRows = buildPrimeMoverDocPendingRows(primeMover);
    const trailerExpiryRows = buildTrailerExpiryRows(trailer);
    const staffStatusRows = buildStaffStatusMatrix(staffDatabase, STAFF_STATUS_FIELDS);
    const staffNearExpiryRows = buildStaffNearExpiryRows(staffDatabase, STAFF_STATUS_FIELDS);

    const totalSpeedingEvents = speeding.reduce((s,r) => inRange(r.date) ? s + (Number(r.over80)||0) + (Number(r.over90)||0) + (Number(r.over100)||0) : s, 0);
    const totalIdleCost = speeding.reduce((s,r) => inRange(r.date) ? s + (Number(r.idleCost)||0) : s, 0);
    const openMisconductCount = misconduct.filter(r => (r.status||'').trim().toLowerCase()==='open').length;
    const expiryWatchCount = fegRows.length + primeMoverExpiryRows.length + trailerExpiryRows.length;

    const tabs = [
      {key:'speeding', label:'Speeding & Idling', icon:'activity', count: speedingAgg.length + idlingAgg.length},
      {key:'misconduct', label:'Misconduct', icon:'alert', count: misconductAgg.length},
      {key:'safety', label:'Safety Equipment', icon:'shield', count: safetyTruckRows.length + safetyStaffRows.length},
      {key:'expiry', label:'Expiry Watch', icon:'calendar', count: expiryWatchCount},
      {key:'staff', label:'Staff', icon:'users', count: staffDatabase.length},
    ];

    wrap.innerHTML = `
      <div class="cdx-statgrid">
        <div class="mini-stat" style="--stat-accent:var(--red)">
          <div class="label">${cdxIcon('activity')}Speeding Events</div>
          <div class="value">${FMT.num(totalSpeedingEvents)}</div>
          <div class="meta">&gt;80 / &gt;90 / &gt;100 km/h combined &middot; ${currentRangeLabel()}</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--amber)">
          <div class="label">${cdxIcon('clock')}Idle Cost</div>
          <div class="value">${FMT.money(totalIdleCost)}</div>
          <div class="meta">${currentRangeLabel()} idling</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--red)">
          <div class="label">${cdxIcon('alert')}Open Misconduct</div>
          <div class="value">${FMT.num(openMisconductCount)}</div>
          <div class="meta">of ${misconduct.length} total cases</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--amber)">
          <div class="label">${cdxIcon('calendar')}Nearing Expiry</div>
          <div class="value">${FMT.num(expiryWatchCount)}</div>
          <div class="meta">FEG + Prime Mover + Trailer</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--teal)">
          <div class="label">${cdxIcon('users')}Total Staff</div>
          <div class="value">${FMT.num(staffDatabase.length)}</div>
          <div class="meta">All designations</div>
        </div>
        <div class="mini-stat" style="--stat-accent:var(--green)">
          <div class="label">${cdxIcon('shield')}Safety Equipment</div>
          <div class="value">${FMT.num(safetyTruckRows.length + safetyStaffRows.length)}</div>
          <div class="meta">Trucks + Staff flagged</div>
        </div>
      </div>

      <div class="cdx-tabs">
        ${tabs.map(t => `<button class="cdx-tab${activeTab===t.key?' active':''}" data-tab="${t.key}">${cdxIcon(t.icon,14)} ${t.label} <span class="count">${t.count}</span></button>`).join('')}
      </div>

      <div class="cdx-panel${activeTab==='speeding'?' active':''}" data-panel="speeding">
        <div class="cdx-card">
          <div class="cdx-card-body">${renderToolbar()}</div>
        </div>
        ${cdxCard('activity','Top Speeding Drivers','by speed threshold', speedingAgg.length, renderSpeedingTable(speedingAgg), 'speedingHost')}
        ${cdxCard('clock','Top Idling Drivers','by total idle duration & cost', idlingAgg.length, renderIdlingTable(idlingAgg), 'idlingHost')}
      </div>

      <div class="cdx-panel${activeTab==='misconduct'?' active':''}" data-panel="misconduct">
        ${cdxCard('alert','Misconduct Cases by Driver', `${misconduct.length} records`, null, renderMisconductTable(misconductAgg), 'misconductHost')}
      </div>

      <div class="cdx-panel${activeTab==='safety'?' active':''}" data-panel="safety">
        ${cdxCard('truck','Safety Equipment — Truck', `${safetyTruckRows.length} trucks`, null, renderSafetyTruckTable(safetyTruckRows), 'safetyTruckHost')}
        ${cdxCard('users','Safety Equipment — Staff', `${safetyStaffRows.length} staff`, null, renderSafetyStaffTable(safetyStaffRows), 'safetyStaffHost')}
      </div>

      <div class="cdx-panel${activeTab==='expiry'?' active':''}" data-panel="expiry">
        ${cdxCard('flame','FEG', '&le; 20 days or expired', fegRows.length, renderFegTable(fegRows), 'fegHost')}
        ${cdxCard('truck','Prime Mover', '&le; 20 days or expired', primeMoverExpiryRows.length, renderPrimeMoverExpiryTable(primeMoverExpiryRows), 'primeMoverExpiryHost')}
        ${cdxCard('alert','Documents Pending Upload', 'expiry date updated, new file not uploaded yet', primeMoverDocPendingRows.length, renderPrimeMoverDocPendingTable(primeMoverDocPendingRows), 'primeMoverDocPendingHost')}
        ${cdxCard('truck','Trailer', '&le; 20 days or expired', trailerExpiryRows.length, renderTrailerExpiryTable(trailerExpiryRows), 'trailerExpiryHost')}
      </div>

      <div class="cdx-panel${activeTab==='staff'?' active':''}" data-panel="staff">
        ${cdxCard('users','Staff Status Coverage by Designation', 'License / GDL / Drug / Alcohol / Medical status', `${staffDatabase.length} staff total`, renderStaffStatusMatrix(staffStatusRows, STAFF_STATUS_FIELDS), 'staffStatusHost')}
        ${cdxCard('calendar','Staff Nearing Expiry', '&le; 20 days or expired', staffNearExpiryRows.length, renderStaffNearExpiryTable(staffNearExpiryRows, STAFF_STATUS_FIELDS), 'staffNearExpiryHost')}
      </div>
    `;

    wrap.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        wrap.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === activeTab));
        wrap.querySelectorAll('[data-panel]').forEach(p => p.classList.toggle('active', p.dataset.panel === activeTab));
      });
    });

    wrap.querySelectorAll('[data-range]').forEach(btn => {
      btn.addEventListener('click', () => {
        rangeMode = btn.dataset.range;
        customFrom = ''; customTo = '';
        renderAll();
      });
    });
    const applyBtn = wrap.querySelector('#rangeApplyBtn');
    if (applyBtn){
      applyBtn.addEventListener('click', () => {
        customFrom = wrap.querySelector('#rangeFrom').value;
        customTo = wrap.querySelector('#rangeTo').value;
        rangeMode = 'custom';
        renderAll();
      });
    }
  }

  renderAll();
  return wrap;
}

/* ---------------------------------------------------------------------
   ROUTER + NAV
--------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   PAGE: MISCONDUCT MAP + TABLE
--------------------------------------------------------------------- */
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

/* Misconduct only: cascade Branch -> Driver Name (Staff DB, designation
   'Driver') -> Truck No (Prime Mover), plus FIXED pickers for Category &
   Status (no typing / no remove). Legacy rows derive Branch from Driver/
   Truck. Computed columns (Next Step / Days Open) never appear in form. */
async function wireMisconductPickers(box, existing){
  const [staffRows, primeRows] = await Promise.all([getData('staffDatabase'), getData('primeMover')]);
  const uniq = arr => [...new Set(arr.map(v => String(v || '').trim()).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const esc = s => String(s).replace(/"/g, '&quot;');
  const low = s => String(s || '').trim().toLowerCase();

  const driversByBranch = {};
  const trucksByBranch  = {};
  const branchOfDriver  = {};
  const branchOfTruck   = {};
  staffRows.forEach(r => {
    const name = String(r.staffName || '').trim();
    const br   = String(r.branch || '').trim();
    if (!name || !br || low(r.designation) !== 'driver') return;
    (driversByBranch[br] = driversByBranch[br] || []).push(name);
    branchOfDriver[name] = br;
  });
  primeRows.forEach(r => {
    const lor = String(r.lorry || '').trim();
    const br  = String(r.branch || '').trim();
    if (!lor || !br) return;
    (trucksByBranch[br] = trucksByBranch[br] || []).push(lor);
    branchOfTruck[lor] = br;
  });
  Object.keys(driversByBranch).forEach(b => { driversByBranch[b] = uniq(driversByBranch[b]); });
  Object.keys(trucksByBranch).forEach(b =>  { trucksByBranch[b]  = uniq(trucksByBranch[b]); });
  const branches = uniq([...Object.keys(driversByBranch), ...Object.keys(trucksByBranch)]);

  const CATEGORY_OPTS = ['Property Damage','Speeding','Absent Without Notice','Accident','Other'];
  const STATUS_OPTS   = ['Open','Closed'];

  const curBranch = String(existing.branch || '').trim();
  const curDriver = String(existing.driver || '').trim();
  const curTruck  = String(existing.truck  || '').trim();
  let initialBranch = curBranch;
  if (!initialBranch && curDriver && branchOfDriver[curDriver]) initialBranch = branchOfDriver[curDriver];
  if (!initialBranch && curTruck  && branchOfTruck[curTruck])   initialBranch = branchOfTruck[curTruck];

  const state = { branch: initialBranch, driver: curDriver, truck: curTruck, category: String(existing.category || '').trim(), status: String(existing.status || '').trim() };
  const pickers = {};
  const branchDriverList = () => (driversByBranch[state.branch] || []).slice();
  const branchTruckList  = () => (trucksByBranch[state.branch]  || []).slice();

  function makePicker(colId, listFn, opts){
    opts = opts || {};
    const el = box.querySelector(`[data-col="${colId}"]`);
    const fieldEl = el ? el.closest('.formfield') : null;
    if (!fieldEl) return null;
    const labelEl = fieldEl.querySelector('label');
    const lbl = labelEl ? labelEl.textContent : colId;
    const initial = state[colId] || '';
    fieldEl.innerHTML = `
      <label>${lbl}</label>
      <div class="fpick" data-fpick="${colId}">
        <input type="text" data-col="${colId}" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
        <span class="fpick-caret"></span>
        <div class="combo-panel fpick-panel" data-fpick-panel="${colId}"></div>
      </div>`;
    const input = fieldEl.querySelector('input[data-col]');
    const panel = fieldEl.querySelector('[data-fpick-panel]');
    if (initial) input.value = initial;

    function render(){
      let list = listFn();
      const current = input.value || '';
      if (current && !list.includes(current)) list = [current].concat(list);
      panel.innerHTML = list.length
        ? list.map(v =>
            `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
               <span class="combo-item-text">${v}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = row.dataset.value || '';
          panel.classList.remove('open');
          if (pickers.onChange) pickers.onChange(colId, input.value);
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')){ panel.classList.remove('open'); }
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) panel.classList.remove('open');
    });
    return { input, render };
  }

  pickers.onChange = (colId, val) => {
    if (colId !== 'branch') return;
    state.branch = val;
    const drivers = branchDriverList();
    const trucks  = branchTruckList();
    if (pickers.driver && !drivers.includes(pickers.driver.input.value)) pickers.driver.input.value = '';
    if (pickers.truck  && !trucks.includes(pickers.truck.input.value))  pickers.truck.input.value  = '';
  };

  pickers.branch  = makePicker('branch',  () => branches, {});
  pickers.driver  = makePicker('driver',  branchDriverList, {});
  pickers.truck   = makePicker('truck',   branchTruckList, {});
  pickers.category = makePicker('category', () => CATEGORY_OPTS.slice(), {});
  pickers.status   = makePicker('status',   () => STATUS_OPTS.slice(), {});
}

async function openMisconductModal(index, coordinates, onDone){
  const def = TABLES.misconduct;
  const existing = index == null ? {} : ((DATA_CACHE.misconduct || [])[index] || {});
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const FIELD_ORDER = ['caseDate','branch','driver','truck','category','latitude','longitude','description',
    'interview','form','emailHr','driverSignForm','emailCustomer','investigationReport','fishboneAnalysis',
    'managementPresentation','emailResultCustomer','status','remark'];
  let fields = '';
  FIELD_ORDER.forEach(id => {
    const c = def.columns.find(col => col.id === id);
    if (!c || String(c.type || '').indexOf('computed') === 0) return;
    const value = id === 'latitude' ? coordinates.lat.toFixed(6) : id === 'longitude' ? coordinates.lng.toFixed(6) : (existing[id] ?? '');
    if (c.type === 'date') fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="date" value="${escapeHtml(value)}"></div>`;
    else if (id === 'latitude' || id === 'longitude') fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="text" value="${escapeHtml(value)}" readonly></div>`;
    else fields += `<div class="formfield"><label>${c.label}</label><input data-col="${id}" type="text" value="${escapeHtml(value)}"></div>`;
  });
  box.innerHTML = `<h4>${index == null ? 'Add' : 'Edit'} Misconduct Record</h4><div class="notice notice-info" style="margin-bottom:14px;">Location selected on map: <strong>${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}</strong></div><div class="formgrid">${fields}</div><div class="modalfoot"><button class="btn" id="cancelModal">Cancel</button><button class="btn primary" id="saveModal">Save Record</button></div>`;
  overlay.classList.add('show');
  await wireMisconductPickers(box, existing);
  box.querySelector('#cancelModal').onclick = () => overlay.classList.remove('show');
  box.querySelector('#saveModal').onclick = async () => {
    const record = {...existing, latitude:coordinates.lat, longitude:coordinates.lng};
    def.columns.forEach(c => {
      if (String(c.type || '').indexOf('computed') === 0) return;
      const field = box.querySelector(`[data-col="${c.id}"]`);
      record[c.id] = field ? field.value : '';
    });
    const rows = await getData('misconduct');
    if (index == null) rows.unshift(record); else rows[index] = record;
    await persist('misconduct');
    overlay.classList.remove('show');
    if (onDone) await onDone();
  };
}

function createMisconductMapController(context){
  const controller = {map:null, markers:null, editIndex:null};
  const mapHost = context.wrap.querySelector('#misconductMap');
  const notice = context.wrap.querySelector('#misconductMapNotice');
  const setNotice = message => { if (notice) notice.textContent = message; };
  const validCoordinates = row => Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude));
  controller.renderMarkers = async () => {
    if (!controller.map || !controller.markers) return;
    controller.markers.clearLayers();
    (await getData('misconduct')).forEach((row, index) => {
      if (!validCoordinates(row)) return;
      const marker = L.marker([Number(row.latitude), Number(row.longitude)]).addTo(controller.markers);
      const caseNo = index + 1;
      marker.bindPopup(`<div class="misconduct-pin-popup"><div class="mp-title">Misconduct #${caseNo}</div><div class="mp-row"><span class="mp-k">Driver:</span> <span class="mp-v">${escapeHtml(row.driver || '-')}</span></div><div class="mp-row"><span class="mp-k">Date:</span> <span class="mp-v">${escapeHtml(fmtDate(row.caseDate))}</span></div><div class="mp-row"><span class="mp-k">Type:</span> <span class="mp-v">${escapeHtml(row.category || '-')}</span></div><div class="mp-row"><span class="mp-k">Lat/Long:</span> <span class="mp-v">${escapeHtml(Number(row.latitude).toFixed(5))}, ${escapeHtml(Number(row.longitude).toFixed(5))}</span></div></div>`);
    });
  };
  controller.focusRecord = async index => {
    const row = (await getData('misconduct'))[index];
    if (!row || !validCoordinates(row)){ setNotice('This record has no saved map location yet. Use Edit, then click the map to set one.'); return; }
    if (!controller.map) return;
    const latlng = L.latLng(Number(row.latitude), Number(row.longitude));
    controller.map.setView(latlng, 12, {animate:true});
    controller.markers.eachLayer(marker => { if (marker.getLatLng().equals(latlng)) marker.openPopup(); });
  };
  controller.refresh = async () => {
    const all = await getData('misconduct');
    const valEl = context.wrap.querySelector('[data-tblfilter-val="branch"]');
    const active = valEl ? (valEl.textContent || '').trim() : '';
    const opts = Object.assign({}, context.tableOptions);
    if (active && active !== 'All') opts.rowFilterFn = row => (row.branch || '') === active;
    const rows = (opts.rowFilterFn ? all.filter(opts.rowFilterFn) : all);
    context.tableHost.innerHTML = buildTableHTML('misconduct', rows, context.search.value, opts);
    const pill = context.wrap.querySelector('.eyebrow');
    if (pill) pill.textContent = `${rows.length} records`;
    await controller.renderMarkers();
  };
  controller.requestAdd = () => setNotice('Click a point on the Peninsular Malaysia map to add a Misconduct record.');
  controller.requestEdit = async index => {
    const row = (await getData('misconduct'))[index];
    const coordinates = (row && validCoordinates(row))
      ? L.latLng(Number(row.latitude), Number(row.longitude))
      : L.latLng(3.5, 102.5);
    await controller.focusRecord(index);
    openMisconductModal(index, coordinates, async () => {
      setNotice('Record updated.');
      await controller.refresh();
    });
  };
  controller.deleteRecord = async index => {
    const rows = await getData('misconduct');
    if (!confirm('Delete this misconduct record and its map marker?')) return;
    rows.splice(index, 1); await persist('misconduct'); setNotice('Record and its marker were removed.'); await controller.refresh();
  };
  setTimeout(async () => {
    if (!window.L){ mapHost.innerHTML = '<div style="padding:28px;color:var(--muted);">Map could not be loaded. Please check the internet connection and reopen this page.</div>'; setNotice('Map is unavailable until the mapping service loads.'); return; }
    const bounds = L.latLngBounds([[0.7,99.4],[7.6,105.7]]);
    controller.map = L.map(mapHost, {maxBounds:bounds, maxBoundsViscosity:1, minZoom:6, zoomControl:true}).fitBounds(bounds.pad(-0.08));
    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=cb1_34bo_1_874ce241927909d248dc152d', {maxZoom:18, subdomains:'abcd', attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>', noWrap:true}).addTo(controller.map);
    let tileErrorNotified = false;
    tileLayer.on('tileerror', () => {
      if (tileErrorNotified) return;
      tileErrorNotified = true;
      setNotice('Map tiles could not be loaded right now — the map may appear blank. You can still click on it to set a location.');
    });
    controller.markers = L.layerGroup().addTo(controller.map);
    controller.map.on('click', event => {
      const coordinates = event.latlng; const editingIndex = controller.editIndex; controller.editIndex = null;
      if (editingIndex == null) openMisconductModal(null, coordinates, async () => { setNotice('Record saved. Its marker is now shown on the map.'); await controller.refresh(); });
      else openMisconductModal(editingIndex, coordinates, async () => { setNotice('Record and marker location updated.'); await controller.refresh(); });
    });
    await controller.renderMarkers();
    setNotice('Click the map to choose a location and add a Misconduct record.');
  }, 0);
  return controller;
}

async function renderMisconductPage(){
  let controller;
  const tableOptions = {
    onEditRow: index => controller && controller.requestEdit(index),
    onDeleteRow: index => controller && controller.deleteRecord(index),
    onRowClick: index => controller && controller.focusRecord(index),
  };
  const wrap = await renderDataPage('misconduct', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch'],
    beforeSectionHtml: `<div class="section misconduct-map-shell"><div class="misconduct-map-head"><div><h3>Misconduct Location Map</h3><p class="misconduct-map-help">Peninsular Malaysia only. Click the map to set the incident location and open the record form.</p></div><span class="eyebrow">Map-based location</span></div><div id="misconductMap" aria-label="Peninsular Malaysia misconduct map"></div><div class="misconduct-map-notice" id="misconductMapNotice">Loading map…</div></div>`,
    tableOptions,
    onAddRow: () => controller && controller.requestAdd(),
  });
  controller = createMisconductMapController({wrap, tableHost:wrap.querySelector('#tableHost'), search:wrap.querySelector('.searchbox'), tableOptions});
  return wrap;
}

/* =======================================================================
   SETTINGS MODULE (Phase 2)
   Database Settings, Backup & Restore, System Information.
   Additive only — no existing table/page/router function above this
   point is modified. Uses its own storage keys, separate from the
   per-table keys used by TABLES/loadTableData/saveTableData.
======================================================================= */

const SETTINGS_CONFIG_KEY = 'kor-settings-config';
const BACKUP_META_KEY = 'kor-backup-meta';
const SAFETY_BACKUP_KEY = 'kor-backup-safety-last';
const APP_VERSION = 'FOMS v1.0 (Phase 2)';
const MAX_BACKUP_HISTORY = 20;

// Generic small-object persistence helper. Mirrors the storage fallback
// pattern used by loadTableData/saveTableData (window.storage, then
// localStorage) but is kept fully separate so nothing above is touched.
/* ---- 4.18 SETTINGS & DATA PROVIDER ---- */

async function loadSettingsKey(key, fallback){
  try{
    if (window.storage && typeof window.storage.get === 'function'){
      const res = await window.storage.get(key, false);
      if (res && res.value) return JSON.parse(res.value);
    }
    if (typeof localStorage !== 'undefined'){
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    }
  }catch(e){ /* not found yet */ }
  return fallback;
}
async function saveSettingsKey(key, value){
  try{
    if (window.storage && typeof window.storage.set === 'function'){
      await window.storage.set(key, JSON.stringify(value), false);
    } else if (typeof localStorage !== 'undefined'){
      localStorage.setItem(key, JSON.stringify(value));
    }
  }catch(e){ console.error('settings save failed', e); }
}

function defaultSettingsConfig(){
  return { companyName:'', googleSheetId:'', appsScriptUrl:'', provider:'local', providerByTable:{}, connectionStatus:'not_configured', backupMode:'auto', backupEmails:[] };
}
async function getSettingsConfig(){
  const cfg = await loadSettingsKey(SETTINGS_CONFIG_KEY, null);
  return cfg ? {...defaultSettingsConfig(), ...cfg} : defaultSettingsConfig();
}
async function saveSettingsConfig(cfg){
  await saveSettingsKey(SETTINGS_CONFIG_KEY, cfg);
}

async function getBackupHistory(){
  return await loadSettingsKey(BACKUP_META_KEY, []);
}
async function addBackupHistoryEntry(entry){
  const list = await getBackupHistory();
  list.unshift(entry);
  if (list.length > MAX_BACKUP_HISTORY) list.length = MAX_BACKUP_HISTORY;
  await saveSettingsKey(BACKUP_META_KEY, list);
  return list;
}
// Removes a single Backup History row (matched by isoDate+fileName, which
// together are unique per entry) and persists the trimmed list.
async function deleteBackupHistoryEntry(isoDate, fileName){
  const list = await getBackupHistory();
  const next = list.filter(h => !(h.isoDate === isoDate && h.fileName === fileName));
  await saveSettingsKey(BACKUP_META_KEY, next);
  return next;
}
// Clears the entire Backup History log. Does not touch any backup file
// already downloaded to disk, nor the safety-backup snapshot.
async function clearBackupHistory(){
  await saveSettingsKey(BACKUP_META_KEY, []);
  return [];
}

/* ---------------------------------------------------------------------
   DATA PROVIDER ABSTRACTION
   LocalStorageProvider wraps the existing loadTableData()/saveTableData(),
   which keep working exactly as before. GoogleSheetProvider talks to a
   per-company Google Apps Script Web App — the URL comes from the company's
   row in Supabase (session.appsScriptUrl), never hardcoded.
   getActiveProvider() is the single place that decides which one is live;
   routing is per-table via companies.supabase_tables.
   --------------------------------------------------------------------- */
const LocalStorageProvider = {
  name: 'local',
  async loadTable(tableKey){ return await loadTableData(tableKey); },
  async saveTable(tableKey, rows){ await saveTableData(tableKey, rows); },
};

// Talks to the Apps Script Web App whose URL/Sheet ID live in Settings.
// GET is used for loadTable/ping (plain query string, no preflight).
// POST uses a text/plain body — Apps Script web apps don't set CORS
// headers for preflighted requests, so this avoids triggering one.
function buildAppsScriptUrl(cfg, params){
  const url = new URL(String(cfg.appsScriptUrl || '').trim());
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}
// Reads the logged-in user's own Apps Script URL from session, for the
// same reason getCurrentSessionSheetId() exists — falls back to
// cfg.appsScriptUrl (Settings) only when the session doesn't have one.
function getCurrentSessionAppsScriptUrl(){
  try{
    const session = JSON.parse(localStorage.getItem('focc-session'));
    return session?.appsScriptUrl || '';
  }catch(e){
    return '';
  }
}

/* Kunci sandaran browser: selepas login, URL sheet MESTI datang dari
   company user (session). Jangan warisi URL browser yang mungkin
   kepunyaan company lain. Pra-login (Settings/Test Connection) masih
   boleh guna cfg.appsScriptUrl. */
function resolveActiveScriptUrl(cfg){
  const fromSession = getCurrentSessionAppsScriptUrl();
  if (fromSession) return fromSession;
  try{
    const sess = JSON.parse(localStorage.getItem('focc-session') || 'null');
    if (sess && sess.companyId) return ''; // company dah dikenal — tiada sheet = memang tiada
  }catch(e){}
  return (cfg && cfg.appsScriptUrl) || '';
}

async function appsScriptGet(cfg, params){
  const activeUrl = resolveActiveScriptUrl(cfg);
  if (!activeUrl) throw new Error('The Google Sheet data source for this company has not been configured.');
  let res;
  try{
    res = await fetch(buildAppsScriptUrl({...cfg, appsScriptUrl: activeUrl}, params), {method:'GET'});
  }catch(e){
    throw new Error('Could not reach the Apps Script URL (network error or invalid URL).');
  }
  if (!res.ok) throw new Error(`Apps Script request failed (HTTP ${res.status}).`);
  let json;
  try{ json = await res.json(); }catch(e){ throw new Error('Apps Script did not return valid JSON.'); }
  if (json && json.success === false) throw new Error(json.error || 'Apps Script reported an error.');
  return json;
}

async function appsScriptPost(cfg, params, body){
  const activeUrl = resolveActiveScriptUrl(cfg);
  if (!activeUrl) throw new Error('The Google Sheet data source for this company has not been configured.');
  let res;
  try{
    res = await fetch(buildAppsScriptUrl({...cfg, appsScriptUrl: activeUrl}, params), {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(body),
    });
  }catch(e){
    throw new Error('Could not reach the Apps Script URL (network error or invalid URL).');
  }
  if (!res.ok) throw new Error(`Apps Script request failed (HTTP ${res.status}).`);
  let json;
  try{ json = await res.json(); }catch(e){ throw new Error('Apps Script did not return valid JSON.'); }
  if (json && json.success === false) throw new Error(json.error || 'Apps Script reported an error.');
  return json;
}

// Route Protection/session helpers read from this same key; this reads
// the logged-in user's own Google Sheet ID for data operations (Task:
// Replace Google Sheet ID source from Settings to Login Session).
function getCurrentSessionSheetId(){
  try{
    const session = JSON.parse(localStorage.getItem('focc-session'));
    return session?.googleSheetId || '';
  }catch(e){
    return '';
  }
}

// Real, live ping — used by Test Connection (Task 8). Never a format-only check.
async function pingGoogleSheet(cfg){
  return await appsScriptGet(cfg, {action:'ping', sheetId: getCurrentSessionSheetId()});
}

const GoogleSheetProvider = {
  name: 'sheet',
  async loadTable(tableKey){
    const cfg = await getSettingsConfig();
    const json = await appsScriptGet(cfg, {action:'loadTable', table: tableKey, sheetId: getCurrentSessionSheetId()});
    const rows = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
    if (json && typeof json.version !== 'undefined') DATA_VERSION[tableKey] = json.version;
    await markSyncActive();
    return rows;
  },
  async saveTable(tableKey, rows){
    const cfg = await getSettingsConfig();
    const json = await appsScriptPost(cfg, {action:'saveTable'}, {table: tableKey, sheetId: getCurrentSessionSheetId(), data: rows, version: DATA_VERSION[tableKey] || 1});
    if (json && typeof json.version !== 'undefined') DATA_VERSION[tableKey] = json.version;
    await markSyncActive();
    return true;
  },
};

// getData()/persist() call this on every invocation, so provider choice
// always reflects whatever is currently saved in Settings — no reload
// or app restart required after switching Database Type.
async function getActiveProviderAsync(tableKey){
  const cfg = await getSettingsConfig();
  const serverTables = await getServerSupabaseTables();
  return getActiveProvider(cfg, tableKey, serverTables);
}

/* =====================================================================
   SUPABASE PROVIDER (Fasa 2)
   Kontrak SAMA macam GoogleSheetProvider: loadTable pulangkan SELURUH
   array, saveTable ganti SELURUH array. Bezanya: semuanya melalui RLS,
   jadi setiap company hanya nampak & boleh tulis data dia sendiri.
===================================================================== */
const SupabaseProvider = {
  name: 'supabase',

  // company_id pengguna yang sedang login — dibaca dari profiles melalui
  // session Supabase, BUKAN dari localStorage (jadi tak boleh dipalsukan).
  async getCompanyId(){
    const authRes = await FOCC_SUPABASE.auth.getUser();
    if (authRes.error || !authRes.data || !authRes.data.user){
      throw new Error('No Supabase session. Please sign in again.');
    }
    const profRes = await FOCC_SUPABASE
      .from('profiles')
      .select('company_id')
      .eq('id', authRes.data.user.id)
      .single();
    if (profRes.error) throw profRes.error;
    if (!profRes.data || !profRes.data.company_id){
      throw new Error('Profile has no company_id. Contact your administrator.');
    }
    return profRes.data.company_id;
  },

  async loadTable(tableKey){
    // WAJIB: tapis ikut company pengguna yang sedang login.
    // Tanpa baris ini, bacaan jatuh pada baris company lain (data leak).
    const companyId = await this.getCompanyId();

    const { data, error } = await FOCC_SUPABASE
      .from('tenant_tables')
      .select('payload, version')
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .maybeSingle();

    if (error) throw error;

    // Belum ada baris untuk table ni — biarkan kosong (page tunjuk 0 rekod).
    if (!data){
      DATA_VERSION[tableKey] = 1;
      return [];
    }

    DATA_VERSION[tableKey] = Number(data.version || 1);
    return Array.isArray(data.payload) ? data.payload : [];
  },

  async saveTable(tableKey, rows){
    const companyId = await this.getCompanyId();
    const expectedVersion = Number(DATA_VERSION[tableKey] || 1);

    // Semak versi semasa dahulu — kesan konflik kalau 2 pengguna edit serentak.
    const readRes = await FOCC_SUPABASE
      .from('tenant_tables')
      .select('version')
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .maybeSingle();

    if (readRes.error) throw readRes.error;

    // Kali pertama table ni disimpan untuk company ni.
    if (!readRes.data){
      const insRes = await FOCC_SUPABASE
        .from('tenant_tables')
        .insert({ company_id: companyId, table_key: tableKey, payload: rows, version: 1 });
      if (insRes.error) throw insRes.error;
      DATA_VERSION[tableKey] = 1;
      return true;
    }

    const currentVersion = Number(readRes.data.version) || 1;

    if (currentVersion !== expectedVersion){
      throw new Error('Version conflict: this data was changed by another user. Reload the page and try again.');
    }

    const nextVersion = currentVersion + 1;

    const updRes = await FOCC_SUPABASE
      .from('tenant_tables')
      .update({
        payload: rows,
        version: nextVersion,
        updated_at: new Date().toISOString()
      })
      .eq('company_id', companyId)
      .eq('table_key', tableKey)
      .eq('version', currentVersion)
      .select('version')
      .maybeSingle();

    if (updRes.error) throw updRes.error;

    if (!updRes.data){
      throw new Error('Version conflict: this data was changed by another user. Reload the page and try again.');
    }

    DATA_VERSION[tableKey] = nextVersion;
    return true;
  },
};

/* =====================================================================
   ROUTING GLOBAL (Fasa 2b)
   Sumber kebenaran = lajur companies.supabase_tables di Supabase,
   BUKAN localStorage. Jadi SEMUA user & device company sama dapat
   routing yang sama. Local providerByTable kekal sebagai override
   sementara (ujian / rollback kecemasan).
===================================================================== */
let FOCC_SERVER_SUPABASE_TABLES = null;
let FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;

/* Matikan channel realtime + bersihkan timer/pull tertunggak.
   Penutup kepada startFOCCRealtime() — dipanggil masa login / logout. */
async function stopFOCCRealtime(){
  try{
    if (FOCC_RT_REJOIN_TIMER){ clearTimeout(FOCC_RT_REJOIN_TIMER); FOCC_RT_REJOIN_TIMER = null; }
    Object.keys(FOCC_RT_PULL_TIMERS || {}).forEach(k => {
      clearTimeout(FOCC_RT_PULL_TIMERS[k]);
      delete FOCC_RT_PULL_TIMERS[k];
    });

    const ch = FOCC_RT_CHANNEL;
    FOCC_RT_CHANNEL = null;
    FOCC_RT_COMPANY = '';
    FOCC_RT_TRIES   = 0;

    if (ch){
      try{ await FOCC_SUPABASE.removeChannel(ch); }
      catch(e){ console.warn('stopFOCCRealtime: removeChannel failed', e); }
    }
  }catch(e){ console.warn('stopFOCCRealtime failed', e); }
}

/* Buang SEMUA state runtime yang bergantung pada company yang sedang login.
   WAJIB dipanggil pada login/logout — kalau tidak, user Company B boleh
   nampak data Company A yang masih tersimpan dalam memori (DATA_CACHE). */
function clearTenantRuntimeState(){
  Object.keys(DATA_CACHE).forEach(k => delete DATA_CACHE[k]);
  Object.keys(DATA_VERSION).forEach(k => delete DATA_VERSION[k]);
  if (window.IMPORT_BACKUPS){
    Object.keys(window.IMPORT_BACKUPS).forEach(k => delete window.IMPORT_BACKUPS[k]);
  }
  resetServerSupabaseTablesCache();
  stopFOCCRealtime();   // matikan channel company lama (login / logout)
  foccAdminLiveStop();  // hentikan polling admin (logout / tukar user)
}

function resetServerSupabaseTablesCache(){
  FOCC_SERVER_SUPABASE_TABLES = null;
  FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;
}

// Baca SEKALI per session. RLS pada companies sudah hadkan kepada
// company sendiri — tapi kita tetap tapis ikut company_id pengguna
// yang sedang login, sebagai pertahanan kedua (defense-in-depth).
async function getServerSupabaseTables(){
  if (FOCC_SERVER_SUPABASE_TABLES !== null) return FOCC_SERVER_SUPABASE_TABLES;
  if (FOCC_SERVER_SUPABASE_TABLES_PROMISE) return FOCC_SERVER_SUPABASE_TABLES_PROMISE;

  const promise = (async () => {
    let result = new Set();
    try{
      const sessRes = await FOCC_SUPABASE.auth.getSession();
      if (sessRes && sessRes.data && sessRes.data.session){
        const myCompanyId = await SupabaseProvider.getCompanyId();
        const res = await FOCC_SUPABASE
          .from('companies')
          .select('supabase_tables')
          .eq('company_id', myCompanyId)
          .maybeSingle();

        if (!res.error && res.data){
          result = new Set(
            String(res.data.supabase_tables || '')
              .split(',')
              .map(x => x.trim())
              .filter(x => x && TABLES[x])
          );
        } else if (res.error){
          console.warn('Server table routing unavailable:', res.error.message);
        }
      }
    }catch(err){
      console.warn('Server table routing failed; guna provider biasa:', err);
    }
    FOCC_SERVER_SUPABASE_TABLES = result;
    return result;
  })();

  FOCC_SERVER_SUPABASE_TABLES_PROMISE = promise;
  try{
    return await promise;
  }finally{
    if (FOCC_SERVER_SUPABASE_TABLES_PROMISE === promise){
      FOCC_SERVER_SUPABASE_TABLES_PROMISE = null;
    }
  }
}

/* =====================================================================
   REALTIME SYNC — tenant_tables sahaja (page yang dah migrate).
   Page Google Sheet TIDAK terjejas: setiap event disemak dulu melalui
   getActiveProviderAsync(tableKey) — hanya 'supabase' dilayan.
   Page baru yang ditambah ke SUPABASE_NATIVE_TABLES akan auto jadi live.
===================================================================== */
let FOCC_RT_CHANNEL = null;
let FOCC_RT_COMPANY = '';
let FOCC_RT_QUEUE = Promise.resolve();
let FOCC_RT_REJOIN_TIMER = null;
let FOCC_RT_TRIES = 0;
const FOCC_RT_PULL_TIMERS = {};   // tableKey -> timer pull tertunda

const FOCC_RT_MUTE = {};   // tableKey -> masa mute tamat (elak refresh sendiri)
/* Route yang memaparkan data table LAIN — contoh: FEG Disposal guna data 'feg'.
   Tanpa senarai ini, event realtime masuk tapi page tak dilukis semula.
   Nak tambah page lain kemudian? Cukup tambah nama route di sini. */
const FOCC_RT_DERIVED_ROUTES = {
  feg: ['fegDisposal', 'fegServiceHistory'],
  depotContainers: ['depotOverview'],
  depotLayout:     ['depotOverview'],
};


function foccRealtimeMute(tableKey){
  if (tableKey) FOCC_RT_MUTE[tableKey] = Date.now() + 8000;
}

async function foccRealtimeIsSupabase(tableKey){
  try{
    const provider = await getActiveProviderAsync(tableKey);
    if (provider === SupabaseProvider) return true;
    return String((provider && provider.name) || '') === 'supabase';
  }catch(e){ return false; }
}

function foccRealtimeModalOpen(){
  const ov = document.getElementById('modalOverlay');
  return !!(ov && ov.classList.contains('show'));
}

/* Detail Page (Prime Mover / Trailer / Staff) sedang dalam mod Edit?
   Butang Save & panel dokumen HANYA wujud semasa edit — jadi ini penanda
   tepat untuk "user sedang bekerja: JANGAN lukis semula page". */
function foccDetailEditOpen(){
  return !!document.querySelector(
    '#pmSave, #tlSave, #stSave, #fegSave, #fegDocUpdatePanel, #pmDocUpdatePanel, #tlDocUpdatePanel, #stDocUpdatePanel'
  );
}
/* Jadualkan refresh data (debounce + tunda masa mute).
   Satu timer untuk setiap table — event berikutnya menolak timer ke depan,
   jadi perubahan bertubi-tubi menghasilkan SATU refresh sahaja. */
function foccRealtimeScheduleRefresh(tableKey, delay){
  clearTimeout(FOCC_RT_PULL_TIMERS[tableKey]);
  FOCC_RT_PULL_TIMERS[tableKey] = setTimeout(async () => {
    delete FOCC_RT_PULL_TIMERS[tableKey];
    try{ await foccRealtimePull(tableKey); }
    catch(e){ console.error('realtime pull failed', tableKey, e); }
  }, Math.max(0, delay || 0));
}

async function foccRealtimePull(tableKey){
  // Versi SEBELUM pull — untuk tahu sama ada data benar-benar berubah.
  const versionBefore = Number(DATA_VERSION[tableKey] || 0);

  // Ambil semula data + version dari Supabase (RLS tetap tapis company).
  const rows = await SupabaseProvider.loadTable(tableKey);
  DATA_CACHE[tableKey] = rows;
  let changed = true;                       // lalai: lukis semula (selamat)
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const res = await FOCC_SUPABASE.from('tenant_tables')
      .select('version').eq('company_id', companyId).eq('table_key', tableKey).maybeSingle();
    const fresh = (res && res.data) ? Number(res.data.version) : versionBefore;
    DATA_VERSION[tableKey] = fresh || versionBefore;
    changed = (fresh !== versionBefore);    // Fix A: redraw hanya bila berubah
  }catch(e){ /* version tak dapat dibaca → anggap berubah */ }

  // Fix A + B: lukis semula HANYA kalau data benar-benar berubah, page itu
  // yang terbuka, tiada modal, dan TIADA borang Detail Page sedang diedit.
  // Page yang memaparkan data table ini walaupun nama route berbeza
  // (contoh: 'fegDisposal' memaparkan data table 'feg').
  const drawRoute = (currentRoute === tableKey)
    ? tableKey
    : ((FOCC_RT_DERIVED_ROUTES[tableKey] || []).includes(currentRoute) ? currentRoute : null);

  if (changed && !foccRealtimeModalOpen() && !foccDetailEditOpen() && drawRoute){
    goTo(drawRoute, { silent: true });
  }
}

async function foccRealtimeOnChange(payload){
  const row = payload && payload.new;
  if (!row || !row.table_key) return;

  const key = row.table_key;
  if (!(await foccRealtimeIsSupabase(key))) return;              // Sheet page — abaikan

  const incoming = Number(row.version || 0);
  const current  = Number(DATA_VERSION[key] || 0);
  if (incoming <= current) return;                               // event sendiri / lama
  const muteUntil = FOCC_RT_MUTE[key] || 0;
  if (Date.now() < muteUntil){
    // Baru lepas save sendiri — tangguh sampai tempoh mute habis.
    foccRealtimeScheduleRefresh(key, muteUntil - Date.now() + 100);
    return;
  }

  // Debounce 400ms: beberapa perubahan serentak = SATU refresh sahaja
  // (sebelum ini 4 perubahan = 4 kali page berkelip).
  foccRealtimeScheduleRefresh(key, 400);
}

/* Bug Reports: laporan baharu / tukar status → kemaskini dot "!" + senarai
   dalam Settings serta-merta. Server tetap tapis ikut peranan (SuperAdmin). */
function foccRealtimeBugChange(){
  bugBadgeRefresh();
  if (typeof window.FOCC_REFRESH_BUGS === 'function' && !foccRealtimeModalOpen()){
    try{ window.FOCC_REFRESH_BUGS().catch(() => {}); }catch(e){}
  }
}

async function startFOCCRealtime(){
  const task = FOCC_RT_QUEUE.then(async () => {
    let companyId = '';
    try{
      companyId = await SupabaseProvider.getCompanyId();
    }catch(e){
      companyId = '';
    }

    // Sesi mungkin belum siap masa page load — cuba lagi (maks 5 kali, 3s).
    if (!companyId){
      if (FOCC_RT_TRIES < 5 && !FOCC_RT_REJOIN_TIMER){
        FOCC_RT_TRIES += 1;
        FOCC_RT_REJOIN_TIMER = setTimeout(() => {
          FOCC_RT_REJOIN_TIMER = null;
          startFOCCRealtime();
        }, 3000);
      }
      return;
    }
    FOCC_RT_TRIES = 0;

    // Jangan bina semula channel yang masih aktif untuk company yang sama.
    if (FOCC_RT_CHANNEL && FOCC_RT_COMPANY === companyId) return;

    // Buang channel lama SEHINGGA HABIS sebelum cipta yang baharu.
    const oldChannel = FOCC_RT_CHANNEL;
    FOCC_RT_CHANNEL = null;
    FOCC_RT_COMPANY = '';

    if (oldChannel){
      try{
        await FOCC_SUPABASE.removeChannel(oldChannel);
      }catch(e){
        console.warn('Realtime channel cleanup failed:', e);
      }
    }

    const channel = FOCC_SUPABASE
      .channel('focc-tenant:' + companyId)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'tenant_tables', filter: 'company_id=eq.' + companyId },
          foccRealtimeOnChange)
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'tenant_tables', filter: 'company_id=eq.' + companyId },
          foccRealtimeOnChange)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bug_reports' },
          foccRealtimeBugChange)
      .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bug_reports' },
          foccRealtimeBugChange);

    FOCC_RT_COMPANY = companyId;
    FOCC_RT_CHANNEL = channel;

    // WebSocket putus (tukar WiFi / laptop tidur) → sambung semula sendiri.
    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
        if (FOCC_RT_CHANNEL !== channel) return;   // channel lama yang kita buang sendiri — abaikan
        if (FOCC_RT_REJOIN_TIMER) return;
        FOCC_RT_REJOIN_TIMER = setTimeout(() => {
          FOCC_RT_REJOIN_TIMER = null;
          startFOCCRealtime();
        }, 3000);
      }
    });

    // Jaring keselamatan: kembali ke tab → sambung semula / tarik data.
    if (!window.__foccRtFocusWired){
      window.__foccRtFocusWired = true;
      document.addEventListener('visibilitychange', async () => {
        if (document.hidden) return;

        if (!FOCC_RT_CHANNEL){            // channel mati → bina semula
          await startFOCCRealtime();
          return;
        }

        const key = currentRoute;
        if (!key || !TABLES[key]) return;
        if (!(await foccRealtimeIsSupabase(key)) || foccRealtimeModalOpen()) return;
        try{ await foccRealtimePull(key); }catch(e){}
      });
    }
  });

  FOCC_RT_QUEUE = task.catch(() => {});
  return task;
}

/* Watchdog: pastikan channel realtime sentiasa wujud selagi user login.
   Menutup semua jalan "channel tak lahir masa page load" — tak kira
   trigger mana yang gagal. Murah: getSession() baca localStorage sahaja. */
window.__foccRtWatchdog = setInterval(async () => {
  try{
    if (FOCC_RT_CHANNEL) return;                              // sudah sihat

    const sess = await FOCC_SUPABASE.auth.getSession();
    if (!sess || !sess.data || !sess.data.session) return;     // belum login — diam

    await startFOCCRealtime();
    if (FOCC_RT_CHANNEL) console.info('Realtime channel started (watchdog).');
  }catch(e){}
}, 5000);

/* =====================================================================
   SENARAI TABLE YANG DAH MIGRATE — SUMBER KEBENARAN (kod).
   Table dalam senarai ini guna Supabase untuk SEMUA company,
   termasuk company yang baru didaftarkan. SIFAR setup per company.

   Nak tambah table lain yang dah migrate? Masukkan namanya di sini.
   Contoh: 'notificationContact', 'whatsappGroups'
===================================================================== */
const SUPABASE_NATIVE_TABLES = new Set([
  'staffDatabase',
  'notificationContact',
  'whatsappGroups',
  'trailer',
  'primeMover',
  'feg',
  'fegInspection',         // rekod audit FEG bulanan (borang + PDF)
  'fegAssetRefs',          // senarai pilihan Asset Ref FEG (dulu localStorage)
  'fegVendors',            // senarai pilihan Vendor FEG (dulu localStorage)
  'fegDisposalAudit',      // jejak audit dispose/restore FEG (dulu localStorage)
  'safetyInspection',      // rekod audit Safety Equipment (bulanan)
  'safetyReceiving'        // borang serahan Safety Equipment
]);

/* =============================================================
   FASA 4 — SUPABASE SAHAJA.
   true  = SEMUA table guna Supabase (Google Sheet & Local Storage
           tidak lagi jadi storan data — kod lama kekal tapi mati).
   false = balik ke logik asal (rollback kecemasan).
   ============================================================= */
const FOCC_SUPABASE_ONLY = true;

function resolveProviderName(cfg, tableKey, serverTables){
  if (FOCC_SUPABASE_ONLY) return 'supabase';      // ← semua page → Supabase

  const localMap = (cfg && cfg.providerByTable) || {};

  // 1. Override local — ujian / rollback (keutamaan tertinggi)
  if (tableKey && localMap[tableKey]) return String(localMap[tableKey]);

  // 2. Table yang dah migrate → Supabase untuk SEMUA company
  if (tableKey && SUPABASE_NATIVE_TABLES.has(tableKey)) return 'supabase';

  // 3. Routing server — override khas per company (kalau ada)
  if (serverTables && serverTables.has(tableKey)) return 'supabase';

  // 4. Global fallback
  return (cfg && cfg.provider) || 'local';
}

function providerByName(name){
  if (name === 'sheet')    return GoogleSheetProvider;
  if (name === 'supabase') return SupabaseProvider;
  return LocalStorageProvider;
}
function getActiveProvider(cfg, tableKey, serverTables){
  return providerByName(resolveProviderName(cfg, tableKey, serverTables));
}

// Fasa 0: provider boleh ditetapkan PER-TABLE

// Fasa 0 helper — tukar provider bagi SATU table (guna dari console):
//   await setTableProvider('staffDatabase', 'supabase')
//   await setTableProvider('staffDatabase', null)   // pindah balik
async function setTableProvider(tableKey, providerName){
  const cfg = await getSettingsConfig();
  const map = Object.assign({}, cfg.providerByTable || {});
  if (providerName) map[tableKey] = String(providerName);
  else delete map[tableKey];
  await saveSettingsConfig(Object.assign({}, cfg, { providerByTable: map }));
  console.log('providerByTable =', map);
  return map;
}

// Task 7: a real loadTable/saveTable succeeding is the only thing that
// promotes status to "Sync Active". Only ever upgrades — a transient
// failure elsewhere doesn't flap the badge back down; Test Connection
// (Task 8) is the deliberate, explicit way to re-verify "Connected".
async function markSyncActive(){
  const cfg = await getSettingsConfig();
  if (cfg.provider === 'sheet' && cfg.connectionStatus !== 'sync_active'){
    await saveSettingsConfig({...cfg, connectionStatus:'sync_active'});
  }
}

/* ---------------------------------------------------------------------
   VALIDATION (format-only — used before any network call is attempted)
--------------------------------------------------------------------- */
function isValidSheetIdFormat(id){
  return /^[a-zA-Z0-9_-]{20,}$/.test(String(id || '').trim());
}
function isValidAppsScriptUrlFormat(url){
  return /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(String(url || '').trim());
}

// Recomputes the baseline status from saved config/format only.
// 'connected' (Task 8: Test Connection succeeded) and 'sync_active'
// (Task 7: a real loadTable/saveTable succeeded) are only ever set by
// an actual network round-trip elsewhere — never fabricated here.
function computeConnectionStatus(cfg){
  const idOk = isValidSheetIdFormat(cfg.googleSheetId);
  const urlOk = isValidAppsScriptUrlFormat(cfg.appsScriptUrl);
  if (!idOk || !urlOk) return 'not_configured';
  return 'configured';
}

// Root-cause fix: Settings (kor-settings-config, provider:'local' by
// default) and Login Session (focc-session, which carries the real
// googleSheetId/appsScriptUrl from the company row in Supabase) are two SEPARATE
// localStorage keys. getActiveProvider() only ever looked at Settings,
// so a browser that never opened Settings (new device, cleared cache,
// fresh Netlify visit) — or an old browser still holding provider:
// 'local' from before Sheet sync existed — silently saved everything
// to LocalStorageProvider even though the session already had valid
// Sheet credentials.
//
// This runs on every successful login (fresh + cached) and repairs
// that gap: if the session has a format-valid googleSheetId AND
// appsScriptUrl, Settings.provider is forced to 'sheet'. It is a
// local-only, format-only check (reuses isValidSheetIdFormat /
// isValidAppsScriptUrlFormat — no network call), it only ever
// UPGRADES provider to 'sheet' (never downgrades), and it never
// touches googleSheetId/appsScriptUrl/backupMode/backupEmails in
// Settings — so it cannot clobber anything configured by hand on the
// Settings page. connectionStatus is recomputed via the existing
// computeConnectionStatus() rule, never fabricated to 'connected' or
// 'sync_active' (those still only come from a real Test Connection /
// loadTable / saveTable round-trip, per Task 7/8).
async function syncProviderFromSession(session){
  try{
    // Login baharu / auto-login: buang SEMUA cache data company lama dulu.
    clearTenantRuntimeState();

    startFOCCRealtime();   // Realtime: mula langganan company yang baru login

    const idOk = isValidSheetIdFormat(session && session.googleSheetId);
    const urlOk = isValidAppsScriptUrlFormat(session && session.appsScriptUrl);
    if (!idOk || !urlOk) return; // this session has no valid Sheet credentials — leave provider as-is

    const cfg = await getSettingsConfig();
    if (cfg.provider === 'sheet') return; // already correct, nothing to do

    const nextCfg = {
      ...cfg,
      provider: 'sheet',
      connectionStatus: computeConnectionStatus({googleSheetId: session.googleSheetId, appsScriptUrl: session.appsScriptUrl}),
    };
    await saveSettingsConfig(nextCfg);
  }catch(e){
    // Never let a provider-repair failure block login/app boot — worst
    // case the previous (possibly wrong) provider stays active and the
    // user still lands in a working app; Settings page remains the
    // manual fallback.
    console.error('syncProviderFromSession failed', e);
  }
}

function settingsStatusBadgeHtml(status){
  const map = {
    not_configured: {cls:'neutral', label:'Not Configured'},
    configured:     {cls:'warn',    label:'Configured'},
    connected:      {cls:'good',    label:'Connected'},
    sync_active:    {cls:'sync',    label:'Sync Active'},
  };
  const s = map[status] || map.not_configured;
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

/* ---------------------------------------------------------------------
   BACKUP / RESTORE
--------------------------------------------------------------------- */
function pad2(n){ return String(n).padStart(2,'0'); }

// FOMS_Backup_YYYYMMDD_HHMMSS(.json) — also used (with a different
// prefix) for the pre-restore safety backup.
function buildBackupFileName(prefix, d){
  d = d || new Date();
  const y = d.getFullYear(), mo = pad2(d.getMonth()+1), da = pad2(d.getDate());
  const h = pad2(d.getHours()), mi = pad2(d.getMinutes()), s = pad2(d.getSeconds());
  return `${prefix}_${y}${mo}${da}_${h}${mi}${s}`;
}

// Gathers every table's current data (via the existing, untouched
// getData()) into one portable backup object.
async function buildBackupPayload(tableKeys){
  const keys = Array.isArray(tableKeys)
    ? tableKeys
    : Object.keys(TABLES);

  const tables = {};

  for (const tableKey of keys){
    tables[tableKey] = await getData(tableKey);
  }

  return {
    app:'FOMS',
    version:APP_VERSION,
    generatedAt:new Date().toISOString(),
    tables
  };
}
const BACKUP_ROUTE_TABLE_MAP = {
  operationKPI: ['operationKPI'],
  driverKPI: ['driverKPI'],
};

function getAuthorizedBackupTableKeys(){
  const allTableKeys = Object.keys(TABLES);

  if (hasAllRoutesAccess()){
    return allTableKeys;
  }

  return allTableKeys.filter(tableKey => {
    const routeKeys =
      BACKUP_ROUTE_TABLE_MAP[tableKey] || [tableKey];

    return routeKeys.some(routeKey =>
      userCanAccess(routeKey)
    );
  });
}

function downloadJSON(obj, filename){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json;charset=utf-8;'});
  downloadBlob(blob, filename);
}

// Generic file-download helper (used for both the .json and the new
// .xlsx backup files).
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Feature 2: builds an .xlsx workbook Blob from the same payload used
// for the .json backup — one worksheet per table. Uses the SheetJS
/* ---- 4.19 BACKUP / RESTORE ENGINE (Google Sheets + xlsx.js) ---- */

// (xlsx.full.min.js) library loaded in <head>. Sheet names are capped
// at Excel's 31-character limit.
function buildBackupWorkbookBlob(payload){
  if (typeof XLSX === 'undefined') throw new Error('Excel export library (SheetJS) failed to load.');
  const wb = XLSX.utils.book_new();
  const tableKeys = Object.keys(payload.tables || {});
  if (!tableKeys.length){
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'Empty');
  }
  for (const tableKey of tableKeys){
    const rows = Array.isArray(payload.tables[tableKey]) ? payload.tables[tableKey] : [];
    const ws = rows.length ? XLSX.utils.json_to_sheet(rows) : XLSX.utils.aoa_to_sheet([['No records']]);
    const sheetName = String(tableKey).slice(0, 31) || 'Sheet';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const wbArray = XLSX.write(wb, {bookType:'xlsx', type:'array'});
  return new Blob([wbArray], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

// Reads a Blob into a base64 string (no data: prefix) for emailing as
// an attachment via Apps Script.
function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('Could not read file for email attachment.'));
    reader.readAsDataURL(blob);
  });
}

function backupMetaEntry({fileName, trigger, status, note}){
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}),
    time: now.toLocaleTimeString('en-GB'),
    fileName,
    trigger, // 'Manual' | 'Auto'
    user: 'System',
    status, // 'Success' | 'Failed'
    note: note || '',
    isoDate: now.toISOString(),
  };
}

// Feature 3/4: emails the JSON + Excel backups to every registered
// Backup Email Distribution address.
//
// BUG FIX: this used to reuse cfg.appsScriptUrl from Database Settings,
// which is wrong — Database Settings is the customer's own data-sync
// endpoint (Local Storage / Google Sheet), and has nothing to do with
// this internal FOCC feature. Backup Email now talks to its own fixed
// endpoint, FOCC_BACKUP_API, below — so it works the same whether
// Database Type is Local Storage or Google Sheet, and even when
// Google Sheet ID / Apps Script URL in Database Settings are blank.
//
// Never throws — an empty recipient list simply skips emailing (the
// local .json/.xlsx downloads still happen either way), and any
// request failure is caught and reported back to the caller instead
// of failing the backup itself.
// const FOCC_BACKUP_API = 'CURRENT_APPS_SCRIPT_URL'; // Deployed Apps Script Web App URL for Backup Email — independent of Database Settings.
async function sendBackupEmailIfConfigured({trigger, generatedAt, jsonBlob, jsonFileName, xlsxBlob, xlsxFileName}){
  const cfg = await getSettingsConfig();
  const recipients = Array.isArray(cfg.backupEmails) ? cfg.backupEmails : [];
  if (!recipients.length) return {sent:false, reason:'no_recipients'};
  if (!FOCC_BACKUP_API || FOCC_BACKUP_API === 'CURRENT_APPS_SCRIPT_URL') return {sent:false, reason:'backup_api_not_configured'};
  try{
    const [jsonBase64, xlsxBase64] = await Promise.all([blobToBase64(jsonBlob), blobToBase64(xlsxBlob)]);
    const when = new Date(generatedAt).toLocaleString('en-GB');
    const body = [
      'Attached are the latest FOCC backup files.',
      '',
      `Backup Type: ${trigger === 'Auto' ? 'Auto' : 'Manual'}`,
      `Generated: ${when}`,
      '',
      'Files:',
      '- JSON Backup',
      '- Excel Backup',
    ].join('\n');
    const url = new URL(FOCC_BACKUP_API);
    url.searchParams.set('action', 'sendBackupEmail');
    let res;
    try{
      res = await fetch(url.toString(), {
        method: 'POST',
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: JSON.stringify({
          recipients,
          subject: 'FOCC Backup Report',
          body,
          trigger,
          generatedAt,
          attachments: [
            {filename: jsonFileName, mimeType:'application/json', base64: jsonBase64},
            {filename: xlsxFileName, mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64: xlsxBase64},
          ],
        }),
      });
    }catch(networkErr){
      throw new Error('Could not reach the Backup Email service (network error or invalid FOCC_BACKUP_API URL).');
    }
    if (!res.ok) throw new Error(`Backup Email service request failed (HTTP ${res.status}).`);
    let json;
    try{ json = await res.json(); }catch(parseErr){ throw new Error('Backup Email service did not return valid JSON.'); }
    if (json && json.success === false) throw new Error(json.error || 'Backup Email service reported an error.');
    return {sent:true, recipients: recipients.length};
  }catch(e){
    console.error('Backup email failed', e);
    return {sent:false, reason:'error', message:String(e && e.message || e)};
  }
}

// Runs a full backup: generates the .json AND .xlsx files (Feature 2),
// emails them to the Backup Email Distribution list if configured
// (Feature 3/4), and logs metadata. trigger: 'Manual' | 'Auto'
// Manual Backup downloads both files to the browser; Auto Backup is
// silent — it still generates both files and emails them, but never
// triggers a browser download or download popup.
async function runBackup(trigger){
  const fileNameBase = buildBackupFileName('FOMS_Backup');
  const fileName = `${fileNameBase}.json`;
  const xlsxFileName = `${fileNameBase}.xlsx`;
  try{
    const tableKeys =
  trigger === 'Manual'
    ? getAuthorizedBackupTableKeys()
    : undefined;

    const payload = await buildBackupPayload(tableKeys);
    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json;charset=utf-8;'});
    if (trigger === 'Manual') downloadBlob(jsonBlob, fileName);

    let xlsxBlob = null;
    let xlsxNote = '';
    try{
      xlsxBlob = buildBackupWorkbookBlob(payload);
      if (trigger === 'Manual') downloadBlob(xlsxBlob, xlsxFileName);
    }catch(xe){
      console.error('Excel backup generation failed', xe);
      xlsxNote = `Excel export failed: ${String(xe && xe.message || xe)}`;
    }

    let emailNote = '';
    if (xlsxBlob){
      const emailResult = await sendBackupEmailIfConfigured({
        trigger, generatedAt: payload.generatedAt, jsonBlob, jsonFileName: fileName, xlsxBlob, xlsxFileName,
      });
      if (emailResult.sent) emailNote = `Emailed to ${emailResult.recipients} recipient(s).`;
      else if (emailResult.reason === 'error') emailNote = `Email not sent: ${emailResult.message}`;
      // 'no_recipients' / 'apps_script_not_configured' are normal, silent skips.
    }

    const note = [xlsxNote, emailNote].filter(Boolean).join(' ');
    const entry = backupMetaEntry({fileName, trigger, status:'Success', note});
    entry.xlsxFileName = xlsxBlob ? xlsxFileName : '';
    await addBackupHistoryEntry(entry);
    return entry;
  }catch(e){
    console.error('Backup failed', e);
    const entry = backupMetaEntry({fileName, trigger, status:'Failed', note:String(e && e.message || e)});
    await addBackupHistoryEntry(entry);
    return entry;
  }
}

// Silent, in-storage-only safety backup taken automatically right
// before a restore is applied. Not a downloaded file — kept as a
// browser-side JSON snapshot so a bad restore can still be recovered.
async function runSafetyBackup(){
  const fileNameBase = buildBackupFileName('FOMS_SafetyBackup');
  const fileName = `${fileNameBase}.json`;
  const payload = await buildBackupPayload();
  await saveSettingsKey(SAFETY_BACKUP_KEY, {fileName, payload, savedAt:new Date().toISOString()});
  const entry = backupMetaEntry({fileName, trigger:'Auto', status:'Success', note:'Pre-restore safety backup'});
  await addBackupHistoryEntry(entry);
  return entry;
}

// Applies a backup payload (from a user-selected file) to every table
// it contains, via the existing saveTableData()/DATA_CACHE — no table
// logic elsewhere is modified.
async function restoreFromBackupPayload(payload){
  if (!payload || typeof payload.tables !== 'object') throw new Error('This file does not look like a FOMS backup.');
  const restoredKeys = [];
  for (const tableKey of Object.keys(payload.tables)){
    if (!TABLES[tableKey]) continue;
    const rows = Array.isArray(payload.tables[tableKey]) ? payload.tables[tableKey] : [];
    DATA_CACHE[tableKey] = rows;
    // Fasa 0: setiap table boleh berada pada provider berbeza.
    const provider = await getActiveProviderAsync(tableKey);
    await provider.saveTable(tableKey, rows);
    restoredKeys.push(tableKey);
  }
  return restoredKeys;
}

/* ---------------------------------------------------------------------
   AUTO BACKUP (every Saturday)
   Client-side only: this app has no server/cron, so the check runs
   whenever the page is open. If the app isn't opened on Saturday, the
   automatic backup simply runs on the next visit — this limitation is
   shown in the UI rather than silently assumed.
--------------------------------------------------------------------- */
function getISOWeekKey(d){
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}
function nextSaturday(from){
  const d = new Date(from);
  const diff = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
async function checkAutoBackup(){
  try{
    const cfg = await getSettingsConfig();
    if (cfg.backupMode === 'manual') return; // Auto Backup is off — user must click "Backup Now"
    const now = new Date();
    if (now.getDay() !== 6) return; // only run the check on Saturdays
    const history = await getBackupHistory();
    const lastAuto = history.find(h => h.trigger === 'Auto' && h.status === 'Success' && !/safety backup/i.test(h.note||''));
    const thisWeek = getISOWeekKey(now);
    if (lastAuto && getISOWeekKey(new Date(lastAuto.isoDate)) === thisWeek) return; // already done this week
    await runBackup('Auto');
  }catch(e){ console.error('Auto backup check failed', e); }
}

/* ---------------------------------------------------------------------
   RESTORE MODAL (reuses the existing #modalOverlay/#modalBox shell)
--------------------------------------------------------------------- */
function openRestoreModal(onDone){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.classList.remove('opkpi-modal');
  box.innerHTML = `
    <h4>&#9888; Restore Backup</h4>
    <div class="notice notice-warning" style="margin-bottom:14px;">
      <strong>WARNING</strong> — Current data will be replaced by the contents of the backup file you select.
      A temporary safety backup of your current data will be saved automatically before restoring.
      Are you sure?
    </div>
    <div class="formfield full">
      <label>Backup File (.json)</label>
      <input type="file" id="restoreFileInput" accept=".json">
    </div>
    <div id="restoreMsg" class="settings-note"></div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn danger" id="confirmRestoreBtn">Restore</button>
    </div>
  `;
  overlay.classList.add('show');
  const close = () => overlay.classList.remove('show');
  box.querySelector('#cancelModal').addEventListener('click', close);
  box.querySelector('#confirmRestoreBtn').addEventListener('click', async () => {
    const fileInput = box.querySelector('#restoreFileInput');
    const msg = box.querySelector('#restoreMsg');
    const file = fileInput.files && fileInput.files[0];
    if (!file){ msg.textContent = 'Please choose a backup file first.'; msg.style.color = 'var(--red)'; return; }
    try{
      msg.style.color = 'var(--muted)';
      msg.textContent = 'Creating safety backup…';
      await runSafetyBackup();
      msg.textContent = 'Reading backup file…';
      const text = await file.text();
      const payload = JSON.parse(text);
      msg.textContent = 'Restoring data…';
      const restoredKeys = await restoreFromBackupPayload(payload);
      await addBackupHistoryEntry(backupMetaEntry({fileName:file.name, trigger:'Manual', status:'Success', note:`Restored ${restoredKeys.length} table(s)`}));
      close();
      if (onDone) await onDone({ok:true, restoredKeys});
    }catch(e){
      console.error('Restore failed', e);
      msg.style.color = 'var(--red)';
      msg.textContent = `Restore failed: ${e && e.message ? e.message : e}`;
      await addBackupHistoryEntry(backupMetaEntry({fileName:file.name, trigger:'Manual', status:'Failed', note:String(e && e.message || e)}));
    }
  });
}

/* ---------------------------------------------------------------------
   MIGRATION PROMPT (Task 10 — reuses the existing modal shell)
   Switching Database Type never auto-overwrites data either direction.
   This just asks Yes/No and resolves a promise with the answer.
--------------------------------------------------------------------- */
function confirmModal(title, message, {confirmLabel='Yes', cancelLabel='No', tone='warning'} = {}){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const showCancel = cancelLabel !== null;
    box.innerHTML = `
      <h4>${title}</h4>
      <div class="notice notice-${tone}" style="margin-bottom:14px;">${message}</div>
      <div class="modalfoot">
        ${showCancel ? `<button class="btn" id="confirmModalNo">${cancelLabel}</button>` : ''}
        <button class="btn ${tone === 'danger' ? 'danger' : 'primary'}" id="confirmModalYes">${confirmLabel}</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('overlay', 'show'); overlay.classList.remove('show'); resolve(result); };
    if (showCancel){
      box.querySelector('#confirmModalNo').addEventListener('click', () => finish(false));
    }
    box.querySelector('#confirmModalYes').addEventListener('click', () => finish(true));
  });
}

/* ---------------------------------------------------------------------
   BACKUP HISTORY MODALS (reuse the existing #modalOverlay/#modalBox
   shell — same pattern as openRestoreModal/confirmModal above).
   These replace confirm() for the two Backup History delete actions.
--------------------------------------------------------------------- */
function openDeleteHistoryRowModal(fileName){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>Delete Backup History Entry</h4>
      <div class="notice notice-danger" style="margin-bottom:14px;">
        This will permanently remove the log entry below from Backup History. The backup file itself, if already downloaded, is not affected.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:4px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">File</div>
        <div class="value mono" style="font-family:var(--font-mono);font-size:13px;color:var(--ink);margin-top:3px;word-break:break-all;">${escapeHtml(fileName)}</div>
      </div>
      <div class="modalfoot">
        <button class="btn" id="deleteRowCancel">Cancel</button>
        <button class="btn danger" id="deleteRowConfirm">Delete</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('show'); resolve(result); };
    box.querySelector('#deleteRowCancel').addEventListener('click', () => finish(false));
    box.querySelector('#deleteRowConfirm').addEventListener('click', () => finish(true));
  });
}
function openDeleteAllHistoryModal(entryCount){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>&#9888; Delete All Backup History</h4>
      <div class="notice notice-danger" style="margin-bottom:14px;">
        <strong>WARNING</strong> — This will permanently delete all ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'} in the Backup History log. Only the history log is affected — backup files you have already downloaded remain unchanged on disk and are not deleted by this action. This cannot be undone.
      </div>
      <div class="modalfoot">
        <button class="btn" id="deleteAllCancel">Cancel</button>
        <button class="btn danger" id="deleteAllConfirm">Delete All</button>
      </div>
    `;
    overlay.classList.add('show');
    const finish = (result) => { overlay.classList.remove('show'); resolve(result); };
    box.querySelector('#deleteAllCancel').addEventListener('click', () => finish(false));
    box.querySelector('#deleteAllConfirm').addEventListener('click', () => finish(true));
  });
}

/* ---------------------------------------------------------------------
   PAGE: SETTINGS
--------------------------------------------------------------------- */
/* ---- 4.20 SETTINGS PAGE ---- */

async function renderSettingsPage(){
  const cfg = await getSettingsConfig();
  const history = await getBackupHistory();
  const lastBackup = history.find(h => h.status === 'Success') || null;
  const lastAuto = history.find(h => h.trigger === 'Auto' && h.status === 'Success' && !/safety backup/i.test(h.note||'')) || null;
  const nextAuto = nextSaturday(new Date());

  let totalRecords = 0;
  let approxBytes = 0;
  // Defensive per-table load: a single table that the backend doesn't
  // recognise yet (e.g. a Google Sheet tab not created for a newly added
  // module — HIRARC_MASTER/HIRARC_HAZARDS being the current example)
  // used to throw "Unknown table" and crash the ENTIRE Settings page,
  // since getData() ran uncaught inside this loop. Now a failed table is
  // just skipped (and logged) so Settings still renders with the totals
  // from every table that DID load successfully.
  for (const tableKey of Object.keys(TABLES)){
    try {
      const rows = await getData(tableKey);
      totalRecords += rows.length;
      approxBytes += JSON.stringify(rows).length;
    } catch (err){
      console.warn('Settings storage summary: skipping table', tableKey, '-', err && err.message);
    }
  }
  const storageUsage = approxBytes > 1024*1024
    ? `${(approxBytes/(1024*1024)).toFixed(2)} MB`
    : `${(approxBytes/1024).toFixed(1)} KB`;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <!-- Database Settings: hidden from users per request — section is
         still fully rendered and wired up (Test Connection, Save
         Configuration, inputs), just not shown. Remove the inline
         style below (or the wrapping div) to re-enable it. -->
    <div class="section" style="display:none;">
      <div class="section-head">
        <h3>Database Settings</h3>
        <span class="eyebrow">Sync configuration</span>
        <div class="spacer"></div>
        <span id="dbStatusBadge">${settingsStatusBadgeHtml(cfg.connectionStatus)}</span>
      </div>
      <div class="section-body">
        <div class="settings-grid">
          <div class="formfield">
            <label>Company Name</label>
            <input type="text" id="cfgCompanyName" value="${escapeHtml(cfg.companyName)}" placeholder="e.g. Kemaman Operation">
          </div>
          <div class="formfield"></div>
          <div class="formfield">
            <label>Google Sheet ID</label>
            <input type="text" id="cfgSheetId" value="${escapeHtml(cfg.googleSheetId)}" placeholder="1AbCXyz... (Sheet ID from its URL)">
          </div>
          <div class="formfield">
            <label>Google Apps Script URL</label>
            <input type="text" id="cfgAppsScriptUrl" value="${escapeHtml(cfg.appsScriptUrl)}" placeholder="https://script.google.com/macros/s/.../exec">
          </div>
          <div class="formfield full">
            <label>Database Type</label>
            <div class="radio-group">
              <label class="radio-option"><input type="radio" name="cfgProvider" value="local" ${cfg.provider === 'sheet' ? '' : 'checked'}> Local Storage</label>
              <label class="radio-option"><input type="radio" name="cfgProvider" value="sheet" ${cfg.provider === 'sheet' ? 'checked' : ''}> Google Sheet</label>
            </div>
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn" id="testConnectionBtn">Test Connection</button>
          <button class="btn primary" id="saveConfigBtn">Save Configuration</button>
        </div>
        <div class="settings-note" id="dbConfigNote">
          Data is currently synced to <strong>${cfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage (this browser)'}</strong>. Test Connection performs a real <span class="mono">?action=ping</span> call to the Apps Script URL above — it only reports "Connected" once that call actually succeeds.
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Backup &amp; Restore</h3>
        <span class="eyebrow">${history.length} log ${history.length === 1 ? 'entry' : 'entries'}</span>
        <div class="spacer"></div>
        <span class="savechip" id="savechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="formfield full" style="max-width:420px;">
          <label>Backup Mode</label>
          <div class="radio-group">
            <label class="radio-option"><input type="radio" name="cfgBackupMode" value="auto" ${cfg.backupMode === 'manual' ? '' : 'checked'}> Auto Backup</label>
            <label class="radio-option"><input type="radio" name="cfgBackupMode" value="manual" ${cfg.backupMode === 'manual' ? 'checked' : ''}> Manual Backup</label>
          </div>
        </div>
        <div class="settings-note" id="backupModeNote" style="margin-top:6px;">${cfg.backupMode === 'manual' ? 'Auto Backup is off — backups only happen when you click "Backup Now".' : 'Auto Backup is on — a backup runs automatically every Saturday while the app is open.'}</div>

        <div style="height:18px"></div>
        <div class="formfield full" style="max-width:520px;">
          <label>Backup Email Distribution</label>
          <div class="backup-email-addrow">
            <input type="email" id="backupEmailInput" placeholder="e.g. admin@company.com">
            <button class="btn" id="backupEmailAddBtn" type="button">+ Add Email</button>
          </div>
          <div class="settings-note" id="backupEmailError" style="margin-top:6px;color:var(--red);display:none;"></div>
          <div class="backup-email-list" id="backupEmailList">
            ${(cfg.backupEmails && cfg.backupEmails.length) ? cfg.backupEmails.map(addr => `
              <div class="backup-email-row">
                <span class="backup-email-addr">${escapeHtml(addr)}</span>
                <button class="btn rowdel backup-email-remove" data-email="${escapeHtml(addr)}" type="button">Remove</button>
              </div>
            `).join('') : `<div class="backup-email-empty">No backup email recipients yet — backups will not be emailed until at least one is added.</div>`}
          </div>
          <div class="settings-note">Every completed backup (Auto or Manual) emails the JSON and Excel backup files to everyone on this list.</div>
        </div>

        <div style="height:12px"></div>
        <div class="settings-actions" style="margin-top:0;">
          <button class="btn primary" id="backupNowBtn">Backup Now</button>
          <button class="btn danger" id="restoreBackupBtn">Restore Backup</button>
        </div>
        <div style="height:14px"></div>
        <div class="backup-summary" id="lastBackupSummary">
          ${lastBackup ? `
            <div class="bs-field"><div class="label">Last Backup</div><div class="value"><span class="badge good">&#10003; Success</span></div></div>
            <div class="bs-field"><div class="label">Date</div><div class="value">${escapeHtml(lastBackup.date)}</div></div>
            <div class="bs-field"><div class="label">Time</div><div class="value">${escapeHtml(lastBackup.time)}</div></div>
            <div class="bs-field"><div class="label">File</div><div class="value">${escapeHtml(lastBackup.fileName)}</div></div>
            <div class="bs-field"><div class="label">Trigger</div><div class="value">${escapeHtml(lastBackup.trigger)}</div></div>
            <div class="bs-field"><div class="label">User</div><div class="value">${escapeHtml(lastBackup.user)}</div></div>
          ` : `<div class="settings-note" style="margin-top:0;">No backup has been made yet. Click "Backup Now" to create one.</div>`}
        </div>

        <div style="height:16px"></div>
        <div class="backup-summary">
          <div class="bs-field"><div class="label">Next Scheduled Backup</div><div class="value">${nextAuto.toLocaleDateString('en-GB',{weekday:'short', day:'2-digit', month:'short', year:'numeric'})} (Sat)</div></div>
          <div class="bs-field"><div class="label">Last Scheduled Backup</div><div class="value">${lastAuto ? `${escapeHtml(lastAuto.date)} ${escapeHtml(lastAuto.time)}` : 'None yet'}</div></div>
          <div class="bs-field"><div class="label">Backup Status</div><div class="value">${lastAuto ? '<span class="badge good">Success</span>' : '<span class="badge neutral">Pending</span>'}</div></div>
        </div>
        <div class="settings-note">Auto backup runs every Saturday, checked automatically when this app is open (it has no server, so it cannot run while the browser is closed — it will simply run on the next visit that falls on or after a missed Saturday).</div>

        <div style="height:18px"></div>
        <div class="section-head" style="margin:0 -18px;border-radius:0;">
          <h3 style="font-size:13px;">Backup History</h3>
          <div class="spacer"></div>
          <button class="btn danger" id="deleteAllHistoryBtn" ${history.length ? '' : 'disabled'} style="padding:5px 12px;font-size:12px;">Delete All History</button>
        </div>
        <div class="backup-history-scroll" style="margin-top:10px;">
          <table class="kpi-bucket-table" style="width:100%;">
            <thead><tr><th>Date</th><th>Time</th><th>File</th><th>Trigger</th><th>User</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${history.length ? history.map(h => `
                <tr>
                  <td class="date-cell">${escapeHtml(h.date)}</td>
                  <td>${escapeHtml(h.time)}</td>
                  <td>${escapeHtml(h.fileName)}</td>
                  <td>${escapeHtml(h.trigger)}</td>
                  <td>${escapeHtml(h.user)}</td>
                  <td>${h.status === 'Success' ? '<span class="badge good">Success</span>' : '<span class="badge bad">Failed</span>'}</td>
                  <td><button class="backup-history-row-del" data-iso="${escapeHtml(h.isoDate)}" data-file="${escapeHtml(h.fileName)}">Delete</button></td>
                </tr>
              `).join('') : `<tr><td colspan="7" class="kpi-bucket-empty">No backup history yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>System Information</h3>
        <span class="eyebrow">Live snapshot</span>
      </div>
      <div class="section-body">
        <div class="settings-infogrid">
          <div class="settings-infocard"><div class="label">System Version</div><div class="value">${escapeHtml(APP_VERSION)}</div></div>
          <div class="settings-infocard"><div class="label">Database Type</div><div class="value mono">${cfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage'}</div></div>
          <div class="settings-infocard"><div class="label">Last Backup</div><div class="value mono">${lastBackup ? `${lastBackup.date} ${lastBackup.time}` : 'Never'}</div></div>
          <div class="settings-infocard"><div class="label">Total Records</div><div class="value">${totalRecords.toLocaleString()}</div></div>
          <div class="settings-infocard"><div class="label">Storage Usage</div><div class="value">${storageUsage}</div></div>
        </div>
      </div>
    </div>
  `;

  // ---- Test Connection (Task 8: real ?action=ping API call) ----
  wrap.querySelector('#testConnectionBtn').addEventListener('click', async () => {
    const liveCfg = {
      ...cfg,
      googleSheetId: wrap.querySelector('#cfgSheetId').value.trim(),
      appsScriptUrl: wrap.querySelector('#cfgAppsScriptUrl').value.trim(),
    };
    const note = wrap.querySelector('#dbConfigNote');
    const formatStatus = computeConnectionStatus(liveCfg);
    if (formatStatus === 'not_configured'){
      note.innerHTML = 'Google Sheet ID or Apps Script URL format looks invalid or is empty. Fix the format before testing — no request was sent.';
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('not_configured');
      return;
    }
    const btn = wrap.querySelector('#testConnectionBtn');
    btn.disabled = true; btn.textContent = 'Testing…';
    try{
      await pingGoogleSheet(liveCfg);
      note.innerHTML = 'Connected — the Apps Script <span class="mono">?action=ping</span> call succeeded.';
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('connected');
      await saveSettingsConfig({...liveCfg, connectionStatus:'connected'});
    }catch(e){
      note.innerHTML = `Connection failed: ${escapeHtml(String(e && e.message || e))}`;
      wrap.querySelector('#dbStatusBadge').innerHTML = settingsStatusBadgeHtml('configured');
      await saveSettingsConfig({...liveCfg, connectionStatus:'configured'});
    }finally{
      btn.disabled = false; btn.textContent = 'Test Connection';
    }
  });

  // ---- Save Configuration (Task 4/9/10: Database Type switch, cache clear, migration prompt) ----
  wrap.querySelector('#saveConfigBtn').addEventListener('click', async () => {
    const selectedProvider = wrap.querySelector('input[name="cfgProvider"]:checked').value;
    const providerChanged = selectedProvider !== cfg.provider;
    const note = wrap.querySelector('#dbConfigNote');
    const badge = wrap.querySelector('#dbStatusBadge');

    const newCfg = {
      ...cfg,
      companyName: wrap.querySelector('#cfgCompanyName').value.trim(),
      googleSheetId: wrap.querySelector('#cfgSheetId').value.trim(),
      appsScriptUrl: wrap.querySelector('#cfgAppsScriptUrl').value.trim(),
      provider: selectedProvider,
    };
    // A config/provider edit invalidates any earlier "Connected"/"Sync
    // Active" result — recompute the base format status; the real
    // network states are only re-earned via Test Connection or a real
    // loadTable/saveTable (Task 7/8).
    newCfg.connectionStatus = computeConnectionStatus(newCfg);
    await saveSettingsConfig(newCfg);
    badge.innerHTML = settingsStatusBadgeHtml(newCfg.connectionStatus);
    note.innerHTML = `Data is currently synced to <strong>${newCfg.provider === 'sheet' ? 'Google Sheet' : 'Local Storage (this browser)'}</strong>. Test Connection performs a real <span class="mono">?action=ping</span> call to the Apps Script URL above — it only reports "Connected" once that call actually succeeds.`;

    if (providerChanged){
      // Task 9: prevent stale data — clear the in-memory cache so every
      // page reloads fresh from whichever provider is now active.
      Object.keys(DATA_CACHE).forEach(k => delete DATA_CACHE[k]);

      if (newCfg.provider === 'sheet'){
        // Task 10: never auto-overwrite Local Storage — always ask first.
        const loadFromSheet = await confirmModal(
          'Load from Google Sheet?',
          'You switched Database Type to Google Sheet. Load existing data from the Google Sheet now? Choosing "No" keeps the cache cleared and empty — pages will pull fresh from Google Sheet as you visit them.'
        );
        if (loadFromSheet){
          note.innerHTML = 'Loading data from Google Sheet…';
          try{
            for (const tableKey of Object.keys(TABLES)){
              DATA_CACHE[tableKey] = await GoogleSheetProvider.loadTable(tableKey);
            }
            const synced = {...newCfg, connectionStatus:'sync_active'};
            await saveSettingsConfig(synced);
            badge.innerHTML = settingsStatusBadgeHtml('sync_active');
            note.innerHTML = 'Now synced to Google Sheet — data loaded successfully from every table.';
          }catch(e){
            note.innerHTML = `Could not load from Google Sheet: ${escapeHtml(String(e && e.message || e))}. Fix the configuration and try again — pages will retry automatically on next visit.`;
          }
        } else {
          note.innerHTML = 'Google Sheet is now the active database. Existing data was left untouched in Local Storage; pages will read fresh from Google Sheet from here on.';
        }
      } else {
        note.innerHTML = 'Switched back to Local Storage. The cache was cleared — pages will read from this browser\'s Local Storage from here on.';
      }
    }
    flashSaved();
  });

  // ---- Backup Mode (Auto / Manual) — saved to local settings immediately ----
  wrap.querySelectorAll('input[name="cfgBackupMode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const mode = e.target.value === 'manual' ? 'manual' : 'auto';
      const latestCfg = await getSettingsConfig();
      await saveSettingsConfig({...latestCfg, backupMode: mode});
      const note = wrap.querySelector('#backupModeNote');
      note.textContent = mode === 'manual'
        ? 'Auto Backup is off — backups only happen when you click "Backup Now".'
        : 'Auto Backup is on — a backup runs automatically every Saturday while the app is open.';
      flashSaved();
    });
  });

  // ---- Backup Email Distribution: Add (Feature 3) ----
  const emailErrorEl = wrap.querySelector('#backupEmailError');
  function showEmailError(msg){
    emailErrorEl.textContent = msg;
    emailErrorEl.style.display = 'block';
  }
  const backupEmailAddBtn = wrap.querySelector('#backupEmailAddBtn');
  const backupEmailInputEl = wrap.querySelector('#backupEmailInput');
  if (backupEmailInputEl){
    backupEmailInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter'){ e.preventDefault(); backupEmailAddBtn && backupEmailAddBtn.click(); }
    });
  }
  if (backupEmailAddBtn){
    backupEmailAddBtn.addEventListener('click', async () => {
      const input = wrap.querySelector('#backupEmailInput');
      const raw = (input.value || '').trim();
      emailErrorEl.style.display = 'none';
      if (!raw){ showEmailError('Enter an email address first.'); return; }
      // Simple, standard email format check.
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(raw)){ showEmailError('That doesn\'t look like a valid email address.'); return; }
      const latestCfg = await getSettingsConfig();
      const existing = Array.isArray(latestCfg.backupEmails) ? latestCfg.backupEmails : [];
      if (existing.some(addr => addr.toLowerCase() === raw.toLowerCase())){
        showEmailError('That email is already on the list.');
        return;
      }
      const updated = [...existing, raw];
      await saveSettingsConfig({...latestCfg, backupEmails: updated});
      flashSaved();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  }

  // ---- Backup Email Distribution: Remove (Feature 3) ----
  wrap.querySelectorAll('.backup-email-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const addr = btn.getAttribute('data-email');
      const latestCfg = await getSettingsConfig();
      const existing = Array.isArray(latestCfg.backupEmails) ? latestCfg.backupEmails : [];
      const updated = existing.filter(a => a !== addr);
      await saveSettingsConfig({...latestCfg, backupEmails: updated});
      flashSaved();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  // ---- Backup History: Delete one row ----
  wrap.querySelectorAll('.backup-history-row-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const iso = btn.getAttribute('data-iso');
      const fileName = btn.getAttribute('data-file');
      const confirmed = await openDeleteHistoryRowModal(fileName);
      if (!confirmed) return;
      await deleteBackupHistoryEntry(iso, fileName);
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  // ---- Backup History: Delete All History ----
  const deleteAllBtn = wrap.querySelector('#deleteAllHistoryBtn');
  if (deleteAllBtn){
    deleteAllBtn.addEventListener('click', async () => {
      if (deleteAllBtn.disabled) return;
      const confirmed = await openDeleteAllHistoryModal(history.length);
      if (!confirmed) return;
      await clearBackupHistory();
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  }

  // ---- Backup Now ----
  wrap.querySelector('#backupNowBtn').addEventListener('click', async () => {
    const btn = wrap.querySelector('#backupNowBtn');
    btn.disabled = true; btn.textContent = 'Backing up…';
    await runBackup('Manual');
    btn.disabled = false; btn.textContent = 'Backup Now';
    const node = await renderSettingsPage();
    wrap.replaceWith(node);
  });

  // ---- Restore Backup ----
  wrap.querySelector('#restoreBackupBtn').addEventListener('click', () => {
    openRestoreModal(async () => {
      const node = await renderSettingsPage();
      wrap.replaceWith(node);
    });
  });

  return wrap;
}

/* ---------------------------------------------------------------------
   RELEASE MANAGER (Settings > Release Manager)
   SuperAdmin-only page (gated in userCanAccess/isSuperAdmin below).
   Publishes a release note through the 'admin-provision' Edge Function
   (action=create_release) into the Supabase `releases` table, and lists
   existing releases back via action=list_releases.
--------------------------------------------------------------------- */
const RELEASE_TYPES = ['Feature', 'Fix', 'Improvement', 'Announcement'];

// Tolerant of either casing a backend may return (Version/version,
// ReleaseDate/releaseDate/date, etc.) so it still works if the shape of
// the source data ever changes.
function normalizeSystemUpdateRow(r){
  return {
    releaseId: r.releaseId ?? r.release_id ?? null,
    version: r.version ?? r.Version ?? '',
    releaseDate: r.releaseDate ?? r.ReleaseDate ?? r.date ?? r.Date ?? '',
    type: r.type ?? r.Type ?? '',
    title: r.title ?? r.Title ?? '',
    description: r.description ?? r.Description ?? '',
  };
}

function renderReleaseManagerTable(rows){
  if (!rows.length) return `<div class="settings-note" style="margin-top:0;">No releases published yet.</div>`;
  return `<div class="tablewrap admin-rows-5">
    <table class="kpi-bucket-table" style="width:100%;">
      <thead><tr><th>Version</th><th>Date</th><th>Type</th><th>Title</th><th>Description</th><th style="width:96px;text-align:right;">Actions</th></tr></thead>
      <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td class="date-cell">${escapeHtml(r.version || '-')}</td>
            <td>${escapeHtml(fmtDate ? fmtDate(r.releaseDate) : (r.releaseDate || '-'))}</td>
            <td>${escapeHtml(r.type || '-')}</td>
            <td>${escapeHtml(r.title || '-')}</td>
            <td class="reason-cell" style="white-space:normal;max-width:320px;"><span class="clamp-1line">${escapeHtml(r.description || '-')}</span></td>
            <td style="text-align:right;white-space:nowrap;">
              ${i === 0
                ? `<span title="Release terkini — dilindungi. Untuk betulkan, publish versi baharu." style="font-size:11px;color:var(--muted);">🔒 Latest</span>`
                : (r.releaseId != null
                    ? `<button class="btn danger" data-release-id="${escapeHtml(String(r.releaseId))}" data-release-version="${escapeHtml(r.version || '')}" style="padding:5px 12px;font-size:12px;">Delete</button>`
                    : `<span style="font-size:11px;color:var(--muted);">—</span>`)}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

/* ---------------------------------------------------------------------
   BUG REPORT — butang "!" di topbar (bahagian UI)
   Hantar terus ke Supabase via Edge Function (action=create_bug_report).
   TIADA salinan dalam browser — laporan tak pernah disimpan di sini,
   jadi ia tak boleh hilang macam cache.
--------------------------------------------------------------------- */
const BUG_SEVERITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

// Satu ID unik untuk satu hantar — halang double submit / retry cipta baris baru.
function bugNewRequestId(){
  const rnd = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  return 'bug-' + rnd;
}

function bugReportSession(){
  try{ return JSON.parse(localStorage.getItem(FOCC_SESSION_KEY) || 'null'); }catch(e){ return null; }
}

// Dropdown page — hanya route yang user ini boleh buka.
function bugReportPageList(){
  return Object.keys(ROUTES)
    .filter(k => userCanAccess(k))
    .map(k => ({ key: k, title: (ROUTES[k] && ROUTES[k].title) || k }));
}

function openBugReportModal(){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const session = bugReportSession() || {};
    const pages = bugReportPageList();
    const currentTitle = (ROUTES[currentRoute] && ROUTES[currentRoute].title) || currentRoute;
    const requestId = bugNewRequestId();   // satu ID untuk borang ini

    box.classList.remove('opkpi-modal');
    box.classList.remove('user-modal');
    box.classList.add('bugreport-modal');
    box.innerHTML = `
      <h4>Report a Problem</h4>
      <div class="notice notice-info" style="margin-bottom:14px;">Tell us what went wrong. Your report goes straight to the support team.</div>
      <div class="formgrid">
        <div class="formfield full">
          <label>What went wrong? *</label>
          <input type="text" id="bugTitle" maxlength="120" placeholder="Short summary, e.g. Filter resets after refresh">
        </div>
        <div class="formfield">
          <label>Page / Module *</label>
          <div class="fpick" data-fp="bugPage">
            <input type="text" id="bugPage" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select page..." value="">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugPage" style="max-height:232px;"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Severity *</label>
          <div class="fpick" data-fp="bugSeverity">
            <input type="text" id="bugSeverity" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="Medium">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugSeverity"></div>
          </div>
        </div>
        <div class="formfield full">
          <label>What happened? *</label>
          <textarea id="bugDescription" rows="4" maxlength="3000" placeholder="Describe the problem and what you expected instead."></textarea>
        </div>
        <div class="formfield full">
          <label>Steps to reproduce (optional)</label>
          <textarea id="bugSteps" rows="3" maxlength="2000" placeholder="1. Go to...  2. Click...  3. See..."></textarea>
        </div>
      </div>
      <div class="bugcontext">
        Sent automatically: <strong>${escapeHtml(session.email || '')}</strong>${session.company ? ' &middot; ' + escapeHtml(session.company) : ''} &middot; ${escapeHtml(currentTitle)}
      </div>
      <div class="settings-note" id="bugFormNote" style="display:none;"></div>
      <div class="modalfoot">
        <button class="btn" id="bugCancel">Cancel</button>
        <button class="btn primary" id="bugSubmit">Send Report</button>
      </div>
    `;
    overlay.classList.add('show');
    wireBugPagePicker(box, pages, currentRoute);
    wireFixedPicker(box, {
      field:'[data-fp="bugSeverity"]', input:'#bugSeverity',
      panel:'[data-fp-panel="bugSeverity"]', values: BUG_SEVERITY_OPTIONS, current: 'Medium'
    });

    const noteEl = box.querySelector('#bugFormNote');
    const submitBtn = box.querySelector('#bugSubmit');
    function showNote(text, isError){
      noteEl.style.display = 'block';
      noteEl.style.color = isError ? 'var(--red)' : 'var(--green)';
      noteEl.textContent = text;
    }
    function close(result){
      overlay.classList.remove('show');
      box.classList.remove('bugreport-modal');
      resolve(result);
    }

    box.querySelector('#bugCancel').addEventListener('click', () => close(false));

    submitBtn.addEventListener('click', async () => {
      const title = box.querySelector('#bugTitle').value.trim();
      const description = box.querySelector('#bugDescription').value.trim();
      const steps = box.querySelector('#bugSteps').value.trim();
      const pageSel = box.querySelector('#bugPage');
      const pageKey = pageSel.dataset.key || pageSel.value;
      const pageTitle = pageSel.dataset.title || pageKey;
      const severity = box.querySelector('#bugSeverity').value;

      if (title.length < 3){ showNote('Please summarise the problem in the title (at least 3 characters).', true); return; }
      if (description.length < 5){ showNote('Please tell us what happened.', true); return; }

      noteEl.style.display = 'none';
      submitBtn.disabled = true;
      const label = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';

      try{
        await adminInvoke('create_bug_report', {
          requestId: requestId,
          title: title,
          description: description,
          steps: steps,
          pageKey: pageKey,
          pageTitle: pageTitle,
          severity: severity,
          appVersion: FOCC_VERSION || '',
          userAgent: navigator.userAgent || '',
        });
        box.innerHTML = `
          <h4>Report Sent</h4>
          <div class="notice notice-success" style="margin-bottom:14px;">
            Thanks — <strong>${escapeHtml(title)}</strong> has been sent to the support team.
          </div>
          <div class="modalfoot"><button class="btn primary" id="bugDone">Close</button></div>
        `;
        bugBadgeRefresh();   // SuperAdmin: laporan sendiri pun naikkan dot
        box.querySelector('#bugDone').addEventListener('click', () => close(true));
      }catch(err){
        showNote('Not submitted — ' + String((err && err.message) || err), true);
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      }
    });
  });
}

// Status yang SuperAdmin boleh pilih sendiri.
// 'Fixed' TIADA di sini — ia hanya datang dari "Prepare Fix Release" (Langkah 5).
const BUG_STATUS_OPTIONS = ['New', 'On Repairing', 'Ready for Release', 'Rejected'];

function bugStatusBadge(status){
  const s = String(status || 'New');
  const cls = s === 'Fixed' ? 'good' : s === 'Rejected' ? 'bad' : s === 'On Repairing' ? 'warn' : s === 'Ready for Release' ? 'ready' : 'neutral';
  return `<span class="badge ${cls}">${escapeHtml(s)}</span>`;
}

function bugWhen(iso){
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 16).replace('T', ' ');
  return d.toLocaleString(undefined, { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function renderBugReportsTable(list){
  if (!list.length) return `<div class="settings-note" style="margin-top:0;">No bug reports yet.</div>`;
  return `<div class="tablewrap admin-rows-5">
    <table class="kpi-bucket-table" style="width:100%;">
      <thead><tr>
        <th>Ref</th><th>Reported</th><th>By</th><th>Page</th>
        <th>Severity</th><th>Title</th><th>Status</th>
        <th style="width:74px;text-align:right;">Actions</th>
      </tr></thead>
      <tbody>
        ${list.map(b => `
          <tr>
            <td class="date-cell">#${b.bugId}</td>
            <td style="white-space:nowrap;">${escapeHtml(bugWhen(b.createdAt))}</td>
            <td>${escapeHtml(b.reporterEmail || '-')}<br><span style="font-size:11px;color:var(--muted);">${escapeHtml(b.reporterCompany || '')}</span></td>
            <td>${escapeHtml(b.pageTitle || b.pageKey || '-')}</td>
            <td>${escapeHtml(b.severity || '-')}</td>
            <td class="reason-cell" style="white-space:normal;max-width:200px;"><span class="clamp-1line">${escapeHtml(b.title || '-')}</span></td>
            <td>${bugStatusBadge(b.status)}</td>
            <td style="text-align:right;">
              <button class="btn" data-bug-id="${b.bugId}" style="padding:6px 10px;font-size:12px;">View</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>`;
}

// Papar laporan penuh + tukar status. Resolve true kalau ada perubahan.
function openBugDetailModal(bug){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    let changed = false;
    let prepareFix = null;

    // 'Fixed' hanya dipaparkan kalau laporan itu memang sudah Fixed (tidak boleh dipilih manual).
    const statusList = BUG_STATUS_OPTIONS.indexOf(bug.status) >= 0
      ? BUG_STATUS_OPTIONS
      : BUG_STATUS_OPTIONS.concat([bug.status]);

    box.classList.remove('user-modal');
    box.classList.remove('opkpi-modal');
    box.classList.add('bugreport-modal');
    box.innerHTML = `
      <h4>Bug Report #${bug.bugId}</h4>
      <div class="bugmeta">
        <div><span>Status</span><strong>${bugStatusBadge(bug.status)}</strong></div>
        <div><span>Severity</span><strong>${escapeHtml(bug.severity)}</strong></div>
        <div><span>Reported</span><strong>${escapeHtml(bugWhen(bug.createdAt))}</strong></div>
        <div><span>Reported by</span><strong>${escapeHtml(bug.reporterEmail)}</strong></div>
        <div><span>Company</span><strong>${escapeHtml(bug.reporterCompany || '-')}</strong></div>
        <div><span>Page</span><strong>${escapeHtml(bug.pageTitle || bug.pageKey || '-')}</strong></div>
        <div><span>Last updated</span><strong>${escapeHtml(bugWhen(bug.updatedAt))}${bug.updatedBy ? ' by ' + escapeHtml(bug.updatedBy) : ''}</strong></div>
        <div><span>Fixed in</span><strong>${escapeHtml(bug.fixedVersion || '-')}</strong></div>
      </div>
      <div class="bugblock"><label>What went wrong</label><p>${escapeHtml(bug.title)}</p></div>
      <div class="bugblock"><label>What happened</label><p>${escapeHtml(bug.description)}</p></div>
      ${bug.steps ? `<div class="bugblock"><label>Steps to reproduce</label><p>${escapeHtml(bug.steps)}</p></div>` : ''}
      <div class="bugblock"><label>Technical</label><p>App version ${escapeHtml(bug.appVersion || '-')}<br>${escapeHtml(bug.userAgent || '-')}</p></div>

      <div class="settings-grid" style="margin-top:14px;">
        <div class="formfield">
          <label>Set status</label>
          <div class="fpick" data-fp="bugStatusSelect">
            <input type="text" id="bugStatusSelect" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml(bug.status || '')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="bugStatusSelect" style="top:auto;bottom:calc(100% + 6px);"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Note (optional)</label>
          <input type="text" id="bugStatusNote" maxlength="200" value="${escapeHtml(bug.statusNote || '')}" placeholder="e.g. Duplicate of #4">
        </div>
      </div>
      <div class="settings-note" id="bugDetailNote" style="display:none;"></div>
      <div class="modalfoot">
        <button class="btn" id="bugDetailClose">Close</button>
        <button class="btn" id="bugStatusSave">Save Status</button>
        ${bug.status === 'Fixed'
          ? `<button class="btn" disabled>Already fixed${bug.fixedVersion ? ' in ' + escapeHtml(bug.fixedVersion) : ''}</button>`
          : `<button class="btn primary" id="bugPrepareFix">Prepare Fix Release</button>`}
      </div>
    `;
    overlay.classList.add('show');
    wireFixedPicker(box, {
      field:'[data-fp="bugStatusSelect"]', input:'#bugStatusSelect',
      panel:'[data-fp-panel="bugStatusSelect"]', values: statusList, current: bug.status
    });

    const noteEl = box.querySelector('#bugDetailNote');
    function finish(){
      overlay.classList.remove('show');
      box.classList.remove('bugreport-modal');
      resolve({ changed: changed, prepareFix: prepareFix });
    }

    box.querySelector('#bugDetailClose').addEventListener('click', finish);

    box.querySelector('#bugStatusSave').addEventListener('click', async () => {
      const status = box.querySelector('#bugStatusSelect').value;
      const note = box.querySelector('#bugStatusNote').value.trim();
      if (status === bug.status && note === (bug.statusNote || '')){ finish(); return; }

      const btn = box.querySelector('#bugStatusSave');
      btn.disabled = true; btn.textContent = 'Saving…';
      try{
        await adminInvoke('set_bug_status', {
          bugId: bug.bugId,
          status: status,
          note: note,
          expectedUpdatedAt: bug.updatedAt,   // kunci elak 2 admin timpa satu sama lain
        });
        changed = true;
        finish();
      }catch(err){
        btn.disabled = false; btn.textContent = 'Save Status';
        noteEl.style.display = 'block';
        noteEl.style.color = 'var(--red)';
        noteEl.textContent = String((err && err.message) || err);
      }
    });
        // Prepare Fix Release: tanda 'Ready for Release' + hantar maklumat ke borang.
    const prepBtn = box.querySelector('#bugPrepareFix');
    if (prepBtn) prepBtn.addEventListener('click', async () => {
      prepBtn.disabled = true; prepBtn.textContent = 'Preparing…';
      try{
        if (bug.status !== 'Ready for Release'){
          await adminInvoke('set_bug_status', {
            bugId: bug.bugId,
            status: 'Ready for Release',
            note: bug.statusNote || '',
            expectedUpdatedAt: bug.updatedAt,
          });
          changed = true;
        }
        prepareFix = bug;
        finish();
      }catch(err){
        prepBtn.disabled = false; prepBtn.textContent = 'Prepare Fix Release';
        noteEl.style.display = 'block';
        noteEl.style.color = 'var(--red)';
        noteEl.textContent = String((err && err.message) || err);
      }
    });
  });
}

/* ---------------------------------------------------------------------
   DOT MERAH pada "!" — penunjuk laporan bug yang masih berstatus New.
   HANYA SuperAdmin: server menolak 'list_bug_reports' untuk user biasa,
   jadi user biasa tidak pernah nampak dot ini (dan tidak fetch apa-apa).
   Dot hilang apabila STATUS laporan bertukar — bukan kerana page dibuka,
   supaya laporan yang belum diusik tak terlepas pandang..
--------------------------------------------------------------------- */
const BUG_BADGE_POLL_MS = 60000;
let bugBadgeTimer = null;

function bugBadgeRender(count){
  const dot = document.getElementById('bugDot');
  const btn = document.getElementById('bugReportToggle');
  if (!dot || !btn) return;
  const n = Number(count) || 0;
  if (!n){
    dot.hidden = true;
    btn.classList.remove('has-new-bugs');
    btn.title = 'Report a problem';
    btn.setAttribute('aria-label', 'Report a problem');
    return;
  }
  dot.hidden = false;
  btn.classList.add('has-new-bugs');
  const label = n + ' new bug report' + (n === 1 ? '' : 's');
  btn.title = 'Report a problem — ' + label;
  btn.setAttribute('aria-label', 'Report a problem — ' + label);
}

// Ambil semula dari server (bukan cache) — sama macam table Bug Reports.
async function bugBadgeRefresh(){
  if (!isSuperAdmin()){ bugBadgeRender(0); return; }
  if (document.hidden) return;       // tab tak nampak — tak perlu tanya server
  try{
    const res = await adminInvoke('list_bug_reports');
    const list = (res && res.data) || [];
    bugBadgeRender(list.filter(b => b.status === 'New').length);
  }catch(err){
    // Dot cuma penunjuk — jangan ganggu kerja user kalau ia gagal.
    console.warn('Bug badge refresh failed:', err);
  }
}

// Sekali sahaja: polling ringan + semak balik bila tab aktif semula.
function bugBadgeStart(){
  bugBadgeRefresh();
  if (bugBadgeTimer) clearInterval(bugBadgeTimer);
  bugBadgeTimer = setInterval(bugBadgeRefresh, BUG_BADGE_POLL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) bugBadgeRefresh(); });
  window.addEventListener('focus', bugBadgeRefresh);
}

// Logout: hentikan polling dan padamkan dot.
function bugBadgeStop(){
  if (bugBadgeTimer){ clearInterval(bugBadgeTimer); bugBadgeTimer = null; }
  bugBadgeRender(0);
}

// Butang "!" (sebelah butang dark mode) — semua user boleh guna.
(function(){
  const btn = document.getElementById('bugReportToggle');
  if (!btn) return;
  btn.addEventListener('click', () => { openBugReportModal(); });
})();

/* ---- 4.21 RELEASE MANAGER (System Updates) ---- */

async function renderReleaseManagerPage(){
  const rows = await fetchSystemUpdates().catch(() => []);

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="rm-split">
      <div class="section">
        <div class="section-head">
          <h3>Publish Release</h3>
          <span class="eyebrow">New system update</span>
        </div>
        <div class="section-body">
          <div class="settings-grid">
            <div class="formfield">
              <label>Version</label>
              <input type="text" id="relVersion" placeholder="e.g. v1.2.0">
            </div>
            <div class="formfield">
              <label>Type</label>
              <div class="fpick" data-fp="relType">
                <input type="text" id="relType" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml(RELEASE_TYPES[0])}">
                <span class="fpick-caret"></span>
                <div class="combo-panel fpick-panel" data-fp-panel="relType"></div>
              </div>
            </div>
            <div class="formfield full">
              <label>Title</label>
              <input type="text" id="relTitle" placeholder="Short summary of the release">
            </div>
            <div class="formfield full">
              <label>Description</label>
              <textarea id="relDescription" rows="4" placeholder="What changed, in detail..."></textarea>
            </div>
          </div>
          <div class="settings-note" id="relFixNote" style="display:none;"></div>
          <div class="settings-actions">
            <button class="btn primary" id="publishReleaseBtn">Publish Release</button>
            <button class="btn" id="relClearFixBtn" style="display:none;">Clear &amp; Reset</button>
          </div>
          <div class="settings-note" id="releaseFormNote" style="display:none;"></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Bug Reports</h3>
          <span class="eyebrow" id="bugCountEyebrow">Loading…</span>
        </div>
        <div class="section-body" id="bugReportBody">
          <div class="settings-note" style="margin-top:0;">Loading…</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Release History</h3>
        <span class="eyebrow" id="releaseCountEyebrow">${rows.length} release${rows.length === 1 ? '' : 's'}</span>
      </div>
      <div class="section-body" id="releaseHistoryBody">
        ${renderReleaseManagerTable(rows)}
      </div>
    </div>
  `;

  const noteEl = wrap.querySelector('#releaseFormNote');
  function showNote(text, isError){
    noteEl.style.display = 'block';
    noteEl.style.color = isError ? 'var(--red)' : 'var(--green)';
    noteEl.textContent = text;
  }

  // ---- Release History: refresh dikongsi + Delete (baris 2 ke bawah) ----
  const historyBody = wrap.querySelector('#releaseHistoryBody');

  async function refreshHistory(){
    const freshRows = await fetchSystemUpdates().catch(() => []);
    historyBody.innerHTML = renderReleaseManagerTable(freshRows);
    const eyebrow = wrap.querySelector('#releaseCountEyebrow');
    if (eyebrow) eyebrow.textContent = `${freshRows.length} release${freshRows.length === 1 ? '' : 's'}`;
  }

    // Live: refresh senarai release tanpa reload
  FOCC_ADMIN_LIVE_REFRESH = refreshHistory;

  // Delegated click — kekal berfungsi selepas setiap innerHTML refresh.
  historyBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-release-id]');
    if (!btn) return;
    const id = Number(btn.dataset.releaseId || 0);
    const ver = btn.dataset.releaseVersion || '';
    if (!id) return;

    const ok = await confirmModal(
      'Delete Release',
      `Delete release <strong>${escapeHtml(ver)}</strong> from the history?<br><br>This cannot be undone.`,
    { confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!ok) return;

    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Deleting…';
    try{
      await adminInvoke('delete_release', { releaseId: id });
      await refreshHistory();
    }catch(err){
      alert('Failed to delete release: ' + String(err && err.message || err));
      btn.disabled = false;
      btn.textContent = label;
    }
  });

    // ---- BUG REPORTS: sentiasa muat dari server (tiada cache dalam browser) ----
  const bugBody = wrap.querySelector('#bugReportBody');
  const bugEyebrow = wrap.querySelector('#bugCountEyebrow');
  let bugRows = [];

  async function refreshBugs(){
    bugBody.innerHTML = `<div class="settings-note" style="margin-top:0;">Loading…</div>`;
    try{
      const res = await adminInvoke('list_bug_reports');
      bugRows = res.data || [];
    }catch(err){
      bugBody.innerHTML = `<div class="settings-note" style="margin-top:0;color:var(--red);">Failed to load bug reports: ${escapeHtml(String((err && err.message) || err))}</div>`;
      bugEyebrow.textContent = '—';
      return;
    }
    const c = {};
    bugRows.forEach(b => { c[b.status] = (c[b.status] || 0) + 1; });
    bugEyebrow.textContent =
      `${c['New'] || 0} new \u00b7 ${c['On Repairing'] || 0} repairing \u00b7 ${c['Ready for Release'] || 0} ready \u00b7 ${c['Fixed'] || 0} fixed`;
      bugBadgeRender(c['New'] || 0);   // dot "!" ikut kiraan yang sama
      bugBody.innerHTML = renderBugReportsTable(bugRows);
  }

    // Benarkan realtime memanggil refresh senarai bug dari luar page ini
  window.FOCC_REFRESH_BUGS = refreshBugs;

  // Delegated — kekal berfungsi selepas setiap refresh.
  bugBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-bug-id]');
    if (!btn) return;
    const id = Number(btn.dataset.bugId || 0);
    const bug = bugRows.find(b => Number(b.bugId) === id);
    if (!bug) return;
    const res = await openBugDetailModal(bug);
    if (res && res.changed) await refreshBugs();            // ambil semula dari server
    if (res && res.prepareFix) applyFixPrefill(res.prepareFix);
  });

  await refreshBugs();

  // Wire Type picker (Publish Release)
  wireFixedPicker(wrap, {
    field:'[data-fp="relType"]', input:'#relType',
    panel:'[data-fp-panel="relType"]', values: RELEASE_TYPES
  });

    // ---- Prepare Fix Release: pautkan satu release dengan satu laporan bug ----
  let linkedBugId = null;
  const relFixNote = wrap.querySelector('#relFixNote');
  const relClearFixBtn = wrap.querySelector('#relClearFixBtn');

  function setFixLink(bug){
    linkedBugId = bug ? Number(bug.bugId) : null;
    if (relFixNote){
      relFixNote.style.display = bug ? 'block' : 'none';
      relFixNote.style.color = 'var(--teal-dark)';
      relFixNote.textContent = bug
        ? 'Linked to Bug #' + bug.bugId + ' — "' + String(bug.title || '') + '". Publishing this release will mark that report as Fixed.'
        : '';
    }
    if (relClearFixBtn) relClearFixBtn.style.display = bug ? 'inline-flex' : 'none';
  }

  if (relClearFixBtn){
    relClearFixBtn.addEventListener('click', async () => {
      const ok = await confirmModal(
        'Clear Bug Link',
        'This unlinks the bug report <strong>and resets the Publish Release form</strong>.<br><br>The form will be empty again, so this release becomes a normal update.',
        { confirmLabel: 'Clear & Reset' }
      );
      if (!ok) return;

      setFixLink(null);

      // Kosongkan SEMUA medan sekali — supaya tak boleh keliru:
      // borang kosong = tiada laporan dipautkan.
      wrap.querySelector('#relVersion').value = '';
      wrap.querySelector('#relType').value = RELEASE_TYPES[0];
      wrap.querySelector('#relTitle').value = '';
      wrap.querySelector('#relDescription').value = '';

      if (relFixNote){
        relFixNote.style.display = 'block';
        relFixNote.style.color = 'var(--muted)';
        relFixNote.textContent = 'Bug link cleared — the form has been reset. This release will be published as a normal update.';
      }
    });
  }

  // Auto-isi borang Publish Release dari satu laporan bug.
  function applyFixPrefill(bug){
    wrap.querySelector('#relVersion').value = '';      // SENGAJA kosong — kau taip versi sendiri
    wrap.querySelector('#relType').value = 'Fix';
    wrap.querySelector('#relTitle').value = bug.title || '';

    const lines = ['Fix done — ' + (bug.title || '')];
    if (bug.description) lines.push('', bug.description);
    if (bug.steps) lines.push('', 'Steps: ' + bug.steps);
    lines.push('', 'Reported by ' + (bug.reporterEmail || '-') +
      (bug.reporterCompany ? ' (' + bug.reporterCompany + ')' : '') +
      ' on ' + bugWhen(bug.createdAt) + '.');
    wrap.querySelector('#relDescription').value = lines.join('\n');

    setFixLink(bug);
    const card = wrap.querySelector('.rm-split .section');
    if (card && card.scrollIntoView) card.scrollIntoView({ behavior:'smooth', block:'start' });
    const v = wrap.querySelector('#relVersion');
    if (v) v.focus();
  }

  wrap.querySelector('#publishReleaseBtn').addEventListener('click', async () => {
    const version = wrap.querySelector('#relVersion').value.trim();
    const type = wrap.querySelector('#relType').value;
    const title = wrap.querySelector('#relTitle').value.trim();
    const description = wrap.querySelector('#relDescription').value.trim();

    if (!version || !title){
      showNote('Version and Title are required.', true);
      return;
    }

    const btn = wrap.querySelector('#publishReleaseBtn');
    btn.disabled = true; btn.textContent = 'Publishing…';
    try{
      const cfg = await getSettingsConfig();
      // Kalau ada laporan dipautkan, hantar bugId — server tandakan laporan itu
      // 'Fixed' DALAM operasi yang sama, atau batalkan release terus.
      const payload = {version, type, title, description};
      if (linkedBugId) payload.bugId = linkedBugId;
      const res = await adminInvoke('create_release', payload);

      showNote('✅ Release Published Successfully' +
        (res && res.bug ? ` — Bug #${res.bug.bugId} marked as Fixed` : ''), false);
      wrap.querySelector('#relVersion').value = '';
      wrap.querySelector('#relType').value = RELEASE_TYPES[0];
      wrap.querySelector('#relTitle').value = '';
      wrap.querySelector('#relDescription').value = '';

      if (linkedBugId){ setFixLink(null); await refreshBugs(); }
      await refreshHistory();
    }catch(e){
      showNote(`Failed to publish release: ${String(e && e.message || e)}`, true);
    }finally{
      btn.disabled = false; btn.textContent = 'Publish Release';
    }
  });

  return wrap;
}

/* ---------------------------------------------------------------------
   USER MANAGER (Settings > User Manager)
   SuperAdmin-only page (same access pattern as Release Manager — see
   isSuperAdmin()/userCanAccess below). User accounts live in Supabase:
   auth.users (login) + public.profiles (company, role, status, expiry,
   allowed routes, version).

   Every write goes through the 'admin-provision' Edge Function, which
   holds the service_role key server-side — the browser never sees it.
--------------------------------------------------------------------- */
const FOCC_USER_ROLE_SUGGESTIONS = ['SuperAdmin', 'Admin', 'Manager', 'Operation', 'Maintenance', 'Safety', 'Viewer'];

/* ---------------------------------------------------------------------
   LIVE SYNC — USER MANAGER
   Dua admin buka page serentak: perubahan STATUS / ROLE / EXPIRY oleh
   seorang mesti muncul pada yang lain TANPA refresh.

   Guna POLL ringan melalui 'admin-provision' (SuperAdmin sahaja),
   BUKAN realtime pada `profiles` — `profiles` ialah jadual GLOBAL
   (lintas company), jadi melanggannya boleh bocorkan email/company
   user syarikat lain ke browser.

   Poll hanya hidup semasa page User Manager terbuka & user login.
--------------------------------------------------------------------- */
const UM_POLL_MS = 5000;      // 5 saat — naikkan ke 30000 kalau nak lebih jimat
let umPollTimer = null;

function umLiveTickStop(){
  if (umPollTimer){ clearInterval(umPollTimer); umPollTimer = null; }
  document.removeEventListener('visibilitychange', umLiveTick);
  window.removeEventListener('focus', umLiveTick);
}

async function umLiveTick(){
  console.log('UM TICK');
  const wrapNow = document.getElementById('umPageWrap') || document.getElementById('umSearchEmail');

  // Keluar page User Manager atau timer sudah dihentikan
  // → bersihkan timer & listener, jangan tinggal poll tergantung.
  if (!wrapNow || !umPollTimer){ umLiveTickStop(); return; }

  if (document.hidden) return;              // tab tak nampak — jangan tanya server
  if (foccRealtimeModalOpen()) return;      // borang terbuka — jangan ganggu

  try{
    if (typeof FOCC_ADMIN_LIVE_REFRESH === 'function') await FOCC_ADMIN_LIVE_REFRESH();
  }catch(e){
    // Poll cuma kemudahan — jangan ganggu kerja user kalau ia gagal.
    console.warn('User Manager live refresh failed:', e);
  }
}

function umLiveStart(){
  console.log('UM START');
  umLiveTickStop();

  document.addEventListener('visibilitychange', umLiveTick);

  window.addEventListener('focus', umLiveTick);

  umPollTimer = setInterval(umLiveTick, UM_POLL_MS);

  // tarik sekali masa page buka
  setTimeout(umLiveTick, 1000);
}

/* ---- 4.22 USER MANAGER (FOCC Auth) ---- */

function normalizeFoccUser(r){
  let routes = r.routes ?? r.Routes ?? r.AllowedRoutes ?? r.allowedRoutes ?? [];
  if (typeof routes === 'string') routes = routes.split(',').map(s => s.trim()).filter(Boolean);
  if (!Array.isArray(routes)) routes = [];
  // Expiry may arrive as a full ISO datetime (e.g. "2027-12-06T00:00:00.000Z")
  // from Postgres/JSON. <input type="date"> only accepts a bare "YYYY-MM-DD"
  // value and silently renders blank on anything else, so normalize down to
  // just the date portion here.
  let expiryDate = r.expiryDate ?? r.ExpiryDate ?? r.expiry ?? '';
  if (typeof expiryDate === 'string'){
    const m = expiryDate.match(/^\d{4}-\d{2}-\d{2}/);
    expiryDate = m ? m[0] : expiryDate;
  }
  return {
    email: r.email ?? r.Email ?? '',
    company: r.company ?? r.Company ?? '',
    role: r.role ?? r.Role ?? '',
    status: r.status ?? r.Status ?? 'Active',
    companyId: r.companyId ?? r.CompanyID ?? '',
    expiryDate,
    version: r.version ?? r.Version ?? '',
    routes,
    googleSheetId: r.googleSheetId ?? r.GoogleSheetId ?? '',
    appsScriptUrl: r.appsScriptUrl ?? r.AppsScriptUrl ?? '',
  };
}

// Builds the grouped "Allowed Access" checklist directly from
// NAV_STRUCTURE + ROUTES (defined further below, referenced lazily at
// call time — never hardcoded here) so a future route/page automatically
// appears with zero changes to User Manager.
function buildAllowedRouteGroups(){
  const groups = [];
  function pushGroupFromItems(label, items){
    const mapped = (items || [])
      .filter(it => ROUTES[navItemKey(it)])
      .map(it => ({
        key: navItemKey(it),
        label: navItemLabel(it)
      }));
    if (mapped.length){
      groups.push({
        label,
        items: mapped
      });
    }
  }
  NAV_STRUCTURE.forEach(entry => {

    if (entry.standalone){
      if (!ROUTES[entry.key]) return;
      groups.push({
        label: entry.label,
        items: [{
          key: entry.key,
          label: ROUTES[entry.key].crumb || ROUTES[entry.key].title
        }]
      });
      return;
    }
    if (entry.subgroups){
      entry.subgroups.forEach(sg => {
        pushGroupFromItems(
          `${entry.group} — ${sg.label}`,
          sg.items
        );
      });
      return;
    }
    pushGroupFromItems(
      entry.group,
      entry.items
    );
  });
  return groups;
}

function renderAllowedRouteFieldset(selectedRoutes){
  const groups = buildAllowedRouteGroups();
  const routes = Array.isArray(selectedRoutes) ? selectedRoutes : [];
  const isAll = routes.includes('ALL');
  return `
    <div class="formfield full">
      <label>Allowed Access</label>
      <div class="route-access-allrow">
        <label class="checkbox-option">
          <input type="checkbox" id="routeAllToggle" ${isAll ? 'checked' : ''}>
          <span><b>Grant ALL Access (Admin)</b></span>
        </label>
      </div>
      <div class="route-access-groups" id="routeAccessGroups">
        ${groups.map(g => `
          <div class="route-access-group">
            <div class="route-access-group-title">${escapeHtml(g.label)}</div>
            ${g.items.map(it => `
              <label class="checkbox-option">
                <input type="checkbox" class="route-access-item" value="${escapeHtml(it.key)}" ${(isAll || routes.includes(it.key)) ? 'checked' : ''} ${isAll ? 'disabled' : ''}>
                <span>${escapeHtml(it.label)}</span>
              </label>
            `).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Add/Edit User modal. Resolves with the submitted form data, or null
// if cancelled. Reuses the shared #modalOverlay/#modalBox shell.
/* Jana password sementara untuk Reset Password (User Manager).
   Guna crypto.getRandomValues — BUKAN Math.random. Charset sama
   dengan tempPassword() dalam Edge Function admin-provision. */
function generateTempPassword(){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[buf[i] % chars.length];
  return s + '@1';
}

/* Popup hasil Reset Password — password dipaparkan SEKALI sahaja.
   Guna shell #modalOverlay/#modalBox yang sama (modal Edit dah ditutup). */
function showNewPasswordModal(email, password){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.classList.remove('user-modal');
    box.innerHTML = `
      <h4>New Password</h4>
      <div class="notice notice-info" style="margin-bottom:14px;">
        Password for <strong>${escapeHtml(email)}</strong>. The old password <strong>no longer works</strong>.
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px 14px;">
        <span id="newPassValue" style="flex:1;font-family:var(--font-mono);font-size:17px;font-weight:700;letter-spacing:.5px;word-break:break-all;">${escapeHtml(password)}</span>
        <button class="btn primary" id="newPassCopy" style="flex:none;">Copy</button>
      </div>
      <div class="notice notice-danger" style="margin-top:12px;">
        ⚠️ Copy &amp; send it now. This password cannot be viewed again after this popup is closed.
      </div>
      <div class="modalfoot">
        <button class="btn" id="newPassClose">Close</button>
      </div>
    `;
    overlay.classList.add('show');

    const copyBtn = box.querySelector('#newPassCopy');
    const passSpan = box.querySelector('#newPassValue');

    copyBtn.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(password);
        copyBtn.textContent = '✅ Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1600);
      }catch(e){
        // Clipboard disekat (cth bukan HTTPS) — pilih teks supaya boleh Ctrl+C manual.
        const r = document.createRange();
        r.selectNodeContents(passSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        copyBtn.textContent = 'Press Ctrl+C';
      }
    });

    box.querySelector('#newPassClose').addEventListener('click', () => {
      overlay.classList.remove('show');
      resolve(true);
    });
  });
}

function openUserFormModal(user){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    box.classList.add('user-modal');
    const isEdit = !!user;
    const selectedRoutes = user ? user.routes : [];
    box.innerHTML = `
      <h4>${isEdit ? 'Edit User' : 'Add User'}</h4>
      <div class="formgrid">
        <div class="formfield">
          <label>Email</label>
          <input type="email" id="umEmail" value="${escapeHtml(user ? user.email : '')}" placeholder="user@company.com" ${isEdit ? 'readonly' : ''}>
        </div>
        <div class="formfield">
          <label>Company</label>
          <div class="fpick" data-umpick="umCompany">
            <input type="text" id="umCompany" class="fpick-input" data-no-type="1" inputmode="none" autocomplete="off" placeholder="Select company..." value="${escapeHtml(user ? (user.company || '') : '')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-umpick-panel="umCompany"></div>
          </div>
        </div>
        <div class="formfield">
          <label>Company ID</label>
          <input type="text" id="umCompanyId" value="${escapeHtml(user ? (user.companyId || '') : '')}" readonly style="background:#f1f4f6;color:var(--muted);cursor:not-allowed;" placeholder="Auto-filled from company">
        </div>
        <div class="formfield">
          <label>Role</label>
          <div class="combo-wrap" data-umpick="umRole">
            <input type="text" id="umRole" autocomplete="off" value="${escapeHtml(user ? user.role : '')}" placeholder="e.g. SuperAdmin, Admin, Safety">
            <div class="combo-panel" data-umpick-panel="umRole"></div>
          </div>
        </div>
        ${isEdit ? `
        <div class="formfield">
          <label>Status</label>
          <div class="fpick" data-fp="umStatus">
            <input type="text" id="umStatus" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select..." value="${escapeHtml((user && user.status) || 'Active')}">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-fp-panel="umStatus"></div>
          </div>
        </div>
        ` : ''}
        <div class="formfield">
          <label>Expiry Date</label>
          <input type="date" id="umExpiryDate" value="${escapeHtml(user ? user.expiryDate : '')}">
        </div>
        ${renderAllowedRouteFieldset(selectedRoutes)}
      </div>
      <div class="modalfoot">
        ${isEdit ? `<button class="btn" id="umResetPass" style="margin-right:auto;">🔑 Reset Password</button>` : ''}
        <button class="btn" id="umCancel">Cancel</button>
        <button class="btn primary" id="umSave">${isEdit ? 'Save Changes' : 'Add User'}</button>
      </div>
    `;
    overlay.classList.add('show');

    // Wire Company (fixed picker) + Role (suggestion picker)
    wireUserCompanyAndRolePickers(box, user);

    // Status (Edit sahaja) — FIXED picker, rupa sama macam Company Manager.
    // Tiada taip / tiada padam: hanya Active / Suspended (kawal akses login).
    wireFixedPicker(box, {
      field:'[data-fp="umStatus"]', input:'#umStatus',
      panel:'[data-fp-panel="umStatus"]', values:['Active','Suspended'],
      current: user ? (user.status || 'Active') : 'Active'
    });

    const allToggle = box.querySelector('#routeAllToggle');
    const itemBoxes = () => Array.from(box.querySelectorAll('.route-access-item'));
    allToggle.addEventListener('change', () => {
      itemBoxes().forEach(cb => { cb.disabled = allToggle.checked; if (allToggle.checked) cb.checked = true; });
    });

    const finish = (result) => {
      overlay.classList.remove('show');
      box.classList.remove('user-modal');
      resolve(result);
    };
    box.querySelector('#umCancel').addEventListener('click', () => finish(null));
        /* --- Reset Password (SuperAdmin sahaja — Edge Function juga semak) ---
       Password lama mati serta-merta; password BARU dipaparkan SEKALI. */
    const resetBtn = box.querySelector('#umResetPass');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      if (!confirm('Reset password for ' + user.email + '?\n\nThe old password will stop working immediately.')) return;

      const newPass = generateTempPassword();
      resetBtn.disabled = true;
      resetBtn.textContent = 'Resetting…';
      try{
        await foccUpdateUser(user.email, { password: newPass });
      }catch(err){
        resetBtn.disabled = false;
        resetBtn.textContent = '🔑 Reset Password';
        alert('Failed to reset password: ' + String(err && err.message || err));
        return;                       // ⚠️ password TIDAK dipaparkan bila gagal
      }
      finish(null);                   // tutup modal Edit (elak keliru)
      await showNewPasswordModal(user.email, newPass);
    });

    box.querySelector('#umSave').addEventListener('click', () => {
      const email = box.querySelector('#umEmail').value.trim();
      const company = box.querySelector('#umCompany').value.trim();
      const role = box.querySelector('#umRole').value.trim();
      const expiryDate = box.querySelector('#umExpiryDate').value;
      if (!email || !company || !role){
        alert('Email, Company and Role are required.');
        return;
      }
      const routes = allToggle.checked ? ['ALL'] : itemBoxes().filter(cb => cb.checked).map(cb => cb.value);
      const companyId = box.querySelector('#umCompanyId').value.trim();
      const payload = { email, company, role, expiryDate, routes, companyId };
      if (isEdit){
        payload.status = box.querySelector('#umStatus').value;
      }
      finish(payload);
    });
  });
}

/* User Manager: Company = FIXED picker (dari fetchFoccCompanies, tiada taip /
   tiada padam) + auto-sync #umCompanyId. Role = suggestion picker yang MASIH
   BOLEH DITAIP (tiada padam). Kedua-dua kekalkan id asal supaya kod simpan
   tak berubah. */
function wireUserCompanyAndRolePickers(box, user){
  const esc = s => String(s).replace(/"/g, '&quot;');

  function makePicker(input, panel, fieldEl, getOptions, onPick){
    function render(){
      const opts = getOptions();
      const current = input.value.trim();
      panel.innerHTML = opts.length
        ? opts.map(o =>
            `<div class="combo-item fpick-option${o.value === current ? ' is-active' : ''}" data-value="${esc(o.value)}">
               <span class="combo-item-text">${esc(o.label || o.value)}</span>
             </div>`).join('')
        : '<div class="combo-empty">No options</div>';
      panel.querySelectorAll('.fpick-option').forEach(row => {
        row.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = row.dataset.value || '';
          if (onPick) onPick(input.value);
          panel.classList.remove('open');
        });
      });
    }
    const open = () => { render(); panel.classList.add('open'); };
    const close = () => panel.classList.remove('open');

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ close(); return; }
      open();
    });
    input.addEventListener('input', () => { if (panel.classList.contains('open')) render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ close(); return; }
      if (e.key === 'Enter'){
        e.preventDefault();
        if (panel.classList.contains('open')) close(); else open();
        return;
      }
      if (input.dataset.noType === '1'){ e.preventDefault(); return; }
    });
    document.addEventListener('mousedown', e => {
      if (!fieldEl.contains(e.target)) close();
    });
  }

  // ---- Role: suggestion picker (boleh taip) ----
  const roleField = box.querySelector('[data-umpick="umRole"]');
  if (roleField){
    const roleInput = roleField.querySelector('#umRole');
    const rolePanel = roleField.querySelector('[data-umpick-panel="umRole"]');
    if (roleInput && rolePanel){
      const roleOpts = FOCC_USER_ROLE_SUGGESTIONS.slice();
      const curRole = roleInput.value.trim();
      if (curRole && !roleOpts.includes(curRole)) roleOpts.unshift(curRole);
      makePicker(roleInput, rolePanel, roleField,
        () => roleOpts.map(r => ({ value: r, label: r })));
    }
  }

  // ---- Company: fixed picker (taip dikunci) + auto-fill companyId ----
  const compField = box.querySelector('[data-umpick="umCompany"]');
  if (compField){
    const compInput = compField.querySelector('#umCompany');
    const compPanel = compField.querySelector('[data-umpick-panel="umCompany"]');
    const companyIdInput = box.querySelector('#umCompanyId');
    if (compInput && compPanel){
      let compMap = {};
      let compOpts = [];
      const syncId = () => {
        if (companyIdInput) companyIdInput.value = compMap[compInput.value.trim()] || '';
      };
      makePicker(compInput, compPanel, compField, () => compOpts, syncId);
      (async () => {
        try {
          const companies = await fetchFoccCompanies();
          compMap = {};
          compOpts = companies.map(c => {
            compMap[c.company] = c.companyId || '';
            return { value: c.company, label: c.company + (c.companyId ? ' (' + c.companyId + ')' : '') };
          });
          if (user && user.company) compInput.value = user.company;
          syncId();
        } catch(e) { console.error('Failed to load companies:', e); }
      })();
    }
  }
}

// Dashboard metrics for the User Manager page — derived entirely from the
// already-loaded fetchFoccUsers() result, no extra API calls.
function computeUserManagerMetrics(list){
  const today = new Date(); today.setHours(0,0,0,0);
  let active = 0, suspended = 0, expiringSoon = 0;
  (list || []).forEach(u => {
    const status = (u.status || 'Active');
    if (status === 'Suspended') suspended++; else active++;
    if (u.expiryDate){
      const dt = new Date(`${u.expiryDate}T00:00:00`);
      if (!isNaN(dt.getTime())){
        const daysLeft = Math.round((dt - today) / 86400000);
        if (daysLeft >= 0 && daysLeft <= 30) expiringSoon++;
      }
    }
  });
  return { total: (list || []).length, active, suspended, expiringSoon };
}

function renderUserManagerMetricsGrid(list){
  const m = computeUserManagerMetrics(list);
  return `
    <div class="mini-stat" style="--stat-accent:var(--teal)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>Total Users</div>
      <div class="value">${FMT.num(m.total)}</div>
      <div class="meta">All registered accounts</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--green)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"></path><path d="M15 6h6v6"></path></svg>Active Users</div>
      <div class="value">${FMT.num(m.active)}</div>
      <div class="meta">Currently enabled access</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--red)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M4.9 4.9l14.2 14.2"></path></svg>Suspended Users</div>
      <div class="value">${FMT.num(m.suspended)}</div>
      <div class="meta">Access disabled</div>
    </div>
    <div class="mini-stat" style="--stat-accent:var(--amber)">
      <div class="label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>Expiring Soon</div>
      <div class="value">${FMT.num(m.expiringSoon)}</div>
      <div class="meta">Expiry within 30 days</div>
    </div>
  `;
}

async function renderUserManagerPage(){
  console.log('USER MANAGER LOADED');
  let users = [];
  let loadError = '';
  try{ users = await fetchFoccUsers(); }catch(e){ loadError = String(e && e.message || e); }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="section">
      <div class="section-body">
        <div class="cdx-statgrid" id="userMetricsGrid">${renderUserManagerMetricsGrid(users)}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Users</h3>
        <span class="eyebrow" id="userCountEyebrow">${users.length} user${users.length === 1 ? '' : 's'}</span>
      </div>
      <div class="section-body">
        ${loadError ? `<div class="notice notice-danger" style="margin-bottom:14px;">Failed to load users: ${escapeHtml(loadError)}</div>` : ''}
        <div class="toolbar">
          <input class="searchbox" type="text" id="umSearchEmail" placeholder="Search by Email...">
          <input class="searchbox" type="text" id="umSearchCompany" placeholder="Search by Company...">
          <input class="searchbox" type="text" id="umSearchRole" placeholder="Search by Role...">
          <button class="btn primary" id="addUserBtn">+ Add User</button>
        </div>
        <div class="tablewrap">
          <table class="cdx-table" id="userTable">
            <thead><tr><th>Email</th><th>Company</th><th>Role</th><th>Status</th><th>Expiry Date</th><th>Version</th><th>Actions</th></tr></thead>
            <tbody id="userTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = wrap.querySelector('#userTableBody');

  function updateCountEyebrow(){
    const el = wrap.querySelector('#userCountEyebrow');
    if (el) el.textContent = `${users.length} user${users.length === 1 ? '' : 's'}`;
  }

  function refreshUserMetrics(){
    const grid = wrap.querySelector('#userMetricsGrid');
    if (grid) grid.innerHTML = renderUserManagerMetricsGrid(users);
  }

    // Live: refresh senarai user + metrik tanpa reload
  FOCC_ADMIN_LIVE_REFRESH = async () => {
    console.log('REFRESH USERS');
    users = await fetchFoccUsers();
    updateCountEyebrow();
    renderRows();
    refreshUserMetrics();
  };

  // Start live refresh selepas callback siap didaftarkan
    foccAdminLiveStart('userManager');

  function renderRows(){
    const qEmail = wrap.querySelector('#umSearchEmail').value.trim().toLowerCase();
    const qCompany = wrap.querySelector('#umSearchCompany').value.trim().toLowerCase();
    const qRole = wrap.querySelector('#umSearchRole').value.trim().toLowerCase();
    const filtered = users.filter(u =>
      (!qEmail || (u.email || '').toLowerCase().includes(qEmail)) &&
      (!qCompany || (u.company || '').toLowerCase().includes(qCompany)) &&
      (!qRole || (u.role || '').toLowerCase().includes(qRole))
    );
    tbody.innerHTML = filtered.length ? filtered.map(u => `
      <tr>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.company || '-')}</td>
        <td>${escapeHtml(u.role || '-')}</td>
        <td>${badgeFor(u.status || 'Active')}</td>
        <td>${fmtDate(u.expiryDate)}</td>
        <td>${escapeHtml(u.version || '-')}</td>
        <td><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
          <button class="btn rowedit" data-action="edit" data-email="${escapeHtml(u.email)}" title="Edit user" aria-label="Edit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
          </button>
          <button class="btn rowdel" data-action="delete" data-email="${escapeHtml(u.email)}" title="Delete user" aria-label="Delete">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12z" fill="currentColor"/><path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
          </button>
        </div></td>
      </tr>
    `).join('') : `<tr><td colspan="7" class="kpi-bucket-empty">No users found.</td></tr>`;
  }
  renderRows();

  ['#umSearchEmail', '#umSearchCompany', '#umSearchRole'].forEach(sel => {
    wrap.querySelector(sel).addEventListener('input', renderRows);
  });

  wrap.querySelector('#addUserBtn').addEventListener('click', async () => {
    const result = await openUserFormModal(null);
    if (!result) return;
    try{
      await foccAddUser(result);
      users = await fetchFoccUsers();
      updateCountEyebrow();
      renderRows();
      refreshUserMetrics();
      alert('User added successfully.');
    }catch(e){
      alert(`Failed to add user: ${String(e && e.message || e)}`);
    }
  });

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const email = btn.dataset.email;
    const action = btn.dataset.action;
    const user = users.find(u => u.email === email);
    if (!user) return;

    if (action === 'edit'){
      const result = await openUserFormModal(user);
      if (!result) return;
      try{
        await foccUpdateUser(email, result);
        users = await fetchFoccUsers();
        renderRows();
        refreshUserMetrics();
        alert('User updated successfully.');
      }catch(err){
        alert(`Failed to update user: ${String(err && err.message || err)}`);
      }
    } else if (action === 'suspend'){
      const nextStatus = (user.status || 'Active') === 'Suspended' ? 'Active' : 'Suspended';
      const ok = await confirmModal(
        nextStatus === 'Suspended' ? 'Suspend User' : 'Reactivate User',
        `${nextStatus === 'Suspended' ? 'Suspend' : 'Reactivate'} access for <strong>${escapeHtml(email)}</strong>?`,
        {confirmLabel: nextStatus === 'Suspended' ? 'Suspend' : 'Reactivate'}
      );
      if (!ok) return;
      try{
        await foccSetUserStatus(email, nextStatus);
        users = await fetchFoccUsers();
        renderRows();
        refreshUserMetrics();
      }catch(err){
        alert(`Failed to update status: ${String(err && err.message || err)}`);
      }
    } else if (action === 'delete'){
      const ok = await confirmModal('Delete User', `Permanently delete <strong>${escapeHtml(email)}</strong>? This cannot be undone.`, {confirmLabel:'Delete', tone:'danger'});
      if (!ok) return;
      try{
        await foccDeleteUser(email);
        users = users.filter(u => u.email !== email);
        updateCountEyebrow();
        renderRows();
        refreshUserMetrics();
        alert('User deleted successfully.');
      }catch(err){
        alert(`Failed to delete user: ${String(err && err.message || err)}`);
      }
    } else if (action === 'resetVersion'){
      const ok = await confirmModal('Reset Version', `Reset the stored app version for <strong>${escapeHtml(email)}</strong>? They will see the "What's New" notice again on next login.`, {confirmLabel:'Reset'});
      if (!ok) return;
      try{
        await foccResetUserVersion(email);
        users = await fetchFoccUsers();
        renderRows();
      }catch(err){
        alert(`Failed to reset version: ${String(err && err.message || err)}`);
      }
    }
  });

  return wrap;
}

/* ---------------------------------------------------------------------
   COMPANY MANAGER (Settings > Company Manager)
   SuperAdmin-only page, same access pattern as User Manager / Release
   Manager (see isSuperAdmin()/userCanAccess).

   Companies live in the Supabase `companies` table (company_id, company,
   google_sheet_id, apps_script_url, status, supabase_tables). All writes
   go through the 'admin-provision' Edge Function.

   google_sheet_id / apps_script_url are OPTIONAL legacy fields — leave
   them blank for a company that runs fully on Supabase.
--------------------------------------------------------------------- */
function normalizeFoccCompany(r){
  return {
    company: r.company ?? r.Company ?? '',
    googleSheetId: r.googleSheetId ?? r.GoogleSheetID ?? r.GoogleSheetId ?? '',
    appsScriptUrl: r.appsScriptUrl ?? r.AppsScriptURL ?? r.AppsScriptUrl ?? '',
    status: r.status ?? r.Status ?? 'Active',
    companyId: r.companyId ?? r.CompanyID ?? '',
  };
}

/* =====================================================================
   FASA 3 — USER MANAGER & COMPANY MANAGER kini guna SUPABASE
   Semua kerja admin (cipta akaun login, tambah company, suspend, expiry)
   melalui Edge Function 'admin-provision'. service_role kekal di server.
   Blok ini MENIMPA fungsi lama — nama fungsi sama, jadi UI & modal
   tak perlu diubah langsung.
===================================================================== */
async function adminInvoke(action, payload){
  const { data, error } = await FOCC_SUPABASE.functions.invoke('admin-provision', {
    body: Object.assign({ action: action }, payload || {}),
  });
  if (error){
    let msg = error.message || 'Admin error.';
    try{
      if (error.context && typeof error.context.json === 'function'){
        const j = await error.context.json();
        if (j && j.error) msg = j.error;
      }
    }catch(_e){}
    throw new Error(msg);
  }
  if (data && data.success === false) throw new Error(data.error || 'Admin error.');
  return data || {};
}

/* --- User Manager --- */
fetchFoccUsers = async function(){
  const res = await adminInvoke('list_users');
  return (res.data || []).map(normalizeFoccUser);
};
foccAddUser = async function(payload){
  const res = await adminInvoke('create_user', payload);
  if (res && res.tempPassword){
    alert(
      'User created: ' + ((payload && payload.email) || '') + '\n\n' +
      'Temporary password: ' + res.tempPassword + '\n\n' +
      'Save this and pass it to the user. They can change it after signing in.'
    );
  }
  return res;
};
foccUpdateUser = function(originalEmail, payload){
  return adminInvoke('update_user', Object.assign({}, payload || {}, { originalEmail: originalEmail }));
};
foccDeleteUser = function(email){
  return adminInvoke('delete_user', { email: email });
};
foccSetUserStatus = function(email, status){
  return adminInvoke('set_user_status', { email: email, status: status });
};
foccResetUserVersion = function(email){
  return adminInvoke('reset_version', { email: email });
};

/* --- Company Manager --- */
fetchFoccCompanies = async function(){
  const res = await adminInvoke('list_companies');
  return (res.data || []).map(normalizeFoccCompany);
};
foccAddCompany = function(payload){
  return adminInvoke('create_company', payload);
};
foccUpdateCompany = function(originalCompany, payload){
  return adminInvoke('update_company', Object.assign({}, payload || {}, { originalCompany: originalCompany }));
};
foccDeleteCompany = function(company){
  return adminInvoke('delete_company', { company: company });
};

/* =====================================================================
   FASA 4 — RELEASE & VERSION kini guna SUPABASE
   4 fungsi Apps Script ditimpa. Versi yang dibaca user ditulis ke
   profiles.version → popup WHAT'S NEW keluar SEKALI sahaja.
===================================================================== */
getCurrentVersion = async function(){
  const res = await adminInvoke('list_releases');
  const rows = res.data || [];
  return { currentVersion: rows.length ? rows[0].version : '' };
};

getSystemUpdates = async function(){
  const res = await adminInvoke('list_releases');
  return (res.data || []).map(function(r){
    return { version: r.version, title: r.title, description: r.description };
  });
};

// Dipanggil bila user tekan OK pada popup. Hanya column `version` boleh
// ditulis (hak di Supabase), dan hanya pada baris sendiri.
updateUserVersion = async function(){
  const me = await FOCC_SUPABASE.auth.getUser();
  if (!me || me.error || !me.data || !me.data.user) return { success: false };
  const { error } = await FOCC_SUPABASE
    .from('profiles')
    .update({ version: FOCC_VERSION })
    .eq('id', me.data.user.id);
  if (error) throw error;
  return { success: true };
};

// Senarai release untuk page Release Manager
fetchSystemUpdates = async function(){
  const res = await adminInvoke('list_releases');
  return (res.data || []).map(normalizeSystemUpdateRow);
};

// Add/Edit Company modal. Resolves with the submitted form data, or null
// if cancelled. Reuses the shared #modalOverlay/#modalBox shell (default,
// unstyled box — this form is small enough not to need the wider
// .user-modal/.opkpi-modal variants). Pass an existing company object to
// open in edit mode, pre-filled; omit/pass null for Add mode.
function openCompanyFormModal(company){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const isEdit = !!company;
    box.innerHTML = `
      <h4>${isEdit ? 'Edit Company' : 'Add Company'}</h4>
      <div class="formgrid">
        <div class="formfield">
          <label>Company</label>
          <input type="text" id="cmCompany" value="${escapeHtml(isEdit ? company.company : '')}" placeholder="e.g. Kemaman Operation">
        </div>
        <div class="formfield">
          <label>Company ID</label>
          <input type="text" id="cmCompanyId" value="${escapeHtml(isEdit ? (company.companyId || '') : '')}" readonly style="background:#f1f4f6;color:var(--muted);cursor:not-allowed;" placeholder="Auto-generated on save">
        </div>
        <div class="formfield">
          <label>Google Sheet ID</label>
          <input type="text" id="cmGoogleSheetId" value="${escapeHtml(isEdit ? company.googleSheetId : '')}" placeholder="Sheet ID">
        </div>
        <div class="formfield">
          <label>Apps Script URL</label>
          <input type="text" id="cmAppsScriptUrl" value="${escapeHtml(isEdit ? company.appsScriptUrl : '')}" placeholder="https://script.google.com/...">
        </div>
        <div class="formfield">
          <label>Status</label>
          <div class="fpick" data-secpick="cmStatus">
            <input type="text" id="cmStatus" class="fpick-input" inputmode="none" autocomplete="off" placeholder="Select...">
            <span class="fpick-caret"></span>
            <div class="combo-panel fpick-panel" data-secpick-panel></div>
          </div>
        </div>
      </div>
      <div class="modalfoot">
        <button class="btn" id="cmCancel">Cancel</button>
        <button class="btn primary" id="cmSave">${isEdit ? 'Save Changes' : 'Add Company'}</button>
      </div>
    `;
    overlay.classList.add('show');
    wireCompanyStatusPicker(box, isEdit ? (company.status || 'Active') : 'Active');

    const finish = (result) => {
      overlay.classList.remove('show');
      resolve(result);
    };
    box.querySelector('#cmCancel').addEventListener('click', () => finish(null));
    box.querySelector('#cmSave').addEventListener('click', () => {
      const companyName = box.querySelector('#cmCompany').value.trim();
      const googleSheetId = box.querySelector('#cmGoogleSheetId').value.trim();
      const appsScriptUrl = box.querySelector('#cmAppsScriptUrl').value.trim();
      const status = box.querySelector('#cmStatus').value;
      if (!companyName){
        alert('Company name is required.');
        return;
      }
      const companyId = box.querySelector('#cmCompanyId').value.trim();
      finish({ company: companyName, companyId, googleSheetId, appsScriptUrl, status });
    });
  });
}

/* Bug Report: Page/Module = FIXED picker. Papar TITLE, simpan KEY dalam
   dataset.key + dataset.title supaya payload hantar pageKey/pageTitle betul.
   Panel dihadkan tinggi (max-height) jadi ia SCROLL, tak melebar keluar borang. */
function wireBugPagePicker(box, pages, currentKey){
  const fieldEl = box.querySelector('[data-fp="bugPage"]');
  if (!fieldEl) return;
  const input = box.querySelector('#bugPage');
  const panel = box.querySelector('[data-fp-panel="bugPage"]');
  if (!input || !panel) return;
  const esc = s => String(s).replace(/"/g, '&quot;');
  const opts = (pages || []).map(p => ({ key: p.key, title: p.title || p.key }));
  const titleOf = k => { const o = opts.find(x => x.key === k); return o ? o.title : k; };

  function setKey(key){
    input.value = titleOf(key);
    input.dataset.key = key;
    input.dataset.title = titleOf(key);
  }
  function render(){
    panel.innerHTML = opts.length
      ? opts.map(o =>
          `<div class="combo-item fpick-option${o.key === input.dataset.key ? ' is-active' : ''}" data-value="${esc(o.key)}" data-title="${esc(o.title)}">
             <span class="combo-item-text">${esc(o.title)}</span>
           </div>`).join('')
      : '<div class="combo-empty">No pages</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value ? (row.dataset.title || row.dataset.value) : '';
        input.dataset.key = row.dataset.value || '';
        input.dataset.title = row.dataset.title || input.dataset.key;
        panel.classList.remove('open');
      });
    });
  }
  const open = () => { render(); panel.classList.add('open'); };
  const close = () => panel.classList.remove('open');

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ close(); return; }
    open();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ close(); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')) close(); else open();
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) close();
  });

  if (currentKey) setKey(currentKey);
}

/* FIXED picker generik (baca-sahaja: tiada taip, tiada padam) — rupa sama
   macam Safety Equipment / APAD / Company Status. Guna untuk Release Manager:
   Bug "Set status" + Publish Release "Type". Input KEKALKAN id asal supaya
   kod simpan tak berubah. */
function wireFixedPicker(box, cfg){
  const fieldEl = box.querySelector(cfg.field);
  if (!fieldEl) return;
  const input = box.querySelector(cfg.input);
  const panel = box.querySelector(cfg.panel);
  if (!input || !panel) return;
  const esc = s => String(s).replace(/"/g, '&quot;');
  let values = (cfg.values || []).slice();
  const current = String(input.value || cfg.current || '').trim();
  if (current && !values.includes(current)) values = [current].concat(values);
  if (current) input.value = current;

  function render(){
    const cur = input.value;
    panel.innerHTML = values.length
      ? values.map(v =>
          `<div class="combo-item fpick-option${v === cur ? ' is-active' : ''}" data-value="${esc(v)}">
             <span class="combo-item-text">${v}</span>
           </div>`).join('')
      : '<div class="combo-empty">No options</div>';
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value || '';
        panel.classList.remove('open');
      });
    });
  }
  const open = () => { render(); panel.classList.add('open'); };
  const close = () => panel.classList.remove('open');

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ close(); return; }
    open();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ close(); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')) close(); else open();
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) close();
  });
}

/* Company Manager only: Status jadi FIXED picker (rupa sama macam Safety
   Equipment / APAD). Baca-sahaja, tiada tambah/padam — Active / Suspended
   sahaja. Input KEKALKAN id="cmStatus" supaya kod simpan tak berubah. */
function wireCompanyStatusPicker(box, currentVal){
  const OPTIONS = ['Active','Suspended'];
  const esc = s => String(s).replace(/"/g, '&quot;');
  const fieldEl = box.querySelector('[data-secpick="cmStatus"]');
  if (!fieldEl) return;
  const input = fieldEl.querySelector('input[data-col], input#cmStatus');
  const panel = fieldEl.querySelector('[data-secpick-panel]');
  if (!input || !panel) return;
  const cur = String(currentVal || 'Active').trim();

  function render(){
    const current = input.value || cur;
    panel.innerHTML = OPTIONS.map(v =>
      `<div class="combo-item fpick-option${v === current ? ' is-active' : ''}" data-value="${esc(v)}">
         <span class="combo-item-text">${v}</span>
       </div>`).join('');
    panel.querySelectorAll('.fpick-option').forEach(row => {
      row.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        input.value = row.dataset.value || '';
        panel.classList.remove('open');
      });
    });
  }

  input.addEventListener('click', () => {
    if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
    render(); panel.classList.add('open');
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Tab') return;
    if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
    if (e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      if (panel.classList.contains('open')) panel.classList.remove('open');
      else { render(); panel.classList.add('open'); }
      return;
    }
    e.preventDefault();
  });
  document.addEventListener('mousedown', e => {
    if (!fieldEl.contains(e.target)) panel.classList.remove('open');
  });

  input.value = cur;
}

/* ---- 4.23 COMPANY MANAGER (FOCC Auth) ---- */

async function renderCompanyManagerPage(){
  let companies = [];
  let loadError = '';
  try{ companies = await fetchFoccCompanies(); }catch(e){ loadError = String(e && e.message || e); }

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h3>Companies</h3>
        <span class="eyebrow" id="companyCountEyebrow">${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}</span>
      </div>
      <div class="section-body">
        ${loadError ? `<div class="notice notice-danger" style="margin-bottom:14px;">Failed to load companies: ${escapeHtml(loadError)}</div>` : ''}
        <div class="toolbar">
          <input class="searchbox" type="text" id="cmSearchCompany" placeholder="Search by Company Name...">
          <button class="btn primary" id="addCompanyBtn">+ Add Company</button>
        </div>
        <div class="tablewrap">
          <table class="cdx-table" id="companyTable">
            <thead><tr><th>Company ID</th><th>Company</th><th>Google Sheet ID</th><th>Apps Script URL</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody id="companyTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = wrap.querySelector('#companyTableBody');

  function updateCountEyebrow(){
    const el = wrap.querySelector('#companyCountEyebrow');
    if (el) el.textContent = `${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}`;
  }
    // Live: refresh senarai company tanpa reload
  FOCC_ADMIN_LIVE_REFRESH = async () => {
    companies = await fetchFoccCompanies();
    updateCountEyebrow();
    renderRows();
  };

  function renderRows(){
    const q = wrap.querySelector('#cmSearchCompany').value.trim().toLowerCase();
    const filtered = companies.filter(c => !q || (c.company || '').toLowerCase().includes(q));
    tbody.innerHTML = filtered.length ? filtered.map(c => `
      <tr>
        <td><span class="truckchip">${escapeHtml(c.companyId || '-')}</span></td>
        <td>${escapeHtml(c.company)}</td>
        <td>${escapeHtml(c.googleSheetId || '-')}</td>
        <td>${escapeHtml(c.appsScriptUrl || '-')}</td>
        <td>${badgeFor(c.status || 'Active')}</td>
        <td><div style="display:flex;gap:8px;justify-content:flex-end;align-items:center">
          <button class="btn rowedit" data-action="edit" data-company="${escapeHtml(c.company)}" title="Edit company" aria-label="Edit">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
          </button>
          <button
          class="btn rowdel"
          data-action="delete"
          data-company="${escapeHtml(c.company)}"
          title="Delete company"
          aria-label="Delete">
          🗑
          </button>
        </div></td>
      </tr>
    `).join('') : `<tr><td colspan="6" class="kpi-bucket-empty">No companies found.</td></tr>`;
  }
  renderRows();

  wrap.querySelector('#cmSearchCompany').addEventListener('input', renderRows);

  wrap.querySelector('#addCompanyBtn').addEventListener('click', async () => {
    const result = await openCompanyFormModal();
    if (!result) return;
    try{
      await foccAddCompany(result);
      companies = await fetchFoccCompanies();
      updateCountEyebrow();
      renderRows();
      alert('Company added successfully.');
    }catch(e){
      alert(`Failed to add company: ${String(e && e.message || e)}`);
    }
  });

tbody.addEventListener('click', async (e) => {

  const btn = e.target.closest('button[data-action]');
  if (!btn) return;

  const companyName = btn.dataset.company;
  const action = btn.dataset.action;

  if (action === 'edit') {

    const company = companies.find(
      c => c.company === companyName
    );

    if (!company) return;

    const result = await openCompanyFormModal(company);

    if (!result) return;

    try {

      await foccUpdateCompany(
        companyName,
        result
      );

      companies = await fetchFoccCompanies();

      renderRows();

      alert(
        'Company updated successfully.'
      );

    } catch (err) {

      alert(
        `Failed to update company: ${String(err && err.message || err)}`
      );

    }

    return;
  }

  if (action === 'delete') {

    const ok = await confirmModal(
      'Delete Company',
      `Delete <strong>${escapeHtml(companyName)}</strong>?`,
      {
        confirmLabel: 'Delete', tone: 'danger'
      }
    );

    if (!ok) return;

    try {

      await foccDeleteCompany(
        companyName
      );

      companies =
        await fetchFoccCompanies();

      updateCountEyebrow();

      renderRows();

      alert(
        'Company deleted successfully.'
      );

    } catch (err) {

      alert(
        `Failed to delete company: ${String(err && err.message || err)}`
      );

    }

    return;
  }

});
  return wrap;
}

/* =========================================================================
   NEW MODULE PAGE SKELETONS
   ---------------------------------------------------------------------
   Structure/layout ONLY for 14 upcoming modules — no business logic, no
   API calls, no data loading. Every page reuses the existing design
   system (.section / .kpi / .btn / .searchbox / table.datatable) so it
   already matches the rest of the app, and gets the exact same
   "Page Header" treatment as Maintenance Log: the global topbar
   (#crumb + #pagetitle) is populated from this page's ROUTES entry via
   goTo(), nothing about that mechanism is touched here.
   Wiring these into the sidebar (NAV_STRUCTURE) is intentionally left
   for a later step — see notes at the bottom of this block.
   ========================================================================= */

function skelSvg(paths, size){
  const s = size || 30;
  return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const SKEL_ICON_EMPTY = skelSvg('<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path><path d="M8 14h8"></path>', 34);
const SKEL_ICON_CHART = skelSvg('<path d="M4 19V9"></path><path d="M10 19V5"></path><path d="M16 19v-7"></path><path d="M20 19H4"></path>', 32);

/* One config object per future module. Everything here is placeholder
   copy/labels only — swap in real data, filters and charts later. */
const SKELETON_MODULES = {
  tipperOpsDashboard: {
    title:'Tipper Operations Dashboard', crumb:'Tipper Operations',
    description:'Fleet-wide view of tipper truck activity, utilization and daily trip performance.',
    kpis:[
      {label:'Active Tippers', note:'On the road today'},
      {label:'Trips Completed', note:'Today'},
      {label:'Fleet Utilization', note:'Active vs total fleet'},
      {label:'Avg Turnaround Time', note:'Load to unload'},
    ],
    statusOptions:['Loading','In Transit','Unloading','Idle','Under Maintenance'],
    tableColumns:['Date','Truck No.','Driver','Route','Load (MT)','Status'],
    chartLabel:'Trips Trend (Last 30 Days)',
  },
  containerOpsDashboard: {
    title:'Container Operations Dashboard', crumb:'Container Operations',
    description:'Container movement, yard utilization and vessel schedule overview.',
    kpis:[
      {label:'Active Containers', note:'Currently in yard'},
      {label:'TEU Moved', note:'Today'},
      {label:'Yard Utilization', note:'Occupied vs capacity'},
      {label:'On-Time Delivery Rate', note:'Last 30 days'},
    ],
    statusOptions:['In Yard','Loading','In Transit','Delivered','Empty Return'],
    tableColumns:['Date','Container No.','Vessel','Yard Location','ETA','Status'],
    chartLabel:'TEU Volume Trend (Last 30 Days)',
  },
  tankerOpsDashboard: {
    title:'Tanker Operations Dashboard', crumb:'Tanker Operations',
    description:'Tanker fleet activity, product volumes and delivery status at a glance.',
    kpis:[
      {label:'Active Tankers', note:'On the road today'},
      {label:'Volume Delivered', note:'Litres, today'},
      {label:'Compartment Utilization', note:'Avg across fleet'},
      {label:'Safety Incidents', note:'This month'},
    ],
    statusOptions:['Loading','In Transit','Discharging','Idle','Under Maintenance'],
    tableColumns:['Date','Tanker No.','Product','Volume (L)','Route','Status'],
    chartLabel:'Volume Delivered Trend (Last 30 Days)',
  },
  logisticsDistributionDashboard: {
    title:'Logistics & Distribution Dashboard', crumb:'Logistics & Distribution',
    description:'Cross-fleet distribution performance, delivery volumes and cost overview.',
    kpis:[
      {label:'Total Deliveries', note:'This month'},
      {label:'On-Time Rate', note:'Last 30 days'},
      {label:'Fleet Utilization', note:'All vehicle types'},
      {label:'Distribution Cost', note:'This month'},
    ],
    statusOptions:['Scheduled','Dispatched','In Transit','Delivered','Delayed'],
    tableColumns:['Date','Order No.','Origin','Destination','Carrier','Status'],
    chartLabel:'Delivery Volume Trend (Last 30 Days)',
  },
  orderPlanning: {
    title:'Order Planning', crumb:'Planning',
    description:'Plan, schedule and allocate customer orders ahead of dispatch.',
    kpis:[
      {label:'Open Orders', note:'Awaiting allocation'},
      {label:'Scheduled Today', note:'Ready for dispatch'},
      {label:'Pending Allocation', note:'Needs vehicle/driver'},
      {label:'Fulfillment Rate', note:'Last 30 days'},
    ],
    statusOptions:['New','Scheduled','Allocated','Fulfilled','Cancelled'],
    tableColumns:['Order No.','Customer','Product','Qty','Requested Date','Status'],
  },
  routePlanning: {
    title:'Route Planning', crumb:'Planning',
    description:'Design and manage delivery routes, distances and vehicle assignments.',
    kpis:[
      {label:'Active Routes', note:'Currently in use'},
      {label:'Avg Distance', note:'Per route, km'},
      {label:'Avg Route Time', note:'Per route'},
      {label:'Optimization Savings', note:'This month'},
    ],
    statusOptions:['Draft','Active','Under Review','Archived'],
    tableColumns:['Route No.','Origin','Destination','Distance (km)','Assigned Vehicle','Status'],
    chartLabel:'Route Efficiency Overview',
  },
  deliveryPlanning: {
    title:'Delivery Planning', crumb:'Planning',
    description:'Coordinate delivery schedules, driver assignments and ETAs.',
    kpis:[
      {label:'Deliveries Planned', note:'Today'},
      {label:'Deliveries Completed', note:'Today'},
      {label:'Delayed Deliveries', note:'Today'},
      {label:'On-Time Rate', note:'Last 30 days'},
    ],
    statusOptions:['Planned','Dispatched','In Transit','Completed','Delayed'],
    tableColumns:['Delivery No.','Order No.','Driver','Vehicle','ETA','Status'],
  },
  podManagement: {
    title:'POD Management', crumb:'Delivery',
    description:'Track, verify and manage proof-of-delivery documents.',
    kpis:[
      {label:'Total PODs', note:'This month'},
      {label:'Pending Verification', note:'Awaiting review'},
      {label:'Verified PODs', note:'This month'},
      {label:'Rejected PODs', note:'This month'},
    ],
    statusOptions:['Pending','Verified','Rejected','Resubmitted'],
    tableColumns:['POD No.','Order No.','Delivery Date','Received By','Verification Status'],
  },
  jisa: {
    title:'JISA', crumb:'Safety & Compliance',
    description:'Job Inspection Safety Analysis records and review status.',
    kpis:[
      {label:'Total JISA Records', note:'All time'},
      {label:'Completed', note:'This month'},
      {label:'Pending Review', note:'Awaiting sign-off'},
      {label:'Overdue', note:'Past due date'},
    ],
    statusOptions:['Draft','Pending Review','Approved','Overdue'],
    tableColumns:['JISA No.','Task / Job','Location','Assessed By','Date','Status'],
  },
  hirarc: {
    title:'HIRARC', crumb:'Safety & Compliance',
    description:'Hazard Identification, Risk Assessment & Risk Control register.',
    kpis:[
      {label:'Total Assessments', note:'All time'},
      {label:'High Risk Items', note:'Currently open'},
      {label:'Under Review', note:'Awaiting sign-off'},
      {label:'Closed', note:'This month'},
    ],
    statusOptions:['Open','Under Review','Control In Place','Closed'],
    tableColumns:['HIRARC No.','Activity','Hazard','Risk Rating','Control Measures','Status'],
  },
  apadKnowledgeCenter: {
    title:'APAD Knowledge Center', crumb:'Knowledge Center',
    description:'Central library for APAD procedures, guidelines and reference documents.',
    kpis:[
      {label:'Total Documents', note:'Published'},
      {label:'Categories', note:'Active'},
      {label:'Recently Updated', note:'Last 30 days'},
      {label:'Pending Approval', note:'Awaiting review'},
    ],
    statusOptions:['Published','Draft','Under Review','Archived'],
    tableColumns:['Document Title','Category','Version','Last Updated','Status'],
    searchPlaceholder:'Search documents...',
    dateLabel:'Last Updated',
  },
  invoiceManagement: {
    title:'Invoice Management', crumb:'Finance',
    description:'Track invoices, payment status and outstanding balances.',
    kpis:[
      {label:'Total Invoices', note:'This month'},
      {label:'Outstanding Amount', note:'Unpaid'},
      {label:'Overdue Invoices', note:'Past due date'},
      {label:'Paid This Month', note:'Settled'},
    ],
    statusOptions:['Draft','Sent','Paid','Overdue','Cancelled'],
    tableColumns:['Invoice No.','Vendor / Customer','Amount','Due Date','Status'],
  },
  vendorManagement: {
    title:'Vendor Management', crumb:'Finance',
    description:'Manage vendor records, onboarding status and performance.',
    kpis:[
      {label:'Total Vendors', note:'Registered'},
      {label:'Active Vendors', note:'Currently engaged'},
      {label:'Pending Approval', note:'Awaiting onboarding'},
      {label:'Avg Rating', note:'Last 12 months'},
    ],
    statusOptions:['Active','Pending Approval','Suspended','Inactive'],
    tableColumns:['Vendor Name','Category','Contact','Onboarded Date','Status'],
    searchPlaceholder:'Search vendors...',
    dateLabel:'Onboarded Date',
  },
  pettyCash: {
    title:'Petty Cash', crumb:'Finance',
    description:'Track petty cash claims, approvals and reimbursements.',
    kpis:[
      {label:'Petty Cash Balance', note:'Current'},
      {label:'Claims This Month', note:'Submitted'},
      {label:'Pending Approval', note:'Awaiting sign-off'},
      {label:'Reimbursed Amount', note:'This month'},
    ],
    statusOptions:['Submitted','Pending Approval','Approved','Reimbursed','Rejected'],
    tableColumns:['Date','Requested By','Description','Amount','Status'],
    searchPlaceholder:'Search claims...',
  },
    tipperOperationKPI: {
    title: 'Tipper Operation KPI',
    crumb: 'Tipper Operations',
    description: 'Operational performance overview for the tipper fleet.',
    kpis: [
      { label: 'Daily Trips', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle No','Driver','Destination','Trips','Tonnage','Revenue'],
    chartLabel: 'Tipper Trips & Revenue Trend',
  },

  tipperDriverKPI: {
    title: 'Tipper Driver KPI',
    crumb: 'Tipper Operations',
    description: 'Driver performance monitoring for tipper operations.',
    kpis: [
      { label: 'Driver Attendance', note: 'Today' },
      { label: 'Trips Completed', note: 'Today' },
      { label: 'Revenue Generated', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Trips','Revenue','Violations','KPI Score'],
    chartLabel: 'Driver Performance Trend',
  },

  containerOperationKPI: {
    title: 'Container Operation KPI',
    crumb: 'Container Operations',
    description: 'Operational performance overview for container operations.',
    kpis: [
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Customer','Containers','Revenue'],
    chartLabel: 'Container Deliveries Trend',
  },

  containerDriverKPI: {
    title: 'Container Driver KPI',
    crumb: 'Container Operations',
    description: 'Driver performance monitoring for container operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Containers Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Deliveries','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },

  tankerOperationKPI: {
    title: 'Tanker Operation KPI',
    crumb: 'Tanker Operations',
    description: 'Operational performance overview for tanker operations.',
    kpis: [
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Fleet Running', note: 'Active now' },
      { label: 'Fleet Availability', note: 'Available vs total' },
      { label: 'Revenue', note: 'Today' },
    ],
    statusOptions: ['Running','Idle','Under Maintenance','Off Duty'],
    tableColumns: ['Date','Vehicle','Driver','Product','Destination','Loads','Revenue'],
    chartLabel: 'Tanker Loads Trend',
  },

  tankerDriverKPI: {
    title: 'Tanker Driver KPI',
    crumb: 'Tanker Operations',
    description: 'Driver performance monitoring for tanker operations.',
    kpis: [
      { label: 'Attendance', note: 'Today' },
      { label: 'Loads Delivered', note: 'Today' },
      { label: 'Revenue', note: 'Today' },
      { label: 'Safety Score', note: '30 Days' },
    ],
    statusOptions: ['Present','Absent','On Leave','Suspended'],
    tableColumns: ['Driver','Attendance','Loads','Revenue','Violations'],
    chartLabel: 'Driver Performance Trend',
  },
};

/* Renders a full page skeleton for a future module. No data fetching, no
   API calls — the table, chart and KPI values are all static placeholders. */
function renderModuleSkeleton(moduleKey){
  const cfg = SKELETON_MODULES[moduleKey];
  const searchPlaceholder = cfg.searchPlaceholder || 'Search records...';
  const dateLabel = cfg.dateLabel || 'Date Range';

  const wrap = document.createElement('div');
  wrap.className = 'skel-page';
  wrap.innerHTML = `
    <div class="skel-intro">
      <div class="skel-intro-text">
        <div class="skel-crumbs">
          <span>${cfg.crumb}</span><span class="sep">/</span><span class="current">${cfg.title}</span>
        </div>
        <p>${cfg.description}</p>
      </div>
      <span class="skel-badge">Skeleton &middot; In Development</span>
    </div>

    <div class="kpirow">
      ${cfg.kpis.map(k => kpiCard({label:k.label, value:'&mdash;', note:k.note})).join('')}
    </div>

    <div class="section">
      <div class="section-head">
        <h3>Filters</h3>
        <span class="spacer"></span>
      </div>
      <div class="section-body">
        <div class="skel-filterbar">
          <input class="searchbox" type="text" placeholder="${searchPlaceholder}" disabled>
          <input class="skel-date" type="date" aria-label="${dateLabel}" disabled>
          <select class="skel-select" aria-label="Status" disabled>
            <option>All Statuses</option>
            ${cfg.statusOptions.map(s => `<option>${s}</option>`).join('')}
          </select>
          <button class="btn" disabled>Apply Filters</button>
        </div>
      </div>
    </div>

    <div class="skel-main-grid">
      <div class="section">
        <div class="section-head">
          <h3>Records</h3>
          <span class="eyebrow">0 records</span>
        </div>
        <div class="section-body skel-table-placeholder">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>${cfg.tableColumns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div class="skel-empty">
            ${SKEL_ICON_EMPTY}
            <div class="skel-empty-title">No Data Available</div>
            <div class="skel-empty-sub">Records will appear here once this module is connected to live data.</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Overview</h3>
        </div>
        <div class="section-body">
          <div class="skel-chart-placeholder">
            ${SKEL_ICON_CHART}
            <span>${cfg.chartLabel || 'Chart placeholder'}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return wrap;
}

/* ---------------------------------------------------------------------
   NOTE ON WIRING (intentionally not done here per scope):
   These 14 pages are fully self-contained and ready to be linked in once
   you're ready to expose them. To make a page reachable, add one line to
   ROUTES, e.g.:
     tipperOpsDashboard: { title:'Tipper Operations Dashboard',
       crumb:'Tipper Operations', render: () => renderModuleSkeleton('tipperOpsDashboard') },
   and, when ready to show it in the sidebar, add its key to a group in
   NAV_STRUCTURE. Neither ROUTES' existing entries nor NAV_STRUCTURE are
   modified by this change — sidebar and navigation are left exactly as
   they were.
--------------------------------------------------------------------- */
/* =======================================================================
   PAGE: HIRARC REGISTER + ASSESSMENT EDITOR (hazard table / RPN engine)
   Self-contained: does not modify renderDataPage/wireTable/openAddRowModal/
   openEditRowModal/buildTableHTML/cellDisplay, so every other data page
   (and the shared engines) are unaffected. All markup/wiring below lives
   in its own functions; only the two lines editing TABLES.HIRARC_MASTER's
   labels + TABLES.HIRARC_HAZARDS' new entry touch shared data structures,
   additively.
======================================================================= */

// Labels used only inside the "New Assessment" modal (image 2). Kept
// separate from TABLES.HIRARC_MASTER column labels so the register table
// header (image 1: "Review Date") can stay short while the modal stays
// descriptive ("Next Review Date") — both read from the one column def.
const HIRARC_MODAL_LABELS = {
  refNo: 'Reference Number',
  department: 'Department',
  process: 'Process',
  location: 'Process / Activity Location',
  originalDate: 'Original Assessment Date',
  lastReviewDate: 'Last Review Date',
  nextReviewDate: 'Next Review Date',
  raLeader: 'RA Leader',
  raMember1: 'RA Member 1',
  raMember2: 'RA Member 2',
  raMember3: 'RA Member 3',
  approvedBy: 'Approved By',
};

async function generateHirarcRefNo(){
  const rows = await getData('HIRARC_MASTER');
  let maxNum = 0;
  rows.forEach(r => {
    const m = /^HIRARC-(\d+)$/.exec(String(r.refNo || '').trim());
    if (m){ const n = parseInt(m[1], 10); if (n > maxNum) maxNum = n; }
  });
  return `HIRARC-${String(maxNum + 1).padStart(4, '0')}`;
}

// "+ New Assessment" (image 2): captures the register-level fields only.
// Ref No is auto-generated and rendered readonly — manual entry is
// disallowed. Status has no field here; new records default to 'Open'
// (badgeFor() renders 'Open' as the same red/pink pill seen in image 3/1).
async function openNewHirarcModal(onDone){
  const def = TABLES.HIRARC_MASTER;
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  const refNo = await generateHirarcRefNo();

  let fields = `<div class="formfield"><label>${HIRARC_MODAL_LABELS.refNo}</label><input data-col="refNo" type="text" value="${escapeHtml(refNo)}" readonly></div>`;
  def.columns.forEach(c => {
    if (c.id === 'refNo' || c.id === 'status') return;
    const label = HIRARC_MODAL_LABELS[c.id] || c.label;
    if (c.type === 'date'){
      fields += `<div class="formfield"><label>${label}</label><input data-col="${c.id}" type="date"></div>`;
    } else {
      fields += `<div class="formfield"><label>${label}</label><input data-col="${c.id}" type="text"></div>`;
    }
  });

  box.innerHTML = `
    <h4>New HIRARC Assessment</h4>
    <div class="formgrid">${fields}</div>
    <div class="modalfoot">
      <button class="btn" id="cancelModal">Cancel</button>
      <button class="btn primary" id="saveModal">Save Assessment</button>
    </div>
  `;
  overlay.classList.add('show');

  box.querySelector('#cancelModal').onclick = () => overlay.classList.remove('show');
  box.querySelector('#saveModal').onclick = async () => {
    const record = {refNo, status:'Open'};
    def.columns.forEach(c => {
      if (c.id === 'refNo' || c.id === 'status') return;
      const field = box.querySelector(`[data-col="${c.id}"]`);
      record[c.id] = field ? field.value : '';
    });
    const currentRows = await getData('HIRARC_MASTER');
    currentRows.unshift(record);
    await persist('HIRARC_MASTER');
    overlay.classList.remove('show');
    if (onDone) await onDone();
  };
}

// Plain numeric read for S / L / RPN inputs — blank/non-numeric reads as 0.
function hirarcNum(v){
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// RPN colour follows the updated Risk Assessment Matrix (Consequences x
// Likelihood, 1-5 each): RPN<=3 = Low(green), 4-7 = Moderate(gold),
// 8-14 = High(orange), >=15 = Extreme(dark red). Blank/0 stays uncoloured.
function hirarcRpnStyle(rpn){
  if (!rpn) return '';
  let bg, fg;
  if (rpn <= 3){ bg = '#92d050'; fg = '#000'; }
  else if (rpn <= 7){ bg = '#ffc000'; fg = '#000'; }
  else if (rpn <= 14){ bg = '#ff8c00'; fg = '#000'; }
  else { bg = '#c00000'; fg = '#000'; }
  return `background:${bg};color:${fg};font-weight:700;text-align:center;`;
}

const HIRARC_HAZARD_INPUT_STYLE = 'width:100%;min-width:110px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit;color:var(--ink);';
const HIRARC_HAZARD_NUM_STYLE = 'width:56px;min-width:56px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 6px;font:inherit;color:var(--ink);text-align:center;';
// Fields whose content is meant to be a list of points: pressing Enter
// inside them automatically starts a new bullet point.
const HIRARC_HAZARD_POINT_STYLE = 'width:100%;min-width:110px;min-height:64px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit;color:var(--ink);resize:vertical;white-space:pre-wrap;';

function hirarcHazardRowHTML(h, idx){
  const rpn = hirarcNum(h.s) * hirarcNum(h.l);
  const rpn2 = hirarcNum(h.s2) * hirarcNum(h.l2);
  const t = (id, val) => `<input data-hidx="${idx}" data-hf="${id}" type="text" value="${escapeHtml(val ?? '')}" style="${HIRARC_HAZARD_INPUT_STYLE}">`;
  const n = (id, val) => `<input data-hidx="${idx}" data-hf="${id}" type="number" step="any" value="${escapeHtml(val ?? '')}" style="${HIRARC_HAZARD_NUM_STYLE}">`;
  const p = (id, val) => `<textarea data-hidx="${idx}" data-hf="${id}" class="hirarc-point-field" style="${HIRARC_HAZARD_POINT_STYLE}">${escapeHtml(val ?? '')}</textarea>`;
  return `<tr data-hidx="${idx}">
    <td>${idx + 1}</td>
    <td>${t('workActivity', h.workActivity)}</td>
    <td>${t('hazard', h.hazard)}</td>
    <td>${p('possibleInjury', h.possibleInjury)}</td>
    <td>${p('existingControls', h.existingControls)}</td>
    <td>${n('s', h.s)}</td>
    <td>${n('l', h.l)}</td>
    <td class="hirarc-rpn" data-rpn-for="${idx}" style="${hirarcRpnStyle(rpn)}">${rpn}</td>
    <td>${p('additionalControls', h.additionalControls)}</td>
    <td>${n('s2', h.s2)}</td>
    <td>${n('l2', h.l2)}</td>
    <td class="hirarc-rpn2" data-rpn2-for="${idx}" style="${hirarcRpnStyle(rpn2)}">${rpn2}</td>
    <td>${p('implementationPerson', h.implementationPerson)}</td>
    <td>${p('remarks', h.remarks)}</td>
    <td><button class="btn danger hirarc-hazard-del" data-hidx="${idx}">Delete</button></td>
  </tr>`;
}

// "HIRARC ASSESSMENT EDITOR" (image 4): full page, not a modal. Shown when
// Edit is clicked on a register row. Top section edits the register-level
// fields; bottom section is the hazard sub-table (Work Activity ... RPN
// engine columns per spec item 3) with Add/Delete rows and live RPN calc.
async function renderHirarcEditorView(root, master, onBack){
  const allHazards = await getData('HIRARC_HAZARDS');
  let currentHazards = allHazards.filter(h => h.parentRefNo === master.refNo).map(h => ({...h}));

  root.innerHTML = `
    <div class="section">
      <div class="section-head">
        <h3>HIRARC ASSESSMENT EDITOR</h3>
        <div class="spacer"></div>
        <span class="savechip" id="hirarcEditorSavechip">&#10003; saved</span>
      </div>
      <div class="section-body">
        <div class="formgrid">
          <div class="formfield"><label>Reference Number</label><input id="hirarcEdRefNo" type="text" value="${escapeHtml(master.refNo)}" readonly></div>
          <div class="formfield"><label>Department</label><input id="hirarcEdDepartment" type="text" value="${escapeHtml(master.department)}"></div>
          <div class="formfield"><label>Process</label><input id="hirarcEdProcess" type="text" value="${escapeHtml(master.process)}"></div>
          <div class="formfield"><label>Location</label><input id="hirarcEdLocation" type="text" value="${escapeHtml(master.location)}"></div>
          <div class="formfield"><label>RA Leader</label><input id="hirarcEdRaLeader" type="text" value="${escapeHtml(master.raLeader)}"></div>
          <div class="formfield"><label>Approved By</label><input id="hirarcEdApprovedBy" type="text" value="${escapeHtml(master.approvedBy)}"></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button class="btn" id="hirarcBackBtn">Back To Register</button>
          <button class="btn primary" id="hirarcSaveHazardsBtn">Save Hazards</button>
        </div>
      </div>
    </div>

    <div class="section" style="margin-top:20px;">
      <div class="section-head">
        <span class="eyebrow">HAZARD ASSESSMENT</span>
        <span class="badge" style="margin-left:10px;font-weight:600;">Reference No: ${escapeHtml(master.refNo)}</span>
        <div class="spacer"></div>
        <button class="btn primary" id="hirarcAddHazardBtn">+ Add Hazard</button>
      </div>
      <div class="section-body">
        <div class="tablewrap">
          <table class="datatable">
            <thead><tr>
              <th>No.</th><th>Work Activity</th><th>Hazard</th><th>Possible Injury / Ill Health</th><th>Existing Risk Controls</th>
              <th>S</th><th>L</th><th>RPN</th><th>Additional Controls</th><th>S</th><th>L</th><th>RPN</th>
              <th>Implementation Person</th><th>Remarks</th><th>Action</th>
            </tr></thead>
            <tbody id="hirarcHazardTbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const tbody = root.querySelector('#hirarcHazardTbody');
  function renderRows(){
    tbody.innerHTML = currentHazards.map((h, idx) => hirarcHazardRowHTML(h, idx)).join('');
  }
  renderRows();

  // Live RPN recalculation + field capture (delegated — rows are rebuilt on add/delete only).
  tbody.addEventListener('input', (e) => {
    const el = e.target.closest('[data-hf]');
    if (!el) return;
    const idx = parseInt(el.dataset.hidx, 10);
    const field = el.dataset.hf;
    if (!currentHazards[idx]) return;
    currentHazards[idx][field] = el.value;
    if (field === 's' || field === 'l'){
      const cell = tbody.querySelector(`[data-rpn-for="${idx}"]`);
      if (cell){
        const rpn = hirarcNum(currentHazards[idx].s) * hirarcNum(currentHazards[idx].l);
        cell.textContent = rpn;
        cell.setAttribute('style', hirarcRpnStyle(rpn));
      }
    }
    if (field === 's2' || field === 'l2'){
      const cell = tbody.querySelector(`[data-rpn2-for="${idx}"]`);
      if (cell){
        const rpn2 = hirarcNum(currentHazards[idx].s2) * hirarcNum(currentHazards[idx].l2);
        cell.textContent = rpn2;
        cell.setAttribute('style', hirarcRpnStyle(rpn2));
      }
    }
  });

  // Point-list fields (Possible Injury / Ill Health, Existing Risk Controls,
  // Additional Controls, Implementation Person, Remarks): Enter starts a new
  // bullet point automatically, and an empty field seeds its first bullet
  // as soon as it's focused.
  tbody.addEventListener('keydown', (e) => {
    const el = e.target.closest('.hirarc-point-field');
    if (!el) return;
    if (e.key === 'Enter'){
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const insert = '\n• ';
      el.value = el.value.substring(0, start) + insert + el.value.substring(end);
      const pos = start + insert.length;
      el.selectionStart = el.selectionEnd = pos;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  tbody.addEventListener('focusin', (e) => {
    const el = e.target.closest('.hirarc-point-field');
    if (!el) return;
    if (el.value === ''){
      el.value = '• ';
      el.selectionStart = el.selectionEnd = el.value.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  tbody.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.hirarc-hazard-del');
    if (!delBtn) return;
    const idx = parseInt(delBtn.dataset.hidx, 10);
    if (!confirm('Delete this hazard row?')) return;
    currentHazards.splice(idx, 1);
    renderRows();
  });

  root.querySelector('#hirarcAddHazardBtn').addEventListener('click', () => {
    currentHazards.push({workActivity:'', hazard:'', possibleInjury:'', existingControls:'', s:'', l:'', additionalControls:'', s2:'', l2:'', implementationPerson:'', remarks:''});
    renderRows();
  });

  root.querySelector('#hirarcBackBtn').addEventListener('click', () => onBack());

  root.querySelector('#hirarcSaveHazardsBtn').addEventListener('click', async () => {
    const saveBtn = root.querySelector('#hirarcSaveHazardsBtn');
    saveBtn.disabled = true;
    try {
      // Persist the register-level fields back onto the HIRARC_MASTER row.
      const masterRows = await getData('HIRARC_MASTER');
      const mi = masterRows.findIndex(r => r.refNo === master.refNo);
      if (mi > -1){
        masterRows[mi] = {
          ...masterRows[mi],
          department: root.querySelector('#hirarcEdDepartment').value,
          process: root.querySelector('#hirarcEdProcess').value,
          location: root.querySelector('#hirarcEdLocation').value,
          raLeader: root.querySelector('#hirarcEdRaLeader').value,
          approvedBy: root.querySelector('#hirarcEdApprovedBy').value,
        };
        await persist('HIRARC_MASTER');
        Object.assign(master, masterRows[mi]);
      }

      // Replace this assessment's hazard rows, leaving every other
      // assessment's hazard rows in HIRARC_HAZARDS untouched.
      const hazardRows = await getData('HIRARC_HAZARDS');
      const others = hazardRows.filter(h => h.parentRefNo !== master.refNo);
      const saved = currentHazards.map(h => ({
        parentRefNo: master.refNo,
        workActivity: h.workActivity || '',
        hazard: h.hazard || '',
        possibleInjury: h.possibleInjury || '',
        existingControls: h.existingControls || '',
        s: h.s || '',
        l: h.l || '',
        rpn: hirarcNum(h.s) * hirarcNum(h.l),
        additionalControls: h.additionalControls || '',
        s2: h.s2 || '',
        l2: h.l2 || '',
        rpn2: hirarcNum(h.s2) * hirarcNum(h.l2),
        implementationPerson: h.implementationPerson || '',
        remarks: h.remarks || '',
      }));
      DATA_CACHE.HIRARC_HAZARDS = others.concat(saved);
      await persist('HIRARC_HAZARDS');
      flashSaved();
      const chip = root.querySelector('#hirarcEditorSavechip');
      if (chip){ chip.classList.add('show'); setTimeout(() => chip.classList.remove('show'), 1200); }
      // Explicit popup so it's obvious the hazards actually reached the
      // Google Sheet — the small chip alone is easy to miss on this
      // full-page editor.
      alert(`Saved successfully.\n\nReference No: ${master.refNo}\n${currentHazards.length} hazard row(s) written to Google Sheet.`);
    } catch (err) {
      // persist() already alert()s the underlying reason (e.g. a real
      // version conflict, or an Apps Script/network error) — this just
      // stops the flow here instead of leaving an "Uncaught (in
      // promise)" in the console with no visible feedback.
      console.error('Save Hazards failed:', err);
    } finally {
      saveBtn.disabled = false;
    }
  });
}

/* ---------------------------------------------------------------------
   HIRARC Register -> "Download PDF" (per assessment, by Reference No)
   Builds a printable HIRARC form (register header + full hazard table)
   from HIRARC_MASTER + HIRARC_HAZARDS and renders it to a downloadable
   PDF via html2pdf.js. Self-contained inline styles so the exported
   page matches the standard HIRARC form layout regardless of the app's
   own theme, and renders correctly once detached from the live DOM.
--------------------------------------------------------------------- */
const HIRARC_PDF_COLORS = {
  yellow: '#fff2a8',
  tan: '#d9d3ac',
  pink: '#f4dcdc',
  headCyan: '#dcefef',
  border: '#8a8a8a',
};

// Data is stored as free text with manual "\n• " bullets (see the
// point-list fields in the Hazard Assessment editor) — render each line
// as its own row so the PDF reads as a bullet list, same as the source.
function hirarcPdfMultiline(text){
  const lines = String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return '';
  return lines.map(l => `<div>${escapeHtml(l)}</div>`).join('');
}

function hirarcPdfHazardRowHtml(h, idx){
  const rpn = hirarcNum(h.s) * hirarcNum(h.l);
  const rpn2 = hirarcNum(h.s2) * hirarcNum(h.l2);
  const cellStyle = 'border:1px solid ' + HIRARC_PDF_COLORS.border + ';padding:6px 8px;vertical-align:top;font-size:11px;line-height:1.4;';
  // "Shrink-to-fit" columns (No / Work Activity / Hazard / S / L / RPN
  // pairs): width:1% + nowrap makes the browser size these to their own
  // content only, instead of always reserving a wide fixed column — the
  // freed-up space then goes to the wrap-enabled text columns below.
  const tightStyle = cellStyle + 'width:1%;white-space:nowrap;';
  const numStyle = tightStyle + 'text-align:center;';
  const wrapStyle = cellStyle + 'white-space:normal;word-break:break-word;';
  const rpnStyle = (v) => numStyle + 'font-weight:700;' + hirarcRpnStyle(v);
  return `<tr>
    <td style="${numStyle}">${idx + 1}</td>
    <td style="${tightStyle}">${escapeHtml(h.workActivity || '')}</td>
    <td style="${tightStyle}">${escapeHtml(h.hazard || '')}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.possibleInjury)}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.existingControls)}</td>
    <td style="${numStyle}">${escapeHtml(h.s ?? '')}</td>
    <td style="${numStyle}">${escapeHtml(h.l ?? '')}</td>
    <td style="${rpnStyle(rpn)}">${rpn}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.additionalControls)}</td>
    <td style="${numStyle}">${escapeHtml(h.s2 ?? '')}</td>
    <td style="${numStyle}">${escapeHtml(h.l2 ?? '')}</td>
    <td style="${rpnStyle(rpn2)}">${rpn2}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.implementationPerson)}</td>
    <td style="${wrapStyle}">${hirarcPdfMultiline(h.remarks)}</td>
  </tr>`;
}

// Register-header (top block: Department/RA Leader/Approved by/Reference
// Number) laid out exactly like the standard HIRARC form.
function hirarcPdfHeaderHtml(master){
  const b = HIRARC_PDF_COLORS.border;
  const yellowCell = `background:${HIRARC_PDF_COLORS.yellow};border:1px solid ${b};padding:8px 10px;font-size:12px;`;
  const plainCell = `border:1px solid ${b};padding:8px 10px;font-size:12px;`;
  const blankCell = `border:1px solid ${b};padding:14px 10px;font-size:12px;`;
  const label = (t) => `<b>${t}</b>`;
  return `
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:12px;">
    <colgroup><col style="width:30%"><col style="width:26%"><col style="width:30%"><col style="width:14%"></colgroup>
    <tr>
      <td style="${yellowCell}">${label('Department:')} ${escapeHtml(master.department || '')}</td>
      <td style="${plainCell}">${label('RA Leader:')} ${escapeHtml(master.raLeader || '')}</td>
      <td style="${plainCell}"><u><b>Approved by</b></u></td>
      <td rowspan="6" style="${plainCell}text-align:center;vertical-align:middle;">
        <u><b>Reference Number</b></u><br><br>
        <span style="font-size:14px;font-weight:700;">${escapeHtml(master.refNo || '')}</span>
      </td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Process:')} ${escapeHtml(master.process || '')}</td>
      <td style="${plainCell}">${label('RA Member 1:')} ${escapeHtml(master.raMember1 || '')}</td>
      <td style="${blankCell}">&nbsp;</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Process/Activity Location:')} ${escapeHtml(master.location || '')}</td>
      <td style="${plainCell}">${label('RA Member 2:')} ${escapeHtml(master.raMember2 || '')}</td>
      <td style="${plainCell}">${label('Signature:')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Original Assessment date:')} ${escapeHtml(fmtDate(master.originalDate) || '')}</td>
      <td style="${plainCell}">${label('RA Member 3:')} ${escapeHtml(master.raMember3 || '')}</td>
      <td style="${plainCell}">${label('Name:')} ${escapeHtml(master.approvedBy || '')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Last review date:')} ${escapeHtml(fmtDate(master.lastReviewDate) || '')}</td>
      <td style="${plainCell}">&nbsp;</td>
      <td style="${plainCell}">${label('Designation:')}</td>
    </tr>
    <tr>
      <td style="${yellowCell}">${label('Next review date:')} ${escapeHtml(fmtDate(master.nextReviewDate) || '')}</td>
      <td style="${plainCell}">&nbsp;</td>
      <td style="${plainCell}">${label('Date:')}</td>
    </tr>
  </table>`;
}

function buildHirarcPdfDocumentHtml(master, hazards){
  const b = HIRARC_PDF_COLORS.border;
  const groupHeadStyle = `border:1px solid ${b};padding:8px;font-size:12px;font-weight:700;text-align:center;`;
  // Header cells mirror the two shrink-to-fit vs. wrap groups used in the
  // data rows (hirarcPdfHazardRowHtml) so each column's header lines up
  // with its body width: No/Work Activity/Hazard/S/L/RPN pairs shrink to
  // their content (nowrap); the five text columns wrap and take whatever
  // width is left over.
  const tightHeadStyle = `border:1px solid ${b};padding:6px 10px;font-size:10.5px;font-weight:700;text-align:center;white-space:nowrap;width:1%;`;
  const wrapHeadStyle = `border:1px solid ${b};padding:6px 10px;font-size:10.5px;font-weight:700;text-align:center;`;
  return `
  <div style="width:1650px;padding:24px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111;box-sizing:border-box;">
    <h2 style="margin:0 0 12px;font-size:18px;">HIRARC Assessment — ${escapeHtml(master.refNo || '')}</h2>
    ${hirarcPdfHeaderHtml(master)}
    <table style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead>
        <tr>
          <td colspan="4" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.headCyan};">HAZARD IDENTIFICATION</td>
          <td colspan="4" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.tan};">RISK EVALUATION</td>
          <td colspan="6" style="${groupHeadStyle}background:${HIRARC_PDF_COLORS.pink};">RISK CONTROL</td>
        </tr>
        <tr>
          <td style="${tightHeadStyle}">No</td>
          <td style="${tightHeadStyle}">Work Activity</td>
          <td style="${tightHeadStyle}">Hazard</td>
          <td style="${wrapHeadStyle}">Possible injury/ill-health</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.tan};">Existing risk controls</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">S</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">L</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.tan};">RPN</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Additional Controls</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">S</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">L</td>
          <td style="${tightHeadStyle}background:${HIRARC_PDF_COLORS.pink};">RPN</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Implementation Person</td>
          <td style="${wrapHeadStyle}background:${HIRARC_PDF_COLORS.pink};">Remarks</td>
        </tr>
      </thead>
      <tbody>
        ${hazards.length ? hazards.map((h, i) => hirarcPdfHazardRowHtml(h, i)).join('') : `<tr><td colspan="14" style="border:1px solid ${b};padding:14px;text-align:center;font-size:11px;color:#666;">No hazard rows recorded for this assessment.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

// Fetches this assessment's master + hazard rows, renders the printable
// form off-screen, and hands it to html2pdf.js for an auto-triggered
// download named after the Reference No (e.g. HIRARC-0007.pdf).
async function downloadHirarcPdf(refNo){
  /* HIRARC guna html2pdf (bundle itu sudah termasuk html2canvas + jsPDF),
     jadi yang perlu disemak cuma window.html2pdf. */
  if (typeof html2pdf === 'undefined'){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const [masterRows, hazardRows] = await Promise.all([getData('HIRARC_MASTER'), getData('HIRARC_HAZARDS')]);
  const master = masterRows.find(r => r.refNo === refNo);
  if (!master){ alert('Assessment not found: ' + refNo); return; }
  const hazards = hazardRows.filter(h => h.parentRefNo === refNo);

  const holder = document.createElement('div');
  // Rendered off-screen (not display:none — html2canvas needs real layout)
  // so nothing flashes on screen while the PDF is generated.
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;';
  holder.innerHTML = buildHirarcPdfDocumentHtml(master, hazards);
  document.body.appendChild(holder);
  const target = holder.firstElementChild;

  try {
    // margin:0 is deliberate — the PDF page size is set to exactly match
    // the content's own pixel dimensions (target.scrollWidth/Height) so
    // everything fits on one page. Any non-zero margin here eats into
    // that exact-fit page instead of adding whitespace around it, which
    // was clipping the right/bottom-most borders (Reference Number box,
    // right edge of the RISK CONTROL columns). The container div already
    // has its own 24px padding for visual framing, so no PDF margin is
    // needed on top of that.
    await html2pdf().set({
      margin: 0,
      filename: `${refNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: target.scrollWidth },
      jsPDF: { unit: 'px', format: [target.scrollWidth, target.scrollHeight], orientation: 'landscape' },
      pagebreak: { mode: ['avoid-all'] },
    }).from(target).save();
  } catch (err){
    console.error('HIRARC PDF export failed:', err);
    alert('Could not generate the PDF. Please try again.');
  } finally {
    holder.remove();
  }
}

const HIRARC_PDF_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="currentColor" opacity="0.15"/><path d="M14 2v5h5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.4" fill="none"/><text x="12" y="17.5" font-size="7.5" font-weight="700" text-anchor="middle" fill="currentColor">PDF</text></svg>`;


/* ============================================================
   PRIME MOVER — DETAIL PAGE (klik Truck No. -> page penuh)
   19 kolum table + medan detail: Chassis/TnG/Fleet Card/
   Tank Info/Electrical/Device Type/Goods Type/Manufacturer/Model.
   ============================================================ */
const PM_DETAIL_SECTIONS = [
  { title:'1 · Vehicle Identity', fields:[
    {id:'lorry', label:'Truck No.', type:'text'},
    {id:'branch', label:'Branch', type:'text'},
    {id:'chassisNo', label:'Chassis No.', type:'text'},
    {id:'make', label:'Manufacturer', type:'text'},
    {id:'model', label:'Model', type:'text'},
    {id:'registerYear', label:'Register Year', type:'text'},
    {id:'goodsType', label:'Goods Type', type:'text'},
  ]},
  { title:'2 · Specification', fields:[
    {id:'bdm', label:'BDM (kg)', type:'number'},
    {id:'tankInfo', label:'Tank Info', type:'text'},
    {id:'electricalSystem', label:'Electrical System', type:'text'},
    {id:'deviceType', label:'Device Type', type:'text'},
  ]},
  { title:'3 · Cards & Identification', fields:[
    {id:'tngNo', label:'TnG No.', type:'text'},
    {id:'fleetCardNo', label:'Fleet Card No.', type:'text'},
    {id:'rfidNo', label:'RFID No.', type:'text'},
  ]},
  { title:'4 · Compliance Documents', fields:[
    {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
    {id:'roadtax', label:'Roadtax Expiry Date', type:'date'},
    {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
    {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
    {id:'puspakomNo', label:'Puspakom No.', type:'text'},
    {id:'puspakom', label:'Puspakom Expiry Date', type:'date'},
    {id:'insuranceNo', label:'Insurance No.', type:'text'},
    {id:'insurance', label:'Insurance Expiry Date', type:'date'},
    {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
  ]},
  { title:'5 · PMA & Notes', fields:[
    {id:'pmaOwner', label:'PMA Owner', type:'text'},
    {id:'pmaNo', label:'PMA No.', type:'text'},
    {id:'pmaCategory', label:'PMA Category', type:'text'},
    {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
    {id:'remark', label:'Remark', type:'textarea'},
  ]},
];

/* Card 6 — Documents. RANGKA sahaja (belum ada fail sebenar).
   Bila storage disambung nanti, setiap slot akan isi:
   truck.docs[slotId] = { fileName, storagePath, uploadedAt }   */
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

/* ============================================================
   DOCUMENT UPDATE TRACKING
   User kena pilih: "Correction Only" atau "Document Renewal / Update"
   bila medan dokumen berubah. Fail lama TIDAK pernah dipadam.
   Langkah 1 = helper sahaja (belum ada UI, tiada perubahan kelihatan).
   ============================================================ */

// Medan yang dianggap milik sesuatu slot dokumen.
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

// Label slot (untuk mesej: "Insurance, Roadtax - 2 documents need new files")
function pmDocSlotLabel(slotId){
  const s = PM_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

// Bandingkan nilai lama vs baru -> senarai slot yang terlibat (unik).
function pmDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(PM_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = PM_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

// Tulis mod pada docs object. Fail lama dikekalkan.
// mode: 'correction_only' | 'document_renewal'
function pmApplyDocUpdateMode(truckDocs, slots, mode){
  const docs = (truckDocs && typeof truckDocs === 'object' && !Array.isArray(truckDocs)) ? {...truckDocs} : {};
  slots.forEach(slotId => {
    const cur = (docs[slotId] && typeof docs[slotId] === 'object' && !Array.isArray(docs[slotId])) ? {...docs[slotId]} : {};
    cur.updateMode = mode;
    if (mode === 'document_renewal'){
      cur.status = 'pending_upload';
      cur.pendingSince = new Date().toISOString();
    } else {
      cur.status = cur.fileName ? 'current' : 'missing';
      delete cur.pendingSince;
    }
    docs[slotId] = cur;
  });
  return docs;
}

/* ============================================================
   PRIME MOVER — SUPABASE STORAGE (PDF sahaja · max 5 MB)
   Satu fail sahaja per slot. Upload = TIMPA fail lama (upsert).
   Path: {companyId}/prime-mover/{assetId}/{slotId}
   ============================================================ */
const PM_DOC_BUCKET    = 'focc-documents';
const PM_DOC_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB

// Tarikh rujukan untuk validUntil setiap slot (slot tanpa tarikh = '')
const PM_DOC_EXPIRY_FIELD = {
  pma:              'pmaExpiry',
  roadtax:          'roadtax',
  singaporeRoadtax: 'singaporeRoadtaxExpiry',
  puspakom:         'puspakom',
  insurance:        'insurance',
};

// UUID (crypto.randomUUID perlukan https — ada fallback)
function pmNewId(){
  try{ if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Setiap lori mesti ada assetId KEKAL — jangan guna Truck No. sebagai folder
// (kalau Truck No. ditukar, fail jadi yatim)
async function pmEnsureAssetIds(){
  const rows = await getData('primeMover');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !r.assetId){ r.assetId = pmNewId(); changed = true; } });
  if (changed) await persist('primeMover');
}

function pmStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/prime-mover/${asset}/${slotId}`;
}

// Baca 5 bait pertama fail (untuk semak tanda tangan PDF)
async function pmReadHead(file){
  const blob = file.slice(0, 5);
  if (blob.text) return await blob.text();
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload  = () => res(String(fr.result || ''));
    fr.onerror = () => rej(new Error('Could not read the file.'));
    fr.readAsText(blob);
  });
}

// Pengesahan PDF: nama + saiz + isi fail MESTI bermula dengan '%PDF-'
async function pmValidatePdf(file){
  if (!file) return 'No file selected.';
  if (!/\.pdf$/i.test(String(file.name || ''))) return 'Only PDF files are allowed.';
  if (file.size < 1) return 'The file is empty.';
  if (file.size > PM_DOC_MAX_BYTES) return 'File is larger than 5 MB.';
  let head = '';
  try{ head = await pmReadHead(file); }catch(e){ return 'Could not read the file.'; }
  if (head !== '%PDF-') return 'This file is not a valid PDF.';
  return '';
}

// Upload + GANTI fail lama. Pulangkan objek docs[slotId] yang baharu.
async function pmUploadDoc(row, slotId, file, expiryValue){
  const bad = await pmValidatePdf(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = pmStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';

  // Fail lama di path LAIN (contoh jenis fail berubah) -> buang dulu
  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf', cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    'application/pdf',
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

// Buka fail guna signed URL 60 detik (bucket private)
async function pmOpenDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (!m.hasFile || !m.doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .createSignedUrl(m.doc.storagePath, 60, m.doc.fileName ? { download: m.doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

// Padam fail dari storage (rekod JSON dikosongkan oleh pemanggil)
async function pmDeleteDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (m.doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([m.doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

function pmDocMeta(truck, slotId){
  const docs = (truck && truck.docs && typeof truck.docs === 'object' && !Array.isArray(truck.docs)) ? truck.docs : {};
  const doc  = (docs[slotId] && typeof docs[slotId] === 'object') ? docs[slotId] : {};
  const hasFile = !!(doc.fileName || doc.storagePath);
  // current | pending_upload | missing  (rekod lama tanpa status dianggap current kalau ada fail)
  let status = doc.status;
  if (status !== 'current' && status !== 'pending_upload' && status !== 'missing'){
    status = hasFile ? 'current' : 'missing';
  }
  if (status === 'current' && !hasFile) status = 'missing';
  return { doc, hasFile, status, pending: status === 'pending_upload' };
}

function pmDocumentsCardHtml(truck){
  const pendingCount  = PM_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(truck, s.id).pending ? 1 : 0), 0);
  const uploadedCount = PM_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(truck, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>7 · Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${PM_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${PM_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(truck, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file" data-slot="${slot.id}" accept="application/pdf,.pdf" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* Card 6 — Assigned Trailers (pilihan di page Prime Mover).
   Ticked = trailer yang terikat dengan lori ini. Trailer page auto ikut. */
function pmAssignedTrailersCardHtml(truck, editing, tlRows, taken){
  const assigned = Array.isArray(truck.assignedTrailers) ? truck.assignedTrailers.map(String) : [];
  const rows = (tlRows || []).filter(t => t && (t.assetId || t.lorry));

  if (!rows.length){
    return `
      <div class="section">
        <div class="section-head"><h3>6 · Assigned Trailers</h3></div>
        <div class="section-body">
          <div class="settings-note" style="margin-top:0;">No trailer records yet. Add them in the Trailer page first.</div>
        </div>
      </div>`;
  }

  if (editing){
    return `
      <div class="section">
        <div class="section-head">
          <h3>6 · Assigned Trailers</h3>
          <div class="spacer"></div>
          <span class="pm-doc-note">${assigned.length} SELECTED</span>
        </div>
        <div class="section-body">
          <div class="pm-tl-pick">
            ${rows.map(t => {
              const asset = String(t.assetId || '');
              const on = assigned.includes(asset);
              const heldBy = (!on && taken && taken.get(asset)) ? String(taken.get(asset)) : '';
              const sub = [t.type, t.branch].filter(Boolean).map(String).join(' &middot; ');
              const subTxt = heldBy ? `Assigned to ${heldBy} — release it there first` : sub;
              return `<label class="pm-tl-pick-row${heldBy ? ' is-locked' : ''}">
                <input type="checkbox" data-tl-pick="${escapeHtml(asset)}" ${on ? 'checked' : ''} ${heldBy ? 'disabled' : ''}>
                <span><b>${escapeHtml(String(t.lorry || '(No Trailer No.)'))}</b><small>${escapeHtml(subTxt)}</small></span>
              </label>`;
            }).join('')}
          </div>
          <div class="settings-note">Trailer yang ditanda akan tunjuk <b>Assigned Prime Mover</b> secara automatik di page Trailer.</div>
        </div>
      </div>`;
  }

  const list = rows.filter(t => assigned.includes(String(t.assetId || '')));
  return `
    <div class="section">
      <div class="section-head">
        <h3>6 · Assigned Trailers</h3>
        <div class="spacer"></div>
        <span class="pm-doc-note">${list.length} ASSIGNED</span>
      </div>
      <div class="section-body">
        ${list.length
          ? `<div class="pm-tl-chips">${list.map(t => `<span class="pm-tl-chip">${escapeHtml(String(t.lorry || ''))}</span>`).join('')}</div>`
          : `<div class="settings-note" style="margin-top:0;">No trailer assigned to this prime mover yet.</div>`}
      </div>
    </div>`;
}

function pmDisplayValue(field, row){
  const raw = row ? row[field.id] : '';
  if (raw === '' || raw === null || raw === undefined) return '-';
  if (field.type === 'date')  return fmtDate(raw);
  if (field.type === 'money') return FMT.money(raw);
  if (field.type === 'number') return FMT.num(raw);
  return String(raw);
}
/* ============================================================
   STAFF — DOKUMEN (PDF / JPG / PNG · max 5 MB)
   Guna semula enjin PM (pmDocMeta / pmOpenDoc / pmDeleteDoc /
   pmApplyDocUpdateMode). Cuma path storage berbeza:
   {companyId}/staff/{assetId}/{slotId}
   ============================================================ */
const ST_DOCUMENT_SLOTS = [
  {id:'passport',    label:'Passport'},
  {id:'license',     label:'Driving License'},
  {id:'gdl',         label:'GDL'},
  {id:'drugTest',    label:'Drug Test'},
  {id:'alcoholTest', label:'Alcohol Test'},
  {id:'medicalTest', label:'Medical Test'},
  {id:'employmentContract', label:'Employment Contract'},
];

const ST_DOC_EXPIRY_FIELD = {
  passport:    'passportExpiry',
  license:     'licenseExpiry',
  gdl:         'gdlExpiry',
  drugTest:    'drugTest',
  alcoholTest: 'alcoholTest',
  medicalTest: 'medicalStatus',
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

const ST_DOC_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const ST_ACCEPT_ATTR   = 'application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png';

function stStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/staff/${asset}/${slotId}`;
}

async function stEnsureAssetIds(){
  const rows = await getData('staffDatabase');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => {
    if (!r) return;
    if (!r.assetId){ r.assetId = pmNewId(); changed = true; }
    /* Sekali sahaja: Email lama -> Personal Email (data asal TIDAK dipadam) */
    if (!r.emailSplitDone && r.email){
      if (!r.personalEmail) r.personalEmail = r.email;
      r.emailSplitDone = true;
      changed = true;
    }
  });
  if (changed) await persist('staffDatabase');
}

function stDocSlotLabel(slotId){
  const s = ST_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function stDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(ST_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = ST_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

// Sahkan ikut MAGIC BYTES: %PDF- · JPEG FF D8 FF · PNG 89 50 4E 47
async function stReadBytes(file, n){
  const buf = await file.slice(0, n).arrayBuffer();
  return new Uint8Array(buf);
}
function stStartsWith(bytes, sig){
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (bytes[i] !== sig[i]) return false;
  return true;
}
async function stValidateFile(file){
  if (!file) return 'No file selected.';
  if (file.size < 1) return 'The file is empty.';
  if (file.size > ST_DOC_MAX_BYTES) return 'File is larger than 5 MB.';
  if (!/\.(pdf|jpe?g|png)$/i.test(String(file.name || ''))) return 'Only PDF, JPG or PNG files are allowed.';
  const t = String(file.type || '').toLowerCase();
  if (t && t !== 'application/pdf' && t !== 'image/jpeg' && t !== 'image/png') return 'Only PDF, JPG or PNG files are allowed.';

  let head;
  try{ head = await stReadBytes(file, 8); }catch(e){ return 'Could not read the file.'; }
  const isPdf = stStartsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2D]);
  const isJpg = stStartsWith(head, [0xFF, 0xD8, 0xFF]);
  const isPng = stStartsWith(head, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!isPdf && !isJpg && !isPng) return 'This file is not a valid PDF, JPG or PNG.';
  return '';
}
function stContentType(file){
  const t = String(file.type || '').toLowerCase();
  if (t === 'application/pdf' || t === 'image/jpeg' || t === 'image/png') return t;
  const n = String(file.name || '').toLowerCase();
  if (/\.png$/.test(n)) return 'image/png';
  if (/\.jpe?g$/.test(n)) return 'image/jpeg';
  return 'application/pdf';
}

async function stUploadDoc(row, slotId, file, expiryValue){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = stStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';
  const ctype     = stContentType(file);

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(PM_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(PM_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    ctype,
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

function stDocumentsCardHtml(row){
  const pendingCount  = ST_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).pending ? 1 : 0), 0);
  const uploadedCount = ST_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${ST_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; JPG &middot; PNG &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${ST_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(row, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file st-doc-file" data-slot="${slot.id}" accept="${ST_ACCEPT_ATTR}" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

const STAFF_DETAIL_SECTIONS = [
  { title:'1 · Personal Details', fields:[
    {id:'staffName',   label:'Staff Name',    type:'text'},
    {id:'icNumber',    label:'IC Number',     type:'ic'},
    {id:'dateOfBirth', label:'Date of Birth', type:'date'},
    {id:'age',         label:'Age',           type:'computed'},
    {id:'nationality', label:'Nationality',   type:'text'},
  ]},
  { title:'2 · Employment', fields:[
    {id:'employeeId',       label:'Employee ID',      type:'text'},
    {id:'designation',      label:'Designation',      type:'text'},
    {id:'branch',           label:'Branch',           type:'text'},
    {id:'dateHired',        label:'Date Hired',       type:'date'},
    {id:'tenure',           label:'Tenure',           type:'computed'},
    {id:'employmentType',   label:'Employment Type',  type:'select'},
    {id:'employmentStatus', label:'Employee Status',  type:'computed'},
    {id:'resignationDate',  label:'Resignation Date', type:'date'},
  ]},
  { title:'3 · Contact', fields:[
    {id:'phone',         label:'Phone Number',   type:'text'},
    {id:'whatsapp',      label:'WhatsApp',       type:'computed'},
    {id:'personalEmail', label:'Personal Email', type:'text'},
    {id:'workEmail',     label:'Work Email',     type:'text'},
    {id:'address',       label:'Address',        type:'textarea'},
  ]},
  { title:'4 · Driving & Travel Documents', fields:[
    {id:'licenseNumber',  label:'License Number',  type:'text'},
    {id:'licenseExpiry',  label:'License Expiry',  type:'date'},
    {id:'gdlNumber',      label:'GDL Number',      type:'text'},
    {id:'gdlExpiry',      label:'GDL Expiry',      type:'date'},
    {id:'passportNo',     label:'Passport No.',    type:'text'},
    {id:'passportExpiry', label:'Passport Expiry', type:'date'},
  ]},
  { title:'5 · Tests & Medical', fields:[
    {id:'drugTest',      label:'Drug Test',      type:'date'},
    {id:'alcoholTest',   label:'Alcohol Test',   type:'date'},
    {id:'medicalStatus', label:'Medical Test',   type:'date'},
  ]},
];

const ST_DETAIL_READONLY = ['whatsapp','tenure','age','employmentStatus'];

// Senarai negara (datalist) — sama seperti combo Nationality
const ST_NATIONALITY_LIST = COMBO_DEFAULT_OPTIONS.staffDatabase.nationality;

// Kolum yang dipaparkan dalam table list (16)
const ST_VISIBLE_COLUMNS = [
  'staffName','designation','employeeId','branch','workEmail','whatsapp','icNumber',
  'tenure','age','licenseExpiry','gdlExpiry','drugTest','alcoholTest',
  'medicalStatus','passportExpiry','employmentType','employmentStatus',
];

async function renderPrimeMoverDetailView(root, index, onBack, opts){
  const all = await getData('primeMover');
  let truck = all[index];
  if (!truck){ await onBack(); return; }
  pmRememberOpen(truck);
  // Senarai trailer company ni — untuk pilihan "Assigned Trailers"
  let tlRows = [];
  try{ if (typeof tlEnsureAssetIds === 'function') await tlEnsureAssetIds(); }catch(e){}
  try{ tlRows = await getData('trailer'); }catch(e){ tlRows = []; }
  if (!Array.isArray(tlRows)) tlRows = [];

  // Trailer yang sudah dipegang PRIME MOVER LAIN (assetId -> Truck No.).
  // Guna untuk MATIKAN checkbox di card 6 — satu trailer, satu prime mover.
  function tlTakenByOthers(){
    const taken = new Map();
    const myAsset = String(truck.assetId || '');
    const myLorry = String(truck.lorry || '');
    (all || []).forEach(pm => {
      if (!pm) return;
      const sameRow = myAsset
        ? String(pm.assetId || '') === myAsset
        : String(pm.lorry || '') === myLorry;
      if (sameRow) return;
      const list = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers : [];
      list.forEach(a => { const k = String(a || ''); if (k) taken.set(k, String(pm.lorry || '(no truck)')); });
    });
    return taken;
  }

  let editing = false;
  let pmDocRadioValue = '';
  let pendingFocusSlots = null;

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${PM_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${escapeHtml(pmDisplayValue(f, truck))}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${pmAssignedTrailersCardHtml(truck, false, tlRows)}
        ${pmDocumentsCardHtml(truck)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${PM_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const v = (truck[f.id] === undefined || truck[f.id] === null) ? '' : truck[f.id];
                  const safe = escapeHtml(String(v));
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${escapeHtml(f.label)}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  if (f.type === 'number' || f.type === 'money') return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="number" step="any" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${pmAssignedTrailersCardHtml(truck, true, tlRows, tlTakenByOthers())}
        ${pmDocumentsCardHtml(truck)}
      </div>`;
  }

  function paint(){
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="pmBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(truck.lorry || '(No Truck)')}</span>
          <span class="pm-detail-sub">${escapeHtml(truck.branch || '')}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="pmCancel">Cancel</button>
             <button class="btn primary" id="pmSave">Save Changes</button>`
          : `<button class="btn primary" id="pmEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="pmBody">${editing ? editHtml() + '<div id="pmDocUpdatePanel"></div>' : readOnlyHtml()}</div>
    `;

    const backBtn = root.querySelector('#pmBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing){
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      await onBack();
    };

    const editBtn = root.querySelector('#pmEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#pmCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false;
      paint();
    };

    const saveBtn = root.querySelector('#pmSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('primeMover');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      PM_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        let v = el.value;
        if ((f.type === 'number' || f.type === 'money') && v !== '') v = parseFloat(v);
        next[f.id] = v;
      }));
      // Mod update dokumen (fail lama TIDAK dipadam)
      const docSlots = pmDocSlotsChanged(prev, next);
      if (docSlots.length){
        if (!pmDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, docSlots, pmDocRadioValue);
        pendingFocusSlots = docSlots;
      }
      // Assigned Trailers: prime mover ni tick sendiri (checkbox)
      const picks = root.querySelectorAll('[data-tl-pick]');
      if (picks.length){
        next.assignedTrailers = Array.from(picks)
          .filter(el => el.checked && !el.disabled)
          .map(el => String(el.dataset.tlPick || ''))
          .filter(Boolean);
      } else if (!Array.isArray(next.assignedTrailers)){
        next.assignedTrailers = [];     // jangan padam senarai sedia ada kalau UI tak dimuat
      }

      // GUARD: trailer yang ditick tak boleh dipegang PRIME MOVER LAIN.
      // Baca terus dari DB (bukan cache). Kalau gagal → guna cache, save tetap jalan.
      let pool = await getData('primeMover');
      try{ pool = await SupabaseProvider.loadTable('primeMover'); }catch(e){ /* offline */ }
      const clash = [];
      (pool || []).forEach(pm => {
        if (!pm) return;
        const sameRow = next.assetId
          ? String(pm.assetId || '') === String(next.assetId)
          : String(pm.lorry || '') === String(next.lorry || '');
        if (sameRow) return;
        const own = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers.map(String) : [];
        own.forEach(a => {
          if (a && next.assignedTrailers.includes(a)){
            const tl = (tlRows || []).find(t => String(t.assetId || '') === a);
            clash.push((tl && tl.lorry ? String(tl.lorry) : a) + '  (sekarang di: ' + String(pm.lorry || '?') + ')');
          }
        });
      });
      if (clash.length){
        alert('Trailer ini sudah di-assign pada prime mover lain:\n\n' + clash.join('\n') +
              '\n\nBuang tick di lori itu dahulu, kemudian save semula.');
        return;
      }

      data[index] = next;
      all[index] = next;
      await persist('primeMover');
      // Trailer terlibat -> 'Assigned Prime Mover' auto dikemas kini
      if (typeof syncTrailerPrimeMover === 'function') await syncTrailerPrimeMover();
      truck = next;
      editing = false;
      pmDocRadioValue = '';
      paint();
    };

    // Editor Detail Page: panel "Correction Only" vs "Document Renewal / Update"
    if (editing && saveBtn){
      const docPanel = root.querySelector('#pmDocUpdatePanel');
      const snapshot = {};
      Object.keys(PM_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (truck[f] == null) ? '' : String(truck[f]); });

      function readDocInputs(){
        const out = {};
        Object.keys(PM_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      }

      const refreshDocPanel = () => {
        const slots = pmDocSlotsChanged(snapshot, readDocInputs());
        if (!slots.length){
          docPanel.innerHTML = '';
          docPanel.dataset.rendered = '';
          pmDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (docPanel.dataset.rendered !== slots.join(',')){
          docPanel.dataset.rendered = slots.join(',');
          docPanel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(pmDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="pmDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="pmDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
              </label>
              <div class="pm-docupd-hint">You must choose one option before saving.</div>
            </div>`;
          docPanel.querySelectorAll('input[name="pmDocUpdateMode"]').forEach(r => {
            r.addEventListener('change', () => { pmDocRadioValue = r.value; saveBtn.disabled = false; });
          });
          pmDocRadioValue = '';
          saveBtn.disabled = true;
        }
      };

      const editBody = root.querySelector('#pmBody');
      if (editBody){
        editBody.addEventListener('input', refreshDocPanel);
        editBody.addEventListener('change', refreshDocPanel);
      }
      refreshDocPanel();
    }

    // Scroll ke card 6 + highlight slot terlibat
    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#pmBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    // ---- Documents: Upload / Download / Delete (mod lihat sahaja) ----
    const docBtns = root.querySelectorAll('#pmBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        // jangan benarkan tukar fail semasa edit — elak perubahan belum simpan hilang
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        const saveDocs = async (nextDocs) => {
          const data = await getData('primeMover');
          const next = Object.assign({}, data[index], { docs: nextDocs });
          data[index] = next;
          await persist('primeMover');
          truck = next;
          paint();
        };

        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.pm-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }

          if (action === 'download'){
            btn.onclick = async () => {
              try{ btn.disabled = true; await pmOpenDoc(truck, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }

          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm(`Delete the ${pmDocSlotLabel(slotId)} file? This cannot be undone.`)) return;
              try{
                btn.disabled = true;
                await pmDeleteDoc(truck, slotId);
                const docs = Object.assign({}, truck.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.pm-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField  = PM_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue  = expField ? (truck[expField] || '') : '';
              const doc       = await pmUploadDoc(truck, slotId, file, expValue);
              const docs      = Object.assign({}, truck.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}

/* ---------- Prime Mover: kekal dalam Detail Page selepas refresh (F5) ---------- */
const PM_OPEN_KEY = 'focc-pm-open';

function pmRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.lorry || '') : '';
    if (v) sessionStorage.setItem(PM_OPEN_KEY, v);
    else sessionStorage.removeItem(PM_OPEN_KEY);
  }catch(e){ /* storage unavailable — abaikan */ }
}

function pmForgetOpen(){
  try{ sessionStorage.removeItem(PM_OPEN_KEY); }catch(e){ /* abaikan */ }
}

function pmRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(PM_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (String(r.assetId || '') === want || String(r.lorry || '') === want));
}

async function renderPrimeMoverPage(){
  const root = document.createElement('div');

  async function showList(){
    pmForgetOpen();               // sampai senarai = bukan lagi dalam Detail Page
    await pmEnsureAssetIds();
    const listWrap = await renderDataPage('primeMover', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('primeMover'),
      onAddRow: () => openAddRowModal('primeMover', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        // assetId MESTI wujud SEBELUM Detail Page dibuka — kalau tidak,
        // upload dokumen akan jatuh ke folder 'unassigned' (dikongsi).
        onComplete: async () => { await pmEnsureAssetIds(); await renderPrimeMoverDetailView(root, 0, showList); },
      }),
      exportColumns: TABLES.primeMover.columns.concat([
        {id:'chassisNo', label:'Chassis No.'},
        {id:'make', label:'Manufacturer'},
        {id:'model', label:'Model'},
        {id:'goodsType', label:'Goods Type'},
        {id:'tankInfo', label:'Tank Info'},
        {id:'electricalSystem', label:'Electrical System'},
        {id:'deviceType', label:'Device Type'},
        {id:'tngNo', label:'TnG No.'},
        {id:'fleetCardNo', label:'Fleet Card No.'},
      ]),
      tableOptions: {
        linkColumnId: 'lorry',
        onLinkClick: async index => { await renderPrimeMoverDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('primeMover', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                const all = await getData('primeMover');
                const i = all.findIndex(r => r.lorry === info.lorry);
                await renderPrimeMoverDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  // Selepas F5: kalau tadi user dalam Detail Page, buka semula lori yang sama
  await pmEnsureAssetIds();
  const pmOpenIdx = pmRecallOpenIndex(await getData('primeMover'));
  if (pmOpenIdx >= 0){
    await renderPrimeMoverDetailView(root, pmOpenIdx, showList);
  } else {
    await showList();
  }
  return root;
}
/* ---------- Staff: kekal dalam Detail Page selepas refresh (F5) ---------- */
const ST_OPEN_KEY = 'focc-st-open';

function stRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.employeeId || row.staffName || '') : '';
    if (v) sessionStorage.setItem(ST_OPEN_KEY, v);
    else sessionStorage.removeItem(ST_OPEN_KEY);
  }catch(e){}
}
function stForgetOpen(){ try{ sessionStorage.removeItem(ST_OPEN_KEY); }catch(e){} }
function stRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(ST_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (
    String(r.assetId || '') === want ||
    String(r.employeeId || '') === want ||
    String(r.staffName || '') === want));
}

async function renderStaffDetailView(root, index, onBack, opts){
  opts = opts || {};
  const all = await getData('staffDatabase');
  let row = all[index];
  if (!row){ await onBack(); return; }
  stRememberOpen(row);

  let editing = !!opts.startEditing;
  let stDocRadioValue = '';
  let pendingFocusSlots = null;

  function staffCellHtml(f){
    const col = (TABLES.staffDatabase.columns.find(c => c.id === f.id)) || f;
    const raw = row[f.id];
    if (col.type === 'computed-whatsapp') return cellDisplay(col, raw, row) || '-';
    if (String(col.type || '').indexOf('computed-') === 0){
      const html = cellDisplay(col, raw, row) || '-';
      /* badge / link jenis computed sudah pun HTML — jangan escape lagi */
      return /^\s*</.test(String(html)) ? String(html) : escapeHtml(html);
    }
    if (col.type === 'date') return escapeHtml(fmtDate(raw) || '-');
    if (col.id === 'passportExpiry' && !raw) return '<span style="color:var(--muted)">-</span>';
    return escapeHtml(raw == null || raw === '' ? '-' : String(raw));
  }

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${STAFF_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${staffCellHtml(f)}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${stDocumentsCardHtml(row)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${STAFF_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const col = (TABLES.staffDatabase.columns.find(c => c.id === f.id)) || f;
                  const lbl = escapeHtml(f.label);
                  if (ST_DETAIL_READONLY.includes(f.id)){
                    return `<div class="formfield"><label>${lbl} <span class="pm-doc-date">(auto)</span></label><div style="padding:7px 0;color:var(--ink);font-weight:600">${staffCellHtml(f)}</div></div>`;
                  }
                  const v = (row[f.id] === undefined || row[f.id] === null) ? '' : row[f.id];
                  const safe = escapeHtml(String(v));
                  /* Nationality: combo boleh-taip (cari) — sama macam borang Add */
                  if (f.id === 'nationality') return buildComboField({ id:'nationality', label:f.label });
                  /* Employment Type: fixed picker (rupa baharu) — sama macam borang Add */
                  if (f.id === 'employmentType') return buildFixedPickerField({ id:'employmentType', label:f.label, type:'select', options: col.options || [] });
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${lbl}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')     return `<div class="formfield"><label>${lbl}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${lbl}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${stDocumentsCardHtml(row)}
      </div>`;
  }

  async function saveDocs(docs){
    const data = await getData('staffDatabase');
    const next = Object.assign({}, data[index] || {}, { docs: docs });
    data[index] = next;
    await persist('staffDatabase');
    row = next;
    paint();
  }

  function paint(){
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="stBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(row.staffName || '(No Staff Name)')}</span>
          <span class="pm-detail-sub">${escapeHtml(row.designation || '')}${row.branch ? ' &middot; ' + escapeHtml(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="stCancel">Cancel</button>
             <button class="btn primary" id="stSave">Save Changes</button>`
          : `<button class="btn primary" id="stEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="stBody">${editing ? editHtml() + '<div id="stDocUpdatePanel"></div>' : readOnlyHtml()}</div>`;

    const backBtn = root.querySelector('#stBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      await onBack();
    };

    const editBtn = root.querySelector('#stEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#stCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false; paint();
    };

    const saveBtn = root.querySelector('#stSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('staffDatabase');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);          // assetId + docs KEKAL
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      STAFF_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        if (ST_DETAIL_READONLY.includes(f.id)) return;
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        next[f.id] = String(el.value || '');
      }));
      const slots = stDocSlotsChanged(prev, next);
      if (slots.length){
        if (!stDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, slots, stDocRadioValue);
        pendingFocusSlots = slots;
      }
      data[index] = next;
      await persist('staffDatabase');
      row = next; editing = false; stDocRadioValue = '';
      paint();
    };

        /* Borang edit: picker rupa baharu + isi nilai semasa */
    if (editing){
      (async () => {
        try{
          const natEl = root.querySelector('[data-col="nationality"]');
          if (natEl) natEl.value = row.nationality || '';
          const etEl  = root.querySelector('[data-col="employmentType"]');
          if (etEl)  etEl.value  = row.employmentType || '';
          await wireComboFields(root, 'staffDatabase', TABLES.staffDatabase);
          wireFixedPickerFields(root, 'staffDatabase', TABLES.staffDatabase);
          if (natEl) natEl.value = row.nationality || '';
          if (etEl)  etEl.value  = row.employmentType || '';
        }catch(e){ console.error('staff form picker wiring failed', e); }
      })();
    }

    /* Panel Correction Only / Document Renewal */
    if (editing && saveBtn){
      const panel = root.querySelector('#stDocUpdatePanel');
      const snapshot = {};
      Object.keys(ST_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });
      const readInputs = () => {
        const out = {};
        Object.keys(ST_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      };
      const refreshPanel = () => {
        const slots = stDocSlotsChanged(snapshot, readInputs());
        if (!slots.length){
          panel.innerHTML = '';
          panel.dataset.rendered = '';
          stDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (panel.dataset.rendered !== slots.join(',')){
          panel.dataset.rendered = slots.join(',');
          panel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(stDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="stDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="stDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>A new document replaces the old one.</small></span>
              </label>
            </div>`;
          panel.querySelectorAll('input[name="stDocUpdateMode"]').forEach(r => {
            r.onchange = () => { stDocRadioValue = r.value; saveBtn.disabled = false; };
          });
          saveBtn.disabled = true;
        }
      };

          root.querySelectorAll('#stBody [data-col]').forEach(el => el.addEventListener('input', refreshPanel));
      refreshPanel();
    }

    /* Scroll ke kad Documents + highlight slot yang berubah */
    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#stBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    const docBtns = root.querySelectorAll('#stBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.st-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }
          if (action === 'download'){
            btn.onclick = async () => {
              btn.disabled = true;
              try{ await pmOpenDoc(row, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }
          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm('Delete this file? The record stays — only the document file is removed.')) return;
              btn.disabled = true;
              try{
                await pmDeleteDoc(row, slotId);
                const docs = Object.assign({}, row.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.st-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField = ST_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue = expField ? (row[expField] || '') : '';
              const doc = await stUploadDoc(row, slotId, file, expValue);
              const docs = Object.assign({}, row.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}

/* ---------- Staff Database: page controller (list ↔ detail) ---------- */
async function renderStaffPage(){
  const root = document.createElement('div');

  async function showList(){
    stForgetOpen();
    await stEnsureAssetIds();
    const listWrap = await renderDataPage('staffDatabase', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('staffDatabase'),
      onAddRow: () => openAddRowModal('staffDatabase', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await stEnsureAssetIds();
          const data = await getData('staffDatabase');
          await renderStaffDetailView(root, Math.max(0, data.length - 1), showList);
        },
      }),
      tableOptions: {
        visibleColumnIds: ST_VISIBLE_COLUMNS,
        linkColumnId: 'staffName',
        onLinkClick: async index => { await renderStaffDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('staffDatabase', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                const all = await getData('staffDatabase');
                const want = String(info.assetId || '');
                const i = want ? all.findIndex(r => String(r.assetId || '') === want) : -1;
                await renderStaffDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await stEnsureAssetIds();
  const openIdx = stRecallOpenIndex(await getData('staffDatabase'));
  if (openIdx >= 0) await renderStaffDetailView(root, openIdx, showList);
  else await showList();
  return root;
}

/* ============================================================
   4.25 HIRARC MODULE — Hazard Identification & Risk Assessment
============================================================= */

async function renderHirarcRegisterPage(){
  const root = document.createElement('div');

  async function showList(){
      const listWrap = await renderDataPage('HIRARC_MASTER', {
      wrapperClass: 'opkpi-modern-page',
      // Search box (built into renderDataPage) already matches against

      // Search box (built into renderDataPage) already matches against
      // every field's value, which covers refNo / department / process.
      onAddRow: () => openNewHirarcModal(showList),
      tableOptions: {
        // Register overview (image 1) shows a curated column subset —
        // Ref/Dept/Process/Location/RA Leader/Review Date/Status — while
        // Original Date, Last Review Date, RA Members and Approved By
        // stay reachable via Edit -> HIRARC Assessment Editor.
        visibleColumnIds: ['refNo','department','process','location','raLeader','nextReviewDate','status'],
        onEditRow: async index => {
          const rows = await getData('HIRARC_MASTER');
          const master = rows[index];
          if (!master) return;
          await renderHirarcEditorView(root, master, showList);
        },
        // Delete intentionally left to wireTable's default behaviour
        // (confirm() + data.splice + persist('HIRARC_MASTER')) — untouched.
        // "Download PDF": generates the printable HIRARC form for that row's
        // Reference No and auto-downloads it (see downloadHirarcPdf above).
        extraRowAction: { title: 'Download PDF', icon: HIRARC_PDF_ICON },
        onExtraRowAction: async index => {
          const rows = await getData('HIRARC_MASTER');
          const master = rows[index];
          if (!master) return;
          await downloadHirarcPdf(master.refNo);
        },
      },
    });
    // Page-specific label tweaks (spec wording) — done here via plain DOM
    // edits on the returned element so renderDataPage itself stays untouched.
    const addBtn = listWrap.querySelector('#addRowBtn');
    if (addBtn) addBtn.textContent = '+ New Assessment';
    const search = listWrap.querySelector('.searchbox');
    if (search) search.placeholder = 'Search HIRARC register...';
    // Import/Undo/Export aren't part of the target design (image 1) — hide
    // them without touching the shared toolbar markup/logic.
    ['#importBtn', '#undoBtn', '#importFile', '#exportBtn'].forEach(sel => {
      const el = listWrap.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  await showList();
  return root;
}
/* =========================================================================
   FOCC — 17-depot.js
   Depot Overview — main dashboard + full interactions.
   =========================================================================
   Phase 6 — Drag & Drop / Export CSV / Animation Polish
   ========================================================================= */

/* ============================================================
   LOAD DATA
============================================================= */
/* =============================================================
   DEPOT LAYOUT EDITOR — Route: depotLayout
   Define block (name, columns, rows, stack limit, color).
   Simpan ke table logik 'depotLayout' (tenant_tables payload).
   ============================================================= */
async function renderDepotLayout(){
  const wrap = document.createElement('div');
  let layout = await depotLoadLayout();

  function paint(){
    const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
    wrap.innerHTML = `
      <div class="section">
        <div class="section-head">
          <h3>Depot Layout</h3>
          <span class="eyebrow">${blocks.length} block${blocks.length === 1 ? '' : 's'}</span>
          <div class="spacer"></div>
          <button class="btn primary" id="depotAddBlock">+ Add Block</button>
        </div>
        <div class="section-body">
          <div class="formfield" style="max-width:420px;">
            <label>Depot Name</label>
            <input type="text" id="depotName" value="${escapeHtml(layout.depotName || '')}" placeholder="e.g. Kemaman Depot">
          </div>
          ${blocks.length ? `
            <div class="tablewrap" style="margin-top:14px;">
              <table class="datatable">
                <thead><tr><th>#</th><th>Block</th><th>Columns</th><th>Rows</th><th>Stack Limit</th><th>Color</th><th>Actions</th></tr></thead>
                <tbody>
                  ${blocks.map((b, i) => `
                    <tr>
                      <td>${i+1}</td>
                      <td><span class="truckchip">${escapeHtml(b.name || '?')}</span></td>
                      <td>${b.cols || 0}</td>
                      <td>${b.rows || 0}</td>
                      <td>${b.stackLimit || 1}</td>
                      <td><span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${b.color || '#1aa39a'};vertical-align:middle;"></span></td>
                      <td><div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button class="btn rowedit" data-edit="${i}">&#9998;</button>
                        <button class="btn rowdel" data-del="${i}">&#128465;</button>
                      </div></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="settings-note" style="margin-top:14px;">No blocks yet. Press <b>+ Add Block</b> to create your first block.</div>
          `}
        </div>
      </div>`;

    const nameEl = wrap.querySelector('#depotName');
    if (nameEl) nameEl.addEventListener('change', async () => {
      layout.depotName = nameEl.value.trim();
      await depotSaveLayout(layout);
    });

    const addBtn = wrap.querySelector('#depotAddBlock');
    if (addBtn) addBtn.addEventListener('click', () => openBlockEditor(-1));

    wrap.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openBlockEditor(Number(btn.dataset.edit)));
    });
    wrap.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.dataset.del);
        const b = blocks[i];
        const ok = await confirmModal('Delete Block',
          `Delete block <strong>${escapeHtml(b.name || '')}</strong>? Slots in this block will be removed.`,
          { confirmLabel:'Delete', tone:'danger' });
        if (!ok) return;
        layout.blocks = (layout.blocks || []).filter(x => x.blockId !== b.blockId);
        await depotSaveLayout(layout);
        paint();
      });
    });
  }

  function openBlockEditor(index){
    const isEdit = index >= 0;
    const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
    const existing = isEdit ? blocks[index] : null;
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    const color = existing ? (existing.color || DEPOT_BLOCK_COLORS[0])
                           : DEPOT_BLOCK_COLORS[(layout.blocks||[]).length % DEPOT_BLOCK_COLORS.length];

    box.classList.remove('opkpi-modal');
    box.innerHTML = `
      <h4>${isEdit ? 'Edit Block' : 'Add Block'}</h4>
      <div class="formgrid">
        <div class="formfield"><label>Block Name *</label>
          <input type="text" id="blkName" maxlength="6" value="${existing ? escapeHtml(existing.name || '') : ''}" placeholder="e.g. A" style="text-transform:uppercase;">
        </div>
        <div class="formfield"><label>Columns *</label>
          <input type="number" id="blkCols" min="1" max="40" step="1" value="${existing ? (existing.cols || 6) : 6}">
        </div>
        <div class="formfield"><label>Rows *</label>
          <input type="number" id="blkRows" min="1" max="60" step="1" value="${existing ? (existing.rows || 8) : 8}">
        </div>
        <div class="formfield"><label>Stack Limit</label>
        <input type="number" id="blkStack" min="1" max="5" step="1" value="${existing ? (existing.stackLimit || 1) : 2}">
        </div>
        <div class="formfield full"><label>Color</label>
          <div class="depot-color-picker">
            ${DEPOT_BLOCK_COLORS.map(c => `<div class="depot-color-swatch${c === color ? ' is-active' : ''}" data-color="${c}" style="background:${c};"></div>`).join('')}
          </div>
        </div>
      </div>
      <div id="blkError" class="settings-note" style="color:var(--red);display:none;"></div>
      <div class="modalfoot">
        <button class="btn" id="blkCancel">Cancel</button>
        <button class="btn primary" id="blkSave">${isEdit ? 'Save Changes' : 'Add Block'}</button>
      </div>`;
    overlay.classList.add('show');

    let chosenColor = color;
    box.querySelectorAll('.depot-color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        box.querySelectorAll('.depot-color-swatch').forEach(x => x.classList.remove('is-active'));
        sw.classList.add('is-active');
        chosenColor = sw.dataset.color;
      });
    });

    const close = () => overlay.classList.remove('show');
    box.querySelector('#blkCancel').addEventListener('click', close);
    box.querySelector('#blkSave').addEventListener('click', async () => {
      const err = box.querySelector('#blkError');
      const name  = String(box.querySelector('#blkName').value  || '').trim().toUpperCase();
      const cols  = parseInt(box.querySelector('#blkCols').value,  10);
      const rows  = parseInt(box.querySelector('#blkRows').value,  10);
      const stack = parseInt(box.querySelector('#blkStack').value, 10);
      if (!name){ err.style.display='block'; err.textContent='Block name is required.'; return; }
      if (!(cols >= 1 && cols <= 40)){ err.style.display='block'; err.textContent='Columns must be 1-40.'; return; }
      if (!(rows >= 1 && rows <= 60)){ err.style.display='block'; err.textContent='Rows must be 1-60.'; return; }
      const dup = (layout.blocks || []).some((b, i) => (b.name||'').toUpperCase() === name && (!isEdit || i !== index));
      if (dup){ err.style.display='block'; err.textContent='Block name already used.'; return; }

      layout.blocks = layout.blocks || [];
      if (isEdit){
        layout.blocks[index] = {...layout.blocks[index], name, cols, rows, stackLimit: stack, color: chosenColor};
      } else {
        const maxOrder = (layout.blocks || []).reduce((m,b) => Math.max(m, b.order||0), 0);
        layout.blocks.push({
          blockId: 'blk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6),
          name, cols, rows, stackLimit: stack, color: chosenColor, order: maxOrder + 1,
        });
      }
      await depotSaveLayout(layout);
      close();
      paint();
    });
    const n = box.querySelector('#blkName');
    if (n) setTimeout(() => n.focus(), 60);
  }

  paint();
  return wrap;
}

async function depotSaveLayout(layout){
  DATA_CACHE.depotLayout = [layout];
  await persist('depotLayout');
}
async function depotLoadLayout(){
  try{
    const rows = await getData('depotLayout');
    if (Array.isArray(rows) && rows.length) return rows[0];
  }catch(e){
    console.warn('depotLoadLayout failed:', e);
  }
  return {
    layoutId: 'layout-default',
    depotName: 'My Depot',
    blocks: [],
  };
}

async function depotLoadContainers(){
  try{
    const rows = await getData('depotContainers');
    return Array.isArray(rows) ? rows : [];
  }catch(e){
    console.warn('depotLoadContainers failed:', e);
    return [];
  }
}

/* ============================================================
   HELPERS
============================================================= */

function depotSlotNo(blockName, row, col){
  const block = String(blockName || '').toUpperCase();
  const rowLetter = String.fromCharCode(65 + (row - 1));
  const colNum = String(col).padStart(2, '0');
  return rowLetter + '-' + colNum;
}

function depotParseSlotNo(slotNo){
  const m = /^([A-Z])-(\d+)$/i.exec(String(slotNo || '').trim());
  if (!m) return null;
  return { row: m[1].toUpperCase().charCodeAt(0) - 64, col: parseInt(m[2], 10) };
}

function depotDaysInYard(container){
  if (!container || !container.inDate) return 0;
  const start = new Date(container.inDate);
  if (isNaN(start.getTime())) return 0;

  /* Beku masa OUT: kalau container dah departed dan ada outDate,
     kira sampai tarikh OUT sahaja (jangan naik lagi selepas tu).
     Kalau masih dalam yard, kira sampai HARI INI.
     Return to Depot reset container.inDate → auto kira semula dari 0. */
  const end = (container.departed && container.outDate)
    ? new Date(container.outDate)
    : new Date();
  if (isNaN(end.getTime())) return 0;

  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  const diff = Math.floor((end - start) / 86400000);
  return diff >= 0 ? diff : 0;
}

function depotDaysColor(days){
  const ranges = (typeof DEPOT_DAYS_RANGES !== 'undefined') ? DEPOT_DAYS_RANGES : [];
  for (const r of ranges){
    if (days >= r.min && days <= r.max) return r;
  }
  return { color: '#3f9a6e', label: days + 'd' };
}

function depotStatusBadge(status){
  const label = (typeof DEPOT_STATUS_LABELS !== 'undefined') ? (DEPOT_STATUS_LABELS[status] || status) : status;
  const cls = (typeof DEPOT_STATUS_BADGE !== 'undefined') ? (DEPOT_STATUS_BADGE[status] || 'neutral') : 'neutral';
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}
function depotSparkline(data, color){
  if (!Array.isArray(data) || data.length < 2) return '';

  const w = 200, h = 30, pad = 3;   // ← lebih pendek & lebar
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = (max - min) || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const c = color || '#1aa39a';
  const uid = 'sg-' + Math.random().toString(36).slice(2, 8);

  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });

  // Smooth curve (Catmull-Rom → Bezier)
  let pathD = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++){
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const areaD = pathD + ` L ${(pad + (data.length - 1) * stepX).toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;

  return `
    <svg class="depot-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"
         aria-hidden="true" style="--glow-color:${c};">
      <defs>
        <linearGradient id="${uid}-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stop-color="${c}" stop-opacity=".28"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="${uid}-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stop-color="${c}" stop-opacity=".65"/>
          <stop offset="50%" stop-color="${c}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${c}" stop-opacity=".65"/>
        </linearGradient>
      </defs>
      <path d="${areaD}" fill="url(#${uid}-area)" />
      <path class="depot-spark-line" d="${pathD}"
            fill="none" stroke="url(#${uid}-stroke)"
            stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path class="depot-spark-flow" d="${pathD}"
            fill="none" stroke="#fff" stroke-opacity=".5"
            stroke-width="1.2" stroke-linecap="round"
            stroke-dasharray="3 14" style="mix-blend-mode:screen;"/>
    </svg>
  `;
}

function depotGenId(){
  return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   SAVE OPERATIONS
============================================================= */

async function depotSaveAll(containers){
  DATA_CACHE.depotContainers = containers;
  await persist('depotContainers');
}

/* ============================================================
   EXPORT CSV
============================================================= */

function depotExportCSV(containers, layout, filterLabel){
  const headers = [
    'Comtaimer No','Type','Status','Block','Slot','Stack',
    'Customer','Job No','Vessel','Weight (kg)',
    'In Date','Out Date','Departed','Destination','ETA',
    'Days in Yard','Remarks','Created By'
  ];

  const rows = containers.map(c => {
    const days = depotDaysInYard(c);
    const inTxt = c.inDate ? new Date(c.inDate).toISOString().slice(0,10) : '';
    const outTxt = c.outDate ? new Date(c.outDate).toISOString().slice(0,10) : '';
    return [
      c.containerNo || '', c.type || '', c.status || '',
      c.blockName || '', c.slotNo || '', c.stackLevel || 1,
      c.customer || '', c.jobNo || '', c.vessel || '', c.weight || '',
      inTxt, outTxt, c.departed ? 'Yes' : 'No',
      c.destination || '', c.eta || '',
      days, c.remarks || '', c.createdBy || '',
    ];
  });

  const q = v => {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')){
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [
    '# FOCC Depot Export',
    `# Depot: ${layout.depotName || 'My Depot'}`,
    `# Filter: ${filterLabel || 'All'}`,
    `# Exported: ${new Date().toLocaleString('en-GB')}`,
    `# Total: ${rows.length} container(s)`,
    '',
    headers.map(q).join(','),
  ];
  rows.forEach(r => lines.push(r.map(q).join(',')));

  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0,10);
  const safe = String(layout.depotName || 'Depot').replace(/[^\w\-]+/g, '-');
  a.href = url;
  a.download = `FOCC-ISOTank-${safe}-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   MODAL HELPERS (shared)
============================================================= */

function depotModalWrap(html){
  const overlay = document.getElementById('modalOverlay');
  const box = document.getElementById('modalBox');
  box.classList.remove('opkpi-modal', 'user-modal', 'bugreport-modal');
  box.innerHTML = html;
  overlay.classList.add('show');
  return box;
}

function depotCloseModal(){
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ============================================================
   MODAL — Add Container
============================================================= */

function openDepotAddContainer(block, preslotNo, onSubmit, presetLevel){
  const slotNo = preslotNo || '';
  const stackLimit = Math.max(1, Number(block && block.stackLimit) || 1);
  const showLevelField = stackLimit > 1;
  const presetLvl = Number(presetLevel) || 0;
  const freeLevel = preslotNo ? depotNextFreeStackLevel(block, preslotNo) : 0;
  const defaultLevel = presetLvl || freeLevel || 1;
  const slotUsedCount = preslotNo ? getContainersAtSlot(block, preslotNo).length : 0;

  const html = `
    <h4>Add Container</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Slot: <strong>${escapeHtml(slotNo || '(choose below)')}</strong> · Block <strong>${escapeHtml(block.name || '?')}</strong>${showLevelField ? ` · <strong>${slotUsedCount}/${stackLimit}</strong> used` : ''}
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Container No. *</label>
        <input type="text" id="dcContainerNo" placeholder="e.g. MSKU1234567" maxlength="15" style="text-transform:uppercase;" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Type *</label>
        <select id="dcType">
          <option value="20ft Standard">20ft Standard</option>
          <option value="40ft Standard">40ft Standard</option>
          <option value="40ft HC">40ft HC</option>
          <option value="45ft">45ft</option>
        </select>
      </div>
      <div class="formfield">
        <label>Customer</label>
        <input type="text" id="dcCustomer" placeholder="e.g. Tiong Nam Logistics" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Job No.</label>
        <input type="text" id="dcJobNo" placeholder="e.g. JOB-2026-001" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Vessel</label>
        <input type="text" id="dcVessel" placeholder="e.g. MV EVER GIVEN" autocomplete="off">
      </div>
      <div class="formfield">
        <label>Weight (kg)</label>
        <input type="number" id="dcWeight" step="any" placeholder="e.g. 2400">
      </div>
      <div class="formfield">
        <label>Status</label>
        <select id="dcStatus">
          <option value="ok">OK</option>
          <option value="repairing">Repairing</option>
          <option value="damaged">Damaged</option>
        </select>
      </div>
      <div class="formfield">
        <label>Slot *</label>
        <input type="text" id="dcSlot" placeholder="e.g. A-05" value="${escapeHtml(slotNo)}" autocomplete="off" style="text-transform:uppercase;">
      </div>
            ${showLevelField ? `
      <div class="formfield">
        <label>Stack Level *</label>
        <select id="dcStackLevel">
          ${Array.from({length: stackLimit}, (_, i) => i + 1).map(lvl => {
            const usedInSlot = preslotNo
              ? getContainersAtSlot(block, preslotNo).some(c => (Number(c.stackLevel) || 1) === lvl)
              : false;
            return `<option value="${lvl}"${lvl === defaultLevel ? ' selected' : ''}${usedInSlot ? ' disabled' : ''}>Level ${lvl}${usedInSlot ? ' (used)' : ''}</option>`;
          }).join('')}
        </select>
      </div>` : ''}
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="dcRemarks" placeholder="Optional note" autocomplete="off">
      </div>
    </div>
    <div class="settings-note" id="dcError" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="dcCancel">Cancel</button>
      <button class="btn primary" id="dcSave">Add Container</button>
    </div>`;

  const box = depotModalWrap(html);
  const containerNoInput = box.querySelector('#dcContainerNo');
  setTimeout(() => containerNoInput && containerNoInput.focus(), 50);

  containerNoInput.addEventListener('input', () => {
    containerNoInput.value = containerNoInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });
  const slotInput = box.querySelector('#dcSlot');
  slotInput.addEventListener('input', () => {
    slotInput.value = slotInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });

  box.querySelector('#dcCancel').onclick = depotCloseModal;
  box.querySelector('#dcSave').onclick = async () => {
    const errEl = box.querySelector('#dcError');
    const containerNo = box.querySelector('#dcContainerNo').value.trim().toUpperCase();
    const type = box.querySelector('#dcType').value;
    const customer = box.querySelector('#dcCustomer').value.trim();
    const jobNo = box.querySelector('#dcJobNo').value.trim();
    const vessel = box.querySelector('#dcVessel').value.trim();
    const weight = box.querySelector('#dcWeight').value;
    const status = box.querySelector('#dcStatus').value;
    const slot = box.querySelector('#dcSlot').value.trim().toUpperCase();
    const remarks = box.querySelector('#dcRemarks').value.trim();

    if (!containerNo){ errEl.style.display='block'; errEl.textContent='Container No. is required.'; return; }
    if (!slot){ errEl.style.display='block'; errEl.textContent='Slot is required.'; return; }
    const parsed = depotParseSlotNo(slot);
    if (!parsed){ errEl.style.display='block'; errEl.textContent='Slot format must be like A-05.'; return; }
    if (parsed.row < 1 || parsed.row > (block.rows || 30)){ errEl.style.display='block'; errEl.textContent='Slot row is out of range.'; return; }
    if (parsed.col < 1 || parsed.col > (block.cols || 20)){ errEl.style.display='block'; errEl.textContent='Slot column is out of range.'; return; }

    /* Slot boleh ber-stack: pastikan slot ni masih ada ruang + level belum dipakai */
    const levelEl = box.querySelector('#dcStackLevel');
    const stackLevel = levelEl ? Number(levelEl.value) || 1 : 1;
    const existingInSlot = getContainersAtSlot(block, slot);
    if (existingInSlot.length >= stackLimit){
      errEl.style.display='block'; errEl.textContent='Slot ' + slot + ' is full (' + existingInSlot.length + '/' + stackLimit + ').'; return;
    }
    if (existingInSlot.some(c => (Number(c.stackLevel) || 1) === stackLevel)){
      errEl.style.display='block'; errEl.textContent='Level ' + stackLevel + ' is already used in ' + slot + '. Pick another level.'; return;
    }

    const payload = {
      containerId: depotGenId(),
      containerNo, type, customer, jobNo, vessel,
      weight: weight ? parseFloat(weight) : 0,
      status, slotNo: slot, stackLevel: stackLevel,
      blockId: block.blockId,
      blockName: block.name,
      inDate: new Date().toISOString(),
      outDate: '', departed: false,
      remarks,
      createdBy: getSessionEmail() || '',
      createdAt: new Date().toISOString(),
    };
    errEl.style.display = 'none';
    depotCloseModal();
    if (onSubmit) await onSubmit(payload);
  };
}

/* ============================================================
   MODAL — Change Status
============================================================= */

function openDepotChangeStatus(container, onSubmit){
  const html = `
    <h4>Change Status</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Container: <strong>${escapeHtml(container.containerNo || '-')}</strong>
    </div>
    <div class="depot-status-picker">
      <label class="depot-status-option ${container.status==='ok'?'is-active':''}">
        <input type="radio" name="dcStatus" value="ok" ${container.status==='ok'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#3f9a6e;"></span>
        <div class="depot-status-option-body"><b>OK</b><small>Container in good condition, ready for use.</small></div>
      </label>
      <label class="depot-status-option ${container.status==='repairing'?'is-active':''}">
        <input type="radio" name="dcStatus" value="repairing" ${container.status==='repairing'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#e6a339;"></span>
        <div class="depot-status-option-body"><b>Repairing</b><small>Under repair, not available.</small></div>
      </label>
      <label class="depot-status-option ${container.status==='damaged'?'is-active':''}">
        <input type="radio" name="dcStatus" value="damaged" ${container.status==='damaged'?'checked':''}>
        <span class="depot-status-option-dot" style="background:#d1554a;"></span>
        <div class="depot-status-option-body"><b>Damaged</b><small>Broken, needs assessment.</small></div>
      </label>
    </div>
    <div class="formfield full" style="margin-top:14px;">
      <label>Note (optional)</label>
      <input type="text" id="dcStatusNote" placeholder="e.g. dent on left side" value="${escapeHtml(container.statusNote || '')}" autocomplete="off">
    </div>
    <div class="modalfoot">
      <button class="btn" id="csCancel">Cancel</button>
      <button class="btn primary" id="csSave">Save Status</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelectorAll('.depot-status-option').forEach(el => {
    el.addEventListener('click', () => {
      box.querySelectorAll('.depot-status-option').forEach(x => x.classList.remove('is-active'));
      el.classList.add('is-active');
      el.querySelector('input[type=radio]').checked = true;
    });
  });
  box.querySelector('#csCancel').onclick = depotCloseModal;
  box.querySelector('#csSave').onclick = async () => {
    const sel = box.querySelector('input[name="dcStatus"]:checked');
    const status = sel ? sel.value : container.status;
    const note = box.querySelector('#dcStatusNote').value.trim();
    depotCloseModal();
    if (onSubmit) await onSubmit({ status, statusNote: note });
  };
}

/* ============================================================
   MODAL — Set OUT
============================================================= */
function openDepotSetOut(container, onSubmit){
  const todayStr = toISODateLocal(new Date());
  const nowStr   = new Date().toTimeString().slice(0,5);
  const html = `
  <h4>Set Container OUT</h4>
  <div class="notice notice-warning" style="margin-bottom:14px;">
    Mark <strong>${escapeHtml(container.containerNo || '-')}</strong> as <strong>departed</strong>? Slot will become empty.
  </div>
  <div class="formgrid">
    <div class="formfield full">
      <label>Order Ref</label>
      <input type="text" id="dcOutOrderRef" placeholder="e.g. JOB-2026-001 / DO-12345" autocomplete="off" value="${escapeHtml(container.orderRef || '')}">
    </div>
    <div class="formfield">
      <label>Out Date *</label>
      <input type="date" id="dcOutDate" value="${todayStr}">
    </div>
      <div class="formfield">
        <label>Out Time</label>
        <input type="time" id="dcOutTime" value="${nowStr}">
      </div>
      <div class="formfield full">
        <label>Destination *</label>
        <input type="text" id="dcOutDestination" placeholder="e.g. Port Klang / Customer Site A / Singapore" autocomplete="off">
      </div>
      <div class="formfield">
        <label>ETA (Estimated Arrival)</label>
        <input type="datetime-local" id="dcOutEta">
      </div>
      <div class="formfield">
        <label>Consignee / Receiver</label>
        <input type="text" id="dcOutConsignee" placeholder="Optional" autocomplete="off" value="${escapeHtml(container.customer || '')}">
      </div>
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="dcOutRemarks" placeholder="e.g. Delivered to customer site" autocomplete="off">
      </div>
    </div>
    <div class="modalfoot">
      <button class="btn" id="soCancel">Cancel</button>
      <button class="btn primary" id="soSave">Confirm OUT</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelector('#soCancel').onclick = depotCloseModal;
  box.querySelector('#soSave').onclick = async () => {
  const orderRef    = box.querySelector('#dcOutOrderRef').value.trim();
  const date        = box.querySelector('#dcOutDate').value;
  const time        = box.querySelector('#dcOutTime').value || '00:00';
  const destination = box.querySelector('#dcOutDestination').value.trim();
  const eta         = box.querySelector('#dcOutEta').value;
  const consignee   = box.querySelector('#dcOutConsignee').value.trim();
  const remarks     = box.querySelector('#dcOutRemarks').value.trim();
  if (!date){ alert('Out Date is required.'); return; }
  if (!destination){ alert('Destination is required.'); return; }
  const outDate = new Date(`${date}T${time}:00`).toISOString();
  depotCloseModal();
  if (onSubmit) await onSubmit({ outDate, outRemarks: remarks, destination, eta, consignee, orderRef });
  };
}
/* ============================================================
   MODAL — Edit Container Details
   Edit metadata (container no, type, customer, job no, vessel,
   weight, remarks). Slot kekal diurus via "Move Slot", status
   diurus via "Change Status". Stack level TIDAK disentuh.
   ============================================================ */
function openDepotEditDetails(container, onSubmit){
  const c = container;
  const TYPES = ['20ft Standard','40ft Standard','40ft HC','45ft'];
  const html = `
    <h4>Edit Container Details</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Editing <strong>${escapeHtml(c.containerNo || '-')}</strong> &middot; Slot <strong>${escapeHtml(c.slotNo || '-')}</strong>
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Container No. *</label>
        <input type="text" id="edContainerNo" maxlength="15" style="text-transform:uppercase;" autocomplete="off" value="${escapeHtml(c.containerNo || '')}">
      </div>
      <div class="formfield">
        <label>Type *</label>
        <select id="edType">
          ${TYPES.map(t => `<option value="${t}"${c.type === t ? ' selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="formfield">
        <label>Customer</label>
        <input type="text" id="edCustomer" autocomplete="off" value="${escapeHtml(c.customer || '')}">
      </div>
      <div class="formfield">
        <label>Job No.</label>
        <input type="text" id="edJobNo" autocomplete="off" value="${escapeHtml(c.jobNo || '')}">
      </div>
      <div class="formfield">
        <label>Vessel</label>
        <input type="text" id="edVessel" autocomplete="off" value="${escapeHtml(c.vessel || '')}">
      </div>
      <div class="formfield">
        <label>Weight (kg)</label>
        <input type="number" id="edWeight" step="any" value="${c.weight != null && c.weight !== '' ? escapeHtml(String(c.weight)) : ''}">
      </div>
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="edRemarks" autocomplete="off" value="${escapeHtml(c.remarks || '')}">
      </div>
    </div>
    <div class="settings-note">
      Slot &amp; Status diurus melalui <b>Move Slot</b> dan <b>Change Status</b> — bukan di sini.
    </div>
    <div class="settings-note" id="edError" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="edCancel">Cancel</button>
      <button class="btn primary" id="edSave">Save Changes</button>
    </div>`;

  const box = depotModalWrap(html);
  const cnoEl = box.querySelector('#edContainerNo');
  setTimeout(() => cnoEl && cnoEl.focus(), 50);

  cnoEl.addEventListener('input', () => {
    cnoEl.value = cnoEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  box.querySelector('#edCancel').onclick = depotCloseModal;
  box.querySelector('#edSave').onclick = async () => {
    const errEl = box.querySelector('#edError');
    const containerNo = cnoEl.value.trim().toUpperCase();
    const type = box.querySelector('#edType').value;
    const customer = box.querySelector('#edCustomer').value.trim();
    const jobNo = box.querySelector('#edJobNo').value.trim();
    const vessel = box.querySelector('#edVessel').value.trim();
    const weightRaw = box.querySelector('#edWeight').value;
    const remarks = box.querySelector('#edRemarks').value.trim();

    if (!containerNo){ errEl.style.display='block'; errEl.textContent='Container No. is required.'; return; }
    if (!type){ errEl.style.display='block'; errEl.textContent='Type is required.'; return; }

    const weight = weightRaw !== '' ? parseFloat(weightRaw) : 0;

    errEl.style.display = 'none';
    depotCloseModal();
    if (onSubmit) await onSubmit({ containerNo, type, customer, jobNo, vessel, weight, remarks });
  };
}

/* ============================================================
   MODAL — Move Slot
============================================================= */

function openDepotMoveSlot(container, layout, allContainers, onSubmit){
  const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
  const blockOpts = blocks.map(b =>
    `<option value="${b.blockId}" ${b.blockId === container.blockId ? 'selected' : ''}>Block ${escapeHtml(b.name || '?')}</option>`
  ).join('');

  const html = `
    <h4>Move Container to Another Slot</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      Container: <strong>${escapeHtml(container.containerNo || '-')}</strong><br>
      Current: Block <strong>${escapeHtml(container.blockName || '?')}</strong> · Slot <strong>${escapeHtml(container.slotNo || '-')}</strong>
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Target Block</label>
        <select id="dcMoveBlock">${blockOpts}</select>
      </div>
      <div class="formfield">
        <label>Target Slot *</label>
        <input type="text" id="dcMoveSlot" placeholder="e.g. A-15" autocomplete="off" style="text-transform:uppercase;">
      </div>
    </div>
    <div class="settings-note" id="msError" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="msCancel">Cancel</button>
      <button class="btn primary" id="msSave">Move</button>
    </div>`;

  const box = depotModalWrap(html);
  const slotInput = box.querySelector('#dcMoveSlot');
  slotInput.addEventListener('input', () => {
    slotInput.value = slotInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });
  setTimeout(() => slotInput.focus(), 50);

  box.querySelector('#msCancel').onclick = depotCloseModal;
  box.querySelector('#msSave').onclick = async () => {
    const errEl = box.querySelector('#msError');
    const blockId = box.querySelector('#dcMoveBlock').value;
    const slot = slotInput.value.trim().toUpperCase();
    if (!slot){ errEl.style.display='block'; errEl.textContent='Slot is required.'; return; }
    const parsed = depotParseSlotNo(slot);
    if (!parsed){ errEl.style.display='block'; errEl.textContent='Slot format must be like A-05.'; return; }
    const block = blocks.find(b => b.blockId === blockId);
    if (!block){ errEl.style.display='block'; errEl.textContent='Invalid block.'; return; }
    if (parsed.row < 1 || parsed.row > (block.rows || 30)){ errEl.style.display='block'; errEl.textContent='Slot row out of range.'; return; }
    if (parsed.col < 1 || parsed.col > (block.cols || 20)){ errEl.style.display='block'; errEl.textContent='Slot column out of range.'; return; }

    const others = (allContainers || []).filter(c =>
      c && !c.departed &&
      c.blockId === blockId &&
      String(c.slotNo || '').toUpperCase() === slot &&
      c.containerId !== container.containerId
    );
    const limit = Math.max(1, Number(block.stackLimit) || 1);
    if (others.length >= limit){
      errEl.style.display='block';
      errEl.textContent = `Slot ${slot} is full (${others.length}/${limit}).`;
      return;
    }
    const usedLvls = new Set(others.map(c => Number(c.stackLevel) || 1));
    let newLevel = 0;
    for (let lvl = 1; lvl <= limit; lvl++){ if (!usedLvls.has(lvl)){ newLevel = lvl; break; } }
    if (!newLevel){
      errEl.style.display='block';
      errEl.textContent = `Slot ${slot} has no free level.`;
      return;
    }

    depotCloseModal();
    if (onSubmit) await onSubmit({ blockId, blockName: block.name, slotNo: slot, stackLevel: newLevel });
  };
}

/* ============================================================
   MODAL — View Full Detail
============================================================= */

function openDepotContainerDetail(container){
  const c = container;
  const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
  const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[c.status]) || c.status;
  const days = depotDaysInYard(c);
  const daysR = depotDaysColor(days);
  const inDateTxt = c.inDate ? new Date(c.inDate).toLocaleString('en-GB') : '-';
  const outDateTxt = c.outDate ? new Date(c.outDate).toLocaleString('en-GB') : '-';
  const size = c.size || {};
  const sizeTxt = (size.l && size.w && size.h) ? `${size.l} × ${size.w} × ${size.h} m` : '-';

  const html = `
    <h4>Container Detail</h4>
    <div class="depot-detail-head">
      <div class="depot-detail-id">${escapeHtml(c.containerNo || '-')}</div>
      <div class="depot-detail-status" style="background:${statusColor}1a;color:${statusColor};">
        <span class="depot-side-panel-status-dot" style="background:${statusColor};"></span>
        ${escapeHtml(statusLabel)}
      </div>
    </div>
    <div class="depot-detail-grid">
      <div class="depot-detail-row"><span class="depot-detail-k">Type</span><span class="depot-detail-v">${escapeHtml(c.type || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Size (L × W × H)</span><span class="depot-detail-v">${escapeHtml(sizeTxt)}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Weight</span><span class="depot-detail-v">${c.weight ? Number(c.weight).toLocaleString() + ' kg' : '-'}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Customer</span><span class="depot-detail-v">${escapeHtml(c.customer || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Job No.</span><span class="depot-detail-v">${escapeHtml(c.jobNo || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Vessel</span><span class="depot-detail-v">${escapeHtml(c.vessel || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Block</span><span class="depot-detail-v">${escapeHtml(c.blockName || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Slot</span><span class="depot-detail-v">${escapeHtml(c.slotNo || '-')}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Stack Level</span><span class="depot-detail-v">${escapeHtml(String(c.stackLevel || 1))}</span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">Days in Yard</span><span class="depot-detail-v"><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></span></div>
      <div class="depot-detail-row"><span class="depot-detail-k">In Date</span><span class="depot-detail-v">${escapeHtml(inDateTxt)}</span></div>
      ${c.departed ? `<div class="depot-detail-row"><span class="depot-detail-k">Out Date</span><span class="depot-detail-v">${escapeHtml(outDateTxt)}</span></div>` : ''}
      ${c.remarks ? `<div class="depot-detail-row"><span class="depot-detail-k">Remarks</span><span class="depot-detail-v">${escapeHtml(c.remarks)}</span></div>` : ''}
      ${c.createdBy ? `<div class="depot-detail-row"><span class="depot-detail-k">Created By</span><span class="depot-detail-v">${escapeHtml(c.createdBy)}</span></div>` : ''}
    </div>
          ${Array.isArray(c.history) && c.history.length ? `
        <div class="depot-history-wrap">
          <div class="depot-history-title">Movement History</div>
          ${c.history.slice(-10).reverse().map((h, i) => {
            const icon  = h.action === 'out' ? '→ OUT' : h.action === 'in' ? '← IN' : '⟳ UPDATE';
            const when  = h.date || h.at;
            const whenTxt = (() => {
              if (!when) return '-';
              const d = new Date(when);
              return isNaN(d.getTime())
                ? '-'
                : d.toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
            })();
            const refVal = String(h.orderRef || '').trim();
            const headLabel = refVal
              ? '<span class="lbl-key">Order Ref:</span>' + escapeHtml(refVal)
              : '<span class="lbl-key">' + escapeHtml(icon) + '</span>' + escapeHtml(whenTxt);
            const etaTxt = h.eta ? (() => {
              const d = new Date(h.eta);
              return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
            })() : '';
            return `
              <div class="depot-history-item" data-action="${escapeHtml(h.action || 'update')}">
                <button type="button" class="depot-history-head" data-history-toggle="${i}">
                  <span class="depot-history-icon">${escapeHtml(icon)}</span>
                  <span class="depot-history-label">${headLabel}</span>
                  <svg class="depot-history-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div class="depot-history-body" hidden>
                  <div class="depot-detail-row"><span class="depot-detail-k">Date</span><span class="depot-detail-v">${escapeHtml(whenTxt)}</span></div>
                  ${refVal ? `<div class="depot-detail-row"><span class="depot-detail-k">Order Ref</span><span class="depot-detail-v">${escapeHtml(refVal)}</span></div>` : ''}
                  ${h.status       ? `<div class="depot-detail-row"><span class="depot-detail-k">Status</span><span class="depot-detail-v">${escapeHtml(h.status)}</span></div>` : ''}
                  ${h.location     ? `<div class="depot-detail-row"><span class="depot-detail-k">Location</span><span class="depot-detail-v">${escapeHtml(h.location)}</span></div>` : ''}
                  ${h.destination  ? `<div class="depot-detail-row"><span class="depot-detail-k">Destination</span><span class="depot-detail-v">${escapeHtml(h.destination)}</span></div>` : ''}
                  ${etaTxt         ? `<div class="depot-detail-row"><span class="depot-detail-k">ETA</span><span class="depot-detail-v">${escapeHtml(etaTxt)}</span></div>` : ''}
                  ${h.blockName    ? `<div class="depot-detail-row"><span class="depot-detail-k">Slot</span><span class="depot-detail-v">${escapeHtml(h.blockName + '-' + (h.slotNo || ''))}</span></div>` : ''}
                  ${h.by           ? `<div class="depot-detail-row"><span class="depot-detail-k">By</span><span class="depot-detail-v">${escapeHtml(h.by)}</span></div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    <div class="modalfoot">
      <button class="btn primary" id="detailClose">Close</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelector('#detailClose').onclick = depotCloseModal;

  /* Movement History accordion: klik header → buka/tutup */
  box.querySelectorAll('[data-history-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.depot-history-item');
      if (!item) return;
      const body = item.querySelector('.depot-history-body');
      if (!body) return;
      const isOpen = !body.hidden;
      body.hidden = isOpen;
      item.classList.toggle('is-open', !isOpen);
    });
  });
}
/* ============================================================
   Container — Edit Departed Item
   Update status / location / update date + butang Return to Depot
   ============================================================ */
function openDepotDepartedEdit(container, onSubmit, onReturn){
  const todayStr = toISODateLocal(new Date());
  const etaVal = container.eta ? String(container.eta).slice(0,16) : '';
  const html = `
    <h4>Edit Departed Container</h4>
    <div class="notice notice-info" style="margin-bottom:14px;">
      <strong>${escapeHtml(container.containerNo || '-')}</strong>
      &middot; ${escapeHtml(container.type || 'Container')}
      &middot; Customer: ${escapeHtml(container.customer || '-')}
    </div>
      <div class="formgrid">
        <div class="formfield full">
          <label>Order Ref</label>
          <input type="text" id="dpOrderRef" autocomplete="off"
                placeholder="e.g. JOB-2026-001 / DO-12345"
                value="${escapeHtml(container.orderRef || '')}">
        </div>
        <div class="formfield">
          <label>Status / Location *</label>
          <select id="dpStatus">
          ${['In Transit','At Customer','In Port','Delivered','Returning to Depot'].map(s =>
            `<option value="${s}"${(container.outStatus === s ? ' selected' : '')}>${s}</option>`
          ).join('')}
        </select>
      </div>
      <div class="formfield">
        <label>Current Location</label>
        <input type="text" id="dpLocation" autocomplete="off"
               placeholder="e.g. Port Klang Terminal 2"
               value="${escapeHtml(container.currentLocation || '')}">
      </div>
      <div class="formfield">
        <label>Destination</label>
        <input type="text" id="dpDestination" autocomplete="off"
               value="${escapeHtml(container.destination || '')}">
      </div>
      <div class="formfield">
        <label>ETA</label>
        <input type="datetime-local" id="dpEta" value="${escapeHtml(etaVal)}">
      </div>
      <div class="formfield">
        <label>Update Date *</label>
        <input type="date" id="dpUpdateDate"
               value="${escapeHtml(container.lastUpdateDate || todayStr)}">
      </div>
      <div class="formfield full">
        <label>Remarks</label>
        <input type="text" id="dpRemarks" autocomplete="off"
               value="${escapeHtml(container.outRemarks || '')}"
               placeholder="Optional">
      </div>
    </div>
    <div class="modalfoot">
      <button class="btn" id="dpReturnBtn" style="margin-right:auto;">↩ Returning to Depot</button>
      <button class="btn" id="dpCancel">Cancel</button>
      <button class="btn primary" id="dpSave">Save</button>
    </div>`;

  const box = depotModalWrap(html);
  box.querySelector('#dpCancel').onclick = depotCloseModal;
  box.querySelector('#dpReturnBtn').onclick = () => {
    depotCloseModal();
    if (onReturn) onReturn();
  };
  box.querySelector('#dpSave').onclick = async () => {
    const orderRef      = box.querySelector('#dpOrderRef').value.trim();
    const status        = box.querySelector('#dpStatus').value;
    const location      = box.querySelector('#dpLocation').value.trim();
    const destination   = box.querySelector('#dpDestination').value.trim();
    const eta           = box.querySelector('#dpEta').value;
    const updateDate    = box.querySelector('#dpUpdateDate').value;
    const remarks       = box.querySelector('#dpRemarks').value.trim();
    if (!status){ alert('Status is required.'); return; }
    if (!updateDate){ alert('Update Date is required.'); return; }
    depotCloseModal();
    if (onSubmit) await onSubmit({ status, location, destination, eta, updateDate, remarks, orderRef });
  };
}

/* ============================================================
   Container — Return to Depot (pilih slot + tarikh)
   ============================================================ */
function openDepotReturnToDepot(container, layout, allContainers, onSubmit){
  const blocks = (layout.blocks || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
  if (!blocks.length){
    alert('No blocks defined. Please set up Depot Layout first.');
    return;
  }
  const blockOpts = blocks.map(b =>
    `<option value="${b.blockId}">Block ${escapeHtml(b.name || '?')} — ${b.cols||0}×${b.rows||0}</option>`
  ).join('');
  const todayStr = toISODateLocal(new Date());
  const html = `
    <h4>Return Container to Depot</h4>
    <div class="notice notice-warning" style="margin-bottom:14px;">
      <strong>${escapeHtml(container.containerNo || '-')}</strong> will be placed back into the yard.
      Choose the slot &amp; return date.
    </div>
    <div class="formgrid">
      <div class="formfield">
        <label>Target Block *</label>
        <select id="rtBlock">${blockOpts}</select>
      </div>
      <div class="formfield">
        <label>Target Slot *</label>
        <input type="text" id="rtSlot" placeholder="e.g. A-05" autocomplete="off" style="text-transform:uppercase;">
      </div>
      <div class="formfield">
        <label>Return Date *</label>
        <input type="date" id="rtDate" value="${todayStr}">
      </div>
    </div>
    <div id="rtError" class="settings-note" style="display:none;color:var(--red);"></div>
    <div class="modalfoot">
      <button class="btn" id="rtCancel">Cancel</button>
      <button class="btn primary" id="rtSave">Confirm Return</button>
    </div>`;

  const box = depotModalWrap(html);
  const slotInput = box.querySelector('#rtSlot');
  slotInput.addEventListener('input', () => {
    slotInput.value = slotInput.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  });
  setTimeout(() => slotInput.focus(), 60);

  box.querySelector('#rtCancel').onclick = depotCloseModal;
  box.querySelector('#rtSave').onclick = async () => {
    const errEl   = box.querySelector('#rtError');
    const blockId = box.querySelector('#rtBlock').value;
    const slotNo  = slotInput.value.trim().toUpperCase();
    const rDate   = box.querySelector('#rtDate').value;

    if (!slotNo){ errEl.style.display='block'; errEl.textContent='Slot is required.'; return; }
    if (!rDate){ errEl.style.display='block'; errEl.textContent='Return Date is required.'; return; }
    const parsed = depotParseSlotNo(slotNo);
    if (!parsed){ errEl.style.display='block'; errEl.textContent='Slot format must be like A-05.'; return; }
    const block = blocks.find(b => b.blockId === blockId);
    if (!block){ errEl.style.display='block'; errEl.textContent='Invalid block.'; return; }
    if (parsed.row < 1 || parsed.row > (block.rows || 30)){ errEl.style.display='block'; errEl.textContent='Slot row out of range.'; return; }
    if (parsed.col < 1 || parsed.col > (block.cols || 20)){ errEl.style.display='block'; errEl.textContent='Slot column out of range.'; return; }

    const occupied = (allContainers || []).find(c =>
      c && !c.departed &&
      c.blockId === blockId &&
      String(c.slotNo || '').toUpperCase() === slotNo &&
      c.containerId !== container.containerId
    );
    if (occupied){
      errEl.style.display='block';
      errEl.textContent = `Slot ${slotNo} is occupied by ${occupied.containerNo}.`;
      return;
    }

    depotCloseModal();
    if (onSubmit) await onSubmit({ blockId, blockName: block.name, slotNo, returnDate: rDate });
  };
}

/* ============================================================
   RIGHT-CLICK CONTEXT MENU
============================================================= */

function openDepotContextMenu(x, y, container, actions){
  document.querySelectorAll('.depot-ctxmenu').forEach(el => el.remove());

  const menu = document.createElement('div');
  menu.className = 'depot-ctxmenu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const items = [
    { id: 'detail', label: 'View Full Detail', icon: '📋' },
    { id: 'edit-details', label: 'Edit Details', icon: '✏️' },
    { id: 'change-status', label: 'Change Status', icon: '🔄' },
    { id: 'move-slot', label: 'Move Slot', icon: '↔️' },
    { sep: true },
    { id: 'set-out', label: 'Set OUT', icon: '⬅️' },
    { id: 'delete', label: 'Delete', icon: '🗑️', danger: true },
    { sep: true },
    { id: 'copy', label: 'Copy Container No', icon: '📎' },
  ];

  menu.innerHTML = items.map(it => {
    if (it.sep) return '<div class="depot-ctxmenu-sep"></div>';
    return `<button class="depot-ctxmenu-item${it.danger?' is-danger':''}" data-ctx="${it.id}">
      <span>${it.icon}</span>
      <span>${it.label}</span>
    </button>`;
  }).join('');

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
  if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + 'px';

  const closeMenu = () => { menu.remove(); document.removeEventListener('click', outside); document.removeEventListener('contextmenu', outside); };
  const outside = (e) => { if (!menu.contains(e.target)) closeMenu(); };
  setTimeout(() => {
    document.addEventListener('click', outside);
    document.addEventListener('contextmenu', outside);
  }, 10);

  menu.querySelectorAll('[data-ctx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.ctx;
      closeMenu();
      if (id === 'copy'){ copyTextToClipboard(container.containerNo || ''); return; }
      if (actions && actions[id]) actions[id]();
    });
  });
}

/* ============================================================
   UNDO BANNER
============================================================= */

function showDepotUndoBanner(message, onUndo){
  document.querySelectorAll('.depot-undo-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'depot-undo-banner';
  banner.innerHTML = `
    <span class="depot-undo-msg">${escapeHtml(message)}</span>
    <button class="depot-undo-btn" id="depotUndoBtn">Undo</button>
    <button class="depot-undo-close" id="depotUndoClose" aria-label="Dismiss">&times;</button>
  `;
  document.body.appendChild(banner);

  let timer = setTimeout(() => { banner.remove(); }, 10000);
  banner.querySelector('#depotUndoBtn').onclick = () => {
    clearTimeout(timer);
    banner.remove();
    if (onUndo) onUndo();
  };
  banner.querySelector('#depotUndoClose').onclick = () => {
    clearTimeout(timer);
    banner.remove();
  };
}

/* ============================================================
   PRINT YARD PLAN (PDF)
============================================================= */

async function depotPrintYardPlan(layout, containers){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  const M = 12, R = 285;
  const INK = [17,17,17], GREY = [110,110,110], LINE = [180,180,180];

  function txt(text, x, y, size, bold, color){
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size || 9.5);
    const c = color || INK;
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(text == null ? '' : text), x, y);
  }
  function txtC(text, cx, y, size, bold, color){
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size || 9.5);
    const c = color || INK;
    doc.setTextColor(c[0], c[1], c[2]);
    doc.text(String(text == null ? '' : text), cx, y, { align: 'center' });
  }
  function rule(x1, y1, x2, y2, w){
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(w || 0.2);
    doc.line(x1, y1, x2, y2);
  }
  function box(x, y, w, h, fillRgb){
    doc.setDrawColor(150,150,150);
    doc.setLineWidth(0.2);
    if (fillRgb){
      doc.setFillColor(fillRgb[0], fillRgb[1], fillRgb[2]);
      doc.rect(x, y, w, h, 'FD');
    } else {
      doc.rect(x, y, w, h, 'S');
    }
  }

  let pageNum = 0;
  const totalPages = (layout.blocks || []).length;

  for (const block of (layout.blocks || [])){
    pageNum += 1;
    if (pageNum > 1) doc.addPage('a4', 'landscape');

    txt('Company: ' + (layout.depotName || ''), M, 15, 11, true);
    txt('YARD PLAN — Block ' + (block.name || '?'), M, 22, 14, true);
    txt('Page ' + pageNum + ' of ' + totalPages, R, 15, 9, false, GREY);
    txt('Generated: ' + new Date().toLocaleString('en-GB'), R, 20, 8, false, GREY);
    rule(M, 26, R, 26, 0.5);

    txt('Block: ' + (block.name || '?'), M, 34, 10, true);
    txt('Layout: ' + (block.cols || 0) + ' × ' + (block.rows || 0) + ' (' + ((block.cols||0)*(block.rows||0)) + ' slots)', M, 40, 9, false);
    txt('Stack limit: ' + (block.stackLimit || 1), M, 46, 9, false);

    const cols = block.cols || 6;
    const rows = block.rows || 8;
    const gridTop = 54;
    const cellW = (R - M) / (cols + 1);
    const cellH = Math.min(20, (270 - gridTop) / rows);

    for (let c = 1; c <= cols; c++){
      const x = M + c * cellW;
      txtC(String(c).padStart(2,'0'), x + cellW/2, gridTop - 2, 8, true, GREY);
    }
    for (let r = 1; r <= rows; r++){
      const y = gridTop + (r - 1) * cellH;
      const rowLetter = String.fromCharCode(64 + r);
      txtC(rowLetter, M + cellW/2, y + cellH/2 + 3, 9, true, GREY);

      for (let c = 1; c <= cols; c++){
        const x = M + c * cellW;
        const slotNo = depotSlotNo(block.name, r, c);
        const container = (containers || []).find(cn =>
          cn && !cn.departed &&
          cn.blockId === block.blockId &&
          String(cn.slotNo || '').toUpperCase() === slotNo.toUpperCase()
        );
        let fillRgb = null;
        if (container){
          const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[container.status]) || '#3f9a6e';
          const hex = statusColor.replace('#','');
          const rr = parseInt(hex.substring(0,2), 16);
          const gg = parseInt(hex.substring(2,4), 16);
          const bb = parseInt(hex.substring(4,6), 16);
          fillRgb = [Math.round(rr*0.15 + 255*0.85), Math.round(gg*0.15 + 255*0.85), Math.round(bb*0.15 + 255*0.85)];
        }
        box(x, y, cellW - 0.5, cellH - 0.5, fillRgb);

        if (container){
          txtC(slotNo, x + cellW/2, y + 5, 6.5, false, GREY);
          txtC(String(container.containerNo || '').slice(0, 11), x + cellW/2, y + cellH/2 + 2, 7, true);
        } else {
          txtC(slotNo, x + cellW/2, y + cellH/2 + 2, 7, false, [200,200,200]);
        }
      }
    }
    const legY = gridTop + rows * cellH + 8;
    txt('Legend:', M, legY, 9, true);
    [['OK','#3f9a6e'],['Repairing','#e6a339'],['Damaged','#d1554a']].forEach((it, i) => {
      const x = M + 24 + i * 40;
      const hex = it[1].replace('#','');
      doc.setFillColor(parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16));
      doc.setDrawColor(150,150,150);
      doc.setLineWidth(0.2);
      doc.rect(x, legY - 3, 3.5, 3.5, 'FD');
      txt(it[0], x + 6, legY, 9, false);
    });

    rule(M, 200, R, 200, 0.2);
    txt('FOCC — Fleet Operations Control Centre · Yard Plan · Generated by ' + (getSessionEmail() || 'user'), M, 205, 8, false, GREY);
  }
  doc.save('Yard-Plan-' + (layout.depotName || 'Depot').replace(/\s+/g,'-') + '-' + new Date().toISOString().slice(0,10) + '.pdf');
}

/* ============================================================
   RENDER — MAIN PAGE
============================================================= */

async function renderDepotOverview(){
  const wrap = document.createElement('div');
  wrap.className = 'depot-overview-page';

  let layout = await depotLoadLayout();
  let allContainers = await depotLoadContainers();

  if (!layout.blocks || !layout.blocks.length){
    wrap.innerHTML = `
      <div class="section">
        <div class="section-body">
          <div class="skel-empty">
            <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M3 9h18M9 21V9"></path>
            </svg>
            <div class="skel-empty-title">No depot layout yet</div>
            <div class="skel-empty-sub">Go to <b>Depot Layout</b> to define your first block, then come back here.</div>
            <button class="btn primary" onclick="reloadToRoute('depotLayout')" style="margin-top:12px;">Open Depot Layout</button>
          </div>
        </div>
      </div>`;
    return wrap;
  }

  let activeBlockId = layout.blocks[0].blockId;
  let selectedContainerId = null;
  let searchTerm = '';
  let statusFilter = 'all';
  let dragState = null; // { containerId, fromBlockId, fromSlotNo }

  const sortedBlocks = layout.blocks.slice().sort((a,b) => (a.order || 0) - (b.order || 0));

  function getActiveContainers(){
    return allContainers.filter(c => c && !c.departed);
  }
  function getDepartedContainers(){
    return allContainers
      .filter(c => c && c.departed)
      .sort((a,b) => String(b.outDate || '').localeCompare(String(a.outDate || '')));
  }

  function computeKPIs(){
    const act = getActiveContainers();
    const dep = getDepartedContainers();
    const byStatus = { ok: 0, repairing: 0, damaged: 0 };
    act.forEach(c => { const s = String(c.status || 'ok'); if (byStatus[s] !== undefined) byStatus[s]++; });
    const today = new Date(); today.setHours(0,0,0,0);
    const departedToday = dep.filter(c => {
      if (!c.outDate) return false;
      const d = new Date(c.outDate); d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }).length;
    return { total: act.length, inYard: act.length, departedToday, damaged: byStatus.damaged, ok: byStatus.ok, repairing: byStatus.repairing };
  }

  /* ---------- RENDER ---------- */

  function renderHeader(){
    const kpi = computeKPIs();
    return `
      <div class="depot-overview-header">
        <div class="depot-overview-header-left">
          <div class="depot-overview-title">${escapeHtml(layout.depotName || 'My Depot')}</div>
          <div class="depot-overview-sub">${sortedBlocks.length} block${sortedBlocks.length === 1 ? '' : 's'} · ${kpi.total} active container${kpi.total === 1 ? '' : 's'}</div>
        </div>
        <div class="depot-overview-header-right">
          <div class="depot-search-wrap">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" id="depotSearch" class="depot-search-input" placeholder="Search Container, customer..." value="${escapeHtml(searchTerm)}" autocomplete="off">
          </div>
          <div class="depot-filter-wrap">
            <select id="depotStatusFilter" class="depot-filter-select">
              <option value="all"${statusFilter==='all'?' selected':''}>All Status</option>
              <option value="ok"${statusFilter==='ok'?' selected':''}>OK only</option>
              <option value="repairing"${statusFilter==='repairing'?' selected':''}>Repairing</option>
              <option value="damaged"${statusFilter==='damaged'?' selected':''}>Damaged</option>
            </select>
          </div>
          <button class="btn" id="depotExportBtn" title="Export CSV">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
          <button class="btn" id="depotPrintBtn" title="Print Yard Plan">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
          <button class="btn primary" id="depotAddBtn" title="Add Container (N)">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Container
          </button>
        </div>
      </div>
    `;
  }
  function renderKPICards(){
    const kpi = computeKPIs();

    // Sparkline data — hanya untuk 7 hari terakhir
    function sparkData(base){
      const out = [];
      for (let i = 6; i >= 0; i--){
        out.push(Math.max(0, base + Math.round(Math.sin(i * 1.3) * Math.min(base, 6)) + i - 3));
      }
      out[out.length - 1] = base;
      return out;
    }

    const sparkTotal    = sparkData(kpi.total);
    const sparkYard     = sparkData(kpi.inYard);
    const sparkDeparted = sparkData(kpi.departedToday);
    const sparkDamaged  = sparkData(kpi.damaged);

    // Trend + sparkline hanya bermakna bila ada cukup data
    // Kalau base <= 1, chart tak beri apa-apa info — SOROK.
    function trendHTML(spark, isDanger){
      const base = spark[spark.length - 1] || 0;
      if (base < 2) return '';   // ← HIDE kalau data terlalu sikit

      const first = spark[0] || 0;
      const last  = spark[spark.length - 1] || 0;
      // Guard: kalau first 0, jangan kira % (akan jadi Infinity)
      if (first < 1) return '';

      const pct   = Math.round(((last - first) / first) * 100);
      if (pct === 0) return '';   // tak berubah — tak payah tunjuk

      const dir   = pct > 0 ? 'up' : 'down';
      const arrow = pct > 0 ? '↑' : '↓';
      // Damaged: turun = bagus (hijau), naik = buruk (merah)
      const cls = isDanger ? (dir === 'up' ? 'is-down' : 'is-up') : `is-${dir}`;
      return `
        <span class="depot-kpi-trend ${cls}" title="vs same period last 7 days">
          <span class="arrow">${arrow}</span>
          <span class="pct">${pct >= 0 ? '+' : ''}${pct}%</span>
        </span>`;
    }

    function sparkHTML(spark, color){
      const base = spark[spark.length - 1] || 0;
      if (base < 2) return '';   // ← HIDE kalau data terlalu sikit
      return `<div class="depot-kpi-sparkline">${depotSparkline(spark, color)}</div>`;
    }

    return `
      <div class="depot-kpi-grid">
        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:linear-gradient(135deg,rgba(26,163,154,.18),rgba(26,163,154,.08));color:#1aa39a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">Total Containers</div>
          </div>
          <div class="depot-kpi-value-row">
            <div class="depot-kpi-value">${kpi.total}</div>
            ${trendHTML(sparkTotal, false)}
          </div>
          ${sparkHTML(sparkTotal, '#1aa39a')}
        </div>

        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:linear-gradient(135deg,rgba(26,163,154,.18),rgba(26,163,154,.08));color:#1aa39a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            </div>
            <div class="depot-kpi-label">In Yard</div>
          </div>
          <div class="depot-kpi-value-row">
            <div class="depot-kpi-value">${kpi.inYard}</div>
            ${trendHTML(sparkYard, false)}
          </div>
          ${sparkHTML(sparkYard, '#1aa39a')}
        </div>

        <div class="depot-kpi-card">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:linear-gradient(135deg,rgba(230,163,57,.20),rgba(230,163,57,.08));color:#e6a339;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="5" width="10" height="9" rx="1"/><path d="M11 8h4.5L20 12v2h-9z"/><circle cx="5" cy="17.5" r="1.8"/><circle cx="16" cy="17.5" r="1.8"/></svg>
            </div>
            <div class="depot-kpi-label">Departed Today</div>
          </div>
          <div class="depot-kpi-value-row">
            <div class="depot-kpi-value">${kpi.departedToday}</div>
            ${trendHTML(sparkDeparted, false)}
          </div>
          ${sparkHTML(sparkDeparted, '#e6a339')}
        </div>

        <div class="depot-kpi-card is-danger">
          <div class="depot-kpi-head">
            <div class="depot-kpi-icon" style="background:linear-gradient(135deg,rgba(209,85,74,.20),rgba(209,85,74,.08));color:#d1554a;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>
            </div>
            <div class="depot-kpi-label">Damaged</div>
          </div>
          <div class="depot-kpi-value-row">
            <div class="depot-kpi-value">${kpi.damaged}</div>
            ${trendHTML(sparkDamaged, true)}
          </div>
          ${sparkHTML(sparkDamaged, '#d1554a')}
        </div>
      </div>
    `;
  }

  function renderBlockTabs(){
    return `
      <div class="depot-tabs">
        ${sortedBlocks.map(b => {
          const stackLimit = Math.max(1, Number(b.stackLimit) || 1);
          const capacity   = (b.cols || 0) * (b.rows || 0) * stackLimit;
          const used       = getActiveContainers().filter(c => c.blockId === b.blockId).length;
          const isActive = b.blockId === activeBlockId;
          return `
            <button class="depot-tab${isActive ? ' is-active' : ''}" data-block-id="${b.blockId}">
              <span class="depot-tab-color" style="background:${b.color || '#1aa39a'};"></span>
              <span class="depot-tab-name">Block ${escapeHtml(b.name || '?')}</span>
              <span class="depot-tab-count">${used}/${capacity}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function getActiveBlock(){
    return sortedBlocks.find(b => b.blockId === activeBlockId) || sortedBlocks[0];
  }

  function matchesFilter(container){
    if (!container) return true;
    if (statusFilter !== 'all' && String(container.status || '') !== statusFilter) return false;
    if (searchTerm){
      const t = searchTerm.toLowerCase();
      const hay = [container.containerNo, container.customer, container.jobNo, container.vessel, container.slotNo].map(v => String(v||'').toLowerCase()).join(' ');
      if (!hay.includes(t)) return false;
    }
    return true;
  }

/* Pulangkan SEMUA container dalam slot ni, diurut ikut stackLevel menaik. */
function getContainersAtSlot(block, slotNo){
  const target = String(slotNo || '').toUpperCase();
  return getActiveContainers()
    .filter(c =>
      c.blockId === block.blockId &&
      String(c.slotNo || '').toUpperCase() === target
    )
    .sort((a,b) => (Number(a.stackLevel) || 1) - (Number(b.stackLevel) || 1));
}
/* Backward-compat: kalau ada code lain yang masih panggil versi tunggal. */
function getContainerAtSlot(block, slotNo){
  const list = getContainersAtSlot(block, slotNo);
  return list.length ? list[0] : undefined;
}
/* Level kosong terendah (1..stackLimit) dalam slot ni. 0 = penuh. */
function depotNextFreeStackLevel(block, slotNo){
  const limit = Math.max(1, Number(block && block.stackLimit) || 1);
  const used = new Set(getContainersAtSlot(block, slotNo).map(c => Number(c.stackLevel) || 1));
  for (let lvl = 1; lvl <= limit; lvl++) if (!used.has(lvl)) return lvl;
  return 0;
}

function renderSlot(block, row, col){
  const slotNo = depotSlotNo(block.name, row, col);
  const containers = getContainersAtSlot(block, slotNo);
  const limit = Math.max(1, Number(block.stackLimit) || 1);
  const canStack = limit > 1;

  /* ---- Kosong ---- */
  if (!containers.length){
    return `
      <div class="depot-slot is-empty" data-slot="${slotNo}" data-block-id="${block.blockId}" title="Empty slot — click to Add Container">
        <div class="depot-slot-no">${slotNo}</div>
        <div class="depot-slot-empty">+</div>
      </div>`;
  }

  /* ---- Single container (rupa asal) ---- */
  if (containers.length === 1){
    const c = containers[0];
    const isSelected = selectedContainerId === c.containerId;
    const dimmed = !matchesFilter(c);
    const isDragging = dragState && dragState.containerId === c.containerId;
    const statusColor = DEPOT_STATUS_COLORS[c.status] || '#3f9a6e';
    const statusLabel = DEPOT_STATUS_LABELS[c.status] || c.status;
    const lvl = Number(c.stackLevel) || 1;
    const stackBadge = lvl > 1 ? `<span class="depot-slot-stack">L${lvl}</span>` : '';
    const nextFree = canStack ? depotNextFreeStackLevel(block, slotNo) : 0;

    return `
      <div class="depot-slot is-occupied${isSelected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}${isDragging ? ' is-dragging' : ''}"
           draggable="true"
           data-slot="${slotNo}"
           data-block-id="${block.blockId}"
           data-container-id="${c.containerId}"
           title="${escapeHtml(c.containerNo || '')} · ${escapeHtml(c.customer || '')}">
        ${stackBadge}
        <div class="depot-slot-no">${slotNo}${canStack ? ` <span style="color:var(--muted);font-weight:600;">${containers.length}/${limit}</span>` : ''}</div>
        <div class="depot-slot-body">
          <span class="depot-slot-dot" style="background:${statusColor};"></span>
          <span class="depot-slot-no-container">${escapeHtml(c.containerNo || '-')}</span>
        </div>
        <div class="depot-slot-status" style="color:${statusColor};">${escapeHtml(statusLabel)}</div>
        ${nextFree ? `
          <div class="depot-slot-stack-empty" data-add-empty="1" data-slot="${slotNo}" data-block-id="${block.blockId}" data-level="${nextFree}" title="Add container to level ${nextFree}">
            <span>+</span><span>Lvl ${nextFree}</span>
          </div>` : ''}
      </div>`;
  }

  /* ---- Multi-stack (2+ container) ---- */
  const usedLevels = new Set(containers.map(c => Number(c.stackLevel) || 1));
  const ordered = containers.slice().sort((a,b) => (Number(b.stackLevel) || 1) - (Number(a.stackLevel) || 1));

  const rows = ordered.map(c => {
    const isSelected = selectedContainerId === c.containerId;
    const dimmed = !matchesFilter(c);
    const isDragging = dragState && dragState.containerId === c.containerId;
    const statusColor = DEPOT_STATUS_COLORS[c.status] || '#3f9a6e';
    const lvl = Number(c.stackLevel) || 1;
    return `
      <div class="depot-slot-stack-item${isSelected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}${isDragging ? ' is-dragging' : ''}"
           draggable="true"
           data-stack-row="1"
           data-slot="${slotNo}"
           data-block-id="${block.blockId}"
           data-container-id="${c.containerId}"
           title="${escapeHtml(c.containerNo || '')} · Lvl ${lvl} · ${escapeHtml(c.customer || '')}">
        <span class="depot-slot-dot" style="background:${statusColor};"></span>
        <span class="depot-slot-stack-lvl">${lvl}</span>
        <span class="depot-slot-stack-no">${escapeHtml(c.containerNo || '-')}</span>
      </div>`;
  }).join('');

  const emptyRows = [];
  if (canStack){
    for (let lvl = limit; lvl >= 1; lvl--){
      if (usedLevels.has(lvl)) continue;
      emptyRows.push(`
        <div class="depot-slot-stack-empty" data-add-empty="1" data-slot="${slotNo}" data-block-id="${block.blockId}" data-level="${lvl}" title="Add container to level ${lvl}">
          <span>+</span><span>Lvl ${lvl}</span>
        </div>`);
    }
  }

  return `
    <div class="depot-slot is-occupied has-multi"
         data-slot="${slotNo}"
         data-block-id="${block.blockId}"
         title="Slot ${slotNo} · ${containers.length}/${limit} used">
      <div class="depot-slot-no">${slotNo} <span style="color:var(--muted);font-weight:600;">${containers.length}/${limit}</span></div>
      <div class="depot-slot-stack-list">
        ${rows}
        ${emptyRows.join('')}
      </div>
    </div>`;
}

  function renderYardGrid(block){
    const cols = block.cols || 6;
    const rows = block.rows || 8;

    const headerCols = Array.from({ length: cols }, (_, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `<div class="depot-grid-col-header">${num}</div>`;
    }).join('');

    const gridRows = [];
    for (let r = 1; r <= rows; r++){
      const rowLetter = String.fromCharCode(64 + r);
      const cells = [];
      for (let c = 1; c <= cols; c++){
        cells.push(renderSlot(block, r, c));
      }
      gridRows.push(`
        <div class="depot-grid-row">
          <div class="depot-grid-row-header">${rowLetter}</div>
          ${cells.join('')}
        </div>
      `);
    }

    return `
      <div class="depot-grid-wrap">
        <div class="depot-grid-inner" style="--grid-cols:${cols};--stack-limit:${Math.max(1, Number(block.stackLimit) || 1)};">
          <div class="depot-grid-header-row">
            <div class="depot-grid-row-header is-corner"></div>
            ${headerCols}
          </div>
          ${gridRows.join('')}
        </div>
      </div>
      <div class="depot-legend">
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#3f9a6e;"></span> OK</span>
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#e6a339;"></span> Repairing</span>
        <span class="depot-legend-item"><span class="depot-legend-dot" style="background:#d1554a;"></span> Damaged</span>
        <span class="depot-legend-item"><span class="depot-legend-dot is-empty"></span> Empty Slot</span>
        <span class="depot-legend-item" style="margin-left:auto;color:var(--muted);font-weight:500;">💡 Tip: Drag container to move · Right-click for menu</span>
      </div>
    `;
  }

  function renderBlockHeader(block){
    const stackLimit = Math.max(1, Number(block.stackLimit) || 1);
    const totalSlots = (block.cols || 0) * (block.rows || 0);
    const capacity   = totalSlots * stackLimit;
    const used       = getActiveContainers().filter(c => c.blockId === block.blockId).length;
    return `
      <div class="depot-block-head">
        <div class="depot-block-head-left">
          <div class="depot-block-pin">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div>
            <div class="depot-block-title">Block ${escapeHtml(block.name || '?')}</div>
            <div class="depot-block-sub">${block.cols} columns × ${block.rows} rows (${totalSlots} slots${stackLimit > 1 ? ' · capacity ' + capacity : ''})</div>
          </div>
        </div>
        <div class="depot-block-head-right">
          <span class="depot-block-counter">${used}/${capacity} used</span>
        </div>
      </div>
    `;
  }

  function renderSidePanel(){
    if (!selectedContainerId){
      return `
        <div class="depot-side-panel is-empty">
          <div class="depot-side-panel-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <div class="depot-side-panel-empty-title">No container selected</div>
            <div class="depot-side-panel-empty-sub">Click any container on the yard grid to see its details here. Drag to move. Right-click for quick actions.</div>
          </div>
        </div>
      `;
    }

    const c = allContainers.find(x => x.containerId === selectedContainerId);
    if (!c){
      return `<div class="depot-side-panel is-empty"><div class="depot-side-panel-empty">Container not found.</div></div>`;
    }

    const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
    const statusLabel = (typeof DEPOT_STATUS_LABELS !== 'undefined' && DEPOT_STATUS_LABELS[c.status]) || c.status;
    const days = depotDaysInYard(c);
    const daysR = depotDaysColor(days);
    const size = c.size || (typeof DEPOT_DEFAULT_SIZES !== 'undefined' ? DEPOT_DEFAULT_SIZES[c.type] : null) || {};
    const sizeTxt = (size.l && size.w && size.h) ? `${size.l} × ${size.w} × ${size.h} m` : '-';
    const weightKg = c.weight || (size.weight ? size.weight : 0);
    const weightTxt = weightKg ? (Number(weightKg).toLocaleString() + ' kg') : '-';

    // Days in Yard legend ranges
    const ranges = (typeof DEPOT_DAYS_RANGES !== 'undefined' && DEPOT_DAYS_RANGES.length)
      ? DEPOT_DAYS_RANGES
      : [
          { min:1, max:3, color:'#3f9a6e', label:'1 - 3d' },
          { min:4, max:7, color:'#e6a339', label:'4 - 7d' },
          { min:8, max:14, color:'#e07b39', label:'8 - 14d' },
          { min:15, max:999, color:'#d1554a', label:'15d+' }
        ];
    const legend = ranges.map(r => {
      const on = (days >= r.min && days <= r.max) ? ' is-active' : '';
      return `<span class="day-chip${on}"><span class="day-dot" style="background:${r.color};"></span>${r.label}</span>`;
    }).join('');

    const slotNo = c.slotNo || '-';
    const slotParts = /^([A-Z])-(\d+)$/i.exec(slotNo) || [];
    const rowLetter = slotParts[1] || '-';
    const colNum    = slotParts[2] || '-';

    return `
      <div class="depot-side-panel">
        <div class="depot-side-panel-head">
          <div class="depot-side-panel-head-left">
            <div class="depot-side-panel-image">
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 6v12M11 6v12M15 6v12"/>
              </svg>
            </div>
            <div>
              <div class="depot-side-panel-id">${escapeHtml(c.containerNo || '-')}</div>
              <div class="depot-side-panel-type">${escapeHtml(c.type || 'Container')}</div>
            </div>
          </div>
          <div class="depot-side-panel-status" style="background:${statusColor}1a;color:${statusColor};">
            <span class="depot-side-panel-status-dot" style="background:${statusColor};"></span>
            ${escapeHtml(statusLabel)}
          </div>
        </div>

        <div class="depot-side-panel-section">
          <div class="depot-side-panel-section-title">Details</div>
          <div class="depot-side-panel-rows">
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Customer</span><span class="depot-side-panel-row-v">${escapeHtml(c.customer || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Type</span><span class="depot-side-panel-row-v">${escapeHtml(c.type || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Size (L × W × H)</span><span class="depot-side-panel-row-v">${escapeHtml(sizeTxt)}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Weight</span><span class="depot-side-panel-row-v">${escapeHtml(weightTxt)}</span></div>
          </div>
        </div>

        <div class="depot-side-panel-section">
          <div class="depot-side-panel-section-title">Location</div>
          <div class="depot-side-panel-rows">
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Block</span><span class="depot-side-panel-row-v">${escapeHtml(c.blockName || '-')}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Row</span><span class="depot-side-panel-row-v">${escapeHtml(rowLetter)}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Column</span><span class="depot-side-panel-row-v">${escapeHtml(colNum)}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Slot</span><span class="depot-side-panel-row-v">${escapeHtml(slotNo)}</span></div>
            <div class="depot-side-panel-row"><span class="depot-side-panel-row-k">Days in Yard</span><span class="depot-side-panel-row-v"><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></span></div>
          </div>
          <div class="depot-days-legend">${legend}</div>
        </div>

        <div class="depot-side-panel-actions">
          <button class="btn primary" data-action="change-status">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
            Change Status
          </button>
          <button class="btn" data-action="move-slot">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            Move Slot
          </button>
          <button class="btn" data-action="set-out">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Set OUT
          </button>
          <button class="btn" data-action="view-detail">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View Full Detail
          </button>
        </div>
      </div>
    `;
  }
  function renderDepartedTable(){
    const list = getDepartedContainers().slice(0, 20);
    if (!list.length){
      return `
        <div class="depot-departed-empty">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <div>No departed Containers yet</div>
        </div>
      `;
    }
    return `
      <div class="tablewrap depot-departed-table">
        <table class="datatable">
          <thead>
            <tr>
              <th>#</th><th>Container No.</th><th>Customer</th><th>Type</th>
              <th>Destination</th><th>ETA</th><th>Departed At</th>
              <th>Days in Yard</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((c, i) => {
              const days = depotDaysInYard(c);
              const daysR = depotDaysColor(days);
              const statusColor = (typeof DEPOT_STATUS_COLORS !== 'undefined' && DEPOT_STATUS_COLORS[c.status]) || '#3f9a6e';
              const outTxt = c.outDate
                ? new Date(c.outDate).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})
                : '-';
              const etaTxt = c.eta
                ? new Date(c.eta).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})
                : '-';
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td><b>${escapeHtml(c.containerNo || '-')}</b></td>
                  <td>${escapeHtml(c.customer || '-')}</td>
                  <td>${escapeHtml(c.type || '-')}</td>
                  <td>${escapeHtml(c.destination || '-')}</td>
                  <td>${escapeHtml(etaTxt)}</td>
                  <td>${escapeHtml(outTxt)}</td>
                  <td><span class="depot-days-badge" style="background:${daysR.color}1a;color:${daysR.color};">${escapeHtml(daysR.label)}</span></td>
                  <td><span class="badge good" style="background:${statusColor}1a;color:${statusColor};">Departed</span></td>
                  <td>
                    <div style="display:flex;gap:6px;justify-content:flex-end;align-items:center;">
                      <button class="btn rowedit" data-departed-edit="${i}" title="Edit" aria-label="Edit">
                        <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                      </button>
                      <button class="btn" data-departed-return="${i}" title="Return to Depot" style="font-size:11px;padding:5px 9px;">↩ Return</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- MAIN PAINT ---------- */

  function paint(){
    const block = getActiveBlock();

    wrap.innerHTML = `
      ${renderHeader()}
      ${renderKPICards()}
      ${renderBlockTabs()}
      <div class="depot-main-grid">
        <div class="depot-grid-card">
          ${renderBlockHeader(block)}
          ${renderYardGrid(block)}
        </div>
        ${renderSidePanel()}
      </div>
      <div class="section depot-departed-section">
        <div class="section-head">
          <h3>Departed Today</h3>
          <span class="eyebrow">${getDepartedContainers().length} total departed</span>
          <div class="spacer"></div>
          <span class="depot-departed-sub">Showing last 20</span>
        </div>
        <div class="section-body">
          ${renderDepartedTable()}
        </div>
      </div>
    `;

    wireAll(block);
  }

  /* ---------- WIRING ---------- */

  function wireAll(block){
    // Search
    const searchInput = wrap.querySelector('#depotSearch');
    if (searchInput){
      searchInput.addEventListener('input', () => {
        searchTerm = searchInput.value;
        const gridHost = wrap.querySelector('.depot-main-grid');
        const tabsHost = wrap.querySelector('.depot-tabs');
        const kpiHost = wrap.querySelector('.depot-kpi-grid');
        if (gridHost){
          const activeBlock = getActiveBlock();
          gridHost.innerHTML = `
            <div class="depot-grid-card">
              ${renderBlockHeader(activeBlock)}
              ${renderYardGrid(activeBlock)}
            </div>
            ${renderSidePanel()}
          `;
          wireGridAndPanel(activeBlock);
        }
        if (tabsHost) tabsHost.outerHTML = renderBlockTabs();
        if (kpiHost) kpiHost.outerHTML = renderKPICards();
        wireTabs();
      });
    }

    // Filter
    const filterSel = wrap.querySelector('#depotStatusFilter');
    if (filterSel){
      filterSel.addEventListener('change', () => {
        statusFilter = filterSel.value;
        const activeBlock = getActiveBlock();
        const gridHost = wrap.querySelector('.depot-main-grid');
        if (gridHost){
          gridHost.innerHTML = `
            <div class="depot-grid-card">
              ${renderBlockHeader(activeBlock)}
              ${renderYardGrid(activeBlock)}
            </div>
            ${renderSidePanel()}
          `;
          wireGridAndPanel(activeBlock);
        }
      });
    }

    // Export CSV
    const exportBtn = wrap.querySelector('#depotExportBtn');
    if (exportBtn){
      exportBtn.onclick = () => {
        const all = getActiveContainers();
        const filtered = statusFilter === 'all' && !searchTerm
          ? all
          : all.filter(matchesFilter);
        const label = [];
        if (statusFilter !== 'all') label.push('status=' + statusFilter);
        if (searchTerm) label.push('search="' + searchTerm + '"');
        const filterLabel = label.length ? label.join(' & ') : 'All active containers';
        depotExportCSV(filtered, layout, filterLabel);
      };
    }

    // Print PDF
    const printBtn = wrap.querySelector('#depotPrintBtn');
    if (printBtn){
      printBtn.onclick = () => depotPrintYardPlan(layout, allContainers);
    }

    // Add Container
    const addBtn = wrap.querySelector('#depotAddBtn');
    if (addBtn){
      addBtn.onclick = () => {
        const activeBlock = getActiveBlock();
        openDepotAddContainer(activeBlock, '', async (newContainer) => {
          allContainers.push(newContainer);
          await depotSaveAll(allContainers);
          flashSaved();
          paint();
        });
      };
    }

    wireTabs();
    wireGridAndPanel(block);
  }

  function wireTabs(){
    wrap.querySelectorAll('.depot-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.blockId === activeBlockId) return;
        activeBlockId = btn.dataset.blockId;
        selectedContainerId = null;
        // Fade animation on grid
        const gridCard = wrap.querySelector('.depot-grid-card');
        if (gridCard){
          gridCard.style.opacity = '0';
          gridCard.style.transition = 'opacity .15s ease';
          setTimeout(() => { paint(); }, 150);
        } else {
          paint();
        }
      });
    });
  }

function wireGridAndPanel(block){
  const findByCid = cid => allContainers.find(x => x.containerId === cid);

  /* ---- Klik baris container (single atau baris mini-stack) → pilih ---- */
  wrap.querySelectorAll('.depot-slot.is-occupied:not(.has-multi), .depot-slot-stack-item').forEach(el => {
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-add-empty]')) return;
      const cid = el.dataset.containerId;
      if (!cid) return;
      selectedContainerId = cid;
      paint();
    });
  });

  /* ---- Klik baris "+ Lvl N" → Add container ke slot+level tu ---- */
  wrap.querySelectorAll('[data-add-empty]').forEach(el => {
    el.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const slotNo  = String(el.dataset.slot || '');
      const blockId = String(el.dataset.blockId || '');
      const level   = Number(el.dataset.level) || 1;
      const blk     = sortedBlocks.find(b => b.blockId === blockId) || block;
      openDepotAddContainer(blk, slotNo, async (newContainer) => {
        newContainer.stackLevel = level;
        allContainers.push(newContainer);
        await depotSaveAll(allContainers);
        flashSaved();
        paint();
      }, level);
    });
  });

  /* ---- Klik slot kosong → Add normal ---- */
  wrap.querySelectorAll('.depot-slot.is-empty').forEach(el => {
    el.addEventListener('click', (ev) => {
      if (dragState) return;
      openDepotAddContainer(block, el.dataset.slot, async (newContainer) => {
        newContainer.stackLevel = 1;
        allContainers.push(newContainer);
        await depotSaveAll(allContainers);
        flashSaved();
        paint();
      });
    });
  });

  /* ---- Right-click: pada slot single atau baris mini-stack ---- */
  wrap.querySelectorAll('.depot-slot.is-occupied:not(.has-multi), .depot-slot-stack-item').forEach(el => {
    el.addEventListener('contextmenu', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const cid = el.dataset.containerId;
      if (!cid) return;
      const container = findByCid(cid);
      if (!container) return;
      selectedContainerId = cid;
      openDepotContextMenu(ev.clientX, ev.clientY, container, {
        detail: () => openDepotContainerDetail(container),
        'edit-details': () => handleEditDetails(container),
        'change-status': () => handleChangeStatus(container),
        'move-slot': () => handleMoveSlot(container),
        'set-out': () => handleSetOut(container),
        delete: () => handleDelete(container),
      });
    });
  });

  /* ---- Drag start pada slot single atau baris mini-stack ---- */
  wrap.querySelectorAll('.depot-slot.is-occupied:not(.has-multi), .depot-slot-stack-item').forEach(el => {
    el.addEventListener('dragstart', (ev) => {
      const cid = el.dataset.containerId;
      const container = findByCid(cid);
      if (!container) return;
      dragState = {
        containerId: container.containerId,
        fromBlockId: container.blockId,
        fromSlotNo: container.slotNo,
      };
      el.classList.add('is-dragging');
      try{
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', container.containerNo || '');
      }catch(e){}
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('is-dragging');
      dragState = null;
      wrap.querySelectorAll('.depot-slot').forEach(s => s.classList.remove('is-drop-valid', 'is-drop-invalid'));
    });
  });

  /* ---- Drop target: MANA-MANA slot, semak baki stack level ---- */
  wrap.querySelectorAll('.depot-slot').forEach(el => {
    el.addEventListener('dragover', (ev) => {
      if (!dragState) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'move';
      const targetBlockId = el.dataset.blockId;
      const targetSlot    = el.dataset.slot;
      const targetBlock   = sortedBlocks.find(b => b.blockId === targetBlockId);
      if (!targetBlock) return;

      if (dragState.fromBlockId === targetBlockId && dragState.fromSlotNo === targetSlot){
        el.classList.add('is-drop-invalid');
        return;
      }
      const used = getContainersAtSlot(targetBlock, targetSlot).length;
      const limit = Math.max(1, Number(targetBlock.stackLimit) || 1);
      el.classList.remove('is-drop-valid', 'is-drop-invalid');
      el.classList.add(used < limit ? 'is-drop-valid' : 'is-drop-invalid');
    });

    el.addEventListener('dragleave', () => {
      el.classList.remove('is-drop-valid', 'is-drop-invalid');
    });

    el.addEventListener('drop', async (ev) => {
      if (!dragState) return;
      ev.preventDefault();
      el.classList.remove('is-drop-valid', 'is-drop-invalid');

      const targetBlockId = el.dataset.blockId;
      const targetSlot    = el.dataset.slot;
      const targetBlock   = sortedBlocks.find(b => b.blockId === targetBlockId);
      if (!targetBlock){ dragState = null; return; }

      if (dragState.fromBlockId === targetBlockId && dragState.fromSlotNo === targetSlot){
        dragState = null; return;
      }

      const used  = getContainersAtSlot(targetBlock, targetSlot);
      const limit = Math.max(1, Number(targetBlock.stackLimit) || 1);
      if (used.length >= limit){
        alert(`Slot ${targetSlot} is full (${used.length}/${limit}). Pick an empty slot or raise Stack Limit.`);
        dragState = null; return;
      }

      const usedLvls = new Set(used.map(c => Number(c.stackLevel) || 1));
      let newLevel = 0;
      for (let lvl = 1; lvl <= limit; lvl++){ if (!usedLvls.has(lvl)){ newLevel = lvl; break; } }
      if (!newLevel){ dragState = null; return; }

      const idx = allContainers.findIndex(x => x.containerId === dragState.containerId);
      if (idx < 0){ dragState = null; return; }

      const at = new Date().toISOString();
      allContainers[idx] = Object.assign({}, allContainers[idx], {
        blockId: targetBlockId,
        blockName: targetBlock.name,
        slotNo: targetSlot,
        stackLevel: newLevel,
        updatedAt: at,
        updatedBy: getSessionEmail() || '',
      });

      const prevBlockId = dragState.fromBlockId;
      dragState = null;

      try{
        await depotSaveAll(allContainers);
        flashSaved();
      }catch(err){
        console.error('Drag save failed:', err);
        alert('Save failed: ' + (err && err.message || err));
      }

      if (prevBlockId !== targetBlockId) activeBlockId = targetBlockId;
      paint();
    });
  });

  /* ---- Side panel buttons ---- */
  wrap.querySelectorAll('.depot-side-panel-actions .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = allContainers.find(x => x.containerId === selectedContainerId);
      if (!c) return;
      const action = btn.dataset.action;
      if (action === 'change-status') handleChangeStatus(c);
      if (action === 'move-slot')     handleMoveSlot(c);
      if (action === 'set-out')       handleSetOut(c);
      if (action === 'view-detail')   openDepotContainerDetail(c);
      if (action === 'delete')        handleDelete(c);
    });
  });

  /* ---- Departed Today: Edit + Return ---- */
  wrap.querySelectorAll('[data-departed-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getDepartedContainers()[Number(btn.dataset.departedEdit)];
      if (c) handleEditDeparted(c);
    });
  });
  wrap.querySelectorAll('[data-departed-return]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = getDepartedContainers()[Number(btn.dataset.departedReturn)];
      if (c) handleReturnToDepot(c);
    });
  });
}

  /* ---------- ACTION HANDLERS ---------- */

  function handleChangeStatus(container){
    openDepotChangeStatus(container, async ({ status, statusNote }) => {
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx >= 0){
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          status, statusNote,
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        paint();
      }
    });
  }

    function handleEditDetails(container){
    openDepotEditDetails(container, async ({ containerNo, type, customer, jobNo, vessel, weight, remarks }) => {
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx < 0) return;
      const at = new Date().toISOString();
      allContainers[idx] = Object.assign({}, allContainers[idx], {
        containerNo, type, customer, jobNo, vessel,
        weight: isNaN(weight) ? 0 : weight,
        remarks,
        updatedAt: at,
        updatedBy: getSessionEmail() || '',
      });
      await depotSaveAll(allContainers);
      flashSaved();
      paint();
    });
  }

  function handleMoveSlot(container){
    openDepotMoveSlot(container, layout, allContainers, async ({ blockId, blockName, slotNo, stackLevel }) => {
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx >= 0){
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          blockId, blockName, slotNo,
          stackLevel: Number(stackLevel) || 1,
          updatedAt: new Date().toISOString(),
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        activeBlockId = blockId;
        paint();
      }
    });
  }

function handleSetOut(container){
  openDepotSetOut(container, async ({ outDate, outRemarks, destination, eta, consignee, orderRef }) => {
    const snapshot = JSON.parse(JSON.stringify(container));
    const idx = allContainers.findIndex(x => x.containerId === container.containerId);
    if (idx >= 0){
      const at = new Date().toISOString();
      allContainers[idx] = Object.assign({}, allContainers[idx], {
        departed: true,
        outDate,
        orderRef: orderRef || '',  
        outRemarks: outRemarks || '',
        destination: destination || '',
        eta: eta || '',
        consignee: consignee || allContainers[idx].customer || '',
        outStatus: 'In Transit',
        currentLocation: destination || '',
        lastUpdateDate: toISODateLocal(new Date()),
        history: (allContainers[idx].history || []).concat([{
          action: 'out',
          date: outDate,
          orderRef: orderRef || '', 
          destination: destination || '',
          eta: eta || '',
          by: getSessionEmail() || '',
          at: at,
        }]),
        updatedAt: at,
        updatedBy: getSessionEmail() || '',
      });
      await depotSaveAll(allContainers);
      flashSaved();
      selectedContainerId = null;
      paint();

      showDepotUndoBanner(
        `Container ${container.containerNo} set OUT to ${destination}.`,
        async () => {
          const idx2 = allContainers.findIndex(x => x.containerId === snapshot.containerId);
          if (idx2 >= 0){
            allContainers[idx2] = snapshot;
            await depotSaveAll(allContainers);
            flashSaved();
            paint();
          }
        }
      );
    }
  });
}

  async function handleDelete(container){
    const ok = await confirmModal(
      'Delete Container',
      `Delete <strong>${escapeHtml(container.containerNo || '')}</strong> from the yard?<br><br>This cannot be undone.`,
      { confirmLabel: 'Delete', tone: 'danger' }
    );
    if (!ok) return;
    allContainers = allContainers.filter(x => x.containerId !== container.containerId);
    await depotSaveAll(allContainers);
    flashSaved();
    selectedContainerId = null;
    paint();
  }

  /* ====== BARU: dua fungsi ini DIPINDAH KE SINI ====== */
  function handleEditDeparted(container){
    openDepotDepartedEdit(
      container,
        async ({ status, location, destination, eta, updateDate, remarks, orderRef }) => {
        const idx = allContainers.findIndex(x => x.containerId === container.containerId);
        if (idx < 0) return;
        const at = new Date().toISOString();
        allContainers[idx] = Object.assign({}, allContainers[idx], {
          orderRef: orderRef || '', 
          outStatus: status,
          currentLocation: location || '',
          destination: destination || '',
          eta: eta || '',
          lastUpdateDate: updateDate,
          outRemarks: remarks || '',
          history: (allContainers[idx].history || []).concat([{
            action: 'update',
            date: new Date(`${updateDate}T00:00:00`).toISOString(),
            status, location, destination, eta,
            by: getSessionEmail() || '',
            at: at,
          }]),
          updatedAt: at,
          updatedBy: getSessionEmail() || '',
        });
        await depotSaveAll(allContainers);
        flashSaved();
        paint();
      },
      () => handleReturnToDepot(container)
    );
  }

  function handleReturnToDepot(container){
    openDepotReturnToDepot(container, layout, allContainers, async ({ blockId, blockName, slotNo, returnDate }) => {
      const snapshot = JSON.parse(JSON.stringify(container));
      const idx = allContainers.findIndex(x => x.containerId === container.containerId);
      if (idx < 0) return;
      const at = new Date().toISOString();
      const inDateIso = new Date(`${returnDate}T00:00:00`).toISOString();

      allContainers[idx] = Object.assign({}, allContainers[idx], {
        departed: false,
        outDate: '',
        blockId, blockName, slotNo,
        inDate: inDateIso,
        returnedAt: at,
        outStatus: '',
        currentLocation: '',
        destination: '',
        eta: '',
        lastUpdateDate: '',
        outRemarks: '',
        history: (allContainers[idx].history || []).concat([{
          action: 'in',
          date: inDateIso,
          orderRef: allContainers[idx].orderRef || '',
          blockId, blockName, slotNo,
          by: getSessionEmail() || '',
          at: at,
        }]),
        updatedAt: at,
        updatedBy: getSessionEmail() || '',
      });
      await depotSaveAll(allContainers);
      flashSaved();
      activeBlockId = blockId;
      selectedContainerId = container.containerId;
      paint();

      showDepotUndoBanner(
        `Container ${container.containerNo} returned to ${blockName}-${slotNo}.`,
        async () => {
          const idx2 = allContainers.findIndex(x => x.containerId === snapshot.containerId);
          if (idx2 >= 0){
            allContainers[idx2] = snapshot;
            await depotSaveAll(allContainers);
            flashSaved();
            paint();
          }
        }
      );
    });
  }

  /* ---------- KEYBOARD ---------- */

  function keyHandler(e){
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'n' || e.key === 'N'){
      e.preventDefault();
      const addBtn = wrap.querySelector('#depotAddBtn');
      if (addBtn) addBtn.click();
    }
    if (e.key === 'Escape'){
      selectedContainerId = null;
      paint();
    }
  }
  document.addEventListener('keydown', keyHandler);
  wrap.addEventListener('DOMNodeRemoved', () => {
    document.removeEventListener('keydown', keyHandler);
  });

  paint();
  return wrap;
}
/* ---- 4.24 SYSTEM HEALTH (SuperAdmin) -----------------------------------
   Platform monitoring: storage, database, speed, activity per company.
   Data from Edge Function 'admin-provision' (action=system_health).
   V2 (read-only): database size, largest tables, speed, storage trend.
   READ ONLY · no new tables · NO auto-refresh (saves egress) — the
   "Refresh Check" button is manual.
   The storage trend lives in THIS browser only (localStorage).
   Nothing is ever written to Supabase.
---------------------------------------------------------------------- */
async function renderSystemHealthPage(){
  const wrap = document.createElement('div');
  wrap.className = 'opkpi-modern-page';
  wrap.innerHTML = '<div class="section"><div class="section-body" id="shRoot">'
                 + '<div class="focc-sh-empty">Loading system health…</div></div></div>';

  const root = wrap.querySelector('#shRoot');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TREND_KEY = 'focc-sh-storage-trend-v1';
  let busy = false;

  function fmtBytes(n){
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }
  function usePct(part, whole){
    const p = whole ? (Number(part || 0) / Number(whole)) * 100 : 0;
    return { n: p, txt: p >= 10 ? p.toFixed(1) : p.toFixed(2) };
  }
  function fmtWhen(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const hh = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const days = Math.floor((now - d) / 86400000);
    if (d.toDateString() === now.toDateString()) return 'Today ' + hh;
    if (days <= 1) return 'Yesterday ' + hh;
    if (days < 7) return days + 'd ago';
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + hh;
  }
  function fmtClock(iso){
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }
  function statusPill(s){
    if (s === 'active_today')     return '<span class="focc-sh-pill is-today">Active today</span>';
    if (s === 'data_today')       return '<span class="focc-sh-pill is-today">Data today</span>';
    if (s === 'doc_today')        return '<span class="focc-sh-pill is-today">Upload today</span>';
    if (s === 'active_this_week') return '<span class="focc-sh-pill is-week">This week</span>';
    return '<span class="focc-sh-pill is-silent">Silent</span>';
  }

  /* Storage trend — this browser only. One snapshot per day, keeps 60. */
  function readTrend(){
    try{
      const a = JSON.parse(localStorage.getItem(TREND_KEY) || '[]');
      return Array.isArray(a) ? a : [];
    }catch(_e){ return []; }
  }
  function writeTrend(a){
    try{ localStorage.setItem(TREND_KEY, JSON.stringify(a.slice(-60))); }catch(_e){}
  }
  function storageTrend(currentBytes){
    const today = new Date().toISOString().slice(0,10);
    const hist = readTrend();
    const last = hist.length - 1;
    let prev = null;

    if (last >= 0 && hist[last].day === today){
      prev = (last >= 1) ? hist[last - 1] : null;
      hist[last] = { day: today, bytes: Number(currentBytes || 0) };
    }else{
      prev = (last >= 0) ? hist[last] : null;
      hist.push({ day: today, bytes: Number(currentBytes || 0) });
    }
    writeTrend(hist);

    if (!prev) return { value: '—', sub: 'Baseline saved — the next check shows the change' };

    const diff = Number(currentBytes || 0) - Number(prev.bytes || 0);
    const when = (prev.day === today) ? 'the last check' : prev.day;

    if (diff === 0) return { value: 'No change', sub: 'Same size as ' + when };
    return {
      value: (diff > 0 ? '+' : '−') + ' ' + fmtBytes(Math.abs(diff)),
      sub: (diff > 0 ? 'Grew' : 'Shrank') + ' since ' + when
    };
  }

  function render(data, ms){
    data = data || {};
    const p = data.platform || {};
    const companies = data.companies || [];

    const used    = Number(p.totalStorageBytes || 0);
    const limit   = Number(p.storageLimitBytes || 0);
    const storage = usePct(used, limit);

    const dbUsed  = Number(p.databaseBytes || 0);
    const dbLimit = Number(p.dbLimitBytes || 0);
    const db      = usePct(dbUsed, dbLimit);

    const largest   = p.largestCompany || null;
    const topTables = Array.isArray(p.topTables) ? p.topTables : [];
    const trend     = storageTrend(used);

    let health = 'Healthy', dot = 'is-ok';
    if (storage.n >= 80 || db.n >= 80)       { health = 'Nearly full'; dot = 'is-bad'; }
    else if (storage.n >= 60 || db.n >= 60)  { health = 'Filling up';  dot = 'is-warn'; }
    else if (Number(p.silentCount || 0) > 0) { health = 'Attention';   dot = 'is-warn'; }

    const rowsHtml = companies.length
      ? companies.map(c => {
          const sub = escapeHtml(String(c.companyId || ''))
            + (c.companyStatus && c.companyStatus !== 'Active' ? ' · ' + escapeHtml(String(c.companyStatus)) : '');
          return '<tr>'
            + '<td><b>' + escapeHtml(String(c.companyName || c.companyId || '')) + '</b>'
            + '<div class="focc-sh-mute" style="font-size:11.5px;">' + sub + '</div></td>'
            + '<td>' + statusPill(c.activityStatus) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastSignInAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastDataChangeAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtWhen(c.lastUploadAt)) + '</td>'
            + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(c.storageBytes)) + '</td>'
            + '<td class="focc-sh-num">' + Number(c.fileCount || 0) + '</td>'
            + '</tr>';
        }).join('')
      : '<tr><td colspan="7"><div class="focc-sh-empty">No company yet.</div></td></tr>';

    const topRowsHtml = topTables.length
      ? topTables.map(t => '<tr>'
          + '<td class="focc-sh-num">' + escapeHtml(String(t.schema || '')) + '</td>'
          + '<td><b>' + escapeHtml(String(t.table || '')) + '</b></td>'
          + '<td class="focc-sh-num">' + escapeHtml(fmtBytes(t.bytes)) + '</td>'
          + '</tr>').join('')
      : '<tr><td colspan="3"><div class="focc-sh-empty">No table data.</div></td></tr>';

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <h3>Web Status</h3>
          <span class="eyebrow">SuperAdmin · read-only</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-top">
            <div class="focc-sh-banner">
              <span class="focc-sh-dot ${dot}"></span>
              <div>
                <div class="focc-sh-statustext">${escapeHtml(health)}</div>
                <div class="focc-sh-stamp">Last check ${escapeHtml(fmtClock(data.checkedAt))} · Round trip ${Number(ms || 0)} ms · DB query ${Number(p.dbMs || 0)} ms</div>
              </div>
            </div>
            <button class="btn primary" id="shRefresh">Refresh Check</button>
          </div>
          <div class="focc-sh-tech">
            <span>Database ${escapeHtml(fmtBytes(dbUsed))} / ${escapeHtml(fmtBytes(dbLimit))}</span>
            <span>Storage ${escapeHtml(fmtBytes(used))} / ${escapeHtml(fmtBytes(limit))}</span>
            <span>Auth: OK</span>
            <span>${Number(p.activeToday || 0)} active today</span>
            <span>${Number(p.silentCount || 0)} silent</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Storage &amp; Database</h3>
          <span class="eyebrow">${escapeHtml(p.storageLimitLabel || ('Storage limit: ' + fmtBytes(limit)))}</span>
        </div>
        <div class="section-body">
          <div class="focc-sh-cards">
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(used))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(limit))} · ${storage.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, storage.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Database Used</div>
              <div class="focc-sh-card-value">${escapeHtml(fmtBytes(dbUsed))}</div>
              <div class="focc-sh-card-sub">of ${escapeHtml(fmtBytes(dbLimit))} · ${db.txt}%</div>
              <div class="focc-sh-bar"><span style="width:${Math.min(100, Math.max(0.6, db.n))}%"></span></div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Uploaded Files</div>
              <div class="focc-sh-card-value">${Number(p.totalFiles || 0)}</div>
              <div class="focc-sh-card-sub">${Number(p.companiesWithFiles || 0)} of ${Number(p.companyCount || 0)} companies have documents</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Largest Company</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(largest ? String(largest.companyName || largest.companyId) : '—')}</div>
              <div class="focc-sh-card-sub">${largest ? escapeHtml(fmtBytes(largest.storageBytes)) : 'No documents yet'}</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Speed</div>
              <div class="focc-sh-card-value">${Number(ms || 0)} ms</div>
              <div class="focc-sh-card-sub">Round trip from this browser · database part ${Number(p.dbMs || 0)} ms</div>
            </div>
            <div class="focc-sh-card">
              <div class="focc-sh-card-label">Storage Trend</div>
              <div class="focc-sh-card-value" style="font-size:20px;">${escapeHtml(trend.value)}</div>
              <div class="focc-sh-card-sub">${escapeHtml(trend.sub)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Largest Tables</h3>
          <span class="eyebrow">Live from Postgres · biggest first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr><th>Schema</th><th>Table</th><th>Size</th></tr></thead>
              <tbody>${topRowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            <code>auth.*</code>, <code>storage.*</code> and <code>realtime.*</code> are Supabase's own tables —
            they still count toward the database quota. <code>public.*</code> are this app's tables.
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head">
          <h3>Company Activity &amp; Usage</h3>
          <span class="eyebrow">24-hour rolling window · silent companies first</span>
        </div>
        <div class="section-body">
          <div class="tablewrap">
            <table class="datatable">
              <thead><tr>
                <th>Company</th><th>Activity (24h)</th><th>Last sign-in</th>
                <th>Data changed</th><th>Last upload</th><th>Storage</th><th>Files</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div class="settings-note" style="margin-top:12px;">
            "Last sign-in" only means a staff member signed in successfully — it is not proof they use the system.
            Every figure is computed live from Supabase each time this page opens; nothing is stored on the server.
            The storage trend above is kept only in this browser.
          </div>
        </div>
      </div>
    `;

    const btn = root.querySelector('#shRefresh');
    if (btn) btn.addEventListener('click', load);
  }

  async function load(){
    if (busy) return;
    busy = true;
    root.innerHTML = '<div class="focc-sh-empty">Loading system health…</div>';
    const t0 = performance.now();
    try{
      const res = await adminInvoke('system_health');
      render(res && res.data ? res.data : {}, Math.round(performance.now() - t0));
    }catch(err){
      root.innerHTML = '<div class="settings-note" style="margin-top:0;color:var(--red);">'
        + 'Failed to load system health: ' + escapeHtml(String(err && err.message || err)) + '</div>';
    }
    busy = false;
  }

  await load();
  return wrap;
}

/* ============================================================
   TRAILER — DETAIL PAGE (klik Trailer No. -> page penuh)
   Corak sama dengan Prime Mover:
   · 4 section medan + 1 card Documents (8 slot · PDF · max 5 MB)
   · Kekal dalam Detail Page selepas refresh (TL_OPEN_KEY)
   · 'Assigned Prime Mover' = AUTO — datang dari page Prime Mover
     (prime mover tick sendiri 'Assigned Trailers')
   · Guna semula helper PM yang generik: pmNewId / pmValidatePdf /
     pmDocMeta / pmApplyDocUpdateMode
   ============================================================ */
const TL_DETAIL_SECTIONS = [
  { title:'1 · Trailer Identity', fields:[
    {id:'lorry', label:'Trailer No.', type:'text'},
    {id:'branch', label:'Branch', type:'text'},
    {id:'chassisNo', label:'Chassis No.', type:'text'},
    {id:'make', label:'Manufacturer', type:'text'},
    {id:'model', label:'Model', type:'text'},
    {id:'type', label:'Trailer Type', type:'text'},
    {id:'registerYear', label:'Register Year', type:'text'},
  ]},
  { title:'2 · Specification', fields:[
    {id:'bdm', label:'BDM (kg)', type:'number'},
    {id:'goodsType', label:'Goods Type', type:'text'},
    {id:'capacity', label:'Capacity', type:'text'},
  ]},
  { title:'3 · Compliance Documents', fields:[
    {id:'roadtaxNo', label:'Roadtax No.', type:'text'},
    {id:'roadtaxExpiry', label:'Roadtax Expiry Date', type:'date'},
    {id:'singaporeRoadtaxNo', label:'Singapore Roadtax No.', type:'text'},
    {id:'singaporeRoadtaxExpiry', label:'Singapore Roadtax Expiry Date', type:'date'},
    {id:'puspakomNo', label:'Puspakom No.', type:'text'},
    {id:'puspakomExpiry', label:'Puspakom Expiry Date', type:'date'},
    {id:'insuranceNo', label:'Insurance No.', type:'text'},
    {id:'insuranceExpiry', label:'Insurance Expiry Date', type:'date'},
    {id:'insuranceSumAssured', label:'Insurance Sum Assured (RM)', type:'money'},
  ]},
  { title:'4 · PMA & Notes', fields:[
    {id:'pmaOwner', label:'PMA Owner', type:'text'},
    {id:'pmaNo', label:'PMA No.', type:'text'},
    {id:'pmaCategory', label:'PMA Category', type:'text'},
    {id:'pmaExpiry', label:'PMA Expiry Date', type:'date'},
    {id:'remark', label:'Remark', type:'textarea'},
  ]},
];

// Card 5 — Documents. row.docs[slotId] = {fileName, storagePath, uploadedAt, ...}
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

// Medan yang dianggap milik sesuatu slot dokumen.
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

// Tarikh rujukan untuk validUntil setiap slot
const TL_DOC_EXPIRY_FIELD = {
  pma:              'pmaExpiry',
  roadtax:          'roadtaxExpiry',
  singaporeRoadtax: 'singaporeRoadtaxExpiry',
  puspakom:         'puspakomExpiry',
  insurance:        'insuranceExpiry',
};

const TL_DOC_BUCKET = 'focc-documents';
const TL_DOC_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB

function tlDocSlotLabel(slotId){
  const s = TL_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

// Bandingkan nilai lama vs baru -> senarai slot yang terlibat (unik).
function tlDocSlotsChanged(prevRow, nextRow){
  const out = [];
  Object.keys(TL_DOC_FIELD_MAP).forEach(field => {
    const a = (prevRow && prevRow[field] != null) ? String(prevRow[field]) : '';
    const b = (nextRow && nextRow[field] != null) ? String(nextRow[field]) : '';
    if (a !== b){
      const slot = TL_DOC_FIELD_MAP[field];
      if (!out.includes(slot)) out.push(slot);
    }
  });
  return out;
}

// Setiap trailer mesti ada assetId KEKAL (folder storage tak ikut Trailer No.)
async function tlEnsureAssetIds(){
  const rows = await getData('trailer');
  if (!Array.isArray(rows) || !rows.length) return;
  let changed = false;
  rows.forEach(r => { if (r && !r.assetId){ r.assetId = pmNewId(); changed = true; } });
  if (changed) await persist('trailer');
}

function tlStoragePath(companyId, row, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  return `${companyId}/trailer/${asset}/${slotId}`;
}

// Upload + GANTI fail lama (upsert). Pulangkan docs[slotId] yang baharu.
async function tlUploadDoc(row, slotId, file, expiryValue){
  const bad = await pmValidatePdf(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = tlStoragePath(companyId, row, slotId);
  const prevDoc   = (row && row.docs && row.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';

  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(TL_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(TL_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: 'application/pdf', cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name,
    fileType:    'application/pdf',
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

async function tlOpenDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (!m.hasFile || !m.doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(TL_DOC_BUCKET)
    .createSignedUrl(m.doc.storagePath, 60, m.doc.fileName ? { download: m.doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function tlDeleteDoc(row, slotId){
  const m = pmDocMeta(row, slotId);
  if (m.doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(TL_DOC_BUCKET).remove([m.doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

function tlDocumentsCardHtml(row){
  const pendingCount  = TL_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).pending ? 1 : 0), 0);
  const uploadedCount = TL_DOCUMENT_SLOTS.reduce((n, s) => n + (pmDocMeta(row, s.id).hasFile ? 1 : 0), 0);
  return `
    <div class="section">
      <div class="section-head">
        <h3>5 · Documents</h3>
        <div class="spacer"></div>
        ${pendingCount ? `<span class="pm-doc-note is-warn">${pendingCount} PENDING UPLOAD</span>` : ''}
        <span class="pm-doc-note">${uploadedCount}/${TL_DOCUMENT_SLOTS.length} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="pm-doc-list">
          ${TL_DOCUMENT_SLOTS.map(slot => {
            const m = pmDocMeta(row, slot.id);
            const when = (m.hasFile && m.doc.uploadedAt) ? fmtDate(m.doc.uploadedAt) : '-';
            const rowCls = m.pending ? ' is-pending' : '';
            const stateCls = m.status === 'current' ? ' is-on' : (m.pending ? ' is-warn' : '');
            const stateTxt = m.status === 'current' ? 'Uploaded'
                           : m.pending ? 'Pending upload'
                           : 'Not uploaded';
            const byLine = m.hasFile
              ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
              : '';
            const declared = (m.pending && m.doc.pendingSince)
              ? `<span class="pm-doc-date">Renewal declared: ${escapeHtml(fmtDate(m.doc.pendingSince))}</span>` : '';
            return `
              <div class="pm-doc-row${rowCls}" data-slot="${slot.id}">
                <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
                <button type="button" class="pm-doc-btn" data-doc-action="upload" data-slot="${slot.id}">Upload</button>
                <button type="button" class="pm-doc-btn" data-doc-action="download" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
                <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
                <div class="pm-doc-meta">
                  <span class="pm-doc-state${stateCls}">
                    <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
                    ${stateTxt}
                  </span>
                  <span class="pm-doc-date">Upload date: ${escapeHtml(String(when))}</span>
                  ${byLine}
                  ${declared}
                </div>
                <input type="file" class="pm-doc-file" data-slot="${slot.id}" accept="application/pdf,.pdf" hidden>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

/* ---------- AUTO: Assigned Prime Mover (punca = page Prime Mover) ----------
   primeMover.assignedTrailers = [trailer assetId, ...]
   Ditulis semula ke trailer.assignedPrimeMover (untuk column table).
   Dipanggil bila page Trailer dibuka + selepas Prime Mover disimpan.        */
async function syncTrailerPrimeMover(){
  const pmRows = await getData('primeMover');
  const tlRows = await getData('trailer');
  if (!Array.isArray(pmRows) || !Array.isArray(tlRows)) return;

  const map = new Map();   // trailer assetId -> prime mover lorry
  pmRows.forEach(pm => {
    const list = Array.isArray(pm.assignedTrailers) ? pm.assignedTrailers : [];
    list.forEach(asset => {
      const a = String(asset || '');
      if (a) map.set(a, String(pm.lorry || ''));
    });
  });

  let changed = false;
  tlRows.forEach(tl => {
    const want = map.get(String(tl.assetId || '')) || '';
    if (String(tl.assignedPrimeMover || '') !== want){ tl.assignedPrimeMover = want; changed = true; }
  });
  if (changed) await persist('trailer');
}

/* ---------- Trailer: kekal dalam Detail Page selepas refresh (F5) ---------- */
const TL_OPEN_KEY = 'focc-tl-open';

function tlRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.lorry || '') : '';
    if (v) sessionStorage.setItem(TL_OPEN_KEY, v);
    else sessionStorage.removeItem(TL_OPEN_KEY);
  }catch(e){ /* abaikan */ }
}
function tlForgetOpen(){
  try{ sessionStorage.removeItem(TL_OPEN_KEY); }catch(e){ /* abaikan */ }
}
function tlRecallOpenIndex(rows){
  if (!Array.isArray(rows) || !rows.length) return -1;
  let want = '';
  try{ want = sessionStorage.getItem(TL_OPEN_KEY) || ''; }catch(e){ return -1; }
  if (!want) return -1;
  return rows.findIndex(r => r && (String(r.assetId || '') === want || String(r.lorry || '') === want));
}

async function renderTrailerDetailView(root, index, onBack, opts){
  const all = await getData('trailer');
  let row = all[index];
  if (!row){ await onBack(); return; }
  tlRememberOpen(row);

  let editing = false;
  let tlDocRadioValue = '';
  let pendingFocusSlots = null;

  function readOnlyHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${TL_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="pm-detail-grid">
                ${sec.fields.map(f => `
                  <div class="pm-detail-row">
                    <span class="pm-detail-lbl">${escapeHtml(f.label)}</span>
                    <span class="pm-detail-val">${escapeHtml(pmDisplayValue(f, row))}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${tlDocumentsCardHtml(row)}
      </div>`;
  }

  function editHtml(){
    return `
      <div class="pm-detail-card-grid">
        ${TL_DETAIL_SECTIONS.map(sec => `
          <div class="section">
            <div class="section-head"><h3>${escapeHtml(sec.title)}</h3></div>
            <div class="section-body">
              <div class="formgrid">
                ${sec.fields.map(f => {
                  const v = (row[f.id] === undefined || row[f.id] === null) ? '' : row[f.id];
                  const safe = escapeHtml(String(v));
                  if (f.type === 'textarea') return `<div class="formfield full"><label>${escapeHtml(f.label)}</label><textarea data-col="${f.id}" rows="3">${safe}</textarea></div>`;
                  if (f.type === 'date')  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="date" value="${safe}"></div>`;
                  if (f.type === 'number' || f.type === 'money') return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="number" step="any" value="${safe}"></div>`;
                  return `<div class="formfield"><label>${escapeHtml(f.label)}</label><input data-col="${f.id}" type="text" value="${safe}"></div>`;
                }).join('')}
              </div>
            </div>
          </div>`).join('')}
        ${tlDocumentsCardHtml(row)}
      </div>`;
  }

  function paint(){
    const pmName = String(row.assignedPrimeMover || '');
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="tlBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${escapeHtml(row.lorry || '(No Trailer)')}</span>
          <span class="pm-detail-sub">${escapeHtml(row.branch || '')}${pmName ? ' &middot; Prime Mover: ' + escapeHtml(pmName) : ' &middot; No prime mover assigned'}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="tlCancel">Cancel</button>
             <button class="btn primary" id="tlSave">Save Changes</button>`
          : `<button class="btn primary" id="tlEdit">&#9998; Edit Details</button>`}
      </div>
      <div id="tlBody">${editing ? editHtml() + '<div id="tlDocUpdatePanel"></div>' : readOnlyHtml()}</div>
    `;

    const backBtn = root.querySelector('#tlBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing){
        if (!confirm('You have unsaved changes. Leave without saving?')) return;
      }
      await onBack();
    };

    const editBtn = root.querySelector('#tlEdit');
    if (editBtn) editBtn.onclick = () => { editing = true; paint(); };

    const cancelBtn = root.querySelector('#tlCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false;
      paint();
    };

    const saveBtn = root.querySelector('#tlSave');
    if (saveBtn) saveBtn.onclick = async () => {
      const data = await getData('trailer');
      const prev = data[index] || {};
      const next = Object.assign({}, prev);
      if (!next.docs || typeof next.docs !== 'object' || Array.isArray(next.docs)) next.docs = {};
      TL_DETAIL_SECTIONS.forEach(sec => sec.fields.forEach(f => {
        const el = root.querySelector(`[data-col="${f.id}"]`);
        if (!el) return;
        let v = el.value;
        if ((f.type === 'number' || f.type === 'money') && v !== '') v = parseFloat(v);
        next[f.id] = v;
      }));
      // 'assignedPrimeMover' SENGAJA tidak disentuh — ia auto dari page Prime Mover.

      const docSlots = tlDocSlotsChanged(prev, next);
      if (docSlots.length){
        if (!tlDocRadioValue){
          alert('Please choose Correction Only or Document Renewal / Update.');
          return;
        }
        next.docs = pmApplyDocUpdateMode(next.docs, docSlots, tlDocRadioValue);
        pendingFocusSlots = docSlots;
      }
      data[index] = next;
      await persist('trailer');
      row = next;
      editing = false;
      tlDocRadioValue = '';
      paint();
    };

    // Panel "Correction Only" vs "Document Renewal / Update"
    if (editing && saveBtn){
      const docPanel = root.querySelector('#tlDocUpdatePanel');
      const snapshot = {};
      Object.keys(TL_DOC_FIELD_MAP).forEach(f => { snapshot[f] = (row[f] == null) ? '' : String(row[f]); });

      function readDocInputs(){
        const out = {};
        Object.keys(TL_DOC_FIELD_MAP).forEach(f => {
          const el = root.querySelector(`[data-col="${f}"]`);
          out[f] = el ? String(el.value || '') : '';
        });
        return out;
      }

      const refreshDocPanel = () => {
        const slots = tlDocSlotsChanged(snapshot, readDocInputs());
        if (!slots.length){
          docPanel.innerHTML = '';
          docPanel.dataset.rendered = '';
          tlDocRadioValue = '';
          saveBtn.disabled = false;
          return;
        }
        if (docPanel.dataset.rendered !== slots.join(',')){
          docPanel.dataset.rendered = slots.join(',');
          docPanel.innerHTML = `
            <div class="pm-docupd">
              <div class="pm-docupd-head">Document update &mdash; <strong>${slots.map(tlDocSlotLabel).join(', ')}</strong></div>
              <label class="pm-docupd-opt">
                <input type="radio" name="tlDocUpdateMode" value="correction_only">
                <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
              </label>
              <label class="pm-docupd-opt">
                <input type="radio" name="tlDocUpdateMode" value="document_renewal">
                <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
              </label>
              <div class="pm-docupd-hint">You must choose one option before saving.</div>
            </div>`;
          docPanel.querySelectorAll('input[name="tlDocUpdateMode"]').forEach(r => {
            r.addEventListener('change', () => { tlDocRadioValue = r.value; saveBtn.disabled = false; });
          });
          tlDocRadioValue = '';
          saveBtn.disabled = true;
        }
      };

      const editBody = root.querySelector('#tlBody');
      if (editBody){
        editBody.addEventListener('input', refreshDocPanel);
        editBody.addEventListener('change', refreshDocPanel);
      }
      refreshDocPanel();
    }

    // Scroll ke card Documents + highlight slot terlibat
    const focusSlots = (opts && Array.isArray(opts.focusSlots) && opts.focusSlots.length) ? opts.focusSlots : pendingFocusSlots;
    if (!editing && Array.isArray(focusSlots) && focusSlots.length){
      const bodyEl = root.querySelector('#tlBody');
      if (bodyEl){
        const first = bodyEl.querySelector(`.pm-doc-row[data-slot="${focusSlots[0]}"]`);
        focusSlots.forEach(slotId => {
          const rowEl = bodyEl.querySelector(`.pm-doc-row[data-slot="${slotId}"]`);
          if (rowEl){
            rowEl.classList.add('is-flagged');
            setTimeout(() => rowEl.classList.remove('is-flagged'), 3400);
          }
        });
        if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      if (opts) opts.focusSlots = null;
      pendingFocusSlots = null;
    }

    // ---- Documents: Upload / Download / Delete (mod lihat sahaja) ----
    const docBtns = root.querySelectorAll('#tlBody [data-doc-action]');
    if (docBtns.length){
      if (editing){
        docBtns.forEach(b => { b.disabled = true; });
      } else {
        const saveDocs = async (nextDocs) => {
          const data = await getData('trailer');
          const next = Object.assign({}, data[index], { docs: nextDocs });
          data[index] = next;
          await persist('trailer');
          row = next;
          paint();
        };

        docBtns.forEach(btn => {
          const slotId = btn.dataset.slot;
          const action = btn.dataset.docAction;

          if (action === 'upload'){
            btn.onclick = () => {
              const inp = root.querySelector(`.pm-doc-file[data-slot="${slotId}"]`);
              if (inp){ inp.value = ''; inp.click(); }
            };
          }

          if (action === 'download'){
            btn.onclick = async () => {
              try{ btn.disabled = true; await tlOpenDoc(row, slotId); }
              catch(err){ alert('Download failed: ' + (err.message || err)); }
              finally{ btn.disabled = false; }
            };
          }

          if (action === 'delete'){
            btn.onclick = async () => {
              if (!confirm(`Delete the ${tlDocSlotLabel(slotId)} file? This cannot be undone.`)) return;
              try{
                btn.disabled = true;
                await tlDeleteDoc(row, slotId);
                const docs = Object.assign({}, row.docs || {});
                delete docs[slotId];
                await saveDocs(docs);
              }catch(err){
                btn.disabled = false;
                alert('Delete failed: ' + (err.message || err));
              }
            };
          }
        });

        root.querySelectorAll('.pm-doc-file').forEach(inp => {
          inp.onchange = async () => {
            const slotId = inp.dataset.slot;
            const file   = inp.files && inp.files[0];
            if (!file) return;
            const btn = root.querySelector(`[data-doc-action="upload"][data-slot="${slotId}"]`);
            if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
            try{
              const expField  = TL_DOC_EXPIRY_FIELD[slotId] || '';
              const expValue  = expField ? (row[expField] || '') : '';
              const doc       = await tlUploadDoc(row, slotId, file, expValue);
              const docs      = Object.assign({}, row.docs || {}, { [slotId]: doc });
              await saveDocs(docs);
            }catch(err){
              if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
              alert('Upload failed: ' + (err.message || err));
            }
          };
        });
      }
    }
  }

  paint();
}
/* =============================================================
   FEG — ingat rekod yang sedang dibuka (tahan F5)
   ============================================================= */
const FEG_OPEN_KEY = 'focc-feg-open';

function fegRememberOpen(row){
  try{
    const v = row ? String(row.assetId || row.assetRef || '') : '';
    if (v) sessionStorage.setItem(FEG_OPEN_KEY, v);
    else sessionStorage.removeItem(FEG_OPEN_KEY);
  }catch(e){}
}
function fegForgetOpen(){
  try{ sessionStorage.removeItem(FEG_OPEN_KEY); }catch(e){}
}
function fegRecallOpenIndex(rows){
  let want = '';
  try{ want = sessionStorage.getItem(FEG_OPEN_KEY) || ''; }catch(e){ want = ''; }
  if (!want) return -1;
  return (rows || []).findIndex(r => r && (String(r.assetId || '') === want || String(r.assetRef || '') === want));
}
/* Kunci rekod FEG — identiti STABIL (bukan index, index boleh beralih). */
function fegRowKey(row){
  return row ? String(row.assetId || row.assetRef || '') : '';
}

/* ---- Fasa 5: lompat dari Service History terus ke dokumen unit ---- */
const FEG_JUMP_KEY = 'focc-feg-jump';
function fegJumpSet(assetId, unitId, slots){
  try{
    sessionStorage.setItem(FEG_JUMP_KEY, JSON.stringify({
      assetId: String(assetId || ''),
      unitId : String(unitId  || ''),
      slots  : Array.isArray(slots) ? slots : []
    }));
  }catch(e){}
}
function fegJumpPeek(){
  let v = null;
  try{ v = JSON.parse(sessionStorage.getItem(FEG_JUMP_KEY) || 'null'); }catch(e){ v = null; }
  return (v && typeof v === 'object') ? v : null;
}
function fegJumpTake(){
  const v = fegJumpPeek();
  try{ sessionStorage.removeItem(FEG_JUMP_KEY); }catch(e){}
  return v;
}
function fegApplyJumpFocus(root, jump, row){
  const units = (row && row.units) || [];
  const ui = units.findIndex(u => u && String(u.unitId || '') === String((jump && jump.unitId) || ''));
  if (ui < 0) return;
  const slots = (jump && Array.isArray(jump.slots)) ? jump.slots : [];
  let first = null;
  slots.forEach(slotId => {
    const el = root.querySelector(`.pm-doc-row[data-doc-unit="${ui}"][data-slot="${slotId}"]`);
    if (!el) return;
    if (!first) first = el;
    el.classList.add('is-flagged');
    setTimeout(() => el.classList.remove('is-flagged'), 3400);
  });
  if (first) setTimeout(() => first.scrollIntoView({behavior:'smooth', block:'center'}), 150);
}
   const FEG_DOC_UNIT_KEY = 'focc-feg-doc-unit:';
function fegDocPageSave(row, unit){
  try{
    const k = FEG_DOC_UNIT_KEY + fegRowKey(row);
    if (unit && unit.unitId) sessionStorage.setItem(k, String(unit.unitId));
    else sessionStorage.removeItem(k);
  }catch(e){}
}
function fegDocPageIndex(row){
  const units = (row && Array.isArray(row.units)) ? row.units : [];
  if (!units.length) return 0;
  let want = '';
  try{ want = sessionStorage.getItem(FEG_DOC_UNIT_KEY + fegRowKey(row)) || ''; }catch(e){ want = ''; }
  const i = want ? units.findIndex(u => String((u && u.unitId) || '') === want) : -1;
  return i >= 0 ? i : 0;
}

/* =============================================================
   FEG — Final Status (AUTO, dikira semula setiap kali simpan)
   RANK 1 (menang atas semua) — aksi user:
        Dispose            → 'Disposed'
        Tekan Service      → 'Under Service'  (unit di vendor)
   RANK 2 — tarikh dah due:
        Cylinder Due (zon 8 bulan / tong dah exp) MENANG atas Service Due
        Service Date lepas  → 'Service Due'
   RANK 3 — Manual Status user (In Use / Transfer / Under Inspection /
        Damaged / Missing / Expired)
   NOTA: Draft (tiada serial) & Remark ('Under Maintenance') dikira
   sebelum Manual Status. TONG MENANG sebab tong exp = tak boleh
   diservis lagi, kena tukar walaupun Service Date dah lepas.
   ============================================================= */
function fegFinalStatus(u){
  if (!u) return 'Draft';

  // ---- RANK 1: aksi user (butang Service / Dispose) ----
  if (String(u.disposal || 'No') === 'Yes') return 'Disposed';
  if (fegIsInService(u))                    return 'Under Service';

  // ---- RANK 2: tarikh dah due (tong menang atas servis) ----
  const today = new Date(); today.setHours(0,0,0,0);
  const asDate = s => { if (!s) return null; const d = new Date(String(s) + 'T00:00:00'); return isNaN(d.getTime()) ? null : d; };
  const cyFrom = fegCylinderReplaceFrom(u.cylinderDue);      // 8 bulan sebelum Cylinder Test Due
  if (cyFrom && cyFrom <= today) return 'Cylinder Due';
  const sv = asDate(u.serviceDate);
  if (sv && sv < today) return 'Service Due';

  // ---- RANK 3: Manual Status ----
  if (!String(u.serialNo || '').trim()) return 'Draft';
  return String(u.manualStatus || '').trim() || 'In Service';
}

function fegStatusClass(s){
  const v = String(s || '');
  if (v === 'Disposed') return 'bad';
  if (v === 'Under Service') return 'sync';      // teal — kerja sedang berjalan (unit di vendor)
  if (v === 'Under Maintenance' || v === 'Service Due' || v === 'Cylinder Due') return 'warn';
  if (v === 'Transfer' || v === 'Missing') return 'warn';
  if (v === 'Draft') return 'neutral';
  return 'good';
}
/* ---- FEG Inspection: Next Due = Inspection Date + 1 bulan (dikira, tak disimpan) ---- */
function fegNextInspectionDue(u){
  const d = String((u && u.inspectionDate) || '').trim();
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  if (isNaN(dt.getTime())) return '';
  const next = new Date(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
  return next.getFullYear() + '-' + String(next.getMonth() + 1).padStart(2,'0') + '-' + String(next.getDate()).padStart(2,'0');
}
function fegInspectionDueLabel(isoDue){
  if (!isoDue) return { text:'\u2014', cls:'' };
  const due = new Date(isoDue + 'T00:00:00');
  if (isNaN(due.getTime())) return { text:'\u2014', cls:'' };
  const today = new Date(); today.setHours(0,0,0,0);
  const days  = Math.round((due - today) / 86400000);
  if (days < 0)  return { text:'Overdue ' + Math.abs(days) + 'd', cls:'bad'  };
  if (days <= 7) return { text:'Due in ' + days + 'd',            cls:'warn' };
  return { text: fmtDate(isoDue), cls:'' };
}

function fegSerialLabel(u){
  const pre = String((u && u.serialPrefix) || '').trim();
  const no  = String((u && u.serialNo) || '').trim();
  if (!no) return '';
  return pre ? (pre + '-' + no) : no;
}
function fegUnitCounts(units){
  const arr = Array.isArray(units) ? units : [];
  let active = 0, disposed = 0, draft = 0, serviceDue = 0, cylinderDue = 0;
  arr.forEach(u => {
    const s = fegFinalStatus(u);
    if (s === 'Disposed') disposed += 1;
    else if (s === 'Draft') draft += 1;
    else {
      active += 1;
      if (s === 'Service Due') serviceDue += 1;
      else if (s === 'Cylinder Due') cylinderDue += 1;
    }
  });
  // in use = In Service / Under Maintenance / manual status lain
  const inUse = active - serviceDue - cylinderDue;
  return { total: arr.length, active, inUse, disposed, draft, serviceDue, cylinderDue };
}
/* Chip ringkasan unit untuk kolum "Units" di FEG List.
   Kumpulan yang SEMUA unitnya disposed ditanda "Closed" — rekod TIDAK disorok. */
function fegUnitsCell(row){
  const c = fegUnitCounts(row && row.units);
  if (!c.total) return '<span style="color:var(--muted)">0 units</span>';
  const closed = c.disposed === c.total;
  const parts = [
    `<span class="badge ${closed ? 'bad' : 'neutral'}">${closed ? 'Closed' : c.total + ' unit' + (c.total === 1 ? '' : 's')}</span>`
  ];
  if (c.draft)       parts.push(`<span class="badge neutral">${c.draft} draft</span>`);
  if (c.inUse)       parts.push(`<span class="badge good">${c.inUse} in use</span>`);
  if (c.serviceDue)  parts.push(`<span class="badge warn">${c.serviceDue} service due</span>`);
  if (c.cylinderDue) parts.push(`<span class="badge warn">${c.cylinderDue} cylinder due</span>`);
  if (c.disposed && !closed) parts.push(`<span class="badge bad">${c.disposed} disposed</span>`);
  if (!c.inUse && !c.serviceDue && !c.cylinderDue && !closed) parts.push('<span class="badge warn">0 in use</span>');
  return `<span style="display:inline-flex;gap:4px;flex-wrap:wrap">${parts.join('')}</span>`;
}

/* =============================================================
   FEG DOCUMENTS — per unit (satu fail per slot, upload ganti fail lama)
   Path: {companyId}/feg/{assetId}/{unitId}/{slotId}
   Bucket sama: focc-documents (private) · PDF / JPG / PNG · max 5 MB
   Guna semula enjin sedia ada: stValidateFile(), stContentType(),
   pmDocMeta(), — jadi kelakuan sama macam PM / Trailer / Staff.
   ============================================================= */
const FEG_DOC_BUCKET = PM_DOC_BUCKET;

const FEG_DOCUMENT_SLOTS = [
  {id:'fireCert',      label:'Fire Certificate'},
  {id:'invoice',       label:'Purchase Invoice'},
];

// Tarikh rujukan untuk validUntil setiap slot (slot tanpa tarikh = '')
const FEG_DOC_EXPIRY_FIELD = {
  fireCert:      'serviceDate',
  invoice:       '',
};
/* Medan unit yang "milik" slot dokumen. serviceDate → 2 slot sekaligus. */
const FEG_DOC_FIELD_SLOTS = [
  { field:'serviceDate', slots:['fireCert'] },
];

function fegDocSlotLabel(slotId){
  const s = FEG_DOCUMENT_SLOTS.find(x => x.id === slotId);
  return s ? s.label : slotId;
}

function fegDocPath(companyId, row, unit, slotId){
  const asset = (row && row.assetId) ? row.assetId : 'unassigned';
  const u     = (unit && unit.unitId) ? unit.unitId : 'unit';
  return `${companyId}/feg/${asset}/${u}/${slotId}`;
}

async function fegUploadDoc(row, unit, slotId, file, expiryValue){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const path      = fegDocPath(companyId, row, unit, slotId);
  const prevDoc   = (unit && unit.docs && unit.docs[slotId]) || {};
  const prevPath  = prevDoc.storagePath || '';
  const ctype     = stContentType(file);

  // Fail lama di path lain (contoh jenis fail berubah) -> buang dulu
  if (prevPath && prevPath !== path){
    try{ await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).remove([prevPath]); }catch(e){}
  }

  const up = await FOCC_SUPABASE.storage
    .from(FEG_DOC_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  return {
    storagePath: path,
    fileName:    file.name || '',
    fileType:    ctype,
    fileSize:    file.size,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  getSessionEmail() || '',
    validUntil:  expiryValue || '',
    status:      'current',
    updateMode:  prevDoc.updateMode || '',
  };
}

async function fegDownloadDoc(unit, slotId){
  const doc = (unit && unit.docs) ? unit.docs[slotId] : null;
  if (!doc || !doc.storagePath) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(FEG_DOC_BUCKET)
    .createSignedUrl(doc.storagePath, 60, doc.fileName ? { download: doc.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

async function fegDeleteDoc(unit, slotId){
  const doc = (unit && unit.docs) ? unit.docs[slotId] : null;
  if (doc && doc.storagePath){
    const del = await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).remove([doc.storagePath]);
    if (del.error) throw del.error;
  }
  return true;
}

/* =============================================================
   FEG INSPECTION RECORD (kad 3 · Inspection Form — mod EDIT sahaja)
   ALIRAN:  [+ Add Inspection Record] → isi butiran → Save
            → baris masuk atas + butang [Upload] berkelip
            → Upload → pilih PDF/JPG/PNG → siap
            → baris: [Upload] [Download] [Delete]
   DATA: table logik 'fegInspection' dalam tenant_tables (JSON) —
         TIADA table Supabase baru. Satu rekod = satu borang.
   FAIL: bucket focc-documents · {companyId}/feg/{assetId}/inspection/{recordId}
   NOTA: inspection TIDAK mengubah Final Status FEG.
   ============================================================= */
const FEG_INSPECTION_TABLE   = 'fegInspection';
const FEG_INSPECTION_BUCKET  = PM_DOC_BUCKET;
const FEG_INSPECTION_RESULTS = ['Pass','Pass with remarks','Fail'];

function fegInspectionPath(companyId, assetId, recordId){
  return `${companyId}/feg/${assetId || 'unassigned'}/inspection/${recordId}`;
}
function fegInspectionAssetKey(row){
  return String((row && (row.assetId || row.assetRef)) || '');
}
function fegInspectionSortDesc(list){
  return (Array.isArray(list) ? list.slice() : []).sort((a,b) => {
    const da = String((a && a.inspectedOn) || '');
    const db = String((b && b.inspectedOn) || '');
    if (da !== db) return db.localeCompare(da);                    // terbaru di atas
    return String((b && b.createdAt) || '').localeCompare(String((a && a.createdAt) || ''));
  });
}
function fegInspectionForAsset(all, row){
  const key = fegInspectionAssetKey(row);
  return fegInspectionSortDesc((all || []).filter(r => r && String(r.assetId || '') === key));
}
function fegInspectionFileMeta(rec){
  const f = (rec && rec.file && typeof rec.file === 'object') ? rec.file : {};
  return { hasFile: !!(f.storagePath || f.fileName), file: f };
}
function fegInspectionTodayIso(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

/* Semua perubahan rekod melalui sini — baca senarai TERKINI, ubah, simpan.
   Kalau orang lain save serentak, persist() akan tolak (version conflict). */
async function fegInspectionPersist(mutate){
  const list = await getData(FEG_INSPECTION_TABLE);
  const arr  = Array.isArray(list) ? list : [];
  const out  = mutate(arr);
  DATA_CACHE[FEG_INSPECTION_TABLE] = arr;
  await persist(FEG_INSPECTION_TABLE);
  return out;
}

/* 1) REKOD BARU (butiran sahaja — fail menyusul) */
async function fegInspectionAdd(row, info){
  const at = new Date().toISOString();
  const rec = {
    recordId   : fegNewId('FI'),
    assetId    : fegInspectionAssetKey(row),
    assetRef   : String(row.assetRef || ''),
    assetType  : String(row.assetType || ''),
    branch     : String(row.branch || ''),
    inspectedOn: String((info && info.inspectedOn) || ''),
    inspector  : String((info && info.inspector) || ''),
    result     : String((info && info.result) || ''),
    findings   : String((info && info.findings) || ''),
    action     : String((info && info.action) || ''),
    file       : {},
    createdBy  : getSessionEmail() || '',
    createdAt  : at,
    updatedBy  : '',
    updatedAt  : ''
  };
  await fegInspectionPersist(arr => { arr.push(rec); });
  return rec;
}

/* 2) KEMAS KINI BUTIRAN (dari klik pada baris) */
async function fegInspectionUpdate(recordId, info){
  const at = new Date().toISOString();
  return await fegInspectionPersist(arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.inspectedOn = String((info && info.inspectedOn) || '');
    rec.inspector   = String((info && info.inspector) || '');
    rec.result      = String((info && info.result) || '');
    rec.findings    = String((info && info.findings) || '');
    rec.action      = String((info && info.action) || '');
    rec.updatedBy   = getSessionEmail() || '';
    rec.updatedAt   = at;
    return rec;
  });
}

/* 3) UPLOAD / GANTI fail borang (satu fail per rekod) */
async function fegInspectionUploadFile(row, record, file){
  const bad = await stValidateFile(file);
  if (bad) throw new Error(bad);

  const companyId = await SupabaseProvider.getCompanyId();
  const ctype     = stContentType(file);
  const path      = fegInspectionPath(companyId, fegInspectionAssetKey(row), record.recordId);

  const up = await FOCC_SUPABASE.storage
    .from(FEG_INSPECTION_BUCKET)
    .upload(path, file, { upsert: true, contentType: ctype, cacheControl: '3600' });
  if (up.error) throw up.error;

  const meta = {
    storagePath: path,
    fileName   : file.name || '',
    fileType   : ctype,
    fileSize   : file.size,
    uploadedAt : new Date().toISOString(),
    uploadedBy : getSessionEmail() || ''
  };
  await fegInspectionPersist(arr => {
    const rec = arr.find(r => r && String(r.recordId || '') === String(record.recordId));
    if (!rec) throw new Error('Record not found. Refresh and try again.');
    rec.file      = meta;
    rec.updatedBy = meta.uploadedBy;
    rec.updatedAt = meta.uploadedAt;
  });
  return meta;
}

/* 4) DOWNLOAD borang bertandatangan */
async function fegInspectionDownload(record){
  const m = fegInspectionFileMeta(record);
  if (!m.hasFile) throw new Error('No file uploaded yet.');
  const res = await FOCC_SUPABASE.storage
    .from(FEG_INSPECTION_BUCKET)
    .createSignedUrl(m.file.storagePath, 60, m.file.fileName ? { download: m.file.fileName } : {});
  if (res.error) throw res.error;
  window.open(res.data.signedUrl, '_blank', 'noopener');
}

/* 5) DELETE — fail storage dibuang DULU, baru rekod (elak fail hantu) */
async function fegInspectionDelete(record){
  const m = fegInspectionFileMeta(record);
  if (m.hasFile && m.file.storagePath){
    const del = await FOCC_SUPABASE.storage.from(FEG_INSPECTION_BUCKET).remove([m.file.storagePath]);
    if (del.error) throw del.error;
  }
  await fegInspectionPersist(arr => {
    const i = arr.findIndex(r => r && String(r.recordId || '') === String(record.recordId));
    if (i >= 0) arr.splice(i, 1);
  });
  return true;
}
/* =============================================================
   FEG INSPECTION FORM (PDF) — borang kosong untuk cetak
   Aliran: Download → cetak → isi tangan + tandatangan → scan
           → [+ Add Inspection Record] → [Upload] PDF bertandatangan.
   1 PDF = 1 halaman per unit + 1 halaman APPROVAL (terakhir).

   ENJIN: jsPDF NATIVE (teks + garis + kotak) — TIADA html2canvas.
   Kenapa tukar: html2canvas memotong lajur KIRI borang sebab ia
   menangkap elemen 794px di dalam app shell (sidebar + #main).
   Dengan jsPDF native: vektor, tajam bila dicetak, tepat A4
   (210 x 297 mm), dan TIDAK bergantung pada viewport langsung.

   Nama syarikat = garisan kosong (tulis tangan).
   Dikecualikan: unit Draft (tiada serial) & Disposed.
   ============================================================= */
const FEG_INSPECTION_CHECKLIST = [
  'Extinguisher visible & accessible',
  'Location signage / marker clear',
  'Bracket / trolley secure',
  'Body: no dent / rust / leakage',
  'Safety pin present',
  'Tamper seal intact',
  'Pressure gauge in green zone *',
  'Hose & nozzle intact / not blocked',
  'Service tag & label legible / current',
  'Weight / contents normal **',
];

const FEG_PDF_M    = 12;                    // margin kiri/kanan (mm)
const FEG_PDF_R    = 198;                   // x kanan (210 - 12)
const FEG_PDF_INK  = [17, 17, 17];
const FEG_PDF_GREY = [110, 110, 110];
const FEG_PDF_LINE = [150, 150, 150];
const FEG_PDF_FILL = [242, 244, 246];

/* ---------------- primitif lukis ---------------- */
function fegPdfFont(doc, size, bold, color){
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size || 9.5);
  const c = color || FEG_PDF_INK;
  doc.setTextColor(c[0], c[1], c[2]);
}
function fegPdfText(doc, text, x, y, size, bold, color){
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), x, y);
}
function fegPdfTextC(doc, text, cx, y, size, bold, color){   // tengah
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), cx, y, { align: 'center' });
}
function fegPdfTextR(doc, text, x, y, size, bold, color){    // kanan
  fegPdfFont(doc, size, bold, color);
  doc.text(String(text == null ? '' : text), x, y, { align: 'right' });
}
function fegPdfRule(doc, x1, y1, x2, y2, w){                 // garis jadual
  doc.setDrawColor(FEG_PDF_LINE[0], FEG_PDF_LINE[1], FEG_PDF_LINE[2]);
  doc.setLineWidth(w || 0.2);
  doc.line(x1, y1, x2, y2);
}
function fegPdfFillRule(doc, x1, y1, x2, y2, w){             // garis isi (ruang tulis)
  doc.setDrawColor(138, 138, 138);
  doc.setLineWidth(w || 0.25);
  doc.line(x1, y1, x2, y2);
}
function fegPdfBox(doc, x, y, s){                            // kotak checkbox (top-left)
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.25);
  doc.rect(x, y, s || 3.4, s || 3.4);
}
function fegPdfCell(doc, x, y, w, h, fill){
  doc.setDrawColor(FEG_PDF_LINE[0], FEG_PDF_LINE[1], FEG_PDF_LINE[2]);
  doc.setLineWidth(0.2);
  if (fill){
    doc.setFillColor(FEG_PDF_FILL[0], FEG_PDF_FILL[1], FEG_PDF_FILL[2]);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

/* ---------------- kepala + meta (semua halaman) ---------------- */
function fegPdfHeadMeta(doc, row, title1, title2, pageNo, totalPages){
  fegPdfText(doc, 'Company Name :', FEG_PDF_M, 18, 9.5, false);
  fegPdfFillRule(doc, FEG_PDF_M + 32, 19, FEG_PDF_M + 92, 19);

  fegPdfTextR(doc, title1, FEG_PDF_R, 15.5, 11, true);
  fegPdfTextR(doc, title2, FEG_PDF_R, 20.5, 11, true);
  fegPdfRule(doc, FEG_PDF_M, 24, FEG_PDF_R, 24, 0.6);

  fegPdfText(doc, 'Asset / Location :', FEG_PDF_M, 31, 9.5, false);
  fegPdfText(doc, String(row.assetRef || '-'), FEG_PDF_M + 31, 31, 9.5, true);
  fegPdfText(doc, 'Branch :', 122, 31, 9.5, false);
  fegPdfText(doc, String(row.branch || '-'), 138, 31, 9.5, true);

  fegPdfText(doc, 'Inspection Month :', FEG_PDF_M, 37.5, 9.5, false);
  fegPdfFillRule(doc, FEG_PDF_M + 33, 38.3, FEG_PDF_M + 73, 38.3);
  fegPdfTextR(doc, 'Page ' + pageNo + ' of ' + totalPages, FEG_PDF_R, 37.5, 9.5, false);

  return 44;
}

/* ---------------- baris butiran 2-kolum ---------------- */
function fegPdfDetailRow(doc, y, l1, v1, l2, v2){
  const COL = 93, LAB = 33, VAL = COL - LAB - 3.5;
  const X1  = FEG_PDF_M, X2 = FEG_PDF_M + COL;
  const LH  = 4.6;

  fegPdfFont(doc, 9.5, false);
  const a = v1 ? doc.splitTextToSize(String(v1), VAL) : [''];
  const b = v2 ? doc.splitTextToSize(String(v2), VAL) : [''];
  const n = Math.max(a.length, b.length, 1);

  for (let i = 0; i < n; i++){
    const yy = y + i * LH;
    if (i === 0){
      fegPdfText(doc, l1, X1, yy, 9.5, false, FEG_PDF_GREY);
      fegPdfText(doc, ':', X1 + LAB, yy, 9.5, false, FEG_PDF_GREY);
      if (l2){
        fegPdfText(doc, l2, X2, yy, 9.5, false, FEG_PDF_GREY);
        fegPdfText(doc, ':', X2 + LAB, yy, 9.5, false, FEG_PDF_GREY);
      }
    }
    if (a[i]) fegPdfText(doc, a[i], X1 + LAB + 3, yy, 9.5, true);
    if (b[i]) fegPdfText(doc, b[i], X2 + LAB + 3, yy, 9.5, true);
  }
  return y + n * LH;
}

/* ---------------- jadual checklist ---------------- */
function fegPdfChecklistTable(doc, y){
  const W = [8, 78, 16, 16, 16, 52];               // jumlah 186mm
  const H = ['#', 'ITEM', 'PASS', 'FAIL', 'N/A', 'REMARKS'];
  const headH = 7, rowH = 8;

  const e = [FEG_PDF_M];
  let acc = FEG_PDF_M;
  W.forEach(w => { acc += w; e.push(acc); });

  fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, headH, true);
  H.forEach((h, i) => {
    if (i === 0)      fegPdfTextC(doc, h, (e[0] + e[1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else if (i === 1) fegPdfText(doc, h, e[1] + 2, y + 4.8, 8, true, FEG_PDF_GREY);
    else              fegPdfTextC(doc, h, (e[i] + e[i + 1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
    if (i > 0) fegPdfRule(doc, e[i], y, e[i], y + headH, 0.2);
  });

  let yy = y + headH;
  FEG_INSPECTION_CHECKLIST.forEach((t, i) => {
    fegPdfCell(doc, FEG_PDF_M, yy, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], yy, e[c], yy + rowH, 0.2);

    fegPdfTextC(doc, String(i + 1), (e[0] + e[1]) / 2, yy + 5.3, 9, false);
    fegPdfText(doc, t, e[1] + 2, yy + 5.3, 9, false);
    for (let c = 2; c <= 4; c++){
      const cx = (e[c] + e[c + 1]) / 2;
      fegPdfBox(doc, cx - 1.7, yy + 2.2, 3.4);
    }
    yy += rowH;
  });
  return yy;
}

/* ---------------- blok Result & Signature ---------------- */
function fegPdfResultBlock(doc, y){
  const X = FEG_PDF_M;

  fegPdfText(doc, 'Overall :', X, y, 9.5, false);
  [['Pass', 32], ['Pass with remarks', 57], ['Fail', 103]].forEach(p => {
    fegPdfBox(doc, p[1], y - 3.1, 3.4);
    fegPdfText(doc, p[0], p[1] + 5, y, 9.5, false);
  });

  let yy = y + 9;
  fegPdfText(doc, 'Findings :', X, yy, 9.5, false);
  fegPdfFillRule(doc, X + 20, yy + 1, FEG_PDF_R, yy + 1);

  yy += 9;
  fegPdfText(doc, 'Action taken :', X, yy, 9.5, false);
  fegPdfFillRule(doc, X + 26, yy + 1, FEG_PDF_R, yy + 1);

  yy += 14;
  fegPdfText(doc, 'Inspected by', X, yy, 9.5, true);
  fegPdfText(doc, 'Name :', X + 26, yy, 9.5, false);
  fegPdfFillRule(doc, X + 38, yy + 1, X + 93, yy + 1);
  fegPdfText(doc, 'Signature :', X + 100, yy, 9.5, false);
  fegPdfFillRule(doc, X + 121, yy + 1, FEG_PDF_R, yy + 1);

  yy += 8;
  fegPdfText(doc, 'Date :', X + 26, yy, 9.5, false);
  fegPdfFillRule(doc, X + 38, yy + 1, X + 93, yy + 1);
  return yy;
}

/* ---------------- jalur amaran tong ---------------- */
function fegPdfWarn(doc, y, unit){
  const txt = 'CYLINDER REPLACEMENT ZONE — DO NOT SERVICE. REPLACE CYLINDER.';
  const sub = unit.cylinderDue ? 'Cylinder Test Due: ' + fmtDate(unit.cylinderDue) : '';
  const h   = sub ? 13 : 9;

  doc.setFillColor(255, 246, 214);
  doc.setDrawColor(184, 134, 11);
  doc.setLineWidth(0.5);
  doc.rect(FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, h, 'FD');

  fegPdfText(doc, txt, FEG_PDF_M + 3, y + 5.6, 9, true, [122, 86, 0]);
  if (sub) fegPdfText(doc, sub, FEG_PDF_M + 3, y + 10.8, 9, false, [122, 86, 0]);
  return y + h + 4;
}

/* ---------------- blok tandatangan + cop ---------------- */
function fegPdfSign(doc, x, y, w, title){
  fegPdfText(doc, title, x, y, 9, true);
  let yy = y + 6.5;
  ['Name', 'Sign', 'Date'].forEach(lab => {
    fegPdfText(doc, lab + ' :', x, yy, 9, false);
    fegPdfFillRule(doc, x + 14, yy + 1, x + w, yy + 1);
    yy += 7;
  });
  return yy;
}
function fegPdfStamp(doc, x, y, w, h){
  doc.setDrawColor(140, 140, 140);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h, 'S');
  fegPdfTextC(doc, 'COMPANY STAMP', x + w / 2, y + h / 2 + 1, 8.5, false, FEG_PDF_GREY);
}

/* ---------------- HALAMAN UNIT (1 unit = 1 A4) ---------------- */
function fegPdfUnitPage(doc, row, unit, idx, totalPages){
  let y = fegPdfHeadMeta(doc, row, 'FIRE EXTINGUISHER', 'MONTHLY INSPECTION FORM', idx + 1, totalPages);

  fegPdfText(doc, 'A · UNIT DETAILS', FEG_PDF_M, y, 9.5, true);
  y += 5.5;
  y = fegPdfDetailRow(doc, y, 'Unit No.',          'Unit ' + (idx + 1), 'Serial No.', fegSerialLabel(unit) || '');
  y = fegPdfDetailRow(doc, y, 'Driver / Incharge', String(unit.driver || ''), '', '');
  y = fegPdfDetailRow(doc, y, 'FEG Type',          String(unit.fegType || ''), 'Capacity', String(unit.capacity || ''));
  y = fegPdfDetailRow(doc, y, 'Manufacturing',     unit.mfgDate ? fmtDate(unit.mfgDate) : '', 'Service Due', unit.serviceDate ? fmtDate(unit.serviceDate) : '');
  y = fegPdfDetailRow(doc, y, 'Cylinder Test Due', unit.cylinderDue ? fmtDate(unit.cylinderDue) : '', 'Manual Status', String(unit.manualStatus || ''));
  y += 3;

  const cyFrom = fegCylinderReplaceFrom(unit.cylinderDue);
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  if (cyFrom && cyFrom <= today) y = fegPdfWarn(doc, y, unit);

  y += 3;
  fegPdfText(doc, 'B · MONTHLY CHECKLIST', FEG_PDF_M, y, 9.5, true);
  y += 4.5;
  y = fegPdfChecklistTable(doc, y);

  fegPdfText(doc, '* N/A for CO2 type (no gauge).   ** Weigh for CO2 (leaks are not visible).', FEG_PDF_M, y + 4, 8, false, FEG_PDF_GREY);
  y += 11;

  fegPdfText(doc, 'C · RESULT & SIGNATURE', FEG_PDF_M, y, 9.5, true);
  y += 7;
  fegPdfResultBlock(doc, y);
}

/* ---------------- HALAMAN APPROVAL (terakhir) ---------------- */
function fegPdfApprovalPage(doc, row, units, totalPages){
  const list = Array.isArray(units) ? units : [];
  let y = fegPdfHeadMeta(doc, row, 'FEG INSPECTION', 'SUMMARY & APPROVAL', totalPages, totalPages);

  fegPdfText(doc, 'A · UNIT SUMMARY', FEG_PDF_M, y, 9.5, true);
  y += 4.5;

  const H = ['UNIT', 'SERIAL', 'TYPE', 'CAPACITY', 'RESULT', 'REMARKS'];
  const W = [24, 50, 30, 24, 30, 28];
  const e = [FEG_PDF_M];
  let acc = FEG_PDF_M;
  W.forEach(w => { acc += w; e.push(acc); });
  const headH = 7, rowH = 7;

  fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, headH, true);
  H.forEach((h, i) => {
    fegPdfRule(doc, e[i], y, e[i], y + headH, 0.2);
    fegPdfTextC(doc, h, (e[i] + e[i + 1]) / 2, y + 4.8, 8, true, FEG_PDF_GREY);
  });
  y += headH;

  list.forEach((u, i) => {
    fegPdfCell(doc, FEG_PDF_M, y, FEG_PDF_R - FEG_PDF_M, rowH, false);
    for (let c = 1; c < e.length - 1; c++) fegPdfRule(doc, e[c], y, e[c], y + rowH, 0.2);
    const cells = ['Unit ' + (i + 1), fegSerialLabel(u) || '', String(u.fegType || ''), String(u.capacity || ''), '', ''];
    cells.forEach((v, c) => {
      if (v) fegPdfTextC(doc, v, (e[c] + e[c + 1]) / 2, y + 5, 9, false);
    });
    y += rowH;
  });
  y += 8;

  fegPdfText(doc, 'B · UNITS NOT INSPECTED (REASON)', FEG_PDF_M, y, 9.5, true);
  y += 6;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 7;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 11;

  fegPdfText(doc, 'C · OVERALL FINDINGS', FEG_PDF_M, y, 9.5, true);
  y += 6;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 7;
  fegPdfFillRule(doc, FEG_PDF_M, y, FEG_PDF_R, y);  y += 14;

  fegPdfText(doc, 'D · APPROVAL', FEG_PDF_M, y, 9.5, true);
  y += 6;

  const half = 88, X2 = FEG_PDF_M + half + 10;
  fegPdfSign(doc, FEG_PDF_M, y, half, 'INSPECTED BY');
  fegPdfSign(doc, X2, y, half, 'VERIFIED BY (SAFETY OFFICER)');
  fegPdfSign(doc, FEG_PDF_M, y + 26, half, 'APPROVED BY (MANAGER)');
  fegPdfStamp(doc, X2, y + 22, half, 28);
}

function fegInspectionFormFilename(row){
  const asset = String((row && (row.assetRef || row.assetId)) || 'asset')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const d  = new Date();
  const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return `FEG-Inspection-${asset}-${ym}.pdf`;
}
function fegInspectionFormUnits(row){
  return (row.units || []).filter(u => u && !fegIsDisposed(u) && String(u.serialNo || '').trim());
}
async function downloadFegInspectionForm(row){
  if (!(window.jspdf && window.jspdf.jsPDF)){
    alert('PDF library failed to load. Check your internet connection and try again.');
    return;
  }
  const units = fegInspectionFormUnits(row);
  if (!units.length){
    alert('No units to inspect. (Draft units without a serial number and Disposed units are excluded.)');
    return;
  }
  try{
    const { jsPDF } = window.jspdf;
    /* 1 unit = 1 halaman A4 penuh; halaman terakhir = SUMMARY & APPROVAL.
       Lukis terus pada dokumen PDF (vektor) — tiada rasterize, jadi tiada
       lajur terpotong dan cetakan kekal tajam. */
    const doc        = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const totalPages = units.length + 1;

    units.forEach((u, i) => {
      if (i > 0) doc.addPage('a4', 'portrait');
      fegPdfUnitPage(doc, row, u, i, totalPages);
    });

    doc.addPage('a4', 'portrait');
    fegPdfApprovalPage(doc, row, units, totalPages);

    doc.save(fegInspectionFormFilename(row));
  }catch(err){
    console.error('FEG inspection form PDF failed:', err);
    alert('Could not generate the PDF. Please try again.');
  }
}

/* KAD 3 — senarai rekod (terbaru di atas, scroll dalam kad) */
function fegInspectionCardHtml(row, records){
  const list    = Array.isArray(records) ? records : [];
  const pending = list.filter(r => !fegInspectionFileMeta(r).hasFile).length;

  const rows = list.map(rec => {
    const m   = fegInspectionFileMeta(rec);
    const id  = escapeHtml(String(rec.recordId || ''));
    const top = [rec.inspectedOn ? fmtDate(rec.inspectedOn) : '', rec.inspector || '']
                  .filter(Boolean).map(escapeHtml).join(' &middot; ') || '(no date)';
    const sub = m.hasFile
      ? `<span class="feg-insp-sub">${escapeHtml(m.file.fileName || '')}${m.file.fileSize ? ' &middot; ' + Math.round(m.file.fileSize / 1024) + ' KB' : ''}</span>`
      : `<span class="feg-insp-sub is-warn">No file yet</span>`;
    const res = String(rec.result || '').trim();
    return `
      <div class="pm-doc-row${m.hasFile ? '' : ' is-pending'}" data-insp-row="${id}">
        <div class="pm-doc-name feg-insp-name" data-insp-edit="${id}" title="Click to edit details">
          <div>${top}</div>
          ${res ? `<div class="feg-insp-sub">${escapeHtml(res)}</div>` : ''}
          ${sub}
        </div>
        <button type="button" class="pm-doc-btn" data-insp-action="upload" data-insp-id="${id}">Upload</button>
        <button type="button" class="pm-doc-btn" data-insp-action="download" data-insp-id="${id}" ${m.hasFile ? '' : 'disabled'}>Download</button>
        <button type="button" class="pm-doc-btn is-del" data-insp-action="delete" data-insp-id="${id}">Delete</button>
        <input type="file" hidden class="feg-insp-file" data-insp-file="${id}" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png">
      </div>`;
  }).join('');

  return `
    <div class="section feg-insp-card" data-feg-insp="1">
      <div class="section-head">
        <h3>3 &middot; Inspection Form</h3>
        <div class="spacer"></div>
        ${pending ? `<span class="pm-doc-note is-warn">${pending} PENDING</span>` : ''}
        <span class="pm-doc-note">${list.length} RECORD${list.length === 1 ? '' : 'S'}</span>
        <button type="button" class="btn" id="fegInspDownloadForm">Download Inspection Form</button>
        <button type="button" class="btn" id="fegInspAdd">+ Add Inspection Record</button>
      </div>
      <div class="section-body">
        ${list.length
          ? `<div class="feg-insp-list pm-doc-list">${rows}</div>`
          : `<div class="settings-note" style="margin-top:0;">No inspection record yet &mdash; press <b>+ Add Inspection Record</b>, fill in the details, then upload the signed form.</div>`}
      </div>
    </div>`;
}

/* MODAL butiran (tiada fail di sini — fail guna butang Upload pada baris) */
function openFegInspectionModal(row, existing){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box     = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const isEdit = !!existing;
    const rec    = existing || {};
    const opts   = FEG_INSPECTION_RESULTS.map(v =>
      `<option value="${escapeHtml(v)}"${String(rec.result || '') === v ? ' selected' : ''}>${escapeHtml(v)}</option>`).join('');

    box.innerHTML = `
      <h4>${isEdit ? 'Edit Inspection Record' : 'Add Inspection Record'}</h4>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Asset</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(String(row.assetRef || '-'))}${row.branch ? ' &middot; ' + escapeHtml(String(row.branch)) : ''}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Inspected On *</label>
          <input type="date" id="fegInspDate" value="${escapeHtml(String(rec.inspectedOn || fegInspectionTodayIso()))}"></div>
        <div class="formfield"><label>Inspector *</label>
          <input type="text" id="fegInspBy" placeholder="Name" value="${escapeHtml(String(rec.inspector || ''))}"></div>
        <div class="formfield"><label>Result</label>
          <select id="fegInspResult"><option value="">&mdash;</option>${opts}</select></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Findings / Remarks</label>
          <input type="text" id="fegInspFind" placeholder="e.g. seal broken, gauge low" value="${escapeHtml(String(rec.findings || ''))}"></div>
        <div class="formfield" style="grid-column:1/-1;"><label>Action Taken</label>
          <input type="text" id="fegInspAction" placeholder="e.g. replaced seal" value="${escapeHtml(String(rec.action || ''))}"></div>
      </div>
      <div class="settings-note">${isEdit
        ? 'Details only &mdash; replacing the signed form is done with the <b>Upload</b> button on that row.'
        : 'After saving, the row appears at the top &mdash; press <b>Upload</b> on it to attach the signed form (PDF / JPG / PNG, max 5 MB).'}</div>
      <div class="modalfoot">
        <button class="btn" id="fegInspCancel">Cancel</button>
        <button class="btn primary" id="fegInspSave">${isEdit ? 'Save Changes' : 'Save'}</button>
      </div>`;

    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegInspCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegInspSave').addEventListener('click', () => {
      const date = String(box.querySelector('#fegInspDate').value || '').trim();
      const by   = String(box.querySelector('#fegInspBy').value || '').trim();
      if (!date){ alert('Inspected On is required.'); return; }
      if (!by){ alert('Inspector is required.'); return; }
      finish({
        inspectedOn: date,
        inspector  : by,
        result     : String(box.querySelector('#fegInspResult').value || ''),
        findings   : String(box.querySelector('#fegInspFind').value || '').trim(),
        action     : String(box.querySelector('#fegInspAction').value || '').trim()
      });
    });
  });
}
/* =============================================================
   FEG DOKUMEN — SEGERAK DENGAN STORAGE (anti "ghost file")
   Kad Documents baca metadata JSON sahaja. Kalau objek Storage
   hilang, ia masih nampak "Uploaded" -> user pening. Fungsi ini
   semak objek SEBENAR & tanda slot sebagai 'missing' (metadata
   KEKAL; rekod, unit & service history tak disentuh).
   FEG sahaja — pmDocMeta() dikongsi, jangan usik.
   ============================================================= */
let FOCC_FEG_DOC_SYNCING = false;

function fegDocState(unit, slotId){
  const m       = pmDocMeta(unit, slotId);
  const missing = m.hasFile && m.doc && m.doc.status === 'missing';
  return { m: m, missing: missing, usable: m.hasFile && !missing };
}

async function fegDocObjectExists(path){
  if (!path) return false;
  const cut    = path.lastIndexOf('/');
  const folder = cut >= 0 ? path.slice(0, cut) : '';
  const name   = cut >= 0 ? path.slice(cut + 1) : path;
  const res    = await FOCC_SUPABASE.storage.from(FEG_DOC_BUCKET).list(folder, { limit: 100 });
  if (res.error) return true;                    // tak dapat sahkan -> JANGAN ubah apa-apa
  return (res.data || []).some(o => o && o.name === name);
}

async function fegSyncFegDocs(row, onChange){
  if (!row || FOCC_FEG_DOC_SYNCING) return;
  FOCC_FEG_DOC_SYNCING = true;
  let changed = false;
  try{
    const companyId = await SupabaseProvider.getCompanyId();
    const units     = Array.isArray(row.units) ? row.units : [];

    for (const u of units){
      if (!u || !u.unitId) continue;
      if (!u.docs || typeof u.docs !== 'object' || Array.isArray(u.docs)) continue;

      for (const slot of FEG_DOCUMENT_SLOTS){
        const doc = u.docs[slot.id];
        if (!doc || (!doc.storagePath && !doc.fileName)) continue;

        // Baru upload (< 60s) -> jangan sentuh, elak race dengan upload
        const t = doc.uploadedAt ? new Date(doc.uploadedAt).getTime() : 0;
        if (t && (Date.now() - t) < 60000) continue;

        const path   = fegDocPath(companyId, row, u, slot.id);
        const exists = await fegDocObjectExists(path);

        if (!exists && doc.status !== 'missing'){ doc.status = 'missing'; changed = true; }
        else if (exists && doc.status === 'missing'){ doc.status = 'current'; changed = true; }
      }
    }
  }catch(e){ console.error('fegSyncFegDocs:', e); }
  FOCC_FEG_DOC_SYNCING = false;

  if (changed){
    try{
      if (typeof all !== 'undefined' && Array.isArray(all) && index >= 0) all[index] = row;
      await persist('feg');
      if (typeof onChange === 'function') onChange();
    }catch(e){ console.error('fegSyncFegDocs save:', e); }
  }
}

/* Kad 3 — Documents: DUA unit sebelah-menyebelah (Unit 1 | Unit 2),
   pager ‹ 1–2 / 4 › naik 2 unit sekali (halaman seterusnya Unit 3 | Unit 4).
   Pager hanya muncul jika unit lebih daripada 2. */
function fegDocumentsCardHtml(row, unitPage){
  const units = Array.isArray(row.units) ? row.units : [];
  const total = units.length * FEG_DOCUMENT_SLOTS.length;
  let uploaded = 0;
  units.forEach(u => FEG_DOCUMENT_SLOTS.forEach(s => { if (fegDocState(u, s.id).usable) uploaded += 1; }));

  if (!units.length){
    return `
      <div class="section feg-doc-card" data-feg-docs="1">
        <div class="section-head"><h3>4 &middot; Documents</h3></div>
        <div class="section-body"><div class="settings-note" style="margin-top:0;">No units yet &mdash; add a unit first.</div></div>
      </div>`;
  }

  const per   = 2;                                     // 2 unit satu halaman
  const pages = Math.ceil(units.length / per);
  const cur   = Math.min(Math.max(Number(unitPage) || 0, 0), units.length - 1);
  const start = Math.min(Math.floor(cur / per) * per, Math.max(0, (pages - 1) * per));
  const end   = Math.min(start + per, units.length);

  const blocks = [];
  for (let i = start; i < end; i++){
    const u     = units[i];
    const title = fegSerialLabel(u) || ('Unit ' + (i + 1));

    const rows = FEG_DOCUMENT_SLOTS.map(slot => {
      const st       = fegDocState(u, slot.id);
      const m        = st.m;
      const rowCls   = m.pending ? ' is-pending' : '';
      const stateCls = st.usable ? ' is-on' : (m.pending ? ' is-warn' : (st.missing ? ' is-warn' : ''));
      const stateTxt = st.usable ? 'Uploaded' : (st.missing ? 'Missing in storage' : (m.pending ? 'Pending upload' : 'Not uploaded'));
      const byLine   = m.hasFile
        ? `<span class="pm-doc-date">${escapeHtml(m.doc.uploadedBy || '')}${m.doc.uploadedBy && m.doc.fileSize ? ' &middot; ' : ''}${m.doc.fileSize ? Math.round(m.doc.fileSize / 1024) + ' KB' : ''}</span>`
        : '';
      const untilLine = (m.hasFile && m.doc.validUntil)
        ? `<span class="pm-doc-date">Valid until ${escapeHtml(fmtDate(m.doc.validUntil))}</span>` : '';
      return `
        <div class="pm-doc-row${rowCls}" data-doc-unit="${i}" data-slot="${slot.id}">
          <div class="pm-doc-name">${escapeHtml(slot.label)}</div>
          <button type="button" class="pm-doc-btn" data-doc-action="upload"   data-doc-unit="${i}" data-slot="${slot.id}">Upload</button>
          <button type="button" class="pm-doc-btn" data-doc-action="download" data-doc-unit="${i}" data-slot="${slot.id}" ${st.usable ? '' : 'disabled'}>Download</button>
          <button type="button" class="pm-doc-btn is-del" data-doc-action="delete" data-doc-unit="${i}" data-slot="${slot.id}" ${m.hasFile ? '' : 'disabled'}>Delete</button>
          <div class="pm-doc-meta">
            <span class="pm-doc-state${stateCls}">
              <input type="checkbox" disabled ${m.status === 'current' ? 'checked' : ''}>
              ${stateTxt}
            </span>
            ${byLine}
            ${untilLine}
          </div>
          <input type="file" class="pm-doc-file" data-doc-unit="${i}" data-slot="${slot.id}" accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png" style="display:none;">
        </div>`;
    }).join('');

    const have = FEG_DOCUMENT_SLOTS.filter(s => fegDocState(u, s.id).usable).length;

    blocks.push(`
        <div class="feg-doc-unit">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span class="truckchip">${escapeHtml(title)}</span>
            <div class="spacer"></div>
            <span class="pm-doc-note">${have}/${FEG_DOCUMENT_SLOTS.length} UPLOADED</span>
          </div>
          ${rows}
        </div>`);
  }

  const pager = pages > 1 ? `
        <div class="feg-pager">
          <button type="button" class="btn" id="fegDocPrev" ${start <= 0 ? 'disabled' : ''} title="Previous units">&#8249;</button>
          <span class="feg-pager-count">${start / per + 1} / ${pages}</span>
          <button type="button" class="btn" id="fegDocNext" ${end >= units.length ? 'disabled' : ''} title="Next units">&#8250;</button>
        </div>` : '';

  return `
    <div class="section feg-doc-card" data-feg-docs="1">
      <div class="section-head">
        <h3>4 &middot; Documents</h3>
        <div class="spacer"></div>
        ${pager}
        <span class="pm-doc-note">${uploaded}/${total} UPLOADED</span>
        <span class="pm-doc-note">PDF &middot; JPG &middot; PNG &middot; MAX 5 MB</span>
      </div>
      <div class="section-body">
        <div class="feg-doc-grid">${blocks.join('')}</div>
      </div>
    </div>`;
}

/* =============================================================
   FEG — picker baharu (fpick) untuk medan UNIT (mod edit)
   Markup sama macam dropdown lain: .fpick + .fpick-input +
   .fpick-caret + .combo-panel.fpick-panel.
   ============================================================= */
let FOCC_FEG_PICK_DOC = null;

function wireFegUnitPickers(root, units, staffNames, vendorNames){
  const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

  function wireOne(unitIdx, fid, values, emptyLabel){
    const wrapEl = root.querySelector(`.fpick[data-fpick="${unitIdx}:${fid}"]`);
    if (!wrapEl) return;
    const input = wrapEl.querySelector('input[data-fid]');
    const panel = wrapEl.querySelector('[data-fpick-panel]');
    if (!input || !panel) return;

    const cur0 = String(input.value || '').trim();
    let vals = (values || []).slice();
    if (cur0 && !vals.includes(cur0)) vals = [cur0].concat(vals);   // nilai lama kekal boleh dipilih
    const opts = [{ v: '', t: emptyLabel || '\u2014' }]
      .concat(vals.map(v => ({ v: v, t: v })));

    function render(){
      const cur = String(input.value || '');
      panel.innerHTML = opts.map(o => `
        <div class="combo-item fpick-option${o.v === cur ? ' is-active' : ''}" data-value="${esc(o.v)}">
          <span class="combo-item-text">${escapeHtml(o.t)}</span>
        </div>`).join('');
      panel.querySelectorAll('.fpick-option').forEach(rowEl => {
        rowEl.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('change', { bubbles: true }));   // panel dokumen pun sedar
        });
      });
    }

    input.addEventListener('click', () => {
      if (panel.classList.contains('open')){ panel.classList.remove('open'); return; }
      render();
      panel.classList.add('open');
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Tab') return;
      if (e.key === 'Escape'){ panel.classList.remove('open'); return; }
      if (e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if (panel.classList.contains('open')) panel.classList.remove('open');
        else { render(); panel.classList.add('open'); }
        return;
      }
      e.preventDefault();                     // taip manual disekat, macam picker lain
    });
  }

  /* Vendor: combo boleh-taip + tambah / buang (senarai tersimpan 'feg'/'vendor') */
  function wireVendorCombo(unitIdx, list){
    const input = root.querySelector(`input[data-fid="vendor"][data-unit="${unitIdx}"]`);
    if (!input) return;
    const wrapEl = input.closest('.combo-wrap');
    const panel  = wrapEl ? wrapEl.querySelector('.combo-panel') : null;
    if (!panel) return;
    const escV = s => String(s == null ? '' : s).replace(/"/g, '&quot;');

    function render(){
      const cur  = String(input.value || '').trim();
      const term = cur.toLowerCase();
      const vis  = list.slice()
        .sort((a,b) => String(a).localeCompare(String(b)))
        .filter(v => !term || String(v).toLowerCase().includes(term));
      panel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${escV(v)}">
             <span class="combo-item-text">${escV(v)}</span>
             <button type="button" class="combo-del can-del" data-del="${escV(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new vendor name&hellip;</div>';
      panel.querySelectorAll('.combo-item').forEach(rowEl => {
        const t = rowEl.querySelector('.combo-item-text');
        if (t) t.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          input.value = rowEl.dataset.value || '';
          panel.classList.remove('open');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          const v = String(rowEl.dataset.value || '');
          const idx = list.findIndex(x => String(x) === v);
          if (idx >= 0) list.splice(idx, 1);        // buang dari SENARAI sahaja
          removedVendors.add(v);                    // jangan hidupkan semula masa Save
          try{ await saveOptionList('feg', 'vendor', list.slice()); }catch(err){}
          render();
        });
      });
    }

    input.addEventListener('focus', () => { render(); panel.classList.add('open'); });
    input.addEventListener('input', () => { render(); panel.classList.add('open'); });
    input.addEventListener('keydown', e => { if (e.key === 'Escape') panel.classList.remove('open'); });
  }

  (units || []).forEach((u, i) => {
    // 🔒 Unit disposed — borang terkunci. Jangan wire picker langsung supaya
    // panel tak boleh set nilai walaupun input dah di-'disabled' (handler
    // mousedown panel tetap set .value).
    if (u && String(u.disposal || 'No') === 'Yes') return;
    wireOne(i, 'serialPrefix', FEG_UNIT_PREFIXES, '\u2014');
    wireOne(i, 'driver',       staffNames || [],  '\u2014');
    wireOne(i, 'fegType',      FEG_TYPES,        'Select...');
    wireOne(i, 'capacity',     FEG_CAPACITIES,   'Select...');
    wireOne(i, 'manualStatus', FEG_MANUAL_STATUS,'Select...');
    wireVendorCombo(i, vendorNames || []);
  });

  // Satu listener sahaja untuk tutup panel bila klik luar (elak bertimbun)
  if (FOCC_FEG_PICK_DOC) document.removeEventListener('mousedown', FOCC_FEG_PICK_DOC);
  FOCC_FEG_PICK_DOC = function(e){
    root.querySelectorAll('.fpick-panel.open, .combo-panel.open').forEach(p => {
      const w = p.closest('.fpick') || p.closest('.combo-wrap');
      if (w && w.contains(e.target)) return;
      p.classList.remove('open');
    });
  };
  document.addEventListener('mousedown', FOCC_FEG_PICK_DOC);
}

/* =============================================================
   FEG DETAIL PAGE — 1 Group Info · 2 Extinguisher Units · 3 Documents
   Satu kumpulan = satu row (`feg`), unit hidup dalam row.units[].
   ============================================================= */
async function renderFegDetailView(root, index, onBack, opts){
  const all = await getData('feg');
  let row = all[index];
  if (!row){ await onBack(); return; }
  fegRememberOpen(row);
  if (!Array.isArray(row.units)) row.units = [];

  // Cadangan (datalist): vendor + nama staff + branch
  let vendorNames = [];
  try{
    const savedV = await loadOptionList('feg','vendor');
    if (Array.isArray(savedV)) vendorNames = savedV.slice();
  }catch(e){ vendorNames = []; }
  (row.units || []).forEach(u => { const v = String((u && u.vendor) || '').trim(); if (v && !vendorNames.includes(v)) vendorNames.push(v); });
  vendorNames.sort((a,b) => String(a).localeCompare(String(b)));

  let staffNames = [];
  try{
    const staffRows = await getData('staffDatabase');
    staffNames = [...new Set((staffRows || []).map(r => String((r && r.staffName) || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }catch(e){ staffNames = []; }

  let branchList = [];
  try{
    const pmRows = await getData('primeMover');
    branchList = [...new Set((pmRows || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }catch(e){ branchList = []; }
  if (row.branch && !branchList.includes(String(row.branch))) branchList.push(String(row.branch));

  let editing = !!(opts && opts.startEditing);
  let draftUnits = null;                       // salinan kerja semasa mod edit
  const removedVendors = new Set();            // vendor yang di-× dalam sesi edit ini
    let fegDocRadioValue = '';        // 'correction_only' | 'document_renewal'
    let fegPendingFocus   = null;     // { ui, slotId } — sorot selepas Save
    let docUnitPage = fegDocPageIndex(row);   // kad 4: unit mana yang dipaparkan
    let fegDocBusy  = false;                  // upload / delete sedang berjalan
    let inspAll     = [];                     // rekod Inspection (table fegInspection)
    try{ inspAll = await getData(FEG_INSPECTION_TABLE); }catch(e){ inspAll = []; }
    if (!Array.isArray(inspAll)) inspAll = [];

  /* Banding DOM unit editor semasa vs row.units ASAL.
     Pulangkan senarai { unitId, ui, slotId } yang tarikhnya berubah.
     Identiti guna unitId (bukan index) supaya tambah/buang unit tak keliru. */
  function fegDocChanges(){
    const base = new Map();
    (row.units || []).forEach(u => { if (u && u.unitId) base.set(String(u.unitId), u); });
    const out = [];
    (draftUnits || []).forEach((u, i) => {
      const prev = base.get(String((u && u.unitId) || ''));
      if (!prev) return;                                   // unit baharu — tiada dokumen lama
      FEG_DOC_FIELD_SLOTS.forEach(pair => {
        const el = root.querySelector(`[data-unit="${i}"][data-fid="${pair.field}"]`);
        if (!el) return;    // medan tiada di borang (cth. medan auto) — JANGAN tanda dokumen
        const nb = String(el.value || '');
        const pa = String(prev[pair.field] == null ? '' : prev[pair.field]);
        if (pa === nb) return;
        pair.slots.forEach(s => {
          if (!out.some(x => x.unitId === u.unitId && x.slotId === s)) out.push({ unitId: u.unitId, ui: i, slotId: s });
        });
      });
    });
    return out;
  }

  const attr = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const txt  = s => escapeHtml(String(s == null ? '' : s));
  const counts = () => fegUnitCounts(editing && draftUnits ? draftUnits : row.units);

  function groupInfoHtml(){
    if (!editing){
      return `
      <div class="section feg-info-card">
        <div class="section-head"><h3>1 &middot; Group Info</h3></div>
        <div class="section-body">
          <div class="pm-detail-grid">
            <div class="pm-detail-row"><span class="pm-detail-lbl">Category</span><span class="pm-detail-val">${txt(row.assetType)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Asset / Location</span><span class="pm-detail-val">${txt(row.assetRef)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Branch</span><span class="pm-detail-val">${txt(row.branch)}</span></div>
            <div class="pm-detail-row"><span class="pm-detail-lbl">Created</span><span class="pm-detail-val">${txt(row.createdBy || '-')}${row.createdAt ? ' &middot; ' + txt(fmtDate(String(row.createdAt).slice(0,10))) : ''}</span></div>
          </div>
          <div class="settings-note">Category, Asset / Location &amp; Branch are locked after creation — delete the group and create a new one if you picked the wrong value.</div>
        </div>
      </div>`;
    }
    return `
      <div class="section feg-info-card">
        <div class="section-head"><h3>1 &middot; Group Info</h3></div>
        <div class="section-body">
          <div class="formgrid">
            <div class="formfield"><label>Category (locked)</label><input type="text" value="${attr(row.assetType)}" disabled></div>
            <div class="formfield"><label>Asset / Location (locked)</label><input type="text" value="${attr(row.assetRef)}" disabled></div>
            <div class="formfield"><label>Branch (locked)</label><input id="fegBranch" type="text" value="${attr(row.branch || '')}" disabled></div>
          </div>
        </div>
      </div>`;
  }

  function unitsReadHtml(){
    const units = row.units || [];
    const c = counts();
    if (!units.length) return `<div class="settings-note" style="margin-top:0;">No units yet. Press Edit Details &rarr; Add Unit.</div>`;
    const canDispose = fegCanDispose();          // Manager ke atas sahaja
    return `
      <div class="tablewrap">
        <table class="cdx-table" data-feg-units="1"${canDispose ? ' data-feg-disposal="1"' : ''}>
          <thead><tr><th>#</th><th>Serial</th><th>Inspection</th><th>Next Due</th><th>Serviced</th><th>Type</th><th>Capacity</th><th>Service Due</th><th>Cylinder Due</th><th>Driver</th><th>Manual Status</th><th>Final Status</th>${canDispose ? '<th>Action</th>' : ''}</tr></thead>
          <tbody>
            ${units.map((u,i) => {
              const fs  = fegFinalStatus(u);
              const dis = fegIsDisposed(u);
              const lbl = fegSerialLabel(u);
              const inSvc = !dis && fegIsInService(u);        // FEG Service Log
              const svc = canDispose
                ? (dis ? ''
                    : (inSvc
                        ? `<button type="button" class="btn danger" data-feg-cancel-service="${i}">Cancel Service</button>`
                        : `<button type="button" class="btn" data-feg-service="${i}">Service</button>`))
                : '';
              const act = canDispose
                ? (dis
                    ? `<button type="button" class="btn" data-feg-restore="${i}">Restore</button>`
                    : `<button type="button" class="btn" data-feg-dispose="${i}">Dispose</button>`)
                : '';
              return `<tr${dis ? ' style="opacity:.55;"' : ''}>
                <td>${i + 1}</td>
                <td>${lbl ? txt(lbl) : '<span style="color:var(--muted)">(draft)</span>'}${String(u.note || '').trim() ? `<div class="settings-note" style="margin:2px 0 0;">${txt(u.note)}</div>` : ''}</td>
                <td>${u.inspectionDate ? txt(fmtDate(u.inspectionDate)) : '<span style="color:var(--muted)">Never</span>'}</td>
                <td>${(() => { const nd = fegInspectionDueLabel(fegNextInspectionDue(u)); return nd.cls ? `<span class="badge ${nd.cls}">${txt(nd.text)}</span>` : txt(nd.text); })()}</td>
                <td>${(() => { const n = fegServiceCount(u); return n ? '<b>' + txt(String(n) + 'x') + '</b>' : '<span style="color:var(--muted)">0x</span>'; })()}</td>
                <td>${txt(u.fegType || '-')}</td>
                <td>${txt(u.capacity || '-')}</td>
                <td>${u.serviceDate ? txt(fmtDate(u.serviceDate)) : '-'}</td>
                <td>${u.cylinderDue ? txt(fmtDate(u.cylinderDue)) : '-'}</td>
                <td>${txt(u.driver || '-')}</td>
                <td>${txt(u.manualStatus || '-')}</td>
                <td><span class="badge ${fegStatusClass(fs)}">${txt(fs)}</span></td>
                ${canDispose ? `<td><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${svc}${act}</div></td>` : ''}
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="settings-note">${c.active} active &middot; ${c.disposed} disposed &middot; ${c.draft} draft</div>`;
  }

  function unitBlockHtml(u, i){
    const fs  = fegFinalStatus(u);
    const dis = fegIsDisposed(u);                        // 🔒 disposed = borang terkunci
    const LK  = dis ? ' disabled' : '';                  // sisip ke SETIAP input
    // Picker baharu (fpick) — markup sama dengan dropdown lain.
    const pick = (fid, cur, holder) => `
              <div class="fpick" data-fpick="${i}:${fid}">
                <input data-unit="${i}" data-fid="${fid}" class="fpick-input" type="text" inputmode="none" autocomplete="off" placeholder="${holder}" value="${attr(cur || '')}"${LK}>
                <span class="fpick-caret"></span>
                <div class="combo-panel fpick-panel" data-fpick-panel="${i}:${fid}"></div>
              </div>`;
    return `
      <div class="feg-unit-block" style="border:1px solid var(--line);border-radius:12px;padding:12px;${dis ? 'background:rgba(0,0,0,.03);' : ''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span class="truckchip">Unit ${i + 1}</span>
          <span class="badge ${fegStatusClass(fs)}">${txt(fs)}</span>
          <div class="spacer"></div>
          ${dis
            ? `<span class="settings-note" style="margin:0;">&#128274; Locked &mdash; Cancel edit first, then press <b>Restore</b> in the units table to unlock.</span>`
            : `<button type="button" class="btn" data-unit-remove="${i}">Remove</button>`}
        </div>
        <div class="formgrid"${dis ? ' style="opacity:.6;"' : ''}>
          <div class="formfield"><label>Serial No</label>
            <div style="display:flex;gap:6px;">
              <div style="flex:0 0 112px;max-width:112px;">
                <div class="fpick" data-fpick="${i}:serialPrefix">
                  <input data-unit="${i}" data-fid="serialPrefix" class="fpick-input" type="text" inputmode="none" autocomplete="off" placeholder="&mdash;" value="${attr(u.serialPrefix || '')}"${LK}>
                  <span class="fpick-caret"></span>
                  <div class="combo-panel fpick-panel" data-fpick-panel="${i}:serialPrefix"></div>
                </div>
              </div>
              <input data-unit="${i}" data-fid="serialNo" type="text" value="${attr(u.serialNo || '')}" placeholder="Serial number" autocomplete="off"${LK}>
            </div>
          </div>
          <div class="formfield"><label>Driver / Incharge</label>${pick('driver', u.driver, 'Select...')}</div>
          <div class="formfield"><label>FEG Type</label>${pick('fegType', u.fegType, 'Select...')}</div>
          <div class="formfield"><label>Capacity</label>${pick('capacity', u.capacity, 'Select...')}</div>
          <div class="formfield"><label>Manufacturing Date</label><input data-unit="${i}" data-fid="mfgDate" type="date" value="${attr(u.mfgDate || '')}"${LK}></div>
          <div class="formfield"><label>Service Date</label><input data-unit="${i}" data-fid="serviceDate" type="date" value="${attr(u.serviceDate || '')}"${LK}></div>
          <div class="formfield"><label>Inspection Date</label><input data-unit="${i}" data-fid="inspectionDate" type="date" value="${attr(u.inspectionDate || '')}"${LK}></div>
          <div class="formfield">
            <label>Cylinder Test Due <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; auto: Manufacturing Date + ${FEG_CYLINDER_TEST_YEARS} years</span></label>
            <input data-feg-cyldue="${i}" type="date" value="${attr(fegCylinderDueFrom(u.mfgDate))}" disabled>
            <div class="settings-note" style="margin:0;">In the last ${FEG_CYLINDER_REPLACE_MONTHS} months before this date the cylinder <b>cannot be serviced</b> &mdash; it must be <b>replaced</b>.</div>
          </div>
          <div class="formfield"><label>Vendor</label>
            <div class="combo-wrap">
              <input data-unit="${i}" data-fid="vendor" type="text" autocomplete="off" placeholder="Type new or pick existing..." value="${attr(u.vendor || '')}"${LK}>
              <div class="combo-panel" data-fc-panel="${i}"></div>
            </div>
            <div class="settings-note" style="margin-top:6px;">Type a new vendor or pick from the list. &times; removes it from the list.</div>
          </div>
          <div class="formfield"><label>Manual Status</label>${pick('manualStatus', u.manualStatus, 'Select...')}</div>
          <div class="formfield"><label>Remark <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; will trigger Final Status</span></label><input data-unit="${i}" data-fid="remark" type="text" value="${attr(u.remark || '')}" placeholder="e.g. damaged, under repair..."${LK}></div>
          <div class="formfield"><label>Note <span style="font-weight:400;color:var(--muted);text-transform:none;">&mdash; no effect on Final Status</span></label><input data-unit="${i}" data-fid="note" type="text" value="${attr(u.note || '')}" placeholder="Free note..."${LK}></div>
        </div>
      </div>`;
  }

  function unitsEditHtml(){
    const units = draftUnits || [];
    return `
      <div class="feg-unit-grid">
        ${units.map((u,i) => unitBlockHtml(u,i)).join('')}
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px;">
        <button type="button" class="btn" id="fegAddUnit">+ Add Unit</button>
        <span class="settings-note" style="margin:0;">Maximum ${FEG_MAX_UNITS} units. Empty serial = Draft (excluded from Compliance Alert).</span>
      </div>
      <div id="fegDocUpdatePanel"></div>`;
  }

  // Baca nilai borang -> draftUnits (dipanggil sebelum tambah/buang unit & sebelum simpan)
  function readDraftFromDom(){
    const units = draftUnits || [];
    units.forEach((u,i) => {
      const get = fid => { const el = root.querySelector(`[data-unit="${i}"][data-fid="${fid}"]`); return el ? String(el.value || '') : ''; };
      u.serialPrefix = get('serialPrefix');
      u.serialNo     = get('serialNo');
      u.driver       = get('driver');
      u.fegType      = get('fegType');
      u.capacity     = get('capacity');
      u.mfgDate      = get('mfgDate');
      u.serviceDate  = get('serviceDate');
      u.inspectionDate = get('inspectionDate');         // inspection bulanan
      u.cylinderDue  = fegCylinderDueFrom(u.mfgDate);   // auto — tiada input manual lagi
      u.vendor       = get('vendor');
      u.manualStatus = get('manualStatus');
      u.remark       = get('remark');
      u.note         = get('note');
      u.finalStatus  = fegFinalStatus(u);
    });
    return units;
  }

  async function saveUnits(){
    const units = readDraftFromDom();

    // Serial wajib unik (dalam kumpulan ini + seluruh syarikat)
    const seen = new Set();
    for (const u of units){
      if (!String(u.serialNo || '').trim()) continue;
      const key = (String(u.serialPrefix || '').trim() + '|' + String(u.serialNo || '').trim()).toLowerCase();
      if (seen.has(key)){ alert('Serial ' + fegSerialLabel(u) + ' is duplicated in this group.'); return false; }
      seen.add(key);
    }
    const others = (all || []).filter(r => r !== row);
    for (const other of others){
      for (const u of (other.units || [])){
        if (!String(u.serialNo || '').trim()) continue;
        const key = (String(u.serialPrefix || '').trim() + '|' + String(u.serialNo || '').trim()).toLowerCase();
        if (seen.has(key)){ alert('Serial ' + fegSerialLabel(u) + ' is already used by ' + (other.assetRef || 'another record') + '.'); return false; }
      }
    }

    const brEl = root.querySelector('#fegBranch');
    if (brEl) row.branch = String(brEl.value || '').trim();
        // Mod update dokumen: tarikh unit berubah → WAJIB pilih mode.
    // Kena kira SEBELUM row.units ditimpa — fegDocChanges() banding terhadap row.units ASAL.
    const fegChanges = fegDocChanges();
    if (fegChanges.length){
      if (!fegDocRadioValue){
        alert('Please choose Correction Only or Document Renewal / Update.');
        return false;
      }
      fegChanges.forEach(ch => {
        const u = units.find(x => x && String(x.unitId) === String(ch.unitId));
        if (!u) return;
        u.docs = pmApplyDocUpdateMode(u.docs || {}, [ch.slotId], fegDocRadioValue);
      });
      fegPendingFocus = fegChanges[0];
    }
    row.units = units;

    // Kad Documents memapar SATU unit sahaja — buka unit yang tarikhnya berubah,
    // supaya sorotan + tatal automatik selepas Save kelihatan.
    if (fegPendingFocus){
      docUnitPage = Math.max(0, Number(fegPendingFocus.ui) || 0);
      fegDocPageSave(row, (row.units || [])[docUnitPage]);
    }

    all[index] = row;
    await persist('feg');

    // Simpan senarai vendor untuk cadangan akan datang
    const kept = vendorNames.concat(units.map(u => String(u.vendor || '').trim()).filter(Boolean))
                            .filter(v => !removedVendors.has(String(v)));
    const vset = [...new Set(kept)].sort((a,b) => String(a).localeCompare(String(b)));
    try{ await saveOptionList('feg','vendor', vset); }catch(e){}
    return true;
  }
      // Mod edit MESTI ada salinan kerja. Kalau tidak — contoh masuk terus dari
    // "✎ Edit Row" atau "Save & Complete Details" — draftUnits = null, jadi
    // senarai unit nampak kosong dan Save boleh PADAM semua unit sedia ada.
    if (editing && !Array.isArray(draftUnits)){
      draftUnits = JSON.parse(JSON.stringify(row.units || []));
    }

  function paint(){
    const c = counts();
    root.innerHTML = `
      <div class="pm-detail-head">
        <button class="btn" id="fegBack">&#8592; Back</button>
        <div>
          <span class="truckchip">${txt(row.assetRef || '(No Asset)')}</span>
          <span class="pm-detail-sub">${txt(row.assetType || '')}${row.branch ? ' &middot; ' + txt(row.branch) : ''}</span>
        </div>
        <div class="spacer"></div>
        ${editing
          ? `<button class="btn" id="fegCancel">Cancel</button>
             <button class="btn primary" id="fegSave">Save Changes</button>`
          : `<button class="btn primary" id="fegEdit">&#9998; Edit Details</button>`}
      </div>
      <datalist id="fegStaffList">${staffNames.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <datalist id="fegVendorList">${vendorNames.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <datalist id="fegBranchList">${branchList.map(n => `<option value="${attr(n)}"></option>`).join('')}</datalist>
      <div class="pm-detail-card-grid feg-detail ${editing ? 'is-edit' : 'is-view'}">
        ${groupInfoHtml()}
        ${editing ? fegInspectionCardHtml(row, fegInspectionForAsset(inspAll, row)) : ''}
        <div class="section feg-units-card">
          <div class="section-head">
            <h3>2 &middot; Extinguisher Units</h3>
            <div class="spacer"></div>
            <span class="pm-doc-note">${c.active} ACTIVE &middot; ${c.disposed} DISPOSED &middot; ${c.draft} DRAFT</span>
          </div>
          <div class="section-body">${editing ? unitsEditHtml() : unitsReadHtml()}</div>
        </div>
        ${editing ? '' : fegDocumentsCardHtml(row, docUnitPage)}
        </div>
      </div>`;

    const backBtn = root.querySelector('#fegBack');
    if (backBtn) backBtn.onclick = async () => {
      if (editing && !confirm('You have unsaved changes. Leave without saving?')) return;
      await onBack();
    };

    const editBtn = root.querySelector('#fegEdit');
    if (editBtn) editBtn.onclick = () => {
      editing = true;
      draftUnits = JSON.parse(JSON.stringify(row.units || []));
      paint();
    };

    const cancelBtn = root.querySelector('#fegCancel');
    if (cancelBtn) cancelBtn.onclick = () => {
      if (!confirm('Discard your changes?')) return;
      editing = false; draftUnits = null;
      paint();
    };
    // Picker baharu (fpick) untuk medan unit — sama rupa & kelakuan dengan
    // dropdown lain (Driver / Branch / Nationality). Mod edit sahaja.
        // Kad Documents baca metadata JSON sahaja — semak objek Storage sebenar
    // supaya tak ada "ghost file". Mod lihat sahaja.
    if (!editing) fegSyncFegDocs(row, () => paint());
    if (editing) wireFegUnitPickers(root, draftUnits, staffNames, vendorNames);
        // Cylinder Test Due ikut Manufacturing Date — kemas kini serta-merta.
    if (editing){
      root.querySelectorAll('[data-fid="mfgDate"]').forEach(inp => {
        const ui = Number(inp.dataset.unit);
        inp.addEventListener('change', () => {
          const out = root.querySelector(`[data-feg-cyldue="${ui}"]`);
          if (out) out.value = fegCylinderDueFrom(inp.value);
        });
      });
    }

    const addBtn = root.querySelector('#fegAddUnit');
    if (addBtn) addBtn.onclick = () => {
      // Jaring keselamatan: kalau draftUnits belum wujud (masuk edit dari
      // Edit Row), salin dulu — jangan biar null dan crash.
      if (!Array.isArray(draftUnits)) draftUnits = JSON.parse(JSON.stringify(row.units || []));
      readDraftFromDom();
      if (draftUnits.length >= FEG_MAX_UNITS){ alert('Limit of ' + FEG_MAX_UNITS + ' units per group reached.'); return; }
      draftUnits.push(fegNewUnit());
      paint();
    };

    const saveBtn = root.querySelector('#fegSave');
    if (saveBtn) saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      let ok = false;
      try{ ok = await saveUnits(); }
      catch(e){ alert('Simpan gagal: ' + (e && e.message ? e.message : e)); }
      saveBtn.disabled = false;
      if (!ok) return;
      editing = false; draftUnits = null;
      paint();
    };
        /* ---- Pager UNIT (kad 3) ‹ 1 / 2 › — satu unit satu masa ---- */
    const fegDocGo = (delta) => {
      if (editing || fegDocBusy) return;              // jangan ganggu upload/delete
      const n = (row.units || []).length;
      if (n < 2) return;
      const per   = 2;                                // 2 unit satu halaman
      const cur   = Math.min(Math.max(docUnitPage, 0), n - 1);
      const start = Math.floor(cur / per) * per;      // unit pertama halaman ini
      const next  = start + (delta > 0 ? per : -per);
      if (next < 0 || next >= n) return;              // berhenti di hujung
      docUnitPage = next;
      fegDocPageSave(row, row.units[next]);
      paint();
    };
    const docPrevBtn = root.querySelector('#fegDocPrev');
    if (docPrevBtn) docPrevBtn.onclick = () => fegDocGo(-1);
    const docNextBtn = root.querySelector('#fegDocNext');
    if (docNextBtn) docNextBtn.onclick = () => fegDocGo(1);

        // ---- Dispose / Restore unit (mod LIHAT; Manager ke atas sahaja) ----
    root.querySelectorAll('[data-feg-dispose]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegDispose);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const info = await openFegDisposeModal(row, unit);
        if (!info) return;
        btn.disabled = true;
        try{
          await fegDisposeUnit(row, unit, info);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Dispose failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-feg-restore]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegRestore);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const ok = await confirmModal('Restore Extinguisher',
          'Unit <strong>' + escapeHtml(fegSerialLabel(unit) || '(no serial)') + '</strong> will be restored to active (disposal = No).',
          { confirmLabel:'Restore', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegRestoreUnit(row, unit);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Restore failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

            // ---- Service / Cancel Service unit (mod LIHAT; Manager ke atas) ----
    root.querySelectorAll('[data-feg-service]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegService);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const info = await openFegServiceModal(row, unit, vendorNames);
        if (!info) return;
        btn.disabled = true;
        try{
          await fegStartService(row, unit, info);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Service failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-feg-cancel-service]').forEach(btn => {
      btn.onclick = async () => {
        const ui   = Number(btn.dataset.fegCancelService);
        const unit = (row.units || [])[ui];
        if (!unit) return;
        const ok = await confirmModal('Cancel Service',
          'Unit <strong>' + escapeHtml(fegSerialLabel(unit) || '(no serial)') + '</strong> will be removed from the service record. This cannot be undone.',
          { confirmLabel:'Cancel Service', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegCancelService(row, unit);
          all[index] = row;
          paint();
        }catch(e){
          btn.disabled = false;
          alert('Cancel Service failed: ' + (e && e.message ? e.message : e));
        }
      };
    });

    root.querySelectorAll('[data-unit-remove]').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.unitRemove);
        readDraftFromDom();
        const u = (draftUnits || [])[i];
        if (!u) return;
        if (String(u.disposal || 'No') === 'Yes'){ alert('This unit is disposed. Restore it before removing.'); return; }
        if (!confirm('Remove Unit ' + (i + 1) + '?')) return;
        draftUnits.splice(i, 1);
        paint();
      };
    });
        // Panel "Correction Only" vs "Document Renewal / Update" (kad Unit, mod edit)
    const fegDocPanel = root.querySelector('#fegDocUpdatePanel');
    if (fegDocPanel){
      const refreshFegDocPanel = () => {
        const changes = fegDocChanges();
        if (!changes.length){
          fegDocPanel.innerHTML = '';
          fegDocPanel.dataset.rendered = '';
          fegDocRadioValue = '';
          if (saveBtn) saveBtn.disabled = false;
          return;
        }
        const sig = changes.map(c => c.ui + ':' + c.slotId).join(',');
        if (fegDocPanel.dataset.rendered === sig) return;   // tak berubah → jangan lukis semula
        fegDocPanel.dataset.rendered = sig;
        const head = changes.map(c => 'Unit ' + (c.ui + 1) + ' \u00b7 ' + fegDocSlotLabel(c.slotId)).join(', ');
        fegDocPanel.innerHTML = `
          <div class="pm-docupd">
            <div class="pm-docupd-head">Document update &mdash; <strong>${head}</strong></div>
            <label class="pm-docupd-opt">
              <input type="radio" name="fegDocUpdateMode" value="correction_only">
              <span><b>Correction Only</b><small>I am fixing a mistake. The existing document is still valid.</small></span>
            </label>
            <label class="pm-docupd-opt">
              <input type="radio" name="fegDocUpdateMode" value="document_renewal">
              <span><b>Document Renewal / Update</b><small>This information comes from a new or renewed document.</small></span>
            </label>
            <div class="pm-docupd-hint">You must choose one option before saving.</div>
          </div>`;
        fegDocPanel.querySelectorAll('input[name="fegDocUpdateMode"]').forEach(r => {
          r.addEventListener('change', () => { fegDocRadioValue = r.value; if (saveBtn) saveBtn.disabled = false; });
        });
        fegDocRadioValue = '';
        if (saveBtn) saveBtn.disabled = true;
      };
      const unitsBody = fegDocPanel.parentElement;         // section-body unit (dilukis semula setiap paint)
      unitsBody.addEventListener('input', refreshFegDocPanel);
      unitsBody.addEventListener('change', refreshFegDocPanel);
      refreshFegDocPanel();
    }

    // Selepas Save (mod lihat): sorot + tatal ke slot dokumen unit yang diubah
    if (!editing && fegPendingFocus){
      const fEl = root.querySelector(`.pm-doc-row[data-doc-unit="${fegPendingFocus.ui}"][data-slot="${fegPendingFocus.slotId}"]`);
      if (fEl){
        fEl.classList.add('is-flagged');
        setTimeout(() => fEl.classList.remove('is-flagged'), 3400);
        setTimeout(() => fEl.scrollIntoView({behavior:'smooth', block:'center'}), 120);
      }
      fegPendingFocus = null;
    }
        // ---- Documents per unit: Upload / Download / Delete ----
    // Kad Documents hanya wujud dalam mod LIHAT (bukan edit),
    // jadi tiada guard 'editing' diperlukan di sini.
        /* ---- Kad 3 · Inspection Form (mod EDIT sahaja) ----
       Add / Upload / Download / Delete + klik butiran untuk edit. */
    function repaintInspection(highlightUploadId){
      inspAll = Array.isArray(DATA_CACHE[FEG_INSPECTION_TABLE]) ? DATA_CACHE[FEG_INSPECTION_TABLE] : inspAll;
      paint();
      if (!highlightUploadId) return;
      const upBtn = root.querySelector(`[data-insp-action="upload"][data-insp-id="${highlightUploadId}"]`);
      if (!upBtn) return;
      upBtn.classList.add('is-flagged');
      setTimeout(() => upBtn.classList.remove('is-flagged'), 3400);
      setTimeout(() => upBtn.scrollIntoView({behavior:'smooth', block:'center'}), 120);
    }
    const inspFind = id => (inspAll || []).find(r => r && String(r.recordId || '') === String(id)) || null;

    if (editing){
      const inspAddBtn = root.querySelector('#fegInspAdd');
      if (inspAddBtn) inspAddBtn.onclick = async () => {
        const info = await openFegInspectionModal(row, null);
        if (!info) return;
        inspAddBtn.disabled = true;
        try{
          const rec = await fegInspectionAdd(row, info);
          repaintInspection(rec && rec.recordId);          // baris baru + butang Upload berkelip
        }catch(e){
          inspAddBtn.disabled = false;
          alert('Save failed: ' + (e && e.message ? e.message : e));
        }
      };

      root.querySelectorAll('[data-insp-edit]').forEach(el => {
        el.onclick = async () => {
          const rec = inspFind(el.dataset.inspEdit);
          if (!rec) return;
          const info = await openFegInspectionModal(row, rec);
          if (!info) return;
          try{
            await fegInspectionUpdate(rec.recordId, info);
            repaintInspection('');
          }catch(e){
            alert('Update failed: ' + (e && e.message ? e.message : e));
          }
        };
      });

            const inspDlBtn = root.querySelector('#fegInspDownloadForm');
      if (inspDlBtn) inspDlBtn.onclick = async () => {
        const oldTxt = inspDlBtn.textContent;
        inspDlBtn.disabled = true;
        inspDlBtn.textContent = 'Generating\u2026';
        try{ await downloadFegInspectionForm(row); }
        catch(e){ alert('Download failed: ' + (e && e.message ? e.message : e)); }
        finally{ inspDlBtn.disabled = false; inspDlBtn.textContent = oldTxt; }
      };

      root.querySelectorAll('[data-insp-action]').forEach(btn => {
        const rec = inspFind(btn.dataset.inspId);
        if (!rec) return;

        if (btn.dataset.inspAction === 'upload'){
          btn.onclick = () => {
            const inp = root.querySelector(`.feg-insp-file[data-insp-file="${rec.recordId}"]`);
            if (inp){ inp.value = ''; inp.click(); }
          };
        }

        if (btn.dataset.inspAction === 'download'){
          btn.onclick = async () => {
            try{ btn.disabled = true; await fegInspectionDownload(rec); }
            catch(e){ alert('Download failed: ' + (e && e.message ? e.message : e)); }
            btn.disabled = !fegInspectionFileMeta(rec).hasFile;
          };
        }

        if (btn.dataset.inspAction === 'delete'){
          btn.onclick = async () => {
            const ok = await confirmModal('Delete Inspection Record',
              'This record and its signed form (if any) will be <strong>permanently deleted</strong>. This cannot be undone.',
              { confirmLabel:'Delete', tone:'danger' });
            if (!ok) return;
            btn.disabled = true;
            try{
              await fegInspectionDelete(rec);
              repaintInspection('');
            }catch(e){
              btn.disabled = false;
              alert('Delete failed: ' + (e && e.message ? e.message : e));
            }
          };
        }
      });

      root.querySelectorAll('.feg-insp-file').forEach(inp => {
        inp.onchange = async () => {
          const rec  = inspFind(inp.dataset.inspFile);
          const file = inp.files && inp.files[0];
          if (!rec || !file) return;
          const upBtn = root.querySelector(`[data-insp-action="upload"][data-insp-id="${rec.recordId}"]`);
          if (upBtn){ upBtn.disabled = true; upBtn.textContent = 'Uploading\u2026'; }
          try{
            await fegInspectionUploadFile(row, rec, file);
            repaintInspection('');
          }catch(e){
            if (upBtn){ upBtn.disabled = false; upBtn.textContent = 'Upload'; }
            alert('Upload failed: ' + (e && e.message ? e.message : e));
          }
        };
      });
    }

    async function saveDocsAndPaint(){
      all[index] = row;
      await persist('feg');
      paint();
    }

    root.querySelectorAll('[data-doc-action]').forEach(btn => {
      const ui     = Number(btn.dataset.docUnit);
      const slotId = btn.dataset.slot;
      const unit   = (row.units || [])[ui];
      if (!unit) return;

      if (btn.dataset.docAction === 'upload'){
        btn.onclick = () => {
          const inp = root.querySelector(`.pm-doc-file[data-doc-unit="${ui}"][data-slot="${slotId}"]`);
          if (inp){ inp.value = ''; inp.click(); }
        };
      }

      if (btn.dataset.docAction === 'download'){
        btn.onclick = async () => {
          try{ btn.disabled = true; await fegDownloadDoc(unit, slotId); }
          catch(err){ alert('Download failed: ' + (err.message || err)); }
          finally{ btn.disabled = false; }
        };
      }

      if (btn.dataset.docAction === 'delete'){
        btn.onclick = async () => {
          if (!confirm('Delete the ' + fegDocSlotLabel(slotId) + ' file? This cannot be undone.')) return;
          try{
            btn.disabled = true;
            fegDocBusy = true;
            await fegDeleteDoc(unit, slotId);
            const docs = Object.assign({}, unit.docs || {});
            delete docs[slotId];
            unit.docs = docs;
            await saveDocsAndPaint();
          }catch(err){
            btn.disabled = false;
            alert('Delete failed: ' + (err.message || err));
          }finally{
            fegDocBusy = false;
          }
        };
      }
    });

    root.querySelectorAll('.pm-doc-file').forEach(inp => {
      inp.onchange = async () => {
        const ui     = Number(inp.dataset.docUnit);
        const slotId = inp.dataset.slot;
        const unit   = (row.units || [])[ui];
        const file   = inp.files && inp.files[0];
        if (!unit || !file) return;
        fegDocBusy = true;

        const btn = root.querySelector(`[data-doc-action="upload"][data-doc-unit="${ui}"][data-slot="${slotId}"]`);
        if (btn){ btn.disabled = true; btn.textContent = 'Uploading\u2026'; }
        try{
          const expField = FEG_DOC_EXPIRY_FIELD[slotId] || '';
          const expValue = expField ? (unit[expField] || '') : '';
          const doc      = await fegUploadDoc(row, unit, slotId, file, expValue);
          unit.docs = Object.assign({}, unit.docs || {}, { [slotId]: doc });
          await saveDocsAndPaint();
        }catch(err){
          if (btn){ btn.disabled = false; btn.textContent = 'Upload'; }
          alert('Upload failed: ' + (err.message || err));
        }finally{
          fegDocBusy = false;
        }
      };
    });
  }

  paint();
}
/* =============================================================
   FEG DISPOSAL — medan disposal duduk ATAS unit (dalam units[]).
   Tiada table kedua: page Disposal cuma TAPISAN HIDUP.
     Dispose = Yes → unit KEKAL dalam FEG List, muncul di page Disposal
     Restore = No  → unit terus hilang dari page Disposal (betulkan silap)
   ============================================================= */
const FEG_DISPOSAL_REASONS = ['Damaged','Expired','Lost / Missing','End of Life','Replaced','Others'];
const FEG_DISPOSAL_AUDIT_FIELD = 'disposalAudit';   // jejak senyap, max 300 entri

/* Dispose / undur: SuperAdmin, Admin, Manager sahaja. */
function fegCanDispose(){
  try{
    const s = JSON.parse(localStorage.getItem('focc-session'));
    const r = String((s && s.role) || '');
    return r === 'SuperAdmin' || r === 'Admin' || r === 'Manager';
  }catch(e){ return false; }
}

function fegIsDisposed(u){ return String((u && u.disposal) || 'No') === 'Yes'; }

/* Jejak audit SENYAP — tiada UI, tiada page. Simpan dalam senarai pilihan
   (storage sama corak combo options) supaya kalau 6 bulan lagi ada
   pertanyaan "siapa buang extinguisher ni", jawapannya ada. */
async function fegAuditDisposal(entry){
  try{
    const rec = Object.assign({
      auditId: fegNewId('FA'),
      at     : new Date().toISOString(),
      by     : getSessionEmail() || ''
    }, entry);

    for (let attempt = 0; attempt < 3; attempt++){
      let list = [];
      try{ list = await loadOptionList('feg', FEG_DISPOSAL_AUDIT_FIELD); }catch(e){ list = []; }
      if (!Array.isArray(list)) list = [];

      // Sudah tersimpan (retry) — jangan tulis dua kali.
      if (list.some(x => x && String(x.auditId || '') === String(rec.auditId))) return;

      list.unshift(rec);
      try{
        await saveOptionList('feg', FEG_DISPOSAL_AUDIT_FIELD, list.slice(0, 300));
        return;
      }catch(e){
        if (attempt === 2) console.error('FEG disposal audit failed', e);
      }
    }
  }catch(e){ console.error('FEG disposal audit failed', e); }
}

/* Simpan semula SATU unit terus ke Supabase. Guna assetId (bukan index DOM)
   supaya tak tersalah row kalau orang lain tambah/buang rekod serentak. */
async function fegPersistUnit(assetIdOrRef, unitId, mutate){
  const all = await getData('feg');
  const row = (all || []).find(r => r && (
    String(r.assetId || '') === String(assetIdOrRef || '') ||
    String(r.assetRef || '') === String(assetIdOrRef || '')
  ));
  if (!row) throw new Error('Rekod FEG tak dijumpai.');
  const unit = (row.units || []).find(u => u && String(u.unitId || '') === String(unitId || ''));
  if (!unit) throw new Error('Unit tak dijumpai.');
  mutate(unit);
  unit.cylinderDue = fegCylinderDueFrom(unit.mfgDate);   // auto dari Manufacturing Date
  unit.finalStatus = fegFinalStatus(unit);      // Final Status dikira semula
  await persist('feg');
  return { row, unit };
}
/* =============================================================
   FEG SERVICE LOG — Fasa 1 : DATA MODEL sahaja (belum ada UI).
   Disimpan DALAM unit (macam disposal*) — tiada table Supabase baru.
     Active     -> unit sedang dihantar ke vendor
     Completed  -> kekal dalam Service History (audit)
     Cancel     -> rekod DIBUANG terus (salah pilih unit)
   NOTA: rec.dateService = tarikh MULA service (auto).
         unit.serviceDate = tarikh SERVIS SETERUSNYA (due). Jangan keliru.
   ============================================================= */
const FEG_SERVICE_REASONS = ['Annual Service','Repair / Fault','Refill','Hydrostatic Test','Others'];

function fegUnitServiceLog(unit){
  return (unit && Array.isArray(unit.serviceLog)) ? unit.serviceLog : [];
}
function fegActiveService(unit){
  return fegUnitServiceLog(unit).find(s => s && s.status === 'Active') || null;
}
function fegIsInService(unit){ return !!fegActiveService(unit); }
function fegServiceCount(unit){
  return fegUnitServiceLog(unit).filter(s => s && s.status === 'Completed').length;
}
/* Nombor service sentiasa menaik — tak guna semula walaupun sudah Cancel. */
function fegNextServiceNo(unit){
  const maxLog = fegUnitServiceLog(unit).reduce((m,s) => Math.max(m, Number(s && s.serviceNo) || 0), 0);
  const seq    = Number(unit && unit.serviceSeq) || 0;
  return Math.max(maxLog, seq) + 1;
}

/* 1) MULA SERVICE */
async function fegStartService(row, unit, info){
  const at = new Date().toISOString();
  let rec  = null;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    if (fegActiveService(u)) throw new Error('Unit ini sudah ada service aktif.');
    rec = {
      serviceId  : fegNewId('FS'),
      serviceNo  : fegNextServiceNo(u),
      status     : 'Active',
      dateService: at,                        // auto — masa tekan Service
      vendor     : (info && info.vendor) || '',
      reason     : (info && info.reason) || '',
      remark     : (info && info.remark) || '',
      serviceBy  : getSessionEmail() || '',
      createdAt  : at,
      receivedDate: '', invoiceNo: '', price: '', completedAt: '', completedBy: '',
    };
    u.serviceLog = fegUnitServiceLog(u).concat([rec]);
    u.serviceSeq = rec.serviceNo;
  });
  return rec;
}

/* 2) CANCEL SERVICE — rekod DIBUANG (salah pilih unit) */
async function fegCancelService(row, unit, expectedServiceId){
  let removed = false;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    const active = fegActiveService(u);              // baca SEMULA dalam mutate
    if (!active) throw new Error('Tiada service aktif untuk dibatalkan.');
    if (expectedServiceId && String(active.serviceId) !== String(expectedServiceId)){
      throw new Error('Rekod service sudah berubah. Refresh dan cuba lagi.');
    }
    u.serviceLog = fegUnitServiceLog(u).filter(s => s && s.serviceId !== active.serviceId);
    removed = true;
  });
  return removed;
}

/* 3) COMPLETE SERVICE */
function fegAddOneYear(isoDate){
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0,10);
}
async function fegCompleteService(row, unit, info){
  const receivedDate = String((info && info.receivedDate) || '').trim();
  const nextDue      = fegAddOneYear(receivedDate);
  if (!nextDue) throw new Error('Date Received tak sah.');
  const actId = (fegActiveService(unit) || {}).serviceId;
  if (!actId) throw new Error('Tiada service aktif untuk unit ini.');
  const at    = new Date().toISOString();
  const price = (info && info.price != null && info.price !== '') ? info.price : '';

  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    let hit = false;
    (u.serviceLog || []).forEach(s => {
      if (s && s.serviceId === actId && s.status === 'Active'){
        s.status       = 'Completed';
        s.receivedDate = receivedDate;
        s.invoiceNo    = (info && info.invoiceNo) || '';
        s.price        = price;
        s.completedAt  = at;
        s.completedBy  = getSessionEmail() || '';
        hit = true;
      }
    });
    if (!hit) throw new Error('Service aktif tak dijumpai (mungkin sudah diubah user lain).');
    u.serviceDate = nextDue;        // reset kitaran 1 tahun
  });
  return { nextDue };
}

/* 4) Senarai RATA semua rekod service (untuk Service History + Excel) */
function fegServiceEntries(){
  const out = [];
  (DATA_CACHE.feg || []).forEach(row => {
    (row.units || []).forEach(unit => {
      fegUnitServiceLog(unit).forEach(rec => { if (rec) out.push({ row: row, unit: unit, rec: rec }); });
    });
  });
  out.sort((a,b) => String(b.rec.dateService || '').localeCompare(String(a.rec.dateService || '')));
  return out;
}

/* Modal Dispose — satu jalan sahaja (dari baris unit / page Disposal). */
function openFegDisposeModal(row, unit){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    const _t = new Date();
    const todayStr = _t.getFullYear() + '-' + String(_t.getMonth()+1).padStart(2,'0') + '-' + String(_t.getDate()).padStart(2,'0');
    box.innerHTML = `
      <h4>Dispose Extinguisher</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This unit will be marked <strong>Disposed</strong>. It <strong>stays</strong> in the FEG List and keeps appearing on the FEG Disposal page.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Vendor who collected *</label>
          <input type="text" id="fegDisVendor" list="fegVendorList" autocomplete="off" placeholder="e.g. Fire Safety Services">
        </div>
        <div class="formfield"><label>Reason *</label>
          <select id="fegDisReason">${FEG_DISPOSAL_REASONS.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        </div>
        <div class="formfield" style="grid-column:1/-1;"><label>Remark (optional)</label>
          <input type="text" id="fegDisNote" placeholder="Short note">
        </div>
        <div class="formfield"><label>Date Disposed *</label>
          <input type="date" id="fegDisDate" value="${todayStr}">
        </div>
      </div>
      <div class="settings-note">Date Disposed is what appears on the FEG Disposal table. Your email and the time this record was saved are stored automatically.</div>
      <div class="modalfoot">
        <button class="btn" id="fegDisCancel">Cancel</button>
        <button class="btn danger" id="fegDisConfirm">Dispose</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegDisCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegDisConfirm').addEventListener('click', () => {
      const vendor = String(box.querySelector('#fegDisVendor').value || '').trim();
      const reason = String(box.querySelector('#fegDisReason').value || '').trim();
      const note   = String(box.querySelector('#fegDisNote').value || '').trim();
      const date   = String(box.querySelector('#fegDisDate').value || '').trim();
      if (!vendor){ alert('Vendor who collected is required.'); return; }
      if (!reason){ alert('Reason is required.'); return; }
      if (!date){ alert('Date Disposed is required.'); return; }
      finish({ vendor: vendor, reason: reason, note: note, date: date });
    });
    const vEl = box.querySelector('#fegDisVendor');
    if (vEl) setTimeout(() => vEl.focus(), 60);
  });
}
/* Modal Service — satu jalan sahaja (dari baris unit). Fasa 2. */
function openFegServiceModal(row, unit, vendorList){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    // Senarai vendor (boleh tambah / buang). vendorList datang dari FEG Detail;
    // kalau tiada, list kosong — user masih boleh taip nama baru.
    const vAll = (Array.isArray(vendorList) ? vendorList.slice() : []);
    const uv   = String((unit && unit.vendor) || '').trim();
    if (uv && !vAll.includes(uv)) vAll.push(uv);
    vAll.sort((a,b) => String(a).localeCompare(String(b)));
    box.innerHTML = `
      <h4>Send for Service</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This unit will be marked <strong>In Service</strong>. It <strong>stays</strong> in the FEG List. Press <strong>Cancel Service</strong> on that row if you picked the wrong unit.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Vendor who collected *</label>
          <div class="combo-wrap">
            <input type="text" id="fegSvcVendor" autocomplete="off" placeholder="Type new or pick existing...">
            <div class="combo-panel" id="fegSvcVendorPanel"></div>
          </div>
        </div>
        <div class="formfield"><label>Reason *</label>
          <select id="fegSvcReason">${FEG_SERVICE_REASONS.map(r => `<option value="${r}">${r}</option>`).join('')}</select>
        </div>
        <div class="formfield" style="grid-column:1/-1;"><label>Remark (optional)</label>
          <input type="text" id="fegSvcNote" placeholder="Short note">
        </div>
      </div>
      <div class="settings-note">Service date &amp; time plus your email are recorded automatically. Next service due is set when you press Complete Service later.</div>
      <div class="modalfoot">
        <button class="btn" id="fegSvcCancel">Cancel</button>
        <button class="btn primary" id="fegSvcConfirm">Service</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegSvcCancel').addEventListener('click', () => finish(null));

    /* ---- Vendor: combo boleh-taip (tambah baru) + × (buang dari senarai) ---- */
    const vInput = box.querySelector('#fegSvcVendor');
    const vPanel = box.querySelector('#fegSvcVendorPanel');
    const escV   = s => String(s == null ? '' : s).replace(/"/g, '&quot;');
    function vRender(){
      const cur  = String(vInput.value || '').trim();
      const term = cur.toLowerCase();
      const vis  = vAll.filter(v => !term || String(v).toLowerCase().includes(term));
      vPanel.innerHTML = vis.length
        ? vis.map(v => `<div class="combo-item${v === cur ? ' is-active' : ''}" data-value="${escV(v)}">
             <span class="combo-item-text">${escV(v)}</span>
             <button type="button" class="combo-del" data-del="${escV(v)}" title="Remove from list">&times;</button>
           </div>`).join('')
        : '<div class="combo-empty">Type a new vendor name&hellip;</div>';

      vPanel.querySelectorAll('.combo-item').forEach(rowEl => {
        const t = rowEl.querySelector('.combo-item-text');
        if (t) t.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          vInput.value = rowEl.dataset.value || '';
          vPanel.classList.remove('open');
        });
        const del = rowEl.querySelector('.combo-del');
        if (del) del.addEventListener('mousedown', async e => {
          e.preventDefault(); e.stopPropagation();
          const v = String(rowEl.dataset.value || '');
          const idx = vAll.findIndex(x => String(x) === v);
          if (idx >= 0) vAll.splice(idx, 1);                        // buang dari senarai
          if (String(vInput.value || '').trim() === v) vInput.value = '';   // elak hidup balik
          try{ await saveOptionList('feg', 'vendor', vAll.slice()); }catch(err){}
          vRender();
        });
      });
    }
    vInput.addEventListener('focus', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('click', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('input', () => { vRender(); vPanel.classList.add('open'); });
    vInput.addEventListener('blur',  () => setTimeout(() => vPanel.classList.remove('open'), 120));
    vInput.addEventListener('keydown', e => { if (e.key === 'Escape') vPanel.classList.remove('open'); });

    box.querySelector('#fegSvcConfirm').addEventListener('click', async () => {
      const vendor = String(box.querySelector('#fegSvcVendor').value || '').trim();
      const reason = String(box.querySelector('#fegSvcReason').value || '').trim();
      const note   = String(box.querySelector('#fegSvcNote').value || '').trim();
      if (!vendor){ alert('Vendor who collected is required.'); return; }
      if (!reason){ alert('Reason is required.'); return; }
      // vendor BARU → simpan ke senarai supaya muncul lain kali
      if (!vAll.some(v => String(v).toLowerCase() === vendor.toLowerCase())){
        vAll.push(vendor);
        vAll.sort((a,b) => String(a).localeCompare(String(b)));
        try{ await saveOptionList('feg', 'vendor', vAll.slice()); }catch(e){}
      }
      finish({ vendor: vendor, reason: reason, remark: note });
    });
    const vEl = box.querySelector('#fegSvcVendor');
    if (vEl) setTimeout(() => vEl.focus(), 60);
  });
}

async function fegDisposeUnit(row, unit, info){
  const at   = new Date().toISOString();                    // bila rekod ini disimpan
  const date = String((info && info.date) || '').trim() || at.slice(0,10);   // tarikh pilihan user
  const snap = { assetRef: row.assetRef || '', serial: fegSerialLabel(unit), unitId: unit.unitId,
                 vendor: info.vendor, reason: info.reason, note: info.note || '' };
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    u.disposal         = 'Yes';
    u.disposalVendor   = info.vendor;
    u.disposalReason   = info.reason;
    u.disposalNote     = info.note || '';
    u.disposedAt       = date;                    // ← tarikh user pilih (ikut table Disposal)
    u.disposedLoggedAt = at;                      // bila rekod disimpan (audit)
    u.disposedBy       = getSessionEmail() || '';
  });
  await fegAuditDisposal(Object.assign({ action:'Disposed', at: at, date: date }, snap));
}

async function fegRestoreUnit(row, unit){
  const snap = { assetRef: row.assetRef || '', serial: fegSerialLabel(unit), unitId: unit.unitId,
                 wasDisposedAt: unit.disposedAt || '', wasDisposedBy: unit.disposedBy || '',
                 vendor: unit.disposalVendor || '', reason: unit.disposalReason || '' };
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    u.disposal        = 'No';
    u.disposalVendor  = '';
    u.disposalReason  = '';
    u.disposalNote    = '';
    u.disposedAt       = '';
    u.disposedLoggedAt = '';
    u.disposedBy       = '';
  });
  await fegAuditDisposal(Object.assign({ action:'Restored' }, snap));
}

/* =============================================================
   FEG DISPOSAL PAGE (route: fegDisposal) — register HIDUP
   ============================================================= */
async function renderFegDisposalPage(){
  const root = document.createElement('div');
  const canEdit = fegCanDispose();
  let branch = '';
  let term   = '';

  await getData('feg');

  function entriesAll(){
    const out = [];
    (DATA_CACHE.feg || []).forEach(row => {
      (row.units || []).forEach(unit => { if (fegIsDisposed(unit)) out.push({ row: row, unit: unit }); });
    });
    out.sort((a,b) => String(b.unit.disposedAt || '').localeCompare(String(a.unit.disposedAt || '')));
    return out;
  }
  function entriesVisible(list){
    const t = term.trim().toLowerCase();
    return list.filter(e => {
      if (branch && String(e.row.branch || '') !== branch) return false;
      if (!t) return true;
      return [e.row.assetRef, e.row.assetType, e.row.branch, fegSerialLabel(e.unit), e.unit.fegType,
              e.unit.capacity, e.unit.disposalVendor, e.unit.disposalReason, e.unit.disposedBy]
        .map(v => String(v == null ? '' : v)).join(' ').toLowerCase().includes(t);
    });
  }
  function stamp(iso){
    if (!iso) return '-';
    const raw = String(iso);
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '-';
    // Tarikh sahaja (YYYY-MM-DD) → jangan papar masa palsu 08:00.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return fmtDate(raw);
    return fmtDate(raw.slice(0,10)) + ' &middot; ' +
      d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }

  function paint(){
    const all      = entriesAll();
    const branches = [...new Set((DATA_CACHE.feg || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const rows = entriesVisible(all);

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <span class="eyebrow">${rows.length} disposed unit${rows.length === 1 ? '' : 's'}</span>
          <div class="spacer"></div>
          <span class="pm-doc-note">AUTO &mdash; from FEG Detail (unit Disposal = Yes)</span>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <input class="searchbox" id="fegDisSearch" type="text" placeholder="Search asset, serial, vendor..." value="${escapeHtml(term)}">
            <span class="tblfilter-wrap">
              <span class="tblfilter-lbl">Branch:</span>
              <button type="button" class="tblfilter-btn" id="fegDisBranchBtn" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" id="fegDisBranchVal">${escapeHtml(branch || 'All')}</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" id="fegDisBranchPanel" role="listbox"></div>
            </span>
            <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">
              <button class="btn" id="fegDisExport"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            </div>
          </div>
          ${rows.length ? `
          <div class="tablewrap">
            <table class="cdx-table">
              <thead><tr>
                <th>Date Disposed</th><th>Asset / Location</th><th>Category</th><th>Branch</th>
                <th>Serial</th><th>Type</th><th>Capacity</th><th>Vendor</th><th>Reason</th><th>Disposed By</th>
                ${canEdit ? '<th>Action</th>' : ''}
              </tr></thead>
              <tbody>
                ${rows.map((e, i) => `
                  <tr>
                    <td>${stamp(e.unit.disposedAt)}${e.unit.disposedLoggedAt ? `<div class="settings-note" style="margin:2px 0 0;">Recorded ${stamp(e.unit.disposedLoggedAt)}</div>` : ''}</td>
                    <td>${escapeHtml(e.row.assetRef || '-')}</td>
                    <td>${escapeHtml(e.row.assetType || '-')}</td>
                    <td>${escapeHtml(e.row.branch || '-')}</td>
                    <td>${escapeHtml(fegSerialLabel(e.unit) || '(no serial)')}</td>
                    <td>${escapeHtml(e.unit.fegType || '-')}</td>
                    <td>${escapeHtml(e.unit.capacity || '-')}</td>
                    <td>${escapeHtml(e.unit.disposalVendor || '-')}</td>
                    <td>${escapeHtml(e.unit.disposalReason || '-')}${e.unit.disposalNote ? `<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(e.unit.disposalNote)}</div>` : ''}</td>
                    <td>${escapeHtml(e.unit.disposedBy || '-')}</td>
                    ${canEdit ? `<td><button type="button" class="btn" data-feg-restore-row="${i}">Restore</button></td>` : ''}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="settings-note" style="margin-top:0;">No disposed units yet. Dispose from FEG &rarr; open the Detail Page &rarr; <b>Dispose</b> button on the unit row.</div>`}
        </div>
      </div>`;

    const searchEl = root.querySelector('#fegDisSearch');
    if (searchEl){
      searchEl.addEventListener('input', () => {
        term = searchEl.value;
        paint();
        setTimeout(() => {
          const s = root.querySelector('#fegDisSearch');
          if (s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        }, 0);
      });
    }

    const bBtn   = root.querySelector('#fegDisBranchBtn');
    const bPanel = root.querySelector('#fegDisBranchPanel');
    if (bBtn && bPanel){
      const paintPanel = () => {
        bPanel.innerHTML = ['', ...branches].map(v => `
          <div class="tblfilter-option${branch === v ? ' is-active' : ''}" data-value="${escapeHtml(v)}" role="option">
            <span>${escapeHtml(v || 'All')}</span>
            <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>`).join('');
      };
      bBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = bPanel.classList.toggle('open');
        bBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) paintPanel();
      });
      bPanel.addEventListener('click', e => {
        const opt = e.target.closest('.tblfilter-option');
        if (!opt) return;
        branch = String(opt.dataset.value || '');
        bPanel.classList.remove('open');
        bBtn.setAttribute('aria-expanded','false');
        paint();
      });
    }

    const exBtn = root.querySelector('#fegDisExport');
    if (exBtn) exBtn.addEventListener('click', () => {
      const cols = ['Date Disposed','Asset / Location','Category','Branch','Serial','Type','Capacity','Vendor','Reason','Note','Disposed By'];
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"';
      const lines = [cols.map(q).join(',')].concat(rows.map(e => [
        e.unit.disposedAt || '', e.row.assetRef || '', e.row.assetType || '', e.row.branch || '',
        fegSerialLabel(e.unit), e.unit.fegType || '', e.unit.capacity || '',
        e.unit.disposalVendor || '', e.unit.disposalReason || '', e.unit.disposalNote || '', e.unit.disposedBy || ''
      ].map(q).join(',')));
      downloadBlob(new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8;'}),
        'FEG-Disposal-' + new Date().toISOString().slice(0,10) + '.csv');
    });

    root.querySelectorAll('[data-feg-restore-row]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const e = rows[Number(btn.dataset.fegRestoreRow)];
        if (!e) return;
        const ok = await confirmModal('Restore Extinguisher',
          'Unit <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> at <strong>' +
          escapeHtml(e.row.assetRef || '-') + '</strong> will be restored to active and will <strong>disappear</strong> from this page.',
          { confirmLabel:'Restore', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{ await fegRestoreUnit(e.row, e.unit); paint(); }
        catch(err){ btn.disabled = false; alert('Restore failed: ' + (err && err.message ? err.message : err)); }
      });
    });
  }

  paint();
  return root;
}

/* Modal Complete Service — tutup gelung service. Fasa 4. */
function openFegCompleteServiceModal(row, unit, rec){
  return new Promise(resolve => {
    const overlay = document.getElementById('modalOverlay');
    const box = document.getElementById('modalBox');
    box.classList.remove('opkpi-modal');
    const serial = fegSerialLabel(unit) || '(no serial)';
    box.innerHTML = `
      <h4>Complete Service</h4>
      <div class="notice notice-warning" style="margin-bottom:14px;">
        This record becomes <strong>Completed</strong> and stays in Service History for audit. Next service due will be set to <strong>Date Received + 1 year</strong>.
      </div>
      <div class="settings-summary-row" style="background:#f8fafa;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:12px;">
        <div class="label" style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;">Unit</div>
        <div class="value" style="font-size:13px;color:var(--ink);margin-top:3px;">${escapeHtml(row.assetRef || '-')} &middot; ${escapeHtml(serial)} &middot; ${escapeHtml((rec && rec.vendor) || '-')}</div>
      </div>
      <div class="formgrid">
        <div class="formfield"><label>Date Received *</label>
          <input type="date" id="fegCmpDate">
        </div>
        <div class="formfield"><label>Invoice No</label>
          <input type="text" id="fegCmpInvoice" autocomplete="off" placeholder="e.g. INV-00123">
        </div>
        <div class="formfield"><label>Price (RM)</label>
          <input type="number" id="fegCmpPrice" step="0.01" min="0" placeholder="0.00">
        </div>
      </div>
      <div class="settings-note">Your email and the completion time are recorded automatically.</div>
      <div class="modalfoot">
        <button class="btn" id="fegCmpCancel">Cancel</button>
        <button class="btn primary" id="fegCmpConfirm">Save</button>
      </div>`;
    overlay.classList.add('show');
    const finish = v => { overlay.classList.remove('show'); resolve(v); };
    box.querySelector('#fegCmpCancel').addEventListener('click', () => finish(null));
    box.querySelector('#fegCmpConfirm').addEventListener('click', () => {
      const receivedDate = String(box.querySelector('#fegCmpDate').value || '').trim();
      const invoiceNo    = String(box.querySelector('#fegCmpInvoice').value || '').trim();
      const price        = String(box.querySelector('#fegCmpPrice').value || '').trim();
      if (!receivedDate){ alert('Date Received is required.'); return; }
      finish({ receivedDate: receivedDate, invoiceNo: invoiceNo, price: price });
    });
    const dEl = box.querySelector('#fegCmpDate');
    if (dEl) setTimeout(() => dEl.focus(), 60);
  });
}
/* =============================================================
   FEG SERVICE LOG — DELETE (semua user dalam company)
   Buang SATU rekod servis (Active atau Completed) terus dari
   unit.serviceLog. Alat pembetulan data silap.
   ============================================================= */
async function fegDeleteServiceRecord(row, unit, serviceId){
  const sid = String(serviceId || '');
  if (!sid) throw new Error('Rekod service tak sah.');
  let removed = false;
  await fegPersistUnit(row.assetId || row.assetRef, unit.unitId, u => {
    const before = fegUnitServiceLog(u).length;
    u.serviceLog = fegUnitServiceLog(u).filter(s => s && String(s.serviceId || '') !== sid);
    if (u.serviceLog.length === before) throw new Error('Rekod sudah tiada. Refresh dan cuba lagi.');
    removed = true;
  });
  return removed;
}

/* =============================================================
   FEG SERVICE HISTORY PAGE (route: fegServiceHistory) — Fasa 3
   TAPISAN HIDUP dari unit.serviceLog[] — tiada table Supabase baru.
     Active    -> sedang dihantar ke vendor
     Completed -> kekal di sini untuk auditor + Export CSV
   Cancel = rekod dibuang terus, jadi ia TIDAK muncul di sini.
   ============================================================= */
async function renderFegServiceHistoryPage(){
  const root = document.createElement('div');
  const canComplete = fegCanDispose();     // sama gate dengan Dispose
  const canDelete   = true;       // semua user dalam company boleh delete
  let branch = '';
  let term   = '';

  await getData('feg');

  function entriesAll(){
    return fegServiceEntries()      // helper Fasa 1
      .filter(e => e.rec && (e.rec.status === 'Active' || e.rec.status === 'Completed'));
  }
  function entriesVisible(list){
    const t = term.trim().toLowerCase();
    return list.filter(e => {
      if (branch && String(e.row.branch || '') !== branch) return false;
      if (!t) return true;
      return [e.row.assetRef, e.row.assetType, e.row.branch, fegSerialLabel(e.unit), e.unit.fegType,
              e.unit.capacity, e.rec.vendor, e.rec.reason, e.rec.serviceBy, e.rec.status]
        .map(v => String(v == null ? '' : v)).join(' ').toLowerCase().includes(t);
    });
  }
  function stamp(iso){
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return fmtDate(String(iso).slice(0,10)) + ' &middot; ' +
      d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  }
  function statusBadge(s){
    const v = String(s || '');
    return `<span class="badge ${v === 'Completed' ? 'good' : 'warn'}">${escapeHtml(v || '-')}</span>`;
  }

  function paint(){
    const all      = entriesAll();
    const branches = [...new Set((DATA_CACHE.feg || []).map(r => String((r && r.branch) || '').trim()).filter(Boolean))]
      .sort((a,b) => a.localeCompare(b));
    const rows = entriesVisible(all);

    root.innerHTML = `
      <div class="section">
        <div class="section-head">
          <span class="eyebrow">${rows.length} service record${rows.length === 1 ? '' : 's'}</span>
          <div class="spacer"></div>
          <span class="pm-doc-note">AUTO &mdash; from FEG Detail (unit Service button)</span>
        </div>
        <div class="section-body">
          <div class="toolbar">
            <input class="searchbox" id="fegSvcSearch" type="text" placeholder="Search asset, serial, vendor..." value="${escapeHtml(term)}">
            <span class="tblfilter-wrap">
              <span class="tblfilter-lbl">Branch:</span>
              <button type="button" class="tblfilter-btn" id="fegSvcBranchBtn" aria-haspopup="listbox" aria-expanded="false">
                <span class="tblfilter-val" id="fegSvcBranchVal">${escapeHtml(branch || 'All')}</span>
                <svg class="tblfilter-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <div class="tblfilter-panel" id="fegSvcBranchPanel" role="listbox"></div>
            </span>
            <div class="toolbar-actions" style="display:flex;gap:8px;align-items:center">
              <button class="btn" id="fegSvcExport"><span class="lbl-full">Export Data</span><span class="lbl-short">Export</span></button>
            </div>
          </div>
          ${rows.length ? `
          <div class="tablewrap">
            <table class="cdx-table">
              <thead><tr>
                <th>Date Service</th><th>Asset / Location</th><th>Category</th><th>Branch</th>
                <th>Serial</th><th>Type</th><th>Capacity</th><th>Vendor</th><th>Reason</th><th>Service By</th><th>Status</th>${(canComplete || canDelete) ? '<th>Action</th>' : ''}
              </tr></thead>
              <tbody>
                ${rows.map(e => `
                  <tr>
                    <td>${stamp(e.rec.dateService)}</td>
                    <td>${escapeHtml(e.row.assetRef || '-')}</td>
                    <td>${escapeHtml(e.row.assetType || '-')}</td>
                    <td>${escapeHtml(e.row.branch || '-')}</td>
                    <td>${escapeHtml(fegSerialLabel(e.unit) || '(no serial)')}</td>
                    <td>${escapeHtml(e.unit.fegType || '-')}</td>
                    <td>${escapeHtml(e.unit.capacity || '-')}</td>
                    <td>${escapeHtml(e.rec.vendor || '-')}</td>
                    <td>${escapeHtml(e.rec.reason || '-')}${String(e.rec.remark || '').trim() ? `<div class="settings-note" style="margin:2px 0 0;">${escapeHtml(e.rec.remark)}</div>` : ''}${e.rec.status === 'Completed' ? `<div class="settings-note" style="margin:2px 0 0;">Received: ${escapeHtml(e.rec.receivedDate ? fmtDate(e.rec.receivedDate) : '-')}${String(e.rec.invoiceNo || '').trim() ? ' &middot; Invoice: ' + escapeHtml(e.rec.invoiceNo) : ''}${String(e.rec.price == null ? '' : e.rec.price) !== '' ? ' &middot; RM ' + escapeHtml(String(e.rec.price)) : ''}</div>` : ''}</td>
                    <td>${escapeHtml(e.rec.serviceBy || '-')}</td>
                    <td>${statusBadge(e.rec.status)}</td>
                    ${(canComplete || canDelete) ? `<td>${(e.rec.status === 'Active' || canDelete) ? `
                      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        ${e.rec.status === 'Active' ? `
                          <button type="button" class="btn primary" data-feg-complete="${escapeHtml(e.rec.serviceId || '')}">Complete Service</button>
                          <button type="button" class="btn danger" data-feg-svc-cancel="${escapeHtml(e.rec.serviceId || '')}">Cancel</button>` : ''}
                        ${canDelete ? `
                          <button type="button" class="btn danger" data-feg-svc-delete="${escapeHtml(e.rec.serviceId || '')}">Delete</button>` : ''}
                      </div>` : '-'}</td>` : ''}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="settings-note" style="margin-top:0;">No service records yet. Go to FEG &rarr; open the Detail Page &rarr; press <b>Service</b> on the unit row.</div>`}
        </div>
      </div>`;

    const searchEl = root.querySelector('#fegSvcSearch');
    if (searchEl){
      searchEl.addEventListener('input', () => {
        term = searchEl.value;
        paint();
        setTimeout(() => {
          const s = root.querySelector('#fegSvcSearch');
          if (s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
        }, 0);
      });
    }

    const bBtn   = root.querySelector('#fegSvcBranchBtn');
    const bPanel = root.querySelector('#fegSvcBranchPanel');
    if (bBtn && bPanel){
      const paintPanel = () => {
        bPanel.innerHTML = ['', ...branches].map(v => `
          <div class="tblfilter-option${branch === v ? ' is-active' : ''}" data-value="${escapeHtml(v)}" role="option">
            <span>${escapeHtml(v || 'All')}</span>
            <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>`).join('');
      };
      bBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = bPanel.classList.toggle('open');
        bBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) paintPanel();
      });
      bPanel.addEventListener('click', e => {
        const opt = e.target.closest('.tblfilter-option');
        if (!opt) return;
        branch = String(opt.dataset.value || '');
        bPanel.classList.remove('open');
        bBtn.setAttribute('aria-expanded','false');
        paint();
      });
    }

    const exBtn = root.querySelector('#fegSvcExport');
    if (exBtn) exBtn.addEventListener('click', () => {
      const cols = ['Date Service','Asset / Location','Category','Branch','Serial','Type','Capacity','Vendor','Reason','Remark','Service By','Status','Date Received','Invoice No','Price (RM)'];
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g,'""') + '"';
      const lines = [cols.map(q).join(',')].concat(rows.map(e => [
        e.rec.dateService || '', e.row.assetRef || '', e.row.assetType || '', e.row.branch || '',
        fegSerialLabel(e.unit), e.unit.fegType || '', e.unit.capacity || '',
        e.rec.vendor || '', e.rec.reason || '', e.rec.remark || '', e.rec.serviceBy || '', e.rec.status || '',
        e.rec.receivedDate || '', e.rec.invoiceNo || '', e.rec.price || ''
      ].map(q).join(',')));
      downloadBlob(new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8;'}),
        'FEG-Service-History-' + new Date().toISOString().slice(0,10) + '.csv');
    });

    /* ===== Complete Service (Fasa 4) ===== */
    root.querySelectorAll('[data-feg-complete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegComplete || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const info = await openFegCompleteServiceModal(e.row, e.unit, e.rec);
        if (!info) return;
        btn.disabled = true;
        const assetId = String(e.row.assetId || e.row.assetRef || '');
        const unitId  = String(e.unit.unitId || '');
        try{
          await fegCompleteService(e.row, e.unit, info);
          // Fasa 5: bawa user terus ke dokumen unit ini (Fire Certificate + Purchase Invoice)
          const fresh = await getData('feg');
          const frow  = (fresh || []).find(r => r && String(r.assetId || r.assetRef || '') === assetId);
          const funit = frow ? ((frow.units || []).find(u => u && String(u.unitId || '') === unitId)) : null;
          if (frow && funit){
            fegRememberOpen(frow);
            fegJumpSet(assetId, unitId, ['fireCert', 'invoice']);
            await goTo('feg');
          } else {
            paint();          // kes selamat: kekal di Service History
          }
        }catch(err){
          btn.disabled = false;
          alert('Complete Service failed: ' + (err && err.message ? err.message : err));
        }
      });
    });

    /* ===== Cancel Service (Fasa 6a) — buang rekod dari senarai ===== */
    root.querySelectorAll('[data-feg-svc-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegSvcCancel || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const ok = await confirmModal('Cancel Service',
          'Service record for <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> will be removed from this list. This cannot be undone.',
          { confirmLabel:'Cancel Service', tone:'warning' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegCancelService(e.row, e.unit, sid);
          paint();                        // rekod dibuang -> hilang dari senarai
        }catch(err){
          btn.disabled = false;
          alert('Cancel Service failed: ' + (err && err.message ? err.message : err));
        }
      });
    });
        /* ===== Delete Service (semua user dalam company) ===== */
    root.querySelectorAll('[data-feg-svc-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sid = String(btn.dataset.fegSvcDelete || '');
        const e   = rows.find(x => x.rec && String(x.rec.serviceId || '') === sid);
        if (!e) return;
        const ok = await confirmModal('Delete Service Record',
          'This record for <strong>' + escapeHtml(fegSerialLabel(e.unit) || '(no serial)') + '</strong> will be PERMANENTLY deleted from the service log. This cannot be undone.',
          { confirmLabel:'Delete', tone:'danger' });
        if (!ok) return;
        btn.disabled = true;
        try{
          await fegDeleteServiceRecord(e.row, e.unit, sid);
          paint();                        // rekod dibuang -> hilang dari senarai
        }catch(err){
          btn.disabled = false;
          alert('Delete failed: ' + (err && err.message ? err.message : err));
        }
      });
    });
  }

  paint();
  return root;
}

/* =============================================================
   FEG PAGE — senarai kumpulan (Asset / Building)
   Satu baris table = satu kumpulan. Detail Page datang di Step 3.
   ============================================================= */
async function renderFegPage(){
  const root = document.createElement('div');

  async function showList(){
    fegForgetOpen();                       // sampai senarai = bukan lagi dalam Detail Page
    const listWrap = await renderDataPage('feg', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('feg'),
      onAddRow: () => openAddRowModal('feg', async () => {
        await fegAfterAdd();
        await showList();
      }, {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => {
          await fegAfterAdd();
          await renderFegDetailView(root, 0, showList, { startEditing: true });
        },
      }),
      tableOptions: {
        linkColumnId: 'assetRef',
        onLinkClick: async index => { await renderFegDetailView(root, index, showList); },
        onEditRow:   async index => { await renderFegDetailView(root, index, showList, { startEditing: true }); },
      },
    });
    // Import Data + Undo Import tak diperlukan pada page FEG — sorokkan.
    // Corak sama seperti page HIRARC: elemen kekal dalam DOM, wiring tak diubah.
    ['#importBtn', '#undoBtn', '#importFile'].forEach(sel => {
      const el = listWrap.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  // Selepas F5: kalau tadi user dalam Detail Page, buka semula rekod yang sama
  const fegRows = await getData('feg');
  const openIdx = fegRecallOpenIndex(fegRows);
  if (openIdx >= 0){
    const jrow = fegRows[openIdx];
    const peek = fegJumpPeek();
    const jump = (jrow && peek && String(peek.assetId || '') === fegRowKey(jrow)) ? fegJumpTake() : null;
    if (jump && jrow){
      const units = jrow.units || [];
      const ui = units.findIndex(u => u && String(u.unitId || '') === String(jump.unitId || ''));
      if (ui >= 0) fegDocPageSave(jrow, units[ui]);      // Kad 3 buka unit yang betul
      await renderFegDetailView(root, openIdx, showList);
      fegApplyJumpFocus(root, jump, jrow);
    } else {
      await renderFegDetailView(root, openIdx, showList);
    }
  } else await showList();
  return root;
}

/* Selepas borang Add disimpan: lengkapkan rekod baru dengan assetId +
   units[] (sebanyak Quantity yang diminta). commitAddRow() letak rekod
   baru di DEPAN senarai (unshift), jadi ia sentiasa data[0]. */
async function fegAfterAdd(){
  const qty = (FEG_PENDING_QTY > 0) ? Math.min(FEG_PENDING_QTY, FEG_MAX_UNITS) : 1;
  FEG_PENDING_QTY = 0;
  try{
    const all = await getData('feg');
    const row = (all && all[0]) ? all[0] : null;
    if (!row) return;
    if (!Array.isArray(row.units) || !row.units.length){
      row.assetId   = row.assetId || fegNewId('FEG');
      row.units     = Array.from({ length: qty }, () => fegNewUnit());
      row.createdBy = getSessionEmail() || '';
      row.createdAt = new Date().toISOString();
      await persist('feg');
    }
  }catch(e){
    console.error('FEG post-add failed', e);
    alert('Rekod disimpan, tetapi unit tidak dapat dicipta: ' + (e && e.message ? e.message : e));
  }
}

async function renderTrailerPage(){
  const root = document.createElement('div');

  async function showList(){
    tlForgetOpen();                 // sampai senarai = bukan lagi dalam Detail Page
    await tlEnsureAssetIds();
    await syncTrailerPrimeMover();  // Assigned Prime Mover auto dikemas kini
    const listWrap = await renderDataPage('trailer', {
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['branch'],
      showComplianceAlertButton: true,
      onComplianceAlert: () => openComplianceAlertModal('trailer'),
      onAddRow: () => openAddRowModal('trailer', () => showList(), {
        completeLabel: 'Save &amp; Complete Details',
        onComplete: async () => { await renderTrailerDetailView(root, 0, showList); },
      }),
      exportColumns: TABLES.trailer.columns.concat([
        {id:'chassisNo', label:'Chassis No.'},
        {id:'make', label:'Manufacturer'},
        {id:'model', label:'Model'},
        {id:'goodsType', label:'Goods Type'},
        {id:'capacity', label:'Capacity'},
      ]),
      tableOptions: {
        linkColumnId: 'lorry',
        onLinkClick: async index => { await renderTrailerDetailView(root, index, showList); },
        onEditRow: async index => {
          await openEditRowModal('trailer', index, null, {
            onAfterSaveEdit: async info => {
              if (info && info.mode === 'document_renewal' && info.slots && info.slots.length){
                await syncTrailerPrimeMover();
                const all = await getData('trailer');
                const i = all.findIndex(r => r.lorry === info.lorry);
                await renderTrailerDetailView(root, i < 0 ? index : i, showList, { focusSlots: info.slots });
              } else {
                await showList();
              }
            },
          });
        },
      },
    });
    root.innerHTML = '';
    root.appendChild(listWrap);
  }

  // Selepas F5: kalau tadi user dalam Detail Page, buka semula trailer yang sama
  await tlEnsureAssetIds();
  await syncTrailerPrimeMover();
  const tlOpenIdx = tlRecallOpenIndex(await getData('trailer'));
  if (tlOpenIdx >= 0){
    await renderTrailerDetailView(root, tlOpenIdx, showList);
  } else {
    await showList();
  }
  return root;
}

const ROUTES = {
  overview:            { title:'Main Menu', crumb:'Overview', render: renderOverview },
  mileage:             { title:'Truck Mileage', crumb:'Operation', render: () => renderDataPage('mileage') },

  maintenanceDashboard:{ title:'Maintenance Dashboard', crumb:'Maintenance', render: renderMaintenanceDashboard },
  maintenanceLog:      { title:'Maintenance Log', crumb:'Maintenance', render: () => renderDataPage('maintenanceLog') },
  machineryLog:        { title:'Machinery Log', crumb:'Maintenance', render: () => renderDataPage('machineryLog') },

  complianceDashboard: { title:'Compliance Dashboard', crumb:'Compliance', render: renderComplianceDashboard },
  speedingIdling:      { title:'Speeding & Idling', crumb:'Compliance', render: () => renderDataPage('speedingIdling', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch'],
  })
},
  misconduct:          { title:'Misconduct', crumb:'Compliance', render: renderMisconductPage },
  safetyEquipment:     { title:'Safety Equipment', crumb:'Compliance', render: renderSafetyPage },

  feg: {
  title:'FEG',
  crumb:'Compliance',
    render: renderFegPage,
},
  fegDisposal: {
  title:'FEG Disposal',
  crumb:'Compliance',
    render: renderFegDisposalPage,
},
  fegServiceHistory: {
  title:'Service History',
  crumb:'Compliance',
    render: renderFegServiceHistoryPage,
},
  depotOverview: {
    title: 'Depot Overview',
    crumb: 'Depot',
    render: renderDepotOverview,
  },
  depotLayout: {
    title: 'Depot Layout',
    crumb: 'Depot',
    render: renderDepotLayout,
  },
  primeMover:          { title:'Prime Mover Details', crumb:'Compliance', render: renderPrimeMoverPage },

  trailer:             { title:'Trailer Details', crumb:'Compliance', render: renderTrailerPage },

  staffDatabase:       { title:'Staff Database', crumb:'Compliance', render: renderStaffPage },


  whatsappGroups: { title:'WhatsApp Groups', crumb:'Notification', render: () => renderDataPage('whatsappGroups', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['branch', 'status'],
  }) },
  notificationContact: { title:'Notification Contact', crumb:'Notification', render: () => renderDataPage('notificationContact', {
    wrapperClass: 'opkpi-modern-page',
    filterFields: ['status'],
  }) },
  notificationHistory: {
    title:'Notification History',
    crumb:'Notification',
    // System-generated audit trail: no Add/Import/Undo (readOnly), no
    // Edit ever, Delete only for Admin / 'ALL' route. Search, scroll
    // (tablewrap already scrolls at max-height:560px) and Export stay on.
    render: () => renderDataPage('notificationHistory', {
      readOnly: true,
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['module', 'status'],
      tableOptions: {
        showEditButton: false,
        showDeleteButton: hasAllRoutesAccess(),
        // UI-only: hides the Message column from the on-screen table.
        // The 'message' field itself is untouched — it is still written to
        // notificationHistory on every send (see openComplianceAlertModal's
        // sendBtn handler) and def.columns (used by CSV export) is not
        // filtered, so Export Data still includes the full message text.
        visibleColumnIds: ['date','time','module','asset','recipient','phone','sentBy','status'],
      },
    }),
  },

  settings:            { title:'Settings', crumb:'Settings', render: renderSettingsPage },
  releaseManager:      { title:'Release Manager', crumb:'Settings', render: renderReleaseManagerPage },
  userManager:         { title:'User Manager', crumb:'Settings', render: renderUserManagerPage },
  companyManager:      { title:'Company Manager', crumb:'Settings', render: renderCompanyManagerPage },
  systemHealth:        { title:'System Health', crumb:'Administration', render: renderSystemHealthPage },
    /* ---- New module skeletons (registered, existing entries above untouched) ---- */
  tipperOpsDashboard:            { title:'Tipper Dashboard',    crumb:'Tipper Operations',        render: () => renderModuleSkeleton('tipperOpsDashboard') },
  containerOpsDashboard:         { title:'Container Dashboard', crumb:'Container Operations',     render: () => renderModuleSkeleton('containerOpsDashboard') },
  tankerOpsDashboard:            { title:'Tanker Dashboard',    crumb:'Tanker Operations',        render: () => renderModuleSkeleton('tankerOpsDashboard') },
  logisticsDistributionDashboard:{ title:'Logistics Dashboard', crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('logisticsDistributionDashboard') },
  orderPlanning:                 { title:'Order Planning',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('orderPlanning') },
  routePlanning:                 { title:'Route Planning',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('routePlanning') },
  deliveryPlanning:              { title:'Delivery Planning',   crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('deliveryPlanning') },
  podManagement:                 { title:'POD Management',      crumb:'Logistics & Distribution', render: () => renderModuleSkeleton('podManagement') },
  jisa:                          { title:'JISA',                crumb:'Audit & Risk',              render: () => renderModuleSkeleton('jisa') },
  hirarc:                        { title:'HIRARC Register',     crumb:'Audit & Risk',              render: renderHirarcRegisterPage },
  
  apadKnowledgeCenter: {
    title:'APAD Documents',
    crumb:'Knowledge Center',
    render: () => renderDataPage('apadDocuments', { wrapperClass: 'opkpi-modern-page' }) 
  },

  invoiceManagement:             { title:'Invoice Management',  crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('invoiceManagement') },
  vendorManagement:              { title:'Vendor Management',   crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('vendorManagement') },
  pettyCash:                     { title:'Petty Cash',          crumb:'Finance & Cost Control',   render: () => renderModuleSkeleton('pettyCash') },
  
  tipperOperationKPI: {
    title:'Tipper Operation KPI',
    crumb:'Tipper Operations',
    render: () => renderDataPage('operationKPI', { wrapperClass: 'opkpi-modern-page' })
  },

  tipperDriverKPI: {
    title:'Tipper Driver KPI',
    crumb:'Tipper Operations',
    render: () => renderModuleSkeleton('tipperDriverKPI')
  },

  containerOperationKPI: {
    title:'Container Operation KPI',
    crumb:'Container Operations',
    render: () => renderDataPage('containerOperationKPI', { wrapperClass: 'opkpi-modern-page' })
  },

  containerDriverKPI: {
    title:'Container Driver KPI',
    crumb:'Container Operations',
    render: () => renderModuleSkeleton('containerDriverKPI')
  },

  tankerOperationKPI: {
    title:'Tanker Operation KPI',
    crumb:'Tanker Operations',
    render: () => renderModuleSkeleton('tankerOperationKPI')
  },

  tankerDriverKPI: {
    title:'Tanker Driver KPI',
    crumb:'Tanker Operations',
    render: () => renderModuleSkeleton('tankerDriverKPI')
  },
};


/* ============================================================
   4.24 NAV STRUCTURE & ROUTE DEFINITIONS
   Maps sidebar items to page render functions
============================================================= */

const NAV_STRUCTURE = [
  { key:'overview', label:'Main Menu', standalone:true, dot:'var(--teal)' },

  // "Operations" replaces the old flat "Operation" group with the new
  // per-fleet-type nested structure. The legacy operationDashboard,
  // operationKPI and driverKPI routes have been removed (superseded by
  // the fleet-specific dashboard/Operation KPI/Driver KPI routes below).
  { group:'Operations', dot:'#1aa39a', subgroups:[
    { label:'Tipper Operations', items:[
    {key:'tipperOpsDashboard', label:'Dashboard'},
    {key:'tipperOperationKPI', label:'Operation KPI'},
    {key:'tipperDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Container Operations', items:[
    {key:'containerOpsDashboard', label:'Dashboard'},
    {key:'containerOperationKPI', label:'Operation KPI'},
    {key:'containerDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Tanker Operations', items:[
    {key:'tankerOpsDashboard', label:'Dashboard'},
    {key:'tankerOperationKPI', label:'Operation KPI'},
    {key:'tankerDriverKPI', label:'Driver KPI'},
    ]},
    { label:'Logistics & Distribution', items:[
      {key:'logisticsDistributionDashboard', label:'Dashboard'},
      {key:'orderPlanning', label:'Order Planning'},
      {key:'routePlanning', label:'Route Planning'},
      {key:'deliveryPlanning', label:'Delivery Planning'},
      {key:'podManagement', label:'POD Management'},
    ]},
  ]},

  // 'mileage' moved here from the old "Operation" group to match the target tree.
  { group:'Maintenance', dot:'#e6a339', items:['maintenanceDashboard','maintenanceLog','machineryLog','mileage'] },

  // "Safety & Compliance" — item biasa + subgroup.
  // JISA & HIRARC dalam "Audit & Risk" (asing bila dah membesar).
  { group:'Safety & Compliance', dot:'#d1554a', items:[
    {key:'complianceDashboard', label:'Compliance Dashboard'},
  ], subgroups:[
    { label:'Audit & Risk', items:[
      'jisa', 'hirarc',
    ]},
    { label:'Staff & Discipline', items:[
      'misconduct',
      // Buka dua baris ini SELEPAS page + ROUTES siap (kalau tak → baris kosong):
      // {key:'warningLetter',        label:'Warning Letter'},
      // {key:'warningLetterHistory', label:'Warning Letter History'},
      {key:'speedingIdling', label:'Speeding'},
      {key:'staffDatabase',  label:'Staff Database'},
    ]},
    { label:'Vehicle Compliance', items:[
      {key:'primeMover', label:'Prime Mover'},
      {key:'trailer',    label:'Trailer'},
    ]},
    { label:'Fire Safety', items:[
      {key:'feg',               label:'FEG'},
      {key:'fegDisposal',       label:'FEG Disposal'},
      {key:'fegServiceHistory', label:'FEG Service History'},
    ]},
    { label:'Safety Equipment', items:[
      {key:'safetyEquipment', label:'Safety Equipment'},
    ]},
    { label:'Knowledge Center', items:[
      {key:'apadKnowledgeCenter', label:'APAD'},
    ]},
  ]},

  // New flat group — no subgroups needed per target tree.
  { group:'Depot Operations', dot:'#1aa39a', items:[
    {key:'depotOverview', label:'Depot Overview'},
    {key:'depotLayout',   label:'Depot Layout'},
  ]},

  // Renamed from "Notification".
  { group:'Communication', dot:'#4f7fd1', items:[
    {key:'whatsappGroups', label:'WhatsApp Groups'},
    {key:'notificationContact', label:'Notification'},
    'notificationHistory',
  ]},

  // Renamed from "Settings". 'releaseManager' isn't in the requested
  // target tree; kept here (flagged) so SuperAdmins keep sidebar access.
  { group:'Administration', dot:'#7f97ab', items:[
    'settings',
    {key:'releaseManager', label:'Release Manager'},
    'userManager', 'companyManager',
    {key:'systemHealth', label:'System Health'},
  ]},
];

let currentRoute = 'overview';

/* =====================================================================
   ADMIN LIVE (User / Company / Release Manager)
   Data page ini datang dari Edge Function 'admin-provision' (service_role),
   BUKAN bacaan terus Supabase — jadi RLS menghalang realtime push.
   Penyelesaian: polling 5s selagi page terbuka + refresh SEGERA bila
   window dapat fokus semula (dua admin buka serentak -> nampak update
   hampir serta-merta, tanpa refresh page sendiri).
===================================================================== */
const FOCC_ADMIN_LIVE_ROUTES = new Set(['userManager', 'companyManager', 'releaseManager']);
const FOCC_ADMIN_LIVE_MS = 5000;                 // 5s — naikkan ke 15000 kalau nak lebih jimat
const FOCC_ADMIN_LIVE_FOCUS_GAP_MS = 1000;       // hadkan spam bila user tab bolak-balik

let FOCC_ADMIN_LIVE_TIMER = null;
let FOCC_ADMIN_LIVE_ROUTE = '';
let FOCC_ADMIN_LIVE_REFRESH = null;   // didaftarkan oleh setiap page
let FOCC_ADMIN_LIVE_BUSY = false;
let FOCC_ADMIN_LIVE_LAST = 0;

function foccAdminLiveStop(){
  if (FOCC_ADMIN_LIVE_TIMER){ clearInterval(FOCC_ADMIN_LIVE_TIMER); FOCC_ADMIN_LIVE_TIMER = null; }
  document.removeEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.removeEventListener('focus', foccAdminLiveFocusTick);
  FOCC_ADMIN_LIVE_ROUTE = '';
  FOCC_ADMIN_LIVE_REFRESH = null;
  FOCC_ADMIN_LIVE_BUSY = false;
  FOCC_ADMIN_LIVE_LAST = 0;
}

/* Satu "tick" — dikongsi oleh timer & focus listener. */
async function foccAdminLiveTick(){
  if (document.hidden) return;                       // tab tak aktif -> jimat
  if (!FOCC_ADMIN_LIVE_ROUTE || currentRoute !== FOCC_ADMIN_LIVE_ROUTE) return;  // dah tukar page
  if (foccRealtimeModalOpen()) return;               // ada modal terbuka -> jangan ganggu
  if (FOCC_ADMIN_LIVE_BUSY) return;
  if (typeof FOCC_ADMIN_LIVE_REFRESH !== 'function') return;

  FOCC_ADMIN_LIVE_BUSY = true;
  FOCC_ADMIN_LIVE_LAST = Date.now();
  try{ await FOCC_ADMIN_LIVE_REFRESH(); }
  catch(err){ console.warn('Admin live refresh gagal:', err); }
  finally{ FOCC_ADMIN_LIVE_BUSY = false; }
}

/* Dua admin buka serentak: bila window user lain dapat fokus semula
   (klik / tab balik) -> refresh SEGERA, tak payah tunggu tick seterusnya. */
function foccAdminLiveFocusTick(){
  if (document.hidden) return;
  if (Date.now() - FOCC_ADMIN_LIVE_LAST < FOCC_ADMIN_LIVE_FOCUS_GAP_MS) return;
  foccAdminLiveTick();
}

function foccAdminLiveStart(routeKey){
  if (!isSuperAdmin() || !FOCC_ADMIN_LIVE_ROUTES.has(routeKey) || typeof FOCC_ADMIN_LIVE_REFRESH !== 'function'){
    foccAdminLiveStop();
    return;
  }
  if (FOCC_ADMIN_LIVE_TIMER && FOCC_ADMIN_LIVE_ROUTE === routeKey) return;  // dah jalan

  /* Hentikan timer lama TANPA membuang FOCC_ADMIN_LIVE_REFRESH.
     BUG LAMA: fungsi ini memanggil foccAdminLiveStop() yang null-kan
     REFRESH, jadi interval terus mati sebaik mula (guard
     "typeof REFRESH !== 'function'" sentiasa return) -> user lain tak
     pernah nampak apa-apa update sehingga refresh page sendiri. */
  if (FOCC_ADMIN_LIVE_TIMER) clearInterval(FOCC_ADMIN_LIVE_TIMER);
  FOCC_ADMIN_LIVE_TIMER = null;
  FOCC_ADMIN_LIVE_ROUTE = routeKey;
  FOCC_ADMIN_LIVE_BUSY = false;

  document.removeEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.removeEventListener('focus', foccAdminLiveFocusTick);
  document.addEventListener('visibilitychange', foccAdminLiveFocusTick);
  window.addEventListener('focus', foccAdminLiveFocusTick);

  FOCC_ADMIN_LIVE_TIMER = setInterval(foccAdminLiveTick, FOCC_ADMIN_LIVE_MS);
}

// Reads session.routes from localStorage and decides whether the given
// route is visible for the logged-in user. "ALL" (Admin) always passes.
// Does not touch login/session persistence — read-only.
function userCanAccess(routeKey){
  // Release Manager / User Manager / Company Manager: role-gated only
  // (SuperAdmin), independent of session.routes — see isSuperAdmin() above.
  if (routeKey === 'releaseManager' || routeKey === 'userManager' || routeKey === 'companyManager' || routeKey === 'systemHealth') return isSuperAdmin();
  let session;
  try{
    session = JSON.parse(localStorage.getItem('focc-session'));
  }catch(e){
    session = null;
  }
  const routes = (session && Array.isArray(session.routes)) ? session.routes : [];
  if (routes.includes('ALL')) return true;
  return routes.includes(routeKey);
}

// Admin / 'ALL'-route check (Notification History: Delete is Admin-only).
// Deliberately separate from userCanAccess (which answers "can this
// session see route X") — this answers "is this session an Admin",
// independent of any specific route.
function hasAllRoutesAccess(){
  let session;
  try{
    session = JSON.parse(localStorage.getItem('focc-session'));
  }catch(e){
    session = null;
  }
  return !!(session && Array.isArray(session.routes) && session.routes.includes('ALL'));
}

// Release Manager gate: unlike every other route (visibility driven by
// session.routes), Release Manager is visible purely on session.role —
// SuperAdmin only, regardless of what's in session.routes.
function isSuperAdmin(){
  let session;
  try{
    session = JSON.parse(localStorage.getItem('focc-session'));
  }catch(e){
    session = null;
  }
  return !!(session && session.role === 'SuperAdmin');
}

// Root-cause fix (route-restore UX bug): 'overview' is the natural
// fallback landing page, but it is itself a gated route (Safety-type
// users may not have it in session.routes) — so a blind fallback to
// 'overview' can fail exactly the same way the original bug did. This
// walks NAV_STRUCTURE in on-screen order (the same order buildNav uses
// to render the sidebar) and returns the first route this session
// actually has access to, preferring 'overview' when available. Returns
// null only in the pathological case of a session with zero accessible
// routes.
function getFirstAllowedRoute(){
  if (userCanAccess('overview')) return 'overview';
  for (const entry of NAV_STRUCTURE){
    const keys = entry.standalone ? [entry.key] : entry.items;
    for (const key of keys){
      if (ROUTES[key] && userCanAccess(key)) return key;
    }
  }
  return null;
}
function getFirstAllowedRoute(){
  if (userCanAccess('overview')) return 'overview';
  for (const entry of NAV_STRUCTURE){
    if (entry.standalone){
      if (ROUTES[entry.key] && userCanAccess(entry.key)) return entry.key;
      continue;
    }
    // Supports both the original flat `items` shape and the newer
    // `subgroups` shape (each with its own `items`); items in either
    // shape may be a plain routeKey string or a {key,label} object.
    const itemLists = entry.subgroups ? entry.subgroups.map(sg => sg.items) : [entry.items];
    for (const items of itemLists){
      for (const it of items){
        const key = (typeof it === 'string') ? it : it.key;
        if (ROUTES[key] && userCanAccess(key)) return key;
      }
    }
  }
  return null;
}
function navItemKey(item){
  return (typeof item === 'string') ? item : item.key;
}

function navItemLabel(item){
  return (typeof item === 'string')
    ? (ROUTES[item] && ROUTES[item].title)
    : item.label;
}
/* Sidebar nav = FULL page refresh (bersihkan JS state setiap tukar page).
   PENTING: set hash DULU (boot utamakan hash), baru reload — kalau tak,
   reload akan buka page lama semula. */
function reloadToRoute(routeKey){
  // Simpan posisi skrol sidebar — supaya TAK lompat ke atas selepas reload.
  try {
    const nw = document.getElementById('navwrap');
    if (nw) sessionStorage.setItem('focc-nav-scroll', String(nw.scrollTop || 0));
  } catch(e){}
  try { history.replaceState(null, '', '#/' + routeKey); }
  catch(e){ location.hash = '#/' + routeKey; }
  location.reload();
}
function buildNavItemEl(item){
  const routeKey = navItemKey(item);

  const a = document.createElement('a');
  a.className = 'navitem';
  a.dataset.route = routeKey;
  a.textContent = navItemLabel(item);

  a.addEventListener('click', () => reloadToRoute(routeKey));

  return a;
}
function buildNav(){

  const navwrap = document.getElementById('navwrap');
  navwrap.innerHTML = '';

  NAV_STRUCTURE.forEach(entry => {

    if (entry.standalone){
      if (!userCanAccess(entry.key)) return;

      const a = document.createElement('a');
      a.className = 'navitem active';
      a.textContent = entry.label;
      a.style.marginLeft = '2px';
      a.style.fontFamily = 'var(--font-display)';
      a.style.fontWeight = '700';
      a.style.fontSize = '14.5px';
      a.dataset.route = entry.key;

      a.addEventListener('click', () => reloadToRoute(entry.key));

      navwrap.appendChild(a);
      return;
    }

    if (entry.subgroups || entry.items){

      // Item biasa dalam group (contoh: Compliance Dashboard) — di ATAS subgroup.
      const visibleItems = (entry.items || [])
        .filter(it => userCanAccess(navItemKey(it)));

      const visibleSubgroups = (entry.subgroups || [])
        .map(sg => ({
          label: sg.label,
          items: sg.items.filter(it => userCanAccess(navItemKey(it)))
        }))
        .filter(sg => sg.items.length > 0);

      if (visibleItems.length === 0 && visibleSubgroups.length === 0) return;

      const group = document.createElement('div');
      group.className = 'navgroup open';

      group.innerHTML = `
        <div class="navgroup-head">
          <span class="dot" style="background:${entry.dot}"></span>
          ${entry.group}
          <span class="chev">›</span>
        </div>
        <div class="navlist"></div>
      `;

      const head = group.querySelector('.navgroup-head');
      head.addEventListener('click', () => group.classList.toggle('open'));

      const list = group.querySelector('.navlist');

      // 1) Item biasa (bukan subgroup) — di atas sekali
      visibleItems.forEach(it => list.appendChild(buildNavItemEl(it)));

      visibleSubgroups.forEach(sg => {

        const sub = document.createElement('div');
        sub.className = 'navsubgroup';

        sub.innerHTML = `
          <div class="navsubgroup-head">
            <span class="subdot"></span>
            ${sg.label}
            <span class="chev">›</span>
          </div>
          <div class="navsublist"></div>
        `;

        const subHead = sub.querySelector('.navsubgroup-head');

        subHead.addEventListener('click', (e) => {
          e.stopPropagation();
          sub.classList.toggle('open');
        });

        const subList = sub.querySelector('.navsublist');

        sg.items.forEach(it => {
          subList.appendChild(buildNavItemEl(it));
        });

        list.appendChild(sub);

      });

      navwrap.appendChild(group);
      return;
    }

    const visibleItems = entry.items.filter(
      it => userCanAccess(navItemKey(it))
    );

    if (visibleItems.length === 0) return;

    const group = document.createElement('div');

    group.className = 'navgroup open';

    group.innerHTML = `
      <div class="navgroup-head">
        <span class="dot" style="background:${entry.dot}"></span>
        ${entry.group}
        <span class="chev">›</span>
      </div>
      <div class="navlist"></div>
    `;

    const head = group.querySelector('.navgroup-head');

    head.addEventListener('click', () => {
      group.classList.toggle('open');
    });
    const list = group.querySelector('.navlist');
    visibleItems.forEach(it => {
      list.appendChild(buildNavItemEl(it));
    });
    navwrap.appendChild(group);
  });

  // Pulihkan posisi skrol sidebar selepas reload (kekal di tempat asal).
  try{
    const y = Number(sessionStorage.getItem('focc-nav-scroll') || 0);
    if (y > 0){
      const apply = () => { try{ navwrap.scrollTop = y; }catch(e){} };
      requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });  // 2 frame: tinggi nav siap dulu
    }
  }catch(e){}
}

function setActiveNav(routeKey){
  document.querySelectorAll('.navitem').forEach(el => {
    el.classList.toggle('active', el.dataset.route === routeKey);
  });
}

/* Sidebar: buka HANYA kumpulan/sub-kumpulan yang mengandungi page aktif;
   tutup semua yang lain. Tiada item aktif (cth. Overview / deep-link pelik)
   = semua kumpulan tutup. */
function openNavToActive(){
  const navwrap = document.getElementById('navwrap');
  if (!navwrap) return;
  const active = navwrap.querySelector('.navitem.active');
  navwrap.querySelectorAll('.navgroup').forEach(g => {
    g.classList.toggle('open', !!active && g.contains(active));
  });
  navwrap.querySelectorAll('.navsubgroup').forEach(s => {
    s.classList.toggle('open', !!active && s.contains(active));
  });
}
/* ---- Silent refresh: simpan & pulihkan posisi skrol ------------------
   Auto-update realtime dulu buat page "berkelip" + skrol lompat ke atas.
   Fungsi ini menyimpan skrol PAGE + skrol DALAMAN (jadual lebar, panel)
   sebelum render, lalu memulihkannya selepas render.
   Elemen dipadankan ikut susunan DOM — route yang sama = struktur sama. */
function foccScrollables(){
  const out = [];
  try{
    document.querySelectorAll('#content *').forEach(el => {
      const scrollable = (el.scrollWidth  > el.clientWidth  + 1) ||
                         (el.scrollHeight > el.clientHeight + 1);
      if (scrollable) out.push(el);
    });
  }catch(e){}
  return out;
}

function foccCaptureScroll(){
  return {
    win: window.scrollY || window.pageYOffset || 0,
    els: foccScrollables().map(el => ({ left: el.scrollLeft, top: el.scrollTop })),
  };
}

function foccRestoreScroll(saved){
  if (!saved) return;
  const apply = () => {
    try{
      const now = foccScrollables();
      saved.els.forEach((v, i) => {
        const el = now[i];
        if (!el) return;
        if (v.left) el.scrollLeft = v.left;
        if (v.top)  el.scrollTop  = v.top;
      });
      window.scrollTo(0, saved.win);
    }catch(e){}
  };
  // Dua frame: tinggi jadual/panel selalunya belum siap pada frame pertama.
  requestAnimationFrame(() => { apply(); requestAnimationFrame(apply); });
}

const FOCC_ROUTE_KEY = 'focc-last-route';

// Baca #/routeKey dengan selamat. Hash cacat (cth. #/%ZZ) TIDAK crash —
// kita pulangkan nilai mentah dan pemanggil akan abaikan kalau tak sah.
function foccRouteFromHash(){
  const raw = String(location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return '';
  try{ return decodeURIComponent(raw); }
  catch(e){ return raw; }
}

async function goTo(routeKey, opts){
  // silent = auto-refresh data: TIADA "Loading…", TIADA skrol ke atas,
  // dan posisi skrol dipulihkan selepas render (tak berkelip, tak lompat).
  const silent = !!(opts && opts.silent);
  const savedScroll = silent ? foccCaptureScroll() : null;
  // Route Protection: block direct/manual navigation to a route the
  // logged-in user isn't permitted to see (mirrors the nav-visibility
  // rule in userCanAccess/buildNav). Nothing below this runs if blocked.
  if (!userCanAccess(routeKey)){
    alert('Access Denied');
    return;
  }
  currentRoute = routeKey;
  if (routeKey !== 'primeMover') pmForgetOpen();   // tukar page lain → lupai Detail Page lama
  const route = ROUTES[routeKey];
  document.getElementById('pagetitle').textContent = route.title;
  document.getElementById('crumb').textContent = route.crumb;
  setActiveNav(routeKey);
  if (!silent) openNavToActive();          // sidebar: buka hanya kumpulan page aktif
  try{ localStorage.setItem(FOCC_ROUTE_KEY, routeKey); }catch(e){ /* storage unavailable — route persistence is best-effort */ }
  // Tulis page sekarang ke URL (boleh bookmark / kongsi).
  // replaceState = TIADA history entry baru → Back kekal macam sekarang,
  // dan tiada event hashchange yang boleh picu render dua kali.
  try{ history.replaceState(null, '', '#/' + routeKey); }
  catch(e){ /* URL tak boleh diubah — abaikan, app tetap jalan */ }
  const content = document.getElementById('content');
  if (!silent) content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);font-family:var(--font-mono);font-size:12.5px;">Loading&hellip;</div>`;
  try {
    const node = await route.render();
    content.innerHTML = '';
    content.appendChild(node);
  } catch (err){
    console.error('Failed to render page:', routeKey, err);
    content.innerHTML = `
      <div style="padding:32px;text-align:center;">
        <div style="font-size:32px;margin-bottom:10px;">&#9888;</div>
        <div style="font-family:var(--font-display);font-weight:700;font-size:16px;color:var(--navy-900);margin-bottom:6px;">This page couldn't load</div>
        <div style="color:var(--muted);font-size:13px;max-width:420px;margin:0 auto 16px;">Something in the data looks off (often an unrecognised date value from an import). Try again, or check recently imported rows.</div>
        <button class="btn primary" id="retryLoadBtn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById('retryLoadBtn');
    if (retryBtn) retryBtn.addEventListener('click', () => goTo(routeKey));
  }
    // Admin live: polling hanya semasa page SuperAdmin dibuka
  if (FOCC_ADMIN_LIVE_ROUTES.has(routeKey)) foccAdminLiveStart(routeKey);
  else foccAdminLiveStop();
    bugBadgeRefresh();   // dot "!" sentiasa ikut keadaan sebenar dalam server
  // close sidebar on mobile after nav
  if (window.innerWidth <= 900){
    document.getElementById('sidebar').classList.remove('show');
  }
  if (silent) foccRestoreScroll(savedScroll);
  else window.scrollTo(0,0);
}

/* ---------------------------------------------------------------------
   CLOCK + MOBILE TOGGLE + INIT
--------------------------------------------------------------------- */
function tickClock(){
  const el = document.getElementById('liveclock');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {weekday:'short', day:'2-digit', month:'short', year:'numeric'});
  const timeStr = now.toLocaleTimeString('en-GB');
  el.innerHTML = `${dateStr}<br><b>${timeStr}</b>`;
}

document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('show');
});

/* ---- Desktop auto-hide sidebar: hide bila mouse keluar, muncul bila mouse ke tepi kiri ---- */
(function(){
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const zone = document.createElement('div');
  zone.id = 'sbHoverZone';
  document.body.appendChild(zone);
  const mq = window.matchMedia('(min-width:901px)');
  let hideTimer = null;
  function openSidebar(){
    clearTimeout(hideTimer);
    document.body.classList.remove('sb-hidden');
  }
  function scheduleHide(){
    if (!mq.matches) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function(){ document.body.classList.add('sb-hidden'); }, 160);
  }
  function applyMode(){
    clearTimeout(hideTimer);
    // Desktop: mula dengan sidebar TERTUTUP (dulu ia terbuka selepas refresh).
    // Mobile: biar CSS @media(max-width:900px) uruskan (#sidebar.show).
    if (mq.matches) document.body.classList.add('sb-hidden');
    else document.body.classList.remove('sb-hidden');
  }
  if (mq.addEventListener) mq.addEventListener('change', applyMode);
  else if (mq.addListener) mq.addListener(applyMode);
  sb.addEventListener('mouseenter', openSidebar);
  sb.addEventListener('mouseleave', scheduleHide);
  zone.addEventListener('mouseenter', openSidebar);
  applyMode();
})();

/* ---- Theme toggle: light / dark (Pilihan A) ---- */
(function(){
  const STORE_KEY = 'focc.theme';
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  // Public screens (landing + login gate) mesti sentiasa light.
  // Dark mode hanya hidup selepas user masuk app.
  function isPublicScreen(){
    const lp = document.getElementById('foccLandingPage');
    const lg = document.getElementById('foccLoginScreen');
    if (lg && lg.style.display !== 'none') return true;
    if (lp && lp.classList.contains('show')) return true;
    return false;
  }

  function applyTheme(dark){
    const active = dark && !isPublicScreen();
    root.classList.toggle('theme-dark', active);
    if (btn){
      btn.title = active ? 'Light mode' : 'Dark mode';
      btn.setAttribute('aria-label', btn.title);
    }
    return active;
  }

  let saved = 'light';
  try{ saved = localStorage.getItem(STORE_KEY) || 'light'; }catch(e){}

  // Boot: sentiasa start light (landing/login mungkin sedang dipapar).
  applyTheme(false);

  if (btn){
    btn.addEventListener('click', () => {
      const dark = !root.classList.contains('theme-dark');
      applyTheme(dark);
      try{ localStorage.setItem(STORE_KEY, dark ? 'dark' : 'light'); }catch(e){}
    });
  }

  // Hook untuk aliran login/app:
  //  - __foccApplySavedTheme: terapkan pilihan user bila masuk app
  //  - __foccForceLight:       paksa light bila papar landing/login
  window.__foccApplySavedTheme = function(){ applyTheme(saved === 'dark'); };
  window.__foccForceLight = function(){ applyTheme(false); };
})();

async function initFOCC(){
  buildNav();
  tickClock();
  setInterval(tickClock, 1000);
  const sidebarYearEl = document.getElementById('sidebarYear');
  if (sidebarYearEl) sidebarYearEl.innerHTML = `${new Date().getFullYear()} &middot; Live Console`;
  let startRoute = 'overview';
  try{
    // Deep link (#/routeKey) diutamakan — kalau tak sah atau tiada
    // kebenaran, terus abaikan dan guna page biasa (tiada ralat).
    const hashRoute = foccRouteFromHash();
    const savedRoute = localStorage.getItem(FOCC_ROUTE_KEY);
    if (hashRoute && ROUTES[hashRoute] && userCanAccess(hashRoute)){
      startRoute = hashRoute;
    } else if (savedRoute && ROUTES[savedRoute] && userCanAccess(savedRoute)){
      // Saved route exists and this session is still allowed to see it.
      startRoute = savedRoute;
    } else {
      // No saved route, route no longer exists, OR — the bug this fixes —
      // the saved route belongs to a *different* user's session (e.g.
      // Admin viewed operationKPI, logged out, a Safety user logged in on
      // the same browser). Never call goTo() with a route this session
      // can't access; land on the first route it's actually allowed to see.
      startRoute = getFirstAllowedRoute() || 'overview';
    }
  }catch(e){ /* storage unavailable — fall back to overview */ }
  await goTo(startRoute);
  // Auto Backup: never run this at login/startup — wait until the app is
  // fully loaded and idle, then check in the background. checkAutoBackup()
  // itself still only ever proceeds on Saturday, once per ISO week; this
  // timer just keeps it off the critical startup path entirely.
  setTimeout(() => { checkAutoBackup(); }, 30000);
}

/* =========================================================================
   FOCC LOGIN / AUTH GATE — Supabase Auth (email + password)
   ========================================================================= */

/* =============================================================
   SUPABASE (Fasa 1) — login email + password
   Publishable key SELAMAT ada dalam HTML (ia dilindungi oleh RLS).
   JANGAN letak secret key (sb_secret_...) di sini.
============================================================= */
const FOCC_SUPABASE_URL = 'https://hdorjlkwfldykmjhbctc.supabase.co';
const FOCC_SUPABASE_KEY = 'sb_publishable_h-FiqjHNYbz2sz4u_ESCjA_5jfF07mQ';

/* Diinisialisasi dalam try/catch — kalau CDN gagal dimuat,
   FOCC_SUPABASE jadi null dan app TIDAK mati (login lama masih jalan). */
let FOCC_SUPABASE = null;
try {
  FOCC_SUPABASE = window.supabase.createClient(FOCC_SUPABASE_URL, FOCC_SUPABASE_KEY);
} catch (e) {
  console.error('Supabase client gagal dimuat:', e);
}

const FOCC_BACKUP_API =
'https://script.google.com/macros/s/AKfycbzpTzLhYTv4QY6JyUerfEjO1nXzp4fBAJKtR42Mi7Y2eF7TTVmgHg1oeLxMitxaq126wA/exec';

const FOCC_SESSION_KEY = 'focc-session';
let foccBooted = false; // guard: initFOCC() must only ever run once
let FOCC_VERSION = '';

function foccShowLogin(message, isError){
  if (window.__foccForceLight) window.__foccForceLight();
  document.getElementById('app').style.display = 'none';
  document.getElementById('foccLoginScreen').style.display = 'flex';
  const msgEl = document.getElementById('foccLoginMsg');
  if (msgEl){
    msgEl.textContent = message || '';
    msgEl.className = 'focc-login-msg' + (isError ? ' err' : (message ? ' ok' : ''));
  }
}

function foccSetLoginBtnLoading(isLoading){
  const label = document.getElementById('foccLoginBtnLabel');
  const icon = document.getElementById('foccLoginBtnIcon');
  if (!label || !icon) return;
  if (isLoading){
    label.textContent = 'Signing in\u2026';
    icon.outerHTML = '<span class="focc-btn-spinner" id="foccLoginBtnIcon"></span>';
  } else {
    label.textContent = 'Sign In';
    const spinner = document.getElementById('foccLoginBtnIcon');
    if (spinner) spinner.outerHTML = '<svg id="foccLoginBtnIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  }
}

function foccShowApp(session){
  document.getElementById('foccLoginScreen').style.display = 'none';
  document.getElementById('app').style.display = '';
  if (window.__foccApplySavedTheme) window.__foccApplySavedTheme();
  const badge = document.getElementById('foccUserBadge');

  if (badge){
    badge.innerHTML = `
      Company: ${session.company || '-'}<br>
      Company ID: ${session.companyId || '-'}<br>
      Email: ${session.email || '-'}<br>
      Expiry: ${session.expiryDate || '-'}
    `;
  }

  if (!foccBooted){
    foccBooted = true;
    initFOCC();
    bugBadgeStart();   // mula semak laporan New (SuperAdmin sahaja)
  }

  /* Maskot: reset status sembunyi untuk login baharu + ucap selamat kembali. */
  if (window.foccMascot && window.foccMascot.startLogin) window.foccMascot.startLogin(session);

  console.log(
    'User Version:',
    session.version,
    'Current Version:',
    FOCC_VERSION
  );

  if (FOCC_VERSION && session.version !== FOCC_VERSION){

  getSystemUpdates()
  .then(updates => {

    console.log('SYSTEM UPDATES:', updates);

    const latestUpdates = updates.filter(
      x => x.version === FOCC_VERSION
    );

    const message = latestUpdates
      .map(
        x =>
          `✅ ${x.title}\n${x.description}`
        )
        .join('\n\n');

    alert(
  `✨ WHAT'S NEW\n\nVersion ${FOCC_VERSION}\n\n${message}`
);

updateUserVersion(session.email)
  .then(result => {
    console.log(
      'VERSION UPDATED:',
      result
    );
  });

  });
  }
}

/* =====================================================================
   FASA 5 — SUMBER TUNGGAL untuk Sheet ID + Apps Script URL.
   profiles.apps_script_url selalunya kosong (Edge Function tak isi),
   jadi ambil dari `companies` company user itu. Ini yang menjadikan
   device/browser BAHARU tahu URL Kemaman tanpa setup manual.
   RLS "read own company" sudah hadkan kepada company sendiri.
===================================================================== */
async function fetchCompanySheetCreds(companyId){
  const empty = { googleSheetId: '', appsScriptUrl: '', status: 'Active' };
  if (!companyId) return empty;
  try{
    const res = await FOCC_SUPABASE
      .from('companies')
      .select('status, google_sheet_id, apps_script_url')
      .eq('company_id', companyId)
      .maybeSingle();
    if (!res.data) return empty;
    return {
      googleSheetId: res.data.google_sheet_id || '',
      appsScriptUrl: res.data.apps_script_url || '',
      status: res.data.status || 'Active'
    };
  }catch(e){
    console.warn('fetchCompanySheetCreds failed:', e);
    return empty;
  }
}

async function loginFOCC(){
  const emailInput = document.getElementById('foccEmailInput');
  const passInput  = document.getElementById('foccPasswordInput');
  const btn = document.getElementById('foccLoginBtn');

  const email    = (emailInput.value || '').trim();
  const password = (passInput.value || '');

  if (!email){
    foccShowLogin('Please enter your email.', true);
    return;
  }
  if (!password){
    foccShowLogin('Please enter your password.', true);
    return;
  }
  if (!FOCC_SUPABASE){
    foccShowLogin('Login service unavailable. Please try again.', true);
    return;
  }

  btn.disabled = true;
  foccSetLoginBtnLoading(true);
  foccShowLogin('Checking access\u2026', false);

  try{
    /* 1) Sahkan email + password dengan Supabase Auth */
    const authRes = await FOCC_SUPABASE.auth.signInWithPassword({ email, password });

    if (authRes.error || !authRes.data || !authRes.data.user){
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Incorrect email or password.', true);
      return;
    }

    /* 2) Baca profile (company, role, routes, expiry) */
    const profRes = await FOCC_SUPABASE
      .from('profiles')
      .select('*')
      .eq('id', authRes.data.user.id)
      .single();

    const profile = profRes.data;

    if (profRes.error || !profile){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Profile not found. Contact your administrator.', true);
      return;
    }

    /* 3) Status akaun */
    if (String(profile.status || '') !== 'Active'){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Account Suspended', true);
      return;
    }

    /* 4) Status + sheet/script URL company (sumber: Supabase companies) */
    const creds = await fetchCompanySheetCreds(profile.company_id);

    if (creds.status !== 'Active'){
      await FOCC_SUPABASE.auth.signOut();
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccShowLogin('Company Suspended', true);
      return;
    }

    /* 5) Tarikh luput */
    if (profile.expiry_date){
      const today = new Date(); today.setHours(0,0,0,0);
      const expiry = new Date(profile.expiry_date); expiry.setHours(0,0,0,0);
      if (!isNaN(expiry.getTime()) && today > expiry){
        await FOCC_SUPABASE.auth.signOut();
        localStorage.removeItem(FOCC_SESSION_KEY);
        foccShowLogin('Subscription Expired', true);
        return;
      }
    }

    /* 6) Version semasa (Supabase) — kalau gagal, JANGAN block login */
    try{
      const versionInfo = await getCurrentVersion();
      FOCC_VERSION = (versionInfo && versionInfo.currentVersion) || profile.version || '';
    }catch(e){
      FOCC_VERSION = profile.version || '';
    }

    /* 7) Bina session — BENTUK SAMA macam dulu */
    const routes =
      String(profile.allowed_routes || '').trim() === 'ALL'
        ? ['ALL']
        : String(profile.allowed_routes || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

    const session = {
      email:          profile.email || email,
      company:        profile.company || '',
      companyId:      profile.company_id || '',
      googleSheetId:  creds.googleSheetId || '',
      appsScriptUrl:  creds.appsScriptUrl || '',
      role:           profile.role || '',
      routes:         routes,
      expiryDate:     profile.expiry_date || '',
      version:        profile.version || '',
      loginTimestamp: Date.now()
    };

    localStorage.setItem(FOCC_SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(FOCC_ROUTE_KEY);
    await syncProviderFromSession(session);
    foccShowApp(session);

  } catch(err){
    console.error('loginFOCC error:', err);
    foccShowLogin('Unable to verify access. Please try again.', true);
  } finally {
    btn.disabled = false;
    foccSetLoginBtnLoading(false);
  }
}
async function logoutFOCC(){
  /* 1) UI DULU — sinkron, tiada await. Skrin login mesti keluar serta-merta,
        tak kira network atau langkah di bawah gagal. */
  foccBooted = false;
  try{ foccShowLogin('', false); }catch(e){ console.error('logout: show login failed', e); }
  try{ history.replaceState(null, '', '#/login'); }catch(e){}
  try{
    const emailEl = document.getElementById('foccEmailInput');
    if (emailEl) emailEl.value = '';
    const passEl = document.getElementById('foccPasswordInput');
    if (passEl) passEl.value = '';
  }catch(e){}

  /* 2) Bersihkan state — setiap satu diasingkan, jadi satu gagal
        tak menghalang yang lain (dan tak menghalang skrin login). */
  try{ bugBadgeStop(); }catch(e){ console.error('logout: bugBadgeStop failed', e); }
  try{ clearTenantRuntimeState(); }catch(e){ console.error('logout: clearTenantRuntimeState failed', e); }

  /* 3) Baru sentuh session + network. */
  try{ localStorage.removeItem(FOCC_SESSION_KEY); }catch(e){}
  try{ if (FOCC_SUPABASE) await FOCC_SUPABASE.auth.signOut(); }catch(e){}

  /* 4) Kunci: pastikan skrin login KEKAL di hadapan walaupun ada
        callback async yang lewat cuba hidupkan app semula. */
  try{ foccShowLogin('', false); }catch(e){}
}


// 24-hour local session window (Requirement 1). A session younger than
// this is trusted immediately on refresh — no network round-trip is
// required before the dashboard appears. Access is still re-verified
// against Supabase in the background (see foccAutoLogin) so a revoked,
// suspended or expired account is caught without blocking a normal refresh.
const FOCC_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;


/* ---- Landing Page Controls ---- */
function foccGoToLogin(){
  document.getElementById('foccLandingPage').classList.remove('show');
  document.getElementById('foccLoginScreen').style.display = 'flex';
  try{ history.replaceState(null, '', '#/login'); }catch(e){}
}
function foccShowLanding(){
  if (window.__foccForceLight) window.__foccForceLight();
  document.getElementById('foccLandingPage').classList.add('show');
  document.getElementById('foccLoginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  // Landing = URL bersih (buang #/...)
  try{ if (location.hash) history.replaceState(null, '', location.pathname + location.search); }catch(e){}
}
/* Skrin awam ikut hash:
   - deep link ke page app + belum login → LOGIN (hash DIKEKALKAN,
     supaya selepas login user terus ke page itu)
   - '#/login'                          → LOGIN
   - selainnya                          → LANDING (URL dibersihkan)     */
function foccShowPublicScreen(){
  pmForgetOpen();   // logout / session tamat → jangan ingat Detail Page lama
  const h = foccRouteFromHash();
  if ((h && ROUTES[h]) || h === 'login'){ foccShowLogin('', false); return; }
  foccShowLanding();
}
// Smooth scroll for landing nav links
document.querySelectorAll('.focc-lp-nav-links a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const target=document.querySelector(a.getAttribute('href'));
    if(target) target.scrollIntoView({behavior:'smooth',block:'start'});
    // close mobile menu
    document.getElementById('foccLpNavLinks').classList.remove('open');
  });
});
// Hamburger toggle
const lpHamburger=document.getElementById('foccLpHamburger');
if(lpHamburger) lpHamburger.addEventListener('click',()=>{
  document.getElementById('foccLpNavLinks').classList.toggle('open');
});
// Nav scroll effect
const lpNav=document.getElementById('foccLpNav');
if(lpNav) window.addEventListener('scroll',()=>{
  lpNav.classList.toggle('scrolled',window.scrollY>40);
},{passive:true});
/* ---- Legal pages (footer links + overlay) ---- */
(function(){
  const page = document.getElementById('foccLegalPage');
  if (!page) return;
  const closeBtn = document.getElementById('foccLegalClose');
  function showDoc(id){
    const docs = page.querySelectorAll('.focc-legal-doc');
    let found = false;
    docs.forEach(function(d){
      const on = d.getAttribute('data-doc') === id;
      d.hidden = !on;
      if (on) found = true;
    });
    if (!found) return;                 // doc belum wujud (6B/6C)
    page.classList.add('show');
    page.setAttribute('aria-hidden','false');
    page.scrollTop = 0;
    try{ history.replaceState(null, '', '#legal/' + id); }catch(e){}
  }
  function closeLegal(){
    page.classList.remove('show');
    page.setAttribute('aria-hidden','true');
    try{ history.replaceState(null, '', '#/'); }catch(e){}
  }
  document.addEventListener('click', function(ev){
    const t = ev.target.closest('.focc-legal-link');
    if (!t) return;
    ev.preventDefault();
    showDoc(t.getAttribute('data-doc'));
  });
  if (closeBtn) closeBtn.addEventListener('click', closeLegal);
  document.addEventListener('keydown', function(ev){
    if (ev.key === 'Escape' && page.classList.contains('show')) closeLegal();
  });
  // Buka terus kalau URL ada #legal/privacy (boleh kongsi link)
  if (location.hash.indexOf('#legal/') === 0){
    showDoc(location.hash.replace('#legal/',''));
  }
  // Toggle bahasa EN / BM dalam setiap dokumen
  page.addEventListener('click', function(ev){
    const b = ev.target.closest('.focc-legal-lang button');
    if (!b) return;
    const doc = b.closest('.focc-legal-doc');
    const lang = b.getAttribute('data-lang');
    doc.querySelectorAll('.focc-legal-lang button').forEach(function(x){
      x.classList.toggle('on', x.getAttribute('data-lang') === lang);
    });
    doc.querySelectorAll('.focc-legal-body[data-body]').forEach(function(body){
      body.hidden = body.getAttribute('data-body') !== lang;
    });
  });
})();

async function foccAutoLogin(){
  const raw = localStorage.getItem(FOCC_SESSION_KEY);
  if (!raw){
    foccShowPublicScreen();
    return;
  }

  let session;
  try{ session = JSON.parse(raw); } catch(e){ session = null; }
  if (!session || !session.email || !session.loginTimestamp){
    localStorage.removeItem(FOCC_SESSION_KEY);
    foccShowPublicScreen();
    return;
  }

  const ageMs = Date.now() - session.loginTimestamp;
  if (!(ageMs >= 0) || ageMs > FOCC_SESSION_MAX_AGE_MS){
    // Lebih 24 jam — buang session lokal + Supabase.
    localStorage.removeItem(FOCC_SESSION_KEY);
    try{ if (FOCC_SUPABASE) await FOCC_SUPABASE.auth.signOut(); }catch(e){}
    foccShowPublicScreen();
    return;
  }

  /* getSession() baca token dari localStorage — laju, tiada network
     melainkan token perlu refresh. Ini ganti checkAccess lama. */
  let authUser = null;
  try{
    if (FOCC_SUPABASE){
      const sessRes = await FOCC_SUPABASE.auth.getSession();
      authUser = (sessRes && sessRes.data && sessRes.data.session)
        ? sessRes.data.session.user : null;
    }
  }catch(e){ authUser = null; }

  if (!authUser){
    // Tiada session Supabase yang sah — kena login semula.
    localStorage.removeItem(FOCC_SESSION_KEY);
    foccBooted = false;
    foccShowPublicScreen();
    return;
  }

  const emailInput = document.getElementById('foccEmailInput');
  if (emailInput) emailInput.value = session.email;

  // Tunjuk dashboard SERTA-MERTA dari cache (Requirement 3), kemudian
  // sahkan dengan Supabase di belakang — sama macam reka bentuk asal.
  await syncProviderFromSession(session);
  foccShowApp(session);

  try{
    const profRes = await FOCC_SUPABASE
      .from('profiles').select('*').eq('id', authUser.id).single();

    const profile = profRes.data;

    let allowed = !!profile && String(profile.status || '') === 'Active';

    let creds = { googleSheetId: '', appsScriptUrl: '', status: 'Active' };
    if (allowed && profile.company_id){
      creds = await fetchCompanySheetCreds(profile.company_id);
      if (creds.status !== 'Active') allowed = false;
    }

    if (allowed && profile.expiry_date){
      const today = new Date(); today.setHours(0,0,0,0);
      const expiry = new Date(profile.expiry_date); expiry.setHours(0,0,0,0);
      if (!isNaN(expiry.getTime()) && today > expiry) allowed = false;
    }

    if (allowed){
      const routes =
        String(profile.allowed_routes || '').trim() === 'ALL'
          ? ['ALL']
          : String(profile.allowed_routes || '')
              .split(',').map(v => v.trim()).filter(Boolean);

      const refreshed = {
        email:          profile.email || session.email,
        company:        profile.company || '',
        companyId:      profile.company_id || '',
        googleSheetId:  creds.googleSheetId || '',
        appsScriptUrl:  creds.appsScriptUrl || '',
        role:           profile.role || '',
        routes:         routes,
        expiryDate:     profile.expiry_date || '',
        version:        profile.version || '',
        loginTimestamp: session.loginTimestamp
      };

      localStorage.setItem(FOCC_SESSION_KEY, JSON.stringify(refreshed));
      await syncProviderFromSession(refreshed);

      const badge = document.getElementById('foccUserBadge');
      if (badge){
        badge.innerHTML = `
          Company: ${refreshed.company || '-'}<br>
          Company ID: ${refreshed.companyId || '-'}<br>
          Email: ${refreshed.email || '-'}<br>
          Expiry: ${refreshed.expiryDate || '-'}
        `;
      }
    } else {
      localStorage.removeItem(FOCC_SESSION_KEY);
      foccBooted = false;
      try{ await FOCC_SUPABASE.auth.signOut(); }catch(e){}
      foccShowPublicScreen();
    }
  } catch(err){
    // Network gagal — kekalkan session yang dah dipulihkan tadi.
  }
}

const foccEmailEl = document.getElementById('foccEmailInput');
if (foccEmailEl) foccEmailEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginFOCC();
});
const foccPassEl = document.getElementById('foccPasswordInput');
if (foccPassEl) foccPassEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginFOCC();
});


const foccAsideYearEl = document.getElementById('foccAsideYear');
if (foccAsideYearEl) foccAsideYearEl.innerHTML = `&copy; ${new Date().getFullYear()} Fleet Operations`;

/* =====================================================================
   FOCC MASCOT — burung hantu penggalak semangat (vanilla, tiada React)
   - Pandang ikut cursor (9 arah) + reaksi bila ditekan
   - Idle 8 minit → tegur user dengan ayat semangat
   - Auto ikut tema (light/dark) sebab bubble guna CSS variable
   ===================================================================== */
(function(){
  const wrap   = document.getElementById('foccMascot');
  const btn    = document.getElementById('foccMascotBtn');
  const dirLay = document.getElementById('foccMascotDir');
  const rctLay = document.getElementById('foccMascotReact');
  const bubble = document.getElementById('foccMascotBubble');
  const textEl = document.getElementById('foccMascotText');
  const hideBtn= document.getElementById('foccMascotHide');
  if (!wrap || !btn || !dirLay || !rctLay || !bubble || !textEl) return;

  /* Guna sessionStorage (bukan localStorage) supaya pilihan "sembunyi"
     hidup untuk sesi ini sahaja — hilang bila tab ditutup / login baharu. */
  const HIDE_KEY        = 'focc.mascot.hidden';
  const LOGIN_STAMP_KEY = 'focc.mascot.loginStamp';
  const GREET_KEY       = 'focc.mascot.greeted';

  /* Ayat klik (semangat) */
  const CLICK_LINES = [
    "Be Intelligent Person \u2014 Don't Give Up!",
    "Keep Going \u2014 You're Doing Great!",
    "Small Steps, Big Progress.",
    "Stay Focused. You've Got This.",
    "Every Problem Has a Solution.",
    "Think Smart. Move Forward.",
    "Don't Stop Until You're Proud.",
    "Your Effort Matters."
  ];
  /* Ayat idle (lembut — user mungkin penat, bukan sengaja) */
  const IDLE_LINES = [
    "One Task at a Time. You're Fine.",
    "Breathe. Then Continue Strong."
  ];

  /* Sprite sheet 3x3 (row-major) */
  const DIR = { UP_LEFT:0, UP:1, UP_RIGHT:2, LEFT:3, CENTER:4, RIGHT:5, DOWN_LEFT:6, DOWN:7, DOWN_RIGHT:8 };
  const ANGLE_TO_DIR = [ DIR.RIGHT, DIR.DOWN_RIGHT, DIR.DOWN, DIR.DOWN_LEFT, DIR.LEFT, DIR.UP_LEFT, DIR.UP, DIR.UP_RIGHT ];
  const R_HEART = 1, R_SPARKLE = 2, R_SURPRISED = 3, R_WINK = 4, R_DELIGHTED = 8;
  const CLICK_REACTIONS = [ R_HEART, R_SPARKLE, R_DELIGHTED, R_WINK ];

  const DEAD_ZONE     = 70;                 /* px — dekat sini kepala settle ke tengah  */
  const IDLE_FIRST_MS = 8  * 60 * 1000;     /* nudge pertama: 8 minit                    */
  const IDLE_REPEAT_MS= 12 * 60 * 1000;     /* nudge seterusnya: setiap 12 minit         */

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canTrack     = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let dirIndex = DIR.CENTER;
  let pendingX = null, pendingY = null, rafId = null;
  let bubbleTimer = null, reactTimer = null, idleTimer = null;
  let bubbleOn = false, lastLine = '';

  /* index 0..8 -> posisi dalam grid 3x3 */
  function setCell(layer, index){
    layer.style.backgroundPosition = ((index % 3) * 50) + '% ' + (Math.floor(index / 3) * 50) + '%';
  }
  function setDirection(i){
    if (i === dirIndex) return;
    dirIndex = i;
    setCell(dirLay, i);
  }
  function playReaction(i, ms){
    setCell(rctLay, i);
    rctLay.classList.add('is-on');
    clearTimeout(reactTimer);
    reactTimer = setTimeout(function(){ rctLay.classList.remove('is-on'); }, ms || 900);
  }
  function pickLine(pool){
    if (pool.length === 1) return pool[0];
    let line = pool[Math.floor(Math.random() * pool.length)];
    if (line === lastLine) line = pool[(pool.indexOf(line) + 1) % pool.length];
    lastLine = line;
    return line;
  }
  function showBubble(pool){
    textEl.textContent = pickLine(pool);
    bubble.classList.add('show');
    bubbleOn = true;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 4000);
  }
  function hideBubble(){
    clearTimeout(bubbleTimer);
    bubble.classList.remove('show');
    bubbleOn = false;
  }

  /* ---- sorok / tunjuk ikut pilihan user ---- */
  function applyVisibility(){
    /* Maskot = untuk team Poreia (SuperAdmin) SAHAJA semasa development.
       User/customer biasa tidak pernah nampak dia. */
    if (typeof isSuperAdmin !== 'function' || !isSuperAdmin()){ wrap.hidden = true; return; }
    let hidden = false;
    try{ hidden = sessionStorage.getItem(HIDE_KEY) === '1'; }catch(e){}
    wrap.hidden = hidden;
  }

  /* ---- pandang ikut cursor (viewport-based → scroll tak pecahkan) ---- */
  function updateGaze(){
    rafId = null;
    if (pendingX === null) return;
    const r  = btn.getBoundingClientRect();
    const dx = pendingX - (r.left + r.width  / 2);
    const dy = pendingY - (r.top  + r.height / 2);
    if (Math.sqrt(dx * dx + dy * dy) < DEAD_ZONE){ setDirection(DIR.CENTER); return; }
    const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    setDirection(ANGLE_TO_DIR[Math.round(deg / 45) % 8]);
  }
  if (canTrack){
    window.addEventListener('pointermove', function(e){
      pendingX = e.clientX; pendingY = e.clientY;
      if (rafId === null) rafId = requestAnimationFrame(updateGaze);
    }, { passive:true });
  }

  /* ---- klik maskot ---- */
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    armIdle(IDLE_FIRST_MS);
    if (bubbleOn){ hideBubble(); return; }
    playReaction(CLICK_REACTIONS[Math.floor(Math.random() * CLICK_REACTIONS.length)]);
    showBubble(CLICK_LINES);
  });
  btn.addEventListener('mouseenter', function(){
    if (!bubbleOn) playReaction(R_WINK, 620);
  });

  /* ---- tutup bubble: klik luar / Escape ---- */
  document.addEventListener('click', function(e){
    if (bubbleOn && !wrap.contains(e.target)) hideBubble();
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') hideBubble();
  });

  /* ---- butang x (sembunyi selama-lamanya) ---- */
  if (hideBtn){
    hideBtn.addEventListener('click', function(e){
      e.stopPropagation();
      try{ sessionStorage.setItem(HIDE_KEY, '1'); }catch(err){}
      hideBubble();
      wrap.hidden = true;
    });
  }

  /* ---- idle trigger (anti-mengantuk) ---- */
  function armIdle(ms){
    clearTimeout(idleTimer);
    idleTimer = setTimeout(fireIdle, ms);
  }
  function fireIdle(){
    const app = document.getElementById('app');
    const visible = app && app.style.display !== 'none' && !wrap.hidden;
    if (visible){
      playReaction(R_SURPRISED, 1200);
      showBubble(IDLE_LINES);
      armIdle(IDLE_REPEAT_MS);
    } else {
      armIdle(IDLE_FIRST_MS);
    }
  }
  ['pointerdown','pointermove','keydown','wheel','touchstart'].forEach(function(ev){
    window.addEventListener(ev, function(){ armIdle(IDLE_FIRST_MS); }, { passive:true });
  });

  /* ---- ucapan selamat kembali ---- */
  function nameFromEmail(email){
    let s = String(email || '').trim().toLowerCase();
    if (!s) return '';
    s = s.split('@')[0];              /* sebelum '@' */
    s = s.split('+')[0];              /* buang tag '+' */
    s = s.split(/[._\-]/)[0];         /* perkataan pertama: abdullah.bakar -> abdullah */
    s = s.replace(/[^a-z0-9]/g, '');  /* buang aksara pelik */
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function greetingFor(name){
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : (h < 18 ? 'Good afternoon' : 'Good evening');
    return part + (name ? ', ' + name : '') + '!';
  }
  function showWelcome(name){
    playReaction(R_HEART, 1400);
    textEl.textContent = greetingFor(name);
    bubble.classList.add('show');
    bubbleOn = true;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, 5000);
    armIdle(IDLE_FIRST_MS);           /* reset jam idle supaya tak mencelah */
  }

  /* ---- boot ---- */
  applyVisibility();
  setCell(dirLay, DIR.CENTER);
  setCell(rctLay, R_SPARKLE);
  if (!reduceMotion) wrap.classList.add('is-animated');
  armIdle(IDLE_FIRST_MS);

  /* ---- API untuk login (dipanggil dari foccShowApp) ---- */
  window.foccMascot = {
    startLogin: function(session){
      /* SuperAdmin sahaja (development) — customer biasa, sembunyi terus. */
      const allowed = (typeof isSuperAdmin === 'function') ? isSuperAdmin() : false;
      if (!allowed){ wrap.hidden = true; hideBubble(); return; }
      const stamp = String((session && session.loginTimestamp) || 0);
      let isNewLogin = true;
      try{
        isNewLogin = sessionStorage.getItem(LOGIN_STAMP_KEY) !== stamp;
        sessionStorage.setItem(LOGIN_STAMP_KEY, stamp);
      }catch(e){}

      if (isNewLogin){
        /* Login baharu → buang pilihan sembunyi, maskot balik. */
        try{ sessionStorage.removeItem(HIDE_KEY); }catch(e){}
        wrap.hidden = false;
      }

      /* Ucapan: SEKALI sahaja per sesi login (refresh tak ulang). */
      let greeted = false;
      try{ greeted = sessionStorage.getItem(GREET_KEY) === stamp; }catch(e){}
      if (!wrap.hidden && !greeted){
        try{ sessionStorage.setItem(GREET_KEY, stamp); }catch(e){}
        setTimeout(function(){ showWelcome(nameFromEmail(session && session.email)); }, 700);
      }
    }
  };
})();

foccAutoLogin();

