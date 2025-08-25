web: vendor/bin/heroku-php-apache2 public/
release: php artisan migrate --force && php artisan config:cache
worker: php artisan queue:work --sleep=3 --tries=1 --max-time=3600
