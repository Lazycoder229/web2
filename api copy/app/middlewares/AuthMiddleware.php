<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

/**
 * ------------------------------------------------------------------
 * AuthMiddleware — sample "auth" middleware
 * ------------------------------------------------------------------
 *
 * Same handle(Closure $next) contract as WebMiddleware. Put this
 * AFTER 'web' in a route's middleware list (e.g.
 * middleware: ['web', 'auth']) so the session is guaranteed to be
 * started before this checks it — Middleware::run() executes the
 * array in the order given, left to right.
 *
 * NOTE: swap $_SESSION['user_id'] and redirect('login') for
 * LavaLust's own Session library / auth check if your app already
 * has one — this is a dependency-free baseline, not a claim about
 * LavaLust's exact API.
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