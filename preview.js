/* Asset inspection only: no speech tasks, scoring, progression, or gameplay. */
'use strict';
const M=window.ASSET_MANIFEST, images={};
const $=id=>document.getElementById(id);
let running=true,clock=0,last=0,level=0,camera=0,wordIndex=-1;
const canvasIds=['scene','idle','jump','wave'];
const ctxs=Object.fromEntries(canvasIds.map(id=>[id,$(id).getContext('2d')]));
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(reduced){running=false;$('pause').textContent='Включить движения';}
$('pause').onclick=()=>{running=!running;$('pause').textContent=running?'Остановить движения':'Включить движения';};
$('height').oninput=e=>{level=Number(e.target.value);$('heightLabel').textContent=level===0?'Основание':level===10?'Верхушка':'Участок '+level;};
$('word').onchange=e=>{wordIndex=Number(e.target.value);};
function sprite(c,group,name,x,y,mirror=false,breath=0){
 const g=M.squirrel[group],f=g.frames[name],s=f.worldScale,im=images[g.file];
 c.save();c.translate(x,y);c.scale(mirror?-1:1,1+breath);c.drawImage(im,...f.source,-f.anchor[0]*s,-f.anchor[1]*s,f.source[2]*s,f.source[3]*s);c.restore();
}
function idleFrame(t){const p=t%5200;return p>3500&&p<3640?'blink':p<1800?'rest':p<3200?'breathe-in':'breathe-out';}
function waveFrame(t){return ['front','raise','out','in','out','in'][Math.floor(t/360)%6];}
function branchLocal(c,v,s){c.drawImage(images[v.file],...v.source,-v.pivot[0]*s,-v.pivot[1]*s,v.source[2]*s,v.source[3]*s);}
function paintStop(c,stop,t,current,next){
 const v=M.branchVariants[stop.branch],s=stop.branchScale;
 const ry=900-stop.rootHeight+camera;
 if(ry < -350||ry>1250)return;
 const dx=(v.landing[0]-v.pivot[0])*s,dy=(v.landing[1]-v.pivot[1])*s;
 const landingPhase=(t%5200)/1000;
 const sway=current&&landingPhase<.85?.026*Math.exp(-4*landingPhase)*Math.sin(landingPhase*15):0;
 c.save();c.translate(stop.rootX,ry);c.rotate(sway);branchLocal(c,v,s);
 if(next)c.drawImage(images['assets/ui/cone.png'],320,100,680,1060,dx-34,dy-103,68,106);
 if(current){
  if(level===10)sprite(c,'wave',waveFrame(t),dx,dy);
  else sprite(c,'idle',idleFrame(t),dx,dy,stop.id%2===1,Math.sin(t/850)*.007);
  c.drawImage(images['assets/branches/needles-front.png'],dx-53,dy-5,106,53);
 }
 c.restore();
}
function scene(t,dt){
 const c=ctxs.scene,target=M.stops[level].cameraBottom;
 camera+= (target-camera)*(running?1-Math.exp(-dt/360):1);
 c.clearRect(0,0,1600,900);c.drawImage(images['assets/scene/sky.png'],0,0,1600,900);
 c.drawImage(images['assets/scene/forest-far.png'],0,80+camera*.07,1600,900);
 c.save();c.globalAlpha=Math.max(0,1-camera/2600);c.drawImage(images['assets/scene/forest-near.png'],0,camera*.5,1600,1000);c.restore();
 const tree=M.tree;c.drawImage(images[tree.file],tree.x,900-tree.height+camera,tree.width,tree.height);
 for(const stop of M.stops)paintStop(c,stop,t,stop.id===level,stop.id===level+1);
 if(camera<650)c.drawImage(images['assets/scene/forest-floor.png'],0,367+camera,1600,533);
 c.drawImage(images['assets/ui/card-frame.png'],...M.card.screenRect);
 if(wordIndex>=0){const task=M.tasks[wordIndex],rect=M.card.imageRect,s=Math.min(rect[2]/task.source[2],rect[3]/task.source[3]),w=task.source[2]*s,h=task.source[3]*s;c.drawImage(images[task.file],...task.source,rect[0]+(rect[2]-w)/2,rect[1]+(rect[3]-h)/2,w,h);}
}
function demoBranch(c,x,y,scale=1,angle=0){const v=M.branchVariants['upper-left'];c.save();c.translate(x,y);c.rotate(angle);branchLocal(c,v,scale);c.restore();}
function previews(t){
 const a=ctxs.idle;a.clearRect(0,0,520,360);demoBranch(a,490,318,.72);sprite(a,'idle',idleFrame(t),250,280,false,Math.sin(t/850)*.008);
 const w=ctxs.wave;w.clearRect(0,0,520,360);demoBranch(w,490,318,.72);sprite(w,'wave',waveFrame(t),250,280);
 const j=ctxs.jump;j.clearRect(0,0,520,360);const p=(t%4300)/1000;
 demoBranch(j,535,345,.52);let bounce=0;if(p>2.05&&p<2.9){let z=p-2.05;bounce=.04*Math.exp(-4*z)*Math.sin(z*15);}
 demoBranch(j,310,266,.54,bounce);
 if(p<.8)sprite(j,'idle','rest',380,310);
 else if(p<1.05)sprite(j,'jump','crouch',380,310);
 else if(p<2.05){const u=p-1.05;sprite(j,'jump',u<.3?'takeoff':'airborne',380-210*u,310-80*u-80*4*u*(1-u));}
 else {j.save();j.translate(310,266);j.rotate(bounce);sprite(j,p<2.35?'jump':'idle',p<2.35?'land':idleFrame(t),-140,-36);j.restore();}
}
function tick(now){const dt=last?Math.min(now-last,80):0;last=now;if(running)clock+=dt;scene(clock,dt);previews(clock);requestAnimationFrame(tick);}
Promise.all(Object.keys(M.assets).map(path=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{images[path]=im;resolve();};im.onerror=()=>reject(new Error(path));im.src=path;}))).then(()=>{
 $('status').textContent='Все 23 PNG загружены · 10 картинок слов · 12 кадров белочки';
 for(const [i,task]of M.tasks.entries()){const option=document.createElement('option');option.value=i;option.textContent=task.id+'. '+task.word;$('word').append(option);const link=document.createElement('a');link.className='word-card';link.href=task.file;link.download=task.file.split('/').pop();link.setAttribute('aria-label','Скачать: '+task.word);const im=document.createElement('img');im.src=task.file;im.alt=task.word;link.append(im);$('words').append(link);}
 for(const [path,meta]of Object.entries(M.assets)){const box=document.createElement('div');box.className='asset';const im=document.createElement('img');im.src=path;im.alt=path;im.loading='lazy';const a=document.createElement('a');a.href=path;a.download=path.split('/').pop();a.textContent=path;const small=document.createElement('small');small.textContent=meta.width+' × '+meta.height+(meta.alpha?' · прозрачный PNG':' · непрозрачный фон');box.append(im,a,small);$('files').append(box);}
 requestAnimationFrame(tick);
}).catch(e=>{$('status').textContent='Не удалось загрузить '+e.message+'. Сохраните папку assets рядом с index.html.';});
