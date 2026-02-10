import { FlightMap } from '../components/FlightMap';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function MapPage() {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = effectiveTheme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-jal-navy' : 'bg-jal-crane'} flex flex-col`}>
      {/* JAL Accent Bar */}
      <div className="jal-accent-bar" />

      {/* Header */}
      <header className={`${isDark ? 'bg-jal-navy-light/80 backdrop-blur-md border-white/5' : 'bg-white/80 backdrop-blur-md border-gray-200'} border-b px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link 
            to="/"
            className="flex items-center gap-2 group"
          >
            <svg className="w-7 h-7 text-jal-red" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 2c2.577 0 4.964.822 6.916 2.213L8.213 22.916A11.935 11.935 0 014 16C4 9.373 9.373 4 16 4zm0 24c-2.577 0-4.964-.822-6.916-2.213L23.787 9.084A11.935 11.935 0 0128 16c0 6.627-5.373 12-12 12z"/>
            </svg>
            <span className="text-lg font-bold text-jal-red group-hover:text-jal-red-dark transition-colors">
              SkyTRACK
            </span>
          </Link>
          <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-gray-300'}`} />
          <span className={`text-xs font-medium tracking-wider uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('app.subtitle')} • Live Map
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="jal-btn-secondary text-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('app.backToDashboard') || 'Dashboard'}
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
