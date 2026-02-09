import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SkyNetAcarsSnapshot } from '../types/acars';
import { CurrentFlight } from '../types/flight';
import { FlightLog } from './FlightLog';
import { settingsStorage } from '../services/settingsStorage';

interface FlightInProgressProps {
  acarsData: SkyNetAcarsSnapshot | null;
  currentFlight: CurrentFlight;
  simulatorName: string;
  onCancelFlight: () => void;
  onRecoverFlight?: () => void;
}

interface FlightPosition {
  lat: number;
  lon: number;
  timestamp: Date;
}

export function FlightInProgress({
  acarsData,
  currentFlight,
  simulatorName,
  onCancelFlight,
  onRecoverFlight,
}: FlightInProgressProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const [flightPath, setFlightPath] = useState<FlightPosition[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showFlightLog, setShowFlightLog] = useState(true);

  // Load Mapbox token
  useEffect(() => {
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
    const settingsToken = settingsStorage.getMapboxToken();
    const token = envToken || settingsToken;
    setMapboxToken(token);
  }, []);

  // Track flight path
  useEffect(() => {
    if (acarsData) {
      setFlightPath((prev) => {
        const newPath = [...prev];
        const lastPoint = newPath[newPath.length - 1];
        const now = new Date(acarsData.timestamp);

        // Only add point if it's significantly different from last point
        if (
          !lastPoint ||
          Math.abs(lastPoint.lat - acarsData.latitude) > 0.001 ||
          Math.abs(lastPoint.lon - acarsData.longitude) > 0.001
        ) {
          newPath.push({
            lat: acarsData.latitude,
            lon: acarsData.longitude,
            timestamp: now,
          });
        }
        return newPath;
      });
    }
  }, [acarsData]);


  // Calculate flight time
  const calculateFlightTime = (): string => {
    if (!acarsData || flightPath.length < 2) return '0h00m';
    const start = flightPath[0].timestamp.getTime();
    const now = new Date(acarsData.timestamp).getTime();
    const minutes = Math.floor((now - start) / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}m`;
  };

  // Format flight plan route
  const formatRoute = (): string => {
    if (!currentFlight) return '';
    if (currentFlight.type === 'booked' && currentFlight.route) {
      return currentFlight.route;
    }
    return `${currentFlight.departureIcao} → ${currentFlight.arrivalIcao}`;
  };

  const bgColor = effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const textColor = effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderColor = effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';

  return (
    <div className={`${bgColor} ${textColor} flex-1 flex flex-col min-h-0`}>
      {/* Top Bar */}
      <header className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${borderColor} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className={`text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              {t('flightInProgress.connectedTo', { simulator: simulatorName })}
            </span>
          </div>
          <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            {t('flightInProgress.onTime')}
          </div>
          <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
            {t('flightInProgress.fuelOnTarget')}
          </div>
        </div>

        {currentFlight && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
                {currentFlight.callsign}
              </span>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {currentFlight.aircraftIcao} ({currentFlight.aircraftIcao})
            </div>
            <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {formatRoute()}
            </div>
            <div className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('flightInProgress.flightTime', { current: calculateFlightTime(), total: '1h53m' })}
            </div>
            <div className="flex gap-2">
              <button className={`px-3 py-1 rounded ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm`}>
                {t('flightInProgress.boarding')}
              </button>
              {acarsData && (
                <button className={`px-3 py-1 rounded ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm`}>
                  {Math.round(acarsData.altitude)}m
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Flight Log Sidebar */}
        {showFlightLog && (
          <div className="w-80 flex-shrink-0">
            <FlightLog
              acarsData={acarsData}
              currentFlight={currentFlight}
              simulatorName={simulatorName}
              onClose={() => setShowFlightLog(false)}
            />
          </div>
        )}

        {/* Map View (temporarily disabled while map library is fixed) */}
        <div className="flex-1 relative">
          {acarsData ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <p className={`text-lg mb-2 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  {t('flightInProgress.waitingForData')}
                </p>
                <p className={`text-sm opacity-75 ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('flightInProgress.mapboxTokenRequired')}
                </p>
                <p className={`text-xs opacity-75 mt-1 ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                  {t('flightInProgress.mapboxTokenHint')}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <p className={`text-lg ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('flightInProgress.waitingForData')}
                </p>
              </div>
            </div>
          )}

          {/* Show Flight Log Button */}
          {!showFlightLog && (
            <button
              onClick={() => setShowFlightLog(true)}
              className={`absolute top-4 left-4 ${effectiveTheme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} rounded-lg p-2 shadow-lg border ${borderColor}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <footer className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${borderColor} px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              Sky Blue Radio
            </span>
            <a
              href="https://skyblue radio.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${effectiveTheme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              skyblue radio.com - Sky Blue Radio
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {onRecoverFlight && (
            <div className="flex flex-col items-end gap-1">
              <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('flightInProgress.recoveryAvailable')}
              </span>
              <button
                onClick={onRecoverFlight}
                className={`px-4 py-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm font-medium flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {t('flightInProgress.recoverFlight')}
              </button>
            </div>
          )}
          <div className="flex flex-col items-end gap-1">
            <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('flightInProgress.flightInProgress')}
            </span>
            <button
              onClick={onCancelFlight}
              className={`px-4 py-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white text-sm font-medium flex items-center gap-2`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t('flightInProgress.cancelFlight')}
            </button>
          </div>
          <button
            className={`px-4 py-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white text-sm font-medium flex items-center gap-2`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            {t('flightInProgress.mobile')}
          </button>
        </div>
      </footer>
    </div>
  );
}
