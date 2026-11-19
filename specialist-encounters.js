'use strict';

// Campaign encounter tuning. Distances use the same bridge units as the level data.
const encounterTuning = {
  firstLevel: 2, secondSlotLevel: 6, thirdSlotLevel: 14,
  slots: [.24, .45, .64], timingJitter: .055, lanes: [-.56, -.16, .16, .56],
  roster: ['frost', 'crawler', 'carrier', 'breaker', 'boiler'],
};
const paintedMotion = {
  canvasScale: 37, framesPerSecond: 4, raisedCamera: .48, recoilTime: .14, recoilCooldown: .52, fallSwitch: .72,
};
const campaignSpecialists = {
  frost: {label: 'Frost Husk', color: '#a8eeff', speed: 15, health: 18, size: 2.45, damage: 2,
    range: 68, stompTime: .42, trailSpacing: 14, slowTime: 1.2, steeringScale: .46, iceRadius: .14,
    tip: 'Frost Husks stamp a trail of blue ice. Keep the squad off it to steer at full speed.'},
  crawler: {label: 'Track Crawler', color: '#ffd483', speed: 25, health: 10, size: 1.85, damage: 2,
    range: 52, diveTime: .48, tunnelTime: .72, exitDistance: 18, emergeTime: .92, emergeDamage: 2,
    tip: 'Track Crawlers dive under the deck. Aim at the sparking grate for double damage as they climb out.'},
  carrier: {label: 'Seed Carrier', color: '#c9f079', speed: 19, health: 12, size: 2.15, damage: 1,
    range: 65, plantTime: .72, releaseTime: .25, hatchTime: 2.3, podHealth: 3, podAimHeight: .36, offspring: 2, scatter: .065,
    tip: 'Seed Carriers plant a glowing pod. Shoot it before two runners hatch.'},
  breaker: {label: 'Gatebreaker', color: '#ffc276', speed: 18, health: 23, size: 2.55, damage: 3,
    range: 75, searchDepth: 16, minGateZ: 29, windup: 1.3, followTime: .38, interruptHits: 3, approach: 3.2,
    tip: 'Gatebreakers raise a steel fist over a blue recruit gate. Hit one three times during its windup to save the gate.'},
};

const encounterBag = [];
function rollEncounters(level, number, gates) {
  const encounters = [...level.specialists];
  if (number < encounterTuning.firstLevel) return encounters;
  const used = new Set(encounters.map(entry => entry[2]));
  const count = 1 + Number(number >= encounterTuning.secondSlotLevel) + Number(number >= encounterTuning.thirdSlotLevel);
  for (const fraction of encounterTuning.slots.slice(0, count)) {
    if (!encounterBag.length) encounterBag.push(...encounterTuning.roster);
    const available = encounterBag.filter(kind => !used.has(kind));
    const pool = available.length ? available : encounterTuning.roster.filter(kind => !used.has(kind));
    const kind = pool[Math.floor(Math.random() * pool.length)];
    if (available.length) encounterBag.splice(encounterBag.indexOf(kind), 1);
    used.add(kind);
    const at = fraction + (Math.random() * 2 - 1) * encounterTuning.timingJitter;
    const x = encounterTuning.lanes[Math.floor(Math.random() * encounterTuning.lanes.length)];
    // Account for each creature's walking speed so late slots reach the squad before the boss.
    const type = enemyTypes[kind];
    let z = type.speed * level.length * at / config.approachSpeed;
    if (kind === 'breaker') {
      // Make its approach intersect a real recruit gate after difficulty filtering.
      let closest = Infinity;
      for (const gate of gates) {
        const gap = Math.abs(gate.z - level.length * at);
        if (gate.count <= 0 || gate.z <= type.range || gap >= closest) continue;
        closest = gap;
        z = type.range + type.speed * (gate.z - type.range) / config.approachSpeed;
      }
    }
    encounters.push([z, x, kind]);
  }
  return encounters;
}

const paintedAtlases = new Map();
function loadPaintedAtlas(kind) {
  if (paintedAtlases.has(kind)) return;
  const image = new Image();
  paintedAtlases.set(kind, image);
  image.onload = () => { lastStageFrame = undefined; };
  image.onerror = () => {
    console.error('Specialist atlas unavailable', {kind, fallback: true, using: 'armored figure'});
    const status = byId('art-status');
    status.textContent = enemyTypes[kind].label + ' art unavailable. Showing an armored figure. Reload to retry.';
    status.hidden = false;
  };
  const source = kind === 'boiler' ? (typeof boilerAtlasSource === 'string' && boilerAtlasSource)
    : (typeof specialistAtlasSources === 'object' && specialistAtlasSources[kind]);
  if (source) image.src = source;
  else image.onerror();
}

function advanceCampaignSpecialist(e, dt) {
  const type = campaignSpecialists[e.kind];
  if (e.spent || e.z > type.range || e.z <= 0) return false;
  const now = run.elapsed;
  if (e.kind === 'frost') {
    if (e.phase === 'stamp') {
      if (now < e.phaseUntil) return true;
      run.ice.push({ice: true, x: e.x, z: e.z});
      e.nextStamp = e.z - type.trailSpacing;
      e.phase = 'stride';
      return false;
    }
    if (e.z > (e.nextStamp ?? type.range)) return false;
    e.phase = 'stamp';
    e.phaseUntil = now + type.stompTime;
    playSound('iceCrack');
    return true;
  }
  if (e.kind === 'crawler') {
    if (!e.phase) {
      e.phase = 'dive';
      e.exitX = run.x;
      e.phaseUntil = now + type.diveTime * run.difficulty.warning;
      combatNotice('Track Crawler diving · watch the sparking grate');
      playSound('grate');
    } else if (now >= e.phaseUntil) {
      if (e.phase === 'dive') {
        e.phase = 'tunnel';
        e.phaseUntil = now + type.tunnelTime;
        e.x = e.exitX;
        e.z = type.exitDistance;
      } else if (e.phase === 'tunnel') {
        e.phase = 'emerge';
        e.phaseUntil = now + type.emergeTime * run.difficulty.warning;
        playSound('grate');
      } else { e.phase = undefined; e.spent = true; return false; }
    }
    return true;
  }
  if (e.kind === 'carrier') {
    if (!e.phase) {
      e.phase = 'plant';
      e.phaseUntil = now + type.plantTime * run.difficulty.warning;
      combatNotice('Seed Carrier planting · line up with the pod');
    } else if (now >= e.phaseUntil) {
      if (e.phase === 'plant') {
        run.pods.push({pod: true, x: e.x, z: e.z, health: type.podHealth + run.difficulty.armor,
          hatchAt: now + type.hatchTime * run.difficulty.warning});
        e.phase = 'release';
        e.phaseUntil = now + type.releaseTime;
        playSound('seed');
      } else { e.phase = undefined; e.spent = true; return false; }
    }
    return true;
  }

  if (!e.gate) {
    let nearest = type.searchDepth;
    for (const gate of run.gates) {
      const gap = Math.abs(e.z - gate.z);
      if (gate.used || gate.count <= 0 || gate.z < type.minGateZ || gap >= nearest) continue;
      nearest = gap;
      e.gate = gate;
    }
    if (!e.gate) return false;
    e.phase = 'raise';
    e.phaseUntil = now + type.windup * run.difficulty.warning;
    e.interruptHits = 0;
    combatNotice('Gatebreaker targeting +' + e.gate.count + ' · shoot its raised arm');
    playSound('bossWindup');
  }
  e.x += (e.gate.x - e.x) * (1 - Math.exp(-dt * type.approach));
  e.z = e.gate.z;
  if (now >= e.phaseUntil || (e.phase === 'raise' && e.gate.used)) {
    if (e.phase === 'raise' && !e.gate.used) {
      e.gate.used = true;
      e.phase = 'smash';
      e.phaseUntil = now + type.followTime;
      combatNotice('Recruit gate smashed · +' + e.gate.count + ' lost');
      playSound('axeImpact');
    } else { e.phase = undefined; e.spent = true; return false; }
  }
  return true;
}

function updateEncounterObjects(travel, formation) {
  for (const ice of run.ice) {
    const prev = ice.z;
    ice.z -= travel;
    if (!ice.used && touchesFormation(ice, prev, formation)) {
      ice.used = true;
      run.slowUntil = run.elapsed + campaignSpecialists.frost.slowTime;
      combatNotice('Ice underfoot · steering slowed');
      playSound('iceCrack');
    }
  }
  run.ice = run.ice.filter(ice => ice.z > config.breachLine);
  const type = campaignSpecialists.carrier;
  for (const pod of run.pods) {
    pod.z -= travel;
    if (pod.health <= 0 || run.elapsed < pod.hatchAt) continue;
    pod.health = 0;
    for (let i = 0; i < type.offspring; i++) {
      const x = clamp(pod.x + (2 * i - (type.offspring - 1)) * type.scatter, -config.edge, config.edge);
      run.enemies.splice(-1, 0, {kind: 'runner', x, z: pod.z, health: enemyTypes.runner.health, gaitOffset: i});
    }
    combatNotice('Seed pod hatched · runners incoming');
    playSound('seed');
  }
  run.pods = run.pods.filter(pod => pod.health > 0);
}

const specialistLabels = {
  stamp: 'ICE STOMP', dive: 'DIVING', tunnel: 'SPARKING GRATE', emerge: 'EMERGING ×2',
  plant: 'PLANTING', release: 'POD DROPPED', raise: 'BREAK ITS STRIKE', smash: 'GATE SMASH',
};
const abilityFrames = {open: 10, vent: 9, stamp: 10, dive: 9, emerge: 10, plant: 9, release: 10, raise: 9, smash: 10};

function drawIcePatch(ice) {
  const radius = campaignSpecialists.frost.iceRadius;
  polygon([project(ice.x-radius, ice.z), project(ice.x-radius*.5, ice.z+2),
    project(ice.x+radius*.8, ice.z+1.5), project(ice.x+radius, ice.z-1), project(ice.x, ice.z-2)], '#99e9f5be');
  line(project(ice.x-radius*.8, ice.z), project(ice.x+radius*.5, ice.z+1), '#e3fcff', 1);
}
function drawSeedPod(pod) {
  const [x,y,s] = project(pod.x,pod.z);
  const r = (11 + Math.sin(run.elapsed*12)) * s;
  const ink = ctx.createRadialGradient(x-r*.22,y-r,0,x,y-r,r);
  ink.addColorStop(0,'#fbffb3'); ink.addColorStop(.46,'#b5d344'); ink.addColorStop(1,'#49582e');
  ctx.fillStyle=ink;
  ctx.beginPath(); ctx.ellipse(x,y-r,r*.81,r,-.24,0,Math.PI*2); ctx.fill();
}
function drawCrawlerGrate(lane, z, time) {
  const [x,y,s] = project(lane,z);
  ctx.fillStyle='#493f34';
  ctx.fillRect(x-12*s,y-3*s,24*s,6*s);
  for (let i=-2;i<=2;i++) {
    line([x+i*4*s,y-3*s],[x+(i-1)*4*s,y+3*s],'#adb7b5',1.5*s);
    const lift = (time*7 + i*1.37) % 1;
    line([x+i*5*s,y-12*s*lift],[x+i*5.5*s,y-17*s*lift],'#ffc576',1.5*s);
  }
}
