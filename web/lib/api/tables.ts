import { api } from "./client"

type AnyInput = Record<string, unknown>

export async function fetchTables(): Promise<any> {
  const result = await api<any>("/tables")
  return result.success
    ? { ...result, data: result.data?.tables ?? [] }
    : result
}
export function createTableAction(input: AnyInput): Promise<any> {
  return api<any>("/tables", { method: "POST", body: JSON.stringify(input) })
}
export function updateTableAction(input: AnyInput): Promise<any> {
  const { id, ...body } = input
  return api<any>(`/tables/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deleteTableAction(id: string): Promise<any> {
  return api<any>(`/tables/${id}`, { method: "DELETE" })
}
