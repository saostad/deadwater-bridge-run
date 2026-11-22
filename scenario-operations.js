'use strict';

// Scenario operations add story objectives to the bridge run. The boss still ends a mission,
// but the mission only succeeds when every objective is complete.
// Times and positions are fractions of the crossing. Lanes run from -1 (left) to 1 (right).
const scenarioTuning = {
  waveAt: [.09,.24,.40,.58,.74], waveBase: 40, waveGrowth: 7, missionGrowth: 2, columnWidth: .38,
  escortAt: [.30,.62], escortSize: {runner: 6, raider: 5, shield: 3, armored: 6, hulk: 2},
  gateAt: [.03,.20,.38,.56,.74], gatesPerGroup: 6, reinforcementAt: .47, reinforcement: 5,
  survivorLane: .66, chargeHits: 2, holdSpawn: 12, holdPulse: .7, holdWidth: .30,
  quarryLanes: [-.55,.5,-.3,.6,-.6,.35], quarrySlack: 1, quarryFrom: .12, quarryTo: .72,
  bossTier: 18, siege: {columns: 4, rowDepth: 6.8},
  colors: {survivor: '#3be3a7', charge: '#ff6a4d', quarry: '#ffbe57', hold: '#ffd477'},
};

// [name, story, boss, tool, wave lanes, escort, scenery, lighting, objectives, boss traits]
// Objectives: rescue [need, [[at, side, survivors]]], charges [need, [[at, lane]]],
// hold [at, seconds, [[lane, count, kind]]], hunt [[kind, need]], protect breaches, extract soldiers.
const scenarioOperations = [
  {
    name: 'Operation Lifeline', intro: 'Evacuate the old harbor.',
    missions: [
      ['Night Ferry', 'The last ferry is waiting at the far pier. Walk your squad through the green survivor gates before the horde reaches them.',
        'Ferryman', 'hook', [.05,-.2,.18,-.1], 'runner', 'harbor', 'dusk',
        {rescue: [3, [[.12,1,2],[.33,-1,2],[.52,1,2],[.70,-1,2]]]}],
      ['Clinic Run', 'Medics are trapped in the clinic and civilians shelter behind your line. Rescue the medics and keep the street from being overrun.',
        'Ward Sister', 'blade', [-.15,.2,-.25,.1], 'raider', 'town', 'mist',
        {rescue: [3, [[.15,-1,2],[.36,1,3],[.55,-1,2],[.72,1,2]]], protect: 30}],
      ['Bell Tower', 'Survivors are climbing down from the bell tower. Dig in and hold the square until the last of them reaches the ground.',
        'Tower Warden', 'mace', [.2,-.12,.25,-.2], 'shield', 'town', 'mist',
        {hold: [.42, 18, [[-.32,14],[.32,14],[0,4,'armored']]], rescue: [2, [[.22,1,2],[.62,-1,3],[.76,1,2]]]}],
      ['Ferry Ramp', 'Families are boarding behind you. Every zombie that crosses the line reaches the ramp, so hold the line and pick up the stragglers.',
        'Ramp Breaker', 'ram', [-.3,.12,-.2,.25], 'hulk', 'dock', 'dusk',
        {protect: 28, rescue: [4, [[.10,-1,2],[.28,1,2],[.45,-1,2],[.60,1,2],[.75,-1,2]]]}],
      ['Last Boat Out', 'The storm is closing the harbor. Rescue the final groups and bring a full squad to the last boat.',
        'Harbor Master', 'axe', [.12,-.3,.3,-.05], 'armored', 'harbor', 'storm',
        {rescue: [4, [[.12,1,2],[.30,-1,3],[.46,1,2],[.62,-1,3],[.76,1,2]]], extract: 10}, {followup: true}],
    ],
  },
  {
    name: 'Operation Blackout', intro: 'Seal the flooded tunnels.',
    missions: [
      ['Fuse Line', 'Demolition charges line the freight yard. Shoot each red charge before it passes you to collapse the tunnel mouths.',
        'Lineman', 'hook', [0,.22,-.2,.12], 'runner', 'freight', 'dusk',
        {charges: [2, [[.18,-.45],[.42,.45],[.66,-.3]]]}],
      ['Pump House', 'Set off the pump house charges, then hold the gantry while the engineers seal the valves.',
        'Pump Warden', 'hammer', [-.2,.15,-.1,.22], 'raider', 'lock', 'storm',
        {charges: [3, [[.14,.4],[.30,-.4],[.58,.35],[.72,-.35]]], hold: [.44, 15, [[-.3,12],[.3,12],[0,3,'raider']]]}],
      ['Sluice Charges', 'Every sluice must fall. Miss a single charge and the flood carries the horde into the city.',
        'Sluice Tyrant', 'mace', [.18,-.22,.1,-.15], 'shield', 'lock', 'storm',
        {charges: [4, [[.15,-.4],[.33,.4],[.51,-.4],[.69,.4]]]}],
      ['Dark Basin', 'Blow the basin charges in the dark. The work crews behind you cannot take many breaches.',
        'Basin Diver', 'blade', [-.25,.2,-.15,.25], 'hulk', 'dock', 'dusk',
        {charges: [3, [[.16,.42],[.36,-.42],[.55,.3],[.72,-.3]]], protect: 32}],
      ['Floodgate Zero', 'Detonate the main floodgate, hold until it drains, and bring a squad big enough to secure the far bank.',
        'Floodgate Titan', 'ram', [.1,-.25,.22,-.1], 'armored', 'lock', 'storm',
        {charges: [4, [[.12,-.4],[.28,.4],[.52,-.35],[.66,.35],[.76,0]]], hold: [.40, 20, [[-.35,14],[.35,14],[0,2,'hulk']]], extract: 8},
        {followup: true}],
    ],
  },
  {
    name: 'Operation Silent Siren', intro: 'Hunt the horde callers.',
    missions: [
      ['Watchtower', 'Leapers are hunting from the floodlight towers. Shoot the marked targets before they slip past the line.',
        'Tower Sentry', 'axe', [.12,-.18,.2,-.05], 'runner', 'floodlights', 'dusk',
        {hunt: [['leaper', 3]]}],
      ['Siren Yard', 'Howlers in the checkpoint yard are calling the horde. Silence them while the evacuees hold behind your line.',
        'Yard Siren', 'hook', [-.18,.22,-.1,.15], 'raider', 'checkpoint', 'dusk',
        {hunt: [['howler', 3]], protect: 34}],
      ['Spitter Row', 'Spitters have the convoy pinned. Kill the marked spitters and pull the drivers out through the green gates.',
        'Row Boss', 'mace', [.2,-.1,.15,-.25], 'shield', 'convoy', '',
        {hunt: [['spitter', 4]], rescue: [2, [[.25,1,3],[.50,-1,3],[.70,1,2]]]}],
      ['Toll of Bells', 'The toll plaza bells draw every howler for miles. Hold the plaza and silence them as they arrive.',
        'Toll Collector', 'hammer', [-.1,.25,-.25,.05], 'hulk', 'toll', 'dusk',
        {hunt: [['howler', 4]], hold: [.38, 16, [[-.3,12],[.3,12],[0,1,'howler']]]}],
      ['The Choir', 'The horde callers gather for one last chorus. Hunt howlers and spitters, then bring your squad home.',
        'Choirmaster', 'blade', [.15,-.25,.25,-.12], 'armored', 'checkpoint', 'storm',
        {hunt: [['howler', 3], ['spitter', 2]], extract: 10}, {followup: true}],
    ],
  },
  {
    name: 'Operation Dawnbreak', intro: 'Retake the high crossing.',
    missions: [
      ['First Light', 'Climbers are stranded on the viaduct and its supports are wired. Save the climbers and blow the infected spans.',
        'Ridge Hauler', 'hook', [.1,-.2,.2,-.15], 'runner', 'canyon', 'dawn',
        {rescue: [3, [[.14,-1,2],[.34,1,2],[.54,-1,2],[.72,1,2]]], charges: [2, [[.24,.4],[.46,-.4],[.64,.3]]]}],
      ['Mesa Relay', 'Hold the relay while it calls in air support. Leapers will drop from the mesa to break your position.',
        'Mesa Stalker', 'blade', [-.2,.15,-.25,.2], 'raider', 'canyon', 'dawn',
        {hold: [.40, 18, [[-.32,14],[.32,14],[0,1,'leaper']]], hunt: [['leaper', 3]]}],
      ['Viaduct Breach', 'Drop the cracked spans before the horde crosses them. The supply column waits behind your line.',
        'Span Crusher', 'hammer', [.22,-.1,.18,-.22], 'shield', 'canyon', 'dawn',
        {charges: [3, [[.15,-.4],[.33,.4],[.53,-.35],[.70,.35]]], protect: 34}],
      ['Red Sky Convoy', 'Spitters are shelling the convoy. Rescue the drivers, take out the spitters, and arrive in force.',
        'Convoy Wrecker', 'ram', [-.15,.25,-.1,.2], 'hulk', 'convoy', 'dawn',
        {rescue: [4, [[.12,1,2],[.30,-1,2],[.46,1,3],[.62,-1,2],[.76,1,2]]], hunt: [['spitter', 3]], extract: 12}],
      ['Dawnbreak', 'Everything rides on this crossing. Rescue the last survivors, blow the bridge charges, hold for the airlift, and face the Dawn Colossus.',
        'Dawn Colossus', 'axe', [.1,-.3,.25,-.15], 'armored', 'canyon', 'dawn',
        {rescue: [3, [[.10,-1,2],[.26,1,3],[.56,-1,2],[.72,1,2]]], charges: [3, [[.18,.4],[.34,-.4],[.60,.35],[.75,-.35]]],
          hold: [.45, 22, [[-.35,15],[.35,15],[0,3,'armored'],[.5,1,'leaper']]], extract: 14},
        {followup: true, power: 2, recovery: 1.1}],
    ],
  },
];

function buildScenarioLevels() {
  const t = scenarioTuning;
  const backdrops = {harbor: drawHarbor, freight: drawHarbor, floodlights: drawHarbor, checkpoint: drawHarbor,
    toll: drawHarbor, convoy: drawHarbor, town: drawOldTown, dock: drawDryDock, lock: drawTidalLock, canyon: drawCanyon};
  let mission = 0;
  return scenarioOperations.flatMap((operation, op) => operation.missions.map((entry, part) => {
    const [name, story, bossName, tool, lanes, escort, scene, lighting, goals, traits = {}] = entry;
    const n = mission++, length = 860 + part * 40 + op * 30, side = lanes[0] < 0 ? -1 : 1;
    const waves = t.waveAt.map((at, i) => [at * length, lanes[i % lanes.length],
      t.waveBase + i * t.waveGrowth + n * t.missionGrowth, undefined, t.columnWidth]);
    t.escortAt.forEach((at, i) => waves.push([at * length, side * (i ? .46 : -.46), t.escortSize[escort], escort]));
    const specialists = [[length * .3, -side * .5, ['leaper','spitter','howler'][n % 3]]];
    const quarry = [];
    for (const [k, [kind, need]] of (goals.hunt ?? []).entries()) {
      const total = need + t.quarrySlack, speed = enemyTypes[kind].speed;
      for (let i = 0; i < total; i++) {
        const at = t.quarryFrom + (t.quarryTo - t.quarryFrom) * (i + k * .5) / total;
        quarry.push([speed * length * at / config.approachSpeed, t.quarryLanes[(i + quarry.length) % t.quarryLanes.length], kind]);
      }
    }
    const gates = [...recruitLanes(t.gateAt.map((at, i) => [at * length, i % 2 ? -side : side]), t.gatesPerGroup),
      [t.reinforcementAt * length, -side * .66, t.reinforcement, 'truck']];
    for (const [at, gateSide, count] of goals.rescue?.[1] ?? [])
      gates.push([at * length, gateSide * t.survivorLane, count, 'survivor']);
    const objectives = describeScenario(goals);
    return {
      name, scenery: scene, backdrop: backdrops[scene], lighting: lighting || undefined,
      operation, part, title: part ? name : operation.intro, length,
      objective: story, brief: story + ' Objectives: ' + objectives.join(' · ') + '.',
      boss: {name: bossName, tool, ...traits}, bossTier: t.bossTier + Math.floor(n / 2),
      startingSquad: 3 + Math.min(2, op), breachLimit: goals.protect ?? 48 + n * 2, siege: t.siege,
      waves, specialists, quarry, gates,
      barricades: scene === 'lock' ? [[length * .27, 0, 'debris'], [length * .63, 0, 'debris']]
        : [[length * .32, -side * .58], [length * .58, side * .56]],
      scenario: goals,
    };
  }));
}

function describeScenario(goals) {
  const list = [];
  if (goals.rescue) list.push('rescue ' + goals.rescue[0] + ' of ' + goals.rescue[1].length + ' survivor groups');
  if (goals.charges) list.push('detonate ' + goals.charges[0] + ' of ' + goals.charges[1].length + ' charges');
  if (goals.hold) list.push('hold position for ' + goals.hold[1] + ' seconds');
  for (const [kind, need] of goals.hunt ?? []) list.push('eliminate ' + need + ' ' + enemyTypes[kind].label.toLowerCase() + 's');
  if (goals.protect) list.push('allow no more than ' + goals.protect + ' breaches');
  if (goals.extract) list.push('reach the boss with at least ' + goals.extract + ' soldiers');
  return list;
}

function setupScenario(level) {
  const goals = level.scenario;
  if (!goals) { run.scenario = null; return; }
  const t = scenarioTuning;
  const state = run.scenario = {rescued: 0, lostGroups: 0, detonated: 0, missedCharges: 0, kills: {}, failure: null, hold: null};
  for (const [at, x] of goals.charges?.[1] ?? []) {
    run.caches.push({z: at * level.length, x, kind: 'drum', charge: true,
      health: armory.tuning.drum.hits + t.chargeHits * run.difficulty.armor});
  }
  for (const [z, x, kind] of level.quarry) {
    const type = enemyTypes[kind];
    run.enemies.splice(-1, 0, {z, x, kind, quarry: true, size: type.size, health: type.health + run.difficulty.armor, gaitOffset: z});
  }
  if (goals.hold) state.hold = {at: goals.hold[0] * level.length, time: goals.hold[1], waves: goals.hold[2]};
}

// Returns the travel multiplier. A hold stops the advance while its waves attack.
function updateScenario(level) {
  const state = run.scenario;
  if (!state) return 1;
  const hold = state.hold;
  if (hold && hold.started === undefined && run.elapsedDistance >= hold.at) {
    hold.started = run.elapsed;
    hold.sent = 0;
    combatNotice('Hold position · ' + hold.time + ' seconds');
    playSound('warning');
  }
  // Hold waves arrive in even pulses across the stand.
  while (holding() && hold.sent < hold.waves.length &&
      run.elapsed - hold.started >= hold.sent * hold.time * scenarioTuning.holdPulse / hold.waves.length) {
    spawnHoldWave(level, hold.waves[hold.sent++]);
  }
  if (hold?.started !== undefined && !hold.done && run.elapsed - hold.started >= hold.time) {
    hold.done = true;
    combatNotice('Position held · advance');
    playSound('recruit');
  }
  for (const gate of run.gates) {
    if (gate.kind === 'survivor' && !gate.used && !gate.lost && gate.z < config.breachLine) {
      gate.lost = true;
      state.lostGroups++;
      combatNotice('Survivors left behind');
    }
  }
  for (const cache of run.caches) {
    if (cache.charge && cache.passed && !cache.detonated && !cache.missed) {
      cache.missed = true;
      state.missedCharges++;
      combatNotice('Charge missed');
    }
  }
  state.failure = scenarioFailure(level);
  return holding() ? 0 : 1;
}

function spawnHoldWave(level, [x, count, kind]) {
  const t = scenarioTuning;
  // Form at the far end of the crossing so wave sizing ignores the scout cap, then move into range.
  const shift = config.fireRange + t.holdSpawn - level.length;
  const size = kind ? count : count / horde.waveFraction;
  for (const enemy of formWave([level.length, x, size, kind, kind ? undefined : t.holdWidth], level, run.difficulty)) {
    enemy.z += shift;
    run.enemies.splice(-1, 0, enemy);
  }
}

function holding() {
  const hold = run.scenario?.hold;
  return Boolean(hold && hold.started !== undefined && !hold.done);
}

// The boss waits beyond firing range during a hold so the stand stays its own fight.
function bossHeld(enemy) {
  return holding() && enemy.z >= config.fireRange && !enemy.windupUntil;
}

function scenarioRescue(gate) {
  if (gate.kind !== 'survivor' || !run.scenario) return;
  run.scenario.rescued++;
  combatNotice('Survivors rescued · ' + run.scenario.rescued + ' / ' + levels[levelIndex].scenario.rescue[0]);
}

function scenarioDetonate(cache) {
  if (!cache.charge || !run.scenario) return;
  cache.detonated = true;
  run.scenario.detonated++;
}

function scenarioKill(enemy) {
  if (!run.scenario || !enemy.kind) return;
  run.scenario.kills[enemy.kind] = (run.scenario.kills[enemy.kind] ?? 0) + 1;
}

function scenarioFailure(level) {
  const goals = level.scenario, state = run.scenario;
  if (goals.rescue) {
    const [need, groups] = goals.rescue;
    if (groups.length - state.lostGroups < need) return 'Too many survivors were left behind (' + state.rescued + ' of ' + need + ' groups rescued).';
  }
  if (goals.charges) {
    const [need, charges] = goals.charges;
    if (charges.length - state.missedCharges < need) return 'Too many charges passed undetonated (' + state.detonated + ' of ' + need + ' detonated).';
  }
  for (const [kind, need] of goals.hunt ?? []) {
    const kills = state.kills[kind] ?? 0;
    const alive = run.enemies.filter(e => e.kind === kind && e.health > 0 && !e.passed).length;
    if (kills + alive < need) return 'Priority targets escaped (' + kills + ' of ' + need + ' ' + enemyTypes[kind].label.toLowerCase() + 's eliminated).';
  }
  return null;
}

// Called when the boss falls. Returns a failure reason or null when the mission is complete.
function scenarioVerdict(level) {
  const goals = level.scenario, state = run.scenario;
  if (!goals) return null;
  if (goals.rescue && state.rescued < goals.rescue[0]) return 'Only ' + state.rescued + ' of ' + goals.rescue[0] + ' survivor groups were rescued.';
  if (goals.charges && state.detonated < goals.charges[0]) return 'Only ' + state.detonated + ' of ' + goals.charges[0] + ' charges were detonated.';
  for (const [kind, need] of goals.hunt ?? []) {
    const kills = state.kills[kind] ?? 0;
    if (kills < need) return 'Only ' + kills + ' of ' + need + ' ' + enemyTypes[kind].label.toLowerCase() + 's were eliminated.';
  }
  if (goals.extract && run.count < goals.extract) return 'Only ' + run.count + ' soldiers reached extraction. The mission needed ' + goals.extract + '.';
  return null;
}

function scenarioTracker(level) {
  const goals = level.scenario, state = run.scenario;
  if (!goals || !state) return '';
  const parts = [];
  if (goals.rescue) parts.push('Survivors ' + state.rescued + '/' + goals.rescue[0]);
  if (goals.charges) parts.push('Charges ' + state.detonated + '/' + goals.charges[0]);
  if (goals.hold) {
    const hold = state.hold;
    parts.push(hold.done ? 'Hold ✓' : hold.started === undefined ? 'Hold ' + hold.time + 's'
      : 'HOLD ' + Math.ceil(hold.time - (run.elapsed - hold.started)) + 's');
  }
  for (const [kind, need] of goals.hunt ?? []) parts.push(enemyTypes[kind].label + 's ' + Math.min(need, state.kills[kind] ?? 0) + '/' + need);
  if (goals.protect) parts.push('Civilians ' + Math.max(0, run.breachLimit - run.breaches) + ' left');
  if (goals.extract) parts.push('Extract ' + run.count + '/' + goals.extract);
  return parts.join(' · ');
}

function drawScenario(level, time) {
  if (!level.scenario || !run.scenario) return;
  const c = scenarioTuning.colors;
  function tag(x, z, label, color, lift) {
    const [u, v, s] = project(x, z);
    ctx.font = 'bold ' + Math.max(10, 14 * s) + 'px system-ui';
    const w = ctx.measureText(label).width + 8, y = v - lift * s;
    ctx.fillStyle = '#162024';
    ctx.fillRect(u - w / 2, y - 12, w, 16);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, u, y);
  }
  ctx.save();
  for (const gate of run.gates) {
    if (gate.kind !== 'survivor' || gate.used || gate.z < 0 || gate.z > config.fireRange) continue;
    tag(gate.x, gate.z, '✚ SURVIVORS', c.survivor, 62);
  }
  for (const cache of run.caches) {
    if (!cache.charge || cache.passed || cache.z < 0 || cache.z > config.fireRange) continue;
    tag(cache.x, cache.z, '✸ CHARGE', c.charge, 40);
  }
  for (const enemy of run.enemies) {
    if (!enemy.quarry || enemy.passed || enemy.health <= 0 || enemy.z < 0 || enemy.z > config.fireRange) continue;
    tag(enemy.x, enemy.z, '◎ TARGET', c.quarry, 72);
  }
  if (holding()) {
    const hold = run.scenario.hold;
    const left = Math.ceil(hold.time - (run.elapsed - hold.started));
    const pulse = reducedMotion.matches ? 1 : .75 + .25 * Math.sin(time * 6);
    ctx.font = '900 ' + Math.round(Math.min(width, 520) / 14) + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.globalAlpha = pulse;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#162024';
    ctx.strokeText('HOLD · ' + left + 's', width / 2, height * .3);
    ctx.fillStyle = c.hold;
    ctx.fillText('HOLD · ' + left + 's', width / 2, height * .3);
  }
  ctx.restore();
}
