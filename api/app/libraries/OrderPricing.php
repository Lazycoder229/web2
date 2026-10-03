<?php

defined('PREVENT_DIRECT_ACCESS') or exit('No direct script access allowed');

/** Resolve and persist configured discounts and promotions for an order. */
class OrderPricing
{
    private $discountTypes;
    private $promotions;
    private $promotionItems;
    private $orderDiscounts;
    private $orderPromotions;

    public function __construct()
    {
        $call = lava_instance()->call;
        $this->discountTypes = $call->model('DiscountTypeModel');
        $this->promotions = $call->model('PromotionModel');
        $this->promotionItems = $call->model('PromotionItemModel');
        $this->orderDiscounts = $call->model('OrderDiscountModel');
        $this->orderPromotions = $call->model('OrderPromotionModel');
    }

    public function calculate(float $subtotal, array $items, array $input, ?array $customer, bool $seniorPwdEnabled, array $settings): array
    {
        $discountTypes = $this->discountTypes->query()->where('is_active', 1)->get_all() ?: [];
        $taxEnabled = $this->is_enabled($settings['vat_enabled'] ?? false);
        $vatRate = max(0, (float) ($settings['vat_rate'] ?? 0));
        $vatInclusive = $this->is_enabled($settings['vat_inclusive'] ?? false);
        $selectedType = null;
        $automatic = false;

        if (!empty($input['discountTypeId'])) {
            $selectedType = $this->discountTypes->find((string) $input['discountTypeId']);
            if (!$selectedType || !$this->is_enabled($selectedType['is_active'] ?? false)) {
                throw new InvalidArgumentException('Choose an active discount type.');
            }
            if ($this->is_senior_pwd($selectedType['name'] ?? '') && !$seniorPwdEnabled) {
                throw new InvalidArgumentException('Senior/PWD discounts are disabled in Settings.');
            }
        } elseif ($seniorPwdEnabled && $customer) {
            $age = $this->age($customer['date_of_birth'] ?? null);
            if ($age !== null && $age >= 60) {
                $selectedType = $this->find_type($discountTypes, 'senior');
                $automatic = $selectedType !== null;
            }
            if (!$selectedType && !empty($customer['pwd_id_number'])) {
                $selectedType = $this->find_type($discountTypes, 'pwd');
                $automatic = $selectedType !== null;
            }
        }

        $discountAmount = 0.0;
        $statutoryDiscount = $selectedType && $this->is_senior_pwd($selectedType['name'] ?? '');
        $discountRecord = null;
        if ($selectedType) {
            $requiresId = $this->is_enabled($selectedType['requires_id_verification'] ?? false);
            $idNumber = trim((string) ($input['discountIdNumber'] ?? ''));
            $holderName = trim((string) ($input['discountHolderName'] ?? ''));
            if ($automatic && $customer) {
                $holderName = (string) $customer['name'];
                if (!empty($customer['pwd_id_number']) && (stripos($selectedType['name'], 'pwd') !== false || stripos($selectedType['name'], 'disabilit') !== false)) {
                    $idNumber = (string) $customer['pwd_id_number'];
                }
            }
            if ($requiresId && !$automatic && $idNumber === '') {
                throw new InvalidArgumentException('An ID number is required for this discount.');
            }
            if ($holderName === '') {
                if ($customer) {
                    $holderName = (string) $customer['name'];
                } else {
                    throw new InvalidArgumentException('Enter the discount holder name.');
                }
            }
            $percentage = (float) $selectedType['percentage'];
            if ($statutoryDiscount) {
                $percentage = max(20, $percentage);
            }
            $discountBase = $statutoryDiscount && $taxEnabled && $vatInclusive && $vatRate > 0
                ? $subtotal / (1 + ($vatRate / 100))
                : $subtotal;
            $discountAmount = min($subtotal, max(0, $statutoryDiscount
                ? round($subtotal - ($discountBase * (1 - ($percentage / 100))), 2)
                : round($subtotal * ($percentage / 100), 2)));
            if ($discountAmount > 0) {
                $discountRecord = [
                    'typeId' => $selectedType['id'],
                    'idNumber' => $idNumber !== '' ? $idNumber : null,
                    'holderName' => $holderName,
                    'amount' => $discountAmount,
                ];
            }
        }

        $promotion = $this->best_promotion(
            $items,
            $subtotal,
            $statutoryDiscount ? $subtotal : max(0, $subtotal - $discountAmount)
        );
        $statutoryApplied = $statutoryDiscount;
        if ($statutoryDiscount && $promotion && $promotion['amount'] > $discountAmount) {
            // Statutory benefits cannot be stacked with a promotion; apply the better offer.
            $discountAmount = 0.0;
            $discountRecord = null;
            $statutoryApplied = false;
        } elseif ($statutoryDiscount) {
            $promotion = null;
        }
        $promotionDiscount = $promotion['amount'] ?? 0.0;
        $totalDiscount = min($subtotal, round($discountAmount + $promotionDiscount, 2));
        $net = max(0, round($subtotal - $totalDiscount, 2));

        $tax = 0.0;
        $total = $net;
        if (!$statutoryApplied && $taxEnabled && $vatRate > 0) {
            if ($vatInclusive) {
                $tax = round($net * ($vatRate / (100 + $vatRate)), 2);
            } else {
                $tax = round($net * ($vatRate / 100), 2);
                $total = round($net + $tax, 2);
            }
        }

        return [
            'discount' => $totalDiscount,
            'tax' => $tax,
            'total' => $total,
            'discountRecord' => $discountRecord,
            'promotion' => $promotion,
            'statutoryApplied' => $statutoryApplied,
        ];
    }

    public function record(string $orderId, array $pricing, ?string $staffId): void
    {
        $discount = $pricing['discountRecord'] ?? null;
        if ($discount) {
            $this->orderDiscounts->insert([
                'id' => $this->uuid(),
                'order_id' => $orderId,
                'discount_type_id' => $discount['typeId'],
                'id_number' => $discount['idNumber'],
                'holder_name' => $discount['holderName'],
                'discount_amount' => number_format($discount['amount'], 2, '.', ''),
                'applied_by_staff_id' => $staffId,
            ]);
        }

        $promotion = $pricing['promotion'] ?? null;
        if ($promotion && $promotion['amount'] > 0) {
            $this->orderPromotions->insert([
                'id' => $this->uuid(),
                'order_id' => $orderId,
                'promotion_id' => $promotion['id'],
                'discount_amount' => number_format($promotion['amount'], 2, '.', ''),
            ]);
            $this->promotions->query()->where('id', $promotion['id'])->update([
                'usage_count' => (int) $promotion['usageCount'] + 1,
            ]);
        }
    }

    private function best_promotion(array $items, float $subtotal, float $remainingSubtotal): ?array
    {
        $today = date('Y-m-d');
        $promotions = $this->promotions->query()
            ->where('is_active', 1)
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->get_all() ?: [];

        $best = null;
        foreach ($promotions as $promo) {
            $usageLimit = $promo['usage_limit'] === null ? null : (int) $promo['usage_limit'];
            $usageCount = (int) ($promo['usage_count'] ?? 0);
            if ($usageLimit !== null && $usageCount >= $usageLimit) {
                continue;
            }
            if ($subtotal < (float) ($promo['min_spend'] ?? 0)) {
                continue;
            }

            $linked = $this->promotionItems->query()
                ->where('promotion_id', $promo['id'])
                ->get_all() ?: [];
            $linkedIds = array_column($linked, 'menu_item_id');
            $eligibleItems = array_values(array_filter($items, static function ($item) use ($linkedIds) {
                return !$linkedIds || in_array($item['menu_item_id'], $linkedIds, true);
            }));
            $eligibleSubtotal = array_sum(array_map(static function ($item) {
                return (float) $item['subtotal'];
            }, $eligibleItems));
            if ($eligibleSubtotal <= 0) {
                continue;
            }

            $remainingEligible = $subtotal > 0
                ? $eligibleSubtotal * ($remainingSubtotal / $subtotal)
                : 0;
            $amount = 0.0;
            if ($promo['promo_type'] === 'percentage') {
                $amount = $remainingEligible * ((float) ($promo['discount_value'] ?? 0) / 100);
            } elseif ($promo['promo_type'] === 'fixed_amount') {
                $amount = min($remainingEligible, (float) ($promo['discount_value'] ?? 0));
            } elseif ($promo['promo_type'] === 'buy_x_get_y') {
                foreach ($eligibleItems as $item) {
                    $pairs = intdiv((int) $item['quantity'], 2);
                    $amount += $pairs * (float) $item['unit_price'];
                }
                $amount = min($remainingEligible, $amount);
            }

            $amount = min($remainingSubtotal, round($amount, 2));
            if ($amount > 0 && (!$best || $amount > $best['amount'])) {
                $best = [
                    'id' => $promo['id'],
                    'name' => $promo['name'],
                    'amount' => $amount,
                    'usageCount' => $usageCount,
                ];
            }
        }
        return $best;
    }

    private function find_type(array $types, string $kind): ?array
    {
        foreach ($types as $type) {
            $name = strtolower((string) ($type['name'] ?? ''));
            if ($kind === 'senior' && (str_contains($name, 'senior') || str_contains($name, 'citizen'))) {
                return $type;
            }
            if ($kind === 'pwd' && (str_contains($name, 'pwd') || str_contains($name, 'disabilit'))) {
                return $type;
            }
        }
        return null;
    }

    private function age(?string $dateOfBirth): ?int
    {
        if (!$dateOfBirth) {
            return null;
        }
        try {
            $birthDate = new DateTimeImmutable($dateOfBirth);
            $today = new DateTimeImmutable('today');
            if ($birthDate > $today) {
                return null;
            }
            return $birthDate->diff($today)->y;
        } catch (Throwable $error) {
            return null;
        }
    }

    private function is_senior_pwd(string $name): bool
    {
        $name = strtolower($name);
        return str_contains($name, 'senior') || str_contains($name, 'citizen') || str_contains($name, 'pwd') || str_contains($name, 'disabilit');
    }

    private function is_enabled($value): bool
    {
        return in_array($value, [true, 1, '1', 'true'], true);
    }

    private function uuid(): string
    {
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
    }
}
