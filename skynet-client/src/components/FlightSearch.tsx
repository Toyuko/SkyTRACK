import { useState, useEffect } from 'react';
import { PhpVmsFlight, PhpVmsConfig } from '../types/flight';
import { PhpVmsClient } from '../services/phpvmsClient';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface FlightSearchProps {
  phpvmsConfig: PhpVmsConfig | null;
  onSelectFlight: (flight: PhpVmsFlight) => void;
  onClose: () => void;
}

export function FlightSearch({ phpvmsConfig, onSelectFlight, onClose }: FlightSearchProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useState({
    dep_airport_id: '',
    arr_airport_id: '',
    flight_number: '',
  });
  const [flights, setFlights] = useState<PhpVmsFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<PhpVmsClient | null>(null);

  useEffect(() => {
    if (phpvmsConfig && phpvmsConfig.enabled) {
      setClient(new PhpVmsClient(phpvmsConfig));
    }
  }, [phpvmsConfig]);

  const handleSearch = async () => {
    if (!client) {
      setError(t('flightSearch.phpvmsNotConfiguredShort'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await client.searchFlights({
        dep_airport_id: searchParams.dep_airport_id || undefined,
        arr_airport_id: searchParams.arr_airport_id || undefined,
        flight_number: searchParams.flight_number || undefined,
        per_page: 50,
      });
      setFlights(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('flightSearch.failedToSearch'));
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookFlight = async (flight: PhpVmsFlight) => {
    if (!client) return;

    try {
      await client.createBid(flight.id);
      onSelectFlight(flight);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('flightSearch.failedToBook'));
    }
  };

  const isDark = effectiveTheme === 'dark';
  const bgColor = isDark ? 'bg-jal-navy-light' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-jal-navy';
  const borderColor = isDark ? 'border-white/5' : 'border-gray-200';
  const inputBg = isDark ? 'bg-jal-navy-mid' : 'bg-gray-50';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${bgColor} rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border ${borderColor}`}>
        {/* Header */}
        <div className={`${bgColor} border-b ${borderColor} px-6 py-4 flex items-center justify-between rounded-t-xl`}>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-jal-red rounded-full" />
            <h2 className={`text-xl font-bold ${textColor}`}>{t('app.searchAndBookFlight')}</h2>
          </div>
          <button
            onClick={onClose}
            className={`${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'} transition-colors p-1 rounded-lg ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Form */}
        <div className={`p-6 border-b ${borderColor}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {t('flightSearch.depAirportIcao')}
              </label>
              <input
                type="text"
                value={searchParams.dep_airport_id}
                onChange={(e) => setSearchParams({ ...searchParams, dep_airport_id: e.target.value.toUpperCase() })}
                placeholder="KJFK"
                maxLength={4}
                className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-jal-red focus:border-transparent`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {t('flightSearch.arrAirportIcao')}
              </label>
              <input
                type="text"
                value={searchParams.arr_airport_id}
                onChange={(e) => setSearchParams({ ...searchParams, arr_airport_id: e.target.value.toUpperCase() })}
                placeholder="KLAX"
                maxLength={4}
                className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-jal-red focus:border-transparent`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {t('flightSearch.flightNumber')}
              </label>
              <input
                type="text"
                value={searchParams.flight_number}
                onChange={(e) => setSearchParams({ ...searchParams, flight_number: e.target.value })}
                placeholder="UAL123"
                className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} focus:ring-2 focus:ring-jal-red focus:border-transparent`}
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !client}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-jal-red text-white rounded-lg hover:bg-jal-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-jal"
          >
            {loading ? t('flightSearch.searching') : t('flightSearch.searchFlights')}
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className={`mb-4 p-4 rounded-lg ${isDark ? 'bg-red-900/20 text-red-300 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {error}
            </div>
          )}

          {!client && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('flightSearch.phpvmsNotConfiguredLong')}
            </div>
          )}

          {flights.length === 0 && !loading && client && (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {searchParams.dep_airport_id || searchParams.arr_airport_id || searchParams.flight_number
                ? t('flightSearch.noFlightsFound')
                : t('flightSearch.enterCriteria')}
            </div>
          )}

          {flights.length > 0 && (
            <div className="space-y-3">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className={`${bgColor} border ${borderColor} rounded-lg p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-xl font-bold text-jal-red">
                          {flight.flight_number}
                        </span>
                        <span className={`text-lg ${textColor}`}>
                          {flight.dep_airport?.icao || flight.dep_airport_id} → {flight.arr_airport?.icao || flight.arr_airport_id}
                        </span>
                      </div>
                      <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <span>{t('flightSearch.aircraftLabel', { icao: flight.aircraft?.icao || 'N/A' })}</span>
                        <span className="mx-2">•</span>
                        <span>{t('flightSearch.distanceLabel', { distance: flight.distance })}</span>
                        <span className="mx-2">•</span>
                        <span>{t('flightSearch.estTimeLabel', { minutes: Math.round(flight.flight_time) })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleBookFlight(flight)}
                      className="ml-4 px-4 py-2 bg-jal-red text-white rounded-lg hover:bg-jal-red-dark transition-colors shadow-sm hover:shadow-jal"
                    >
                      {t('flightSearch.bookFlight')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
