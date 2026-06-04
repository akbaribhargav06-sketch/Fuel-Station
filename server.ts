/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { SystemState, DailyShiftRecord, Shift, Employee, FuelTank, Nozzle } from "./src/types";

// Setup server parameters
const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "database.json");

// Helper to construct mock history for deep dashboard experience
function generateMockHistory(): DailyShiftRecord[] {
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
            purchaseQty: i === 2 && s === 1 ? 5000 : 0, // tank fill on day -2, shift 1
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

// Initial default state if DB file doesn't exist
const DEFAULT_STATE: SystemState = {
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
  logs: [
    { id: 'log_1', timestamp: new Date().toISOString(), userId: 'emp_1', userName: 'Rajesh Patel', action: 'System provisioned with default data logs.' }
  ]
};

// Database utility functions
function readDB(): SystemState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDB(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw) as SystemState;
    if (!data.customers) {
      data.customers = [
        { id: 'cust_1', name: 'GSRTC Bus Depot', mobile: '9428212345', vehicleNo: 'GJ-01-ZZ-1122', creditLimit: 150000, active: true },
        { id: 'cust_2', name: 'Amul Milk Van', mobile: '9925298765', vehicleNo: 'GJ-03-AA-9988', creditLimit: 80000, active: true },
        { id: 'cust_3', name: 'Sardar Transport', mobile: '9824012345', vehicleNo: 'GJ-05-XY-5566', creditLimit: 200000, active: true }
      ];
    }
    if (!data.creditTransactions) {
      data.creditTransactions = [
        { id: 'tx_1', customerId: 'cust_1', date: '2026-06-01', fuelType: 'diesel', liters: 100, rate: 92.15, amount: 9215, invoiceNo: 'INV-1001', operatorId: 'emp_3', notes: 'Regular bulk fill', whatsappSent: true },
        { id: 'tx_2', customerId: 'cust_2', date: '2026-06-02', fuelType: 'petrol', liters: 25, rate: 101.45, amount: 2536.25, invoiceNo: 'INV-1002', operatorId: 'emp_3', notes: 'Daily run delivery van' },
        { id: 'tx_3', customerId: 'cust_3', date: '2026-06-03', fuelType: 'diesel', liters: 200, rate: 92.15, amount: 18430, invoiceNo: 'INV-1003', operatorId: 'emp_4', notes: 'Heavy container GJ-05-XY-5566' }
      ];
    }
    if (!data.dailyClosings) {
      data.dailyClosings = [];
    }
    return data;
  } catch (error) {
    console.error("Error reading database:", error);
    return DEFAULT_STATE;
  }
}

function writeDB(state: SystemState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database:", error);
  }
}

// Log action helper
function addSystemLog(state: SystemState, userId: string, userName: string, action: string) {
  const log = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action
  };
  state.logs.unshift(log);
  // limit the logs size
  if (state.logs.length > 500) {
    state.logs = state.logs.slice(0, 500);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "20mb" }));

  // --- API ROUTES ---

  // Auth & Login
  app.post("/api/auth/login", (req, res) => {
    const { nameOrMobile, pin } = req.body;
    const dbData = readDB();
    
    // Find the matching employee by name or mobile (non-case sensitive)
    const emp = dbData.employees.find(e => 
      e.active && 
      (e.name.toLowerCase() === nameOrMobile.trim().toLowerCase() || e.mobile === nameOrMobile.trim())
    );

    if (!emp) {
      return res.status(401).json({ error: "Employee/Operator not found or inactive. (કર્મચારી મળ્યો નથી અથવા નિષ્ક્રિય છે)" });
    }

    // Role PIN validator rules: Admin/Manager requires simple matching
    // For local evaluation, simple mock pins: admin -> '1234', manager -> '5678', employee -> '0000'
    const expectedPin = emp.role === 'admin' ? '1234' : emp.role === 'manager' ? '5678' : '0000';
    
    if (pin !== expectedPin && pin !== '1111') { // 1111 as master override PIN
      return res.status(401).json({ error: `Incorrect security PIN. (ગુપ્ત પિન ખોટો છે)` });
    }

    res.json({
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      token: `token_${emp.id}_${Date.now()}`
    });
  });

  // Get full state
  app.get("/api/state", (req, res) => {
    const dbData = readDB();
    res.json(dbData);
  });

  // State Import/Export for Backup
  app.post("/api/state/restore", (req, res) => {
    const { state, userName, userId } = req.body;
    if (!state || !state.shifts || !state.tanks || !state.nozzles || !state.employees) {
      return res.status(400).json({ error: "Invalid backup file schema." });
    }
    const dbData = readDB();
    const updatedState: SystemState = {
      ...state,
      logs: state.logs || []
    };
    addSystemLog(updatedState, userId || "system", userName || "Admin", "Restored system state from backup file.");
    writeDB(updatedState);
    res.json({ success: true, message: "System state restored successfully." });
  });

  // Manage Shifts
  app.post("/api/shifts", (req, res) => {
    const { action, shift, userId, userName } = req.body; // action: 'add' | 'edit' | 'delete'
    const dbData = readDB();

    if (action === 'add') {
      const newShift: Shift = {
        ...shift,
        id: `shift_${Date.now()}`,
        active: true
      };
      dbData.shifts.push(newShift);
      addSystemLog(dbData, userId, userName, `Added new Shift: ${newShift.name} (${newShift.startTime}-${newShift.endTime})`);
    } else if (action === 'edit') {
      const index = dbData.shifts.findIndex(s => s.id === shift.id);
      if (index !== -1) {
        dbData.shifts[index] = { ...dbData.shifts[index], ...shift };
        addSystemLog(dbData, userId, userName, `Updated Shift: ${shift.name}`);
      }
    } else if (action === 'delete') {
      dbData.shifts = dbData.shifts.filter(s => s.id !== shift.id);
      addSystemLog(dbData, userId, userName, `Deleted Shift: ${shift.name}`);
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage Employees
  app.post("/api/employees", (req, res) => {
    const { action, employee, userId, userName } = req.body; // action: 'add' | 'edit' | 'delete'
    const dbData = readDB();

    if (action === 'add') {
      const newEmp: Employee = {
        ...employee,
        id: `emp_${Date.now()}`,
        active: true
      };
      dbData.employees.push(newEmp);
      addSystemLog(dbData, userId, userName, `Added new Employee: ${newEmp.name} as ${newEmp.role}`);
    } else if (action === 'edit') {
      const index = dbData.employees.findIndex(e => e.id === employee.id);
      if (index !== -1) {
        dbData.employees[index] = { ...dbData.employees[index], ...employee };
        addSystemLog(dbData, userId, userName, `Updated Employee: ${employee.name}`);
      }
    } else if (action === 'delete') {
      // Toggle active status instead of destructive delete to keep relational history intact
      const index = dbData.employees.findIndex(e => e.id === employee.id);
      if (index !== -1) {
        dbData.employees[index].active = false;
        addSystemLog(dbData, userId, userName, `Deactivated Employee: ${employee.name}`);
      }
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage Tanks & fuel types
  app.post("/api/tanks", (req, res) => {
    const { action, tank, userId, userName } = req.body; // action: 'add' | 'edit' | 'delete'
    const dbData = readDB();

    if (action === 'add') {
      const newTank: FuelTank = {
        ...tank,
        id: `tank_${Date.now()}`,
        currentStock: parseFloat(tank.openingStock) || 0,
        lastUpdated: new Date().toISOString()
      };
      dbData.tanks.push(newTank);
      addSystemLog(dbData, userId, userName, `Added Tank ${newTank.name} (Capacity: ${newTank.capacity}L, Fuel: ${newTank.fuelType})`);
    } else if (action === 'edit') {
      const index = dbData.tanks.findIndex(t => t.id === tank.id);
      if (index !== -1) {
        // Adjust currentStock if openingStock or rates are manually modified
        const originalTank = dbData.tanks[index];
        const stockDiff = (tank.openingStock || originalTank.openingStock) - originalTank.openingStock;
        dbData.tanks[index] = {
          ...originalTank,
          ...tank,
          currentStock: Math.max(0, originalTank.currentStock + stockDiff),
          lastUpdated: new Date().toISOString()
        };
        addSystemLog(dbData, userId, userName, `Updated Tank Stock Configuration: ${tank.name}`);
      }
    } else if (action === 'delete') {
      dbData.tanks = dbData.tanks.filter(t => t.id !== tank.id);
      addSystemLog(dbData, userId, userName, `Deleted Fuel Tank: ${tank.name}`);
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage Nozzles
  app.post("/api/nozzles", (req, res) => {
    const { action, nozzle, userId, userName } = req.body; // action: 'add' | 'edit' | 'delete' | 'toggle'
    const dbData = readDB();

    if (action === 'add') {
      const newNozzle: Nozzle = {
        ...nozzle,
        id: `nozzle_${Date.now()}`,
        active: true
      };
      dbData.nozzles.push(newNozzle);
      addSystemLog(dbData, userId, userName, `Added Nozzle: ${newNozzle.nozzleNumber} Linked to Tank ID ${newNozzle.tankId}`);
    } else if (action === 'edit') {
      const index = dbData.nozzles.findIndex(n => n.id === nozzle.id);
      if (index !== -1) {
        dbData.nozzles[index] = { ...dbData.nozzles[index], ...nozzle };
        addSystemLog(dbData, userId, userName, `Edited Nozzle properties: ${nozzle.nozzleNumber}`);
      }
    } else if (action === 'toggle') {
      const index = dbData.nozzles.findIndex(n => n.id === nozzle.id);
      if (index !== -1) {
        dbData.nozzles[index].active = !dbData.nozzles[index].active;
        addSystemLog(dbData, userId, userName, `Toggled Nozzle status for ${dbData.nozzles[index].nozzleNumber} to ${dbData.nozzles[index].active ? 'Active' : 'Disabled'}`);
      }
    } else if (action === 'delete') {
      dbData.nozzles = dbData.nozzles.filter(n => n.id !== nozzle.id);
      addSystemLog(dbData, userId, userName, `Deleted Nozzle: ${nozzle.nozzleNumber}`);
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage Udhaar Customers
  app.post("/api/customers", (req, res) => {
    const { action, customer, userId, userName } = req.body; // action: 'add' | 'edit' | 'delete'
    const dbData = readDB();

    if (!dbData.customers) dbData.customers = [];

    if (action === 'add') {
      const newCust = {
        ...customer,
        id: `cust_${Date.now()}`,
        active: true,
        creditLimit: parseFloat(customer.creditLimit) || 0
      };
      dbData.customers.push(newCust);
      addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Added Udhaar Customer: ${newCust.name} (Vehicle: ${newCust.vehicleNo || 'N/A'}, Credit Limit: ₹${newCust.creditLimit})`);
    } else if (action === 'edit') {
      const index = dbData.customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        dbData.customers[index] = {
          ...dbData.customers[index],
          ...customer,
          creditLimit: parseFloat(customer.creditLimit) || 0
        };
        addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Updated Udhaar Customer details: ${customer.name}`);
      }
    } else if (action === 'delete') {
      const index = dbData.customers.findIndex(c => c.id === customer.id);
      if (index !== -1) {
        dbData.customers[index].active = false;
        addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Deactivated Udhaar Customer: ${dbData.customers[index].name}`);
      }
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage Credit Transactions
  app.post("/api/credit-transactions", (req, res) => {
    const { action, transaction, userId, userName } = req.body; // action: 'add' | 'delete' | 'mark-whatsapp'
    const dbData = readDB();

    if (!dbData.creditTransactions) dbData.creditTransactions = [];

    if (action === 'add') {
      const newTx = {
        ...transaction,
        id: `tx_${Date.now()}`,
        liters: parseFloat(transaction.liters) || 0,
        rate: parseFloat(transaction.rate) || 0,
        amount: parseFloat(transaction.amount) || 0,
        date: transaction.date || new Date().toISOString().split('T')[0],
        whatsappSent: false
      };
      dbData.creditTransactions.push(newTx);
      
      const custName = dbData.customers?.find(c => c.id === transaction.customerId)?.name || "Unknown Customer";
      addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Created Udhaar Invoice ${newTx.invoiceNo} for ${custName}: ${newTx.liters}L of ${newTx.fuelType} (₹${newTx.amount})`);
    } else if (action === 'delete') {
      dbData.creditTransactions = dbData.creditTransactions.filter(t => t.id !== transaction.id);
      addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Cancelled Credit Ledger entry/transaction ID ${transaction.id}`);
    } else if (action === 'mark-whatsapp') {
      const index = dbData.creditTransactions.findIndex(t => t.id === transaction.id);
      if (index !== -1) {
        dbData.creditTransactions[index].whatsappSent = true;
        addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Sent WhatsApp alert for Transaction ${dbData.creditTransactions[index].invoiceNo}`);
      }
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Manage 24-Hour Consolidated Day Book (Daily Closings)
  app.post("/api/daily-closings", (req, res) => {
    const { action, closingData, userId, userName } = req.body;
    const dbData = readDB();

    if (!dbData.dailyClosings) dbData.dailyClosings = [];

    if (action === 'save') {
      const idx = dbData.dailyClosings.findIndex(dc => dc.date === closingData.date);
      const record = {
        ...closingData,
        id: closingData.date,
        lastUpdatedBy: userName || "Administrator",
        lastUpdatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        dbData.dailyClosings[idx] = record;
        addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Updated Day Book summary for date: ${closingData.date}`);
      } else {
        dbData.dailyClosings.push(record);
        addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Created New Day Book summary for date: ${closingData.date}`);
      }
    } else if (action === 'delete') {
      const closingDate = closingData.date;
      dbData.dailyClosings = dbData.dailyClosings.filter(dc => dc.date !== closingDate);
      addSystemLog(dbData, userId ?? "admin-bypass", userName ?? "Administrator", `Deleted Day Book summary for date: ${closingDate}`);
    }

    writeDB(dbData);
    res.json(dbData);
  });

  // Daily Nozzle & Tank Entries (Shift Records)
  app.post("/api/records", (req, res) => {
    const { action, recordId, date, shiftId, attendance, nozzleEntries, tankEntries, notes, userId, userName } = req.body;
    const dbData = readDB();
    const id = recordId || `${date}-${shiftId}`;

    let recordIndex = dbData.records.findIndex(r => r.id === id);

    if (action === "open") {
      // Check if there is already an open shift for this shiftId on this date
      const alreadyOpen = dbData.records.some(r => r.date === date && r.shiftId === shiftId && r.status === 'open');
      if (alreadyOpen) {
        return res.status(400).json({ error: "Shift is already open for this date to record. (આ તારીખે શિફ્ટ પહેલેથી જ ચાલુ છે.)" });
      }

      const activeEmployeeIds = dbData.employees.filter(e => e.active).map(e => e.id);
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

      dbData.records.push(newRecord);
      const shiftName = dbData.shifts.find(s => s.id === shiftId)?.name || shiftId;
      addSystemLog(dbData, userId, userName, `Opened ${shiftName} on ${date}. Initial staff assigned.`);
      writeDB(dbData);
      return res.json(dbData);
    }

    if (recordIndex === -1) {
      return res.status(404).json({ error: "Active Shift record not found." });
    }

    const currentRecord = dbData.records[recordIndex];

    if (action === "update-entries") {
      // Periodic operator saves of reading data & cash status
      currentRecord.attendance = { ...currentRecord.attendance, ...attendance };
      currentRecord.nozzleEntries = { ...currentRecord.nozzleEntries, ...nozzleEntries };
      currentRecord.tankEntries = { ...currentRecord.tankEntries, ...tankEntries };
      currentRecord.notes = notes !== undefined ? notes : currentRecord.notes;
      
      addSystemLog(dbData, userId, userName, `Updated nozzle reading logs and attendance for Shift: ${date} / ${dbData.shifts.find(s => s.id === currentRecord.shiftId)?.name}`);
    } 
    else if (action === "close") {
      // Finalize and close the shift
      currentRecord.attendance = { ...currentRecord.attendance, ...attendance };
      currentRecord.nozzleEntries = { ...currentRecord.nozzleEntries, ...nozzleEntries };
      currentRecord.tankEntries = { ...currentRecord.tankEntries, ...tankEntries };
      currentRecord.notes = notes !== undefined ? notes : currentRecord.notes;
      currentRecord.status = "closed";
      currentRecord.closedAt = new Date().toISOString();
      currentRecord.closedBy = userName;

      // Update the fuel stocks inside Tanks permanently!
      // Formula: Closing Stock = Opening Stock + Purchases - Litres Sold (Testing liters are returned to tank, so not deducted permanently)
      Object.keys(currentRecord.nozzleEntries).forEach(nozId => {
        const nozEntry = currentRecord.nozzleEntries[nozId];
        const nozzleInfo = dbData.nozzles.find(n => n.id === nozId);
        if (nozzleInfo) {
          const tank = dbData.tanks.find(t => t.id === nozzleInfo.tankId);
          if (tank) {
            const litresSold = Math.max(0, nozEntry.closingReading - nozEntry.openingReading - (nozEntry.testingLiters || 0));
            // deduct litresSold from stock
            tank.currentStock = Math.max(0, tank.currentStock - litresSold);
            tank.lastUpdated = new Date().toISOString();
          }
        }
      });

      // Handle any purchase tank arrivals entered in the tank inputs
      Object.keys(currentRecord.tankEntries).forEach(tId => {
        const tEntry = currentRecord.tankEntries[tId];
        const tank = dbData.tanks.find(t => t.id === tId);
        if (tank) {
          if (tEntry.purchaseQty > 0) {
            tank.currentStock = Math.min(tank.capacity, tank.currentStock + tEntry.purchaseQty);
          }
          // If closing dip stock was measured physically, adjust stock to physical dip-meter reading
          if (tEntry.closingDipStock > 0) {
            tank.currentStock = tEntry.closingDipStock;
          }
          tank.lastUpdated = new Date().toISOString();
        }
      });

      const shiftName = dbData.shifts.find(s => s.id === currentRecord.shiftId)?.name || currentRecord.shiftId;
      addSystemLog(dbData, userId, userName, `Closed ${shiftName} on ${currentRecord.date}. Permanent stocks adjusted.`);
    }

    dbData.records[recordIndex] = currentRecord;
    writeDB(dbData);
    res.json(dbData);
  });

  // --- DEV & PRODUCTION BUILD STATIC ASSET SERVING ---

  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets compiled by vite
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to host and run server
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pump Management server running smoothly on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed to boot Pump Management express server:", err);
});
