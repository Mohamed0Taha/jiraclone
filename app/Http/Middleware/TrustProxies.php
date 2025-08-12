<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Http\Middleware\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    // Trust the Heroku router
    protected $proxies = '*';

    // Works well on Heroku; if you still get scheme issues, try HEADER_X_FORWARDED_ALL
    protected $headers = Request::HEADER_X_FORWARDED_AWS_ELB;
}
