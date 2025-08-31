<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CookieHeaderDebug extends Command
{
    protected $signature = 'debug:cookie-header';

    protected $description = 'Outputs current largest Cookie header seen (from log-based aggregation placeholder)';

    public function handle(): int
    {
        $this->info('If 400 persists, verify web server (Heroku routing layer) not caching old headers.');
        $this->line('1. Open dev tools Application -> Cookies; delete all for taskpilot.us');
        $this->line('2. Hit https://taskpilot.us/fix-cookies.php directly.');
        $this->line('3. Curl WITHOUT cookies should succeed: curl -I https://taskpilot.us');

        return self::SUCCESS;
    }
}
