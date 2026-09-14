/**
 * Test script for Active Drag Guard & Stale Closure Prevention in ConfigContext
 */
import assert from 'node:assert';
import { mergeConfig, mergeDelta } from '../src/services/configStorageService.js';
import { DEFAULT_USER_CONFIG, UserDashboardConfig } from '../src/types/userConfig.js';

console.log('--- Testing Drag Guard & Concurrency Safety ---');

// Test 1: Simulating remote update arrival during active drag session
{
  let currentConfig: UserDashboardConfig = {
    ...DEFAULT_USER_CONFIG,
    overview: {
      ...DEFAULT_USER_CONFIG.overview,
      tileOrder: ['weather', 'lights', 'power_flow', 'security']
    }
  };

  let isDragActive = false;
  let deferredRemoteConfig: UserDashboardConfig | null = null;
  let pendingDelta: Partial<UserDashboardConfig> = {};

  const simulateRemoteConfigReceived = (remoteConfig: UserDashboardConfig) => {
    if (isDragActive) {
      // Guard: Defer applying remote config so active drag is not interrupted
      deferredRemoteConfig = remoteConfig;
      return;
    }
    const hasPendingDelta = pendingDelta && Object.keys(pendingDelta).length > 0;
    currentConfig = hasPendingDelta ? mergeConfig(remoteConfig, pendingDelta) : remoteConfig;
  };

  const endDragSession = () => {
    isDragActive = false;
    if (deferredRemoteConfig) {
      const deferred = deferredRemoteConfig;
      deferredRemoteConfig = null;
      const hasPendingDelta = pendingDelta && Object.keys(pendingDelta).length > 0;
      currentConfig = hasPendingDelta ? mergeConfig(deferred, pendingDelta) : deferred;
    }
  };

  // 1. User starts dragging a tile
  isDragActive = true;

  // 2. Remote SSE broadcast arrives with an updated tile order from another client
  const incomingRemoteConfig: UserDashboardConfig = {
    ...DEFAULT_USER_CONFIG,
    overview: {
      ...DEFAULT_USER_CONFIG.overview,
      tileOrder: ['security', 'weather', 'lights', 'power_flow']
    }
  };
  simulateRemoteConfigReceived(incomingRemoteConfig);

  // Assert local config was NOT mutated mid-drag!
  assert.deepStrictEqual(
    currentConfig.overview?.tileOrder,
    ['weather', 'lights', 'power_flow', 'security'],
    'Local layout state must NOT be overwritten while isDragActive is true'
  );
  assert(deferredRemoteConfig !== null, 'Incoming remote config should be deferred');
  console.log('✓ Test 1 passed: Remote config update successfully deferred during active drag!');

  // 3. User finishes dragging and commits local reorder (e.g., lights first)
  pendingDelta = {
    overview: {
      ...currentConfig.overview,
      tileOrder: ['lights', 'weather', 'power_flow', 'security']
    }
  };
  endDragSession();

  // Assert local reorder was preserved over remote update
  assert.deepStrictEqual(
    currentConfig.overview?.tileOrder,
    ['lights', 'weather', 'power_flow', 'security'],
    'Local user reorder must be preserved upon ending drag session'
  );
  assert.strictEqual(deferredRemoteConfig, null, 'Deferred config must be cleared after resolution');
  console.log('✓ Test 2 passed: Deferred updates cleanly merged when drag ends!');
}

// Test 3: In-flight save race condition
{
  let pendingDelta: Partial<UserDashboardConfig> = {};

  // First edit
  pendingDelta = mergeDelta(pendingDelta, {
    overview: { tileOrder: ['weather', 'switches'] }
  });

  // Save triggers with deltaToSave
  const deltaToSave = { ...pendingDelta };
  pendingDelta = {}; // Cleared for in-flight save

  // While save is in-flight, user makes a second edit:
  pendingDelta = mergeDelta(pendingDelta, {
    overview: { tileOrder: ['switches', 'weather'] }
  });

  // saveConfig resolves with saved config based on deltaToSave
  const savedResponse = mergeConfig(DEFAULT_USER_CONFIG, deltaToSave);

  // ConfigContext logic: check hasMorePending
  const hasMorePending = pendingDelta && Object.keys(pendingDelta).length > 0;
  const finalState = hasMorePending ? mergeConfig(savedResponse, pendingDelta) : savedResponse;

  assert.deepStrictEqual(
    finalState.overview?.tileOrder,
    ['switches', 'weather'],
    'In-flight save response must NOT overwrite newer pending edits'
  );
  console.log('✓ Test 3 passed: In-flight save resolution preserves newer pending edits!');
}

console.log('All Drag Guard & Concurrency Safety tests passed successfully! 🎉');
