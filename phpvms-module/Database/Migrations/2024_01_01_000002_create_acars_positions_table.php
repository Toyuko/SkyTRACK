<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAcarsPositionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('acars_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('acars_flight_id');
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->integer('altitude'); // feet MSL
            $table->integer('ground_speed'); // knots
            $table->integer('heading'); // degrees 0-360
            $table->integer('vertical_speed')->nullable(); // feet per minute
            $table->decimal('fuel_kg', 10, 2)->nullable();
            $table->string('flight_phase', 50); // PREFLIGHT, TAXI, TAKEOFF, etc.
            $table->boolean('on_ground')->default(true);
            $table->timestamp('acars_timestamp'); // Timestamp from ACARS data
            $table->timestamps();

            $table->foreign('acars_flight_id')->references('id')->on('acars_flights')->onDelete('cascade');
            
            $table->index(['acars_flight_id', 'acars_timestamp']);
            $table->index('acars_timestamp');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('acars_positions');
    }
}
