# SkyNet ACARS Module for phpVMS7

This module provides ACARS (Aircraft Communications Addressing and Reporting System) integration for phpVMS7, allowing pilots to submit flight data and PIREPs directly from their flight simulator.

## Features

- **Real-time Flight Tracking**: Receive and store position updates from flight simulators
- **Automatic PIREP Submission**: Automatically create PIREPs from ACARS flight data
- **Multi-Simulator Support**: Works with MSFS, FSX, P3D, and X-Plane
- **Flight Validation**: Validate flights and bids before allowing ACARS tracking
- **Admin Dashboard**: View and manage ACARS data through the admin panel
- **Configurable Settings**: Customize behavior through admin settings

## Installation

### Prerequisites

- phpVMS7 installed and configured
- PHP 8.1 or higher
- Composer installed

### Step 1: Install the Module

1. Copy the `phpvms-module` directory to your phpVMS7 `modules` folder:
   ```bash
   cp -r phpvms-module /path/to/phpvms7/modules/SkyNetAcars
   ```

2. Install module dependencies:
   ```bash
   cd /path/to/phpvms7
   composer require nwidart/laravel-modules
   ```

3. Register the module in phpVMS7 by adding it to your `modules.json` or using the artisan command:
   ```bash
   php artisan module:enable SkyNetAcars
   ```

### Step 2: Run Migrations

Run the database migrations to create the necessary tables:
```bash
php artisan migrate
```

Or specifically for this module:
```bash
php artisan module:migrate SkyNetAcars
```

### Step 3: Configure the Module

1. Access the admin panel in phpVMS7
2. Navigate to **Admin → SkyNet ACARS → Settings**
3. Configure the module settings:
   - Enable/disable the module
   - Configure ACARS behavior
   - Set API rate limits
   - Configure PIREP submission settings

### Step 4: Configure API Authentication

The module uses Laravel Sanctum for API authentication. Ensure your ACARS client application uses the same authentication method.

## API Endpoints

All API endpoints are prefixed with `/api/skynet-acars/` and require authentication via Bearer token.

### Position Updates

**POST** `/api/skynet-acars/position`

Submit a position update from the simulator.

**Request Body:**
```json
{
  "callsign": "UAL123",
  "simulator": "MSFS",
  "aircraftIcao": "B738",
  "departureIcao": "KJFK",
  "arrivalIcao": "KLAX",
  "latitude": 40.6413,
  "longitude": -73.7781,
  "altitude": 35000,
  "groundSpeed": 450,
  "heading": 270,
  "fuelKg": 15000,
  "flightPhase": "CRUISE",
  "timestamp": "2024-01-01T12:00:00Z",
  "verticalSpeed": 0,
  "onGround": false
}
```

### Flight Start

**POST** `/api/skynet-acars/flight-start`

Start tracking a new flight.

**Request Body:**
```json
{
  "flight_id": 123,
  "callsign": "UAL123",
  "departureIcao": "KJFK",
  "arrivalIcao": "KLAX",
  "aircraftIcao": "B738"
}
```

### Flight End

**POST** `/api/skynet-acars/flight-end`

End flight tracking and optionally submit PIREP.

**Request Body:**
```json
{
  "acars_flight_id": 456
}
```

### Submit PIREP

**POST** `/api/skynet-acars/pirep/submit`

Manually submit a PIREP from ACARS flight data.

**Request Body:**
```json
{
  "acars_flight_id": 456
}
```

### Validate Flight

**GET** `/api/skynet-acars/validate/flight/{flightId}`

Validate that a flight exists and is available.

### Validate Bid

**GET** `/api/skynet-acars/validate/bid/{flightId}`

Validate that the authenticated user has an active bid for the specified flight.

## Configuration

The module can be configured through the admin panel or by editing the config file at `modules/SkyNetAcars/Config/config.php`.

### Environment Variables

You can also configure the module using environment variables in your `.env` file:

```env
SKYNET_ACARS_ENABLED=true
SKYNET_ACARS_AUTO_SUBMIT_PIREP=true
SKYNET_ACARS_REQUIRE_BID=false
SKYNET_ACARS_MIN_FLIGHT_TIME=5
SKYNET_ACARS_POSITION_UPDATE_INTERVAL=30
SKYNET_ACARS_RATE_LIMIT=60
SKYNET_ACARS_REQUIRE_AUTH=true
SKYNET_ACARS_AUTO_APPROVE_PIREP=false
SKYNET_ACARS_DEFAULT_PIREP_STATUS=PENDING
SKYNET_ACARS_CALCULATE_SCORE=true
```

## Integration with SkyNet ACARS Client

This module is designed to work with the SkyNet ACARS client application. The client should:

1. Authenticate using Laravel Sanctum
2. Submit position updates at regular intervals (configurable)
3. Call flight-start when beginning a flight
4. Call flight-end when completing a flight
5. Handle PIREP submission automatically or manually

## Database Schema

### acars_flights

Stores ACARS flight sessions.

- `id`: Primary key
- `user_id`: Foreign key to users table
- `flight_id`: Foreign key to flights table (optional)
- `callsign`: Aircraft callsign
- `simulator`: Simulator type
- `aircraft_icao`: Aircraft ICAO code
- `departure_icao`: Departure airport ICAO
- `arrival_icao`: Arrival airport ICAO
- `started_at`: Flight start timestamp
- `ended_at`: Flight end timestamp
- `status`: Flight status (active, completed, cancelled)
- `metadata`: Additional flight data (JSON)

### acars_positions

Stores position updates for each flight.

- `id`: Primary key
- `acars_flight_id`: Foreign key to acars_flights table
- `latitude`: Latitude coordinate
- `longitude`: Longitude coordinate
- `altitude`: Altitude in feet MSL
- `ground_speed`: Ground speed in knots
- `heading`: Heading in degrees
- `vertical_speed`: Vertical speed in feet per minute
- `fuel_kg`: Fuel quantity in kilograms
- `flight_phase`: Current flight phase
- `on_ground`: Whether aircraft is on ground
- `acars_timestamp`: Timestamp from ACARS data

## Troubleshooting

### Module Not Appearing in Admin

1. Ensure the module is enabled: `php artisan module:enable SkyNetAcars`
2. Clear cache: `php artisan cache:clear`
3. Check that the module is in the correct directory

### API Authentication Issues

1. Ensure Laravel Sanctum is properly configured
2. Verify the API token is being sent in the Authorization header
3. Check that the user has the necessary permissions

### PIREP Not Being Created

1. Check module settings for auto-submit configuration
2. Verify flight has sufficient position data
3. Check logs for errors: `storage/logs/laravel.log`

## Support

For issues, questions, or contributions, please visit the project repository.

## License

MIT License
