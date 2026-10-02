"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Check, MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { AdminDeleteDialog } from "@/components/admin-delete-dialog"
import {
  createBranch,
  deleteBranch,
  fetchBranches,
  updateBranch,
  type Branch,
} from "@/lib/api/branches"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type BranchForm = {
  name: string
  code: string
  address: string
  contactNumber: string
  email: string
  isMain: boolean
  isActive: boolean
}

const emptyForm: BranchForm = {
  name: "",
  code: "",
  address: "",
  contactNumber: "",
  email: "",
  isMain: false,
  isActive: true,
}

function toForm(branch: Branch): BranchForm {
  return {
    name: branch.name,
    code: branch.code,
    address: branch.address ?? "",
    contactNumber: branch.contactNumber ?? "",
    email: branch.email ?? "",
    isMain: branch.isMain,
    isActive: branch.isActive,
  }
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<BranchForm>(emptyForm)

  async function loadBranches() {
    const result = await fetchBranches()
    if (!result.success) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }
    setBranches(result.data?.branches ?? [])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadBranches()
  }, [])

  const activeCount = useMemo(
    () => branches.filter((branch) => branch.isActive).length,
    [branches]
  )
  const mainBranch = branches.find((branch) => branch.isMain)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  function openEdit(branch: Branch) {
    setEditingId(branch.id)
    setForm(toForm(branch))
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function saveBranch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Branch name and code are required")
      return
    }

    setIsSaving(true)
    const input = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      type: form.isMain ? "main" as const : "branch" as const,
      address: form.address.trim() || null,
      contactNumber: form.contactNumber.trim() || null,
      email: form.email.trim() || null,
      isMain: form.isMain,
      isActive: form.isActive,
    }
    const result = editingId
      ? await updateBranch(editingId, input)
      : await createBranch(input)
    setIsSaving(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(editingId ? "Branch updated" : "Branch created")
    closeForm()
    await loadBranches()
  }

  async function removeBranch(branch: Branch) {
    if (branch.isMain) return
    const result = await deleteBranch(branch.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Branch deleted")
    await loadBranches()
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-right" />
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              Branch Management
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Manage the main location and additional restaurant branches.
            </p>
          </div>
          <Button onClick={openCreate} className="h-10 gap-2 bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400">
            <Plus className="size-4" />
            Add branch
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Total branches", value: branches.length, icon: Building2 },
            { label: "Active branches", value: activeCount, icon: Check },
            { label: "Main location", value: mainBranch?.code ?? "-", icon: MapPin },
          ].map((metric) => (
            <Card key={metric.label} className="border bg-card shadow-xs">
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <metric.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-muted-foreground uppercase">
                    {metric.label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-5 w-16" />
                  ) : (
                    <div className="truncate text-base font-bold">{metric.value}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Sheet
          open={isFormOpen}
          onOpenChange={(open) => {
            if (open) setIsFormOpen(true)
            else closeForm()
          }}
        >
          <SheetContent side="right" className="w-full p-0 sm:max-w-md">
            <SheetHeader className="border-b p-4 text-left sm:p-6">
              <SheetTitle>
                {editingId ? "Edit branch" : "Add branch"}
              </SheetTitle>
              <SheetDescription>
                Add location details and choose whether this is the main branch.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={saveBranch} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="grid gap-1.5">
                  <Label htmlFor="branch-name">Branch name</Label>
                  <Input id="branch-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Main Branch" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="branch-code">Branch code</Label>
                  <Input id="branch-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. MAIN" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="branch-address">Address</Label>
                  <Input id="branch-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Branch address" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="branch-contact">Contact number</Label>
                  <Input id="branch-contact" value={form.contactNumber} onChange={(event) => setForm({ ...form, contactNumber: event.target.value })} placeholder="+63 917 000 0000" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="branch-email">Email</Label>
                  <Input id="branch-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="branch@example.com" />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="branch-main">Main branch</Label>
                    <p className="text-xs text-muted-foreground">Only one branch can be the main location.</p>
                  </div>
                  <Switch id="branch-main" checked={form.isMain} onCheckedChange={(checked) => setForm({ ...form, isMain: checked })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="branch-active">Active</Label>
                    <p className="text-xs text-muted-foreground">Inactive branches remain available for historical records.</p>
                  </div>
                  <Switch id="branch-active" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                </div>
              </div>
              <SheetFooter className="border-t p-4 sm:p-6">
                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-amber-500 font-semibold text-neutral-950 hover:bg-amber-400">
                  {isSaving ? "Saving..." : "Save branch"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Card className="border bg-card shadow-xs">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base font-bold">Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_100px] border-y bg-muted/30 px-4 py-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:grid sm:px-6">
              <span>Branch</span>
              <span>Status</span>
              <span className="text-center">Actions</span>
            </div>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="grid gap-3 border-b p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_120px_100px] sm:items-center sm:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="size-10 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <div className="flex justify-center gap-2">
                    <Skeleton className="size-8" />
                    <Skeleton className="size-8" />
                  </div>
                </div>
              ))
            ) : branches.length === 0 ? (
              <div className="border-b p-10 text-center text-sm text-muted-foreground">
                No branches configured.
              </div>
            ) : (
              branches.map((branch) => (
                <div key={branch.id} className="grid gap-3 border-b p-4 transition-colors hover:bg-muted/30 last:border-0 sm:grid-cols-[minmax(0,1fr)_120px_100px] sm:items-center sm:px-6">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      {branch.isMain ? <MapPin className="size-5" /> : <Building2 className="size-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{branch.name}</p>
                        <Badge variant="outline" className="text-[10px]">{branch.code}</Badge>
                        {branch.isMain && <Badge className="bg-amber-500 text-[10px] text-neutral-950 hover:bg-amber-500">Main</Badge>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {branch.address || "No address provided"} {branch.contactNumber ? `· ${branch.contactNumber}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`w-fit min-w-20 justify-center text-[10px] ${branch.isActive ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" : "border-border bg-muted text-muted-foreground"}`}
                  >
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center justify-center gap-2 sm:shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon-sm" onClick={() => openEdit(branch)} aria-label={`Edit ${branch.name}`}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit branch</TooltipContent>
                    </Tooltip>
                    <AdminDeleteDialog
                      title={`Delete ${branch.name}?`}
                      description="This branch and its location details will be permanently removed."
                      onConfirm={() => removeBranch(branch)}
                    >
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                        disabled={branch.isMain}
                        aria-label={`Delete ${branch.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AdminDeleteDialog>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
