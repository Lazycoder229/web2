<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');


#[Route('/')]
class Welcome extends Controller {

	#[Get('/')]
	public function index() {
		$this->call->view('welcome_page');
	}
}
?>