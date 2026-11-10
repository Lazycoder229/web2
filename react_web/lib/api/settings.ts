import { api } from "./client"
import type { ActionResult } from "@/types/admin/menu"

export type LoyaltyRewardRecord = {
  id: string
  name: string
  pointsCost: number
  pointsRequired: number
  rewardValue: number
  description: string | null
  isActive: boolean
}

export type LoyaltyRedemptionRecord = {
  id: string
  customerId: string
  customerName: string
  customerEmail: string | null
  rewardName: string
  points: number
  balanceAfter: number
  createdAt: string
}
type AnyInput = Record<string, unknown>

function normalizeLoyaltyReward(
  reward: Partial<LoyaltyRewardRecord> & {
    points_cost?: number | string
    points_required?: number | string
    is_active?: boolean | number | string
  }
) {
  const rawPoints = Number(
    reward.pointsCost ??
      reward.pointsRequired ??
      reward.points_cost ??
      reward.points_required ??
      0
  )
  const pointsCost = Number.isFinite(rawPoints) ? rawPoints : 0
  const rawActive = reward.isActive ?? reward.is_active
  return {
    id: String(reward.id ?? ""),
    name: String(reward.name ?? ""),
    pointsCost,
    pointsRequired: pointsCost,
    rewardValue: Number(reward.rewardValue ?? 0),
    description: reward.description ?? null,
    isActive: rawActive === true || rawActive === 1 || rawActive === "1",
  } satisfies LoyaltyRewardRecord
}

function normalizeLoyaltyRedemption(
  row: Partial<LoyaltyRedemptionRecord> & {
    customer_id?: string
    customer_name?: string
    customer_email?: string | null
    reward_name?: string
    balance_after?: number | string
    created_at?: string
  }
): LoyaltyRedemptionRecord {
  return {
    id: String(row.id ?? ""),
    customerId: String(row.customerId ?? row.customer_id ?? ""),
    customerName: String(row.customerName ?? row.customer_name ?? "Unknown customer"),
    customerEmail: row.customerEmail ?? row.customer_email ?? null,
    rewardName: String(row.rewardName ?? row.reward_name ?? "Reward"),
    points: Number(row.points ?? 0),
    balanceAfter: Number(row.balanceAfter ?? row.balance_after ?? 0),
    createdAt: String(row.createdAt ?? row.created_at ?? ""),
  }
}

export function fetchSystemSettings(): Promise<any> {
  return api<any>("/settings", { skipAuthRedirect: true })
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
export async function fetchLoyaltyRewardsAction(): Promise<
  ActionResult<LoyaltyRewardRecord[]>
> {
  const result = await api<{ rewards?: LoyaltyRewardRecord[] }>(
    "/settings/loyalty/rewards"
  )
  if (!result.success) return { success: false, error: result.error }
  return {
    success: true,
    data: Array.isArray(result.data?.rewards)
      ? result.data.rewards.map(normalizeLoyaltyReward)
      : [],
  }
}

export async function fetchLoyaltyRedemptionsAction(): Promise<
  ActionResult<LoyaltyRedemptionRecord[]>
> {
  const result = await api<{ redemptions?: LoyaltyRedemptionRecord[] }>(
    "/settings/loyalty/redemptions"
  )
  if (!result.success) return { success: false, error: result.error }
  return {
    success: true,
    data: Array.isArray(result.data?.redemptions)
      ? result.data.redemptions.map(normalizeLoyaltyRedemption)
      : [],
  }
}
export async function createLoyaltyRewardAction(
  input: AnyInput
): Promise<ActionResult<LoyaltyRewardRecord>> {
  const result = await api<{ reward?: LoyaltyRewardRecord }>("/settings/loyalty/rewards", {
    method: "POST",
    body: JSON.stringify(input),
  })
  if (!result.success) return { success: false, error: result.error }
  return result.data?.reward
    ? { success: true, data: normalizeLoyaltyReward(result.data.reward) }
    : { success: false, error: "The server did not return the created reward." }
}
export async function updateLoyaltyRewardAction(
  id: string,
  input: AnyInput
): Promise<ActionResult<LoyaltyRewardRecord>> {
  const result = await api<{ reward?: LoyaltyRewardRecord }>(`/settings/loyalty/rewards/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
  if (!result.success) return { success: false, error: result.error }
  return result.data?.reward
    ? { success: true, data: normalizeLoyaltyReward(result.data.reward) }
    : { success: false, error: "The server did not return the updated reward." }
}
