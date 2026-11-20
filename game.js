'use strict';

// Level distances, timings, and movement are measured in world units and seconds.
const config = {
  approachSpeed: 20, steering: 2.3, response: 11, startingSquad: 3, soldierVisualScale: .875,
  edge: 0.86, viewDistance: 180, fireRange: 79, fireInterval: 0.14,
  aimWidth: 0.32, aimWidthPerColumn: 0.035, breachLine: -4, shotSpeed: 83, barricadeWidth: 0.26,
  barricadeDamage: 2, enemySpeed: 24, contactWidth: 0.23, contactInterval: 0.24,
  damageFlash: 0.25, combatNoticeTime: 1.4, impactTime: 0.12, muzzleTime: 0.05, fallTime: 0.33, recruitTime: 0.65, audioVolume: 0.27, maxFrameTime: 0.05, maxPixelRatio: 2,
};

const gateBalance = {
  recruitSpacing: 18, openingRecruitSpacing: 46, openingFraction: .18, penaltyPositions: [.24, .41, .57, .72, .87],
  penaltyLane: .72, laneClearance: 15, penaltyBase: 2, levelsPerPenalty: 6, penaltyMax: 5,
};

const recruitment = {settleTime: .52, arrivalSpacing: .055, entryDepth: 1.35, entryScale: .65};

const walker = {health: 2, pace: .74, siegePace: .76, siegeHealthyEvery: 2, staggerTime: .17, staggerPace: .32, limpPace: .81};
const crowdCamera = {start: 32, full: 130, widen: .16, pullback: .34, pitch: .13,
  riseTime: 1.2, returnTime: 2.2, extraView: 42, visibleSquadMax: 20};

// The entrance move pivots above the foreground, preserving squad framing and touch steering.
const entranceCamera = {
  bossDistance: 112, specialistDistance: 100, minDistance: 40, anchoredDepth: 10,
  deploySettle: .42, easeIn: .72, hold: .32, easeOut: 1, quietTime: 6,
  pitch: .075, pan: .23, dolly: .32, minimumShoulder: .9, specialistStrength: .84,
};

const falls = {
  drop: .54, heavyDrop: .76, hold: .58, fade: .34, gravity: 14,
  slideTime: .22, soundRange: 48, soundGap: .12, dustTime: .22,
};

const largeZombieKinds = new Set(['hulk', 'frost', 'breaker', 'boiler', 'carrier']);
const deathGroan = {
  victoryChimeGain: .45,
};

const difficulties = {
  easy: {
    pace: 1, waveSize: 1, armor: 0, breaches: 1, gateEvery: 0, supplies: 1,
    startingArmor: 3, hazardDamage: 0, bruteHealth: 1, bruteDamage: 0, warning: 1, recovery: 1, strikeWidth: 1,
  },
  medium: {
    pace: 1.09, waveSize: 1.06, armor: 1, breaches: 0.8, gateEvery: 6, supplies: 0.85,
    startingArmor: 2, hazardDamage: 1, bruteHealth: 1.3, bruteDamage: 1, warning: 0.88, recovery: 0.9, strikeWidth: 1.06,
  },
  hard: {
    pace: 1.13, waveSize: 1.08, armor: 2, breaches: 0.7, gateEvery: 5, supplies: 0.65,
    startingArmor: 1, hazardDamage: 2, bruteHealth: 1.65, bruteDamage: 2, warning: 0.74, recovery: 0.8, strikeWidth: 1.12,
  },
};

const armory = {
  drops: [
    {at: 0.16, choices: ['rapid', 'spread']},
    {at: 0.6, choices: ['scatter', 'longshot']},
  ],
  supplies: [{at: 0.21, kind: 'rescue'}, {at: 0.46, kind: 'armor'}, {at: 0.79, kind: 'drum'}],
  lane: 0.66, aimWidth: 0.20, panelAim: .335, rescueCount: 5, armorCount: 3,
  drumDepth: 21, drumWidth: 0.44, drumPower: 3, drumCollision: 3, blastTime: 0.38,
  tuning: {
    rapid: {label: 'Rapid rifle', badge: 'RAPID RIFLE', color: '#ffbc55', hits: 8, hitStep: 3, intervalMultiplier: 0.82},
    spread: {label: 'Twin carbine', badge: 'TWIN CARBINE', color: '#51e7ed', hits: 8, hitStep: 3, rounds: 1},
    scatter: {label: 'Scattergun', badge: 'SCATTERGUN', color: '#e4a8ff', hits: 11, hitStep: 3, rounds: 2, range: 36},
    longshot: {label: 'Longshot', badge: 'LONGSHOT', color: '#9de99c', hits: 11, hitStep: 3, range: 24, aim: 0.055},
    rescue: {label: 'Rescue crate', badge: 'RESCUE', color: '#7adec0', hits: 5, hitStep: 2},
    armor: {label: 'Armor crate', badge: 'ARMOR', color: '#9fb7ff', hits: 7, hitStep: 2},
    drum: {label: 'Shock drum', badge: 'SHOCK', color: '#ec5041', hits: 9, hitStep: 3},
  },
};

// Dimensions are in scene metres. A shot keeps its firing profile after another pickup.
const weaponEffects = {
  standard: {color:'#ffca66', muzzle:.78, width:.04, length:.81, recoil:1,
    voices:[{frequency:2100,duration:.065,volume:.23,noise:true},{frequency:140,end:65,duration:.05,volume:.115,wave:'triangle'}]},
  rapid: {muzzle:.99, width:.07, length:1.22, recoil:.85,
    voices:[{frequency:3400,duration:.032,volume:.21,noise:true},{frequency:310,end:105,duration:.035,volume:.12,wave:'square'}]},
  spread: {muzzle:.94, width:.085, length:1.15, recoil:1.1, barrelOffset:.105,
    voices:[{frequency:720,end:195,duration:.058,volume:.16,wave:'triangle'},{frequency:1020,end:260,duration:.052,volume:.14,offset:.031,wave:'triangle'}]},
  scatter: {muzzle:.74, width:.16, length:.34, recoil:1.7, fan:.92,
    voices:[{frequency:950,duration:.12,volume:.29,noise:true},{frequency:112,end:39,duration:.13,volume:.23,wave:'triangle'}]},
  longshot: {muzzle:1.29, width:.065, length:3.9, recoil:1.32,
    voices:[{frequency:2800,duration:.024,volume:.23,noise:true},{frequency:1390,end:220,duration:.14,volume:.16,wave:'sine'}]},
};
function weaponBenefit(kind) {
  const item=armory.tuning[kind];
  switch(kind) {
    case 'rapid': return Math.round((1/item.intervalMultiplier-1)*100)+'% faster fire';
    case 'spread': return '+'+item.rounds+' shot per volley';
    case 'scatter': return '+'+item.rounds+' shots at close range';
    case 'longshot': return '+'+item.range+' range · wider aim';
  }
}
function shotColor(kind) { return armory.tuning[kind]?.color ?? weaponEffects.standard.color; }

function recruitLanes(groups, count) {
  return groups.flatMap(([start, side]) => Array.from({length: count}, (_, index) =>
    [start + index * 6, side * 0.66, 1]));
}

const armoredWaveMix = {first: 4, interval: 16, siegeInterval: 34, incomingLimit: 2};

const enemyTypes = {
  ...campaignSpecialists,
  boiler: {label: 'Boiler Husk', color: '#ffcd74', speed: 12, size: 2.85, health: 26, damage: 3, breach: 3,
    ventRange: 36, ventTime: .88, openTime: 1.65, sealedTime: 1.3, coreDamage: 4,
    coreHeight: .62,
    tip: 'The Boiler Husk vents steam before its chest opens. Line up with the bright furnace for extra damage.'},
  leaper: {label: 'Leaper', color: '#78dcff', speed: 26, health: 7, size: 1.53, cadence: 14,
    trigger: 29, windup: .72, flight: .86, height: 2.65, radius: .17, strike: 2, recovery: .42,
    cue: 'Leaper crouching · clear the blue marks', tip: 'Leapers jump to the blue marks. Step sideways after they crouch.'},
  spitter: {label: 'Spitter', color: '#b9ef66', speed: 21, health: 6, size: 1.65, cadence: 7,
    trigger: 51, windup: .82, flight: 1.12, height: 2.35, radius: .22, strike: 2,
    cue: 'Spitter aiming · clear the green marks', tip: 'Spitters lob acid at the green marks. Shoot one before it releases, or dodge the splash.'},
  howler: {label: 'Howler', color: '#ffb858', speed: 24, health: 9, size: 1.85, cadence: 8,
    trigger: 56, windup: 1.18, reachX: .60, reachZ: 25, rallySpeed: 1.55, rallyTime: 2.65,
    cue: 'Howler drawing breath · shoot to stop its call', tip: 'Howlers speed up nearby zombies. Aim at the orange throat before the call.'},
  runner: {speed: 38, health: 1, cadence: 17},
  armored: {label:'Armored', speed: 19, health: 4, cadence: 7, size: 1.62},
  raider: {speed: 36, health: 2, cadence: 14, weave: 0.105, size: 1.34, flank: true},
  hulk: {label:'Hulk', speed: 18, health: 9, cadence: 5.5, size: 2.08, damage: 3, breach: 3},
  shield: {label:'Shield bearer', speed: 24, health: 8, cadence: 7.5, size: 1.72, coverWidth: 0.16, coverDepth: 8},
};
const charge = {
  warning: 1.15, swingTime: 0.26, swingTimePerLevel: 0.007,
  strideDistance: 8, stepShakeTime: 0.18, impactShakeTime: 0.32, stepShake: 4, impactShake: 9,
  recovery: 1.85, damage: 6, damagePerTier: 1, squadDamage: 0.30, resetDistance: 18,
  health: 44, healthPerLevel: 5, size: 4.55, sizePerLevel: 0.085,
  width: 0.25, widthPerLevel: 0.008,
  shield: 14, shieldPerLevel: 1.5,
  leapEvery: 3, leapTime: .66, leapHeight: 2.25, leapShake: 14,
  followthroughTime: .38, dustTime: .52,
};
const bossWeapons = {
  axe: {label: 'Axe', attack: 'Axe slam', cue: 'Axe raised', reach: 8, width: 1, windup: 1, swing: 1},
  hammer: {label: 'Hammer', attack: 'Hammer slam', cue: 'Wide slam', reach: 9, width: 1.15, windup: 1.14, swing: 0.9},
  hook: {label: 'Hook', attack: 'Hook strike', cue: 'Tracking hook', reach: 13, width: 0.88, windup: 1.12, swing: 1.1, track: 0.52},
  mace: {label: 'Mace', attack: 'Mace strike', cue: 'Mace raised', reach: 7, width: 1.05, windup: 0.91, swing: 0.95},
  blade: {label: 'Blade', attack: 'Blade sweep', cue: 'Low sweep', reach: 10, width: 1.08, windup: 0.94, swing: 1.05},
  ram: {label: 'Ram', attack: 'Ram charge', cue: 'Charge lined up', reach: 17, width: 0.84, windup: 1.0, swing: 1.24},
};
const bossRoster = [
  {name: 'The Breaker', tool: 'axe', recovery: 1.12},
  {name: 'Dockmaster', tool: 'hammer', power: 1},
  {name: 'Cargo Jack', tool: 'hook', recovery: 1.1},
  {name: 'Night Watch', tool: 'blade', tempo: 0.94},
  {name: 'Iron Warden', tool: 'mace', width: 1.06, power: 1},
  {name: 'Span Runner', tool: 'ram', pace: 1.16},
  {name: 'Storm Smith', tool: 'hammer', tempo: 0.94, width: 1.08},
  {name: 'Tollkeeper', tool: 'axe', followup: true},
  {name: 'Convoy Reaver', tool: 'hook', pace: 1.12, width: 1.06},
  {name: 'Last Sentinel', tool: 'blade', followup: true, recovery: 1.13},
  {name: 'Bellkeeper', tool: 'mace', followup: true, recovery: 1.12},
  {name: 'Hull Splitter', tool: 'ram', width: 1.1, power: 1},
  {name: 'Floodgate Keeper', tool: 'hook', followup: true, recovery: 1.1},
  {name: 'Canyon Judge', tool: 'hammer', width: 1.1, power: 2},
  {name: 'Red Captain', tool: 'axe', tempo: 0.92, power: 2},
  {name: 'Tidemaw', tool: 'mace', tempo: 0.92, width: 1.08, followup: true},
  {name: 'Iron Regent', tool: 'ram', followup: true, pace: 1.1, power: 2, recovery: 1.12},
];
const bossFollowup = {warningMultiplier: 0.82};
const bruteFinishes = ['plating', 'copperPlating', 'marinePlating', 'ivoryPlating'];
const fieldEvents = {first: 0.31, second: 0.61, supplyDistance: 38, bonus: 5,
  ambushDistance: 66, runners: 5, runnerSpacing: 4.5};
const storm = {warningDistance: 47, swing: 0.41, frequency: 0.13, damage: 4};

const horde = {
  scoutFraction: .16, scoutLimit: 8, waveFraction: .58, stagger: .18,
  columns: 3, rowDepth: 6.5, depthJitter: 1.8, halfWidth: 0.43,
  splitHalfWidth: 0.32, innerEdge: 0.65, straggle: 0.012, bodyScale: 1.43,
};

const siegeHorde = {
  bodyScale: 1.58, depthJitter: 3.8,
  coats: ['enemy', 'scarlet', 'maroon'],
  shadowDistance: 85,
};

function buildGates(level, difficulty) {
  const lastRecruit = new Map();
  const gates = level.gates
    .filter(([z, x, count], index) => {
      if (count !== 1) return true;
      if (difficulty.gateEvery && (index + 1) % difficulty.gateEvery === 0) return false;
      if (z - (lastRecruit.get(x) ?? -Infinity) < (z < level.length * gateBalance.openingFraction ? gateBalance.openingRecruitSpacing : gateBalance.recruitSpacing)) return false;
      lastRecruit.set(x, z);
      return true;
    })
    .map(([z, x, count, kind]) => ({z, x, count: Math.ceil(count * difficulty.supplies), kind}));
  const penalty = Math.min(gateBalance.penaltyMax, gateBalance.penaltyBase +
    Math.floor(levelIndex / gateBalance.levelsPerPenalty) + difficulty.hazardDamage);
  for (const [index, fraction] of gateBalance.penaltyPositions.entries()) {
    const z = Math.round(level.length * fraction);
    const nearby = gates.find(gate => gate.count > 0 && gate.x && Math.abs(gate.z - z) < gateBalance.laneClearance);
    const side = nearby ? -Math.sign(nearby.x) : (levelIndex + index) % 2 === 0 ? 1 : -1;
    gates.push({z, x: side * gateBalance.penaltyLane, count: -penalty});
  }
  return gates.sort((a, b) => a.z - b.z);
}

function gateLabel(count) {
  return count < 0 ? '−' + Math.abs(count) : '+' + count;
}

function formWave([z, center, count, kind, halfWidth], level, difficulty) {
  const type = enemyTypes[kind];
  const outer = kind === 'runner' || type?.flank;
  const columnHorde = level.siege && !kind ? level.siege : null;
  const columns = columnHorde?.columns ?? horde.columns;
  const rowDepth = columnHorde?.rowDepth ?? horde.rowDepth;
  const depthJitter = columnHorde ? siegeHorde.depthJitter : horde.depthJitter;
  const span = halfWidth ?? (outer || level.split ? horde.splitHalfWidth : horde.halfWidth);
  const left = outer || level.split || halfWidth ? center - span : Math.max(-horde.innerEdge, center - span);
  const right = outer || level.split || halfWidth ? center + span : Math.min(horde.innerEdge, center + span);
  const scouts = z < level.length * horde.scoutFraction;
  const waveCount = kind ? count : scouts ? Math.min(horde.scoutLimit, count) : count * horde.waveFraction;
  const total = Math.ceil(waveCount * difficulty.waveSize);
  return Array.from({length: total}, (_, index) => {
    const row = Math.floor(index / columns);
    const rowSize = Math.min(columns, total - row * columns);
    const column = (index % columns + 0.5) / rowSize;
    const offset = Math.sin(index * 2.399 + z);
    const stagger = row % 2 ? horde.stagger : -horde.stagger;
    const laneX = left + (right - left) * (column + (stagger + offset / 2.6) / columns);
    const paceOffset = (index * 2.399 + z) % (Math.PI * 2);
    const interval = columnHorde ? armoredWaveMix.siegeInterval : armoredWaveMix.interval;
    const armored = !type && z >= (level.armorMixFrom ?? 0) && index % interval === armoredWaveMix.first;
    const variant = armored ? enemyTypes.armored : type;
    const health = variant ? variant.health + (kind === 'runner' ? 0 : difficulty.armor) :
      columnHorde && index % walker.siegeHealthyEvery !== 0 ? walker.health - 1 : walker.health;
    return {
      z: z + row * rowDepth + (1 + Math.cos(index * 2.879 + z)) * depthJitter / 2,
      x: laneX, laneX, gaitOffset: paceOffset, coat: (index + row) % 3, kind: armored ? 'armored' : kind,
      siege: Boolean(columnHorde), size: variant?.size ?? (columnHorde ? siegeHorde.bodyScale : undefined),
      health, maxHealth: health,
    };
  });
}

const levels = [
  {
    name: 'Breakwater',
    startingSquad: 2, armorMixFrom: 215,
    weaponDrops: [{distance: 44, choices: ['rapid','spread']}, armory.drops[1]],
    weaponLane: .42,
    supplies: armory.supplies.map(supply => supply.kind === 'drum' ? {...supply, distance: 288} : supply),
    title: 'Hold the bridge.',
    brief: 'Recruit soldiers at the first blue gate. Use the lull before the main wave to pick a weapon and build your squad.',
    objective: 'Recruit soldiers through blue gates, then hold the bridge.',
    length: 760, breachLimit: 30,
    gates: [
      [15, 0, 1],
      ...Array.from({length: 22}, (_, i) => [57 + i * 5, -0.66, 1]),
      ...Array.from({length: 10}, (_, i) => [181 + i * 7, 0.66, 1]),
      ...Array.from({length: 13}, (_, i) => [326 + i * 7, -0.66, 1]),
      ...Array.from({length: 12}, (_, i) => [499 + i * 7, 0.66, 1]),
      ...Array.from({length: 10}, (_, i) => [661 + i * 7, -0.66, 1]),
    ],
    barricades: [[205, 0.63], [306, 0.52], [479, -0.53], [641, 0.53]],
    specialists: [[344, 0.65, 'leaper']],
    waves: [[64, 0, 6, undefined, .16], [140, 0, 15, undefined, .22],
      [188, .04, 1, 'armored'], [274, -.30, 3, 'runner'], [230, .03, 33], [331, -.09, 47],
      [414, .08, 62], [535, -.08, 70], [654, .08, 82]],
  },
  {
    name: 'Harbor Crossing', scenery: 'harbor',
    title: 'Hold the harbor.',
    brief: 'Blue gates switch sides along the dock. Use the gaps between waves to move across the bridge and recruit.',
    objective: 'Switch lanes between waves and keep zombies behind the defense line.',
    length: 880, breachLimit: 18,
    backdrop: drawHarbor,
    gates: recruitLanes([[22, -1], [70, 1], [158, -1], [211, 1], [307, -1], [355, 1],
      [464, -1], [515, 1], [624, -1], [682, 1], [780, -1], [830, 1]], 5),
    barricades: [[129, -0.61], [274, 0.62], [425, -0.58], [572, 0.61], [744, -0.60]],
    specialists: [[148, -0.6, 'leaper'], [482, 0.55, 'leaper']],
    waves: [[69, 0.12, 46], [235, -0.11, 56], [398, 0.12, 64],
      [560, -0.11, 73], [730, 0.10, 84]],
  },
  {
    name: 'Container Run', scenery: 'freight', title: 'Watch the freight lane.', backdrop: drawHarbor,
    objective: 'Dodge staggered crates, then return to the firing lane.',
    length: 790, breachLimit: 23,
    gates: recruitLanes([[20, -1],[148, 1],[291, -1],[430, 1],[576, -1],[701, 1]], 8),
    barricades: [[71, 0.55],[106, -0.55],[234, 0],[264, -0.55],[383, 0.25],[410, 0.57],[533, -0.22],[653, 0],[755, 0.55]],
    specialists: [[173, 0.62, 'spitter'], [414, -0.59, 'leaper']],
    waves: [[97, 0, 34],[220, -0.11, 42],[340, 0.10, 48],[470, -0.08, 51],[610, 0.08, 57]],
  },
  {
    name: 'Floodlights', scenery: 'floodlights', title: 'Watch the flanks.', backdrop: drawHarbor, lighting: 'dusk',
    objective: 'Fast runners break from the horde. Watch for orange markers and listen for their approach.',
    length: 810, breachLimit: 22,
    gates: recruitLanes([[18, -1],[141, 1],[273, -1],[404, 1],[553, -1],[692, 1]], 8),
    barricades: [[118, 0.61],[260, -0.60],[525, 0.60],[675, -0.61]],
    specialists: [[186, 0.63, 'leaper'], [420, -0.56, 'spitter']],
    waves: [[75, 0, 37],[182, 0.53, 6, 'runner'],[223, -0.08, 44],[349, -0.53, 9, 'runner'],
      [381, 0.08, 55],[536, 0.52, 10, 'runner'],[562, 0, 58],[697, -0.51, 12, 'runner']],
  },
  {
    name: 'Lockdown', scenery: 'checkpoint', title: 'Break the armor.', backdrop: drawHarbor,
    objective: 'Armored zombies take extra hits. Grab the large blue reinforcement gate before the checkpoint push.',
    length: 820, breachLimit: 21,
    gates: [...recruitLanes([[20, -1],[149, 1],[278, -1],[437, 1],[579, -1],[714, 1]], 8),[525, -0.66, 5]],
    barricades: [[112, 0.61],[333, -0.60],[567, 0.58],[690, -0.60]],
    specialists: [[208, 0.18, 'howler'], [423, -0.65, 'leaper']],
    waves: [[76, 0, 38],[213, 0.06, 10, 'armored'],[283, -0.09, 47],[377, -0.1, 12, 'armored'],
      [494, 0.1, 51],[635, 0.03, 16, 'armored'],[725, 0, 55]],
  },
  {
    name: 'Split Causeway', title: 'Defend both spans.', split: true,
    objective: 'Two hordes approach on separate spans. Stop the lead group, then cross to the other side.',
    length: 845, breachLimit: 26,
    gates: recruitLanes([[19, -1],[145, 1],[279, -1],[412, 1],[555, -1],[698, 1]], 8),
    barricades: [[121, 0.62],[394, -0.62],[681, 0.59]],
    specialists: [[127, 0.44, 'howler'], [315, -0.5, 'spitter'], [575, 0.58, 'leaper']],
    waves: [[85, -0.47, 28],[133, 0.47, 28],[244, 0.47, 36],[294, -0.47, 34],
      [407, -0.47, 39],[454, 0.47, 39],[586, 0.47, 44],[635, -0.47, 46]],
  },
  {
    name: 'Storm Surge', title: 'Stay clear of the spray.', lighting: 'storm',
    objective: 'Spray marks where storm debris will hit. Steer clear when the warning appears.',
    length: 860, breachLimit: 22,
    gates: recruitLanes([[19, -1],[151, 1],[285, -1],[423, 1],[567, -1],[714, 1]], 8),
    barricades: [[112, 0, 'debris'],[253, 0, 'debris'],[392, 0, 'debris'],[523, 0, 'debris'],[661, 0, 'debris'],[788, 0, 'debris']],
    specialists: [[162, 0.57, 'leaper'], [381, -0.52, 'spitter'], [532, 0.13, 'howler']],
    waves: [[77, 0.03, 40],[235, -0.04, 49],[385, 0.05, 52],[542, -0.05, 60],[700, 0.04, 62]],
  },
  {
    name: 'Tollgate', scenery: 'toll', title: 'Dodge the axe.', backdrop: drawHarbor,
    objective: 'The Tollkeeper swings twice. Dodge both red lanes, then fire while it recovers.',
    length: 810, breachLimit: 23,
    gates: recruitLanes([[17, -1],[141, 1],[275, -1],[411, 1],[555, -1],[695, 1]], 8),
    barricades: [[116, 0.61],[367, -0.57],[529, 0.59],[671, -0.57]],
    specialists: [[137, -0.64, 'spitter'], [362, 0.16, 'howler'], [590, 0.62, 'leaper']],
    waves: [[72, 0, 42],[219, -0.08, 49],[368, 0.08, 55],[521, 0, 60],[667, 0.03, 62]],
  },
  {
    name: 'Last Convoy', scenery: 'convoy', title: 'Meet the supply trucks.', backdrop: drawHarbor,
    objective: 'Supply trucks bring reinforcements between waves. Watch for runners, armor, and crates.',
    length: 920, breachLimit: 25,
    gates: [...recruitLanes([[18, -1],[172, 1],[347, -1],[514, 1],[697, -1],[842, 1]], 7),
      [133, 0.66, 6, 'truck'],[308, -0.66, 6, 'truck'],[472, 0.66, 7, 'truck'],[658, -0.66, 7, 'truck'],[811, 0.66, 8, 'truck']],
    barricades: [[211, 0.05],[388, -0.54],[590, 0.52],[788, -0.46]],
    specialists: [[219, -0.16, 'howler'], [388, 0.64, 'spitter'], [574, -0.53, 'leaper']],
    waves: [[68, 0, 42],[165, 0.48, 8, 'runner'],[239, -0.09, 11, 'armored'],[282, 0.04, 48],
      [416, -0.48, 10, 'runner'],[463, 0.02, 52],[574, 0.1, 13, 'armored'],[637, -0.06, 60],[779, 0, 64]],
  },
  {
    name: 'The Last Span', title: 'Hold the last span.', lighting: 'dawn', split: true,
    objective: 'Stop the split horde, break the armored push, then dodge the sentinel’s blade.',
    length: 1020, breachLimit: 28,
    gates: [...recruitLanes([[17, -1],[124, 1],[269, -1],[350, 1],[513, -1],[607, 1],[761, -1],[908, 1]], 8),
      [315, -0.66, 5],[686, 0.66, 5]],
    barricades: [[232, -0.60],[478, 0.57],[745, 0, 'debris'],[882, -0.55]],
    specialists: [[145, 0.43, 'howler'], [356, 0.64, 'leaper'], [538, -0.54, 'spitter'], [709, 0.49, 'leaper']],
    waves: [[80, -0.46, 31],[131, 0.46, 32],[210, -0.46, 36],[257, 0.46, 36],
      [421, -0.42, 12, 'armored'],[471, 0.42, 13, 'armored'],[514, -0.42, 42],[570, 0.42, 45],
      [741, -0.5, 10, 'runner'],[787, 0.5, 12, 'runner'],[859, 0.42, 39],[911, -0.42, 39]],
  },
  {
    name: 'Flooded Old Town', scenery: 'town', title: 'Defend the old aqueduct.', backdrop: drawOldTown, lighting: 'mist',
    objective: 'Watch the stairways. Raiders weave across both flanks between the main waves.',
    length: 890, breachLimit: 26,
    gates: recruitLanes([[16, -1], [154, 1], [310, -1], [468, 1], [622, -1], [767, 1]], 9),
    barricades: [[213, 0.61], [399, -0.54], [580, 0.61], [741, -0.56]],
    specialists: [[138, -0.56, 'leaper'], [275, 0.54, 'spitter'], [410, -0.14, 'howler'], [618, 0.61, 'leaper']],
    waves: [[83, 0, 36], [181, -0.52, 6, 'runner'], [230, -0.08, 44], [351, 0.53, 5, 'raider'],
      [415, 0, 50], [561, -0.52, 7, 'raider'], [627, 0.08, 55], [765, 0, 59]],
  },
  {
    name: 'Dry Dock', scenery: 'dock', title: 'Hold the shipyard.', backdrop: drawDryDock, lighting: 'dusk',
    objective: 'A Boiler Husk leads the dock workers. Watch for steam, then aim at its open furnace.',
    length: 930, breachLimit: 28,
    gates: [...recruitLanes([[16, -1], [159, 1], [310, -1], [490, 1], [649, -1], [806, 1]], 9),
      [394, 0.66, 6, 'truck'], [731, -0.66, 6, 'truck']],
    barricades: [[116, 0.59], [275, 0], [452, -0.60], [599, 0.54], [786, 0]],
    specialists: [[55, 0, 'boiler'], [204, 0.12, 'howler'], [286, -0.22, 'boiler'], [328, -0.58, 'spitter'], [488, 0.6, 'leaper'], [671, 0.16, 'howler']],
    waves: [[83, 0, 40], [202, 0.05, 9, 'armored'], [259, -0.05, 47], [413, 0.01, 13, 'armored'],
      [478, 0.11, 49], [654, -0.07, 14, 'armored'], [729, 0.01, 55], [829, 0.06, 41]],
  },
  {
    name: 'Tidal Lock', scenery: 'lock', title: 'Watch the sluice gates.', backdrop: drawTidalLock, lighting: 'storm',
    objective: 'Dodge lanes marked by foam. Stop the hulks before they reach the defense line.',
    length: 945, breachLimit: 27, debrisName: 'Sluice debris',
    gates: recruitLanes([[16, -1], [156, 1], [317, -1], [487, 1], [659, -1], [831, 1]], 9),
    barricades: [[139, 0, 'debris'], [276, 0, 'debris'], [435, 0, 'debris'], [571, 0, 'debris'],
      [708, 0, 'debris'], [858, 0, 'debris']],
    specialists: [[143, 0.61, 'spitter'], [288, -0.56, 'leaper'], [525, 0.15, 'howler'], [676, -0.64, 'spitter']],
    waves: [[81, 0.02, 38], [250, 0.03, 47], [374, -0.45, 8, 'runner'], [419, 0.04, 49],
      [568, -0.04, 52], [723, 0.03, 55], [778, 0.12, 3, 'hulk'], [849, 0, 49]],
  },
  {
    name: 'Canyon Viaduct', scenery: 'canyon', title: 'Hold the high crossing.', backdrop: drawCanyon, lighting: 'dawn', split: true,
    objective: 'Switch fire between the two spans. The faster horde can overtake the armored column.',
    length: 1060, breachLimit: 32,
    gates: [...recruitLanes([[16, -1], [155, 1], [305, -1], [467, 1], [625, -1], [784, 1], [934, -1]], 9),
      [537, -0.66, 5], [850, 0.66, 6]],
    barricades: [[137, 0.59], [357, -0.58], [593, 0.58], [754, 0.59], [899, -0.57]],
    specialists: [[153, 0.48, 'howler'], [306, 0.61, 'leaper'], [492, -0.55, 'spitter'], [652, -0.43, 'howler'], [775, 0.57, 'leaper']],
    waves: [[83, -0.48, 30], [133, 0.48, 31], [237, 0.44, 10, 'armored'], [286, -0.51, 8, 'runner'],
      [359, -0.48, 36], [409, 0.48, 36], [521, 0.44, 12, 'armored'], [571, -0.51, 10, 'runner'],
      [661, -0.48, 41], [711, 0.48, 43], [829, 0.49, 10, 'runner'], [889, -0.44, 13, 'armored'], [964, 0.48, 36]],
  },
  {
    name: 'Blackwater Channel', title: 'Face the red column.', lighting: 'dawn',
    objective: 'Hold the center against the red horde. Fast runners break through on the flanks.',
    length: 880, breachLimit: 55, startingSquad: 4, siege: {columns: 4, rowDepth: 6.9},
    gates: [...recruitLanes([[13, -1], [153, -1], [291, -1], [433, -1], [580, -1], [724, -1]], 15),
      [92, 0.66, 2, 'truck'], [368, 0.66, 9, 'truck'], [658, 0.66, 9, 'truck']],
    barricades: [[117, 0.55], [435, 0.56], [694, 0.54]],
    specialists: [[151, 0.08, 'howler'], [287, -0.52, 'leaper'], [329, 0.62, 'spitter'], [509, -0.1, 'howler'], [650, 0.52, 'leaper']],
    waves: [[72, -.16, 8], [210, .20, 26], [410, -.2, 44], [665, .08, 68], [285, -0.50, 5, 'runner'], [612, 0.50, 6, 'runner'], [828, -0.53, 7, 'runner']],
  },
  {
    name: 'Red Tide', scenery: 'lock', title: 'Hold through the surge.', backdrop: drawTidalLock, lighting: 'storm',
    objective: 'Dodge sluice debris and stop the hulks in the center. Raiders weave in from the sides.',
    length: 940, breachLimit: 64, startingSquad: 4, siege: {columns: 4, rowDepth: 6.9},
    debrisName: 'Sluice debris',
    gates: [...recruitLanes([[13, 1], [175, 1], [331, 1], [493, 1], [645, 1], [792, 1]], 16),
      [105, -0.66, 2, 'truck'], [411, -0.66, 9, 'truck'], [722, -0.66, 10, 'truck']],
    barricades: [[132, 0, 'debris'], [310, 0, 'debris'], [548, 0, 'debris'], [790, 0, 'debris']],
    specialists: [[141, -0.6, 'spitter'], [264, 0.05, 'howler'], [408, 0.58, 'leaper'], [452, -0.62, 'spitter'], [614, 0.05, 'howler'], [752, -0.52, 'leaper']],
    waves: [[76, .16, 8], [218, -.20, 33], [438, .18, 51], [708, -.08, 76], [236, 0.05, 3, 'hulk'], [465, -0.54, 5, 'raider'],
      [496, -0.05, 4, 'armored'], [602, 0.09, 4, 'hulk'], [883, 0.55, 7, 'raider']],
  },
  {
    name: 'Iron Narrows', scenery: 'dock', title: 'Break the last column.', backdrop: drawDryDock, lighting: 'dusk',
    objective: 'Shield bearers cover the column. Break through them while watching for hulks and raiders.',
    length: 1010, breachLimit: 73, startingSquad: 5, siege: {columns: 4, rowDepth: 6.9},
    gates: [...recruitLanes([[13, -1], [183, 1], [351, -1], [522, 1], [690, -1], [855, 1]], 17),
      [95, 0.66, 3, 'truck'], [440, 0.66, 12, 'truck'], [756, 0.66, 12, 'truck']],
    barricades: [[294, -0.56], [620, 0.57], [848, -0.55]],
    specialists: [[137, 0.12, 'howler'], [252, -0.56, 'leaper'], [303, 0.63, 'spitter'], [454, -0.13, 'howler'], [562, 0.54, 'leaper'], [657, -0.62, 'spitter'], [766, 0.1, 'howler']],
    waves: [[81, -.16, 8], [214, .20, 38], [416, -.18, 58], [696, .08, 84], [291, 0.08, 11, 'armored'], [521, -0.04, 13, 'armored'],
      [744, 0.05, 15, 'armored'], [210, 0, 3, 'shield'], [404, -0.50, 5, 'raider'],
      [490, -0.06, 3, 'hulk'], [548, 0.05, 4, 'shield'], [758, 0.50, 6, 'raider'],
      [814, 0.09, 5, 'shield'], [865, -0.05, 4, 'hulk']],
  },
  ...buildChapterLevels(),
  ...buildSpiralLevels(),
];
let levelIndex = 0;


const byId = id => document.getElementById(id);
const canvas = byId('scene');
const ctx = canvas.getContext('2d');
const stageCanvas = byId('breakwater');
const rendererStatus = byId('renderer-status');
let stageRenderer, rendererFailed = false;
function stageError(error) {
  rendererFailed = true;
  stageRenderer = undefined;
  stageCanvas.hidden = true;
  rendererStatus.textContent = '3D graphics unavailable. Playing in 2D. Reload to retry.';
  rendererStatus.hidden = false;
  console.error('Campaign 3D rendering failed', {level:levelIndex+1, fallback: true, fallbackRenderer: 'canvas2d', error});
}
function selectRenderer() {
  if (!rendererFailed && !stageRenderer) {
    try { stageRenderer = Breakwater.create(stageCanvas); }
    catch (error) { stageError(error); }
  }
  stageCanvas.hidden = !stageRenderer;
  rendererStatus.hidden = !rendererFailed;
}
stageCanvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  stageError('WebGL context lost');
});
stageCanvas.addEventListener('webglcontextrestored', () => {
  rendererFailed = false;
  selectRenderer();
});
function onStage() { return !stageCanvas.hidden; }
const overlay = byId('overlay');
const action = byId('action');
const replay = byId('replay');
const pause = byId('pause');
const bossResult = byId('boss-result');
const difficultySelect = byId('difficulty');
const levelSelect = byId('level-select');
const chapterOptions = new Map();
for (const [index, level] of levels.entries()) {
  const option = document.createElement('option');
  option.value = index;
  option.textContent = (index + 1) + '. ' + level.name;
  const chapter = level.chapter ?? (level.scenery==='spiral' ? spiral : null);
  if (chapter) {
    if (!chapterOptions.has(chapter)) {
      const group = document.createElement('optgroup');
      group.label = chapter.name;
      levelSelect.append(group);
      chapterOptions.set(chapter,group);
    }
    chapterOptions.get(chapter).append(option);
  } else levelSelect.append(option);
}
const entranceSetting = byId('entrance-camera');
const keys = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
let width, height, run, mode, previousTime, drag, scenery;

const soundButton = byId('sound');
const soundStatus = byId('sound-status');
const combatStatus = byId('combat-status');
let audio, audioOutput, noiseBuffer, muted = false;

let deathRecordingsReady, deathVoice;

function updateAudioVolume() {
  if (audioOutput) audioOutput.gain.setValueAtTime(
    muted || mode === 'paused' ? 0 : config.audioVolume, audio.currentTime);
}

async function enableAudio() {
  if (muted) return;
  try {
    if (!audio) {
      audio = new AudioContext();
      audioOutput = audio.createGain();
      audioOutput.connect(audio.destination);
      noiseBuffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.2), audio.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      updateAudioVolume();
    }
    if (audio.state !== 'running') await audio.resume();
    soundStatus.hidden = true;
    deathRecordingsReady ??= decodeDeathRecordings();
    if (!await deathRecordingsReady) deathRecordingsReady = undefined;
  } catch (error) {
    console.error('Could not initialize game sound', error);
    soundStatus.textContent = 'Sound unavailable. Select Sound off, then Sound on to retry.';
    soundStatus.hidden = false;
  }
}

function soundEnabled() {
  return !muted && audio?.state === 'running' && mode !== 'paused';
}

async function decodeDeathRecordings() {
  try {
    const decodePool = async recordings => {
      const samples = await Promise.all(recordings.map(encoded => {
        const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
        return audio.decodeAudioData(bytes.buffer);
      }));
      return {samples, remaining: [], last: undefined};
    };
    const [heavy, boss] = await Promise.all([decodePool(heavyRecordings), decodePool(undeadRecordings)]);
    return {heavy, boss};
  } catch (error) {
    console.error('Zombie death recordings could not be decoded', {fallback: true, using: 'impact sounds only', error});
    soundStatus.textContent = 'Zombie voices unavailable. Other sounds are on. Toggle Sound off and on to retry.';
    soundStatus.hidden = false;
    return null;
  }
}

// Keep the rotation across missions, including when a boss interrupts another voice.
function nextDeathTake(pool) {
  if (!pool.remaining.length) pool.remaining.push(...pool.samples.keys());
  const choices = pool.remaining.length === 1 ? pool.remaining : pool.remaining.filter(take => take !== pool.last);
  const take = choices[Math.floor(Math.random() * choices.length)];
  pool.remaining.splice(pool.remaining.indexOf(take), 1);
  pool.last = take;
  return pool.samples[take];
}

async function playDeathGroan(boss) {
  const battle = run;
  const pools = await deathRecordingsReady;
  if (!pools || run !== battle || !soundEnabled()) return;
  if (!boss && (deathVoice || mode !== 'running')) return;
  deathVoice?.stop();
  const voice = audio.createBufferSource();
  deathVoice = voice;
  voice.buffer = nextDeathTake(boss ? pools.boss : pools.heavy);
  voice.connect(audioOutput);
  voice.onended = () => {
    voice.disconnect();
    if (deathVoice === voice) deathVoice = undefined;
  };
  voice.start();
}

// Each effect uses a short, decaying envelope. Offsets let tones form a chime.
function playSound(type, gain = 1) {
  if (!soundEnabled()) return;

  function voice({frequency, end = frequency, duration, volume, offset = 0, wave = 'sine', noise = false}) {
    const now = audio.currentTime + offset;
    const envelope = audio.createGain();
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    envelope.connect(audioOutput);

    let source, filter;
    if (noise) {
      source = audio.createBufferSource();
      source.buffer = noiseBuffer;
      filter = audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = frequency;
      source.connect(filter).connect(envelope);
    } else {
      source = audio.createOscillator();
      source.type = wave;
      source.frequency.setValueAtTime(frequency, now);
      source.frequency.exponentialRampToValueAtTime(end, now + duration);
      source.connect(envelope);
    }
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      envelope.disconnect();
    };
    source.start(now);
    source.stop(now + duration);
  }

  switch (type) {
    case 'fire':
      weaponEffects[run.weapons.at(-1) ?? 'standard'].voices.forEach(voice);
      break;
    case 'equip':
      voice({frequency: 390,end:690,duration:.075,volume:.22,wave:'triangle'});
      voice({frequency: 810,end:1240,duration:.16,volume:.18,offset:.055});
      break;
    case 'iceCrack':
      voice({frequency: 3900, duration: .08, volume: .15, noise: true});
      voice({frequency: 1300, end: 370, duration: .12, volume: .1});
      break;
    case 'grate':
      voice({frequency: 480, end: 180, duration: .13, volume: .16, wave: 'square'});
      voice({frequency: 1800, duration: .1, offset: .08, volume: .12, noise: true});
      break;
    case 'seed':
      voice({frequency: 360, end: 680, duration: .15, volume: .18, wave: 'triangle'});
      break;
    case 'boilerVent':
      voice({frequency: 2650, duration: .42, volume: .24, noise: true});
      voice({frequency: 185, end: 270, duration: .19, volume: .14, wave: 'triangle'});
      break;
    case 'howl':
      voice({frequency: 290, end: 115, duration: .31, volume: .15, wave: 'sawtooth'});
      break;
    case 'bodyFall':
    case 'heavyFall': {
      const heavy=type==='heavyFall';
      voice({frequency:heavy?88:145,end:42,duration:heavy?.19:.09,volume:.19*gain,wave:'triangle'});
      voice({frequency:heavy?780:540,duration:.07,volume:.12*gain,noise:true});
      break;
    }
    case 'bossStep':
      voice({frequency: 115, end: 43, duration: .22, volume: .40 * gain, wave: 'triangle'});
      voice({frequency: 360, duration: .11, volume: .24 * gain, noise: true});
      break;
    case 'bossWindup':
      voice({frequency: 245, end: 490, duration: .26, volume: .21, wave: 'triangle'});
      voice({frequency: 980, duration: .10, offset: .09, volume: .11, noise: true});
      break;
    case 'bossSwing':
      voice({frequency: 2100, duration: .10, volume: .23, noise: true});
      voice({frequency: 220, end: 87, duration: .13, volume: .17, wave: 'triangle'});
      break;
    case 'bossSmash':
      voice({frequency: 155, end: 39, duration: .29, volume: .40, wave: 'triangle'});
      voice({frequency: 1850, duration: .075, volume: .30, noise: true});
      voice({frequency: 490, duration: .17, offset: .07, volume: .15, noise: true});
      break;
    case 'bossLeapReady':
      voice({frequency: 145, end: 465, duration: .38, volume: .20, wave: 'triangle'});
      break;
    case 'bossTakeoff':
      voice({frequency: 1450, duration: .24, volume: .21, noise: true});
      voice({frequency: 160, end: 360, duration: .24, volume: .18, wave: 'triangle'});
      break;
    case 'bossLanding':
      voice({frequency: 105, end: 32, duration: .41, volume: .43, wave: 'triangle'});
      voice({frequency: 720, duration: .21, volume: .25, noise: true});
      voice({frequency: 220, duration: .22, offset: .10, volume: .14, noise: true});
      break;
    case 'axeImpact':
      voice({frequency: 106, end: 35, duration: 0.23, volume: 0.33, wave: 'triangle'});
      voice({frequency: 630, duration: 0.12, volume: 0.23, noise: true});
      break;
    case 'warning':
      voice({frequency: 270, end: 105, duration: 0.18, volume: 0.21, wave: 'triangle'});
      break;
    case 'armorHit':
      voice({frequency: 970, end: 490, duration: .075, volume: .16, wave: 'triangle'});
      voice({frequency: 2200, duration: .05, volume: .11, noise: true});
      break;
    case 'hit':
      voice({frequency: 750, duration: 0.05, volume: 0.11, noise: true});
      break;
    case 'recruit':
      voice({frequency: 540, duration: 0.11, volume: 0.18, wave: 'triangle'});
      voice({frequency: 810, duration: 0.18, volume: 0.15, offset: 0.065, wave: 'triangle'});
      break;
    case 'damage':
      voice({frequency: 175, end: 60, duration: 0.19, volume: 0.31, wave: 'triangle'});
      voice({frequency: 510, duration: 0.13, volume: 0.25, noise: true});
      break;
    case 'won':
    case 'lost': {
      const notes = type === 'won' ? [392, 494, 587, 784] : [294, 220, 147];
      const mix = type === 'won' && run.bossGroan ? deathGroan.victoryChimeGain : 1;
      notes.forEach((frequency, index) => voice({frequency, duration: 0.34, volume: 0.18 * mix,
        offset: index * 0.115, wave: 'triangle'}));
      break;
    }
  }
}

soundButton.addEventListener('click', () => {
  muted = !muted;
  soundButton.textContent = muted ? 'Sound off' : 'Sound on';
  soundButton.setAttribute('aria-pressed', String(!muted));
  updateAudioVolume();
  if (!muted) void enableAudio();
});

const environmentArt = byId('environment-art');
const environmentStatus = byId('environment-status');
environmentArt.addEventListener('error', () => {
  const scene = environmentArt.dataset.scene;
  if (!scene) return;
  environmentArt.hidden = true;
  console.error('Campaign backdrop unavailable', {scene, fallback:true, using:'chapter deck and scenery'});
  environmentStatus.textContent = 'Backdrop unavailable. Showing the stage geometry. Reload to retry.';
  environmentStatus.hidden = false;
});
function setEnvironment(level) {
  const field = stageCanvas.parentElement;
  field.classList.toggle('spiral-field',level.scenery==='spiral');
  const scene = level.chapter ? level.scenery : '';
  if (scene === (environmentArt.dataset.scene ?? '')) return;
  environmentStatus.hidden = true;
  environmentArt.dataset.scene = scene;
  environmentArt.hidden = !scene;
  if (scene) {
    field.dataset.environment = scene;
    field.style.backgroundColor = level.chapter.surface[1];
    environmentArt.src = 'assets/environments/' + scene + '.webp';
  } else {
    delete field.dataset.environment;
    field.style.backgroundColor = '';
    environmentArt.removeAttribute('src');
  }
}

const checkpointKey = 'deadwater.campaign.v1';
const saveStatus = byId('save-status');
let returningPlayer = false;

function restoreCheckpoint() {
  try {
    const stored = localStorage.getItem(checkpointKey);
    if (stored === null) return;
    const checkpoint = JSON.parse(stored);
    const index = levels.findIndex(level => level.name === checkpoint?.level);
    if (index < 0 || typeof checkpoint.difficulty !== 'string' || !Object.hasOwn(difficulties, checkpoint.difficulty)) {
      throw new Error('Unrecognized campaign checkpoint');
    }
    levelIndex = index;
    difficultySelect.value = checkpoint.difficulty;
    returningPlayer = true;
  } catch (error) {
    console.error('Campaign checkpoint could not be restored', {fallback: true, using: 'level selector', error});
    saveStatus.textContent = 'Your saved level could not be opened. Choose a level to continue.';
    saveStatus.hidden = false;
  }
}

function saveCheckpoint(index) {
  try {
    localStorage.setItem(checkpointKey, JSON.stringify({level: levels[index].name, difficulty: difficultySelect.value}));
    saveStatus.hidden = true;
  } catch (error) {
    console.error('Campaign checkpoint could not be saved', {fallback: true, using: 'session only', level: index + 1, error});
    saveStatus.textContent = 'Your level could not be saved on this device. Allow site storage to keep your place.';
    saveStatus.hidden = false;
  }
}

function reset(nextMode) {
  deathVoice?.stop();
  deathVoice = undefined;
  selectRenderer();
  const level = levels[levelIndex];
  setEnvironment(level);
  const difficultyName = difficultySelect.selectedOptions[0].textContent.toUpperCase();
  levelSelect.value = levelIndex;
  byId('level-number').textContent = 'LEVEL ' + String(levelIndex + 1).padStart(2, '0') + ' · ' + difficultyName;
  byId('level-name').textContent = level.name;
  const difficulty = difficulties[difficultySelect.value];
  const gates = buildGates(level, difficulty);
  const encounters = rollEncounters(level, levelIndex + 1, gates);
  const kinds = new Set(encounters.map(([, , kind]) => kind));
  byId('level-brief').textContent = [level.brief ?? level.objective, 'Steel helmets mark armored zombies that take several shots.', ...Array.from(kinds, kind => enemyTypes[kind].tip)].join(' ');
  for (const kind of kinds) if (encounterTuning.roster.includes(kind)) loadPaintedAtlas(kind);
  const profile = level.boss ?? bossRoster[levelIndex];
  const bossTier = level.bossTier ?? levelIndex;
  for (const key of characterSprites.keys()) {
    if (key.startsWith('brute:')) characterSprites.delete(key);
  }
  const weapon = bossWeapons[profile.tool];
  byId('boss-name').textContent = profile.name + ' · ' + weapon.label + ' & shield';
  run = {
    difficulty,
    breachLimit: Math.ceil(level.breachLimit * difficulty.breaches),
    fireInterval: config.fireInterval, fireRange: config.fireRange, aimBonus: 0,
    volleyBonus: 0, scatter: false, lastVolleyAt: -Infinity, armor: difficulty.startingArmor, weapons: [],
    caches: [
      ...(level.weaponDrops ?? armory.drops).flatMap(({at, distance, choices}, drop) => choices.map((kind, option) => ({
        z: distance ?? level.length * at, x: (option === (levelIndex + drop) % 2 ? -1 : 1) * (level.weaponLane ?? armory.lane), drop, kind,
      }))),
      ...(level.supplies ?? armory.supplies).map(({at, distance, kind}, index) => ({
        z: distance ?? level.length * at, x: ((levelIndex + index) % 2 ? -1 : 1) * armory.lane, kind,
      })),
    ].map(cache => ({
      ...cache, health: armory.tuning[cache.kind].hits + armory.tuning[cache.kind].hitStep * difficulty.armor,
    })),
    elapsedDistance: 0, elapsed: 0, crowd: 0, runnerCueUntil: 0, x: 0, velocity: 0, count: level.startingSquad ?? config.startingSquad, kills: 0, breaches: 0,
    entrance: {cue: null, pan: 0, pitch: 0, dolly: 0, specialistShown: false},
    ice: [], pods: [], slowUntil: 0,
    chapterSignals: (level.signals ?? []).map(([at,x])=>({at:at*level.length,x})),
    events: (levelIndex % 2 ? ['ambush', 'supply'] : ['supply', 'ambush']).map((kind, index) => ({
      kind, at: level.length * (index ? fieldEvents.second : fieldEvents.first),
    })),
    cooldown: 0, flash: 0, contactCooldown: 0, shots: [], impacts: [], fallen: [], recruits: [],
    gates,
    barricades: level.barricades.map(([z, x, kind]) => ({z, x, kind, startX: x, distance: z})),
    enemies: level.waves.flatMap(wave => formWave(wave, level, difficulty)),
  };
  run.specialists = encounters.map(([z, x, kind]) => {
    const type = enemyTypes[kind];
    return {z, x, kind, size: type.size, health: type.health + difficulty.armor, gaitOffset: z};
  });
  run.enemies.push(...run.specialists);
  run.acid = [];
  run.specialBursts = [];
  run.cameraX = 0;
  if(level.turret){
    run.turret={x:spiral.lane,z:spiral.turretDepth,kind:'spread',station:'turret',health:spiral.turretHits,cooldown:0};
    run.caches.push(run.turret);
  }
  if(level.roller){
    run.roller={x:0,z:140,kind:'armor',station:'roller',health:spiral.rollerHits};
    run.caches.push(run.roller);
  }
  setupFlow(level);
  const health = Math.ceil((charge.health + charge.healthPerLevel * bossTier) * difficulty.bruteHealth);
  const shield = Math.ceil((charge.shield + charge.shieldPerLevel * bossTier) * difficulty.bruteHealth);
  run.enemies.push({
    z: level.length + 14, x: 0, health, maxHealth: health, shield, maxShield: shield, boss: true,
    size: charge.size + charge.sizePerLevel * bossTier,
    profile, weapon, reach: weapon.reach, finish: bruteFinishes[levelIndex % bruteFinishes.length],
    windupTime: charge.warning * difficulty.warning * weapon.windup * (profile.tempo ?? 1),
    swingTime: (charge.swingTime - bossTier * charge.swingTimePerLevel) * difficulty.warning * weapon.swing,
    attackWidth: (charge.width + charge.widthPerLevel * bossTier) * difficulty.strikeWidth *
      weapon.width * (profile.width ?? 1),
    recoveryTime: charge.recovery * difficulty.recovery * (profile.recovery ?? 1),
    damage: charge.damage + Math.floor(bossTier / 3) * charge.damagePerTier +
      difficulty.bruteDamage + (profile.power ?? 0),
  });
  combatStatus.hidden = true;
  bossResult.hidden = true;
  setMode(nextMode);
  updateHud();
}

function setMode(nextMode) {
  const resumingPause = mode === 'paused' && nextMode === 'running';
  mode = nextMode;
  if (mode === 'running' && !resumingPause) {
    returningPlayer = false;
    saveCheckpoint(levelIndex);
  } else if (mode === 'won') {
    saveCheckpoint(Math.min(levelIndex + 1, levels.length - 1));
  }
  if (mode === 'won' || mode === 'lost') clearEntranceCue();
  byId('equipped').hidden = !run.weapons.length || mode !== 'running';
  updateAudioVolume();
  if (mode === 'won' || mode === 'lost') playSound(mode);
  keys.clear();
  drag = undefined;
  overlay.hidden = mode === 'running';
  byId('difficulty-control').hidden = mode === 'running' || mode === 'won';
  byId('level-control').hidden = mode !== 'ready';
  byId('difficulty-label').textContent = mode === 'paused' ? 'Difficulty (restarts level)' : 'Difficulty';
  const level = levels[levelIndex];
  const canAdvance = mode === 'won' && levelIndex + 1 < levels.length;
  replay.hidden = !canAdvance;
  byId('steering-hint').hidden = mode !== 'ready';
  if (mode !== 'running') combatStatus.hidden = true;
  bossResult.hidden = mode === 'ready' || mode === 'paused' || !run.bruteImpact;
  pause.disabled = mode !== 'running' && mode !== 'paused';
  pause.textContent = mode === 'paused' ? '▶' : 'Ⅱ';
  pause.title = mode === 'paused' ? 'Resume game' : 'Pause game';
  pause.setAttribute('aria-label', pause.title);
  if (mode === 'running') {
    if (document.activeElement === action) canvas.focus();
    return;
  }
  const stage = level.name.toUpperCase();
  const breached = run.breaches >= run.breachLimit;
  const messages = {
    ready: [level.chapter ? level.chapter.name.toUpperCase() + ' · ' + (level.part+1) + '/' + level.chapter.missions.length : stage, level.title, level.objective, returningPlayer ? 'Continue level ' + (levelIndex + 1) : 'Deploy squad'],
    paused: [stage, 'Paused.', 'Resume when your squad is ready.', 'Resume'],
    won: [canAdvance ? 'MISSION COMPLETE' : 'CAMPAIGN COMPLETE', canAdvance ? 'Bridge secured.' : 'All crossings secured.', run.count + ' survived · ' + run.kills + ' eliminated.', canAdvance ? 'Next level' : 'Play again'],
    lost: ['MISSION FAILED', breached ? 'Bridge breached.' : 'Squad lost.',
      breached ? run.breaches + ' zombies crossed the defense line. Return to the center when a wave closes in.' : run.lastThreat + ' took out the last squad member.' + (run.bruteImpact?.lost
        ? ' Last boss strike: ' + damageSummary(run.bruteImpact.blocked, run.bruteImpact.lost) + '.' : ''), 'Try again'],
  };
  const [label, title, description, button] = messages[mode];
  byId('state-label').textContent = label;
  byId('state-title').textContent = title;
  byId('state-description').textContent = description;
  action.firstChild.textContent = button + ' ';
  if (mode !== 'ready') action.focus();
}

function updateHud() {
  const level = levels[levelIndex];
  const percent = Math.floor(run.elapsedDistance / level.length * 100);
  byId('distance').value = percent;
  byId('percent').textContent = percent + '%';
  const squad = byId('squad');
  const squadCount = String(Math.round(displayedSquadCount()));
  if (squad.textContent !== squadCount) squad.textContent = squadCount;
  const breaches = byId('breaches');
  const tally = run.breaches + ' / ' + run.breachLimit;
  if (breaches.textContent !== tally) breaches.textContent = tally;
  breaches.classList.toggle('breach-warning', run.breaches > 0);
  byId('kills').textContent = String(run.kills).padStart(2, '0');
  const loadout = byId('loadout');
  const currentLoadout = run.weapons.map(kind => armory.tuning[kind].label).join(' · ') || 'Standard';
  if (loadout.textContent !== currentLoadout) loadout.textContent = currentLoadout;
  const equipped = run.weapons.at(-1);
  const readout = byId('equipped');
  readout.hidden = !equipped || mode !== 'running';
  if (readout.dataset.kind !== (equipped ?? '')) {
    readout.dataset.kind = equipped ?? '';
    if (equipped) {
      const item = armory.tuning[equipped];
      readout.style.setProperty('--gun-color',item.color);
      byId('equipped-name').textContent = item.label;
      byId('equipped-benefit').textContent = weaponBenefit(equipped);
      readout.title = run.weapons.map(kind=>armory.tuning[kind].label+' · '+weaponBenefit(kind)).join(' / ');
      Breakwater.badge(byId('equipped-icon'),equipped);
    }
  }
  byId('armor').textContent = run.armor;
}

function damage(count, threat, announce = true) {
  const blocked = Math.min(run.armor, count);
  run.armor -= blocked;
  const lost = Math.min(run.count, count - blocked);
  if (lost) {
    changeSquadSize(-lost, run.x);
    run.lastThreat = threat;
    run.flash = config.damageFlash;
    playSound('damage');
  }
  if (announce && (blocked || lost)) combatNotice(threat + ' · ' + damageSummary(blocked, lost));
  return {blocked, lost};
}

function damageSummary(blocked, lost) {
  return [
    lost ? (lost === 1 ? '1 soldier lost' : lost + ' soldiers lost') : '',
    blocked ? blocked + ' blocked by armor' : '',
  ].filter(Boolean).join(' · ');
}

function combatNotice(message) {
  run.combatNoticeUntil = run.elapsed + config.combatNoticeTime;
  combatStatus.textContent = message;
  combatStatus.hidden = false;
}

function triggerFieldEvent(event) {
  event.started = true;
  const side = run.x <= 0 ? 1 : -1;
  const lane = side < 0 ? 'left' : 'right';
  if (event.kind === 'supply') {
    run.gates.push({z: fieldEvents.supplyDistance, x: side * 0.66, count: Math.ceil(fieldEvents.bonus * run.difficulty.supplies), kind: 'truck'});
    combatNotice('Supply truck incoming on the ' + lane);
    playSound('recruit');
    return;
  }
  const runners = Array.from({length: Math.ceil(fieldEvents.runners * run.difficulty.waveSize)}, (_, index) => ({
    z: fieldEvents.ambushDistance + index * fieldEvents.runnerSpacing,
    x: side * (0.56 + (index % 2) * 0.08), health: enemyTypes.runner.health, kind: 'runner',
  }));
  run.enemies.splice(run.enemies.length - 1, 0, ...runners);
  combatNotice('Ambush on the ' + lane);
  playSound('warning');
}

function markBruteStep(enemy, distance, direction) {
  const oldTravel = enemy.travel ?? 0;
  enemy.travel = oldTravel + distance;
  const previousPlant = Math.floor(oldTravel / charge.strideDistance);
  const plant = Math.floor(enemy.travel / charge.strideDistance);
  if (plant !== previousPlant && enemy.z < cameraViewDistance()) {
    run.bruteFootfall = {x: enemy.x, z: enemy.z, time: run.elapsed, side: (plant % 2 ? 1 : -1) * direction};
    playSound('bossStep', project(enemy.x, enemy.z)[2]);
  }
}

function startBossWindup(enemy, followup = false) {
  enemy.activeWarning = enemy.windupTime * (followup ? bossFollowup.warningMultiplier : 1);
  enemy.windupUntil = run.elapsed + enemy.activeWarning;
  if (!followup) enemy.attackNumber = (enemy.attackNumber ?? 0) + 1;
  enemy.leaping = !followup && enemy.attackNumber % charge.leapEvery === 0;
  enemy.swingStarted = false;
  if (enemy.leaping) {
    enemy.takeoffX = enemy.x;
    enemy.landingX = run.x;
  }
  const cue = enemy.leaping ? 'Leap incoming' : enemy.weapon.cue;
  combatNotice((followup ? 'Follow-up · ' : '') + cue + ' · steer out of the red lane');
  playSound(enemy.leaping ? 'bossLeapReady' : 'bossWindup');
}

function advanceBrute(enemy, dt) {
  if (enemy.recoverUntil > run.elapsed) return;
  if (enemy.windupUntil !== undefined) {
    const elapsed = run.elapsed - enemy.windupUntil;
    if (elapsed < 0) {
      const track = enemy.leaping ? 0 : (enemy.weapon.track ?? 0);
      if (-elapsed > enemy.activeWarning * (1 - track)) {
        enemy.x += clamp(run.x - enemy.x, -config.steering * dt / 2, config.steering * dt / 2);
      }
      return;
    }
    const swing = bruteSwingProgress(enemy, run.elapsed);
    if (!enemy.swingStarted) {
      enemy.swingStarted = true;
      playSound(enemy.leaping ? 'bossTakeoff' : 'bossSwing');
      if (enemy.leaping) run.bruteFootfall = {x: enemy.x, z: enemy.z, time: run.elapsed, side: 0};
    }
    if (enemy.leaping) {
      enemy.x = enemy.takeoffX + (enemy.landingX - enemy.takeoffX) * swing;
      enemy.height = 4 * swing * (1 - swing) * charge.leapHeight;
    }
    enemy.z = enemy.reach * (1 - (enemy.leaping ? swing : swing * swing));
    if (swing < 1) return;

    const landed = enemy.leaping;
    const attack = landed ? 'Leap smash' : enemy.weapon.attack;
    playSound(landed ? 'bossLanding' : 'bossSmash');
    enemy.lastStrikeAt = run.elapsed;
    const {left, right, front, back, formation} = bruteStrikeLane(enemy);
    const struck = formation.members
      .filter(({x}) => x + formation.radiusX >= left && x - formation.radiusX <= right)
      .sort((a, b) => Math.abs(a.x - (left + right) / 2) - Math.abs(b.x - (left + right) / 2));
    // The visible formation represents the full squad, including reserves in large squads.
    const exposedCount = formation.members.length
      ? Math.ceil(run.count * struck.length / formation.members.length) : 0;
    const power = enemy.damage + Math.ceil(run.count * charge.squadDamage);
    const before = run.count;
    const {blocked, lost} = damage(Math.min(exposedCount, power), attack, false);
    const [squadCenter] = project(run.x, 0);
    const directHit = squadCenter >= left && squadCenter <= right;
    enemy.guarded = directHit;
    if(levels[levelIndex].scenery==='cinder' && Math.abs(Math.abs(enemy.x)-encounterFlow.pipeLane)<encounterFlow.pipeWidth){
      run.pipeBurst={lane:Math.sign(enemy.x)*encounterFlow.pipeLane,until:run.elapsed+encounterFlow.steamTime};
      enemy.shield=Math.max(0,enemy.shield-encounterFlow.pipeShield);
      playSound('boilerVent');
    }
    run.bruteImpact = {
      x: enemy.x, time: run.elapsed, left: left / width, right: right / width,
      front: front / height, back: back / height, blocked, lost, landed,
      strikes: struck.slice(0, blocked + lost).map(member => [member.x / width, member.y / height]),
    };
    const outcome = lost || blocked ? damageSummary(blocked, lost) : 'Dodged';
    bossResult.textContent = (run.pipeBurst?.until>run.elapsed?'Pipe ruptured · ':'') + attack + ' · ' + outcome + ' · Squad ' + before + ' → ' + run.count;
    bossResult.dataset.outcome = lost ? 'hit' : blocked ? 'armor' : 'dodge';
    bossResult.hidden = false;

    if (enemy.profile.followup && !enemy.followupUsed) {
      enemy.followupUsed = true;
      enemy.z = enemy.reach;
      enemy.x += clamp(run.x - enemy.x, -enemy.attackWidth, enemy.attackWidth);
      startBossWindup(enemy, true);
      return;
    }
    combatNotice(directHit ? 'Boss guarded · move your squad center out of the red lane' :
      (enemy.shield ? 'Boss exposed · fire to break its shield' : 'Boss exposed · fire now'));
    enemy.followupUsed = false;
    enemy.leaping = false;
    enemy.windupUntil = undefined;
    enemy.recoverUntil = run.elapsed + enemy.recoveryTime;
    enemy.retreating = true;
    return;
  }

  const travel = config.enemySpeed * run.difficulty.pace * (enemy.profile.pace ?? 1) * dt;
  if (enemy.retreating) {
    const before = enemy.z;
    enemy.z = Math.min(charge.resetDistance, enemy.z + travel);
    markBruteStep(enemy, enemy.z - before, -1);
    if (enemy.z === charge.resetDistance) enemy.retreating = false;
    return;
  }

  const before = enemy.z;
  enemy.z = Math.max(enemy.reach, enemy.z - travel);
  if (enemy.z < config.fireRange) {
    enemy.x += clamp(run.x - enemy.x, -config.steering * dt / 2, config.steering * dt / 2);
  }
  markBruteStep(enemy, before - enemy.z, 1);
  if (enemy.z === enemy.reach) startBossWindup(enemy);
}

function bruteSwingProgress(enemy, time) {
  const duration = enemy.leaping ? charge.leapTime / run.difficulty.pace : enemy.swingTime;
  return clamp((time - enemy.windupUntil) / duration, 0, 1);
}

function bruteFollowthrough(enemy, time) {
  const settle = Math.max(0, 1 - (time - (enemy.lastStrikeAt ?? -Infinity)) / charge.followthroughTime);
  if (!enemy.leaping) return settle;
  if (time < enemy.windupUntil) return Math.max(settle, bruteAttackPose(enemy, time) * .65);
  return Math.max(settle, Math.sin(Math.PI * bruteSwingProgress(enemy, time)) * .85);
}

function bruteAttackPose(enemy, time) {
  if (enemy.windupUntil === undefined) return -bruteFollowthrough(enemy, time) * .24;
  const remaining = enemy.windupUntil - time;
  if (remaining > 0) {
    const lift = clamp(1 - remaining / enemy.activeWarning, 0, 1);
    return 0.5 - 0.5 * Math.cos(Math.PI * lift);
  }
  const swing = bruteSwingProgress(enemy, time);
  if (enemy.leaping) return 1 - swing ** 4;
  return 1 - swing * swing;
}

function defeatEnemy(enemy, sourceX, blast = false) {
  run.kills++;
  const type = enemyTypes[enemy.kind];
  const fast = enemy.kind === 'runner' || enemy.kind === 'raider';
  const heavy = enemy.boss || enemy.kind === 'hulk' || enemy.kind === 'armored' || ['boiler', 'breaker', 'frost'].includes(enemy.kind);
  const seed = Math.sin(run.kills * 2.399 + enemy.x * 7);
  if (soundEnabled() && (enemy.boss || largeZombieKinds.has(enemy.kind))) {
    if (enemy.boss) run.bossGroan = true;
    void playDeathGroan(enemy.boss);
  }
  const lateral = clamp((enemy.x - sourceX) * 2 + seed * .73, -1, 1);
  const forward = fast || (enemy.height ?? 0) > 0 || (!blast && seed < -.45);
  const angle = Math.atan2(lateral, forward ? -1 : 1);
  const height = enemy.height ?? 0;
  let vy = 0, vx = Math.sin(angle) * (blast ? .9 : .31);
  let vz = Math.cos(angle) * (fast ? 12 : blast ? 10 : 5);
  if (height && enemy.attack) {
    const flight = type.flight / run.difficulty.pace;
    const t = clamp((run.elapsed - enemy.attack.release) / flight, 0, 1);
    vy = 4 * type.height * (1 - 2*t) / flight;
    vx = (enemy.attack.targetX - enemy.attack.fromX) / flight;
    vz = -enemy.attack.fromZ / flight;
  }
  const airTime = (vy + Math.sqrt(vy*vy + 2*falls.gravity*height)) / falls.gravity;
  const drop = (heavy ? falls.heavyDrop : falls.drop) * (1 + seed*.13);
  run.fallen.push({...enemy, tool:enemy.profile?.tool, time:run.elapsed, age:0, angle, vx, vz, vy,
    startX:enemy.x, startZ:enemy.z, startHeight:height, height, heavy, airTime, drop,
    contact:Math.max(airTime,drop), tilt:0, fold:0, fade:0});
}

function advanceFalls(dt) {
  for (const body of run.fallen) {
    const previous = body.age;
    body.age += dt;
    const air = Math.min(body.age, body.airTime);
    const slide = falls.slideTime * (1 - Math.exp(-Math.max(0,body.age-air)/falls.slideTime));
    body.x = clamp(body.startX + body.vx*(air+slide), -.98, .98);
    body.z = body.startZ + body.vz*(air+slide);
    body.height = body.age >= body.airTime ? 0 : Math.max(0, body.startHeight + body.vy*air - .5*falls.gravity*air*air);
    const t = Math.min(1,body.age/body.drop);
    const landed = Math.max(0,body.age-body.contact);
    body.fold = Math.sin(t*Math.PI*.72);
    body.tilt = t*t*(2-t)*Math.PI*.49 - .09*Math.sin(landed*27)*Math.exp(-landed*11);
    body.fade = clamp((landed-falls.hold)/falls.fade,0,1);
    if (previous < body.contact && body.age >= body.contact && body.z < falls.soundRange &&
        (run.nextBodySound ?? 0) <= body.time + body.age) {
      playSound(body.heavy ? 'heavyFall' : 'bodyFall', clamp(1-body.z/falls.soundRange,.15,1));
      run.nextBodySound = body.time + body.age + falls.soundGap;
    }
  }
  run.fallen = run.fallen.filter(body => body.fade < 1);
}

function unlockCache(cache) {
  if (cache.passed) return;
  if(cache.station){
    cache.passed=true;
    combatNotice(cache.station==='turret'?'Turret online':'Roller destroyed');
    playSound(cache.station==='turret'?'equip':'axeImpact');
    return;
  }
  if (cache.action) { useRailPanel(cache); return; }
  if (cache.drop !== undefined) {
    for (const other of run.caches) {
      if (other.drop === cache.drop) other.passed = true;
    }
    run.weapons.push(cache.kind);
  }
  cache.passed = true;
  const upgrade = armory.tuning[cache.kind];
  switch (cache.kind) {
    case 'rapid':
      run.fireInterval *= upgrade.intervalMultiplier;
      run.cooldown = Math.min(run.cooldown, run.fireInterval);
      break;
    case 'spread':
      run.volleyBonus += upgrade.rounds;
      break;
    case 'scatter':
      run.scatter = true;
      break;
    case 'longshot':
      run.fireRange += upgrade.range;
      run.aimBonus += upgrade.aim;
      break;
    case 'rescue':
      changeSquadSize(Math.ceil(armory.rescueCount * run.difficulty.supplies), cache.x);
      combatNotice('Rescue crate · ' + run.count + ' in squad');
      break;
    case 'armor':
      run.armor += armory.armorCount;
      combatNotice('Armor crate · ' + run.armor + ' protection');
      break;
    case 'drum':
      run.blast = {x: cache.x, z: cache.z, time: run.elapsed};
      for (const enemy of run.enemies) {
        if (enemy.boss || enemy.passed || enemy.phase === 'tunnel' || enemy.health <= 0 || enemy.z < 0 ||
            Math.abs(enemy.z - cache.z) > armory.drumDepth || Math.abs(enemy.x - cache.x) > armory.drumWidth) continue;
        if(enemy.plates) enemy.plateLostAt=run.elapsed;
        enemy.plates = 0;
        enemy.health = Math.max(0, enemy.health - armory.drumPower);
        enemy.lastHit = run.elapsed;
        if (!enemy.health) defeatEnemy(enemy, cache.x, true);
      }
      combatNotice('Shock drum cleared nearby zombies');
      playSound('axeImpact');
      return;
  }
  if (cache.drop !== undefined) {
    const previous=run.weapons.at(-2);
    combatNotice(upgrade.label + ' equipped' + (previous?' · '+armory.tuning[previous].label+' bonus retained':''));
    playSound('equip');
  } else playSound('recruit');
}

// Windups lock the target once. The warning and hit test share the same lane bounds.
function specialLane(x, kind) {
  return bruteStrikeLane({x, attackWidth: enemyTypes[kind].radius});
}

function landSpecial(x, kind) {
  const type = enemyTypes[kind];
  const {left, right, formation} = specialLane(x, kind);
  const struck = formation.members.filter(member =>
    member.x + formation.radiusX >= left && member.x - formation.radiusX <= right);
  const attack = kind === 'leaper' ? 'Leaper landing' : 'Acid splash';
  if (struck.length) damage(Math.min(struck.length, type.strike + run.difficulty.hazardDamage), attack);
  else combatNotice(attack + ' · dodged');
  run.specialBursts.push({kind, x, z: 0, time: run.elapsed});
  playSound('hit');
}

function updateAcid(dt) {
  run.acid = run.acid.filter(glob => {
    glob.progress = Math.min(1, glob.progress + dt / glob.duration);
    const t = glob.progress;
    glob.x = glob.fromX + (glob.targetX - glob.fromX) * t;
    glob.z = glob.fromZ * (1 - t);
    glob.height = (1 - t) * glob.releaseHeight + 4 * t * (1 - t) * enemyTypes.spitter.height;
    if (t < 1) return true;
    landSpecial(glob.targetX, 'spitter');
    return false;
  });
}

// Return true while the ability owns movement. A spent specialist resumes its normal approach.
function advanceSpecial(enemy) {
  const type = enemyTypes[enemy.kind];
  if (enemy.spent) return false;
  if (!enemy.attack) {
    if (enemy.z > type.trigger) return false;
    enemy.attack = {fromX: enemy.x, fromZ: enemy.z, targetX: run.x,
      release: run.elapsed + type.windup * run.difficulty.warning};
    combatNotice(type.cue);
    playSound('warning');
  }
  const cast = enemy.attack;
  const elapsed = run.elapsed - cast.release;
  if (elapsed < 0) return true;
  if (enemy.kind === 'leaper') {
    const t = clamp(elapsed * run.difficulty.pace / type.flight, 0, 1);
    enemy.x = cast.fromX + (cast.targetX - cast.fromX) * t;
    enemy.z = cast.fromZ * (1 - t);
    enemy.height = 4 * t * (1 - t) * type.height;
    if (t < 1) return true;
    landSpecial(enemy.x, enemy.kind);
    enemy.attacked = true;
    enemy.restUntil = run.elapsed + type.recovery;
  } else if (enemy.kind === 'spitter') {
    const releaseHeight = type.size;
    run.acid.push({fromX: enemy.x, fromZ: enemy.z, targetX: cast.targetX,
      x: enemy.x, z: enemy.z, height: releaseHeight, releaseHeight, progress: 0,
      duration: type.flight / run.difficulty.pace});
  } else {
    let rallied = 0;
    for (const ally of run.enemies) {
      if (ally.boss || ally.passed || ally.health <= 0 || enemyTypes[ally.kind]?.trigger ||
          Math.abs(ally.x - enemy.x) > type.reachX || Math.abs(ally.z - enemy.z) > type.reachZ) continue;
      ally.ralliedUntil = run.elapsed + type.rallyTime;
      rallied++;
    }
    run.specialBursts.push({kind: enemy.kind, x: enemy.x, z: enemy.z, time: run.elapsed});
    combatNotice('Howler call · ' + rallied + ' nearby zombies accelerated');
    playSound('howl');
  }
  enemy.attack = undefined;
  enemy.spent = true;
  return true;
}

// Both renderers select art from the same simulation clock and gameplay state.
function advanceBoiler(enemy) {
  const type = enemyTypes.boiler;
  if (enemy.z > type.ventRange || enemy.phaseUntil > run.elapsed) return;
  if (enemy.phase === 'vent') {
    enemy.phase = 'open';
    enemy.phaseUntil = run.elapsed + type.openTime * run.difficulty.warning;
    combatNotice('Furnace open · line up for ×' + type.coreDamage + ' damage');
  } else if (enemy.phase === 'open') {
    enemy.phase = 'sealed';
    enemy.phaseUntil = run.elapsed + type.sealedTime;
  } else {
    enemy.phase = 'vent';
    enemy.phaseUntil = run.elapsed + type.ventTime * run.difficulty.warning;
    combatNotice('Boiler Husk venting');
    playSound('boilerVent');
  }
}

function paintedPose(enemy, time) {
  const type = paintedMotion;
  if (enemy.age !== undefined) {
    const progress = Math.min(1, enemy.age / enemy.drop);
    if (progress >= type.fallSwitch) return {frame: 11, lean: 0, stretch: 1, mirror: false};
    return {frame: 8, lean: progress * .65, stretch: 1 - progress * progress * .75, mirror: false};
  }
  if (enemy.phase && abilityFrames[enemy.phase] !== undefined) {
    const pulse = Math.sin(time * 13) * .012;
    const frame = enemy.phase === 'stamp' && enemy.phaseUntil - time > campaignSpecialists.frost.stompTime / 2 ? 9 : abilityFrames[enemy.phase];
    return {frame, lean: 0, stretch: 1 + pulse, mirror: false};
  }
  if (time - (enemy.recoilAt ?? -Infinity) < type.recoilTime)
    return {frame: 8, lean: -.04, stretch: .98, mirror: false};
  const phase = time * type.framesPerSecond + enemy.gaitOffset;
  const step = Math.floor(phase) % 4;
  return {frame: step + (run.crowd >= type.raisedCamera ? 4 : 0), mirror: enemy.kind === 'boiler' && step >= 2,
    lean: Math.sin(phase * Math.PI / 2) * .035, stretch: 1 - .025 * Math.sin(phase * Math.PI) ** 2};
}

function walkerStagger(enemy, time) {
  return Math.max(0, 1 - (time - (enemy.lastHit ?? -Infinity)) / walker.staggerTime);
}

function armoredEnemy(enemy) {
  return enemy.kind === 'armored' || enemy.kind === 'hulk' || enemy.kind === 'shield';
}

function shotCapacity(enemy) {
  if (enemy.pod) return enemy.health;
  if (armoredEnemy(enemy) || (enemy.kind === 'boiler' && enemy.phase !== 'open')) return Math.min(enemy.health, armoredWaveMix.incomingLimit);
  return enemy.kind || enemy.boss ? enemy.health + (enemy.shield ?? 0) : 1;
}

function cameraViewDistance() {
  return config.viewDistance + crowdCamera.extraView * run.crowd;
}

function updateCrowdCamera(dt) {
  let count = Math.min(run.count, crowdCamera.visibleSquadMax);
  const far = cameraViewDistance();
  const visible = object => object.z > config.breachLine - 3 && object.z < far;
  for (const enemy of run.enemies) if (enemy.health > 0 && !enemy.passed && visible(enemy)) count++;
  for (const gate of run.gates) if (!gate.used && visible(gate)) count++;
  for (const cache of run.caches) if (!cache.passed && visible(cache)) count++;
  for (const barricade of run.barricades) if (visible(barricade)) count++;
  const target = reducedMotion.matches ? 0 :
    clamp((count - crowdCamera.start) / (crowdCamera.full - crowdCamera.start), 0, 1);
  const duration = target > run.crowd ? crowdCamera.riseTime : crowdCamera.returnTime;
  run.crowd += (target - run.crowd) * (1 - Math.exp(-dt / duration));
}

function clearEntranceCue() {
  run.entrance.cue = null;
  run.entrance.pan = 0;
  run.entrance.pitch = 0;
  run.entrance.dolly = 0;
  lastStageFrame = undefined;
}

function updateEntranceCamera() {
  const tuning = entranceCamera;
  const view = run.entrance;
  const boss = run.enemies.at(-1);
  // Reserve enough time for the boss even on a fast, hard-mode approach.
  const bossSpeed = config.enemySpeed * run.difficulty.pace * (boss.profile.pace ?? 1);
  const duration = tuning.easeIn + tuning.hold + tuning.easeOut;
  const reserve = tuning.bossDistance + bossSpeed * (duration + tuning.quietTime);
  const enabled = !reducedMotion.matches && entranceSetting.value === 'auto';
  function enter(enemy, distance) {
    if (enemy.entranceSeen || enemy.z > distance || enemy.passed || enemy.health <= 0) return;
    enemy.entranceSeen = true;
    if (!enabled || enemy.z < tuning.minDistance || view.cue) return;
    if (!enemy.boss) {
      if (view.specialistShown || boss.z <= reserve || run.flash > 0 || run.acid.length) return;
      view.specialistShown = true;
    }
    // Choose one shoulder on entry, including for enemies coming straight down the center.
    const shoulder = (enemy.x < 0 ? -1 : 1) * Math.max(tuning.minimumShoulder, Math.abs(enemy.x));
    view.cue = {start: Math.max(run.elapsed, tuning.deploySettle), shoulder,
      strength: enemy.boss ? 1 : tuning.specialistStrength};
  }
  enter(boss, tuning.bossDistance);
  if (!view.specialistShown) {
    for (const enemy of run.specialists) enter(enemy, tuning.specialistDistance);
  }
  if (!view.cue) return;
  const age = run.elapsed - view.cue.start;
  if (age >= duration) {
    clearEntranceCue();
    return;
  }
  const t = clamp(Math.min(age / tuning.easeIn, (duration - age) / tuning.easeOut), 0, 1);
  const weight = t * t * (3 - 2 * t) * view.cue.strength;
  view.dolly = tuning.dolly * weight;
  view.pan = -tuning.pan * view.cue.shoulder * weight;
  view.pitch = tuning.pitch * weight;
}

entranceSetting.addEventListener('change', clearEntranceCue);
reducedMotion.addEventListener('change', clearEntranceCue);

function step(dt) {
  const level = levels[levelIndex];
  const direction = Number(keys.has('ArrowRight') || keys.has('KeyD')) -
    Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  const steering = config.steering * (run.slowUntil > run.elapsed ? campaignSpecialists.frost.steeringScale : 1);
  const targetVelocity = drag ? clamp((drag.target - run.x) * config.response, -steering, steering)
    : direction * steering;
  run.velocity += (targetVelocity - run.velocity) * (1 - Math.exp(-config.response * dt));
  const interchange=level.scenery==='spiral';
  const edge=interchange?spiral.edge:config.edge;
  run.x = clamp(run.x + run.velocity * dt, -edge, edge);
  if(interchange){
    const zone=spiral.deadZone/cameraHalfScreen();
    run.cameraX=clamp(clamp(run.cameraX,run.x-zone,run.x+zone),-spiral.panLimit,spiral.panLimit);
    updateSpiralTurret(dt);
  }
  run.elapsed += dt;
  if (run.elapsed >= run.combatNoticeUntil) combatStatus.hidden = true;
  const travel = config.approachSpeed * run.difficulty.pace * dt;
  run.elapsedDistance = Math.min(level.length, run.elapsedDistance + travel);
  run.flash = Math.max(0, run.flash - dt);
  run.contactCooldown = Math.max(0, run.contactCooldown - dt);

  for (const event of run.events) {
    if (!event.started && run.elapsedDistance >= event.at) triggerFieldEvent(event);
  }

  const formation = squadFormation();
  for (const cache of run.caches) {
    if (cache.passed) continue;
    const previousZ = cache.z;
    if(cache.station!=='turret') cache.z -= travel;
    if (cache.kind === 'drum' && cache.health > 0 && touchesFormation(cache, previousZ, formation)) {
      damage(armory.drumCollision, 'Shock drum collision');
      cache.passed = true;
    }
    if(cache.station==='roller' && previousZ>0 && cache.z<=0 && Math.abs(run.x)<spiral.rollerWidth)
      damage(config.barricadeDamage,'Spiked roller');
    if (cache.z < config.breachLine) cache.passed = true;
  }

  for (const gate of run.gates) {
    const previousZ = gate.z;
    gate.z -= travel;
    if (!gate.used && touchesFormation(gate, previousZ, formation)) {
      gate.used = true;
      if (gate.count < 0) {
        const {lost} = damage(-gate.count, 'Penalty gate ' + gateLabel(gate.count));
        if (lost) run.recruits.push({x: gate.x, count: -lost, time: run.elapsed});
        if (!run.count) {
          setMode('lost');
          updateHud();
          return;
        }
      } else {
        changeSquadSize(gate.count, gate.x);
        playSound('recruit');
      }
    }
  }
  for (const barricade of run.barricades) {
    const previousZ = barricade.z;
    barricade.z -= travel;
    if (barricade.kind === 'debris') {
      const swingDistance = Math.max(0, barricade.z - storm.warningDistance);
      barricade.x = barricade.startX + Math.sin(barricade.distance + swingDistance * storm.frequency) * storm.swing;
    }
    if (previousZ > 0 && barricade.z <= 0 &&
        Math.abs(run.x - barricade.x) < config.barricadeWidth) damage((barricade.kind === 'debris' ? storm.damage : config.barricadeDamage) + run.difficulty.hazardDamage,
          barricade.kind === 'debris' ? (level.debrisName ?? 'Storm debris') : 'Barricade collision');
  }

  if(run.shutter && !run.shutter.bell && run.shutter.until-run.elapsed<=encounterFlow.bellLead){
    run.shutter.bell=true;playSound('warning');combatNotice('Shutter opening');
  }
  if (level.chapter) updateChapterHazards(level, formation);
  updateAcid(dt);
  updateEncounterObjects(travel, formation);
  run.specialBursts = run.specialBursts.filter(burst => run.elapsed - burst.time < config.fallTime);
  for (const enemy of run.enemies) {
    if (enemy.health <= 0 || enemy.passed) continue;
    if (enemy.boss) {
      advanceBrute(enemy, dt);
      continue;
    }
    const type = enemyTypes[enemy.kind];
    if (enemy.siren && updateSiren(enemy)) continue;
    if (enemy.kind === 'boiler') {
      advanceBoiler(enemy);
      if (enemy.phase === 'vent' || enemy.phase === 'open') continue;
    }
    if (campaignSpecialists[enemy.kind] && advanceCampaignSpecialist(enemy, dt)) continue;
    if (enemy.restUntil > run.elapsed || (type?.trigger && advanceSpecial(enemy))) continue;
    const haste = enemy.ralliedUntil > run.elapsed ? enemyTypes.howler.rallySpeed : 1;
    const previousZ = enemy.z;
    if (enemy.laneX !== undefined) {
      enemy.x = enemy.laneX + (type?.weave ?? horde.straggle) * Math.sin(run.elapsed * 3 + enemy.gaitOffset);
      if (level.beds?.length) routeAroundBeds(enemy,level.beds);
    }
    const staggered = !type && walkerStagger(enemy, run.elapsed) > 0;
    const walkPace = type ? 1 : (enemy.siege ? walker.siegePace : walker.pace);
    const reactionPace = staggered ? walker.staggerPace : !type && enemy.health < walker.health ? walker.limpPace : 1;
    const flow=encounterFlow;
    let pace=largeZombieKinds.has(enemy.kind) ? flow.heavyPace : 1;
    if(enemy.kind==='shield') pace=config.enemySpeed*walker.siegePace/type.speed;
    if(enemy.lastHit!==undefined && enemy.kind==='runner') pace=flow.woundedRunnerPace;
    if(enemy.lastHit!==undefined && enemy.kind==='armored') pace=flow.woundedArmorPace;
    if(level.scenery==='rail' && level.part>=1 && enemy.laneX!==undefined) {
      const bend=Math.max(0,1-Math.abs(enemy.z-flow.forkZ)/flow.forkDepth);
      const runner=enemy.kind==='runner';
      enemy.x+=((runner ? -1 : 1) * flow.forkWidth + enemy.laneX * flow.forkSpread - enemy.laneX)*bend;
      if(!runner) pace*=1-(1-flow.detourPace)*bend;
    }
    enemy.z -= pace * (type?.speed ?? config.enemySpeed) * walkPace * reactionPace * haste * run.difficulty.pace * dt;
    if(run.shutter?.until>run.elapsed && previousZ>=flow.shutterZ && Math.abs(enemy.x-run.shutter.x)<flow.shutterWidth)
      enemy.z=Math.max(enemy.z,Math.min(previousZ,flow.shutterZ+flow.queueDepth*Math.abs(Math.sin(enemy.gaitOffset??0))));
    if ((enemy.kind === 'runner' || type?.flank) && previousZ >= config.fireRange && enemy.z < config.fireRange &&
        run.runnerCueUntil <= run.elapsed) {
      playSound('warning');
      run.runnerCueUntil = run.elapsed + charge.warning * run.difficulty.warning;
    }
    if (enemy.z <= 0 && Math.abs(enemy.x - run.x) < config.contactWidth &&
        !run.contactCooldown && !enemy.attacked) {
      damage(type?.damage ?? 1, encounterTuning.roster.includes(enemy.kind) ? type.label + ' strike' : enemy.kind === 'hulk' ? 'Hulk attack' : 'Zombie attack');
      enemy.attacked = true;
      run.contactCooldown = config.contactInterval;
    }
    if (enemy.z <= config.breachLine) {
      enemy.passed = true;
      run.breaches += type?.breach ?? 1;
      run.flash = config.damageFlash;
    }
  }

  advanceFalls(dt);
  run.recruits = run.recruits.filter(recruit => run.elapsed - recruit.time < config.recruitTime);
  run.impacts = run.impacts.filter(impact => run.elapsed - impact.time < config.impactTime);
  run.cooldown -= dt;
  if (run.cooldown <= 0 && run.count > 0) {

    const aimWidth = config.aimWidth + (formation.columns - 1) * config.aimWidthPerColumn + run.aimBonus;
    const shields = run.enemies.filter(enemy => enemy.kind === 'shield' && enemy.plates > 0 && enemy.health > 0 &&
      !enemy.passed && enemy.z >= 0 && enemy.z < run.fireRange);
    const targets = run.enemies.filter(enemy =>
      enemy.phase !== 'tunnel' && shotCapacity(enemy) > (enemy.incomingShots ?? 0) &&
      (enemy.kind || enemy.boss || walkerStagger(enemy, run.elapsed) === 0) && enemy.health > 0 && !enemy.passed &&
      enemy.z >= 0 && enemy.z < run.fireRange &&
      (!enemy.boss || bossExposed(enemy)) &&
      (!run.roller || run.roller.passed || enemy.z<run.roller.z || Math.abs(run.x)>spiral.rollerWidth) &&
      Math.abs(enemy.x - run.x) < aimWidth &&
      (enemy.boss || enemy.kind === 'shield' || !shields.some(shield =>
        Math.abs(run.x-shield.x)<encounterFlow.shieldFlank && shield.z < enemy.z && enemy.z - shield.z <= enemyTypes.shield.coverDepth &&
        Math.abs(shield.x - enemy.x) < enemyTypes.shield.coverWidth)));
    const caches = new Set(run.caches.filter(cache => !cache.passed && cache.z >= 0 && cache.z < run.fireRange &&
      cache.health > (cache.incomingShots ?? 0) && Math.abs(cache.x - run.x) < (cache.station==='roller' ? spiral.rollerWidth : cache.drop !== undefined ? armory.panelAim : cache.kind==='drum' && onStage() ? .82*Breakwater.camera.drumScale/Breakwater.camera.halfRoad : armory.aimWidth)));
    const pods = run.pods.filter(pod => pod.z >= 0 && pod.z < run.fireRange && pod.health > (pod.incomingShots ?? 0) &&
      Math.abs(pod.x - run.x) < aimWidth);
    const aimedPanels = new Set([...caches].filter(cache => (cache.station || cache.action || cache.kind==='drum') &&
      Math.abs(run.x-cache.x)<encounterFlow.panelAim));
    const firingOrder = [...targets, ...pods, ...caches].sort((a, b) =>
      Number(aimedPanels.has(b))-Number(aimedPanels.has(a)) || a.z-b.z);
    const closeTarget = firingOrder[0]?.z < armory.tuning.scatter.range;
    const volleys = Math.ceil(Math.sqrt(run.count)) + run.volleyBonus +
      (run.scatter && closeTarget ? armory.tuning.scatter.rounds : 0);
    const weapon = run.weapons.at(-1) ?? 'standard';
    let targetIndex = 0;
    for (let i = 0; i < volleys; i++) {
      const target = firingOrder[targetIndex];
      if (target) {
        target.incomingShots = (target.incomingShots ?? 0) + 1;
        if (target.incomingShots >= (caches.has(target) ? target.health : shotCapacity(target))) targetIndex++;
      }
      const shooterIndex = weapon === 'spread' ? Math.floor(i / 2) : i;
      const shooter = formation.members[shooterIndex % formation.members.length];
      const barrel = weapon === 'spread' ? (i % 2 ? 1 : -1) : 0;
      const fan = volleys > 1 ? (2*i/(volleys-1)-1) : 0;
      const muzzle = onStage() ? Breakwater.muzzle(shooter,width,height,weapon,barrel) : undefined;
      run.shots.push({originX:run.x, muzzle, barrel, fan, x: run.x + (i - (volleys - 1) / 2) * 0.045, z: 0, target, cache: caches.has(target), range: run.fireRange, weapon});
    }
    run.cooldown = run.fireInterval;
    run.lastVolleyAt = run.elapsed;
    playSound('fire');
  }

  let hitThisStep = false, armorHit = false;
  run.shots = run.shots.filter(shot => {
    const target = shot.target;
    shot.z += config.shotSpeed * dt;
    if (target?.phase === 'tunnel') {
      target.incomingShots--;
      shot.target = undefined;
      return shot.z < shot.range;
    }
    if (target && !target.passed && target.health > 0) {
      shot.x += (target.x - shot.x) * Math.min(1, dt * 6);
      if (shot.z >= target.z) {
        target.incomingShots--;
        const blocked = target.shield > 0;
        const boiler = target.kind === 'boiler';
        const coreOpen = boiler && target.phase === 'open';
        const plated = !shot.cache && (armoredEnemy(target) || (boiler && !coreOpen));
        if (target.phase === 'raise' && ++target.interruptHits >= campaignSpecialists.breaker.interruptHits) {
          target.phase = undefined;
          target.spent = true;
          combatNotice('Strike interrupted · recruit gate saved');
        }
        if (encounterTuning.roster.includes(target.kind) && run.elapsed - (target.recoilAt ?? -Infinity) >= paintedMotion.recoilCooldown)
          target.recoilAt = run.elapsed;
        armorHit ||= plated;
        run.impacts.push({plated, pod: target.pod, boilerSize: boiler ? target.size : 0, x: target.x, z: target.z, height: target.height ?? 0, time: run.elapsed, blocked, weapon:shot.weapon});
        hitThisStep = true;
        target.lastHit = run.elapsed;
        if (blocked) {
          target.shield--;
          if (target.shield === 0) {
            combatNotice('Boss shield broken');
            playSound('axeImpact');
          }
          return false;
        }
        if(target.siren && target.callUntil && !target.spent && (target.callHits=(target.callHits??0)+1)>=encounterFlow.alarmHits){
          target.spent=true;combatNotice('Siren silenced');
        }
        if(target.plates>0 && !coreOpen && (target.kind!=='shield' || Math.abs(shot.originX-target.x)<encounterFlow.shieldFlank)) {
          target.plates--;
          target.plateLostAt=run.elapsed;
          if(!target.plates){combatNotice('Armor shattered');playSound('armorHit');}
          return false;
        }
        const power = coreOpen ? enemyTypes.boiler.coreDamage :
          target.phase === 'emerge' ? campaignSpecialists.crawler.emergeDamage : 1;
        target.health = Math.max(0, target.health - power);
        if (target.health === 0) {
          if (target.pod) {
            combatNotice('Seed pod destroyed');
          } else if (shot.cache) {
            unlockCache(target);
          } else {
            defeatEnemy(target, shot.originX);
          }
        }
        return false;
      }
    }
    if (shot.z < shot.range) return true;
    if (target) target.incomingShots--;
    return false;
  });

  if (hitThisStep) playSound(armorHit ? 'armorHit' : 'hit');
  if (!run.count || run.breaches >= run.breachLimit) {
    setMode('lost');
  } else if (run.enemies.at(-1).health === 0) {
    run.elapsedDistance = level.length;
    setMode('won');
  }
  updateCrowdCamera(dt);
  if (mode === 'running') updateEntranceCamera();
  updateHud();
}

function project(x, z) {
  if (onStage() || levels[levelIndex].scenery==='spiral') return Breakwater.project(x, z, width, height);
  const distance = 44 * (1 + crowdCamera.pullback * run.crowd);
  const depth = Math.max(0, z - entranceCamera.anchoredDepth) / distance;
  const viewZ = z / distance - run.entrance.dolly * depth;
  const scale = 1 / (1 + viewZ);
  const slope = .96 * (1 + crowdCamera.pitch * run.crowd);
  return [width * (.48 + (x * cameraHalfScreen() + run.entrance.pan * depth) * scale),
    height * (.76 - (slope * viewZ - run.entrance.pitch * depth) * scale),
    scale * (1 - crowdCamera.widen * run.crowd)];
}

function cameraHalfScreen() {
  const wide=levels[levelIndex].scenery==='spiral'?spiral.viewScale:1;
  return wide * (onStage() ? Breakwater.camera.halfScreen : .49) * (1 - crowdCamera.widen * run.crowd);
}

function settleProgress(start) {
  const t = clamp((run.elapsed - start) / recruitment.settleTime, 0, 1);
  return t * t * (3 - 2 * t);
}

function displayedSquadCount() {
  if (!run.countChange || mode !== 'running' || reducedMotion.matches) return run.count;
  const {from, time} = run.countChange;
  return from + (run.count - from) * settleProgress(time);
}

function changeSquadSize(delta, pickupX) {
  const oldCount = run.count;
  const from = displayedSquadCount();
  const visibleChanges = Math.min(oldCount, crowdCamera.visibleSquadMax) !==
    Math.min(oldCount + delta, crowdCamera.visibleSquadMax);
  const previous = visibleChanges && !reducedMotion.matches ? squadFormation() : null;
  run.count += delta;
  run.countChange = delta > 0 ? {from, time: run.elapsed} : null;
  if (!previous) return;

  // Retarget from each soldier's current position, even during consecutive pickups.
  run.formationMove = null;
  const next = squadFormation();
  const [entryX, entryY] = project(pickupX, 0);
  run.formationMove = next.members.map((target, i) => {
    const member = previous.members[i];
    const arrival = Math.max(0, i - previous.members.length);
    const x = member?.x ?? entryX;
    const y = member?.y ?? entryY + next.rowGap * (target.row + recruitment.entryDepth);
    return {
      x: (x - target.x) / next.columnGap, y: (y - target.y) / next.rowGap,
      scale: member?.scale ?? recruitment.entryScale,
      time: run.elapsed + arrival * recruitment.arrivalSpacing,
    };
  });
}

function squadFormation() {
  const [centerX, centerY] = project(run.x, 0);
  const size = clamp(width / 510, 0.85, 1.24) * (1 - crowdCamera.widen * run.crowd);
  const count = Math.min(run.count, crowdCamera.visibleSquadMax);
  const columns = Math.min(5, Math.ceil(Math.sqrt(count)));
  const spacing = onStage() ? width * cameraHalfScreen() / Breakwater.camera.halfRoad : 0;
  const columnGap = onStage() ? spacing * .76 : 16 * size;
  const rowGap = onStage() ? spacing * .49 : 10 * size;
  const stagger = onStage() && count>columns ? columnGap*.22 : 0;
  const margin = ((columns-1) * columnGap + (onStage() ? spacing * .64 : 0))/2 + stagger;
  const formationX = onStage() ? clamp(centerX, margin, width-margin) : centerX;
  const members = Array.from({length: count}, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, count - row * columns);
    const move = run.formationMove?.[index];
    const remaining = move && !reducedMotion.matches ? 1 - settleProgress(move.time) : 0;
    return {
      scale: 1 - (1 - (move?.scale ?? 1)) * remaining,
      joining: remaining,
      x: (move?.x ?? 0) * columnGap * remaining + formationX + ((index % columns) - (rowCount - 1) / 2) * columnGap + (row%2 ? stagger : -stagger),
      y: centerY + (row + (move?.y ?? 0) * remaining) * rowGap,
      row,
    };
  });
  return {members, columns, size, columnGap, rowGap, radiusX: onStage() ? spacing * .26 : 8 * size, radiusY: onStage() ? spacing * .1 : 3.6 * size};
}

function bruteStrikeLane(enemy) {
  // Keep the strike width at the squad plane across every row of the formation.
  const center = enemy.leaping ? enemy.landingX : enemy.x;
  const [left, front] = project(center - enemy.attackWidth, 0);
  const [right] = project(center + enemy.attackWidth, 0);
  const formation = squadFormation();
  const back = Math.max(front, ...formation.members.map(member => member.y + formation.radiusY));
  return {left, right, front, back, formation, center};
}

function gateHalfWidth(scale) {
  return width * (onStage() ? .97 * cameraHalfScreen() / Breakwater.camera.halfRoad : 0.117) * scale;
}

function touchesFormation(gate, previousZ, {members, radiusX, radiusY}) {
  // Passed gates eventually leave the range of the perspective projection.
  if (gate.z > 2 || !members.length) return false;
  const cameraDepth = (onStage() ? Breakwater.camera.distance : 44) * (1 + crowdCamera.pullback * run.crowd);
  if (previousZ <= -cameraDepth || gate.z <= -cameraDepth) return false;
  const [previousX, previousY, previousScale] = project(gate.x, previousZ);
  const [currentX, currentY, currentScale] = project(gate.x, gate.z);
  return members.some(member => {
    if (currentY < member.y - radiusY || previousY > member.y + radiusY) return false;
    const progress = currentY === previousY ? 0 : clamp((member.y - previousY) / (currentY - previousY), 0, 1);
    const scale = previousScale + progress * (currentScale - previousScale);
    const gateX = previousX + progress * (currentX - previousX);
    if (gate.ice) return Math.abs(member.x - gateX) <= width * cameraHalfScreen() * scale * campaignSpecialists.frost.iceRadius + radiusX;
    const halfWidth=gate.kind==='drum' && onStage()
      ? .82*Breakwater.camera.drumScale*width*cameraHalfScreen()/Breakwater.camera.halfRoad*scale
      : gateHalfWidth(scale);
    return Math.abs(member.x - gateX) <= halfWidth + radiusX;
  });
}

function polygon(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function line(a, b, color, size) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

// Project the road texture once per layout. Rows shrink and repeat toward the vanishing point.
let deckPattern;
function prepareDeckMaterial() {
  if (!deckImage.naturalWidth || !width || !height) return;
  const sheet = document.createElement('canvas');
  sheet.width = Math.ceil(width);
  sheet.height = Math.ceil(height);
  const surface = sheet.getContext('2d');
  const tile = deckImage.width;
  for (let y = 0; y < sheet.height; y++) {
    const scale = (y / height + 0.20) / 0.96;
    const z = 44 / scale - 44;
    const row = ((Math.floor(z * tile / 18) % tile) + tile) % tile;
    const period = Math.max(1, width * 0.52 * scale);
    const start = (width * 0.48) % period - period;
    for (let x = start; x < width; x += period) {
      surface.drawImage(deckImage, 0, row, tile, 1, x, y, period + 0.5, 1);
    }
  }
  deckPattern = ctx.createPattern(sheet, 'no-repeat');
}

function loadMaterial(name, ready) {
  const image = new Image();
  image.addEventListener('error', () => {
    console.error('Could not load game material', {fallback: true, material: name, using: 'painted surface'});
    const notice = byId('art-status');
    notice.hidden = false;
    notice.textContent = 'Some scenery textures could not load. Showing painted surfaces. Reload to retry.';
  });
  if (ready) image.addEventListener('load', ready);
  image.src = 'assets/' + name + '.webp';
  return image;
}

const inletImage = loadMaterial('inlet');
const deckImage = loadMaterial('deck', prepareDeckMaterial);

function drawWater(time) {
  if (inletImage.naturalWidth) {
    const iw = inletImage.naturalWidth;
    const ih = inletImage.naturalHeight;
    const zoom = Math.max(width / iw, height / ih);
    const cropW = width / zoom;
    const cropH = height / zoom;
    const left = (iw - cropW) / 2;
    const top = (ih - cropH) / 2;
    // Keep the shoreline fixed. Displace narrow strips of open water with overlapping swells.
    const strip = 8;
    for (let y = 0; y < height; y += strip) {
      const depth = y / height;
      const swell = reducedMotion.matches ? 0 : Math.max(0, depth - 0.2) *
        (Math.sin(depth * 56 + time * 1.7) + Math.sin(depth * 119 - time * 0.8));
      const band = Math.min(strip, height - y);
      ctx.drawImage(inletImage, left + 3 + swell, top + y / zoom, cropW - 6, band / zoom,
        0, y, width, band + 0.3);
    }
  } else {
    ctx.fillStyle = '#355e69';
    ctx.fillRect(0, 0, width, height);
  }
}

// The same upper-left light shades cargo, bridge piers, and gate frames.
function prism(left, top, right, bottom, depthX, depthY, materials) {
  polygon([[left, top], [right, top], [right + depthX, top - depthY],
    [left + depthX, top - depthY]], materials.top);
  polygon([[right, top], [right, bottom], [right + depthX, bottom - depthY],
    [right + depthX, top - depthY]], materials.side);
  ctx.fillStyle = materials.front;
  ctx.fillRect(left, top, right - left, bottom - top);
}

function castShadow(left, right, base, scale) {
  polygon([[left, base], [right, base], [right + 20 * scale, base + 10 * scale],
    [left + 15 * scale, base + 10 * scale]], '#16242c58');
}

function waterReflection(x, y, scale, time) {
  polygon([[x - 9 * scale, y], [x + 11 * scale, y],
    [x + 27 * scale, y + 19 * scale], [x + 3 * scale, y + 19 * scale]], '#173d4966');
  for (let band = 0; band < 7; band++) {
    const ripple = Math.sin(time * 2.2 + band * 1.65 + x * 0.043) * 3 * scale;
    const px = x + ripple + band * 1.1 * scale;
    const py = y + (band * 3 + 1) * scale;
    const reach = (13 - band) * scale;
    line([px - reach, py], [px + reach, py], band % 2 ? '#1e4a5d87' : '#a3ccd252', 1.4 * scale);
  }
}

function drawHarbor() {
  const p = (x, y) => [x * width, y * height];
  const dock = [[0, 0], [0.37, 0], [0.27, 0.27], [0, 0.38]];
  polygon(dock.map(([x, y]) => p(x, y + 0.025)), '#31464c');
  polygon(dock.map(([x, y]) => p(x, y)), '#7c7d74');
  line(p(0, 0.374), p(0.265, 0.267), '#c4a36c', 2);
  const containers = [[0.02, 0.29, 0.085, '#975443'], [0.12, 0.25, 0.078, '#456671'],
    [0.01, 0.21, 0.09, '#a48450'], [0.11, 0.17, 0.086, '#8d5144'],
    [0.19, 0.14, 0.064, '#4c6665'], [0.06, 0.105, 0.09, '#4a6875']];
  for (const [x, y, w, color] of containers) {
    const [left, bottom] = p(x, y);
    const [right, top] = p(x + w, y - 0.027);
    const depthX = width * 0.018;
    const depthY = height * 0.014;
    castShadow(left, right, bottom, width / 440);
    prism(left, top, right, bottom, depthX, depthY, {front: color, top: color, side: '#465055'});
    polygon([[left, top], [right, top], [right + depthX, top - depthY],
      [left + depthX, top - depthY]], '#fff0c650');
    line([left, top], [right, top], '#f2dcc481', 1);
    line([left, bottom - 1], [right, bottom - 1], '#272827b0', 2);
    for (let rib = 1; rib < 9; rib++) {
      const px = left + (right - left) * rib / 9;
      line([px, top + 2], [px, bottom - 2], '#19232a69', 1.1);
      line([px - 0.9, top + 2], [px - 0.9, bottom - 2], '#f5e6c846', 0.8);
    }
    line([right - 2, top + 1], [right - 2, bottom - 1], '#242c31a0', 1.5);
    line([right - 6, bottom - 4], [right - 3, bottom - 4], '#f1d9b18c', 1);
  }
  for (const x of [0.20, 0.29]) {
    line(p(x, 0.18 - (x - 0.20) * 0.45), p(x, 0.043), '#504f42', 4);
    line(p(x, 0.043), p(x + 0.11, 0.024), '#b09a66', 3);
    line(p(x + 0.10, 0.026), p(x + 0.10, 0.076), '#424b48', 1.2);
  }
}

function drawOldTown() {
  const stone = {top: '#a8a698', front: '#807e70', side: '#525c54'};
  for (let depth = 166; depth >= 25; depth -= 27) {
    for (const side of [-1, 1]) {
      const [x, base, s] = project(side * (1.42 + 0.12 * Math.cos(depth)), depth);
      const w = width * 0.155 * s;
      const y = base + 34 * s;
      const crown = y - (110 + 32 * Math.sin(depth)) * s;
      prism(x - w, crown, x + w, y, 15 * s, 8 * s, stone);
      for (let course = 1; crown + course * 13 * s < y; course++) {
        const seam = crown + course * 13 * s;
        line([x - w, seam], [x + w, seam], '#263d3a51', s);
      }
      for (const offset of [-0.53, 0.51]) {
        const middle = x + w * offset;
        const radius = w * 0.26;
        const spring = y - 35 * s;
        ctx.fillStyle = '#344b4d';
        ctx.beginPath();
        ctx.arc(middle, spring, radius, Math.PI, 0);
        ctx.lineTo(middle + radius, y);
        ctx.lineTo(middle - radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#b2ad94';
        ctx.lineWidth = 3 * s;
        ctx.stroke();
      }
      for (let step = 0; step < 5; step++) {
        const edge = side * (w + step * 4 * s);
        line([x, y + step * 4 * s], [x + edge, y + step * 4 * s], '#a59d828a', 2 * s);
      }
    }
  }
}

function drawDryDock() {
  const p = (x, y) => [x * width, y * height];
  const hull = [[-0.03, 0.64], [0.03, 0.24], [0.24, 0.029], [0.37, 0.055], [0.31, 0.29], [0.11, 0.70]];
  polygon(hull.map(([x, y]) => p(x, y + 0.026)), '#241f27');
  polygon(hull.map(([x, y]) => p(x, y)), '#663d37');
  const edge = [[-0.03, 0.55], [0.046, 0.245], [0.25, 0.035], [0.36, 0.055], [0.27, 0.23], [0.075, 0.58]];
  polygon(edge.map(([x, y]) => p(x, y)), '#354e55');
  polygon([[0.015, 0.49], [0.081, 0.26], [0.257, 0.07], [0.32, 0.075],
    [0.235, 0.232], [0.05, 0.46]].map(([x, y]) => p(x, y)), '#a09778');
  line(p(0.091, 0.59), p(0.27, 0.25), '#ce9b7b', 2);
  for (let rib = 0; rib < 7; rib++) {
    const t = rib / 7;
    line(p(0.015 + t * 0.225, 0.49 - t * 0.405), p(0.065 + t * 0.221, 0.461 - t * 0.371), '#605747', 2.5);
  }
  for (const [lane, depth] of [[1.4, 126], [1.55, 72], [1.75, 31]]) {
    const [x, y, s] = project(lane, depth);
    const reach = Math.min(x, width) - width * 0.10;
    const top = y - 106 * s;
    line([x, y + 26 * s], [x, top], '#3c4037', 9 * s);
    line([reach, top + 12 * s], [x, top], '#bfa571', 6 * s);
    line([x, top + 34 * s], [reach, top + 12 * s], '#6d634c', 2.5 * s);
    line([reach, top + 12 * s], [reach, top + 55 * s], '#292c2a', s);
  }
}

function drawTidalLock(time) {
  const gate = {top: '#a2acaa', front: '#647278', side: '#394751'};
  for (let depth = 160; depth > 18; depth -= 34) {
    for (const side of [-1, 1]) {
      const [x, waterline, s] = project(side * 1.35, depth);
      const reach = width * 0.115 * s;
      const base = waterline + 50 * s;
      const top = base - 144 * s;
      prism(x - reach, top, x + reach, base, 11 * s, 8 * s, gate);
      for (let rib = 1; rib < 5; rib++) {
        const seam = x - reach + rib * reach * 0.4;
        line([seam, top], [seam, base], '#28343b', 2 * s);
      }
      ctx.fillStyle = '#a1bdc4';
      ctx.fillRect(x - reach, top + 15 * s, reach * 2, 5 * s);
      for (let runnel = 0; runnel < 6; runnel++) {
        const start = x - reach * 0.64 + runnel * reach * 0.25;
        const crest = (time * 42 + depth + runnel * 7) % 24;
        line([start, base - crest * s], [start - side * 17 * s, base + (24 - crest) * s],
          runnel % 2 ? '#a9dce8a0' : '#daecea70', 1.7 * s);
      }
    }
  }
}

function drawCanyon() {
  for (const side of [-1, 1]) {
    const face = [];
    const outside = side < 0 ? -width * 0.13 : width * 1.14;
    for (let depth = 180; depth >= 0; depth -= 12) {
      const margin = 1.38 + Math.sin(depth * 0.147) * 0.21;
      const [x, y, s] = project(side * margin, depth);
      face.push([x, y + (49 + 17 * Math.sin(depth * 0.16)) * s, s]);
    }
    const wall = ctx.createLinearGradient(0, 0, 0, height);
    wall.addColorStop(0, '#b18068');
    wall.addColorStop(0.6, '#975d4b');
    wall.addColorStop(1, '#543e42');
    polygon([[outside, -30], ...face.map(([x, y]) => [x, y - 130]), [outside, height]], '#ce9b7a');
    polygon([[outside, -24], ...face, [outside, height]], wall);
    for (let i = 0; i < face.length - 1; i++) {
      const [x, y, s] = face[i];
      const [nextX, nextY] = face[i + 1];
      polygon([[outside, y - 29 * s], [x, y], [nextX, nextY], [outside, nextY - 29 * s]],
        i % 2 ? '#5e3d443c' : '#f4c39a2e');
      line([x, y], [outside, y - 29 * s], '#684b4b8a', 1.8 * s);
    }
  }
}

function drawBridge(time) {
  const far = cameraViewDistance();
  const junction = 23;
  const near = -12;
  const [leftNear, rightNear] = [project(-1.17, near), project(1.17, near)];
  const floor = ctx.createLinearGradient(0, 0, 0, height);
  const chapter = levels[levelIndex].chapter;
  floor.addColorStop(0, chapter?.surface[0] ?? '#c2b8a5');
  floor.addColorStop(0.74, chapter?.surface[0] ?? '#9c998d');
  floor.addColorStop(1, chapter?.surface[1] ?? '#888d89');

  function finishDeck() {
    if (!deckPattern) return;
    ctx.save();
    ctx.fillStyle = deckPattern;
    ctx.globalAlpha = 0.24;
    ctx.fill();
    ctx.restore();
  }

  function deck(left, right, start, end, surface) {
    const corners = [project(left, start), project(right, start), project(right, end), project(left, end)];
    const lower = corners.map(([x, y, scale]) => [x, y + 16 * scale]);
    polygon([corners[1], corners[2], lower[2], lower[1]], '#354049');
    polygon([corners[0], corners[3], lower[3], lower[0]], '#616a6b');
    polygon([corners[0], corners[1], lower[1], lower[0]], '#4f565b');
    polygon(corners, surface);
    finishDeck();
    line(corners[0], corners[3], '#d2c7ad92', 1.4);
    line(corners[1], corners[2], '#bcb8ac75', 1);
    for (let z = end - 6; z > start; z -= 8) {
      const edge = project(left, z);
      line(edge, project(right, z), '#323c414e', Math.max(0.5, 1.5 * edge[2]));
      const middle = (left + right) / 2;
      line(project(middle, z), project(middle, Math.max(start, z - 8)), '#3d4e5057', Math.max(0.5, edge[2]));

    }
  }

  for (let z = far - 15; z > junction; z -= 25) {
    for (const lane of [-0.69, 0, 0.69]) {
      const [x, y, scale] = project(lane, z);
      const base = y + 52 * scale;
      if (!chapter) waterReflection(x, base, scale, time);
      prism(x - 11 * scale, y + 4 * scale, x + 9 * scale, base, 6 * scale, 4 * scale,
        {top: '#93958d', front: '#798082', side: '#495a62'});
      ctx.fillStyle = '#263f48a6';
      ctx.fillRect(x - 11 * scale, base - 7 * scale, 20 * scale, 7 * scale);
      ctx.fillStyle = '#303e49a0';
      ctx.fillRect(x - 11 * scale, y + 4 * scale, 20 * scale, 14 * scale);
      line([x - 10 * scale, y + 27 * scale], [x + 8 * scale, y + 27 * scale], '#4a5359', scale);
    }
  }
  const split = levels[levelIndex].split;
  if (chapter) deck(-.96,.96,junction,far,floor);
  else {
    deck(-0.96, split ? -0.08 : -0.42, junction, far, '#9b9f99');
    deck(split ? 0.08 : 0.42, 0.96, junction, far, '#9b9f99');
    if (!split) deck(-0.35, 0.35, junction, far, floor);
  }
  const pivot = entranceCamera.anchoredDepth;
  const pivotEdge = 1.17 + (.96 - 1.17) * (pivot - near) / (junction - near);
  polygon([leftNear, rightNear, project(pivotEdge, pivot), project(.96, junction),
    project(-.96, junction), project(-pivotEdge, pivot)], floor);
  finishDeck();
  for (let z = junction - 3; z > near; z -= 6) {
    const edge = 0.96 + (junction - z) * 0.006;
    const left = project(-edge, z);
    const right = project(edge, z);
    line(left, right, '#353a3d38', 1.35 * left[2]);
    line([left[0], left[1] - 1], [right[0], right[1] - 1], '#e2d9c82a', 1);
    for (let tile = -4; tile <= 4; tile++) {
      const seam = (tile + (Math.round(z / 6) % 2) * 0.5) * 0.22;
      line(project(seam, z), project(seam, z - 6), '#3d4e5060', Math.max(0.6, left[2]));
    }
    for (let spot = 0; spot < 10; spot++) {
      const lane = Math.sin(z * 21 + spot * 19) * edge * 0.94;
      const [x, y, scale] = project(lane, z + Math.sin(spot * 4.8) * 2);
      line([x, y], [x + (3 + spot % 4) * scale, y + scale], spot % 2 ? '#4b4c5138' : '#d7c9b82c', scale);
    }
  }
  const defenseY = project(0, config.breachLine)[1];
  ctx.save();
  ctx.setLineDash([9, 6]);
  line(project(-1.05, config.breachLine), project(1.05, config.breachLine), '#792f37c4', 3);
  ctx.restore();
  ctx.fillStyle = '#45282c';
  ctx.font = '700 10px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('DEFENSE LINE', 12, defenseY + 14);

  const rail = (x, start) => {
    const top = z => {
      const [px, py, scale] = project(x, z);
      return [px, py - 12 * scale];
    };
    for (let z = far; z >= start; z -= 7) {
      const base = project(x, z);
      line(base, [base[0] + 10 * base[2], base[1] + 5 * base[2]], '#17273156', 2.5 * base[2]);
      line(base, top(z), '#394047', 4 * base[2]);
      line([base[0] - base[2], base[1]], [top(z)[0] - base[2], top(z)[1]], '#b7b7a97f', base[2]);
    }
    line(top(start), top(far), '#555760', 2.8);
    line(top(start), top(far), '#eff0df', 1.5);
  };

  for (const side of [-1, 1]) {
    rail(side * 0.96, junction);
    if (!chapter) rail(side * (split ? 0.08 : 0.355), junction + 8);
    line(project(side * 1.17, near), project(side * 0.96, junction), '#45454d', 3);
  }
  if (chapter) drawChapterLandmarks(levels[levelIndex].scenery);
}

function drawGate(gate) {
  if (gate.used) return;
  const [x, y, s] = project(gate.x, gate.z);
  const w = gateHalfWidth(s);
  const h = 49 * s;
  const truck = gate.kind === 'truck';
  if (truck) drawSupplyTruck(x, y, s, w);
  castShadow(x - w, x + w, y, s);
  const glass = ctx.createLinearGradient(x, y - h, x, y);
  const penalty = gate.count < 0;
  glass.addColorStop(0, penalty ? '#fda8a2' : '#95e1ffd9');
  glass.addColorStop(0.14, penalty ? '#d5403a' : '#359ce8bc');
  glass.addColorStop(1, penalty ? '#8c232b' : '#175ab8e5');
  ctx.fillStyle = glass;
  ctx.fillRect(x - w, y - h, 2 * w, truck ? 17 * s : h);
  polygon([[x - w, y - h], [x + w, y - h], [x + w - 4 * s, y - h - 5 * s],
    [x - w + 3 * s, y - h - 5 * s]], penalty ? '#ff9590' : '#7acefd');
  for (const side of truck ? [] : [-1, 1]) {
    const post = x + side * w;
    prism(post - 2.6 * s, y - h, post + 2.4 * s, y + 1.4 * s, 2.5 * s, 2 * s,
      {top: '#efcd88', front: '#b19767', side: '#584c3a'});
    ctx.fillStyle = '#393b3d';
    ctx.fillRect(post - 4 * s, y - s, 9 * s, 3 * s);
    ctx.fillStyle = '#e4d3a9';
    ctx.fillRect(post - 1.5 * s, y - 2.5 * s, s, s);
  }
  polygon([[x - w + 3 * s, y - h + 8 * s], [x + w - 3 * s, y - h + 4 * s],
    [x + w - 3 * s, y - h + 11 * s], [x - w + 3 * s, y - h + 19 * s]], '#d3f4ff42');
  ctx.textAlign = 'center';
  const labelY = truck ? y - h + 14 * s : y - h * 0.27;
  ctx.font = '900 ' + (truck ? 16 : 29) * s + 'px system-ui';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.8 * s;
  ctx.strokeStyle = '#152840';
  ctx.strokeText(gateLabel(gate.count), x, labelY);
  ctx.fillStyle = '#fff';
  ctx.fillText(gateLabel(gate.count), x, labelY);
}

function drawSupplyTruck(x, y, s, w) {
  prism(x - w, y - 22 * s, x + w, y, 9 * s, 8 * s,
    {top: '#a9ae89', front: '#656d52', side: '#39473d'});
  prism(x + w * 0.38, y - 31 * s, x + w, y - 4 * s, 6 * s, 4 * s,
    {top: '#afb99b', front: '#686f62', side: '#394846'});
  ctx.fillStyle = '#b1d1d8';
  ctx.fillRect(x + w * 0.55, y - 27 * s, w * 0.33, 9 * s);
  line([x - w, y - 8 * s], [x + w * 0.36, y - 8 * s], '#aeb19a', s);
  for (const offset of [-0.85, -0.43, 0.02, 0.34]) {
    line([x + w * offset, y - 21 * s], [x + w * offset, y - 5 * s], '#424a42', 1.8 * s);
  }
  ctx.fillStyle = '#aeb7b5';
  ctx.fillRect(x + w * 0.58, y - 15 * s, 4 * s, s);
  const rotation = (run.elapsed * 7) % (Math.PI * 2);
  for (const offset of [-0.66, 0.69]) {
    const axle = x + w * offset;
    ctx.fillStyle = '#252a2b';
    ctx.beginPath();
    ctx.ellipse(axle, y, 5 * s, 5.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#858c85';
    ctx.beginPath();
    ctx.arc(axle, y, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();
    line([axle, y], [axle + Math.cos(rotation) * 2 * s, y + Math.sin(rotation) * 2 * s], '#40484b', s);
  }
}

function drawLaneWarning(x, length, width, color) {
  polygon([project(x - width, 0), project(x + width, 0),
    project(x + width, length), project(x - width, length)], color);
  line(project(x - width, 0), project(x + width, 0), '#ffe2c8ad', 2);
}

function drawWeather(time, lighting) {
  if (!lighting) return;
  const tint = ctx.createLinearGradient(0, 0, 0, height);
  const colors = {
    dawn: ['#fab47c4a', '#703c5727'],
    mist: ['#c9dbd790', '#71877b12'],
    dusk: ['#2b345396', '#232c482e'],
    storm: ['#364c66a6', '#263e5d45'],
  };
  tint.addColorStop(0, colors[lighting][0]);
  tint.addColorStop(1, colors[lighting][1]);
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);
  if (lighting === 'dusk' && !onStage()) {
    for (const x of [0.18, 0.8]) {
      polygon([[width * x, height * 0.085], [width * 0.22, height * 0.6],
        [width * 0.77, height * 0.6]], '#fff0bf20');
      line([width * x - 4, height * 0.085], [width * x + 4, height * 0.085], '#fff0be', 3);
    }
  }
  if (lighting === 'storm') {
    for (const [u, v] of scenery.slice(0, 85)) {
      const y = ((v + time * 0.9) % 1) * height;
      const x = ((u + time * 0.21) % 1) * width;
      line([x, y], [x - 5, y - 15], '#d2e8f445', 1);
    }
  }
}

function drawBarricade(barricade) {
  const [x, y, s] = project(barricade.x, barricade.z);
  const w = width * 0.072 * s;
  const left = x - w;
  const right = x + w;
  const top = y - 31 * s;
  castShadow(left, right, y, s);
  const wood = ctx.createLinearGradient(x, top, x, y);
  wood.addColorStop(0, '#ce985d');
  wood.addColorStop(0.53, '#ad744a');
  wood.addColorStop(1, '#805334');
  prism(left, top, right, y, 8 * s, 6 * s,
    {front: wood, top: '#d3a571', side: '#644632'});
  for (let board = 1; board < 5; board++) {
    const py = top + board * 6 * s;
    line([left, py], [right, py], '#4f3427c7', 1.3 * s);
    line([left + s, py + s], [right - s, py + s], '#ecc39373', s);
    const grain = left + (board % 3 + 1) * (right - left) / 7;
    line([grain, py - 2 * s], [grain + (right - left) * 0.37, py - 2.7 * s], '#62463573', 0.65 * s);
  }
  for (const strap of [left + 4 * s, right - 7 * s]) {
    ctx.fillStyle = '#455054';
    ctx.fillRect(strap, top, 3 * s, y - top);
    line([strap, top], [strap + 8 * s, top - 6 * s], '#939a96', 3 * s);
    ctx.fillStyle = '#b8b9a8';
    ctx.fillRect(strap + s, top + 4 * s, s, s);
    ctx.fillRect(strap + s, y - 5 * s, s, s);
  }
}

function drawWeaponIcon(kind, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const long = kind === 'longshot';
  const twin = kind === 'spread';
  const scatter = kind === 'scatter';
  const muzzle = long ? 29 : scatter ? 18 : 24;
  const steel = ctx.createLinearGradient(0, -8, 0, 8);
  steel.addColorStop(0, '#f0e6cf');
  steel.addColorStop(0.25, '#534f48');
  steel.addColorStop(0.7, '#182026');
  steel.addColorStop(1, '#867c67');
  const outline = [[-29, -3], [-15, -5], [-8, -7], [9, -7], [13, -4], [muzzle, -4],
    [muzzle, 2], [11, 2], [6, 4], [0, 4], [-2, 12], [-8, 12], [-7, 3], [-15, 1], [-29, 5]];
  polygon(outline, steel);
  ctx.strokeStyle = '#fff2b3';
  ctx.lineWidth = 1.35;
  ctx.stroke();
  line([12, -1], [muzzle, -1], '#c7d0c9', 1);
  if (twin) line([7, -7], [muzzle, -7], '#213541', 4);
  if (scatter) line([4, 2], [muzzle, 2], '#8d683f', 3.5);
  if (long) {
    ctx.fillStyle = '#273637';
    ctx.fillRect(-8, -13, 18, 5);
    ctx.strokeRect(-8, -13, 18, 5);
  }
  ctx.restore();
}

function drawArmoryCache(cache) {
  if(cache.station){
    const [x,y,s]=project(cache.x,cache.z);
    ctx.fillStyle=cache.station==='turret'?'#c89436':'#986c4d';
    ctx.fillRect(x-28*s,y-18*s,56*s,18*s);
    if(cache.station==='turret')line([x,y-16*s],[x+5*s,y-34*s],'#efc760',7*s);
    ctx.textAlign='center';ctx.fillStyle='white';ctx.font='bold '+Math.max(10,14*s)+'px system-ui';
    ctx.fillText(cache.passed?'ON':String(cache.health),x,y-3*s);
    return;
  }
  const [x, y, s] = project(cache.x, cache.z);
  const panel = cache.drop !== undefined;
  const {color, badge} = armory.tuning[cache.kind];
  const halfWidth = width * (panel ? armory.panelAim * .49 : 0.082) * s;
  const h = (panel ? 66 : 46) * s;
  castShadow(x - halfWidth, x + halfWidth, y, s);
  const paint = ctx.createLinearGradient(x, y - h, x, y);
  paint.addColorStop(0, '#ffffff');
  paint.addColorStop(0.22, color);
  paint.addColorStop(1, cache.kind === 'drum' ? '#811e20' : color + (panel ? 'c8' : 'a9'));
  if (cache.kind === 'drum') {
    ctx.fillStyle = '#661d23';
    ctx.beginPath();
    ctx.ellipse(x + halfWidth * 0.88, y - h * 0.48, 8 * s, h * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = paint;
    ctx.beginPath();
    ctx.roundRect(x - halfWidth, y - h, halfWidth * 2, h, 8 * s);
    ctx.fill();
    for (const band of [-0.72, -0.53, 0.51, 0.70]) {
      const px = x + halfWidth * band;
      line([px, y - h + 2 * s], [px, y - 2 * s], '#7c2622', 2.8 * s);
      line([px + s, y - h + 3 * s], [px + s, y - 2 * s], '#f2a2849c', s);
    }
  } else {
    prism(x - halfWidth, y - h, x + halfWidth, y, 6 * s, 4 * s,
      {front: paint, top: '#eef4f071', side: '#405063'});
    for (const side of [-1, 1]) {
      const px = x + side * halfWidth;
      line([px, y - h - 3 * s], [px, y], panel ? '#805f38' : '#36424e', 4 * s);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#202632';
  ctx.fillStyle = '#fff9e9';
  if (panel) {
    drawWeaponIcon(cache.kind, x, y - h * 0.58, Math.min(s, halfWidth / 34));
    ctx.font = '900 ' + Math.max(7, 11 * s) + 'px system-ui';
    ctx.fillStyle = '#1c2631';
    ctx.fillText(badge, x, y - h * 0.21);
  } else if (cache.kind !== 'drum') {
    ctx.font = '900 ' + Math.max(7, 12 * s) + 'px system-ui';
    ctx.lineWidth = 2 * s;
    ctx.strokeText(badge, x, y - h * 0.71);
    ctx.fillText(badge, x, y - h * 0.71);
  }
  ctx.fillStyle = '#fff9e9';
  ctx.font = '900 ' + Math.max(8, (cache.kind === 'drum' ? 27 : 14) * s) + 'px system-ui';
  ctx.lineWidth = 3 * s;
  const countY = y - h * (panel ? 0.88 : cache.kind === 'drum' ? 0.45 : 0.29);
  ctx.strokeText(cache.health, x, countY);
  ctx.fillText(cache.health, x, countY);
  ctx.textBaseline = 'alphabetic';
}

const characterSprites = new Map();
const hordeLooks = ['enemy', 'worker', 'docker'];
const characterPalettes = {
  uniform: ['#f4d48e', '#bf945b', '#555e52'],
  armor: ['#a0dcdf', '#488a9c', '#2a4e61'],
  helmet: ['#a7ab8b', '#646d58', '#262e2c'],
  skin: ['#dcad86', '#a7775e', '#543831'],
  boots: ['#5e6460', '#373e3b', '#181f21'],
  rifle: ['#8d989b', '#48565a', '#1d282b'],
  jacket: ['#f09e88', '#d45b4d', '#74352f'],
  scarlet: ['#ffae9c', '#df4944', '#822535'],
  maroon: ['#e48b9c', '#ba445c', '#59263e'],
  canvasCoat: ['#ffe2a1', '#d9a249', '#78532d'],
  reflectiveTape: ['#fff2c7', '#ead79b', '#827e5e'],
  workCoat: ['#a4ddda', '#529b99', '#305456'],
  trousers: ['#8e7970', '#61534e', '#383338'],
  undead: ['#debeaa', '#ac7d6e', '#634945'],
  bruteSkin: ['#bec2a5', '#838769', '#45463c'],
  plating: ['#aeb4a9', '#626d6a', '#323e41'],
  copperPlating: ['#e5b489', '#9a5843', '#483437'],
  marinePlating: ['#b3d4d0', '#4f7b82', '#294351'],
  ivoryPlating: ['#eee1b8', '#a39c7e', '#534c46'],
};

// Project the character joints from an elevated camera. Local z points toward the camera.
function paintCharacter(art, kind, stride, axePose, recoil, tool, finish) {
  const friendly = kind === 'squad';
  const brute = kind === 'brute';
  const point = ([x, y, z]) => [x * (brute ? 1.18 : 1) + z * 0.13, -y * 0.91 + z * 0.43];

  function shade(x, y, radius, material) {
    const colors = characterPalettes[material];
    const fill = art.createRadialGradient(x - radius * 0.48, y - radius * 0.55, 0,
      x, y, radius * 1.13);
    colors.forEach((color, index) => fill.addColorStop(index / (colors.length - 1), color));
    return fill;
  }

  function volume(center, rx, ry, turn, material) {
    const [x, y] = point(center);
    art.fillStyle = shade(x, y, Math.max(rx, ry), material);
    art.beginPath();
    art.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2);
    art.fill();
  }

  function segment(from, to, startWidth, endWidth, material) {
    const [ax, ay] = point(from);
    const [bx, by] = point(to);
    const length = Math.hypot(bx - ax, by - ay);
    const nx = -(by - ay) / length;
    const ny = (bx - ax) / length;
    const x = (ax + bx) / 2;
    const y = (ay + by) / 2;
    const fill = art.createLinearGradient(x - nx * startWidth, y - ny * startWidth,
      x + nx * startWidth, y + ny * startWidth);
    const colors = characterPalettes[material];
    const ordered = nx > 0 ? colors : [...colors].reverse();
    ordered.forEach((color, index) => fill.addColorStop(index / (ordered.length - 1), color));
    art.fillStyle = fill;
    art.beginPath();
    art.moveTo(ax + nx * startWidth, ay + ny * startWidth);
    art.lineTo(bx + nx * endWidth, by + ny * endWidth);
    art.quadraticCurveTo(bx + (bx - ax) * 0.12, by + (by - ay) * 0.12,
      bx - nx * endWidth, by - ny * endWidth);
    art.lineTo(ax - nx * startWidth, ay - ny * startWidth);
    art.fill();
  }

  const heading = friendly ? -1 : 1;
  const clothes = friendly ? 'uniform' : brute ? 'bruteSkin' :
    kind === 'worker' ? 'workCoat' : kind === 'docker' ? 'canvasCoat' :
      kind === 'scarlet' || kind === 'maroon' ? kind : 'jacket';
  const legs = friendly ? 'uniform' : 'trousers';
  const skin = friendly ? 'skin' : brute ? 'bruteSkin' : 'undead';
  const bob = Math.abs(stride) * 0.38;
  const lean = friendly ? -1.9 : 3.6;
  const hip = 16 - bob;
  const shoulder = 27 - bob;

  for (const side of [-1, 1]) {
    const reach = side * stride * 2.4;
    const sideStep = friendly ? side * stride * 1.4 : 0;
    const knee = [side * 3.1 + sideStep * 0.5, 8 + Math.max(0, -reach) * 0.33, reach * 0.6 + heading * 0.7];
    const ankle = [side * 3.5 + sideStep, 2 + Math.max(0, -reach) * 0.34, reach];
    segment([side * 2.7, hip, 0], knee, 2.7, 2.05, legs);
    segment(knee, ankle, 1.9, 1.45, legs);
    volume([ankle[0], ankle[1] - 1, ankle[2] + heading * 1.2], 2.05, 1.55, heading * 0.26, 'boots');
  }

  // Pivot the upper body over the hips so the planted boot stays on the deck.
  art.translate(0, -hip * 0.91);
  art.rotate((friendly ? -0.023 : 0.032) * stride - (brute ? axePose * 0.13 : 0));
  art.transform(1, 0, 0, friendly ? 1 - recoil * 0.095 : 1, 0, 0);
  art.translate(0, hip * 0.91);

  function arm(side) {
    const axeArm = brute && side === 1;
    const elbow = axeArm ? [7.2, shoulder - 5.5 + axePose * 10, 5 - axePose * 3]
      : friendly ? [side * 7.1, shoulder - 5, 0.5]
      : [side * 7.1, shoulder - 5.5, 6.2 - side * stride];
    const hand = axeArm ? [6.8 + axePose * 1.5, shoulder - 7 + axePose * 19, 9 - axePose * 10]
      : friendly ? [side === 1 ? 2.6 : 0.9, shoulder - 2.4, side === 1 ? -5.2 : -9.6]
      : [side * 6.1, shoulder - 3.8, 11.3 - side * stride];
    segment([side * 4.9, shoulder, lean], elbow, brute ? 3.5 : 2.25, brute ? 2.3 : 1.65, clothes);
    if (brute) volume([side * 5.6, shoulder + 0.3, lean - 0.8], 3.5, 2.9, side * 0.28, finish);
    segment(elbow, hand, brute ? 2.35 : 1.55, brute ? 1.6 : 1.03, friendly ? clothes : skin);
    if (axeArm) {
      const [x, y] = point(hand);
      const swingAngle = tool === 'blade' ? 1.38 - axePose * 2.4 :
        tool === 'ram' ? 1.88 - axePose * 0.9 : 2.02 - axePose * 2.55;
      paintBossTool(art, x, y, swingAngle, tool);
    }
    volume(hand, brute ? 2 : 1.38, brute ? 1.58 : 1.05, 0, skin);
  }

  if (friendly) {
    arm(-1);
    segment([5.4, shoulder - 3, -0.5], [5.5, shoulder - 2, -15], 1.22, 0.91, 'rifle');
    const gun=run.weapons.at(-1) ?? 'standard';
    const tip=[5.2,shoulder+1,-21*weaponEffects[gun].muzzle];
    segment([5.5, shoulder - 2, -15], tip, gun==='scatter'?1.6:.65, gun==='scatter'?1.5:.52, 'rifle');
    if (gun==='spread') segment([7.8,shoulder-2,-13],[7.8,shoulder+1,tip[2]],.75,.63,'rifle');
    if (gun!=='standard') {
      const [x,y]=point(tip);
      art.fillStyle=shotColor(gun);
      art.fillRect(x-1.1,y,2.3,2);
    }
  }

  volume([0, hip, 0], 5.15, 2.55, -0.05, legs);
  segment([0, shoulder, lean], [0, hip, 0], brute ? 7.2 : 5.65, brute ? 4.9 : 4.25, clothes);
  if (brute) {
    for (const side of [-1, 1]) {
      volume([side * 2.6, shoulder - 2.2, lean + 2.2], 2.9, 2.4, side * 0.2, 'bruteSkin');
      segment([side * 3.8, shoulder - 1, lean + 3], [side * 2.9, hip + 0.6, lean + 1], 0.8, 0.55, 'plating');
    }
    segment([0, hip, 3], [0, hip - 1.7, 3], 4.6, 4.5, 'boots');
    volume([0, hip - 0.5, 3.7], 1.3, 0.85, 0, 'plating');
  }
  if (friendly) {
    volume([0, shoulder - 4.6, 2.25], 4.35, 4.65, 0.03, 'armor');
    segment([0, shoulder - 7.4, 3.35], [0, shoulder - 8.5, 3.35], 3.3, 3.3, 'boots');
    arm(1);
  } else {
    arm(-1);
    arm(1);
    if (kind === 'docker') {
      segment([-3.65, shoulder - 4, lean + 3], [3.5, shoulder - 4.1, lean + 3],
        0.85, 0.85, 'reflectiveTape');
    } else if (kind === 'worker') {
      segment([-3.4, shoulder - 2.8, lean + 2.4], [-0.6, shoulder - 2.8, lean + 2.4],
        0.72, 0.72, 'reflectiveTape');
    }
    segment([-1.1, shoulder, lean + 2.6], [0.9, shoulder - 7.4, lean + 0.7],
      0.7, 0.45, 'trousers');
  }

  volume([0, shoulder + 0.5, lean], 1.92, 2.05, 0, skin);
  const head = [friendly ? -0.2 : 0.5, shoulder + 4.1, lean + heading];
  volume(head, 2.9, 3.65, friendly ? 0 : 0.14, skin);
  if (friendly) {
    volume([head[0], head[1] + 0.95, head[2]], 3.55, 3.55, 0, 'helmet');
    segment([-2.9, head[1] - 0.7, head[2] + 1.4], [2.8, head[1] - 0.7, head[2] + 1.4],
      0.51, 0.51, 'boots');
  } else {
    if (brute) {
      volume([head[0], head[1] - 1.8, head[2] + 1.8], 2.05, 1.45, 0.08, skin);
      segment([head[0] - 1.1, head[1] - 2.2, head[2] + 3], [head[0] + 1.4, head[1] - 2.2, head[2] + 3],
        0.3, 0.3, 'boots');
    }
    volume([head[0] - 0.24, head[1] + 1.65, head[2] - 0.31], 2.61, 1.45, 0.18, 'trousers');
    volume([head[0] - 1.2, head[1] - 0.1, head[2] + 2.05], 0.7, 0.43, 0, 'boots');
    volume([head[0] + 1.09, head[1] - 0.1, head[2] + 2.05], 0.63, 0.43, 0, 'boots');
  }
}

function paintBossTool(art, x, y, angle, tool) {
  art.save();
  art.translate(x, y);
  art.rotate(angle);
  const haft = art.createLinearGradient(-1, 0, 1, 0);
  haft.addColorStop(0, '#b88759');
  haft.addColorStop(1, '#503c32');
  art.fillStyle = haft;
  art.fillRect(-1, -16, 2, 21);
  const steel = art.createLinearGradient(-2, -17, 7, -11);
  steel.addColorStop(0, '#aab8bb');
  steel.addColorStop(0.48, '#48565c');
  steel.addColorStop(1, '#c7d5d5');
  art.fillStyle = steel;
  if (tool !== 'axe') {
    art.beginPath();
    if (tool === 'hammer') art.roundRect(-8, -22, 17, 9, 1.9);
    else if (tool === 'hook') {
      art.moveTo(-2, -10);
      art.quadraticCurveTo(-9, -20, 1, -23);
      art.quadraticCurveTo(11, -24, 9, -16);
      art.quadraticCurveTo(6, -20, 2, -18);
      art.lineTo(2, -10);
    } else if (tool === 'mace') {
      for (let point = 0; point < 16; point++) {
        const angle = point * Math.PI / 8;
        const radius = point % 2 ? 4.8 : 7.4;
        art.lineTo(Math.cos(angle) * radius, -17 + Math.sin(angle) * radius);
      }
    } else if (tool === 'blade') {
      art.moveTo(-3, -7);
      art.bezierCurveTo(-4, -13, -6, -20, 6, -26);
      art.lineTo(3, -14);
      art.lineTo(2, -7);
    } else {
      art.moveTo(-5, -12);
      art.lineTo(-8, -21);
      art.lineTo(7, -23);
      art.lineTo(10, -18);
      art.lineTo(8, -12);
    }
    art.closePath();
    art.fill();
    art.strokeStyle = '#dfd7b6';
    art.lineWidth = 0.75;
    art.stroke();
    art.restore();
    return;
  }
  art.beginPath();
  art.moveTo(-2.8, -16);
  art.lineTo(0.2, -16.4);
  art.lineTo(6.7, -19);
  art.quadraticCurveTo(9.2, -13.7, 6.7, -9.6);
  art.lineTo(0.4, -12.6);
  art.lineTo(-2.8, -12.6);
  art.closePath();
  art.fill();
  art.strokeStyle = '#d6dfdc';
  art.lineWidth = 0.55;
  art.beginPath();
  art.moveTo(6.7, -18.8);
  art.quadraticCurveTo(9, -13.7, 6.7, -9.8);
  art.stroke();
  art.restore();
}

function figure(x, y, scale, kind, stride, axe = 0, recoil = 0, distant = false, tool = 'axe', finish = 'plating') {
  const pose = Math.round(stride * 2);
  const axeFrame = Math.round(axe * 12);
  const brute = kind === 'brute';
  const spriteWidth = brute ? 64 : 32;
  const spriteHeight = brute ? 75 : 48;
  const originY = spriteHeight - 8;
  const recoilFrame = Math.round(recoil * 3);
  const key = kind + ':' + pose + ':' + axeFrame + ':' + recoilFrame + ':' + tool + ':' + finish + (kind==='squad' ? run.weapons.at(-1) ?? '' : '');
  let sprite = characterSprites.get(key);
  if (!sprite) {
    sprite = document.createElement('canvas');
    const resolution = kind === 'brute' ? 6 : 3;
    sprite.width = spriteWidth * resolution;
    sprite.height = spriteHeight * resolution;
    const art = sprite.getContext('2d');
    art.setTransform(resolution, 0, 0, resolution, spriteWidth / 2 * resolution, originY * resolution);
    paintCharacter(art, kind, pose / 2, axeFrame / 12, recoilFrame / 3, tool, finish);
    const silhouette = document.createElement('canvas');
    silhouette.width = sprite.width;
    silhouette.height = sprite.height;
    const shade = silhouette.getContext('2d');
    shade.drawImage(sprite, 0, 0);
    shade.globalCompositeOperation = 'source-in';
    shade.fillStyle = '#17232b';
    shade.fillRect(0, 0, silhouette.width, silhouette.height);
    if (kind !== 'squad') {
      const edge = resolution * 0.75;
      art.resetTransform();
      art.globalCompositeOperation = 'destination-over';
      for (const [dx, dy] of [[edge, 0], [-edge, 0], [0, edge], [0, -edge]]) {
        art.drawImage(silhouette, dx, dy);
      }
    }
    sprite = {body: sprite, silhouette};
    characterSprites.set(key, sprite);
  }

  if (!distant) {
    const shadow = ctx.createRadialGradient(x + 4 * scale, y + scale, 0,
      x + 4 * scale, y + scale, 11 * scale);
    shadow.addColorStop(0, '#16232b9e');
    shadow.addColorStop(1, '#16232b00');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x + 4 * scale, y + scale, 11 * scale, 4.1 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(scale, 0, -0.43 * scale, -0.19 * scale, 0, 0);
    ctx.globalAlpha *= 0.28;
    ctx.drawImage(sprite.silhouette, -spriteWidth / 2, -originY, spriteWidth, spriteHeight);
    ctx.restore();
  }
  ctx.drawImage(sprite.body, x - spriteWidth / 2 * scale, y - originY * scale, spriteWidth * scale, spriteHeight * scale);
}

function bossExposed(enemy) {
  return enemy.recoverUntil > run.elapsed && !enemy.guarded;
}

function bossMeter(enemy, x, barY, s) {
  const exposed = bossExposed(enemy);
  const label = exposed ? (enemy.shield ? 'BREAK SHIELD' : 'EXPOSED') :
    enemy.windupUntil !== undefined ? (enemy.leaping ? 'LEAP SMASH' : enemy.followupUsed ? 'FOLLOW-UP' : enemy.weapon.cue.toUpperCase()) :
    enemy.recoverUntil > run.elapsed ? 'GUARDED' : enemy.profile.name.toUpperCase();
  const span = 71 * s;
  const left = clamp(x - span / 2, 3, Math.max(3, width - span - 3));
  ctx.fillStyle = '#252d30';
  ctx.fillRect(left, barY, span, 10 * s);
  ctx.fillStyle = '#77cde9';
  ctx.fillRect(left, barY, span * enemy.shield / enemy.maxShield, 4 * s);
  ctx.fillStyle = exposed && !enemy.shield ? '#e8c76a' : '#f5896f';
  ctx.fillRect(left, barY + 5 * s, span * enemy.health / enemy.maxHealth, 5 * s);
  ctx.textAlign = 'center';
  ctx.font = '800 ' + Math.max(7, 10 * s) + 'px system-ui';
  ctx.fillText(label, left + span / 2, barY - 3 * s);
}

function drawPaintedEnemy(enemy, time) {
  const atlas = paintedAtlases.get(enemy.kind);
  if (!atlas?.naturalWidth) return false;
  const [x, y, s] = project(enemy.x, enemy.z);
  const pose = paintedPose(enemy, time);
  const size = enemy.size * paintedMotion.canvasScale * s;
  const tile = atlas.width / 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 1 - (enemy.fade ?? 0);
  ctx.fillStyle = '#20222955';
  ctx.beginPath();
  ctx.ellipse(size * .09, 0, size * .33, size * .07, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.transform(pose.mirror ? -1 : 1, 0, -pose.lean, pose.stretch, 0, 0);
  ctx.drawImage(atlas, (pose.frame % 4) * tile, Math.floor(pose.frame / 4) * tile,
    tile, tile, -size / 2, -size * 251 / 256, size, size);
  ctx.restore();
  return true;
}

function drawFallenSprite(body) {
  if (drawPaintedEnemy(body, body.time)) return;
  const [x,y,s]=project(body.x,body.z);
  const side=Math.sin(body.angle), along=Math.cos(body.angle);
  ctx.save();
  ctx.globalAlpha=1-body.fade;
  ctx.translate(x,y-body.height*23*s);
  // Project a turning upright silhouette onto the plane of the deck.
  ctx.transform(1,0,-side*Math.sin(body.tilt),
    Math.cos(body.tilt)+along*.42*Math.sin(body.tilt),0,0);
  figure(0,0,s*(body.size??horde.bodyScale),body.boss?'brute':(body.siege?siegeHorde.coats:hordeLooks)[body.coat??0],
    Math.sin(body.time*7+(body.gaitOffset??0))*(1-body.fold),0,0,true,body.tool,body.finish);
  ctx.restore();
}

function drawSprites(time) {
  const objects = [
    ...(levels[levelIndex].beds ?? []).map(item=>({item,paint:drawPlanter})),
    ...run.ice.map(item => ({item, paint: drawIcePatch})),
    ...run.pods.filter(item => item.health > 0).map(item => ({item, paint: drawSeedPod})),
    ...run.fallen.map(item => ({item,paint:drawFallenSprite})),
    ...run.gates.filter(item=>levels[levelIndex].scenery!=='spiral' || item.z<=spiral.bendStart).map(item => ({item, paint: drawGate})),
    ...run.caches.filter(cache => !cache.passed || cache.station==='turret').map(item => ({item, paint: drawArmoryCache})),
    ...run.barricades.map(item => ({item, paint: drawBarricade})),
    ...run.enemies.filter(item => item.health > 0 && !item.passed).map(item => ({
      item, paint: enemy => {
        if (enemy.phase === 'tunnel' || drawPaintedEnemy(enemy, time)) return;
        const [x, y, s] = project(enemy.x, enemy.z);
        const flinch = Math.max(0, 1 - (run.elapsed - (enemy.lastHit ?? -Infinity)) / config.impactTime);
        const stride = enemy.boss
          ? (enemy.windupUntil === undefined && !(enemy.recoverUntil > time)
            ? 2.5 * Math.sin(Math.PI * (enemy.travel ?? 0) / charge.strideDistance) : 0)
          : 2 * Math.sin(time * (enemyTypes[enemy.kind]?.cadence ?? 9) + (enemy.gaitOffset ?? enemy.x * 9));
        const axe = enemy.boss ? bruteAttackPose(enemy, time) : 0;
        const stagger = !enemy.kind && !enemy.boss ? walkerStagger(enemy, time) : 0;
        const limping = !enemy.kind && !enemy.boss && enemy.health < walker.health;
        figure(x + flinch * 4 * s + stagger * 4 * s, y - ((enemy.height ?? 0)*23 + flinch * 3) * s, s * (enemy.size ?? horde.bodyScale),
          enemy.boss ? 'brute' : enemy.kind==='spitter'?'worker':enemy.kind==='leaper'?'docker':(enemy.siege ? siegeHorde.coats : hordeLooks)[enemy.coat ?? 0],
          limping ? stride * .55 - stagger : stride, axe, 0, enemy.siege && enemy.z > siegeHorde.shadowDistance, enemy.profile?.tool, enemy.finish);
        if (enemy.kind === 'armored') {
          prism(x - 4 * s, y - 24 * s, x + 4 * s, y - 15 * s, 2 * s, 2 * s,
            {top: '#c4c8c7', front: '#798995', side: '#42505b'});
        } else if (enemy.kind === 'raider') {
          polygon([[x - 6 * s, y - 44 * s], [x, y - 39 * s], [x + 6 * s, y - 44 * s],
            [x, y - 49 * s]], '#e9a2f2');
        } else if (enemy.kind === 'hulk' || enemy.kind === 'boiler') {
          for (const side of [-1, 1]) {
            const shoulder = x + side * 9 * s;
            prism(shoulder - 5 * s, y - 45 * s, shoulder + 5 * s, y - 33 * s, 3 * s, 3 * s,
              {top: '#db9f77', front: '#986a55', side: '#4c3542'});
          }
        } else if (enemy.kind === 'shield') {
          prism(x - 10 * s, y - 36 * s, x + 10 * s, y - 11 * s, 4 * s, 3 * s,
            {top: '#a5dacf', front: '#356d71', side: '#25484c'});
          line([x - 8 * s, y - 31 * s], [x + 8 * s, y - 31 * s], '#a6d3bc', 2 * s);
        } else if (enemy.kind === 'runner') {
          polygon([[x, y - 44 * s], [x - 4 * s, y - 50 * s], [x + 4 * s, y - 50 * s]], '#ffac60');
        }
        if (enemy.boss) {
          if (enemy.shield) {
            const scale = s * enemy.size;
            const shieldX = x - 6 * scale;
            const shieldY = y - 15 * scale - (enemy.height ?? 0) * 23 * s;
            const steel = ctx.createLinearGradient(shieldX - 6 * scale, shieldY - 8 * scale,
              shieldX + 4 * scale, shieldY + 8 * scale);
            steel.addColorStop(0, '#bde1e2');
            steel.addColorStop(0.46, '#557d8b');
            steel.addColorStop(1, '#263d51');
            polygon([[shieldX - 5 * scale, shieldY - 7 * scale], [shieldX + 5 * scale, shieldY - 8 * scale],
              [shieldX + 6 * scale, shieldY + 2 * scale], [shieldX + 2 * scale, shieldY + 8 * scale],
              [shieldX - 3 * scale, shieldY + 6 * scale]], steel);
            ctx.strokeStyle = '#b4dae1';
            ctx.lineWidth = scale * 0.55;
            ctx.stroke();
          }
          const barY = y - (enemy.size * (37 + axe * 18) + 13 + (enemy.height ?? 0) * 23) * s;
          bossMeter(enemy, x, barY, s);
        }
      },
    })),
  ];
  objects.filter(({item}) => item.z < cameraViewDistance() && item.z > -8)
    .sort((a, b) => b.item.z - a.item.z).forEach(({item, paint}) => paint(item));


}

function drawSpecialWarnings(time) {
  function markLane(targetX,kind) {
    const {left,right,front,back}=specialLane(targetX,kind);
    const top=front-9, bottom=back+5;
    ctx.fillStyle=enemyTypes[kind].color+'25';
    ctx.fillRect(left,top,right-left,bottom-top);
    ctx.strokeStyle=enemyTypes[kind].color;
    ctx.lineWidth=2;
    ctx.setLineDash([6,4]);
    ctx.strokeRect(left,top,right-left,bottom-top);
    ctx.setLineDash([]);
  }
  for(const e of run.specialists){
    if(e.health>0 && !e.passed && e.attack && e.kind!=='howler')markLane(e.attack.targetX,e.kind);
  }
  for (const e of run.specialists) {
    if (e.kind === 'crawler' && e.health > 0 && (e.phase === 'dive' || e.phase === 'tunnel'))
      drawCrawlerGrate(e.exitX, campaignSpecialists.crawler.exitDistance, time);
  }
  for(const glob of run.acid)markLane(glob.targetX,'spitter');
  for(const burst of run.specialBursts){
    const progress=clamp((time-burst.time)/config.fallTime,0,1);
    const [x,y,s]=project(burst.x,burst.z);
    ctx.save();
    ctx.globalAlpha=1-progress;
    ctx.strokeStyle=enemyTypes[burst.kind].color;
    ctx.lineWidth=3*s;
    ctx.beginPath();
    ctx.ellipse(x,y,(12+progress*49)*s,(5+progress*16)*s,0,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
}

function drawSpecialSignals(time,stage) {
  ctx.save();
  ctx.font='bold 11px system-ui';ctx.textAlign='center';
  for(const e of run.specialists){
    if(!e.health || e.passed || e.z>config.fireRange || e.z<0)continue;
    const type=enemyTypes[e.kind];
    const elevation=e.phase==='tunnel' ? 0 : encounterTuning.roster.includes(e.kind) ? e.size : (e.height??0)+2*e.size/horde.bodyScale;
    const [x,foot,s]=project(e.x,e.z);
    const pixels=encounterTuning.roster.includes(e.kind) ? paintedMotion.canvasScale : 23;
    const y=stage?Breakwater.project(e.x,e.z,width,height,elevation)[1]:foot-pixels*s*elevation;
    const label=e.kind==='boiler' ? (e.phase==='open' ? 'CORE OPEN ×'+type.coreDamage :
      e.phase==='vent' ? 'VENTING' : type.label) : specialistLabels[e.phase] ?? type.label;
    const w=ctx.measureText(label).width+12;
    const anchor=clamp(x,w/2+2,width-w/2-2);
    ctx.fillStyle='#142326ef';ctx.fillRect(anchor-w/2,y-15,w,17);
    ctx.fillStyle=type.color;ctx.fillText(label,anchor,y-3);
    if(e.attack){
      const progress=clamp(1-(e.attack.release-time)/(type.windup*run.difficulty.warning),0,1);
      ctx.fillRect(anchor-w/2,y+1,progress*w,2);
    }
  }
  for(const e of run.enemies){
    if(!(e.ralliedUntil>time) || !e.health || e.passed || e.z>cameraViewDistance())continue;
    const [x,y,s]=project(e.x,e.z);
    ctx.strokeStyle=enemyTypes.howler.color;ctx.lineWidth=2*s;
    ctx.beginPath();ctx.moveTo(x-4*s,y+4*s);ctx.lineTo(x,y+7*s);ctx.lineTo(x+4*s,y+4*s);ctx.stroke();
  }
  if(!stage)for(const glob of run.acid){
    const [x,y,s]=project(glob.x,glob.z);
    ctx.fillStyle=enemyTypes.spitter.color;ctx.strokeStyle='#385615';ctx.lineWidth=2*s;
    ctx.beginPath();ctx.arc(x,y-glob.height*23*s,5*s,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}

function drawArmorReadouts(time, stage) {
  for (const enemy of run.enemies) {
    if (!armoredEnemy(enemy) || enemy.passed || enemy.health <= 0 || enemy.z < 0 ||
        enemy.z > config.fireRange || time - (enemy.lastHit ?? -Infinity) > config.combatNoticeTime) continue;
    const [x, foot, scale] = project(enemy.x, enemy.z);
    const elevation = 2.35 * (enemy.size ?? horde.bodyScale) / horde.bodyScale;
    const y = stage ? Breakwater.project(enemy.x, enemy.z, width, height, elevation)[1] : foot - 26 * elevation * scale;
    const span = Math.max(20, 32 * scale);
    const left = x - span / 2;
    ctx.fillStyle = '#101719';
    ctx.fillRect(left - 2, y - 1, span + 4, 6);
    const gap = span / enemy.maxHealth;
    for (let hit = 0; hit < enemy.maxHealth; hit++) {
      ctx.fillStyle = hit < enemy.health ? '#a8deef' : '#3a4c55';
      ctx.fillRect(left + hit * gap, y, gap - 1, 4);
    }
  }
}

function drawBossDebris(impact, age) {
  const [x, y, scale] = project(impact.x, 0);
  const t = age / charge.dustTime;
  const radius = (impact.landed ? 78 : 56) * scale * t;
  ctx.save();
  ctx.globalAlpha = (1 - t) * .78;
  ctx.strokeStyle = '#ffe0ae';
  ctx.lineWidth = (3 - 2*t) * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, radius + 4, radius * .28 + 2, 0, 0, 2*Math.PI);
  ctx.stroke();
  ctx.fillStyle = '#bda184';
  for (let i = 0; i < 10; i++) {
    const angle = i * 2.4;
    const travel = radius * (.55 + .09 * (i % 5));
    const lift = 4 * t * (1-t) * (12 + 4 * (i % 4)) * scale;
    ctx.fillRect(x + Math.cos(angle)*travel, y + Math.sin(angle)*travel*.28 - lift, 3*scale, 2*scale);
  }
  ctx.restore();
}

function draw(time) {
  ctx.clearRect(0, 0, width, height);
  const stage = onStage();
  const level = levels[levelIndex];
  if (!stage && !level.chapter && level.scenery!=='spiral') drawWater(time);
  const footfall = run.bruteFootfall;
  const impact = run.bruteImpact;
  const stepAge = footfall ? time - footfall.time : Infinity;
  const impactAge = impact ? time - impact.time : Infinity;
  const stepFade = Math.max(0, 1 - stepAge / charge.stepShakeTime);
  const impactFade = Math.max(0, 1 - impactAge / charge.impactShakeTime);
  ctx.save();
  const shakeOffset = [0, 0];
  if (!reducedMotion.matches) {
    const weight = footfall ? project(footfall.x, footfall.z)[2] : 0;
    const shake = charge.stepShake * stepFade * weight + (impact?.landed ? charge.leapShake : charge.impactShake) * impactFade;
    shakeOffset[0] = Math.sin(time * 85) * shake * 0.5;
    shakeOffset[1] = -Math.cos(time * 95) * shake;
    ctx.translate(...shakeOffset);
  }
  if (stage) {
    stageRenderer.draw(run,time,width,height,squadFormation(),shakeOffset,levels[levelIndex]);
    drawWeather(time, levels[levelIndex].lighting);
    const boss = run.enemies.at(-1);
    if (boss.health && boss.z < cameraViewDistance()) {
      const [x, y, scale] = Breakwater.project(boss.x,boss.z,width,height,4.22 * boss.size / charge.size + (boss.height ?? 0));
      bossMeter(boss, x, Math.max(21, y), scale);
    }
  } else {
    levels[levelIndex].backdrop?.(time);
    if(level.scenery==='spiral') drawSpiralDeck();
    else drawBridge(time);
    drawWeather(time, levels[levelIndex].lighting);
  }
  if (footfall && stepFade > 0) {
    const [x, y, scale] = project(footfall.x, footfall.z);
    const spread = (1 - stepFade) * 18 * scale;
    ctx.strokeStyle = 'rgba(240,221,194,' + stepFade * 0.53 + ')';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.ellipse(x + footfall.side * 12 * scale, y, 8 * scale + spread,
      3 * scale + spread * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const hazard of run.barricades) {
    if (hazard.kind === 'debris' && hazard.z > 0 && hazard.z <= storm.warningDistance) {
      drawLaneWarning(hazard.x, hazard.z, config.barricadeWidth, '#a0eaff64');
      const [x, y, scale] = project(hazard.x, hazard.z);
      for (let i = -3; i <= 3; i++) {
        const lift = (11 + Math.sin(time * 13 + i * 2) * 7) * scale;
        line([x + i * 5 * scale, y], [x + i * 7 * scale, y - lift], '#dbfaffbc', 2 * scale);
      }
    }
  }
  for (const enemy of run.enemies) {
    if (!stage && enemy.health && enemy.boss && enemy.windupUntil !== undefined) {
      const {left, right, front, back, center} = bruteStrikeLane(enemy);
      polygon([[left, back], [right, back], [right, front], project(center + enemy.attackWidth, enemy.z),
        project(center - enemy.attackWidth, enemy.z), [left, front]], '#f65a4f87');
      line([left, back], [right, back], '#ffe2c8ad', 2);
    }
  }
  if (impact && impactAge < config.fallTime) {
    ctx.save();
    ctx.globalAlpha = (1 - impactAge / config.fallTime) * 0.75;
    ctx.fillStyle = '#f69a79';
    ctx.fillRect(impact.left * width, impact.front * height,
      (impact.right - impact.left) * width, Math.max(5, (impact.back - impact.front) * height));
    ctx.restore();
  }

  if (impact && impactAge < charge.dustTime) drawBossDebris(impact, impactAge);
  if (level.chapter && level.scenery !== 'snowline') drawChapterSignals(level,time);
  drawSpecialWarnings(time);
  if (!stage) drawSprites(time);
  if (level.scenery === 'snowline') drawChapterSignals(level,time);
  drawSpecialSignals(time,stage);
  drawArmorReadouts(time,stage);
  drawFlow(level);
  for (const body of run.fallen) {
    const t=(body.age-body.contact)/falls.dustTime;
    if(t<0 || t>=1 || body.z>falls.soundRange || body.z < -7)continue;
    const [x,y,s]=project(body.x,body.z);
    ctx.fillStyle='rgba(186,168,142,'+(.31*(1-t))+')';
    for(let i=0;i<5;i++){
      const a=body.angle+i*2.4, r=(body.heavy?19:10)*s*t;
      ctx.beginPath();ctx.ellipse(x+Math.sin(a)*r,y+Math.cos(a)*r*.38-3*s*t,(1+t*2)*s,(1+t)*s,0,0,2*Math.PI);ctx.fill();
    }
  }

  if (run.blast && time - run.blast.time < armory.blastTime) {
    const progress = (time - run.blast.time) / armory.blastTime;
    const [x, y, s] = project(run.blast.x, run.blast.z);
    ctx.strokeStyle = 'rgba(255,167,86,' + (1 - progress) + ')';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.ellipse(x, y, (8 + 67 * progress) * s, (5 + 25 * progress) * s, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const shot of stage ? [] : run.shots) {
    const style=weaponEffects[shot.weapon];
    const progress=clamp(shot.z/Math.max(1,shot.target?.z??shot.range),0,1);
    const fan=(style.fan??0)*shot.fan*Math.sin(Math.PI*progress);
    const lane=shot.x+(fan+shot.barrel*(style.barrelOffset??0)*(1-progress))/Breakwater.camera.halfRoad;
    const [headX,headY,scale]=project(lane,shot.z);
    const [tailX,tailY,tailScale]=project(lane,Math.max(0,shot.z-style.length/Breakwater.camera.metresPerDepth));
    const aimHeight=shot.target?.pod ? 19+(11-19)*progress : shot.target?.kind==='boiler' ?
      19+(shot.target.size*paintedMotion.canvasScale*enemyTypes.boiler.coreHeight-19)*progress : 19;
    const head=[headX,headY-aimHeight*scale], tail=[tailX,tailY-aimHeight*tailScale];
    const radius=style.width*width/Breakwater.camera.halfRoad*scale;
    line(head,tail,shotColor(shot.weapon),Math.max(1.5,radius));
    line(head,tail,'#fff4ca',Math.max(.75,radius*.35));
  }
  for (const impact of run.impacts) {
    const [px, py, scale] = project(impact.x, impact.z);
    const fade = 1 - (run.elapsed - impact.time) / config.impactTime;
    const core = impact.pod ? campaignSpecialists.carrier.podAimHeight : impact.boilerSize * enemyTypes.boiler.coreHeight;
    const center = stage ? Breakwater.project(impact.x,impact.z,width,height,core || 1.28 + impact.height)
      : [px, py - (core ? core * paintedMotion.canvasScale : 15 + impact.height * 23) * scale];
    if (!impact.blocked && !impact.plated && impact.weapon !== 'standard') {
      const style=weaponEffects[impact.weapon];
      const radius=(1-fade)*scale*(4+style.recoil*7);
      ctx.save();
      ctx.globalAlpha=fade;
      ctx.strokeStyle=shotColor(impact.weapon);
      ctx.lineWidth=Math.max(1, 2*scale);
      ctx.beginPath();
      ctx.ellipse(center[0],center[1],radius,radius*.75,0,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    line([px - 5 * scale, center[1] - 4 * scale], [px + 5 * scale, center[1] + 4 * scale],
      ((impact.blocked || impact.plated) ? 'rgba(121,217,246,' : 'rgba(255,239,174,') + fade + ')', 2 * scale);
    line([px - 3 * scale, center[1] + 5 * scale], [px + 3 * scale, center[1] - 5 * scale],
      ((impact.blocked || impact.plated) ? 'rgba(204,241,255,' : 'rgba(255,250,215,') + fade + ')', 2 * scale);
  }
  const {members, size, radiusX, radiusY} = squadFormation();
  for (const [i, member] of members.entries()) {
    const {x: memberX, y: memberY, row} = member;
    if (stage) continue;
    const visualScale = config.soldierVisualScale * member.scale;
    const figureSize = size * visualScale;
    ctx.strokeStyle = run.armor ? '#9ccfffbd' : '#a8f278af';
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.ellipse(memberX, memberY, radiusX * visualScale, radiusY * visualScale, 0, 0, Math.PI * 2);
    ctx.stroke();
    const delay = ((i * 7) % 11) * 0.003;
    const sinceShot = run.elapsed - run.lastVolleyAt - delay;
    const recoil = sinceShot >= 0 && mode === 'running' ?
      Math.max(0, 1 - sinceShot / config.muzzleTime) : 0;
    figure(memberX, memberY,
      figureSize * 1.15, 'squad', mode === 'running' ? Math.sin(time * 13 + i) * Math.min(2.6, Math.abs(run.velocity) * 2 + member.joining * 2) : 0, 0, recoil);
    if (row === 0 && recoil > 0.55) {
      const tip = [memberX + 2.5 * figureSize, memberY - (39 - recoil) * figureSize];
      line([tip[0] - 3 * size, tip[1] + size], [tip[0] + 3 * size, tip[1] - size], '#fff2b8', 2 * size);
      line([tip[0], tip[1] + 3 * size], [tip[0] + size, tip[1] - 4 * size], '#fffbed', 2 * size);
    }
  }
  if (impact && impactAge < config.fallTime) {
    const phase = impactAge / config.fallTime;
    for (const [index, [unitX, unitY]] of impact.strikes.entries()) {
      const x = unitX * width;
      const y = unitY * height;
      const protectedByArmor = index < impact.blocked;
      ctx.save();
      ctx.globalAlpha = 1 - phase;
      if (!protectedByArmor && !stage) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((index % 2 ? -1 : 1) * phase * 1.2);
        ctx.scale(1, 1 - phase * 0.6);
        figure(0, 0, size * config.soldierVisualScale, 'squad', 0, 0, 0, true);
        ctx.restore();
      }
      ctx.strokeStyle = protectedByArmor ? '#a2dbff' : '#ff796c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, (8 + 14 * phase) * size, (4 + 8 * phase) * size, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const recruit of run.recruits) {
    const phase = (time - recruit.time) / config.recruitTime;
    const [px, py] = project(recruit.x, 0);
    ctx.save();
    ctx.globalAlpha = 1 - phase;
    ctx.strokeStyle = '#ff926f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, py - 3, 13 + phase * 32, 5 + phase * 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd4c6';
    ctx.font = '800 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(gateLabel(recruit.count), px, py - 32 - phase * 32);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const radius = 9 + phase * 27;
      ctx.fillRect(px + Math.cos(angle) * radius, py + Math.sin(angle) * radius * 0.4 - phase * 26, 3, 3);
    }
    ctx.restore();
  }
  ctx.restore();
  if (run.flash) {
    ctx.fillStyle = 'rgba(214,70,47,' + run.flash * 0.8 + ')';
    ctx.fillRect(0, 0, width, height);
  }
}

let lastStageFrame;
function resize() {
  lastStageFrame = undefined;
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, config.maxPixelRatio);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  prepareDeckMaterial();
  scenery = Array.from({length: 390}, () => [Math.random(), Math.random(), 3 + Math.random() * 34, 0.035 + Math.random() * 0.17]);
}

function frame(time) {
  const dt = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, config.maxFrameTime);
  previousTime = time;
  const finishing = (mode==='won' || mode==='lost') && run.fallen.length>0;
  if (mode === 'running') step(dt);
  else if (finishing) advanceFalls(dt);
  if (finishing || !onStage() || lastStageFrame?.run !== run || lastStageFrame.time !== run.elapsed || lastStageFrame.mode !== mode) {
    draw(run.elapsed);
    lastStageFrame = onStage() ? {run, time: run.elapsed, mode} : undefined;
  }
  requestAnimationFrame(frame);
}

function togglePause() {
  if (mode === 'running') setMode('paused');
  else if (mode === 'paused') setMode('running');
}

action.addEventListener('click', () => {
  void enableAudio();
  if (mode === 'ready') setMode('running');
  else if (mode === 'paused') togglePause();
  else if (mode === 'won' && levelIndex + 1 < levels.length) {
    levelIndex++;
    reset('ready');
    action.focus();
  } else reset('running');
});
replay.addEventListener('click', () => {
  if (mode !== 'won') return;
  void enableAudio();
  reset('running');
  canvas.focus();
});
function selectMission() {
  returningPlayer = false;
  levelIndex = Number(levelSelect.value);
  saveCheckpoint(levelIndex);
  reset('ready');
}
difficultySelect.addEventListener('change', selectMission);
levelSelect.addEventListener('change', selectMission);
pause.addEventListener('click', togglePause);
byId('restart').addEventListener('click', () => {
  void enableAudio();
  reset('running');
  canvas.focus();
});
window.addEventListener('keydown', event => {
  if (event.code === 'Escape' && !event.repeat) togglePause();
  if (mode !== 'running' || !['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) return;
  event.preventDefault();
  keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => {
  if (mode === 'running') setMode('paused');
});

canvas.tabIndex = 0;
canvas.addEventListener('pointerdown', event => {
  if (mode !== 'running' || !event.isPrimary || event.button !== 0) return;
  canvas.setPointerCapture(event.pointerId);
  drag = {id: event.pointerId, pan:run.cameraX, start: event.clientX, x: run.x, target: run.x, screenScale: width * cameraHalfScreen()};
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId) return;
  if(levels[levelIndex].scenery==='spiral'){
    const bounds=canvas.getBoundingClientRect(), fraction=(event.clientX-bounds.left)/bounds.width;
    drag.target=fraction<spiral.edgeTouch?-spiral.edge:fraction>1-spiral.edgeTouch?spiral.edge:
      clamp(drag.x+(event.clientX-drag.start)/drag.screenScale+run.cameraX-drag.pan,-spiral.edge,spiral.edge);
    return;
  }
  drag.target = clamp(drag.x + (event.clientX - drag.start) / drag.screenScale, -config.edge, config.edge);
});
for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  canvas.addEventListener(eventName, event => {
    if (drag?.id === event.pointerId) drag = undefined;
  });
}

restoreCheckpoint();
reset('ready');
resize();
new ResizeObserver(resize).observe(canvas);
requestAnimationFrame(frame);
