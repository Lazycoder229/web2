import { api } from "./client"

type AnyInput = Record<string, unknown>

export async function fetchReservations(): Promise<any> {
  const result = await api<any>("/reservations")
  return result.success
    ? {
        ...result,
        data: result.data?.reservations ?? [],
        customers: result.data?.customers ?? [],
        tables: result.data?.tables ?? [],
        staff: result.data?.staff ?? [],
      }
    : result
}

export async function fetchReservationTables(): Promise<any> {
  const result = await api<any>("/tables")
  return result.success ? result.data?.tables ?? [] : []
}

export function createReservationAction(input: AnyInput): Promise<any> {
  return api<any>("/reservations", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updateReservationAction(input: AnyInput): Promise<any> {
  const { id, ...body } = input
  return api<any>(`/reservations/${String(id)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}
export function deleteReservationAction(id: string): Promise<any> {
  return api<any>(`/reservations/${id}`, { method: "DELETE" })
}
