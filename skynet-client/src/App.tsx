import { useEffect, useState, useRef, lazy, Suspense, startTransition } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { SkyNetAcarsSnapshot, ConnectionStatus, Simulator } from './types/acars';
import { skynetSocket } from './services/skynetSocket';
import { simulatorService } from './services/simulatorService';
import { mockDataGenerator } from './services/mockData';
import { settingsStorage } from './services/settingsStorage';
import { flightStorage } from './services/flightStorage';
import { Settings } from './components/Settings';
import { FlightSearch } from './components/FlightSearch';
import { FreeFlightForm } from './components/FreeFlight';
// Lazy load MapPage to defer maplibre/mapbox until user navigates (avoids startup freeze)
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
import { useTheme } from './contexts/ThemeContext';
import { CurrentFlight, BookedFlight, FreeFlight, PhpVmsFlight } from './types/flight';
import { useTranslation } from 'react-i18next';

function App() {
  const { t } = useTranslation();
  const { effectiveTheme } = useTheme();
  const [acarsData, setAcarsData] = useState<SkyNetAcarsSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [useMockData, setUseMockData] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(settingsStorage.getShowAdvancedMetrics());
  const [currentFlight, setCurrentFlight] = useState<CurrentFlight>(null);
  const [showFlightSearch, setShowFlightSearch] = useState(false);
  const [showFreeFlight, setShowFreeFlight] = useState(false);
  const [simulatorConnected, setSimulatorConnected] = useState(false);
  const [useSimulator, setUseSimulator] = useState(false);
  const [simStatus, setSimStatus] = useState<{
    fsuipc_connected: boolean;
    simconnect_connected: boolean;
    xpuipc_connected: boolean;
    data_running: boolean;
  }>({ fsuipc_connected: false, simconnect_connected: false, xpuipc_connected: false, data_running: false });
  
  // Flight tracking for SmartCARS-like features
  const flightStartTime = useRef<Date | null>(null);
  const previousPosition = useRef<{ lat: number; lon: number } | null>(null);
  const totalDistance = useRef<number>(0);
  const flightTime = useRef<number>(0);

  // Show mock data immediately if enabled (keeps UI responsive on launch)
  const mockDataEnabled = settingsStorage.getMockDataEnabled();
  useEffect(() => {
    if (mockDataEnabled) {
      setUseMockData(true);
    }
  }, [mockDataEnabled]);

  // Load current flight from storage on mount
  useEffect(() => {
    const stored = flightStorage.getCurrentFlight();
    if (stored) {
      setCurrentFlight(stored);
    }
  }, []);

  // Defer connections by 3s so UI can render and become interactive first
  const CONNECTION_DEFER_MS = 3000;
  const connectionCleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      const simulator = settingsStorage.getSimulator();
      const shouldUseSimulator = simulator === Simulator.MSFS ||
        simulator === Simulator.FSX ||
        simulator === Simulator.P3D ||
        simulator === Simulator.XPLANE;

      if (shouldUseSimulator) {
        setUseSimulator(true);

        const unsubSimStatus = simulatorService.onStatusChange((status) => {
          setSimulatorConnected(status === 'connected');
          setConnectionStatus(status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'disconnected');
          if (status === 'connected') setUseMockData(false);
        });

        const unsubSimMessage = simulatorService.onMessage((data) => {
          if (!flightStartTime.current && data.flightPhase !== 'PREFLIGHT') {
            flightStartTime.current = new Date(data.timestamp);
          }
          if (previousPosition.current) {
            totalDistance.current += calculateDistance(
              previousPosition.current.lat, previousPosition.current.lon,
              data.latitude, data.longitude
            );
          }
          previousPosition.current = { lat: data.latitude, lon: data.longitude };
          if (flightStartTime.current) {
            flightTime.current = Math.floor((new Date(data.timestamp).getTime() - flightStartTime.current.getTime()) / 1000);
          }
          startTransition(() => {
            setAcarsData(data);
            setLastUpdate(new Date());
          });
        });

        const unsubDetailed = simulatorService.onDetailedStatusChange((status) => {
          startTransition(() => {
            setSimStatus({
              fsuipc_connected: !!status.fsuipc_connected,
              simconnect_connected: !!status.simconnect_connected,
              xpuipc_connected: !!status.xpuipc_connected,
              data_running: !!status.data_running,
            });
          });
        });

        connectionCleanupRef.current = () => {
          unsubSimStatus();
          unsubSimMessage();
          unsubDetailed();
          simulatorService.disconnect();
          connectionCleanupRef.current = null;
        };

        const simType = simulator === Simulator.XPLANE ? 'XPLANE' :
          simulator === Simulator.MSFS ? 'MSFS' :
            simulator === Simulator.FSX ? 'FSX' : 'P3D';
        Promise.race([
          simulatorService.connect(simType).then(() => simulatorService.start()),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Simulator connection timed out')), 8000)
          ),
        ]).catch((err) => {
          console.error('[App] Failed to connect to simulator:', err);
          setUseMockData(settingsStorage.getMockDataEnabled());
        });
      } else {
        const unsubStatus = skynetSocket.onStatusChange((status) => {
          setConnectionStatus(status);
          if (status === 'disconnected' || status === 'error') setUseMockData(mockDataEnabled);
          else if (status === 'connected') setUseMockData(false);
        });

        const unsubMessage = skynetSocket.onMessage((data) => {
          if (!flightStartTime.current && data.flightPhase !== 'PREFLIGHT') {
            flightStartTime.current = new Date(data.timestamp);
          }
          if (previousPosition.current) {
            totalDistance.current += calculateDistance(
              previousPosition.current.lat, previousPosition.current.lon,
              data.latitude, data.longitude
            );
          }
          previousPosition.current = { lat: data.latitude, lon: data.longitude };
          if (flightStartTime.current) {
            flightTime.current = Math.floor((new Date(data.timestamp).getTime() - flightStartTime.current.getTime()) / 1000);
          }
          startTransition(() => {
            setAcarsData(data);
            setLastUpdate(new Date());
          });
        });

        skynetSocket.connect();

        connectionCleanupRef.current = () => {
          unsubStatus();
          unsubMessage();
          skynetSocket.disconnect();
          connectionCleanupRef.current = null;
        };
      }
    }, CONNECTION_DEFER_MS);

    return () => {
      clearTimeout(timer);
      connectionCleanupRef.current?.();
    };
  }, [mockDataEnabled]);

  // Mock data generator (when not connected)
  useEffect(() => {
    if (!useMockData || !settingsStorage.getMockDataEnabled()) return;

    const interval = setInterval(() => {
      const mockData = mockDataGenerator.generate();
      if (!flightStartTime.current && mockData.flightPhase !== 'PREFLIGHT') {
        flightStartTime.current = new Date(mockData.timestamp);
      }
      if (previousPosition.current) {
        totalDistance.current += calculateDistance(
          previousPosition.current.lat,
          previousPosition.current.lon,
          mockData.latitude,
          mockData.longitude
        );
      }
      previousPosition.current = { lat: mockData.latitude, lon: mockData.longitude };
      if (flightStartTime.current) {
        flightTime.current = Math.floor((new Date(mockData.timestamp).getTime() - flightStartTime.current.getTime()) / 1000);
      }
      startTransition(() => {
        setAcarsData(mockData);
        setLastUpdate(new Date());
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [useMockData]);

  // Listen for settings changes
  useEffect(() => {
    setShowAdvancedMetrics(settingsStorage.getShowAdvancedMetrics());
  }, [showSettings]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3440; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in nautical miles
  };

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return t('status.connected');
      case 'connecting':
        return t('status.connecting');
      case 'error':
        return t('status.error');
      default:
        return useMockData ? t('status.mockData') : t('status.disconnected');
    }
  };

  const formatAltitude = (altitude: number): string => {
    return `${Math.round(altitude).toLocaleString()} ft`;
  };

  const formatSpeed = (speed: number): string => {
    return `${Math.round(speed)} kt`;
  };

  const formatFuel = (fuelKg: number): string => {
    return `${Math.round(fuelKg).toLocaleString()} kg`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatFlightTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDistance = (nm: number): string => {
    return `${nm.toFixed(1)} nm`;
  };

  const calculateRemainingDistance = (): number => {
    if (!acarsData) return 0;
    // Simple calculation - in real app, would use route waypoints
    return calculateDistance(
      acarsData.latitude,
      acarsData.longitude,
      34.0522, // KLAX approximate
      -118.2437
    );
  };

  const calculateEstimatedTimeEnRoute = (): string => {
    if (!acarsData || acarsData.groundSpeed === 0) return '--:--:--';
    const remaining = calculateRemainingDistance();
    const hours = remaining / acarsData.groundSpeed;
    const totalSeconds = Math.floor(hours * 3600);
    return formatFlightTime(totalSeconds);
  };

  const calculateFuelFlow = (): number => {
    // Estimate fuel flow based on phase and altitude (simplified)
    if (!acarsData) return 0;
    if (acarsData.flightPhase === 'CRUISE') {
      return 2500; // kg/hr at cruise
    } else if (acarsData.flightPhase === 'CLIMB') {
      return 3500; // kg/hr during climb
    }
    return 2000; // kg/hr otherwise
  };

  const calculateEstimatedTimeRemaining = (): string => {
    if (!acarsData || acarsData.fuelKg === 0) return '--:--:--';
    const fuelFlow = calculateFuelFlow();
    const hours = acarsData.fuelKg / fuelFlow;
    const totalSeconds = Math.floor(hours * 3600);
    return formatFlightTime(totalSeconds);
  };

  const handleFlightBooked = (flight: PhpVmsFlight) => {
    const bookedFlight: BookedFlight = {
      type: 'booked',
      flightId: flight.id,
      callsign: flight.flight_number,
      aircraftIcao: flight.aircraft?.icao || '',
      departureIcao: flight.dep_airport?.icao || flight.dep_airport_id,
      arrivalIcao: flight.arr_airport?.icao || flight.arr_airport_id,
      route: flight.route,
      distance: flight.distance,
      flightTime: flight.flight_time,
      bookedAt: new Date().toISOString(),
    };
    setCurrentFlight(bookedFlight);
    flightStorage.saveCurrentFlight(bookedFlight);
  };

  const handleFreeFlightStart = (flight: FreeFlight) => {
    setCurrentFlight(flight);
    flightStorage.saveCurrentFlight(flight);
  };

  const handleClearFlight = () => {
    setCurrentFlight(null);
    flightStorage.clearCurrentFlight();
    flightStartTime.current = null;
    previousPosition.current = null;
    totalDistance.current = 0;
    flightTime.current = 0;
  };

  const textColor = effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900';

  return (
    <>
    <Suspense fallback={
      <div className={`min-h-screen flex items-center justify-center ${effectiveTheme === 'dark' ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
    <Routes>
      <Route path="/map" element={<MapPage />} />
      <Route path="/" element={
        <div className={`min-h-screen ${effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} ${textColor} flex flex-col transition-colors`}>
      {/* Header */}
      <header className={`${effectiveTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link to="/" className={`text-2xl font-bold ${effectiveTheme === 'dark' ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
            SkyNet
          </Link>
          <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{t('app.subtitle')}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/map"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              effectiveTheme === 'dark' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {t('app.viewMap') || 'View Live Map'}
          </Link>
          {currentFlight && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {currentFlight.callsign} • {currentFlight.departureIcao} → {currentFlight.arrivalIcao}
              </span>
              {currentFlight.type === 'booked' && (
                <span className={`text-xs px-2 py-0.5 rounded ${effectiveTheme === 'dark' ? 'bg-blue-600 text-blue-100' : 'bg-blue-100 text-blue-700'}`}>
                  {t('app.booked')}
                </span>
              )}
              {currentFlight.type === 'free' && (
                <span className={`text-xs px-2 py-0.5 rounded ${effectiveTheme === 'dark' ? 'bg-green-600 text-green-100' : 'bg-green-100 text-green-700'}`}>
                  {t('app.freeFlight')}
                </span>
              )}
              <button
                onClick={handleClearFlight}
                className={`ml-2 ${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                aria-label={t('app.clearFlightAria')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {!currentFlight && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFlightSearch(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} transition-colors`}
              >
                {t('app.searchAndBook')}
              </button>
              <button
                onClick={() => setShowFreeFlight(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${effectiveTheme === 'dark' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-500 hover:bg-green-600 text-white'} transition-colors`}
              >
                {t('app.freeFlight')}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus)}`}></div>
            <span className={`text-sm font-medium ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{getStatusText(connectionStatus)}</span>
          </div>
          {useSimulator && (
            <div className={`flex items-center gap-3 px-3 py-1 rounded-lg ${effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${simStatus.simconnect_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>SimConnect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${simStatus.fsuipc_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>FSUIPC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${simStatus.xpuipc_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>XPUIPC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${simStatus.data_running ? 'bg-green-500' : simulatorConnected ? 'bg-yellow-500' : 'bg-gray-500'}`} />
                <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>SIM</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'} transition-colors`}
            aria-label={t('app.openSettingsAria')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content - flight data on main screen */}
      <main className="flex-1 p-6">
            {acarsData ? (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Flight Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.callsign')}</div>
                <div className={`text-2xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{acarsData.callsign}</div>
              </div>
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.aircraft')}</div>
                <div className={`text-2xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{acarsData.aircraftIcao}</div>
              </div>
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.route')}</div>
                <div className={`text-2xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {acarsData.departureIcao} → {acarsData.arrivalIcao}
                </div>
              </div>
            </div>

            {/* Flight Phase Badge */}
            <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 text-center shadow`}>
              <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{t('labels.flightPhase')}</div>
              <div className={`text-5xl font-bold ${effectiveTheme === 'dark' ? 'text-sky-400' : 'text-blue-600'}`}>{acarsData.flightPhase}</div>
            </div>

            {/* Primary Flight Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.altitude')}</div>
                <div className={`text-3xl font-bold ${effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{formatAltitude(acarsData.altitude)}</div>
              </div>
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.groundSpeed')}</div>
                <div className={`text-3xl font-bold ${effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>{formatSpeed(acarsData.groundSpeed)}</div>
              </div>
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.fuelRemaining')}</div>
                <div className={`text-3xl font-bold ${effectiveTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>{formatFuel(acarsData.fuelKg)}</div>
              </div>
            </div>

            {/* SmartCARS-like Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.heading')}</div>
                <div className={`text-xl font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{Math.round(acarsData.heading)}°</div>
              </div>
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow`}>
                <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.position')}</div>
                <div className={`text-sm font-mono ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {acarsData.latitude.toFixed(4)}, {acarsData.longitude.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Advanced Metrics (SmartCARS-like) */}
            {showAdvancedMetrics && (
              <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow`}>
                <h3 className={`text-lg font-semibold mb-4 ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t('labels.flightStatistics')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.flightTime')}</div>
                    <div className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatFlightTime(flightTime.current)}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.distanceTraveled')}</div>
                    <div className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatDistance(totalDistance.current)}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.distanceRemaining')}</div>
                    <div className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {formatDistance(calculateRemainingDistance())}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.eta')}</div>
                    <div className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {calculateEstimatedTimeEnRoute()}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.fuelFlow')}</div>
                    <div className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {calculateFuelFlow().toLocaleString()} kg/hr
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.fuelEndurance')}</div>
                    <div className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {calculateEstimatedTimeRemaining()}
                    </div>
                  </div>
                  <div>
                    <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{t('labels.averageSpeed')}</div>
                    <div className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {flightTime.current > 0 ? formatSpeed((totalDistance.current / flightTime.current) * 3600) : '0 kt'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className={`text-xl ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-2`}>{t('status.waitingForFlightData')}</div>
              <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                {connectionStatus === 'connecting' ? t('status.connectingToBackend') : t('status.startFlightToSeeData')}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`${effectiveTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t px-6 py-3`}>
        <div className={`flex items-center justify-between text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex items-center gap-4">
            {lastUpdate ? (
              <span>{t('labels.lastUpdate', { time: formatTimestamp(lastUpdate.toISOString()) })}</span>
            ) : (
              <span>{t('labels.noDataReceived')}</span>
            )}
            {useMockData && <span className={`${effectiveTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>● {t('labels.mockDataMode')}</span>}
            {showAdvancedMetrics && (
              <span className={`${effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>● {t('labels.advancedMetrics')}</span>
            )}
          </div>
          {currentFlight && (
            <div className="flex items-center gap-4">
              <span className={`font-medium ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {t('flightInProgress.flightInProgress')}
              </span>
              <button
                onClick={handleClearFlight}
                className={`px-4 py-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white text-sm font-medium flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('flightInProgress.cancelFlight')}
              </button>
              <button
                className={`px-4 py-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm font-medium flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
                {t('flightInProgress.mobile')}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
      } />
    </Routes>
    </Suspense>
    
    {/* Global Modals - Available on all routes */}
    {showSettings && <Settings onClose={() => setShowSettings(false)} />}

    {showFlightSearch && (
      <FlightSearch
        phpvmsConfig={settingsStorage.getPhpVmsConfig()}
        onSelectFlight={handleFlightBooked}
        onClose={() => setShowFlightSearch(false)}
      />
    )}

    {showFreeFlight && (
      <FreeFlightForm
        onStartFlight={handleFreeFlightStart}
        onClose={() => setShowFreeFlight(false)}
      />
    )}
    </>
  );
}

export default App;
