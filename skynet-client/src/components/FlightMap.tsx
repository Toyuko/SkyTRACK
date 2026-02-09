import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import MapboxMap, {
  Marker as MapboxMarker,
  NavigationControl as MapboxNavControl,
  Source as MapboxSource,
  Layer as MapboxLayer,
  ViewState,
} from 'react-map-gl/mapbox';
import MapLibreMap, {
  Marker as MapLibreMarker,
  NavigationControl as MapLibreNavControl,
  Source as MapLibreSource,
  Layer as MapLibreLayer,
} from 'react-map-gl/maplibre';
import { useTheme } from '../contexts/ThemeContext';
import { trafficDataService, FlightTraffic } from '../services/trafficDataService';
import { atcDataService, ATCStation } from '../services/atcDataService';
import { firService } from '../services/firService';
import { settingsStorage } from '../services/settingsStorage';
import { useTranslation } from 'react-i18next';
import { AirplaneIcon } from './AirplaneIcon';
import { FlightInfoPopup } from './FlightInfoPopup';
import { ATCIcon } from './ATCIcon';
import { ATCInfoPopup } from './ATCInfoPopup';

// GeoJSON types
interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

interface FlightMapProps {
  className?: string;
}

interface DisplayOptions {
  vaTraffic: boolean;
  vatsimTraffic: boolean;
  ivaoTraffic: boolean;
  atc: boolean;
  firBoundaries: boolean;
}

export function FlightMap({ className = '' }: FlightMapProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const [traffic, setTraffic] = useState<FlightTraffic[]>([]);
  const [atcStations, setAtcStations] = useState<ATCStation[]>([]);
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    vaTraffic: true,
    vatsimTraffic: false,
    ivaoTraffic: false,
    atc: false,
    firBoundaries: false,
  });
  const [showDisplayPanel, setShowDisplayPanel] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 0,
    latitude: 20,
    zoom: 2,
    bearing: 0,
    pitch: 0,
  });
  const [hasInitialView, setHasInitialView] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightTraffic | null>(null);
  const [selectedATC, setSelectedATC] = useState<ATCStation | null>(null);
  const mapRef = useRef<{ setConfigProperty: (a: string, b: string, c: string) => void } | null>(null);

  // Load Mapbox token from environment or settings
  useEffect(() => {
    // Try environment variable first, then settings
    const envToken = import.meta.env.VITE_MAPBOX_TOKEN || '';
    const settingsToken = settingsStorage.getMapboxToken();
    const token = envToken || settingsToken;
    
    if (!token) {
      console.warn('[FlightMap] Mapbox token not found. Please set VITE_MAPBOX_TOKEN environment variable or configure it in settings.');
    }
    setMapboxToken(token);
  }, []);

  // Fetch traffic data periodically
  useEffect(() => {
    const fetchTraffic = async () => {
      const allTraffic: FlightTraffic[] = [];

      if (displayOptions.vaTraffic) {
        const vaTraffic = await trafficDataService.fetchVATraffic();
        allTraffic.push(...vaTraffic);
      }

      if (displayOptions.vatsimTraffic) {
        const vatsimTraffic = await trafficDataService.fetchVATSIMTraffic();
        allTraffic.push(...vatsimTraffic);
      }

      if (displayOptions.ivaoTraffic) {
        const ivaoTraffic = await trafficDataService.fetchIVAOTraffic();
        allTraffic.push(...ivaoTraffic);
      }

      setTraffic(allTraffic);
    };

    fetchTraffic();
    const interval = setInterval(fetchTraffic, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [displayOptions]);

  // Fetch ATC data periodically
  useEffect(() => {
    if (!displayOptions.atc) {
      setAtcStations([]);
      return;
    }

    const fetchATC = async () => {
      const allATC: ATCStation[] = [];

      // Fetch both VATSIM and IVAO ATC
      const [vatsimATC, ivaoATC] = await Promise.all([
        atcDataService.fetchVATSIMATC(),
        atcDataService.fetchIVAOATC(),
      ]);

      allATC.push(...vatsimATC, ...ivaoATC);
      setAtcStations(allATC);
    };

    fetchATC();
    const interval = setInterval(fetchATC, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [displayOptions.atc]);

  const toggleDisplayOption = useCallback((option: keyof DisplayOptions) => {
    setDisplayOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  }, []);

  const filteredTraffic = traffic.filter((flight) => {
    if (flight.source === 'va' && !displayOptions.vaTraffic) return false;
    if (flight.source === 'vatsim' && !displayOptions.vatsimTraffic) return false;
    if (flight.source === 'ivao' && !displayOptions.ivaoTraffic) return false;
    return true;
  });

  const getTrafficColor = (source: FlightTraffic['source']): string => {
    switch (source) {
      case 'va':
        return '#ef4444'; // red-500
      case 'vatsim':
        return '#3b82f6'; // blue-500
      case 'ivao':
        return '#10b981'; // green-500
      default:
        return '#ffffff';
    }
  };

  const getATCColor = (source: ATCStation['source']): string => {
    switch (source) {
      case 'vatsim':
        return '#3b82f6'; // blue-500
      case 'ivao':
        return '#10b981'; // green-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Initialize view state around current traffic once when data is available
  useEffect(() => {
    if (hasInitialView || filteredTraffic.length === 0) return;

    const avgLat =
      filteredTraffic.reduce((sum, f) => sum + f.latitude, 0) / filteredTraffic.length;
    const avgLon =
      filteredTraffic.reduce((sum, f) => sum + f.longitude, 0) / filteredTraffic.length;

    setViewState((prev) => ({
      ...prev,
      latitude: isFinite(avgLat) ? avgLat : prev.latitude,
      longitude: isFinite(avgLon) ? avgLon : prev.longitude,
      zoom: 3,
    }));
    setHasInitialView(true);
  }, [filteredTraffic, hasInitialView]);

  // Use Standard style (v3 default); classic styles can fail with mapbox-gl v3
  const mapboxStyle = 'mapbox://styles/mapbox/standard';

  const maplibreStyle = 'https://demotiles.maplibre.org/style.json';

  // Use MapLibre in Tauri desktop app - Mapbox often fails in WebView (CSP, token, WebGL)
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const useMapLibre = isTauri || !mapboxToken;

  const applyLightPreset = useCallback(
    (map: { setConfigProperty: (a: string, b: string, c: string) => void } | null) => {
      if (!map) return;
      map.setConfigProperty(
        'basemap',
        'lightPreset',
        effectiveTheme === 'dark' ? 'night' : 'day'
      );
    },
    [effectiveTheme]
  );

  useEffect(() => {
    applyLightPreset(mapRef.current);
  }, [effectiveTheme, applyLightPreset]);

  const MapMarker = useMapLibre ? MapLibreMarker : MapboxMarker;
  const NavControl = useMapLibre ? MapLibreNavControl : MapboxNavControl;
  const MapSource = useMapLibre ? MapLibreSource : MapboxSource;
  const MapLayer = useMapLibre ? MapLibreLayer : MapboxLayer;

  // Convert FIR zones to GeoJSON for display
  const firGeoJSON = useMemo<GeoJSONFeatureCollection>(() => {
    if (!displayOptions.firBoundaries) {
      return { type: 'FeatureCollection', features: [] };
    }

    const firZones = firService.getAllFIRZones();
    const features: GeoJSONFeature[] = firZones.map((fir) => ({
      type: 'Feature',
      properties: {
        id: fir.id,
        name: fir.name,
        icao: fir.icao,
        country: fir.country,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [fir.boundary],
      },
    }));

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [displayOptions.firBoundaries]);

  const mapContent = (
    <>
      <NavControl position="top-left" />
      
      {/* FIR Boundaries */}
      {displayOptions.firBoundaries && firGeoJSON.features.length > 0 && (
        <MapSource id="fir-boundaries" type="geojson" data={firGeoJSON}>
          <MapLayer
            id="fir-boundaries-fill"
            type="fill"
            paint={{
              'fill-color': effectiveTheme === 'dark' ? '#1e40af' : '#3b82f6',
              'fill-opacity': 0.1,
            }}
          />
          <MapLayer
            id="fir-boundaries-line"
            type="line"
            paint={{
              'line-color': effectiveTheme === 'dark' ? '#60a5fa' : '#2563eb',
              'line-width': 2,
              'line-opacity': 0.6,
            }}
          />
        </MapSource>
      )}

      {/* Traffic Markers */}
      {filteredTraffic.map((flight, index) => (
        <MapMarker
          key={`${flight.source}-${flight.callsign}-${index}`}
          longitude={flight.longitude}
          latitude={flight.latitude}
          anchor="center"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFlight(flight);
              setSelectedATC(null);
            }}
            className="cursor-pointer hover:scale-110 transition-transform duration-200"
            title={`${flight.callsign} • ${flight.altitude.toFixed(0)} ft • ${flight.groundSpeed.toFixed(0)} kt`}
          >
            <AirplaneIcon
              color={getTrafficColor(flight.source)}
              size={24}
              heading={flight.heading}
            />
          </button>
        </MapMarker>
      ))}
      
      {/* ATC Markers */}
      {displayOptions.atc && atcStations.map((atc, index) => (
        <MapMarker
          key={`atc-${atc.source}-${atc.callsign}-${index}`}
          longitude={atc.longitude}
          latitude={atc.latitude}
          anchor="center"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedATC(atc);
              setSelectedFlight(null);
            }}
            className="cursor-pointer hover:scale-110 transition-transform duration-200"
            title={`${atc.callsign} • ${atc.frequency} MHz • ${atc.facility}`}
          >
            <ATCIcon
              facility={atc.facility}
              size={24}
              color={getATCColor(atc.source)}
            />
          </button>
        </MapMarker>
      ))}
    </>
  );

  return (
    <div
      className={`${className} relative ${
        effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
      } overflow-hidden flex flex-col`}
    >
      {/* Map area - explicit dimensions required for mapbox-gl to render */}
      <div className="flex-1 relative w-full h-full">
        {useMapLibre ? (
          <MapLibreMap
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState as ViewState)}
            mapStyle={maplibreStyle}
            style={{ width: '100%', height: '100%' }}
          >
            {mapContent}
          </MapLibreMap>
        ) : (
          <MapboxMap
            {...viewState}
            mapboxAccessToken={mapboxToken}
            onMove={(evt) => setViewState(evt.viewState as ViewState)}
            onLoad={(evt) => {
              mapRef.current = evt.target;
              applyLightPreset(evt.target);
            }}
            mapStyle={mapboxStyle}
            reuseMaps
            projection="globe"
            style={{ width: '100%', height: '100%' }}
          >
            {mapContent}
          </MapboxMap>
        )}
      </div>

      {/* Display Options Panel */}
      {showDisplayPanel && (
        <div className={`absolute top-4 right-4 ${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 min-w-[240px] border ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              DISPLAY
            </h3>
            <button
              onClick={() => setShowDisplayPanel(false)}
              className={`${effectiveTheme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            <DisplayToggle
              label="Current VA Traffic"
              enabled={displayOptions.vaTraffic}
              onChange={() => toggleDisplayOption('vaTraffic')}
              theme={effectiveTheme}
            />
            <DisplayToggle
              label="VATSIM Traffic"
              enabled={displayOptions.vatsimTraffic}
              onChange={() => toggleDisplayOption('vatsimTraffic')}
              theme={effectiveTheme}
            />
            <DisplayToggle
              label="IVAO Traffic"
              enabled={displayOptions.ivaoTraffic}
              onChange={() => toggleDisplayOption('ivaoTraffic')}
              theme={effectiveTheme}
            />
            <DisplayToggle
              label="Air Traffic Control"
              enabled={displayOptions.atc}
              onChange={() => toggleDisplayOption('atc')}
              theme={effectiveTheme}
            />
            <DisplayToggle
              label="FIR Boundaries"
              enabled={displayOptions.firBoundaries}
              onChange={() => toggleDisplayOption('firBoundaries')}
              theme={effectiveTheme}
            />
          </div>
        </div>
      )}

      {/* Show panel button when hidden */}
      {!showDisplayPanel && (
        <button
          onClick={() => setShowDisplayPanel(true)}
          className={`absolute top-4 right-4 ${effectiveTheme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} rounded-lg p-2 shadow-lg border ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Map attribution */}
      <div className="absolute bottom-2 left-2">
        <div className={`text-xs ${effectiveTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
          {useMapLibre ? '© MapLibre' : '© Mapbox'}
        </div>
      </div>

      {/* Traffic and ATC count */}
      <div className={`absolute bottom-2 right-4 ${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg px-3 py-1 shadow-lg border ${effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex flex-col gap-1">
          <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {filteredTraffic.length} {t('map.flights') || 'flights'}
          </span>
          {displayOptions.atc && (
            <span className={`text-xs font-medium ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {atcStations.length} {t('map.atcStations') || 'ATC stations'}
            </span>
          )}
        </div>
      </div>

      {/* Flight Info Popup */}
      {selectedFlight && (
        <FlightInfoPopup
          flight={selectedFlight}
          onClose={() => setSelectedFlight(null)}
        />
      )}

      {/* ATC Info Popup */}
      {selectedATC && (
        <ATCInfoPopup
          atc={selectedATC}
          onClose={() => setSelectedATC(null)}
        />
      )}
    </div>
  );
}

interface DisplayToggleProps {
  label: string;
  enabled: boolean;
  onChange: () => void;
  theme: 'dark' | 'light';
}

function DisplayToggle({ label, enabled, onChange, theme }: DisplayToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <label className={`text-sm cursor-pointer flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} onClick={onChange}>
        {label}
      </label>
      <button
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled
            ? 'bg-red-500'
            : theme === 'dark'
            ? 'bg-gray-600'
            : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
