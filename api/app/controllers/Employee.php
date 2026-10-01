<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Employee extends Controller
{
    private $api;
    private $employees;
    private $users;
    private $attendance;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->employees = $this->call->model('EmployeeModel');
        $this->users = $this->call->model('UserModel');
        $this->attendance = $this->call->model('AttendanceLogModel');
    }
    #[Get('/employees')] public function index()
    {
        $this->success(['employees' => $this->employees->query()->order_by('employee_number', 'ASC')->get_all() ?: [],'attendance' => []]);
    }
    #[Post('/employees/with-account')] public function create()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->employees->insert(array_merge(['id' => $id], $this->columns($i)));
        $this->success(['employee' => $this->employees->find($id)], 201);
    }
    #[Post('/employees/attendance/rfid')] public function attendance()
    {
        $i = $this->api->body();
        $rows = $this->employees->query()->where('rfid_card_uid', $i['rfidCardUid'] ?? '')->get_all();
        if (!$rows) {
            $this->api->respond_error('RFID card not found.', 404);
        } $id = $this->uuid();
        $this->attendance->insert(['id' => $id,'employee_id' => $rows[0]['id'],'log_date' => date('Y-m-d'),'clock_in' => date('H:i:s'),'method' => 'rfid','rfid_card_uid_used' => $i['rfidCardUid']]);
        $this->success(['attendance' => $this->attendance->find($id)]);
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
