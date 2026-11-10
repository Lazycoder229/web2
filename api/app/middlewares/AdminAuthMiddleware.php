<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class AdminAuthMiddleware
{
    public function handle(Closure $next)
    {
        $api = lava_instance()->call->library('api');
        $claims = $api->validate_jwt($api->get_bearer_token() ?? '');
        if (!$claims || ($claims['type'] ?? 'access') !== 'access' || ($claims['role'] ?? '') !== 'admin') {
            $api->respond_error('Admin sign-in is required.', 401);
        }

        return $next();
    }
}