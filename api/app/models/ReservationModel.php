<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class ReservationModel extends Model
{
    protected $table = 'reservations';
    protected $primary_key = 'id';
    protected $fillable = ['id', 'customer_id', 'customer_name', 'contact_number', 'email', 'table_id', 'reservation_date', 'reservation_time', 'reservation_end_time', 'number_of_guests', 'status', 'notes', 'created_by_staff_id', 'created_at'];
    protected $guarded = [];
    protected $timestamps = false;

    public function isPastSlot(string $date, string $time): bool
    {
        $normalizedTime = $this->normalizeTime($time);
        if ($normalizedTime === null) {
            return false;
        }

        $slot = DateTimeImmutable::createFromFormat(
            '!Y-m-d H:i',
            trim($date) . ' ' . $normalizedTime,
            new DateTimeZone('Asia/Manila')
        );
        if (!$slot || DateTimeImmutable::getLastErrors() !== false && DateTimeImmutable::getLastErrors()['warning_count'] > 0) {
            return false;
        }

        return $slot < new DateTimeImmutable('now', new DateTimeZone('Asia/Manila'));
    }

    public function defaultEndTime(string $time): ?string
    {
        $minutes = $this->timeToMinutes($time);
        if ($minutes === null) {
            return null;
        }

        return $this->minutesToTime(min($minutes + 120, 23 * 60 + 59));
    }

    public function isValidTimeRange(string $start, string $end): bool
    {
        $startMinutes = $this->timeToMinutes($start);
        $endMinutes = $this->timeToMinutes($end);

        return $startMinutes !== null && $endMinutes !== null && $endMinutes > $startMinutes;
    }

    public function hasConflict(string $date, string $time, ?string $tableId = null, ?string $excludeId = null, string $status = 'pending', ?string $endTime = null): bool
    {
        if (in_array(strtolower($status), ['cancelled', 'completed', 'no_show'], true)) {
            return false;
        }

        $normalizedTime = $this->normalizeTime($time);
        if ($normalizedTime === null) {
            return false;
        }
        $candidateStart = $this->timeToMinutes($normalizedTime);
        $candidateEnd = $this->timeToMinutes($endTime ?? '') ?? $candidateStart;
        if ($candidateStart === null || $candidateEnd <= $candidateStart) {
            return false;
        }

        $rows = $this->query()->where('reservation_date', $date)->get_all() ?: [];
        $tableId = $tableId !== null && $tableId !== '' ? (string) $tableId : null;

        foreach ($rows as $row) {
            if ($excludeId !== null && (string) $row['id'] === $excludeId) {
                continue;
            }
            if (in_array(strtolower((string) ($row['status'] ?? '')), ['cancelled', 'completed', 'no_show'], true)) {
                continue;
            }
            $existingStart = $this->timeToMinutes((string) ($row['reservation_time'] ?? ''));
            $existingEnd = $this->timeToMinutes((string) ($row['reservation_end_time'] ?? ''));
            if ($existingStart === null) {
                continue;
            }
            $existingEnd = $existingEnd !== null && $existingEnd > $existingStart
                ? $existingEnd
                : min($existingStart + 120, 23 * 60 + 59);
            if ($candidateStart >= $existingEnd || $candidateEnd <= $existingStart) {
                continue;
            }

            $existingTableId = $row['table_id'] !== null && $row['table_id'] !== ''
                ? (string) $row['table_id']
                : null;
            if ($existingTableId === $tableId) {
                return true;
            }
        }

        return false;
    }

    private function normalizeTime(string $time): ?string
    {
        if (!preg_match('/^(\d{1,2}):(\d{2})(?::\d{2})?$/', trim($time), $matches)) {
            return null;
        }

        $hour = (int) $matches[1];
        $minute = (int) $matches[2];
        if ($hour > 23 || $minute > 59) {
            return null;
        }

        return sprintf('%02d:%02d', $hour, $minute);
    }

    private function timeToMinutes(string $time): ?int
    {
        $normalized = $this->normalizeTime($time);
        if ($normalized === null) {
            return null;
        }
        [$hour, $minute] = array_map('intval', explode(':', $normalized));
        return ($hour * 60) + $minute;
    }

    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
