"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ImageOff,
  Package,
  Loader2,
  X,
  Settings2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Toaster } from "@/components/ui/sonner"

import {
  getMenuDataAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  uploadMenuImageAction,
} from "@/lib/api/menu"

import type { Category, MenuItem, MenuItemFormValues } from "@/types/admin/menu"
import {
  createCategorySchema,
  createMenuItemSchema,
} from "@/lib/validations/menu"

// Form validation (UX only, the backend must validate too).
// imageUrl is excluded because it's only known after the upload.
const menuFormSchema = createMenuItemSchema.omit({ imageUrl: true })

// ---------------------------------------------------------------------------
// Form defaults
// ---------------------------------------------------------------------------

const emptyForm: MenuItemFormValues = {
  categoryId: "",
  name: "",
  description: "",
  price: 0,
  imageUrl: "",
  isAvailable: true,
  stockQuantity: null,
}

const emptyCategoryForm = {
  name: "",
  isActive: true,
}

// ---------------------------------------------------------------------------
// Loading skeleton for a menu card
// ---------------------------------------------------------------------------

function MenuCardSkeleton() {
  return (
    <Card className="flex w-full min-w-0 flex-col gap-0 overflow-hidden border bg-card p-0">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")

  const [sheetOpen, setSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  )
  const [form, setForm] = useState<MenuItemFormValues>(emptyForm)
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null)

  // ── Initial load ──
  const loadMenu = useCallback(async () => {
    setIsLoading(true)
    setLoadError(false)
    try {
      const res = await getMenuDataAction()
      if (!res.success || !res.data) throw new Error(res.error)
      setCategories(res.data.categories)
      setItems(res.data.items)
    } catch (err) {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMenu()
  }, [loadMenu])

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive),
    [categories]
  )

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.categoryId === activeCategory
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.trim().toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, activeCategory, search])

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name ?? "Uncategorized"
  }

  function resetImageState() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
  }

  function openCreateSheet() {
    setEditingId(null)
    setForm({ ...emptyForm })
    resetImageState()
    setSheetOpen(true)
  }

  function openEditSheet(item: MenuItem) {
    setEditingId(item.id)
    setForm({
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? null,
      price: item.price,
      imageUrl: item.imageUrl ?? null,
      isAvailable: item.isAvailable,
      stockQuantity: item.stockQuantity ?? null,
    })
    resetImageState()
    setSheetOpen(true)
  }

  function openCreateCategory() {
    setEditingCategoryId(null)
    setCategoryForm(emptyCategoryForm)
  }

  function openEditCategory(category: Category) {
    setEditingCategoryId(category.id)
    setCategoryForm({ name: category.name, isActive: category.isActive })
  }

  // ── Categories: create / update ──
  async function handleCategorySubmit() {
    const name = categoryForm.name.trim()
    const check = createCategorySchema.safeParse({
      name,
      isActive: categoryForm.isActive,
      sortOrder: categories.length,
    })
    if (!check.success) {
      toast.error(check.error.issues[0].message)
      return
    }

    setIsCategorySubmitting(true)
    try {
      if (editingCategoryId) {
        const res = await updateCategoryAction({
          id: editingCategoryId,
          name,
          isActive: categoryForm.isActive,
        })
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to update category")
        }

        const updated = res.data.category
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategoryId ? updated : c))
        )
        // A hidden category can't stay selected as the active filter
        if (!updated.isActive && activeCategory === updated.id) {
          setActiveCategory("all")
        }
        toast.success("Category updated")
      } else {
        const res = await createCategoryAction({
          name,
          isActive: categoryForm.isActive,
          sortOrder: categories.length,
        })
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to create category")
        }

        const created = res.data.category
        setCategories((prev) => [...prev, created])
        toast.success("Category added")
      }

      openCreateCategory()
    } catch (err) {
      toast.error("Category save failed", {
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setIsCategorySubmitting(false)
    }
  }

  // ── Categories: delete ──
  async function handleCategoryDelete(category: Category) {
    try {
      const res = await deleteCategoryAction(category.id)
      if (!res.success)
        throw new Error(res.error || "Failed to delete category")

      setCategories((prev) => prev.filter((c) => c.id !== category.id))
      if (activeCategory === category.id) setActiveCategory("all")
      if (editingCategoryId === category.id) openCreateCategory()
      toast.success("Category deleted")
    } catch (err) {
      toast.error("Category delete failed", {
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      })
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // ── Items: create / update ──
  async function handleSubmit() {
    if (!form.categoryId) {
      toast.error("Select a category")
      return
    }

    const check = menuFormSchema.safeParse({
      categoryId: form.categoryId,
      name: form.name.trim(),
      description: form.description || null,
      price: form.price,
      isAvailable: form.isAvailable,
      stockQuantity: form.stockQuantity,
    })
    if (!check.success) {
      toast.error("Check the form", {
        description: check.error.issues[0].message,
      })
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(
      editingId ? "Saving changes…" : "Creating item…"
    )

    try {
      let finalImageUrl: string | null = form.imageUrl || null

      if (imageFile) {
        const upload = await uploadMenuImageAction(imageFile)
        if (!upload.success || !upload.data) {
          throw new Error(upload.error ?? "Could not upload the product image.")
        }
        finalImageUrl = upload.data.url
      }

      const payload = {
        name: form.name,
        categoryId: form.categoryId,
        description: form.description || null,
        price: form.price,
        imageUrl: finalImageUrl,
        isAvailable: form.isAvailable,
        stockQuantity: form.stockQuantity,
      }

      if (editingId) {
        const res = await updateMenuItemAction({ id: editingId, ...payload })
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to update item")
        }

        const updated = res.data.item
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
        toast.success("Item updated", {
          id: toastId,
          description: `"${updated.name}" was saved.`,
        })
      } else {
        const res = await createMenuItemAction(payload)
        if (!res.success || !res.data) {
          throw new Error(res.error || "Failed to create item")
        }

        const created = res.data.item
        setItems((prev) => [created, ...prev])
        toast.success("Item created", {
          id: toastId,
          description: `"${created.name}" was added to the menu.`,
        })
      }

      resetImageState()
      setSheetOpen(false)
    } catch (err) {
      toast.error("Save failed", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Something went wrong.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Items: delete ──
  async function handleDelete(id: string, name: string) {
    const toastId = toast.loading(`Deleting "${name}"…`)
    try {
      const res = await deleteMenuItemAction(id)
      if (!res.success) throw new Error(res.error || "Failed to delete item")

      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success("Item deleted", {
        id: toastId,
        description: `"${name}" was removed from the menu.`,
      })
    } catch (err) {
      toast.error("Delete failed", {
        id: toastId,
        description:
          err instanceof Error ? err.message : "Could not delete the item.",
      })
    }
  }

  // ── Items: toggle availability (optimistic) ──
  async function toggleAvailability(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return

    const next = !item.isAvailable

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable: next } : i))
    )

    try {
      const res = await updateMenuItemAction({ id, isAvailable: next })
      if (!res.success)
        throw new Error(res.error || "Failed to update availability")

      toast.success(next ? "Item is now live" : "Item hidden", {
        description: next
          ? `"${item.name}" is visible to customers.`
          : `"${item.name}" is hidden from the menu.`,
      })
    } catch (err) {
      // Roll back
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, isAvailable: item.isAvailable } : i
        )
      )
      toast.error("Update failed", {
        description:
          err instanceof Error
            ? `${err.message} Availability change was reverted.`
            : "Availability change was reverted.",
      })
    }
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden pb-16 sm:pb-8">
      <Toaster richColors position="top-center" />

      <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6">
        {/* ── Header ── */}
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                Menu Items
              </h1>
              {!isLoading && !loadError && (
                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 text-xs font-semibold"
                >
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1 ? "item" : "items"}
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              Manage categories, pricing, stock, and availability.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {/* ── Categories Sheet ── */}
            <Sheet
              open={categorySheetOpen}
              onOpenChange={(open) => {
                setCategorySheetOpen(open)
                if (open) openCreateCategory()
              }}
            >
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isLoading || loadError}
                  className="h-11 w-full px-4 text-sm sm:h-10 sm:w-auto"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Categories
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="flex h-full flex-col p-0 sm:max-w-md"
              >
                <SheetHeader className="border-b p-4 text-left sm:p-6">
                  <SheetTitle className="text-lg font-bold">
                    Manage Categories
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Add or update the categories used by your menu items.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  {/* Add / Edit form */}
                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="category-name"
                        className="text-xs font-semibold"
                      >
                        {editingCategoryId ? "Edit category" : "New category"}
                      </Label>
                      <Input
                        id="category-name"
                        value={categoryForm.name}
                        onChange={(e) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="e.g. Rice Meals"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                      <div>
                        <Label
                          htmlFor="category-active"
                          className="text-sm font-medium"
                        >
                          Active
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Show this category in menu filters.
                        </p>
                      </div>
                      <Switch
                        id="category-active"
                        checked={categoryForm.isActive}
                        onCheckedChange={(checked) =>
                          setCategoryForm((prev) => ({
                            ...prev,
                            isActive: checked,
                          }))
                        }
                      />
                    </div>

                    <div className="flex gap-2">
                      {editingCategoryId && (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={openCreateCategory}
                          disabled={isCategorySubmitting}
                        >
                          Cancel edit
                        </Button>
                      )}
                      <Button
                        type="button"
                        className="flex-1 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                        onClick={handleCategorySubmit}
                        disabled={isCategorySubmitting}
                      >
                        {isCategorySubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : editingCategoryId ? (
                          "Save category"
                        ) : (
                          "Add category"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Category list */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Categories</Label>
                    {categories.length === 0 ? (
                      <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                        No categories yet.
                      </p>
                    ) : (
                      categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {category.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {category.isActive ? "Active" : "Inactive"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openEditCategory(category)}
                              aria-label={`Edit ${category.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => handleCategoryDelete(category)}
                              aria-label={`Delete ${category.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* ── Add / Edit Item Sheet ── */}
            <Sheet
              open={sheetOpen}
              onOpenChange={(open) => {
                setSheetOpen(open)
                if (!open) resetImageState()
              }}
            >
              <SheetTrigger asChild>
                <Button
                  onClick={openCreateSheet}
                  disabled={isLoading || loadError}
                  className="h-11 w-full bg-amber-500 px-5 text-sm font-semibold text-neutral-950 shadow-sm hover:bg-amber-400 sm:h-10 sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Item
                </Button>
              </SheetTrigger>

              <SheetContent
                side="right"
                className="flex h-full flex-col gap-0 p-0 sm:max-w-md"
              >
                <SheetHeader className="shrink-0 border-b p-4 text-left sm:p-6">
                  <SheetTitle className="text-lg font-bold">
                    {editingId ? "Edit Menu Item" : "New Menu Item"}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Price changes only apply to new orders — past orders keep
                    original price.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                  {/* Item Name */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="name" className="text-xs font-semibold">
                      Item Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm((f: any) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g. Whole Litson Manok"
                      className="h-11 text-sm sm:h-10"
                    />
                  </div>

                  {/* Category + Price */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="category"
                        className="text-xs font-semibold"
                      >
                        Category <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.categoryId}
                        onValueChange={(value) =>
                          setForm((f: any) => ({
                            ...f,
                            categoryId: value ?? f.categoryId,
                          }))
                        }
                      >
                        <SelectTrigger
                          id="category"
                          className="h-11 w-full text-sm sm:h-10"
                        >
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="price" className="text-xs font-semibold">
                        Price (₱) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={form.price || ""}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            price: Number(e.target.value),
                          }))
                        }
                        placeholder="0.00"
                        className="h-11 text-sm sm:h-10"
                      />
                    </div>
                  </div>

                  {/* Stock + Availability */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="stock" className="text-xs font-semibold">
                        Stock Quantity{" "}
                        <span className="font-normal text-muted-foreground">
                          (blank = unlimited)
                        </span>
                      </Label>
                      <Input
                        id="stock"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={form.stockQuantity ?? ""}
                        onChange={(e) =>
                          setForm((f: any) => ({
                            ...f,
                            stockQuantity:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          }))
                        }
                        placeholder="Unlimited"
                        className="h-11 text-sm sm:h-10"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="available"
                          className="cursor-pointer text-sm font-medium"
                        >
                          Available
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Show on customer menu
                        </p>
                      </div>
                      <Switch
                        id="available"
                        checked={form.isAvailable}
                        onCheckedChange={(checked) =>
                          setForm((f: any) => ({ ...f, isAvailable: checked }))
                        }
                        className="h-6 w-11"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="description"
                      className="text-xs font-semibold"
                    >
                      Description{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description ?? ""}
                      onChange={(e) =>
                        setForm((f: any) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Short description shown on the menu..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="image" className="text-xs font-semibold">
                      Product Photo
                    </Label>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      {(imagePreview || form.imageUrl) && (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview ?? form.imageUrl ?? ""}
                            alt="Preview"
                            className="block max-h-full max-w-full object-contain"
                          />
                        </div>
                      )}
                      <Input
                        id="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="h-10 cursor-pointer text-xs file:mr-3 file:rounded-md file:border-0 file:bg-amber-500/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-amber-600 hover:file:bg-amber-500/20"
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter className="shrink-0 flex-row gap-3 border-t bg-background p-4 sm:p-6">
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className="h-11 flex-1 text-sm sm:h-10"
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="h-11 flex-1 bg-amber-500 text-sm font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-60 sm:h-10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingId ? (
                      "Save Changes"
                    ) : (
                      "Create Item"
                    )}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="[scrollbar-none] w-full min-w-0 overflow-x-auto [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {isLoading ? (
              <Skeleton className="h-10 w-72 rounded-lg" />
            ) : (
              <Tabs
                value={activeCategory}
                onValueChange={setActiveCategory}
                className="w-full min-w-0"
              >
                <TabsList className="inline-flex h-10 w-max items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
                  <TabsTrigger
                    value="all"
                    className="min-w-15 px-3.5 py-1.5 text-xs font-medium"
                  >
                    All Items
                  </TabsTrigger>
                  {activeCategories.map((cat) => (
                    <TabsTrigger
                      key={cat.id}
                      value={cat.id}
                      className="px-3.5 py-1.5 text-xs font-medium"
                    >
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>

          <div className="relative w-full shrink-0 sm:w-64">
            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground sm:top-2.5" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="h-11 w-full pr-8 pl-9 text-sm sm:h-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-3 right-2.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted sm:top-2.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Error state ── */}
        {loadError && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load the menu. Check your connection and try again.
            </p>
            <Button variant="outline" size="sm" onClick={loadMenu}>
              Retry
            </Button>
          </div>
        )}

        {/* ── Cards Grid ── */}
        {!loadError && (
          <div className="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <MenuCardSkeleton key={i} />
              ))}

            {!isLoading &&
              filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="flex w-full min-w-0 flex-col gap-0 overflow-hidden border bg-card p-0 transition-shadow hover:shadow-md"
                >
                  {/* Thumbnail */}
                  <div
                    className="group relative isolate flex w-full shrink-0 items-center justify-center overflow-hidden bg-muted"
                    style={{ height: 176, minHeight: 176, maxHeight: 176 }}
                  >
                    {item.imageUrl ? (
                      <button
                        type="button"
                        onClick={() => setViewingItem(item)}
                        aria-label={`View ${item.name} image`}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <ImageOff className="h-6 w-6 sm:h-9 sm:w-9" />
                      </div>
                    )}
                    {!item.isAvailable && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-[1px]">
                        <Badge
                          variant="destructive"
                          className="px-1.5 py-0.5 text-[10px] font-medium sm:text-xs"
                        >
                          Hidden
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
                    <CardContent className="min-w-0 space-y-1 p-0 sm:space-y-2">
                      <div className="flex min-w-0 items-baseline justify-between gap-2">
                        <h3 className="truncate text-sm leading-tight font-semibold text-foreground">
                          {item.name}
                        </h3>
                        <span className="shrink-0 text-sm font-bold text-amber-500">
                          ₱{item.price.toFixed(2)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="line-clamp-1 text-xs leading-normal text-muted-foreground sm:line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-0.5 sm:pt-1">
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] font-normal sm:text-xs"
                        >
                          {categoryName(item.categoryId)}
                        </Badge>
                        <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground sm:text-xs">
                          <Package className="h-3 w-3" />
                          {item.stockQuantity == null
                            ? "Unlimited"
                            : `${item.stockQuantity} left`}
                        </span>
                      </div>
                    </CardContent>

                    {/* Footer */}
                    <CardFooter className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t p-0 pt-2 sm:pt-3">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={item.isAvailable}
                          onCheckedChange={() => toggleAvailability(item.id)}
                          className="h-5 w-9 sm:h-6 sm:w-11"
                        />
                        <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                          {item.isAvailable ? "Live" : "Hidden"}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
                          onClick={() => openEditSheet(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit item</span>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete item</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[90vw] max-w-md rounded-xl sm:rounded-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this item?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                &ldquo;{item.name}&rdquo; will be permanently
                                removed from the menu. Past orders won&apos;t be
                                affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                              <AlertDialogCancel className="mt-0 w-full sm:w-auto">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id, item.name)}
                                className="text-destructive-foreground w-full bg-destructive hover:bg-destructive/90 sm:w-auto"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardFooter>
                  </div>
                </Card>
              ))}

            {!isLoading && filteredItems.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-8 text-center text-muted-foreground">
                <Package className="h-10 w-10 opacity-40" />
                <div>
                  <p className="text-base font-semibold text-foreground">
                    No items found
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {search
                      ? `No menu items match "${search}"`
                      : "Get started by adding your first menu item."}
                  </p>
                </div>
                {!search && (
                  <Button
                    size="sm"
                    onClick={openCreateSheet}
                    className="mt-2 bg-amber-500 font-medium text-neutral-950 hover:bg-amber-400"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add item now
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Image preview modal ── */}
        <DialogPrimitive.Root
          open={Boolean(viewingItem?.imageUrl)}
          onOpenChange={(open) => {
            if (!open) setViewingItem(null)
          }}
        >
          <DialogPrimitive.Portal>
            {/* Overlay doubles as the centering wrapper, so no translate hacks */}
            <DialogPrimitive.Overlay className="fixed inset-0 z-[9999] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
              {viewingItem?.imageUrl && (
                <DialogPrimitive.Content
                  className="relative flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl focus:outline-none sm:max-w-md"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DialogPrimitive.Title className="sr-only">
                    {viewingItem.name} image preview
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="sr-only">
                    Full size image and menu item details.
                  </DialogPrimitive.Description>

                  {/* Image */}
                  <div className="relative flex min-h-0 flex-1 items-center justify-center bg-neutral-950 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingItem.imageUrl}
                      alt={viewingItem.name}
                      className="max-h-[42dvh] w-auto max-w-full rounded-lg object-contain"
                    />
                    <DialogPrimitive.Close asChild>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        aria-label="Close image preview"
                        className="absolute top-3 right-3 h-9 w-9 rounded-full shadow-md sm:top-4 sm:right-4"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>

                  {/* Details */}
                  <div className="flex shrink-0 items-start justify-between gap-3 border-t px-4 py-3">
                    <div className="min-w-0 space-y-1.5">
                      <h2 className="truncate text-base font-semibold sm:text-lg">
                        {viewingItem.name}
                      </h2>
                      {viewingItem.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {viewingItem.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge
                          variant="outline"
                          className="text-xs font-normal"
                        >
                          {categoryName(viewingItem.categoryId)}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          {viewingItem.stockQuantity == null
                            ? "Unlimited"
                            : `${viewingItem.stockQuantity} left`}
                        </span>
                        {!viewingItem.isAvailable && (
                          <Badge variant="destructive" className="text-xs">
                            Hidden
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-amber-500 sm:text-xl">
                      ₱{viewingItem.price.toFixed(2)}
                    </span>
                  </div>
                </DialogPrimitive.Content>
              )}
            </DialogPrimitive.Overlay>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </div>
  )
}
