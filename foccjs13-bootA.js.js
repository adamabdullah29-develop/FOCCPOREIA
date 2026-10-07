/* =========================================================================
   FOCC — 13-boot.js
   ROUTES, NAV_STRUCTURE, buildNav, goTo, initFOCC, theme, event listeners.
   ========================================================================= */

/* =========================================================================
   BAHAGIAN A — ROUTES + NAV_STRUCTURE
   ========================================================================= */

/* ============================================================
   ROUTES — peta semua page
============================================================= */
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
  })},

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
    render: () => renderDataPage('notificationHistory', {
      readOnly: true,
      wrapperClass: 'opkpi-modern-page',
      filterFields: ['module', 'status'],
      tableOptions: {
        showEditButton: false,
        showDeleteButton: hasAllRoutesAccess(),
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
   NAV_STRUCTURE — sidebar
============================================================= */
const NAV_STRUCTURE = [
  { key:'overview', label:'Main Menu', standalone:true, dot:'var(--teal)' },

  // "Operations" replaces the old flat "Operation" group with the new
  // per-fleet-type nested structure.
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

  { group:'Maintenance', dot:'#e6a339', items:['maintenanceDashboard','maintenanceLog','machineryLog','mileage'] },

  { group:'Safety & Compliance', dot:'#d1554a', items:[
    {key:'complianceDashboard', label:'Compliance Dashboard'},
  ], subgroups:[
    { label:'Audit & Risk', items:[
      'jisa', 'hirarc',
    ]},
    { label:'Staff & Discipline', items:[
      'misconduct',
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

  { group:'Finance & Cost Control', dot:'#8a5fd1', items:[
    'invoiceManagement', 'vendorManagement', 'pettyCash',
  ]},

  { group:'Communication', dot:'#4f7fd1', items:[
    {key:'whatsappGroups', label:'WhatsApp Groups'},
    {key:'notificationContact', label:'Notification'},
    'notificationHistory',
  ]},

  { group:'Administration', dot:'#7f97ab', items:[
    'settings',
    {key:'releaseManager', label:'Release Manager'},
    'userManager', 'companyManager',
    {key:'systemHealth', label:'System Health'},
  ]},
];