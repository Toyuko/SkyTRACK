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
// Lazy load pages to defer heavy imports until user navigates
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
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

  const isDark = effectiveTheme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-jal-navy';
  const cardClass = `jal-card ${isDark ? 'jal-card-dark' : 'jal-card-light'}`;
  const labelClass = `jal-label ${isDark ? 'text-gray-400' : 'text-gray-500'}`;
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600';

  const getPhaseColor = (phase: string): string => {
    const colors: Record<string, string> = {
      PREFLIGHT: isDark ? 'bg-gray-600/40 text-gray-300' : 'bg-gray-200 text-gray-700',
      TAXI: isDark ? 'bg-amber-600/30 text-amber-300' : 'bg-amber-100 text-amber-800',
      TAKEOFF: isDark ? 'bg-jal-red/30 text-jal-red-light' : 'bg-red-100 text-jal-red',
      CLIMB: isDark ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-100 text-blue-700',
      CRUISE: isDark ? 'bg-emerald-600/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
      DESCENT: isDark ? 'bg-purple-600/30 text-purple-300' : 'bg-purple-100 text-purple-700',
      APPROACH: isDark ? 'bg-orange-600/30 text-orange-300' : 'bg-orange-100 text-orange-700',
      LANDED: isDark ? 'bg-green-600/30 text-green-300' : 'bg-green-100 text-green-700',
      BLOCKED: isDark ? 'bg-gray-600/40 text-gray-300' : 'bg-gray-200 text-gray-700',
    };
    return colors[phase] || colors.PREFLIGHT;
  };

  return (
    <>
    <Suspense fallback={
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-jal-navy' : 'bg-jal-crane'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-jal-red border-t-transparent rounded-full animate-spin" />
          <span className={`text-sm font-medium ${mutedText}`}>Loading SkyTRACK...</span>
        </div>
      </div>
    }>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/" element={
        <div className={`min-h-screen ${isDark ? 'bg-jal-navy' : 'bg-jal-crane'} ${textColor} flex flex-col transition-colors duration-300`}>

      {/* JAL Accent Bar */}
      <div className="jal-accent-bar" />

      {/* Header */}
      <header className={`${isDark ? 'bg-jal-navy-light/80 backdrop-blur-md border-white/5' : 'bg-white/80 backdrop-blur-md border-gray-200'} border-b px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 group">
            <svg className="w-8 h-8 text-jal-red" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 2c2.577 0 4.964.822 6.916 2.213L8.213 22.916A11.935 11.935 0 014 16C4 9.373 9.373 4 16 4zm0 24c-2.577 0-4.964-.822-6.916-2.213L23.787 9.084A11.935 11.935 0 0128 16c0 6.627-5.373 12-12 12z"/>
            </svg>
            <span className="text-xl font-bold text-jal-red group-hover:text-jal-red-dark transition-colors">
              SkyTRACK
            </span>
          </Link>
          <div className={`h-5 w-px ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
          <span className={`text-xs font-medium tracking-wider uppercase ${mutedText}`}>{t('app.subtitle')}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/map"
            className="jal-btn-primary text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            {t('app.viewMap') || 'Live Map'}
          </Link>
          {currentFlight && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-jal-crane border border-gray-200'}`}>
              <span className={`text-sm font-medium ${textColor}`}>
                {currentFlight.callsign}
              </span>
              <span className={mutedText}>•</span>
              <span className={`text-sm ${mutedText}`}>
                {currentFlight.departureIcao} → {currentFlight.arrivalIcao}
              </span>
              {currentFlight.type === 'booked' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-jal-red/15 text-jal-red font-medium">
                  {t('app.booked')}
                </span>
              )}
              {currentFlight.type === 'free' && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} font-medium`}>
                  {t('app.freeFlight')}
                </span>
              )}
              <button
                onClick={handleClearFlight}
                className={`ml-1 p-0.5 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors`}
                aria-label={t('app.clearFlightAria')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {!currentFlight && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFlightSearch(true)}
                className={`jal-btn-secondary text-sm`}
              >
                {t('app.searchAndBook')}
              </button>
              <button
                onClick={() => setShowFreeFlight(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10' : 'text-emerald-700 border border-emerald-300 hover:bg-emerald-50'} transition-colors`}
              >
                {t('app.freeFlight')}
              </button>
            </div>
          )}
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(connectionStatus)} ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${mutedText}`}>{getStatusText(connectionStatus)}</span>
          </div>
          {/* Simulator Status */}
          {useSimulator && (
            <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-200'}`}>
              {[
                { key: 'simconnect', active: simStatus.simconnect_connected, label: 'SC' },
                { key: 'fsuipc', active: simStatus.fsuipc_connected, label: 'FSUIPC' },
                { key: 'xpuipc', active: simStatus.xpuipc_connected, label: 'XPUIPC' },
                { key: 'sim', active: simStatus.data_running, label: 'DATA', warn: simulatorConnected && !simStatus.data_running },
              ].map(({ key, active, label, warn }) => (
                <div key={key} className="flex items-center gap-1" title={`${label}: ${active ? 'Connected' : 'Disconnected'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : warn ? 'bg-amber-400' : 'bg-gray-500'}`} />
                  <span className={`text-[10px] font-semibold tracking-wider ${active ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : mutedText}`}>{label}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/5 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'} transition-colors`}
            aria-label={t('app.openSettingsAria')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {acarsData ? (
          <div className="max-w-6xl mx-auto space-y-5">

            {/* Route + Progress Banner */}
            <div className={`${cardClass} relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <svg viewBox="0 0 100 100" fill="currentColor" className="text-jal-red w-full h-full">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" fill="none" strokeWidth="2"/>
                  <path d="M50 5 L95 50 L50 95 L5 50 Z" stroke="currentColor" fill="none" strokeWidth="1"/>
                </svg>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${textColor}`}>{acarsData.departureIcao}</div>
                    <div className={`text-xs mt-1 ${mutedText}`}>{t('labels.departure') || 'DEP'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-px w-12 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                    <svg className="w-5 h-5 text-jal-red" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                    </svg>
                    <div className={`h-px w-12 ${isDark ? 'bg-white/20' : 'bg-gray-300'}`} />
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${textColor}`}>{acarsData.arrivalIcao}</div>
                    <div className={`text-xs mt-1 ${mutedText}`}>{t('labels.arrival') || 'ARR'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={labelClass}>{t('labels.callsign')}</div>
                    <div className={`text-xl font-bold ${textColor}`}>{acarsData.callsign}</div>
                  </div>
                  <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
                  <div className="text-right">
                    <div className={labelClass}>{t('labels.aircraft')}</div>
                    <div className={`text-xl font-bold ${textColor}`}>{acarsData.aircraftIcao}</div>
                  </div>
                </div>
              </div>

              {/* Stylized horizontal route progress bar */}
              <div className="mt-6">
                <div className="relative h-7">
                  <div className="absolute inset-y-1 left-10 right-10 rounded-full bg-gradient-to-r from-jal-red/70 via-jal-red to-jal-red/40 shadow-[0_0_25px_rgba(200,16,46,0.7)]" />
                  <div className="absolute inset-y-[5px] left-12 right-16 flex items-center gap-1.5 px-1">
                    {Array.from({ length: 18 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex-1 h-2 rounded-full bg-black/70 border border-jal-red/40"
                      />
                    ))}
                  </div>
                  {/* Aircraft marker */}
                  <div className="absolute top-1/2 -translate-y-1/2 right-12 w-7 h-7 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.9)]">
                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-jal-navy to-jal-navy-light flex items-center justify-center">
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-jal-red"
                        fill="currentColor"
                      >
                        <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2 1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Phase Badge */}
            <div className="flex justify-center">
              <div className={`jal-phase-badge ${getPhaseColor(acarsData.flightPhase)}`}>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="4" />
                </svg>
                {acarsData.flightPhase}
              </div>
            </div>

            {/* Primary Flight Instruments - 3 column */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={cardClass}>
                <div className={labelClass + ' mb-2'}>{t('labels.altitude')}</div>
                <div className="jal-value text-jal-red">{formatAltitude(acarsData.altitude)}</div>
              </div>
              <div className={cardClass}>
                <div className={labelClass + ' mb-2'}>{t('labels.groundSpeed')}</div>
                <div className={`jal-value ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{formatSpeed(acarsData.groundSpeed)}</div>
              </div>
              <div className={cardClass}>
                <div className={labelClass + ' mb-2'}>{t('labels.fuelRemaining')}</div>
                <div className={`jal-value ${isDark ? 'text-jal-gold-light' : 'text-jal-gold'}`}>{formatFuel(acarsData.fuelKg)}</div>
              </div>
            </div>

            {/* Navigation Data - 2 column */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cardClass}>
                <div className={labelClass + ' mb-2'}>{t('labels.heading')}</div>
                <div className="flex items-center gap-3">
                  <div className={`text-xl font-semibold ${textColor}`}>{Math.round(acarsData.heading)}°</div>
                  {/* Compass indicator */}
                  <div className={`w-8 h-8 rounded-full border ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-center relative`}>
                    <div
                      className="w-3 h-3 text-jal-red absolute"
                      style={{ transform: `rotate(${acarsData.heading}deg)` }}
                    >
                      <svg viewBox="0 0 12 12" fill="currentColor"><polygon points="6,1 8,9 6,7 4,9" /></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cardClass}>
                <div className={labelClass + ' mb-2'}>{t('labels.position')}</div>
                <div className={`text-sm font-mono tabular-nums ${textColor}`}>
                  {acarsData.latitude.toFixed(4)}°, {acarsData.longitude.toFixed(4)}°
                </div>
              </div>
            </div>

            {/* Advanced Metrics */}
            {showAdvancedMetrics && (
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-jal-red rounded-full" />
                  <h3 className={`text-sm font-semibold uppercase tracking-wider ${textColor}`}>{t('labels.flightStatistics')}</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {[
                    { label: t('labels.flightTime'), value: formatFlightTime(flightTime.current) },
                    { label: t('labels.distanceTraveled'), value: formatDistance(totalDistance.current) },
                    { label: t('labels.distanceRemaining'), value: formatDistance(calculateRemainingDistance()) },
                    { label: t('labels.eta'), value: calculateEstimatedTimeEnRoute() },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className={labelClass + ' mb-1'}>{item.label}</div>
                      <div className={`text-lg font-bold tabular-nums ${textColor}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className={`h-px my-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  {[
                    { label: t('labels.fuelFlow'), value: `${calculateFuelFlow().toLocaleString()} kg/hr` },
                    { label: t('labels.fuelEndurance'), value: calculateEstimatedTimeRemaining() },
                    { label: t('labels.averageSpeed'), value: flightTime.current > 0 ? formatSpeed((totalDistance.current / flightTime.current) * 3600) : '0 kt' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className={labelClass + ' mb-1'}>{item.label}</div>
                      <div className={`text-base font-semibold tabular-nums ${textColor}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Center-bottom vector map widget */}
            <div className={cardClass}>
              <div className="flex items-center justify-between mb-3">
                <div className={labelClass}>{t('labels.routeOverview') || 'Route Overview'}</div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  <span>{t('labels.livePosition') || 'Live position'}</span>
                </div>
              </div>
              <div className="relative w-full max-w-3xl mx-auto rounded-2xl border border-emerald-400/60 bg-black/60 overflow-hidden shadow-[0_0_35px_rgba(52,211,153,0.35)]">
                <div className="absolute inset-0 bg-radial from-emerald-400/25 via-transparent to-transparent pointer-events-none" />
                <svg
                  viewBox="0 0 400 220"
                  className="w-full h-56 md:h-64"
                  aria-hidden="true"
                >
                  <defs>
                    <radialGradient id="bgGrad" cx="50%" cy="40%" r="80%">
                      <stop offset="0%" stopColor="#1f2937" />
                      <stop offset="60%" stopColor="#020617" />
                      <stop offset="100%" stopColor="#000000" />
                    </radialGradient>
                  </defs>
                  <rect x="0" y="0" width="400" height="220" fill="url(#bgGrad)" />

                  {/* Simple coastline silhouettes */}
                  <path
                    d="M40 150 C 70 110, 110 90, 150 80 C 190 70, 210 80, 220 95 C 240 115, 260 130, 290 140 C 320 150, 340 160, 360 175"
                    fill="none"
                    stroke="#1f2937"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />

                  {/* Route line */}
                  <path
                    d="M70 150 C 130 90, 250 90, 330 140"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.4"
                    strokeDasharray="4 6"
                  />

                  {/* Departure / arrival waypoints */}
                  <circle cx="70" cy="150" r="4" fill="#22c55e" />
                  <circle cx="330" cy="140" r="4" fill="#22c55e" />
                  <text x="56" y="166" className="text-[10px]" fill="#e2fbe7">
                    {acarsData.departureIcao}
                  </text>
                  <text x="314" y="129" className="text-[10px]" fill="#e2fbe7">
                    {acarsData.arrivalIcao}
                  </text>

                  {/* Live aircraft marker (approximate along route) */}
                  <polygon
                    points="200,118 220,110 220,116 244,116 244,120 220,120 220,126"
                    fill="#ffffff"
                    stroke="#0f172a"
                    strokeWidth="0.5"
                  />
                </svg>
                {acarsData && (
                  <div className="absolute bottom-2 left-3 px-3 py-1.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-mono text-white/60">
                    {acarsData.latitude.toFixed(4)}°, {acarsData.longitude.toFixed(4)}°
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4 text-jal-red/30" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <div className={`text-lg font-medium ${textColor} mb-2`}>{t('status.waitingForFlightData')}</div>
              <div className={`text-sm ${mutedText}`}>
                {connectionStatus === 'connecting' ? t('status.connectingToBackend') : t('status.startFlightToSeeData')}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer with ACARS message log */}
      <footer className={`${isDark ? 'bg-jal-navy-light/60 border-white/5' : 'bg-white/60 border-gray-200'} border-t backdrop-blur-sm px-6 py-2.5`}>
        <div className="space-y-1">
          <div className={`flex items-center justify-between text-xs ${mutedText}`}>
            <div className="flex items-center gap-4">
              {lastUpdate ? (
                <span>{t('labels.lastUpdate', { time: formatTimestamp(lastUpdate.toISOString()) })}</span>
              ) : (
                <span>{t('labels.noDataReceived')}</span>
              )}
              {useMockData && <span className="text-amber-500">● {t('labels.mockDataMode')}</span>}
              {showAdvancedMetrics && (
                <span className="text-jal-red">● {t('labels.advancedMetrics')}</span>
              )}
            </div>
            {currentFlight && (
              <div className="flex items-center gap-3">
                <span className={`font-medium ${textColor}`}>
                  {t('flightInProgress.flightInProgress')}
                </span>
                <button
                  onClick={handleClearFlight}
                  className="px-3 py-1.5 rounded-lg bg-jal-red/10 hover:bg-jal-red/20 text-jal-red text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('flightInProgress.cancelFlight')}
                </button>
              </div>
            )}
          </div>

          {/* Scrolling ACARS text log */}
          <div className="relative overflow-hidden border-t border-white/5 pt-1.5">
            <div className="acars-log-marquee text-[10px] font-mono text-amber-300/90">
              <span>
                2023-07-08 07:13:37Z &nbsp; ZEE04 &nbsp; ACARS &gt; PUSHBACK COMPLETE, TAXI TO RWY 04L.
              </span>
              <span>
                2023-07-08 07:13:45Z &nbsp; JFK TWR &nbsp; ACARS &gt; HOLD SHORT RWY 04L, EXPECT LINEUP.
              </span>
              <span>
                2023-07-08 07:13:59Z &nbsp; ZEE04 &nbsp; ACARS &gt; DEPARTURE RTE MERIT 3, CLB VIA SID.
              </span>
              <span>
                2023-07-08 07:14:22Z &nbsp; SKYTRACK &nbsp; ACARS &gt; POSITION REPORT AUTO-UPLINKED TO HUB.
              </span>
            </div>
          </div>
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
