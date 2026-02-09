<?php

use Illuminate\Support\Facades\Route;
use Modules\SkyNetAcars\Http\Controllers\Admin\SettingsController;
use Modules\SkyNetAcars\Http\Controllers\Admin\AcarsDataController;

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
|
| Here is where you can register admin routes for your module.
|
*/

Route::prefix('skynet-acars')->group(function () {
    Route::get('/', [SettingsController::class, 'index'])->name('admin.skynet-acars.index');
    Route::get('/settings', [SettingsController::class, 'settings'])->name('admin.skynet-acars.settings');
    Route::post('/settings', [SettingsController::class, 'saveSettings'])->name('admin.skynet-acars.settings.save');
    
    Route::get('/data', [AcarsDataController::class, 'index'])->name('admin.skynet-acars.data');
    Route::get('/data/{id}', [AcarsDataController::class, 'show'])->name('admin.skynet-acars.data.show');
});
