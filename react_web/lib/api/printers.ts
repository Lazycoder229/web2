import { api } from "./client"

type AnyInput = Record<string, unknown>
type PrintersResult = { success: boolean; data: any[]; error?: string }

export async function fetchPrinters(): Promise<PrintersResult> {
  const result = await api<any>("/printers")
  return (
    result.success ? { ...result, data: result.data?.printers ?? [] } : result
  ) as PrintersResult
}
export function createPrinterAction(input: AnyInput): Promise<any> {
  return api<any>("/printers", { method: "POST", body: JSON.stringify(input) })
}
export function updatePrinterAction(input: AnyInput): Promise<any> {
  const { id, ...body } = input
  return api<any>(`/printers/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deletePrinterAction(id: string): Promise<any> {
  return api<any>(`/printers/${id}`, { method: "DELETE" })
}
