(() => {
  'use strict';
  const canvas = document.getElementById('workbench-canvas');
  let ctx = canvas.getContext('2d');
  if (!ctx) return;
  const story = document.querySelector('.workbench-story');
  const controls = [...document.querySelectorAll('[data-stage]')];
  const titles = ['让设备，适合你的工作。', '把网络，组织成方案。', '让方案，落实到现场。'];
  const descriptions = ['设备选型、系统配置与维护。先了解用途，再安排技术。', '按场景规划拓扑、接入与上联，让设备协同工作。', '设备上架、综合布线、运行验证与交接。'];
  const scopes = ['设备选型 / 系统配置 / 维护排障','架构设计 / 网络部署 / 安全审计','设备上架 / 综合布线 / 验证交付'];
  let selected = 0, previous = 0, progress = 1, start = 0, frame = 0;
  let width = 0, height = 0, scale = 1, visible = true, pointer = 0, targetPointer = 0;
  let manualScroll = null;
  let inViewport = false, lastPaint = 0, elapsed = 0;
  let viewProgress = 0, camera = 0, cameraTarget = 0, renderClock = 0;
  let collection = null, screenAnimation = null;
  const caches = new Map();
  const progressBar = document.querySelector('.story-progress i');
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t*t*t*(t*(t*6-15)+10); };
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const paused = () => document.documentElement.classList.contains('motion-off') || media.matches;
  // A compact orthographic drawing system. All device geometry is local and original.
  function project(x, y, z = 0) { return [x * .96 + z * .48, x * .105 - y - z * .25]; }
  function polygon(points, fill, stroke = '#c5cde225', line = .7) {
    ctx.beginPath(); points.forEach((p, i) => { const v = project(...p); i ? ctx.lineTo(...v) : ctx.moveTo(...v); });
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
  }
  function gradient(x1, y1, x2, y2, colors) {
    const g = ctx.createLinearGradient(x1,y1,x2,y2); colors.forEach((c,i) => g.addColorStop(i/(colors.length-1),c)); return g;
  }
  function line(points, color, weight = 1) {
    ctx.beginPath();points.forEach((p,i)=>{const v=project(...p);i?ctx.lineTo(...v):ctx.moveTo(...v);});ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
  }
  function rect(x,y,z,w,h,fill,stroke=null) { polygon([[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z]],fill,stroke); }
  function box(x,y,z,w,h,d,kind='dark') {
    const silver=kind==='silver', mid=kind==='mid';
    const p=project(x,y+h,z),q=project(x+w,y,z+d);
    polygon([[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d],[x,y+h,z+d]],gradient(p[0],p[1],q[0],q[1],silver?['#d2d5dc','#939ba9','#646d80']:['#535c70','#343e50','#202939']));
    polygon([[x+w,y,z],[x+w,y,z+d],[x+w,y+h,z+d],[x+w,y+h,z]],gradient(p[0],0,q[0],0,silver?['#9ca4b5','#545e70']:['#30394b','#141b2b']));
    rect(x,y,z,w,h,gradient(p[0],p[1],q[0],q[1],silver?['#b4bdca','#d0d5dd','#8992a4']:mid?['#727c90','#414b60','#5c6577']:['#3b4457','#222b3d','#394154']),'#cdd7ec40');
    line([[x,y+h,z],[x+w,y+h,z],[x+w,y+h,z+d]],silver?'#e5e8f2aa':'#b7c8e95a',.8);
  }
  function screw(x,y,z=0) {
    const v=project(x,y,z);ctx.fillStyle='#111828';ctx.beginPath();ctx.ellipse(v[0],v[1],1.8,2.1,.1,0,Math.PI*2);ctx.fill();line([[x-1,y,z],[x+1,y,z]],'#758197',.6);
  }
  function led(x,y,z,color='#81c9ab') {
    if(collection){collection.lights.push({x,y,z,color});return;}
    const v=project(x,y,z);ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(v[0],v[1],1.7,1.3,0,0,Math.PI*2);ctx.fill();
  }
  function rj45(x,y,z,w=18,h=13,active=false) {
    rect(x,y,z,w,h,'#b0b9c8','#dbe2eb80');
    rect(x+1,y+1,z,w-2,h-2,'#101622');
    // Stepped socket opening, contact comb, link indicators.
    polygon([[x+3,y+2,z],[x+w-3,y+2,z],[x+w-3,y+h-4,z],[x+w-6,y+h-4,z],[x+w-6,y+h-2,z],[x+6,y+h-2,z],[x+6,y+h-4,z],[x+3,y+h-4,z]],'#03060c',null);
    for(let j=0;j<8;j++) line([[x+4+j*1.3,y+2,z],[x+4+j*1.3,y+5,z]],'#bd9e62',.6);
    if(active){led(x+2,y+h-2,z);led(x+w-2,y+h-2,z,'#ccaa67');}
  }
  function label(text,x,y,z,size=6,color='#bcc7d9') {
    const v=project(x,y,z);ctx.save();ctx.translate(v[0],v[1]);ctx.transform(.96,.105,0,1,0,0);ctx.fillStyle=color;ctx.font=`500 ${size}px -apple-system,BlinkMacSystemFont,sans-serif`;ctx.fillText(text,0,0);ctx.restore();
  }
  function rackEar(x,y,z,h=38) {rect(x,y,z,16,h,'#555f72','#a2aec44d');screw(x+8,y+8,z);screw(x+8,y+h-8,z);}
  function switchDevice(x,y,z,w=490,kind='silver',links=[]) {
    box(x,y,z,w,36,165,kind);
    rackEar(x-16,y,z);rackEar(x+w,y,z);
    label('SWITCH',x+13,y+17,z,6,kind==='silver'?'#4d5a70':'#818da5');
    led(x+77,y+23,z);led(x+84,y+23,z,'#7b8598');
    for(let i=0;i<12;i++)for(let r=0;r<2;r++)rj45(x+104+i*23,y+3+r*15,z,19,12,r===1&&links.includes(i));
    for(let i=0;i<4;i++) {rect(x+392+i*20,y+10,z,16,14,'#182335','#8994a6');rect(x+394+i*20,y+12,z,12,9,'#050910');line([[x+394+i*20,y+10,z],[x+405+i*20,y+10,z]],'#c0b38b',1.5);}
    label('SFP',x+412,y+29,z,4.5,kind==='silver'?'#3d4b61':'#bbc3d1');
    for(let i=0;i<4;i++)screw(x+7+i*(w-14)/3,y+32,z);
    // Chassis vents on the exposed right side.
    for(let i=0;i<20;i++)line([[x+w,y+10,z+18+i*6],[x+w,y+25,z+18+i*6]],'#0b132488',1.3);
    // Subtle ventilation slots on the lid.
    for(let i=0;i<22;i++)line([[x+130+i*9,y+36,z+110],[x+130+i*9,y+36,z+138]],kind==='silver'?'#4c566d55':'#060b1570',1.4);
  }
  function patchPanel(x,y,z,w=490) {
    box(x,y,z,w,32,44,'dark');rackEar(x-16,y,z,32);rackEar(x+w,y,z,32);
    for(let i=0;i<24;i++){const xx=x+17+i*19; rj45(xx,y+5,z,14,11); label(String(i+1).padStart(2,'0'),xx+3,y+22,z,4,'#b0b9cb');}
  }
  function cable(a,b,color='#bc9b5b',drop=35) {
    if(collection)collection.cables.push({a,b,color,drop});
    const p=project(...a),q=project(...b);ctx.beginPath();ctx.moveTo(...p);ctx.bezierCurveTo(p[0],p[1]+drop,q[0],q[1]+drop,q[0],q[1]);ctx.strokeStyle='#060911';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.stroke();ctx.strokeStyle='#ffffff25';ctx.lineWidth=.7;ctx.stroke();
    for(const t of[a,b])rect(t[0]-3,t[1]-3,t[2],6,8,'#b6bdc880','#e1e8f250');
  }
  function floor() {
    ctx.save();const g=ctx.createRadialGradient(50,12,10,50,12,440);g.addColorStop(0,'#090b18cc');g.addColorStop(.6,'#05060d8c');g.addColorStop(1,'#00000000');ctx.scale(1,.22);ctx.fillStyle=g;ctx.beginPath();ctx.arc(50,50,440,0,Math.PI*2);ctx.fill();ctx.restore();
    // A quiet, open circle echoes the rings in the supplied studio mark.
    ctx.save();ctx.translate(42,23);ctx.scale(1,.25);ctx.rotate(-.14);ctx.beginPath();ctx.arc(0,0,420,.45,Math.PI*1.91);ctx.strokeStyle='#b69b6429';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.arc(0,0,438,.45,Math.PI*1.91);ctx.strokeStyle='#b69b6412';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  }
  function desktop() {
    // Display: slim bezel, panel, neck and machined stand.
    box(-300,115,25,318,196,11,'dark');
    rect(-293,127,24.5,304,177,gradient(-300,-300,20,-130,['#101726','#263350','#151a2f']));
    ctx.save();const poly=[[-293,127,24.5],[11,127,24.5],[11,304,24.5],[-293,304,24.5]];ctx.beginPath();poly.forEach((p,i)=>{const v=project(...p);i?ctx.lineTo(...v):ctx.moveTo(...v);});ctx.closePath();ctx.clip();
    for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(-122,-191,105+i*18,83+i*12,-.62,.05,Math.PI*1.6);ctx.strokeStyle=i===0?'#bca173':'rgba(143,134,196,'+(.25-i*.022)+')';ctx.lineWidth=i===0?2:1.1;ctx.stroke();}ctx.restore();
    box(-165,36,54,42,80,19,'mid');box(-219,26,3,144,8,89,'mid');led(-139,120,24.4,'#8e9aae');
    // Tower with separated front bezel, perforated intake, USB and power.
    box(90,16,8,107,254,161,'dark');rect(96,24,7.8,95,237,gradient(90,-260,200,0,['#424e62','#1c2534','#333e50']),'#8998ad44');
    for(let i=0;i<17;i++)for(let j=0;j<7;j++){const v=project(109+j*11,42+i*10,7.6);ctx.fillStyle='#090f1a';ctx.beginPath();ctx.ellipse(v[0],v[1],1.7,1.5,0,0,7);ctx.fill();}
    led(112,241,7.6,'#ddd7ba');rect(130,238,7.6,13,5,'#050910','#a6b0c555');rect(151,238,7.6,13,5,'#050910','#a6b0c555');
    line([[102,224,7.6],[184,224,7.6]],'#72819945');
    for(let i=0;i<14;i++)line([[197,50,35+i*8],[197,218,35+i*8]],'#101826',1.4);
    box(102,9,24,16,7,20);box(170,9,24,16,7,20);
    // Keyboard: a real staggered key matrix and separate space bar.
    box(-267,10,-102,246,7,79,'mid');
    for(let r=0;r<5;r++)for(let c=0;c<14;c++){if(r===0&&c>2&&c<10)continue;let x=-258+c*16+(r%2)*3,z=-96+r*13;polygon([[x,18,z],[x+12,18,z],[x+12,18,z+10],[x,18,z+10]],'#262e3f','#8491a03d',.4);}
    polygon([[-207,18,-96],[-100,18,-96],[-100,18,-86],[-207,18,-86]],'#3c4557','#8c97a84d');
    box(24,10,-71,35,15,54,'mid');line([[41,25,-60],[41,25,-39]],'#172033',.8);
  }
  function network() {
    patchPanel(-280,235,10);
    switchDevice(-280,125,10,490,'silver',[0,1,2,3,4]);
    switchDevice(-280,20,10,490,'dark');
    for(let i=0;i<5;i++)cable([-280+17+i*38+7,246,9.6],[-280+104+i*23+9,147,9.4],i%2?'#7e8ca9':'#b8a06b',45+i*9);
    cable([121,143,9.4],[141,38,9.3],'#8c7fa8',68);
    label('PATCH PANEL',-268,279,10,7,'#828da4');
  }
  function rack() {
    const x=-241,w=490,z=20;
    // Open 19-inch rack. Rear frame is painted first, then equipment and front rails.
    box(x-35,0,z+185,15,405,12,'dark');box(x+w+20,0,z+185,15,405,12,'dark');
    box(x-35,0,z,560,13,210,'dark');box(x-35,399,z,560,13,210,'dark');
    for(let y=42;y<390;y+=70)line([[x-30,y,z+190],[x+w+25,y,z+190]],'#3a435645',2);
    // Server drive bays below the network hardware.
    box(x,40,z,w,74,182,'dark');rackEar(x-16,40,z,74);rackEar(x+w,40,z,74);
    for(let r=0;r<2;r++)for(let i=0;i<6;i++){let xx=x+28+i*68,yy=49+r*29;rect(xx,yy,z-.2,61,24,'#151e2d','#5f6c8280');rect(xx+4,yy+3,z-.3,42,18,'#2d384b','#69788a44');for(let v=0;v<5;v++)line([[xx+9+v*6,yy+6,z-.4],[xx+9+v*6,yy+17,z-.4]],'#111827',1.3);led(xx+54,yy+8,z-.5);}
    led(x+457,91,z-.3);rect(x+449,53,z-.3,17,7,'#07101f','#637389');
    switchDevice(x,152,z,490,'dark');switchDevice(x,220,z,490,'silver',[0,1,2,3,4,5,6,7]);patchPanel(x,315,z);
    // Horizontal cable manager, with discrete fingers rather than a solid block.
    box(x,280,z-3,w,21,18,'dark');for(let i=0;i<18;i++)rect(x+12+i*26,282,z-3.3,13,17,'#0a101c','#52607777');
    for(let i=0;i<8;i++)cable([x+24+i*38,325,z-.5],[x+113+i*23,242,z-.6],i%3===0?'#c2a56a':'#7b8eae',52+(i%3)*13);
    cable([x+420,238,z-.7],[x+440,170,z-.8],'#a795c1',56);
    box(x-35,0,z-6,14,412,18,'mid');box(x+w+22,0,z-6,14,412,18,'mid');
    for(let yy=20;yy<399;yy+=13){rect(x-31,yy,z-6.2,5,6,'#101827');rect(x+w+27,yy,z-6.2,5,6,'#101827');}
    box(x-24,-9,z+12,23,9,24);box(x+w+1,-9,z+12,23,9,24);
  }
  const scenes=[desktop,network,rack];
  // Cache the chassis and port geometry. Only tiny light and signal layers animate.
  function sceneCache(index) {
    if(caches.has(index))return caches.get(index);
    const buffer=document.createElement('canvas');
    const ratio=Math.min(window.devicePixelRatio||1,1.5);
    buffer.width=1100*ratio;buffer.height=700*ratio;
    const destination=ctx;ctx=buffer.getContext('2d');
    ctx.scale(ratio,ratio);ctx.translate(450,560);
    const data={buffer,lights:[],cables:[]};collection=data;
    scenes[index]();collection=null;ctx=destination;caches.set(index,data);return data;
  }
  function signalPoint(path,t) {
    const p=project(...path.a),q=project(...path.b),u=1-t;
    return [u*u*u*p[0]+3*u*u*t*p[0]+3*u*t*t*q[0]+t*t*t*q[0],
      u*u*u*p[1]+3*u*u*t*(p[1]+path.drop)+3*u*t*t*(q[1]+path.drop)+t*t*t*q[1]];
  }
  function illuminate(data,age,still) {
    data.lights.forEach((light,i)=>{
      const level=1;
      const v=project(light.x,light.y,light.z);
      ctx.save();ctx.globalAlpha*=level;
      const pulse=1;
      ctx.globalAlpha*=pulse;
      const glow=ctx.createRadialGradient(v[0],v[1],.3,v[0],v[1],5);
      glow.addColorStop(0,light.color+'77');glow.addColorStop(1,light.color+'00');
      ctx.fillStyle=glow;ctx.fillRect(v[0]-5,v[1]-5,10,10);led(light.x,light.y,light.z,light.color);ctx.restore();
    });
    if(still||age<1150)return;
    data.cables.forEach((path,i)=>{
      const clock=(age-1150-i*145)/2600;if(clock<0)return;
      const t=clock%1;
      // Signals travel in short groups, leaving a calm interval between each group.
      if(t>.7)return;
      const head=t/.7;
      for(let j=0;j<9;j++){
        const v=head-j*.012;if(v<0)continue;const point=signalPoint(path,v);
        ctx.save();ctx.globalAlpha*=Math.sin(Math.PI*head)*(.75-j*.07);
        ctx.fillStyle=j===0?'#fff1ce':'#d8bd83';ctx.beginPath();ctx.arc(point[0],point[1],j===0?2:1.4,0,Math.PI*2);ctx.fill();ctx.restore();
      }
    });
  }
  function drawScene(index,opacity,offset,age,still) {
    if(opacity<=.001)return;
    const data=sceneCache(index);
    ctx.save();ctx.globalAlpha=opacity;ctx.translate(0,offset);
    if(index===2){ctx.translate(0,35);ctx.scale(.8,.8);}
    ctx.drawImage(data.buffer,-450,-560,1100,700);
    illuminate(data,age,still);
    ctx.restore();
  }
  function render(time) {
    frame=0;if(!visible)return;
    const still=paused();
    if(!still&&time-lastPaint<32){requestRender();return;}lastPaint=time;
    if(progress<1)progress=still?1:Math.min(1,(time-start)/980);
    pointer=still?0:pointer+(targetPointer-pointer)*.12;
    const delta=renderClock?Math.min(time-renderClock,60):0;renderClock=time;
    if(!still)elapsed+=delta;
    const age=elapsed+2600;
    camera=still?0:camera+(cameraTarget-camera)*.16;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
    const dpr=Math.min(window.devicePixelRatio||1,2);ctx.scale(dpr,dpr);
    ctx.translate(width/2-26*scale+pointer*5,height*(window.innerWidth<=700?.72:.77));ctx.scale(scale,scale);
    ctx.translate(0,-camera*14);const zoom=1+camera*.035;ctx.scale(zoom,zoom);
    floor();
    // Separate the exit and entrance. Solid silhouettes never overlap.
    if(progress<.43){const exit=ease(progress/.43);drawScene(previous,1-exit,-12*exit,6000,true);}
    else {const enter=ease((progress-.43)/.57);drawScene(selected,enter,18*(1-enter),age,still);}

    if((!still&&selected!==0)||progress<1||Math.abs(targetPointer-pointer)>.005||(!still&&Math.abs(cameraTarget-camera)>.001))requestRender();
  }
  function requestRender(){if(!frame&&visible)frame=requestAnimationFrame(render);}
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);scale=Math.min(width/(window.innerWidth<=700?800:960),height/505);requestRender();}
  function select(index,manual=false){
    if(manual)manualScroll=window.scrollY;
    if(index===selected)return;
    previous=progress<.43?previous:selected;selected=index;progress=paused()?1:0;start=performance.now();
    if(screenAnimation)screenAnimation.cancel();
    if(!paused())screenAnimation=document.querySelector('.stage-copy').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:760,easing:'cubic-bezier(.22,1,.36,1)'});
    controls.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    document.getElementById('solution-scope').textContent=scopes[index];
    document.getElementById('stage-number').textContent=String(index+1).padStart(2,'0');
    document.getElementById('stage-title').textContent=titles[index];
    document.getElementById('stage-description').textContent=descriptions[index];
    canvas.setAttribute('aria-label',['桌面工作站概念示意：显示器、键盘与通风机箱','网络设备概念示意：RJ45 配线架、交换机、SFP 光口和跳线','开放式机架概念示意：安装导轨、配线架、理线器、交换机与服务器'][index]);requestRender();
  }
  controls.forEach((button,index)=>{button.addEventListener('click',()=>select(index,true));button.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=(index+(e.key==='ArrowRight'?1:2))%3;controls[next].focus();select(next,true);}});});
  canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!paused()){targetPointer=(e.offsetX/width-.5)*2;requestRender();}});
  canvas.addEventListener('pointerleave',()=>{targetPointer=0;requestRender();});
  window.addEventListener('wheel',()=>{manualScroll=null;},{passive:true});
  window.addEventListener('touchmove',()=>{manualScroll=null;},{passive:true});
  window.addEventListener('keydown',event=>{if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp',' '].includes(event.key)&&!event.target.closest('button,a,summary'))manualScroll=null;});
  window.addEventListener('scroll',()=>{
    if((window.innerWidth<=700&&window.innerHeight<700)||paused())return;
    if(manualScroll!==null)return;
    manualScroll=null;const r=story.getBoundingClientRect();const sticky=document.querySelector('.workbench-sticky');const distance=story.offsetHeight-sticky.offsetHeight;const top=window.innerWidth<=700?60:68;if(distance<=0)return;
    if(r.top<=100&&r.bottom>window.innerHeight*.5){const p=clamp((top-r.top)/distance);viewProgress=p;progressBar.style.transform='scaleX('+p+')';cameraTarget=p*2-1;select(Math.min(2,Math.floor(p*3)));requestRender();}
  },{passive:true});
  new ResizeObserver(resize).observe(canvas);
  function syncVisibility(){visible=inViewport&&!document.hidden;renderClock=0;if(visible){requestRender();}else if(frame){cancelAnimationFrame(frame);frame=0;}}
  new IntersectionObserver(entries=>{inViewport=entries[0].isIntersecting;syncVisibility();},{threshold:.08}).observe(canvas);
  new MutationObserver(()=>{targetPointer=0;resize();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',syncVisibility);
  media.addEventListener('change',()=>{targetPointer=0;requestRender();});

  resize();
})();
