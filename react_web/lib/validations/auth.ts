import { z } from "zod"
import { idSchema, phoneSchema } from "./common"

export const userSchema = z.object({
  id: idSchema,
  roleId: idSchema.nullable().optional(),
  email: z.string().email("Invalid email address").nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  name: z.string().min(1, "Name is required").max(100).nullable().optional(),
  contactNumber: phoneSchema.nullable().optional(),
  isActive: z.boolean().default(true),
  lastLoginAt: z.coerce.date().nullable().optional(),
  emailVerified: z.string().nullable().optional(),
  image: z.string().url("Invalid image URL").max(500).nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
})

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  roleId: idSchema.optional(),
  contactNumber: phoneSchema.optional(),
  isActive: z.boolean().default(true),
})

export const updateUserSchema = createUserSchema.partial().extend({
  id: idSchema,
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export const accountSchema = z.object({
  id: idSchema.optional(),
  userId: idSchema,
  type: z.string().max(255),
  provider: z.string().max(255),
  providerAccountId: z.string().max(255),
  refresh_token: z.string().nullable().optional(),
  access_token: z.string().nullable().optional(),
  expires_at: z.number().nullable().optional(),
  token_type: z.string().nullable().optional(),
  scope: z.string().nullable().optional(),
  id_token: z.string().nullable().optional(),
  session_state: z.string().nullable().optional(),
})

export const sessionSchema = z.object({
  id: idSchema.optional(),
  sessionToken: z.string().min(1).max(255),
  userId: idSchema,
  expires: z.string().or(z.coerce.date()),
})

export const verificationTokenSchema = z.object({
  id: idSchema.optional(),
  identifier: z.string().min(1).max(255),
  token: z.string().min(1).max(255),
  expires: z.string().or(z.coerce.date()),
})

export type User = z.infer<typeof userSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type Account = z.infer<typeof accountSchema>
export type Session = z.infer<typeof sessionSchema>
export type VerificationToken = z.infer<typeof verificationTokenSchema>
