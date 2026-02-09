import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SkyNetAcarsSnapshot } from '../types/acars';
import { CurrentFlight } from '../types/flight';

interface FlightLogEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'system' | 'phase' | 'comment' | 'radio';
}

interface FlightLogProps {
  acarsData: SkyNetAcarsSnapshot | null;
  currentFlight: CurrentFlight;
  simulatorName: string;
  onClose?: () => void;
}

export function FlightLog({ acarsData, currentFlight, simulatorName, onClose }: FlightLogProps) {
  const { effectiveTheme } = useTheme();
  const { t } = useTranslation();
  const [events, setEvents] = useState<FlightLogEvent[]>([]);
  const [comment, setComment] = useState('');
  const [flightMode, setFlightMode] = useState('offline');
  const [pauseAtTod, setPauseAtTod] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const previousAircraftRef = useRef<string | null>(null);

  // Initialize flight log with starting events
  useEffect(() => {
    if (currentFlight && events.length === 0) {
      const now = new Date();
      const initialEvents: FlightLogEvent[] = [
        {
          id: `init-${now.getTime()}`,
          timestamp: now,
          message: `Using ${simulatorName}`,
          type: 'system',
        },
        {
          id: `aircraft-${now.getTime()}`,
          timestamp: now,
          message: `Flying ${currentFlight.aircraftIcao}`,
          type: 'system',
        },
        {
          id: `boarding-${now.getTime()}`,
          timestamp: now,
          message: 'Now boarding',
          type: 'phase',
        },
      ];
      setEvents(initialEvents);
    }
  }, [currentFlight, simulatorName, events.length]);

  // Track phase changes
  useEffect(() => {
    if (acarsData && acarsData.flightPhase !== previousPhase) {
      const phaseMessages: Record<string, string> = {
        PREFLIGHT: 'Preflight checks',
        TAXI: 'Taxiing to runway',
        TAKEOFF: 'Taking off',
        CLIMB: 'Climbing',
        CRUISE: 'Cruising',
        DESCENT: 'Descending',
        APPROACH: 'On approach',
        LANDING: 'Landing',
      };

      const message = phaseMessages[acarsData.flightPhase] || acarsData.flightPhase;
      const newEvent: FlightLogEvent = {
        id: `phase-${Date.now()}`,
        timestamp: new Date(acarsData.timestamp),
        message,
        type: 'phase',
      };
      setEvents((prev) => [...prev, newEvent]);
      setPreviousPhase(acarsData.flightPhase);
    }
  }, [acarsData?.flightPhase, previousPhase, acarsData?.timestamp]);

  // Track aircraft changes
  useEffect(() => {
    if (acarsData && acarsData.aircraftIcao !== previousAircraftRef.current) {
      if (previousAircraftRef.current !== null) {
        const newEvent: FlightLogEvent = {
          id: `aircraft-change-${Date.now()}`,
          timestamp: new Date(acarsData.timestamp),
          message: `Aircraft changed to ${acarsData.aircraftIcao}`,
          type: 'system',
        };
        setEvents((prev) => [...prev, newEvent]);
      }
      previousAircraftRef.current = acarsData.aircraftIcao;
    }
  }, [acarsData?.aircraftIcao, acarsData?.timestamp]);

  // Add radio frequencies when available
  useEffect(() => {
    if (acarsData && acarsData.flightPhase === 'TAXI') {
      // Simulate radio frequencies - in real app, these would come from simulator
      const hasRadioEvent = events.some((e) => e.type === 'radio');
      if (!hasRadioEvent) {
        const newEvent: FlightLogEvent = {
          id: `radio-${Date.now()}`,
          timestamp: new Date(acarsData.timestamp),
          message: 'COM1: 124.850, COM2: 124.850, NAV1: 110.50, NAV2: 110.50, Transponder: 1200',
          type: 'radio',
        };
        setEvents((prev) => [...prev, newEvent]);
      }
    }
  }, [acarsData?.flightPhase, events]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleAddComment = () => {
    if (comment.trim()) {
      const newEvent: FlightLogEvent = {
        id: `comment-${Date.now()}`,
        timestamp: new Date(),
        message: comment.trim(),
        type: 'comment',
      };
      setEvents((prev) => [...prev, newEvent]);
      setComment('');
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const bgColor = effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const textColor = effectiveTheme === 'dark' ? 'text-white' : 'text-gray-900';
  const borderColor = effectiveTheme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const inputBg = effectiveTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';

  return (
    <div className={`${bgColor} ${borderColor} border-r h-full flex flex-col`}>
      {/* Navigation Icons */}
      <div className={`${effectiveTheme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} border-b ${borderColor} p-2 flex flex-col gap-2`}>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}
          title={t('flightLog.settings')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.flightSearch')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.activeFlight')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.compass')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.logbook')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.files')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-lg ${effectiveTheme === 'dark' ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          title={t('flightLog.links')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>
      </div>

      {/* Flight Log Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-b ${borderColor} px-4 py-3 flex items-center justify-between`}>
          <h2 className={`text-lg font-semibold ${textColor}`}>{t('flightLog.title')}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className={`${effectiveTheme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex gap-2 text-sm">
              <span className={`font-mono ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatTime(event.timestamp)}
              </span>
              <span className={`flex-1 ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {event.message}
              </span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Comment Input */}
        <div className={`${effectiveTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} border-t ${borderColor} p-4 space-y-3`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder={t('flightLog.addComment')}
              className={`flex-1 px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            />
            <button
              onClick={handleAddComment}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              {t('flightLog.comment')}
            </button>
          </div>

          {/* Flight Mode Dropdown */}
          <select
            value={flightMode}
            onChange={(e) => setFlightMode(e.target.value)}
            className={`w-full px-3 py-2 border ${borderColor} rounded-lg ${inputBg} ${textColor} text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          >
            <option value="offline">{t('flightLog.flyingOffline')}</option>
            <option value="online">{t('flightLog.flyingOnline')}</option>
          </select>

          {/* Pause Controls */}
          <div className="flex items-center justify-between">
            <label className={`flex items-center gap-2 text-sm ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                checked={pauseAtTod}
                onChange={(e) => setPauseAtTod(e.target.checked)}
                className="rounded"
              />
              {t('flightLog.pauseAtTod')}
            </label>
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              {t('flightLog.pause')}
            </button>
          </div>

          {/* Flight Plan String */}
          {currentFlight && (
            <div className={`pt-2 border-t ${borderColor}`}>
              <div className={`text-xs font-mono ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentFlight.route || `${currentFlight.departureIcao} DCT ${currentFlight.arrivalIcao}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
