<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Reservation extends Controller
{
    private $api;
    private $reservations;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->reservations = $this->call->model('ReservationModel');
    }
    #[Get('/reservations')] public function index()
    {
        $rows = $this->reservations->query()->order_by('reservation_date', 'DESC')->get_all();
        $this->success(['reservations' => array_map([$this,'format'], $rows ?: [])]);
    }
    #[Post('/reservations')] public function create()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $this->reservations->insert(array_merge(['id' => $id], $this->columns($input)));
        $this->success(['reservation' => $this->format($this->reservations->find($id))], 201);
    }
    #[Put('/reservations/{id:uuid}')] public function update($id)
    {
        if (!$this->reservations->find($id)) {
            $this->api->respond_error('Reservation not found.', 404);
        } $this->reservations->query()->where('id', $id)->update($this->columns($this->api->body()));
        $this->success(['reservation' => $this->format($this->reservations->find($id))]);
    }
    #[Delete('/reservations/{id:uuid}')] public function delete($id)
    {
        $this->reservations->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    private function columns($i)
    {
        $m = ['customerId' => 'customer_id','customerName' => 'customer_name','contactNumber' => 'contact_number','email' => 'email','tableId' => 'table_id','reservationDate' => 'reservation_date','reservationTime' => 'reservation_time','numberOfGuests' => 'number_of_guests','status' => 'status','notes' => 'notes','createdByStaffId' => 'created_by_staff_id'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function format($r)
    {
        return ['id' => (string)$r['id'],'customerId' => $r['customer_id'],'customerName' => $r['customer_name'],'contactNumber' => $r['contact_number'],'email' => $r['email'],'tableId' => $r['table_id'],'table' => null,'reservationDate' => $r['reservation_date'],'reservationTime' => $r['reservation_time'],'numberOfGuests' => (int)$r['number_of_guests'],'status' => $r['status'],'notes' => $r['notes'],'createdByStaffId' => $r['created_by_staff_id']];
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
