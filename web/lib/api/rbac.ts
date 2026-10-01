import { api } from "./client"

type AnyInput = Record<string, unknown>
type RbacResult = {
  success: boolean
  data: {
    permissions: any[]
    roles: any[]
    users: any[]
    rolePermissions: any[]
  }
  error?: string
}

export function fetchRbacData(): Promise<RbacResult> {
  return api<any>("/rbac") as Promise<RbacResult>
}
export function createRoleAction(input: AnyInput): Promise<any> {
  return api<any>("/rbac/roles", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function assignRolePermissionsAction(input: AnyInput): Promise<any> {
  return api<any>(`/rbac/roles/${String(input.roleId)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionIds: input.permissionIds }),
  })
}
export function assignUserRoleAction(input: AnyInput): Promise<any> {
  return api<any>(`/rbac/users/${String(input.userId)}/role`, {
    method: "PUT",
    body: JSON.stringify({ roleId: input.roleId }),
  })
}
