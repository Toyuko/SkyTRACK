# SkyNET

A modern ACARS (Aircraft Communications Addressing and Reporting System) application for flight simulators, with phpVMS7 integration.

## Features

- **Real-time Flight Tracking**: Track your flights in real-time with position updates
- **Multi-Simulator Support**: Works with MSFS, FSX, P3D, and X-Plane
- **phpVMS7 Integration**: Seamless integration with phpVMS7 virtual airline management system
- **Automatic PIREP Submission**: Automatically submit PIREPs from flight data
- **WebSocket Support**: Real-time data transmission via WebSocket
- **Modern UI**: Built with React and Tailwind CSS

## Components

### SkyNet Client Application

The main ACARS client application built with React and Vite.

### phpVMS7 Module

A complete phpVMS7 module that provides server-side integration for ACARS data.

## Getting Started

### SkyNet Client

#### Install Dependencies

```bash
npm install
```

#### Start Development Server

```bash
npm run dev
```

The app will open automatically in your browser at `http://localhost:3000`

#### Build for Production

```bash
npm run build
```

#### Preview Production Build

```bash
npm run preview
```

### phpVMS7 Module Installation

See the [phpVMS7 Module README](phpvms-module/README.md) for detailed installation instructions.

Quick installation:

1. Copy the module to your phpVMS7 installation:
   ```bash
   cp -r phpvms-module /path/to/phpvms7/modules/SkyNetAcars
   ```

2. Install dependencies:
   ```bash
   cd /path/to/phpvms7
   composer require nwidart/laravel-modules
   ```

3. Enable and migrate:
   ```bash
   php artisan module:enable SkyNetAcars
   php artisan module:migrate SkyNetAcars
   ```

## Integration

The ACARS app integrates with phpVMS7 through:

1. **REST API**: The phpVMS7 module provides API endpoints for:
   - Position updates
   - Flight start/end events
   - PIREP submission
   - Flight and bid validation

2. **Authentication**: Uses Laravel Sanctum for secure API access

3. **Automatic PIREP Creation**: Flight data is automatically converted to PIREPs

## Documentation

- [SkyNET Client Quick Start](skynet-client/QUICKSTART.md) - Get the desktop client running
- [Testing with MSFS 2024](skynet-client/TESTING_MSFS2024.md) - Test with Microsoft Flight Simulator 2024 (SimConnect)
- [phpVMS7 Module README](phpvms-module/README.md) - Complete module documentation
- [phpVMS7 Module Installation Guide](phpvms-module/INSTALL.md) - Detailed installation steps

## License

MIT License
