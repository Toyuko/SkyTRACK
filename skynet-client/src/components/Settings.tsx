import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { settingsStorage, type LanguageCode } from '../services/settingsStorage';
import { Simulator } from '../types/acars';
import { PhpVmsConfig } from '../types/flight';
import { setAppLanguage } from '../i18n';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState<LanguageCode>(settingsStorage.getLanguage());
  const [autoReconnect, setAutoReconnect] = useState(settingsStorage.getAutoReconnect());
  const [reconnectInterval, setReconnectInterval] = useState(settingsStorage.getReconnectInterval());
  const [mockDataEnabled, setMockDataEnabled] = useState(settingsStorage.getMockDataEnabled());
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(settingsStorage.getShowAdvancedMetrics());
  const [websocketUrl, setWebsocketUrl] = useState(settingsStorage.getWebsocketUrl());
  const [simulator, setSimulator] = useState<Simulator>(settingsStorage.getSimulator());
  const [phpvmsConfig, setPhpvmsConfig] = useState<PhpVmsConfig | null>(settingsStorage.getPhpVmsConfig());

  useEffect(() => {
    // Load settings on mount
    setAutoReconnect(settingsStorage.getAutoReconnect());
    setReconnectInterval(settingsStorage.getReconnectInterval());
    setMockDataEnabled(settingsStorage.getMockDataEnabled());
    setShowAdvancedMetrics(settingsStorage.getShowAdvancedMetrics());
    setWebsocketUrl(settingsStorage.getWebsocketUrl());
    setSimulator(settingsStorage.getSimulator());
    setPhpvmsConfig(settingsStorage.getPhpVmsConfig());
    setLanguage(settingsStorage.getLanguage());
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (lang: LanguageCode) => {
    setLanguage(lang);
    setAppLanguage(lang);
  };

  const handleAutoReconnectChange = (enabled: boolean) => {
    setAutoReconnect(enabled);
    settingsStorage.setAutoReconnect(enabled);
  };

  const handleReconnectIntervalChange = (interval: number) => {
    setReconnectInterval(interval);
    settingsStorage.setReconnectInterval(interval);
  };

  const handleMockDataChange = (enabled: boolean) => {
    setMockDataEnabled(enabled);
    settingsStorage.setMockDataEnabled(enabled);
  };

  const handleAdvancedMetricsChange = (enabled: boolean) => {
    setShowAdvancedMetrics(enabled);
    settingsStorage.setShowAdvancedMetrics(enabled);
  };

  const handleWebsocketUrlChange = (url: string) => {
    setWebsocketUrl(url);
    settingsStorage.setWebsocketUrl(url);
  };

  const handleSimulatorChange = (newSimulator: Simulator) => {
    setSimulator(newSimulator);
    settingsStorage.setSimulator(newSimulator);
  };

  const handlePhpVmsConfigChange = (field: keyof PhpVmsConfig, value: string | boolean) => {
    const newConfig: PhpVmsConfig = {
      ...(phpvmsConfig || { baseUrl: '', apiToken: '', enabled: false }),
      [field]: value,
    };
    setPhpvmsConfig(newConfig);
    settingsStorage.setPhpVmsConfig(newConfig);
  };

  const handlePhpVmsToggle = (enabled: boolean) => {
    if (enabled && !phpvmsConfig) {
      handlePhpVmsConfigChange('enabled', true);
    } else {
      const newConfig: PhpVmsConfig = {
        ...(phpvmsConfig || { baseUrl: '', apiToken: '', enabled: false }),
        enabled,
      };
      setPhpvmsConfig(newConfig);
      settingsStorage.setPhpVmsConfig(newConfig);
    }
  };

  const handleReset = () => {
    if (confirm(t('settings.resetConfirm'))) {
      settingsStorage.reset();
      // Reload settings
      setTheme(settingsStorage.getTheme());
      handleLanguageChange(settingsStorage.getLanguage());
      setAutoReconnect(settingsStorage.getAutoReconnect());
      setReconnectInterval(settingsStorage.getReconnectInterval());
      setMockDataEnabled(settingsStorage.getMockDataEnabled());
      setShowAdvancedMetrics(settingsStorage.getShowAdvancedMetrics());
      setWebsocketUrl(settingsStorage.getWebsocketUrl());
      setSimulator(settingsStorage.getSimulator());
      setPhpvmsConfig(settingsStorage.getPhpVmsConfig());
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Close modal when clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-jal-navy-light rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-jal-navy-light border-b border-gray-200 dark:border-white/5 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-jal-red rounded-full" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
            aria-label={t('settings.closeAria')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Appearance Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.appearance')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.theme')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'light'
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {t('common.light')}
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {t('common.dark')}
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                      theme === 'system'
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {t('common.system')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.language')}
                </label>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-jal-navy-mid text-gray-900 dark:text-white focus:ring-2 focus:ring-jal-red focus:border-transparent"
                >
                  <option value="en">{t('languages.en')}</option>
                  <option value="es">{t('languages.es')}</option>
                  <option value="fr">{t('languages.fr')}</option>
                  <option value="ja">{t('languages.ja')}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Connection Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.connection')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.websocketUrl')}
                </label>
                <input
                  type="text"
                  value={websocketUrl}
                  onChange={(e) => handleWebsocketUrlChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('settings.websocketPlaceholder')}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.websocketRestartHint')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('settings.simulator')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSimulatorChange(Simulator.MSFS)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      simulator === Simulator.MSFS
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    MSFS / 2024
                  </button>
                  <button
                    onClick={() => handleSimulatorChange(Simulator.FSX)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      simulator === Simulator.FSX
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    FSX
                  </button>
                  <button
                    onClick={() => handleSimulatorChange(Simulator.P3D)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      simulator === Simulator.P3D
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    P3D
                  </button>
                  <button
                    onClick={() => handleSimulatorChange(Simulator.XPLANE)}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      simulator === Simulator.XPLANE
                        ? 'bg-jal-red text-white border-jal-red'
                        : 'bg-white dark:bg-jal-navy-mid text-gray-700 dark:text-gray-300 border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    X-Plane
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('settings.simulatorHint')}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.autoReconnect')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.autoReconnectHint')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReconnect}
                    onChange={(e) => handleAutoReconnectChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-jal-red/30 dark:peer-focus:ring-jal-red/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jal-red"></div>
                </label>
              </div>

              {autoReconnect && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('settings.reconnectInterval')}
                  </label>
                  <input
                    type="number"
                    value={reconnectInterval}
                    onChange={(e) => handleReconnectIntervalChange(Number(e.target.value))}
                    min="1000"
                    max="30000"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Display Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.display')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.enableMockData')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.enableMockDataHint')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mockDataEnabled}
                    onChange={(e) => handleMockDataChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-jal-red/30 dark:peer-focus:ring-jal-red/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jal-red"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.advancedMetrics')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.advancedMetricsHint')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdvancedMetrics}
                    onChange={(e) => handleAdvancedMetricsChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-jal-red/30 dark:peer-focus:ring-jal-red/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jal-red"></div>
                </label>
              </div>
            </div>
          </section>

          {/* phpVMS Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.phpvmsIntegration')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('settings.enablePhpvms')}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.enablePhpvmsHint')}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={phpvmsConfig?.enabled || false}
                    onChange={(e) => handlePhpVmsToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-jal-red/30 dark:peer-focus:ring-jal-red/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-jal-red"></div>
                </label>
              </div>

              {phpvmsConfig?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.phpvmsBaseUrl')}
                    </label>
                    <input
                      type="text"
                      value={phpvmsConfig.baseUrl || ''}
                      onChange={(e) => handlePhpVmsConfigChange('baseUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('settings.phpvmsBaseUrlPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('settings.apiToken')}
                    </label>
                    <input
                      type="password"
                      value={phpvmsConfig.apiToken || ''}
                      onChange={(e) => handlePhpVmsConfigChange('apiToken', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('settings.apiTokenPlaceholder')}
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('settings.apiTokenHint')}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Actions */}
          <section className="pt-4 border-t border-gray-200 dark:border-white/5">
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-white/10 transition-colors border border-transparent dark:border-white/5"
              >
                {t('settings.resetToDefaults')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-jal-red text-white rounded-lg hover:bg-jal-red-dark transition-colors shadow-sm hover:shadow-jal"
              >
                {t('common.close')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
