import { z } from "zod"
import { idSchema } from "./common"

export const roleSchema = z.object({
  id: idSchema,
  name: z.string().min(1, "Role name is required").max(50),
  description: z.string().max(500).nullable().optional(),
  isSystem: z.boolean().default(false),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(50),
  description: z.string().max(500).optional(),
  isSystem: z.boolean().default(false),
  permissionIds: z.array(idSchema).optional().default([]),
})

export const updateRoleSchema = createRoleSchema.partial().extend({
  id: idSchema,
})

export const permissionSchema = z.object({
  id: idSchema,
  code: z.string().min(1, "Permission code is required").max(100),
  module: z.string().min(1, "Module name is required").max(50),
  description: z.string().max(500).nullable().optional(),
})

export const createPermissionSchema = z.object({
  code: z.string().min(1, "Code is required").max(100),
  module: z.string().min(1, "Module is required").max(50),
  description: z.string().max(500).optional(),
})

export const rolePermissionSchema = z.object({
  roleId: idSchema,
  permissionId: idSchema,
})

export const assignRolePermissionsSchema = z.object({
  roleId: idSchema,
  permissionIds: z.array(idSchema),
})

export const assignUserRoleSchema = z.object({
  userId: idSchema,
  roleId: idSchema,
})

export type Role = z.infer<typeof roleSchema>
export type CreateRoleInput = z.infer<typeof createRoleSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type Permission = z.infer<typeof permissionSchema>
export type RolePermission = z.infer<typeof rolePermissionSchema>
export type AssignRolePermissionsInput = z.infer<typeof assignRolePermissionsSchema>
export type AssignUserRoleInput = z.infer<typeof assignUserRoleSchema>
