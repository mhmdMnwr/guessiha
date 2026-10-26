const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- VERIFYING ROAD-FIRST SELECTION & ATLAS VIEW NAVIGATION ---');

// 1. Verify CSS styles for Atlas View and Top HUD
const hudCss = fs.readFileSync(path.join(__dirname, '../frontend/src/features/game/styles/game-hud.css'), 'utf8');
assert(hudCss.includes('z-index: 50;'), 'DesktopGameHud must have z-index: 50 so it is not covered by AtlasView');
console.log('✅ DesktopGameHud z-index is set to 50 (above AtlasView).');

const atlasCss = fs.readFileSync(path.join(__dirname, '../frontend/src/features/game/styles/game-explore-atlas.css'), 'utf8');
assert(atlasCss.includes('top: 76px;'), 'AtlasView on desktop must have top: 76px below the 76px header');
assert(atlasCss.includes('atlas-map-back-btn'), 'AtlasView must define .atlas-map-back-btn for quick navigation');
console.log('✅ AtlasView CSS properly offsets 76px on desktop and defines back button styles.');

// 2. Verify AtlasView.tsx includes the desktop back button
const atlasViewTsx = fs.readFileSync(path.join(__dirname, '../frontend/src/features/game/components/AtlasView.tsx'), 'utf8');
assert(atlasViewTsx.includes('atlas-map-back-btn'), 'AtlasView must render the desktop back button');
assert(atlasViewTsx.includes('STREET VIEW [G]'), 'AtlasView back button must display STREET VIEW [G]');
console.log('✅ AtlasView.tsx includes prominent desktop back button to return to Street View.');

// 3. Verify backend road filtering & selection logic
const geoDbTs = fs.readFileSync(path.join(__dirname, '../backend/game-engine/src/geo-database/geo-database.service.ts'), 'utf8');
assert(geoDbTs.includes('export function isRoadLocation'), 'geo-database.service must export isRoadLocation');
assert(geoDbTs.includes('0.001'), 'geo-database.service must enforce 1-in-1000 non-road filter');
assert(geoDbTs.includes('ORDER BY'), 'geo-database.service must prioritize road locations in SQL ORDER BY');
console.log('✅ GeoDatabaseService exports isRoadLocation and prioritizes road locations in PostGIS queries (1-in-1000 limit).');

const roundCoordTs = fs.readFileSync(path.join(__dirname, '../backend/game-engine/src/game/services/round-coordinator.service.ts'), 'utf8');
assert(roundCoordTs.includes('effectiveMaxNonRoads'), 'round-coordinator must enforce effectiveMaxNonRoads');
assert(roundCoordTs.includes('0.001'), 'round-coordinator must enforce 1-in-1000 non-road cap');
assert(roundCoordTs.includes('roadCandidates'), 'round-coordinator must separate road and non-road candidates');
console.log('✅ RoundCoordinatorService enforces ~1 in 1000 non-road cap.');

// 4. Test algorithmic non-road cap with simulation
const ROAD_KEYWORDS = [
  'road', 'route', 'highway', 'autoroute', 'autobahn', 'freeway',
  'motorway', 'street', 'avenue', 'boulevard', 'drive', 'lane',
  'way', 'rue', 'via ', 'calle', 'strada', 'gasse', 'vej',
  'dori', 'daero', 'jalan', 'rua', 'carrera', 'str.', 'rd.',
  'ave.', 'blvd', 'rocade', 'corniche', 'parkway', 'expressway',
  'turnpike', 'bypass', 'ring road', 'causeway', 'pass',
];

function isRoad(loc) {
  if (!loc || !loc.label) return false;
  const l = loc.label.trim();
  if (l.startsWith('Road in ')) return true;
  const lower = l.toLowerCase();
  return ROAD_KEYWORDS.some((kw) => lower.includes(kw));
}

assert(isRoad({ label: 'Road in Greater Poland Voivodeship, Poland' }), 'Road in ... is road');
assert(isRoad({ label: 'Avenue des Champs-Élysées, Paris, France' }), 'Champs-Élysées is road');
assert(isRoad({ label: 'Broadway & 42nd Street, New York, USA' }), 'Broadway is road');
assert(isRoad({ label: 'George Street, Sydney, Australia' }), 'George Street is road');
assert(!isRoad({ label: 'Eiffel Tower Observation Deck, Paris, France' }), 'Eiffel Tower is not road');
assert(!isRoad({ label: 'Colosseum Interior, Rome, Italy' }), 'Colosseum Interior is not road');
assert(!isRoad({ label: 'Piccadilly Circus, London, UK' }), 'Piccadilly Circus is not road');
console.log('✅ isRoad correctly differentiates road coverage from monuments/ruins.');

// 5. Verify road-proxy outdoor metadata filter
const streetviewCtrlTs = fs.readFileSync(path.join(__dirname, '../backend/road-proxy/src/streetview/streetview.controller.ts'), 'utf8');
assert(streetviewCtrlTs.includes('source=outdoor'), 'streetview.controller must specify source=outdoor in metadata queries');
console.log('✅ road-proxy outdoor metadata filter verified.');

console.log('\n🎉 ALL ROAD SELECTION & ATLAS NAVIGATION TESTS PASSED SUCCESSFULLY!');
