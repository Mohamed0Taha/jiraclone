<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Http\Middleware\TrustProxies as Middleware;

class TrustProxies extends Middleware
{
    /**
     * Trust all proxies (Heroku router).
     *
     * @var array|string|null
     */
    protected $proxies = '*';

    /**
     * Use AWS/ELB header set that Heroku provides.
     *
     * @var int
     */
    protected $headers = Request::HEADER_X_FORWARDED_AWS_ELB;
}
