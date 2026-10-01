import { api } from "./client"

export type LoyaltyRewardRecord = {
  id: string
  name: string
  pointsCost: number
  pointsRequired: number
  rewardValue: number
  description: string | null
  isActive: boolean
}
type AnyInput = Record<string, unknown>

export function fetchSystemSettings(): Promise<any> {
  return api<any>("/settings")
}
export function updateSystemSettings(input: AnyInput): Promise<any> {
  return api<any>("/settings", { method: "PUT", body: JSON.stringify(input) })
}

export const updateSystemSettingsAction = updateSystemSettings
export function fetchLoyaltyProgramSettingsAction(): Promise<any> {
  return api<any>("/settings/loyalty")
}
export function updateLoyaltyProgramSettingsAction(
  input: AnyInput
): Promise<any> {
  return api<any>("/settings/loyalty", {
    method: "PUT",
    body: JSON.stringify(input),
  })
}
export function fetchLoyaltyRewardsAction(): Promise<any> {
  return api<any>("/settings/loyalty/rewards")
}
export function createLoyaltyRewardAction(input: AnyInput): Promise<any> {
  return api<any>("/settings/loyalty/rewards", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updateLoyaltyRewardAction(
  id: string,
  input: AnyInput
): Promise<any> {
  return api<any>(`/settings/loyalty/rewards/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}
