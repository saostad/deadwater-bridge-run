'use strict';

// Original meshes in metres. Each vertex belongs to a joint in the animated rig.
const BreakwaterModels = (() => {
  const tau = Math.PI * 2;
  const dye = hex => [16, 8, 0].map(shift => ((hex >> shift) & 255) / 255);
  class Mesh {
    constructor() { this.vertices = []; }
    triangle(a, b, c, color, joint, tile = -1, uv = [[0,0],[0,0],[0,0]], normals) {
      const [ax, ay, az] = a, ux = b[0]-ax, uy = b[1]-ay, uz = b[2]-az;
      const vx = c[0]-ax, vy = c[1]-ay, vz = c[2]-az;
      const n = [uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx];
      const len = Math.hypot(...n) || 1;
      const normal = n.map(value => value / len), rgb = dye(color);
      [a,b,c].forEach((p,i) => this.vertices.push(...p,...(normals ? normals[i] : normal),...rgb,joint,...(tile===-1?[0,0]:uv[i]),tile));
    }
    quad(a,b,c,d,color,joint=0,tile=-1) {
      this.triangle(a,b,c,color,joint,tile,[[0,0],[0,1],[1,1]]);
      this.triangle(a,c,d,color,joint,tile,[[0,0],[1,1],[1,0]]);
    }
    box(x,y,z,w,h,d,color,joint=0) {
      const a=x-w/2,b=x+w/2,l=y-h/2,t=y+h/2,f=z-d/2,k=z+d/2;
      this.quad([a,l,f],[a,t,f],[b,t,f],[b,l,f],color,joint);
      this.quad([b,l,k],[b,t,k],[a,t,k],[a,l,k],color,joint);
      this.quad([a,l,k],[a,t,k],[a,t,f],[a,l,f],color,joint);
      this.quad([b,l,f],[b,t,f],[b,t,k],[b,l,k],color,joint);
      this.quad([a,t,f],[a,t,k],[b,t,k],[b,t,f],color,joint);
      this.quad([a,l,k],[a,l,f],[b,l,f],[b,l,k],color,joint);
    }
    sleeve(a,b,r1,r2,color,joint) {
      const axis=b.map((v,i)=>v-a[i]), len=Math.hypot(...axis);
      const n=axis.map(v=>v/len);
      const side=[0,n[2],-n[1]], sideLen=Math.hypot(...side);
      const u=side.map(v=>v/sideLen), v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];
      const ring=(p,r,i)=>p.map((value,j)=>value+r*(Math.cos(i*tau/8)*u[j]+Math.sin(i*tau/8)*v[j]));
      for(let i=0;i<8;i++) this.quad(ring(a,r1,i),ring(a,r1,i+1),ring(b,r2,i+1),ring(b,r2,i),color,joint);
    }
    // Horizontal contours give the cheekbones, collar, hips, calf and boot their own profiles.
    loft(x,z,rings,color,joint=0,sides=10,material=-1) {
      const rows = rings.map(([y,rx,rz,dz=0,dx=0]) => Array.from({length:sides},(_,i) => {
        const a = tau * (i+0.5)/sides;
        return [x+dx+rx*Math.cos(a), y, z+dz+rz*Math.sin(a)];
      }));
      const normals=rows.map((row,j)=>row.map((point,i)=>{
        const a=row[(i+sides-1)%sides], b=row[(i+1)%sides];
        const lo=rows[Math.max(0,j-1)][i], hi=rows[Math.min(rows.length-1,j+1)][i];
        const ux=hi[0]-lo[0],uy=hi[1]-lo[1],uz=hi[2]-lo[2],vx=b[0]-a[0],vz=b[2]-a[2];
        const n=[uy*vz,uz*vx-ux*vz,-uy*vx],len=Math.hypot(...n);
        return n.map(component=>component/len);
      }));
      for(let j=1;j<rows.length;j++) for(let i=0;i<sides;i++) {
        const k=(i+1)%sides, lo=rows[j-1], hi=rows[j], ln=normals[j-1], hn=normals[j];
        this.triangle(lo[i],hi[i],hi[k],color,joint,material,undefined,[ln[i],hn[i],hn[k]]);
        this.triangle(lo[i],hi[k],lo[k],color,joint,material,undefined,[ln[i],hn[k],ln[k]]);
      }
      for(let i=1;i<sides-1;i++) {
        this.triangle(rows[0][0],rows[0][i],rows[0][i+1],color,joint);
        this.triangle(rows.at(-1)[0],rows.at(-1)[i+1],rows.at(-1)[i],color,joint);
      }
    }
  }
  function character(type) {
    const ranger=type==='ranger';
    const m=new Mesh(), soldier=type==='squad' || ranger, brute=type==='boss', runner=type==='runner';
    const skin=soldier?0xb87750:brute?0x84856a:runner?0xc6b4a3:0xabaa8b;
    const shirt=soldier?0x176e9d:brute?0x504c43:runner?0x994b4c:({leaper:0x317b97,spitter:0x64853c,howler:0xaf5f2c,raider:0x8e4579,hulk:0x96724f,shield:0x32727b,armored:0x4b6274,siege:0xaf4241}[type] ?? 0x796d57);
    const pants=soldier?0x35495a:runner?0x514144:0x424d52;
    const leather=0x3b3230, metal=0x626e71, bright=0xf1a639, bone=1;
    m.loft(0,0,[[.76,.225,.153],[.81,.234,.151],[.91,.216,.146],[1.01,.189,.139],[1.12,.204,.149],[1.28,.257,.178,-.023],[1.37,.272,.158,-.033],[1.43,.253,.129,-.039],[1.49,.13,.098,-.046]],shirt,bone,18,soldier?-3:-4);
    m.loft(0,0,[[.863,.221,.153],[.889,.231,.159],[.936,.223,.156],[.949,.217,.147]],soldier?0xc34732:leather,bone,16);
    m.loft(0,-.055,[[1.43,.09,.082],[1.55,.075,.08]],skin,bone);
    m.loft(0,-.085,[[1.484,.053,.067,-.036],[1.512,.083,.094,-.028],[1.55,.104,.105,-.014],[1.592,.116,.113],[1.624,.124,.121],[1.654,.121,.115],[1.684,.128,.122],[1.727,.120,.122,.008],[1.765,.09,.099,.012],[1.79,.043,.057,.014]],skin,bone,18,soldier?-1:-5);
    m.loft(0,-.194,[[1.578,.024,.014],[1.593,.030,.031],[1.615,.020,.029],[1.655,.011,.008]],skin,bone,8);
    for(const side of [-1,1]) {
      if(soldier)m.box(side*.054,1.642,-.187,.047,.018,.02,0x453c37,bone);
      m.box(side*.117,1.615,-.061,.034,.064,.045,skin,bone);
    }
    if(soldier || brute) {
      m.loft(0,-.073,[[1.65,.137,.139],[1.688,.144,.156],[1.743,.132,.143],[1.80,.098,.104],[1.818,.057,.058]],soldier?0x344f55:metal,bone,12);
      if(soldier) {
        m.box(0,1.735,.055,.075,.038,.022,0x9da897,bone);
        for(const s of [-1,1]) m.box(s*.124,1.65,-.055,.033,.072,.069,0x3c4646,bone);
      }
      m.loft(0,-.075,[[1.662,.143,.153],[1.689,.145,.157]],leather,bone,12);
    } else {
      if(type!=='walker' && type!=='siege')m.loft(0,-.064,[[1.69,.125,.118],[1.735,.123,.12],[1.777,.089,.093],[1.79,.046,.06]],runner?0x4c3936:0x534f45,bone);

    }
    if(ranger){
      // Rear-facing field pack, webbing and rolled canvas follow the torso joint.
      m.loft(0,.17,[[1.00,.135,.06],[1.045,.172,.096],[1.26,.164,.104],[1.35,.141,.086]],0x605b47,bone,12);
      m.box(0,1.105,.265,.22,.102,.045,0x777055,bone);
      m.sleeve([-.178,1.34,.19],[.178,1.34,.19],.060,.060,0x7d7864,bone);
      for(const side of [-1,1]){
        m.sleeve([side*.135,1.44,.09],[side*.142,1.25,.22],.022,.022,0x353934,bone);
        m.box(side*.105,1.19,.269,.022,.28,.015,0x393c34,bone);
        m.box(side*.105,1.17,.279,.034,.032,.014,0x999480,bone);
      }
    }
    if(soldier) {
      // A side pouch leaves the jacket and diagonal sling visible from the player's camera.
      m.loft(.18,.089,[[.84,.07,.052],[.88,.094,.064],[1.01,.095,.065],[1.045,.075,.054]],0x855237,bone,10);
      m.box(.18,.986,.151,.131,.073,.025,0xad724b,bone);
      m.box(.18,.965,.17,.032,.045,.013,0xc5ab77,bone);
      m.loft(0,-.02,[[1.423,.144,.101],[1.484,.128,.098],[1.505,.111,.094]],0x25495a,bone,14);
    } else {
      m.triangle([-.19,1.43,-.107],[-.035,1.22,-.183],[-.057,1.445,-.157],skin,bone);
      m.triangle([.025,1.46,-.17],[.04,1.28,-.196],[.15,1.42,-.158],runner?0xe3daca:0x4c453b,bone);
      m.triangle([-.20,.81,-.08],[-.14,.718,-.09],[-.10,.825,-.13],shirt,bone);
      for(const s of [-1,1]) {
        // Frayed hems and separate lapels expose the undershirt as the chest turns.
        const edge=s*.15;
        m.triangle([edge,1.425,-.145],[s*.062,1.445,-.17],[s*.055,1.25,-.194],runner?0xe3c9b7:0x554e40,bone);
        m.triangle([s*.18,.842,-.093],[s*.205,.765,-.083],[s*.116,.832,-.132],shirt,bone);
      }
      m.box(0,1.555,-.188,.06,.012,.008,0x63574f,bone);
      if(runner) m.loft(-.238,0,[[1.238,.087,.096],[1.288,.097,.103]],0xdcb182,6);
      if(brute) m.box(0,1.32,-.15,.35,.20,.075,metal,bone);
    }
    for(const [i,s] of [-1,1].entries()) {
      const x=s*.118, thigh=2+i*2, shin=thigh+1, arm=6+i*2, fore=arm+1, handX=s*.264;
      m.loft(x,0,[[.459,.08,.083],[.491,.091,.096,-.012],[.541,.084,.092],[.61,.099,.107],[.70,.116,.121],[.83,.12,.13],[.91,.106,.112]],pants,thigh,14,-6);
      m.loft(x,0,[[.155,.062,.064],[.22,.072,.081,.01],[.264,.064,.073,.017],[.323,.084,.10,.025],[.385,.083,.097,.026],[.478,.08,.087]],pants,shin,14,-6);
      m.loft(x,0,[[.033,.085,.143,-.049],[.076,.084,.145,-.05],[.123,.078,.104,-.018],[.173,.067,.077],[.225,.073,.075]],leather,shin);
      m.loft(x,0,[[.013,.087,.146,-.05],[.043,.088,.147,-.051]],0x292a2b,shin);
      if(soldier) {
        const shoulder=[s*.228,1.386,-.03];
        const elbow=s>0?[.335,1.16,.025]:[-.25,1.19,-.22];
        const hand=s>0?[.227,1.24,-.22]:[.178,1.255,-.485];
        m.loft(s*.222,-.037,[[1.302,.071,.074],[1.36,.108,.112],[1.415,.100,.106],[1.455,.061,.067]],ranger?0x814358:0xd79b43,bone,12);
        m.sleeve(shoulder,elbow,.105,.079,ranger?0x8c385c:0xe5a030,bone);
        m.sleeve(elbow,hand,.076,.048,skin,bone);
        m.loft(hand[0],hand[2],[[hand[1]-.048,.033,.041],[hand[1]-.022,.052,.058],[hand[1]+.020,.054,.057],[hand[1]+.045,.040,.045]],leather,bone,9);
      } else {
        m.loft(s*.232,0,[[1.13,.067,.071],[1.24,.085,.093],[1.39,.103,.102],[1.448,.088,.082],[1.463,.05,.055]],shirt,arm);
        m.loft(handX,0,[[1.048,.058,.061],[1.13,.067,.072],[1.18,.063,.07]],soldier?bright:skin,arm);
        m.loft(handX,0,[[.86,.048,.046],[.96,.059,.061],[1.046,.065,.066],[1.11,.055,.059]],soldier?0xc39166:skin,fore);
        m.loft(handX,0,[[.77,.044,.035,-.018],[.805,.052,.042,-.020],[.853,.048,.038],[.885,.037,.039]],skin,fore,10);
        for(let finger=0;finger<4;finger++){
          const tipX=handX+(finger-1.5)*.021;
          const tipY=.706+Math.abs(finger-1)*.011;
          m.sleeve([tipX,.790,-.017],[tipX+s*.012,tipY,-.033],.014,.009,skin,fore);
        }
        m.sleeve([handX-s*.037,.827,-.022],[handX-s*.064,.764,-.049],.020,.011,skin,fore);
      }
      if(soldier) {
        m.loft(x,-.080,[[.426,.037,.019],[.458,.067,.036],[.518,.073,.041],[.55,.044,.025]],0x596567,thigh,10);
        for(const y of [.115,.152])m.box(x,y,-.084,.091,.013,.019,0xa18461,shin);
        m.box(s*.216,.90,.018,.08,.111,.107,0x6f593e,bone);
      }
    }
    if(type==='leaper') {
      // Swept shoulder spines follow each arm through the crouch and leap.
      for(const [i,side] of [-1,1].entries()){
        m.sleeve([side*.22,1.39,.02],[side*.39,1.64,.19],.088,.008,0x8ee7ef,6+i*2);
        m.loft(side*.12,.015,[[.34,.085,.098],[.43,.098,.11]],0x4c9bb3,3+i*2,8);
      }
    } else if(type==='spitter') {
      for(const side of [-1,1]){
        m.loft(side*.165,-.065,[[1.31,.057,.08],[1.43,.124,.12],[1.53,.088,.086]],
          0xa5c84b,1,9);
      }
      m.loft(0,-.15,[[1.48,.07,.07],[1.56,.115,.095],[1.61,.085,.08]],0xbbde65,1,8);
    } else if(type==='howler') {
      m.loft(0,-.13,[[1.25,.077,.10],[1.41,.196,.155],[1.55,.151,.155],[1.58,.115,.12]],0xe69d45,1,10);
      for(const side of [-1,1])
        m.sleeve([side*.10,1.60,-.12],[side*.225,1.75,-.24],.075,.05,0xe6c998,1);
    }
    if(type==='armored' || type==='shield') {
      m.box(0,1.30,-.16,.39,.31,.10,metal,1);
      m.loft(0,-.08,[[1.66,.15,.15],[1.74,.14,.15],[1.81,.085,.09]],0x586c78,1);
      if(type==='armored'){
        m.box(0,1.31,-.218,.35,.085,.034,0xd7aa50,1);
        for(const [i,side] of [-1,1].entries()){
          m.box(side*.28,1.36,-.014,.18,.123,.208,0x84979e,6+i*2);
        }
      }
      if(type==='shield'){
        m.box(-.12,1.02,-.39,.54,.76,.09,0x3c757c,1);
        m.box(-.12,1.25,-.447,.44,.06,.028,0xacdacc,1);
      }
    }
    if(type==='hulk') for(const s of [-1,1])m.box(s*.25,1.41,0,.24,.16,.25,0xa76b48,1);
    if(type==='raider') m.loft(0,-.075,[[1.57,.133,.128],[1.63,.139,.13]],0xa34478,1);
    return m;
  }
  function gun(kind) {
    const m=new Mesh(), joint=1, steel=0x33434a;
    const accent=parseInt(shotColor(kind).slice(1),16);
    const length=weaponEffects[kind].muzzle;
    m.box(.233,1.285,-.25,.104,.13,.40,steel,joint);
    m.box(.233,1.22,-.19,.071,.13,.10,0x604637,joint);
    const wide=kind==='scatter';
    const offsets=kind==='spread'?[-weaponEffects.spread.barrelOffset,weaponEffects.spread.barrelOffset]:[0];
    for(const offset of offsets){
      const x=.233+offset, radius=wide?.09:.043;
      m.box(x,1.29,-(length+.36)/2,radius*2,radius*2,length-.36,steel,joint);
      m.box(x,1.30,-length+.09,radius*2.4,radius*2.3,.18,accent,joint);
    }
    m.box(.233,1.30,-.445,kind==='spread'?.31:wide?.24:.14,.14,.27,kind==='standard'?0x71604b:accent,joint);
    if(kind==='rapid') m.loft(.31,-.30,[[1.13,.11,.12],[1.26,.12,.12]],0xa06c39,joint);
    if(kind==='longshot') {
      m.box(.233,1.40,-.37,.063,.12,.11,steel,joint);
      m.box(.233,1.46,-.42,.106,.10,.31,0x314a45,joint);
    }
    return m;
  }
  function bossTool(kind) {
    const m=new Mesh(), joint=9, steel=0xb1babc;
    m.sleeve([.24,.79,.18],[.47,.79,-.60],.04,.047,0x644f3d,joint);
    if(kind==='axe' || kind==='blade'){
      const reach=kind==='blade'?.99:.77;
      m.quad([.43,.82,-.50],[.68,.85,-.43],[reach,.85,-.75],[.46,.82,-.65],steel,joint);
      m.quad([.68,.85,-.43],[reach,.85,-.75],[reach+.025,.82,-.77],[.69,.82,-.40],0xe4e5d3,joint);
    } else if(kind==='hook') {
      m.sleeve([.47,.79,-.59],[.64,.80,-.78],.055,.054,steel,joint);
      m.sleeve([.64,.80,-.78],[.76,.79,-.54],.054,.014,steel,joint);
    } else if(kind==='mace') {
      m.loft(.47,-.61,[[.64,.07,.07],[.75,.17,.15],[.85,.15,.14],[.95,.04,.04]],steel,joint,7);
    } else if(kind==='hammer') {
      m.box(.48,.79,-.62,.47,.23,.24,steel,joint);
      m.box(.49,.79,-.62,.15,.255,.26,0x625346,joint);
    } else if(kind==='ram') {
      m.sleeve([.30,.79,-.08],[.51,.79,-.77],.14,.135,steel,joint);
      m.sleeve([.51,.79,-.77],[.56,.79,-.93],.14,.035,0x69533e,joint);
    }
    return m;
  }
  // Reduced geometry for distant ranks, retaining their skinned walk cycles and two silhouettes.
  function distant(runner,siege=false) {
    const m=new Mesh(), shirt=siege?0xad4443:runner?0x994b4c:0x796d57,skin=0xb8ac98;
    m.loft(0,0,[[.80,.19,.12],[1.34,.26,.17],[1.45,.18,.12]],shirt,1,6);
    m.loft(0,-.08,[[1.47,.09,.09],[1.64,.13,.13],[1.76,.106,.095]],skin,1,6);
    for(const [i,s] of [-1,1].entries()) {
      const x=s*.12;
      m.loft(x,0,[[.46,.078,.085],[.88,.12,.12]],0x465052,2+i*2,5);
      m.loft(x,0,[[.056,.073,.12,-.03],[.48,.080,.085]],0x40484a,3+i*2,5);
      m.loft(s*.25,0,[[1.07,.066,.069],[1.43,.099,.09]],shirt,6+i*2,5);
      m.loft(s*.265,0,[[.77,.05,.055],[1.09,.067,.07]],skin,7+i*2,5);
    }
    return m;
  }
  return {Mesh, character, distant, gun, bossTool};
})();
