import { api } from "./client"

export type PasswordResetAccount = "admin" | "customer"

export async function requestPasswordReset(
  accountType: PasswordResetAccount,
  email: string
) {
  const path =
    accountType === "admin"
      ? "/auth/forgot-password"
      : "/customers/forgot-password"
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
    accountType === "admin" ? "/auth/reset-password" : "/customers/reset-password"
  return api<{ message: string }>(path, {
    method: "POST",
    body: JSON.stringify({ token, password }),
    skipAuthRedirect: true,
  })
}
