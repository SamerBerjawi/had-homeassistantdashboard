/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HAArea, HADevice, HAEntityRegistryEntry, HAFloor, HAState } from '../types';

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
    entity_id: 'fan.living_room_ceiling_fan',
    name: 'Living Room Ceiling Fan',
    area_id: 'living_room',
    platform: 'tuya'
  },
  {
    entity_id: 'fan.master_bedroom_fan',
    name: 'Master Bedroom Fan',
    area_id: 'bedroom',
    platform: 'tuya'
  },
  {
    entity_id: 'fan.office_smart_fan',
    name: 'Office Smart Fan',
    area_id: 'office',
    platform: 'tuya'
  },

  // ---------------- Security Alarm Control Panel ----------------
  {
    entity_id: 'alarm_control_panel.home_alarm',
    name: 'Homz Security Guard',
    area_id: 'hallway',
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
      source: 'Spotify Hi-Fi'
    }
  },
  'media_player.living_room_tv': {
    entity_id: 'media_player.living_room_tv',
    state: 'on',
    attributes: {
      friendly_name: 'LG OLED C3 TV',
      source: 'Apple TV 4K',
      power: 85
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
    state: '4.82',
    attributes: {
      friendly_name: 'Rooftop Solar Generation',
      unit_of_measurement: 'kW',
      device_class: 'power',
      peak_today: '5.64 kW'
    }
  },
  'sensor.tesla_powerwall_battery_level': {
    entity_id: 'sensor.tesla_powerwall_battery_level',
    state: '74',
    attributes: {
      friendly_name: 'Powerwall 3 Storage Level',
      unit_of_measurement: '%',
      capacity_kwh: 13.5
    }
  },
  'sensor.tesla_powerwall_flow': {
    entity_id: 'sensor.tesla_powerwall_flow',
    state: '-1.45', // negative = charging
    attributes: {
      friendly_name: 'Powerwall Charge / Discharge Flow',
      unit_of_measurement: 'kW'
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
  'fan.living_room_ceiling_fan': {
    entity_id: 'fan.living_room_ceiling_fan',
    state: 'on',
    attributes: {
      friendly_name: 'Living Room Ceiling Fan',
      speed: 'medium',
      percentage: 66,
      oscillating: true,
      direction: 'forward',
      power: 35
    }
  },
  'fan.master_bedroom_fan': {
    entity_id: 'fan.master_bedroom_fan',
    state: 'off',
    attributes: {
      friendly_name: 'Master Bedroom Fan',
      speed: 'off',
      percentage: 0,
      oscillating: false,
      direction: 'forward',
      power: 0
    }
  },
  'fan.office_smart_fan': {
    entity_id: 'fan.office_smart_fan',
    state: 'on',
    attributes: {
      friendly_name: 'Office Smart Fan',
      speed: 'high',
      percentage: 100,
      oscillating: true,
      direction: 'forward',
      power: 45
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
  }
};
