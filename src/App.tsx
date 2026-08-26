/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Droplets, 
  Bell, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Bot, 
  Lightbulb, 
  Activity, 
  Settings, 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  Power, 
  Zap, 
  Info, 
  ChevronRight, 
  Workflow, 
  Coffee, 
  BedDouble, 
  Sofa, 
  Cookie,
  ArrowUpDown,
  Battery,
  BatteryLow,
  HeartPulse,
  Wrench,
  GripHorizontal,
  Move,
  Network,
  Cpu,
  Layers
} from 'lucide-react';

import { HAEntity, Room, LogMessage, ToastNotification, MaintenanceTask, MaintenanceLogEntry } from './types';
import { INITIAL_ENTITIES, INITIAL_ROOMS, SCENES, INITIAL_MAINTENANCE_TASKS, INITIAL_MAINTENANCE_LOGS } from './data';
import { useAutoLayoutStore } from './store/useAutoLayoutStore';
import { resolvedEntityToHAEntity } from './services/graphResolution';
import GraphResolutionModal from './components/GraphResolutionModal';
import Sidebar from './components/Sidebar';
import CameraFeedCard from './components/CameraFeedCard';
import RoomCard from './components/RoomCard';
import WebSocketTerminal from './components/WebSocketTerminal';
import SettingsView from './components/SettingsView';
import NotificationToast from './components/NotificationToast';
import RoomDetailSection from './components/RoomDetailSection';
import EnergyAnalyticsView from './components/EnergyAnalyticsView';
import DailyInsightsWidget from './components/DailyInsightsWidget';
import BatteryStatusCard from './components/BatteryStatusCard';
import DeviceHealthView from './components/DeviceHealthView';
import WeatherWidget from './components/WeatherWidget';

// 8 Core Navigation Views
import RoomsView from './components/RoomsView';
import AutomationsView, { AutomationItem } from './components/AutomationsView';
import SecurityView from './components/SecurityView';
import MediaView from './components/MediaView';
import SystemView from './components/SystemView';

export default function App() {
  // Master React State
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('living_room');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [showGraphModal, setShowGraphModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // HAPulse Auto-Layout Graph Resolution Store
  const {
    init: initAutoLayout,
    resolvedAreas,
    resolvedEntities,
    metrics,
    isLiveMode,
    connectionStatus,
    updateEntityState: updateStoreEntityState
  } = useAutoLayoutStore();

  useEffect(() => {
    initAutoLayout();
  }, [initAutoLayout]);

  // Derive dynamic entities from auto-layout store (falling back to INITIAL_ENTITIES if empty)
  const entities = useMemo<HAEntity[]>(() => {
    const list = Object.values(resolvedEntities);
    if (list.length === 0) return INITIAL_ENTITIES;
    return list.map(resolvedEntityToHAEntity);
  }, [resolvedEntities]);

  // Derive dynamic rooms from auto-layout store (falling back to INITIAL_ROOMS if empty)
  const [customRoomOrder, setCustomRoomOrder] = useState<string[] | null>(null);

  const baseRooms = useMemo<Room[]>(() => {
    if (resolvedAreas.length === 0) return INITIAL_ROOMS;
    return resolvedAreas.map(ra => {
      let icon = 'Sofa';
      if (ra.area_id.includes('bed')) icon = 'BedDouble';
      else if (ra.area_id.includes('kitchen') || ra.area_id.includes('cook')) icon = 'Cookie';
      else if (ra.area_id.includes('bath')) icon = 'Bath';
      else if (ra.area_id.includes('hall') || ra.area_id.includes('door') || ra.area_id.includes('entrance')) icon = 'KeyRound';
      else if (ra.area_id.includes('media') || ra.area_id.includes('cinema')) icon = 'Tv';

      return {
        id: ra.area_id,
        name: ra.name,
        icon,
        temperature: ra.summary?.currentTempAvg || 21.5,
        humidity: ra.summary?.currentHumidityAvg || 45,
        devicesCount: ra.summary?.totalEntities || ra.entities.length,
        entityIds: ra.entities.map(e => e.entity_id),
        bannerImage: ra.bannerImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop'
      };
    });
  }, [resolvedAreas]);

  const rooms = useMemo<Room[]>(() => {
    if (!customRoomOrder) return baseRooms;
    const map = new Map<string, Room>(baseRooms.map(r => [r.id, r]));
    const ordered: Room[] = [];
    for (const id of customRoomOrder) {
      const found = map.get(id);
      if (found) {
        ordered.push(found);
        map.delete(id);
      }
    }
    for (const remaining of map.values()) {
      ordered.push(remaining);
    }
    return ordered;
  }, [baseRooms, customRoomOrder]);

  const setRooms = (action: React.SetStateAction<Room[]>) => {
    const next = typeof action === 'function' ? action(rooms) : action;
    setCustomRoomOrder(next.map(r => r.id));
  };

  const handleSetEntities: React.Dispatch<React.SetStateAction<HAEntity[]>> = (action) => {
    const next = typeof action === 'function' ? action(entities) : action;
    next.forEach(e => {
      updateStoreEntityState(e.entity_id, e.state, e.attributes);
    });
  };
  
  // Device Maintenance state
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(INITIAL_MAINTENANCE_TASKS);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLogEntry[]>(INITIAL_MAINTENANCE_LOGS);
  const [logs, setLogs] = useState<LogMessage[]>([
    { 
      id: 'init-1', 
      timestamp: '11:08:02', 
      type: 'info', 
      message: 'Established WebSocket Secure connection to HASS node at wss://hass.homz.internal/api/websocket...' 
    },
    { 
      id: 'init-2', 
      timestamp: '11:08:03', 
      type: 'info', 
      message: 'WebSocket API authorization accepted. Session validated.' 
    },
    { 
      id: 'init-3', 
      timestamp: '11:08:03', 
      type: 'state_changed', 
      message: 'Subscribed to Hass Event Stream. Synced state variables with backend database.',
      details: { loaded_entities: 11, host: 'Local server', ssl: 'Enabled' } 
    }
  ]);

  useEffect(() => {
    const handleHaLog = (e: any) => {
      if (e.detail) {
        addLog(e.detail.type || 'info', e.detail.msg, e.detail.details);
      }
    };
    window.addEventListener('ha_log_message', handleHaLog);
    return () => window.removeEventListener('ha_log_message', handleHaLog);
  }, []);

  // Global smart home mode preset (Relax is active by default in mock scene)
  const [activePreset, setActivePreset] = useState<string>('relax');

  // Rooms environment matrix sorting state
  const [roomSortOption, setRoomSortOption] = useState<'default' | 'active_devices' | 'energy_consumption'>('default');
  const [roomSortDirection, setRoomSortDirection] = useState<'desc' | 'asc'>('desc');

  // Helper: Get formatted local time timestamp
  const getTimestamp = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0];
  };

  // Maintenance alert count
  const maintenanceDueCount = useMemo(() => {
    return maintenanceTasks.filter(t => t.status === 'overdue' || t.status === 'due_soon').length;
  }, [maintenanceTasks]);

  // Critical Low Battery Alert count (<15%)
  const criticalBatteryCount = useMemo(() => {
    return entities.filter(e => 
      e.entity_id !== 'sensor.home_battery' && 
      typeof e.attributes.battery === 'number' && 
      e.attributes.battery < 15
    ).length;
  }, [entities]);

  // Battery Replacement & Maintenance Handler (Reset cell to 100%)
  const handleReplaceBattery = (entityId: string) => {
    const dev = entities.find(e => e.entity_id === entityId);
    updateStoreEntityState(entityId, dev?.state || 'on', { battery: 100 });

    const devName = dev?.attributes.friendly_name || entityId;

    addToast({
      type: 'success',
      title: 'Battery Serviced',
      message: `${devName} cell replaced/recharged to 100% capacity.`
    });

    addLog('service_call', `Physical battery replacement recorded: [${devName}] restored to 100% power.`, {
      entity_id: entityId,
      new_capacity: '100%',
      state_of_health: '98%'
    });
  };

  // Quick Simulation Trigger for <15% Critical Low Battery Test
  const handleSimulateLowBattery = (entityId: string) => {
    const dev = entities.find(e => e.entity_id === entityId);
    updateStoreEntityState(entityId, dev?.state || 'on', { battery: 8 });

    const devName = dev?.attributes.friendly_name || entityId;

    addToast({
      type: 'warning',
      title: 'Critical Battery Warning',
      message: `Simulated critical battery drop on ${devName} (8% charge). Notification badges activated!`,
      duration: 6000
    });

    addLog('warning', `Telemetry Alarm: ${devName} voltage dropped below critical safety cutoff (<15% at 8%).`);
  };

  // Complete Maintenance Task Handler
  const handleCompleteMaintenanceTask = (
    taskId: string, 
    logData: { servicedBy: string; notes: string; cost?: number; replacedPart?: string }
  ) => {
    const task = maintenanceTasks.find(t => t.id === taskId);
    if (!task) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + task.intervalDays);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    // Update task
    setMaintenanceTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          lastServicedDate: todayStr,
          dueDate: nextDueDateStr,
          status: 'healthy',
          wearPercentage: 8
        };
      }
      return t;
    }));

    // Add log entry
    const newLogEntry: MaintenanceLogEntry = {
      id: `log_${Date.now()}`,
      taskId: task.id,
      entityId: task.entityId,
      deviceName: task.deviceName,
      roomName: task.roomName,
      taskTitle: task.taskTitle,
      servicedDate: todayStr,
      servicedBy: logData.servicedBy,
      notes: logData.notes,
      cost: logData.cost,
      replacedPart: logData.replacedPart
    };

    setMaintenanceLogs(prev => [newLogEntry, ...prev]);

    addToast({
      type: 'success',
      title: 'Maintenance Logged',
      message: `${task.taskTitle} successfully logged for ${task.deviceName}.`
    });

    addLog('service_call', `Device maintenance recorded: [${task.deviceName}] ${task.taskTitle}`, {
      serviced_by: logData.servicedBy,
      next_due: nextDueDateStr,
      cost: logData.cost
    });
  };

  // Add Custom Maintenance Task Handler
  const handleAddMaintenanceTask = (newTaskData: Omit<MaintenanceTask, 'id' | 'status'>) => {
    const newTask: MaintenanceTask = {
      ...newTaskData,
      id: `task_${Date.now()}`,
      status: 'healthy'
    };

    setMaintenanceTasks(prev => [newTask, ...prev]);

    addToast({
      type: 'info',
      title: 'Maintenance Scheduled',
      message: `Scheduled ${newTask.taskTitle} every ${newTask.intervalDays} days.`
    });

    addLog('info', `New maintenance schedule configured for ${newTask.deviceName}: ${newTask.taskTitle}`);
  };

  // Add New Living Space / Room Handler
  const handleAddRoom = (newRoomData: Partial<Room>) => {
    const newRoom: Room = {
      id: newRoomData.id || `room_${Date.now()}`,
      name: newRoomData.name || 'New Room',
      icon: newRoomData.icon || 'Sofa',
      temperature: newRoomData.temperature ?? 21.5,
      humidity: newRoomData.humidity ?? 45,
      devicesCount: 0,
      entityIds: newRoomData.entityIds || [],
      bannerImage: newRoomData.bannerImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=500&auto=format&fit=crop'
    };

    setRooms(prev => [...prev, newRoom]);

    addToast({
      type: 'success',
      title: 'Room Created',
      message: `${newRoom.name} added to your home spaces matrix.`
    });

    addLog('state_changed', `Registered new living zone: [${newRoom.name}] with ID '${newRoom.id}'`);
  };

  // Trigger Automation Routine Execution
  const handleTriggerAutomation = (automation: AutomationItem) => {
    addLog('service_call', `Dispatched Automation Trigger: '${automation.name}'`, {
      automation_id: automation.id,
      category: automation.category,
      target_entity: automation.action.entityId,
      target_state: automation.action.targetState
    });

    // Execute target state update on entity
    updateEntityState(automation.action.entityId, automation.action.targetState);

    addToast({
      type: 'scene',
      title: 'Automation Fired',
      message: `${automation.name} successfully executed.`
    });
  };

  // Security Panic Button Trigger Handler
  const handlePanicTrigger = () => {
    addLog('warning', 'SECURITY EMERGENCY: Manual Panic Alarm activated from security console!', {
      siren_db: 110,
      strobe_lights: 'Active',
      monitoring_dispatched: true
    });

    addToast({
      type: 'warning',
      title: 'SECURITY ALARM TRIGGERED',
      message: 'Perimeter sirens sounding and emergency contacts alerted.',
      duration: 8000
    });

    // Flash lights & lock doors
    handleSetEntities(prev => prev.map(ent => {
      if (ent.entity_id === 'lock.front_door') {
        return { ...ent, state: 'locked' };
      }
      if (ent.entity_id.startsWith('light.')) {
        return { ...ent, state: 'on', attributes: { ...ent.attributes, brightness: 100, color: '#ef4444' } };
      }
      return ent;
    }));
  };

  // System Core Management Handlers
  const handleRestartCore = () => {
    addLog('service_call', 'Initiating Home Assistant Core soft restart daemon...');
    addToast({
      type: 'info',
      title: 'Restarting Core',
      message: 'Home Assistant Core service restarting in background...'
    });
    setTimeout(() => {
      addLog('info', 'Home Assistant Core restarted successfully (took 1.4s). All integrations warm.');
      addToast({
        type: 'success',
        title: 'Core Online',
        message: 'Home Assistant Core reboot complete.'
      });
    }, 1500);
  };

  const handleReloadYAML = () => {
    addLog('service_call', 'Reloading YAML configuration blueprints and scripts...');
    addToast({
      type: 'info',
      title: 'YAML Reloaded',
      message: 'Configuration schemes updated without restarting node.'
    });
  };

  const handleCreateBackup = () => {
    const backupId = `backup_${new Date().toISOString().split('T')[0]}_${Math.random().toString(36).substr(2, 4)}`;
    addLog('service_call', `Creating full snapshot archive: ${backupId}.tar.gz`);
    addToast({
      type: 'success',
      title: 'Backup Created',
      message: `Full system snapshot saved (${backupId}).`
    });
  };

  // Toast Notification Dispatcher
  const addToast = (
    toast: Omit<ToastNotification, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ) => {
    const newToast: ToastNotification = {
      id: toast.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: toast.timestamp || getTimestamp(),
      duration: toast.duration ?? 4200,
      ...toast
    };
    // Keep max 4 visible notifications so UI remains clean & non-intrusive
    setToasts(prev => [newToast, ...prev.slice(0, 3)]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Log dispatch function
  const addLog = (type: LogMessage['type'], message: string, details?: any) => {
    const newLog: LogMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: getTimestamp(),
      type,
      message,
      details
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Helper to fetch single entity state
  const getEntity = (entityId: string): HAEntity => {
    return entities.find(e => e.entity_id === entityId) || {
      entity_id: entityId,
      state: 'off',
      attributes: { friendly_name: 'Unknown Device' }
    };
  };

  // Master updateEntity function (simulating call_service on WebSocket)
  const updateEntityState = (
    entityId: string, 
    newState: string, 
    newAttributes: Record<string, any> = {}
  ) => {
    // 1. Log simulation packet info before committing changes to reflect genuine WebSocket latency and architecture
    const domain = entityId.split('.')[0];
    const service = newState === 'on' ? 'turn_on' : newState === 'off' ? 'turn_off' : `update_state`;
    
    addLog('service_call', `Dispatched API Service Call: domain '${domain}', service '${service}'`, {
      entity_id: entityId,
      requested_state: newState,
      parameters: newAttributes
    });

    // 2. Commit changes to HAPulse auto layout store
    updateStoreEntityState(entityId, newState, newAttributes);

    // 3. Log confirmation receipt
    setTimeout(() => {
      addLog('state_changed', `Socket RECV: ${entityId} attributes updated. Sync committed successfully.`, {
        entity_id: entityId,
        current_state: newState,
        attributes: newAttributes
      });
    }, 150);
  };

  // Handle Camera snapshots
  const handleCaptureSnapshot = (cameraName: string) => {
    addLog('service_call', `Triggered snapshot feed capture of '${cameraName}'`);
    addToast({
      type: 'security',
      title: 'Snapshot Captured',
      message: `Full frame archived from ${cameraName} to security vault.`
    });
    setTimeout(() => {
      addLog('state_changed', `Snapshot saved to localized vault storage with format: snapshot_${cameraName.toLowerCase().replace(/ /g, '_')}.png`, {
        frame_resolution: '1920x1080',
        size_bytes: 412580,
        tunnel_webrtc: 'Completed secure frame pull'
      });
    }, 300);
  };

  // Handle Camera Intercom communication
  const handleIntercomToggle = (cameraName: string, isMicActive: boolean) => {
    const action = isMicActive ? 'Intercom microphone broadcast ENABLED' : 'Intercom microphone broadcast MUTED';
    addLog('service_call', `${action} for camera '${cameraName}'`);
    addToast({
      type: 'security',
      title: isMicActive ? 'Intercom Active' : 'Intercom Muted',
      message: isMicActive ? `2-way live audio open to ${cameraName}.` : 'Microphone broadcast ended.'
    });
  };

  // Toggle Door lock
  const handleToggleDoorLock = () => {
    const lockEntity = getEntity('lock.front_door');
    const newState = lockEntity.state === 'locked' ? 'unlocked' : 'locked';
    updateEntityState('lock.front_door', newState);

    if (newState === 'unlocked') {
      addToast({
        type: 'lock',
        title: 'Door Unlocked',
        message: 'Front entrance smart deadbolt latch opened.'
      });
    } else {
      addToast({
        type: 'lock',
        title: 'Door Locked',
        message: 'Front entrance secured. Perimeter protection active.'
      });
    }
  };

  // Trigger quick actions inside RoomCards / Master toggle
  const handleToggleAllInRoom = (roomId: string, currentSomeActive: boolean) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const targetState = currentSomeActive ? 'off' : 'on';
    addLog('service_call', `Master room toggle triggered: powering ${targetState} all elements inside room: '${room.name}'`);

    handleSetEntities(prev => prev.map(ent => {
      if (room.entityIds.includes(ent.entity_id)) {
        // Toggle brightness as well for lights
        const extraAttr: any = {};
        if (ent.entity_id.startsWith('light.')) {
          extraAttr.brightness = targetState === 'on' ? 80 : 0;
        }
        return {
          ...ent,
          state: targetState,
          attributes: { ...ent.attributes, ...extraAttr }
        };
      }
      return ent;
    }));

    addLog('state_changed', `State changes batch broadcasted to IoT node array representing room '${room.name}'`);
    addToast({
      type: 'light',
      title: `${room.name} ${targetState === 'on' ? 'Powered On' : 'Turned Off'}`,
      message: `All ${room.entityIds.length} devices switched ${targetState}.`
    });
  };

  // Change entire home smart scenes presets
  const handleTriggerPreset = (sceneId: string) => {
    setActivePreset(sceneId);
    addLog('service_call', `Smart Scene template active triggered: '${sceneId}'`);
    
    // Modify device values depending on scene template chosen
    if (sceneId === 'morning') {
      // Turn on lighting with warm light
      handleSetEntities(prev => prev.map(ent => {
        if (ent.entity_id.startsWith('light.')) {
          return {
            ...ent,
            state: 'on',
            attributes: { ...ent.attributes, brightness: 50, color: '#fef3c7' }
          };
        }
        if (ent.entity_id === 'switch.coffee_maker') {
          return { ...ent, state: 'on' };
        }
        return ent;
      }));
      addToast({
        type: 'scene',
        title: 'Morning Routine Activated',
        message: 'Warm lighting set to 50% & coffee maker brewing.'
      });
    } else if (sceneId === 'away') {
      // Turn off everything, lock front door
      handleSetEntities(prev => prev.map(ent => {
        if (ent.entity_id.startsWith('light.')) {
          return { ...ent, state: 'off', attributes: { ...ent.attributes, brightness: 0 } };
        }
        if (ent.entity_id === 'lock.front_door') {
          return { ...ent, state: 'locked' };
        }
        if (ent.entity_id.startsWith('vacuum.')) {
          return { ...ent, state: 'on', attributes: { ...ent.attributes, mode: 'Turbo' } };
        }
        return ent;
      }));
      addToast({
        type: 'scene',
        title: 'Away Routine Activated',
        message: 'Perimeter locked, lighting off, and vacuum cycle started.'
      });
    } else if (sceneId === 'relax') {
      handleSetEntities(prev => prev.map(ent => {
        if (ent.entity_id === 'light.living_room_accent') {
          return { ...ent, state: 'on', attributes: { ...ent.attributes, brightness: 60, color: '#7B61FF' } };
        }
        if (ent.entity_id === 'light.bedroom') {
          return { ...ent, state: 'on', attributes: { ...ent.attributes, brightness: 40, color: '#fef3c7' } };
        }
        return ent;
      }));
      addToast({
        type: 'scene',
        title: 'Relax Routine Activated',
        message: 'Atmospheric purple glow and ambient climate engaged.'
      });
    } else {
      addToast({
        type: 'scene',
        title: `Scene Applied: ${sceneId.toUpperCase()}`,
        message: 'Environment parameters updated.'
      });
    }
    
    setTimeout(() => {
      addLog('state_changed', `All active environment variables transitioned to preset: '${sceneId.toUpperCase()}'`);
    }, 200);
  };

  // Custom Simulator Event dispatch handler for WebSocket console
  const handleSimulateEvent = (eventType: string) => {
    if (eventType === 'doorbell_ring') {
      addLog('warning', `HASS Event Capture: Doorbell button clicked! Broadcasting alert...`);
      addToast({
        type: 'security',
        title: 'Doorbell Ringing!',
        message: 'Front entrance doorbell pressed.',
        duration: 5500
      });
      // Temporarily set doorbell sensor state to active
      handleSetEntities(prev => prev.map(ent => {
        if (ent.entity_id === 'binary_sensor.doorbell') {
          return { ...ent, state: 'on', attributes: { ...ent.attributes, friendly_name: 'Bell is Ringing!', motion_detected: true } };
        }
        return ent;
      }));
      
      // Auto restore event state in 3 seconds
      setTimeout(() => {
        handleSetEntities(prev => prev.map(ent => {
          if (ent.entity_id === 'binary_sensor.doorbell') {
            return { ...ent, state: 'off', attributes: { ...ent.attributes, friendly_name: 'Ring Pro Doorbell', motion_detected: false } };
          }
          return ent;
        }));
        addLog('info', `Doorbell sensor state auto-restored to sleep.`);
      }, 3500);

    } else if (eventType === 'motion_detected') {
      addLog('warning', `HASS Sensor Alert: Presence motion detected in Front Corridor!`);
      addToast({
        type: 'security',
        title: 'Motion Detected',
        message: 'Infrared sensor trigger at Front Corridor.',
        duration: 5000
      });
      // Simulate snapshot
      addLog('info', `Triggering live security capture at main corridor camera zone...`);
    }
  };

  // Calculations for responsive stats
  const activeLightsCount = entities.filter(e => e.entity_id.startsWith('light.') && e.state === 'on').length;
  const activeDevicesTotal = entities.filter(e => e.state === 'on' || e.state === 'playing').length;
  
  // Dynamically calculate power sum and format as kW
  const totalPowerConsumption = entities.reduce((sum, ent) => {
    if (ent.state === 'on' || ent.state === 'playing') {
      return sum + (ent.attributes.power || 0);
    }
    return sum;
  }, 0);
  const formattedPowerStr = (totalPowerConsumption / 1000).toFixed(2); // converting to kW e.g., 1.45 kW

  // Selected Room element to inspect details in bottom-center area
  const currentSelectedRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const roomEntities = entities.filter(ent => currentSelectedRoom.entityIds.includes(ent.entity_id));

  // Dynamic sorting for Rooms environment matrix
  const sortedRooms = useMemo(() => {
    if (roomSortOption === 'default') {
      return rooms;
    }

    return [...rooms].sort((a, b) => {
      // 1. Sort by Active Devices count
      if (roomSortOption === 'active_devices') {
        const aActive = entities.filter(e => a.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing' || e.state === 'locked')).length;
        const bActive = entities.filter(e => b.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing' || e.state === 'locked')).length;
        
        const diff = bActive - aActive;
        if (diff !== 0) {
          return roomSortDirection === 'desc' ? diff : -diff;
        }
        // Secondary tiebreaker: power consumption
        const aPower = entities.filter(e => a.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing')).reduce((s, e) => s + (e.attributes.power || 0), 0);
        const bPower = entities.filter(e => b.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing')).reduce((s, e) => s + (e.attributes.power || 0), 0);
        return bPower - aPower;
      }

      // 2. Sort by Highest Energy Consumption (Watts)
      if (roomSortOption === 'energy_consumption') {
        const aPower = entities
          .filter(e => a.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing'))
          .reduce((sum, e) => sum + (Number(e.attributes.power) || 0), 0);
        
        const bPower = entities
          .filter(e => b.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing'))
          .reduce((sum, e) => sum + (Number(e.attributes.power) || 0), 0);

        const diff = bPower - aPower;
        if (diff !== 0) {
          return roomSortDirection === 'desc' ? diff : -diff;
        }
        // Secondary tiebreaker: active device count
        const aActive = entities.filter(e => a.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing')).length;
        const bActive = entities.filter(e => b.entityIds.includes(e.entity_id) && (e.state === 'on' || e.state === 'playing')).length;
        return bActive - aActive;
      }

      return 0;
    });
  }, [rooms, entities, roomSortOption, roomSortDirection]);

  return (
    <div className={`w-full h-screen min-h-screen font-sans flex flex-col md:flex-row relative overflow-hidden select-none transition-colors duration-500 ${
      darkMode 
        ? 'bg-gradient-to-tr from-[#0B0D19] via-[#0F172A] to-[#1E1B4B] text-slate-100 deep-space-stars' 
        : 'bg-gradient-to-tr from-[#C5CDDF] via-[#DDE2F0] to-[#E9EDF5] text-slate-800'
    }`}>
      
      {/* Decorative premium floating blurred gradient circles in the background */}
      {darkMode ? (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#7B61FF]/15 rounded-full blur-[140px] opacity-70 animate-pulse-slow-1 pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-900/30 rounded-full blur-[140px] opacity-80 animate-pulse-slow-2 pointer-events-none" />
        </>
      ) : (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200 rounded-full blur-[140px] opacity-60 animate-pulse-slow-1 pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-200 rounded-full blur-[140px] opacity-70 animate-pulse-slow-2 pointer-events-none" />
        </>
      )}

      {/* Main dashboard full-page containment layout - strictly locked to screen bounds without global window scrolling */}
      <div className="w-full h-full flex flex-col md:flex-row relative z-10 overflow-hidden min-h-0 max-h-screen">
        
        {/* 1. LEFT SIDEBAR - Fixed to left in desktop, bottom nav in mobile */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          showTerminal={showTerminal}
          setShowTerminal={setShowTerminal}
          activeLightsCount={activeLightsCount}
          maintenanceDueCount={maintenanceDueCount}
          criticalBatteryCount={criticalBatteryCount}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* 2. DYNAMIC CONTENT SECTION depending on left action navigation */}
        <main 
          id="main-content-area"
          className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto touch-scroll-container h-full max-w-full min-h-0 pb-28 md:pb-10 overscroll-contain"
        >
          
          {/* Header */}
          <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-8">
            <div>
              <span className={`text-[10px] font-black tracking-widest block mb-1 ${
                darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
              }`}>HOMZ SMART ENVIRONMENT</span>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {activeTab === 'home' ? 'Live apartment view' : 
                 activeTab === 'rooms' ? 'Rooms & Living Spaces' :
                 activeTab === 'devices' ? 'Device Fleet & Hardware Status' :
                 activeTab === 'automations' || activeTab === 'routines' ? 'Smart Automations & Routines' :
                 activeTab === 'energy' ? 'Microgrid & Solar Energy' :
                 activeTab === 'security' || activeTab === 'cameras' ? 'Perimeter Security & Alarm' : 
                 activeTab === 'media' || activeTab === 'music' ? 'Music & Multi-Room Audio' :
                 activeTab === 'system' ? 'Home Assistant Node & Core' :
                 activeTab === 'health' ? 'Device Health & Service History' :
                 activeTab === 'settings' ? 'Settings & System Configuration' : 'Home Assistant Dashboard'}
              </h1>
            </div>
            
            {/* Header Right Area: Grounded Weather Widget & Status Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
               {/* HAPulse Auto-Layout Graph Resolution Badge Button */}
               <button
                 id="btn-open-hapulse-graph"
                 onClick={() => setShowGraphModal(true)}
                 className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-black shadow-xs backdrop-blur-md border transition-all cursor-pointer ${
                   darkMode 
                     ? 'bg-gradient-to-r from-indigo-950/70 to-purple-950/70 hover:from-indigo-900/80 hover:to-purple-900/80 border-[#7B61FF]/40 text-[#9D8BFF]' 
                     : 'bg-gradient-to-r from-indigo-50/90 to-purple-50/90 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 text-[#7B61FF]'
                 }`}
                 title="Open HAPulse Auto-Layout Graph Inspector"
               >
                 <Network size={14} className="text-[#7B61FF]" />
                 <span className="hidden sm:inline">HAPulse Graph</span>
                 <span className="inline sm:hidden">Graph</span>
                 {metrics && (
                   <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-[#7B61FF] text-white">
                     {metrics.totalAreas} Areas
                   </span>
                 )}
               </button>

               {/* Grounded Weather Widget */}
               <WeatherWidget darkMode={darkMode} />

               {/* Clean connection badge */}
               <div className={`hidden sm:flex items-center gap-2 py-2 px-3.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md border ${
                 darkMode ? 'bg-slate-900/80 border-slate-700/80 text-slate-200' : 'bg-white/80 border-slate-100 text-slate-700'
               }`}>
                  <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{connectionStatus === 'connected' ? (isLiveMode ? 'Live HA' : 'Auto Graph') : 'Connecting...'}</span>
               </div>
               
               <div className={`hidden xl:flex items-center gap-2 py-2 px-3.5 rounded-full text-xs font-semibold shadow-sm backdrop-blur-md border ${
                 darkMode ? 'bg-slate-900/80 border-slate-700/80 text-slate-200' : 'bg-white/80 border-slate-100 text-slate-700'
               }`}>
                  <span className="w-2 h-2 bg-teal-400 rounded-full"></span>
                  <span>Air: Optimal</span>
               </div>
            </div>
          </header>

          {/* DYNAMIC VIEWS RENDER */}
          {activeTab === 'home' && (
            <div className="space-y-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Hero section: Camera element + mini responsive summary metric containers */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                  {/* Camera card column */}
                  <div className="lg:col-span-8">
                    <CameraFeedCard 
                      onCaptureSnapshot={handleCaptureSnapshot}
                      onIntercomToggle={handleIntercomToggle}
                      doorLocked={getEntity('lock.front_door').state === 'locked'}
                      onToggleDoorLock={handleToggleDoorLock}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Summary information column */}
                  <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                    {/* Device count indicator */}
                    <motion.div 
                      layout
                      whileHover={{ y: -2 }}
                      className={`transition-all p-5 rounded-[28px] flex flex-row lg:flex-col items-center lg:items-start justify-between backdrop-blur-xl shadow-xs border ${
                        darkMode 
                          ? 'bg-slate-900/60 hover:bg-slate-900/80 border-white/10 text-white' 
                          : 'bg-white/60 hover:bg-white/75 border-white/70 text-slate-800'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm ${
                        darkMode 
                          ? 'bg-orange-950/50 text-orange-400 border-orange-800/40' 
                          : 'bg-orange-100/80 text-orange-600 border-orange-100'
                      }`}>
                        <Bot size={22} className={activeDevicesTotal > 0 ? 'animate-pulse' : ''} />
                      </div>
                      <div className="mt-0 lg:mt-4 text-right lg:text-left">
                          <p className={`text-2xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>{activeDevicesTotal}</p>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">Active Devices</p>
                      </div>
                    </motion.div>

                    {/* Energy load estimation calculator */}
                    <motion.div 
                      layout
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab('energy')}
                      className={`transition-all p-5 rounded-[28px] flex flex-row lg:flex-col items-center lg:items-start justify-between backdrop-blur-xl shadow-xs border cursor-pointer group ${
                        darkMode 
                          ? 'bg-slate-900/60 hover:bg-slate-900/90 border-white/10 hover:border-[#7B61FF]/40 text-white' 
                          : 'bg-white/60 hover:bg-white/90 border-white/70 hover:border-[#7B61FF]/40 text-slate-800'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm transition-transform group-hover:scale-105 ${
                        darkMode 
                          ? 'bg-indigo-950/50 text-[#9D8BFF] border-indigo-800/40' 
                          : 'bg-indigo-100/80 text-[#7B61FF] border-indigo-100'
                      }`}>
                        <Zap size={22} className={darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'} />
                      </div>
                      <div className="mt-0 lg:mt-4 text-right lg:text-left">
                          <p className={`text-2xl font-black leading-none ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            {formattedPowerStr} <span className="text-xs font-semibold text-slate-400">kW</span>
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Estimated Load</span>
                            <span className={`text-[9px] font-bold ${darkMode ? 'text-[#9D8BFF]' : 'text-[#7B61FF]'}`}>• Analytics &rarr;</span>
                          </div>
                      </div>
                    </motion.div>

                    {/* Armed Lock indicator with Soft Purple Dynamic Aura */}
                    <motion.div 
                      layout
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleToggleDoorLock} 
                      className="bg-[#7B61FF] hover:bg-[#674EE3] cursor-pointer duration-300 p-5 rounded-[28px] text-white flex flex-row lg:flex-col items-center lg:items-start justify-between shadow-xl shadow-[#7B61FF]/35 ring-2 ring-[#7B61FF]/30 relative overflow-hidden group"
                    >
                      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                      <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-sm relative z-10">
                        {getEntity('lock.front_door').state === 'locked' ? <ShieldCheck size={22} /> : <ShieldAlert size={22} className="animate-pulse" />}
                      </div>
                      <div className="mt-0 lg:mt-4 text-right lg:text-left relative z-10">
                          <p className="text-xl font-black leading-none">{getEntity('lock.front_door').state === 'locked' ? 'Armed Secure' : 'Unlocked Warning'}</p>
                          <p className="text-[10px] text-white/85 font-extrabold uppercase mt-1 tracking-wider">
                            {getEntity('lock.front_door').state === 'locked' ? 'Front Door Locked' : 'Tap to secure lock'}
                          </p>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Rooms status list area */}
                <motion.section layout id="rooms-status-hub">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>Rooms environment matrix</h2>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {roomSortOption === 'active_devices' 
                          ? `Ordered by Active Devices count (${roomSortDirection === 'desc' ? 'Most active first' : 'Least active first'})` 
                          : roomSortOption === 'energy_consumption' 
                            ? `Ordered by Power Consumption (${roomSortDirection === 'desc' ? 'Highest power draw first' : 'Lowest power draw first'})` 
                            : 'Select individual room to review registered devices'}
                      </p>
                    </div>
                    
                    {/* Reordering / Sorting Control Group */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wider hidden sm:inline ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Sort:
                      </span>

                      <div 
                        id="rooms-sorting-controls"
                        role="group"
                        aria-label="Sort rooms matrix"
                        className={`p-1 rounded-2xl flex items-center gap-1 border shadow-2xs backdrop-blur-md ${
                          darkMode ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/90 border-slate-200/70'
                        }`}
                      >
                        {/* Default Order Button */}
                        <button
                          id="btn-sort-rooms-default"
                          type="button"
                          onClick={() => setRoomSortOption('default')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            roomSortOption === 'default'
                              ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-[1.02]'
                              : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          Default
                        </button>

                        {/* Active Devices Sort Button */}
                        <button
                          id="btn-sort-rooms-active-devices"
                          type="button"
                          onClick={() => {
                            if (roomSortOption === 'active_devices') {
                              setRoomSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                            } else {
                              setRoomSortOption('active_devices');
                              setRoomSortDirection('desc');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            roomSortOption === 'active_devices'
                              ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-[1.02]'
                              : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <Activity size={13} className={roomSortOption === 'active_devices' ? 'text-white' : 'text-indigo-400'} />
                          <span>Active Devices</span>
                          {roomSortOption === 'active_devices' && (
                            <span className="text-[11px] font-black font-mono ml-0.5 px-1 py-0.2 rounded bg-white/20">
                              {roomSortDirection === 'desc' ? '↓ High' : '↑ Low'}
                            </span>
                          )}
                        </button>

                        {/* Highest Energy Consumption Sort Button */}
                        <button
                          id="btn-sort-rooms-energy-consumption"
                          type="button"
                          onClick={() => {
                            if (roomSortOption === 'energy_consumption') {
                              setRoomSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                            } else {
                              setRoomSortOption('energy_consumption');
                              setRoomSortDirection('desc');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            roomSortOption === 'energy_consumption'
                              ? 'bg-[#7B61FF] text-white shadow-md shadow-[#7B61FF]/30 scale-[1.02]'
                              : darkMode
                                ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          <Zap size={13} className={roomSortOption === 'energy_consumption' ? 'text-amber-300' : 'text-amber-500'} />
                          <span>Highest Energy</span>
                          {roomSortOption === 'energy_consumption' && (
                            <span className="text-[11px] font-black font-mono ml-0.5 px-1 py-0.2 rounded bg-white/20">
                              {roomSortDirection === 'desc' ? '↓ Peak' : '↑ Min'}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Direction Toggle button if a sorted mode is active */}
                      {roomSortOption !== 'default' && (
                        <button
                          id="btn-toggle-sort-direction"
                          type="button"
                          onClick={() => setRoomSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                          title={`Click to reverse sort order (${roomSortDirection === 'desc' ? 'Highest first' : 'Lowest first'})`}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <ArrowUpDown size={13} className="text-[#7B61FF]" />
                          <span className="text-[10px] uppercase font-mono">{roomSortDirection}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Room Card Grid with Layout Transitions & Framer Motion Drag-to-Sort */}
                  {roomSortOption === 'default' ? (
                    <Reorder.Group
                      axis="x"
                      values={rooms}
                      onReorder={(newOrder) => {
                        setRooms(newOrder);
                        addToast({
                          type: 'info',
                          title: 'Dashboard Layout Updated',
                          message: 'Room order saved to your personalized view.',
                          duration: 2500
                        });
                        addLog('info', 'Personalized dashboard reordered via drag-and-drop.');
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none p-0 m-0"
                    >
                      {rooms.map((room) => (
                        <Reorder.Item
                          key={room.id}
                          value={room}
                          id={`reorder-room-${room.id}`}
                          className="list-none select-none touch-manipulation cursor-grab active:cursor-grabbing focus:outline-hidden"
                          whileDrag={{ 
                            scale: 1.04, 
                            zIndex: 40,
                            boxShadow: "0 20px 30px -10px rgba(123, 97, 255, 0.35)" 
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <RoomCard 
                            room={room}
                            entities={entities}
                            maintenanceTasks={maintenanceTasks}
                            isSelected={selectedRoomId === room.id}
                            onSelect={() => setSelectedRoomId(room.id)}
                            onToggleAllInRoom={handleToggleAllInRoom}
                            darkMode={darkMode}
                            isDragEnabled={true}
                          />
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  ) : (
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {sortedRooms.map((room) => (
                        <RoomCard 
                          key={room.id}
                          room={room}
                          entities={entities}
                          maintenanceTasks={maintenanceTasks}
                          isSelected={selectedRoomId === room.id}
                          onSelect={() => setSelectedRoomId(room.id)}
                          onToggleAllInRoom={handleToggleAllInRoom}
                          darkMode={darkMode}
                          isDragEnabled={false}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.section>
              </div>

              {/* 24-Hour Daily Insights & Microgrid Trends Widget */}
              <div className="mt-6">
                <DailyInsightsWidget
                  entities={entities}
                  rooms={rooms}
                  darkMode={darkMode}
                  onOpenEnergyTab={() => setActiveTab('energy')}
                />
              </div>

              {/* Focus detailed entities controller panel for the selected room */}
              <div className="mt-6">
                <RoomDetailSection
                  room={currentSelectedRoom}
                  entities={entities}
                  rooms={rooms}
                  maintenanceTasks={maintenanceTasks}
                  onUpdateEntityState={(id, newState, newAttr) => updateEntityState(id, newState, newAttr)}
                  onSelectRoom={(rId) => setSelectedRoomId(rId)}
                  onViewHealth={() => setActiveTab('health')}
                  darkMode={darkMode}
                />
              </div>

              {/* Master low-profile Quick action presets bar */}
              <motion.div layout id="quick-action-bar" className={`mt-8 pt-5 border-t flex flex-col gap-3 ${
                darkMode ? 'border-slate-800' : 'border-white/80'
              }`}>
                <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">Smart Scene Presets</span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {SCENES.map((scene) => {
                    const isActive = activePreset === scene.id;
                    return (
                      <div key={scene.id} className="relative flex">
                        {isActive && (
                          <motion.div 
                            animate={{ scale: [1, 1.04, 1], opacity: [0.45, 0.8, 0.45] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                            className="absolute -inset-1.5 bg-[#7B61FF] rounded-2xl blur-md pointer-events-none" 
                            style={{ boxShadow: '0 0 16px rgba(123, 97, 255, 0.55)' }}
                          />
                        )}
                        <motion.button
                          layout
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          id={`btn-scene-${scene.id}`}
                          onClick={() => handleTriggerPreset(scene.id)}
                          className={`w-full p-3.5 rounded-2xl flex items-center justify-between shadow-sm transition-all text-left cursor-pointer border relative z-10 backdrop-blur-xl ${
                            isActive 
                              ? 'bg-slate-900 border-[#7B61FF] text-white shadow-lg ring-2 ring-[#7B61FF]/50' 
                              : darkMode
                                ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 text-slate-200'
                                : 'bg-white/80 hover:bg-white border-slate-100 text-slate-700'
                          }`}
                          style={{
                            boxShadow: isActive ? '0 6px 20px rgba(123, 97, 255, 0.35)' : undefined
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full bg-gradient-to-r ${scene.color}`} />
                            <span className="text-xs font-black tracking-tight">{scene.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold ${isActive ? 'text-amber-300' : 'text-slate-400'}`}>
                            {isActive ? 'Active' : 'Apply'}
                          </span>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {/* 1. ROOMS & LIVING SPACES DIRECTORY VIEW */}
          {activeTab === 'rooms' && (
            <RoomsView
              rooms={rooms}
              entities={entities}
              maintenanceTasks={maintenanceTasks}
              onUpdateEntityState={updateEntityState}
              onToggleAllInRoom={(roomId, forceTurnOn) => {
                const targetRoom = rooms.find(r => r.id === roomId);
                if (!targetRoom) return;
                const turnState = forceTurnOn !== undefined ? (forceTurnOn ? 'on' : 'off') : 'off';
                targetRoom.entityIds.forEach(id => updateEntityState(id, turnState));
              }}
              onAddRoom={handleAddRoom}
              onViewHealth={() => setActiveTab('health')}
              onOpenEnergy={() => setActiveTab('energy')}
              onOpenGraphInspector={() => setShowGraphModal(true)}
              darkMode={darkMode}
            />
          )}

          {/* 2. AUTOMATIONS VIEW */}
          {(activeTab === 'automations' || activeTab === 'routines' || activeTab === 'activity') && (
            <AutomationsView
              entities={entities}
              rooms={rooms}
              onTriggerAutomation={handleTriggerAutomation}
              darkMode={darkMode}
            />
          )}

          {/* 3. SECURITY VIEW (Replaces legacy cameras tab) */}
          {(activeTab === 'security' || activeTab === 'cameras') && (
            <SecurityView
              entities={entities}
              rooms={rooms}
              onUpdateEntityState={updateEntityState}
              onCaptureSnapshot={handleCaptureSnapshot}
              onIntercomToggle={handleIntercomToggle}
              onPanicTrigger={handlePanicTrigger}
              darkMode={darkMode}
            />
          )}

          {/* 4. MUSIC & MEDIA VIEW */}
          {(activeTab === 'media' || activeTab === 'music') && (
            <MediaView
              entities={entities}
              rooms={rooms}
              onUpdateEntityState={updateEntityState}
              darkMode={darkMode}
            />
          )}

          {/* 5. SYSTEM & CORE VIEW */}
          {activeTab === 'system' && (
            <SystemView
              logs={logs}
              entities={entities}
              rooms={rooms}
              darkMode={darkMode}
              onClearLogs={() => setLogs([])}
              onRestartCore={handleRestartCore}
              onReloadYAML={handleReloadYAML}
              onCreateBackup={handleCreateBackup}
              setActiveTab={setActiveTab}
            />
          )}

          {/* 6. ENERGY ANALYTICS VIEW */}
          {activeTab === 'energy' && (
            <EnergyAnalyticsView
              entities={entities}
              rooms={rooms}
              darkMode={darkMode}
            />
          )}

          {/* 7. REGISTERED DEVICES FLEET VIEW */}
          {activeTab === 'devices' && (
            <div className="space-y-6">
              {/* IoT Battery Health Monitoring & Fleet Diagnostics Dashboard */}
              <BatteryStatusCard 
                entities={entities}
                rooms={rooms}
                darkMode={darkMode}
                onSelectRoom={(rId) => {
                  setSelectedRoomId(rId);
                  setActiveTab('home');
                }}
                onReplaceBattery={handleReplaceBattery}
                onSimulateLowBattery={handleSimulateLowBattery}
              />

              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className={`text-base font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      All Registered System Entities ({entities.length})
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Real-time power drawing and hardware communication state
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('health')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        darkMode ? 'bg-[#7B61FF]/20 text-indigo-300 border-[#7B61FF]/40 hover:bg-[#7B61FF]/30' : 'bg-[#7B61FF]/10 text-[#7B61FF] border-[#7B61FF]/30 hover:bg-[#7B61FF]/20'
                      }`}
                    >
                      <HeartPulse size={14} />
                      <span>Open Fleet Health Tracker &rarr;</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entities.map(ent => {
                    const devTask = maintenanceTasks.find(t => t.entityId === ent.entity_id && (t.status === 'overdue' || t.status === 'due_soon'));
                    const isBatteryBelow15 = typeof ent.attributes.battery === 'number' && ent.attributes.battery < 15;
                    return (
                      <div key={ent.entity_id} className={`p-5 rounded-[28px] shadow-sm border transition-all ${
                        isBatteryBelow15
                          ? darkMode 
                            ? 'bg-rose-950/25 border-rose-500/50 shadow-md shadow-rose-950/40' 
                            : 'bg-rose-50/90 border-rose-300 shadow-xs'
                          : darkMode 
                            ? 'bg-slate-900/70 border-white/10' 
                            : 'bg-white/80 border-slate-100'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[9px] font-black uppercase ${
                            darkMode ? 'text-[#9D8BFF]' : 'text-indigo-600'
                          }`}>{ent.entity_id.split('.')[0]}</span>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {devTask && (
                              <button
                                onClick={() => setActiveTab('health')}
                                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border cursor-pointer ${
                                  devTask.status === 'overdue'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                <Wrench size={9} />
                                <span>{devTask.status === 'overdue' ? 'Service Overdue' : 'Service Due'}</span>
                              </button>
                            )}

                            {typeof ent.attributes.battery === 'number' && (
                              <div className="flex items-center gap-1">
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                                  isBatteryBelow15 
                                    ? 'bg-rose-600 text-white border border-rose-500 shadow-xs animate-bounce'
                                    : ent.attributes.battery <= 49 
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                }`}>
                                  <BatteryLow size={11} />
                                  <span>{ent.attributes.battery}%</span>
                                </span>

                                {isBatteryBelow15 && (
                                  <button
                                    onClick={() => handleReplaceBattery(ent.entity_id)}
                                    title="Replace / recharge critical battery"
                                    className="p-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-bold cursor-pointer"
                                  >
                                    <Wrench size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className={`font-extrabold text-sm mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{ent.attributes.friendly_name}</p>
                        <p className="text-xs text-slate-400 mb-4">Current state reported: <code className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                          darkMode ? 'bg-slate-950 text-[#9D8BFF] border border-slate-800' : 'bg-slate-100 text-indigo-600'
                        }`}>{ent.state}</code></p>
                        <div className={`flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-3 border-t ${
                          darkMode ? 'border-slate-800' : 'border-slate-100'
                        }`}>
                          <span>Room: {ent.attributes.room || 'General'}</span>
                          <span>Load: {ent.attributes.power || 0}W</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 8. DEVICE HEALTH VIEW */}
          {activeTab === 'health' && (
            <DeviceHealthView
              tasks={maintenanceTasks}
              logs={maintenanceLogs}
              entities={entities}
              rooms={rooms}
              darkMode={darkMode}
              onCompleteTask={handleCompleteMaintenanceTask}
              onAddTask={handleAddMaintenanceTask}
            />
          )}

          {/* 9. SETTINGS VIEW */}
          {activeTab === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              toggleDarkMode={() => setDarkMode(!darkMode)}
              entities={entities}
              setEntities={handleSetEntities}
              rooms={rooms}
              setRooms={setRooms}
              addLog={addLog}
              logs={logs}
              setLogs={setLogs}
              setActiveTab={setActiveTab}
              addToast={addToast}
            />
          )}

          {/* 3. INTERACTIVE DEVELOPER MONITOR (COLLAPSIBLE FOOTER/DRAWER PANEL) */}
          {showTerminal && (
            <div id="terminal-drawer-container" className="mt-8 transition-transform duration-300">
              <WebSocketTerminal 
                logs={logs}
                entities={entities}
                onClearLogs={() => setLogs([])}
                onSimulateServiceCall={(dom, srv, targetId, data) => {
                  updateEntityState(targetId, data.target_state || 'on', data);
                }}
                onSimulateEvent={handleSimulateEvent}
                onClose={() => setShowTerminal(false)}
              />
            </div>
          )}
        </main>

      </div>

      {/* Global Notification Toast System */}
      <NotificationToast 
        toasts={toasts} 
        onDismiss={dismissToast} 
        darkMode={darkMode} 
      />

      {/* HAPulse Auto-Layout Graph Resolution & Connection Inspector Modal */}
      <GraphResolutionModal
        isOpen={showGraphModal}
        onClose={() => setShowGraphModal(false)}
        darkMode={darkMode}
      />
    </div>
  );
}
