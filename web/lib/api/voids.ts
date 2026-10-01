import { api } from "./client"

type AnyInput = Record<string, unknown>
type VoidsResult = { success: boolean; data: any[]; error?: string }

export function fetchVoids(): Promise<VoidsResult> {
  return api<any>("/voids") as Promise<VoidsResult>
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
