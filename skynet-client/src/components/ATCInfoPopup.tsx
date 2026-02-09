import { ATCStation } from '../services/atcDataService';
import { firService } from '../services/firService';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

interface ATCInfoPopupProps {
  atc: ATCStation;
  onClose: () => void;
}

export function ATCInfoPopup({ atc, onClose }: ATCInfoPopupProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  
  // Find FIR zone for this ATC position
  const firZone = useMemo(() => {
    return firService.findFIR(atc.latitude, atc.longitude);
  }, [atc.latitude, atc.longitude]);

  const getSourceLabel = (source: ATCStation['source']): string => {
    switch (source) {
      case 'vatsim':
        return 'VATSIM';
      case 'ivao':
        return 'IVAO';
      default:
        return 'Unknown';
    }
  };

  const getSourceColor = (source: ATCStation['source']): string => {
    switch (source) {
      case 'vatsim':
        return '#3b82f6'; // blue-500
      case 'ivao':
        return '#10b981'; // green-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  const getFacilityLabel = (facility: string): string => {
    const facilityMap: Record<string, string> = {
      'DEL': 'Clearance Delivery',
      'GND': 'Ground',
      'TWR': 'Tower',
      'APP': 'Approach',
      'CTR': 'Center',
      'FSS': 'Flight Service Station',
      'OBS': 'Observer',
      'UNK': 'Unknown',
    };
    return facilityMap[facility] || facility;
  };

  const formatTime = (timeStr?: string): string => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString();
    } catch {
      return timeStr;
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
              style={{ backgroundColor: getSourceColor(atc.source) }}
            />
            <h3 className={`text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {atc.callsign}
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
              {t('atc.source') || 'Source'}
            </label>
            <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              {getSourceLabel(atc.source)}
            </p>
          </div>

          {/* Frequency */}
          <div>
            <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('atc.frequency') || 'Frequency'}
            </label>
            <p className={`mt-1 text-lg font-semibold ${effectiveTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              {atc.frequency} MHz
            </p>
          </div>

          {/* Facility */}
          <div>
            <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('atc.facility') || 'Facility'}
            </label>
            <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
              {getFacilityLabel(atc.facility)} ({atc.facility})
            </p>
          </div>

          {/* Controller Name */}
          {atc.name && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('atc.controller') || 'Controller'}
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {atc.name}
              </p>
            </div>
          )}

          {/* Rating */}
          {atc.rating && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('atc.rating') || 'Rating'}
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {atc.rating}
              </p>
            </div>
          )}

          {/* Visual Range */}
          {atc.visualRange && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('atc.visualRange') || 'Visual Range'}
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {atc.visualRange.toFixed(0)} NM
              </p>
            </div>
          )}

          {/* Position */}
          <div>
            <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('atc.position') || 'Position'}
            </label>
            <p className={`mt-1 text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {atc.latitude.toFixed(4)}°, {atc.longitude.toFixed(4)}°
            </p>
          </div>

          {/* FIR Zone */}
          {firZone && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('atc.firZone') || 'FIR Zone'}
              </label>
              <p className={`mt-1 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                {firZone.name} ({firZone.icao})
              </p>
              <p className={`mt-0.5 text-xs ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {firZone.country}
              </p>
            </div>
          )}

          {/* ATIS Text */}
          {atc.textAtis && (
            <div>
              <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('atc.atis') || 'ATIS'}
              </label>
              <p className={`mt-1 text-sm whitespace-pre-wrap ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {atc.textAtis}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className={`grid grid-cols-2 gap-4 pt-2 border-t ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            {atc.logonTime && (
              <div>
                <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('atc.logonTime') || 'Logon Time'}
                </label>
                <p className={`mt-1 text-xs ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatTime(atc.logonTime)}
                </p>
              </div>
            )}
            {atc.lastUpdated && (
              <div>
                <label className={`text-xs font-medium uppercase ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('atc.lastUpdated') || 'Last Updated'}
                </label>
                <p className={`mt-1 text-xs ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatTime(atc.lastUpdated)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
