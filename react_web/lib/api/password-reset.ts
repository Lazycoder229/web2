import { api } from "./client"

export type PasswordResetAccount = "admin" | "cashier" | "customer"

export async function requestPasswordReset(
  accountType: PasswordResetAccount,
  email: string
) {
  const path =
    accountType === "customer" ? "/customers/forgot-password" : "/auth/forgot-password"
  return api<{ message: string }>(path, {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuthRedirect: true,
  })
}

export async function resetPassword(
  accountType: PasswordResetAccount,
  token: string,
  password: string
) {
  const path =
    accountType === "customer" ? "/customers/reset-password" : "/auth/reset-password"
  return api<{ message: string }>(path, {
    method: "POST",
    body: JSON.stringify({ token, password }),
    skipAuthRedirect: true,
  })
}
