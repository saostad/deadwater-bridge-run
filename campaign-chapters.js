'use strict';

// Each route lists the centers of its four columns and the times/lanes of its local hazards.
// Times are fractions of the crossing. Lane coordinates run from -1 (left) to 1 (right).
const chapters = {
  snowline: {
    name: 'Snowline Observatory', intro: 'Hold the dish array.', deckStyle: 1, signature: 'frost', surface: ['#b6c9d0','#8eabb9'], deckTint: [.67,.84,.94],
    warning: 'Crosswind rising', sound: 'iceCrack', lead: 1.3, active: 2.8, halfWidth: .44, nearEdge: 31,
    missions: [
      ['Snowline Observatory','Follow the amber lights through the first snow squalls.', 'Antenna Keeper','axe', [.04,0,-.12,.08], 'runner', [[.18,-.35],[.53,.35]]],
      ['Beacon Ridge','Switch flanks with the beacons. Raiders weave out of the squall.', 'Ridge Raker','hook', [-.42,.4,-.32,.24], 'raider', [[.17,-.45],[.38,.4],[.61,-.4]]],
      ['The Ice Array','Break the shield escort before the column reaches the dish array.', 'Array Warden','mace', [.18,.36,-.35,.02], 'shield', [[.14,.33],[.44,-.38],[.64,.16]]],
      ['Whiteout Relay','Watch the open lane as hulks emerge from alternating whiteouts.', 'Relay Driver','ram', [-.44,-.12,.39,-.22], 'hulk', [[.14,-.45],[.31,.42],[.51,-.38],[.67,.35]]],
      ['Summit Lock','Save the summit recruits from a Gatebreaker before the last squall.', 'Summit Bell','hammer', [.33,-.44,.15,0], 'armored', [[.13,.28],[.32,-.32],[.49,.4],[.66,-.18]]],
    ],
  },
  rail: {
    name: 'Last Train', intro: 'Clear the platform.', deckStyle: 2, signature: 'crawler', surface: ['#978879','#655e56'], deckTint: [.68,.59,.51],
    warning: 'Carriage doors rattling', sound: 'grate', lead: 1.45, active: .95, releaseZ: 55, runners: 3, spacing: 3.1,
    missions: [
      ['Last Train','Watch the carriage lamps. A rattling door releases runners onto the platform.', 'Ticket Punch','mace', [0,-.15,.22,-.08], 'runner', [[.16,-.61],[.50,-.61]]],
      ['Switch House','Cross between platforms as emergency exits open on opposite sides.', 'Switchman','hook', [-.4,.4,-.35,.35], 'raider', [[.12,-.62],[.36,.61],[.62,-.58]]],
      ['The Sleeper Cars','Shield bearers cover the middle while the sleeper cars empty on the left.', 'Berth Warden','hammer', [.25,-.1,.13,.3], 'shield', [[.15,-.62],[.32,-.58],[.58,-.66]]],
      ['Signal Blackout','Follow the flashing door lamps and intercept the heavy platform wave.', 'Signal Cutter','blade', [-.2,-.44,.38,.12], 'hulk', [[.12,.59],[.29,-.63],[.48,-.57],[.67,.61]]],
      ['Terminus','Save the last boarding gate while both platforms empty.', 'Last Conductor','ram', [-.45,.45,0,-.21], 'armored', [[.11,-.6],[.28,.59],[.46,-.63],[.64,.59]]],
    ],
  },
  canopy: {
    name: 'Canopy Station', intro: 'Defend the glasshouse.', deckStyle: 3, signature: 'carrier', surface: ['#819c8e','#556f64'], deckTint: [.52,.67,.59],
    warning: 'Seed pods ripening', sound: 'seed', lead: 1.15, active: .85, dropZ: 54,
    // Each raised bed divides walkers and feeds them back together beyond the bed.
    bedDepth: 10, bendDepth: 13, clearance: .25,
    beds: [[[0,52]], [[-.12,49],[.14,97]], [[.14,43],[-.14,83]], [[0,57],[-.19,108]], [[-.14,44],[.17,84],[0,128]]],
    missions: [
      ['Canopy Station','The first planting bed divides the horde. Catch the walkers where the paths rejoin.', 'Glass Gardener','hook', [0,.16,-.12,0], 'runner', [[.21,-.35],[.55,.36]]],
      ['Fern Walk','Alternate between the seed drops and the waves curling around the fern beds.', 'Fern Reaper','blade', [-.22,.25,-.24,.22], 'raider', [[.15,.46],[.35,-.44],[.62,.37]]],
      ['Orchid Sluice','Shoot the pods beside the water channel before the armored escort arrives.', 'Sluice Tender','mace', [.22,.06,-.2,.1], 'armored', [[.14,-.52],[.41,.44],[.63,-.39]]],
      ['Broken Conservatory','Hulks guard the broken glasshouse. Watch both exits from each planting bed.', 'Canopy Feller','axe', [-.22,.23,.14,-.2], 'hulk', [[.13,.43],[.33,-.36],[.53,.46],[.68,-.44]]],
      ['The Seed Vault','Keep the recruits alive as three planting beds funnel the vault swarm.', 'Vault Custodian','hammer', [0,-.22,.19,0], 'shield', [[.13,-.39],[.30,.42],[.49,-.43],[.66,.41]]],
    ],
  },
  cinder: {
    name: 'Cinderworks', intro: 'Cross the furnace floor.', deckStyle: 4, signature: 'boiler', surface: ['#968479','#71645c'], deckTint: [.68,.58,.51],
    warning: 'Pressure building', sound: 'boilerVent', lead: 1.55, active: 1.1, reach: 75, halfWidth: .27, damage: 3,
    missions: [
      ['Cinderworks','Move out of the striped lane when the relief valve starts to hiss.', 'Stokehand','hammer', [.1,-.12,.14,0], 'runner', [[.19,-.42],[.53,.43]]],
      ['Valve Gallery','Swap sides between steam bursts and watch the raiders coming down the other lane.', 'Valve Turner','mace', [-.42,.39,-.32,.2], 'raider', [[.14,-.47],[.35,.43],[.60,-.46]]],
      ['Slag Channel','Hold the clear side of the grating until the shield column passes.', 'Slag Hauler','ram', [.36,.12,-.36,.22], 'shield', [[.13,.46],[.32,-.44],[.56,.45]]],
      ['Pressure Vessel','Steam reaches the center grating. Dodge the vent before aiming for the furnace cores.', 'Pressure Jack','hook', [-.32,0,.37,-.21], 'hulk', [[.13,0],[.29,-.49],[.46,.46],[.65,0]]],
      ['The Caldera','Protect the final recruit gate, clear the relief valves, and face the Furnace King.', 'Furnace King','axe', [.33,-.38,.12,0], 'armored', [[.12,-.43],[.27,.47],[.46,0],[.64,-.42]]],
    ],
  },
};

const chapterStages = [
  {length: 850, column: 54, squad: 28, breaches: 48, support: 'leaper', boss: {recovery: 1.12}},
  {length: 900, column: 60, squad: 30, breaches: 50, support: 'spitter', boss: {pace: 1.05}},
  {length: 940, column: 67, squad: 32, breaches: 54, support: 'howler', boss: {width: 1.04, power: 1}},
  {length: 980, column: 73, squad: 34, breaches: 57, support: 'leaper', boss: {tempo: .93, power: 1}},
  {length: 1030, column: 80, squad: 36, breaches: 60, support: 'howler', boss: {followup: true, power: 2}},
];
const chapterBalance = {
  waveAt: [.09,.25,.44,.61], waveGrowth: 8, chapterGrowth: 3, escortAt: [.28,.55],
  escortSize: {runner: 6, raider: 5, shield: 3, armored: 6, hulk: 2},
  columns: 7, rowDepth: 3.7, columnWidth: .25, opening: 83, supportAt: .38,
  gateAt: [.035,.21,.41,.59,.77], gatesPerGroup: 6, breakerAt: .52, reinforcementAt: .47,
  bossTier: 16,
};

function buildChapterLevels() {
  const b = chapterBalance;
  return Object.entries(chapters).flatMap(([scene, chapter], region) => chapter.missions.map((mission, part) => {
    const [name,objective,bossName,tool,lanes,escort,signals] = mission;
    const stage = chapterStages[part], length = stage.length;
    const side = lanes[0] < 0 ? -1 : 1;
    const waves = b.waveAt.map((at,i) => [at*length,lanes[i],stage.column+i*b.waveGrowth+region*b.chapterGrowth,undefined,b.columnWidth]);
    b.escortAt.forEach((at,i) => waves.push([at*length,side*(i ? .46 : -.46),b.escortSize[escort],escort]));
    const specialists = [[b.opening,lanes[0],chapter.signature], [length*b.supportAt,-side*.49,stage.support]];
    if (part === chapterStages.length-1) specialists.push([length*b.breakerAt,side*.55,'breaker']);
    return {
      name, objective, title: part ? name : chapter.intro, scenery: scene, chapter, part, length, bossTier: b.bossTier+part+region,
      boss: {name: bossName, tool, ...stage.boss}, startingSquad: stage.squad, breachLimit: stage.breaches,
      siege: {columns:b.columns,rowDepth:b.rowDepth}, waves, specialists, signals,
      beds: chapter.beds?.[part].map(([x,z])=>({x,z})) ?? [],
      gates: [...recruitLanes(b.gateAt.map((at,i)=>[at*length,i%2 ? -side : side]),b.gatesPerGroup),
        [b.reinforcementAt*length,-side*.66,5,'truck']],
      barricades: [[length*.32,-side*.58],[length*.58,side*.56]],
    };
  }));
}

// Warning and active phases use the simulation clock so pausing freezes doors and valves.
function updateChapterHazards(level, formation) {
  const zone = level.chapter;
  for (const signal of run.chapterSignals) {
    if (signal.done || run.elapsedDistance < signal.at) continue;
    if (signal.warnedAt === undefined) {
      signal.warnedAt = run.elapsed;
      combatNotice(zone.warning + ' · ' + (signal.x < -.2 ? 'left' : signal.x > .2 ? 'right' : 'center'));
      playSound(zone.sound);
    }
    const age = run.elapsed - signal.warnedAt - zone.lead * run.difficulty.warning;
    if (age < 0) continue;
    if (age >= zone.active) { signal.done = true; continue; }
    if (!signal.released) {
      signal.released = true;
      if (level.scenery === 'rail') {
        for (let i=0;i<zone.runners+level.part;i++) {
          run.enemies.splice(-1,0,{kind:'runner', x:signal.x+(i%2 ? -.04 : .04), z:zone.releaseZ+i*zone.spacing,
            gaitOffset:i,health:enemyTypes.runner.health});
        }
        playSound('grate');
      } else if (level.scenery === 'canopy') {
        const pod = campaignSpecialists.carrier;
        run.pods.push({pod:true,x:signal.x,z:zone.dropZ,health:pod.podHealth+run.difficulty.armor,
          hatchAt:run.elapsed+pod.hatchTime*run.difficulty.warning});
        playSound('seed');
      } else if (level.scenery === 'cinder') playSound('boilerVent');
    }
    if (level.scenery === 'cinder' && !signal.hit) {
      const left=project(signal.x-zone.halfWidth,0)[0], right=project(signal.x+zone.halfWidth,0)[0];
      const exposed=formation.members.filter(p=>p.x+formation.radiusX>=left && p.x-formation.radiusX<=right);
      if (exposed.length) {
        signal.hit=true;
        damage(Math.min(exposed.length,zone.damage+run.difficulty.hazardDamage),'Steam vent');
      }
    }
  }
}

function routeAroundBeds(enemy, beds) {
  const zone=chapters.canopy;
  for (const bed of beds) {
    const dz=Math.abs(enemy.z-bed.z), dx=enemy.laneX-bed.x;
    if (dz>=zone.bedDepth+zone.bendDepth || Math.abs(dx)>=zone.clearance) continue;
    const turn=clamp(1-(dz-zone.bedDepth)/zone.bendDepth,0,1);
    enemy.x+=(Math.sign(dx)||1)*(zone.clearance-Math.abs(dx))*turn*turn*(3-2*turn);
  }
}

function drawChapterSignals(level, time) {
  const zone = level.chapter;
  ctx.save();
  for (const signal of run.chapterSignals) {
    if (signal.warnedAt === undefined || signal.done) continue;
    const active=signal.released, x=signal.x;
    const motion=reducedMotion.matches ? 0 : time-signal.warnedAt;
    if (level.scenery==='snowline') {
      // The whiteout stays on the far half of one lane, leaving the squad visible.
      const half=zone.halfWidth, front=zone.nearEdge, far=cameraViewDistance();
      ctx.save();
      const nearY=project(x,front)[1], farY=project(x,far)[1];
      const mist=ctx.createLinearGradient(0,nearY,0,farY);
      mist.addColorStop(0,'#ebf7ff00');
      mist.addColorStop(.35,active?'#ebf7ff8c':'#ebf7ff1c');
      mist.addColorStop(.78,active?'#e2f1ffd2':'#e2f1ff25');
      mist.addColorStop(1,'#e2f1ff2b');
      polygon([project(x-half,front),project(x+half,front),project(x+half,far),project(x-half,far)],mist);
      ctx.clip();
      for(let i=0;i<42;i++){
        const z=front+(i*11.3)%(far-front);
        const lane=x-half+((i*.618+motion*.65)%1)*half*2;
        const [u,v,s]=project(lane,z);
        line([u-12*s,v+4*s],[u+6*s,v-2*s],'#f4faffbc',2*s);
      }
      ctx.restore();
    } else if (level.scenery==='rail') {
      const [u,v,s]=project(x,zone.releaseZ);
      const h=45*s,w=26*s, gap=active?w*.64:Math.sin(motion*28)*s;
      ctx.fillStyle='#262924';ctx.fillRect(u-w,v-h,2*w,h);
      for(const side of [-1,1]){
        const edge=u+(side<0?-w-gap:gap);
        ctx.fillStyle='#986f44';ctx.fillRect(edge,v-h,w,h);
        ctx.fillStyle='#333c39';ctx.fillRect(edge+w*.15,v-h*.87,w*.70,h*.38);
      }
      ctx.fillStyle=active?'#b5e291':'#ffd477';ctx.fillRect(u-w,v-h-3*s,w*2,3*s);
    } else if(level.scenery==='canopy') {
      if(!active){
        const [u,v,s]=project(x,zone.dropZ);
        ctx.beginPath();ctx.strokeStyle='#d5ef8f';ctx.lineWidth=2*s;
        ctx.ellipse(u,v,(12+Math.sin(motion*9)*2)*s,5*s,0,0,Math.PI*2);ctx.stroke();
      }
    } else {
      drawLaneWarning(x,zone.reach,zone.halfWidth,active?'#f4ad685c':'#f5b76035');
      for(let i=0;i<9;i++){
        const z=i*zone.reach/9;
        const [left,y,s]=project(x-zone.halfWidth,z),[right]=project(x+zone.halfWidth,z);
        if(active){
          const bloom=ctx.createRadialGradient((left+right)/2,y,0,(left+right)/2,y,(right-left)*.60);
          bloom.addColorStop(0,'#fff5e5a8');bloom.addColorStop(1,'#d1c9ba00');
          ctx.fillStyle=bloom;ctx.beginPath();
          ctx.ellipse((left+right)/2,y-7*s,(right-left)*.58,(12+Math.sin(i+motion*9)*3)*s,0,0,Math.PI*2);ctx.fill();
        } else line([left,y],[right,y-4*s],'#ffd089a8',2*s);
      }
    }
  }
  ctx.restore();
}

function drawChapterLandmarks(scene) {
  // Use the same positions as the 3D props, projected into the Canvas view.
  const props=[];
  CampaignScenery.place(scene,(kind,x,y,z)=>props.push({
    kind,x:x/Breakwater.camera.halfRoad,z:z/Breakwater.camera.metresPerDepth,
  }));
  for(const prop of props.sort((a,b)=>b.z-a.z)){
    if(prop.kind==='plantBed'){drawPlanter(prop);continue;}
    const [u,v,s]=project(prop.x,prop.z);
    if(prop.kind==='steamMain'){
      const end=project(prop.x,prop.z+10);
      line([u,v-5*s],[end[0],end[1]-5*end[2]],'#674b3f',9*s);
      line([u,v-7*s],[end[0],end[1]-7*end[2]],'#c18c63',2*s);
      ctx.fillStyle='#d5a06c';ctx.fillRect(u-3*s,v-11*s,6*s,2*s);
    } else {
      const lamp=prop.kind==='platformLamp', h=(lamp?38:10)*s;
      line([u,v],[u,v-h],'#404547',2.7*s);
      ctx.fillStyle='#694d32';ctx.fillRect(u-3.6*s,v-h-2*s,7.2*s,6*s);
      ctx.fillStyle='#ffcb82';ctx.fillRect(u-2.6*s,v-h,5.2*s,(lamp?5:2)*s);
    }
  }
}

function drawPlanter(bed) {
  const s=project(bed.x,bed.z)[2];
  const rim=[project(bed.x-.14,bed.z-6),project(bed.x+.14,bed.z-6),
    project(bed.x+.14,bed.z+6),project(bed.x-.14,bed.z+6)];
  polygon(rim,'#676b52');polygon(rim.map(([u,v])=>[u,v-4*s]),'#494633');
  for(let i=0;i<12;i++){
    const [u,v]=project(bed.x+.09*Math.sin(i*2.4),bed.z-5+i*.9);
    const spread=Math.sin(i*3.8)*12*s;
    polygon([[u,v-4*s],[u+spread-3*s,v-13*s],[u+spread,v-(18+i%3*3)*s],[u+spread+3*s,v-13*s]],i%2?'#829651':'#557547');
  }
}
