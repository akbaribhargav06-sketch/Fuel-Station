/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TranslationSet {
  // Navigation
  dashboard: string;
  shiftMgmt: string;
  employeeMgmt: string;
  nozzleMgmt: string;
  tankMgmt: string;
  dailyEntries: string;
  reports: string;
  udhaarKhata: string;
  dayBook: string;
  systemLogs: string;
  logout: string;
  
  // Dashboard & Header
  appTitle: string;
  langToggle: string;
  darkMode: string;
  lightMode: string;
  welcome: string;
  dailyCollection: string;
  totalDailySale: string;
  petrolStock: string;
  dieselStock: string;
  activeShift: string;
  shiftClosed: string;
  todaysAttendance: string;
  mismatchAlertTitle: string;
  mismatchAlertDesc: string;
  
  // Common terms & Buttons
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  submit: string;
  actions: string;
  status: string;
  active: string;
  inactive: string;
  disabled: string;
  enable: string;
  disable: string;
  all: string;
  date: string;
  name: string;
  phone: string;
  role: string;
  noData: string;
  loading: string;
  export: string;
  print: string;
  success: string;
  error: string;
  
  // Shift Mgmt
  shiftList: string;
  addShift: string;
  editShift: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  timing: string;
  assignStaff: string;
  shiftsLimitExceeded: string;
  
  // Employee Mgmt
  employeeList: string;
  addEmployee: string;
  editEmployee: string;
  mobileNumber: string;
  staffRole: string;
  adminRole: string;
  managerRole: string;
  employeeRole: string;
  attendance: string;
  present: string;
  absent: string;
  assignToShift: string;
  
  // Nozzle Mgmt
  nozzleList: string;
  addNozzle: string;
  editNozzle: string;
  nozzleNo: string;
  fuelType: string;
  linkedTank: string;
  assignedOperator: string;
  openingReading: string;
  closingReading: string;
  testingLiters: string;
  litresSold: string;
  shortageExtra: string;
  petrol: string;
  diesel: string;
  
  // Tank / Stock Mgmt
  tankList: string;
  addTank: string;
  editTank: string;
  tankName: string;
  capacity: string;
  openingStock: string;
  currentStock: string;
  purchaseStock: string;
  dailyStockBalance: string;
  mismatchLitres: string;
  mismatchValue: string;
  calculatedSales: string;
  fuelRate: string;
  pricePerLitre: string;
  
  // Daily Entries
  operatorNozzleEntry: string;
  cashReceived: string;
  upiPayment: string;
  cardPayment: string;
  creditSales: string;
  creditClient: string;
  totalCollections: string;
  reconciliation: string;
  reconciliationDiff: string;
  surplus: string;
  shortage: string;
  balanced: string;
  closeShiftBtn: string;
  openShiftBtn: string;
  quickSaveBtn: string;
  notes: string;
  
  // Security / Login
  loginTitle: string;
  loginSubtitle: string;
  pinLabel: string;
  nameOrPhonePlaceholder: string;
  enterPinPlaceholder: string;
  unauthorizedMsg: string;
  operatorLoginNote: string;
  
  // Reports
  filters: string;
  monthlyReport: string;
  profitLossReport: string;
  saleReceipts: string;
  totalLitres: string;
  totalRevenue: string;
  netProfit: string;
  totalExpenses: string;
  estimatedProfit: string;
  whatsAppShare: string;
  backupRestoreBtn: string;
  backupTitle: string;
  restoreTitle: string;
  selectBackupFile: string;
}

export type LanguageCode = 'en' | 'gu';

export const translations: Record<LanguageCode, TranslationSet> = {
  en: {
    dashboard: "Dashboard",
    shiftMgmt: "Shift Management",
    employeeMgmt: "Employee Management",
    nozzleMgmt: "Nozzle Management",
    tankMgmt: "Tank / Stock",
    dailyEntries: "Daily Entry",
    reports: "Reporting & Export",
    udhaarKhata: "Udhaar Khata (Credit)",
    dayBook: "Day Book (24h Hisab)",
    systemLogs: "System Logs",
    logout: "Log Out",
    
    appTitle: "Petrol Pump Boss",
    langToggle: "ગુજરાતી",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    welcome: "Welcome back",
    dailyCollection: "Daily Collection",
    totalDailySale: "Daily Fuel Sales",
    petrolStock: "Petrol Safe Stock",
    dieselStock: "Diesel Safe Stock",
    activeShift: "Active Shift",
    shiftClosed: "Status: Closed",
    todaysAttendance: "Attendance Count",
    mismatchAlertTitle: "Fuel Stock Discrepancy Alert",
    mismatchAlertDesc: "Calculated stock from nozzle sales does not match physically entered tank closing levels. Checked systems auto-flagged this mismatch.",
    
    add: "Add New",
    edit: "Modify",
    delete: "Delete",
    save: "Save Changes",
    cancel: "Cancel",
    submit: "Record & Save",
    actions: "Actions",
    status: "Status",
    active: "Active",
    inactive: "Deactivated",
    disabled: "Disabled",
    enable: "Turn On",
    disable: "Turn Off",
    all: "All Statuses",
    date: "Date",
    name: "Full Name",
    phone: "Mobile No.",
    role: "System Role",
    noData: "No data records found in server.",
    loading: "Fetching records...",
    export: "Export CSV",
    print: "Print Statement",
    success: "Success!",
    error: "Error occurred",
    
    shiftList: "Operational Shifts",
    addShift: "Create Shift Type",
    editShift: "Modify Shift Config",
    shiftName: "Shift Title",
    startTime: "Starting Hour",
    endTime: "Ending Hour",
    timing: "Timing Limit",
    assignStaff: "Roster Distribution",
    shiftsLimitExceeded: "Error: Shift threshold limit reached.",
    
    employeeList: "Register of Personnel",
    addEmployee: "Register Employee",
    editEmployee: "Modify Employee file",
    mobileNumber: "10-Digit Mobile",
    staffRole: "Authorized Role",
    adminRole: "Administrator",
    managerRole: "Station Manager",
    employeeRole: "Pump Operator",
    attendance: "Daily Attendance",
    present: "Present",
    absent: "Absent",
    assignToShift: "Shift Assignment",
    
    nozzleList: "Pump Fuel Nozzles",
    addNozzle: "Mount New Nozzle",
    editNozzle: "Re-Configure Nozzle",
    nozzleNo: "Nozzle Number",
    fuelType: "Fuel Type",
    linkedTank: "Connected Tank Feed",
    assignedOperator: "Nozzle Attendant",
    openingReading: "Opening Meter (L)",
    closingReading: "Closing Meter (L)",
    testingLiters: "Testing Litres (L)",
    litresSold: "Calculated Sale (L)",
    shortageExtra: "Shortage / Extra",
    petrol: "Petrol (MS)",
    diesel: "Diesel (HSD)",
    
    tankList: "Fuel Reservoir Tanks",
    addTank: "Install Tank",
    editTank: "Configure Tank Capacity",
    tankName: "Reservoir Name",
    capacity: "Max Capacity (L)",
    openingStock: "Opening Volume (L)",
    currentStock: "Current Fuel (L)",
    purchaseStock: "Decanted Cargo (L)",
    dailyStockBalance: "Daily Balance Log",
    mismatchLitres: "Mismatch Litres",
    mismatchValue: "Mismatch Value",
    calculatedSales: "Calculated Sales (L)",
    fuelRate: "Rate (₹/Litre)",
    pricePerLitre: "Price / L",
    
    operatorNozzleEntry: "Operator Nozzle Log & Proceeds",
    cashReceived: "Cash Collected (₹)",
    upiPayment: "UPI Receipts (₹)",
    cardPayment: "Card Swipes (₹)",
    creditSales: "Credit Sales (₹)",
    creditClient: "Credit Client Name",
    totalCollections: "Total Money Collected",
    reconciliation: "Payment Reconciliation",
    reconciliationDiff: "Difference Margin",
    surplus: "Cash Surplus (+)",
    shortage: "Shortage Deficit (-)",
    balanced: "Fully Balanced (0)",
    closeShiftBtn: "Close Active Shift",
    openShiftBtn: "Initialize New Shift",
    quickSaveBtn: "Save Operator Draft",
    notes: "Rostering / Audit Notes",
    
    loginTitle: "Station Control Hub",
    loginSubtitle: "Petrol / Diesel Pump ERP Gatekeeper",
    pinLabel: "Secret Security PIN",
    nameOrPhonePlaceholder: "Enter Employee Name or Mobile",
    enterPinPlaceholder: "Admin: 1234, Manager: 5678, Staff: 0000",
    unauthorizedMsg: "Access Denied. Verification Required.",
    operatorLoginNote: "Note: Staff use default terminal bypass code 0000. Managers use 5678.",
    
    filters: "Filter Parameters",
    monthlyReport: "Monthly Analytics",
    profitLossReport: "P&L Balance Sheet",
    saleReceipts: "Sales Breakdown",
    totalLitres: "Total Litres Dispensed",
    totalRevenue: "Gross Billings",
    netProfit: "Net Proceeds (Est.)",
    totalExpenses: "Assessed Cost of Goods",
    estimatedProfit: "Estimated Margin",
    whatsAppShare: "Share via WhatsApp",
    backupRestoreBtn: "Backup / Restore Database",
    backupTitle: "Export State Backup",
    restoreTitle: "Import State Restore",
    selectBackupFile: "Select saved database.json backup"
  },
  gu: {
    dashboard: "મુખ્ય ડેશબોર્ડ",
    shiftMgmt: "શિફ્ટ મેનેજમેન્ટ",
    employeeMgmt: "કર્મચારી મેનેજમેન્ટ",
    nozzleMgmt: "નોઝલ મેનેજમેન્ટ",
    tankMgmt: "ટાંકી / સ્ટોક",
    dailyEntries: "દૈનિક એન્ટ્રી",
    reports: "અહેવાલ અને નિકાસ",
    udhaarKhata: "ઉધાર ખાતું / લેજર",
    dayBook: "૨૪ કલાક મેળ (ડેઇલી બુક)",
    systemLogs: "સિસ્ટમ લોગ્સ",
    logout: "લૉગ આઉટ",
    
    appTitle: "પેટ્રોલ પંપ બોસ",
    langToggle: "English",
    darkMode: "ડાર્ક મોડ",
    lightMode: "લાઇટ મોડ",
    welcome: "સુસ્વાગતમ",
    dailyCollection: "દૈનિક વસૂલાત",
    totalDailySale: "દૈનિક બળતણ વેચાણ",
    petrolStock: "પેટ્રોલ સેફ સ્ટોક",
    dieselStock: "ડીઝલ સેફ સ્ટોક",
    activeShift: "ચાલુ કાર્યરત શિફ્ટ",
    shiftClosed: "સ્થિતિ: બંધ છે",
    todaysAttendance: "હાજર કર્મચારીઓ",
    mismatchAlertTitle: "આઇટમ સ્ટોક તફાવત ચેતવણી",
    mismatchAlertDesc: "નોઝલ વેચાણ પરથી ગણતરી કરેલ બળતણ ટાંકીના વાસ્તવિક માપ (ડીપ) સાથે મેળ ખાતું નથી. સિસ્ટમ દ્વારા વિસંગતતા શોધાઇ છે.",
    
    add: "નવું ઉમેરો",
    edit: "ફેરફાર કરો",
    delete: "કાઢી નાખો",
    save: "ફેરફાર સાચવો",
    cancel: "રદ કરો",
    submit: "નોંધો અને સાચવો",
    actions: "ક્રિયાઓ",
    status: "સ્થિતિ",
    active: "કાર્યરત",
    inactive: "બંધ કરેલ",
    disabled: "નિષ્ક્રિય કરેલ",
    enable: "ચાલુ કરો",
    disable: "બંધ કરો",
    all: "બધી સ્થિતિ",
    date: "તારીખ",
    name: "પૂરું નામ",
    phone: "મોબાઇલ નંબર",
    role: "હોદ્દો (રોલ)",
    noData: "સર્વર પર કોઈ રેકોર્ડ મળ્યા નથી.",
    loading: "રેકોર્ડ મેળવી રહ્યા છીએ...",
    export: "CSV ડાઉનલોડ કરો",
    print: "પ્રિન્ટ સ્ટેટમેન્ટ",
    success: "સફળ થયો!",
    error: "ભૂલ આવી છે",
    
    shiftList: "પંપ સમય પત્રક (શિફ્ટ)",
    addShift: "નવી શિફ્ટ ઉમેરો",
    editShift: "શિફ્ટ સુધારો",
    shiftName: "શિફ્ટ નામ",
    startTime: "શરૂઆતનો સમય",
    endTime: "પૂર્ણ થવાનો સમય",
    timing: "શિફ્ટ સમયગાળો",
    assignStaff: "સ્ટાફ ફાળવણી",
    shiftsLimitExceeded: "ભૂલ: મર્યાદા કરતા વધારે શિફ્ટ ઉમેરી શકાશે નહીં.",
    
    employeeList: "કર્મચારીઓની યાદી",
    addEmployee: "નવો કર્મચારી ઉમેરો",
    editEmployee: "કર્મચારી માહિતી સુધારો",
    mobileNumber: "૧૦ અંકો નો મોબાઈલ",
    staffRole: "પરવાનગી સ્તર (રોલ)",
    adminRole: "મુખ્ય સંચાલક (Admin)",
    managerRole: "પંપ મેનેજર (Manager)",
    employeeRole: "પંપ ઓપરેટર (Operator)",
    attendance: "દૈનિક હાજરી પત્રક",
    present: "હાજર",
    absent: "ગેરહાજર",
    assignToShift: "શિફ્ટ ફાળવણી",
    
    nozzleList: "ફ્યુઅલ નોઝલ પંપ",
    addNozzle: "નવી નોઝલ ફીટ કરો",
    editNozzle: "નોઝલ ગોઠવણી બદલો",
    nozzleNo: "નોઝલ નંબર",
    fuelType: "બળતણ પ્રકાર",
    linkedTank: "જોડાયેલ તેલ ટાંકી",
    assignedOperator: "ચાર્જ પર ઓપરેટર",
    openingReading: "શરૂઆતનું રીડીંગ (L)",
    closingReading: "અંતિમ રીડીંગ (L)",
    testingLiters: "ટેસ્ટિંગ લીટર (L)",
    litresSold: "વેચાયેલ લીટર (L)",
    shortageExtra: "ઘટ / વધારા અહેવાલ",
    petrol: "પેટ્રોલ (MS)",
    diesel: "ડીઝલ (HSD)",
    
    tankList: "મુખ્ય તેલ સંગ્રહ ટાંકી",
    addTank: "નવી ટાંકી સ્થાપિત કરો",
    editTank: "ટાંકી કેપેસીટી સુધારો",
    tankName: "ટાંકીનું નામ",
    capacity: "મહત્તમ ક્ષમતા (લીટર)",
    openingStock: "શરૂઆતનો સ્ટોક (L)",
    currentStock: "હાલનો બળતણ સ્ટોક (L)",
    purchaseStock: "નવો આવેલ સ્ટોક (L)",
    dailyStockBalance: "દૈનિક સ્ટોક બેલેન્સ",
    mismatchLitres: "તફાવત લીટર",
    mismatchValue: "તફાવત રકમ (₹)",
    calculatedSales: "ગણતરી કરેલ વેચાણ (L)",
    fuelRate: "ભાવ (₹/લીટર)",
    pricePerLitre: "લીટર દીઠ ભાવ",
    
    operatorNozzleEntry: "ઓપરેટર નોઝલ રીડીંગ અને રોકડ નોંધ",
    cashReceived: "રોકડા મળેલ (₹)",
    upiPayment: "UPI ટ્રાન્સફર (₹)",
    cardPayment: "કાર્ડ સ્વાઇપ (₹)",
    creditSales: "ઉધાર વેચાણ (₹)",
    creditClient: "ઉધાર ગ્રાહકનું નામ",
    totalCollections: "કુલ એકત્ર કરેલ રકમ",
    reconciliation: "નાણાકીય મેળવણી (Reconcile)",
    reconciliationDiff: "વફાદારી તફાવત",
    surplus: "તિજોરી વધારો (+)",
    shortage: "તિજોરી ઘટ (-)",
    balanced: "બરાબર મેચ થાય છે (0)",
    closeShiftBtn: "આ શિફ્ટ બંધ કરો",
    openShiftBtn: "નવી શિફ્ટ ચાલુ કરો",
    quickSaveBtn: "ઓપરેટર ડ્રાફ્ટ સાચવો",
    notes: "શિફ્ટ નોંધ (ઓડિટર ટિપ્પણી)",
    
    loginTitle: "પંપ કંટ્રોલ સેન્ટર",
    loginSubtitle: "પેટ્રોલ-ડીઝલ સોફ્ટવેર કંટ્રોલ કેન્દ્ર",
    pinLabel: "સિક્યુરિટી ગુપ્ત પિન",
    nameOrPhonePlaceholder: "કર્મચારીનું નામ અથવા નંબર લખો",
    enterPinPlaceholder: "Admin: 1234, Manager: 5678, Staff: 0000",
    unauthorizedMsg: "પ્રવેશ નકારવામાં આવ્યો છે.",
    operatorLoginNote: "નૉંધ: પંપ સ્ટાફ માટેનો ડિફોલ્ટ પિન 0000 છે. મેનેજર માટે 5678 છે.",
    
    filters: "અહેવાલ ગાળકો (ફિલ્ટર્સ)",
    monthlyReport: "માસિક વિશ્લેષણ",
    profitLossReport: "નફો અને નુકશાન અહેવાલ",
    saleReceipts: "વેચાણ વિગતો",
    totalLitres: "કુલ વેચાયેલ લીટર",
    totalRevenue: "કુલ વકરો (કમાણી)",
    netProfit: "ચોખ્ખો નફો (અંદાજિત)",
    totalExpenses: "ખરીદી કિંમત (ખર્ચ)",
    estimatedProfit: "અંદાજિત નફો",
    whatsAppShare: "વોટ્સએપ પર મોકલો",
    backupRestoreBtn: "બેકઅપ લો અથવા સાચવો",
    backupTitle: "ડેટાબેઝ ફાઇલ નિકાસ (Backup)",
    restoreTitle: "અગાઉનો ડેટાબેઝ આયાત (Restore)",
    selectBackupFile: "સાચવેલ database.json બેકઅપ ફાઈલ પસંદ કરો"
  }
};
