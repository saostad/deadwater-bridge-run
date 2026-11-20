'use strict';

const spiral = {
  name: 'Spiral Interchange',
  edge: 1.60, lane: 1.45, viewScale: .60, deadZone: .27, panLimit: .68, edgeTouch: .09,
  bendStart: 72, turnLength: 90, radius: 8, turnRise: 3.6, deckEnd: 254,
  turretDepth: 32, turretHits: 18, turretInterval: .38, rollerHits: 20, rollerWidth: .48,
  missions: [
    ['First Descent', 'Take the left spur to recruit, then cross back to stop the scouts.', 'Ramp Warden', 'mace'],
    ['Gun Deck', 'Move onto the gold right spur and shoot the turret pedestal to bring it online.', 'Gunner', 'hook'],
    ['The Foreman', 'Break the spiked roller to clear your firing lane. The Foreman follows the horde.', 'The Foreman', 'hammer'],
  ],
};

function buildSpiralLevels() {
  return spiral.missions.map(([name,objective,bossName,tool],i)=>({
    name, title:name, objective, scenery:'spiral', length:760+i*70, bossTier:14+i,
    startingSquad:3+i, breachLimit:36+i*4, boss:{name:bossName,tool}, weaponLane:spiral.lane,
    gates:[24,68,166,219,336,420,550,658].map(z=>[z,-spiral.lane,1]),
    waves:[[72,0,8],[182,-.12,24],[265,.15,4,'runner'],[367,0,38],[512,.12,42],[665,-.1,52]],
    specialists:[[310,.15,'howler']], barricades:[],
    supplies:[], weaponDrops:i ? [] : [{at:.28,choices:['rapid','spread']}],
    turret:i>=1, roller:i===2,
  }));
}

// Unroll simulation depth into a climbing helix. The combat apron is flat.
function spiralPoint(x,z) {
  const X=Breakwater.camera.halfRoad, Z=Breakwater.camera.metresPerDepth;
  if(z<=spiral.bendStart) return [x*X,0,z*Z];
  const angle=(z-spiral.bendStart)*2*Math.PI/spiral.turnLength;
  const radius=spiral.radius-x*X;
  return [spiral.radius-radius*Math.cos(angle),angle*spiral.turnRise/(2*Math.PI),
    spiral.bendStart*Z+radius*Math.sin(angle)];
}

function buildSpiralMeshes(make) {
  make('interchange',m=>{
    const strip=(left,right,from,to,color)=>{
      for(let z=from;z<to;z+=2){
        const end=Math.min(to,z+2);
        const a=spiralPoint(left,z),b=spiralPoint(left,end),c=spiralPoint(right,end),d=spiralPoint(right,z);
        m.quad(a,b,c,d,color);
        for(const [p,q] of [[a,b],[c,d]]){
          m.quad(p,q,[q[0],q[1]-.4,q[2]],[p[0],p[1]-.4,p[2]],0x555966);
          if(z>=spiral.bendStart){
            m.sleeve([p[0],p[1]+.28,p[2]],[q[0],q[1]+.28,q[2]],.045,.045,0xbfc4bc,0);
            m.box(p[0],p[1]+.14,p[2],.07,.28,.07,0x696d6b);
          }
        }
      }
    };
    strip(-.77,.77,-22,spiral.deckEnd,0x9c9690);
    for(const side of [-1,1]){
      const outer=side*(spiral.edge+.30),inner=side*.77;
      strip(Math.min(inner,outer),Math.max(inner,outer),-22,spiral.bendStart,side<0?0x788b94:0xab976f);
    }
    m.box(spiral.radius,0,spiral.bendStart*Breakwater.camera.metresPerDepth,3.7,18,3.7,0x897f73);
  });
  make('goldTurret',m=>{
    m.box(0,.17,0,1.6,.34,1.5,0xb88727);
    m.box(0,.57,0,.48,.72,.52,0x725531);
    m.box(0,1.03,0,.75,.48,.73,0xeab849);
    for(const x of [-.23,.23])m.box(x,1.06,.68,.14,.14,1.12,0xf4cf6d);
  });
  make('roller',m=>{
    m.sleeve([-2,.54,0],[2,.54,0],.53,.53,0x986b49,0);
    for(let x=-1.8;x<2;x+=.42)m.sleeve([x,.94,0],[x,1.32,0],.13,.012,0x514c47,0);
  });
}

function updateSpiralTurret(dt) {
  const gun=run.turret;
  if(!gun?.passed) return;
  gun.cooldown-=dt;
  if(gun.cooldown>0)return;
  const target=run.enemies.find(e=>!e.passed && e.health>0 && e.z>0 && e.z<run.fireRange &&
    e.phase!=='tunnel' && (!e.boss || bossExposed(e)) && shotCapacity(e)>(e.incomingShots??0));
  if(!target)return;
  target.incomingShots=(target.incomingShots??0)+1;
  run.shots.push({x:gun.x,originX:gun.x,z:gun.z,target,range:run.fireRange,weapon:'rapid',fan:0,barrel:0});
  gun.cooldown=spiral.turretInterval;
  playSound('fire');
}

function drawSpiralDeck(){
  for(let z=spiral.deckEnd;z>-22;z-=2){
    const half=z>spiral.bendStart?.77:spiral.edge+.30;
    const a=project(-half,z),b=project(half,z),c=project(half,z-2),d=project(-half,z-2);
    polygon([a,b,c,d],'#a39c94');
    line(a,d,'#50565b',2*d[2]);line(b,c,'#50565b',2*c[2]);
    if(z<=spiral.bendStart){
      for(const side of [-1,1])line(project(side*.77,z),project(side*.77,z-2),'#ecdab2',2*c[2]);
    }
  }
}
