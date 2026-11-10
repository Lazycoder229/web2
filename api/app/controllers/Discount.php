<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

#[Route('/api', middleware: ['admin_auth'])]
class Discount extends Controller
{
    private $api;
    private $types;
    private $promotions;
    private $promotionItems;
    public function __construct()
    {
        parent::__construct();
        $this->call->database();
        $this->api = $this->call->library('api');
        $this->types = $this->call->model('DiscountTypeModel');
        $this->promotions = $this->call->model('PromotionModel');
        $this->promotionItems = $this->call->model('PromotionItemModel');
    }
    #[Get('/discounts')] public function index()
    {
        $this->success(['discountTypes' => array_map([$this,'format_type'], $this->types->query()->order_by('name', 'ASC')->get_all() ?: []),'promotions' => array_map([$this,'format_promo'], $this->promotions->query()->order_by('start_date', 'DESC')->get_all() ?: [])]);
    }
    #[Post('/discounts/types')] public function create_type()
    {
        $id = $this->uuid();
        $this->types->insert(array_merge(['id' => $id], $this->type_columns($this->api->body())));
        $this->success(['discountType' => $this->format_type($this->types->find($id))], 201);
    }
    #[Put('/discounts/types/{id:uuid}')] public function update_type($id)
    {
        $this->types->query()->where('id', $id)->update($this->type_columns($this->api->body()));
        $this->success(['discountType' => $this->format_type($this->types->find($id))]);
    }
    #[Delete('/discounts/types/{id:uuid}')] public function delete_type($id)
    {
        $this->types->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    #[Post('/discounts/promotions')] public function create_promo()
    {
        $input = $this->api->body();
        $id = $this->uuid();
        $this->promotions->insert(array_merge(['id' => $id], $this->promo_columns($input)));
        $this->save_promotion_items($id, $input['menuItemIds'] ?? []);
        $this->success(['promotion' => $this->format_promo($this->promotions->find($id))], 201);
    }
    #[Put('/discounts/promotions/{id:uuid}')] public function update_promo($id)
    {
        $input = $this->api->body();
        $this->promotions->query()->where('id', $id)->update($this->promo_columns($input));
        if (array_key_exists('menuItemIds', $input)) {
            $this->save_promotion_items($id, $input['menuItemIds']);
        }
        $this->success(['promotion' => $this->format_promo($this->promotions->find($id))]);
    }
    #[Delete('/discounts/promotions/{id:uuid}')] public function delete_promo($id)
    {
        $this->promotions->query()->where('id', $id)->delete();
        $this->success(['id' => $id]);
    }
    private function type_columns($i)
    {
        $m = ['name' => 'name','percentage' => 'percentage','requiresIdVerification' => 'requires_id_verification','isActive' => 'is_active'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function promo_columns($i)
    {
        $m = ['name' => 'name','description' => 'description','promoType' => 'promo_type','discountValue' => 'discount_value','minSpend' => 'min_spend','startDate' => 'start_date','endDate' => 'end_date','usageLimit' => 'usage_limit','isActive' => 'is_active'];
        $o = [];
        foreach ($m as $a => $b) {
            if (array_key_exists($a, $i)) {
                $o[$b] = $i[$a];
            }
        } return $o;
    }
    private function save_promotion_items($promotionId, $menuItemIds)
    {
        $this->promotionItems->query()->where('promotion_id', $promotionId)->delete();
        foreach (array_unique(is_array($menuItemIds) ? $menuItemIds : []) as $menuItemId) {
            $this->promotionItems->insert([
                'promotion_id' => $promotionId,
                'menu_item_id' => $menuItemId,
            ]);
        }
    }
    private function format_type($r)
    {
        return ['id' => (string)$r['id'],'name' => $r['name'],'percentage' => (float)$r['percentage'],'requiresIdVerification' => (bool)$r['requires_id_verification'],'isActive' => (bool)$r['is_active']];
    }
    private function format_promo($r)
    {
        $linkedItems = $this->promotionItems->query()->where('promotion_id', $r['id'])->get_all() ?: [];
        return ['id' => (string)$r['id'],'name' => $r['name'],'description' => $r['description'],'promoType' => $r['promo_type'],'discountValue' => $r['discount_value'] === null ? null : (float)$r['discount_value'],'minSpend' => $r['min_spend'] === null ? null : (float)$r['min_spend'],'startDate' => $r['start_date'],'endDate' => $r['end_date'],'usageLimit' => $r['usage_limit'] === null ? null : (int)$r['usage_limit'],'usageCount' => (int)($r['usage_count'] ?? 0),'isActive' => (bool)$r['is_active'],'menuItemIds' => array_map(static function ($item) { return (string) $item['menu_item_id']; }, $linkedItems)];
    }
    private function uuid()
    {
        $h = bin2hex(random_bytes(16));
        return substr($h, 0, 8).'-'.substr($h, 8, 4).'-'.substr($h, 12, 4).'-'.substr($h, 16, 4).'-'.substr($h, 20);
    }
    private function success($d, $s = 200)
    {
        $this->api->respond(['success' => true,'data' => $d],$s);
    }
}
