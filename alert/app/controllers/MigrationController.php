<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class MigrationController extends Controller {

    public function __construct()
    {
        parent::__construct();
        $this->call->library('migration');
    }

    // php lava migration create-migration [name]
    #[Route('/create-migration/{migration_class}')]
    public function create_migration($migration_class = null)
    {
        if (empty($migration_class)) {
            echo "Migration name is required.\n";
            exit(1);
        }

        $this->migration->create_migration($migration_class);
        exit(0);
    }

    // php lava migration run
    #[Route('/migrate')]
    public function migrate()
    {
        $this->migration->migrate();
        exit(0);
    }

    // php lava migration rollback
    #[Route('/rollback')]
    public function rollback()
    {
        $this->migration->rollback();
        exit(0);
    }

    // php lava migration rollback-all
    #[Route('/rollback-all')]
    public function rollback_all()
    {
        $this->migration->rollback_all();
        exit(0);
    }

    // php lava migration refresh
    #[Route('/refresh')]
    public function refresh() 
    {
        $this->migration->refresh();
        exit(0);
    }

    // php lava migration status
    #[Route('/status')]
    public function status() 
    {
        $this->migration->status();
        exit(0);
    }
}
