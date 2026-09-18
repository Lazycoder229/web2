<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

#[Route('/users')]
class UsersController extends Controller
{
    public function __construct()
    {
        parent::__construct();
       
    }

    #[Get('/dashboard', middleware: ['auth'])]
    public function dashboard()
    {
        $this->call->view('dashboard');
    }

}