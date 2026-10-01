import { api } from "./client"

type AnyInput = Record<string, unknown>
type EmployeeResult = {
  success: boolean
  data: { employees: any[]; attendanceLogs: any[] }
  error?: string
}

export function fetchEmployeesData(): Promise<EmployeeResult> {
  return api<any>("/employees") as Promise<EmployeeResult>
}
export function createEmployeeAction(input: AnyInput): Promise<any> {
  return api<any>("/employees", { method: "POST", body: JSON.stringify(input) })
}
export function createEmployeeWithAccountAction(input: AnyInput): Promise<any> {
  return api<any>("/employees/with-account", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function rfidTapAttendanceAction(input: AnyInput): Promise<any> {
  return api<any>("/employees/attendance/rfid", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
