import { z } from "zod"
import { currencyAmountSchema, idSchema, phoneSchema } from "./common"

export const printerLocationEnum = z.enum(["kitchen", "counter"])
export const printerConnectionTypeEnum = z.enum(["network", "usb", "bluetooth"])

export const systemSettingSchema = z.object({
  id: idSchema,
  restaurantName: z.string().min(1, "Restaurant name is required").max(150),
  branchName: z.string().min(1, "Branch name is required").max(100),
  contactNumber: phoneSchema,
  email: z.string().email("Invalid email"),
  address: z.string().min(1, "Address is required"),
  tinNumber: z.string().max(50).nullable().optional(),
  birMin: z.string().max(50).nullable().optional(),
  currencySymbol: z.string().min(1).max(10).default("₱"),
  currencyCode: z.string().min(1).max(10).default("PHP"),
  timezone: z.string().min(1).max(50).default("Asia/Manila"),
  vatEnabled: z.boolean().default(true),
  vatRate: currencyAmountSchema.default(12),
  vatInclusive: z.boolean().default(true),
  serviceChargeEnabled: z.boolean().default(false),
  serviceChargeRate: currencyAmountSchema.default(5),
  seniorPwdDiscountEnabled: z.boolean().default(true),
  orderNumberPrefix: z.string().min(1).max(20).default("ORD-"),
  autoAcceptQrOrders: z.boolean().default(false),
  requireTableSelection: z.boolean().default(true),
  managerApprovalForVoids: z.boolean().default(true),
  lowStockThresholdAlert: z.number().int().min(0).default(10),
  receiptHeader: z.string().max(1000).nullable().optional(),
  receiptFooter: z.string().max(1000).nullable().optional(),
  printReceiptAuto: z.boolean().default(true),
  printKotAuto: z.boolean().default(true),
  showWifiOnReceipt: z.boolean().default(true),
  wifiSsid: z.string().max(100).nullable().optional(),
  wifiPassword: z.string().max(100).nullable().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM").default("08:00"),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:MM").default("22:00"),
  cashDrawerOpeningBalanceRequired: z.boolean().default(true),
  updatedAt: z.coerce.date().optional(),
})

export const updateSystemSettingSchema = systemSettingSchema.partial().omit({ id: true })

export const printerSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Printer name is required").max(100),
  location: printerLocationEnum,
  connectionType: printerConnectionTypeEnum,
  ipAddress: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/, "Invalid IP address format")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
})

export const createPrinterSchema = z.object({
  name: z.string().min(1, "Printer name is required").max(100),
  location: printerLocationEnum,
  connectionType: printerConnectionTypeEnum,
  ipAddress: z.string().optional(),
  isActive: z.boolean().default(true),
})

export const updatePrinterSchema = createPrinterSchema.partial().extend({
  id: idSchema,
})

export const auditLogSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable().optional(),
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId: z.string().min(1).max(36),
  details: z.record(z.string(), z.any()).nullable().optional(),
  ipAddress: z.string().max(45).nullable().optional(),
  createdAt: z.coerce.date().optional(),
})

export const createAuditLogSchema = z.object({
  userId: idSchema.optional(),
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(50),
  entityId: z.string().min(1).max(36),
  details: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().max(45).optional(),
})

export type SystemSetting = z.infer<typeof systemSettingSchema>
export type UpdateSystemSettingInput = z.infer<typeof updateSystemSettingSchema>
export type Printer = z.infer<typeof printerSchema>
export type CreatePrinterInput = z.infer<typeof createPrinterSchema>
export type UpdatePrinterInput = z.infer<typeof updatePrinterSchema>
export type AuditLog = z.infer<typeof auditLogSchema>
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>
