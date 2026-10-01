<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Report extends Controller
{
    private $api;
    private $expenses;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->expenses = $this->call->model('ExpenseModel');
    }
    #[Get('/reports')] public function index()
    {
        $this->success(['sales' => [],'expenses' => $this->expenses->query()->order_by('expense_date', 'DESC')->get_all() ?: [],'insights' => [],'transactions' => []]);
    }
    #[Post('/expenses')] public function expense()
    {
        $i = $this->api->body();
        $id = $this->uuid();
        $this->expenses->insert(array_merge(['id' => $id], $this->columns($i)));
        $this->success(['expense' => $this->expenses->find($id)], 201);
    }
    private function columns($i)
    {
        $m = ['categoryId' => 'category_id','description' => 'description','amount' => 'amount','expenseDate' => 'expense_date','receiptReference' => 'receipt_reference','notes' => 'notes','recordedByStaffId' => 'recorded_by_staff_id'];
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
