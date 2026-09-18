<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

#[Route('/api')] // Lahat ng endpoints sa ilalim nito ay magiging /api/login at /api/logout
class AuthController extends Controller
{
    public function __construct()
    {
        parent::__construct();
       $this->call->library('api');
       $this->call->database();
    }

    #[Post('/login')]
    public function login()
    {
        // Tiyakin na POST request ang pumapasok
        $this->api->require_method('POST');
        
        // Kunin ang JSON body data mula sa Axios client
        $input    = $this->api->body();
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        // Hanapin ang user gamit ang PDO raw statement ng Lavalust
        $stmt = $this->db->raw('SELECT * FROM users WHERE username = ?', [$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // I-verify ang password gamit ang bcrypt hash
        if ($user && password_verify($password, $user['password'])) {
            
            // Gumawa ng JWT/Session tokens gamit ang iyong API token issuer
            $tokens = $this->api->issue_tokens([
                'id'   => $user['id'],
                'role' => $user['role'],
            ]);

            /* 
             * PAALALA: Siguraduhin na ang $tokens array mula sa iyong framework 
             * ay naglalaman ng mga sumusunod na keys para mabasa ng Next.js:
             * [
             *   'access_token' => '...',
             *   'refresh_token' => '...',
             *   'expires_in' => 900
             * ]
             */

            $this->api->respond($tokens);
        } else {
            // Ibalik ang error na may 401 Unauthorized status code
            $this->api->respond_error('Invalid credentials', 401);
        }
    }

    #[Post('/logout')]
    public function logout()
    {
        // Tiyakin na POST request ang pumapasok
        $this->api->require_method('POST');
        
        $input = $this->api->body();
        
        // I-revoke o i-blacklist ang refresh token sa database backend
        $this->api->revoke_refresh_token($input['refresh_token'] ?? '');
        
        // Mag-respond ng success message sa frontend
        $this->api->respond(['message' => 'Logged out']);
    }
}
