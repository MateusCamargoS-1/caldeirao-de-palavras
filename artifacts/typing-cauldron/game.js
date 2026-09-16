const RECIPES=[
{name:'Guacamole',country:'México',time:55,ingredients:[
{text:'ABACATE',cat:'CHUNK',color:'#5a9a3a'},{text:'TOMATE',cat:'CHUNK',color:'#d43a2a'},
{text:'CEBOLA',cat:'CHUNK',color:'#e8c890'},{text:'LIMÃO',cat:'LIQUID',color:'#e8d840'},
{text:'COENTRO',cat:'HERB',color:'#3a8a3a'},{text:'SAL',cat:'CRYSTAL',color:'#f0eeea'}]},
{name:'Limonada',country:'Brasil',time:35,ingredients:[
{text:'LIMÃO',cat:'LIQUID',color:'#e8d840'},{text:'AÇÚCAR',cat:'CRYSTAL',color:'#f5f0e0'},{text:'ÁGUA',cat:'LIQUID',color:'#6ac0e8'}]},
{name:'Molho Pesto',country:'Itália',time:50,ingredients:[
{text:'MANJERICÃO',cat:'HERB',color:'#2a7a2a'},{text:'ALHO',cat:'CHUNK',color:'#e8e0c8'},
{text:'PARMESÃO',cat:'CRYSTAL',color:'#f0e0a0'},{text:'PINOLI',cat:'CHUNK',color:'#d8c080'},
{text:'AZEITE',cat:'LIQUID',color:'#a0b830'},{text:'SAL',cat:'CRYSTAL',color:'#f0eeea'}]},
{name:'Panqueca',country:'França',time:45,ingredients:[
{text:'FARINHA',cat:'POWDER',color:'#e8d8b0'},{text:'LEITE',cat:'LIQUID',color:'#f0eee8'},
{text:'OVO',cat:'CHUNK',color:'#f0d880'},{text:'AÇÚCAR',cat:'CRYSTAL',color:'#f5f0e0'},{text:'MANTEIGA',cat:'VISCOUS',color:'#f0c840'}]},
{name:'Molho de Tomate',country:'Itália',time:50,ingredients:[
{text:'TOMATE',cat:'CHUNK',color:'#d43a2a'},{text:'CEBOLA',cat:'CHUNK',color:'#e8c890'},
{text:'ALHO',cat:'CHUNK',color:'#e8e0c8'},{text:'AZEITE',cat:'LIQUID',color:'#a0b830'},
{text:'SAL',cat:'CRYSTAL',color:'#f0eeea'},{text:'MANJERICÃO',cat:'HERB',color:'#2a7a2a'}]}
];
const PRESETS={
POWDER:{n:48,size:[3,7],up:2.2,spread:3.5,g:.42},
CRYSTAL:{n:40,size:[3.5,8],up:1.8,spread:2.8,g:.48},
HERB:{n:44,size:[4,9],up:2.8,spread:4.0,g:.32},
CHUNK:{n:36,size:[5,11],up:1.5,spread:2.5,g:.52},
LIQUID:{n:52,size:[3.5,8],up:1.4,spread:3.0,g:.50},
VISCOUS:{n:38,size:[4.5,10],up:1.2,spread:2.2,g:.38}
};
class AudioSys{
constructor(){this.ctx=null;this.gain=null;this.on=true}
async init(){if(this.ctx)return;this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.gain=this.ctx.createGain();this.gain.gain.value=.48;this.gain.connect(this.ctx.destination)}
resume(){if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume()}
tone(freq,type,dur,vol,slide){if(!this.on||!this.ctx)return;this.resume();const t=this.ctx.currentTime;const o=this.ctx.createOscillator();const g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur*.75);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+dur+.02)}
tick(p){p=p||1;this.tone(700*p+Math.random()*28,'sine',.05,.085)}
tok(){this.tone(360,'triangle',.11,.16,150)}
miss(){this.tone(150,'square',.06,.055)}
impact(v){v=v||.5;this.tone(85+Math.random()*25,'sine',.09,.045*v)}
bubble(){this.tone(120+Math.random()*50,'sine',.12,.028,50)}
fwoosh(){if(!this.on||!this.ctx)return;this.resume();const t=this.ctx.currentTime;const len=this.ctx.sampleRate*.26;const buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const src=this.ctx.createBufferSource();src.buffer=buf;const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(1300,t);f.frequency.exponentialRampToValueAtTime(260,t+.22);f.Q.value=.7;const g=this.ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.2,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+.26);src.connect(f);f.connect(g);g.connect(this.gain);src.start(t);src.stop(t+.28)}
}
class Particles{
constructor(){this.list=[];this.settled=0;this.max=1800}
emit(cx,cy,cat,color,scale){scale=scale||1;const p=PRESETS[cat]||PRESETS.CHUNK;const n=Math.floor(p.n*scale);for(let i=0;i<n;i++){if(this.list.length>=this.max){const idx=this.list.findIndex(function(q){return q.settled});if(idx>=0){this.list.splice(idx,1);this.settled=Math.max(0,this.settled-1)}else break}this.list.push({x:cx+(Math.random()-.5)*90,y:cy+(Math.random()-.5)*28,vx:(Math.random()-.5)*p.spread*2.2,vy:-(Math.random()*p.up+.8),size:p.size[0]+Math.random()*(p.size[1]-p.size[0]),color:color,life:1.5+Math.random()*.7,maxLife:1.5+Math.random()*.7,g:p.g,settled:false})}
}
update(dt,surfaceY,potL,potR){for(let i=this.list.length-1;i>=0;i--){const p=this.list[i];if(p.settled){p.y=surfaceY-2-(i%5)*1.2+Math.sin(performance.now()*.002+i)*1.5;continue}p.life-=dt;if(p.life<=0){this.list.splice(i,1);continue}p.vy+=p.g*60*dt;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;if(p.x<potL+8){p.x=potL+8;p.vx*=-.3}if(p.x>potR-8){p.x=potR-8;p.vx*=-.3}if(p.y>surfaceY-4&&p.x>potL&&p.x<potR){p.y=surfaceY-3-Math.random()*4;p.vy=-Math.abs(p.vy)*.15;p.vx*=.4;if(p.life<p.maxLife*.65){p.settled=true;p.vx=0;p.vy=0;this.settled++}}if(p.y>surfaceY+120)this.list.splice(i,1)}}
draw(ctx){for(let i=0;i<this.list.length;i++){const p=this.list[i];const alpha=p.settled?.9:Math.min(1,p.life/.35);ctx.globalAlpha=alpha;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*.5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
fill(){return Math.min(1,this.settled/220)}
clear(){this.list=[];this.settled=0}
}
function drawCauldron(ctx,W,H,fill,t){
const cx=W*.5,baseY=H*.78,potW=Math.min(280,W*.38),potH=Math.min(160,H*.22),topY=baseY-potH,left=cx-potW*.5,right=cx+potW*.5;
ctx.fillStyle='rgba(60,45,30,.12)';ctx.beginPath();ctx.ellipse(cx,baseY+18,potW*.55,14,0,0,Math.PI*2);ctx.fill();
const glow=.25+fill*.35+Math.sin(t*6)*.05;
const grd=ctx.createRadialGradient(cx,baseY+8,10,cx,baseY+8,90);
grd.addColorStop(0,'rgba(255,140,40,'+(0.35*glow)+')');grd.addColorStop(.5,'rgba(255,100,20,'+(0.12*glow)+')');grd.addColorStop(1,'rgba(255,80,10,0)');
ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,baseY+8,90,0,Math.PI*2);ctx.fill();
for(let i=0;i<12;i++){const fx=cx+Math.sin(t*3+i*1.7)*28+(i-6)*6;const fy=baseY+10-((t*40+i*17)%35);const fs=4+Math.sin(t*5+i)*2;ctx.globalAlpha=.4+Math.sin(t*4+i)*.15;ctx.fillStyle=i%2?'#ff9030':'#ffb050';ctx.beginPath();ctx.arc(fx,fy,fs*.5,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
ctx.strokeStyle='#2a2420';ctx.lineWidth=6;ctx.lineCap='round';
[[-.35],[0],[.35]].forEach(function(ox){ctx.beginPath();ctx.moveTo(cx+potW*ox[0],baseY-8);ctx.lineTo(cx+potW*ox[0]*1.15,baseY+22);ctx.stroke()});
const bodyGrad=ctx.createLinearGradient(left,topY,right,baseY);bodyGrad.addColorStop(0,'#3a3430');bodyGrad.addColorStop(.4,'#2a2420');bodyGrad.addColorStop(1,'#1e1a18');
ctx.fillStyle=bodyGrad;ctx.beginPath();ctx.moveTo(left+8,topY+10);ctx.quadraticCurveTo(left,topY+potH*.5,left+12,baseY-6);ctx.quadraticCurveTo(cx,baseY+8,right-12,baseY-6);ctx.quadraticCurveTo(right,topY+potH*.5,right-8,topY+10);ctx.closePath();ctx.fill();
ctx.strokeStyle='#4a4440';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(left-4,topY+8);ctx.quadraticCurveTo(cx,topY-4,right+4,topY+8);ctx.stroke();
ctx.strokeStyle='#5a544e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left-2,topY+6);ctx.quadraticCurveTo(cx,topY-6,right+2,topY+6);ctx.stroke();
const liquidTop=topY+18+(1-fill)*(potH*.72);
if(fill>.02){const liqGrad=ctx.createLinearGradient(cx,liquidTop,cx,baseY);const r=Math.floor(180+fill*50),g=Math.floor(120+fill*40),b=Math.floor(60+fill*20);liqGrad.addColorStop(0,'rgb('+r+','+g+','+b+')');liqGrad.addColorStop(1,'rgb('+(r-40)+','+(g-30)+','+(b-15)+')');ctx.fillStyle=liqGrad;ctx.beginPath();ctx.moveTo(left+14,liquidTop);ctx.lineTo(right-14,liquidTop);ctx.quadraticCurveTo(right-10,baseY-8,cx,baseY);ctx.quadraticCurveTo(left+10,baseY-8,left+14,liquidTop);ctx.fill();ctx.fillStyle='rgba(255,220,160,'+(0.25+fill*.2)+')';ctx.beginPath();ctx.ellipse(cx,liquidTop+2,potW*.38,5+Math.sin(t*2)*1.5,0,0,Math.PI*2);ctx.fill();for(let i=0;i<Math.floor(fill*6);i++){const bx=cx+Math.sin(t*1.5+i*2.1)*potW*.28;const by=liquidTop+10+((t*25+i*40)%((baseY-10-liquidTop)*.7||1));ctx.globalAlpha=.3;ctx.strokeStyle='rgba(255,230,180,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(bx,by,2+(i%3),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1}
if(fill>.15){for(let i=0;i<5;i++){const sx=cx+Math.sin(t*.8+i*1.5)*40+(i-2)*18;const sy=topY-10-((t*18+i*30)%70);const ss=12+Math.sin(t+i)*4;ctx.globalAlpha=(.06+fill*.1)*(1-((t*18+i*30)%70)/70);ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(sx,sy,ss,ss*.6,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
return{left:left,right:right,surfaceY:liquidTop+4,cx:cx,topY:topY,baseY:baseY,potW:potW};
}
const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
const audio=new AudioSys();
const particles=new Particles();
let W=0,H=0,state='MENU',recipe=null,idx=0,target='',typed='';
let combo=0,maxCombo=0,score=0,correct=0,strokes=0,timeLeft=0,startTime=0,timerId=null;
let potGeom=null,shakeX=0,shakeY=0,gtime=0;
const wordEl=document.getElementById('word'),wordBox=document.getElementById('word-box');
const progressEl=document.getElementById('progress'),timerEl=document.getElementById('timer');
const comboEl=document.getElementById('combo'),counterEl=document.getElementById('counter');
function resize(){canvas.width=innerWidth*devicePixelRatio;canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);W=innerWidth;H=innerHeight}
addEventListener('resize',resize);resize();
function match(a,b){if(a===b)return true;const m={'Á':'A','À':'A','Ã':'A','Â':'A','É':'E','Ê':'E','Í':'I','Ó':'O','Ô':'O','Õ':'O','Ú':'U','Ç':'C'};return(m[a]||a)===(m[b]||b)}
function updateWordUI(){let h='';for(let i=0;i<target.length;i++)h+=i<typed.length?'<span class="typed">'+target[i]+'</span>':'<span class="pending">'+target[i]+'</span>';if(typed.length<target.length)h+='<span class="cursor"></span>';wordEl.innerHTML=h;progressEl.style.width=(target?(typed.length/target.length)*100:0)+'%'}
function updateComboUI(){if(combo>=2){comboEl.textContent='x'+combo;comboEl.classList.add('active');comboEl.classList.toggle('high',combo>=8)}else comboEl.classList.remove('active','high')}
function loadIngredient(){if(idx>=recipe.ingredients.length){finish();return}const ing=recipe.ingredients[idx];target=ing.text;typed='';updateWordUI();counterEl.textContent='Ingrediente '+(idx+1)+' / '+recipe.ingredients.length;progressEl.style.width='0%'}
function onWordComplete(){state='COMPLETE';audio.tok();const ing=recipe.ingredients[idx];const scale=1+Math.min(combo*.04,.45);
wordBox.style.transition='transform .06s cubic-bezier(.22,1.6,.36,1)';wordBox.style.transform='scale(1.1)';shakeY+=4;
setTimeout(function(){wordBox.style.transition='transform .11s ease-in';wordBox.style.transform='scale(.8) translateY(5px)'},70);
setTimeout(function(){audio.fwoosh();wordBox.style.transition='transform .14s ease-out, opacity .14s';wordBox.style.transform='scale(.4) translateY(18px)';wordBox.style.opacity='0';particles.emit(W*.5,H*.28,ing.cat,ing.color,scale);shakeY+=6},180);
setTimeout(function(){wordEl.innerHTML='';progressEl.style.width='0%';wordBox.style.transition='';wordBox.style.transform='';wordBox.style.opacity='1'},340);
setTimeout(function(){audio.impact(.75);shakeY+=3},450);setTimeout(function(){audio.impact(.4)},580);setTimeout(function(){if(Math.random()>.4)audio.bubble()},700);
setTimeout(function(){idx++;state='PLAYING';loadIngredient();wordBox.style.transform='scale(.94)';wordBox.style.opacity='.5';requestAnimationFrame(function(){wordBox.style.transition='transform .18s cubic-bezier(.22,1.4,.36,1), opacity .18s';wordBox.style.transform='scale(1)';wordBox.style.opacity='1'})},850)}
function finish(){clearInterval(timerId);state='RESULT';shakeY+=8;setTimeout(function(){const elapsed=(performance.now()-startTime)/1000;const acc=strokes>0?Math.round((correct/strokes)*100):100;const wpm=elapsed>0?Math.round((correct/5)/(elapsed/60)):0;document.getElementById('res-title').textContent='Receita Concluída';document.getElementById('res-recipe').textContent=recipe.name+' · '+recipe.country;document.getElementById('res-time').textContent=elapsed.toFixed(1)+'s';document.getElementById('res-acc').textContent=acc+'%';document.getElementById('res-wpm').textContent=wpm;document.getElementById('res-combo').textContent='x'+maxCombo;document.getElementById('res-score').textContent=score.toLocaleString();document.getElementById('s-result').classList.add('visible')},1000)}
function startGame(){audio.init().then(function(){audio.resume()});recipe=RECIPES[Math.floor(Math.random()*RECIPES.length)];idx=0;combo=0;maxCombo=0;score=0;correct=0;strokes=0;timeLeft=recipe.time;particles.clear();document.getElementById('r-name').textContent=recipe.name.toUpperCase();document.getElementById('r-origin').textContent=recipe.country;document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('visible')});document.getElementById('s-cd').classList.add('visible');state='COUNTDOWN';const num=document.getElementById('cd-num');let n=3;num.textContent=n;const tick=function(){n--;if(n>0){num.textContent=n;num.style.animation='none';void num.offsetWidth;num.style.animation='';setTimeout(tick,600)}else{num.textContent='GO';setTimeout(function(){document.getElementById('s-cd').classList.remove('visible');state='PLAYING';startTime=performance.now();if(timerId)clearInterval(timerId);timerId=setInterval(function(){timeLeft-=.1;if(timeLeft<=0){timeLeft=0;clearInterval(timerId);state='FAILED';document.getElementById('s-fail').classList.add('visible')}const t=Math.max(0,timeLeft);const m=Math.floor(t/60),s=Math.floor(t%60);timerEl.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');timerEl.classList.toggle('warning',t<18&&t>=8);timerEl.classList.toggle('critical',t<8)},100);loadIngredient()},350)}};setTimeout(tick,600)}
addEventListener('keydown',function(e){if(state!=='PLAYING')return;if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.length!==1)return;e.preventDefault();strokes++;const expected=target[typed.length];if(!expected)return;if(match(e.key.toUpperCase(),expected)){typed+=expected;correct++;combo++;maxCombo=Math.max(maxCombo,combo);score+=10+Math.floor(combo/2);audio.tick(.94+Math.min(combo*.01,.18)+Math.random()*.05);updateWordUI();updateComboUI();wordBox.style.transform='scale(1.035)';setTimeout(function(){wordBox.style.transform='scale(1)'},40);if(typed.length===target.length)onWordComplete()}else{audio.miss();wordBox.classList.remove('shake');void wordBox.offsetWidth;wordBox.classList.add('shake');combo=0;updateComboUI()}});
document.getElementById('btn-start').onclick=startGame;
document.getElementById('btn-again').onclick=startGame;
document.getElementById('btn-retry').onclick=startGame;
let last=performance.now();
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;gtime=now*.001;ctx.fillStyle='#f0e8dc';ctx.fillRect(0,0,W,H);const bg=ctx.createRadialGradient(W*.5,H*.55,40,W*.5,H*.55,W*.7);bg.addColorStop(0,'#f5ede2');bg.addColorStop(1,'#e8dcc8');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);shakeX*=.85;shakeY*=.85;ctx.save();ctx.translate(shakeX+Math.sin(gtime*.4)*.8,shakeY+Math.sin(gtime*.3)*.5);const fill=particles.fill();potGeom=drawCauldron(ctx,W,H,fill,gtime);if(potGeom){particles.update(dt,potGeom.surfaceY,potGeom.left,potGeom.right);particles.draw(ctx)}ctx.restore();requestAnimationFrame(frame)}
requestAnimationFrame(frame);
