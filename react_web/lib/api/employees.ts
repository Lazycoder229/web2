import { api } from "./client"

type AnyInput = Record<string, unknown>
type EmployeeResult = {
  success: boolean
  data: { employees: any[]; attendance?: any[] }
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
export function updateEmployeeAction(id: string, input: AnyInput): Promise<any> {
  return api<any>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}
export function rfidTapAttendanceAction(input: AnyInput): Promise<any> {
  return api<any>("/employees/attendance/rfid", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function fetchEmployeeSchedulesAction(): Promise<any> {
  return api<any>("/employees/schedules", { cache: "no-store" })
}
export function createEmployeeScheduleAction(input: AnyInput): Promise<any> {
  return api<any>("/employees/schedules", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function updateEmployeeScheduleAction(id: string, input: AnyInput): Promise<any> {
  return api<any>(`/employees/schedules/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  })
}
export function deleteEmployeeScheduleAction(id: string): Promise<any> {
  return api<any>(`/employees/schedules/${id}`, { method: "DELETE" })
}
export function computeEmployeePayrollAction(input: AnyInput): Promise<any> {
  return api<any>("/employees/payroll/compute", {
    method: "POST",
    body: JSON.stringify(input),
  })
}
export function fetchEmployeePayrollAction(periodStart: string, periodEnd: string): Promise<any> {
  const params = new URLSearchParams({ periodStart, periodEnd })
  return api<any>(`/employees/payroll?${params.toString()}`, { cache: "no-store" })
}
