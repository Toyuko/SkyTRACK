import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { FreeFlight } from '../types/flight';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface SimbriefPlan {
  username: string;
  callsign: string | null;
  aircraft_icao: string | null;
  departure_icao: string | null;
  arrival_icao: string | null;
  route: string | null;
  ofp_id: string | null;
  created_at: string | null;
}

interface FreeFlightProps {
  onStartFlight: (flight: FreeFlight) => void;
  onClose: () => void;
}

export function FreeFlightForm({ onStartFlight, onClose }: FreeFlightProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    callsign: '',
    aircraftIcao: '',
    departureIcao: '',
    arrivalIcao: '',
  });
  const [simbriefUsername, setSimbriefUsername] = useState('');
  const [simbriefLoading, setSimbriefLoading] = useState(false);
  const [simbriefError, setSimbriefError] = useState<string | null>(null);

  const handleFetchSimbrief = async () => {
    const username = simbriefUsername.trim();
    if (!username) {
      setSimbriefError(t('freeFlight.simbriefUsernameRequired'));
      return;
    }
    setSimbriefError(null);
    setSimbriefLoading(true);
    try {
      const plan = await invoke<SimbriefPlan>('fetch_simbrief_plan', { username });
      setFormData({
        callsign: plan.callsign ?? '',
        aircraftIcao: (plan.aircraft_icao ?? '').toUpperCase().slice(0, 4),
        departureIcao: (plan.departure_icao ?? '').toUpperCase().slice(0, 4),
        arrivalIcao: (plan.arrival_icao ?? '').toUpperCase().slice(0, 4),
      });
    } catch (err) {
      setSimbriefError(err instanceof Error ? err.message : t('freeFlight.simbriefFetchFailed'));
    } finally {
      setSimbriefLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.callsign || !formData.aircraftIcao || !formData.departureIcao || !formData.arrivalIcao) {
      return;
    }

    const freeFlight: FreeFlight = {
      type: 'free',
      callsign: formData.callsign.toUpperCase(),
      aircraftIcao: formData.aircraftIcao.toUpperCase(),
      departureIcao: formData.departureIcao.toUpperCase(),
      arrivalIcao: formData.arrivalIcao.toUpperCase(),
      createdAt: new Date().toISOString(),
    };

    onStartFlight(freeFlight);
    onClose();
  };

  const bgColor = effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderColor = effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const inputBg = effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`${bgColor} rounded-lg shadow-xl max-w-md w-full`}>
        {/* Header */}
        <div className={`${bgColor} border-b ${borderColor} px-6 py-4 flex items-center justify-between`}>
          <h2 className={`text-2xl font-bold ${textColor}`}>{t('app.startFreeFlight')}</h2>
          <button
            onClick={onClose}
            className={`${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
            aria-label={t('common.close')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* SimBrief fetch */}
          <div className={`p-3 rounded-lg ${effectiveTheme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <label className={`block text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              {t('freeFlight.simbriefUsername')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={simbriefUsername}
                onChange={(e) => {
                  setSimbriefUsername(e.target.value);
                  setSimbriefError(null);
                }}
                placeholder="Your SimBrief username"
                disabled={simbriefLoading}
                className={`flex-1 px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60`}
              />
              <button
                type="button"
                onClick={handleFetchSimbrief}
                disabled={simbriefLoading}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                {simbriefLoading ? t('freeFlight.simbriefFetching') : t('freeFlight.fetchFromSimbrief')}
              </button>
            </div>
            {simbriefError && (
              <p className="mt-2 text-sm text-red-500">{simbriefError}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              {t('labels.callsign')}
            </label>
            <input
              type="text"
              value={formData.callsign}
              onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
              placeholder="UAL123"
              required
              className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              {t('freeFlight.aircraftIcao')}
            </label>
            <input
              type="text"
              value={formData.aircraftIcao}
              onChange={(e) => setFormData({ ...formData, aircraftIcao: e.target.value.toUpperCase() })}
              placeholder="B738"
              required
              maxLength={4}
              className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              {t('flightSearch.depAirportIcao')}
            </label>
            <input
              type="text"
              value={formData.departureIcao}
              onChange={(e) => setFormData({ ...formData, departureIcao: e.target.value.toUpperCase() })}
              placeholder="KJFK"
              required
              maxLength={4}
              className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              {t('flightSearch.arrAirportIcao')}
            </label>
            <input
              type="text"
              value={formData.arrivalIcao}
              onChange={(e) => setFormData({ ...formData, arrivalIcao: e.target.value.toUpperCase() })}
              placeholder="KLAX"
              required
              maxLength={4}
              className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 ${effectiveTheme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} ${textColor} rounded-lg transition-colors`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('freeFlight.startFlight')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
