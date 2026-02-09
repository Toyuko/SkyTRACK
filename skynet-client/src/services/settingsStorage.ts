import { Theme } from '../contexts/ThemeContext';
import { PhpVmsConfig } from '../types/flight';
import { Simulator } from '../types/acars';

const STORAGE_KEY = 'skynet_settings';

interface Settings {
  theme: Theme;
  language: LanguageCode;
  autoReconnect: boolean;
  reconnectInterval: number;
  mockDataEnabled: boolean;
  showAdvancedMetrics: boolean;
  websocketUrl: string;
  simulator: Simulator;
  phpvms: PhpVmsConfig | null;
  mapboxToken: string;
}

export type LanguageCode = 'en' | 'es' | 'fr' | 'ja';

const defaultSettings: Settings = {
  theme: 'dark',
  language: 'en',
  autoReconnect: true,
  reconnectInterval: 3000,
  mockDataEnabled: false,
  showAdvancedMetrics: false,
  websocketUrl: 'ws://localhost:3000/ws/skynet:flights',
  simulator: Simulator.MSFS,
  phpvms: null,
  mapboxToken: '',
};

// Cache parsed settings to avoid repeated localStorage parse on startup (reduces main-thread work)
let _cache: Settings | null = null;
function getCache(): Settings {
  if (_cache) return _cache;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    _cache = stored
      ? { ...defaultSettings, ...JSON.parse(stored) }
      : { ...defaultSettings };
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
    _cache = { ...defaultSettings };
  }
  return _cache as Settings;
}
function invalidateCache(): void {
  _cache = null;
}

export const settingsStorage = {
  /**
   * Get all settings
   */
  getAll(): Settings {
    return getCache();
  },

  /**
   * Save all settings
   */
  save(settings: Partial<Settings>): void {
    try {
      const current = this.getAll();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      invalidateCache();
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
      invalidateCache();
    }
  },

  /**
   * Get theme preference
   */
  getTheme(): Theme {
    return this.getAll().theme;
  },

  /**
   * Set theme preference
   */
  setTheme(theme: Theme): void {
    this.save({ theme });
  },

  /**
   * Get UI language
   */
  getLanguage(): LanguageCode {
    const settings = this.getAll();
    return settings.language || 'en';
  },

  /**
   * Set UI language
   */
  setLanguage(language: LanguageCode): void {
    this.save({ language });
  },

  /**
   * Get auto-reconnect setting
   */
  getAutoReconnect(): boolean {
    return this.getAll().autoReconnect;
  },

  /**
   * Set auto-reconnect setting
   */
  setAutoReconnect(enabled: boolean): void {
    this.save({ autoReconnect: enabled });
  },

  /**
   * Get reconnect interval
   */
  getReconnectInterval(): number {
    return this.getAll().reconnectInterval;
  },

  /**
   * Set reconnect interval
   */
  setReconnectInterval(interval: number): void {
    this.save({ reconnectInterval: interval });
  },

  /**
   * Get mock data enabled setting
   */
  getMockDataEnabled(): boolean {
    return this.getAll().mockDataEnabled;
  },

  /**
   * Set mock data enabled setting
   */
  setMockDataEnabled(enabled: boolean): void {
    this.save({ mockDataEnabled: enabled });
  },

  /**
   * Get show advanced metrics setting
   */
  getShowAdvancedMetrics(): boolean {
    return this.getAll().showAdvancedMetrics;
  },

  /**
   * Set show advanced metrics setting
   */
  setShowAdvancedMetrics(enabled: boolean): void {
    this.save({ showAdvancedMetrics: enabled });
  },

  /**
   * Get WebSocket URL
   */
  getWebsocketUrl(): string {
    return this.getAll().websocketUrl;
  },

  /**
   * Set WebSocket URL
   */
  setWebsocketUrl(url: string): void {
    this.save({ websocketUrl: url });
  },

  /**
   * Get phpVMS configuration
   */
  getPhpVmsConfig(): PhpVmsConfig | null {
    return this.getAll().phpvms;
  },

  /**
   * Set phpVMS configuration
   */
  setPhpVmsConfig(config: PhpVmsConfig | null): void {
    this.save({ phpvms: config });
  },

  /**
   * Get simulator selection
   */
  getSimulator(): Simulator {
    const settings = this.getAll();
    return settings.simulator || Simulator.MSFS;
  },

  /**
   * Set simulator selection
   */
  setSimulator(simulator: Simulator): void {
    this.save({ simulator });
  },

  /**
   * Get Mapbox token
   */
  getMapboxToken(): string {
    return this.getAll().mapboxToken || '';
  },

  /**
   * Set Mapbox token
   */
  setMapboxToken(token: string): void {
    this.save({ mapboxToken: token });
  },

  /**
   * Reset all settings to defaults
   */
  reset(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      invalidateCache();
    } catch (error) {
      console.error('[Settings] Failed to reset settings:', error);
      invalidateCache();
    }
  },
};
