FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    libzip-dev \
    oniguruma-dev \
    autoconf \
    gcc \
    g++ \
    make \
    && docker-php-ext-install \
    pdo \
    mbstring \
    zip \
    pcntl \
    sockets \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf gcc g++ make

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction 2>/dev/null || true

EXPOSE 9000

CMD ["php-fpm"]
