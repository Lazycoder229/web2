import { api } from "./client"

export type Branch = {
  id: string
  name: string
  code: string
  type: "main" | "branch"
  address: string | null
  contactNumber: string | null
  email: string | null
  isMain: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string | null
}

type BranchInput = Omit<
  Branch,
  "id" | "createdAt" | "updatedAt"
>

type BranchResponse = { branch: Branch }

type BranchListResponse = { branches: Branch[] }

export function fetchBranches(): Promise<{
  success: boolean
  data?: BranchListResponse
  error?: string
}> {
  return api<BranchListResponse>("/branches")
}

export function createBranch(input: BranchInput): Promise<{
  success: boolean
  data?: BranchResponse
  error?: string
}> {
  return api<BranchResponse>("/branches", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateBranch(
  id: string,
  input: Partial<BranchInput>
): Promise<{
  success: boolean
  data?: BranchResponse
  error?: string
}> {
  return api<BranchResponse>(`/branches/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}

export function deleteBranch(id: string): Promise<{
  success: boolean
  data?: { id: string }
  error?: string
}> {
  return api<{ id: string }>(`/branches/${id}`, { method: "DELETE" })
}
