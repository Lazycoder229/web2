import { z } from "zod"
import { currencyAmountSchema, idSchema } from "./common"

export const employmentStatusEnum = z.enum(["active", "on_leave", "terminated"])
export const salaryTypeEnum = z.enum(["daily", "monthly"])
export const attendanceStatusEnum = z.enum(["on_time", "late", "overtime", "incomplete", "absent"])
export const attendanceMethodEnum = z.enum(["rfid", "manual", "pin"])
export const payrollPeriodStatusEnum = z.enum(["open", "processing", "closed"])

export const employeeSchema = z.object({
  id: idSchema,
  userId: idSchema,
  employeeNumber: z.string().min(1, "Employee number is required").max(20),
  position: z.string().min(1, "Position is required").max(100),
  department: z.string().max(100).nullable().optional(),
  rfidCardUid: z.string().max(50).nullable().optional(),
  dateHired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  dateTerminated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").nullable().optional(),
  employmentStatus: employmentStatusEnum.default("active"),
  basicSalary: currencyAmountSchema,
  salaryType: salaryTypeEnum,
})

export const createEmployeeSchema = z.object({
  userId: idSchema,
  employeeNumber: z.string().min(1, "Employee number is required").max(20),
  position: z.string().min(1, "Position is required").max(100),
  department: z.string().max(100).optional(),
  rfidCardUid: z.string().min(4, "RFID UID must be at least 4 chars").max(50).optional(),
  dateHired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  employmentStatus: employmentStatusEnum.default("active"),
  basicSalary: currencyAmountSchema,
  salaryType: salaryTypeEnum,
})

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  id: idSchema,
  dateTerminated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
})

// RFID Attendance Tap Schema
export const rfidTapSchema = z.object({
  rfidCardUid: z
    .string()
    .min(1, "RFID Card UID is required")
    .max(50)
    .regex(/^[A-Za-z0-9:-]+$/, "Invalid RFID format"),
  timestamp: z.coerce.date().optional(),
})

export const attendanceLogSchema = z.object({
  id: idSchema,
  employeeId: idSchema,
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  clockIn: z.coerce.date(),
  clockOut: z.coerce.date().nullable().optional(),
  totalHours: z.number().min(0).nullable().optional(),
  lateMinutes: z.number().int().min(0).default(0),
  overtimeHours: z.number().min(0).default(0),
  status: attendanceStatusEnum.default("on_time"),
  method: attendanceMethodEnum.default("rfid"),
  rfidCardUidUsed: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  createdAt: z.coerce.date().optional(),
})

export const manualAttendanceLogSchema = z.object({
  employeeId: idSchema,
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  clockInTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  clockOutTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM").optional(),
  status: attendanceStatusEnum.default("on_time"),
  notes: z.string().max(500).optional(),
})

export const employeeScheduleSchema = z.object({
  id: idSchema,
  userId: idSchema,
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Format must be HH:MM"),
  createdByStaffId: idSchema,
  createdAt: z.coerce.date().optional(),
})

export const createEmployeeScheduleSchema = z.object({
  userId: idSchema,
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM"),
  createdByStaffId: idSchema,
})

export const deductionTypeSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Name is required").max(100),
  isMandatory: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const createDeductionTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  isMandatory: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export const payrollPeriodSchema = z.object({
  id: idSchema,
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  status: payrollPeriodStatusEnum.default("open"),
  createdAt: z.coerce.date().optional(),
})

export const createPayrollPeriodSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
})

export const payrollRecordSchema = z.object({
  id: idSchema,
  employeeId: idSchema,
  payrollPeriodId: idSchema,
  grossPay: currencyAmountSchema,
  totalDeductions: currencyAmountSchema.default(0),
  netPay: currencyAmountSchema,
  processedByStaffId: idSchema,
  processedAt: z.coerce.date().optional(),
})

export const generatePayrollRecordSchema = z.object({
  employeeId: idSchema,
  payrollPeriodId: idSchema,
  grossPay: currencyAmountSchema,
  deductions: z.array(
    z.object({
      deductionTypeId: idSchema,
      amount: currencyAmountSchema,
      notes: z.string().max(255).optional(),
    })
  ).default([]),
  processedByStaffId: idSchema,
})

export const payrollDeductionSchema = z.object({
  id: idSchema,
  payrollRecordId: idSchema,
  deductionTypeId: idSchema,
  amount: currencyAmountSchema,
  notes: z.string().max(255).nullable().optional(),
})

export type Employee = z.infer<typeof employeeSchema>
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type RfidTapInput = z.infer<typeof rfidTapSchema>
export type AttendanceLog = z.infer<typeof attendanceLogSchema>
export type ManualAttendanceLogInput = z.infer<typeof manualAttendanceLogSchema>
export type EmployeeSchedule = z.infer<typeof employeeScheduleSchema>
export type CreateEmployeeScheduleInput = z.infer<typeof createEmployeeScheduleSchema>
export type DeductionType = z.infer<typeof deductionTypeSchema>
export type CreateDeductionTypeInput = z.infer<typeof createDeductionTypeSchema>
export type PayrollPeriod = z.infer<typeof payrollPeriodSchema>
export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>
export type PayrollRecord = z.infer<typeof payrollRecordSchema>
export type GeneratePayrollRecordInput = z.infer<typeof generatePayrollRecordSchema>
export type PayrollDeduction = z.infer<typeof payrollDeductionSchema>
