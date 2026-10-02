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
  CheckCircle2,
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
  Utensils,
  Wifi,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

import {
  createEmployeeAction,
  createEmployeeWithAccountAction,
  fetchEmployeesData,
  rfidTapAttendanceAction,
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
import { Toaster } from "@/components/ui/sonner"
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

export interface ShiftSchedule {
  id: string
  userId: string
  employeeName: string
  position: string
  department: string
  shiftDate: string
  startTime: string
  endTime: string
  station: string
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
  netPay: number
  status: "paid" | "pending"
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
  const [simulatedCardUid, setSimulatedCardUid] = useState("")
  const [selectedTapEmployeeId, setSelectedTapEmployeeId] = useState<string>("")
  const [lastTapResult, setLastTapResult] = useState<{
    employeeName: string
    type: "in" | "out"
    time: string
    status: string
    cardUid: string
  } | null>(null)

  // Schedules state
  const [schedules, setSchedules] = useState<ShiftSchedule[]>([])
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false)
  const [newShift, setNewShift] = useState({
    employeeId: "",
    shiftDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "17:00",
    station: "Counter POS Station 1",
  })

  // Payroll state
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(
    null
  )
  const [payrollPeriod, setPayrollPeriod] = useState("Sep 1–15, 2026")

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
      const employeeMap = new Map(
        formattedEmployees.map((employee) => [employee.id, employee])
      )
      setEmployees(formattedEmployees)
      if (formattedEmployees.length > 0) {
        setSelectedTapEmployeeId(formattedEmployees[0].id)
      }
      setAttendanceLogs(
        (result.data.attendance ?? []).map((log) => ({
          id: log.id,
          employeeId: log.employeeId,
          employeeName: log.employeeName,
          employeeNumber: employeeMap.get(log.employeeId)?.employeeNumber || "",
          department: employeeMap.get(log.employeeId)?.department || "",
          logDate: log.clockIn
            ? new Date(log.clockIn).toISOString().split("T")[0]
            : "",
          clockIn: log.clockIn,
          clockOut: log.clockOut,
          totalHours: log.totalHours,
          lateMinutes: log.lateMinutes,
          overtimeHours: log.overtimeHours,
          status: log.status,
          method: log.method,
          rfidCardUidUsed: log.rfidCardUid,
          notes: null,
        }))
      )
      setIsLoading(false)
    }

    void loadEmployees()
  }, [])

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
    if (!empForm.name.trim()) {
      toast.error("Employee full name is required")
      return
    }

    const dailyRate =
      empForm.salaryType === "daily"
        ? empForm.basicSalary
        : empForm.basicSalary / 26
    const hourlyRate = dailyRate / 8

    if (editingEmployee) {
      toast.info(
        "Employee changes are local only; employee updates are not supported by the current backend contract."
      )
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
        rfidCardUid: empForm.rfidCardUid || undefined,
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

  const handleSimulateRfidTap = async (empIdToTap?: string) => {
    const empId = empIdToTap || selectedTapEmployeeId
    const targetEmp = employees.find((e) => e.id === empId)
    if (!targetEmp) {
      toast.error("Employee not found")
      return
    }

    if (!targetEmp.rfidCardUid) {
      toast.error(`${targetEmp.name} does not have an assigned RFID card badge`)
      return
    }

    const result = await rfidTapAttendanceAction({
      rfidCardUid: targetEmp.rfidCardUid,
    })
    if (!result.success) {
      toast.error(result.error)
      return
    }

    const refreshed = await fetchEmployeesData()
    if (!refreshed.success) {
      toast.error(refreshed.error)
      return
    }
    setAttendanceLogs(
      (refreshed.data.attendance ?? []).map((log: any) => ({
        ...log,
        employeeName: log.employeeName,
        employeeNumber: targetEmp.employeeNumber,
        department: targetEmp.department,
        logDate: new Date(log.clockIn).toISOString().split("T")[0],
        rfidCardUidUsed: log.rfidCardUid,
        notes: null,
      }))
    )
    const tapTime = new Date(result.data.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    setLastTapResult({
      employeeName: targetEmp.name,
      type: result.data.action === "clock_in" ? "in" : "out",
      time: tapTime,
      status:
        result.data.action === "clock_in"
          ? result.data.lateMinutes
            ? `Late (${result.data.lateMinutes} mins)`
            : "On Time"
          : "Shift Completed",
      cardUid: targetEmp.rfidCardUid,
    })
    toast.success(
      `RFID Tap: ${targetEmp.name} Clocked ${result.data.action === "clock_in" ? "IN" : "OUT"}`
    )
  }

  // ---------------------------------------------------------------------------
  // Handlers — Shift Scheduling
  // ---------------------------------------------------------------------------

  const handleAddShift = (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmp = employees.find((emp) => emp.id === newShift.employeeId)
    if (!targetEmp) return

    const shiftItem: ShiftSchedule = {
      id: `sch-${Date.now()}`,
      userId: targetEmp.userId,
      employeeName: targetEmp.name,
      position: targetEmp.position,
      department: targetEmp.department,
      shiftDate: newShift.shiftDate,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      station: newShift.station,
    }

    void shiftItem
    toast.info(
      "Shift scheduling is unavailable because no schedule persistence action exists."
    )
  }

  // ---------------------------------------------------------------------------
  // Handlers — Payroll
  // ---------------------------------------------------------------------------

  const handleComputePayroll = () => {
    toast.info(
      "Payroll calculation is local-only; payroll persistence is not supported by the current backend contract."
    )
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

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-right" />
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
                <span>Compute Period Payroll</span>
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
                  `${
                    attendanceLogs.filter((a) => a.logDate === "2026-09-17")
                      .length
                  } Checked In`
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {isLoading ? (
                  <Skeleton className="mt-1 h-3 w-20" />
                ) : (
                  `${
                    attendanceLogs.filter(
                      (a) => a.status === "late" && a.logDate === "2026-09-17"
                    ).length
                  } Tardy Taps`
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
                {payrollPeriod}
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
              <div className="space-y-4 lg:col-span-5">
                <Card className="border border-emerald-500/40 bg-gradient-to-b from-card to-emerald-500/5 shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-700 dark:text-emerald-300">
                        <Radio className="size-4 animate-pulse text-emerald-500" />
                        RFID Tap Simulator Station
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-300"
                      >
                        Reader #1 (Active)
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Simulates staff tapping their physical RFID smart card
                      onto the restaurant entrance terminal.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Select Staff Card to Tap
                      </Label>
                      {isLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select
                          value={selectedTapEmployeeId}
                          onValueChange={(value) =>
                            setSelectedTapEmployeeId(value ?? "")
                          }
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select staff card" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">
                                    {emp.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    ({emp.rfidCardUid || "No UID"})
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-3 rounded-xl border border-dashed border-emerald-500/40 bg-muted/40 p-4 text-center">
                      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <Radio className="size-8 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">
                          Ready for Card Contact
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Hold RFID card within 5cm of terminal surface to clock
                          in / out.
                        </p>
                      </div>

                      <Button
                        onClick={() => handleSimulateRfidTap()}
                        className="h-10 w-full gap-2 bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                      >
                        <Zap className="size-4" />
                        <span>Tap RFID Card Now</span>
                      </Button>
                    </div>

                    {/* Last Tap Confirmation Card */}
                    {lastTapResult && (
                      <div className="space-y-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                        <div className="flex items-center justify-between font-semibold text-emerald-800 dark:text-emerald-200">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            {lastTapResult.employeeName}
                          </span>
                          <Badge className="bg-emerald-600 text-[9px] text-white">
                            {lastTapResult.type === "in"
                              ? "CLOCKED IN"
                              : "CLOCKED OUT"}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-[11px] text-emerald-700 dark:text-emerald-300">
                          <span>Timestamp: {lastTapResult.time}</span>
                          <span>{lastTapResult.status}</span>
                        </div>
                        <div className="font-mono text-[9px] text-emerald-600/80">
                          UID: {lastTapResult.cardUid}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Records Table (Right Column) */}
              <div className="space-y-4 lg:col-span-7">
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
                          `${attendanceLogs.length} Records`
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Time tracking records captured through RFID scans and
                      authorized manual overrides.
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
                                </tr>
                              ))
                            ) : attendanceLogs.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-8 text-center text-muted-foreground"
                                >
                                  No attendance records found.
                                </td>
                              </tr>
                            ) : (
                              attendanceLogs.map((log) => (
                                <tr
                                  key={log.id}
                                  className="transition-colors hover:bg-muted/30"
                                >
                                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                                    {log.logDate}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="font-semibold text-foreground">
                                      {log.employeeName}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {log.department}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                                    <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                      IN: {log.clockIn}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      OUT: {log.clockOut || "— Active —"}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 font-semibold tabular-nums">
                                    {log.totalHours
                                      ? `${log.totalHours} hrs`
                                      : "In Progress"}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] ${
                                        log.status === "on_time"
                                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                          : log.status === "late"
                                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                            : "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                      }`}
                                    >
                                      {log.status === "late"
                                        ? `Late (${log.lateMinutes}m)`
                                        : log.status.toUpperCase()}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                                      <Radio className="size-2.5 text-emerald-500" />
                                      RFID
                                    </span>
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
              </div>
            </div>
          </TabsContent>

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
                      Weekly Shift Schedule & Station Roster
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Manages daily shifts, station assignments (Counter,
                      Kitchen, Dining Floor), and trading hours coverage.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsAddShiftOpen(true)}
                    size="sm"
                    className="h-8 gap-1.5 bg-sky-600 text-xs text-white hover:bg-sky-700"
                  >
                    <Plus className="size-3.5" />
                    <span>Assign New Shift</span>
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
                  ) : schedules.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-muted-foreground">
                      No shifts scheduled.
                    </div>
                  ) : (
                    schedules.map((sch) => (
                      <div
                        key={sch.id}
                        className="space-y-2.5 rounded-lg border border-border bg-background p-3.5 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-semibold text-foreground">
                            {sch.employeeName}
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {sch.department}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="size-3 text-sky-500" />
                            <span className="font-mono font-medium text-foreground">
                              {sch.startTime} – {sch.endTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Utensils className="size-3 text-amber-500" />
                            <span className="truncate">{sch.station}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="size-3 text-purple-500" />
                            <span>{sch.shiftDate}</span>
                          </div>
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
                      Official bi-monthly salary calculations, overtime pay, and
                      statutory deductions (SSS, PhilHealth, Pag-IBIG).
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
                        <SelectItem value="Sep 1–15, 2026">
                          Sep 1–15, 2026
                        </SelectItem>
                        <SelectItem value="Sep 16–30, 2026">
                          Sep 16–30, 2026
                        </SelectItem>
                        <SelectItem value="Aug 16–31, 2026">
                          Aug 16–31, 2026
                        </SelectItem>
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
                          <th className="px-3 py-2.5">Days Worked</th>
                          <th className="px-3 py-2.5">Basic Pay</th>
                          <th className="px-3 py-2.5">Overtime</th>
                          <th className="px-3 py-2.5">Gross Salary</th>
                          <th className="px-3 py-2.5">Total Deductions</th>
                          <th className="px-3 py-2.5">Net Take-Home</th>
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
                              No payroll records found.
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
                                -₱{rec.deductions.total.toLocaleString()}
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
                onChange={(e) =>
                  setEmpForm((prev) => ({
                    ...prev,
                    rfidCardUid: e.target.value,
                  }))
                }
                placeholder="Scan or input RFID UID (e.g. E2000019060B0102)"
                className="h-9 font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                This UID is used by the entrance terminal scanner to
                authenticate clock-ins.
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
                onClick={() => setIsEmployeeSheetOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
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
      <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddShift}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">
                Assign Work Shift
              </DialogTitle>
              <DialogDescription className="text-xs">
                Schedule a staff member to a shift slot and store work station.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Employee</Label>
                <Select
                  value={newShift.employeeId}
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
                <Label className="text-xs font-medium">Shift Date</Label>
                <Input
                  type="date"
                  value={newShift.shiftDate}
                  onChange={(e) =>
                    setNewShift((prev) => ({
                      ...prev,
                      shiftDate: e.target.value,
                    }))
                  }
                  className="h-9 text-xs"
                />
              </div>

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

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Assigned Station</Label>
                <Select
                  value={newShift.station}
                  onValueChange={(val) =>
                    setNewShift((prev) => ({ ...prev, station: val ?? "" }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Counter POS Station 1">
                      Counter POS Station 1
                    </SelectItem>
                    <SelectItem value="Counter POS Station 2 (Closing)">
                      Counter POS Station 2 (Closing)
                    </SelectItem>
                    <SelectItem value="Charcoal Roaster Station">
                      Charcoal Roaster Station
                    </SelectItem>
                    <SelectItem value="BBQ & Sisig Grill Line">
                      BBQ & Sisig Grill Line
                    </SelectItem>
                    <SelectItem value="Main Dining & Patio">
                      Main Dining & Patio
                    </SelectItem>
                    <SelectItem value="Manager Office & Floor">
                      Manager Office & Floor
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddShiftOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-sky-600 text-xs text-white hover:bg-sky-700"
              >
                Confirm Shift
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
            <DialogTitle className="flex items-center justify-between text-base font-semibold">
              <span>Employee Payslip</span>
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedPayslip?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              PRIME: Point-of-sale Restaurant Integrated Management Ecosystem
            </DialogDescription>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-4 py-2 text-xs">
              {/* Header Box */}
              <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
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
                  <span>
                    Period: {selectedPayslip.periodStart} to{" "}
                    {selectedPayslip.periodEnd}
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                {/* Earnings */}
                <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                  <div className="text-[11px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    Earnings
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Basic Pay ({selectedPayslip.daysWorked}d):</span>
                    <span className="font-mono font-medium text-foreground">
                      ₱{selectedPayslip.basicPay.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Overtime Pay:</span>
                    <span className="font-mono font-medium text-foreground">
                      ₱{selectedPayslip.overtimePay.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span>Gross Pay:</span>
                    <span className="font-mono text-emerald-600">
                      ₱{selectedPayslip.grossPay.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2 rounded-lg border border-border bg-background p-3">
                  <div className="text-[11px] font-semibold tracking-wider text-rose-700 uppercase dark:text-rose-300">
                    Deductions
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>SSS Contribution:</span>
                    <span className="font-mono">
                      ₱{selectedPayslip.deductions.sss}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>PhilHealth:</span>
                    <span className="font-mono">
                      ₱{selectedPayslip.deductions.philHealth}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Pag-IBIG Fund:</span>
                    <span className="font-mono">
                      ₱{selectedPayslip.deductions.pagIbig}
                    </span>
                  </div>
                  {selectedPayslip.deductions.tardiness > 0 && (
                    <div className="flex justify-between text-[11px] text-rose-600">
                      <span>Tardiness:</span>
                      <span className="font-mono">
                        ₱{selectedPayslip.deductions.tardiness}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-bold">
                    <span>Total Deductions:</span>
                    <span className="font-mono text-rose-600">
                      ₱{selectedPayslip.deductions.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Net Take Home Pay */}
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                <div>
                  <div className="text-[10px] font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-300">
                    Net Take-Home Pay
                  </div>
                  <div className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₱{selectedPayslip.netPay.toLocaleString()}
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
