"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BadgePercent,
  Banknote,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  Download,
  Edit,
  Edit2,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Info,
  Layers,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  Radio,
  Receipt,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

import {
  computeEmployeePayrollAction,
  createEmployeeAction,
  createEmployeeScheduleAction,
  createEmployeeWithAccountAction,
  deleteEmployeeScheduleAction,
  fetchEmployeePayrollAction,
  fetchEmployeeSchedulesAction,
  fetchEmployeesData,
  updateEmployeeAction,
  updateEmployeeScheduleAction,
} from "@/lib/api/employees"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ---------------------------------------------------------------------------
// Types & Data Models (Matching Module 10 in dbdesign.md)
// ---------------------------------------------------------------------------

export type EmploymentStatus = "active" | "on_leave" | "terminated"
export type SalaryType = "daily" | "monthly"
export type AttendanceStatus =
  "on_time" | "late" | "overtime" | "incomplete" | "absent"
export type AttendanceMethod = "rfid" | "manual" | "pin"
export type PayrollStatus = "open" | "processing" | "closed"

export interface EmployeeProfile {
  id: string
  userId: string
  employeeNumber: string
  name: string
  email: string
  contactNumber: string
  position: string
  department: string
  rfidCardUid: string | null
  dateHired: string
  employmentStatus: EmploymentStatus
  basicSalary: number
  salaryType: SalaryType
  dailyRate: number
  hourlyRate: number
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  department: string
  logDate: string
  clockIn: string
  clockOut: string | null
  totalHours: number | null
  lateMinutes: number
  overtimeHours: number
  status: AttendanceStatus
  method: AttendanceMethod
  rfidCardUidUsed: string | null
  notes: string | null
}

interface AttendanceDaySummary {
  key: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  department: string
  logDate: string
  records: AttendanceRecord[]
  hours: number
  lateMinutes: number
  hasOpenPunch: boolean
}

export interface ShiftSchedule {
  id: string
  userId: string
  employeeName: string
  position: string
  department: string
  shiftDate: string
  startTime: string
  endTime: string
}

export interface PayrollRecord {
  id: string
  employeeId: string
  employeeName: string
  employeeNumber: string
  position: string
  department: string
  periodStart: string
  periodEnd: string
  daysWorked: number
  regularHours: number
  overtimeHours: number
  basicPay: number
  overtimePay: number
  grossPay: number
  deductions: {
    sss: number
    philHealth: number
    pagIbig: number
    tardiness: number
    cashAdvance: number
    total: number
  }
  employerContributions: {
    sss: number
    philHealth: number
    pagIbig: number
    total: number
  }
  netPay: number
  status: "paid" | "pending"
}

function formatAttendanceTime(value: string | null) {
  if (!value) return null
  const dateValue = value.includes("T") ? value : `${value.replace(" ", "T")}+08:00`
  return new Date(dateValue).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  })
}

function formatPeso(value: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatAttendanceLogs(logs: any[], employees: EmployeeProfile[] = []): AttendanceRecord[] {
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]))
  return logs.map((log) => ({
    id: log.id,
    employeeId: log.employeeId,
    employeeName: log.employeeName,
    employeeNumber: log.employeeNumber || employeeMap.get(log.employeeId)?.employeeNumber || "",
    department: log.department || employeeMap.get(log.employeeId)?.department || "",
    logDate: String(log.logDate ?? "").slice(0, 10),
    clockIn: log.clockIn,
    clockOut: log.clockOut,
    totalHours: log.totalHours === null || log.totalHours === undefined ? null : Number(log.totalHours),
    lateMinutes: Number(log.lateMinutes ?? 0),
    overtimeHours: Number(log.overtimeHours ?? 0),
    status: log.status,
    method: log.method,
    rfidCardUidUsed: log.rfidCardUidUsed ?? null,
    notes: log.notes ?? null,
  }))
}

function getPayrollPeriodOptions(anchor = new Date()) {
  const options: { value: string; label: string; start: string; end: string }[] = []
  for (let offset = 0; offset < 6; offset += 1) {
    const month = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1)
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short" }).format(month)
    const lastDate = new Date(year, monthIndex + 1, 0).getDate()
    const halves = [
      { from: 1, to: 15 },
      { from: 16, to: lastDate },
    ]
    for (const half of halves) {
      const startDate = new Date(year, monthIndex, half.from)
      if (startDate > anchor) continue
      const start = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(half.from).padStart(2, "0")}`
      const end = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(half.to).padStart(2, "0")}`
      options.push({
        value: `${start}_${end}`,
        label: `${monthLabel} ${half.from}–${half.to}, ${year}`,
        start,
        end,
      })
    }
  }
  return options.sort((a, b) => b.start.localeCompare(a.start))
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EmployeesPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("directory")

  // Employees state
  const [employees, setEmployees] = useState<EmployeeProfile[]>([])
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeProfile | null>(null)
  const [employeeToDelete, setEmployeeToDelete] =
    useState<EmployeeProfile | null>(null)
  const [editingEmployee, setEditingEmployee] =
    useState<EmployeeProfile | null>(null)
  const [isSavingEmployee, setIsSavingEmployee] = useState(false)
  const [isEmployeeSheetOpen, setIsEmployeeSheetOpen] = useState(false)
  const [isDeleteEmployeeDialogOpen, setIsDeleteEmployeeDialogOpen] =
    useState(false)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(
    null
  )

  // Employee Form state
  const [empForm, setEmpForm] = useState({
    name: "",
    email: "",
    contactNumber: "",
    position: "",
    department: "Service",
    employeeNumber: "",
    rfidCardUid: "",
    password: "",
    dateHired: new Date().toISOString().split("T")[0],
    employmentStatus: "active" as EmploymentStatus,
    basicSalary: 610,
    salaryType: "daily" as SalaryType,
  })

  // Attendance state
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([])
  const [attendanceFilterDate, setAttendanceFilterDate] = useState("all")
  const [selectedAttendanceDay, setSelectedAttendanceDay] = useState<AttendanceDaySummary | null>(null)

  // Schedules state
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([])
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ShiftSchedule | null>(null)
  const [newShift, setNewShift] = useState({
    employeeId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "17:00",
  })
  const [selectedScheduleDays, setSelectedScheduleDays] = useState<number[]>([1, 2, 3, 4, 5])

  // Payroll state
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(
    null
  )
  const payrollPeriods = useMemo(() => getPayrollPeriodOptions(), [])
  const [payrollPeriod, setPayrollPeriod] = useState(() => getPayrollPeriodOptions()[0]?.value ?? "")
  const activePayrollPeriod = payrollPeriods.find((period) => period.value === payrollPeriod) ?? payrollPeriods[0]

  useEffect(() => {
    const loadEmployees = async () => {
      const result = await fetchEmployeesData()
      if (!result.success) {
        toast.error(result.error)
        setIsLoading(false)
        return
      }

      const formattedEmployees = result.data.employees.map((employee) => {
        const dailyRate =
          employee.salaryType === "daily"
            ? employee.basicSalary
            : employee.basicSalary / 26
        return {
          id: employee.id,
          userId: employee.userId,
          employeeNumber: employee.employeeNumber,
          name: employee.name,
          email: employee.email ?? "",
          contactNumber: employee.contactNumber ?? "",
          position: employee.position,
          department: employee.department || "Unassigned",
          rfidCardUid: employee.rfidCardUid || null,
          dateHired: employee.dateHired,
          employmentStatus: employee.employmentStatus,
          basicSalary: employee.basicSalary,
          salaryType: employee.salaryType,
          dailyRate,
          hourlyRate: dailyRate / 8,
        }
      })
      setEmployees(formattedEmployees)
      setAttendanceLogs(formatAttendanceLogs(result.data.attendance ?? [], formattedEmployees))
      const scheduleResult = await fetchEmployeeSchedulesAction()
      if (scheduleResult.success) {
        setSchedules((scheduleResult.data.schedules ?? []).map((schedule: any) => ({
          ...schedule,
          shiftDate: String(schedule.shiftDate).slice(0, 10),
          startTime: String(schedule.startTime).slice(0, 5),
          endTime: String(schedule.endTime).slice(0, 5),
        })))
      }
      setIsLoading(false)
    }

    void loadEmployees()
  }, [])

  useEffect(() => {
    const handleAttendanceScan = (event: Event) => {
      void fetchEmployeesData().then((result) => {
        if (result.success) setAttendanceLogs(formatAttendanceLogs(result.data.attendance ?? []))
      })
    }
    window.addEventListener("prime-pos:rfid-attendance", handleAttendanceScan)
    return () => window.removeEventListener("prime-pos:rfid-attendance", handleAttendanceScan)
  }, [])

  useEffect(() => {
    if (!activePayrollPeriod) return
    void fetchEmployeePayrollAction(activePayrollPeriod.start, activePayrollPeriod.end).then((result) => {
      if (result.success) setPayrollRecords(result.data.payroll ?? [])
    })
  }, [activePayrollPeriod])

  // ---------------------------------------------------------------------------
  // Handlers — Employee Management
  // ---------------------------------------------------------------------------

  const handleOpenAddEmployee = () => {
    setEditingEmployee(null)
    setEmpForm({
      name: "",
      email: "",
      contactNumber: "",
      position: "",
      department: "Service",
      employeeNumber: "",
      rfidCardUid: "",
      password: "",
      dateHired: new Date().toISOString().split("T")[0],
      employmentStatus: "active",
      basicSalary: 0,
      salaryType: "daily",
    })
    setIsEmployeeSheetOpen(true)
  }

  const handleOpenEditEmployee = (emp: EmployeeProfile) => {
    setEditingEmployee(emp)
    setEmpForm({
      name: emp.name,
      email: emp.email,
      contactNumber: emp.contactNumber,
      position: emp.position,
      department: emp.department,
      employeeNumber: emp.employeeNumber,
      rfidCardUid: emp.rfidCardUid || "",
      password: "",
      dateHired: emp.dateHired,
      employmentStatus: emp.employmentStatus,
      basicSalary: emp.basicSalary,
      salaryType: emp.salaryType,
    })
    setIsEmployeeSheetOpen(true)
  }

  const handleOpenViewEmployee = (emp: EmployeeProfile) => {
    setSelectedEmployee(emp)
  }

  const handleDeleteEmployee = (emp: EmployeeProfile) => {
    setEmployeeToDelete(emp)
    setIsDeleteEmployeeDialogOpen(true)
  }

  const handleConfirmDeleteEmployee = () => {
    if (!employeeToDelete) return

    setEmployees((prev) => prev.filter((emp) => emp.id !== employeeToDelete.id))
    setSelectedEmployee(null)
    setEmployeeToDelete(null)
    setIsDeleteEmployeeDialogOpen(false)
    setDeletingEmployeeId(null)
    toast.success("Employee removed from the local roster", {
      description: `${employeeToDelete.name} was deleted from the current list.`,
    })
  }

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingEmployee) return
    if (!empForm.name.trim()) {
      toast.error("Employee full name is required")
      return
    }

    setIsSavingEmployee(true)
    try {

    const dailyRate =
      empForm.salaryType === "daily"
        ? empForm.basicSalary
        : empForm.basicSalary / 26
    const hourlyRate = dailyRate / 8

    if (editingEmployee) {
      const result = await updateEmployeeAction(editingEmployee.id, {
        name: empForm.name.trim(),
        contactNumber: empForm.contactNumber,
        employeeNumber: empForm.employeeNumber,
        position: empForm.position,
        department: empForm.department,
        rfidCardUid: empForm.rfidCardUid.trim(),
        dateHired: empForm.dateHired,
        employmentStatus: empForm.employmentStatus,
        basicSalary: empForm.basicSalary,
        salaryType: empForm.salaryType,
      })
      if (!result.success) {
        toast.error("Employee update failed", { description: result.error })
        return
      }

      const updatedEmployee: EmployeeProfile = {
        ...editingEmployee,
        name: empForm.name.trim(),
        contactNumber: empForm.contactNumber,
        employeeNumber: empForm.employeeNumber,
        position: empForm.position,
        department: empForm.department,
        rfidCardUid: empForm.rfidCardUid.trim() || null,
        dateHired: empForm.dateHired,
        employmentStatus: empForm.employmentStatus,
        basicSalary: empForm.basicSalary,
        salaryType: empForm.salaryType,
        dailyRate,
        hourlyRate,
      }
      setEmployees((prev) => prev.map((employee) =>
        employee.id === updatedEmployee.id ? updatedEmployee : employee
      ))
      setSelectedEmployee((prev) =>
        prev?.id === updatedEmployee.id ? updatedEmployee : prev
      )
      toast.success("Employee changes saved")
    } else {
      if (!empForm.email.trim() || !empForm.password) {
        toast.error(
          "Staff email and password are required to create the login account"
        )
        return
      }

      const result = await createEmployeeWithAccountAction({
        name: empForm.name,
        email: empForm.email,
        contactNumber: empForm.contactNumber,
        password: empForm.password,
        employeeNumber: empForm.employeeNumber,
        position: empForm.position,
        department: empForm.department,
        // Most USB RFID readers act like a keyboard and append Enter after a scan.
        // Trim the scanned value so whitespace/newlines are never stored as part of the UID.
        rfidCardUid: empForm.rfidCardUid.trim() || undefined,
        dateHired: empForm.dateHired,
        employmentStatus: empForm.employmentStatus,
        basicSalary: empForm.basicSalary,
        salaryType: empForm.salaryType,
      })
      if (!result.success) {
        toast.error("Employee creation failed", { description: result.error })
        return
      }

      toast.success("Employee and staff account created")
      const refreshed = await fetchEmployeesData()
      if (refreshed.success) {
        setEmployees(
          refreshed.data.employees.map((employee) => ({
            ...employee,
            name: employee.name,
            email: employee.email ?? "",
            contactNumber: employee.contactNumber ?? "",
            department: employee.department || "Unassigned",
            rfidCardUid: employee.rfidCardUid || null,
            dailyRate:
              employee.salaryType === "daily"
                ? employee.basicSalary
                : employee.basicSalary / 26,
            hourlyRate:
              (employee.salaryType === "daily"
                ? employee.basicSalary
                : employee.basicSalary / 26) / 8,
          }))
        )
      }
    }

    setIsEmployeeSheetOpen(false)
    } catch {
      toast.error("Could not save employee. Please try again.")
    } finally {
      setIsSavingEmployee(false)
    }
  }

  const handleGenerateRfid = () => {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase()
    const newUid = `E2000019${randomHex}`
    setEmpForm((prev) => ({ ...prev, rfidCardUid: newUid }))
    toast.info(`Generated RFID Badge UID: ${newUid}`)
  }

  // ---------------------------------------------------------------------------
  // Handlers — RFID Attendance Simulator
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Handlers — Shift Scheduling
  // ---------------------------------------------------------------------------

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingSchedule) return
    setIsSavingSchedule(true)
    try {
    const targetEmp = employees.find((emp) => emp.id === newShift.employeeId)
    if (editingSchedule) {
      const result = await updateEmployeeScheduleAction(editingSchedule.id, {
        shiftDate: newShift.startDate,
        startTime: newShift.startTime,
        endTime: newShift.endTime,
      })
      if (!result.success) {
        toast.error("Schedule could not be updated", { description: result.error })
        return
      }
      const refreshed = await fetchEmployeeSchedulesAction()
      if (refreshed.success) {
        setSchedules((refreshed.data.schedules ?? []).map((schedule: any) => ({
          ...schedule,
          shiftDate: String(schedule.shiftDate).slice(0, 10),
          startTime: String(schedule.startTime).slice(0, 5),
          endTime: String(schedule.endTime).slice(0, 5),
        })))
      }
      setIsAddShiftOpen(false)
      setEditingSchedule(null)
      toast.success("Schedule updated")
      return
    }
    if (!targetEmp || selectedScheduleDays.length === 0) {
      toast.error("Choose an employee and at least one work day")
      return
    }
    const cursor = new Date(`${newShift.startDate}T12:00:00`)
    const lastDay = new Date(`${newShift.endDate}T12:00:00`)
    if (Number.isNaN(cursor.getTime()) || cursor > lastDay) {
      toast.error("Choose a valid schedule date range")
      return
    }
    const dates: string[] = []
    while (cursor <= lastDay) {
      if (selectedScheduleDays.includes(cursor.getDay())) {
        dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    if (!dates.length) {
      toast.error("No selected work days fall within that date range")
      return
    }
    const result = await createEmployeeScheduleAction({
      employeeId: targetEmp.id,
      shiftDates: dates,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
    })
    if (!result.success) {
      toast.error("Schedule could not be saved", { description: result.error })
      return
    }
    const refreshed = await fetchEmployeeSchedulesAction()
    if (refreshed.success) {
      setSchedules((refreshed.data.schedules ?? []).map((schedule: any) => ({
        ...schedule,
        shiftDate: String(schedule.shiftDate).slice(0, 10),
        startTime: String(schedule.startTime).slice(0, 5),
        endTime: String(schedule.endTime).slice(0, 5),
      })))
    }
    setIsAddShiftOpen(false)
    toast.success(`Schedule saved for ${dates.length} day${dates.length === 1 ? "" : "s"}`)
    } catch {
      toast.error("Could not save the schedule. Please try again.")
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const handleEditSchedule = (schedule: ShiftSchedule) => {
    setEditingSchedule(schedule)
    setNewShift({
      employeeId: employees.find((employee) => employee.userId === schedule.userId)?.id ?? "",
      startDate: schedule.shiftDate,
      endDate: schedule.shiftDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    })
    setIsAddShiftOpen(true)
  }

  const handleDeleteSchedule = async (schedule: ShiftSchedule) => {
    if (!window.confirm(`Delete ${schedule.employeeName}'s schedule for ${schedule.shiftDate}?`)) return
    const result = await deleteEmployeeScheduleAction(schedule.id)
    if (!result.success) {
      toast.error("Schedule could not be deleted", { description: result.error })
      return
    }
    setSchedules((current) => current.filter((entry) => entry.id !== schedule.id))
    toast.success("Schedule deleted")
  }

  // ---------------------------------------------------------------------------
  // Handlers — Payroll
  // ---------------------------------------------------------------------------

  const handleComputePayroll = async () => {
    const period = activePayrollPeriod
    if (!period) {
      toast.error("No payroll period is selected")
      return
    }
    const result = await computeEmployeePayrollAction({
      periodStart: period.start,
      periodEnd: period.end,
    })
    if (!result.success) {
      toast.error("Payroll could not be computed", { description: result.error })
      return
    }
    const computedRecords = result.data.payroll ?? []
    setPayrollRecords(computedRecords)
    setSelectedPayslip((current) =>
      current
        ? computedRecords.find((record: PayrollRecord) => record.employeeId === current.employeeId) ?? current
        : current
    )
    toast.success(`Payroll updated for ${period.label}`)
  }

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    let list = [...employees]
    if (departmentFilter !== "all") {
      list = list.filter(
        (e) => e.department.toLowerCase() === departmentFilter.toLowerCase()
      )
    }
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase()
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeNumber.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q) ||
          (e.rfidCardUid && e.rfidCardUid.toLowerCase().includes(q))
      )
    }
    return list
  }, [employees, departmentFilter, employeeSearch])

  const schedulesByEmployee = useMemo(() => {
    const grouped = new Map<string, { employeeName: string; department: string; entries: ShiftSchedule[] }>()
    for (const schedule of schedules) {
      const group = grouped.get(schedule.userId) ?? {
        employeeName: schedule.employeeName,
        department: schedule.department,
        entries: [],
      }
      group.entries.push(schedule)
      grouped.set(schedule.userId, group)
    }
    return [...grouped.entries()].map(([userId, group]) => ({
      userId,
      ...group,
      entries: group.entries.sort((a, b) => a.shiftDate.localeCompare(b.shiftDate)),
    }))
  }, [schedules])

  const attendanceDayGroups = useMemo(() => {
    const grouped = new Map<string, AttendanceDaySummary>()
    for (const log of attendanceLogs) {
      const key = `${log.employeeId}:${log.logDate}`
      const group = grouped.get(key) ?? {
        key,
        employeeId: log.employeeId,
        employeeName: log.employeeName,
        employeeNumber: log.employeeNumber,
        department: log.department,
        logDate: log.logDate,
        records: [],
        hours: 0,
        lateMinutes: 0,
        hasOpenPunch: false,
      }
      group.records.push(log)
      group.hours += log.totalHours ?? 0
      group.lateMinutes += log.lateMinutes
      group.hasOpenPunch ||= !log.clockOut
      grouped.set(key, group)
    }
    return [...grouped.values()]
      .map((group) => ({
        ...group,
        records: group.records.sort((a, b) => a.clockIn.localeCompare(b.clockIn)),
        hours: Math.round(group.hours * 100) / 100,
      }))
      .sort((a, b) => b.logDate.localeCompare(a.logDate) || a.employeeName.localeCompare(b.employeeName))
  }, [attendanceLogs])

  const selectedAttendancePunches = useMemo(() => {
    if (!selectedAttendanceDay) return []
    return selectedAttendanceDay.records
      .flatMap((record) => [
        { type: "IN", time: record.clockIn, lateMinutes: record.lateMinutes },
        ...(record.clockOut
          ? [{ type: "OUT", time: record.clockOut, lateMinutes: 0 }]
          : []),
      ])
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [selectedAttendanceDay])

  const todayDate = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Manila",
  })
  const presentToday = new Set(
    attendanceLogs
      .filter((log) => log.logDate === todayDate && !log.clockOut)
      .map((log) => log.employeeId)
  ).size
  const tardyTapsToday = attendanceLogs.filter(
    (log) => log.status === "late" && log.logDate === todayDate
  ).length

  return (
    <div
      className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8"
      data-rfid-registration-open={isEmployeeSheetOpen ? "true" : "false"}
    >
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Staff, RFID Attendance & Payroll
            </h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Employee roster, RFID card time-clock logs, weekly shift
              scheduling, and statutory payroll.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {activeTab === "directory" && (
              <Button
                onClick={handleOpenAddEmployee}
                size="sm"
                className="h-9 gap-1.5 bg-amber-600 text-xs text-white hover:bg-amber-700"
              >
                <UserPlus className="size-3.5" />
                <span>Add Employee</span>
              </Button>
            )}

            {activeTab === "scheduling" && (
              <Button
                onClick={() => setIsAddShiftOpen(true)}
                size="sm"
                className="h-9 gap-1.5 bg-amber-600 text-xs text-white hover:bg-amber-700"
              >
                <Plus className="size-3.5" />
                <span>Assign Shift</span>
              </Button>
            )}

            {activeTab === "payroll" && (
              <Button
                onClick={handleComputePayroll}
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <Coins className="size-3.5" />
                <span>Compute & Save Payroll</span>
              </Button>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Total Staff
                </span>
                <Users className="size-3.5 text-amber-500" />
              </div>
              <div className="text-lg font-bold sm:text-xl">
                {isLoading ? (
                  <Skeleton className="my-0.5 h-6 w-24" />
                ) : (
                  `${employees.length} Employees`
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="mt-1 h-3 w-32" />
                ) : (
                  `${employees.filter((e) => e.rfidCardUid).length} RFID Badges Assigned`
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Present Today
                </span>
                <Clock className="size-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-bold text-emerald-600 sm:text-xl dark:text-emerald-400">
                {isLoading ? (
                  <Skeleton className="my-0.5 h-6 w-24" />
                ) : (
                  `${presentToday} Checked In`
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="mt-1 h-3 w-20" />
                ) : (
                  `${tardyTapsToday} Tardy Taps`
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Active Shifts
                </span>
                <Calendar className="size-3.5 text-sky-500" />
              </div>
              <div className="text-lg font-bold sm:text-xl">
                {isLoading ? (
                  <Skeleton className="my-0.5 h-6 w-24" />
                ) : (
                  `${schedules.length} Scheduled`
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Across 3 Store Stations
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Payroll Period
                </span>
                <Banknote className="size-3.5 text-purple-500" />
              </div>
              <div className="truncate text-sm font-bold sm:text-base">
                {activePayrollPeriod?.label ?? "No payroll period"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                Cutoff Status: Open
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid h-auto grid-cols-2 border border-border bg-muted/60 p-1 sm:grid-cols-4">
            <TabsTrigger value="directory" className="gap-1.5 py-2 text-xs">
              <Users className="size-3.5" />
              <span>Employee Directory</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5 py-2 text-xs">
              <Radio className="size-3.5 text-emerald-500" />
              <span>RFID Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="gap-1.5 py-2 text-xs">
              <Calendar className="size-3.5" />
              <span>Shift Schedules</span>
            </TabsTrigger>
            <TabsTrigger value="payroll" className="gap-1.5 py-2 text-xs">
              <Banknote className="size-3.5" />
              <span>Payroll & Payslips</span>
            </TabsTrigger>
          </TabsList>

          {/* =============================================================== */}
          {/* TAB 1: EMPLOYEE DIRECTORY                                       */}
          {/* =============================================================== */}
          <TabsContent value="directory" className="space-y-4">
            <Card className="border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Users className="size-4 text-amber-500" />
                      Employee Roster & RFID Badges
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Master directory of restaurant staff, employment
                      contracts, and assigned RFID cards.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={departmentFilter}
                      onValueChange={(value) =>
                        setDepartmentFilter(value ?? "all")
                      }
                    >
                      <SelectTrigger className="h-8 w-[160px] text-xs">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Cashier">Cashier</SelectItem>
                        <SelectItem value="Kitchen">Kitchen</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="relative">
                    <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employee name, ID number, RFID UID, position..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Emp ID</th>
                          <th className="px-3 py-2.5">Staff Name</th>
                          <th className="px-3 py-2.5">Position & Dept</th>
                          <th className="px-3 py-2.5">RFID Card Badge</th>
                          <th className="px-3 py-2.5">Salary Rate</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {isLoading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <tr key={i} className="transition-colors">
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-16" />
                              </td>
                              <td className="space-y-1.5 px-3 py-3">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-20" />
                              </td>
                              <td className="space-y-1.5 px-3 py-3">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-14" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-24" />
                              </td>
                              <td className="space-y-1.5 px-3 py-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-5 w-16 rounded-full" />
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Skeleton className="size-7 rounded-md" />
                                  <Skeleton className="size-7 rounded-md" />
                                  <Skeleton className="size-7 rounded-md" />
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : filteredEmployees.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-8 text-center text-muted-foreground"
                            >
                              No employees found.
                            </td>
                          </tr>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <tr
                              key={emp.id}
                              className="transition-colors hover:bg-muted/30"
                            >
                              <td className="px-3 py-2.5 font-mono font-semibold text-muted-foreground">
                                {emp.employeeNumber}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-foreground">
                                  {emp.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {emp.contactNumber}
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-foreground">
                                  {emp.position}
                                </div>
                                <Badge
                                  variant="outline"
                                  className="py-0 text-[9px] text-muted-foreground"
                                >
                                  {emp.department}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5">
                                {emp.rfidCardUid ? (
                                  <div className="flex items-center gap-1.5">
                                    <Radio className="size-3 animate-pulse text-emerald-500" />
                                    <span className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground">
                                      {emp.rfidCardUid}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500">
                                    <AlertCircle className="size-3" /> No Card
                                    Assigned
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                <div className="font-semibold text-foreground">
                                  ₱{emp.basicSalary.toLocaleString()}{" "}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    /{emp.salaryType}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  ~₱{emp.hourlyRate.toFixed(2)}/hr
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    emp.employmentStatus === "active"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  }`}
                                >
                                  {emp.employmentStatus.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handleOpenViewEmployee(emp)
                                        }
                                        className="size-7"
                                        aria-label={`View ${emp.name}`}
                                      >
                                        <Eye className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      View employee
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handleOpenEditEmployee(emp)
                                        }
                                        className="size-7"
                                        aria-label={`Edit ${emp.name}`}
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Edit employee
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                          handleDeleteEmployee(emp)
                                        }
                                        className="size-7 text-destructive hover:bg-destructive/10"
                                        aria-label={`Delete ${emp.name}`}
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Delete employee
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 2: RFID ATTENDANCE & TIME CLOCK                             */}
          {/* =============================================================== */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              {/* Interactive RFID Tap Station (Left Column) */}
              <div className="space-y-4 lg:col-span-4">
                <Card className="border border-emerald-500/40 bg-gradient-to-b from-card to-emerald-500/5 shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
                        <Radio className="size-4 animate-pulse text-emerald-500" />
                        RFID Attendance Reader
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-300"
                      >
                        Reader #1 (Active)
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      RFID scans are detected across the admin app while PRIME
                      POS is open. Early punches are accepted. The first IN is
                      marked late if it is after the scheduled start; employees
                      can record up to four alternating IN/OUT punches daily.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="space-y-3 rounded-xl border border-dashed border-emerald-500/40 bg-muted/40 p-4 text-center">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Radio className="size-8 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Ready for RFID Scan
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Tap the employee card. No button press is needed.
                        </p>
                      </div>
                      <div className="rounded-lg bg-background px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Tap a registered RFID card anywhere in the admin app.
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        The browser must be open, and the reader must send the card UID followed by Enter.
                      </p>
                    </div>

                  </CardContent>
                </Card>
              </div>

              {/* Attendance Records Table (Right Column) */}
              <div className="space-y-4 lg:col-span-8">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Clock className="size-4 text-emerald-500" />
                        Daily Attendance Ledger
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {isLoading ? (
                          <Skeleton className="h-3 w-14" />
                        ) : (
                          `${attendanceDayGroups.length} Days`
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      One row per employee per day. Open a day to see every IN/OUT punch.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="overflow-hidden rounded-lg border border-border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                            <tr>
                              <th className="px-3 py-2.5">Date</th>
                              <th className="px-3 py-2.5">Staff Name</th>
                              <th className="px-3 py-2.5">In / Out</th>
                              <th className="px-3 py-2.5">Hours</th>
                              <th className="px-3 py-2.5">Status</th>
                              <th className="px-3 py-2.5">Method</th>
                              <th className="px-3 py-2.5">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {isLoading ? (
                              Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="transition-colors">
                                  <td className="px-3 py-3">
                                    <Skeleton className="h-4 w-20" />
                                  </td>
                                  <td className="space-y-1.5 px-3 py-3">
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-3 w-16" />
                                  </td>
                                  <td className="space-y-1.5 px-3 py-3">
                                    <Skeleton className="h-4 w-20" />
                                    <Skeleton className="h-3 w-16" />
                                  </td>
                                  <td className="px-3 py-3">
                                    <Skeleton className="h-4 w-14" />
                                  </td>
                                  <td className="px-3 py-3">
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                  </td>
                                  <td className="px-3 py-3">
                                    <Skeleton className="h-4 w-12" />
                                  </td>
                                  <td className="px-3 py-3">
                                    <Skeleton className="h-7 w-14" />
                                  </td>
                                </tr>
                              ))
                            ) : attendanceDayGroups.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No attendance records found.
                                </td>
                              </tr>
                            ) : (
                              attendanceDayGroups.map((group) => {
                                const firstRecord = group.records[0]
                                const lastRecord = group.records[group.records.length - 1]
                                const punchCount = group.records.reduce(
                                  (count, record) => count + 1 + (record.clockOut ? 1 : 0),
                                  0
                                )
                                return (
                                  <tr key={group.key} className="transition-colors hover:bg-muted/30">
                                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">{group.logDate}</td>
                                    <td className="px-3 py-2.5">
                                      <div className="font-semibold text-foreground">{group.employeeName}</div>
                                      <div className="text-[10px] text-muted-foreground">{group.department}</div>
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                                      <div className="font-medium text-emerald-600 dark:text-emerald-400">IN: {formatAttendanceTime(firstRecord.clockIn)}</div>
                                      <div className="text-[10px] text-muted-foreground">OUT: {formatAttendanceTime(lastRecord.clockOut) || "— Active —"}</div>
                                      <div className="text-[10px] text-muted-foreground">{punchCount} punches</div>
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold tabular-nums">
                                      {group.hasOpenPunch ? "In Progress" : `${group.hours} hrs`}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] ${
                                          group.lateMinutes > 0
                                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        }`}
                                      >
                                        {group.lateMinutes > 0 ? `Late (${group.lateMinutes}m)` : "ON_TIME"}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                        <Radio className="size-2.5 text-emerald-500" /> RFID
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <Button variant="outline" size="sm" onClick={() => setSelectedAttendanceDay(group)} className="h-7 gap-1 text-xs">
                                        <Eye className="size-3" /> View
                                      </Button>
                                    </td>
                                  </tr>
                                )
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <Dialog open={!!selectedAttendanceDay} onOpenChange={(open) => !open && setSelectedAttendanceDay(null)}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Daily Attendance Details</DialogTitle>
                <DialogDescription>
                  {selectedAttendanceDay?.employeeName} · {selectedAttendanceDay?.logDate}
                </DialogDescription>
              </DialogHeader>
              {selectedAttendanceDay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-xs">
                    <span>Total recorded hours</span>
                    <span className="font-semibold">{selectedAttendanceDay.hours.toFixed(2)} hrs</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Punch</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedAttendancePunches.map((punch, index) => (
                          <tr key={`${punch.type}-${punch.time}`}>
                            <td className="px-3 py-2 font-semibold">{index + 1}. {punch.type}</td>
                            <td className="px-3 py-2 tabular-nums">{formatAttendanceTime(punch.time)}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {punch.lateMinutes > 0 ? `Late ${punch.lateMinutes} min` : "Recorded"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* =============================================================== */}
          {/* TAB 3: SHIFT SCHEDULING                                         */}
          {/* =============================================================== */}
          <TabsContent value="scheduling" className="space-y-4">
            <Card className="border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Calendar className="size-4 text-sky-500" />
                      Employee Work Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Set each employee’s work days and hours across a date range.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingSchedule(null)
                      setIsAddShiftOpen(true)
                    }}
                    size="sm"
                    className="h-8 gap-1.5 bg-sky-600 text-xs text-white hover:bg-sky-700"
                  >
                    <Plus className="size-3.5" />
                    <span>Create Schedule</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="space-y-2.5 rounded-lg border border-border bg-background p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-4 w-14 rounded-full" />
                        </div>
                        <div className="space-y-2 pt-1">
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                    ))
                  ) : schedulesByEmployee.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-muted-foreground">
                      No work schedules yet.
                    </div>
                  ) : (
                    schedulesByEmployee.map((group) => (
                      <div
                        key={group.userId}
                        className="space-y-3 rounded-lg border border-border bg-background p-3.5 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-foreground">
                            {group.employeeName}
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {group.department}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {group.entries.map((sch) => (
                            <div key={sch.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-2">
                              <div className="min-w-0 space-y-1 text-xs">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Calendar className="size-3 shrink-0 text-purple-500" />
                                  <span>{new Date(`${sch.shiftDate}T12:00:00`).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="size-3 shrink-0 text-sky-500" />
                                  <span className="font-mono font-medium text-foreground">{sch.startTime} – {sch.endTime}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label={`Edit schedule for ${sch.shiftDate}`} onClick={() => handleEditSchedule(sch)} className="size-8">
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" aria-label={`Delete schedule for ${sch.shiftDate}`} onClick={() => void handleDeleteSchedule(sch)} className="size-8 text-destructive hover:text-destructive">
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 4: PAYROLL & PAYSLIPS                                       */}
          {/* =============================================================== */}
          <TabsContent value="payroll" className="space-y-4">
            <Card className="border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Banknote className="size-4 text-purple-500" />
                      Payroll Summary & Payslips
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Uses completed attendance hours, configured contribution rates, and each employee’s pay rate.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={payrollPeriod}
                      onValueChange={(value) => setPayrollPeriod(value ?? "")}
                    >
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {payrollPeriods.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Staff Member</th>
                          <th className="px-3 py-2.5">Days / Hours</th>
                          <th className="px-3 py-2.5">Regular Pay</th>
                          <th className="px-3 py-2.5">Overtime Pay</th>
                          <th className="px-3 py-2.5">Estimated Gross</th>
                          <th className="px-3 py-2.5">Employee Contributions</th>
                          <th className="px-3 py-2.5">Estimated Net</th>
                          <th className="px-3 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {isLoading ? (
                          Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} className="transition-colors">
                              <td className="space-y-1.5 px-3 py-3">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-16" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-14" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-16" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-16" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-18" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-18" />
                              </td>
                              <td className="px-3 py-3">
                                <Skeleton className="h-4 w-18" />
                              </td>
                              <td className="px-3 py-3 text-right">
                                <Skeleton className="ml-auto h-7 w-16" />
                              </td>
                            </tr>
                          ))
                        ) : payrollRecords.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-8 text-center text-muted-foreground"
                            >
                              Compute the selected period to create payroll records from attendance.
                            </td>
                          </tr>
                        ) : (
                          payrollRecords.map((rec) => (
                            <tr
                              key={rec.id}
                              className="transition-colors hover:bg-muted/30"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-semibold text-foreground">
                                  {rec.employeeName}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {rec.position}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 tabular-nums">
                                {rec.daysWorked} days
                                <div className="text-[10px] text-muted-foreground">
                                  {rec.regularHours + rec.overtimeHours} hrs
                                </div>
                              </td>
                              <td className="px-3 py-2.5 font-mono tabular-nums">
                                ₱{rec.basicPay.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-mono tabular-nums">
                                ₱{rec.overtimePay.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-semibold tabular-nums">
                                ₱{rec.grossPay.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-rose-600 tabular-nums dark:text-rose-400">
                                ₱{rec.deductions.total.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 font-mono font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                                ₱{rec.netPay.toLocaleString()}
                              </td>
                              <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedPayslip(rec)}
                                  className="h-7 gap-1 text-xs"
                                >
                                  <FileText className="size-3" />
                                  <span>Payslip</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ================================================================= */}
      {/* View Employee Sheet                                               */}
      {/* ================================================================= */}
      <Sheet
        open={Boolean(selectedEmployee)}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          {selectedEmployee && (
            <>
              <SheetHeader className="border-b p-4 text-left sm:p-6">
                <div className="flex items-start justify-between gap-3 pr-8">
                  <div>
                    <SheetTitle>{selectedEmployee.name}</SheetTitle>
                    <SheetDescription>
                      {selectedEmployee.position} ·{" "}
                      {selectedEmployee.department}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      selectedEmployee.employmentStatus === "active"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }
                  >
                    {selectedEmployee.employmentStatus}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Employee ID
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {selectedEmployee.employeeNumber}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Salary
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      ₱{selectedEmployee.basicSalary.toLocaleString()} /{" "}
                      {selectedEmployee.salaryType}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Contact
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {selectedEmployee.contactNumber || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                      Date Hired
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {selectedEmployee.dateHired}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    RFID Badge
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold">
                    {selectedEmployee.rfidCardUid || "No RFID card assigned"}
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                    Daily / Hourly Rate
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    ₱{selectedEmployee.dailyRate.toLocaleString()} / day · ₱
                    {selectedEmployee.hourlyRate.toFixed(2)} / hr
                  </p>
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 border-t bg-background p-4 sm:p-6">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleOpenEditEmployee(selectedEmployee)
                      setSelectedEmployee(null)
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setEmployeeToDelete(selectedEmployee)
                      setIsDeleteEmployeeDialogOpen(true)
                      setSelectedEmployee(null)
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </Button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={isDeleteEmployeeDialogOpen}
        onOpenChange={setIsDeleteEmployeeDialogOpen}
      >
        <AlertDialogContent className="w-[92vw] max-w-md rounded-xl sm:rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete Employee
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              This will remove <strong>{employeeToDelete?.name}</strong> from
              the current employee roster only. This is local page data only
              because no backend delete action exists yet, and the record will
              reappear after reload.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteEmployee}
              className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================================================================= */}
      {/* Add / Edit Employee Sheet                                         */}
      {/* ================================================================= */}
      <Sheet open={isEmployeeSheetOpen} onOpenChange={setIsEmployeeSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="size-5 text-amber-500" />
              {editingEmployee
                ? "Edit Employee Profile"
                : "Register New Employee"}
            </SheetTitle>
            <SheetDescription>
              Complete staff identity, compensation details, and RFID badge
              serial.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSaveEmployee} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Full Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={empForm.name}
                onChange={(e) =>
                  setEmpForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g. Juan De La Cruz"
                className="h-9 text-xs"
              />
            </div>

            {!editingEmployee && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Login Email <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={empForm.email}
                    onChange={(e) =>
                      setEmpForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="staff@example.com"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Temporary Password <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={empForm.password}
                    onChange={(e) =>
                      setEmpForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="At least 8 characters"
                    minLength={8}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Employee Number</Label>
                <Input
                  required={!editingEmployee}
                  value={empForm.employeeNumber}
                  onChange={(e) =>
                    setEmpForm((prev) => ({
                      ...prev,
                      employeeNumber: e.target.value,
                    }))
                  }
                  className="h-9 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Department</Label>
                <Select
                  value={empForm.department}
                  onValueChange={(val) =>
                    setEmpForm((prev) => ({ ...prev, department: val ?? "" }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Cashier">Cashier</SelectItem>
                    <SelectItem value="Kitchen">Kitchen</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Job Position</Label>
                <Input
                  required={!editingEmployee}
                  value={empForm.position}
                  onChange={(e) =>
                    setEmpForm((prev) => ({
                      ...prev,
                      position: e.target.value,
                    }))
                  }
                  placeholder="e.g. Cashier, Grill Cook"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Contact Number</Label>
                <Input
                  value={empForm.contactNumber}
                  onChange={(e) =>
                    setEmpForm((prev) => ({
                      ...prev,
                      contactNumber: e.target.value,
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* RFID Card UID Assignment with Generator */}
            <div className="space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <Radio className="size-3.5 text-emerald-500" />
                  RFID Badge Card UID
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateRfid}
                  className="h-6 p-1 text-[10px] text-emerald-600 hover:text-emerald-700"
                >
                  Generate UID
                </Button>
              </div>
              <Input
                value={empForm.rfidCardUid}
                data-rfid-registration-input="true"
                autoFocus={!editingEmployee}
                onChange={(e) =>
                  setEmpForm((prev) => ({
                    ...prev,
                    rfidCardUid: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  // RFID keyboard wedges commonly send Enter after the UID.
                  // Keep that suffix from submitting the whole employee form.
                  if (e.key === "Enter") e.preventDefault()
                }}
                onBlur={(e) =>
                  setEmpForm((prev) => ({
                    ...prev,
                    rfidCardUid: e.target.value.trim(),
                  }))
                }
                placeholder="Scan or input RFID UID (e.g. E2000019060B0102)"
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Click this field, tap the card on your reader, then save the
                employee. The scanned UID is saved to the database.
              </p>
            </div>

            {/* Compensation */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Salary Type</Label>
                <Select
                  value={empForm.salaryType}
                  onValueChange={(val) =>
                    setEmpForm((prev) => ({
                      ...prev,
                      salaryType: val as SalaryType,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily Rate</SelectItem>
                    <SelectItem value="monthly">Monthly Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Rate (₱)</Label>
                <Input
                  type="number"
                  min="0"
                  value={empForm.basicSalary}
                  onChange={(e) =>
                    setEmpForm((prev) => ({
                      ...prev,
                      basicSalary: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-9 font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <SheetFooter className="gap-2 pt-3 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingEmployee}
                onClick={() => setIsEmployeeSheetOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSavingEmployee}
                loadingText={editingEmployee ? "Updating employee…" : "Creating employee…"}
                size="sm"
                className="h-9 bg-amber-600 text-xs text-white hover:bg-amber-700"
              >
                {editingEmployee ? "Update Employee" : "Save Employee"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* ================================================================= */}
      {/* Assign Shift Modal                                                */}
      {/* ================================================================= */}
      <Dialog open={isAddShiftOpen} onOpenChange={(open) => {
        setIsAddShiftOpen(open)
        if (!open) setEditingSchedule(null)
      }}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddShift}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                {editingSchedule ? "Edit Schedule" : "Create Work Schedule"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {editingSchedule ? "Update this employee’s schedule entry." : "Choose the work days and hours for this employee over a date range."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Employee</Label>
                <Select
                  value={newShift.employeeId}
                  disabled={!!editingSchedule}
                  onValueChange={(val) =>
                    setNewShift((prev) => ({ ...prev, employeeId: val ?? "" }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.position})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{editingSchedule ? "Schedule date" : "Schedule date range"}</Label>
                <div className={`grid ${editingSchedule ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">{editingSchedule ? "Schedule Date" : "From"}</span>
                    <Input
                      aria-label="Schedule starts on"
                      type="date"
                      value={newShift.startDate}
                      onChange={(e) => setNewShift((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>
                  {!editingSchedule && <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground">Through</span>
                    <Input
                      aria-label="Schedule ends on"
                      type="date"
                      value={newShift.endDate}
                      min={newShift.startDate}
                      onChange={(e) => setNewShift((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="h-9 text-xs"
                    />
                  </div>}
                </div>
              </div>

              {!editingSchedule && <div className="space-y-1.5">
                <Label className="text-xs font-medium">Work days</Label>
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
                    const selected = selectedScheduleDays.includes(index)
                    return (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={selected ? "default" : "outline"}
                        aria-pressed={selected}
                        onClick={() => setSelectedScheduleDays((days) => selected ? days.filter((value) => value !== index) : [...days, index].sort())}
                        className="h-8 px-1 text-[10px]"
                      >
                        {day}
                      </Button>
                    )
                  })}
                </div>
              </div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) =>
                      setNewShift((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) =>
                      setNewShift((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

            </div>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingSchedule}
                onClick={() => setIsAddShiftOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSavingSchedule}
                loadingText={editingSchedule ? "Updating schedule…" : "Creating schedule…"}
                size="sm"
                className="h-9 bg-sky-600 text-xs text-white hover:bg-sky-700"
              >
                {editingSchedule ? "Save Changes" : "Save Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================================================================= */}
      {/* Official Payslip Printable Viewer Modal                           */}
      {/* ================================================================= */}
      <Dialog
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold tracking-wide text-slate-900 uppercase dark:text-slate-100">
              Employee Payslip
            </DialogTitle>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-3 py-2 text-xs">
              {/* Header Box */}
              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">
                    {selectedPayslip.employeeName}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {selectedPayslip.employeeNumber}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {selectedPayslip.position} · {selectedPayslip.department}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Period</span>
                  <span className="font-mono">{selectedPayslip.periodStart} to {selectedPayslip.periodEnd}</span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="space-y-3">
                {/* Earnings */}
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/10">
                  <div className="border-b border-amber-200 pb-1.5 text-[11px] font-bold tracking-wide text-slate-800 uppercase dark:border-amber-900 dark:text-slate-100">
                    Earnings
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Regular ({selectedPayslip.regularHours}h)</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatPeso(selectedPayslip.basicPay)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Overtime ({selectedPayslip.overtimeHours}h)</span>
                    <span className="font-mono font-medium text-foreground">
                      {formatPeso(selectedPayslip.overtimePay)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-amber-200 pt-2 font-bold dark:border-amber-900">
                    <span>Gross Pay:</span>
                    <span className="font-mono text-emerald-600">
                      {formatPeso(selectedPayslip.grossPay)}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-950/10">
                  <div className="border-b border-amber-200 pb-1.5 text-[11px] font-bold tracking-wide text-slate-800 uppercase dark:border-amber-900 dark:text-slate-100">
                    Deductions
                  </div>
                  {[
                    ["SSS", selectedPayslip.deductions.sss],
                    ["PhilHealth", selectedPayslip.deductions.philHealth],
                    ["Pag-IBIG", selectedPayslip.deductions.pagIbig],
                  ].map(([label, amount]) => (
                    <div key={String(label)} className="flex justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-mono text-foreground">{formatPeso(Number(amount))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-amber-200 pt-2 font-bold dark:border-amber-900">
                    <span>Total Deductions:</span>
                    <span className="font-mono text-rose-600">
                      {formatPeso(selectedPayslip.deductions.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Take Home Pay */}
              <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-800 dark:bg-amber-950/20">
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-700 uppercase dark:text-slate-200">
                    Net Pay
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                    {formatPeso(selectedPayslip.netPay)}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => toast.success("Payslip PDF sent to printer")}
                  className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                >
                  <Printer className="size-3.5" />
                  <span>Print Slip</span>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPayslip(null)}
              className="h-8 w-full text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
