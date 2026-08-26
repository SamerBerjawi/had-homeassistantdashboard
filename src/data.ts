/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAEntity, Room, EnergyDataPoint, EnergySummary, MaintenanceTask, MaintenanceLogEntry, WeatherData } from './types';

export const INITIAL_ENTITIES: HAEntity[] = [
  // Bedroom
  {
    entity_id: 'vacuum.bedroom',
    state: 'on',
    attributes: {
      friendly_name: 'Homz Vacuum S10',
      room: 'Bedroom',
      mode: 'Eco',
      battery: 88,
      power: 24,
      bin_status: 'OK',
      last_cleaned: 'Yesterday, 4:15 PM'
    }
  },
  {
    entity_id: 'light.bedroom',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom Ceiling Light',
      room: 'Bedroom',
      brightness: 64,
      color: '#fef3c7', // Warm Amber
      power: 8.5
    }
  },
  {
    entity_id: 'climate.bedroom_ac',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom Climate Inverter',
      room: 'Bedroom',
      temperature: 20.5,
      target_temp: 21,
      mode: 'Eco Cool',
      fan_mode: 'Quiet',
      power: 180,
      humidity: 50
    }
  },
  {
    entity_id: 'sensor.bedroom_air_quality',
    state: 'optimal',
    attributes: {
      friendly_name: 'Bedroom Air Monitor',
      room: 'Bedroom',
      aqi: 18,
      pm25: 4.2,
      co2: 480,
      battery: 92
    }
  },
  {
    entity_id: 'sensor.bedroom_window_contact',
    state: 'clear',
    attributes: {
      friendly_name: 'Bedroom Window Contact',
      room: 'Bedroom',
      battery: 16, // Critical Red alert
      contact_open: false,
      last_opened: '3 days ago'
    }
  },
  {
    entity_id: 'sensor.bedroom_smart_shades',
    state: 'closed',
    attributes: {
      friendly_name: 'Bedroom Motorized Blinds',
      room: 'Bedroom',
      battery: 38, // Yellow alert
      position_pct: 100
    }
  },
  {
    entity_id: 'switch.bedroom_heater',
    state: 'off',
    attributes: {
      friendly_name: 'Bedroom Nightstand Plug',
      room: 'Bedroom',
      power: 0
    }
  },

  // Living Room
  {
    entity_id: 'light.living_room_main',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Main',
      room: 'Living Room',
      brightness: 80,
      color: '#ffffff',
      power: 14.2
    }
  },
  {
    entity_id: 'light.living_room_accent',
    state: 'on',
    attributes: {
      friendly_name: 'TV Backlight LED',
      room: 'Living Room',
      brightness: 45,
      color: '#7B61FF', // Brand Purple
      power: 6.0
    }
  },
  {
    entity_id: 'humidifier.main',
    state: 'on',
    attributes: {
      friendly_name: 'Humidifying Diffuser',
      room: 'Living Room',
      mode: 'Eco',
      humidity: 45,
      target_humidity: 50,
      power: 12
    }
  },
  {
    entity_id: 'media_player.living_room',
    state: 'playing',
    attributes: {
      friendly_name: 'Sonos Arc Speaker',
      room: 'Living Room',
      volume_level: 42,
      media_title: 'After Hours (Lofi Cover)',
      media_artist: 'The Weekend Dreamer',
      media_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop',
      power: 15.4
    }
  },
  {
    entity_id: 'sensor.living_room_motion',
    state: 'clear',
    attributes: {
      friendly_name: 'Living Room Motion PIR',
      room: 'Living Room',
      battery: 89, // Green
      motion_detected: false,
      last_triggered: '10 min ago'
    }
  },
  {
    entity_id: 'sensor.living_room_lux',
    state: '320 lux',
    attributes: {
      friendly_name: 'Living Room Ambient Light Sensor',
      room: 'Living Room',
      battery: 74, // Green
      lux: 320
    }
  },
  {
    entity_id: 'sensor.living_room_temp_tag',
    state: '22.1°C',
    attributes: {
      friendly_name: 'Living Room BLE Climate Tag',
      room: 'Living Room',
      battery: 34, // Yellow alert
      temperature: 22.1
    }
  },
  {
    entity_id: 'sensor.living_room_remote',
    state: 'idle',
    attributes: {
      friendly_name: 'Zigbee Media Remote',
      room: 'Living Room',
      battery: 18, // Critical Red alert
      last_used: '15 min ago'
    }
  },
  {
    entity_id: 'switch.tv_entertainment_strip',
    state: 'on',
    attributes: {
      friendly_name: 'AV Entertainment Power Strip',
      room: 'Living Room',
      power: 85.0
    }
  },

  // Kitchen
  {
    entity_id: 'light.kitchen_chandelier',
    state: 'off',
    attributes: {
      friendly_name: 'Kitchen Chandelier',
      room: 'Kitchen',
      brightness: 0,
      color: '#f5f5f5',
      power: 0
    }
  },
  {
    entity_id: 'light.kitchen_under_cabinet',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Counter LED Strip',
      room: 'Kitchen',
      brightness: 75,
      color: '#fffbeb',
      power: 12.0
    }
  },
  {
    entity_id: 'switch.coffee_maker',
    state: 'off',
    attributes: {
      friendly_name: 'Smart Espresso Maker',
      room: 'Kitchen',
      power: 0,
      water_level: 'High'
    }
  },
  {
    entity_id: 'switch.dishwasher',
    state: 'on',
    attributes: {
      friendly_name: 'Bosch Smart Dishwasher',
      room: 'Kitchen',
      power: 1200,
      mode: 'Eco Wash',
      cycle_remaining: '38 min'
    }
  },
  {
    entity_id: 'sensor.kitchen_smoke_detector',
    state: 'clear',
    attributes: {
      friendly_name: 'Kitchen Nest Smoke & CO',
      room: 'Kitchen',
      battery: 98, // Green
      status: 'Normal'
    }
  },
  {
    entity_id: 'sensor.kitchen_temperature',
    state: '23.4°C',
    attributes: {
      friendly_name: 'Kitchen Climate Sensor',
      room: 'Kitchen',
      battery: 64, // Green
      temperature: 23.4,
      humidity: 42
    }
  },
  {
    entity_id: 'sensor.kitchen_leak_detector',
    state: 'dry',
    attributes: {
      friendly_name: 'Under-Sink Water Leak Sensor',
      room: 'Kitchen',
      battery: 24, // Yellow alert
      leak_detected: false
    }
  },
  {
    entity_id: 'sensor.kitchen_cabinet_sensor',
    state: 'closed',
    attributes: {
      friendly_name: 'Pantry Door Sensor',
      room: 'Kitchen',
      battery: 14, // Critical Red alert
      last_opened: '1 hour ago'
    }
  },

  // Hall / Entrance
  {
    entity_id: 'climate.hall',
    state: 'on',
    attributes: {
      friendly_name: 'Hass Climate Zone A',
      room: 'Hall',
      temperature: 21.8,
      target_temp: 23,
      mode: 'Cooling',
      fan_mode: 'Auto',
      power: 320,
      humidity: 48
    }
  },
  {
    entity_id: 'lock.front_door',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Door Nest Lock',
      room: 'Hall',
      battery: 94, // Green
      last_changed: 'Today, 8:02 AM'
    }
  },
  {
    entity_id: 'binary_sensor.doorbell',
    state: 'off',
    attributes: {
      friendly_name: 'Ring Pro Doorbell',
      room: 'Hall',
      muted: true,
      battery: 42, // Yellow alert
      motion_detected: false
    }
  },
  {
    entity_id: 'binary_sensor.front_motion',
    state: 'off',
    attributes: {
      friendly_name: 'Front Porch Radar Sensor',
      room: 'Hall',
      battery: 95, // Green
      motion_detected: false
    }
  },
  {
    entity_id: 'sensor.hall_keypad',
    state: 'armed',
    attributes: {
      friendly_name: 'Security Alarm Keypad',
      room: 'Hall',
      battery: 12, // Critical Red alert
      tamper_clear: true
    }
  },
  {
    entity_id: 'light.hallway_entry',
    state: 'on',
    attributes: {
      friendly_name: 'Entryway Flush Mount',
      room: 'Hall',
      brightness: 50,
      color: '#fff',
      power: 6.5
    }
  },

  // Dedicated Energy System Entities
  {
    entity_id: 'sensor.solar_production',
    state: '4.8 kW',
    attributes: {
      friendly_name: 'Rooftop Solar Array (7.2 kWp)',
      room: 'Roof & Utilities',
      current_power_kw: 4.8,
      peak_today_kw: 5.4,
      daily_energy_kwh: 28.6,
      efficiency_pct: 98.2,
      inverter_temp_c: 42.1
    }
  },
  {
    entity_id: 'sensor.home_battery',
    state: '92%',
    attributes: {
      friendly_name: 'Tesla Powerwall 2 (13.5 kWh)',
      room: 'Roof & Utilities',
      level_pct: 92,
      power_kw: 1.4,
      status: 'charging', // 'charging' | 'discharging' | 'idle'
      capacity_kwh: 13.5,
      stored_kwh: 12.4,
      health_pct: 99.1,
      temperature_c: 24.3
    }
  },
  {
    entity_id: 'sensor.grid_power',
    state: 'exporting',
    attributes: {
      friendly_name: 'City Utility Smart Meter',
      room: 'Roof & Utilities',
      status: 'exporting', // 'importing' | 'exporting'
      export_kw: 2.1,
      import_kw: 0.0,
      net_flow_kw: -2.1,
      voltage_v: 238.6,
      frequency_hz: 50.02,
      today_exported_kwh: 14.8,
      today_imported_kwh: 3.2
    }
  },
  {
    entity_id: 'sensor.total_consumption',
    state: '1.3 kW',
    attributes: {
      friendly_name: 'Total Home Power Demand',
      room: 'General',
      current_kw: 1.3,
      today_consumed_kwh: 19.8,
      peak_load_kw: 4.2
    }
  }
];

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'living_room',
    name: 'Living Room',
    icon: 'Sofa',
    temperature: 22.1,
    humidity: 45,
    devicesCount: 8,
    entityIds: [
      'light.living_room_main', 
      'light.living_room_accent', 
      'humidifier.main', 
      'media_player.living_room',
      'sensor.living_room_motion',
      'sensor.living_room_lux',
      'sensor.living_room_temp_tag',
      'sensor.living_room_remote',
      'switch.tv_entertainment_strip'
    ],
    bannerImage: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?q=80&w=500&auto=format&fit=crop'
  },
  {
    id: 'bedroom',
    name: 'Bedroom',
    icon: 'BedDouble',
    temperature: 20.5,
    humidity: 50,
    devicesCount: 7,
    entityIds: [
      'light.bedroom', 
      'vacuum.bedroom',
      'climate.bedroom_ac',
      'sensor.bedroom_air_quality',
      'sensor.bedroom_window_contact',
      'sensor.bedroom_smart_shades',
      'switch.bedroom_heater'
    ],
    bannerImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=500&auto=format&fit=crop'
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    icon: 'Cookie',
    temperature: 23.4,
    humidity: 42,
    devicesCount: 8,
    entityIds: [
      'light.kitchen_chandelier', 
      'light.kitchen_under_cabinet',
      'switch.coffee_maker',
      'switch.dishwasher',
      'sensor.kitchen_smoke_detector',
      'sensor.kitchen_temperature',
      'sensor.kitchen_leak_detector',
      'sensor.kitchen_cabinet_sensor'
    ],
    bannerImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=500&auto=format&fit=crop'
  },
  {
    id: 'hall',
    name: 'Entrance Hall',
    icon: 'KeyRound',
    temperature: 21.8,
    humidity: 48,
    devicesCount: 6,
    entityIds: [
      'climate.hall', 
      'lock.front_door', 
      'binary_sensor.doorbell',
      'binary_sensor.front_motion',
      'sensor.hall_keypad',
      'light.hallway_entry'
    ],
    bannerImage: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=500&auto=format&fit=crop'
  }
];

export const CAMERA_FEEDS = [
  {
    id: 'front_door',
    name: 'Front Door Live',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
    status: 'Courier present',
    time: 'Live',
    tag: 'INTERCOM'
  },
  {
    id: 'backyard',
    name: 'Backyard Pool View',
    url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800',
    status: 'No activity',
    time: 'Live',
    tag: 'SECURITY'
  },
  {
    id: 'garage',
    name: 'Garage Interior',
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=800',
    status: 'Garage door closed',
    time: 'Live',
    tag: 'SAFETY'
  }
];

export const SCENES = [
  { id: 'morning', name: 'Morning Glow', icon: 'Sunrise', color: 'from-amber-200 to-orange-400', active: false },
  { id: 'relax', name: 'Calm Zen', icon: 'Sparkles', color: 'from-purple-300 to-indigo-400', active: true },
  { id: 'bright', name: 'Work Focus', icon: 'Sun', color: 'from-sky-200 to-blue-400', active: false },
  { id: 'away', name: 'Away Secure', icon: 'ShieldAlert', color: 'from-red-400 to-rose-600', active: false }
];

// ==========================================
// SIMULATED TIME-SERIES ENERGY DATASETS
// ==========================================

export const ENERGY_24H_HISTORY: EnergyDataPoint[] = [
  { time: '00:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.7, batteryLevel: 75, gridImport: 0.2, gridExport: 0.0, totalConsumption: 0.9, livingRoom: 0.2, bedroom: 0.4, kitchen: 0.1, hall: 0.2 },
  { time: '01:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.6, batteryLevel: 71, gridImport: 0.1, gridExport: 0.0, totalConsumption: 0.7, livingRoom: 0.1, bedroom: 0.4, kitchen: 0.1, hall: 0.1 },
  { time: '02:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.6, batteryLevel: 67, gridImport: 0.1, gridExport: 0.0, totalConsumption: 0.7, livingRoom: 0.1, bedroom: 0.4, kitchen: 0.1, hall: 0.1 },
  { time: '03:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.5, batteryLevel: 64, gridImport: 0.1, gridExport: 0.0, totalConsumption: 0.6, livingRoom: 0.1, bedroom: 0.3, kitchen: 0.1, hall: 0.1 },
  { time: '04:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.5, batteryLevel: 61, gridImport: 0.1, gridExport: 0.0, totalConsumption: 0.6, livingRoom: 0.1, bedroom: 0.3, kitchen: 0.1, hall: 0.1 },
  { time: '05:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.7, batteryLevel: 57, gridImport: 0.1, gridExport: 0.0, totalConsumption: 0.8, livingRoom: 0.2, bedroom: 0.3, kitchen: 0.1, hall: 0.2 },
  { time: '06:00', solarProduction: 0.3, batteryCharge: 0.0, batteryDischarge: 0.9, batteryLevel: 52, gridImport: 0.2, gridExport: 0.0, totalConsumption: 1.4, livingRoom: 0.3, bedroom: 0.3, kitchen: 0.5, hall: 0.3 },
  { time: '07:00', solarProduction: 1.1, batteryCharge: 0.0, batteryDischarge: 1.2, batteryLevel: 44, gridImport: 0.3, gridExport: 0.0, totalConsumption: 2.6, livingRoom: 0.4, bedroom: 0.4, kitchen: 1.4, hall: 0.4 },
  { time: '08:00', solarProduction: 2.2, batteryCharge: 0.4, batteryDischarge: 0.0, batteryLevel: 46, gridImport: 0.0, gridExport: 0.2, totalConsumption: 1.6, livingRoom: 0.4, bedroom: 0.3, kitchen: 0.6, hall: 0.3 },
  { time: '09:00', solarProduction: 3.4, batteryCharge: 1.5, batteryDischarge: 0.0, batteryLevel: 55, gridImport: 0.0, gridExport: 0.6, totalConsumption: 1.3, livingRoom: 0.3, bedroom: 0.2, kitchen: 0.4, hall: 0.4 },
  { time: '10:00', solarProduction: 4.5, batteryCharge: 2.3, batteryDischarge: 0.0, batteryLevel: 68, gridImport: 0.0, gridExport: 1.0, totalConsumption: 1.2, livingRoom: 0.3, bedroom: 0.2, kitchen: 0.3, hall: 0.4 },
  { time: '11:00', solarProduction: 5.1, batteryCharge: 2.8, batteryDischarge: 0.0, batteryLevel: 82, gridImport: 0.0, gridExport: 1.1, totalConsumption: 1.2, livingRoom: 0.3, bedroom: 0.2, kitchen: 0.3, hall: 0.4 },
  { time: '12:00', solarProduction: 5.4, batteryCharge: 2.4, batteryDischarge: 0.0, batteryLevel: 94, gridImport: 0.0, gridExport: 1.4, totalConsumption: 1.6, livingRoom: 0.4, bedroom: 0.2, kitchen: 0.6, hall: 0.4 },
  { time: '13:00', solarProduction: 5.2, batteryCharge: 1.1, batteryDischarge: 0.0, batteryLevel: 99, gridImport: 0.0, gridExport: 2.3, totalConsumption: 1.8, livingRoom: 0.5, bedroom: 0.3, kitchen: 0.5, hall: 0.5 },
  { time: '14:00', solarProduction: 4.8, batteryCharge: 0.2, batteryDischarge: 0.0, batteryLevel: 100, gridImport: 0.0, gridExport: 2.9, totalConsumption: 1.7, livingRoom: 0.5, bedroom: 0.3, kitchen: 0.4, hall: 0.5 },
  { time: '15:00', solarProduction: 4.1, batteryCharge: 0.0, batteryDischarge: 0.0, batteryLevel: 100, gridImport: 0.0, gridExport: 2.5, totalConsumption: 1.6, livingRoom: 0.5, bedroom: 0.2, kitchen: 0.4, hall: 0.5 },
  { time: '16:00', solarProduction: 3.0, batteryCharge: 0.0, batteryDischarge: 0.0, batteryLevel: 100, gridImport: 0.0, gridExport: 1.2, totalConsumption: 1.8, livingRoom: 0.6, bedroom: 0.3, kitchen: 0.4, hall: 0.5 },
  { time: '17:00', solarProduction: 1.8, batteryCharge: 0.0, batteryDischarge: 0.4, batteryLevel: 98, gridImport: 0.0, gridExport: 0.0, totalConsumption: 2.2, livingRoom: 0.7, bedroom: 0.4, kitchen: 0.6, hall: 0.5 },
  { time: '18:00', solarProduction: 0.6, batteryCharge: 0.0, batteryDischarge: 2.1, batteryLevel: 90, gridImport: 0.1, gridExport: 0.0, totalConsumption: 2.8, livingRoom: 0.9, bedroom: 0.4, kitchen: 1.1, hall: 0.4 },
  { time: '19:00', solarProduction: 0.1, batteryCharge: 0.0, batteryDischarge: 2.9, batteryLevel: 80, gridImport: 0.2, gridExport: 0.0, totalConsumption: 3.2, livingRoom: 1.1, bedroom: 0.5, kitchen: 1.2, hall: 0.4 },
  { time: '20:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 2.8, batteryLevel: 70, gridImport: 0.3, gridExport: 0.0, totalConsumption: 3.1, livingRoom: 1.2, bedroom: 0.5, kitchen: 1.0, hall: 0.4 },
  { time: '21:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 2.2, batteryLevel: 62, gridImport: 0.2, gridExport: 0.0, totalConsumption: 2.4, livingRoom: 1.0, bedroom: 0.6, kitchen: 0.4, hall: 0.4 },
  { time: '22:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 1.4, batteryLevel: 56, gridImport: 0.2, gridExport: 0.0, totalConsumption: 1.6, livingRoom: 0.6, bedroom: 0.5, kitchen: 0.2, hall: 0.3 },
  { time: '23:00', solarProduction: 0.0, batteryCharge: 0.0, batteryDischarge: 0.9, batteryLevel: 52, gridImport: 0.2, gridExport: 0.0, totalConsumption: 1.1, livingRoom: 0.3, bedroom: 0.4, kitchen: 0.1, hall: 0.3 }
];

export const ENERGY_7D_HISTORY: EnergyDataPoint[] = [
  { time: 'Mon', solarProduction: 26.4, batteryCharge: 11.2, batteryDischarge: 10.4, batteryLevel: 88, gridImport: 4.8, gridExport: 12.1, totalConsumption: 21.2, livingRoom: 7.2, bedroom: 4.8, kitchen: 5.8, hall: 3.4 },
  { time: 'Tue', solarProduction: 29.8, batteryCharge: 12.8, batteryDischarge: 11.6, batteryLevel: 94, gridImport: 3.2, gridExport: 15.6, totalConsumption: 19.8, livingRoom: 6.5, bedroom: 4.2, kitchen: 5.6, hall: 3.5 },
  { time: 'Wed', solarProduction: 22.1, batteryCharge: 9.4, batteryDischarge: 12.8, batteryLevel: 76, gridImport: 6.5, gridExport: 7.8, totalConsumption: 23.4, livingRoom: 8.1, bedroom: 5.1, kitchen: 6.4, hall: 3.8 },
  { time: 'Thu', solarProduction: 31.5, batteryCharge: 13.5, batteryDischarge: 11.2, batteryLevel: 98, gridImport: 2.6, gridExport: 18.2, totalConsumption: 18.9, livingRoom: 6.2, bedroom: 4.0, kitchen: 5.2, hall: 3.5 },
  { time: 'Fri', solarProduction: 28.2, batteryCharge: 12.0, batteryDischarge: 12.5, batteryLevel: 92, gridImport: 4.1, gridExport: 13.8, totalConsumption: 22.6, livingRoom: 8.4, bedroom: 4.9, kitchen: 5.7, hall: 3.6 },
  { time: 'Sat', solarProduction: 33.6, batteryCharge: 14.1, batteryDischarge: 13.8, batteryLevel: 100, gridImport: 2.1, gridExport: 19.4, totalConsumption: 25.8, livingRoom: 9.6, bedroom: 5.4, kitchen: 6.9, hall: 3.9 },
  { time: 'Sun', solarProduction: 28.6, batteryCharge: 12.4, batteryDischarge: 11.8, batteryLevel: 92, gridImport: 3.2, gridExport: 14.8, totalConsumption: 19.8, livingRoom: 6.8, bedroom: 4.6, kitchen: 5.0, hall: 3.4 }
];

export const ENERGY_30D_HISTORY: EnergyDataPoint[] = [
  { time: 'Week 1', solarProduction: 194.2, batteryCharge: 82.4, batteryDischarge: 78.6, batteryLevel: 90, gridImport: 26.4, gridExport: 98.6, totalConsumption: 142.5, livingRoom: 48.2, bedroom: 32.1, kitchen: 38.6, hall: 23.6 },
  { time: 'Week 2', solarProduction: 212.8, batteryCharge: 89.6, batteryDischarge: 84.2, batteryLevel: 95, gridImport: 21.8, gridExport: 118.4, totalConsumption: 136.2, livingRoom: 45.4, bedroom: 29.8, kitchen: 37.2, hall: 23.8 },
  { time: 'Week 3', solarProduction: 178.6, batteryCharge: 74.2, batteryDischarge: 86.4, batteryLevel: 82, gridImport: 34.2, gridExport: 72.8, totalConsumption: 154.6, livingRoom: 53.6, bedroom: 35.2, kitchen: 41.4, hall: 24.4 },
  { time: 'Week 4', solarProduction: 226.4, batteryCharge: 94.8, batteryDischarge: 88.0, batteryLevel: 98, gridImport: 18.5, gridExport: 132.6, totalConsumption: 148.0, livingRoom: 50.1, bedroom: 33.4, kitchen: 40.2, hall: 24.3 }
];

export const ENERGY_SUMMARY_DATA: EnergySummary = {
  todaySolarKwh: 28.6,
  todayConsumedKwh: 19.8,
  todayBatteryChargedKwh: 12.4,
  todayBatteryDischargedKwh: 11.8,
  todayGridImportKwh: 3.2,
  todayGridExportKwh: 14.8,
  selfSufficiency: 83.8, // 83.8% of consumption came from solar + battery
  solarCoverage: 144.4, // Solar generated was 144.4% of home demand
  estimatedSavings: 6.84, // $ Saved today vs grid retail
  carbonOffsetKg: 19.4 // kg CO2 avoided
};

// ==========================================
// DEVICE HEALTH & MAINTENANCE DATA
// ==========================================

export const INITIAL_MAINTENANCE_TASKS: MaintenanceTask[] = [
  {
    id: 'task_vac_filter',
    entityId: 'vacuum.bedroom',
    deviceName: 'Homz Vacuum S10',
    roomName: 'Bedroom',
    taskTitle: 'HEPA Exhaust Filter Replacement',
    category: 'filter',
    intervalDays: 60,
    lastServicedDate: '2026-06-25',
    dueDate: '2026-08-24', // Overdue by 2 days (triggering subtle alert badge!)
    status: 'overdue',
    priority: 'high',
    wearPercentage: 96,
    estimatedCost: 18.50,
    partNumber: 'HP-S10-FLT',
    instructions: 'Unclip the dustbin lid, pull out the pleated cartridge, vacuum housing, and insert new HEPA filter.',
    runtimeHours: 142
  },
  {
    id: 'task_vac_brush',
    entityId: 'vacuum.bedroom',
    deviceName: 'Homz Vacuum S10',
    roomName: 'Bedroom',
    taskTitle: 'Main Roller Brush Deep Clean',
    category: 'cleaning',
    intervalDays: 30,
    lastServicedDate: '2026-08-12', // Serviced 2 weeks ago
    dueDate: '2026-09-11',
    status: 'healthy',
    priority: 'medium',
    wearPercentage: 35,
    estimatedCost: 0,
    instructions: 'Release roller guard clips, extract tangled hair using the included blade cutter tool, and re-grease spindle.',
    runtimeHours: 48
  },
  {
    id: 'task_humidifier_descale',
    entityId: 'humidifier.main',
    deviceName: 'Humidifying Diffuser',
    roomName: 'Living Room',
    taskTitle: 'Ultrasonic Transducer Descaling',
    category: 'cleaning',
    intervalDays: 21,
    lastServicedDate: '2026-08-01',
    dueDate: '2026-08-22', // Overdue
    status: 'overdue',
    priority: 'high',
    wearPercentage: 92,
    estimatedCost: 8.00,
    partNumber: 'CITRIC-CLEAN-500',
    instructions: 'Pour 200ml warm water with 1 tbsp citric acid into the base. Soak for 20 minutes, then brush gently.',
    runtimeHours: 210
  },
  {
    id: 'task_dishwasher_filter',
    entityId: 'switch.dishwasher',
    deviceName: 'Bosch Smart Dishwasher',
    roomName: 'Kitchen',
    taskTitle: 'Triple Micro-Mesh Filter Clean',
    category: 'filter',
    intervalDays: 30,
    lastServicedDate: '2026-08-02',
    dueDate: '2026-08-30', // Due in 4 days (due soon)
    status: 'due_soon',
    priority: 'medium',
    wearPercentage: 78,
    estimatedCost: 0,
    instructions: 'Turn filter cylinder counter-clockwise, rinse under warm running water with soft bristle brush.',
    runtimeHours: 86
  },
  {
    id: 'task_ac_filter',
    entityId: 'climate.bedroom_ac',
    deviceName: 'Bedroom Climate Inverter',
    roomName: 'Bedroom',
    taskTitle: 'High-Density Pre-Filter Wash',
    category: 'filter',
    intervalDays: 60,
    lastServicedDate: '2026-07-20',
    dueDate: '2026-09-18',
    status: 'healthy',
    priority: 'medium',
    wearPercentage: 42,
    estimatedCost: 0,
    instructions: 'Open front panel, slide out antibacterial mesh screens, vacuum debris and dry in shaded airflow.',
    runtimeHours: 320
  },
  {
    id: 'task_door_lock_lube',
    entityId: 'lock.front_door',
    deviceName: 'Front Door Nest Lock',
    roomName: 'Entrance Hall',
    taskTitle: 'Deadbolt Lubrication & Calibration',
    category: 'calibration',
    intervalDays: 180,
    lastServicedDate: '2026-03-10',
    dueDate: '2026-09-06', // Due soon
    status: 'due_soon',
    priority: 'low',
    wearPercentage: 82,
    estimatedCost: 6.50,
    partNumber: 'PTFE-DRY-LUBE',
    instructions: 'Spray dry PTFE lube into strike plate and bolt shaft; perform Hass motorized travel recalibration.',
    runtimeHours: 1200
  },
  {
    id: 'task_smoke_test',
    entityId: 'sensor.kitchen_smoke_detector',
    deviceName: 'Kitchen Nest Smoke & CO',
    roomName: 'Kitchen',
    taskTitle: 'Optical Chamber Sensor Self-Test',
    category: 'inspection',
    intervalDays: 90,
    lastServicedDate: '2026-07-15',
    dueDate: '2026-10-13',
    status: 'healthy',
    priority: 'critical',
    wearPercentage: 25,
    estimatedCost: 0,
    instructions: 'Trigger manual acoustic test via central button and inspect optical sensing chamber for aerosol residue.',
    runtimeHours: 980
  },
  {
    id: 'task_solar_inverter',
    entityId: 'sensor.solar_production',
    deviceName: 'Rooftop Solar Array (7.2 kWp)',
    roomName: 'Roof & Utilities',
    taskTitle: 'Inverter Heatsink & Vent Inspection',
    category: 'inspection',
    intervalDays: 90,
    lastServicedDate: '2026-08-05',
    dueDate: '2026-11-03',
    status: 'healthy',
    priority: 'medium',
    wearPercentage: 20,
    estimatedCost: 0,
    instructions: 'Clear intake fans of dust and verify heat dissipation delta stays below 45°C during peak load.',
    runtimeHours: 540
  },
  {
    id: 'task_leak_sensor_check',
    entityId: 'sensor.kitchen_leak_detector',
    deviceName: 'Under-Sink Water Leak Sensor',
    roomName: 'Kitchen',
    taskTitle: 'Electrode Probe Resistance Check',
    category: 'inspection',
    intervalDays: 180,
    lastServicedDate: '2026-05-10',
    dueDate: '2026-11-06',
    status: 'healthy',
    priority: 'high',
    wearPercentage: 30,
    estimatedCost: 0,
    instructions: 'Dab damp paper towel on underside gold contact pads to verify instant gateway notification broadcast.',
    runtimeHours: 2400
  }
];

export const INITIAL_MAINTENANCE_LOGS: MaintenanceLogEntry[] = [
  {
    id: 'log_01',
    taskId: 'task_vac_brush',
    entityId: 'vacuum.bedroom',
    deviceName: 'Homz Vacuum S10',
    roomName: 'Bedroom',
    taskTitle: 'Main Roller Brush Deep Clean',
    servicedDate: '2026-08-12', // 2 weeks ago
    servicedBy: 'Sarah Jenkins',
    notes: 'Vacuum filter inspected and roller brush extracted. Removed hair tangle and sanitized roller bay.',
    cost: 0
  },
  {
    id: 'log_02',
    taskId: 'task_solar_inverter',
    entityId: 'sensor.solar_production',
    deviceName: 'Rooftop Solar Array (7.2 kWp)',
    roomName: 'Roof & Utilities',
    taskTitle: 'Inverter Heatsink & Vent Inspection',
    servicedDate: '2026-08-05', // 3 weeks ago
    servicedBy: 'Sarah Jenkins',
    notes: 'Cleaned intake fan grates with compressed air. Inverter operating at optimal 98.2% conversion efficiency.',
    cost: 0
  },
  {
    id: 'log_03',
    taskId: 'task_dishwasher_filter',
    entityId: 'switch.dishwasher',
    deviceName: 'Bosch Smart Dishwasher',
    roomName: 'Kitchen',
    taskTitle: 'Triple Micro-Mesh Filter Clean',
    servicedDate: '2026-08-02',
    servicedBy: 'Sarah Jenkins',
    notes: 'Flushed sediment trap and refilled regeneration salt reservoir with 1.2kg dishwasher crystal salt.',
    cost: 4.50,
    replacedPart: 'Dishwasher Salt (Finish Calgonit)'
  },
  {
    id: 'log_04',
    taskId: 'task_ac_filter',
    entityId: 'climate.bedroom_ac',
    deviceName: 'Bedroom Climate Inverter',
    roomName: 'Bedroom',
    taskTitle: 'High-Density Pre-Filter Wash',
    servicedDate: '2026-07-20',
    servicedBy: 'Sarah Jenkins',
    notes: 'Warm water wash on intake filters. Airflow static pressure decreased by 18%.',
    cost: 0
  },
  {
    id: 'log_05',
    taskId: 'task_smoke_test',
    entityId: 'sensor.kitchen_smoke_detector',
    deviceName: 'Kitchen Nest Smoke & CO',
    roomName: 'Kitchen',
    taskTitle: 'Optical Chamber Sensor Self-Test',
    servicedDate: '2026-07-15',
    servicedBy: 'Sarah Jenkins',
    notes: 'Quarterly sounder acoustic level checked (85dB at 3m). CO sensor calibrated.',
    cost: 0
  },
  {
    id: 'log_06',
    taskId: 'task_vac_filter',
    entityId: 'vacuum.bedroom',
    deviceName: 'Homz Vacuum S10',
    roomName: 'Bedroom',
    taskTitle: 'HEPA Exhaust Filter Replacement',
    servicedDate: '2026-06-25',
    servicedBy: 'Sarah Jenkins',
    notes: 'Replaced saturated cartridge with OEM high-efficiency particle filter.',
    cost: 18.50,
    replacedPart: 'OEM HEPA Filter (HP-S10-FLT)'
  }
];

export const DEFAULT_WEATHER_DATA: WeatherData = {
  location: 'San Francisco, CA',
  country: 'United States',
  temperatureC: 19,
  temperatureF: 66,
  condition: 'Partly Cloudy',
  conditionCode: 'partly-cloudy',
  highC: 22,
  lowC: 14,
  highF: 72,
  lowF: 57,
  humidity: 62,
  windSpeedKmh: 16,
  windSpeedMph: 10,
  uvIndex: 5,
  aqi: 28,
  aqiStatus: 'Good',
  feelsLikeC: 19,
  feelsLikeF: 66,
  summary: 'Pleasant coastal climate with mild onshore breeze. Optimal conditions for natural ventilation.',
  forecast: [
    { day: 'Tomorrow', condition: 'Sunny', tempC: 21, tempF: 70, highC: 23, lowC: 14 },
    { day: 'Thu', condition: 'Partly Cloudy', tempC: 19, tempF: 66, highC: 21, lowC: 13 },
    { day: 'Fri', condition: 'Mostly Sunny', tempC: 22, tempF: 72, highC: 24, lowC: 15 }
  ],
  groundingSources: [
    { title: 'National Weather Service - San Francisco Bay Area', url: 'https://forecast.weather.gov' },
    { title: 'Google Search Live Weather Grounding', url: 'https://www.google.com/search?q=weather+san+francisco' }
  ],
  lastUpdated: 'Live via Google Search Grounding',
  isGrounded: true
};
