/**
 * Test script for Overview tile reorder splicing logic (Bug A)
 */
import assert from 'node:assert';
import { DEFAULT_OVERVIEW_TILE_ORDER } from '../src/types/userConfig.js';

function spliceTileReorder(
  currentTileOrder: string[],
  newOrder: string[],
  defaultOrder: string[] = DEFAULT_OVERVIEW_TILE_ORDER
): string[] {
  const displaySet = new Set(newOrder);
  let newOrderIdx = 0;
  const fullOrder = currentTileOrder.map((id) => {
    if (displaySet.has(id)) {
      return newOrder[newOrderIdx++];
    }
    return id;
  });
  while (newOrderIdx < newOrder.length) {
    fullOrder.push(newOrder[newOrderIdx++]);
  }
  defaultOrder.forEach((id) => {
    if (!fullOrder.includes(id)) {
      fullOrder.push(id);
    }
  });
  return fullOrder;
}

console.log('--- Testing Bug A: Tile Reorder Splicing ---');

// Test 1: Category tab reorder does NOT move other tiles to the end
{
  const initialMasterOrder = [
    'weather',
    'lights',
    'power_flow',
    'switches',
    'security_system',
    'climate'
  ];

  // User is on 'lights' tab, which displays ['lights', 'switches']
  // User drags 'switches' before 'lights':
  const newOrder = ['switches', 'lights'];

  const updatedMasterOrder = spliceTileReorder(initialMasterOrder, newOrder, initialMasterOrder);

  console.log('Test 1 updated master order:', updatedMasterOrder);

  // Expected: switches takes lights's slot (index 1), lights takes switches's slot (index 3)
  // 'weather', 'power_flow', 'security_system', 'climate' remain at their original indices (0, 2, 4, 5)
  assert.deepStrictEqual(updatedMasterOrder, [
    'weather',
    'switches',
    'power_flow',
    'lights',
    'security_system',
    'climate'
  ]);
  console.log('✓ Test 1 passed: Other tiles maintained their relative positions!');
}

// Test 2: Hidden tiles stay in place when reordering visible tiles on "All" tab
{
  const initialMasterOrder = [
    'weather',
    'hidden_tile_1',
    'lights',
    'hidden_tile_2',
    'switches',
    'power_flow'
  ];

  // User is on 'All' tab, but hidden_tile_1 and hidden_tile_2 are hidden:
  // displayTiles: ['weather', 'lights', 'switches', 'power_flow']
  // User moves 'power_flow' to the top:
  const newOrder = ['power_flow', 'weather', 'lights', 'switches'];

  const updatedMasterOrder = spliceTileReorder(initialMasterOrder, newOrder, initialMasterOrder);

  console.log('Test 2 updated master order:', updatedMasterOrder);

  // Expected:
  // slot 0 (was weather) -> power_flow
  // slot 1 (was hidden_tile_1) -> hidden_tile_1 (kept!)
  // slot 2 (was lights) -> weather
  // slot 3 (was hidden_tile_2) -> hidden_tile_2 (kept!)
  // slot 4 (was switches) -> lights
  // slot 5 (was power_flow) -> switches
  assert.deepStrictEqual(updatedMasterOrder, [
    'power_flow',
    'hidden_tile_1',
    'weather',
    'hidden_tile_2',
    'lights',
    'switches'
  ]);
  console.log('✓ Test 2 passed: Hidden tiles retained their exact positions!');
}

// Test 3: Multiple consecutive reorders on different filtered tabs
{
  let master = [...DEFAULT_OVERVIEW_TILE_ORDER];
  const originalOtherTiles = master.filter((id) => !['lights', 'switches'].includes(id));

  // Reorder on 'lights' tab
  master = spliceTileReorder(master, ['switches', 'lights']);

  // Check that all other tiles preserved their relative order
  const otherTilesAfterLights = master.filter((id) => !['lights', 'switches'].includes(id));
  assert.deepStrictEqual(otherTilesAfterLights, originalOtherTiles);

  // Now reorder on 'energy' tab
  const energyTiles = ['power_flow', 'power_flow_chart', 'energy_usage'];
  const reversedEnergy = [...energyTiles].reverse();
  master = spliceTileReorder(master, reversedEnergy);

  // Check that lights and switches still preserved their order
  const lightsIndex = master.indexOf('lights');
  const switchesIndex = master.indexOf('switches');
  assert(switchesIndex < lightsIndex, 'switches should still come before lights');

  console.log('✓ Test 3 passed: Multiple consecutive reorders across tabs preserved order!');
}

console.log('All spliceTileReorder tests passed successfully! 🎉');
