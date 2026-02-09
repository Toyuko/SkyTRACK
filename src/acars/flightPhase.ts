import { AcarsSnapshot } from './skynet.schema';

/**
 * Flight phase enumeration for SkyNet ACARS
 * Represents the current phase of flight as detected by ACARS clients
 */
export enum FlightPhase {
  PREFLIGHT = 'PREFLIGHT',
  TAXI = 'TAXI',
  TAKEOFF = 'TAKEOFF',
  CLIMB = 'CLIMB',
  CRUISE = 'CRUISE',
  DESCENT = 'DESCENT',
  APPROACH = 'APPROACH',
  LANDED = 'LANDED',
  BLOCKED = 'BLOCKED',
}

/**
 * Valid flight phase values as array
 */
export const FLIGHT_PHASES = Object.values(FlightPhase) as FlightPhase[];

/**
 * Check if a string is a valid flight phase
 */
export function isValidFlightPhase(phase: string): phase is FlightPhase {
  return FLIGHT_PHASES.includes(phase as FlightPhase);
}

/**
 * Flight phase detection state
 * Maintains state between detection calls to enable hysteresis and prevent phase flickering
 */
export interface FlightPhaseState {
  /**
   * Last detected flight phase
   */
  lastPhase: FlightPhase;

  /**
   * Timestamp when current phase was first detected (ISO UTC string)
   */
  phaseSince: string;

  /**
   * Last known altitude (feet MSL)
   */
  lastAltitude: number;

  /**
   * Last known timestamp (ISO UTC string)
   */
  lastTimestamp: string;

  /**
   * Whether aircraft was airborne in previous snapshot
   */
  wasAirborne: boolean;

  /**
   * Timestamp when aircraft first became airborne (ISO UTC string, or null if on ground)
   */
  airborneSince: string | null;

  /**
   * Timestamp when aircraft first touched ground after being airborne (ISO UTC string, or null)
   */
  groundContactSince: string | null;
}

/**
 * Result of flight phase detection
 */
export interface FlightPhaseResult {
  /**
   * Detected flight phase
   */
  phase: FlightPhase;

  /**
   * Whether a phase transition occurred
   */
  transitionOccurred: boolean;

  /**
   * Timestamp of the transition (ISO UTC string)
   */
  transitionTimestamp: string | null;

  /**
   * Updated state for next detection call
   */
  state: FlightPhaseState;
}

/**
 * Flight Phase Detector
 * Implements deterministic flight phase detection with hysteresis to prevent rapid phase changes
 */
export class FlightPhaseDetector {
  // Phase detection thresholds
  private static readonly TAXI_SPEED_THRESHOLD = 1; // knots - minimum speed for taxi
  private static readonly TAXI_MAX_SPEED = 40; // knots - maximum speed for taxi
  private static readonly TAKEOFF_SPEED_THRESHOLD = 40; // knots - minimum speed for takeoff
  private static readonly TAKEOFF_ALTITUDE_AGL = 1500; // feet AGL - maximum altitude for takeoff phase
  private static readonly CLIMB_VS_THRESHOLD = 300; // feet/min - minimum vertical speed for climb
  private static readonly CRUISE_VS_THRESHOLD = 300; // feet/min - vertical speed threshold for cruise
  private static readonly CRUISE_STABLE_TIME = 120; // seconds - time altitude must be stable for cruise
  private static readonly DESCENT_VS_THRESHOLD = -300; // feet/min - maximum vertical speed for descent
  private static readonly APPROACH_ALTITUDE_AGL = 3000; // feet AGL - maximum altitude for approach
  private static readonly LANDED_SPEED_THRESHOLD = 40; // knots - maximum speed after landing
  private static readonly BLOCKED_SPEED_THRESHOLD = 1; // knots - maximum speed for blocked

  // Hysteresis thresholds to prevent rapid phase changes
  private static readonly PHASE_CONFIRMATION_TIME = 5; // seconds - minimum time in phase before transition
  private static readonly TELEPORT_ALTITUDE_DELTA = 5000; // feet - sudden altitude change threshold for teleport detection
  private static readonly GROUND_CONTACT_CONFIRMATION_TIME = 3; // seconds - time on ground before confirming landing

  /**
   * Detect flight phase from ACARS snapshot
   * @param snapshot Current ACARS snapshot
   * @param previousState Previous detection state (or initial state for first call)
   * @returns Detection result with new phase and updated state
   */
  detectPhase(
    snapshot: AcarsSnapshot,
    previousState: FlightPhaseState
  ): FlightPhaseResult {
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const previousTime = new Date(previousState.lastTimestamp).getTime();
    const timeDeltaSeconds = (snapshotTime - previousTime) / 1000;

    // Detect teleport/slew (sudden altitude change)
    const altitudeDelta = Math.abs(snapshot.altitude - previousState.lastAltitude);
    const isTeleport = altitudeDelta > FlightPhaseDetector.TELEPORT_ALTITUDE_DELTA && timeDeltaSeconds < 10;

    // Infer onGround if not provided
    const onGround = this.inferOnGround(snapshot, previousState);

    // Determine if aircraft is airborne
    const isAirborne = !onGround && snapshot.altitude > 50; // 50 feet threshold for airborne

    // Update airborne state tracking
    let airborneSince = previousState.airborneSince;
    let groundContactSince = previousState.groundContactSince;

    if (isAirborne && !previousState.wasAirborne) {
      // Just became airborne
      airborneSince = snapshot.timestamp;
      groundContactSince = null;
    } else if (!isAirborne && previousState.wasAirborne) {
      // Just touched ground
      if (groundContactSince === null) {
        groundContactSince = snapshot.timestamp;
      }
    } else if (!isAirborne) {
      // Still on ground
      airborneSince = null;
    }

    // Calculate time in current phase
    const phaseSinceTime = new Date(previousState.phaseSince).getTime();
    const timeInPhaseSeconds = (snapshotTime - phaseSinceTime) / 1000;

    // Detect candidate phase based on current snapshot
    const candidatePhase = this.detectCandidatePhase(
      snapshot,
      isAirborne,
      previousState,
      timeInPhaseSeconds
    );

    // Apply hysteresis and logical phase progression rules
    const finalPhase = this.applyHysteresis(
      candidatePhase,
      previousState.lastPhase,
      timeInPhaseSeconds,
      isTeleport
    );

    // Determine if transition occurred
    const transitionOccurred = finalPhase !== previousState.lastPhase;
    const transitionTimestamp = transitionOccurred ? snapshot.timestamp : null;

    // Update phase since timestamp if transition occurred
    const newPhaseSince = transitionOccurred ? snapshot.timestamp : previousState.phaseSince;

    // Build updated state
    const updatedState: FlightPhaseState = {
      lastPhase: finalPhase,
      phaseSince: newPhaseSince,
      lastAltitude: snapshot.altitude,
      lastTimestamp: snapshot.timestamp,
      wasAirborne: isAirborne,
      airborneSince: airborneSince,
      groundContactSince: groundContactSince,
    };

    return {
      phase: finalPhase,
      transitionOccurred,
      transitionTimestamp,
      state: updatedState,
    };
  }

  /**
   * Infer onGround status if not provided in snapshot
   * Uses altitude, ground speed, and vertical speed to determine ground state
   */
  private inferOnGround(snapshot: AcarsSnapshot, previousState: FlightPhaseState): boolean {
    // If explicitly provided, use it
    if (snapshot.onGround !== undefined) {
      return snapshot.onGround;
    }

    // Infer from altitude and speed
    // Low altitude + low speed = likely on ground
    if (snapshot.altitude < 50 && snapshot.groundSpeed < 10) {
      return true;
    }

    // High altitude = definitely airborne
    if (snapshot.altitude > 200) {
      return false;
    }

    // Use previous state if available
    if (previousState.lastTimestamp) {
      return !previousState.wasAirborne;
    }

    // Default assumption: on ground if very low altitude
    return snapshot.altitude < 20;
  }

  /**
   * Detect candidate phase based on current snapshot data
   * This is the "raw" phase detection without hysteresis
   */
  private detectCandidatePhase(
    snapshot: AcarsSnapshot,
    isAirborne: boolean,
    previousState: FlightPhaseState,
    timeInPhaseSeconds: number
  ): FlightPhase {
    const verticalSpeed = snapshot.verticalSpeed ?? 0;
    const absVerticalSpeed = Math.abs(verticalSpeed);

    // Ground phases
    if (!isAirborne) {
      // BLOCKED: On ground, very low speed, and has been in this state
      if (
        snapshot.groundSpeed < FlightPhaseDetector.BLOCKED_SPEED_THRESHOLD &&
        timeInPhaseSeconds > 30 // Been stationary for 30+ seconds
      ) {
        return FlightPhase.BLOCKED;
      }

      // LANDED: On ground after being airborne, low speed
      // Check if we were airborne and have confirmed ground contact
      const groundContactTime = previousState.groundContactSince
        ? (new Date(snapshot.timestamp).getTime() - new Date(previousState.groundContactSince).getTime()) / 1000
        : 0;

      if (
        previousState.wasAirborne &&
        snapshot.groundSpeed < FlightPhaseDetector.LANDED_SPEED_THRESHOLD &&
        groundContactTime >= FlightPhaseDetector.GROUND_CONTACT_CONFIRMATION_TIME
      ) {
        return FlightPhase.LANDED;
      }

      // TAXI: On ground, moving between 1-40 knots
      if (
        snapshot.groundSpeed >= FlightPhaseDetector.TAXI_SPEED_THRESHOLD &&
        snapshot.groundSpeed < FlightPhaseDetector.TAXI_MAX_SPEED
      ) {
        return FlightPhase.TAXI;
      }

      // PREFLIGHT: On ground, very low speed
      if (snapshot.groundSpeed < FlightPhaseDetector.TAXI_SPEED_THRESHOLD) {
        return FlightPhase.PREFLIGHT;
      }
    }

    // Airborne phases
    if (isAirborne) {
      // Estimate AGL (simplified - assumes ground level is near sea level for most airports)
      // TODO: Improve AGL calculation using airport elevation data
      const estimatedAGL = snapshot.altitude;

      // APPROACH: Low altitude, descending or stable
      if (
        estimatedAGL < FlightPhaseDetector.APPROACH_ALTITUDE_AGL &&
        (verticalSpeed <= 0 || absVerticalSpeed < FlightPhaseDetector.CRUISE_VS_THRESHOLD)
      ) {
        return FlightPhase.APPROACH;
      }

      // TAKEOFF: High speed, low altitude, climbing
      if (
        snapshot.groundSpeed >= FlightPhaseDetector.TAKEOFF_SPEED_THRESHOLD &&
        estimatedAGL < FlightPhaseDetector.TAKEOFF_ALTITUDE_AGL &&
        verticalSpeed > FlightPhaseDetector.CLIMB_VS_THRESHOLD
      ) {
        return FlightPhase.TAKEOFF;
      }

      // DESCENT: Descending significantly
      if (verticalSpeed < FlightPhaseDetector.DESCENT_VS_THRESHOLD) {
        return FlightPhase.DESCENT;
      }

      // CLIMB: Climbing significantly
      if (verticalSpeed > FlightPhaseDetector.CLIMB_VS_THRESHOLD) {
        return FlightPhase.CLIMB;
      }

      // CRUISE: Stable altitude for sufficient time
      // Check if altitude has been stable (within cruise VS threshold)
      if (
        absVerticalSpeed < FlightPhaseDetector.CRUISE_VS_THRESHOLD &&
        timeInPhaseSeconds >= FlightPhaseDetector.CRUISE_STABLE_TIME
      ) {
        return FlightPhase.CRUISE;
      }

      // Default to CLIMB if ascending, DESCENT if descending, CRUISE if stable
      if (verticalSpeed > 100) {
        return FlightPhase.CLIMB;
      } else if (verticalSpeed < -100) {
        return FlightPhase.DESCENT;
      } else {
        // If we were in CRUISE before, stay in CRUISE even if time threshold not met
        if (previousState.lastPhase === FlightPhase.CRUISE) {
          return FlightPhase.CRUISE;
        }
        // Otherwise, default to CLIMB for low positive VS, DESCENT for low negative VS
        return verticalSpeed >= 0 ? FlightPhase.CLIMB : FlightPhase.DESCENT;
      }
    }

    // Fallback (should not reach here)
    return FlightPhase.PREFLIGHT;
  }

  /**
   * Apply hysteresis and logical phase progression rules
   * Prevents rapid phase changes and illogical transitions
   */
  private applyHysteresis(
    candidatePhase: FlightPhase,
    lastPhase: FlightPhase,
    timeInPhaseSeconds: number,
    isTeleport: boolean
  ): FlightPhase {
    // If teleport detected, allow phase change immediately (user may have moved aircraft)
    if (isTeleport) {
      return candidatePhase;
    }

    // If phase hasn't changed, no need for hysteresis
    if (candidatePhase === lastPhase) {
      return lastPhase;
    }

    // Require minimum time in current phase before allowing transition
    if (timeInPhaseSeconds < FlightPhaseDetector.PHASE_CONFIRMATION_TIME) {
      return lastPhase; // Stay in current phase
    }

    // Define valid phase transitions
    const validTransitions: Record<FlightPhase, FlightPhase[]> = {
      [FlightPhase.PREFLIGHT]: [
        FlightPhase.TAXI,
        FlightPhase.BLOCKED,
        FlightPhase.TAKEOFF, // Direct takeoff from preflight (e.g., short runway)
      ],
      [FlightPhase.TAXI]: [
        FlightPhase.PREFLIGHT,
        FlightPhase.TAKEOFF,
        FlightPhase.BLOCKED,
      ],
      [FlightPhase.TAKEOFF]: [
        FlightPhase.CLIMB,
        FlightPhase.CRUISE, // Short flight, direct to cruise
        FlightPhase.DESCENT, // Aborted takeoff or immediate descent
        FlightPhase.TAXI, // Aborted takeoff
      ],
      [FlightPhase.CLIMB]: [
        FlightPhase.CRUISE,
        FlightPhase.DESCENT, // Short flight, climb directly to descent
        FlightPhase.APPROACH, // Very short flight
      ],
      [FlightPhase.CRUISE]: [
        FlightPhase.DESCENT,
        FlightPhase.CLIMB, // Level change
        FlightPhase.APPROACH, // Direct approach from cruise
      ],
      [FlightPhase.DESCENT]: [
        FlightPhase.APPROACH,
        FlightPhase.CLIMB, // Go-around or level change
        FlightPhase.CRUISE, // Level off during descent
      ],
      [FlightPhase.APPROACH]: [
        FlightPhase.LANDED,
        FlightPhase.DESCENT, // Missed approach, continue descent
        FlightPhase.CLIMB, // Go-around
        FlightPhase.CRUISE, // Go-around and level off
      ],
      [FlightPhase.LANDED]: [
        FlightPhase.TAXI,
        FlightPhase.BLOCKED,
        FlightPhase.PREFLIGHT,
      ],
      [FlightPhase.BLOCKED]: [
        FlightPhase.PREFLIGHT,
        FlightPhase.TAXI,
      ],
    };

    // Check if transition is valid
    const allowedPhases = validTransitions[lastPhase] || [];
    if (!allowedPhases.includes(candidatePhase)) {
      // Invalid transition - stay in current phase
      // Exception: Allow any phase after teleport
      return lastPhase;
    }

    // Transition is valid and confirmed
    return candidatePhase;
  }

  /**
   * Create initial state for a new flight
   * @param initialSnapshot First ACARS snapshot
   * @returns Initial flight phase state
   */
  createInitialState(initialSnapshot: AcarsSnapshot): FlightPhaseState {
    const onGround = this.inferOnGround(initialSnapshot, {
      lastPhase: FlightPhase.PREFLIGHT,
      phaseSince: initialSnapshot.timestamp,
      lastAltitude: initialSnapshot.altitude,
      lastTimestamp: initialSnapshot.timestamp,
      wasAirborne: false,
      airborneSince: null,
      groundContactSince: null,
    });

    return {
      lastPhase: FlightPhase.PREFLIGHT,
      phaseSince: initialSnapshot.timestamp,
      lastAltitude: initialSnapshot.altitude,
      lastTimestamp: initialSnapshot.timestamp,
      wasAirborne: !onGround && initialSnapshot.altitude > 50,
      airborneSince: !onGround && initialSnapshot.altitude > 50 ? initialSnapshot.timestamp : null,
      groundContactSince: null,
    };
  }
}

// Export singleton instance
export const flightPhaseDetector = new FlightPhaseDetector();
