"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileText,
  Globe,
  Hash,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Utensils,
  Wifi,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import {
  createLoyaltyRewardAction,
  fetchLoyaltyProgramSettingsAction,
  fetchLoyaltyRewardsAction,
  fetchSystemSettings,
  updateLoyaltyProgramSettingsAction,
  updateLoyaltyRewardAction,
  updateSystemSettingsAction,
  type LoyaltyRewardRecord,
} from "@/lib/api/settings"

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
// Types (Matching Module 17: system_settings schema)
// ---------------------------------------------------------------------------

export interface SystemSettingsValues {
  // Store Profile & Legal
  restaurantName: string
  branchName: string
  contactNumber: string
  email: string
  address: string
  tinNumber: string
  birMin: string
  currencySymbol: string
  currencyCode: string
  timezone: string

  // Tax & Financial Charges
  vatEnabled: boolean
  vatRate: number
  vatInclusive: boolean
  serviceChargeEnabled: boolean
  serviceChargeRate: number
  seniorPwdDiscountEnabled: boolean

  // POS & Order Workflow
  orderNumberPrefix: string
  defaultOrderType: "dine_in" | "take_out"
  autoAcceptQrOrders: boolean
  requireTableSelection: boolean
  managerApprovalForVoids: boolean
  lowStockThresholdAlert: number

  // Receipt & Printing
  receiptHeader: string
  receiptFooter: string
  printReceiptAuto: boolean
  printKotAuto: boolean
  showWifiOnReceipt: boolean
  wifiSsid: string
  wifiPassword: string
  gcashQrImage: string
  mayaQrImage: string

  // Operations & Loyalty
  openingTime: string
  closingTime: string
  cashDrawerOpeningBalanceRequired: boolean
  loyaltyPointsPerPeso: number
  loyaltyPesoValuePerPoint: number
  autoArchiveSettledOrdersHours: number
}

const EMPTY_SETTINGS: SystemSettingsValues = {
  restaurantName: "",
  branchName: "",
  contactNumber: "",
  email: "",
  address: "",
  tinNumber: "",
  birMin: "",
  currencySymbol: "",
  currencyCode: "",
  timezone: "",
  vatEnabled: false,
  vatRate: 0,
  vatInclusive: false,
  serviceChargeEnabled: false,
  serviceChargeRate: 0,
  seniorPwdDiscountEnabled: false,
  orderNumberPrefix: "ORD-",
  defaultOrderType: "dine_in",
  autoAcceptQrOrders: false,
  requireTableSelection: false,
  managerApprovalForVoids: false,
  lowStockThresholdAlert: 0,
  receiptHeader: "",
  receiptFooter: "",
  printReceiptAuto: false,
  printKotAuto: false,
  showWifiOnReceipt: false,
  wifiSsid: "",
  wifiPassword: "",
  gcashQrImage: "",
  mayaQrImage: "",
  openingTime: "08:00",
  closingTime: "22:00",
  cashDrawerOpeningBalanceRequired: false,
  loyaltyPointsPerPeso: 1,
  loyaltyPesoValuePerPoint: 0.5,
  autoArchiveSettledOrdersHours: 0,
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettingsValues>(EMPTY_SETTINGS)
  const [initialSettings, setInitialSettings] =
    useState<SystemSettingsValues>(EMPTY_SETTINGS)
  const [activeTab, setActiveTab] = useState("store")
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loyaltyRewards, setLoyaltyRewards] = useState<LoyaltyRewardRecord[]>(
    []
  )
  const [rewardName, setRewardName] = useState("")
  const [rewardDescription, setRewardDescription] = useState("")
  const [rewardPointsCost, setRewardPointsCost] = useState(100)
  const [isSavingReward, setIsSavingReward] = useState(false)
  const [updatingRewardId, setUpdatingRewardId] = useState("")

  // Interactive Live Calculator state
  const [sampleBillAmount, setSampleBillAmount] = useState<number>(1000)
  const [applySampleSenior, setApplySampleSenior] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const [result, loyaltyResult, rewardsResult] = await Promise.all([
        fetchSystemSettings(),
        fetchLoyaltyProgramSettingsAction(),
        fetchLoyaltyRewardsAction(),
      ])
      if (!result.success) {
        toast.error(result.error)
        return
      }
      if (!loyaltyResult.success) toast.error(loyaltyResult.error)
      if (!rewardsResult.success) toast.error(rewardsResult.error)
      if (rewardsResult.success) setLoyaltyRewards(rewardsResult.data)

      const loadedSettings: SystemSettingsValues = {
        ...EMPTY_SETTINGS,
        ...(result.data ?? {}),
        loyaltyPointsPerPeso: loyaltyResult.success
          ? loyaltyResult.data.pointsPerPeso
          : EMPTY_SETTINGS.loyaltyPointsPerPeso,
        loyaltyPesoValuePerPoint: loyaltyResult.success
          ? loyaltyResult.data.pesoValuePerPoint
          : EMPTY_SETTINGS.loyaltyPesoValuePerPoint,
        orderNumberPrefix:
          result.data?.orderNumberPrefix?.trim() ||
          EMPTY_SETTINGS.orderNumberPrefix,
        openingTime: /^\d{2}:\d{2}$/.test(result.data?.openingTime || "")
          ? result.data?.openingTime
          : EMPTY_SETTINGS.openingTime,
        closingTime: /^\d{2}:\d{2}$/.test(result.data?.closingTime || "")
          ? result.data?.closingTime
          : EMPTY_SETTINGS.closingTime,
        tinNumber: result.data?.tinNumber ?? "",
        birMin: result.data?.birMin ?? "",
        receiptHeader: result.data?.receiptHeader ?? "",
        receiptFooter: result.data?.receiptFooter ?? "",
        wifiSsid: result.data?.wifiSsid ?? "",
        wifiPassword: result.data?.wifiPassword ?? "",
        gcashQrImage: result.data?.gcashQrImage ?? "",
        mayaQrImage: result.data?.mayaQrImage ?? "",
      }
      setSettings(loadedSettings)
      setInitialSettings(loadedSettings)
    }

    void loadSettings()
  }, [])

  // Track unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings)
  }, [settings, initialSettings])

  // Field updater
  const updateField = <K extends keyof SystemSettingsValues>(
    key: K,
    value: SystemSettingsValues[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const uploadPaymentQr = (
    key: "gcashQrImage" | "mayaQrImage",
    file?: File
  ) => {
    if (!file) return
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      toast.error("Choose an image smaller than 2 MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") updateField(key, reader.result)
      else toast.error("Could not read that QR image.")
    }
    reader.onerror = () => toast.error("Could not read that QR image.")
    reader.readAsDataURL(file)
  }

  const createReward = async () => {
    const name = rewardName.trim()
    if (!name || rewardPointsCost < 1) {
      toast.error("Enter a reward name and a points cost of at least 1.")
      return
    }
    setIsSavingReward(true)
    const result = await createLoyaltyRewardAction({
      name,
      description: rewardDescription.trim() || undefined,
      pointsCost: rewardPointsCost,
    })
    setIsSavingReward(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setLoyaltyRewards((current) => [result.data, ...current])
    setRewardName("")
    setRewardDescription("")
    setRewardPointsCost(100)
    toast.success("Reward added", {
      description: "It is now available in the customer Rewards page.",
    })
  }

  const toggleReward = async (
    reward: LoyaltyRewardRecord,
    isActive: boolean
  ) => {
    setUpdatingRewardId(reward.id)
    const result = await updateLoyaltyRewardAction(reward.id, { isActive })
    setUpdatingRewardId("")
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setLoyaltyRewards((current) =>
      current.map((item) => (item.id === reward.id ? result.data : item))
    )
  }

  // Save handler
  const handleSave = async () => {
    setIsSaving(true)
    const [result, loyaltyResult] = await Promise.all([
      updateSystemSettingsAction({
        restaurantName: settings.restaurantName,
        branchName: settings.branchName,
        contactNumber: settings.contactNumber,
        email: settings.email,
        address: settings.address,
        tinNumber: settings.tinNumber || undefined,
        birMin: settings.birMin || undefined,
        currencySymbol: settings.currencySymbol,
        currencyCode: settings.currencyCode,
        timezone: settings.timezone,
        vatEnabled: settings.vatEnabled,
        vatRate: settings.vatRate,
        vatInclusive: settings.vatInclusive,
        serviceChargeEnabled: settings.serviceChargeEnabled,
        serviceChargeRate: settings.serviceChargeRate,
        seniorPwdDiscountEnabled: settings.seniorPwdDiscountEnabled,
        orderNumberPrefix:
          settings.orderNumberPrefix.trim() || EMPTY_SETTINGS.orderNumberPrefix,
        autoAcceptQrOrders: settings.autoAcceptQrOrders,
        requireTableSelection: settings.requireTableSelection,
        managerApprovalForVoids: settings.managerApprovalForVoids,
        lowStockThresholdAlert: settings.lowStockThresholdAlert,
        receiptHeader: settings.receiptHeader || undefined,
        receiptFooter: settings.receiptFooter || undefined,
        printReceiptAuto: settings.printReceiptAuto,
        printKotAuto: settings.printKotAuto,
        showWifiOnReceipt: settings.showWifiOnReceipt,
        wifiSsid: settings.wifiSsid || undefined,
        wifiPassword: settings.wifiPassword || undefined,
        gcashQrImage: settings.gcashQrImage,
        mayaQrImage: settings.mayaQrImage,
        openingTime: /^\d{2}:\d{2}$/.test(settings.openingTime)
          ? settings.openingTime
          : EMPTY_SETTINGS.openingTime,
        closingTime: /^\d{2}:\d{2}$/.test(settings.closingTime)
          ? settings.closingTime
          : EMPTY_SETTINGS.closingTime,
        cashDrawerOpeningBalanceRequired:
          settings.cashDrawerOpeningBalanceRequired,
      }),
      updateLoyaltyProgramSettingsAction({
        pointsPerPeso: settings.loyaltyPointsPerPeso,
        pesoValuePerPoint: settings.loyaltyPesoValuePerPoint,
      }),
    ])
    setIsSaving(false)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    if (!loyaltyResult.success) {
      toast.error(
        "System settings saved, but loyalty settings could not be saved.",
        { description: loyaltyResult.error }
      )
      return
    }
    setInitialSettings(settings)
    toast.success(result.data.message, {
      description:
        "Your POS configuration changes have been applied across all terminals.",
    })
  }

  // Reset handler
  const handleConfirmReset = () => {
    setSettings(EMPTY_SETTINGS)
    setInitialSettings(EMPTY_SETTINGS)
    setIsResetDialogOpen(false)
    toast.info("Settings cleared. Save to persist the empty configuration.")
  }

  // ---------------------------------------------------------------------------
  // Calculations for live Tax/Charge simulation
  // ---------------------------------------------------------------------------
  const taxSimulation = useMemo(() => {
    const raw = Math.max(0, sampleBillAmount || 0)
    let netSales = raw
    let vatAmount = 0
    let serviceChargeAmount = 0

    const vatRateDec = settings.vatEnabled ? settings.vatRate / 100 : 0
    const scRateDec = settings.serviceChargeEnabled
      ? settings.serviceChargeRate / 100
      : 0

    if (settings.vatEnabled) {
      if (settings.vatInclusive) {
        netSales = raw / (1 + vatRateDec)
        vatAmount = raw - netSales
      } else {
        netSales = raw
        vatAmount = raw * vatRateDec
      }
    }

    // Senior / PWD 20% discount (statutory exemption from 12% VAT + 20% off net sales)
    let seniorDiscount = 0
    if (applySampleSenior && settings.seniorPwdDiscountEnabled) {
      // VAT is waived on the senior's portion
      vatAmount = 0
      seniorDiscount = netSales * 0.2
      netSales = netSales - seniorDiscount
    }

    if (settings.serviceChargeEnabled) {
      serviceChargeAmount = netSales * scRateDec
    }

    const grandTotal = netSales + vatAmount + serviceChargeAmount

    return {
      grossAmount: raw,
      netSales,
      vatAmount,
      serviceChargeAmount,
      seniorDiscount,
      grandTotal,
    }
  }, [sampleBillAmount, applySampleSenior, settings])

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
        {/* Header & Persistent Action Bar */}
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                System & POS Settings
              </h1>
              {isDirty ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                >
                  Unsaved Changes
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                >
                  Saved
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Manage store identification, Philippine tax rules, order
              workflows, and printing preferences.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
              className="h-9 gap-1.5 text-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Reset Defaults</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              size="sm"
              className="h-9 gap-1.5 bg-amber-600 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Save className="size-3.5" />
              <span>{isSaving ? "Saving..." : "Save Settings"}</span>
            </Button>
          </div>
        </div>

        {/* Quick Highlights Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Active Store
                </span>
                <Store className="size-3.5 text-amber-500" />
              </div>
              <div className="truncate text-sm font-bold sm:text-base">
                {settings.restaurantName}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {settings.branchName}
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Tax & VAT
                </span>
                <Percent className="size-3.5 text-emerald-500" />
              </div>
              <div className="text-sm font-bold text-emerald-600 sm:text-base dark:text-emerald-400">
                {settings.vatEnabled
                  ? `${settings.vatRate}% VAT (${settings.vatInclusive ? "Inclusive" : "Add-on"})`
                  : "Exempt"}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {settings.serviceChargeEnabled
                  ? `+${settings.serviceChargeRate}% Service Charge`
                  : "No service charge"}
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  Operating Hours
                </span>
                <Clock className="size-3.5 text-sky-500" />
              </div>
              <div className="text-sm font-bold sm:text-base">
                {settings.openingTime} – {settings.closingTime}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {settings.timezone}
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-xs">
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase sm:text-xs">
                  POS Printing
                </span>
                <Printer className="size-3.5 text-purple-500" />
              </div>
              <div className="text-sm font-bold sm:text-base">
                {settings.printReceiptAuto ? "Receipt Auto" : "Manual"} ·{" "}
                {settings.printKotAuto ? "KOT Auto" : "KOT Off"}
              </div>
              <div className="truncate text-[10px] text-muted-foreground">
                {settings.showWifiOnReceipt && settings.wifiSsid
                  ? `Wi-Fi: ${settings.wifiSsid}`
                  : "No Wi-Fi on slip"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Configuration Interface */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid h-auto grid-cols-2 border border-border bg-muted/60 p-1 sm:grid-cols-5">
            <TabsTrigger value="store" className="gap-1.5 py-2 text-xs">
              <Building2 className="size-3.5" />
              <span>Store Profile</span>
            </TabsTrigger>
            <TabsTrigger value="taxes" className="gap-1.5 py-2 text-xs">
              <Percent className="size-3.5" />
              <span>Taxes & Charges</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 py-2 text-xs">
              <Sliders className="size-3.5" />
              <span>POS & Orders</span>
            </TabsTrigger>
            <TabsTrigger value="receipt" className="gap-1.5 py-2 text-xs">
              <Receipt className="size-3.5" />
              <span>Receipt & Print</span>
            </TabsTrigger>
            <TabsTrigger value="operations" className="gap-1.5 py-2 text-xs">
              <Clock className="size-3.5" />
              <span>Operations & Loyalty</span>
            </TabsTrigger>
          </TabsList>

          {/* =============================================================== */}
          {/* TAB 1: STORE PROFILE & LEGAL                                    */}
          {/* =============================================================== */}
          <TabsContent value="store" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Building2 className="size-4 text-amber-500" />
                      Restaurant Identification & Contact
                    </CardTitle>
                    <CardDescription className="text-xs">
                      These details appear on customer receipts, invoices, and
                      the customer QR menu header.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Restaurant / Brand Name{" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={settings.restaurantName}
                          onChange={(e) =>
                            updateField("restaurantName", e.target.value)
                          }
                          placeholder="e.g. PRIME Roast & Grill"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Branch Name / Store Code{" "}
                          <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={settings.branchName}
                          onChange={(e) =>
                            updateField("branchName", e.target.value)
                          }
                          placeholder="e.g. Main Branch - Manila"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Phone className="size-3 text-muted-foreground" />
                          Telephone / Contact Number
                        </Label>
                        <Input
                          value={settings.contactNumber}
                          onChange={(e) =>
                            updateField("contactNumber", e.target.value)
                          }
                          placeholder="+63 917 123 4567"
                          className="h-9 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Mail className="size-3 text-muted-foreground" />
                          Official Email Address
                        </Label>
                        <Input
                          type="email"
                          value={settings.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="contact@primerestaurant.ph"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-xs font-medium">
                        <MapPin className="size-3 text-muted-foreground" />
                        Complete Physical Address
                      </Label>
                      <Textarea
                        value={settings.address}
                        onChange={(e) => updateField("address", e.target.value)}
                        placeholder="Street, Barangay, City, Postal Code"
                        className="min-h-[70px] resize-none text-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      BIR Tax Compliance & Machine ID
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Official registration credentials printed on
                      BIR-accredited sales invoices and official receipts.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          Taxpayer Identification No. (TIN)
                        </Label>
                        <Input
                          value={settings.tinNumber}
                          onChange={(e) =>
                            updateField("tinNumber", e.target.value)
                          }
                          placeholder="000-000-000-000"
                          className="h-9 font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          e.g. 009-876-543-000 (VAT Registered)
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">
                          BIR Machine Identification No. (MIN)
                        </Label>
                        <Input
                          value={settings.birMin}
                          onChange={(e) =>
                            updateField("birMin", e.target.value)
                          }
                          placeholder="MIN-2026-XXXXX"
                          className="h-9 font-mono text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Issued during POS permit to use (PTU)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Store Localization & Currency Sidebar Card */}
              <div className="space-y-4">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Globe className="size-4 text-sky-500" />
                      Localization
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Currency and system timezone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Currency Symbol
                      </Label>
                      <Input
                        value={settings.currencySymbol}
                        onChange={(e) =>
                          updateField("currencySymbol", e.target.value)
                        }
                        className="h-9 text-xs font-bold"
                        maxLength={5}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Currency ISO Code
                      </Label>
                      <Input
                        value={settings.currencyCode}
                        onChange={(e) =>
                          updateField("currencyCode", e.target.value)
                        }
                        className="h-9 text-xs uppercase"
                        maxLength={4}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Timezone</Label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(val) => {
                          if (val) updateField("timezone", val)
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Manila">
                            Asia/Manila (GMT+8:00)
                          </SelectItem>
                          <SelectItem value="Asia/Singapore">
                            Asia/Singapore (GMT+8:00)
                          </SelectItem>
                          <SelectItem value="Asia/Tokyo">
                            Asia/Tokyo (GMT+9:00)
                          </SelectItem>
                          <SelectItem value="UTC">UTC (GMT+0:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Info className="size-3.5 text-sky-500" />
                        System Time Note
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        All transaction timestamps, shift Z-readings, and daily
                        sales cutoff utilize the selected timezone.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 2: TAXES & FINANCIAL CHARGES                                */}
          {/* =============================================================== */}
          <TabsContent value="taxes" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Percent className="size-4 text-emerald-500" />
                      Value-Added Tax (VAT) Configuration
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Philippine tax reform (TRAIN Law) 12% standard VAT
                      compliance settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    {/* VAT Enable Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold">
                          Enable Value-Added Tax (VAT)
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Toggle on if the establishment is registered as a VAT
                          entity with the BIR.
                        </div>
                      </div>
                      <Switch
                        checked={settings.vatEnabled}
                        onCheckedChange={(val) =>
                          updateField("vatEnabled", val)
                        }
                      />
                    </div>

                    {settings.vatEnabled && (
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            VAT Rate (%)
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={settings.vatRate}
                              onChange={(e) =>
                                updateField(
                                  "vatRate",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="h-9 pr-8 text-xs font-semibold"
                            />
                            <span className="absolute top-2.5 right-3 text-xs font-semibold text-muted-foreground">
                              %
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Standard in the Philippines: 12.0%
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">
                            Menu Pricing Model
                          </Label>
                          <div className="flex h-9 items-center justify-between rounded-md border border-border p-2">
                            <span className="text-xs">
                              {settings.vatInclusive
                                ? "VAT-Inclusive"
                                : "VAT Added at Checkout"}
                            </span>
                            <Switch
                              checked={settings.vatInclusive}
                              onCheckedChange={(val) =>
                                updateField("vatInclusive", val)
                              }
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {settings.vatInclusive
                              ? "Menu prices already include the 12% tax"
                              : "12% is computed and added on top"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Coins className="size-4 text-amber-500" />
                      Service Charge & Statutory Discounts
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Restaurant service charges and Republic Act (RA 9994 / RA
                      10754) compliance.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    {/* Service Charge Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold">
                          Enable Service Charge
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Distributable service fee (RA 11360: 100% distributed
                          to rank-and-file employees).
                        </div>
                      </div>
                      <Switch
                        checked={settings.serviceChargeEnabled}
                        onCheckedChange={(val) =>
                          updateField("serviceChargeEnabled", val)
                        }
                      />
                    </div>

                    {settings.serviceChargeEnabled && (
                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-medium">
                          Service Charge Rate (%)
                        </Label>
                        <div className="relative max-w-xs">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={settings.serviceChargeRate}
                            onChange={(e) =>
                              updateField(
                                "serviceChargeRate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-9 pr-8 text-xs font-semibold"
                          />
                          <span className="absolute top-2.5 right-3 text-xs font-semibold text-muted-foreground">
                            %
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Common dining industry standard: 5% to 10%
                        </p>
                      </div>
                    )}

                    {/* Senior / PWD Toggle */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold">
                          Senior Citizen & PWD Discount Compliance
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Enables automatic 20% discount + VAT exemption
                          calculation on POS cashier screens.
                        </div>
                      </div>
                      <Switch
                        checked={settings.seniorPwdDiscountEnabled}
                        onCheckedChange={(val) =>
                          updateField("seniorPwdDiscountEnabled", val)
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Live Breakdown Preview Card */}
              <div className="space-y-4 lg:col-span-5">
                <Card className="border border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        <Sparkles className="size-4 text-emerald-500" />
                        Live Tax Calculation Simulator
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 text-[9px] text-emerald-700 dark:text-emerald-300"
                      >
                        Live Preview
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">
                      Adjust sample amount to see how your current tax & service
                      charge settings compute on checkout.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Sample Order Amount ({settings.currencySymbol})
                      </Label>
                      <Input
                        type="number"
                        step="50"
                        min="10"
                        value={sampleBillAmount}
                        onChange={(e) =>
                          setSampleBillAmount(parseFloat(e.target.value) || 0)
                        }
                        className="h-9 text-xs font-semibold"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-border bg-background/80 p-2">
                      <span className="text-xs font-medium">
                        Simulate Senior / PWD 20%
                      </span>
                      <Switch
                        checked={applySampleSenior}
                        onCheckedChange={setApplySampleSenior}
                        disabled={!settings.seniorPwdDiscountEnabled}
                      />
                    </div>

                    {/* Breakdown Ledger */}
                    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Gross Order Amount</span>
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {settings.currencySymbol}
                          {taxSimulation.grossAmount.toFixed(2)}
                        </span>
                      </div>

                      {applySampleSenior && (
                        <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
                          <span>Senior / PWD 20% Discount</span>
                          <span className="font-mono font-semibold tabular-nums">
                            -{settings.currencySymbol}
                            {taxSimulation.seniorDiscount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Net of VAT (Vatable Sales)</span>
                        <span className="font-mono tabular-nums">
                          {settings.currencySymbol}
                          {taxSimulation.netSales.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>
                          {settings.vatEnabled
                            ? `VAT (${settings.vatRate}%)`
                            : "VAT (Exempt)"}
                          {applySampleSenior && (
                            <span className="ml-1 text-[10px] text-emerald-600">
                              (Exempted)
                            </span>
                          )}
                        </span>
                        <span className="font-mono tabular-nums">
                          {settings.currencySymbol}
                          {taxSimulation.vatAmount.toFixed(2)}
                        </span>
                      </div>

                      {settings.serviceChargeEnabled && (
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>
                            Service Charge ({settings.serviceChargeRate}%)
                          </span>
                          <span className="font-mono tabular-nums">
                            {settings.currencySymbol}
                            {taxSimulation.serviceChargeAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                        <span>Estimated Total Bill</span>
                        <span className="font-mono text-emerald-600 tabular-nums dark:text-emerald-400">
                          {settings.currencySymbol}
                          {taxSimulation.grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 3: POS & ORDER WORKFLOW                                     */}
          {/* =============================================================== */}
          <TabsContent value="orders" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border bg-card shadow-xs">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Sliders className="size-4 text-amber-500" />
                    Order Numbering & Entry Rules
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Controls how orders are indexed, accepted, and initialized
                    on cashier & QR interfaces.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Order Number Prefix
                    </Label>
                    <Input
                      value={settings.orderNumberPrefix}
                      onChange={(e) =>
                        updateField("orderNumberPrefix", e.target.value)
                      }
                      placeholder="e.g. ORD-"
                      className="h-9 max-w-xs font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Appears before sequential daily numbers, e.g. ORD-1001
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Default Order Type for POS
                    </Label>
                    <Select
                      value={settings.defaultOrderType}
                      onValueChange={(val) =>
                        updateField(
                          "defaultOrderType",
                          val as "dine_in" | "take_out"
                        )
                      }
                    >
                      <SelectTrigger className="h-9 max-w-xs text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dine_in">
                          Dine-In (Table Assigned)
                        </SelectItem>
                        <SelectItem value="take_out">
                          Take-Out (Counter Pickup)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">
                        Require Table Selection for Dine-In
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Prevents placing dine-in orders without assigning an
                        active restaurant table number.
                      </div>
                    </div>
                    <Switch
                      checked={settings.requireTableSelection}
                      onCheckedChange={(val) =>
                        updateField("requireTableSelection", val)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">
                        Auto-Accept Customer QR Orders
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        If enabled, QR orders go straight to Kitchen Display
                        without cashier confirmation.
                      </div>
                    </div>
                    <Switch
                      checked={settings.autoAcceptQrOrders}
                      onCheckedChange={(val) =>
                        updateField("autoAcceptQrOrders", val)
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card shadow-xs">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Lock className="size-4 text-rose-500" />
                    Security, Voids & Stock Controls
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Controls manager overrides for sensitive actions and
                    automated low-stock warnings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">
                        Require Manager Approval for Voids
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Mandates manager PIN / credentials before canceling or
                        refunding an active order.
                      </div>
                    </div>
                    <Switch
                      checked={settings.managerApprovalForVoids}
                      onCheckedChange={(val) =>
                        updateField("managerApprovalForVoids", val)
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Inventory Low-Stock Warning Threshold
                    </Label>
                    <div className="relative max-w-xs">
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.lowStockThresholdAlert}
                        onChange={(e) =>
                          updateField(
                            "lowStockThresholdAlert",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9 pr-16 text-xs font-semibold"
                      />
                      <span className="absolute top-2.5 right-3 text-xs text-muted-foreground">
                        units
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Triggers amber alerts on the inventory dashboard when
                      items drop below this count.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 4: RECEIPT & PRINTING                                       */}
          {/* =============================================================== */}
          <TabsContent value="receipt" className="space-y-4">
            <Card className="border bg-card shadow-xs">
              <CardHeader className="p-4 pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Smartphone className="size-4 text-amber-500" />
                  Customer GCash / Maya QR payments
                </CardTitle>
                <CardDescription className="text-xs">
                  Customers scan these static wallet QR codes and submit the
                  transaction reference. Staff must verify the transfer before
                  the digital receipt is released.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 pt-0 sm:grid-cols-2">
                {(
                  [
                    ["gcashQrImage", "GCash"],
                    ["mayaQrImage", "Maya"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2 rounded-lg border p-3">
                    <Label className="text-xs font-semibold">
                      {label} payment QR
                    </Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        uploadPaymentQr(key, event.target.files?.[0])
                      }
                      className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-medium"
                    />
                    {settings[key] ? (
                      <div className="flex h-40 items-center justify-center rounded-md bg-white p-2">
                        <img
                          src={settings[key]}
                          alt={`${label} payment QR`}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <p className="rounded-md bg-muted/50 p-4 text-center text-xs text-muted-foreground">
                        No {label} QR uploaded. Customers cannot submit wallet
                        payment orders with this method yet.
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Receipt className="size-4 text-purple-500" />
                      Thermal Receipt Content Customization
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure custom messages, customer Wi-Fi, and auto-print
                      triggers on 80mm/58mm thermal printers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Receipt Header Greeting / Tagline
                      </Label>
                      <Textarea
                        value={settings.receiptHeader}
                        onChange={(e) =>
                          updateField("receiptHeader", e.target.value)
                        }
                        placeholder="Welcome message or promo announcement..."
                        className="min-h-[60px] resize-none text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Receipt Footer Thank You Message
                      </Label>
                      <Textarea
                        value={settings.receiptFooter}
                        onChange={(e) =>
                          updateField("receiptFooter", e.target.value)
                        }
                        placeholder="Thank you message, return policy, social media handles..."
                        className="min-h-[70px] resize-none text-xs"
                      />
                    </div>

                    {/* Auto-print triggers */}
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold">
                            Auto-Print Receipt
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Upon cashier payment settlement
                          </div>
                        </div>
                        <Switch
                          checked={settings.printReceiptAuto}
                          onCheckedChange={(val) =>
                            updateField("printReceiptAuto", val)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold">
                            Auto-Print KOT
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Kitchen Order Ticket on confirm
                          </div>
                        </div>
                        <Switch
                          checked={settings.printKotAuto}
                          onCheckedChange={(val) =>
                            updateField("printKotAuto", val)
                          }
                        />
                      </div>
                    </div>

                    {/* Wi-Fi Details */}
                    <div className="space-y-3 border-t border-border pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Wifi className="size-3.5 text-sky-500" />
                            Print Customer Wi-Fi Credentials on Slip
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Conveniently prints the Wi-Fi network and password
                            at the bottom of the receipt.
                          </div>
                        </div>
                        <Switch
                          checked={settings.showWifiOnReceipt}
                          onCheckedChange={(val) =>
                            updateField("showWifiOnReceipt", val)
                          }
                        />
                      </div>

                      {settings.showWifiOnReceipt && (
                        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              Wi-Fi Network Name (SSID)
                            </Label>
                            <Input
                              value={settings.wifiSsid}
                              onChange={(e) =>
                                updateField("wifiSsid", e.target.value)
                              }
                              placeholder="e.g. PRIME-Guest-5G"
                              className="h-9 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                              Wi-Fi Password
                            </Label>
                            <Input
                              value={settings.wifiPassword}
                              onChange={(e) =>
                                updateField("wifiPassword", e.target.value)
                              }
                              placeholder="e.g. deliciousroast"
                              className="h-9 font-mono text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Realistic Thermal Receipt Paper Simulator */}
              <div className="space-y-4 lg:col-span-5">
                <Card className="border bg-card shadow-xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <FileText className="size-4 text-amber-500" />
                      Thermal Receipt Simulator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Realistic preview of how 80mm ESC/POS printers format your
                      customer slip.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center p-4 pt-1">
                    {/* Paper Slip */}
                    <div className="w-full max-w-[320px] rounded border border-neutral-300 bg-amber-50/70 p-4 font-mono text-[11px] leading-relaxed text-neutral-900 shadow-md select-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100">
                      {/* Header */}
                      <div className="space-y-0.5 border-b border-dashed border-neutral-400 pb-2 text-center dark:border-neutral-700">
                        <div className="text-xs font-bold tracking-wider uppercase">
                          {settings.restaurantName}
                        </div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-400">
                          {settings.branchName}
                        </div>
                        <div className="text-[9px] text-neutral-500 dark:text-neutral-400">
                          {settings.address}
                        </div>
                        <div className="text-[9px] text-neutral-500 dark:text-neutral-400">
                          Tel: {settings.contactNumber}
                        </div>
                        {settings.tinNumber && (
                          <div className="text-[9px] text-neutral-600 dark:text-neutral-300">
                            VAT REG TIN: {settings.tinNumber}
                          </div>
                        )}
                        {settings.birMin && (
                          <div className="text-[9px] text-neutral-600 dark:text-neutral-300">
                            MIN: {settings.birMin}
                          </div>
                        )}
                        {settings.receiptHeader && (
                          <div className="pt-1 text-[9px] whitespace-pre-line text-neutral-700 italic dark:text-neutral-300">
                            {settings.receiptHeader}
                          </div>
                        )}
                      </div>

                      {/* Slip Meta */}
                      <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[10px] dark:border-neutral-700">
                        <div className="flex justify-between">
                          <span>OR: #2026-09001</span>
                          <span>Table 04</span>
                        </div>
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Date: Sep 17, 2026</span>
                          <span>12:45 PM</span>
                        </div>
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>Cashier: Admin User</span>
                          <span>Dine-In</span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1 border-b border-dashed border-neutral-400 py-2 dark:border-neutral-700">
                        <div className="flex justify-between font-semibold">
                          <span>1x Whole Litson Manok</span>
                          <span>₱420.00</span>
                        </div>
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>2x Java Rice Special</span>
                          <span>₱90.00</span>
                        </div>
                        <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                          <span>2x Bottomless Iced Tea</span>
                          <span>₱110.00</span>
                        </div>
                      </div>

                      {/* Totals Breakdown */}
                      <div className="space-y-0.5 border-b border-dashed border-neutral-400 py-2 text-[10px] dark:border-neutral-700">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>₱620.00</span>
                        </div>
                        {settings.serviceChargeEnabled && (
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>
                              Service Charge ({settings.serviceChargeRate}%):
                            </span>
                            <span>₱31.00</span>
                          </div>
                        )}
                        {settings.vatEnabled && (
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>Vatable Sales:</span>
                            <span>₱553.57</span>
                          </div>
                        )}
                        {settings.vatEnabled && (
                          <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                            <span>VAT (12%):</span>
                            <span>₱66.43</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-neutral-300 pt-1 text-xs font-bold dark:border-neutral-700">
                          <span>TOTAL:</span>
                          <span>
                            ₱
                            {settings.serviceChargeEnabled
                              ? "651.00"
                              : "620.00"}
                          </span>
                        </div>
                      </div>

                      {/* Wi-Fi & Footer */}
                      <div className="space-y-1 pt-2 text-center text-[9px]">
                        {settings.showWifiOnReceipt && settings.wifiSsid && (
                          <div className="rounded bg-neutral-200/60 p-1.5 text-center font-mono text-[9px] dark:bg-neutral-800">
                            <div>
                              Wi-Fi:{" "}
                              <span className="font-bold">
                                {settings.wifiSsid}
                              </span>
                            </div>
                            {settings.wifiPassword && (
                              <div>
                                Pass:{" "}
                                <span className="font-bold">
                                  {settings.wifiPassword}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {settings.receiptFooter && (
                          <div className="pt-1 whitespace-pre-line text-neutral-600 italic dark:text-neutral-400">
                            {settings.receiptFooter}
                          </div>
                        )}
                        <div className="pt-1 text-[8px] text-neutral-400">
                          THIS SERVES AS AN OFFICIAL SALES INVOICE
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* TAB 5: OPERATIONS & LOYALTY                                     */}
          {/* =============================================================== */}
          <TabsContent value="operations" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border bg-card shadow-xs">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Clock className="size-4 text-sky-500" />
                    Operating Schedule & Shift Cash Control
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure official trading hours and shift float / opening
                    balance policies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Daily Opening Time
                      </Label>
                      <Input
                        type="time"
                        value={settings.openingTime}
                        onChange={(e) =>
                          updateField("openingTime", e.target.value)
                        }
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Daily Closing Cutoff
                      </Label>
                      <Input
                        type="time"
                        value={settings.closingTime}
                        onChange={(e) =>
                          updateField("closingTime", e.target.value)
                        }
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold">
                        Enforce Opening Float Verification
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Requires cashier staff to count and input drawer
                        starting cash before taking any orders.
                      </div>
                    </div>
                    <Switch
                      checked={settings.cashDrawerOpeningBalanceRequired}
                      onCheckedChange={(val) =>
                        updateField("cashDrawerOpeningBalanceRequired", val)
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      Auto-Archive Completed Orders (Hours)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.autoArchiveSettledOrdersHours}
                      onChange={(e) =>
                        updateField(
                          "autoArchiveSettledOrdersHours",
                          parseInt(e.target.value) || 24
                        )
                      }
                      className="h-9 max-w-xs text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Removes closed transactions from active live queue after
                      specified hours.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card shadow-xs">
                <CardHeader className="p-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Award className="size-4 text-amber-500" />
                    Loyalty Rewards Program Parameters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Direct integration with Module 8 (`loyalty_settings` table)
                    in the PRIME ecosystem.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Points Earned Per Peso (₱1.00)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={settings.loyaltyPointsPerPeso}
                        onChange={(e) =>
                          updateField(
                            "loyaltyPointsPerPeso",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-9 text-xs font-semibold"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        e.g. 1 point for every ₱1 spent
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        Peso Value Per Point (₱)
                      </Label>
                      <Input
                        type="number"
                        step="0.05"
                        min="0"
                        value={settings.loyaltyPesoValuePerPoint}
                        onChange={(e) =>
                          updateField(
                            "loyaltyPesoValuePerPoint",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-9 text-xs font-semibold"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        e.g. 100 points = ₱50 discount
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Zap className="size-3.5 text-amber-600 dark:text-amber-400" />
                      Automatic Conversion Rule
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Customers registered through phone numbers will earn{" "}
                      {settings.loyaltyPointsPerPeso} point(s) per peso spent,
                      and each point converts to ₱
                      {settings.loyaltyPesoValuePerPoint.toFixed(2)} when
                      redeemed at the counter.
                    </p>
                  </div>

                  <div className="space-y-3 border-t pt-4">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Customer rewards
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Active rewards appear in the customer Rewards page and
                        can be redeemed with loyalty points.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto]">
                      <Input
                        value={rewardName}
                        onChange={(event) => setRewardName(event.target.value)}
                        placeholder="Reward name"
                        aria-label="Reward name"
                        className="h-9 text-xs"
                      />
                      <Input
                        value={rewardDescription}
                        onChange={(event) =>
                          setRewardDescription(event.target.value)
                        }
                        placeholder="Description (optional)"
                        aria-label="Reward description"
                        className="h-9 text-xs"
                      />
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={rewardPointsCost}
                        onChange={(event) =>
                          setRewardPointsCost(Number(event.target.value) || 0)
                        }
                        aria-label="Reward cost in points"
                        className="h-9 text-xs"
                      />
                      <Button
                        type="button"
                        onClick={() => void createReward()}
                        disabled={isSavingReward}
                        className="h-9 bg-amber-500 text-xs font-semibold text-neutral-950 hover:bg-amber-400"
                      >
                        <Plus className="mr-1 size-3.5" />
                        {isSavingReward ? "Adding…" : "Add reward"}
                      </Button>
                    </div>
                    {loyaltyRewards.length ? (
                      <div className="divide-y rounded-lg border">
                        {loyaltyRewards.map((reward) => (
                          <div
                            key={reward.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {reward.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {reward.description || "No description"} ·{" "}
                                {Number(reward.pointsCost)} points
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {Boolean(reward.isActive) ? "Active" : "Hidden"}
                              </span>
                              <Switch
                                checked={Boolean(reward.isActive)}
                                disabled={updatingRewardId === reward.id}
                                onCheckedChange={(checked) =>
                                  void toggleReward(reward, checked)
                                }
                                aria-label={
                                  (Boolean(reward.isActive)
                                    ? "Hide "
                                    : "Show ") + reward.name
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No customer rewards yet. Add a reward above to make it
                        available for redemption.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ================================================================= */}
      {/* Reset to Defaults Confirmation Dialog                             */}
      {/* ================================================================= */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">
              Reset Settings to System Defaults?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will restore all store profile details, tax rates, POS rules,
              and receipt formatting back to factory presets. Any unsaved
              modifications will be permanently discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="h-9 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="h-9 bg-rose-600 text-xs text-white hover:bg-rose-700"
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
