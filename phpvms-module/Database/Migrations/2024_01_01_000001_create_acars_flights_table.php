<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAcarsFlightsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('acars_flights', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('flight_id')->nullable(); // phpVMS flight ID
            $table->string('callsign', 10);
            $table->string('simulator', 20); // MSFS, FSX, P3D, XPLANE
            $table->string('aircraft_icao', 4);
            $table->string('departure_icao', 4);
            $table->string('arrival_icao', 4);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->json('metadata')->nullable(); // Store additional flight data
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('flight_id')->references('id')->on('flights')->onDelete('set null');
            
            $table->index(['user_id', 'status']);
            $table->index('started_at');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('acars_flights');
    }
}
