/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'employee';

export interface Shift {
  id: string;
  name: string; // e.g., "Shift 1"
  startTime: string; // e.g., "06:00"
  endTime: string; // e.g., "14:00"
  active: boolean;
}

export interface Employee {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  active: boolean;
  permissions?: string[];
  assignedNozzles?: string[]; // IDs of nozzles this employee has access to
  assignedShifts?: string[]; // IDs of shifts this employee has access to
}

export interface FuelTank {
  id: string;
  name: string; // e.g., "Tank A"
  fuelType: 'petrol' | 'diesel';
  capacity: number; // in Litres
  openingStock: number;
  currentStock: number; // running calculation
  customRate: number; // price per Litre (e.g., Petrol: 101.50, Diesel: 92.20)
  lastUpdated: string;
}

export interface Nozzle {
  id: string;
  nozzleNumber: string; // e.g., "Nozzle 1"
  fuelType: 'petrol' | 'diesel';
  tankId: string; // linked FuelTank.id
  active: boolean;
}

export interface NozzleReadingEntry {
  nozzleId: string;
  operatorId: string;
  openingReading: number; // in Litres
  closingReading: number; // in Litres (Closing - Opening = Total Sale in Litres)
  testingLiters?: number; // testing litres in pump tests (subtracted from sales)
  cash: number; // payment collected in Cash
  upi: number; // payments received via UPI
  card: number; // payments received via Card
  creditSales: number; // payments via Local customer accounts (credit)
  creditClient: string; // name of credit customer (optional)
  startedAt?: string; // Operator started shift timestamp
  submittedAt?: string; // Operator submitted timestamp
  elapsedTime?: string; // Duration string e.g. "2 hours 15 minutes"
  isSubmitted?: boolean; // True if operator locked and sent this entry
}

export interface TankStockEntry {
  tankId: string;
  openingStock: number;
  purchaseQty: number; // incoming tanker cargo
  closingDipStock: number; // actual physically measured dip-stick stock
}

export interface UPITransaction {
  id: string;
  nozzleId: string;
  amount: number;
  timestamp: string;
}

export interface DailyShiftRecord {
  id: string; // format: YYYY-MM-DD-shiftId
  date: string; // YYYY-MM-DD
  shiftId: string;
  status: 'open' | 'closed';
  attendance: Record<string, 'present' | 'absent'>; // employeeId -> status
  nozzleEntries: Record<string, NozzleReadingEntry>; // nozzleId -> reading and sales
  tankEntries: Record<string, TankStockEntry>; // tankId -> stock level details
  openedAt: string;
  closedAt?: string;
  closedBy?: string;
  notes?: string;
  upiTransactions?: UPITransaction[];
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  vehicleNo?: string;
  creditLimit?: number;
  active: boolean;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  date: string;
  fuelType: 'petrol' | 'diesel';
  liters: number;
  rate: number;
  amount: number;
  invoiceNo: string;
  operatorId: string;
  notes?: string;
  whatsappSent?: boolean;
}

export interface Denominations {
  n500: number;
  n200: number;
  n100: number;
  n50: number;
  n20: number;
  n10: number;
  n5: number;
  n2: number;
  n1: number;
}

export interface DailyClosingRecord {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  todayCollection: number; // આજનો ગલ્લો / કલેક્શન
  kharcha: number; // ખર્ચ / Expenses
  udhar: number; // ઉધાર / Credit
  onlineCollection: number; // ઓનલાઇન કલેક્શન
  cashCollection: number; // કેશ કલેક્શન
  jama: number; // જમા / Bank Deposit
  oilSell: number; // ઓઇલ વેચાણ
  silak: number; // સિલક / Hand cash
  totalCash: number; // કુલ રોકડા (calculated or declared)
  totalBank: number; // કુલ બેંક (calculated or declared)
  notesBreakdown: Denominations;
  notesTotal: number;
  notes?: string; // Remarks / details of clarifications
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  type: 'fuel' | 'oil' | 'other';
  unit: string;
  currentStock: number;
  buyingPrice: number;
  sellingPrice: number;
  linkedTankId?: string; // Links fuel products to tanks
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  date: string; // YYYY-MM-DD
  type: 'in' | 'out'; // in: purchase, out: sale
  quantity: number;
  rate: number;
  totalAmount: number;
  notes?: string;
  operatorId?: string;
  shiftId?: string;
}

export interface CashTallyEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  denominations: Denominations;
  totalNotesValue: number;
  expectedFuelCash: number;
  expectedOilCash: number;
  totalExpectedCash: number;
  difference: number;
  litersSold: number;
  nozzleReadingsSummary?: string;
}

export interface SystemState {
  shifts: Shift[];
  employees: Employee[];
  tanks: FuelTank[];
  nozzles: Nozzle[];
  records: DailyShiftRecord[];
  customers?: Customer[];
  creditTransactions?: CreditTransaction[];
  dailyClosings?: DailyClosingRecord[];
  inventory?: InventoryProduct[];
  inventoryTransactions?: InventoryTransaction[];
  cashTallies?: CashTallyEntry[];
  logs: Array<{
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
  }>;
}

export interface UserSession {
  employeeId: string;
  name: string;
  role: UserRole;
  token?: string;
}
