<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Employee extends Controller
{
    private $api;
    private $employees;
    private $users;
    private $attendance;
    private $schedules;
    private $payrollPeriods;
    private $payrollRecords;
    private $settings;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->employees = $this->call->model('EmployeeModel');
        $this->users = $this->call->model('UserModel');
        $this->attendance = $this->call->model('AttendanceLogModel');
        $this->schedules = $this->call->model('EmployeeScheduleModel');
        $this->payrollPeriods = $this->call->model('PayrollPeriodModel');
        $this->payrollRecords = $this->call->model('PayrollRecordModel');
        $this->settings = $this->call->model('SystemSettingModel');
    }
    #[Get('/employees')] public function index()
    {
        // Include the linked account fields and return the camelCase shape used
        // by the admin roster. Returning employees alone leaves the UI without
        // a name/email and the snake_case fields are silently read as undefined.
        $rows = $this->employees->query()
            ->select('employees.id, employees.user_id AS userId, employees.employee_number AS employeeNumber, users.name AS name, users.email AS email, users.contact_number AS contactNumber, employees.position AS position, employees.department AS department, employees.rfid_card_uid AS rfidCardUid, employees.date_hired AS dateHired, employees.employment_status AS employmentStatus, employees.basic_salary AS basicSalary, employees.salary_type AS salaryType')
            ->join('users', 'users.id = employees.user_id')
            ->order_by('employees.employee_number', 'ASC')
            ->get_all() ?: [];
        $attendance = $this->attendance->query()
            ->select('attendance_logs.id, attendance_logs.employee_id AS employeeId, users.name AS employeeName, employees.employee_number AS employeeNumber, employees.department AS department, attendance_logs.log_date AS logDate, attendance_logs.clock_in AS clockIn, attendance_logs.clock_out AS clockOut, attendance_logs.total_hours AS totalHours, attendance_logs.late_minutes AS lateMinutes, attendance_logs.overtime_hours AS overtimeHours, attendance_logs.status AS status, attendance_logs.method AS method, attendance_logs.rfid_card_uid_used AS rfidCardUidUsed')
            ->join('employees', 'employees.id = attendance_logs.employee_id')
            ->join('users', 'users.id = employees.user_id')
            ->order_by('attendance_logs.clock_in', 'DESC')
            ->get_all() ?: [];
        $this->success(['employees' => $rows, 'attendance' => $attendance]);
    }
    #[Post('/employees/with-account')] public function create()
    {
        $i = $this->api->body();
        $name = trim((string) ($i['name'] ?? ''));
        $email = strtolower(trim((string) ($i['email'] ?? '')));
        $password = (string) ($i['password'] ?? '');
        $employeeNumber = trim((string) ($i['employeeNumber'] ?? ''));
        $position = trim((string) ($i['position'] ?? ''));
        $dateHired = (string) ($i['dateHired'] ?? '');
        $salaryType = (string) ($i['salaryType'] ?? '');
        $basicSalary = $i['basicSalary'] ?? null;

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            $this->api->respond_error('Enter a name, valid email, and password with at least 8 characters.', 422);
        }
        if ($employeeNumber === '') $employeeNumber = 'EMP-' . strtoupper(bin2hex(random_bytes(3)));
        if (strlen($employeeNumber) > 20 || $position === '' || !in_array($salaryType, ['daily', 'monthly'], true) || !is_numeric($basicSalary) || (float) $basicSalary < 0) {
            $this->api->respond_error('Enter a valid employee number, position, salary, and salary type.', 422);
        }
        $hired = DateTimeImmutable::createFromFormat('!Y-m-d', $dateHired);
        if (!$hired || $hired->format('Y-m-d') !== $dateHired) {
            $this->api->respond_error('Enter a valid hire date.', 422);
        }
        if ($this->users->query()->where('email', $email)->get_all()) {
            $this->api->respond_error('An account with this email already exists.', 409);
        }
        if ($this->employees->query()->where('employee_number', $employeeNumber)->get_all()) {
            $this->api->respond_error('That employee number is already in use.', 409);
        }
        $rfidUid = trim((string) ($i['rfidCardUid'] ?? ''));
        if ($rfidUid !== '' && $this->employees->query()->where('rfid_card_uid', $rfidUid)->get_all()) {
            $this->api->respond_error('That RFID card is already assigned to an employee.', 409);
        }

        $accountRoleName = strcasecmp(trim((string) ($i['department'] ?? '')), 'Cashier') === 0 ? 'Cashier' : 'Staff';
        $roles = $this->call->model('RoleModel')->query()->where('name', $accountRoleName)->get_all() ?: [];
        if (!$roles) $this->api->respond_error('The ' . $accountRoleName . ' role is missing. Run the database migrations first.', 500);

        $userId = $this->uuid();
        $employeeId = $this->uuid();
        $db = lava_instance()->db;
        $db->transaction();
        try {
            $this->users->insert([
                'id' => $userId,
                'role_id' => $roles[0]['id'],
                'email' => $email,
                'password' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'contact_number' => trim((string) ($i['contactNumber'] ?? '')) ?: null,
                'is_active' => 1,
            ]);
            $employee = [
                'id' => $employeeId,
                'user_id' => $userId,
                'employee_number' => $employeeNumber,
                'position' => $position,
                'department' => trim((string) ($i['department'] ?? '')) ?: null,
                'rfid_card_uid' => $rfidUid !== '' ? $rfidUid : null,
                'date_hired' => $dateHired,
                'employment_status' => in_array(($i['employmentStatus'] ?? 'active'), ['active', 'on_leave', 'terminated'], true) ? $i['employmentStatus'] : 'active',
                'basic_salary' => (float) $basicSalary,
                'salary_type' => $salaryType,
            ];
            $this->employees->insert($employee);
            $db->commit();
        } catch (Throwable $error) {
            $db->roll_back();
            throw $error;
        }
        $this->success(['employee' => $employee], 201);
    }
    #[Put('/employees/{id:uuid}')] public function update($id)
    {
        $employee = $this->employees->find($id);
        if (!$employee) $this->api->respond_error('Employee not found.', 404);

        $i = $this->api->body();
        $name = trim((string) ($i['name'] ?? ''));
        $employeeNumber = trim((string) ($i['employeeNumber'] ?? ''));
        $position = trim((string) ($i['position'] ?? ''));
        $salaryType = (string) ($i['salaryType'] ?? '');
        $basicSalary = $i['basicSalary'] ?? null;
        $dateHired = (string) ($i['dateHired'] ?? '');
        $status = (string) ($i['employmentStatus'] ?? '');

        if ($name === '' || $employeeNumber === '' || strlen($employeeNumber) > 20 || $position === '') {
            $this->api->respond_error('Enter a name, employee number, and job position.', 422);
        }
        if (!in_array($salaryType, ['daily', 'monthly'], true) || !is_numeric($basicSalary) || (float) $basicSalary < 0) {
            $this->api->respond_error('Enter a valid salary and salary type.', 422);
        }
        $hired = DateTimeImmutable::createFromFormat('!Y-m-d', $dateHired);
        if (!$hired || $hired->format('Y-m-d') !== $dateHired) {
            $this->api->respond_error('Enter a valid hire date.', 422);
        }
        if (!in_array($status, ['active', 'on_leave', 'terminated'], true)) {
            $this->api->respond_error('Select a valid employment status.', 422);
        }

        $numberMatches = $this->employees->query()->where('employee_number', $employeeNumber)->get_all() ?: [];
        foreach ($numberMatches as $match) {
            if ((string) $match['id'] !== (string) $id) {
                $this->api->respond_error('That employee number is already in use.', 409);
            }
        }
        $rfidUid = trim((string) ($i['rfidCardUid'] ?? ''));
        if ($rfidUid !== '') {
            $uidMatches = $this->employees->query()->where('rfid_card_uid', $rfidUid)->get_all() ?: [];
            foreach ($uidMatches as $match) {
                if ((string) $match['id'] !== (string) $id) {
                    $this->api->respond_error('That RFID card is already assigned to an employee.', 409);
                }
            }
        }

        $userId = $employee['user_id'];
        $db = lava_instance()->db;
        $db->transaction();
        try {
            $this->users->query()->where('id', $userId)->update([
                'name' => $name,
                'contact_number' => trim((string) ($i['contactNumber'] ?? '')) ?: null,
            ]);
            $this->employees->query()->where('id', $id)->update([
                'employee_number' => $employeeNumber,
                'position' => $position,
                'department' => trim((string) ($i['department'] ?? '')) ?: null,
                'rfid_card_uid' => $rfidUid !== '' ? $rfidUid : null,
                'date_hired' => $dateHired,
                'employment_status' => $status,
                'basic_salary' => (float) $basicSalary,
                'salary_type' => $salaryType,
            ]);
            $db->commit();
        } catch (Throwable $error) {
            $db->roll_back();
            throw $error;
        }
        $this->success(['id' => $id]);
    }
    #[Post('/employees/attendance/rfid')] public function attendance()
    {
        $i = $this->api->body();
        $uid = trim((string) ($i['rfidCardUid'] ?? ''));
        if ($uid === '') $this->api->respond_error('RFID card UID is required.', 422);
        $rows = $this->employees->query()->where('rfid_card_uid', $uid)->get_all();
        if (!$rows) $this->api->respond_error('RFID card not found.', 404);

        $employee = $rows[0];
        $now = new DateTimeImmutable('now');
        $today = $now->format('Y-m-d');
        $todayLogs = $this->attendance->query()
            ->where('employee_id', $employee['id'])
            ->where('log_date', $today)
            ->order_by('clock_in', 'ASC')
            ->get_all() ?: [];
        $punchCount = 0;
        foreach ($todayLogs as $log) {
            if (!empty($log['clock_in'])) $punchCount++;
            if (!empty($log['clock_out'])) $punchCount++;
        }
        if ($punchCount >= 4) $this->api->respond_error('All four punches are already recorded for today.', 409);

        $lastLog = $todayLogs ? $todayLogs[count($todayLogs) - 1] : null;
        $clockingOut = $lastLog && empty($lastLog['clock_out']);
        $punchNumber = $punchCount + 1;

        if ($clockingOut) {
            $clockInAt = new DateTimeImmutable($lastLog['clock_in']);
            $workedSeconds = $now->getTimestamp() - $clockInAt->getTimestamp();
            $this->attendance->query()->where('id', $lastLog['id'])->update([
                'clock_out' => $now->format('Y-m-d H:i:s'),
                'total_hours' => round($workedSeconds / 3600, 2),
            ]);
            $action = 'clock_out';
        } else {
            $id = $this->uuid();
            $lateMinutes = 0;
            $status = 'on_time';
            // Only the first IN is checked against the scheduled shift start.
            // The later IN is the return from the break and has no separate
            // start time in the current schedule model.
            if ($punchCount === 0) {
                $scheduleRows = $this->schedules->query()
                    ->where('user_id', $employee['user_id'])
                    ->where('shift_date', $today)
                    ->order_by('start_time', 'ASC')
                    ->get_all() ?: [];
                if ($scheduleRows) {
                    $startTime = substr((string) $scheduleRows[0]['start_time'], 0, 8);
                    $scheduledStart = new DateTimeImmutable($today . ' ' . $startTime);
                    $lateSeconds = $now->getTimestamp() - $scheduledStart->getTimestamp();
                    if ($lateSeconds > 0) {
                        $lateMinutes = (int) ceil($lateSeconds / 60);
                        $status = 'late';
                    }
                }
            }
            $this->attendance->insert([
                'id' => $id,
                'employee_id' => $employee['id'],
                'log_date' => $today,
                'clock_in' => $now->format('Y-m-d H:i:s'),
                'late_minutes' => $lateMinutes,
                'status' => $status,
                'method' => 'rfid',
                'rfid_card_uid_used' => $uid,
            ]);
            $action = 'clock_in';
        }

        $this->success([
            'action' => $action,
            'punchNumber' => $punchNumber,
            'lateMinutes' => $action === 'clock_in' && isset($lateMinutes) ? $lateMinutes : 0,
            'timestamp' => $now->format(DATE_ATOM),
            'employee' => [
                'id' => $employee['id'],
                'name' => $this->users->find($employee['user_id'])['name'] ?? 'Employee',
            ],
            'rfidCardUid' => $uid,
        ]);
    }
    #[Get('/employees/schedules')] public function schedules_index()
    {
        $rows = $this->schedules->query()
            ->select('employee_schedules.id, employee_schedules.user_id AS userId, users.name AS employeeName, employees.position AS position, employees.department AS department, employee_schedules.shift_date AS shiftDate, employee_schedules.start_time AS startTime, employee_schedules.end_time AS endTime')
            ->join('users', 'users.id = employee_schedules.user_id')
            ->join('employees', 'employees.user_id = employee_schedules.user_id')
            ->order_by('employee_schedules.shift_date', 'ASC')
            ->get_all() ?: [];
        $this->success(['schedules' => $rows]);
    }
    #[Post('/employees/schedules')] public function schedules_create()
    {
        $i = $this->api->body();
        $employeeId = (string) ($i['employeeId'] ?? '');
        $shiftDates = $i['shiftDates'] ?? [];
        $startTime = (string) ($i['startTime'] ?? '');
        $endTime = (string) ($i['endTime'] ?? '');
        if (!$employeeId || !is_array($shiftDates) || !$shiftDates || count($shiftDates) > 366 || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $startTime) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $endTime) || $startTime >= $endTime) {
            $this->api->respond_error('Choose a valid employee, schedule date, and time range.', 422);
        }
        $employee = $this->employees->find($employeeId);
        if (!$employee || empty($employee['user_id'])) $this->api->respond_error('Employee account not found. Refresh the employee list and try again.', 404);
        foreach ($shiftDates as $shiftDate) {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', (string) $shiftDate);
            if (!$date || $date->format('Y-m-d') !== $shiftDate) {
                $this->api->respond_error('The schedule contains an invalid date.', 422);
            }
        }
        $db = lava_instance()->db;
        $db->transaction();
        try {
            foreach (array_unique($shiftDates) as $shiftDate) {
                $this->schedules->insert([
                    'id' => $this->uuid(),
                    'user_id' => $employee['user_id'],
                    'shift_date' => $shiftDate,
                    'start_time' => strlen($startTime) === 5 ? $startTime . ':00' : $startTime,
                    'end_time' => strlen($endTime) === 5 ? $endTime . ':00' : $endTime,
                ]);
            }
            $db->commit();
        } catch (Throwable $error) {
            $db->roll_back();
            throw $error;
        }
        $this->success(['message' => 'Schedule saved.', 'count' => count(array_unique($shiftDates))], 201);
    }
    #[Put('/employees/schedules/{id:uuid}')] public function schedules_update($id)
    {
        $schedule = $this->schedules->find($id);
        if (!$schedule) $this->api->respond_error('Schedule not found.', 404);
        $i = $this->api->body();
        $shiftDate = (string) ($i['shiftDate'] ?? '');
        $startTime = (string) ($i['startTime'] ?? '');
        $endTime = (string) ($i['endTime'] ?? '');
        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $shiftDate);
        if (!$date || $date->format('Y-m-d') !== $shiftDate || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $startTime) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $endTime) || $startTime >= $endTime) {
            $this->api->respond_error('Choose a valid schedule date and time range.', 422);
        }
        $this->schedules->query()->where('id', $id)->update([
            'shift_date' => $shiftDate,
            'start_time' => strlen($startTime) === 5 ? $startTime . ':00' : $startTime,
            'end_time' => strlen($endTime) === 5 ? $endTime . ':00' : $endTime,
        ]);
        $this->success(['message' => 'Schedule updated.']);
    }
    #[Delete('/employees/schedules/{id:uuid}')] public function schedules_delete($id)
    {
        if (!$this->schedules->find($id)) $this->api->respond_error('Schedule not found.', 404);
        $this->schedules->query()->where('id', $id)->delete();
        $this->success(['message' => 'Schedule deleted.']);
    }
    #[Get('/employees/payroll')] public function payroll_index()
    {
        $periodStart = (string) ($_GET['periodStart'] ?? '');
        $periodEnd = (string) ($_GET['periodEnd'] ?? '');
        $start = DateTimeImmutable::createFromFormat('!Y-m-d', $periodStart);
        $end = DateTimeImmutable::createFromFormat('!Y-m-d', $periodEnd);
        if (!$start || !$end || $start->format('Y-m-d') !== $periodStart || $end->format('Y-m-d') !== $periodEnd || $periodEnd < $periodStart) {
            $this->api->respond_error('Choose a valid payroll period.', 422);
        }
        $periods = $this->payrollPeriods->query()
            ->where('period_start', $periodStart)
            ->where('period_end', $periodEnd)
            ->get_all() ?: [];
        if (!$periods) {
            $this->success(['payroll' => []]);
        }
        $period = $periods[0];
        $savedRecords = $this->payrollRecords->query()->where('payroll_period_id', $period['id'])->get_all() ?: [];
        $attendance = $this->attendance->query()->get_all() ?: [];
        $payroll = [];
        foreach ($savedRecords as $record) {
            $employee = $this->employees->find($record['employee_id']);
            if (!$employee) continue;
            $user = $this->users->find($employee['user_id']);
            $hoursByDay = [];
            foreach ($attendance as $log) {
                $logDate = (string) ($log['log_date'] ?? '');
                if ($log['employee_id'] !== $employee['id'] || $logDate < $periodStart || $logDate > $periodEnd || $log['total_hours'] === null) continue;
                $hoursByDay[$logDate] = ($hoursByDay[$logDate] ?? 0) + (float) $log['total_hours'];
            }
            $regularHours = 0.0;
            $overtimeHours = 0.0;
            foreach ($hoursByDay as $dayHours) {
                $regularHours += min($dayHours, 8);
                $overtimeHours += max($dayHours - 8, 0);
            }
            $dailyRate = ($employee['salary_type'] ?? '') === 'daily'
                ? (float) $employee['basic_salary']
                : (float) $employee['basic_salary'] / 26;
            $hourlyRate = $dailyRate / 8;
            $basicPay = round($regularHours * $hourlyRate, 2);
            $overtimePay = round($overtimeHours * $hourlyRate * 1.25, 2);
            $payroll[] = [
                'id' => $record['id'],
                'employeeId' => $employee['id'],
                'employeeName' => $user['name'] ?? 'Employee',
                'employeeNumber' => $employee['employee_number'],
                'position' => $employee['position'],
                'department' => $employee['department'] ?? 'Unassigned',
                'periodStart' => $periodStart,
                'periodEnd' => $periodEnd,
                'daysWorked' => count(array_filter($hoursByDay, static fn($hours) => $hours > 0)),
                'regularHours' => round($regularHours, 2),
                'overtimeHours' => round($overtimeHours, 2),
                'basicPay' => $basicPay,
                'overtimePay' => $overtimePay,
                'grossPay' => (float) $record['gross_pay'],
                'deductions' => [
                    'sss' => (float) ($record['sss_employee_deduction'] ?? 0),
                    'philHealth' => (float) ($record['philhealth_employee_deduction'] ?? 0),
                    'pagIbig' => (float) ($record['pagibig_employee_deduction'] ?? 0),
                    'tardiness' => 0,
                    'cashAdvance' => 0,
                    'total' => (float) $record['total_deductions'],
                ],
                'employerContributions' => [
                    'sss' => (float) ($record['sss_employer_contribution'] ?? 0),
                    'philHealth' => (float) ($record['philhealth_employer_contribution'] ?? 0),
                    'pagIbig' => (float) ($record['pagibig_employer_contribution'] ?? 0),
                    'total' => round(
                        (float) ($record['sss_employer_contribution'] ?? 0) +
                        (float) ($record['philhealth_employer_contribution'] ?? 0) +
                        (float) ($record['pagibig_employer_contribution'] ?? 0),
                        2
                    ),
                ],
                'netPay' => (float) $record['net_pay'],
                'status' => $period['status'] === 'closed' ? 'paid' : 'pending',
            ];
        }
        $this->success(['payroll' => $payroll]);
    }
    #[Post('/employees/payroll/compute')] public function payroll_compute()
    {
        $i = $this->api->body();
        $periodStart = (string) ($i['periodStart'] ?? '');
        $periodEnd = (string) ($i['periodEnd'] ?? '');
        $start = DateTimeImmutable::createFromFormat('!Y-m-d', $periodStart);
        $end = DateTimeImmutable::createFromFormat('!Y-m-d', $periodEnd);
        if (!$start || !$end || $start->format('Y-m-d') !== $periodStart || $end->format('Y-m-d') !== $periodEnd || $periodEnd < $periodStart) {
            $this->api->respond_error('Choose a valid payroll period.', 422);
        }
        $claims = $this->api->validate_jwt($this->api->get_bearer_token() ?? '');
        $processedBy = (string) ($claims['sub'] ?? '');
        if ($processedBy === '') $this->api->respond_error('Admin sign-in is required.', 401);

        $existingPeriods = $this->payrollPeriods->query()
            ->where('period_start', $periodStart)
            ->where('period_end', $periodEnd)
            ->get_all() ?: [];
        $period = $existingPeriods[0] ?? null;
        if ($period && $period['status'] === 'closed') {
            $this->api->respond_error('This payroll period is closed and cannot be recomputed.', 409);
        }

        $employees = $this->employees->query()->get_all() ?: [];
        $attendance = $this->attendance->query()->get_all() ?: [];
        $settingRows = $this->settings->query()->get_all() ?: [];
        $contributionSettings = $settingRows[0] ?? [];
        $db = lava_instance()->db;
        $db->transaction();
        try {
            if (!$period) {
                $periodId = $this->uuid();
                $this->payrollPeriods->insert([
                    'id' => $periodId,
                    'period_start' => $periodStart,
                    'period_end' => $periodEnd,
                    'status' => 'open',
                ]);
            } else {
                $periodId = $period['id'];
            }

            $payroll = [];
            foreach ($employees as $employee) {
                $hoursByDay = [];
                foreach ($attendance as $log) {
                    $logDate = (string) ($log['log_date'] ?? '');
                    if ($log['employee_id'] !== $employee['id'] || $logDate < $periodStart || $logDate > $periodEnd || $log['total_hours'] === null) continue;
                    $hoursByDay[$logDate] = ($hoursByDay[$logDate] ?? 0) + (float) $log['total_hours'];
                }
                $regularHours = 0.0;
                $overtimeHours = 0.0;
                foreach ($hoursByDay as $dayHours) {
                    $regularHours += min($dayHours, 8);
                    $overtimeHours += max($dayHours - 8, 0);
                }
                $dailyRate = ($employee['salary_type'] ?? '') === 'daily'
                    ? (float) $employee['basic_salary']
                    : (float) $employee['basic_salary'] / 26;
                $hourlyRate = $dailyRate / 8;
                $basicPay = round($regularHours * $hourlyRate, 2);
                $overtimePay = round($overtimeHours * $hourlyRate * 1.25, 2);
                $grossPay = round($basicPay + $overtimePay, 2);
                $sssEmployee = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['sss_employee_monthly_amount'] ?? 750)
                );
                $sssEmployer = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['sss_employer_monthly_amount'] ?? 750)
                );
                $philhealthEmployee = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['philhealth_employee_monthly_amount'] ?? 200)
                );
                $philhealthEmployer = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['philhealth_employer_monthly_amount'] ?? 200)
                );
                $pagibigEmployee = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['pagibig_employee_monthly_amount'] ?? 150)
                );
                $pagibigEmployer = $this->fixed_period_contribution(
                    $grossPay,
                    (float) ($contributionSettings['pagibig_employer_monthly_amount'] ?? 150)
                );
                $totalDeductions = round($sssEmployee + $philhealthEmployee + $pagibigEmployee, 2);
                $netPay = round($grossPay - $totalDeductions, 2);
                $records = $this->payrollRecords->query()
                    ->where('employee_id', $employee['id'])
                    ->where('payroll_period_id', $periodId)
                    ->get_all() ?: [];
                $recordId = $records[0]['id'] ?? $this->uuid();
                $recordData = [
                    'gross_pay' => $grossPay,
                    'total_deductions' => $totalDeductions,
                    'net_pay' => $netPay,
                    'sss_employee_deduction' => $sssEmployee,
                    'sss_employer_contribution' => $sssEmployer,
                    'philhealth_employee_deduction' => $philhealthEmployee,
                    'philhealth_employer_contribution' => $philhealthEmployer,
                    'pagibig_employee_deduction' => $pagibigEmployee,
                    'pagibig_employer_contribution' => $pagibigEmployer,
                ];
                if ($records) {
                    $this->payrollRecords->query()->where('id', $recordId)->update(array_merge($recordData, ['processed_at' => date('Y-m-d H:i:s')]));
                } else {
                    $this->payrollRecords->insert(array_merge($recordData, [
                        'id' => $recordId,
                        'employee_id' => $employee['id'],
                        'payroll_period_id' => $periodId,
                        'processed_by_staff_id' => $processedBy,
                    ]));
                }
                $user = $this->users->find($employee['user_id']);
                $payroll[] = [
                    'id' => $recordId,
                    'employeeId' => $employee['id'],
                    'employeeName' => $user['name'] ?? 'Employee',
                    'employeeNumber' => $employee['employee_number'],
                    'position' => $employee['position'],
                    'department' => $employee['department'] ?? 'Unassigned',
                    'periodStart' => $periodStart,
                    'periodEnd' => $periodEnd,
                    'daysWorked' => count(array_filter($hoursByDay, static fn($hours) => $hours > 0)),
                    'regularHours' => round($regularHours, 2),
                    'overtimeHours' => round($overtimeHours, 2),
                    'basicPay' => $basicPay,
                    'overtimePay' => $overtimePay,
                    'grossPay' => $grossPay,
                    'deductions' => ['sss' => $sssEmployee, 'philHealth' => $philhealthEmployee, 'pagIbig' => $pagibigEmployee, 'tardiness' => 0, 'cashAdvance' => 0, 'total' => $totalDeductions],
                    'employerContributions' => [
                        'sss' => $sssEmployer,
                        'philHealth' => $philhealthEmployer,
                        'pagIbig' => $pagibigEmployer,
                        'total' => round($sssEmployer + $philhealthEmployer + $pagibigEmployer, 2),
                    ],
                    'netPay' => $netPay,
                    'status' => 'pending',
                ];
            }
            $db->commit();
        } catch (Throwable $error) {
            $db->roll_back();
            throw $error;
        }
        $this->success(['periodId' => $periodId, 'payroll' => $payroll], 201);
    }
    private function columns($i)
    {
        $m = ['userId' => 'user_id','employeeNumber' => 'employee_number','position' => 'position','department' => 'department','rfidCardUid' => 'rfid_card_uid','dateHired' => 'date_hired','dateTerminated' => 'date_terminated','employmentStatus' => 'employment_status','basicSalary' => 'basic_salary','salaryType' => 'salary_type'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function fixed_period_contribution($periodGross, $fixedAmount)
    {
        if ($periodGross <= 0 || $fixedAmount <= 0) return 0.0;
        // The configured fixed amount applies to each payroll period.
        return round($fixedAmount, 2);
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true,'data' => $d], $s);
    }
}
