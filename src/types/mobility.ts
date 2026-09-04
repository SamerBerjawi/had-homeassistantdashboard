/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CarEvMetrics {
  // Brand & Custom Assets (Stored in localStorage or settings)
  customBrandLogo?: string;
  customVehicleImage?: string;

  // Battery & Charging Telemetry
  soc?: number;                    // sensor.fordpass_*_soc (%)
  battery12V?: string | number;    // sensor.fordpass_*_battery
  battery12VUnit?: string;         // 'V'
  range?: number;                  // sensor.fordpass_*_elveh
  rangeUnit?: string;              // 'km' or 'mi'
  chargingState: string;           // sensor.fordpass_*_elvehcharging ("Charging", "Complete", "Disconnected")
  chargingPowerKW?: number;        // sensor.fordpass_*_elvehchargingpower
  isPluggedIn: boolean;            // sensor.fordpass_*_elvehplug ("Connected", "Disconnected")
  targetSoc: string;               // select.fordpass_*_elvehtargetcharge
  lastTripEnergy?: number;         // sensor.fordpass_*_lastenergyconsumed
  lastTripEnergyUnit: string;      // 'kWh'
  lastChargingLog?: string;        // sensor.fordpass_*_energytransferlogentry
  lastChargingLogUnit?: string;    // 'kWh'

  // Vehicle Status & Climate
  ignitionOn: boolean;             // sensor.fordpass_*_ignitionstatus
  ignitionStatus: string;          // sensor.fordpass_*_ignitionstatus ("Off", "On", "RemoteStarted")
  isMoving: boolean;               // sensor.fordpass_*_speed > 0
  speed?: number;                  // sensor.fordpass_*_speed
  speedUnit?: string;              // 'km/h' or 'mph'
  gearPosition: string;            // sensor.fordpass_*_gearleverposition (P, R, N, D)
  odometer?: number;               // sensor.fordpass_*_odometer
  odometerUnit?: string;           // 'km' or 'mi'
  cabinTemp?: number;              // sensor.fordpass_*_cabintemperature
  cabinTempUnit?: string;          // '°C' or '°F'
  outdoorTemp?: number;            // sensor.fordpass_*_outsidetemp
  targetCabinTemp?: number;        // climate.*_vehicle target temperature
  climateHvacMode?: string;        // 'off' | 'heat' | 'cool' | 'auto'
  defrostActive?: boolean;         // defrost / windshield heater
  rearDefrostActive?: boolean;     // rear window defogger
  seatHeatingDriver?: number;      // 0 (off), 1 (low), 2 (mid), 3 (high)
  seatHeatingPassenger?: number;   // 0 (off), 1 (low), 2 (mid), 3 (high)
  remoteClimateActive: boolean;    // switch.fordpass_*_ignition / sensor.fordpass_*_remotestartstatus
  remoteClimateTimeRemaining?: number; // sensor.fordpass_*_remotestartcountdown
  hasClimate?: boolean;            // whether climate integration is present
  chargePortOpen?: boolean;        // whether charge port is unlatched/open
  targetSocPercent?: number;       // parsed target SoC (50-100)

  // Security & Hardware Health
  doorsLocked: boolean;            // sensor.fordpass_*_doorlock / lock.fordpass_*_doorlock
  doorLockStatus: string;          // sensor.fordpass_*_doorlock ("Locked", "Unlocked")
  windowsClosed: boolean;          // sensor.fordpass_*_windowposition
  windowPositionStatus: string;    // sensor.fordpass_*_windowposition ("Closed", "Open", "Vented")
  alarmStatus: string;             // sensor.fordpass_*_alarm ("Armed", "Disarmed", "Triggered")
  indicatorsStatus: string;        // sensor.fordpass_*_indicators ("Normal", "Check Engine", etc.)
  
  // Tire Pressure details from sensor.fordpass_*_tirepressure
  tirePressure: {
    status: string;
    unit: string;
    frontLeft: number | string;
    frontRight: number | string;
    rearLeft: number | string;
    rearRight: number | string;
  };
  hasTirePressure?: boolean;

  deepSleep: boolean;              // sensor.fordpass_*_deepsleep
  oilLifePercent?: number;         // sensor.fordpass_*_oil

  // Software & OTA Update System
  softwareUpdates: {
    autoUpdatesEnabled: boolean;   // switch.fordpass_*_autosoftwareupdates
    firmwareHistory: string;       // sensor.fordpass_*_firmwareupdatehistory
    firmwareStatus: string;        // sensor.fordpass_*_firmwareupgstatus
    lastFirmwareUpdate: string;    // sensor.fordpass_*_lastfirmwareupdate
    otaReadiness: string;          // sensor.fordpass_*_otareadiness
    nextOtaCheck: string;          // sensor.fordpass_*_otaschedule
  };

  // Location & Presence
  gps: { latitude: number; longitude: number }; // sensor.fordpass_*_gps / device_tracker.fordpass_*_tracker
  locationZone: string;            // "In Home Zone", "In Work Zone", "Away"
  isAtHome: boolean;
  lastRefreshed: string;           // sensor.fordpass_*_lastrefresh

  // Live speed timeseries for bklit chart
  speedTimeseries: Array<{ date: Date; speed: number; timeLabel?: string }>;

  // Interactive Entity IDs
  controls: {
    lockDoorButtonId: string;      // button.fordpass_*_doorlock
    unlockDoorLockId: string;      // lock.fordpass_*_doorlock
    startClimateSwitchId: string;  // switch.fordpass_*_ignition
    extendClimateButtonId: string; // button.fordpass_*_extendremotestart
    flashHonkDefaultButtonId: string; // button.fordpass_*_hafdefault
    updateDataButtonId: string;    // button.fordpass_*_update_data
    requestRefreshButtonId: string;// button.fordpass_*_request_refresh
    startChargingButtonId: string; // button.fordpass_*_evstart
    chargeSwitchId: string;        // switch.fordpass_*_elvehcharge (pause/resume)
    autoSoftwareUpdatesSwitchId: string; // switch.fordpass_*_autosoftwareupdates
    climateEntityId?: string;      // climate.*_vehicle
    targetSocEntityId?: string;    // number/select for charge limit
    chargePortEntityId?: string;   // lock/switch for charge port
    defrostEntityId?: string;      // defrost switch
  };
}

export interface BikeMetrics {
  // Brand & Custom Assets
  customBrandLogo?: string;
  customBikeImage?: string;

  // Battery & Telemetry
  batteryPercent?: number;         // sensor.dark_avenger_remaining_battery / sensor.cowboy_* (%)
  internalPcbBattery?: number;     // sensor.dark_avenger_remaining_battery_internal_pcb (%)
  remainingRangeKm?: number;       // sensor.dark_avenger_remaining_range (km)
  batteryHealthPercent?: number;   // sensor.dark_avenger_battery_health (%)
  mileageKm?: number;              // sensor.dark_avenger_mileage (km)
  distanceTodayKm?: number;        // sensor.dark_avenger_distance_today (km)
  totalTimeDrivenHours?: number;   // sensor.dark_avenger_time_driven
  totalSavedCo2Kg?: number;        // sensor.dark_avenger_saved_co2
  speedLimitKmh?: number;          // sensor.dark_avenger_speed_limit

  // Security & Safety
  isLocked: boolean;               // lock.cowboy_* / sensor.dark_avenger_auto_lock
  isStolen: boolean;               // binary_sensor.dark_avenger_stolen
  isCrashed: boolean;              // binary_sensor.dark_avenger_crashed
  autoLockStatus: string;          // sensor.dark_avenger_auto_lock
  lastSeen: string;                // sensor.dark_avenger_last_seen

  // Last Trip Statistics
  lastTrip?: {
    title?: string;                // sensor.dark_avenger_last_trip_title
    distanceKm?: number;           // sensor.dark_avenger_last_trip_distance
    durationMinutes?: number;      // sensor.dark_avenger_last_trip_duration
    co2SavedKg?: number;           // sensor.dark_avenger_last_trip_co2_saved
    caloriesBurned?: number;       // sensor.dark_avenger_last_trip_calories
    endedAt?: string;              // sensor.dark_avenger_last_trip_ended
    rideMode?: string;             // sensor.dark_avenger_last_ride_mode
  };

  // Location & Presence
  gps: { latitude: number; longitude: number }; // device_tracker.dark_avenger / device_tracker.cowboy_*
  locationZone: string;            // "In Home Zone", "In Work Zone", "Away"
  isAtHome: boolean;

  // Interactive controls
  controls?: {
    lockEntityId?: string;
    autoLockSwitchId?: string;
    refreshButtonId?: string;
  };
}

export type MobilityAssetType = 'car' | 'bike';
