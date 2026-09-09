/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Integrations & Add-ons aggregation service.
 * Correlates Official Core Integrations (config entries), HACS repositories,
 * and Supervisor Add-ons with linked Devices, Entities, and live update states.
 */

import { HAEntityRegistryEntry, HADevice, HAState, ResolvedEntity } from '../types';
import { IntegrationItem, IntegrationCategory, IoTClass, IntegrationState } from '../types/integrations';
import { haWebSocketService } from './haWebSocket';

// Metadata dictionary for well-known integrations, protocols, and add-ons
interface KnownIntegrationMeta {
  name: string;
  category: IntegrationCategory;
  description: string;
  iotClass: IoTClass;
  documentationUrl?: string;
  authors?: string[];
  isCustom?: boolean;
}

// Exhaustive list of helper domains, device type conversions, and synthetic entity generators
export const HELPER_DOMAINS = new Set([
  'switch_as_x',
  'change_device_type',
  'switch_as_light',
  'switch_as_fan',
  'switch_as_cover',
  'switch_as_lock',
  'switch_as_siren',
  'input_boolean',
  'input_button',
  'input_datetime',
  'input_number',
  'input_select',
  'input_text',
  'counter',
  'timer',
  'schedule',
  'template',
  'group',
  'utility_meter',
  'derivative',
  'integration',
  'min_max',
  'threshold',
  'tod',
  'trend',
  'filter',
  'statistics',
  'history_stats',
  'bayesian',
  'generic_thermostat',
  'generic_hygrostat',
  'compensation',
  'compensated_sensor',
  'combine_network_interfaces',
  'command_line',
  'random',
  'simulated',
  'person',
  'zone',
  'tag',
  'sun',
  'moon',
  'season',
  'time_date',
  'worldclock',
  'workday',
  'proximity',
  'alert',
  'automation',
  'scene',
  'script',
  'device_automation',
  'blueprint',
  'shopping_list',
  'todo',
  'conversation',
  'wake_word',
  'assist_pipeline',
  'stt',
  'tts',
  'intent',
  'intent_script',
  'webhook',
  'websocket_api',
  'diagnostics',
  'energy',
  'system_health',
  'analytics',
  'hardware',
  'repairs',
  'repairs_issue',
  'hassio',
  'homeassistant',
  'my',
  'search',
  'onboarding',
  'frontend',
  'http',
  'api',
  'auth',
  'recorder',
  'logger',
  'default_config',
  'config',
  'lovelace'
]);

export function isHelper(domain?: string, source?: string, platform?: string): boolean {
  if (source === 'helper') return true;
  const d = (domain || '').toLowerCase().trim();
  const p = (platform || '').toLowerCase().trim();
  if (d.startsWith('input_') || p.startsWith('input_')) return true;
  if (HELPER_DOMAINS.has(d) || HELPER_DOMAINS.has(p)) return true;
  if (d.includes('switch_as_') || p.includes('switch_as_') || d.includes('_as_x') || p.includes('_as_x')) return true;
  if (d === 'switch_as_x' || p === 'switch_as_x' || d === 'change_device_type' || p === 'change_device_type') return true;
  return false;
}

// Canonical display names for Home Assistant integrations and community components
export const INTEGRATION_DISPLAY_NAMES: Record<string, string> = {
  homekit_controller: 'HomeKit Controller',
  homekit: 'HomeKit Bridge',
  eufy_security: 'Eufy Security',
  eufy: 'Eufy',
  hue: 'Philips Hue',
  sonos: 'Sonos',
  ecobee: 'Ecobee',
  apple_tv: 'Apple TV',
  webostv: 'LG webOS TV',
  cast: 'Google Cast',
  unifiprotect: 'UniFi Protect',
  unifi: 'UniFi Network',
  ring: 'Ring',
  shelly: 'Shelly',
  tplink: 'TP-Link Kasa',
  tplink_omada: 'TP-Link Omada',
  esphome: 'ESPHome',
  zha: 'Zigbee Home Automation (ZHA)',
  zigbee2mqtt: 'Zigbee2MQTT',
  mqtt: 'MQTT',
  matter: 'Matter',
  thread: 'Thread',
  tuya: 'Tuya Smart',
  smartthings: 'SmartThings',
  reolink: 'Reolink',
  frigate: 'Frigate',
  blink: 'Blink',
  wyze: 'Wyze',
  arlo: 'Arlo',
  nest: 'Google Nest',
  roborock: 'Roborock',
  dreame: 'Dreame Vacuum',
  roomba: 'iRobot Roomba',
  deebot: 'Ecovacs Deebot',
  neato: 'Neato Robotics',
  switchbot: 'SwitchBot',
  august: 'August Home',
  yale: 'Yale Home',
  schlage: 'Schlage',
  nuki: 'Nuki',
  tasmota: 'Tasmota',
  wled: 'WLED',
  govee: 'Govee',
  lifx: 'LIFX',
  nanoleaf: 'Nanoleaf',
  lutron_caseta: 'Lutron Caséta',
  insteon: 'Insteon',
  zwave_js: 'Z-Wave JS',
  honeywell: 'Honeywell Home',
  tado: 'Tado',
  sensibo: 'Sensibo',
  daikin: 'Daikin AC',
  broadlink: 'Broadlink',
  bond: 'Bond Bridge',
  somfy: 'Somfy',
  hunterdouglas_powerview: 'Hunter Douglas PowerView',
  overkiz: 'Overkiz (Somfy)',
  flume: 'Flume Water Meter',
  moen: 'Flo by Moen',
  rachio: 'Rachio',
  rainbird: 'Rain Bird',
  hydrawise: 'Hunter Hydrawise',
  bthome: 'BTHome',
  xiaomi_ble: 'Xiaomi BLE',
  bluetooth: 'Bluetooth',
  upnp: 'UPnP / IGD',
  dlna_dmr: 'DLNA Media Renderer',
  ipp: 'Internet Printing Protocol (IPP)',
  brother: 'Brother Printer',
  speedtestdotnet: 'Speedtest.net',
  fastdotcom: 'Fast.com',
  pi_hole: 'Pi-hole',
  adguard: 'AdGuard Home',
  glances: 'Glances',
  systemmonitor: 'System Monitor',
  netdata: 'Netdata',
  unifi_access: 'UniFi Access',
  hacs: 'HACS Community Store',
  browser_mod: 'Browser Mod',
  thermal_comfort: 'Thermal Comfort',
  grocy: 'Grocy',
  spook: 'Spook',
  adaptive_lighting: 'Adaptive Lighting',
  nodered: 'Node-RED',
  mosquitto: 'Mosquitto MQTT Broker',
  studio_code_server: 'Studio Code Server',
  tailscale: 'Tailscale',
  cloudflared: 'Cloudflare Tunnel',
  wireguard: 'WireGuard',
  samba: 'Samba Share',
  mariadb: 'MariaDB',
  uptime_kuma: 'Uptime Kuma',
  vaultwarden: 'Vaultwarden',
  synology_dsm: 'Synology DSM',
  qnap: 'QNAP',
  truenas: 'TrueNAS',
  proxmoxve: 'Proxmox VE',
  plex: 'Plex Media Server',
  jellyfin: 'Jellyfin',
  emby: 'Emby',
  spotify: 'Spotify',
  heos: 'Denon HEOS',
  denonavr: 'Denon AVR',
  yamaha: 'Yamaha MusicCast',
  onkyo: 'Onkyo',
  marantz: 'Marantz',
  braviatv: 'Sony Bravia TV',
  samsungtv: 'Samsung Smart TV',
  roku: 'Roku',
  androidtv: 'Android TV',
  tesla: 'Tesla',
  bmw_connected_drive: 'BMW Connected Drive',
  audi_connect: 'Audi Connect',
  fordpass: 'FordPass',
  hyundai_kia_connect: 'Hyundai / Kia Connect',
  enphase_envoy: 'Enphase Envoy',
  solaredge: 'SolarEdge',
  fronius: 'Fronius',
  sense: 'Sense Energy',
  emporia_vue: 'Emporia Vue',
  shelly_em: 'Shelly EM',
  accuweather: 'AccuWeather',
  met: 'Meteorologisk Institutt (Met.no)',
  openweathermap: 'OpenWeatherMap',
  pirateweather: 'Pirate Weather',
  tomorrowio: 'Tomorrow.io',
  airvisual: 'IQAir AirVisual',
  google_travel_time: 'Google Maps Travel Time',
  waze_travel_time: 'Waze Travel Time',
  google: 'Google Calendar',
  icloud: 'Apple iCloud',
  nextcloud: 'Nextcloud',
  todoist: 'Todoist',
  telegram_bot: 'Telegram Bot',
  discord: 'Discord',
  slack: 'Slack',
  pushover: 'Pushover',
  pushbullet: 'Pushbullet'
};

export function formatIntegrationName(domain?: string, candidateTitle?: string): string {
  const dom = (domain || '').toLowerCase().trim();
  if (!dom) return candidateTitle || 'Unknown Integration';
  if (INTEGRATION_DISPLAY_NAMES[dom]) {
    return INTEGRATION_DISPLAY_NAMES[dom];
  }
  if (KNOWN_INTEGRATIONS_META[dom]?.name) {
    return KNOWN_INTEGRATIONS_META[dom].name;
  }
  if (candidateTitle && candidateTitle.trim() && candidateTitle.toLowerCase() !== dom && !candidateTitle.includes('_')) {
    return candidateTitle.trim();
  }
  return dom
    .split(/[_-]+/)
    .filter(Boolean)
    .map(w => {
      const acronyms: Record<string, string> = {
        tv: 'TV',
        ip: 'IP',
        iot: 'IoT',
        api: 'API',
        usb: 'USB',
        hdmi: 'HDMI',
        cec: 'CEC',
        ble: 'BLE',
        nfc: 'NFC',
        rf: 'RF',
        ir: 'IR',
        zha: 'ZHA',
        mqtt: 'MQTT',
        esphome: 'ESPHome',
        homekit: 'HomeKit',
        eufy: 'Eufy',
        hacs: 'HACS'
      };
      if (acronyms[w]) return acronyms[w];
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

const KNOWN_INTEGRATIONS_META: Record<string, KnownIntegrationMeta> = {
  // --- Official Core Integrations ---
  homekit_controller: {
    name: 'HomeKit Controller',
    category: 'official',
    description: 'Local control of Apple HomeKit accessories and bridges over IP and BLE.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/homekit_controller',
    authors: ['Home Assistant'],
    isCustom: false
  },
  homekit: {
    name: 'HomeKit Bridge',
    category: 'official',
    description: 'Forward Home Assistant entities into Apple HomeKit.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/homekit',
    authors: ['Home Assistant'],
    isCustom: false
  },
  eufy_security: {
    name: 'Eufy Security',
    category: 'official',
    description: 'Eufy Security cameras, video doorbells, smart locks, and base stations.',
    iotClass: 'local_push',
    documentationUrl: 'https://github.com/fuatakgun/eufy_security',
    authors: ['Fuat Akgun'],
    isCustom: true
  },
  eufy: {
    name: 'Eufy',
    category: 'official',
    description: 'Eufy smart home devices, vacuums, and lighting.',
    iotClass: 'local_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/eufy',
    authors: ['Home Assistant'],
    isCustom: false
  },
  hue: {
    name: 'Philips Hue',
    category: 'official',
    description: 'Integrates Philips Hue bridge, bulbs, lightstrips, and accessories.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/hue',
    authors: ['Home Assistant'],
    isCustom: false
  },
  sonos: {
    name: 'Sonos',
    category: 'official',
    description: 'Multi-room wireless sound system and speakers control.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/sonos',
    authors: ['Home Assistant'],
    isCustom: false
  },
  ecobee: {
    name: 'Ecobee',
    category: 'official',
    description: 'Smart thermostats, temperature sensors, and climate control.',
    iotClass: 'cloud_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/ecobee',
    authors: ['Home Assistant'],
    isCustom: false
  },
  apple_tv: {
    name: 'Apple TV',
    category: 'official',
    description: 'AirPlay and Media Remote protocol control for Apple TV devices.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/apple_tv',
    authors: ['Home Assistant'],
    isCustom: false
  },
  webostv: {
    name: 'LG webOS Smart TV',
    category: 'official',
    description: 'Control LG webOS Smart TVs, inputs, power, and media playback.',
    iotClass: 'local_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/webostv',
    authors: ['Home Assistant'],
    isCustom: false
  },
  cast: {
    name: 'Google Cast',
    category: 'official',
    description: 'Stream audio and video to Google Cast and Nest speakers and displays.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/cast',
    authors: ['Home Assistant'],
    isCustom: false
  },
  unifiprotect: {
    name: 'UniFi Protect',
    category: 'official',
    description: 'Ubiquiti UniFi Protect cameras, chimes, viewports, and NVR streams.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/unifiprotect',
    authors: ['Home Assistant'],
    isCustom: false
  },
  ring: {
    name: 'Ring',
    category: 'official',
    description: 'Ring video doorbells, security cameras, and motion detectors.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/ring',
    authors: ['Home Assistant'],
    isCustom: false
  },
  shelly: {
    name: 'Shelly',
    category: 'official',
    description: 'Native Gen1, Gen2 (Plus/Pro) and BLU Shelly relays, plugs, and sensors.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/shelly',
    authors: ['Home Assistant'],
    isCustom: false
  },
  esphome: {
    name: 'ESPHome',
    category: 'official',
    description: 'Custom ESP8266/ESP32 devices controlled via native API protocol.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/esphome',
    authors: ['ESPHome Team'],
    isCustom: false
  },
  tuya: {
    name: 'Tuya Smart',
    category: 'official',
    description: 'Tuya, Smart Life, and powered-by-Tuya smart devices via official cloud.',
    iotClass: 'cloud_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/tuya',
    authors: ['Tuya', 'Home Assistant'],
    isCustom: false
  },
  roborock: {
    name: 'Roborock',
    category: 'official',
    description: 'Roborock robot vacuums, multi-floor maps, and docking stations.',
    iotClass: 'cloud_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/roborock',
    authors: ['Home Assistant'],
    isCustom: false
  },
  daikin: {
    name: 'Daikin AC',
    category: 'official',
    description: 'Daikin air conditioning and heat pump systems.',
    iotClass: 'local_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/daikin',
    authors: ['Home Assistant'],
    isCustom: false
  },
  aqara: {
    name: 'Aqara',
    category: 'official',
    description: 'Aqara smart home sensors, gateways, and switches.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/aqara',
    authors: ['Home Assistant'],
    isCustom: false
  },
  yale: {
    name: 'Yale Home',
    category: 'official',
    description: 'Yale and August smart deadbolts, keypads, and door locks.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/yale',
    authors: ['Home Assistant'],
    isCustom: false
  },
  rachio: {
    name: 'Rachio Smart Sprinkler',
    category: 'official',
    description: 'Smart irrigation controllers and weather-aware watering zones.',
    iotClass: 'cloud_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/rachio',
    authors: ['Home Assistant'],
    isCustom: false
  },
  myq: {
    name: 'myQ Garage Door',
    category: 'official',
    description: 'Chamberlain / LiftMaster myQ smart garage door openers.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/myq',
    authors: ['Home Assistant'],
    isCustom: false
  },
  met: {
    name: 'Meteorologisk Institutt',
    category: 'official',
    description: 'Free Nordic and worldwide weather forecast service.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/met',
    authors: ['Home Assistant'],
    isCustom: false
  },
  accuweather: {
    name: 'AccuWeather',
    category: 'official',
    description: 'Local weather conditions, precipitation alerts, and forecasts.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/accuweather',
    authors: ['Home Assistant'],
    isCustom: false
  },
  netatmo: {
    name: 'Netatmo',
    category: 'official',
    description: 'Netatmo Weather Stations, indoor air quality, and outdoor probes.',
    iotClass: 'cloud_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/netatmo',
    authors: ['Home Assistant'],
    isCustom: false
  },
  tplink: {
    name: 'TP-Link Kasa / Tapo',
    category: 'official',
    description: 'TP-Link Smart Wi-Fi plugs, switches, lightbulbs, and power strips.',
    iotClass: 'local_polling',
    documentationUrl: 'https://www.home-assistant.io/integrations/tplink',
    authors: ['Home Assistant'],
    isCustom: false
  },
  wled: {
    name: 'WLED',
    category: 'official',
    description: 'Addressable NeoPixel/WS2812B LED light strip controllers.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/wled',
    authors: ['Frenck', 'Home Assistant'],
    isCustom: false
  },
  mqtt: {
    name: 'MQTT',
    category: 'official',
    description: 'Standard lightweight message queue telemetry transport protocol.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/mqtt',
    authors: ['Home Assistant'],
    isCustom: false
  },
  matter: {
    name: 'Matter',
    category: 'official',
    description: 'Unified cross-platform smart home connectivity standard over IPv6/Thread.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/matter',
    authors: ['Home Assistant'],
    isCustom: false
  },
  zha: {
    name: 'Zigbee Home Automation (ZHA)',
    category: 'official',
    description: 'Native Zigbee controller stack supporting ConBee, SkyConnect, and Sonoff.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io/integrations/zha',
    authors: ['Home Assistant'],
    isCustom: false
  },
  homeassistant: {
    name: 'Home Assistant Core',
    category: 'official',
    description: 'Core Home Assistant operating platform, supervisor, and runtime.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.home-assistant.io',
    authors: ['Paulus Schoutsen', 'Core Team'],
    isCustom: false
  },

  // --- HACS Custom Community Integrations ---
  hacs: {
    name: 'HACS (Home Assistant Community Store)',
    category: 'hacs',
    description: 'Package manager for installing and updating custom components and themes.',
    iotClass: 'local_polling',
    documentationUrl: 'https://hacs.xyz',
    authors: ['Joakim Sørensen'],
    isCustom: true
  },
  grocy: {
    name: 'Grocy Custom Integration',
    category: 'hacs',
    description: 'ERP for your fridge: inventory tracking, chores, recipes, and tasks.',
    iotClass: 'local_polling',
    documentationUrl: 'https://github.com/custom-components/grocy',
    authors: ['Bernd Bestel', 'Community'],
    isCustom: true
  },
  dreame: {
    name: 'Dreame Vacuum (HACS)',
    category: 'hacs',
    description: 'Advanced map manipulation, water flow, and custom cleaning routines.',
    iotClass: 'cloud_polling',
    documentationUrl: 'https://github.com/Tasshack/dreame-vacuum',
    authors: ['Tasshack'],
    isCustom: true
  },
  adaptive_lighting: {
    name: 'Adaptive Lighting',
    category: 'hacs',
    description: 'Synchronizes light brightness and color temperature with the sun cycle.',
    iotClass: 'calculated',
    documentationUrl: 'https://github.com/basnijholt/adaptive-lighting',
    authors: ['Bas Nijholt'],
    isCustom: true
  },
  thermal_comfort: {
    name: 'Thermal Comfort',
    category: 'hacs',
    description: 'Calculates dew point, absolute humidity, and perceived temperature.',
    iotClass: 'calculated',
    documentationUrl: 'https://github.com/dolezsa/thermal_comfort',
    authors: ['Michal Doležal'],
    isCustom: true
  },

  // --- Supervisor Add-ons & Apps ---
  zigbee2mqtt: {
    name: 'Zigbee2MQTT',
    category: 'addon',
    description: 'Bridge Zigbee devices to MQTT without proprietary bridges or clouds.',
    iotClass: 'local_push',
    documentationUrl: 'https://www.zigbee2mqtt.io',
    authors: ['Koen Kanters'],
    isCustom: false
  },
  mosquitto: {
    name: 'Mosquitto MQTT Broker',
    category: 'addon',
    description: 'Official Eclipse Mosquitto lightweight MQTT messaging broker add-on.',
    iotClass: 'local_push',
    documentationUrl: 'https://github.com/home-assistant/addons/tree/master/mosquitto',
    authors: ['Home Assistant'],
    isCustom: false
  },
  studio_code_server: {
    name: 'Studio Code Server',
    category: 'addon',
    description: 'Visual Studio Code in your browser for editing Home Assistant configuration.',
    iotClass: 'local_push',
    documentationUrl: 'https://github.com/hassio-addons/addon-vscode',
    authors: ['Frenck'],
    isCustom: false
  },
  adguard: {
    name: 'AdGuard Home',
    category: 'addon',
    description: 'Network-wide ad, tracker, and malicious domain blocking DNS server.',
    iotClass: 'local_polling',
    documentationUrl: 'https://adguard.com/adguard-home.html',
    authors: ['AdGuard Team'],
    isCustom: false
  },
  nodered: {
    name: 'Node-RED',
    category: 'addon',
    description: 'Flow-based programming tool for connecting hardware devices and APIs.',
    iotClass: 'local_push',
    documentationUrl: 'https://nodered.org',
    authors: ['OpenJS Foundation'],
    isCustom: false
  }
};

function toResolvedEntity(
  entityId: string,
  name: string,
  state: string,
  attributes: Record<string, any> = {},
  areaId?: string | null,
  deviceId?: string | null,
  icon?: string
): ResolvedEntity {
  return {
    entity_id: entityId,
    domain: entityId.split('.')[0] || 'sensor',
    name,
    state,
    attributes,
    area_id: areaId || null,
    device_id: deviceId || null,
    floor_id: null,
    resolutionSource: areaId ? 'direct_entity_area' : 'unassigned',
    hidden: false,
    isDiagnostic: false,
    icon
  };
}

export function isHacsIntegrationDevice(dev: HADevice): boolean {
  if (!dev) return false;
  const name = (dev.name || dev.name_by_user || '').toLowerCase().trim();
  if (name === 'home assistant community store' || name === 'hacs' || name === 'hacs community store') {
    return false;
  }

  // 1. Identifiers check: [["hacs", "<id>"]] where id is not "hacs"
  const hasHacsIdentifier = (dev.identifiers || []).some(ident => {
    if (Array.isArray(ident) && String(ident[0]).toLowerCase() === 'hacs') {
      const val = String(ident[1]).toLowerCase().trim();
      return val !== 'hacs';
    }
    return false;
  });
  if (hasHacsIdentifier) return true;

  // 2. Manufacturer check: "HACS"
  const mfg = (dev.manufacturer || '').toLowerCase().trim();
  const model = (dev.model || '').toLowerCase().trim();
  if (mfg === 'hacs' && model !== 'hacs') {
    return true;
  }
  if (model === 'integration') {
    return true;
  }

  return false;
}

export function extractHacsDomain(dev: HADevice): string {
  // 1. From identifiers
  for (const ident of (dev.identifiers || [])) {
    if (Array.isArray(ident) && String(ident[0]).toLowerCase() === 'hacs') {
      const val = String(ident[1]).toLowerCase().trim();
      if (val && !/^\d+$/.test(val) && !val.includes('/') && val !== 'hacs') {
        return val;
      }
      if (val.includes('/')) {
        const repo = val.split('/')[1]?.trim();
        if (repo) {
          return repo.replace(/^ha-/, '').replace(/^hass-/, '').replace(/^home-assistant-/, '').replace(/-ha$/, '').replace(/-/g, '_');
        }
      }
    }
  }

  // 2. From configuration_url
  if (dev.configuration_url) {
    try {
      const parts = dev.configuration_url.replace(/\/$/, '').split('/');
      const repoName = parts[parts.length - 1]?.toLowerCase() || '';
      const cleaned = repoName
        .replace(/^ha-/, '')
        .replace(/^hass-/, '')
        .replace(/^home-assistant-/, '')
        .replace(/-ha$/, '')
        .replace(/-/g, '_');
      if (cleaned && cleaned !== 'hacs') {
        return cleaned;
      }
    } catch {
      // ignore
    }
  }

  // 3. From dev.name
  const rawName = (dev.name || dev.name_by_user || '').toLowerCase().trim();
  const slug = rawName
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '_');

  if (slug.includes('eufy')) return 'eufy_security';
  if (slug.includes('thermal_comfort')) return 'thermal_comfort';
  if (slug.includes('browser_mod')) return 'browser_mod';
  if (slug.includes('dreame')) return 'dreame';
  if (slug.includes('grocy')) return 'grocy';
  if (slug.includes('sonoff')) return 'sonoff';
  if (slug.includes('adaptive_lighting')) return 'adaptive_lighting';
  if (slug.includes('spook')) return 'spook';

  return slug || 'custom_integration';
}

class IntegrationsService {
  private liveConfigEntries: any[] = [];
  private liveHacsRepos: any[] = [];
  private liveAddons: any[] = [];
  private hasQueriedLive = false;

  /**
   * Attempt to query live Home Assistant WebSocket endpoints for config entries,
   * HACS repositories, and Supervisor add-ons.
   */
  public async fetchLiveIntegrationData(): Promise<void> {
    if (haWebSocketService.isDemo()) {
      return;
    }

    try {
      // 1. Fetch live config entries
      const entries = await haWebSocketService.sendRequest<any[]>('config_entries/get').catch(() => []);
      if (Array.isArray(entries) && entries.length > 0) {
        this.liveConfigEntries = entries;
      }

      // 2. Fetch live HACS repositories if HACS is installed
      const hacs = await haWebSocketService.sendRequest<any[]>('hacs/repositories').catch(() => []);
      if (Array.isArray(hacs) && hacs.length > 0) {
        this.liveHacsRepos = hacs;
      }

      // 3. Fetch supervisor add-ons if available
      const addons = await haWebSocketService.sendRequest<any>('supervisor/api', {
        endpoint: '/addons',
        method: 'get'
      }).catch(() => null);
      if (addons?.data?.addons && Array.isArray(addons.data.addons)) {
        this.liveAddons = addons.data.addons;
      }

      this.hasQueriedLive = true;
    } catch {
      // Fallbacks will automatically operate through entityRegistry & deviceRegistry
    }
  }

  /**
   * Reload an integration config entry via Home Assistant WebSocket
   */
  public async reloadIntegration(entryId: string, allEntryIds?: string[]): Promise<boolean> {
    if (haWebSocketService.isDemo()) {
      return true;
    }
    try {
      const idsToReload = (allEntryIds && allEntryIds.length > 0) ? allEntryIds : [entryId];
      await Promise.all(
        idsToReload.map(id => 
          haWebSocketService.sendRequest('config_entries/reload', { entry_id: id }).catch(() => null)
        )
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Trigger an update install for a component with a linked update entity
   */
  public async installUpdate(updateEntityId: string): Promise<boolean> {
    if (haWebSocketService.isDemo()) {
      return true;
    }
    try {
      await haWebSocketService.sendRequest('call_service', {
        domain: 'update',
        service: 'install',
        service_data: { entity_id: updateEntityId }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Construct the unified list of Integrations, HACS components, and Add-ons.
   * Groups all configuration entries and entities by integration domain.
   */
  public getIntegrations(
    entityRegistry: HAEntityRegistryEntry[],
    devices: HADevice[],
    states: Record<string, HAState>,
    rawAreas: { area_id: string; name: string }[]
  ): IntegrationItem[] {
    const isDemo = haWebSocketService.isDemo();

    // Map areas for friendly display
    const areasMap: Record<string, string> = {};
    (rawAreas || []).forEach(a => {
      areasMap[a.area_id] = a.name;
    });

    // 0. Identify helper config entries to exclude them completely
    const helperConfigEntryIds = new Set<string>();
    const configEntriesByDomain: Record<string, any[]> = {};

    if (this.liveConfigEntries.length > 0) {
      this.liveConfigEntries.forEach(entry => {
        const domain = (entry.domain || '').toLowerCase().trim();
        if (isHelper(domain, entry.source)) {
          if (entry.entry_id) helperConfigEntryIds.add(entry.entry_id);
          return;
        }
        if (!configEntriesByDomain[domain]) {
          configEntriesByDomain[domain] = [];
        }
        configEntriesByDomain[domain].push(entry);
      });
    }

    // 1. Group entities by platform / integration domain, omitting helpers
    const entitiesByPlatform: Record<string, HAEntityRegistryEntry[]> = {};
    const entitiesByEntryId: Record<string, HAEntityRegistryEntry[]> = {};

    entityRegistry.forEach(entry => {
      // Exclude entities generated by helper config entries or helper platforms
      if (entry.config_entry_id && helperConfigEntryIds.has(entry.config_entry_id)) {
        return;
      }
      const p = (entry.platform || '').toLowerCase().trim();
      if (isHelper(p)) {
        return;
      }

      if (p) {
        if (!entitiesByPlatform[p]) entitiesByPlatform[p] = [];
        entitiesByPlatform[p].push(entry);
      }
      if (entry.config_entry_id) {
        if (!entitiesByEntryId[entry.config_entry_id]) entitiesByEntryId[entry.config_entry_id] = [];
        entitiesByEntryId[entry.config_entry_id].push(entry);
      }
    });

    // 2. Group devices by config entry and domain identifiers
    const devicesByEntryId: Record<string, HADevice[]> = {};
    const devicesByDomain: Record<string, HADevice[]> = {};
    const hacsConfigEntry = this.liveConfigEntries.find(e => (e.domain || '').toLowerCase() === 'hacs');
    const hacsEntryId = hacsConfigEntry?.entry_id;

    devices.forEach(dev => {
      const isHacsItem = isHacsIntegrationDevice(dev);

      (dev.config_entries || []).forEach(cid => {
        // Do not attach downloaded HACS integration devices to the HACS store config entry!
        if (isHacsItem && hacsEntryId && cid === hacsEntryId) {
          return;
        }
        if (!devicesByEntryId[cid]) devicesByEntryId[cid] = [];
        devicesByEntryId[cid].push(dev);
      });

      // Also check identifiers (e.g. [["hue", "00:17:88:..."]])
      (dev.identifiers || []).forEach(ident => {
        if (Array.isArray(ident) && ident.length >= 2) {
          const dom = String(ident[0]).toLowerCase();
          // Do not attach downloaded HACS integration devices to the 'hacs' domain!
          if (dom === 'hacs' && isHacsItem) {
            return;
          }
          if (!devicesByDomain[dom]) devicesByDomain[dom] = [];
          if (!devicesByDomain[dom].some(d => d.id === dev.id)) {
            devicesByDomain[dom].push(dev);
          }
        }
      });
    });

    // 3. Scan for update entities (e.g. update.zigbee2mqtt_update, update.home_assistant_core_update)
    const updateEntities = Object.values(states).filter(s => s.entity_id?.startsWith('update.'));
    const updatesBySlugOrDomain: Record<string, HAState> = {};
    updateEntities.forEach(u => {
      const eid = u.entity_id.replace(/^update\./, '').replace(/_update$/, '');
      updatesBySlugOrDomain[eid] = u;
      const title = (u.attributes?.title || u.attributes?.friendly_name || '').toLowerCase();
      if (title) updatesBySlugOrDomain[title] = u;
    });

    const itemsMap: Map<string, IntegrationItem> = new Map();

    // -------------------------------------------------------------
    // A. Add Config Entries / Official Integrations GROUPED BY DOMAIN
    // -------------------------------------------------------------
    Object.entries(configEntriesByDomain).forEach(([domain, entries]) => {
      const friendlyName = formatIntegrationName(domain, entries[0]?.title);
      const meta: KnownIntegrationMeta = KNOWN_INTEGRATIONS_META[domain] || {
        name: friendlyName,
        category: 'official',
        description: `Connected Home Assistant integration for ${friendlyName}.`,
        iotClass: 'local_polling',
        documentationUrl: `https://www.home-assistant.io/integrations/${domain}`,
        authors: ['Home Assistant'],
        isCustom: false
      };

      // Collect all entities across all config entries for this domain
      const allRegEntriesForDomain: HAEntityRegistryEntry[] = [];
      const seenEntityIds = new Set<string>();

      entries.forEach(entry => {
        const byEntry = entitiesByEntryId[entry.entry_id] || [];
        byEntry.forEach(e => {
          if (!seenEntityIds.has(e.entity_id)) {
            seenEntityIds.add(e.entity_id);
            allRegEntriesForDomain.push(e);
          }
        });
      });

      // Also include any entities registered directly with this platform
      const byPlatform = entitiesByPlatform[domain] || [];
      byPlatform.forEach(e => {
        if (!seenEntityIds.has(e.entity_id)) {
          seenEntityIds.add(e.entity_id);
          allRegEntriesForDomain.push(e);
        }
      });

      const entryEntities: ResolvedEntity[] = allRegEntriesForDomain.map(e =>
        toResolvedEntity(
          e.entity_id,
          e.name || states[e.entity_id]?.attributes?.friendly_name || e.entity_id,
          states[e.entity_id]?.state || 'unknown',
          states[e.entity_id]?.attributes || {},
          e.area_id || undefined,
          e.device_id || undefined,
          states[e.entity_id]?.attributes?.icon
        )
      );

      // Collect all devices across all config entries for this domain
      const allDevicesForDomain: HADevice[] = [];
      const seenDeviceIds = new Set<string>();

      entries.forEach(entry => {
        const devs = devicesByEntryId[entry.entry_id] || [];
        devs.forEach(d => {
          if (!seenDeviceIds.has(d.id)) {
            seenDeviceIds.add(d.id);
            allDevicesForDomain.push(d);
          }
        });
      });

      // Include devices linked by domain identifiers
      const byDomainDevs = devicesByDomain[domain] || [];
      byDomainDevs.forEach(d => {
        if (!seenDeviceIds.has(d.id)) {
          seenDeviceIds.add(d.id);
          allDevicesForDomain.push(d);
        }
      });

      // Include devices referenced by entities of this integration
      allRegEntriesForDomain.forEach(e => {
        if (e.device_id && !seenDeviceIds.has(e.device_id)) {
          const dev = devices.find(d => d.id === e.device_id);
          if (dev) {
            seenDeviceIds.add(dev.id);
            allDevicesForDomain.push(dev);
          }
        }
      });

      // Aggregate state across all entries
      let st: IntegrationState = 'loaded';
      if (entries.some(e => e.state === 'setup_error' || e.state === 'setup_retry')) {
        st = 'setup_error';
      } else if (entries.every(e => Boolean(e.disabled_by))) {
        st = 'disabled';
      } else if (entries.every(e => e.state === 'not_loaded')) {
        st = 'not_loaded';
      }

      const updateEntity = updatesBySlugOrDomain[domain];
      const hasUpdate = updateEntity?.state === 'on';

      const breakdown: Record<string, number> = {};
      entryEntities.forEach(e => {
        breakdown[e.domain] = (breakdown[e.domain] || 0) + 1;
      });

      itemsMap.set(domain, {
        id: `integration_${domain}`,
        name: friendlyName,
        domain,
        category: meta.category,
        state: st,
        iconDomain: domain,
        version: updateEntity?.attributes?.installed_version,
        latestVersion: updateEntity?.attributes?.latest_version,
        hasUpdate,
        updateEntityId: updateEntity?.entity_id,
        releaseUrl: updateEntity?.attributes?.release_url,
        releaseSummary: updateEntity?.attributes?.release_summary,
        description: meta.description,
        documentationUrl: meta.documentationUrl,
        iotClass: meta.iotClass,
        source: entries[0]?.source,
        configEntryId: entries[0]?.entry_id,
        configEntryIds: entries.map(e => e.entry_id),
        entriesCount: entries.length,
        devicesCount: allDevicesForDomain.length,
        entitiesCount: entryEntities.length,
        domainBreakdown: breakdown,
        devices: allDevicesForDomain,
        entities: entryEntities,
        isCustom: meta.isCustom,
        disabledBy: entries.find(e => e.disabled_by)?.disabled_by
      });
    });

    // -------------------------------------------------------------
    // B. If no live config entries or for demo/offline richness,
    // discover from entityRegistry platforms
    // -------------------------------------------------------------
    const platformsDiscovered = Object.keys(entitiesByPlatform);
    platformsDiscovered.forEach(platform => {
      if (isHelper(platform)) return;
      if (itemsMap.has(platform)) return;

      const friendlyName = formatIntegrationName(platform);
      const meta: KnownIntegrationMeta = KNOWN_INTEGRATIONS_META[platform] || {
        name: friendlyName,
        category: 'official',
        description: `Home Assistant integration providing connected ${friendlyName} entities and telemetry.`,
        iotClass: 'local_polling',
        documentationUrl: `https://www.home-assistant.io/integrations/${platform}`,
        authors: ['Home Assistant'],
        isCustom: false
      };

      const matchedRegEntries = entitiesByPlatform[platform] || [];
      const platformEntities: ResolvedEntity[] = matchedRegEntries.map(e =>
        toResolvedEntity(
          e.entity_id,
          e.name || states[e.entity_id]?.attributes?.friendly_name || e.entity_id,
          states[e.entity_id]?.state || 'unknown',
          states[e.entity_id]?.attributes || {},
          e.area_id || undefined,
          e.device_id || undefined,
          states[e.entity_id]?.attributes?.icon
        )
      );

      // Correlate devices
      const deviceIds = new Set(matchedRegEntries.map(e => e.device_id).filter(Boolean));
      const platformDevices = devices.filter(d => deviceIds.has(d.id) || (devicesByDomain[platform] || []).some(pd => pd.id === d.id));

      const breakdown: Record<string, number> = {};
      platformEntities.forEach(e => {
        breakdown[e.domain] = (breakdown[e.domain] || 0) + 1;
      });

      const updateEntity = updatesBySlugOrDomain[platform];
      const hasUpdate = updateEntity?.state === 'on';

      itemsMap.set(platform, {
        id: `integration_${platform}`,
        name: friendlyName,
        domain: platform,
        category: meta.category,
        state: 'loaded',
        iconDomain: platform,
        version: updateEntity?.attributes?.installed_version || (isDemo ? '1.8.4' : undefined),
        latestVersion: updateEntity?.attributes?.latest_version,
        hasUpdate,
        updateEntityId: updateEntity?.entity_id,
        releaseUrl: updateEntity?.attributes?.release_url,
        releaseSummary: updateEntity?.attributes?.release_summary,
        description: meta.description,
        documentationUrl: meta.documentationUrl,
        iotClass: meta.iotClass,
        devicesCount: platformDevices.length,
        entitiesCount: platformEntities.length,
        domainBreakdown: breakdown,
        devices: platformDevices,
        entities: platformEntities,
        isCustom: meta.isCustom
      });
    });

    // -------------------------------------------------------------
    // C. HACS Custom Integrations (Show each downloaded integration in the Component table)
    // -------------------------------------------------------------
    const hacsDevices = devices.filter(d => isHacsIntegrationDevice(d));
    hacsDevices.forEach(dev => {
      // Exclude Lovelace themes and frontend plugins
      const model = (dev.model || '').toLowerCase().trim();
      if (model && ['plugin', 'theme', 'python_script', 'appdaemon'].includes(model)) {
        return;
      }

      const domain = extractHacsDomain(dev);
      if (isHelper(domain)) return;

      const friendlyName = formatIntegrationName(domain, dev.name || dev.name_by_user);

      // Find matching update entity
      const updateEntity = 
        updatesBySlugOrDomain[domain] || 
        updatesBySlugOrDomain[domain.replace(/_/g, '')] ||
        updatesBySlugOrDomain[(dev.name || '').toLowerCase()] ||
        Object.values(states).find(s => 
          s.entity_id?.startsWith('update.') && 
          (s.attributes?.title?.toLowerCase() === (dev.name || '').toLowerCase() ||
           s.entity_id.includes(domain))
        );

      const hasUpdate = updateEntity?.state === 'on';

      // Find any entities associated with this HACS integration
      const matchedEntities: ResolvedEntity[] = [];
      const seenEntityIds = new Set<string>();

      entityRegistry.forEach(entry => {
        if (entry.device_id === dev.id || (entry.platform || '').toLowerCase() === domain) {
          if (!seenEntityIds.has(entry.entity_id)) {
            seenEntityIds.add(entry.entity_id);
            matchedEntities.push(
              toResolvedEntity(
                entry.entity_id,
                entry.name || states[entry.entity_id]?.attributes?.friendly_name || entry.entity_id,
                states[entry.entity_id]?.state || 'unknown',
                states[entry.entity_id]?.attributes || {},
                entry.area_id || dev.area_id || undefined,
                entry.device_id || dev.id,
                states[entry.entity_id]?.attributes?.icon
              )
            );
          }
        }
      });

      // Find any actual child devices (excluding the HACS integration device itself)
      const linkedDevices: HADevice[] = (devicesByDomain[domain] || []).filter(d => d.id !== dev.id);

      const meta: KnownIntegrationMeta = KNOWN_INTEGRATIONS_META[domain] || {
        name: friendlyName,
        category: 'hacs',
        description: `Custom community integration for ${friendlyName} installed via HACS.`,
        iotClass: 'local_push',
        documentationUrl: dev.configuration_url || `https://github.com`,
        authors: dev.manufacturer && dev.manufacturer !== 'HACS' ? [dev.manufacturer] : [],
        isCustom: true
      };

      const breakdown: Record<string, number> = {};
      matchedEntities.forEach(e => {
        breakdown[e.domain] = (breakdown[e.domain] || 0) + 1;
      });

      const existing = itemsMap.get(domain);
      if (existing) {
        existing.category = 'hacs';
        existing.isCustom = true;
        existing.name = friendlyName;
        existing.version = dev.sw_version || existing.version;
        if (updateEntity) {
          existing.latestVersion = updateEntity.attributes?.latest_version || existing.latestVersion;
          existing.hasUpdate = hasUpdate;
          existing.updateEntityId = updateEntity.entity_id;
          existing.releaseUrl = updateEntity.attributes?.release_url;
          existing.releaseSummary = updateEntity.attributes?.release_summary;
        }
        if (dev.configuration_url) {
          existing.documentationUrl = dev.configuration_url;
        }
        matchedEntities.forEach(e => {
          if (!existing.entities.some(ee => ee.entity_id === e.entity_id)) {
            existing.entities.push(e);
          }
        });
        existing.entitiesCount = existing.entities.length;
      } else {
        itemsMap.set(domain, {
          id: `hacs_${domain}`,
          name: friendlyName,
          domain,
          category: 'hacs',
          state: 'loaded',
          iconDomain: domain,
          version: dev.sw_version || updateEntity?.attributes?.installed_version,
          latestVersion: updateEntity?.attributes?.latest_version,
          hasUpdate,
          updateEntityId: updateEntity?.entity_id,
          releaseUrl: updateEntity?.attributes?.release_url,
          releaseSummary: updateEntity?.attributes?.release_summary,
          description: meta.description,
          documentationUrl: dev.configuration_url || meta.documentationUrl,
          iotClass: meta.iotClass,
          authors: meta.authors,
          devicesCount: linkedDevices.length,
          entitiesCount: matchedEntities.length,
          domainBreakdown: breakdown,
          devices: linkedDevices,
          entities: matchedEntities,
          isCustom: true
        });
      }
    });

    // Also process liveHacsRepos if available from WebSocket
    if (this.liveHacsRepos.length > 0) {
      this.liveHacsRepos.forEach(repo => {
        if (!repo.installed && !repo.downloaded) return;
        if (repo.category && repo.category !== 'integration') return;

        const dom = (repo.domain || repo.id || '').toLowerCase();
        if (isHelper(dom)) return;

        const friendlyName = formatIntegrationName(dom, repo.name);
        const existing = itemsMap.get(dom);
        if (existing) {
          existing.name = friendlyName;
          existing.category = 'hacs';
          existing.isCustom = true;
          existing.authors = repo.authors || existing.authors;
          existing.version = repo.installed_version || existing.version;
          existing.latestVersion = repo.available_version || existing.latestVersion;
          existing.hasUpdate = Boolean(repo.available_version && repo.installed_version && repo.available_version !== repo.installed_version);
          return;
        }

        const meta: KnownIntegrationMeta = KNOWN_INTEGRATIONS_META[dom] || {
          name: friendlyName,
          category: 'hacs',
          description: repo.description || `Community integration for ${friendlyName} downloaded via HACS.`,
          iotClass: 'local_polling',
          documentationUrl: repo.documentation || `https://github.com/${repo.full_name}`,
          authors: repo.authors || [],
          isCustom: true
        };

        const matchedEntities = (entitiesByPlatform[dom] || []).map(e =>
          toResolvedEntity(
            e.entity_id,
            e.name || states[e.entity_id]?.attributes?.friendly_name || e.entity_id,
            states[e.entity_id]?.state || 'unknown',
            states[e.entity_id]?.attributes || {},
            e.area_id || undefined,
            e.device_id || undefined,
            states[e.entity_id]?.attributes?.icon
          )
        );

        itemsMap.set(dom, {
          id: `integration_${dom}`,
          name: friendlyName,
          domain: dom,
          category: 'hacs',
          state: 'loaded',
          iconDomain: dom,
          version: repo.installed_version,
          latestVersion: repo.available_version,
          hasUpdate: Boolean(repo.available_version && repo.installed_version && repo.available_version !== repo.installed_version),
          description: repo.description || meta.description,
          documentationUrl: repo.documentation || `https://github.com/${repo.full_name}`,
          iotClass: meta.iotClass,
          authors: repo.authors || meta.authors,
          devicesCount: (devicesByDomain[dom] || []).length,
          entitiesCount: matchedEntities.length,
          domainBreakdown: {},
          devices: devicesByDomain[dom] || [],
          entities: matchedEntities,
          isCustom: true
        });
      });
    } else if (isDemo) {
      // Only include downloaded and installed HACS custom integrations
      const demoHacsKeys = ['grocy', 'dreame'];
      demoHacsKeys.forEach(hKey => {
        if (itemsMap.has(hKey)) return;
        const meta = KNOWN_INTEGRATIONS_META[hKey];
        if (!meta) return;

        const friendlyName = formatIntegrationName(hKey, meta.name);
        const matchedEntities = (entitiesByPlatform[hKey] || []).map(e =>
          toResolvedEntity(
            e.entity_id,
            e.name || states[e.entity_id]?.attributes?.friendly_name || e.entity_id,
            states[e.entity_id]?.state || 'unknown',
            states[e.entity_id]?.attributes || {},
            e.area_id || undefined,
            e.device_id || undefined,
            states[e.entity_id]?.attributes?.icon
          )
        );

        itemsMap.set(hKey, {
          id: `integration_${hKey}`,
          name: friendlyName,
          domain: hKey,
          category: 'hacs',
          state: 'loaded',
          iconDomain: hKey,
          version: 'v3.4.1',
          latestVersion: hKey === 'grocy' ? 'v3.5.0' : 'v3.4.1',
          hasUpdate: hKey === 'grocy',
          description: meta.description,
          documentationUrl: meta.documentationUrl,
          iotClass: meta.iotClass,
          authors: meta.authors,
          devicesCount: (devicesByDomain[hKey] || []).length,
          entitiesCount: matchedEntities.length,
          domainBreakdown: {},
          devices: devicesByDomain[hKey] || [],
          entities: matchedEntities,
          isCustom: true
        });
      });
    }

    // -------------------------------------------------------------
    // D. Supervisor Add-ons & Apps (Only installed add-ons)
    // -------------------------------------------------------------
    if (this.liveAddons.length > 0) {
      this.liveAddons.forEach(addon => {
        if (!addon.installed) return;

        const slug = (addon.slug || '').toLowerCase();
        const friendlyName = formatIntegrationName(slug, addon.name);
        const meta: KnownIntegrationMeta = KNOWN_INTEGRATIONS_META[slug] || {
          name: friendlyName,
          category: 'addon',
          description: addon.description || `Home Assistant Supervisor application add-on for ${friendlyName}.`,
          iotClass: 'local_push',
          documentationUrl: addon.url,
          authors: [],
          isCustom: false
        };

        const updateEntity = updatesBySlugOrDomain[slug];
        const hasUpdate = addon.update_available || updateEntity?.state === 'on';

        itemsMap.set(slug, {
          id: `addon_${slug}`,
          name: friendlyName,
          domain: slug,
          category: 'addon',
          state: addon.state === 'started' ? 'running' : 'stopped',
          iconDomain: slug,
          version: addon.version,
          latestVersion: addon.version_latest,
          hasUpdate,
          updateEntityId: updateEntity?.entity_id,
          releaseUrl: updateEntity?.attributes?.release_url,
          releaseSummary: updateEntity?.attributes?.release_summary,
          description: addon.description || meta.description,
          documentationUrl: meta.documentationUrl || addon.url,
          iotClass: meta.iotClass,
          devicesCount: (devicesByDomain[slug] || []).length,
          entitiesCount: (entitiesByPlatform[slug] || []).length,
          domainBreakdown: {},
          devices: devicesByDomain[slug] || [],
          entities: (entitiesByPlatform[slug] || []).map(e =>
            toResolvedEntity(
              e.entity_id,
              e.name || e.entity_id,
              states[e.entity_id]?.state || 'unknown',
              {},
              e.area_id || undefined,
              e.device_id || undefined
            )
          )
        });
      });
    } else {
      // Demo installed add-ons
      const knownAddons = ['zigbee2mqtt', 'mosquitto', 'studio_code_server'];
      knownAddons.forEach(slug => {
        const meta = KNOWN_INTEGRATIONS_META[slug];
        if (!meta) return;

        const friendlyName = formatIntegrationName(slug, meta.name);
        const updateEntity = updatesBySlugOrDomain[slug];
        const hasUpdate = updateEntity?.state === 'on' || (isDemo && slug === 'zigbee2mqtt');

        const linkedDevices = devicesByDomain[slug] || [];
        const linkedEntities = (entitiesByPlatform[slug] || []).map(e =>
          toResolvedEntity(
            e.entity_id,
            e.name || states[e.entity_id]?.attributes?.friendly_name || e.entity_id,
            states[e.entity_id]?.state || 'unknown',
            states[e.entity_id]?.attributes || {},
            e.area_id || undefined,
            e.device_id || undefined,
            states[e.entity_id]?.attributes?.icon
          )
        );

        itemsMap.set(slug, {
          id: `addon_${slug}`,
          name: friendlyName,
          domain: slug,
          category: 'addon',
          state: 'running',
          iconDomain: slug,
          version: updateEntity?.attributes?.installed_version || (slug === 'zigbee2mqtt' ? '1.40.1' : '2.0.18'),
          latestVersion: updateEntity?.attributes?.latest_version || (hasUpdate ? '1.41.0' : undefined),
          hasUpdate,
          updateEntityId: updateEntity?.entity_id,
          releaseUrl: updateEntity?.attributes?.release_url,
          releaseSummary: updateEntity?.attributes?.release_summary,
          description: meta.description,
          documentationUrl: meta.documentationUrl,
          iotClass: meta.iotClass,
          authors: meta.authors,
          devicesCount: linkedDevices.length || (slug === 'zigbee2mqtt' ? 14 : 1),
          entitiesCount: linkedEntities.length || (slug === 'zigbee2mqtt' ? 28 : 2),
          domainBreakdown: slug === 'zigbee2mqtt' ? { sensor: 16, switch: 8, light: 4 } : {},
          devices: linkedDevices,
          entities: linkedEntities
        });
      });
    }

    // Convert map to sorted list and guarantee helper exclusion
    return Array.from(itemsMap.values())
      .filter(item => !isHelper(item.domain, item.source))
      .sort((a, b) => {
        if (a.hasUpdate && !b.hasUpdate) return -1;
        if (!a.hasUpdate && b.hasUpdate) return 1;
        return a.name.localeCompare(b.name);
      });
  }
}

export const integrationsService = new IntegrationsService();
