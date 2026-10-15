(() => {
  'use strict';
  const hero=document.querySelector('.ring-intro'),sticky=hero.querySelector('.ring-sticky');
  const opening=hero.querySelector('.brand-opening'),logo=hero.querySelector('h1');
  const map=hero.querySelector('.business-map'),rings=hero.querySelector('.brand-rings');
  const nodes=[...hero.querySelectorAll('.business-node')];
  const lines=[...hero.querySelectorAll('.business-line')];
  const joints=[...hero.querySelectorAll('.business-joint')];
  const root=document.documentElement,media=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=v=>Math.min(1,Math.max(0,v));
  const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
  let enabled=false,visible=true,frame=0,current=0,target=0,lastTime=0;
  let panX=0,panY=0,maxZoom=2.6,ringStartScale=1.7;
  function geometry(){
    const m=map.getBoundingClientRect();
    const mobile=innerWidth<=700;
    const cx=map.clientWidth*.5,cy=map.clientHeight*(mobile?.22:.5);
    const radius=rings.offsetWidth*240/560;
    nodes.forEach((node,i)=>{
      // Offset coordinates stay stable while each label fades and slides outward.
      const left=node.offsetLeft,right=left+node.offsetWidth;
      const centerY=node.offsetTop;
      let sx,sy,tx,ty,d;
      if(mobile){
        const side=i<3?-1:1,row=i%3;
        const angle=(i<3?[145,180,215]:[35,0,-35])[row]*Math.PI/180;
        sx=cx+Math.cos(angle)*radius;sy=cy+Math.sin(angle)*radius;
        tx=i<3?left-7:right+7;ty=centerY;
        const rail=i<3?7+row*5:map.clientWidth-7-row*5;
        d=`M${sx},${sy} C${rail},${sy} ${rail},${ty} ${tx},${ty}`;
      }else{
        tx=i<3?right+10:left-15;ty=centerY;
        const angle=Math.atan2(ty-cy,tx-cx);
        sx=cx+Math.cos(angle)*radius;sy=cy+Math.sin(angle)*radius;
        const mx=(sx+tx)/2;
        d=`M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
      }
      lines[i].setAttribute('d',d);joints[i].setAttribute('cx',tx);joints[i].setAttribute('cy',ty);
    });
    if(!enabled)return;
    // The center of the original SVG's gold mark is 14.92%, 52.36%.
    const image=logo.querySelector('img');
    const originalCenterX=opening.offsetLeft-opening.offsetWidth/2+image.offsetWidth*.1492;
    const originalCenterY=opening.offsetTop-opening.offsetHeight/2+image.offsetHeight*.5236;
    panX=(map.offsetLeft+cx)-originalCenterX;
    panY=(map.offsetTop+cy)-originalCenterY;
    const originalDiameter=image.offsetWidth*(57.5/206.26949);
    const ringDiameter=rings.offsetWidth*520/560;
    ringStartScale=mobile?1.45:1.58;
    maxZoom=ringDiameter*ringStartScale/originalDiameter;
  }
  function measure(){
    if(!enabled)return;
    const top=innerWidth<=700?60:68,distance=hero.offsetHeight-sticky.offsetHeight;
    target=distance>0?clamp((top-hero.getBoundingClientRect().top)/distance):0;request();
  }
  function paint(time){
    frame=0;if(!enabled||!visible||document.hidden)return;
    const delta=lastTime?Math.min(64,time-lastTime):16;lastTime=time;
    current+=(target-current)*(1-Math.exp(-delta/65));
    const zoom=smooth(current/.38),handoff=smooth((current-.27)/.12);
    const settle=smooth((current-.38)/.18);
    const set=(k,v)=>hero.style.setProperty(k,String(v));
    set('--ring-progress',current.toFixed(4));
    set('--logo-pan-x',panX*zoom+'px');set('--logo-pan-y',panY*zoom+'px');
    set('--logo-zoom',1+(maxZoom-1)*zoom);set('--logo-opacity',1-handoff);
    set('--logo-caption-opacity',1-smooth(current/.14));
    set('--ring-heading-opacity',1-smooth(current/.16)*.6);
    set('--double-ring-opacity',handoff);set('--double-ring-scale',ringStartScale-(ringStartScale-1)*settle);
    set('--ring-center-opacity',smooth((current-.43)/.14));
    set('--business-caption-opacity',smooth((current-.76)/.14));set('--ring-aura',1+handoff*.5);
    nodes.forEach((node,i)=>{
      const order=[0,2,4,1,3,5][i];
      const progress=smooth((current-(.48+order*.06))/.14);
      node.style.setProperty('--node-opacity',progress);
      node.style.setProperty('--node-shift',((1-progress)*(i<3?14:-14))+'px');
      node.style.setProperty('--node-visibility',progress>.01?'visible':'hidden');
      node.tabIndex=progress>.7?0:-1;node.setAttribute('aria-hidden',String(progress<=.01));
      lines[i].style.setProperty('--line-offset',1-progress);lines[i].style.setProperty('--line-opacity',progress*.6);
      joints[i].style.setProperty('--joint-opacity',progress);
    });
    if(Math.abs(target-current)>.00015)request();
  }
  function request(){if(!frame&&enabled&&visible&&!document.hidden)frame=requestAnimationFrame(paint);}
  function configure(){
    const next=!media.matches&&!root.classList.contains('motion-off')&&innerHeight>=680;
    if(next!==enabled){
      enabled=next;hero.classList.toggle('ring-ready',enabled);lastTime=0;
      if(!enabled){if(frame)cancelAnimationFrame(frame);frame=0;hero.removeAttribute('style');nodes.forEach(n=>{n.removeAttribute('style');n.tabIndex=0;n.removeAttribute('aria-hidden');});lines.forEach(n=>n.removeAttribute('style'));joints.forEach(n=>n.removeAttribute('style'));}
    }
    geometry();if(enabled)measure();
  }
  nodes.forEach(node=>node.addEventListener('click',()=>{const detail=document.querySelector(node.getAttribute('href'));if(detail?.tagName==='DETAILS')detail.open=true;}));
  addEventListener('scroll',measure,{passive:true});addEventListener('resize',configure,{passive:true});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;if(visible)measure();else if(frame){cancelAnimationFrame(frame);frame=0;}}).observe(hero);
  new MutationObserver(configure).observe(root,{attributes:true,attributeFilter:['class']});
  media.addEventListener('change',configure);
  document.addEventListener('visibilitychange',()=>{lastTime=0;if(!document.hidden)measure();else if(frame){cancelAnimationFrame(frame);frame=0;}});
  logo.querySelector('img').addEventListener('load',configure);
  configure();
})();
