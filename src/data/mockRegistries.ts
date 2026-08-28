/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAArea, HADevice, HAEntityRegistryEntry, HAFloor, HALabel, HAState } from '../types';

export const MOCK_LABELS: HALabel[] = [
  {
    label_id: 'security',
    name: 'Security Critical',
    icon: 'Shield',
    color: '#f43f5e',
    description: 'Monitored sensors and perimeter security devices'
  },
  {
    label_id: 'eco_mode',
    name: 'Energy Saver',
    icon: 'Lightning',
    color: '#10b981',
    description: 'High efficiency energy management'
  },
  {
    label_id: 'climate_zone',
    name: 'HVAC Active',
    icon: 'Thermometer',
    color: '#0ea5e9',
    description: 'Thermostats, HVAC, and temperature probes'
  },
  {
    label_id: 'guest_access',
    name: 'Guest Accessible',
    icon: 'User',
    color: '#a855f7',
    description: 'Accessible in guest kiosk profile'
  },
  {
    label_id: 'automation',
    name: 'Smart Automated',
    icon: 'Sparkle',
    color: '#f59e0b',
    description: 'Entities controlled by automated routines'
  }
];

export const MOCK_FLOORS: HAFloor[] = [
  {
    floor_id: 'floor_ground',
    name: 'Ground Floor',
    level: 0,
    icon: 'Layers'
  },
  {
    floor_id: 'floor_first',
    name: 'First Floor',
    level: 1,
    icon: 'Building'
  },
  {
    floor_id: 'floor_outdoor',
    name: 'Outdoors & Perimeter',
    level: -1,
    icon: 'Trees'
  }
];

export const MOCK_AREAS: HAArea[] = [
  {
    area_id: 'living_room',
    name: 'Living Room',
    floor_id: 'floor_ground',
    icon: 'Tv',
    picture: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'bedroom',
    name: 'Master Bedroom',
    floor_id: 'floor_first',
    icon: 'Bed',
    picture: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'kitchen',
    name: 'Kitchen & Dining',
    floor_id: 'floor_ground',
    icon: 'Utensils',
    picture: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'office',
    name: 'Home Studio & Office',
    floor_id: 'floor_first',
    icon: 'Laptop',
    picture: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'hallway',
    name: 'Hallway & Entry',
    floor_id: 'floor_ground',
    icon: 'DoorOpen',
    picture: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'patio',
    name: 'Patio & Garden',
    floor_id: 'floor_outdoor',
    icon: 'Trees',
    picture: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop'
  },
  {
    area_id: 'garage',
    name: 'Utility & Garage',
    floor_id: 'floor_ground',
    icon: 'Car',
    picture: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=1000&auto=format&fit=crop'
  }
];

export const MOCK_DEVICES: HADevice[] = [
  // Living Room Devices
  {
    id: 'dev_philips_hue_bridge',
    name: 'Philips Hue Bridge v2',
    area_id: 'living_room',
    manufacturer: 'Signify Netherlands B.V.',
    model: 'BSB002',
    sw_version: '1.64.1964088020'
  },
  {
    id: 'dev_sonos_arc',
    name: 'Sonos Arc Soundbar',
    area_id: 'living_room',
    manufacturer: 'Sonos',
    model: 'Arc + Sub Gen 3',
    sw_version: '16.2.1'
  },
  {
    id: 'dev_ecobee_living',
    name: 'Ecobee Smart Thermostat Premium',
    area_id: 'living_room',
    manufacturer: 'Ecobee',
    model: 'EB-STATE6-01',
    sw_version: '4.8.7.202'
  },
  {
    id: 'dev_lg_oled_tv',
    name: 'LG OLED C3 65"',
    area_id: 'living_room',
    manufacturer: 'LG Electronics',
    model: 'OLED65C3PUA',
    sw_version: 'webOS 23.10.4'
  },
  {
    id: 'dev_apple_tv_living',
    name: 'Living Room Apple TV 4K',
    area_id: 'living_room',
    manufacturer: 'Apple Inc.',
    model: 'Apple TV 4K (3rd Gen)',
    sw_version: 'tvOS 17.5'
  },
  {
    id: 'dev_chromecast_office',
    name: 'Office Chromecast with Google TV',
    area_id: 'office',
    manufacturer: 'Google LLC',
    model: 'Chromecast with Google TV (4K)',
    sw_version: 'Android TV 12'
  },

  // Bedroom Devices
  {
    id: 'dev_roborock_s10',
    name: 'Roborock S10 Ultra',
    area_id: 'bedroom',
    manufacturer: 'Roborock',
    model: 'roborock.vacuum.s10u',
    sw_version: '4.3.6_1942'
  },
  {
    id: 'dev_daikin_ac_bedroom',
    name: 'Daikin Alira X Inverter AC',
    area_id: 'bedroom',
    manufacturer: 'Daikin',
    model: 'FTXZ25NV1B',
    sw_version: '2.14.0'
  },
  {
    id: 'dev_homepod_bedroom',
    name: 'Apple HomePod Stereo Pair',
    area_id: 'bedroom',
    manufacturer: 'Apple Inc.',
    model: 'HomePod Gen 2',
    sw_version: 'audioOS 17.5'
  },
  {
    id: 'dev_aqara_bedroom_shades',
    name: 'Aqara Smart Roller Shade E1',
    area_id: 'bedroom',
    manufacturer: 'Lumi United',
    model: 'ZNGZDJ11LM',
    sw_version: '0.0.0_0028'
  },

  // Kitchen Devices
  {
    id: 'dev_shelly_pro_4pm_kitchen',
    name: 'Shelly Pro 4PM Relay',
    area_id: 'kitchen',
    manufacturer: 'Shelly Group',
    model: 'SNSW-004P16EU',
    sw_version: '1.2.3'
  },
  {
    id: 'dev_nespresso_expert',
    name: 'Nespresso Expert Smart Brewer',
    area_id: 'kitchen',
    manufacturer: 'Krups / DeLonghi',
    model: 'EN350.G',
    sw_version: '1.0.8'
  },
  {
    id: 'dev_kitchen_refrigerator',
    name: 'Samsung Family Hub Refrigerator',
    area_id: 'kitchen',
    manufacturer: 'Samsung Electronics',
    model: 'RF28R7551SR',
    sw_version: 'Tizen 7.0'
  },

  // Office Devices
  {
    id: 'dev_philips_hue_office',
    name: 'Hue Play Gradient Lightstrip',
    area_id: 'office',
    manufacturer: 'Signify Netherlands B.V.',
    model: '929002422701',
    sw_version: '1.108.7'
  },
  {
    id: 'dev_standing_desk',
    name: 'OmniDesk Pro Smart Height Controller',
    area_id: 'office',
    manufacturer: 'OmniDesk',
    model: 'OD-ESP32-V2',
    sw_version: '2.4.1'
  },

  // Hallway & Security
  {
    id: 'dev_yale_smart_lock',
    name: 'Yale Linus Smart Lock v2',
    area_id: 'hallway',
    manufacturer: 'Assa Abloy (Yale)',
    model: 'YMD-LINUS-V2',
    sw_version: '3.1.2'
  },
  {
    id: 'dev_ring_video_doorbell',
    name: 'Ring Pro 2 2K HDR Doorbell',
    area_id: 'hallway',
    manufacturer: 'Ring LLC',
    model: '5AT3T5',
    sw_version: '12.0.48'
  },

  // Patio & Garden Devices
  {
    id: 'dev_rachio_sprinklers',
    name: 'Rachio 3 Smart Sprinkler Controller',
    area_id: 'patio',
    manufacturer: 'Rachio Inc.',
    model: '8ZULW-C',
    sw_version: 'iro3-firmware-644'
  },
  {
    id: 'dev_unifi_protect_patio',
    name: 'UniFi G5 Pro 4K Security Camera',
    area_id: 'patio',
    manufacturer: 'Ubiquiti Inc.',
    model: 'UVC-G5-Pro',
    sw_version: '4.70.39'
  },

  // Utility & Garage Devices
  {
    id: 'dev_solaredge_inverter',
    name: 'SolarEdge Energy Hub Inverter',
    area_id: 'garage',
    manufacturer: 'SolarEdge Technologies',
    model: 'SE7600H-US',
    sw_version: '4.19.45'
  },
  {
    id: 'dev_tesla_powerwall',
    name: 'Tesla Powerwall 3 Battery System',
    area_id: 'garage',
    manufacturer: 'Tesla Motors',
    model: 'Powerwall 3',
    sw_version: '24.12.3'
  },
  {
    id: 'dev_chamberlain_myq',
    name: 'Chamberlain myQ Smart Garage Door',
    area_id: 'garage',
    manufacturer: 'Chamberlain Group',
    model: 'MYQ-G0401-ES',
    sw_version: '5.241'
  },

  // Unassigned / Standalone Hardware to test inheritance & unassigned grouping!
  {
    id: 'dev_shelly_plug_unassigned',
    name: 'Shelly Plus Plug US (Portable)',
    area_id: null, // Device has no area!
    manufacturer: 'Shelly Group',
    model: 'SNPL-00112US',
    sw_version: '1.2.1'
  }
];

export const MOCK_ENTITY_REGISTRY: HAEntityRegistryEntry[] = [
  // ---------------- Living Room Entities ----------------
  {
    entity_id: 'light.living_room_main',
    name: 'Living Room Main Lights',
    area_id: 'living_room', // Direct match
    device_id: 'dev_philips_hue_bridge',
    platform: 'hue',
    entity_category: null
  },
  {
    entity_id: 'light.living_room_accent',
    name: 'TV Backlight Ambilight',
    area_id: 'living_room', // Direct match
    device_id: 'dev_philips_hue_bridge',
    platform: 'hue',
    entity_category: null
  },
  {
    entity_id: 'climate.living_room_ecobee',
    name: 'Living Room Thermostat',
    area_id: null, // Inherited match via dev_ecobee_living (area_id = 'living_room')
    device_id: 'dev_ecobee_living',
    platform: 'ecobee',
    entity_category: null
  },
  {
    entity_id: 'sensor.living_room_temp',
    name: 'Living Room Ambient Temperature',
    area_id: null, // Inherited match
    device_id: 'dev_ecobee_living',
    platform: 'ecobee',
    device_class: 'temperature',
    unit_of_measurement: '°C'
  },
  {
    entity_id: 'sensor.living_room_humidity',
    name: 'Living Room Humidity',
    area_id: null, // Inherited match
    device_id: 'dev_ecobee_living',
    platform: 'ecobee',
    device_class: 'humidity',
    unit_of_measurement: '%'
  },
  {
    entity_id: 'media_player.living_room_sonos',
    name: 'Living Room Sonos Arc',
    area_id: null, // Inherited match via dev_sonos_arc
    device_id: 'dev_sonos_arc',
    platform: 'sonos',
    entity_category: null
  },
  {
    entity_id: 'media_player.living_room_tv',
    name: 'LG OLED C3 TV',
    area_id: 'living_room',
    device_id: 'dev_lg_oled_tv',
    platform: 'webostv'
  },
  {
    entity_id: 'remote.living_room_tv',
    name: 'LG Magic Remote',
    area_id: 'living_room',
    device_id: 'dev_lg_oled_tv',
    platform: 'webostv'
  },
  {
    entity_id: 'media_player.living_room_apple_tv',
    name: 'Living Room Apple TV',
    area_id: 'living_room',
    device_id: 'dev_apple_tv_living',
    platform: 'apple_tv'
  },
  {
    entity_id: 'remote.living_room_apple_tv',
    name: 'Apple TV Remote',
    area_id: 'living_room',
    device_id: 'dev_apple_tv_living',
    platform: 'apple_tv'
  },
  {
    entity_id: 'media_player.office_chromecast',
    name: 'Office Chromecast',
    area_id: 'office',
    device_id: 'dev_chromecast_office',
    platform: 'cast'
  },
  {
    entity_id: 'remote.office_chromecast',
    name: 'Office Chromecast Remote',
    area_id: 'office',
    device_id: 'dev_chromecast_office',
    platform: 'cast'
  },
  {
    entity_id: 'sensor.living_room_sonos_wifi_rssi',
    name: 'Sonos Arc WiFi Signal',
    area_id: null,
    device_id: 'dev_sonos_arc',
    entity_category: 'diagnostic', // Diagnostic entity test!
    unit_of_measurement: 'dBm'
  },
  {
    entity_id: 'switch.living_room_diffuser',
    name: 'Aromatherapy Diffuser',
    area_id: 'living_room',
    device_id: null,
    platform: 'tuya'
  },

  // ---------------- Master Bedroom Entities ----------------
  {
    entity_id: 'light.bedroom_ceiling',
    name: 'Bedroom Ceiling Light',
    area_id: 'bedroom',
    device_id: null,
    platform: 'hue'
  },
  {
    entity_id: 'light.bedroom_nightstand',
    name: 'Nightstand Reading Light',
    area_id: 'bedroom',
    device_id: null,
    platform: 'hue'
  },
  {
    entity_id: 'vacuum.bedroom_roborock',
    name: 'Roborock S10 Vacuum',
    area_id: null, // Inherited match via dev_roborock_s10
    device_id: 'dev_roborock_s10',
    platform: 'roborock'
  },
  {
    entity_id: 'sensor.bedroom_vacuum_battery',
    name: 'Roborock Battery Level',
    area_id: null,
    device_id: 'dev_roborock_s10',
    entity_category: 'diagnostic',
    unit_of_measurement: '%'
  },
  {
    entity_id: 'climate.bedroom_ac',
    name: 'Bedroom Daikin AC',
    area_id: null, // Inherited match
    device_id: 'dev_daikin_ac_bedroom',
    platform: 'daikin'
  },
  {
    entity_id: 'cover.bedroom_shades',
    name: 'Bedroom Motorized Shades',
    area_id: null, // Inherited match via dev_aqara_bedroom_shades
    device_id: 'dev_aqara_bedroom_shades',
    platform: 'aqara'
  },
  {
    entity_id: 'media_player.bedroom_homepod',
    name: 'Bedroom HomePod',
    area_id: null, // Inherited match
    device_id: 'dev_homepod_bedroom',
    platform: 'apple_tv'
  },
  {
    entity_id: 'remote.bedroom_homepod_remote',
    name: 'Bedroom HomePod Remote',
    area_id: 'bedroom',
    device_id: 'dev_homepod_bedroom',
    platform: 'apple_tv'
  },
  {
    entity_id: 'binary_sensor.bedroom_window_contact',
    name: 'Bedroom Window Sensor',
    area_id: 'bedroom',
    device_id: null,
    platform: 'zigbee2mqtt',
    device_class: 'window'
  },
  {
    entity_id: 'sensor.bedroom_air_quality',
    name: 'Bedroom Air Monitor AQI',
    area_id: 'bedroom',
    device_id: null,
    platform: 'esphome',
    device_class: 'aqi'
  },

  // ---------------- Kitchen Entities ----------------
  {
    entity_id: 'light.kitchen_spots',
    name: 'Kitchen Island Spotlights',
    area_id: 'kitchen',
    device_id: 'dev_shelly_pro_4pm_kitchen',
    platform: 'shelly'
  },
  {
    entity_id: 'light.kitchen_under_cabinet',
    name: 'Under-Cabinet Warm LED',
    area_id: 'kitchen',
    device_id: 'dev_shelly_pro_4pm_kitchen',
    platform: 'shelly'
  },
  {
    entity_id: 'switch.kitchen_espresso_machine',
    name: 'Nespresso Expert Brewer',
    area_id: null, // Inherited match via dev_nespresso_expert
    device_id: 'dev_nespresso_expert',
    platform: 'switch'
  },
  {
    entity_id: 'sensor.kitchen_fridge_temp',
    name: 'Fridge Main Compartment',
    area_id: null, // Inherited match
    device_id: 'dev_kitchen_refrigerator',
    device_class: 'temperature',
    unit_of_measurement: '°C'
  },
  {
    entity_id: 'binary_sensor.kitchen_fridge_door',
    name: 'Fridge Door Open Alert',
    area_id: null,
    device_id: 'dev_kitchen_refrigerator',
    device_class: 'door'
  },

  // ---------------- Home Office Entities ----------------
  {
    entity_id: 'light.office_desk_bar',
    name: 'Desk Monitor ScreenBar',
    area_id: 'office',
    device_id: 'dev_philips_hue_office',
    platform: 'hue'
  },
  {
    entity_id: 'light.office_ambient_strip',
    name: 'Office Bookshelf Accent',
    area_id: 'office',
    device_id: 'dev_philips_hue_office',
    platform: 'hue'
  },
  {
    entity_id: 'cover.office_standing_desk',
    name: 'OmniDesk Motorized Desk',
    area_id: null, // Inherited match
    device_id: 'dev_standing_desk',
    platform: 'esphome'
  },
  {
    entity_id: 'switch.office_pc_plug',
    name: 'Workstation Master Power',
    area_id: 'office',
    device_id: null,
    platform: 'shelly'
  },
  {
    entity_id: 'media_player.office_homepod',
    name: 'Office HomePod',
    area_id: 'office',
    device_id: null,
    platform: 'apple_tv'
  },
  {
    entity_id: 'remote.office_homepod_remote',
    name: 'Office HomePod Remote',
    area_id: 'office',
    device_id: null,
    platform: 'apple_tv'
  },
  {
    entity_id: 'sensor.office_ambient_temp',
    name: 'Office Temperature',
    area_id: 'office',
    device_id: null,
    device_class: 'temperature',
    unit_of_measurement: '°C'
  },

  // ---------------- Hallway & Security Entities ----------------
  {
    entity_id: 'lock.front_door_yale',
    name: 'Front Door Yale Smart Lock',
    area_id: null, // Inherited match via dev_yale_smart_lock
    device_id: 'dev_yale_smart_lock',
    platform: 'yale'
  },
  {
    entity_id: 'camera.front_door_camera',
    name: 'Front Porch Video Intercom',
    area_id: null, // Inherited match via dev_ring_video_doorbell
    device_id: 'dev_ring_video_doorbell',
    platform: 'ring'
  },
  {
    entity_id: 'binary_sensor.front_door_motion',
    name: 'Front Porch Motion Detection',
    area_id: 'hallway',
    device_id: 'dev_ring_video_doorbell',
    device_class: 'motion'
  },
  {
    entity_id: 'light.hallway_entry_pendant',
    name: 'Foyer Entry Chandelier',
    area_id: 'hallway',
    device_id: null,
    platform: 'hue'
  },

  // ---------------- Patio & Garden Entities ----------------
  {
    entity_id: 'light.patio_string_lights',
    name: 'Patio Bistro String Lights',
    area_id: 'patio',
    device_id: null,
    platform: 'shelly'
  },
  {
    entity_id: 'camera.patio_security_cam',
    name: 'Backyard 4K Security Cam',
    area_id: null, // Inherited match via dev_unifi_protect_patio
    device_id: 'dev_unifi_protect_patio',
    platform: 'unifiprotect'
  },
  {
    entity_id: 'switch.patio_garden_sprinklers',
    name: 'Lawn Smart Irrigation',
    area_id: null, // Inherited match via dev_rachio_sprinklers
    device_id: 'dev_rachio_sprinklers',
    platform: 'rachio'
  },

  // ---------------- Utility & Garage Entities (Energy / Battery) ----------------
  {
    entity_id: 'cover.garage_door',
    name: 'Chamberlain Garage Door',
    area_id: null, // Inherited match via dev_chamberlain_myq
    device_id: 'dev_chamberlain_myq',
    platform: 'myq'
  },
  {
    entity_id: 'sensor.solaredge_solar_power',
    name: 'Rooftop Solar Generation',
    area_id: null, // Inherited match via dev_solaredge_inverter
    device_id: 'dev_solaredge_inverter',
    device_class: 'power',
    unit_of_measurement: 'kW'
  },
  {
    entity_id: 'sensor.tesla_powerwall_battery_level',
    name: 'Powerwall 3 Storage Level',
    area_id: null, // Inherited match via dev_tesla_powerwall
    device_id: 'dev_tesla_powerwall',
    device_class: 'battery',
    unit_of_measurement: '%'
  },
  {
    entity_id: 'sensor.tesla_powerwall_flow',
    name: 'Powerwall Charge / Discharge Flow',
    area_id: 'garage',
    device_id: 'dev_tesla_powerwall',
    device_class: 'power',
    unit_of_measurement: 'kW'
  },

  // ---------------- Unassigned Entities (To test "Unassigned / Other" bucket) ----------------
  {
    entity_id: 'switch.portable_air_purifier',
    name: 'Portable HEPA Air Purifier',
    area_id: null, // Direct area is null
    device_id: 'dev_shelly_plug_unassigned', // Device area is ALSO null!
    platform: 'shelly'
  },
  {
    entity_id: 'sensor.outdoor_weather_pressure',
    name: 'Atmospheric Barometer',
    area_id: null,
    device_id: null,
    device_class: 'pressure',
    unit_of_measurement: 'hPa'
  },
  {
    entity_id: 'weather.home',
    name: 'Home Weather',
    area_id: null,
    device_id: null,
    platform: 'met'
  },
  {
    entity_id: 'weather.forecast_home',
    name: 'AccuWeather Regional Forecast',
    area_id: null,
    device_id: null,
    platform: 'accuweather'
  },
  {
    entity_id: 'weather.patio_weather',
    name: 'Patio Davis Weather Station',
    area_id: 'patio',
    device_id: null,
    platform: 'netatmo'
  },

  // ---------------- Household Users & Persons ----------------
  {
    entity_id: 'person.sarah',
    name: 'Sarah Jenkins',
    area_id: 'living_room',
    platform: 'person'
  },
  {
    entity_id: 'person.alex',
    name: 'Alex Miller',
    area_id: 'office',
    platform: 'person'
  },
  {
    entity_id: 'person.emma',
    name: 'Emma Miller',
    area_id: null,
    platform: 'person'
  },
  {
    entity_id: 'person.liam',
    name: 'Liam Miller',
    area_id: 'bedroom',
    platform: 'person'
  },

  // ---------------- Climate & Fans ----------------
  {
    entity_id: 'fan.living_room_dreo_fan',
    name: 'DREO Pilot Max Tower Fan',
    area_id: 'living_room',
    platform: 'dreo'
  },
  {
    entity_id: 'fan.office_duux_fan',
    name: 'Duux Whisper Flex Smart Fan',
    area_id: 'office',
    platform: 'tuya'
  },
  {
    entity_id: 'fan.master_bedroom_fan',
    name: 'Master Bedroom Ceiling Fan',
    area_id: 'bedroom',
    platform: 'tuya'
  },

  // ---------------- Security Alarm Control Panel ----------------
  {
    entity_id: 'alarm_control_panel.home_alarm',
    name: 'Homz Security Guard',
    area_id: 'hallway',
    platform: 'manual'
  },
  {
    entity_id: 'alarm_control_panel.garage_alarm',
    name: 'Garage & Workshop Security',
    area_id: 'garage',
    platform: 'manual'
  },

  // ---------------- Perimeter Openings (Doors & Windows) ----------------
  {
    entity_id: 'binary_sensor.front_door_contact',
    name: 'Front Main Door',
    area_id: 'hallway',
    device_class: 'door'
  },
  {
    entity_id: 'binary_sensor.patio_sliding_door',
    name: 'Patio Sliding Door',
    area_id: 'patio',
    device_class: 'door'
  },
  {
    entity_id: 'binary_sensor.garage_entry_door',
    name: 'Garage Utility Door',
    area_id: 'garage',
    device_class: 'door'
  },
  {
    entity_id: 'binary_sensor.living_room_bay_window',
    name: 'Living Room Bay Window',
    area_id: 'living_room',
    device_class: 'window'
  },
  {
    entity_id: 'binary_sensor.kitchen_window',
    name: 'Kitchen Casement Window',
    area_id: 'kitchen',
    device_class: 'window'
  },
  {
    entity_id: 'binary_sensor.office_window',
    name: 'Home Office Window',
    area_id: 'office',
    device_class: 'window'
  },

  // ---------------- Smart Perimeter Locks ----------------
  {
    entity_id: 'lock.front_door_lock',
    name: 'Front Entrance Deadbolt',
    area_id: 'hallway',
    platform: 'august'
  },
  {
    entity_id: 'lock.backyard_gate_lock',
    name: 'Backyard Garden Gate',
    area_id: 'patio',
    platform: 'yale'
  },
  {
    entity_id: 'lock.garage_side_door_lock',
    name: 'Garage Utility Side Lock',
    area_id: 'garage',
    platform: 'schlage'
  },

  // ---------------- Surveillance & Security Cameras ----------------
  {
    entity_id: 'camera.front_entrance',
    name: 'Front Entrance & Doorbell Cam',
    area_id: 'hallway',
    platform: 'unifi_protect'
  },
  {
    entity_id: 'camera.driveway_garage',
    name: 'Driveway & Garage Wide Cam',
    area_id: 'garage',
    platform: 'unifi_protect'
  },
  {
    entity_id: 'camera.backyard_patio',
    name: 'Backyard & Patio Garden Cam',
    area_id: 'patio',
    platform: 'reolink'
  },
  {
    entity_id: 'camera.living_room_indoor',
    name: 'Living Room 360 Indoor Cam',
    area_id: 'living_room',
    platform: 'eufy'
  },

  // ---------------- Motion & Occupancy Zones ----------------
  {
    entity_id: 'binary_sensor.front_porch_motion',
    name: 'Front Porch Motion Zone',
    area_id: 'hallway',
    device_class: 'motion'
  },
  {
    entity_id: 'binary_sensor.hallway_motion',
    name: 'Hallway Corridor Motion',
    area_id: 'hallway',
    device_class: 'motion'
  },
  {
    entity_id: 'binary_sensor.backyard_motion',
    name: 'Backyard Perimeter Motion',
    area_id: 'patio',
    device_class: 'motion'
  },

  // ---------------- Environmental Hazard & Leak Detectors ----------------
  {
    entity_id: 'binary_sensor.kitchen_leak_detector',
    name: 'Kitchen Sink Water Leak Sensor',
    area_id: 'kitchen',
    device_class: 'moisture'
  },
  {
    entity_id: 'binary_sensor.utility_leak_detector',
    name: 'Utility & Laundry Water Sensor',
    area_id: 'garage',
    device_class: 'moisture'
  },
  {
    entity_id: 'binary_sensor.hallway_smoke_detector',
    name: 'First Floor Nest Smoke & CO Alarm',
    area_id: 'hallway',
    device_class: 'smoke'
  },


  // ---------------- Software Updates & System Notifications ----------------
  {
    entity_id: 'update.home_assistant_core_update',
    name: 'Home Assistant Core Update',
    area_id: 'office',
    platform: 'homeassistant'
  },
  {
    entity_id: 'update.zigbee2mqtt_update',
    name: 'Zigbee2MQTT Gateway Update',
    area_id: 'hallway',
    platform: 'mqtt'
  },
  {
    entity_id: 'persistent_notification.new_device_discovered',
    name: 'New Device Discovered',
    area_id: null,
    platform: 'persistent_notification'
  },
  {
    entity_id: 'persistent_notification.backup_success',
    name: 'Automated System Backup',
    area_id: null,
    platform: 'persistent_notification'
  },
  {
    entity_id: 'persistent_notification.dreame_robot_alert',
    name: 'Dreamebot Alert',
    area_id: 'living_room',
    platform: 'persistent_notification'
  },
  {
    entity_id: 'repair.yaml_configuration_warning',
    name: 'Legacy Integration Deprecation',
    area_id: null,
    platform: 'repairs'
  },

  // ---------------- Automations ----------------
  {
    entity_id: 'automation.morning_sunrise_wake_up',
    name: 'Morning Sunrise Wake Up',
    area_id: 'bedroom',
    platform: 'automation',
    labels: ['lighting', 'routine', 'morning']
  },
  {
    entity_id: 'automation.night_perimeter_lockup',
    name: 'Night Perimeter Lockup',
    area_id: 'hallway',
    platform: 'automation',
    labels: ['security', 'locks', 'night']
  },
  {
    entity_id: 'automation.hallway_motion_nightlight',
    name: 'Hallway Motion Nightlight',
    area_id: 'hallway',
    platform: 'automation',
    labels: ['sensors', 'lighting']
  },
  {
    entity_id: 'automation.ac_eco_when_away',
    name: 'Climate Eco Mode When Away',
    area_id: 'living_room',
    platform: 'automation',
    labels: ['climate', 'energy', 'presence']
  },
  {
    entity_id: 'automation.water_leak_auto_shutoff',
    name: 'Water Leak Emergency Shutoff',
    area_id: 'kitchen',
    platform: 'automation',
    labels: ['security', 'safety', 'emergency']
  },
  {
    entity_id: 'automation.balcony_sunset_ambiance',
    name: 'Balcony Sunset Ambiance',
    area_id: 'balcony',
    platform: 'automation',
    labels: ['lighting', 'outdoor']
  },
  {
    entity_id: 'automation.robot_clean_after_leaving',
    name: 'Robot Vacuum When Leaving Home',
    area_id: 'living_room',
    platform: 'automation',
    labels: ['cleaning', 'presence']
  },

  // ---------------- Scenes ----------------
  {
    entity_id: 'scene.cozy_evening_movie',
    name: 'Cozy Movie Night',
    area_id: 'living_room',
    platform: 'scene',
    labels: ['media', 'lighting']
  },
  {
    entity_id: 'scene.bright_focus_mode',
    name: 'Bright Work Focus',
    area_id: 'office',
    platform: 'scene',
    labels: ['productivity', 'lighting']
  },
  {
    entity_id: 'scene.relaxing_dinner',
    name: 'Relaxing Dinner',
    area_id: 'kitchen',
    platform: 'scene',
    labels: ['dining', 'ambiance']
  },
  {
    entity_id: 'scene.all_lights_off',
    name: 'All Lights Off',
    area_id: 'hallway',
    platform: 'scene',
    labels: ['general', 'night']
  },
  {
    entity_id: 'scene.party_mode',
    name: 'Party & Celebration',
    area_id: 'living_room',
    platform: 'scene',
    labels: ['entertainment', 'lighting']
  },

  // ---------------- Disabled Entity (To test automatic filtering!) ----------------
  {
    entity_id: 'light.old_garage_fluorescent_decommissioned',
    name: 'Old Garage Fluorescent (Disabled)',
    area_id: 'garage',
    device_id: null,
    platform: 'template',
    disabled_by: 'user' // MUST BE FILTERED OUT by graph resolution!
  }
];

export const MOCK_STATES: Record<string, HAState> = {
  // Living Room
  'light.living_room_main': {
    entity_id: 'light.living_room_main',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Main Lights',
      brightness: 80,
      color: '#ffffff',
      power: 14.2,
      supported_features: 63
    }
  },
  'light.living_room_accent': {
    entity_id: 'light.living_room_accent',
    state: 'on',
    attributes: {
      friendly_name: 'TV Backlight Ambilight',
      brightness: 45,
      color: '#7B61FF',
      power: 6.0
    }
  },
  'climate.living_room_ecobee': {
    entity_id: 'climate.living_room_ecobee',
    state: 'cool',
    attributes: {
      friendly_name: 'Living Room Thermostat',
      current_temperature: 21.8,
      temperature: 21.0,
      target_temp: 21.0,
      current_humidity: 48,
      hvac_action: 'cooling',
      fan_mode: 'auto',
      power: 320
    }
  },
  'sensor.living_room_temp': {
    entity_id: 'sensor.living_room_temp',
    state: '21.8',
    attributes: {
      friendly_name: 'Living Room Ambient Temperature',
      unit_of_measurement: '°C',
      device_class: 'temperature'
    }
  },
  'sensor.living_room_humidity': {
    entity_id: 'sensor.living_room_humidity',
    state: '48',
    attributes: {
      friendly_name: 'Living Room Humidity',
      unit_of_measurement: '%',
      device_class: 'humidity'
    }
  },
  'media_player.living_room_sonos': {
    entity_id: 'media_player.living_room_sonos',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room Sonos Arc',
      media_title: 'After Hours (Lofi Ambient Cover)',
      media_artist: 'The Weekend Dreamer',
      media_album_name: 'Midnight Horizons EP',
      media_image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
      volume_level: 0.42,
      is_volume_muted: false,
      source: 'Spotify Hi-Fi',
      source_list: ['Spotify Hi-Fi', 'AirPlay 2', 'Line-In', 'TV Audio'],
      supported_features: 590783
    }
  },
  'media_player.living_room_tv': {
    entity_id: 'media_player.living_room_tv',
    state: 'on',
    attributes: {
      friendly_name: 'LG OLED C3 TV',
      device_class: 'tv',
      source: 'Apple TV 4K',
      source_list: ['HDMI 1', 'HDMI 2', 'Apple TV 4K', 'Netflix', 'YouTube', 'Live TV'],
      sound_mode: 'Cinema',
      sound_mode_list: ['Cinema', 'Music', 'Standard', 'Game'],
      volume_level: 0.35,
      is_volume_muted: false,
      power: 85,
      supported_features: 86141
    }
  },
  'remote.living_room_tv': {
    entity_id: 'remote.living_room_tv',
    state: 'on',
    attributes: {
      friendly_name: 'LG Magic Remote',
      current_activity: 'Live TV'
    }
  },
  'media_player.living_room_apple_tv': {
    entity_id: 'media_player.living_room_apple_tv',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room Apple TV',
      device_class: 'tv',
      media_title: 'Ted Lasso (Season 3)',
      media_artist: 'Apple TV+',
      media_album_name: 'Comedy Series',
      media_image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=600&auto=format&fit=crop',
      app_name: 'Apple TV',
      source: 'Apple TV+',
      source_list: ['Apple TV+', 'Netflix', 'YouTube', 'Disney+', 'Plex', 'HBO Max'],
      volume_level: 0.65,
      is_volume_muted: false,
      supported_features: 457
    }
  },
  'remote.living_room_apple_tv': {
    entity_id: 'remote.living_room_apple_tv',
    state: 'on',
    attributes: {
      friendly_name: 'Apple TV Remote',
      current_activity: 'Apple TV'
    }
  },
  'media_player.office_chromecast': {
    entity_id: 'media_player.office_chromecast',
    state: 'playing',
    attributes: {
      friendly_name: 'Office Chromecast',
      media_title: 'Synthwave Night Ride',
      media_artist: 'Lofi Girl Live Stream',
      media_image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
      app_name: 'YouTube',
      source: 'YouTube Music',
      source_list: ['YouTube Music', 'Spotify', 'SoundCloud', 'Twitch'],
      volume_level: 0.50,
      is_volume_muted: false,
      supported_features: 21437
    }
  },
  'remote.office_chromecast': {
    entity_id: 'remote.office_chromecast',
    state: 'on',
    attributes: {
      friendly_name: 'Chromecast Remote'
    }
  },
  'sensor.living_room_sonos_wifi_rssi': {
    entity_id: 'sensor.living_room_sonos_wifi_rssi',
    state: '-48',
    attributes: {
      friendly_name: 'Sonos Arc WiFi Signal',
      unit_of_measurement: 'dBm'
    }
  },
  'switch.living_room_diffuser': {
    entity_id: 'switch.living_room_diffuser',
    state: 'on',
    attributes: {
      friendly_name: 'Aromatherapy Diffuser',
      power: 12.0
    }
  },

  // Bedroom
  'light.bedroom_ceiling': {
    entity_id: 'light.bedroom_ceiling',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom Ceiling Light',
      brightness: 64,
      color: '#fef3c7',
      power: 8.5
    }
  },
  'light.bedroom_nightstand': {
    entity_id: 'light.bedroom_nightstand',
    state: 'off',
    attributes: {
      friendly_name: 'Nightstand Reading Light',
      brightness: 0,
      power: 0
    }
  },
  'vacuum.bedroom_roborock': {
    entity_id: 'vacuum.bedroom_roborock',
    state: 'cleaning',
    attributes: {
      friendly_name: 'Roborock S10 Vacuum',
      mode: 'Eco Vacuum + Mop',
      battery: 88,
      power: 24,
      bin_status: 'OK',
      last_cleaned: 'Today, 2:15 PM',
      cleaning_time: '18 min',
      cleaned_area: '24 m²'
    }
  },
  'sensor.bedroom_vacuum_battery': {
    entity_id: 'sensor.bedroom_vacuum_battery',
    state: '88',
    attributes: {
      friendly_name: 'Roborock Battery Level',
      unit_of_measurement: '%'
    }
  },
  'climate.bedroom_ac': {
    entity_id: 'climate.bedroom_ac',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom Daikin AC',
      current_temperature: 20.5,
      temperature: 21.0,
      target_temp: 21.0,
      hvac_action: 'idle',
      fan_mode: 'quiet',
      power: 180,
      current_humidity: 50
    }
  },
  'cover.bedroom_shades': {
    entity_id: 'cover.bedroom_shades',
    state: 'closed',
    attributes: {
      friendly_name: 'Bedroom Motorized Shades',
      current_position: 0,
      battery: 38
    }
  },
  'media_player.bedroom_homepod': {
    entity_id: 'media_player.bedroom_homepod',
    state: 'playing',
    attributes: {
      friendly_name: 'Bedroom HomePod',
      media_title: 'Warm Analog Tape Reflections',
      media_artist: 'Nordic Soundscapes',
      volume_level: 0.30,
      source: 'AirPlay 2'
    }
  },
  'remote.bedroom_homepod_remote': {
    entity_id: 'remote.bedroom_homepod_remote',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom HomePod Remote'
    }
  },
  'binary_sensor.bedroom_window_contact': {
    entity_id: 'binary_sensor.bedroom_window_contact',
    state: 'off', // clear/closed
    attributes: {
      friendly_name: 'Bedroom Window Sensor',
      battery: 16, // Low battery indicator
      device_class: 'window'
    }
  },
  'sensor.bedroom_air_quality': {
    entity_id: 'sensor.bedroom_air_quality',
    state: '18',
    attributes: {
      friendly_name: 'Bedroom Air Monitor AQI',
      aqi: 18,
      pm25: 4.2,
      co2: 480,
      battery: 92
    }
  },

  // Kitchen
  'light.kitchen_spots': {
    entity_id: 'light.kitchen_spots',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Island Spotlights',
      brightness: 90,
      power: 28.0
    }
  },
  'light.kitchen_under_cabinet': {
    entity_id: 'light.kitchen_under_cabinet',
    state: 'on',
    attributes: {
      friendly_name: 'Under-Cabinet Warm LED',
      brightness: 70,
      color: '#fef08a',
      power: 14.5
    }
  },
  'switch.kitchen_espresso_machine': {
    entity_id: 'switch.kitchen_espresso_machine',
    state: 'on',
    attributes: {
      friendly_name: 'Nespresso Expert Brewer',
      power: 1150
    }
  },
  'sensor.kitchen_fridge_temp': {
    entity_id: 'sensor.kitchen_fridge_temp',
    state: '3.4',
    attributes: {
      friendly_name: 'Fridge Main Compartment',
      unit_of_measurement: '°C'
    }
  },
  'binary_sensor.kitchen_fridge_door': {
    entity_id: 'binary_sensor.kitchen_fridge_door',
    state: 'off',
    attributes: {
      friendly_name: 'Fridge Door Open Alert',
      device_class: 'door'
    }
  },

  // Office
  'light.office_desk_bar': {
    entity_id: 'light.office_desk_bar',
    state: 'on',
    attributes: {
      friendly_name: 'Desk Monitor ScreenBar',
      brightness: 85,
      power: 10.0
    }
  },
  'light.office_ambient_strip': {
    entity_id: 'light.office_ambient_strip',
    state: 'on',
    attributes: {
      friendly_name: 'Office Bookshelf Accent',
      brightness: 50,
      color: '#38bdf8',
      power: 8.0
    }
  },
  'cover.office_standing_desk': {
    entity_id: 'cover.office_standing_desk',
    state: 'open',
    attributes: {
      friendly_name: 'OmniDesk Motorized Desk',
      current_position: 108, // 108 cm standing height
      power: 0
    }
  },
  'switch.office_pc_plug': {
    entity_id: 'switch.office_pc_plug',
    state: 'on',
    attributes: {
      friendly_name: 'Workstation Master Power',
      power: 240
    }
  },
  'sensor.office_ambient_temp': {
    entity_id: 'sensor.office_ambient_temp',
    state: '22.4',
    attributes: {
      friendly_name: 'Office Temperature',
      unit_of_measurement: '°C'
    }
  },
  'media_player.office_homepod': {
    entity_id: 'media_player.office_homepod',
    state: 'idle',
    attributes: {
      friendly_name: 'Office HomePod',
      volume_level: 0.25,
      source: 'AirPlay'
    }
  },
  'remote.office_homepod_remote': {
    entity_id: 'remote.office_homepod_remote',
    state: 'on',
    attributes: {
      friendly_name: 'Office HomePod Remote'
    }
  },

  // Hallway & Security
  'lock.front_door_yale': {
    entity_id: 'lock.front_door_yale',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Door Yale Smart Lock',
      battery: 84,
      door_state: 'closed',
      last_unlocked: 'Today, 8:40 AM'
    }
  },
  'camera.front_door_camera': {
    entity_id: 'camera.front_door_camera',
    state: 'idle',
    attributes: {
      friendly_name: 'Front Porch Video Intercom',
      battery: 91,
      stream_url: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?q=80&w=600&auto=format&fit=crop'
    }
  },
  'binary_sensor.front_door_motion': {
    entity_id: 'binary_sensor.front_door_motion',
    state: 'off',
    attributes: {
      friendly_name: 'Front Porch Motion Detection',
      device_class: 'motion'
    }
  },
  'light.hallway_entry_pendant': {
    entity_id: 'light.hallway_entry_pendant',
    state: 'off',
    attributes: {
      friendly_name: 'Foyer Entry Chandelier',
      brightness: 0,
      power: 0
    }
  },

  // Patio & Garden
  'light.patio_string_lights': {
    entity_id: 'light.patio_string_lights',
    state: 'on',
    attributes: {
      friendly_name: 'Patio Bistro String Lights',
      brightness: 75,
      power: 36.0
    }
  },
  'camera.patio_security_cam': {
    entity_id: 'camera.patio_security_cam',
    state: 'recording',
    attributes: {
      friendly_name: 'Backyard 4K Security Cam',
      motion_detected: false,
      stream_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600&auto=format&fit=crop'
    }
  },
  'switch.patio_garden_sprinklers': {
    entity_id: 'switch.patio_garden_sprinklers',
    state: 'off',
    attributes: {
      friendly_name: 'Lawn Smart Irrigation',
      power: 0,
      schedule: 'Scheduled at 06:00 AM'
    }
  },

  // Utility & Garage
  'cover.garage_door': {
    entity_id: 'cover.garage_door',
    state: 'closed',
    attributes: {
      friendly_name: 'Chamberlain Garage Door',
      current_position: 0
    }
  },
  'sensor.solaredge_solar_power': {
    entity_id: 'sensor.solaredge_solar_power',
    state: '1.35',
    attributes: {
      friendly_name: 'PV Solar Generation',
      unit_of_measurement: 'kW',
      device_class: 'power',
      peak_today: '3.45 kW'
    }
  },
  'sensor.home_consumption_power': {
    entity_id: 'sensor.home_consumption_power',
    state: '0.33',
    attributes: {
      friendly_name: 'Home Power Consumption',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.tesla_powerwall_battery_level': {
    entity_id: 'sensor.tesla_powerwall_battery_level',
    state: '100',
    attributes: {
      friendly_name: 'Battery Storage Level',
      unit_of_measurement: '%',
      capacity_kwh: 13.5
    }
  },
  'sensor.tesla_powerwall_flow': {
    entity_id: 'sensor.tesla_powerwall_flow',
    state: '0.00',
    attributes: {
      friendly_name: 'Battery Power Flow',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.grid_power': {
    entity_id: 'sensor.grid_power',
    state: '-1.02',
    attributes: {
      friendly_name: 'Grid Active Power',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.energy_production_today': {
    entity_id: 'sensor.energy_production_today',
    state: '16.44',
    attributes: {
      friendly_name: 'Solar Production Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.energy_consumed_today': {
    entity_id: 'sensor.energy_consumed_today',
    state: '6.73',
    attributes: {
      friendly_name: 'Solar Consumed Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.energy_fed_to_grid_today': {
    entity_id: 'sensor.energy_fed_to_grid_today',
    state: '9.71',
    attributes: {
      friendly_name: 'Solar Fed to Grid Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.energy_consumption_today': {
    entity_id: 'sensor.energy_consumption_today',
    state: '4.61',
    attributes: {
      friendly_name: 'Home Consumption Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.energy_consumption_from_solar_today': {
    entity_id: 'sensor.energy_consumption_from_solar_today',
    state: '4.44',
    attributes: {
      friendly_name: 'Energy from Solar PV Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.energy_consumption_from_grid_today': {
    entity_id: 'sensor.energy_consumption_from_grid_today',
    state: '0.17',
    attributes: {
      friendly_name: 'Energy from Grid Today',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },

  // ---------------- Exact User Energy Mapping Entities ----------------
  'sensor.meter_reverse_active_energy': {
    entity_id: 'sensor.meter_reverse_active_energy',
    state: '4.20',
    attributes: {
      friendly_name: 'Reverse active energy',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.meter_active_energy': {
    entity_id: 'sensor.meter_active_energy',
    state: '5.80',
    attributes: {
      friendly_name: 'Active energy (forward active energy)',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.meter_active_power_inverted': {
    entity_id: 'sensor.meter_active_power_inverted',
    state: '0.35',
    attributes: {
      friendly_name: 'Active power',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.current_price': {
    entity_id: 'sensor.current_price',
    state: '0.28',
    attributes: {
      friendly_name: 'Current price',
      unit_of_measurement: '€/kWh'
    }
  },
  'sensor.electricity_maps_co2_intensity': {
    entity_id: 'sensor.electricity_maps_co2_intensity',
    state: '142',
    attributes: {
      friendly_name: 'Electricity Maps',
      unit_of_measurement: 'gCO2eq/kWh'
    }
  },
  'sensor.total_current_day_energy': {
    entity_id: 'sensor.total_current_day_energy',
    state: '18.50',
    attributes: {
      friendly_name: 'Total Current Day Energy',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.mppt_total_input_power': {
    entity_id: 'sensor.mppt_total_input_power',
    state: '2.45',
    attributes: {
      friendly_name: 'MPPT total input power',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.discharging_capacity': {
    entity_id: 'sensor.discharging_capacity',
    state: '2.10',
    attributes: {
      friendly_name: 'Discharging capacity',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.charging_capacity': {
    entity_id: 'sensor.charging_capacity',
    state: '3.40',
    attributes: {
      friendly_name: 'Charging capacity',
      unit_of_measurement: 'kWh',
      device_class: 'energy',
      state_class: 'total_increasing'
    }
  },
  'sensor.battery_charge_discharge_power_inverted': {
    entity_id: 'sensor.battery_charge_discharge_power_inverted',
    state: '0.00',
    attributes: {
      friendly_name: 'Charge/Discharge power',
      unit_of_measurement: 'kW',
      device_class: 'power'
    }
  },
  'sensor.battery_state_of_charge_soc': {
    entity_id: 'sensor.battery_state_of_charge_soc',
    state: '92',
    attributes: {
      friendly_name: 'Battery state of charge (SOC)',
      unit_of_measurement: '%',
      device_class: 'battery'
    }
  },
  'sensor.shelves_light_energy': {
    entity_id: 'sensor.shelves_light_energy',
    state: '0.45',
    attributes: {
      friendly_name: 'Shelves Light Energy',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.tv_plug_total_energy': {
    entity_id: 'sensor.tv_plug_total_energy',
    state: '1.20',
    attributes: {
      friendly_name: 'TV Plug Total energy',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.stick_vacuum_energy': {
    entity_id: 'sensor.stick_vacuum_energy',
    state: '0.30',
    attributes: {
      friendly_name: 'Stick vacuum Energy',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.left_night_table_summation_delivered': {
    entity_id: 'sensor.left_night_table_summation_delivered',
    state: '0.15',
    attributes: {
      friendly_name: 'Left Night Table Summation delivered',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },
  'sensor.right_night_table_summation_delivered': {
    entity_id: 'sensor.right_night_table_summation_delivered',
    state: '0.18',
    attributes: {
      friendly_name: 'Right Night Table Summation delivered',
      unit_of_measurement: 'kWh',
      device_class: 'energy'
    }
  },

  // Unassigned
  'switch.portable_air_purifier': {
    entity_id: 'switch.portable_air_purifier',
    state: 'on',
    attributes: {
      friendly_name: 'Portable HEPA Air Purifier',
      power: 45.0
    }
  },
  'sensor.outdoor_weather_pressure': {
    entity_id: 'sensor.outdoor_weather_pressure',
    state: '1014.2',
    attributes: {
      friendly_name: 'Atmospheric Barometer',
      unit_of_measurement: 'hPa'
    }
  },
  'weather.home': {
    entity_id: 'weather.home',
    state: 'partlycloudy',
    attributes: {
      friendly_name: 'Home Weather',
      temperature: 22.5,
      temperature_unit: '°C',
      apparent_temperature: 21.8,
      humidity: 58,
      pressure: 1014.2,
      pressure_unit: 'hPa',
      wind_speed: 14.2,
      wind_speed_unit: 'km/h',
      wind_bearing: 235,
      visibility: 10,
      visibility_unit: 'km',
      uv_index: 5.4,
      dew_point: 13.2,
      cloud_coverage: 42,
      forecast: [
        {
          datetime: '2026-08-27T12:00:00+00:00',
          condition: 'partlycloudy',
          temperature: 24,
          templow: 15,
          precipitation: 0,
          precipitation_probability: 10,
          wind_speed: 14,
          wind_bearing: 230,
          uv_index: 6
        },
        {
          datetime: '2026-08-28T12:00:00+00:00',
          condition: 'sunny',
          temperature: 26,
          templow: 16,
          precipitation: 0,
          precipitation_probability: 0,
          wind_speed: 11,
          wind_bearing: 210,
          uv_index: 7
        },
        {
          datetime: '2026-08-29T12:00:00+00:00',
          condition: 'rainy',
          temperature: 19,
          templow: 13,
          precipitation: 4.5,
          precipitation_probability: 75,
          wind_speed: 22,
          wind_bearing: 260,
          uv_index: 3
        },
        {
          datetime: '2026-08-30T12:00:00+00:00',
          condition: 'cloudy',
          temperature: 20,
          templow: 14,
          precipitation: 0.2,
          precipitation_probability: 25,
          wind_speed: 16,
          wind_bearing: 240,
          uv_index: 4
        },
        {
          datetime: '2026-08-31T12:00:00+00:00',
          condition: 'sunny',
          temperature: 25,
          templow: 15,
          precipitation: 0,
          precipitation_probability: 5,
          wind_speed: 12,
          wind_bearing: 200,
          uv_index: 7
        },
        {
          datetime: '2026-09-01T12:00:00+00:00',
          condition: 'partlycloudy',
          temperature: 23,
          templow: 14,
          precipitation: 0,
          precipitation_probability: 15,
          wind_speed: 13,
          wind_bearing: 220,
          uv_index: 6
        },
        {
          datetime: '2026-09-02T12:00:00+00:00',
          condition: 'lightning-rainy',
          temperature: 21,
          templow: 13,
          precipitation: 8.0,
          precipitation_probability: 85,
          wind_speed: 28,
          wind_bearing: 275,
          uv_index: 3
        }
      ]
    }
  },
  'weather.forecast_home': {
    entity_id: 'weather.forecast_home',
    state: 'sunny',
    attributes: {
      friendly_name: 'AccuWeather Regional Forecast',
      temperature: 23.0,
      temperature_unit: '°C',
      apparent_temperature: 22.4,
      humidity: 52,
      pressure: 1015.0,
      pressure_unit: 'hPa',
      wind_speed: 10.5,
      wind_speed_unit: 'km/h',
      wind_bearing: 190,
      visibility: 12,
      visibility_unit: 'km',
      uv_index: 6.2,
      dew_point: 12.0,
      cloud_coverage: 15,
      forecast: [
        {
          datetime: '2026-08-27T12:00:00+00:00',
          condition: 'sunny',
          temperature: 25,
          templow: 16,
          precipitation: 0,
          precipitation_probability: 0,
          wind_speed: 10,
          uv_index: 7
        },
        {
          datetime: '2026-08-28T12:00:00+00:00',
          condition: 'sunny',
          temperature: 27,
          templow: 17,
          precipitation: 0,
          precipitation_probability: 0,
          wind_speed: 9,
          uv_index: 8
        },
        {
          datetime: '2026-08-29T12:00:00+00:00',
          condition: 'rainy',
          temperature: 20,
          templow: 14,
          precipitation: 6.0,
          precipitation_probability: 80,
          wind_speed: 20,
          uv_index: 3
        }
      ]
    }
  },
  'weather.patio_weather': {
    entity_id: 'weather.patio_weather',
    state: 'partlycloudy',
    attributes: {
      friendly_name: 'Patio Davis Weather Station',
      temperature: 22.8,
      temperature_unit: '°C',
      apparent_temperature: 22.0,
      humidity: 55,
      pressure: 1014.8,
      pressure_unit: 'hPa',
      wind_speed: 12.0,
      wind_speed_unit: 'km/h',
      wind_bearing: 215,
      uv_index: 5.8
    }
  },

  // Disabled
  'light.old_garage_fluorescent_decommissioned': {
    entity_id: 'light.old_garage_fluorescent_decommissioned',
    state: 'off',
    attributes: {
      friendly_name: 'Old Garage Fluorescent (Disabled)'
    }
  },

  // ---------------- Household Users & Persons ----------------
  'person.sarah': {
    entity_id: 'person.sarah',
    state: 'home',
    attributes: {
      friendly_name: 'Sarah Jenkins',
      entity_picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250&auto=format&fit=crop',
      battery: 88,
      location: 'Living Room',
      last_changed: 'Today, 8:15 AM'
    }
  },
  'person.alex': {
    entity_id: 'person.alex',
    state: 'home',
    attributes: {
      friendly_name: 'Alex Miller',
      entity_picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=250&auto=format&fit=crop',
      battery: 94,
      location: 'Home Studio & Office',
      last_changed: 'Today, 7:45 AM'
    }
  },
  'person.emma': {
    entity_id: 'person.emma',
    state: 'away',
    attributes: {
      friendly_name: 'Emma Miller',
      entity_picture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop',
      battery: 62,
      location: 'Downtown Campus',
      last_changed: 'Today, 8:10 AM'
    }
  },
  'person.liam': {
    entity_id: 'person.liam',
    state: 'home',
    attributes: {
      friendly_name: 'Liam Miller',
      entity_picture: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=250&auto=format&fit=crop',
      battery: 76,
      location: 'Master Bedroom',
      last_changed: 'Today, 7:55 AM'
    }
  },

  // ---------------- Climate & Fans ----------------
  'fan.living_room_dreo_fan': {
    entity_id: 'fan.living_room_dreo_fan',
    state: 'on',
    attributes: {
      friendly_name: 'DREO Pilot Max Tower Fan',
      speed: 'high',
      percentage: 80,
      percentage_step: 1,
      oscillating: true,
      oscillation_angle: 90,
      available_angles: [30, 60, 90, 120],
      direction: 'forward',
      preset_mode: 'natural',
      preset_modes: ['normal', 'natural', 'auto', 'sleep', 'turbo'],
      power: 45
    }
  },
  'fan.office_duux_fan': {
    entity_id: 'fan.office_duux_fan',
    state: 'on',
    attributes: {
      friendly_name: 'Duux Whisper Flex Smart Fan',
      speed: 'level 6',
      percentage: 50,
      percentage_step: 8.33,
      temperature: 21.5,
      target_temperature: 22,
      temperature_unit: '°C',
      direction: 'forward',
      power: 28
    }
  },
  'fan.master_bedroom_fan': {
    entity_id: 'fan.master_bedroom_fan',
    state: 'off',
    attributes: {
      friendly_name: 'Master Bedroom Ceiling Fan',
      speed: 'off',
      percentage: 0,
      percentage_step: 33.33,
      direction: 'forward',
      power: 0
    }
  },

  // ---------------- Security Alarm Control Panel ----------------
  'alarm_control_panel.home_alarm': {
    entity_id: 'alarm_control_panel.home_alarm',
    state: 'armed_home',
    attributes: {
      friendly_name: 'Homz Guard Alarm',
      code_format: 'number',
      changed_by: 'Sarah Jenkins',
      armed_at: 'Today, 7:30 AM',
      perimeter_secure: true
    }
  },
  'alarm_control_panel.garage_alarm': {
    entity_id: 'alarm_control_panel.garage_alarm',
    state: 'disarmed',
    attributes: {
      friendly_name: 'Garage Security Alarm',
      code_format: 'number',
      changed_by: 'User Keypad',
      armed_at: 'Yesterday',
      perimeter_secure: true
    }
  },

  // ---------------- Perimeter Openings (Doors & Windows) ----------------
  'binary_sensor.front_door_contact': {
    entity_id: 'binary_sensor.front_door_contact',
    state: 'off',
    attributes: {
      friendly_name: 'Front Main Door',
      device_class: 'door',
      battery: 92,
      last_opened: 'Today, 8:15 AM'
    }
  },
  'binary_sensor.patio_sliding_door': {
    entity_id: 'binary_sensor.patio_sliding_door',
    state: 'on', // open
    attributes: {
      friendly_name: 'Patio Sliding Door',
      device_class: 'door',
      battery: 84,
      last_opened: 'Just now (8:42 AM)'
    }
  },
  'binary_sensor.garage_entry_door': {
    entity_id: 'binary_sensor.garage_entry_door',
    state: 'off',
    attributes: {
      friendly_name: 'Garage Utility Door',
      device_class: 'door',
      battery: 79,
      last_opened: 'Today, 7:50 AM'
    }
  },
  'binary_sensor.living_room_bay_window': {
    entity_id: 'binary_sensor.living_room_bay_window',
    state: 'on', // open
    attributes: {
      friendly_name: 'Living Room Bay Window',
      device_class: 'window',
      battery: 88,
      last_opened: '12 mins ago'
    }
  },
  'binary_sensor.kitchen_window': {
    entity_id: 'binary_sensor.kitchen_window',
    state: 'off',
    attributes: {
      friendly_name: 'Kitchen Casement Window',
      device_class: 'window',
      battery: 95,
      last_opened: 'Yesterday'
    }
  },
  'binary_sensor.office_window': {
    entity_id: 'binary_sensor.office_window',
    state: 'off',
    attributes: {
      friendly_name: 'Home Office Window',
      device_class: 'window',
      battery: 81,
      last_opened: 'Yesterday'
    }
  },

  // ---------------- Smart Perimeter Locks ----------------
  'lock.front_door_lock': {
    entity_id: 'lock.front_door_lock',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Entrance Deadbolt',
      battery_level: 89,
      lock_status: 'Locked & Secure',
      changed_by: 'Auto-Lock Routine',
      last_changed: '20 mins ago'
    }
  },
  'lock.backyard_gate_lock': {
    entity_id: 'lock.backyard_gate_lock',
    state: 'locked',
    attributes: {
      friendly_name: 'Backyard Garden Gate',
      battery_level: 94,
      lock_status: 'Locked & Secure',
      changed_by: 'Keypad Code (Samer)',
      last_changed: '1 hour ago'
    }
  },
  'lock.garage_side_door_lock': {
    entity_id: 'lock.garage_side_door_lock',
    state: 'unlocked',
    attributes: {
      friendly_name: 'Garage Utility Side Lock',
      battery_level: 76,
      lock_status: 'Unlocked',
      changed_by: 'Manual Turn',
      last_changed: '14 mins ago'
    }
  },

  // ---------------- Surveillance & Security Cameras ----------------
  'camera.front_entrance': {
    entity_id: 'camera.front_entrance',
    state: 'idle',
    attributes: {
      friendly_name: 'Front Entrance & Doorbell Cam',
      model_name: 'UniFi G4 Doorbell Pro',
      motion_detection: true,
      stream_type: 'webrtc',
      fps: 30,
      resolution: '2K HDR',
      ptz_supported: false,
      two_way_audio: true,
      last_motion: '2 mins ago',
      entity_picture: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&q=80&w=1200'
    }
  },
  'camera.driveway_garage': {
    entity_id: 'camera.driveway_garage',
    state: 'idle',
    attributes: {
      friendly_name: 'Driveway & Garage Wide Cam',
      model_name: 'UniFi Protect AI Bullet',
      motion_detection: true,
      stream_type: 'webrtc',
      fps: 30,
      resolution: '4K Ultra HD',
      ptz_supported: true,
      two_way_audio: false,
      last_motion: '15 mins ago',
      entity_picture: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&q=80&w=1200'
    }
  },
  'camera.backyard_patio': {
    entity_id: 'camera.backyard_patio',
    state: 'idle',
    attributes: {
      friendly_name: 'Backyard & Patio Garden Cam',
      model_name: 'Reolink Argus PT Ultra',
      motion_detection: true,
      stream_type: 'webrtc',
      fps: 25,
      resolution: '4K ColorX',
      ptz_supported: true,
      two_way_audio: true,
      last_motion: '1 hour ago',
      entity_picture: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200'
    }
  },
  'camera.living_room_indoor': {
    entity_id: 'camera.living_room_indoor',
    state: 'idle',
    attributes: {
      friendly_name: 'Living Room 360 Indoor Cam',
      model_name: 'Eufy Indoor Cam S350',
      motion_detection: true,
      stream_type: 'hls',
      fps: 30,
      resolution: '4K Dual-Cam',
      ptz_supported: true,
      two_way_audio: true,
      privacy_mode: false,
      last_motion: 'Just now',
      entity_picture: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=1200'
    }
  },

  // ---------------- Motion & Occupancy Zones ----------------
  'binary_sensor.front_porch_motion': {
    entity_id: 'binary_sensor.front_porch_motion',
    state: 'off',
    attributes: {
      friendly_name: 'Front Porch Motion Zone',
      device_class: 'motion',
      battery: 91,
      last_triggered: '6 mins ago'
    }
  },
  'binary_sensor.hallway_motion': {
    entity_id: 'binary_sensor.hallway_motion',
    state: 'on',
    attributes: {
      friendly_name: 'Hallway Corridor Motion',
      device_class: 'motion',
      battery: 86,
      last_triggered: 'Just now'
    }
  },
  'binary_sensor.backyard_motion': {
    entity_id: 'binary_sensor.backyard_motion',
    state: 'off',
    attributes: {
      friendly_name: 'Backyard Perimeter Motion',
      device_class: 'motion',
      battery: 93,
      last_triggered: '42 mins ago'
    }
  },

  // ---------------- Environmental Hazard & Leak Detectors ----------------
  'binary_sensor.kitchen_leak_detector': {
    entity_id: 'binary_sensor.kitchen_leak_detector',
    state: 'off',
    attributes: {
      friendly_name: 'Kitchen Sink Water Leak Sensor',
      device_class: 'moisture',
      battery: 98,
      moisture_detected: false,
      last_test: 'Yesterday'
    }
  },
  'binary_sensor.utility_leak_detector': {
    entity_id: 'binary_sensor.utility_leak_detector',
    state: 'off',
    attributes: {
      friendly_name: 'Utility & Laundry Water Sensor',
      device_class: 'moisture',
      battery: 89,
      moisture_detected: false,
      last_test: '3 days ago'
    }
  },
  'binary_sensor.hallway_smoke_detector': {
    entity_id: 'binary_sensor.hallway_smoke_detector',
    state: 'off',
    attributes: {
      friendly_name: 'First Floor Nest Smoke & CO Alarm',
      device_class: 'smoke',
      battery: 100,
      smoke_detected: false,
      co_detected: false,
      last_tested: 'Today, 6:00 AM'
    }
  },

  // ---------------- Home Assistant Zones ----------------
  'zone.home': {
    entity_id: 'zone.home',
    state: '1',
    attributes: {
      friendly_name: 'Home',
      latitude: 37.7749,
      longitude: -122.4194,
      radius: 100,
      icon: 'House',
      passive: false
    }
  },
  'zone.work': {
    entity_id: 'zone.work',
    state: '1',
    attributes: {
      friendly_name: 'HQ Office',
      latitude: 37.7833,
      longitude: -122.4167,
      radius: 150,
      icon: 'Briefcase',
      passive: false
    }
  },
  'zone.school': {
    entity_id: 'zone.school',
    state: '0',
    attributes: {
      friendly_name: 'Campus / School',
      latitude: 37.7650,
      longitude: -122.4400,
      radius: 200,
      icon: 'GraduationCap',
      passive: false
    }
  },
  'zone.gym': {
    entity_id: 'zone.gym',
    state: '0',
    attributes: {
      friendly_name: 'Fitness Center',
      latitude: 37.7690,
      longitude: -122.4300,
      radius: 120,
      icon: 'Barbell',
      passive: false
    }
  },

  // ---------------- Software Updates ----------------
  'update.home_assistant_core_update': {
    entity_id: 'update.home_assistant_core_update',
    state: 'on',
    attributes: {
      friendly_name: 'Home Assistant Core Update',
      title: 'Home Assistant Core 2026.8.4',
      installed_version: '2026.8.0',
      latest_version: '2026.8.4',
      release_summary: 'Major performance optimizations, responsive weather stream APIs, and Matter 1.3 certification.',
      release_url: 'https://www.home-assistant.io/blog/2026/08/06/release-20268/',
      in_progress: false,
      auto_update: false
    }
  },
  'update.zigbee2mqtt_update': {
    entity_id: 'update.zigbee2mqtt_update',
    state: 'on',
    attributes: {
      friendly_name: 'Zigbee2MQTT Gateway',
      title: 'Zigbee2MQTT 1.40.1',
      installed_version: '1.38.0',
      latest_version: '1.40.1',
      release_summary: 'Added support for 35 new smart sensors, OTA firmware caching, and mesh stability enhancements.',
      release_url: 'https://github.com/Koenkk/zigbee2mqtt/releases',
      in_progress: false,
      auto_update: false
    }
  },

  // ---------------- Persistent Notifications ----------------
  'persistent_notification.new_device_discovered': {
    entity_id: 'persistent_notification.new_device_discovered',
    state: 'notifying',
    attributes: {
      title: 'New Device Discovered',
      message: 'Apple TV 4K in Living Room has been discovered and is ready for 1-tap HomeKit integration.',
      notification_id: 'apple_tv_disc_1',
      created_at: '2026-08-27T10:15:00Z'
    }
  },
  'persistent_notification.backup_success': {
    entity_id: 'persistent_notification.backup_success',
    state: 'notifying',
    attributes: {
      title: 'Automated Snapshot Backup',
      message: 'Nightly cloud backup completed successfully (1.42 GB encrypted archive stored).',
      notification_id: 'backup_ok_1',
      created_at: '2026-08-27T04:00:00Z'
    }
  },
  'persistent_notification.dreame_robot_alert': {
    entity_id: 'persistent_notification.dreame_robot_alert',
    state: 'notifying',
    attributes: {
      title: 'Dreame Vacuum Notification',
      message: '### Wheels are suspended Please reposition the robot and restart.![image](data:image/png;base64,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)',
      notification_id: 'dreame_wheels_1',
      created_at: '2026-08-27T18:45:00Z'
    }
  },

  // ---------------- System Repairs / Diagnostics ----------------
  'repair.restart_required': {
    entity_id: 'repair.restart_required',
    state: 'active',
    attributes: {
      title: 'Restart Required',
      message: 'A system restart is required to finish installing Home Assistant Core 2026.8.4 update.',
      issue_id: 'restart_required_core_update',
      severity: 'warning',
      learn_more_url: 'https://www.home-assistant.io/latest-blogs/'
    }
  },
  'repair.yaml_configuration_warning': {
    entity_id: 'repair.yaml_configuration_warning',
    state: 'active',
    attributes: {
      title: 'Legacy MQTT YAML Config Detected',
      message: 'Legacy YAML configuration for MQTT sensors is deprecated. Please migrate to UI config flow.',
      issue_id: 'mqtt_yaml_dep_1',
      severity: 'warning',
      learn_more_url: 'https://www.home-assistant.io/integrations/mqtt/'
    }
  },

  // ---------------- Automations ----------------
  'automation.morning_sunrise_wake_up': {
    entity_id: 'automation.morning_sunrise_wake_up',
    state: 'on',
    attributes: {
      friendly_name: 'Morning Sunrise Wake Up',
      last_triggered: '2026-08-27T07:00:00Z',
      mode: 'single',
      current: 0,
      id: 'auto_morning_wake',
      description: 'Gradually ramps up bedroom lights and turns on the kitchen espresso machine at 7:00 AM on weekdays.'
    }
  },
  'automation.night_perimeter_lockup': {
    entity_id: 'automation.night_perimeter_lockup',
    state: 'on',
    attributes: {
      friendly_name: 'Night Perimeter Lockup',
      last_triggered: '2026-08-26T23:00:00Z',
      mode: 'queued',
      current: 0,
      id: 'auto_night_lockup',
      description: 'Arms home alarm, turns off non-essential lights, and locks exterior doors at 11:00 PM.'
    }
  },
  'automation.hallway_motion_nightlight': {
    entity_id: 'automation.hallway_motion_nightlight',
    state: 'on',
    attributes: {
      friendly_name: 'Hallway Motion Nightlight',
      last_triggered: '2026-08-27T03:14:22Z',
      mode: 'restart',
      current: 0,
      id: 'auto_motion_nightlight',
      description: 'Illuminates hallway LED strip at 10% brightness when motion is detected during night hours.'
    }
  },
  'automation.ac_eco_when_away': {
    entity_id: 'automation.ac_eco_when_away',
    state: 'on',
    attributes: {
      friendly_name: 'Climate Eco Mode When Away',
      last_triggered: '2026-08-26T14:20:00Z',
      mode: 'single',
      current: 0,
      id: 'auto_eco_away',
      description: 'Sets HVAC thermostats to eco mode whenever family members leave the home zone.'
    }
  },
  'automation.water_leak_auto_shutoff': {
    entity_id: 'automation.water_leak_auto_shutoff',
    state: 'on',
    attributes: {
      friendly_name: 'Water Leak Emergency Shutoff',
      last_triggered: '2026-08-10T12:00:00Z',
      mode: 'parallel',
      current: 0,
      id: 'auto_leak_shutoff',
      description: 'Closes main water valve and sends critical notification if kitchen or laundry sensors detect moisture.'
    }
  },
  'automation.balcony_sunset_ambiance': {
    entity_id: 'automation.balcony_sunset_ambiance',
    state: 'off',
    attributes: {
      friendly_name: 'Balcony Sunset Ambiance',
      last_triggered: '2026-08-25T19:30:00Z',
      mode: 'single',
      current: 0,
      id: 'auto_balcony_sunset',
      description: 'Turns on balcony string lights 15 minutes before sunset with warm incandescent color temperature.'
    }
  },
  'automation.robot_clean_after_leaving': {
    entity_id: 'automation.robot_clean_after_leaving',
    state: 'on',
    attributes: {
      friendly_name: 'Robot Vacuum When Leaving Home',
      last_triggered: '2026-08-27T08:30:00Z',
      mode: 'single',
      current: 0,
      id: 'auto_vac_leaving',
      description: 'Starts robot vacuum cleaning routine 10 minutes after everyone has departed.'
    }
  },

  // ---------------- Scenes ----------------
  'scene.cozy_evening_movie': {
    entity_id: 'scene.cozy_evening_movie',
    state: '2026-08-26T21:00:00Z',
    attributes: {
      friendly_name: 'Cozy Movie Night',
      icon: 'FilmStrip',
      description: 'Dims living room lights to 15% warm amber, powers on TV OLED, and activates soundbar.'
    }
  },
  'scene.bright_focus_mode': {
    entity_id: 'scene.bright_focus_mode',
    state: '2026-08-27T09:00:00Z',
    attributes: {
      friendly_name: 'Bright Work Focus',
      icon: 'Sun',
      description: 'Sets office lights to 100% 5000K daylight white and pauses background speaker music.'
    }
  },
  'scene.relaxing_dinner': {
    entity_id: 'scene.relaxing_dinner',
    state: '2026-08-26T19:45:00Z',
    attributes: {
      friendly_name: 'Relaxing Dinner',
      icon: 'ForkKnife',
      description: 'Sets dining pendant lights to warm 2700K glow and starts acoustic jazz playlist.'
    }
  },
  'scene.all_lights_off': {
    entity_id: 'scene.all_lights_off',
    state: '2026-08-26T23:15:00Z',
    attributes: {
      friendly_name: 'All Lights Off',
      icon: 'Moon',
      description: 'Instantly turns off all interior and exterior smart lights across all rooms.'
    }
  },
  'scene.party_mode': {
    entity_id: 'scene.party_mode',
    state: '2026-08-20T20:00:00Z',
    attributes: {
      friendly_name: 'Party & Celebration',
      icon: 'Sparkle',
      description: 'Enables dynamic RGB color loops on living room accents and syncs whole-home multi-room audio.'
    }
  },

  // ---------------- System Monitor ----------------
  'sensor.system_monitor_processor_use': {
    entity_id: 'sensor.system_monitor_processor_use',
    state: '10',
    attributes: {
      friendly_name: 'Processor use',
      unit_of_measurement: '%',
      icon: 'Cpu',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_processor_temperature': {
    entity_id: 'sensor.system_monitor_processor_temperature',
    state: '74.0',
    attributes: {
      friendly_name: 'Processor temperature',
      unit_of_measurement: '°C',
      device_class: 'temperature',
      icon: 'Thermometer',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_load_1m': {
    entity_id: 'sensor.system_monitor_load_1m',
    state: '1.09',
    attributes: {
      friendly_name: 'Load (1m)',
      icon: 'Cpu',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_load_5m': {
    entity_id: 'sensor.system_monitor_load_5m',
    state: '1.21',
    attributes: {
      friendly_name: 'Load (5m)',
      icon: 'Cpu',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_load_15m': {
    entity_id: 'sensor.system_monitor_load_15m',
    state: '1.26',
    attributes: {
      friendly_name: 'Load (15m)',
      icon: 'Cpu',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_memory_usage': {
    entity_id: 'sensor.system_monitor_memory_usage',
    state: '73.4',
    attributes: {
      friendly_name: 'Memory usage',
      unit_of_measurement: '%',
      icon: 'Memory',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_memory_use': {
    entity_id: 'sensor.system_monitor_memory_use',
    state: '2779.40',
    attributes: {
      friendly_name: 'Memory use',
      unit_of_measurement: 'MiB',
      icon: 'Memory',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_memory_free': {
    entity_id: 'sensor.system_monitor_memory_free',
    state: '1006.90',
    attributes: {
      friendly_name: 'Memory free',
      unit_of_measurement: 'MiB',
      icon: 'Memory',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_disk_usage_': {
    entity_id: 'sensor.system_monitor_disk_usage_',
    state: '20.2',
    attributes: {
      friendly_name: 'Disk usage (/)',
      unit_of_measurement: '%',
      icon: 'HardDrive',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_disk_use_': {
    entity_id: 'sensor.system_monitor_disk_use_',
    state: '21.20',
    attributes: {
      friendly_name: 'Disk use (/)',
      unit_of_measurement: 'GiB',
      icon: 'HardDrive',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_disk_free_': {
    entity_id: 'sensor.system_monitor_disk_free_',
    state: '83.70',
    attributes: {
      friendly_name: 'Disk free (/)',
      unit_of_measurement: 'GiB',
      icon: 'HardDrive',
      state_class: 'measurement'
    }
  },
  'sensor.system_monitor_ipv4_address_end0': {
    entity_id: 'sensor.system_monitor_ipv4_address_end0',
    state: '192.168.68.71',
    attributes: {
      friendly_name: 'IPv4 address (end0)',
      icon: 'Network',
      interface: 'end0'
    }
  },
  'sensor.system_monitor_network_in_end0': {
    entity_id: 'sensor.system_monitor_network_in_end0',
    state: '13760.5',
    attributes: {
      friendly_name: 'Network in (end0)',
      unit_of_measurement: 'MiB',
      icon: 'DownloadSimple',
      state_class: 'total_increasing'
    }
  },
  'sensor.system_monitor_network_out_end0': {
    entity_id: 'sensor.system_monitor_network_out_end0',
    state: '19500.8',
    attributes: {
      friendly_name: 'Network out (end0)',
      unit_of_measurement: 'MiB',
      icon: 'UploadSimple',
      state_class: 'total_increasing'
    }
  },
  'sensor.system_monitor_packets_in_end0': {
    entity_id: 'sensor.system_monitor_packets_in_end0',
    state: '24800000',
    attributes: {
      friendly_name: 'Packets in (end0)',
      unit_of_measurement: 'packets',
      icon: 'ArrowsInLineHorizontal',
      state_class: 'total_increasing'
    }
  },
  'sensor.system_monitor_packets_out_end0': {
    entity_id: 'sensor.system_monitor_packets_out_end0',
    state: '28500000',
    attributes: {
      friendly_name: 'Packets out (end0)',
      unit_of_measurement: 'packets',
      icon: 'ArrowsOutLineHorizontal',
      state_class: 'total_increasing'
    }
  },
  'sensor.system_monitor_uptime': {
    entity_id: 'sensor.system_monitor_uptime',
    state: '1 week',
    attributes: {
      friendly_name: 'System Uptime',
      icon: 'Clock',
      status: 'healthy'
    }
  },

  // ---------------- UGreen NAS Integration ----------------
  'sensor.ugreen_nas_nas_name': {
    entity_id: 'sensor.ugreen_nas_nas_name',
    state: 'UGREEN-DXP4800',
    attributes: { friendly_name: 'NAS Name', icon: 'HardDrives' }
  },
  'sensor.ugreen_nas_nas_model': {
    entity_id: 'sensor.ugreen_nas_nas_model',
    state: 'DXP4800 Plus',
    attributes: { friendly_name: 'NAS Model', manufacturer: 'UGREEN' }
  },
  'sensor.ugreen_nas_nas_serial': {
    entity_id: 'sensor.ugreen_nas_nas_serial',
    state: 'UG24DXP4800P0982',
    attributes: { friendly_name: 'Serial Number' }
  },
  'sensor.ugreen_nas_nas_owner': {
    entity_id: 'sensor.ugreen_nas_nas_owner',
    state: 'Admin (samer)',
    attributes: { friendly_name: 'NAS Owner' }
  },
  'sensor.ugreen_nas_nas_type': {
    entity_id: 'sensor.ugreen_nas_nas_type',
    state: '4-Bay Desktop NAS',
    attributes: { friendly_name: 'Device Type' }
  },
  'sensor.ugreen_nas_nas_ugos_version': {
    entity_id: 'sensor.ugreen_nas_nas_ugos_version',
    state: 'UGOS Pro v1.1.8 (Build 9842)',
    attributes: { friendly_name: 'UGOS Version' }
  },
  'sensor.ugreen_nas_server_status': {
    entity_id: 'sensor.ugreen_nas_server_status',
    state: 'Online',
    attributes: { friendly_name: 'Server Status' }
  },
  'sensor.ugreen_nas_system_status_code': {
    entity_id: 'sensor.ugreen_nas_system_status_code',
    state: 'Normal',
    attributes: { friendly_name: 'System Status Code' }
  },
  'sensor.ugreen_nas_system_message': {
    entity_id: 'sensor.ugreen_nas_system_message',
    state: 'System operating normally. All services healthy.',
    attributes: { friendly_name: 'System Message' }
  },
  'sensor.ugreen_nas_temperature_status_code': {
    entity_id: 'sensor.ugreen_nas_temperature_status_code',
    state: 'Normal',
    attributes: { friendly_name: 'Temperature Status Code' }
  },
  'sensor.ugreen_nas_temperature_message': {
    entity_id: 'sensor.ugreen_nas_temperature_message',
    state: 'Thermals within optimal operational thresholds.',
    attributes: { friendly_name: 'Temperature Message' }
  },
  'sensor.ugreen_nas_total_runtime': {
    entity_id: 'sensor.ugreen_nas_total_runtime',
    state: '184 days, 14 hours',
    attributes: { friendly_name: 'Total Runtime' }
  },
  'sensor.ugreen_nas_last_boot': {
    entity_id: 'sensor.ugreen_nas_last_boot',
    state: '12 days ago (Aug 16, 2026)',
    attributes: { friendly_name: 'Last Boot' }
  },

  // CPU & RAM
  'sensor.ugreen_nas_cpu_usage': {
    entity_id: 'sensor.ugreen_nas_cpu_usage',
    state: '24.5',
    attributes: { friendly_name: 'CPU Usage', unit_of_measurement: '%' }
  },
  'sensor.ugreen_nas_cpu_temperature': {
    entity_id: 'sensor.ugreen_nas_cpu_temperature',
    state: '48.5',
    attributes: { friendly_name: 'CPU Temperature', unit_of_measurement: '°C' }
  },
  'sensor.ugreen_nas_ram_usage': {
    entity_id: 'sensor.ugreen_nas_ram_usage',
    state: '36.8',
    attributes: { friendly_name: 'RAM Usage', unit_of_measurement: '%' }
  },
  'sensor.ugreen_nas_cpu_model': {
    entity_id: 'sensor.ugreen_nas_cpu_model',
    state: 'Intel Pentium Gold 8505',
    attributes: { friendly_name: 'CPU Model' }
  },
  'sensor.ugreen_nas_cpu_cores': {
    entity_id: 'sensor.ugreen_nas_cpu_cores',
    state: '5',
    attributes: { friendly_name: 'CPU Cores' }
  },
  'sensor.ugreen_nas_cpu_threads': {
    entity_id: 'sensor.ugreen_nas_cpu_threads',
    state: '6',
    attributes: { friendly_name: 'CPU Threads' }
  },
  'sensor.ugreen_nas_cpu_speed': {
    entity_id: 'sensor.ugreen_nas_cpu_speed',
    state: '3.30 GHz (Boost 4.40 GHz)',
    attributes: { friendly_name: 'CPU Speed' }
  },
  'sensor.ugreen_nas_ram_total_size': {
    entity_id: 'sensor.ugreen_nas_ram_total_size',
    state: '16.0 GB DDR5',
    attributes: { friendly_name: 'RAM Total Size', unit_of_measurement: 'GB' }
  },
  'sensor.ugreen_nas_ram_usage_used_gb': {
    entity_id: 'sensor.ugreen_nas_ram_usage_used_gb',
    state: '5.89 GB',
    attributes: { friendly_name: 'RAM Used', unit_of_measurement: 'GB' }
  },
  'sensor.ugreen_nas_ram_usage_free_ram': {
    entity_id: 'sensor.ugreen_nas_ram_usage_free_ram',
    state: '4.21 GB',
    attributes: { friendly_name: 'Free RAM', unit_of_measurement: 'GB' }
  },
  'sensor.ugreen_nas_ram_usage_usable_ram': {
    entity_id: 'sensor.ugreen_nas_ram_usage_usable_ram',
    state: '15.6 GB',
    attributes: { friendly_name: 'Usable RAM', unit_of_measurement: 'GB' }
  },
  'sensor.ugreen_nas_ram_usage_cache': {
    entity_id: 'sensor.ugreen_nas_ram_usage_cache',
    state: '5.90 GB',
    attributes: { friendly_name: 'RAM Cache Buffer', unit_of_measurement: 'GB' }
  },

  // Throughput
  'sensor.ugreen_nas_overall_lan_download': {
    entity_id: 'sensor.ugreen_nas_overall_lan_download',
    state: '42.8 MB/s',
    attributes: { friendly_name: 'LAN Download Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_lan_upload': {
    entity_id: 'sensor.ugreen_nas_overall_lan_upload',
    state: '18.4 MB/s',
    attributes: { friendly_name: 'LAN Upload Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_lan_download_raw': {
    entity_id: 'sensor.ugreen_nas_overall_lan_download_raw',
    state: '42.8',
    attributes: { friendly_name: 'LAN Download Raw', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_lan_upload_raw': {
    entity_id: 'sensor.ugreen_nas_overall_lan_upload_raw',
    state: '18.4',
    attributes: { friendly_name: 'LAN Upload Raw', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_disk_read_rate': {
    entity_id: 'sensor.ugreen_nas_overall_disk_read_rate',
    state: '88.5 MB/s',
    attributes: { friendly_name: 'Disk Read Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_disk_write_rate': {
    entity_id: 'sensor.ugreen_nas_overall_disk_write_rate',
    state: '46.2 MB/s',
    attributes: { friendly_name: 'Disk Write Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_disk_read_rate_raw': {
    entity_id: 'sensor.ugreen_nas_overall_disk_read_rate_raw',
    state: '88.5',
    attributes: { friendly_name: 'Disk Read Rate Raw', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_disk_write_rate_raw': {
    entity_id: 'sensor.ugreen_nas_overall_disk_write_rate_raw',
    state: '46.2',
    attributes: { friendly_name: 'Disk Write Rate Raw', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_volume_read_rate': {
    entity_id: 'sensor.ugreen_nas_overall_volume_read_rate',
    state: '74.1 MB/s',
    attributes: { friendly_name: 'Volume Read Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_volume_write_rate': {
    entity_id: 'sensor.ugreen_nas_overall_volume_write_rate',
    state: '38.6 MB/s',
    attributes: { friendly_name: 'Volume Write Rate', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_volume_read_rate_raw': {
    entity_id: 'sensor.ugreen_nas_overall_volume_read_rate_raw',
    state: '74.1',
    attributes: { friendly_name: 'Volume Read Rate Raw', unit_of_measurement: 'MB/s' }
  },
  'sensor.ugreen_nas_overall_volume_write_rate_raw': {
    entity_id: 'sensor.ugreen_nas_overall_volume_write_rate_raw',
    state: '38.6',
    attributes: { friendly_name: 'Volume Write Rate Raw', unit_of_measurement: 'MB/s' }
  },

  // Fans & Power
  'sensor.ugreen_nas_fan_status_overall': {
    entity_id: 'sensor.ugreen_nas_fan_status_overall',
    state: 'Normal (850 RPM)',
    attributes: { friendly_name: 'Overall Fan Status' }
  },
  'sensor.ugreen_nas_cpu_fan': {
    entity_id: 'sensor.ugreen_nas_cpu_fan',
    state: '1,120 RPM',
    attributes: { friendly_name: 'CPU Fan Speed', unit_of_measurement: 'RPM' }
  },
  'sensor.ugreen_nas_device_fan': {
    entity_id: 'sensor.ugreen_nas_device_fan',
    state: '850 RPM',
    attributes: { friendly_name: 'Chassis Fan Speed', unit_of_measurement: 'RPM' }
  },
  'sensor.dxp_fan_mode': {
    entity_id: 'sensor.dxp_fan_mode',
    state: 'Standard',
    attributes: { friendly_name: 'Current Fan Mode' }
  },
  'select.dxp_ugreen_nas_fan_mode': {
    entity_id: 'select.dxp_ugreen_nas_fan_mode',
    state: 'Standard',
    attributes: {
      friendly_name: 'Fan Mode Selector',
      options: ['Standard', 'Quiet', 'Full Speed']
    }
  },
  'sensor.dxp_power_mode': {
    entity_id: 'sensor.dxp_power_mode',
    state: 'Balanced',
    attributes: { friendly_name: 'Current Power Mode' }
  },
  'select.dxp_ugreen_nas_power_mode': {
    entity_id: 'select.dxp_ugreen_nas_power_mode',
    state: 'Balanced',
    attributes: {
      friendly_name: 'Power Mode Selector',
      options: ['High Performance', 'Balanced', 'Energy Saving']
    }
  },

  // Action Buttons
  'button.dxp_power_action_reboot': {
    entity_id: 'button.dxp_power_action_reboot',
    state: '2026-08-28T09:00:00Z',
    attributes: { friendly_name: 'Reboot NAS', icon: 'ArrowsCounterClockwise' }
  },
  'button.dxp_power_action_shutdown': {
    entity_id: 'button.dxp_power_action_shutdown',
    state: '2026-08-28T09:00:00Z',
    attributes: { friendly_name: 'Shutdown NAS', icon: 'Power' }
  },
  'button.dxp_power_action_wake_up': {
    entity_id: 'button.dxp_power_action_wake_up',
    state: '2026-08-28T09:00:00Z',
    attributes: { friendly_name: 'Wake Up (WoL)', icon: 'Sun' }
  },
  'button.dxp_stand_alone_disks_adopt': {
    entity_id: 'button.dxp_stand_alone_disks_adopt',
    state: '2026-08-28T09:00:00Z',
    attributes: { friendly_name: 'Adopt Disk', icon: 'PlusCircle' }
  },

  // Storage Pool 1
  'sensor.ugreen_nas_pool_1_label': {
    entity_id: 'sensor.ugreen_nas_pool_1_label',
    state: 'Storage Pool 1',
    attributes: { friendly_name: 'Pool 1 Label' }
  },
  'sensor.ugreen_nas_pool_1_name': {
    entity_id: 'sensor.ugreen_nas_pool_1_name',
    state: 'Main Data Array',
    attributes: { friendly_name: 'Pool 1 Name' }
  },
  'sensor.ugreen_nas_pool_1_level': {
    entity_id: 'sensor.ugreen_nas_pool_1_level',
    state: 'RAID 5',
    attributes: { friendly_name: 'RAID Level' }
  },
  'sensor.ugreen_nas_pool_1_status': {
    entity_id: 'sensor.ugreen_nas_pool_1_status',
    state: 'Healthy',
    attributes: { friendly_name: 'Pool 1 Status' }
  },
  'sensor.ugreen_nas_pool_1_disk_count': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_count',
    state: '3',
    attributes: { friendly_name: 'Disk Count' }
  },
  'sensor.ugreen_nas_pool_1_used_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_used_size',
    state: '8.42 TB',
    attributes: { friendly_name: 'Pool 1 Used Size', unit_of_measurement: 'TB' }
  },
  'sensor.ugreen_nas_pool_1_free_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_free_size',
    state: '6.12 TB',
    attributes: { friendly_name: 'Pool 1 Free Size', unit_of_measurement: 'TB' }
  },
  'sensor.ugreen_nas_pool_1_total_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_total_size',
    state: '14.54 TB',
    attributes: { friendly_name: 'Pool 1 Total Size', unit_of_measurement: 'TB' }
  },
  'sensor.ugreen_nas_pool_1_available_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_available_size',
    state: '6.12 TB Available',
    attributes: { friendly_name: 'Pool 1 Available Size' }
  },

  // Volume 1
  'sensor.ugreen_nas_pool_1_volume_1_label': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_label',
    state: 'Volume 1',
    attributes: { friendly_name: 'Volume 1 Label' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_name': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_name',
    state: 'Shared Storage & Media',
    attributes: { friendly_name: 'Volume 1 Name' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_filesystem': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_filesystem',
    state: 'Btrfs (COW with Integrity)',
    attributes: { friendly_name: 'Filesystem' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_health': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_health',
    state: 'Healthy',
    attributes: { friendly_name: 'Volume 1 Health' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_status': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_status',
    state: 'Normal',
    attributes: { friendly_name: 'Volume 1 Status' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_has_cache': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_has_cache',
    state: 'Yes (2x NVMe Read/Write)',
    attributes: { friendly_name: 'SSD Cache' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_pool_name': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_pool_name',
    state: 'Storage Pool 1',
    attributes: { friendly_name: 'Assigned Pool' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_used_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_used_size',
    state: '8.42 TB',
    attributes: { friendly_name: 'Volume 1 Used Size', unit_of_measurement: 'TB' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_available_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_available_size',
    state: '5.98 TB',
    attributes: { friendly_name: 'Volume 1 Available Size', unit_of_measurement: 'TB' }
  },
  'sensor.ugreen_nas_pool_1_volume_1_total_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_volume_1_total_size',
    state: '14.40 TB',
    attributes: { friendly_name: 'Volume 1 Total Size', unit_of_measurement: 'TB' }
  },
  'sensor.dxp_pool_1_volume_1_utilization': {
    entity_id: 'sensor.dxp_pool_1_volume_1_utilization',
    state: '58.5',
    attributes: { friendly_name: 'Volume 1 Utilization', unit_of_measurement: '%' }
  },
  'sensor.dxp_pool_1_volume_1_read_iops': {
    entity_id: 'sensor.dxp_pool_1_volume_1_read_iops',
    state: '1,420 IOPS',
    attributes: { friendly_name: 'Volume 1 Read IOPS', unit_of_measurement: 'IOPS' }
  },
  'sensor.dxp_pool_1_volume_1_write_iops': {
    entity_id: 'sensor.dxp_pool_1_volume_1_write_iops',
    state: '680 IOPS',
    attributes: { friendly_name: 'Volume 1 Write IOPS', unit_of_measurement: 'IOPS' }
  },

  // Bay 1: sensor.ugreen_nas_pool_1_disk_1_*
  'sensor.ugreen_nas_pool_1_disk_1_brand': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_brand',
    state: 'Seagate',
    attributes: { friendly_name: 'Bay 1 Disk Brand' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_model': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_model',
    state: 'IronWolf 8TB (ST8000VN004)',
    attributes: { friendly_name: 'Bay 1 Disk Model' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_status': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_status',
    state: 'Normal',
    attributes: { friendly_name: 'Bay 1 Disk Status' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_serial': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_serial',
    state: 'WW2900AE89',
    attributes: { friendly_name: 'Bay 1 Serial' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_slot': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_slot',
    state: 'Slot 1',
    attributes: { friendly_name: 'Bay 1 Slot' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_interface_type': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_interface_type',
    state: 'SATA 6Gb/s',
    attributes: { friendly_name: 'Bay 1 Interface' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_type': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_type',
    state: 'HDD (7200 RPM)',
    attributes: { friendly_name: 'Bay 1 Type' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_size',
    state: '8.0 TB',
    attributes: { friendly_name: 'Bay 1 Capacity' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_sleep_state': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_sleep_state',
    state: 'Active',
    attributes: { friendly_name: 'Bay 1 Sleep State' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_smart_last_result': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_smart_last_result',
    state: 'Pass',
    attributes: { friendly_name: 'Bay 1 SMART Result' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_smart_last_date': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_smart_last_date',
    state: 'Aug 26, 2026 03:00',
    attributes: { friendly_name: 'Bay 1 SMART Last Date' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_smart_next_date': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_smart_next_date',
    state: 'Sep 02, 2026 03:00',
    attributes: { friendly_name: 'Bay 1 SMART Next Date' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_power_on_hours': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_power_on_hours',
    state: '4,416 hrs',
    attributes: { friendly_name: 'Bay 1 Power On Hours' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_power_on_count': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_power_on_count',
    state: '18 times',
    attributes: { friendly_name: 'Bay 1 Power Cycles' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_temperature': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_temperature',
    state: '36.5',
    attributes: { friendly_name: 'Bay 1 Temperature', unit_of_measurement: '°C' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_utilization': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_utilization',
    state: '32.0',
    attributes: { friendly_name: 'Bay 1 Utilization', unit_of_measurement: '%' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_read_rate': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_read_rate',
    state: '28.4 MB/s',
    attributes: { friendly_name: 'Bay 1 Read Rate' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_write_rate': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_write_rate',
    state: '15.2 MB/s',
    attributes: { friendly_name: 'Bay 1 Write Rate' }
  },
  'sensor.ugreen_nas_pool_1_disk_1_used_for': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_1_used_for',
    state: 'Pool 1 (RAID 5) / Volume 1',
    attributes: { friendly_name: 'Bay 1 Used For' }
  },

  // Bay 2: sensor.ugreen_nas_pool_1_disk_2_*
  'sensor.ugreen_nas_pool_1_disk_2_brand': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_brand',
    state: 'Seagate',
    attributes: { friendly_name: 'Bay 2 Disk Brand' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_model': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_model',
    state: 'IronWolf 8TB (ST8000VN004)',
    attributes: { friendly_name: 'Bay 2 Disk Model' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_status': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_status',
    state: 'Normal',
    attributes: { friendly_name: 'Bay 2 Disk Status' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_serial': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_serial',
    state: 'WW2900AE90',
    attributes: { friendly_name: 'Bay 2 Serial' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_slot': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_slot',
    state: 'Slot 2',
    attributes: { friendly_name: 'Bay 2 Slot' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_interface_type': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_interface_type',
    state: 'SATA 6Gb/s',
    attributes: { friendly_name: 'Bay 2 Interface' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_type': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_type',
    state: 'HDD (7200 RPM)',
    attributes: { friendly_name: 'Bay 2 Type' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_size': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_size',
    state: '8.0 TB',
    attributes: { friendly_name: 'Bay 2 Capacity' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_sleep_state': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_sleep_state',
    state: 'Active',
    attributes: { friendly_name: 'Bay 2 Sleep State' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_smart_last_result': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_smart_last_result',
    state: 'Pass',
    attributes: { friendly_name: 'Bay 2 SMART Result' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_smart_last_date': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_smart_last_date',
    state: 'Aug 26, 2026 03:00',
    attributes: { friendly_name: 'Bay 2 SMART Last Date' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_smart_next_date': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_smart_next_date',
    state: 'Sep 02, 2026 03:00',
    attributes: { friendly_name: 'Bay 2 SMART Next Date' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_power_on_hours': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_power_on_hours',
    state: '4,416 hrs',
    attributes: { friendly_name: 'Bay 2 Power On Hours' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_power_on_count': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_power_on_count',
    state: '18 times',
    attributes: { friendly_name: 'Bay 2 Power Cycles' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_temperature': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_temperature',
    state: '37.0',
    attributes: { friendly_name: 'Bay 2 Temperature', unit_of_measurement: '°C' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_utilization': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_utilization',
    state: '31.5',
    attributes: { friendly_name: 'Bay 2 Utilization', unit_of_measurement: '%' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_read_rate': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_read_rate',
    state: '30.1 MB/s',
    attributes: { friendly_name: 'Bay 2 Read Rate' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_write_rate': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_write_rate',
    state: '15.4 MB/s',
    attributes: { friendly_name: 'Bay 2 Write Rate' }
  },
  'sensor.ugreen_nas_pool_1_disk_2_used_for': {
    entity_id: 'sensor.ugreen_nas_pool_1_disk_2_used_for',
    state: 'Pool 1 (RAID 5) / Volume 1',
    attributes: { friendly_name: 'Bay 2 Used For' }
  },

  // Bay 3: sensor.dxp_pool_1_disk_3_*
  'sensor.dxp_pool_1_disk_3_brand': {
    entity_id: 'sensor.dxp_pool_1_disk_3_brand',
    state: 'Seagate',
    attributes: { friendly_name: 'Bay 3 Disk Brand' }
  },
  'sensor.dxp_pool_1_disk_3_model': {
    entity_id: 'sensor.dxp_pool_1_disk_3_model',
    state: 'IronWolf 8TB (ST8000VN004)',
    attributes: { friendly_name: 'Bay 3 Disk Model' }
  },
  'sensor.dxp_pool_1_disk_3_status': {
    entity_id: 'sensor.dxp_pool_1_disk_3_status',
    state: 'Normal',
    attributes: { friendly_name: 'Bay 3 Disk Status' }
  },
  'sensor.dxp_pool_1_disk_3_serial': {
    entity_id: 'sensor.dxp_pool_1_disk_3_serial',
    state: 'WW2900AE91',
    attributes: { friendly_name: 'Bay 3 Serial' }
  },
  'sensor.dxp_pool_1_disk_3_slot': {
    entity_id: 'sensor.dxp_pool_1_disk_3_slot',
    state: 'Slot 3',
    attributes: { friendly_name: 'Bay 3 Slot' }
  },
  'sensor.dxp_pool_1_disk_3_interface_type': {
    entity_id: 'sensor.dxp_pool_1_disk_3_interface_type',
    state: 'SATA 6Gb/s',
    attributes: { friendly_name: 'Bay 3 Interface' }
  },
  'sensor.dxp_pool_1_disk_3_type': {
    entity_id: 'sensor.dxp_pool_1_disk_3_type',
    state: 'HDD (7200 RPM)',
    attributes: { friendly_name: 'Bay 3 Type' }
  },
  'sensor.dxp_pool_1_disk_3_size': {
    entity_id: 'sensor.dxp_pool_1_disk_3_size',
    state: '8.0 TB',
    attributes: { friendly_name: 'Bay 3 Capacity' }
  },
  'sensor.dxp_pool_1_disk_3_sleep_state': {
    entity_id: 'sensor.dxp_pool_1_disk_3_sleep_state',
    state: 'Active',
    attributes: { friendly_name: 'Bay 3 Sleep State' }
  },
  'sensor.dxp_pool_1_disk_3_smart_last_result': {
    entity_id: 'sensor.dxp_pool_1_disk_3_smart_last_result',
    state: 'Pass',
    attributes: { friendly_name: 'Bay 3 SMART Result' }
  },
  'sensor.dxp_pool_1_disk_3_smart_last_date': {
    entity_id: 'sensor.dxp_pool_1_disk_3_smart_last_date',
    state: 'Aug 26, 2026 03:00',
    attributes: { friendly_name: 'Bay 3 SMART Last Date' }
  },
  'sensor.dxp_pool_1_disk_3_smart_next_date': {
    entity_id: 'sensor.dxp_pool_1_disk_3_smart_next_date',
    state: 'Sep 02, 2026 03:00',
    attributes: { friendly_name: 'Bay 3 SMART Next Date' }
  },
  'sensor.dxp_pool_1_disk_3_power_on_hours': {
    entity_id: 'sensor.dxp_pool_1_disk_3_power_on_hours',
    state: '4,416 hrs',
    attributes: { friendly_name: 'Bay 3 Power On Hours' }
  },
  'sensor.dxp_pool_1_disk_3_power_on_count': {
    entity_id: 'sensor.dxp_pool_1_disk_3_power_on_count',
    state: '18 times',
    attributes: { friendly_name: 'Bay 3 Power Cycles' }
  },
  'sensor.dxp_pool_1_disk_3_temperature': {
    entity_id: 'sensor.dxp_pool_1_disk_3_temperature',
    state: '35.8',
    attributes: { friendly_name: 'Bay 3 Temperature', unit_of_measurement: '°C' }
  },
  'sensor.dxp_pool_1_disk_3_utilization': {
    entity_id: 'sensor.dxp_pool_1_disk_3_utilization',
    state: '30.0',
    attributes: { friendly_name: 'Bay 3 Utilization', unit_of_measurement: '%' }
  },
  'sensor.dxp_pool_1_disk_3_read_rate': {
    entity_id: 'sensor.dxp_pool_1_disk_3_read_rate',
    state: '30.0 MB/s',
    attributes: { friendly_name: 'Bay 3 Read Rate' }
  },
  'sensor.dxp_pool_1_disk_3_write_rate': {
    entity_id: 'sensor.dxp_pool_1_disk_3_write_rate',
    state: '15.6 MB/s',
    attributes: { friendly_name: 'Bay 3 Write Rate' }
  },
  'sensor.dxp_pool_1_disk_3_used_for': {
    entity_id: 'sensor.dxp_pool_1_disk_3_used_for',
    state: 'Pool 1 (RAID 5) / Volume 1',
    attributes: { friendly_name: 'Bay 3 Used For' }
  },

  // ---------------- TP-Link Router Integration ----------------
  'sensor.archer_ax55_cpu_used': {
    entity_id: 'sensor.archer_ax55_cpu_used',
    state: '14.0',
    attributes: {
      friendly_name: 'Archer AX55 CPU Used',
      unit_of_measurement: '%'
    }
  },
  'sensor.archer_ax55_memory_used': {
    entity_id: 'sensor.archer_ax55_memory_used',
    state: '73.0',
    attributes: {
      friendly_name: 'Archer AX55 Memory Used',
      unit_of_measurement: '%'
    }
  },
  'sensor.archer_ax55_wan_ipv4_address': {
    entity_id: 'sensor.archer_ax55_wan_ipv4_address',
    state: '192.168.129.2',
    attributes: {
      friendly_name: 'Archer AX55 WAN IPv4 Address',
      status: 'connected'
    }
  },
  'sensor.archer_ax55_lan_ipv4_address': {
    entity_id: 'sensor.archer_ax55_lan_ipv4_address',
    state: '192.168.68.1',
    attributes: {
      friendly_name: 'Archer AX55 LAN IPv4 Address'
    }
  },
  'sensor.archer_ax55_connection_type': {
    entity_id: 'sensor.archer_ax55_connection_type',
    state: 'dynamic_ip',
    attributes: {
      friendly_name: 'Archer AX55 Connection Type'
    }
  },
  'sensor.archer_ax55_uptime': {
    entity_id: 'sensor.archer_ax55_uptime',
    state: '18 days, 4 hours',
    attributes: {
      friendly_name: 'Archer AX55 Uptime'
    }
  },
  'sensor.archer_ax55_total_clients': {
    entity_id: 'sensor.archer_ax55_total_clients',
    state: '30',
    attributes: {
      friendly_name: 'Archer AX55 Total Clients'
    }
  },
  'sensor.archer_ax55_total_main_wifi_clients': {
    entity_id: 'sensor.archer_ax55_total_main_wifi_clients',
    state: '24',
    attributes: {
      friendly_name: 'Archer AX55 Total Main Wi-Fi Clients'
    }
  },
  'sensor.archer_ax55_total_wired_clients': {
    entity_id: 'sensor.archer_ax55_total_wired_clients',
    state: '5',
    attributes: {
      friendly_name: 'Archer AX55 Total Wired Clients'
    }
  },
  'sensor.archer_ax55_total_iot_clients': {
    entity_id: 'sensor.archer_ax55_total_iot_clients',
    state: '1',
    attributes: {
      friendly_name: 'Archer AX55 Total IoT Clients'
    }
  },
  'sensor.archer_ax55_total_guest_wifi_clients': {
    entity_id: 'sensor.archer_ax55_total_guest_wifi_clients',
    state: '0',
    attributes: {
      friendly_name: 'Archer AX55 Total Guest Wi-Fi Clients'
    }
  },
  'switch.archer_ax55_wifi_2_4g': {
    entity_id: 'switch.archer_ax55_wifi_2_4g',
    state: 'on',
    attributes: {
      friendly_name: 'Archer AX55 Wi-Fi 2.4G',
      ssid: 'Antigravity-Home'
    }
  },
  'switch.archer_ax55_wifi_5g': {
    entity_id: 'switch.archer_ax55_wifi_5g',
    state: 'on',
    attributes: {
      friendly_name: 'Archer AX55 Wi-Fi 5G',
      ssid: 'Antigravity-Home 5G'
    }
  },
  'switch.archer_ax55_wifi_6g': {
    entity_id: 'switch.archer_ax55_wifi_6g',
    state: 'on',
    attributes: {
      friendly_name: 'Archer AX55 Wi-Fi 6G (6E)',
      ssid: 'Antigravity-Ultra-6E'
    }
  },
  'switch.archer_ax55_guest_wifi_2_4g': {
    entity_id: 'switch.archer_ax55_guest_wifi_2_4g',
    state: 'off',
    attributes: {
      friendly_name: 'Archer AX55 Guest Wi-Fi 2.4G',
      ssid: 'Antigravity-Guest',
      key: 'WelcomeGuest2026!'
    }
  },
  'switch.archer_ax55_guest_wifi_5g': {
    entity_id: 'switch.archer_ax55_guest_wifi_5g',
    state: 'off',
    attributes: {
      friendly_name: 'Archer AX55 Guest Wi-Fi 5G',
      ssid: 'Antigravity-Guest-5G',
      key: 'WelcomeGuest2026!'
    }
  },
  'switch.archer_ax55_iot_wifi_2_4g': {
    entity_id: 'switch.archer_ax55_iot_wifi_2_4g',
    state: 'on',
    attributes: {
      friendly_name: 'Archer AX55 IoT Wi-Fi 2.4G',
      ssid: 'Antigravity-IoT'
    }
  },
  'switch.archer_ax55_router_data_fetching': {
    entity_id: 'switch.archer_ax55_router_data_fetching',
    state: 'on',
    attributes: {
      friendly_name: 'Archer AX55 Router Data Fetching'
    }
  },
  'button.archer_ax55_reboot': {
    entity_id: 'button.archer_ax55_reboot',
    state: '2026-08-01T12:00:00Z',
    attributes: {
      friendly_name: 'Archer AX55 Reboot'
    }
  },

  // ---------------- AdGuard Home Integration ----------------
  'switch.adguard_protection': {
    entity_id: 'switch.adguard_protection',
    state: 'on',
    attributes: {
      friendly_name: 'AdGuard Master Protection',
      icon: 'ShieldCheck'
    }
  },
  'switch.adguard_filtering': {
    entity_id: 'switch.adguard_filtering',
    state: 'on',
    attributes: {
      friendly_name: 'DNS Filtering',
      icon: 'Funnel'
    }
  },
  'switch.adguard_safe_browsing': {
    entity_id: 'switch.adguard_safe_browsing',
    state: 'on',
    attributes: {
      friendly_name: 'Safe Browsing Security',
      icon: 'ShieldWarning'
    }
  },
  'switch.adguard_parental_control': {
    entity_id: 'switch.adguard_parental_control',
    state: 'off',
    attributes: {
      friendly_name: 'Parental Control',
      icon: 'UsersThree'
    }
  },
  'switch.adguard_safe_search': {
    entity_id: 'switch.adguard_safe_search',
    state: 'on',
    attributes: {
      friendly_name: 'Safe Search Enforcement',
      icon: 'MagnifyingGlass'
    }
  },
  'switch.adguard_query_log': {
    entity_id: 'switch.adguard_query_log',
    state: 'on',
    attributes: {
      friendly_name: 'DNS Query Log',
      icon: 'ListBullets'
    }
  },
  'sensor.adguard_home_dns_queries': {
    entity_id: 'sensor.adguard_home_dns_queries',
    state: '7079596',
    attributes: {
      friendly_name: 'Total DNS Queries',
      unit_of_measurement: 'queries'
    }
  },
  'sensor.adguard_home_dns_queries_blocked': {
    entity_id: 'sensor.adguard_home_dns_queries_blocked',
    state: '1225081',
    attributes: {
      friendly_name: 'Blocked DNS Queries',
      unit_of_measurement: 'queries'
    }
  },
  'sensor.adguard_home_dns_queries_blocked_ratio': {
    entity_id: 'sensor.adguard_home_dns_queries_blocked_ratio',
    state: '17.31',
    attributes: {
      friendly_name: 'DNS Block Ratio',
      unit_of_measurement: '%'
    }
  },
  'sensor.adguard_home_safe_browsing_blocked': {
    entity_id: 'sensor.adguard_home_safe_browsing_blocked',
    state: '6',
    attributes: {
      friendly_name: 'Safe Browsing Blocked'
    }
  },
  'sensor.adguard_home_parental_control_blocked': {
    entity_id: 'sensor.adguard_home_parental_control_blocked',
    state: '52',
    attributes: {
      friendly_name: 'Parental Content Blocked'
    }
  },
  'sensor.adguard_home_rules_count': {
    entity_id: 'sensor.adguard_home_rules_count',
    state: '3900756',
    attributes: {
      friendly_name: 'Active Filter Rules',
      rule_lists_count: 14
    }
  },
  'sensor.adguard_home_average_processing_speed': {
    entity_id: 'sensor.adguard_home_average_processing_speed',
    state: '57.28',
    attributes: {
      friendly_name: 'Average Processing Speed',
      unit_of_measurement: 'ms'
    }
  },
  'sensor.adguard_home_safe_searches_enforced': {
    entity_id: 'sensor.adguard_home_safe_searches_enforced',
    state: '0',
    attributes: {
      friendly_name: 'Safe Searches Enforced'
    }
  },

  // ---------------- Connected Network Devices (Device Trackers) ----------------
  'device_tracker.samers_macbook_pro_m3_max': {
    entity_id: 'device_tracker.samers_macbook_pro_m3_max',
    state: 'home',
    attributes: {
      friendly_name: "Samer's MacBook Pro M3 Max",
      ip_address: '192.168.68.102',
      mac_address: 'E4:5F:01:23:45:67',
      band: '6ghz',
      signal_strength: -48,
      download_speed_kbps: 18400,
      upload_speed_kbps: 6200,
      source_type: 'router'
    }
  },
  'device_tracker.home_assistant_green_host': {
    entity_id: 'device_tracker.home_assistant_green_host',
    state: 'home',
    attributes: {
      friendly_name: 'Home Assistant Green Host',
      ip_address: '192.168.68.80',
      mac_address: 'D8:9C:E4:56:78:9A',
      band: 'ethernet',
      signal_strength: 0,
      download_speed_kbps: 210,
      upload_speed_kbps: 180,
      source_type: 'router'
    }
  },
  'device_tracker.ugreen_dxp4800_plus_nas': {
    entity_id: 'device_tracker.ugreen_dxp4800_plus_nas',
    state: 'home',
    attributes: {
      friendly_name: 'UGREEN DXP4800 Plus NAS',
      ip_address: '192.168.68.81',
      mac_address: 'BC:D0:74:11:22:33',
      band: 'ethernet',
      signal_strength: 0,
      download_speed_kbps: 14200,
      upload_speed_kbps: 6800,
      source_type: 'router'
    }
  },
  'device_tracker.living_room_apple_tv_4k': {
    entity_id: 'device_tracker.living_room_apple_tv_4k',
    state: 'home',
    attributes: {
      friendly_name: 'Living Room Apple TV 4K',
      ip_address: '192.168.68.115',
      mac_address: 'A4:C3:F0:88:99:AA',
      band: '5ghz',
      signal_strength: -54,
      download_speed_kbps: 8500,
      upload_speed_kbps: 45,
      source_type: 'router'
    }
  },
  'device_tracker.office_smart_lamp': {
    entity_id: 'device_tracker.office_smart_lamp',
    state: 'home',
    attributes: {
      friendly_name: 'Office Smart Lamp (Matter)',
      ip_address: '192.168.68.140',
      mac_address: '34:7E:5C:99:88:77',
      band: '2.4ghz',
      signal_strength: -68,
      download_speed_kbps: 2,
      upload_speed_kbps: 4,
      source_type: 'router'
    }
  },
  'device_tracker.tesla_wall_connector_gen3': {
    entity_id: 'device_tracker.tesla_wall_connector_gen3',
    state: 'home',
    attributes: {
      friendly_name: 'Tesla Wall Connector Gen 3',
      ip_address: '192.168.68.190',
      mac_address: 'F0:18:98:44:55:66',
      band: '2.4ghz',
      signal_strength: -72,
      download_speed_kbps: 15,
      upload_speed_kbps: 8,
      source_type: 'router'
    }
  },
  'device_tracker.ipad_pro_13_m4': {
    entity_id: 'device_tracker.ipad_pro_13_m4',
    state: 'home',
    attributes: {
      friendly_name: 'iPad Pro 13 (M4)',
      ip_address: '192.168.68.105',
      mac_address: '70:EE:50:33:44:55',
      band: '5ghz',
      signal_strength: -51,
      download_speed_kbps: 2400,
      upload_speed_kbps: 120,
      source_type: 'router'
    }
  },
  'device_tracker.ecobee_premium_thermostat': {
    entity_id: 'device_tracker.ecobee_premium_thermostat',
    state: 'home',
    attributes: {
      friendly_name: 'Ecobee Premium Thermostat',
      ip_address: '192.168.68.145',
      mac_address: '48:D7:05:12:34:56',
      band: '2.4ghz',
      signal_strength: -64,
      download_speed_kbps: 5,
      upload_speed_kbps: 12,
      source_type: 'router'
    }
  }
};

