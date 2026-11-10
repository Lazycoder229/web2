<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Reservation extends Controller
{
    private $api;
    private $reservations;
    private $tables;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->reservations = $this->call->model('ReservationModel');
        $this->tables = $this->call->model('RestaurantTableModel');
    }
    #[Get('/reservations')] public function index()
    {
        $rows = $this->reservations->query()->order_by('reservation_date', 'DESC')->get_all();
        $tableRows = $this->tables->query()->order_by('table_number', 'ASC')->get_all() ?: [];
        $tableMap = [];
        foreach ($tableRows as $table) {
            $tableMap[$table['id']] = $table;
        }
        $this->success([
            'reservations' => array_map(
                function ($row) use ($tableMap) {
                    return $this->format($row, $tableMap);
                },
                $rows ?: []
            ),
            'tables' => array_map(function ($table) {
                return [
                    'id' => (string) $table['id'],
                    'tableNumber' => (string) $table['table_number'],
                    'capacity' => (int) $table['capacity'],
                ];
            }, $tableRows),
        ]);
    }
    #[Post('/reservations')] public function create()
    {
        $input = $this->api->body();
        $columns = $this->columns($input);
        if ($this->reservations->isPastSlot(
            (string) ($columns['reservation_date'] ?? ''),
            (string) ($columns['reservation_time'] ?? '')
        )) {
            $this->api->respond_error('Reservations must be scheduled for a future date and time.', 422);
        }
        $columns['reservation_end_time'] = $columns['reservation_end_time']
            ?? $this->reservations->defaultEndTime((string) ($columns['reservation_time'] ?? ''));
        if (!$this->reservations->isValidTimeRange(
            (string) ($columns['reservation_time'] ?? ''),
            (string) ($columns['reservation_end_time'] ?? '')
        )) {
            $this->api->respond_error('Out time must be later than the reservation time.', 422);
        }
        if ($this->reservations->hasConflict(
            (string) ($columns['reservation_date'] ?? ''),
            (string) ($columns['reservation_time'] ?? ''),
            $columns['table_id'] ?? null,
            null,
            (string) ($columns['status'] ?? 'pending'),
            (string) $columns['reservation_end_time']
        )) {
            $message = !empty($columns['table_id'])
                ? 'This table is already reserved for the selected date and time.'
                : 'This date and time is already reserved.';
            $this->api->respond_error($message, 409);
        }
        $id = $this->uuid();
        $this->reservations->insert(array_merge(['id' => $id], $columns));
        $this->success(['reservation' => $this->format($this->reservations->find($id))], 201);
    }
    #[Put('/reservations/{id:uuid}')] public function update($id)
    {
        $existing = $this->reservations->find($id);
        if (!$existing) {
            $this->api->respond_error('Reservation not found.', 404);
        }
        $columns = array_merge($existing, $this->columns($this->api->body()));
        if ($this->reservations->isPastSlot(
            (string) ($columns['reservation_date'] ?? ''),
            (string) ($columns['reservation_time'] ?? '')
        )) {
            $this->api->respond_error('Reservations must be scheduled for a future date and time.', 422);
        }
        $columns['reservation_end_time'] = $columns['reservation_end_time']
            ?: $this->reservations->defaultEndTime((string) ($columns['reservation_time'] ?? ''));
        if (!$this->reservations->isValidTimeRange(
            (string) ($columns['reservation_time'] ?? ''),
            (string) ($columns['reservation_end_time'] ?? '')
        )) {
            $this->api->respond_error('Out time must be later than the reservation time.', 422);
        }
        if ($this->reservations->hasConflict(
            (string) ($columns['reservation_date'] ?? ''),
            (string) ($columns['reservation_time'] ?? ''),
            $columns['table_id'] ?? null,
            (string) $id,
            (string) ($columns['status'] ?? 'pending'),
            (string) $columns['reservation_end_time']
        )) {
            $message = !empty($columns['table_id'])
                ? 'This table is already reserved for the selected date and time.'
                : 'This date and time is already reserved.';
            $this->api->respond_error($message, 409);
        }
        $updateColumns = $this->columns($this->api->body());
        if (!array_key_exists('reservation_end_time', $updateColumns)) {
            $updateColumns['reservation_end_time'] = $columns['reservation_end_time'];
        }
        $this->reservations->query()->where('id', $id)->update($updateColumns);
        $this->success(['reservation' => $this->format($this->reservations->find($id))]);
    }
    #[Delete('/reservations/{id:uuid}')] public function delete($id)
    {
        $this->reservations->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    private function columns($i)
    {
        $m = ['customerId' => 'customer_id','customerName' => 'customer_name','contactNumber' => 'contact_number','email' => 'email','tableId' => 'table_id','reservationDate' => 'reservation_date','reservationTime' => 'reservation_time','reservationEndTime' => 'reservation_end_time','numberOfGuests' => 'number_of_guests','status' => 'status','notes' => 'notes','createdByStaffId' => 'created_by_staff_id'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function format($r, $tableMap = [])
    {
        $table = $r['table_id'] && isset($tableMap[$r['table_id']])
            ? $tableMap[$r['table_id']]
            : null;
        return ['id' => (string)$r['id'],'customerId' => $r['customer_id'],'customerName' => $r['customer_name'],'contactNumber' => $r['contact_number'],'email' => $r['email'],'tableId' => $r['table_id'],'table' => $table ? 'Table ' . $table['table_number'] : null,'reservationDate' => $r['reservation_date'],'reservationTime' => $r['reservation_time'],'reservationEndTime' => $r['reservation_end_time'] ?? null,'numberOfGuests' => (int)$r['number_of_guests'],'status' => $r['status'],'notes' => $r['notes'],'createdByStaffId' => $r['created_by_staff_id']];
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
