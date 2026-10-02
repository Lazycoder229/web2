<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api')]
class Setting extends Controller
{
    private $api;
    private $settings;
    private $loyalty;
    private $rewards;

    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->settings = $this->call->model('SystemSettingModel');
        $this->loyalty = $this->call->model('LoyaltySettingModel');
        $this->rewards = $this->call->model('LoyaltyRewardModel');
    }

    #[Get('/settings')]
    public function index()
    {
        $rows = $this->settings->query()->get_all();
        $this->success($this->format_settings($rows[0] ?? []));
    }

    #[Put('/settings', middleware: ['admin_auth'])]
    public function update()
    {
        $rows = $this->settings->query()->get_all();
        $data = $this->settings_columns($this->api->body());

        if ($rows) {
            $this->settings->query()->where('id', $rows[0]['id'])->update($data);
        } else {
            $data['id'] = $this->uuid();
            $this->settings->insert($data);
        }

        $updated = $this->settings->query()->get_all();
        $this->success($this->format_settings($updated[0] ?? $data));
    }

    #[Get('/settings/loyalty')]
    public function loyalty()
    {
        $rows = $this->loyalty->query()->get_all();
        $this->success($rows[0] ?? []);
    }

    #[Put('/settings/loyalty', middleware: ['admin_auth'])]
    public function update_loyalty()
    {
        $rows = $this->loyalty->query()->get_all();
        $data = $this->loyalty_columns($this->api->body());

        if ($rows) {
            $this->loyalty->query()->where('id', $rows[0]['id'])->update($data);
        } else {
            $data['id'] = $this->uuid();
            $this->loyalty->insert($data);
        }

        $updated = $this->loyalty->query()->get_all();
        $this->success($updated[0] ?? $data);
    }

    #[Get('/settings/loyalty/rewards')]
    public function rewards()
    {
        $rows = $this->rewards->query()->get_all();
        $this->success(['rewards' => array_map([$this, 'format_reward'], $rows ?: [])]);
    }

    #[Post('/settings/loyalty/rewards', middleware: ['admin_auth'])]
    public function create_reward()
    {
        $id = $this->uuid();
        $data = array_merge(['id' => $id], $this->reward_columns($this->api->body()));
        $this->rewards->insert($data);
        $this->success(['reward' => $this->format_reward($this->rewards->find($id))], 201);
    }

    #[Put('/settings/loyalty/rewards/{id:uuid}', middleware: ['admin_auth'])]
    public function update_reward($id)
    {
        $this->rewards->query()->where('id', $id)->update($this->reward_columns($this->api->body()));
        $this->success(['reward' => $this->format_reward($this->rewards->find($id))]);
    }

    #[Get('/settings/loyalty/redemptions', middleware: ['admin_auth'])]
    public function loyalty_redemptions()
    {
        $rows = $this->call->model('LoyaltyTransactionModel')->query()
            ->select('loyalty_transactions.id,loyalty_transactions.reward_name,loyalty_transactions.points,loyalty_transactions.balance_after,loyalty_transactions.created_at,customers.id AS customer_id,customers.name AS customer_name,customers.email AS customer_email')
            ->join('customers', 'customers.id = loyalty_transactions.customer_id')
            ->where('loyalty_transactions.type', 'redeem')
            ->order_by('loyalty_transactions.created_at', 'DESC')
            ->limit(50)
            ->get_all();
        $this->success(['redemptions' => $rows ?: []]);
    }

    private function settings_columns($input)
    {
        $columns = [];
        foreach ($input as $key => $value) {
            $column = preg_replace('/([A-Z])/', '_$1', lcfirst($key));
            $columns[$column] = $value;
        }
        return $columns;
    }

    private function loyalty_columns($input)
    {
        return [
            'points_per_peso' => $input['pointsPerPeso'] ?? 0,
            'peso_value_per_point' => $input['pesoValuePerPoint'] ?? 0,
        ];
    }

    private function reward_columns($input)
    {
        return [
            'name' => $input['name'] ?? '',
            'points_cost' => $input['pointsCost'] ?? $input['pointsRequired'] ?? 0,
            'description' => $input['description'] ?? null,
            'is_active' => $input['isActive'] ?? true,
        ];
    }

    private function format_settings($row)
    {
        $result = [];
        foreach ($row as $column => $value) {
            $parts = explode('_', $column);
            $key = array_shift($parts);
            foreach ($parts as $part) {
                $key .= ucfirst($part);
            }
            $result[$key] = $value;
        }
        return $result;
    }

    private function format_reward($row)
    {
        return [
            'id' => (string) $row['id'],
            'name' => $row['name'],
            'pointsCost' => (int) $row['points_cost'],
            'pointsRequired' => (int) $row['points_cost'],
            'rewardValue' => 0,
            'description' => $row['description'],
            'isActive' => (bool) $row['is_active'],
        ];
    }

    private function uuid()
    {
        $hex = bin2hex(random_bytes(16));
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }

    private function success($data, $status = 200)
    {
        $this->api->respond(['success' => true, 'data' => $data], $status);
    }
}
