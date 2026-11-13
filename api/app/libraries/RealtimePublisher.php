<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class RealtimePublisher
{
    public function publish(string $type): void
    {
        $url = trim((string) getenv('REALTIME_PUBLISH_URL'));
        $secret = (string) getenv('REALTIME_PUBLISH_SECRET');
        if ($url === '' || $secret === '' || !function_exists('curl_init')) return;

        $curl = curl_init($url);
        if ($curl === false) return;
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(['type' => $type]),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $secret,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT_MS => 250,
            CURLOPT_TIMEOUT_MS => 500,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        curl_exec($curl);
        curl_close($curl);
    }
}
