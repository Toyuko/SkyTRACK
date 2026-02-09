import { FlightMap } from '../components/FlightMap';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function MapPage() {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className={`min-h-screen ${effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex flex-col`}>
      {/* Header */}
      <header className={`${effectiveTheme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link 
            to="/"
            className={`text-2xl font-bold ${effectiveTheme === 'dark' ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
          >
            SkyNet
          </Link>
          <span className={`text-sm ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {t('app.subtitle')} • Live Map
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              effectiveTheme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            }`}
          >
            {t('app.backToDashboard') || 'Back to Dashboard'}
          </Link>
        </div>
      </header>

      {/* Map Content */}
      <main className="flex-1 min-h-0 relative">
        <FlightMap className="w-full h-full absolute inset-0" />
      </main>
    </div>
  );
}
