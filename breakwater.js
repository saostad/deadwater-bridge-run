'use strict';

// The drawing surface is independent of the simulation. z increases up the bridge.
const Breakwater = (() => {
  const camera = {halfRoad: 4.6, halfScreen: .54, feet: .79, rise: 1.00, distance: 78,
    metresPerDepth: .48, eyeSlope: .75, vertical: 1.03, pixelRatio: 1.5, detailedDistance: 76, get soldierScale() { return 1.30 * config.soldierVisualScale; }, drumScale: 1.58};
  const distance = () => camera.distance * (1 + crowdCamera.pullback * run.crowd);
  const rise = () => camera.rise * (1 + crowdCamera.pitch * run.crowd);
  const lift = (w,h) => w/h * cameraHalfScreen() / camera.halfRoad * camera.vertical;
  function project(x,z,w,h,y=0) {
    if(levels[levelIndex].scenery==='spiral'){
      const point=spiralPoint(x,z);
      x=point[0]/camera.halfRoad-run.cameraX;
      y+=point[1];
      z=point[2]/camera.metresPerDepth;
    }
    const range = distance();
    const depth=Math.max(0,z-entranceCamera.anchoredDepth)/range;
    const viewZ=z/range-run.entrance.dolly*depth;
    const q=1+viewZ-y*camera.eyeSlope/(range * camera.metresPerDepth);
    return [w*(.5+(x*cameraHalfScreen()+run.entrance.pan*depth)/q),
      h*(camera.feet-(rise()*viewZ+lift(w,h)*y-run.entrance.pitch*depth)/q),1/q];
  }
  function ground(px,py,w,h) {
    const dy=camera.feet-py/h, slope=rise(), range=distance();
    const anchor=entranceCamera.anchoredDepth/range;
    // Invert the same two depth ranges used by project() and the vertex shader.
    const correction=dy>slope*anchor/(1+anchor) ? (slope-dy)*run.entrance.dolly+run.entrance.pitch : 0;
    const z=(dy-correction*anchor)/(slope-dy-correction);
    const depth=Math.max(0,z-anchor);
    const x=(px/w-.5)*(1+z-run.entrance.dolly*depth)-run.entrance.pan*depth;
    return [(x/cameraHalfScreen()+run.cameraX)*camera.halfRoad, z*range*camera.metresPerDepth];
  }
  function muzzle(member,w,h,weapon='standard',barrel=0) {
    const [x,z] = ground(member.x,member.y,w,h);
    const style=weaponEffects[weapon];
    const scale = camera.soldierScale * member.scale;
    return {x:x-(.233+barrel*(style.barrelOffset ?? 0))*scale,z:z+style.muzzle*scale,y:1.33*scale};
  }
  const vert = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 pos;
  layout(location=1) in vec3 norm;
  layout(location=2) in vec3 rgb;
  layout(location=3) in float joint;
  layout(location=4) in vec2 uv;
  layout(location=5) in float tile;
  layout(location=6) in vec4 placement;
  layout(location=7) in vec4 pose;
  layout(location=8) in vec4 info;
  layout(location=9) in vec4 collapse; // tilt, horizontal bearing, joint fold, dissolve
  flat out float dissolve;
  uniform vec4 cam;
  uniform float cameraRise;
  uniform vec4 entrance; // horizontal shift, pitch shift, anchored depth / range, dolly
  uniform vec2 offset;
  uniform float shadow;
  out vec3 color,world,normal;
  out vec2 tex; out vec3 rest;
  flat out float decal;
  flat out float mat;
  void turn(inout vec3 p,inout vec3 n,vec3 pivot,float a){
    mat2 r=mat2(cos(a),sin(a),-sin(a),cos(a));
    p.yz=pivot.yz+r*(p.yz-pivot.yz); n.yz=r*n.yz;
  }
  void main(){
    vec3 p=pos,n=norm; rest=pos; dissolve=collapse.w;
    float kind=info.x, phase=pose.x, stride=pose.y, recoil=pose.z;
    float wave=sin(phase), side=joint==2.||joint==3.||joint==6.||joint==7.?-1.:1.;
    bool hero=kind==1., runner=kind==3., boss=kind==4.;
    float attack=floor(info.w/4.);
    if(kind>=1. && kind<=4.){
      if(joint>=2. && joint<=5.){
        float a=side*wave*stride;
        if(hero) {
          a=side*.22+side*wave*stride*.24;
          float legWeight=clamp((.89-p.y)/.85,0.,1.);
          p.x+=side*legWeight*.056+legWeight*wave*stride*.20;
          p.y+=legWeight*max(0.,side*cos(phase))*stride*.09;
        }
        if(joint==3.||joint==5.) turn(p,n,vec3(side*.118,.472,0),-.10-max(0.,-a)*.94);
        turn(p,n,vec3(side*.118,.883,0),a+.08);
      } else {
        if(joint>=6.){
          float swing=-wave*side*stride;
          p.x+=side*max(0.,1.42-p.y)*(runner?.22:.48);
          float elbow=hero?(side>0.?1.42:1.12):runner?.98:.42+.19*side;
          if(joint==7.||joint==9.) turn(p,n,vec3(side*.264,1.09,0),elbow);
          float shoulder=hero?(side>0.?.58:1.06):.62+side*.32+swing*(runner?1.38:1.06);
          if(boss && side>0.) {
            if(attack==1.) {
              // A blade sweeps sideways while the ram draws back along the bridge.
              shoulder+=.64+pose.w*.48;
              float yaw=pose.w*1.60-.50;
              mat2 sweep=mat2(cos(yaw),sin(yaw),-sin(yaw),cos(yaw));
              p.xz=vec2(.232,0.)+sweep*(p.xz-vec2(.232,0.)); n.xz=sweep*n.xz;
            } else if(attack==2.) {
              shoulder+=1.12-pose.w*.8;
              p.z+=pose.w*.19;
            } else shoulder+=pose.w*2.55;
          }
          turn(p,n,vec3(side*.232,1.41,0),shoulder);
          if(hero && side<0.) p.x+=max(0.,1.41-p.y)*.70;
        }
        turn(p,n,vec3(0,.90,0),hero?-.08+recoil*.07:runner?-.40:-.26);
        float roll=hero?-.05:(boss?.04:.10)*wave;
        mat2 lean=mat2(cos(roll),sin(roll),-sin(roll),cos(roll));
        p.xy=vec2(0.,.9)+lean*(p.xy-vec2(0.,.9)); n.xy=lean*n.xy;
        p.x+=wave*(hero?.01:.045);
      }
      if(!boss && !hero){
        // Recoil bends the wounded walker before its uneven stride resumes.
        if(recoil>0.){
          if(joint>=2. && joint<=5.) turn(p,n,vec3(0.,.48,0.),-.21*recoil*side);
          else turn(p,n,vec3(0.,.94,0.),recoil*.40);
          p.x+=recoil*.045;
        }
        // Compress the knees during a windup and tuck the legs in flight.
        float tuck=pose.w;
        if(joint>=2. && joint<=5.) {
          turn(p,n,vec3(0,.88,0),tuck*.56);
          if(joint==3. || joint==5.)turn(p,n,vec3(0,.47,0),-tuck*.83);
        }
        p.y*=1.-tuck*.17;
      }
      if(!hero && !boss) {
        float twist=.12*wave*clamp((p.y-.72)/.64,0.,1.);
        mat2 yaw=mat2(cos(twist),sin(twist),-sin(twist),cos(twist));
        p.xz=yaw*p.xz; n.xz=yaw*n.xz;
      }
      p.y+=abs(cos(phase))*.049*stride;
      if(hero){p.xz=-p.xz;n.xz=-n.xz;}
      if(boss) {
        if(joint>=2. && joint<=5.) turn(p,n,vec3(0.,.47,0.),recoil*.16*side);
        else turn(p,n,vec3(0.,.9,0.),-recoil*.34);
        p.y*=1.-recoil*.11;
        p.x*=1.28; n.x/=1.28;
      }
      if(collapse.x>0.){
        float fold=collapse.z;
        if(joint==3. || joint==5.)turn(p,n,vec3(0,.47,0),-.82*fold);
        if(joint>=2. && joint<=5.)turn(p,n,vec3(0,.88,0),.45*fold);
        if(joint>=6.)turn(p,n,vec3(0,1.41,0),(.3+.47*side)*fold);
        vec3 axis=vec3(cos(collapse.y),0.,-sin(collapse.y));
        float a=collapse.x, c=cos(a), s=sin(a);
        p=p*c+cross(axis,p)*s+axis*dot(axis,p)*(1.-c);
        n=n*c+cross(axis,n)*s+axis*dot(axis,n)*(1.-c);
        p.y=max(.018,p.y+.14*s);
      }
      if(info.z>0.){turn(p,n,vec3(0),-info.z*1.4);p.y*=1.-info.z*.5;}
    }
    if(kind==10.){
      turn(p,n,vec3(0),-info.z*1.4);
    }
    if(kind==9.){
      p.x += p.y*pose.x;
      p.y *= pose.y;
      if(collapse.x>0.){
        float a=collapse.x, h=p.y;
        p.y=max(.015,h*cos(a));
        p.xz+=h*sin(a)*vec2(sin(collapse.y),cos(collapse.y));
      }
    }
    p.x*=info.y; n.x/=info.y;
    if(kind==7.)p.z*=info.w;
    p=p*placement.w+placement.xyz;
    if(shadow>.5){p.x+=p.y*.69;p.z+=p.y*.46;p.y=.014;}
    world=p; normal=n; color=rgb;
    if(kind==2. && tile==-4. && rgb.r>rgb.b*1.35 && rgb.r<.52 && rgb.g>.38) {
      // Work shirts fade to flax, slate or olive across the same crowd.
      float dye=fract(info.w*1.37);
      color*=dye<.34?vec3(1.30,1.21,1.02):dye<.67?vec3(.77,1.02,1.18):vec3(.91,1.03,.80);
    }
    if(kind==2. || kind==3.){
      float faded=sin(info.w*5.1);
      if(rgb.r>rgb.b*1.12 && rgb.r<.64)color*=vec3(1.+faded*.15,1.-faded*.08,1.-faded*.09);
    }
    if(boss && rgb.b>rgb.r*.99 && rgb.r>.31 && rgb.r<.55) {
      if(mod(info.w,4.)==1.)color*=vec3(1.38,.94,.75);
      if(mod(info.w,4.)==2.)color*=vec3(.75,1.13,1.25);
      if(mod(info.w,4.)==3.)color*=vec3(1.35,1.29,1.04);
    }
    decal=tile==-2.?info.w:tile; tex=uv; mat=kind;
    if(kind==9. && pose.z>0.)tex.x=1.-tex.x;
    float depth=max(0.,p.z/cam.z-entrance.z);
    float zd=p.z/cam.z-entrance.w*depth, q=1.+zd-p.y*cam.w/cam.z;
    vec2 ndc=vec2(2.*cam.x*p.x,2.*(zd*cameraRise+cam.y*p.y));
    ndc+=2.*vec2(entrance.x,-entrance.y)*depth;
    ndc+=q*(offset+vec2(0.,${1-2*camera.feet}));
    gl_Position=vec4(ndc,q-.85,q);
  }`;
  const frag = `#version 300 es
  precision highp float;
  in vec3 color,world,normal; in vec2 tex; in vec3 rest;
  flat in float decal; flat in float mat; flat in float dissolve;
  uniform vec4 deckFinish;
  uniform float shadow; uniform sampler2D atlas, surfaces, paintedSheet; uniform bool textured;
  out vec4 outColor;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float mottling(vec2 p) {
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);
  }
  void main(){
    if(dissolve>0. && fract(dot(floor(gl_FragCoord.xy),vec2(.75487767,.56984029)))<dissolve)discard;
    if(mat==10.){
      vec4 ink=texture(paintedSheet,vec2((decal+tex.x)/4.,1.-tex.y));
      if(ink.a<.46)discard;
      outColor=shadow>.5?vec4(.12,.14,.17,.34):vec4(ink.rgb,1.);
      return;
    }
    if(mat==9.){
      vec2 cell=vec2(mod(decal,4.),floor(decal/4.));
      vec4 ink=texture(paintedSheet,(cell+vec2(tex.x,1.-tex.y))/vec2(4.,3.));
      if(ink.a<.45)discard;
      if(shadow>.5)outColor=vec4(.12,.14,.17,.34);
      else outColor=vec4(mix(ink.rgb,vec3(.64,.75,.79),min(.2,max(0.,world.z)*.0028)),1.);
      return;
    }
    if(shadow>.5){outColor=vec4(.12,.14,.17,.34);return;}
    vec3 c=color, n=normalize(normal);
    if(mat==8.){
      float d=length(rest.xz/vec2(.44,.31));
      outColor=vec4(.10,.085,.07,.31*pow(max(0.,1.-d),1.25)); return;
    }
    if(textured && decal<=-3.){
      vec2 cell, uv;
      if(decal==-5.){ cell=vec2(0.,1.);uv=vec2(.5+rest.x/.25,(1.69-rest.y)/.209); }
      else if(decal==-7.){ cell=vec2(1.);uv=vec2(.5+rest.x/1.67,.5-(rest.y-.53)/1.09); }
      else if(decal==-6.){cell=vec2(1.,0.);uv=vec2(.12+abs(rest.x)*.9,fract(rest.y*2.8));}
      else {cell=vec2(decal==-3.?0.:1.,0.);uv=vec2(.5+rest.x/.53,(1.49-rest.y)/.73);}
      vec3 ink=texture(surfaces,(cell+clamp(uv,.007,.993))*.5).rgb;
      float value=dot(ink,vec3(.28,.58,.14));
      if(decal==-5.){
        float face=smoothstep(.01,.08,-rest.z-.09)*smoothstep(1.48,1.51,rest.y)*(1.-smoothstep(1.67,1.71,rest.y));
        c=mix(c,ink*1.05+vec3(.13,.14,.11),face);
      } else if(decal==-3.)c=mix(c*(.66+value),ink*1.6+vec3(.025,.09,.13),smoothstep(.015,.09,rest.z));
      else if(decal==-7.)c=vec3(.18,.035,.025)+ink*vec3(1.45,.94,.85);
      else c*=.48+value*2.15;
    }
    if(decal>=0.) {
      vec2 cell=vec2(mod(decal,8.),floor(decal/8.));
      vec4 ink=texture(atlas,(cell+mix(vec2(.009),vec2(.991),vec2(tex.x,1.-tex.y)))/8.);
      if(ink.a<.25) discard;
      c=mix(c,ink.rgb,ink.a);
    }
    if(mat==0. && decal>=0. && decal<4.) {
      float glass=pow(max(0.,1.-abs(tex.x+tex.y*.63-.67)*5.),4.);
      c+=vec3(.068,.077,.073)*glass;
    }
    if(mat==7.){outColor=vec4(.94,.19,.12,.48);return;}
    if(mat==6.){outColor=vec4(c,1.);return;}
    if(deckFinish.w<0. && mat==5.){
      // Material fixed to the mesh so camera pans do not slide the asphalt grain.
      vec2 uv=rest.xz;
      float dust=mottling(uv*.85);
      float aggregate=mottling(uv*15.)-.5;
      if(n.y>.8 && c.r<.76){
        c*=.80+.29*dust+.23*aggregate;
        float joint=abs(fract((uv.y+.032*mottling(uv*3.))/6.)-.5);
        c*=.80+.20*smoothstep(.002,.008+fwidth(uv.y)/6.,joint);
      } else c*=.90+.16*dust+.12*aggregate;
    } else if(mat==5. && n.y>.8){
      vec2 grid=world.xz/vec2(1.12,1.48); grid.x+=mod(floor(grid.y),2.)*.5;
      vec2 seam=min(fract(grid),1.-fract(grid));
      float edge=min(seam.x,seam.y), aa=max(.002,fwidth(grid.y)*.65);
      float grain=hash(floor(world.xz*125.))-.5;
      float wear=mottling(world.xz*3.)+.45*mottling(world.xz*13.);
      if(deckFinish.w>0.){
        c=deckFinish.rgb;
        float stripe=1.-smoothstep(.022,.055,abs(abs(world.x)-.12));
        c=mix(c,vec3(.93,.68,.29),.68*stripe);
        if(deckFinish.w>=3.){
          vec2 holes=world.xz/vec2(.21,.31);
          float opening=smoothstep(.14,.29,length(fract(holes)-.5));
          float detail=1.-smoothstep(.15,.8,max(fwidth(holes.x),fwidth(holes.y)));
          c*=mix(1.,.55+.45*opening,detail);
        }
      }
      c*=.92+.072*hash(floor(grid))+.046*wear+.018*grain;
      c-=vec3(.06,.045,.031)*smoothstep(.71,.96,mottling(world.xz*1.25));
      c*=mix(.73,1.,smoothstep(.004-aa,.009+aa,edge));
      c+=.025*(1.-smoothstep(.009,.026+aa,edge));
    }
    if(deckFinish.w<0. && mat==1. && decal==-3.){
      float weave=dot(c,vec3(.28,.57,.15));
      c=vec3(.48,.085,.265)*(.48+1.75*weave);
    }
    float diffuse=max(0.,dot(n,normalize(vec3(-.69,1.,-.46))));
    float sky=.66+.09*n.y+.43*diffuse;
    float sheen=pow(max(0.,dot(n,normalize(vec3(-.32,.85,-.66)))),11.)*.065;
    vec3 lit=c*sky+vec3(sheen)+vec3(.027,.038,.052)*(1.-diffuse);
    outColor=vec4(mix(lit,vec3(.64,.75,.79),min(.23,max(0.,world.z)*.0028)),1.);
  }`;
  const signs=['rapid','spread','scatter','longshot','rescue','armor'];
  function paintGunBadge(c,i) {
    const riflePath='M-38 -4 L-24 -4 -21 -8 -3 -8 -3 -11 4 -11 4 -8 19 -8 21 -6 37 -6 38 -2 19 -2 15 1 4 1 7 11 2 13 -4 2 -10 2 -15 11 -18 9 -15 2 -23 1 -36 7 Z';
    const silhouettes=[riflePath,
      'M-36 0 L-26 -7 -11 -7 -8 -11 10 -11 13 -8 24 -8 24 -6 38 -6 38 -3 19 -3 19 0 38 0 38 3 15 3 10 6 3 6 2 12 -4 12 -4 4 -12 4 -17 10 -21 8 -18 2 -29 3 -36 7 Z',
      'M-37 3 L-22 -3 -17 -5 -6 -5 -6 -8 32 -8 32 -4 16 -4 16 1 2 1 -5 0 -11 4 -15 2 -34 12 Z',
      'M-39 4 L-24 -3 -17 -6 7 -6 10 -4 38 -4 38 -2 8 -2 3 1 -2 2 -3 8 -8 8 -9 2 -22 4 -37 11 Z'];
    const body=new Path2D(silhouettes[i]);
    c.lineJoin='round'; c.lineWidth=4; c.strokeStyle='#fff3a0'; c.stroke(body); c.fillStyle='#2b3437'; c.fill(body);
    c.fillStyle='#8c9a95'; c.fillRect(-21,-7,37,2); c.fillStyle='#566467'; c.fillRect(0,-5,19,3);
    c.fillStyle='#845438'; c.fillRect(-33,-3,11,4);
    if(i===3){c.fillStyle='#26343d';c.fillRect(-6,-14,17,5); c.fillStyle='#92edf6';c.fillRect(8,-13,3,3);}
  }
  function badge(canvas,kind){
    const c=canvas.getContext('2d');
    c.clearRect(0,0,canvas.width,canvas.height);c.save();
    c.translate(canvas.width/2,canvas.height/2); c.scale(canvas.width/84,canvas.height/36);
    paintGunBadge(c,signs.indexOf(kind));
    c.restore();
  }
  function atlasCanvas() {
    const canvas=document.createElement('canvas'), cell=192;
    canvas.width=canvas.height=cell*8;
    const c=canvas.getContext('2d');
    for(let i=0;i<64;i++) {
      c.save(); c.translate(i%8*cell,Math.floor(i/8)*cell);
      if(i<signs.length) {
        const kind=signs[i], weapon=i<4;
        const grad=c.createLinearGradient(0,0,0,cell);
        grad.addColorStop(0,['#ffd544','#6afffc','#eeacff','#b6ff8b','#99d4a2','#a4d2e4'][i]);
        grad.addColorStop(1,['#fc792a','#179ed2','#a768cf','#65a26a','#498974','#507693'][i]);
        c.fillStyle=grad; c.fillRect(0,0,cell,cell);
        c.fillStyle='#ffffff54'; c.fillRect(0,0,cell,5); c.fillRect(0,cell-6,cell,3);
        if(weapon) {
          c.save(); c.translate(94,91); c.scale(2.22,2.82);
          paintGunBadge(c,i);
          c.restore();
        } else {
          c.fillStyle='#f5f2d9'; c.fillRect(79,45,34,85); c.fillRect(52,72,88,30);
        }
        c.fillStyle='#1b3037'; c.textAlign='center'; c.font='900 21px system-ui';
        c.fillText(armory.tuning[kind].badge,cell/2,158,177);
      } else {
        const label=i===6?'+1':i===7?'':i>56?gateLabel(56-i):i>40?gateLabel(i-40):String(i-8);
        c.textAlign='center'; c.textBaseline='middle'; c.lineJoin='round';
        c.font='900 116px system-ui'; c.strokeStyle='#29323a'; c.lineWidth=10;
        c.strokeText(label,cell/2,cell*.50); c.fillStyle='#fff8e7'; c.fillText(label,cell/2,cell*.50);
      }
      c.restore();
    }
    return canvas;
  }
  function meshes() {
    const {Mesh,character}=BreakwaterModels;
    const models={farWalker:BreakwaterModels.distant(false),farRunner:BreakwaterModels.distant(true),farSiege:BreakwaterModels.distant(false,true)};
    for(const type of ['squad','ranger','walker','runner','boss','siege','armored','raider','hulk','shieldBearer','leaper','spitter','howler']) models[type]=character(type==='shieldBearer'?'shield':type);
    const make=(name,build)=>{const m=new Mesh();build(m);models[name]=m;};
    for(const kind of Object.keys(weaponEffects))models['gun-'+kind]=BreakwaterModels.gun(kind);
    for(const tool of Object.keys(bossWeapons))models['tool-'+tool]=BreakwaterModels.bossTool(tool);
    CampaignScenery.build(make);
    buildSpiralMeshes(make);
    const face=(m,w,y,h,z,tile,lean=0) => m.quad([-w/2,y,z],[-w/2,y+h,z+lean],[w/2,y+h,z+lean],[w/2,y,z],0xffffff,0,tile);
    make('walkerArt',m=>face(m,1,-5/256,1,0,-2));
    make('rangerArt',m=>face(m,1.11,0,1.85,0,-2));
    for(const kind of encounterTuning.roster)make(kind,m=>face(m,1,-5/256,1,0,-2));
    make('icePatch',m=>{
      m.loft(0,0,[[0,.90,1.02],[.035,1,1],[.055,.72,.63]],0x9de4f6,0,7);
      m.box(-.15,.057,0,.68,.014,.035,0xe8ffff);
    });
    make('seedPod',m=>{
      m.loft(0,0,[[0,.20,.17],[.12,.36,.27],[.38,.32,.22],[.65,.12,.09],[.72,.025,.025]],0x9bad37,0,9);
      m.loft(.01,-.17,[[.12,.07,.04],[.34,.12,.11],[.55,.045,.04]],0xe6ff6c,0,7);
    });
    make('acid',m=>m.loft(0,0,[[-.16,.07,.09],[-.04,.16,.18],[.09,.145,.16],[.16,.05,.07]],0xbce863,0,9));
    make('contact',m=>m.quad([-.44,0,-.31],[-.44,0,.31],[.44,0,.31],[.44,0,-.31],0x352e27));
    make('warning',m=>m.quad([-1,0,0],[-1,0,1],[1,0,1],[1,0,0],0xec735a));
    // Split long deck surfaces at the camera pivot so the depth buffer follows the
    // same projection as feet, shadows and piers on either side of that point.
    const pivot=entranceCamera.anchoredDepth*camera.metresPerDepth;
    function deckBox(m,y,w,h,near,far,color){
      const ends=near<pivot && pivot<far ? [pivot,far] : [far];
      for(const end of ends){
        m.box(0,y,(near+end)/2,w,h,end-near,color);
        near=end;
      }
    }
    make('road',m=>deckBox(m,-.24,9.72,.48,-11,177,0xc5bcae));
    make('apron',m=>deckBox(m,-.24,9.72,.48,-11,11,0xc5bcae));
    make('span',m=>m.box(0,-.24,94,1,.48,166,0xc5bcae));
    make('divider',m=>m.box(0,.10,94,.10,.20,166,0xabb1a8));
    make('curb',m=>{
      deckBox(m,.115,.20,.23,-11,177,0xbbbab0);
      deckBox(m,.241,.21,.027,-11,177,0xe4dfcf);
    });
    make('pier',m=>{m.box(0,-1.81,0,.63,3,.85,0x808986);m.box(0,-.44,0,.93,.28,1.18,0x787571);});
    for(const [i,name] of signs.entries()) make(name,m=>{
      const panel=i<4, w=panel?2*camera.halfRoad*armory.panelAim:1.28, h=panel?1.47:.91;
      m.box(0,h/2,0,w,h,.14,0x576574);
      face(m,w-.04,.032,h-.05,-.081,i,.0);
      for(const side of [-1,1]){
        m.box(side*w*.5,h*.51,0,.103,h*1.09,.20,0x99673c);
        m.box(side*w*.5,.065,-.018,.16,.13,.25,0x595959);
        m.box(side*w*.5,h*1.035,0,.132,.082,.24,0x987955);
        for(const y of [.20,h-.12])m.box(side*w*.5,y,-.108,.048,.048,.026,0xb5b3a1);
      }
    });
    for (const [name, color] of [['recruit', 0x2979c7], ['penalty', 0xbd3037]]) {
      make(name, m => {
        m.box(0,.38,0,1.94,.76,.13,color);
        face(m,1.52,.015,.70,-.069,-2);
        for (const side of [-1,1]) m.box(side*.97,.40,0,.072,.80,.16,0xc09352);
      });
    }
    make('number',m=>face(m,.65,.0,.51,0,-2));
    make('drum',m=>{
      const rings=[[-.82,.47],[-.77,.51],[-.62,.51],[-.59,.55],[-.54,.55],[-.50,.51],[.49,.51],[.53,.55],[.58,.55],[.62,.51],[.77,.51],[.82,.47]];
      for(let i=1;i<rings.length;i++) for(let j=0;j<20;j++){
        const p=(k,a)=>[rings[k][0],.53+rings[k][1]*Math.cos(a),rings[k][1]*Math.sin(a)];
        const a=j*Math.PI/10,b=(j+1)*Math.PI/10;
        const band=[3,4,8,9].includes(i), color=band?0x74392f:0xe65339, tag=band?-1:-7;
        const slope=(rings[i-1][1]-rings[i][1])/(rings[i][0]-rings[i-1][0]);
        const na=[slope,Math.cos(a),Math.sin(a)], nb=[slope,Math.cos(b),Math.sin(b)];
        m.triangle(p(i-1,a),p(i-1,b),p(i,b),color,0,tag,undefined,[na,nb,nb]);
        m.triangle(p(i-1,a),p(i,b),p(i,a),color,0,tag,undefined,[na,nb,na]);
        if(i===1 || i===rings.length-1){const k=i===1?0:i;m.triangle([rings[k][0],.53,0],p(k,b),p(k,a),0xae392d,0);}
      }
    });
    make('crate',m=>{
      m.box(0,.47,0,1.90,.94,.90,0x694c36);
      for(const [index,wood] of [0xbd9061,0xa67950,0xb88a5c,0xb08151].entries()){
        m.box(0,.121+index*.232,-.449,1.875,.218,.038,wood);
        m.box(0,.943,-.337+index*.225,1.872,.034,.212,wood);
      }
      for(const s of [-1,1]) {m.box(s*.71,.48,0,.10,1,.95,0x444d50);m.box(0,.48+s*.30,-.466,1.88,.032,.026,0x684c37);}
    });
    make('shield',m=>{m.loft(0,0,[[0,.15,.07],[.16,.26,.09],[.61,.29,.10],[.66,.22,.09]],0x547887,0,8);
      m.box(0,.37,-.095,.075,.50,.032,0xc6b48a);});
    for(const [kind,style] of Object.entries(weaponEffects)) {
      const color=parseInt(shotColor(kind).slice(1),16);
      make('round-'+kind,m=>{
        m.box(0,0,0,style.width*1.45,style.width,style.length,color);
        m.box(0,0,style.length*.25,style.width*.7,style.width*1.18,style.length*.50,0xfff5dd);
      });
      make('flash-'+kind,m=>{
        const r=style.recoil*.115;
        m.loft(0,0,[[-r,.026,.04],[0,r,r*2],[r,.038,.04]],color,0,6);
      });
    }
    make('ring',m=>{for(let i=0;i<36;i++){const p=(a,r)=>[r*Math.cos(a),.023,r*Math.sin(a)];const a=i*Math.PI/18,b=(i+1)*Math.PI/18;
      m.quad(p(a,.38),p(b,.38),p(b,.412),p(a,.412),0xb5ed73);}});
    return models;
  }
  function create(canvas) {
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,stencil:true,premultipliedAlpha:true});
    if(!gl) throw new Error('WebGL 2 unavailable');
    const program=gl.createProgram();
    for(const [type,src] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]) {
      const shader=gl.createShader(type); gl.shaderSource(shader,src); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader); gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program); gl.enable(gl.DEPTH_TEST);
    const uniform=name=>gl.getUniformLocation(program,name);
    const uniforms={deckFinish:uniform('deckFinish'),cam:uniform('cam'), cameraRise:uniform('cameraRise'),entrance:uniform('entrance'),offset:uniform('offset'),shadow:uniform('shadow')};
    const texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlasCanvas());
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    const materialTexture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,materialTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([255,255,255,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.uniform1i(uniform('surfaces'),1);
    const materialImage=new Image();
    materialImage.onload=()=>{
      if(gl.isContextLost())return;
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,materialTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,materialImage);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
      gl.uniform1i(uniform('textured'),1);gl.activeTexture(gl.TEXTURE0);
      lastStageFrame=undefined;
    };
    materialImage.onerror=()=>{
      console.error('Character material atlas unavailable',{fallback:true,using:'base mesh colors'});
      const status=document.getElementById('art-status');
      status.textContent='Character textures unavailable. Showing base colors. Reload to retry.';
      status.hidden=false;
    };
    materialImage.src=characterMaterials;
    gl.activeTexture(gl.TEXTURE0);
    const blankSheet=gl.createTexture();
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,blankSheet);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uniform('paintedSheet'),2);
    const paintedTextures=new Map();
    const groups={};
    function attr(index,n,stride,offset) {
      gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index,n,gl.FLOAT,false,stride*4,offset*4);
    }
    for(const [name,m] of Object.entries(meshes())) {
      const vao=gl.createVertexArray(); gl.bindVertexArray(vao);
      const unique=[], indices=[], lookup=new Map(), floats=13;
      for(let i=0;i<m.vertices.length;i+=floats){
        const vertex=m.vertices.slice(i,i+floats), key=vertex.join(',');
        if(!lookup.has(key)){lookup.set(key,unique.length/floats);unique.push(...vertex);}
        indices.push(lookup.get(key));
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(unique),gl.STATIC_DRAW);
      attr(0,3,13,0);attr(1,3,13,3);attr(2,3,13,6);attr(3,1,13,9);attr(4,2,13,10);attr(5,1,13,12);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for(let j=0;j<4;j++){attr(6+j,4,16,j*4);gl.vertexAttribDivisor(6+j,1);}
      groups[name]={vao,buffer,vertices:m.vertices.length/13,list:[]};
    }
    function put(name,x,y,z,size=1,kind=0,phase=0,stride=0,kick=0,axe=0,span=1,fall=0,number=0,tilt=0,bearing=0,fold=0,fade=0) {
      if(levels[levelIndex].scenery==='spiral'){
        if(name!=='interchange' && name!=='mesa'){
          const point=spiralPoint(x/camera.halfRoad,z/camera.metresPerDepth);
          x=point[0];y+=point[1];z=point[2];
        }
        x-=run.cameraX*camera.halfRoad;
      }
      groups[name].list.push(x,y,z,size,phase,stride,kick,axe,kind,span,fall,number,tilt,bearing,fold,fade);
    }
    function batch(name) {
      const g=groups[name]; if(!g.list.length) return;
      if(paintedTextures.has(name)){
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D,paintedTextures.get(name));
        gl.activeTexture(gl.TEXTURE0);
      }
      gl.bindVertexArray(g.vao);
      gl.drawElementsInstanced(gl.TRIANGLES,g.vertices,gl.UNSIGNED_SHORT,0,g.list.length/16);
    }
    const groundNames=['interchange','road','apron','span','divider','curb','pier','warning','contact'];
    function draw(run,time,w,h,formation,shake,level) {
      const ratio=Math.min(window.devicePixelRatio || 1,camera.pixelRatio);
      const rw=Math.round(w*ratio),rh=Math.round(h*ratio);
      if(canvas.width!==rw || canvas.height!==rh){canvas.width=rw;canvas.height=rh;gl.viewport(0,0,rw,rh);}
      const X=camera.halfRoad,Z=camera.metresPerDepth;
      for(const g of Object.values(groups))g.list.length=0;
      CampaignScenery.place(level.scenery,put);
      if(level.scenery==='spiral'){
        put('interchange',0,0,0,1,5);

      } else if (!level.chapter && (level.split || level.siege)) {
        put('apron',0,0,0,1,5);
        const inner=level.siege?1.91:.33, outer=4.86;
        for(const side of [-1,1]){
          put('span',side*(inner+outer)/2,0,0,1,5,0,0,0,0,outer-inner);
          put('divider',side*inner,0,0);
        }
        if(level.siege) put('span',0,0,0,1,5,0,0,0,0,3.38);
      } else put('road',0,0,0,1,5);
      if(level.scenery!=='spiral')for(const side of [-1,1]){
        put('curb',side*4.83,0,0);
        for(let z=-4;z<91;z+=6.8)put('pier',side*4.63,0,z);
      }
      const visible=o=>o.z>config.breachLine-3 && o.z<cameraViewDistance();
      const boss=run.enemies.at(-1);
      if(boss.health && boss.windupUntil!==undefined){
        const lane=bruteStrikeLane(boss), [,back]=ground(0,lane.back,w,h);
        put('warning',lane.center*X,.028,back,1,7,0,0,0,0,boss.attackWidth*X,0,boss.z*Z-back);
      }
      for(const g of run.gates)if(!g.used && visible(g) && (level.scenery!=='spiral' || g.z<=spiral.bendStart)) {
        const truck=g.kind==='truck';
        if(truck) put('truck',g.x*X,0,g.z*Z);
        const tile = g.count < 0 ? 56 - g.count : g.count === 1 ? 6 : 40 + g.count;
        put(g.count < 0 ? 'penalty' : 'recruit',g.x*X,truck?1.23:0,g.z*Z,1,0,0,0,0,0,1,0,tile);
      }
      for(const bed of level.beds ?? [])put('plantBed',bed.x*X,0,bed.z*Z);
      for(const b of run.barricades)if(visible(b))put(b.kind==='debris'?'debris':'crate',b.x*X,0,b.z*Z);
      for(const c of run.caches)if((!c.passed || c.station==='turret') && visible(c)){
        if(c.station){
          put(c.station==='turret'?'goldTurret':'roller',c.x*X,0,c.z*Z);
          if(!c.passed)put('number',c.x*X,1.38,c.z*Z,.95,0,0,0,0,0,1,0,8+c.health);
          continue;
        }
        const drum=c.kind==='drum';
        put(c.kind,c.x*X,0,c.z*Z,drum?camera.drumScale:1);
        const top=c.drop!==undefined?1.09:drum?.41*camera.drumScale:.66;
        put('number',c.x*X,top,c.z*Z-(drum?.55*camera.drumScale:.13),drum?1.65*camera.drumScale:.90,0,0,0,0,0,1,0,8+c.health);
      }
      function uploadSheet(name,atlas){
        if(paintedTextures.has(name))return;
        const texture=gl.createTexture();
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.activeTexture(gl.TEXTURE0);
        paintedTextures.set(name,texture);
      }
      function zombie(e) {
        if(e.phase==='tunnel')return;
        const walker=!e.kind && !e.boss;
        const art=walker?'walkerArt':e.kind;
        const atlas=paintedAtlases.get(art);
        if(atlas?.naturalWidth){
          uploadSheet(art,atlas);
          const pose=walker?walkerArtPose(e,time):paintedPose(e,time);
          const size=walker?2.05*(e.size??horde.bodyScale)/horde.bodyScale:e.size;
          put(art,e.x*X,(e.height??0),e.z*Z,size,9,pose.lean,pose.stretch,Number(pose.mirror),
            0,1,0,pose.frame,walker?(e.tilt??0):0,e.angle??0,0,e.fade??0);
          put('contact',e.x*X,.013,e.z*Z,size*(walker?.55:1)*(1-(e.fade??0)),8);
          return;
        }
        const poseTime=e.time ?? time;
        const runner=e.kind==='runner' || e.kind==='raider' || e.kind==='leaper', far=e.z>camera.detailedDistance;
        let type=e.kind==='shield'?'shieldBearer':e.kind;
        if(encounterTuning.roster.includes(type))type='hulk';
        if(!type) type=e.siege?(far?'farSiege':'siege'):(far?'farWalker':'walker');
        if(far && type==='runner') type='farRunner';
        if(e.boss) type='boss';
        const phase=e.boss?(e.travel||0)/charge.strideDistance*Math.PI:poseTime*(enemyTypes[e.kind]?.cadence ?? 7)+(e.gaitOffset??0);
        const walking=e.windupUntil===undefined && !(e.recoverUntil>time);
        const stride=e.boss ? (walking ? .46 : 0) : (runner ? .84 : .54);
        const size=e.boss?2.18*e.size/charge.size:(runner?1.07:1.14*(e.size??horde.bodyScale)/horde.bodyScale);
        const flinch=Math.max(0,1-(time-(e.lastHit??-Infinity))/config.impactTime);
        const tool=e.profile?.tool ?? e.tool;
        const motion=tool==='blade'?1:tool==='ram'?2:0;
        const surface=e.boss?4*motion+bruteFinishes.indexOf(e.finish):(e.gaitOffset??0);
        const windup=e.attack?clamp(1-(e.attack.release-poseTime)/(enemyTypes[e.kind].windup*run.difficulty.warning),0,1):0;
        const ordinary = !e.kind && !e.boss;
        const stagger = ordinary && e.health > 0 ? walkerStagger(e,time) : 0;
        const limp = (ordinary && e.health === 1) || (e.kind==='armored' && e.lastHit!==undefined) ? .42 : 0;
        const reaction = e.boss ? bruteFollowthrough(e,time) : limp + stagger;
        const speed = e.attack ? stride*.12 : stride * (1 - limp*.42 - stagger*.34);
        const args=[e.x*X,(e.height??0),e.z*Z+flinch*.09,size,e.boss?4:runner?3:2,phase,speed,reaction,
          e.boss?bruteAttackPose(e,poseTime):windup,type==='hulk'?1.27:1,0,surface,e.tilt??0,e.angle??0,e.fold??0,e.fade??0];
        put(type,...args);
        if(e.z<camera.detailedDistance)put('contact',e.x*X,.013,e.z*Z,size*(1-(e.fade??0))/(1+(e.height??0)),8);
        if(e.boss) {
          put('tool-'+tool,...args);
          if(e.shield)put('shield',e.x*X-.285*size,.72*size+(e.height??0),e.z*Z-.24*size,.845*size);
        }
      }
      for(const e of run.enemies)if(e.health>0 && !e.passed && visible(e))zombie(e);
      for(const ice of run.ice)if(visible(ice))
        put('icePatch',ice.x*X,.025,ice.z*Z,campaignSpecialists.frost.iceRadius*X);
      for(const pod of run.pods)if(pod.health>0 && visible(pod))
        put('seedPod',pod.x*X,.03,pod.z*Z,1+.08*Math.sin(time*12));
      for(const glob of run.acid)put('acid',glob.x*X,glob.height,glob.z*Z,1,6);
      for(const e of run.fallen)if(visible(e))zombie(e);
      const gun=run.weapons.at(-1) ?? 'standard';
      const style=weaponEffects[gun];
      function soldier(x,z,phase,stride,kick,fall=0,scale=1) {
        const args=[x,0,z,camera.soldierScale*scale,1,phase,stride,kick*style.recoil,0,1,fall];
        const atlas=paintedAtlases.get('ranger');
        if(atlas?.naturalWidth){
          uploadSheet('rangerArt',atlas);
          put('rangerArt',x,0,z,camera.soldierScale*scale,10,0,0,0,0,1,fall,rangerFrame(phase,stride,kick));
        } else put('ranger',...args);
        put('gun-'+gun,...args);
      }
      formation.members.forEach((p,i)=>{
        const [x,z]=ground(p.x,p.y,w,h);
        const kick=Math.max(0,1-(time-run.lastVolleyAt)/config.muzzleTime);
        if(kick>.30 && p.row===0){
          for(const barrel of gun==='spread'?[-1,1]:[0]){
            const tip=muzzle(p,w,h,gun,barrel);
            put('flash-'+gun,tip.x,tip.y,tip.z,kick,6);
          }
        }
        put('ring',x,0,z,camera.soldierScale*p.scale);
        put('contact',x,.013,z,camera.soldierScale*p.scale,8);
        soldier(x,z,time*13+i,Math.min(.65,Math.abs(run.velocity)*.4+p.joining*.6),kick,0,p.scale);
      });
      for(const shot of run.shots){
        const start=shot.muzzle, aim=Math.min(1,shot.z/Math.max(1,shot.target?.z??shot.range));
        const x=start?start.x*(1-aim)+shot.x*X*aim:shot.x*X;
        const aimY=shot.target?.pod ? campaignSpecialists.carrier.podAimHeight : shot.target?.kind==='boiler' ? shot.target.size*enemyTypes.boiler.coreHeight : 1.16+(shot.target?.height??0);
        const y=start?start.y*(1-aim)+aimY*aim:aimY;
        const fan=shot.weapon==='scatter'?shot.fan*weaponEffects.scatter.fan*Math.sin(Math.PI*aim):0;
        put('round-'+shot.weapon,x+fan,y,shot.z*Z+(start?.z??0)*(1-aim),1,6);
      }
      if(run.bruteImpact && time-run.bruteImpact.time<config.fallTime){
        const hit=run.bruteImpact;
        hit.strikes.slice(hit.blocked).forEach(([u,v])=>{
          const [x,z]=ground(u*w,v*h,w,h);
          soldier(x,z,0,0,0,(time-hit.time)/config.fallTime);
        });
      }
      for(const g of Object.values(groups))if(g.list.length){
        gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.list),gl.DYNAMIC_DRAW);
      }
      if(level.chapter)gl.uniform4f(uniforms.deckFinish,...level.chapter.deckTint,level.chapter.deckStyle);
      else gl.uniform4f(uniforms.deckFinish,0,0,0,level.scenery==='spiral'?-1:0);
      gl.uniform4f(uniforms.cam,cameraHalfScreen()/X,lift(w,h),distance()*Z,camera.eyeSlope);
      gl.uniform1f(uniforms.cameraRise,rise());
      gl.uniform4f(uniforms.entrance,run.entrance.pan,run.entrance.pitch,entranceCamera.anchoredDepth/distance(),run.entrance.dolly);
      gl.uniform2f(uniforms.offset,shake[0]*2/w,-shake[1]*2/h);
      gl.stencilMask(255);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
      gl.enable(gl.STENCIL_TEST);gl.stencilFunc(gl.ALWAYS,1,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);
      gl.uniform1f(uniforms.shadow,0);batch('interchange');batch('road');batch('apron');batch('span');
      gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);batch('pier');batch('curb');batch('divider');
      const objects=Object.keys(groups).filter(name=>!groundNames.includes(name));
      gl.stencilFunc(gl.EQUAL,1,255);gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);
      gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ZERO,gl.ONE);
      gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);gl.depthMask(false);batch('contact');batch('warning');
      gl.stencilOp(gl.KEEP,gl.KEEP,gl.INCR);gl.depthMask(false);gl.uniform1f(uniforms.shadow,1);
      for(const name of objects)if(name!=='number' && name!=='ring' && !name.startsWith('round-') && !name.startsWith('flash-'))batch(name);
      gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.STENCIL_TEST);
      gl.uniform1f(uniforms.shadow,0);
      for(const name of objects)batch(name);
    }
    return {draw};
  }
  return {camera,create,project,muzzle,badge};
})();
