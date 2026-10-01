import { api } from "./client"

type AnyInput = Record<string, unknown>
type VoidsResult = { success: boolean; data: any[]; error?: string }

export async function fetchVoids(): Promise<VoidsResult> {
  const result = await api<any>("/voids")
  return (
    result.success ? { ...result, data: result.data?.voids ?? [] } : result
  ) as VoidsResult
}
export function createVoidAction(input: AnyInput): Promise<any> {
  return api<any>("/voids", { method: "POST", body: JSON.stringify(input) })
}
export function resolveVoidAction(input: AnyInput): Promise<any> {
  const { voidId, ...body } = input
  return api<any>(`/voids/${String(voidId)}/resolve`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
