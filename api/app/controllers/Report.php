<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Report extends Controller
{
    private $api;
    private $expenses;
    private $orders;
    private $payments;
    private $orderItems;
    private $users;
    private $categories;
    private $tables;
    private $reservations;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->expenses = $this->call->model('ExpenseModel');
        $this->orders = $this->call->model('OrderModel');
        $this->payments = $this->call->model('PaymentModel');
        $this->orderItems = $this->call->model('OrderItemModel');
        $this->users = $this->call->model('UserModel');
        $this->categories = $this->call->model('ExpenseCategoryModel');
        $this->tables = $this->call->model('RestaurantTableModel');
        $this->reservations = $this->call->model('ReservationModel');
    }
    #[Get('/dashboard')]
    public function dashboard()
    {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        $orders = $this->orders->query()
            ->where_null('admin_hidden_at')
            ->order_by('created_at', 'DESC')
            ->get_all() ?: [];

        $todayOrders = [];
        $yesterdayOrders = [];
        $revenueToday = 0;
        $revenueYesterday = 0;
        $qrOrdersToday = 0;
        $dineInToday = 0;
        $takeoutToday = 0;

        foreach ($orders as $o) {
            $createdDate = substr((string) ($o['created_at'] ?? ''), 0, 10);
            $total = (float) ($o['total'] ?? 0);
            $isPaid = $this->is_reportable_order($o);

            if ($createdDate === $today) {
                $todayOrders[] = $o;
                if ($isPaid) {
                    $revenueToday += $total;
                }
                $type = strtolower((string) ($o['order_type'] ?? ''));
                if ($type === 'qr') {
                    $qrOrdersToday++;
                } elseif ($type === 'takeout' || $type === 'take_out') {
                    $takeoutToday++;
                } else {
                    $dineInToday++;
                }
            } elseif ($createdDate === $yesterday) {
                $yesterdayOrders[] = $o;
                if ($isPaid) {
                    $revenueYesterday += $total;
                }
            }
        }

        $sourceBreakdown = [
            ['source' => 'QR', 'orders' => $qrOrdersToday],
            ['source' => 'Dine-in', 'orders' => $dineInToday],
            ['source' => 'Takeout', 'orders' => $takeoutToday],
        ];

        // Revenue trend for current week (Monday to Sunday)
        $revenueTrend = [];
        $mondayTimestamp = strtotime('monday this week');
        for ($i = 0; $i < 7; $i++) {
            $dayTimestamp = strtotime("+{$i} days", $mondayTimestamp);
            $dayDate = date('Y-m-d', $dayTimestamp);
            $dayLabel = date('D', $dayTimestamp);
            $dayRevenue = 0;
            foreach ($orders as $o) {
                $createdDate = substr((string) ($o['created_at'] ?? ''), 0, 10);
                if ($createdDate === $dayDate && $this->is_reportable_order($o)) {
                    $dayRevenue += (float) ($o['total'] ?? 0);
                }
            }
            $revenueTrend[] = [
                'day' => $dayLabel,
                'revenue' => round($dayRevenue, 2),
            ];
        }

        // Tables
        $allTables = $this->tables->query()->get_all() ?: [];
        $totalTables = count($allTables);
        $occupiedTables = 0;
        foreach ($allTables as $table) {
            $status = strtolower((string) ($table['status'] ?? ''));
            if ($status === 'occupied') {
                $occupiedTables++;
            }
        }

        // Reservations scheduled for today
        $todayReservations = $this->reservations->query()
            ->where('reservation_date', $today)
            ->get_all() ?: [];
        $reservationsTodayCount = 0;
        foreach ($todayReservations as $r) {
            $status = strtolower((string) ($r['status'] ?? ''));
            if (!in_array($status, ['cancelled', 'declined', 'completed', 'no_show'], true)) {
                $reservationsTodayCount++;
            }
        }

        // Live orders (pending, preparing, ready, served)
        $liveOrders = [];
        foreach ($orders as $o) {
            $status = strtolower((string) ($o['status'] ?? ''));
            if (in_array($status, ['pending', 'preparing', 'ready', 'served'])) {
                $orderType = strtolower((string) ($o['order_type'] ?? ''));
                $source = 'Dine-in';
                if ($orderType === 'qr') {
                    $source = 'QR';
                } elseif ($orderType === 'takeout' || $orderType === 'take_out') {
                    $source = 'Takeout';
                }

                $statusMap = [
                    'pending' => 'Pending',
                    'preparing' => 'Preparing',
                    'ready' => 'Ready',
                    'served' => 'Served',
                ];

                $orderNum = !empty($o['order_number'])
                    ? (string) $o['order_number']
                    : ('#' . substr((string) $o['id'], 0, 8));

                $liveOrders[] = [
                    'id' => $orderNum,
                    'source' => $source,
                    'status' => $statusMap[$status] ?? ucfirst($status),
                ];

                if (count($liveOrders) >= 10) {
                    break;
                }
            }
        }

        // Top selling items
        $items = $this->orderItems->query()
            ->select('order_items.quantity, menu_items.name AS item_name')
            ->join('menu_items', 'menu_items.id = order_items.menu_item_id')
            ->get_all() ?: [];

        $salesByItem = [];
        foreach ($items as $item) {
            $name = (string) ($item['item_name'] ?? 'Item');
            $salesByItem[$name] = ($salesByItem[$name] ?? 0) + (int) ($item['quantity'] ?? 0);
        }
        arsort($salesByItem);

        $topItems = [];
        $count = 0;
        foreach ($salesByItem as $name => $sales) {
            $topItems[] = [
                'name' => $name,
                'sales' => $sales,
            ];
            $count++;
            if ($count >= 5) break;
        }

        $this->success([
            'totalOrders' => count($todayOrders),
            'ordersYesterday' => count($yesterdayOrders),
            'revenue' => round($revenueToday, 2),
            'revenueYesterday' => round($revenueYesterday, 2),
            'occupiedTables' => $occupiedTables,
            'totalTables' => $totalTables,
            'reservationsToday' => $reservationsTodayCount,
            'qrOrders' => $qrOrdersToday,
            'revenueTrend' => $revenueTrend,
            'ordersBySource' => $sourceBreakdown,
            'liveOrders' => $liveOrders,
            'topItems' => $topItems,
        ]);
    }

    #[Get('/reports')]
    public function index()
    {
        $orders = $this->orders->query()->order_by('created_at', 'DESC')->get_all() ?: [];
        $payments = $this->payments->query()->get_all() ?: [];
        $expenses = $this->expenses->query()->order_by('expense_date', 'DESC')->get_all() ?: [];
        $categories = $this->categories->query()->get_all() ?: [];
        $users = $this->users->query()->get_all() ?: [];
        $items = $this->orderItems->query()
            ->select('order_items.order_id,order_items.menu_item_id,order_items.quantity,order_items.subtotal,menu_items.name AS item_name,categories.id AS category_id,categories.name AS category_name')
            ->join('menu_items', 'menu_items.id = order_items.menu_item_id')
            ->join('categories', 'categories.id = menu_items.category_id')
            ->get_all() ?: [];

        $paymentsByOrder = [];
        foreach ($payments as $payment) {
            $paymentsByOrder[$payment['order_id']] = $payment;
        }
        $usersById = [];
        foreach ($users as $user) {
            $usersById[$user['id']] = $user;
        }
        $paidOrders = array_values(array_filter($orders, [$this, 'is_reportable_order']));
        $paidOrderIds = array_fill_keys(array_column($paidOrders, 'id'), true);

        $totalRevenue = 0;
        $daily = [];
        $paymentStats = [];
        $orderTypeStats = [];
        $staffStats = [];
        $transactions = [];
        foreach ($paidOrders as $order) {
            $total = (float) ($order['total'] ?? 0);
            $totalRevenue += $total;
            $date = substr((string) ($order['created_at'] ?? ''), 0, 10);
            if ($date !== '') {
                if (!isset($daily[$date])) $daily[$date] = ['date' => $date, 'label' => date('M j', strtotime($date)), 'revenue' => 0, 'orders' => 0, 'avgOrderValue' => 0];
                $daily[$date]['revenue'] += $total;
                $daily[$date]['orders']++;
            }
            $payment = $paymentsByOrder[$order['id']] ?? [];
            $method = $payment['payment_method'] ?? $order['payment_method'] ?? 'other';
            if (!isset($paymentStats[$method])) $paymentStats[$method] = ['method' => $method, 'count' => 0, 'total' => 0];
            $paymentStats[$method]['count']++;
            $paymentStats[$method]['total'] += $total;
            $type = $order['order_type'] ?? 'counter';
            if (!isset($orderTypeStats[$type])) $orderTypeStats[$type] = ['type' => $type, 'count' => 0, 'total' => 0];
            $orderTypeStats[$type]['count']++;
            $orderTypeStats[$type]['total'] += $total;

            $staffId = $order['created_by_staff_id'] ?? 'unassigned';
            if (!isset($staffStats[$staffId])) $staffStats[$staffId] = ['id' => $staffId, 'name' => $usersById[$staffId]['name'] ?? 'Unassigned', 'role' => 'Staff', 'ordersProcessed' => 0, 'totalSales' => 0, 'avgHandlingTime' => 'N/A', 'voidRate' => 0];
            $staffStats[$staffId]['ordersProcessed']++;
            $staffStats[$staffId]['totalSales'] += $total;
            $customer = !empty($order['customer_id']) ? 'Registered customer' : 'Walk-in customer';
            $transactions[] = [
                'id' => (string) $order['id'], 'date' => date('M j, Y', strtotime($order['created_at'])), 'time' => date('g:i A', strtotime($order['created_at'])),
                'orderNumber' => $order['order_number'], 'type' => $type, 'tableNumber' => null, 'customer' => $customer,
                'items' => 0, 'subtotal' => (float) $order['subtotal'], 'discount' => (float) ($order['discount'] ?? 0), 'tax' => (float) ($order['tax'] ?? 0),
                'total' => $total, 'paymentMethod' => $method, 'receiptNumber' => $payment['receipt_number'] ?? '-',
                'staffName' => $usersById[$staffId]['name'] ?? 'Unassigned', 'status' => (($order['status'] ?? '') === 'cancelled' ? 'voided' : 'completed'),
            ];
        }
        foreach ($daily as &$day) $day['avgOrderValue'] = $day['orders'] ? round($day['revenue'] / $day['orders'], 2) : 0;
        unset($day);
        foreach ($paymentStats as &$stat) $stat['percentage'] = $totalRevenue ? round(($stat['total'] / $totalRevenue) * 100, 1) : 0;
        unset($stat);
        foreach ($orderTypeStats as &$stat) $stat['percentage'] = count($paidOrders) ? round(($stat['count'] / count($paidOrders)) * 100, 1) : 0;
        unset($stat);

        $topItems = [];
        $categoryRevenue = [];
        foreach ($items as $item) {
            if (!isset($paidOrderIds[$item['order_id']])) continue;
            $itemId = $item['menu_item_id'];
            if (!isset($topItems[$itemId])) $topItems[$itemId] = ['id' => $itemId, 'name' => $item['item_name'], 'category' => $item['category_name'], 'quantitySold' => 0, 'revenue' => 0, 'trend' => 'flat', 'trendPercent' => 0];
            $topItems[$itemId]['quantitySold'] += (int) $item['quantity'];
            $topItems[$itemId]['revenue'] += (float) $item['subtotal'];
            $categoryId = $item['category_id'];
            if (!isset($categoryRevenue[$categoryId])) $categoryRevenue[$categoryId] = ['categoryId' => $categoryId, 'category' => $item['category_name'], 'revenue' => 0, 'quantitySold' => 0];
            $categoryRevenue[$categoryId]['revenue'] += (float) $item['subtotal'];
            $categoryRevenue[$categoryId]['quantitySold'] += (int) $item['quantity'];
            foreach ($transactions as &$transaction) if ($transaction['id'] === $item['order_id']) $transaction['items'] += (int) $item['quantity'];
            unset($transaction);
        }
        usort($topItems, static fn ($a, $b) => $b['revenue'] <=> $a['revenue']);
        usort($categoryRevenue, static fn ($a, $b) => $b['revenue'] <=> $a['revenue']);

        $totalExpenses = array_sum(array_map(static fn ($expense) => (float) $expense['amount'], $expenses));
        $discountInsights = $this->discount_insights($paidOrderIds);
        $promoInsights = $this->promotion_insights($paidOrderIds);
        $this->success([
            'summary' => ['totalRevenue' => $totalRevenue, 'totalExpenses' => $totalExpenses, 'netProfit' => $totalRevenue - $totalExpenses, 'totalTransactions' => count($paidOrders), 'profitMargin' => $totalRevenue ? round((($totalRevenue - $totalExpenses) / $totalRevenue) * 100, 2) : 0],
            'dailySales' => array_values($daily), 'paymentBreakdown' => array_values($paymentStats), 'orderTypeBreakdown' => array_values($orderTypeStats),
            'transactions' => $transactions, 'topSellingItems' => array_slice(array_values($topItems), 0, 10), 'categoryRevenue' => array_values($categoryRevenue),
            'staffPerformance' => array_values($staffStats), 'discountInsights' => $discountInsights, 'promoInsights' => $promoInsights,
            'expenses' => array_map([$this, 'format_expense'], $expenses), 'categories' => array_map(static fn ($category) => ['id' => $category['id'], 'name' => $category['name']], $categories),
        ]);
    }

    private function is_reportable_order($order)
    {
        return ($order['payment_status'] ?? '') === 'paid' || ($order['status'] ?? '') === 'completed';
    }

    private function format_expense($expense)
    {
        return ['id' => $expense['id'], 'categoryId' => $expense['category_id'], 'description' => $expense['description'], 'amount' => (float) $expense['amount'], 'expenseDate' => $expense['expense_date'], 'receiptReference' => $expense['receipt_reference'] ?? null, 'notes' => $expense['notes'] ?? null, 'recordedByStaffId' => $expense['recorded_by_staff_id'], 'createdAt' => $expense['created_at'] ?? $expense['expense_date']];
    }

    private function discount_insights($paidOrderIds)
    {
        $rows = $this->call->model('OrderDiscountModel')->query()->select('order_discounts.order_id,order_discounts.discount_amount,discount_types.name AS type_name')->join('discount_types', 'discount_types.id = order_discounts.discount_type_id')->get_all() ?: [];
        $result = [];
        foreach ($rows as $row) {
            if (!isset($paidOrderIds[$row['order_id'] ?? ''])) continue;
            $name = $row['type_name'];
            if (!isset($result[$name])) $result[$name] = ['typeName' => $name, 'usageCount' => 0, 'totalDiscount' => 0, 'avgPerOrder' => 0];
            $result[$name]['usageCount']++;
            $result[$name]['totalDiscount'] += (float) $row['discount_amount'];
        }
        foreach ($result as &$row) $row['avgPerOrder'] = $row['usageCount'] ? round($row['totalDiscount'] / $row['usageCount'], 2) : 0;
        return array_values($result);
    }

    private function promotion_insights($paidOrderIds)
    {
        $promotions = $this->call->model('PromotionModel')->query()->get_all() ?: [];
        $usage = $this->call->model('OrderPromotionModel')->query()->get_all() ?: [];
        $result = [];
        foreach ($promotions as $promotion) {
            $rows = array_filter($usage, static fn ($row) => ($row['promotion_id'] ?? '') === $promotion['id'] && isset($paidOrderIds[$row['order_id'] ?? '']));
            $total = array_sum(array_map(static fn ($row) => (float) $row['discount_amount'], $rows));
            $result[] = ['name' => $promotion['name'], 'promoType' => $promotion['promo_type'], 'usageCount' => count($rows), 'usageLimit' => $promotion['usage_limit'] === null ? null : (int) $promotion['usage_limit'], 'totalDiscount' => $total, 'isActive' => (bool) $promotion['is_active']];
        }
        return $result;
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
