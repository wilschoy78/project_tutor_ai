FROM php:8.1-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    libzip-dev \
    libicu-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libxml2-dev \
    mariadb-client \
    unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    gd \
    intl \
    mysqli \
    soap \
    zip \
    exif \
    opcache

# Increase PHP limits for Moodle
RUN echo "max_input_vars = 5000" > /usr/local/etc/php/conf.d/moodle.ini \
    && echo "memory_limit = 512M" >> /usr/local/etc/php/conf.d/moodle.ini \
    && echo "upload_max_filesize = 100M" >> /usr/local/etc/php/conf.d/moodle.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/moodle.ini

# Download Moodle (Clone latest stable branch)
WORKDIR /var/www/html
RUN rm -rf * \
    && git clone --depth 1 -b MOODLE_403_STABLE git://git.moodle.org/moodle.git . \
    && mkdir /var/www/moodledata \
    && chown -R www-data:www-data /var/www/moodledata \
    && chmod -R 777 /var/www/moodledata \
    && chown -R www-data:www-data /var/www/html

EXPOSE 80
