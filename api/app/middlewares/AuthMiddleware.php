<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * Legacy session middleware kept for non-API routes.
 */
class AuthMiddleware
{
    /**
     * @param Closure $next
     * @return mixed
     */
    public function handle(Closure $next)
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (empty($_SESSION['user_id'])) {
           echo "You are not allowed to view the dashboard";
            return; 
        }

        return $next();
    }
}