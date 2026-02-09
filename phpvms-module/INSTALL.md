# Installation Guide - SkyNet ACARS Module for phpVMS7

## Quick Start

1. **Copy Module Files**
   ```bash
   # Copy the module directory to your phpVMS7 modules folder
   cp -r phpvms-module /path/to/phpvms7/modules/SkyNetAcars
   ```

2. **Install Dependencies**
   ```bash
   cd /path/to/phpvms7
   composer require nwidart/laravel-modules
   ```

3. **Enable Module**
   ```bash
   php artisan module:enable SkyNetAcars
   ```

4. **Run Migrations**
   ```bash
   php artisan module:migrate SkyNetAcars
   ```

5. **Configure Module**
   - Go to Admin Panel → SkyNet ACARS → Settings
   - Configure your preferences
   - Save settings

## Detailed Installation Steps

### Step 1: Prerequisites

Ensure you have:
- phpVMS7 installed and working
- PHP 8.1 or higher
- Composer installed
- Database access configured

### Step 2: Module Installation

1. Navigate to your phpVMS7 installation directory
2. Copy the module folder to `modules/SkyNetAcars`
3. Ensure proper file permissions (755 for directories, 644 for files)

### Step 3: Composer Setup

The module uses Laravel Modules package. Install it if not already installed:

```bash
composer require nwidart/laravel-modules
```

### Step 4: Module Registration

Register the module using artisan:

```bash
php artisan module:enable SkyNetAcars
```

Or manually add to `modules_statuses.json`:
```json
{
  "SkyNetAcars": true
}
```

### Step 5: Database Setup

Run migrations to create required tables:

```bash
php artisan module:migrate SkyNetAcars
```

Or run all migrations:
```bash
php artisan migrate
```

### Step 6: Clear Cache

Clear application cache:

```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

### Step 7: Verify Installation

1. Check admin panel for "SkyNet ACARS" menu item
2. Navigate to Admin → SkyNet ACARS
3. Verify dashboard loads correctly
4. Check Settings page is accessible

## Post-Installation Configuration

### API Authentication Setup

The module uses Laravel Sanctum for API authentication. Ensure:

1. Sanctum is installed: `composer require laravel/sanctum`
2. Sanctum is configured in `config/sanctum.php`
3. API routes are properly protected

### Environment Configuration

Add to your `.env` file:

```env
SKYNET_ACARS_ENABLED=true
SKYNET_ACARS_AUTO_SUBMIT_PIREP=true
SKYNET_ACARS_REQUIRE_BID=false
```

### Permissions

Ensure your web server has write permissions to:
- `storage/logs/`
- `bootstrap/cache/`

## Uninstallation

To remove the module:

1. Disable module:
   ```bash
   php artisan module:disable SkyNetAcars
   ```

2. Rollback migrations (optional - will delete data):
   ```bash
   php artisan module:migrate-rollback SkyNetAcars
   ```

3. Remove module directory:
   ```bash
   rm -rf modules/SkyNetAcars
   ```

4. Clear cache:
   ```bash
   php artisan cache:clear
   php artisan config:clear
   ```

## Troubleshooting

### Module Not Found

- Verify module is in correct directory: `modules/SkyNetAcars/`
- Check `module.json` file exists and is valid
- Run `php artisan module:list` to see registered modules

### Migration Errors

- Ensure database user has CREATE TABLE permissions
- Check database connection in `.env`
- Verify no table name conflicts

### Routes Not Working

- Clear route cache: `php artisan route:clear`
- Verify RouteServiceProvider is registered
- Check middleware configuration

### Admin Panel Not Showing

- Clear all caches
- Verify module is enabled
- Check user has admin permissions
- Review Laravel logs for errors

## Support

If you encounter issues:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Enable debug mode in `.env`: `APP_DEBUG=true`
3. Review module logs for specific errors
4. Check phpVMS7 documentation for module development
