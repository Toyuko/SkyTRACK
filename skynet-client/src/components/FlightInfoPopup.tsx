import { FlightTraffic } from '../services/trafficDataService';
import { firService } from '../services/firService';
import { useTheme } from '../contexts/ThemeContext';
import { useMemo } from 'react';

interface FlightInfoPopupProps {
  flight: FlightTraffic;
  onClose: () => void;
}

export function FlightInfoPopup({ flight, onClose }: FlightInfoPopupProps) {
  const { effectiveTheme } = useTheme();
  
  // Find FIR zone for this flight position
  const firZone = useMemo(() => {
    return firService.findFIR(flight.latitude, flight.longitude);
  }, [flight.latitude, flight.longitude]);

  const formatAltitude = (altitude: number): string => {
    return `${Math.round(altitude).toLocaleString()} ft`;
  };

  const formatSpeed = (speed: number): string => {
    return `${Math.round(speed)} kt`;
  };

  const formatHeading = (heading: number): string => {
    return `${Math.round(heading)}°`;
  };

  const getSourceLabel = (source: FlightTraffic['source']): string => {
    switch (source) {
      case 'va':
        return 'Virtual Airline';
      case 'vatsim':
        return 'VATSIM';
      case 'ivao':
        return 'IVAO';
      case 'poscon':
        return 'POSCON';
      case 'smartcars':
        return 'smartCARS';
      default:
        return 'Unknown';
    }
  };

  const getSourceColor = (source: FlightTraffic['source']): string => {
    switch (source) {
      case 'va':
        return '#ef4444'; // red-500
      case 'vatsim':
        return '#3b82f6'; // blue-500
      case 'ivao':
        return '#10b981'; // green-500
      case 'poscon':
        return '#f59e0b'; // amber-500
      case 'smartcars':
        return '#8b5cf6'; // violet-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
      <div
        className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full border ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getSourceColor(flight.source) }}
            />
            <h3 className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {flight.callsign}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Source */}
          <div>
            <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Source
            </label>
            <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              {getSourceLabel(flight.source)}
            </p>
          </div>

          {/* Flight Route */}
          {(flight.departureIcao || flight.arrivalIcao) && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Route
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {flight.departureIcao || 'N/A'} → {flight.arrivalIcao || 'N/A'}
              </p>
            </div>
          )}

          {/* Aircraft */}
          {flight.aircraftIcao && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Aircraft
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {flight.aircraftIcao}
              </p>
            </div>
          )}

          {/* FIR Zone */}
          {firZone && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                FIR Zone
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {firZone.name} ({firZone.icao})
              </p>
              <p className={`mt-0.5 text-xs ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {firZone.country}
              </p>
            </div>
          )}

          {/* Grid of flight data */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Altitude
              </label>
              <p className={`mt-1 text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatAltitude(flight.altitude)}
              </p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Ground Speed
              </label>
              <p className={`mt-1 text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatSpeed(flight.groundSpeed)}
              </p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Heading
              </label>
              <p className={`mt-1 text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {formatHeading(flight.heading)}
              </p>
            </div>
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Position
              </label>
              <p className={`mt-1 text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {flight.latitude.toFixed(4)}°, {flight.longitude.toFixed(4)}°
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
