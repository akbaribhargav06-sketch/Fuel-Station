import { SystemState, DailyShiftRecord, Shift, Employee, FuelTank, Nozzle, Customer, CreditTransaction, DailyClosingRecord } from '../types';

export function generateMockHistory(): DailyShiftRecord[] {
  const records: DailyShiftRecord[] = [];
  const days = 3; // past 3 days
  const today = new Date();
  
  for (let i = days; i >= 1; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Day Shift 1, 2, 3
    for (let s = 1; s <= 3; s++) {
      const shiftId = `shift_${s}`;
      const recId = `${dateStr}-${shiftId}`;
      
      const record: DailyShiftRecord = {
        id: recId,
        date: dateStr,
        shiftId: shiftId,
        status: 'closed',
        openedAt: `${dateStr}T${s === 1 ? '06:00' : s === 2 ? '14:00' : '22:00'}:00.000Z`,
        closedAt: `${dateStr}T${s === 1 ? '14:00' : s === 2 ? '22:00' : '06:00'}:00.000Z`,
        closedBy: 'Rajesh Patel',
        notes: `System generated historic auto-close for ${dateStr} Shift ${s}`,
        attendance: {
          'emp_1': 'present',
          'emp_2': 'present',
          'emp_3': s === 1 ? 'present' : 'absent',
          'emp_4': s === 2 ? 'present' : 'absent',
        },
        nozzleEntries: {
          'nozzle_1': {
            nozzleId: 'nozzle_1',
            operatorId: 'emp_3',
            openingReading: 12000 + (days - i) * 800 + (s - 1) * 200,
            closingReading: 12000 + (days - i) * 800 + (s - 1) * 200 + 180,
            cash: 10000,
            upi: 5000,
            card: 2000,
            creditSales: 1261,
            creditClient: 'GSRTC Bus Depot'
          },
          'nozzle_2': {
            nozzleId: 'nozzle_2',
            operatorId: 'emp_3',
            openingReading: 8000 + (days - i) * 600 + (s - 1) * 150,
            closingReading: 8000 + (days - i) * 600 + (s - 1) * 150 + 130,
            cash: 8000,
            upi: 3000,
            card: 1000,
            creditSales: 1188,
            creditClient: 'Amul Milk Van'
          },
          'nozzle_5': {
            nozzleId: 'nozzle_5',
            operatorId: 'emp_4',
            openingReading: 24000 + (days - i) * 1200 + (s - 1) * 300,
            closingReading: 24000 + (days - i) * 1200 + (s - 1) * 300 + 400,
            cash: 20000,
            upi: 10000,
            card: 5000,
            creditSales: 1860,
            creditClient: 'Sardar Transport'
          }
        },
        tankEntries: {
          'tank_petrol_1': {
            tankId: 'tank_petrol_1',
            openingStock: 16000 - (days - i) * 1500,
            purchaseQty: i === 2 && s === 1 ? 5000 : 0, 
            closingDipStock: 16000 - (days - i) * 1500 + (i === 2 && s === 1 ? 5000 : 0) - 310
          },
          'tank_diesel_1': {
            tankId: 'tank_diesel_1',
            openingStock: 22000 - (days - i) * 2500,
            purchaseQty: 0,
            closingDipStock: 22000 - (days - i) * 2500 - 400
          }
        }
      };
      
      records.push(record);
    }
  }
  
  return records;
}

export const OFFLINE_DEFAULT_STATE: SystemState = {
  shifts: [
    { id: 'shift_1', name: 'Shift 1 (Morn)', startTime: '06:00', endTime: '14:00', active: true },
    { id: 'shift_2', name: 'Shift 2 (Afternoon)', startTime: '14:00', endTime: '22:00', active: true },
    { id: 'shift_3', name: 'Shift 3 (Night)', startTime: '22:00', endTime: '06:00', active: true }
  ],
  employees: [
    { id: 'emp_1', name: 'Rajesh Patel', mobile: '9876543210', role: 'admin', active: true },
    { id: 'emp_2', name: 'Amit Shah', mobile: '9876543211', role: 'manager', active: true },
    { id: 'emp_3', name: 'Karan Jha', mobile: '9876543212', role: 'employee', active: true },
    { id: 'emp_4', name: 'Vijay Parmar', mobile: '9876543213', role: 'employee', active: true }
  ],
  tanks: [
    { id: 'tank_petrol_1', name: 'Petrol Main Tank', fuelType: 'petrol', capacity: 20000, openingStock: 15000, currentStock: 13500, customRate: 101.45, lastUpdated: new Date().toISOString() },
    { id: 'tank_diesel_1', name: 'Diesel Main Tank', fuelType: 'diesel', capacity: 25000, openingStock: 18000, currentStock: 16400, customRate: 92.15, lastUpdated: new Date().toISOString() }
  ],
  nozzles: [
    { id: 'nozzle_1', nozzleNumber: 'Nozzle 1', fuelType: 'petrol', tankId: 'tank_petrol_1', active: true },
    { id: 'nozzle_2', nozzleNumber: 'Nozzle 2', fuelType: 'petrol', tankId: 'tank_petrol_1', active: true },
    { id: 'nozzle_3', nozzleNumber: 'Nozzle 3', fuelType: 'petrol', tankId: 'tank_petrol_1', active: true },
    { id: 'nozzle_4', nozzleNumber: 'Nozzle 4', fuelType: 'petrol', tankId: 'tank_petrol_1', active: true },
    { id: 'nozzle_5', nozzleNumber: 'Nozzle 5', fuelType: 'diesel', tankId: 'tank_diesel_1', active: true },
    { id: 'nozzle_6', nozzleNumber: 'Nozzle 6', fuelType: 'diesel', tankId: 'tank_diesel_1', active: true },
    { id: 'nozzle_7', nozzleNumber: 'Nozzle 7', fuelType: 'diesel', tankId: 'tank_diesel_1', active: true },
    { id: 'nozzle_8', nozzleNumber: 'Nozzle 8', fuelType: 'diesel', tankId: 'tank_diesel_1', active: true }
  ],
  records: generateMockHistory(),
  customers: [
    { id: 'cust_1', name: 'GSRTC Bus Depot', mobile: '9428212345', vehicleNo: 'GJ-01-ZZ-1122', creditLimit: 150000, active: true },
    { id: 'cust_2', name: 'Amul Milk Van', mobile: '9925298765', vehicleNo: 'GJ-03-AA-9988', creditLimit: 80000, active: true },
    { id: 'cust_3', name: 'Sardar Transport', mobile: '9824012345', vehicleNo: 'GJ-05-XY-5566', creditLimit: 200000, active: true }
  ],
  creditTransactions: [
    { id: 'tx_1', customerId: 'cust_1', date: '2026-06-01', fuelType: 'diesel', liters: 100, rate: 92.15, amount: 9215, invoiceNo: 'INV-1001', operatorId: 'emp_3', notes: 'Regular bulk fill', whatsappSent: true },
    { id: 'tx_2', customerId: 'cust_2', date: '2026-06-02', fuelType: 'petrol', liters: 25, rate: 101.45, amount: 2536.25, invoiceNo: 'INV-1002', operatorId: 'emp_3', notes: 'Daily run delivery van' },
    { id: 'tx_3', customerId: 'cust_3', date: '2026-06-03', fuelType: 'diesel', liters: 200, rate: 92.15, amount: 18430, invoiceNo: 'INV-1003', operatorId: 'emp_4', notes: 'Heavy container GJ-05-XY-5566' }
  ],
  dailyClosings: [],
  inventory: [
    { id: 'prod_petrol', name: 'Petrol (M-S)', type: 'fuel', unit: 'Litres', currentStock: 13500, buyingPrice: 96.50, sellingPrice: 101.45, linkedTankId: 'tank_petrol_1' },
    { id: 'prod_diesel', name: 'Diesel (HSD)', type: 'fuel', unit: 'Litres', currentStock: 16400, buyingPrice: 88.20, sellingPrice: 92.15, linkedTankId: 'tank_diesel_1' },
    { id: 'prod_oil_1', name: 'Engine Oil 4T (1L)', type: 'oil', unit: 'Bottles', currentStock: 45, buyingPrice: 280, sellingPrice: 350 },
    { id: 'prod_oil_2', name: 'Gear Oil (1L)', type: 'oil', unit: 'Bottles', currentStock: 20, buyingPrice: 210, sellingPrice: 280 }
  ],
  inventoryTransactions: [
    { id: 'inv_tx_1', productId: 'prod_petrol', productName: 'Petrol (M-S)', date: '2026-07-01', type: 'in', quantity: 15000, rate: 96.50, totalAmount: 1447500, notes: 'Initial Opening Stock' },
    { id: 'inv_tx_2', productId: 'prod_diesel', productName: 'Diesel (HSD)', date: '2026-07-01', type: 'in', quantity: 18000, rate: 88.20, totalAmount: 1587600, notes: 'Initial Opening Stock' },
    { id: 'inv_tx_3', productId: 'prod_oil_1', productName: 'Engine Oil 4T (1L)', date: '2026-07-02', type: 'in', quantity: 45, rate: 280, totalAmount: 12600, notes: 'Initial Opening Stock' },
    { id: 'inv_tx_4', productId: 'prod_oil_2', productName: 'Gear Oil (1L)', date: '2026-07-02', type: 'in', quantity: 20, rate: 210, totalAmount: 4200, notes: 'Initial Opening Stock' }
  ],
  logs: [
    { id: 'log_1', timestamp: new Date().toISOString(), userId: 'emp_1', userName: 'Rajesh Patel', action: 'System provisioned with offline fallback database.' }
  ]
};

export function getOfflineState(): SystemState {
  const localData = localStorage.getItem('pump_erp_db_v1');
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      // Ensure expected fields exist
      if (!parsed.customers) parsed.customers = OFFLINE_DEFAULT_STATE.customers;
      if (!parsed.creditTransactions) parsed.creditTransactions = OFFLINE_DEFAULT_STATE.creditTransactions;
      if (!parsed.dailyClosings) parsed.dailyClosings = OFFLINE_DEFAULT_STATE.dailyClosings;
      if (!parsed.inventory) parsed.inventory = OFFLINE_DEFAULT_STATE.inventory;
      if (!parsed.inventoryTransactions) parsed.inventoryTransactions = OFFLINE_DEFAULT_STATE.inventoryTransactions;
      if (!parsed.logs) parsed.logs = OFFLINE_DEFAULT_STATE.logs;
      return parsed as SystemState;
    } catch (e) {
      console.error("Local storage parse error:", e);
    }
  }
  // Initialize with default
  localStorage.setItem('pump_erp_db_v1', JSON.stringify(OFFLINE_DEFAULT_STATE));
  return OFFLINE_DEFAULT_STATE;
}

function addOfflineLog(dbState: SystemState, userId: string, userName: string, action: string) {
  const logObj = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    userId: userId || 'unknown-client',
    userName: userName || 'User Operator',
    action
  };
  if (!dbState.logs) dbState.logs = [];
  dbState.logs.unshift(logObj);
  // Cap logs to 100
  if (dbState.logs.length > 100) {
    dbState.logs = dbState.logs.slice(0, 100);
  }
}

export function saveOfflineState(state: SystemState): SystemState {
  localStorage.setItem('pump_erp_db_v1', JSON.stringify(state));
  return state;
}

export async function processOfflineAction(
  actionType: string,
  url: string,
  payload: any,
  currentState: SystemState
): Promise<SystemState> {
  // Deep clone state to avoid side-effects
  const dbState: SystemState = JSON.parse(JSON.stringify(currentState));

  // Initialize fields
  if (!dbState.customers) dbState.customers = [];
  if (!dbState.creditTransactions) dbState.creditTransactions = [];
  if (!dbState.dailyClosings) dbState.dailyClosings = [];
  if (!dbState.logs) dbState.logs = [];

  const userId = payload.userId || "offline-bypass";
  const userName = payload.userName || "Operator";

  // Match url routings
  if (url === "/api/auth/login") {
    // Check if employee with mobile matches
    const emp = dbState.employees.find(e => e.mobile === payload.mobile && e.active);
    if (!emp) {
      throw new Error("Invalid mobile credentials or inactive employee profile.");
    }
    addOfflineLog(dbState, emp.id, emp.name, "Succeeded offline local login validation.");
    saveOfflineState(dbState);
    return dbState;
  }

  if (url === "/api/state/restore") {
    const importState = payload.state;
    if (!importState || !importState.shifts || !importState.tanks || !importState.nozzles || !importState.employees) {
      throw new Error("Invalid backup JSON file schema.");
    }
    const updatedState: SystemState = {
      ...importState,
      logs: importState.logs || []
    };
    addOfflineLog(updatedState, userId, userName, "Restored offline database state from manual JSON backup.");
    saveOfflineState(updatedState);
    return updatedState;
  }

  // Shifts management
  if (url === "/api/shifts") {
    const { action, shift } = payload;
    if (action === "add") {
      const newShift: Shift = {
        ...shift,
        id: `shift_${Date.now()}`,
        active: true
      };
      dbState.shifts.push(newShift);
      addOfflineLog(dbState, userId, userName, `Added new Shift (Offline): ${newShift.name} (${newShift.startTime}-${newShift.endTime})`);
    } else if (action === "edit") {
      const idx = dbState.shifts.findIndex(s => s.id === shift.id);
      if (idx !== -1) {
        dbState.shifts[idx] = { ...dbState.shifts[idx], ...shift };
        addOfflineLog(dbState, userId, userName, `Updated Shift properties (Offline): ${shift.name}`);
      }
    } else if (action === "delete") {
      dbState.shifts = dbState.shifts.filter(s => s.id !== shift.id);
      addOfflineLog(dbState, userId, userName, `Removed Shift setup (Offline): ${shift.name}`);
    }
    return saveOfflineState(dbState);
  }

  // Employees management
  if (url === "/api/employees") {
    const { action, employee } = payload;
    if (action === "add") {
      const newEmp: Employee = {
        ...employee,
        id: `emp_${Date.now()}`,
        active: true
      };
      dbState.employees.push(newEmp);
      addOfflineLog(dbState, userId, userName, `Added new Employee profile (Offline): ${newEmp.name} as ${newEmp.role}`);
    } else if (action === "edit") {
      const idx = dbState.employees.findIndex(e => e.id === employee.id);
      if (idx !== -1) {
        dbState.employees[idx] = { ...dbState.employees[idx], ...employee };
        addOfflineLog(dbState, userId, userName, `Updated Employee contact (Offline): ${employee.name}`);
      }
    } else if (action === "delete") {
      const idx = dbState.employees.findIndex(e => e.id === employee.id);
      if (idx !== -1) {
        dbState.employees[idx].active = false;
        addOfflineLog(dbState, userId, userName, `Deactivated Employee card (Offline): ${employee.name}`);
      }
    }
    return saveOfflineState(dbState);
  }

  // Tanks management
  if (url === "/api/tanks") {
    const { action, tank } = payload;
    if (action === "add") {
      const newTank: FuelTank = {
        ...tank,
        id: `tank_${Date.now()}`,
        currentStock: parseFloat(tank.openingStock) || 0,
        lastUpdated: new Date().toISOString()
      };
      dbState.tanks.push(newTank);
      addOfflineLog(dbState, userId, userName, `Added Tank ${newTank.name} (Capacity: ${newTank.capacity}L, Fuel: ${newTank.fuelType}) (Offline)`);
    } else if (action === "edit") {
      const idx = dbState.tanks.findIndex(t => t.id === tank.id);
      if (idx !== -1) {
        const originalTank = dbState.tanks[idx];
        const stockDiff = (parseFloat(tank.openingStock) || originalTank.openingStock) - originalTank.openingStock;
        dbState.tanks[idx] = {
          ...originalTank,
          ...tank,
          currentStock: Math.max(0, originalTank.currentStock + stockDiff),
          lastUpdated: new Date().toISOString()
        };
        addOfflineLog(dbState, userId, userName, `Updated Tank volume config (Offline): ${tank.name}`);
      }
    } else if (action === "delete") {
      dbState.tanks = dbState.tanks.filter(t => t.id !== tank.id);
      addOfflineLog(dbState, userId, userName, `Deleted Tank unit (Offline): ${tank.name}`);
    } else if (action === "update_rates") {
      const { petrolRate, dieselRate } = payload;
      dbState.tanks.forEach(t => {
        if (t.fuelType === 'petrol' && petrolRate !== undefined) {
          t.customRate = Number(petrolRate);
        } else if (t.fuelType === 'diesel' && dieselRate !== undefined) {
          t.customRate = Number(dieselRate);
        }
      });
      addOfflineLog(dbState, userId, userName, `Updated bulk rates (Offline) - Petrol: ₹${petrolRate}, Diesel: ₹${dieselRate}`);
    }
    return saveOfflineState(dbState);
  }

  // Nozzles management
  if (url === "/api/nozzles") {
    const { action, nozzle } = payload;
    if (action === "add") {
      const newNozzle: Nozzle = {
        ...nozzle,
        id: `nozzle_${Date.now()}`,
        active: true
      };
      dbState.nozzles.push(newNozzle);
      addOfflineLog(dbState, userId, userName, `Added Nozzle No: ${newNozzle.nozzleNumber} (Offline)`);
    } else if (action === "edit") {
      const idx = dbState.nozzles.findIndex(n => n.id === nozzle.id);
      if (idx !== -1) {
        dbState.nozzles[idx] = { ...dbState.nozzles[idx], ...nozzle };
        addOfflineLog(dbState, userId, userName, `Edited Nozzle properties (Offline): ${nozzle.nozzleNumber}`);
      }
    } else if (url === "/api/nozzles" && action === "toggle") {
      const idx = dbState.nozzles.findIndex(n => n.id === nozzle.id);
      if (idx !== -1) {
        dbState.nozzles[idx].active = !dbState.nozzles[idx].active;
        addOfflineLog(dbState, userId, userName, `Toggled Nozzle status (Offline) for ${dbState.nozzles[idx].nozzleNumber} to ${dbState.nozzles[idx].active ? 'Active' : 'Disabled'}`);
      }
    } else if (action === "delete") {
      dbState.nozzles = dbState.nozzles.filter(n => n.id !== nozzle.id);
      addOfflineLog(dbState, userId, userName, `Removed Nozzle profile (Offline): ${nozzle.nozzleNumber}`);
    }
    return saveOfflineState(dbState);
  }

  // Customers management
  if (url === "/api/customers") {
    const { action, customer } = payload;
    if (action === "add") {
      const newCust: Customer = {
        ...customer,
        id: `cust_${Date.now()}`,
        active: true,
        creditLimit: parseFloat(customer.creditLimit) || 0
      };
      dbState.customers.push(newCust);
      addOfflineLog(dbState, userId, userName, `Added Udhaar Customer (Offline): ${newCust.name} (Vehicle: ${newCust.vehicleNo || 'N/A'}, Limit: ₹${newCust.creditLimit})`);
    } else if (action === "edit") {
      const idx = dbState.customers.findIndex(c => c.id === customer.id);
      if (idx !== -1) {
        dbState.customers[idx] = {
          ...dbState.customers[idx],
          ...customer,
          creditLimit: parseFloat(customer.creditLimit) || 0
        };
        addOfflineLog(dbState, userId, userName, `Updated Customer details (Offline): ${customer.name}`);
      }
    } else if (action === "delete") {
      const idx = dbState.customers.findIndex(c => c.id === customer.id);
      if (idx !== -1) {
        dbState.customers[idx].active = false;
        addOfflineLog(dbState, userId, userName, `Deactivated Customer billing card (Offline): ${dbState.customers[idx].name}`);
      }
    }
    return saveOfflineState(dbState);
  }

  // Udhaar Transaction management
  if (url === "/api/credit-transactions") {
    const { action, transaction } = payload;
    if (action === "add") {
      const newTx: CreditTransaction = {
        ...transaction,
        id: `tx_${Date.now()}`,
        liters: parseFloat(transaction.liters) || 0,
        rate: parseFloat(transaction.rate) || 0,
        amount: parseFloat(transaction.amount) || 0,
        date: transaction.date || new Date().toISOString().split('T')[0],
        whatsappSent: false
      };
      dbState.creditTransactions.push(newTx);
      const custName = dbState.customers?.find(c => c.id === transaction.customerId)?.name || "Unknown Customer";
      addOfflineLog(dbState, userId, userName, `Issued Udhaar Slip invoice ${newTx.invoiceNo} (Offline) to ${custName}: ₹${newTx.amount}`);

      // Automatically sync to active daily shift nozzle record if nozzleId is specified
      const activeRecord = dbState.records.find(r => r.status === 'open');
      if (activeRecord && transaction.nozzleId) {
        const nozId = transaction.nozzleId;
        if (!activeRecord.nozzleEntries[nozId]) {
          activeRecord.nozzleEntries[nozId] = {
            nozzleId: nozId,
            operatorId: userId || "emp-3",
            openingReading: 0,
            closingReading: 0,
            cash: 0,
            upi: 0,
            card: 0,
            creditSales: 0,
            creditClient: ""
          };
        }
        const nozEntry = activeRecord.nozzleEntries[nozId];
        nozEntry.creditSales = (Number(nozEntry.creditSales) || 0) + newTx.amount;
        
        const custNameShort = custName.slice(0, 20);
        const currentClients = nozEntry.creditClient ? nozEntry.creditClient.split(', ') : [];
        if (!currentClients.includes(custNameShort)) {
          currentClients.push(custNameShort);
        }
        nozEntry.creditClient = currentClients.join(', ');
      }
    } else if (action === "delete") {
      dbState.creditTransactions = dbState.creditTransactions.filter(t => t.id !== transaction.id);
      addOfflineLog(dbState, userId, userName, `Voided/Deleted transaction invoice ID ${transaction.id} (Offline)`);
    } else if (action === "mark-whatsapp") {
      const idx = dbState.creditTransactions.findIndex(t => t.id === transaction.id);
      if (idx !== -1) {
        dbState.creditTransactions[idx].whatsappSent = true;
        addOfflineLog(dbState, userId, userName, `Marked offline whatsapp send notification alert for ${dbState.creditTransactions[idx].invoiceNo}`);
      }
    }
    return saveOfflineState(dbState);
  }

  // Day books custom closures management 
  if (url === "/api/daily-closings") {
    const { action, closingData } = payload;
    if (action === "save") {
      const idx = dbState.dailyClosings.findIndex(dc => dc.date === closingData.date);
      const record: DailyClosingRecord = {
        ...closingData,
        id: closingData.date,
        lastUpdatedBy: userName || "Administrator",
        lastUpdatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        dbState.dailyClosings[idx] = record;
        addOfflineLog(dbState, userId, userName, `Updated Day Book summary (Offline) for date: ${closingData.date}`);
      } else {
        dbState.dailyClosings.push(record);
        addOfflineLog(dbState, userId, userName, `Logged new Day Book Summary (Offline) for: ${closingData.date}`);
      }
    } else if (action === "delete") {
      const closingDate = closingData.date;
      dbState.dailyClosings = dbState.dailyClosings.filter(dc => dc.date !== closingDate);
      addOfflineLog(dbState, userId, userName, `Deleted 24h Day Book Summary entry (Offline) for: ${closingDate}`);
    }
    return saveOfflineState(dbState);
  }

  // Daily Nozzle & Tank Entries (Shift logs)
  if (url === "/api/records") {
    const { action, recordId, date, shiftId, attendance, nozzleEntries, tankEntries, notes } = payload;
    const id = recordId || `${date}-${shiftId}`;
    
    let recordIndex = dbState.records.findIndex(r => r.id === id);

    if (action === "open") {
      const alreadyOpen = dbState.records.some(r => r.date === date && r.shiftId === shiftId && r.status === 'open');
      if (alreadyOpen) {
        throw new Error("Shift is already active for this date to record. (આ તારીખે શિફ્ટ પહેલેથી જ ચાલુ છે.)");
      }

      const activeEmployeeIds = dbState.employees.filter(e => e.active).map(e => e.id);
      const initialAttendance: Record<string, 'present' | 'absent'> = {};
      activeEmployeeIds.forEach(eid => {
        initialAttendance[eid] = attendance && attendance[eid] ? attendance[eid] : 'absent';
      });

      const newRecord: DailyShiftRecord = {
        id,
        date,
        shiftId,
        status: "open",
        attendance: initialAttendance,
        nozzleEntries: nozzleEntries || {},
        tankEntries: tankEntries || {},
        openedAt: new Date().toISOString(),
        notes: notes || ""
      };

      dbState.records.push(newRecord);
      const shiftName = dbState.shifts.find(s => s.id === shiftId)?.name || shiftId;
      addOfflineLog(dbState, userId, userName, `Opened Shift ${shiftName} (Offline) on date ${date}. Rosters assigned.`);
      return saveOfflineState(dbState);
    }

    if (recordIndex === -1) {
      throw new Error("Active shift session not found in local log records.");
    }

    const currentRecord = dbState.records[recordIndex];

    if (action === "add-upi-transaction") {
      if (!currentRecord.upiTransactions) {
        currentRecord.upiTransactions = [];
      }
      const newTx = {
        id: "upi_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        nozzleId: payload.nozzleId,
        amount: Number(payload.amount),
        timestamp: new Date().toISOString()
      };
      currentRecord.upiTransactions.push(newTx);

      // Recalculate upi field for this nozzle
      const nozTx = currentRecord.upiTransactions.filter(t => t.nozzleId === payload.nozzleId);
      const totalUPI = nozTx.reduce((sum, t) => sum + t.amount, 0);
      if (currentRecord.nozzleEntries[payload.nozzleId]) {
        currentRecord.nozzleEntries[payload.nozzleId].upi = totalUPI;
      } else {
        currentRecord.nozzleEntries[payload.nozzleId] = {
          nozzleId: payload.nozzleId,
          operatorId: userId,
          openingReading: 0,
          closingReading: 0,
          cash: 0,
          upi: totalUPI,
          card: 0,
          creditSales: 0,
          creditClient: ""
        };
      }

      const nozzleNum = dbState.nozzles.find(n => n.id === payload.nozzleId)?.nozzleNumber || payload.nozzleId;
      addOfflineLog(dbState, userId, userName, `Added UPI payment of ₹${payload.amount} for ${nozzleNum} (Offline)`);
      saveOfflineState(dbState);
      return dbState;
    }

    if (action === "delete-upi-transaction") {
      if (currentRecord.upiTransactions) {
        currentRecord.upiTransactions = currentRecord.upiTransactions.filter(t => t.id !== payload.transactionId);
      }

      // Recalculate upi field for this nozzle
      const nozTx = (currentRecord.upiTransactions || []).filter(t => t.nozzleId === payload.nozzleId);
      const totalUPI = nozTx.reduce((sum, t) => sum + t.amount, 0);
      if (currentRecord.nozzleEntries[payload.nozzleId]) {
        currentRecord.nozzleEntries[payload.nozzleId].upi = totalUPI;
      }

      addOfflineLog(dbState, userId, userName, `Deleted UPI payment transaction for nozzle: ${payload.nozzleId} (Offline)`);
      saveOfflineState(dbState);
      return dbState;
    }

    if (action === "update-entries") {
      currentRecord.attendance = { ...currentRecord.attendance, ...attendance };
      currentRecord.nozzleEntries = { ...currentRecord.nozzleEntries, ...nozzleEntries };
      currentRecord.tankEntries = { ...currentRecord.tankEntries, ...tankEntries };
      currentRecord.notes = notes !== undefined ? notes : currentRecord.notes;
      addOfflineLog(dbState, userId, userName, `Updated operator measurements and fuel meter values (Offline) for date: ${date}`);
    } 
    else if (action === "close") {
      currentRecord.attendance = { ...currentRecord.attendance, ...attendance };
      currentRecord.nozzleEntries = { ...currentRecord.nozzleEntries, ...nozzleEntries };
      currentRecord.tankEntries = { ...currentRecord.tankEntries, ...tankEntries };
      currentRecord.notes = notes !== undefined ? notes : currentRecord.notes;
      currentRecord.status = "closed";
      currentRecord.closedAt = new Date().toISOString();
      currentRecord.closedBy = userName;

      // Update the fuel stocks inside Tanks permanently!
      Object.keys(currentRecord.nozzleEntries).forEach(nozId => {
        const nozEntry = currentRecord.nozzleEntries[nozId];
        const nozzleInfo = dbState.nozzles.find(n => n.id === nozId);
        if (nozzleInfo) {
          const tank = dbState.tanks.find(t => t.id === nozzleInfo.tankId);
          if (tank) {
            const litresSold = Math.max(0, nozEntry.closingReading - nozEntry.openingReading - (nozEntry.testingLiters || 0));
            tank.currentStock = Math.max(0, tank.currentStock - litresSold);
            tank.lastUpdated = new Date().toISOString();

            // Also sync with the linked inventory product
            if (!dbState.inventory) dbState.inventory = [];
            if (!dbState.inventoryTransactions) dbState.inventoryTransactions = [];
            const prod = dbState.inventory.find(p => p.linkedTankId === tank.id);
            if (prod) {
              prod.currentStock = tank.currentStock;
              if (litresSold > 0) {
                dbState.inventoryTransactions.push({
                  id: `inv_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  productId: prod.id,
                  productName: prod.name,
                  date: currentRecord.date,
                  type: 'out',
                  quantity: litresSold,
                  rate: tank.customRate,
                  totalAmount: litresSold * tank.customRate,
                  notes: `Filler Nozzle Sale (Shift: ${dbState.shifts.find(s => s.id === currentRecord.shiftId)?.name || currentRecord.shiftId}) (Offline)`
                });
              }
            }
          }
        }
      });

      // Handle any purchase arrivals
      Object.keys(currentRecord.tankEntries).forEach(tId => {
        const tEntry = currentRecord.tankEntries[tId];
        const tank = dbState.tanks.find(t => t.id === tId);
        if (tank) {
          if (tEntry.purchaseQty > 0) {
            tank.currentStock = Math.min(tank.capacity, tank.currentStock + tEntry.purchaseQty);

            // Also update linked product stock and record purchase transaction
            if (!dbState.inventory) dbState.inventory = [];
            if (!dbState.inventoryTransactions) dbState.inventoryTransactions = [];
            const prod = dbState.inventory.find(p => p.linkedTankId === tank.id);
            if (prod) {
              prod.currentStock = tank.currentStock;
              dbState.inventoryTransactions.push({
                id: `inv_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                productId: prod.id,
                productName: prod.name,
                date: currentRecord.date,
                type: 'in',
                quantity: tEntry.purchaseQty,
                rate: prod.buyingPrice,
                totalAmount: tEntry.purchaseQty * prod.buyingPrice,
                notes: `Tanker Purchase Arrival (Shift: ${dbState.shifts.find(s => s.id === currentRecord.shiftId)?.name || currentRecord.shiftId}) (Offline)`
              });
            }
          }
          if (tEntry.closingDipStock > 0) {
            // Update linked product stock as well
            if (!dbState.inventory) dbState.inventory = [];
            const prod = dbState.inventory.find(p => p.linkedTankId === tank.id);
            if (prod) {
              const diff = tEntry.closingDipStock - tank.currentStock;
              prod.currentStock = tEntry.closingDipStock;
              if (diff !== 0) {
                if (!dbState.inventoryTransactions) dbState.inventoryTransactions = [];
                dbState.inventoryTransactions.push({
                  id: `inv_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                  productId: prod.id,
                  productName: prod.name,
                  date: currentRecord.date,
                  type: diff > 0 ? 'in' : 'out',
                  quantity: Math.abs(diff),
                  rate: prod.buyingPrice,
                  totalAmount: Math.abs(diff) * prod.buyingPrice,
                  notes: `Physical Dip Adjustment (Shift Close: ${dbState.shifts.find(s => s.id === currentRecord.shiftId)?.name || currentRecord.shiftId}) (Offline)`
                });
              }
            }

            tank.currentStock = tEntry.closingDipStock;
          }
          tank.lastUpdated = new Date().toISOString();
        }
      });

      const shiftName = dbState.shifts.find(s => s.id === currentRecord.shiftId)?.name || currentRecord.shiftId;
      addOfflineLog(dbState, userId, userName, `Closed ${shiftName} (Offline) on ${currentRecord.date}. Permanent stocks adjusted.`);
    }

    dbState.records[recordIndex] = currentRecord;
    return saveOfflineState(dbState);
  }

  if (url === "/api/inventory/products") {
    const { action, product } = payload;
    if (!dbState.inventory) dbState.inventory = [];
    if (!dbState.inventoryTransactions) dbState.inventoryTransactions = [];

    if (action === "add") {
      const newProduct = {
        ...product,
        id: `prod_${Date.now()}`,
        currentStock: Number(product.currentStock) || 0,
        buyingPrice: Number(product.buyingPrice) || 0,
        sellingPrice: Number(product.sellingPrice) || 0
      };
      dbState.inventory.push(newProduct);

      if (newProduct.currentStock > 0) {
        dbState.inventoryTransactions.push({
          id: `inv_tx_${Date.now()}`,
          productId: newProduct.id,
          productName: newProduct.name,
          date: new Date().toISOString().split('T')[0],
          type: 'in',
          quantity: newProduct.currentStock,
          rate: newProduct.buyingPrice,
          totalAmount: newProduct.currentStock * newProduct.buyingPrice,
          notes: 'Initial Stock On-boarding'
        });
      }
      addOfflineLog(dbState, userId, userName, `Added new inventory product (Offline): ${newProduct.name}`);
    } else if (action === "edit") {
      const idx = dbState.inventory.findIndex(p => p.id === product.id);
      if (idx !== -1) {
        const currentStock = product.linkedTankId 
          ? (dbState.tanks.find(t => t.id === product.linkedTankId)?.currentStock || Number(product.currentStock) || 0)
          : (Number(product.currentStock) || 0);

        dbState.inventory[idx] = {
          ...dbState.inventory[idx],
          ...product,
          currentStock,
          buyingPrice: Number(product.buyingPrice) || 0,
          sellingPrice: Number(product.sellingPrice) || 0
        };
        addOfflineLog(dbState, userId, userName, `Edited inventory product properties (Offline): ${product.name}`);
      }
    } else if (action === "delete") {
      dbState.inventory = dbState.inventory.filter(p => p.id !== product.id);
      addOfflineLog(dbState, userId, userName, `Deleted inventory product (Offline): ${product.name}`);
    }
    return saveOfflineState(dbState);
  }

  if (url === "/api/inventory/transactions") {
    const { action, transaction } = payload;
    if (!dbState.inventory) dbState.inventory = [];
    if (!dbState.inventoryTransactions) dbState.inventoryTransactions = [];

    if (action === "add") {
      const newTx = {
        ...transaction,
        id: `inv_tx_${Date.now()}`,
        quantity: Number(transaction.quantity) || 0,
        rate: Number(transaction.rate) || 0,
        totalAmount: (Number(transaction.quantity) || 0) * (Number(transaction.rate) || 0),
        date: transaction.date || new Date().toISOString().split('T')[0]
      };

      const prod = dbState.inventory.find(p => p.id === newTx.productId);
      if (prod) {
        if (newTx.type === 'in') {
          prod.currentStock += newTx.quantity;
          if (prod.linkedTankId) {
            const tank = dbState.tanks.find(t => t.id === prod.linkedTankId);
            if (tank) {
              tank.currentStock = Math.min(tank.capacity, tank.currentStock + newTx.quantity);
              tank.lastUpdated = new Date().toISOString();
            }
          }
        } else {
          prod.currentStock = Math.max(0, prod.currentStock - newTx.quantity);
          if (prod.linkedTankId) {
            const tank = dbState.tanks.find(t => t.id === prod.linkedTankId);
            if (tank) {
              tank.currentStock = Math.max(0, tank.currentStock - newTx.quantity);
              tank.lastUpdated = new Date().toISOString();
            }
          }
        }
        dbState.inventoryTransactions.push(newTx);
        addOfflineLog(dbState, userId, userName, `Recorded inventory ${newTx.type === 'in' ? 'inflow' : 'outflow'} (Offline) for ${prod.name}: ${newTx.quantity} ${prod.unit}`);
      }
    }
    return saveOfflineState(dbState);
  }

  return dbState;
}
