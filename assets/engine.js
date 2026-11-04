/* =========================================================
   محرك الدروس — بيئة التعلم المعكوس (أنشطة حرة / موجهة)
   صفحات بدون تمرير + أنشطة تفاعلية + تسجيل وتصدير
   ========================================================= */
(function(){
'use strict';
const SITE = window.SITE || { mode:'guided' };
const MODE = SITE.mode;               // 'guided' | 'free'
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const h = (html)=>{ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };
const esc = s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AR = n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const LET = ['أ','ب','ج','د','هـ'];

/* ---------- storage (آمن) ---------- */
/* تخزين احتياطي في window.name + رابط الصفحة: يعمل حتى لو المتصفح يمنع التخزين بين الصفحات */
const WN={ read(){ try{ const o=JSON.parse(window.name||'{}'); return (o&&o.__fl)?o:{__fl:1}; }catch(e){ return {__fl:1}; } },
  write(o){ try{ window.name=JSON.stringify(o); }catch(e){} } };
const store = {
  get(k,d){ let v=null; try{ v=localStorage.getItem(k); }catch(e){}
    if(v!=null){ try{ return JSON.parse(v); }catch(e){} }
    const w=WN.read(); return (k in w)?w[k]:d; },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){}
    if(!/records$/.test(k)){ const w=WN.read(); w[k]=v; WN.write(w); } }
};
const KEY = p=>`fl_${MODE}_${p}`;
(function mergeHash(){ const m=location.hash.match(/p=([\w.]+)/), id=(location.pathname.match(/Lesson(\d+)_/)||[])[1]; if(!m||!id) return;
  const k=KEY('done_L'+id), cur=new Set(store.get(k,[])); m[1].split('.').forEach(x=>x&&cur.add(x)); store.set(k,[...cur]); })();
function addRecord(rec){ const all=store.get(KEY('records'),[]); all.push(rec); store.set(KEY('records'),all); try{ window.FLDB&&FLDB.saveResponse(rec.L,rec.type,rec); }catch(e){} }

/* ---------- toast & confetti ---------- */
let toastEl, toastT;
function toast(msg,ms=2600){
  if(!toastEl){ toastEl=h('<div class="toast"></div>'); document.body.appendChild(toastEl); }
  toastEl.innerHTML=msg; toastEl.classList.add('on'); clearTimeout(toastT);
  toastT=setTimeout(()=>toastEl.classList.remove('on'),ms);
}
window.alert = m=>toast(esc(m));
function confetti(n=70){
  const box=h('<div class="confetti"></div>'); document.body.appendChild(box);
  const cols=['#7C3AED','#EC4899','#FF6B35','#FBBF24','#10B981','#2E8BFF'];
  for(let i=0;i<n;i++){ const c=document.createElement('i');
    c.style.left=Math.random()*100+'vw'; c.style.background=cols[i%cols.length];
    c.style.animationDuration=(1.6+Math.random()*1.6)+'s'; c.style.animationDelay=(Math.random()*.4)+'s';
    c.style.transform=`rotate(${Math.random()*360}deg)`; box.appendChild(c); }
  setTimeout(()=>box.remove(),3800);
}

/* ---------- Arabic text helpers ---------- */
function norm(s){ return String(s||'')
  .replace(/[ً-ٰٟـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/[^ء-يa-zA-Z0-9\s]/g,' ').replace(/\s+/g,' ').trim(); }
const words = s=>norm(s).split(' ').filter(Boolean);
function isCopy(answer, source){
  const a=words(answer), s=words(source); if(a.length<4) return false;
  const sj=' '+s.join(' ')+' ';
  // أطول تتابع متطابق من كلمات النص
  let longest=0;
  for(let i=0;i<a.length;i++){ for(let j=i+1;j<=a.length;j++){
    if(sj.includes(' '+a.slice(i,j).join(' ')+' ')) longest=Math.max(longest,j-i); else break; } }
  const inSrc=a.filter(w=>s.includes(w)).length/a.length;
  return longest>=6 || (longest>=4 && inSrc>=.85);
}

/* ---------- CSV export ---------- */
function downloadCSV(name, rows){
  const csv='﻿'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"').join(',')).join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download=name+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
const stamp=()=>new Date().toLocaleString('ar-EG');
const RESEARCHER_WA=(window.SITE&&window.SITE.whatsapp)||'201032688516';
const mmss=t=>{ t=Math.round(t||0); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')+' دقيقة'; };
const waLink=lines=>'https://wa.me/'+RESEARCHER_WA+'?text='+encodeURIComponent(lines.filter(x=>x!==null&&x!==undefined).join('\n'));
const WA_BTN='<a class="b b-wa wa" target="_blank" rel="noopener" style="text-decoration:none">📤 إرسال النشاط</a>';

/* ---------- Timer (عدّ تنازلي أو ساعة إيقاف) ---------- */
function Timer(el, seconds, opts={}){
  const R=19, C=2*Math.PI*R; const down=seconds>0;
  el.classList.add('timer');
  el.innerHTML=`<svg viewBox="0 0 46 46"><defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#7C3AED"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs>
    <circle class="bg" cx="23" cy="23" r="${R}"/><circle class="fg" cx="23" cy="23" r="${R}" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><span class="t"></span>`;
  const fg=$('.fg',el), t=$('.t',el); let left=seconds, used=0, iv=null, overFired=false;
  const fmt=s=>{ s=Math.abs(s); return AR(Math.floor(s/60))+':'+AR(String(s%60).padStart(2,'0')); };
  function draw(){
    if(down){ t.textContent=left>=0?fmt(left):'+'+fmt(left); fg.style.strokeDashoffset = C*(1-Math.max(left,0)/seconds);
      el.classList.toggle('warn',left<=Math.min(30,seconds*.25)&&left>0); el.classList.toggle('over',left<=0); }
    else { t.textContent=fmt(used); fg.style.strokeDashoffset = C*(1-((used%60)/60)); }
  }
  const api={ start(){ if(iv) return; iv=setInterval(()=>{ used++; left--; draw();
        if(down && left===0 && !overFired){ overFired=true; opts.onEnd&&opts.onEnd(); } },1000); draw(); return api; },
    stop(){ clearInterval(iv); iv=null; return api; }, get used(){return used;}, get over(){return down&&left<0;}, reset(s){ api.stop(); left=s??seconds; used=0; overFired=false; draw(); return api; } };
  draw(); return api;
}

/* ---------- auto-fit: يمنع التمرير نهائيًا ---------- */
function fitText(el, maxPx, minPx=12){
  if(!el) return; let fs=maxPx; el.style.setProperty('--fs',fs+'px');
  let guard=0; while(el.scrollHeight>el.clientHeight+1 && fs>minPx && guard++<60){ fs-=.5; el.style.setProperty('--fs',fs+'px'); }
}
function fitZoom(box){
  if(!box) return; box.style.zoom=1; let z=1, g=0;
  while((box.scrollHeight>box.clientHeight+4) && z>.62 && g++<20){ z-=.04; box.style.zoom=z; }
}
let fitters=[]; const onFit=f=>{ fitters.push(f); };
let rT; window.addEventListener('resize',()=>{ clearTimeout(rT); rT=setTimeout(()=>fitters.forEach(f=>f()),120); });
let fT; const runFit=()=>{ requestAnimationFrame(()=>fitters.forEach(f=>f())); clearTimeout(fT); fT=setTimeout(()=>fitters.forEach(f=>f()),460); };


/* =========================================================
   التنقل بين الدروس والوحدات (مع كلمات المرور الأصلية)
   ========================================================= */
const MODS={1:'القيم الأسرية والاجتماعية',2:'قيمة القراءة والعلم',3:'العمل وبناء المستقبل'};
const PW_M={1:'1000',2:'2000',3:'3000'};
const LES={1:['آداب التعامل مع الوالدين','1111'],2:['أغلى من الذهب','1121'],3:['الصداقة','1131'],4:['ثمرة القراءة','1211'],5:['أفضل النعم','1221'],6:['خير جليس','1231'],7:['بناء المستقبل في عصر الآلة','1311'],8:['حرفتك بين يديك','1321'],9:['مستقبل مصر في الزراعة','1331']};
const ORD=['الأول','الثاني','الثالث'];
const modOf=id=>Math.ceil(id/3);
const ses={ has(k){ try{ if(sessionStorage.getItem('u_'+k)==='1') return true; }catch(e){} return !!WN.read()['u_'+k]; }, set(k){ try{sessionStorage.setItem('u_'+k,'1');}catch(e){} const w=WN.read(); w['u_'+k]=1; WN.write(w); } };
function askPw(title,pw,key,href){
  location.href=href; return; /* كلمات المرور أُلغيت: يكفي تسجيل دخول الطالب */
  if(ses.has(key)){ location.href=href; return; }
  const m=h(`<div class="nmodal"><div class="box"><p style="font-size:30px;margin:0 0 4px">🔒</p><h3 class="serif" style="margin:0 0 4px">${title}</h3>
    <p class="muted" style="font-size:14px;margin:0">أدخل كلمة المرور للمتابعة</p><input type="password" placeholder="كلمة المرور"><p class="err"></p>
    <div class="row"><button class="c">إلغاء</button><button class="primary g">دخول</button></div></div></div>`);
  document.body.appendChild(m); const inp=$('input',m); inp.focus();
  const go=()=>{ if(inp.value.trim()===pw){ ses.set(key); location.href=href; } else { $('.err',m).textContent='كلمة المرور غير صحيحة'; inp.classList.add('shake'); setTimeout(()=>inp.classList.remove('shake'),450); } };
  $('.g',m).onclick=go; $('.c',m).onclick=()=>m.remove(); inp.onkeydown=e=>{ if(e.key==='Enter') go(); if(e.key==='Escape') m.remove(); };
  m.onclick=e=>{ if(e.target===m) m.remove(); };
}
function lessonNavHTML(id){
  return `<div class="lnav"><button class="lp" ${id<=1?'disabled':''}>→ <span class="lbl-x">الدرس </span>السابق</button>
    <a class="home-l" href="../module${modOf(id)}.html">📚 دروس الوحدة</a>
    <button class="ln" ${id>=9?'disabled':''}><span class="lbl-x">الدرس </span>التالي ←</button></div>`;
}
function wireLessonNav(root,id){
  ses.set('L'+id);
  const go=t=>askPw('الدرس '+ORD[(t-1)%3]+' من الموديول '+['','الأول','الثاني','الثالث'][modOf(t)]+': «'+LES[t][0]+'»',LES[t][1],'L'+t,`Lesson${t}_aims.html`);
  const lp=$('.lnav .lp',root), ln=$('.lnav .ln',root);
  if(lp) lp.onclick=()=>go(id-1); if(ln) ln.onclick=()=>go(id+1);
}

const TIPS={exam:'اقرأ النص جيدًا… والنص دائمًا بجانبك 📖',journey:'اركب القطار… واجمع خريطة مصر قطعة قطعة 🧩',project:'اربط الدروس الثلاثة معًا… وأبدع في مشروعك 🏆',aims:'اقرأ الأهداف جيدًا… هي خريطة رحلتك اليوم 🗺️',warmup:'تأمّل الصور وتوقّع العنوان قبل أن تبدأ 🔍',content:'شاهد الفيديو واقرأ النص بتركيز 📖',
  activity:MODE==='guided'?'التزم بدورك واستعن بالتلميح عند الحاجة 🤝':'اختر بحرية… والمهارة ثابتة 🎨',selftest:'برّر إجابتك بدليل من النص ✍️',posttest:'اعتمد على نفسك… أنت قادر! 💪',box:'افتح الصندوق وراقب فهمك 🔍',exit:'اكتب بصدق… رأيك يهمنا 🎟️',harvest:'سطرين بس… ايه اللي فضل معاك؟ 🍎'};
function progHTML(n){ return `<div class="prog-card"><div class="ring"><svg viewBox="0 0 64 64"><defs><linearGradient id="pg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#10B981"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs><circle class="bg" cx="32" cy="32" r="27"/><circle class="fg" cx="32" cy="32" r="27"/></svg><b class="pct">٠٪</b></div>
  <div class="pc-t"><span class="pc-h">إنجازك</span><span class="stars-row">${Array.from({length:n},()=>'<i>★</i>').join('')}</span><span class="pc-s"></span></div></div>`; }
function paintProg(root,n,total){ const pct=Math.round(n/total*100), C=2*Math.PI*27;
  $$('.prog-card .fg',root).forEach(c=>{ c.style.strokeDasharray=C; c.style.strokeDashoffset=C*(1-n/total); });
  $$('.prog-card .pct',root).forEach(e=>e.textContent=AR(pct)+'٪');
  $$('.prog-card .stars-row i',root).forEach((s,i)=>s.classList.toggle('on',i<n));
  $$('.prog-card .pc-s',root).forEach(e=>e.textContent= n>=total?'🏆 أتممت الدرس!':'أنجزت '+AR(n)+' من '+AR(total)+' خطوات');
  $$('.prog-card',root).forEach(e=>e.classList.toggle('full',n>=total));
  $$('.prog-slim i',root).forEach(e=>e.style.width=pct+'%'); $$('.prog-slim span',root).forEach(e=>e.textContent='إنجازك '+AR(pct)+'٪'); }
function footHTML(steps,cur,id){
  const i=steps.findIndex(s=>s.k===cur), pv=steps[i-1], nx=steps[i+1];
  return `<div class="lesson-foot">
    ${pv?`<a class="prev" href="Lesson${id}_${pv.k}.html">→ <span class="ft">${pv.t}</span><span class="fs">السابق</span></a>`:'<a class="prev off">-</a>'}
    <span class="where"><span class="owl">${OWL_SVG}</span><b>الخطوة ${AR(i+1)} من ${AR(steps.length)}</b><span class="tip">${TIPS[cur]||''}</span></span>
    ${nx?`<a class="nextb" href="Lesson${id}_${nx.k}.html"><span class="ft">${nx.t}</span><span class="fs">التالي</span> ←</a>`:(id<9?`<a class="nextb nl" href="#">الدرس التالي ←</a>`:'<a class="nextb off">-</a>')}
  </div>`;
}

/* =========================================================
   قفل الخطوات بالتسلسل + الشخصية المرشدة (البومة)
   ========================================================= */
const OWL_SVG=`<svg class="owl-svg" viewBox="0 0 140 150" aria-hidden="true">
  <defs><linearGradient id="ob" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#6D28D9"/></linearGradient></defs>
  <path d="M30 40 L22 12 L50 30 Z" fill="#6D28D9"/><path d="M110 40 L118 12 L90 30 Z" fill="#6D28D9"/>
  <ellipse cx="70" cy="85" rx="50" ry="58" fill="url(#ob)"/>
  <ellipse cx="70" cy="102" rx="30" ry="34" fill="#EDE4FF"/>
  <path d="M52 95 q6 5 12 0 M64 108 q6 5 12 0 M76 95 q6 5 12 0" stroke="#C4B5FD" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="48" cy="60" r="21" fill="#fff"/><circle cx="92" cy="60" r="21" fill="#fff"/>
  <g class="owl-eyes"><circle cx="50" cy="62" r="10" fill="#1E1B4B"/><circle cx="90" cy="62" r="10" fill="#1E1B4B"/><circle cx="53" cy="58" r="3.5" fill="#fff"/><circle cx="93" cy="58" r="3.5" fill="#fff"/></g>
  <path d="M63 74 L77 74 L70 86 Z" fill="#FB923C"/>
  <path class="owl-wing" d="M22 90 q-16 18 4 40 q6-22 10-36 Z" fill="#5B21B6"/>
  <path d="M118 90 q16 18 -4 40 q-6-22 -10-36 Z" fill="#5B21B6"/>
  <rect x="42" y="18" width="56" height="9" rx="3" fill="#1E1B4B"/><path d="M38 20 L70 6 L102 20 L70 32 Z" fill="#312E81"/><path d="M98 20 v18" stroke="#FBBF24" stroke-width="3"/><circle cx="98" cy="40" r="4" fill="#FBBF24"/>
  <path d="M55 140 v8 M62 141 v7 M78 141 v7 M85 140 v8" stroke="#FB923C" stroke-width="4" stroke-linecap="round"/>
</svg>`;

function owlSay({title,msg,audio,go,goLabel,block}){
  $$('.owl-pop').forEach(e=>e.remove());
  const m=h(`<div class="owl-pop ${block?'block':''}"><div class="owl-wrap">
    <div class="owl-char">${OWL_SVG}</div>
    <div class="owl-bubble"><b class="owl-t">${title}</b><p>${msg}</p>
      <div class="row"><span class="sp"></span>
      ${block?'':'<button class="b b-ghost b-sm owl-ok">حسنًا</button>'}<a class="b b-main b-sm" style="text-decoration:none" href="${go}">${goLabel} ←</a></div></div>
  </div></div>`);
  document.body.appendChild(m);
  const close=()=>{ m.classList.add('bye'); setTimeout(()=>m.remove(),300); };
  if(!block){ $('.owl-ok',m).onclick=close; m.onclick=e=>{ if(e.target===m) close(); }; }
}
function guardSteps({id,steps,isDone,cur,keyOf}){
  const first=()=>{ const i=steps.findIndex(x=>!isDone(x.k)); return i<0?steps.length:i; };
  const say=(f,block)=>owlSay({title:'توقّف يا بطل! ✋',msg:`لا بد من إنهاء <b>«${steps[f].t}»</b> أولًا، حتى تستطيع الانتقال إلى هذا الجزء.`,
    go:`Lesson${id}_${steps[f].k}.html`,goLabel:'اذهب إلى '+steps[f].t,block});
  document.addEventListener('click',e=>{ const a=e.target.closest('a[href]'); if(!a) return;
    const m=(a.getAttribute('href')||'').match(/^Lesson(\d+)_(\w+)\.html/); if(!m||+m[1]!==id) return;
    const idx=steps.findIndex(x=>x.k===m[2]), f=first(); if(idx>f){ e.preventDefault(); e.stopPropagation(); say(f,false); return; }
    const dn=steps.filter(x=>isDone(x.k)).map(x=>x.k).join('.'); if(dn) a.setAttribute('href',m[0]+'#p='+dn); },true);
  const paint=()=>{ const f=first(); $$('.lesson-tabs a').forEach(a=>{ const m=(a.getAttribute('href')||'').match(/_(\w+)\.html$/); if(!m) return;
      a.classList.toggle('locked',steps.findIndex(x=>x.k===m[1])>f); });
    $$('.lesson-foot a.nextb').forEach(a=>{ const m=(a.getAttribute('href')||'').match(/_(\w+)\.html$/); a.classList.toggle('locked',!!m && steps.findIndex(x=>x.k===m[1])>f); }); };
  const ci=steps.findIndex(x=>x.k===cur), f=first(); if(ci>f){ say(f,true); return {blocked:true,paint}; }
  return {blocked:false,paint};
}

/* =========================================================
   LESSON APP
   ========================================================= */
const app = $('main[data-lesson]');
const STEPDEF={ exam:{i:'📝',t:'الاختبار النهائي'}, journey:{i:'🚂',t:'رحلة القطار'}, project:{i:'🏆',t:'مشروع الوحدة'}, aims:{i:'🎯',t:'أهداف الدرس'}, warmup:{i:'💡',t:'التهيئة'}, content:{i:'🎬',t:'الفيديو والنص'}, box:{i:'🔍',t:'مراقبة الفهم'},
  activity:{i:MODE==='guided'?'🧭':'🎨',t:MODE==='guided'?'الأنشطة الموجّهة':'الأنشطة الحرة'}, selftest:{i:'📝',t:'التقويم الختامي'},
  posttest:{i:'🏁',t:'الاختبار البعدي'}, exit:{i:'🎟️',t:'تذكرة الخروج'}, harvest:{i:'🍎',t:'ثمرة قراءتي'} };
const R={}; // renderers registered by other modules
window.FL={ h,$,$$,esc,AR,LET,toast,confetti,setFb,store,KEY,MODE,Timer,runFit,onFit,fitText,fitZoom,words,norm,isCopy,addRecord,downloadCSV,stamp,shuffle,owlSay,R,STEPDEF,waLink:(...a)=>waLink(...a) };
async function boot(){
  const inLesson=/\/lessons\//.test(location.pathname);
  if(window.FLAUTH && !document.body.classList.contains('admin-page')){ await FLAUTH.requireStudent(); }
  if(app && window.LESSON){
    const L=window.LESSON;
    if(window.FLDB && FLDB.user()){ try{ const remote=await FLDB.getProgress(L.id); if(remote&&remote.length){ const k=KEY('done_L'+L.id); const cur=new Set(store.get(k,[])); remote.forEach(x=>cur.add(x)); store.set(k,[...cur]); } }catch(e){} }
    if(L.id>=2&&L.id<=9&&!(FLDB&&FLDB.user()&&FLDB.user().role==='admin')&&!(await lessonDone(L.id-1))) return lockedLesson(app,L);
    buildLesson(app, L);
  } else { legacyPager(); legacyNav(); seqLocks(); }
}
/* ---------- فتح الدروس بالتتابع: الدرس يُفتح بعد إنهاء السابق حتى «ثمرة قراءتي» ---------- */
async function lessonDone(id){ if((store.get(KEY('done_L'+id),[])||[]).includes('harvest')) return true;
  try{ const r=window.FLDB&&FLDB.user()?await FLDB.getProgress(id):null; if(r&&r.includes&&r.includes('harvest')){ const k=KEY('done_L'+id); store.set(k,[...new Set(store.get(k,[]).concat(r))]); return true; } }catch(e){} return false; }
function lockedLesson(main,L){ const p=L.id-1, t=(LES[p]||[''])[0];
  main.classList.add('lesson-main');
  main.innerHTML=`<div class="seq-lock"><span class="medal">🔒</span><h2>درس «${L.title}» مقفل</h2>
    <p>الدروس بتتفتح واحد ورا التاني 🚂 خلّص درس «<b>${t}</b>» لحد آخر خطوة <b>«🍎 ثمرة قراءتي»</b>، وبعدها الدرس ده هيتفتح لك على طول.</p>
    <div class="row" style="justify-content:center;flex-wrap:wrap"><a class="b b-main" style="text-decoration:none" href="Lesson${p}_aims.html">📖 روح لدرس «${t}» ←</a><a class="b b-ghost" style="text-decoration:none" href="../module${modOf(L.id)}.html">📚 دروس الوحدة</a></div></div>`;
  runFit(); }
async function seqLocks(){ const cards=$$('a[href*="lessons/Lesson"][href$="_aims.html"]'), mods=$$('a[href^="module"][href$=".html"].mod-card');
  if(!cards.length&&!mods.length) return; if(window.FLDB&&FLDB.user()&&FLDB.user().role==='admin') return;
  const done={}; for(let i=1;i<=9;i++) done[i]=await lessonDone(i);
  const open=id=>id===1||done[id-1];
  cards.forEach(a=>{ const id=+(a.getAttribute('href').match(/Lesson(\d+)_/)||[])[1]; if(!id||id>9) return;
    const ic=a.querySelector('.lock-icon'); a.classList.toggle('seq-off',!open(id)); a.classList.toggle('seq-done',!!done[id]);
    if(ic) ic.textContent=done[id]?'✅':open(id)?'📖':'🔒';
    if(!open(id)) a.addEventListener('click',e=>{ e.preventDefault(); toast('🔒 خلّص درس «'+LES[id-1][0]+'» الأول وبعدها الدرس ده هيتفتح لك',3500); }); });
  mods.forEach(a=>{ const m=+(a.getAttribute('href').match(/module(\d)/)||[])[1]; const first=(m-1)*3+1; if(!m||open(first)) return;
    a.classList.add('seq-off'); const b=a.querySelector('.mod-badge'); if(b) b.textContent='🔒';
    a.addEventListener('click',e=>{ e.preventDefault(); toast('🔒 الوحدة دي بتتفتح بعد ما تخلّص دروس الوحدة اللي قبلها',3500); }); }); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else setTimeout(boot,0);

function buildLesson(main, L){
  const page = main.dataset.page;
  const TABS=(L.steps||['aims','warmup','content','activity','selftest','posttest']).map(k=>Object.assign({k},STEPDEF[k]));
  const doneKey=KEY('done_L'+L.id); const done=new Set(store.get(doneKey,[]));
  let syncT; const markDone=k=>{ const had=done.has(k); done.add(k); store.set(doneKey,[...done]); paintTabs();
    if(!had && window.FLDB){ clearTimeout(syncT); syncT=setTimeout(()=>FLDB.setProgress(L.id,[...done]),300); } };
  main.classList.add('lesson-main');
  main.innerHTML=`
    <div class="lesson-header">
      <div><p class="muted" style="font-size:13px">${L.module} — ${L.order}</p><h2 class="serif">${L.title}</h2></div>
      <span class="lh-chip">${L.kind}</span>
      ${L.project?`<div class="lnav"><a class="home-l" href="../${L.project==='content'?'content':'module'+L.project}.html">${L.project==='content'?'📚 كل الوحدات':'📚 دروس الوحدة'}</a></div>`:lessonNavHTML(L.id)}
      <div class="prog-slim"><span></span><em><i></i></em></div>
    </div>
    <div class="lesson-layout">
      <div class="lesson-tabs">${progHTML(TABS.length)}${TABS.map((t,i)=>`<a href="Lesson${L.id}_${t.k}.html" data-k="${t.k}" class="${t.k===page?'active':''}" title="${t.t}"><span class="step-n">${AR(i+1)}</span><span class="icon-orb">${t.i}</span><span class="lbl-t">${t.t}</span></a>`).join('')}</div>
      <div class="lesson-body"></div>
    </div>${footHTML(TABS,page,L.id)}`;
  if(!L.project) wireLessonNav(main,L.id);
  if(/[?&]reset/.test(location.search)){ done.clear(); store.set(doneKey,[]); store.set(KEY('video_L'+L.id),{}); }
  const G=guardSteps({id:L.id,steps:TABS,isDone:k=>done.has(k),cur:page,keyOf:k=>k==='activity'?'activity_'+MODE:k});
  const nl=$('.lesson-foot .nl',main); if(nl) nl.onclick=e=>{ e.preventDefault(); $('.lnav .ln',main).click(); };
  let celebrated=done.size>=TABS.length;
  function paintTabs(){ $$('.lesson-tabs a',main).forEach(a=>a.classList.toggle('done',done.has(a.dataset.k)));
    const n=TABS.filter(t=>done.has(t.k)).length; paintProg(main,n,TABS.length); if(typeof G!=='undefined') G.paint();
    if(n>=TABS.length && !celebrated){ celebrated=true; setTimeout(()=>{ confetti(120); toast('🏆 مبروك! أتممت درس «'+L.title+'» بالكامل'); },600); } }
  paintTabs(); G.paint();
  const body=$('.lesson-body',main);
  const next=k=>`Lesson${L.id}_${k}.html`;
  const ix=TABS.findIndex(t=>t.k===page), nx=TABS[ix+1];
  const nextStep=nx?{k:nx.k,t:nx.t,href:next(nx.k)}:null;
  const ctx={L,body,markDone,next,nextStep,TABS,done};
  const BASE={aims:pAims,warmup:pWarmup,content:pContent,activity:MODE==='guided'?pGuided:pFree,selftest:pFormative,posttest:pPost};
  const fn=(L.v2&&R[page])||BASE[page]||R[page];
  fn(ctx);
  $$('.ws',body).forEach(ws=>{ const top=ws.previousElementSibling; if(!top||!top.classList.contains('ws-top')) return;
    const bt=h('<button class="b b-ghost b-sm ptog">📖 النص / المهمة</button>'); top.insertBefore(bt,top.querySelector('.sp'));
    const cl=h('<button class="b b-main b-sm ptog" style="align-self:flex-start">✕ إغلاق والعودة للعمل</button>'); ws.querySelector('.para').appendChild(cl);
    bt.onclick=()=>{ ws.classList.add('sp-on'); runFit(); }; cl.onclick=()=>ws.classList.remove('sp-on'); });
  onFit(()=>{ $$('.screen.on .para .pt',body).forEach(t=>fitText(t,Math.max(15,Math.min(22,innerHeight/36)),12)); fitZoom($('.screen.on',body)||body.firstElementChild); });
  runFit();
}

/* ---------- 1) الأهداف ---------- */
function pAims({L,body,markDone,next}){
  const steps=[['💡','التهيئة','warmup'],['🎬','الفيديو والنص','content'],[MODE==='guided'?'🧭':'🎨',MODE==='guided'?'النشاط الموجّه':'النشاط الحر','activity'],['📝','التقويم الختامي','selftest'],['🏁','الاختبار البعدي','posttest']];
  body.appendChild(h(`<div class="screen on"><div class="aims">
    <div class="main-aim"><span class="big">🍎</span><p><b style="color:#fff;font-size:1.05em">الهدف الرئيس:</b> ${L.mainAim}</p></div>
    <div class="aim-grid">${L.aims.map(a=>`<div class="aim"><span class="ai">${a.i}</span><b>${a.t}</b><span>${a.d}</span></div>`).join('')}</div>
    <div class="journey">${steps.map((s,i)=>`${i?'<span class="arr">←</span>':''}<a class="j" href="${next(s[2])}"><span class="c">${s[0]}</span>${s[1]}</a>`).join('')}
      <a class="b b-main" href="${next('warmup')}" style="margin-inline-start:8px;text-decoration:none">ابدأ ←</a></div>
  </div></div>`));
  markDone('aims');
}

/* ---------- 2) التهيئة ---------- */
function pWarmup({L,body,markDone,next}){
  const W=L.warmup;
  W.forEach((s,i)=>{
    const sc=h(`<div class="screen ${i?'':'on'}"><div class="wu">
      <div class="wu-img"><img src="${s.img}" alt=""><span class="stage-tag">${s.tag} • ${AR(i+1)} من ${AR(W.length)}</span></div>
      <div class="wu-side">
        <div class="dots">${W.map((_,j)=>`<i class="${j<i?'ok':j===i?'cur':''}">${AR(j+1)}</i>`).join('')}</div>
        <p class="wu-q">${s.q}</p><p class="wu-sub">${s.sub}</p>
        ${s.guess?`<input class="field" id="guess" placeholder="اكتب توقعك هنا…" autocomplete="off"><div class="reveal" style="display:none;flex-direction:column;gap:8px;align-items:center"><span class="pill green">🎉 عنوان درسنا اليوم</span><p class="reveal-title">${s.answer}</p></div>`
          :s.choices.map((c,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${c}</button>`).join('')}
        <div class="fb"><span class="e"></span><span class="m"></span></div>
        <div class="wu-nav">${i?'<button class="b b-ghost prev">→ السابق</button>':''}<span class="sp"></span>
          ${s.guess?'<button class="b b-hint go">اكشف العنوان ✨</button><a class="b b-main fin" style="display:none;text-decoration:none" href="'+next('content')+'">شاهد الفيديو ←</a>':'<button class="b b-main nx" disabled>التالي ←</button>'}</div>
      </div></div></div>`);
    body.appendChild(sc);
    const fb=$('.fb',sc), show=(cls,e,m)=>setFb(fb,cls,e,m);
    if(!s.guess){
      $$('.choice',sc).forEach(b=>b.onclick=()=>{
        const k=+b.dataset.k; $$('.choice',sc).forEach(x=>x.classList.remove('wrong','right'));
        if(k===s.correct){ b.classList.add('right'); $$('.choice',sc).forEach(x=>{ if(x!==b){x.classList.add('dim');} x.disabled=true; });
          show('ok','🌟',s.ok); $('.nx',sc).disabled=false; }
        else { b.classList.add('wrong','shake'); setTimeout(()=>b.classList.remove('shake'),500); show('hint','💡',s.no); }
      });
      $('.nx',sc).onclick=()=>go(i+1);
    } else {
      const g=$('#guess',sc);
      const reveal=()=>{ const ok=norm(g.value).includes(norm(s.key));
        g.style.display='none'; $('.reveal',sc).style.display='flex'; $('.go',sc).style.display='none'; $('.fin',sc).style.display='inline-flex';
        show(ok?'ok':'info', ok?'🎯':'🌱', ok?'توقعكم صحيح! عقلكم قارئ واعٍ فعلًا.':(g.value.trim()?'توقع جميل «'+esc(g.value.trim())+'»! والعنوان الذي اختاره الكاتب هو «ثمرة القراءة».':'العنوان هو «ثمرة القراءة»: ما نجنيه من القراءة الواعية.'));
        confetti(); markDone('warmup'); };
      $('.go',sc).onclick=reveal; g.addEventListener('keydown',e=>{ if(e.key==='Enter') reveal(); });
    }
    const p=$('.prev',sc); if(p) p.onclick=()=>go(i-1);
  });
  function go(n){ $$('.screen',body).forEach((s,j)=>s.classList.toggle('on',j===n)); runFit(); }
}

/* ---------- 3) الفيديو والنص ---------- */
function pContent(ctx){ const {L,body,markDone,next,nextStep}=ctx; const NX=nextStep||{t:'النشاط',href:next('activity')};
  const canSpeak='speechSynthesis' in window;
  const sc=h(`<div class="screen on">
    <div class="ws-top">
      <div class="seg"><button class="on" data-v="video">🎬 الفيديو التفاعلي</button><button data-v="book">📖 ${L.textLabel||'نص الاستماع'}</button></div>
      <span class="sp"></span>
      ${canSpeak?'<button class="b b-ghost b-sm say" style="display:none">🔊 استمع للصفحة</button>':''}
      <a class="b b-main b-sm" style="text-decoration:none" href="${NX.href}">انتقل إلى ${NX.t} ←</a>
    </div>
    <div class="video-stage v-video">
      ${L.video2?'<div class="ivid2"></div>':L.video? `<div class="video-frame">${/\.mp4($|\?)/.test(L.video)?`<video src="${L.video}" controls></video>`:`<iframe src="${L.video}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`}</div>` : '<div class="ivid"></div>'}
    </div>
    <div class="book v-book" style="display:none">${L.pages.map((p,i)=>`
      <div class="page ${p.kind} ${i?'':'on'}"><div class="p-head"><span class="pill ${p.kind==='note'?'blue':'orange'}">${p.head}</span><span class="sp"></span><span class="pill">صفحة ${AR(i+1)} من ${AR(L.pages.length)}</span></div><p class="p-text">${p.text}</p></div>`).join('')}
    </div>
    <div class="book-nav v-book" style="display:none"><button class="b b-ghost b-sm pv">→ السابقة</button><div class="page-dots">${L.pages.map((_,i)=>`<i data-i="${i}" class="${i?'':'on'}"></i>`).join('')}</div><button class="b b-main b-sm nx">التالية ←</button></div>
  </div>`);
  body.appendChild(sc);
  if(L.video2 && R.video2) R.video2($('.ivid2',sc),ctx);
  else if(!L.video && L.videoSegments) iVideo($('.ivid',sc),L,{markDone,next});
  if(R.reader) R.reader(sc,ctx);
  let cur=0; const pages=$$('.page',sc), dots=$$('.page-dots i',sc);
  const fitPage=()=>{ const p=pages[cur]; if(!p||!p.offsetParent) return; const t=$('.p-text',p);
    const max=Math.max(16,Math.min(26, innerHeight/30)); fitText(t,max,13);
    t.style.setProperty('--rule',getComputedStyle(t).lineHeight); };
  function show(i){ cur=Math.max(0,Math.min(pages.length-1,i)); pages.forEach((p,j)=>p.classList.toggle('on',j===cur)); dots.forEach((d,j)=>d.classList.toggle('on',j===cur));
    $('.pv',sc).disabled=cur===0; $('.nx',sc).textContent=cur===pages.length-1?'إلى '+NX.t+' ←':'التالية ←'; if(canSpeak) speechSynthesis.cancel(); fitPage();
    if(cur===pages.length-1) markDone('content'); }
  $('.pv',sc).onclick=()=>show(cur-1);
  $('.nx',sc).onclick=()=>{ if(cur===pages.length-1) location.href=NX.href+'#p='+store.get(KEY('done_L'+L.id),[]).join('.'); else show(cur+1); };
  sc.addEventListener('reader:show',e=>show(e.detail));
  dots.forEach(d=>d.onclick=()=>show(+d.dataset.i));
  $$('.seg button',sc).forEach(b=>b.onclick=()=>{ $$('.seg button',sc).forEach(x=>x.classList.toggle('on',x===b));
    const v=b.dataset.v; $$('.v-video',sc).forEach(e=>e.style.display=v==='video'?'':'none'); $$('.v-book',sc).forEach(e=>e.style.display=v==='book'?'':'none');
    const say=$('.say',sc); if(say) say.style.display=v==='book'?'':'none'; if(v==='book'){ document.dispatchEvent(new Event('ivid:pause')); show(cur); } else if(canSpeak) speechSynthesis.cancel(); });
  const say=$('.say',sc);
  if(say){ say.onclick=()=>{ if(speechSynthesis.speaking){ speechSynthesis.cancel(); say.textContent='🔊 استمع للصفحة'; return; }
    const u=new SpeechSynthesisUtterance($('.p-text',pages[cur]).textContent); u.lang='ar-EG'; u.rate=.9;
    const v=speechSynthesis.getVoices().find(v=>/^ar/i.test(v.lang)); if(v) u.voice=v;
    u.onend=()=>say.textContent='🔊 استمع للصفحة'; speechSynthesis.speak(u); say.textContent='⏹ إيقاف'; }; }
  onFit(fitPage);
  document.addEventListener('keydown',e=>{ if(!$('.book',sc).offsetParent) return; if(e.key==='ArrowLeft') show(cur+1); if(e.key==='ArrowRight') show(cur-1); });
}


/* =========================================================
   الفيديو التفاعلي (مقاطع + أسئلة توقف)
   ========================================================= */
function iVideo(root,L,{markDone,next}){
  const S=L.videoSegments, synth=('speechSynthesis' in window)?speechSynthesis:null;
  const strip=t=>t.replace(/<br\s*\/?>/g,' ').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const chunk=t=>{ const out=[]; strip(t).split(/(?<=[.؛!؟:])\s+/).forEach(sen=>{ const w=sen.split(' ');
      if(w.length<=22){ out.push(sen); return; } let buf=[]; sen.split(/(?<=،)\s+/).forEach(part=>{ const pw=part.split(' ');
        if(buf.length && buf.length+pw.length>20){ out.push(buf.join(' ')); buf=[]; } buf=buf.concat(pw); }); if(buf.length) out.push(buf.join(' ')); });
    return out.filter(Boolean); };
  const AUD=window.LESSON_AUDIO, ABASE='../assets/audio/lesson'+L.id+'/';
  const SPD=window.IV_SPEED||1; const est=c=>Math.max(2.2, c.split(' ').length*.48+.8)*SPD;
  const segs=S.map((sg,i)=>({...sg, items: (AUD&&AUD[i]) ? AUD[i].map(x=>({t:x.t,d:x.d*SPD,src:x.src})) : chunk(L.pages[sg.page].text).map(t=>({t,d:est(t)})) }));
  segs.forEach(sg=>sg.total=sg.items.reduce((a,c)=>a+c.d,0));
  let all=segs.reduce((a,b)=>a+b.total,0);
  const res=store.get(KEY('video_L'+L.id),{}); const ans=segs.map((_,i)=>res[i]||null);
  root.innerHTML=`
   <div class="iv-frame">
     <div class="iv-bg"><img alt=""></div><div class="iv-shade"></div>
     <div class="iv-top"><span class="iv-chip seg-n"></span><span class="iv-chip ttl"></span><span class="sp"></span><span class="iv-chip voice" title="الصوت"></span></div>
     <div class="iv-cap"><p></p></div>
     <div class="iv-ov start on"><div class="iv-card center">
        <div class="iv-big">▶</div><h3>الفيديو التفاعلي: ثمرة القراءة</h3>
        <p>${AR(segs.length)} مقاطع قصيرة… وبعد كل مقطع يتوقف الفيديو ويظهر <b>سؤال</b> تجيب عنه ثم تكمل المشاهدة.</p>
        <button class="b b-main go">ابدأ المشاهدة ▶</button></div></div>
     <div class="iv-ov quiz"><div class="iv-card"><div class="row"><span class="pill orange">⏸ سؤال توقف</span><span class="pill qn"></span></div>
        <p class="iv-q"></p><div class="iv-opts"></div><div class="fb"><span class="e"></span><span class="m"></span></div>
        <div class="row"><button class="b b-ghost b-sm rep">↺ أعد المقطع</button><span class="sp"></span><button class="b b-main cont" style="display:none">أكمل المشاهدة ▶</button></div></div></div>
     <div class="iv-ov end"><div class="iv-card center"><div class="iv-big">🎉</div><h3>أنهيت الفيديو التفاعلي!</h3><p class="sum"></p>
        <p class="cd"></p><div class="row" style="justify-content:center"><button class="b b-ghost again">↺ شاهد من البداية</button><a class="b b-main" style="text-decoration:none" href="${next('activity')}">انتقل إلى النشاط الآن ←</a></div></div></div>
   </div>
   <div class="iv-bar">
     <button class="iv-btn pp" title="تشغيل / إيقاف">▶</button>
     <div class="iv-tl">${segs.map((sg,i)=>`<div class="iv-seg" style="flex:${sg.total}" data-i="${i}" title="المقطع ${AR(i+1)}: ${sg.title}"><i></i><span class="mk">⏸</span></div>`).join('')}</div>
     <span class="iv-time"></span>
     <button class="iv-btn mute" title="الصوت">🔊</button>
   </div>`;
  const F=$('.iv-frame',root), img=$('.iv-bg img',F), cap=$('.iv-cap p',F), pp=$('.pp',root);
  let si=0, ci=0, playing=false, tmr=null, utt=null, started=false, cdT=null;
  let voice=null, muted=false, mid=false; const audio=AUD?new Audio():null; if(audio) audio.preload='auto';
  const pickVoice=()=>{ if(!synth||AUD) return; voice=synth.getVoices().find(v=>/^ar/i.test(v.lang))||null; paintVoice(); };
  const paintVoice=()=>{ const v=$('.voice',F), m=$('.mute',root);
    if(AUD){ v.textContent=muted?'🔇 الصوت متوقف':'🔊 الراوي يقرأ النص'; m.textContent=muted?'🔇':'🔊'; m.style.display=''; return; }
    if(!synth||!voice){ v.textContent='🔇 بدون صوت: تابع النص'; m.style.display='none'; }
    else { v.textContent=muted?'🔇 الصوت متوقف':'🔊 راوي الفيديو'; m.textContent=muted?'🔇':'🔊'; m.style.display=''; } };
  if(AUD) paintVoice(); else if(synth){ pickVoice(); synth.onvoiceschanged=pickVoice; } else paintVoice();
  const elapsedBefore=i=>segs.slice(0,i).reduce((a,b)=>a+b.total,0);
  const fmt=x=>{ x=Math.round(x); return AR(Math.floor(x/60))+':'+AR(String(x%60).padStart(2,'0')); };
  function paintTL(partial){ $$('.iv-seg',root).forEach((el,i)=>{ const f=$('i',el);
      const w = i<si?100 : i>si?0 : partial; f.style.width=w+'%';
      el.classList.toggle('ans',!!ans[i]); el.classList.toggle('cur',i===si); });
    const t=elapsedBefore(si)+segs[si].total*partial/100; $('.iv-time',root).textContent=fmt(t)+' / '+fmt(all); }
  function setScene(){ const sg=segs[si];
    if(img.getAttribute('src')!==sg.img){ img.classList.remove('in'); void img.offsetWidth; img.src=sg.img; }
    img.className='in pan-'+sg.pan; F.classList.toggle('paused',!playing);
    $('.seg-n',F).textContent='المقطع '+AR(si+1)+' من '+AR(segs.length); $('.ttl',F).textContent=sg.title; }
  const fillEl=()=>$(`.iv-seg[data-i="${si}"] i`,root);
  const beforeOf=()=>segs[si].items.slice(0,ci).reduce((a,x)=>a+x.d,0);
  function animFill(from,remain){ const sg=segs[si], f=fillEl(), end=(beforeOf()+sg.items[ci].d)/sg.total*100;
    f.style.transition=''; f.style.width=from+'%'; void f.offsetWidth; f.style.transition=`width ${Math.max(.05,remain)}s linear`; f.style.width=end+'%'; }
  function showChunk(){ const sg=segs[si], it=sg.items[ci], d=it.d, ws=it.t.split(' ');
    const span=Math.max(.6,d-(AUD?.5:.6));
    cap.innerHTML=ws.map((w,k)=>`<span style="animation-delay:${(k*span/ws.length).toFixed(2)}s">${esc(w)}</span>`).join(' ');
    cap.parentElement.classList.remove('pop'); void cap.offsetWidth; cap.parentElement.classList.add('pop');
    paintTL(beforeOf()/sg.total*100); animFill(beforeOf()/sg.total*100,d); return d; }
  function adv(){ clearTimeout(tmr); if(!playing) return; mid=false; ci++; step(); }
  function step(){ clearTimeout(tmr); if(!playing) return; const sg=segs[si];
    if(ci>=sg.items.length){ stopAt(); return; }
    const d=showChunk(), it=sg.items[ci]; mid=true;
    if(audio){ audio.src=ABASE+it.src; audio.muted=muted; audio.onended=()=>adv();
      audio.onloadedmetadata=()=>{ const real=audio.duration; if(!isFinite(real)||Math.abs(real-it.d)<.25) return;
        it.d=real; sg.total=sg.items.reduce((a,c)=>a+c.d,0); const el=$(`.iv-seg[data-i="${si}"]`,root); if(el) el.style.flex=sg.total;
        all=segs.reduce((a,b)=>a+b.total,0); showChunk(); clearTimeout(tmr); tmr=setTimeout(adv,(real+4)*1000); };
      audio.play().catch(()=>{ tmr=setTimeout(adv,d*1000); }); tmr=setTimeout(adv,(d+4)*1000); return; }
    if(synth && voice && !muted){ synth.cancel(); utt=new SpeechSynthesisUtterance(it.t); utt.lang=voice.lang; utt.voice=voice; utt.rate=.92;
      let done=false; utt.onend=()=>{ if(playing&&!done){ done=true; setTimeout(adv,250); } }; synth.speak(utt); tmr=setTimeout(adv,(d*2.2+3)*1000); }
    else tmr=setTimeout(adv,d*1000); }
  function play(){ if(playing) return; playing=true; pp.textContent='⏸'; F.classList.remove('paused'); setScene();
    if(audio && mid && audio.src && !audio.ended && audio.currentTime>0){ const it=segs[si].items[ci], rem=Math.max(.1,it.d-audio.currentTime);
      animFill(parseFloat(fillEl().style.width)||0,rem); audio.play().catch(()=>{}); tmr=setTimeout(adv,(rem+4)*1000); return; }
    mid=false; step(); }
  function pause(){ playing=false; pp.textContent='▶'; clearTimeout(tmr); if(synth) synth.cancel(); if(audio) audio.pause(); F.classList.add('paused');
    const f=fillEl(); if(f){ const w=f.getBoundingClientRect().width/f.parentElement.getBoundingClientRect().width*100; f.style.transition=''; f.style.width=w+'%'; } }
  function stopAt(){ pause(); paintTL(100); openQuiz(); }
  function goSeg(i,autoplay=true){ pause(); mid=false; si=i; ci=0; cap.innerHTML=''; setScene(); paintTL(0); hideOv(); if(autoplay) play(); }
  const hideOv=()=>$$('.iv-ov',F).forEach(o=>o.classList.remove('on'));
  const ov=n=>{ hideOv(); $('.iv-ov.'+n,F).classList.add('on'); };
  let tries=0;
  function openQuiz(){ const sg=segs[si]; tries=0; ov('quiz'); const box=$('.iv-ov.quiz',F);
    $('.qn',box).textContent='بعد المقطع '+AR(si+1); $('.iv-q',box).textContent=sg.q; $('.fb',box).className='fb'; $('.cont',box).style.display='none';
    $('.cont',box).textContent= si===segs.length-1?'إنهاء الفيديو 🏁':'أكمل المشاهدة ▶';
    $('.iv-opts',box).innerHTML=sg.o.map((o,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${esc(o)}</button>`).join('');
    $$('.iv-opts .choice',box).forEach(b=>b.onclick=()=>{ const k=+b.dataset.k; tries++;
      if(k===sg.c){ b.classList.add('right'); $$('.iv-opts .choice',box).forEach(x=>x.disabled=true);
        setFb($('.fb',box),'ok',tries===1?'🌟':'👏',sg.ok, tries===1?'إجابة صحيحة ✔':'أحسنت… صححت إجابتك ✔');
        if(!ans[si]) ans[si]={first:tries===1,tries}; store.set(KEY('video_L'+L.id),Object.assign({},ans)); $('.cont',box).style.display=''; paintTL(100); }
      else { b.classList.add('wrong','shake'); b.disabled=true; setTimeout(()=>b.classList.remove('shake'),450);
        setFb($('.fb',box),'hint','💡','<b>تلميح:</b> '+sg.help+' جرّب مرة أخرى.','إجابة غير صحيحة ✖'); } }); }
  $('.iv-ov.quiz .cont',F).onclick=()=>{ if(si<segs.length-1) goSeg(si+1); else finish(); };
  $('.iv-ov.quiz .rep',F).onclick=()=>goSeg(si);
  function finish(){ pause(); ov('end'); const first=ans.filter(a=>a&&a.first).length;
    $('.sum',F).innerHTML=`أجبت عن <b>${AR(segs.length)}</b> أسئلة توقف — منها <b>${AR(first)}</b> صحيحة من أول محاولة ⭐`;
    markDone('content'); addRecord({type:'video',L:L.id,at:stamp(),ans}); confetti(80);
    let n=10; const cd=$('.cd',F); clearInterval(cdT);
    const tick=()=>{ cd.innerHTML=`سننتقل إلى النشاط تلقائيًا خلال <b>${AR(n)}</b> ثوانٍ…`; if(n--<=0){ clearInterval(cdT); location.href=next('activity')+'#p='+store.get(KEY('done_L'+L.id),[]).join('.'); } };
    tick(); cdT=setInterval(tick,1000); }
  $('.iv-ov.end .again',F).onclick=()=>{ clearInterval(cdT); goSeg(0); };
  $('.iv-ov.start .go',F).onclick=()=>{ started=true; hideOv(); if(synth&&!voice) pickVoice(); play(); };
  pp.onclick=()=>{ if(!started){ $('.iv-ov.start .go',F).click(); return; } if($('.iv-ov.on',F)) return; playing?pause():play(); };
  $('.mute',root).onclick=()=>{ muted=!muted; paintVoice(); if(audio){ audio.muted=muted; return; } if(playing){ pause(); play(); } };
  $$('.iv-seg',root).forEach(el=>el.onclick=()=>{ const i=+el.dataset.i; if(!started) return;
    if(i<=si || ans[i-1]) { clearInterval(cdT); goSeg(i); } else toast('⏸ أجب عن سؤال التوقف أولًا لتنتقل للمقطع التالي'); });
  F.addEventListener('click',e=>{ if(e.target.closest('.iv-ov,.iv-top')) return; if(started) pp.click(); });
  document.addEventListener('ivid:pause',()=>{ if(playing) pause(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && playing) pause(); });
  window.addEventListener('beforeunload',()=>{ if(synth) synth.cancel(); if(audio) audio.pause(); });
  setScene(); paintTL(0);
}

/* ---------- group setup (مشترك) ---------- */
function groupStore(){ return store.get(KEY('group'),{name:'',members:[]}); }
function setupScreen({title,icon,intro,steps,roles,free,onStart}){
  const G=groupStore();
  const n = free?4:roles.length;
  const sc=h(`<div class="screen on"><div class="setup">
    <div class="setup-hero"><span class="big">${icon}</span><h3>${title}</h3><p>${intro}</p><div class="steps">${steps.map(s=>`<span>${s}</span>`).join('')}</div></div>
    <div class="setup-form">
      <div class="sec-title"><span class="ico">👥</span><h3>بيانات المجموعة</h3></div>
      <div><p class="lbl">اسم المجموعة</p><input class="field gname" placeholder="مثال: فريق المِصفاة" value="${esc(G.name)}"></div>
      <p class="lbl" style="margin-top:4px">${free?'أعضاء المجموعة — كل عضو يختار دوره بنفسه':'أعضاء المجموعة وأدوارهم'}</p>
      ${Array.from({length:n},(_,i)=>{ const m=G.members[i]||{}; return `<div class="member"><span class="mi">${free?'🙂':roles[i].i}</span><input class="mname" placeholder="اسم الطالب ${AR(i+1)}${free&&i===3?' (اختياري)':''}" value="${esc(m.name||'')}">
        ${free?`<select class="mrole"><option value="">اختر دورك…</option>${roles.map(r=>`<option ${m.role===r.t?'selected':''}>${r.t}</option>`).join('')}</select>`:`<span class="rname">${roles[i].t}</span>`}</div>`; }).join('')}
      <div class="fb"><span class="e">⚠️</span><span class="m"></span></div>
      <div class="row" style="margin-top:auto"><span class="sp"></span><button class="b b-main start">ابدأ النشاط 🚀</button></div>
    </div></div></div>`);
  $('.start',sc).onclick=()=>{
    const name=$('.gname',sc).value.trim(); const ms=$$('.member',sc).map((m,i)=>({name:$('.mname',m).value.trim(), role: free?($('.mrole',m).value):roles[i].t})).filter(m=>m.name);
    const fb=$('.fb',sc); const err=t=>{ fb.className='fb on bad'; $('.m',fb).textContent=t; };
    if(!name) return err('اكتبوا اسم المجموعة أولًا.');
    if(ms.length<(free?2:roles.length)) return err(free?'أدخلوا أسماء عضوين على الأقل.':'أدخلوا اسم كل عضو بجوار دوره.');
    if(free && ms.some(m=>!m.role)) return err('كل عضو يختار دوره من القائمة.');
    store.set(KEY('group'),{name,members:ms}); onStart({name,members:ms});
  };
  return sc;
}

/* ---------- 4أ) النشاط الموجّه ---------- */
function pGuided({L,body,markDone,next}){
  const ROLES=[{i:'🔤',t:'خبير الكلمات'},{i:'💎',t:'صائغ الجوهر'},{i:'📝',t:'المقرر'}];
  const log={ start:Date.now(), acts:[] };
  let group=null;
  body.appendChild(setupScreen({ title:'الأنشطة الموجّهة', icon:'🧭', roles:ROLES,
    intro:'نشاطان قصيران، لكل منهما <b>٥ دقائق</b> وخطوات محددة وأدوار واضحة، مع <b>تلميح</b> عند الحاجة و<b>تغذية راجعة فورية</b>.',
    steps:['🔤 خبير الكلمات: يحدد معاني الكلمات من السياق','💎 صائغ الجوهر: يلخص الفقرة في جملة واحدة','📝 المقرر: يكتب التلخيص + التبرير ويسلّمه'],
    onStart:g=>{ group=g; go(1); } }));
  const A1=L.guided[0], A2=L.guided[1];
  const roleName=(ri,shift)=>{ const ms=group.members; return ms[(ri+shift)%ms.length]?.name||''; };

  /* ===== نشاط 1 ===== */
  const s1=h(`<div class="screen">
    <div class="ws-top"><span class="pill orange">${A1.title}</span><h3 class="fun" style="margin:0;font-size:clamp(16px,2.6vh,20px);color:var(--teal-dark)">${A1.sub}</h3><span class="sp"></span>
      <button class="b b-hint b-sm hint">💡 تلميح</button><span class="tm"></span></div>
    <div class="ws">
      <div class="para"><span class="pill">📖 اقرأ مع مجموعتك</span><p class="pt">${markPara(A1.para,A1.targets.map(t=>t.w),A1.keyPhrase)}</p>
        <div class="fb hintbox"><span class="e">💡</span><span class="m"></span></div></div>
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="roles">${ROLES.map((r,i)=>`<button class="role-tab ${i?'':'on'}" data-p="${i}"><span class="ri">${r.i}</span>${r.t}<small class="rn"></small></button>`).join('')}</div>
        <div class="pane on" data-p="0"><p class="task"><b>خبير الكلمات:</b> اضغط الكلمة، ثم اضغط معناها المناسب من السياق.</p>
          <div class="match"><div class="col">${A1.targets.map((t,i)=>`<button class="chip word" data-w="${i}">${t.w}</button>`).join('')}</div>
          <div class="col">${shuffle(A1.targets.map((t,i)=>({m:t.m,i})).concat(A1.distract.map(m=>({m,i:-1})))).map(o=>`<button class="chip mean" data-i="${o.i}">${o.m}</button>`).join('')}</div></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div></div>
        <div class="pane" data-p="1"><p class="task"><b>صائغ الجوهر:</b> لخّص الفقرة في <b>جملة واحدة من ١٠ – ١٢ كلمة</b> بأسلوبك.</p>
          <textarea class="field ess" rows="3" placeholder="اكتب جملة التلخيص هنا…"></textarea>
          <div class="row"><span class="wc">٠ كلمة</span><span class="sp"></span><button class="b b-ghost b-sm chk">تحقّق ✔</button></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div></div>
        <div class="pane" data-p="2"><p class="task"><b>المقرر:</b> اكتب التلخيص النهائي + <b>التبرير الجماعي</b> (لماذا هذا التلخيص صحيح؟) ثم سلّم.</p>
          <div class="grow" style="display:flex;flex-direction:column;gap:6px"><p class="lbl">✍️ التلخيص</p><textarea class="field rsum" rows="2" placeholder="التلخيص المتفق عليه…"></textarea>
          <p class="lbl">🤝 التبرير الجماعي</p><textarea class="field rjus" rows="2" placeholder="لأن النص قال: «…»"></textarea></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div>
          <div class="row"><span class="sp"></span><button class="b b-green sub">تسليم النشاط 📤</button></div></div>
      </div>
    </div></div>`);
  body.appendChild(s1);
  const st1={hints:0, matchErr:0, copy:0, wc:false, matched:new Set()};
  wireRoles(s1);
  const t1=Timer($('.tm',s1),A1.seconds,{onEnd:()=>toast('⏰ انتهى الوقت! أكملوا التسليم بسرعة')});
  $('.hint',s1).onclick=()=>{ st1.hints++; const hb=$('.hintbox',s1); hb.classList.add('on'); $('.m',hb).innerHTML=A1.hint; $$('.key',s1).forEach(k=>k.style.background='linear-gradient(transparent 50%,#86EFAC 50%)'); runFit(); };
  // matching
  let selW=null;
  $$('.chip.word',s1).forEach(c=>c.onclick=()=>{ if(c.classList.contains('ok')) return; $$('.chip.word',s1).forEach(x=>x.classList.remove('sel')); c.classList.add('sel'); selW=+c.dataset.w; });
  $$('.chip.mean',s1).forEach(c=>c.onclick=()=>{
    const pane=c.closest('.pane'), fb=$('.fb',pane);
    if(selW===null){ setFb(fb,'info','👆','اضغط الكلمة أولًا ثم معناها.'); return; }
    if(+c.dataset.i===selW){ const w=$(`.chip.word[data-w="${selW}"]`,s1); w.classList.remove('sel'); w.classList.add('ok'); c.classList.add('ok');
      w.innerHTML=esc(w.textContent)+'<small style="display:block;font-family:Tajawal;font-size:11.5px;font-weight:700">'+esc(c.textContent)+'</small>'; c.classList.add('gone'); st1.matched.add(selW); selW=null;
      if(st1.matched.size===A1.targets.length){ setFb(fb,'ok','🌟','رائع! استنتجتم معاني الكلمات الأربع من السياق.'); $('.role-tab[data-p="0"]',s1).classList.add('done'); }
      else setFb(fb,'ok','✅','صحيح! كمّل باقي الكلمات.'); }
    else { st1.matchErr++; c.classList.add('shake'); setTimeout(()=>c.classList.remove('shake'),450); setFb(fb,'hint','🤔','ارجع للجملة: الكلمة معناها مرتبط باللي قبلها واللي بعدها.'); }
    runFit();
  });
  // essence
  const ess=$('.ess',s1), wc=$('.wc',s1);
  ess.oninput=()=>{ const n=words(ess.value).length; wc.textContent=AR(n)+' كلمة'; wc.className='wc '+(n>=10&&n<=12?'good':n?'bad':''); };
  $('.chk',s1).onclick=()=>{ const fb=$('.fb',ess.closest('.pane')); const n=words(ess.value).length;
    if(!n) return setFb(fb,'info','✏️','اكتب جملة التلخيص أولًا.');
    if(isCopy(ess.value,A1.para)){ st1.copy++; return setFb(fb,'bad','✋',A1.copyMsg); }
    if(n<10||n>12) return setFb(fb,'hint','📏',`جملتك ${AR(n)} كلمة، المطلوب من ١٠ إلى ١٢ كلمة.`);
    st1.wc=true; setFb(fb,'ok','💎','تلخيص بأسلوبكم وبالطول المطلوب! انقلوه للمقرر.'); $('.role-tab[data-p="1"]',s1).classList.add('done');
    const rs=$('.rsum',s1); if(!rs.value.trim()) rs.value=ess.value.trim(); runFit(); };
  $('.sub',s1).onclick=()=>{ const fb=$('.fb',$('.sub',s1).closest('.pane')); const sum=$('.rsum',s1).value, jus=$('.rjus',s1).value;
    if(st1.matched.size<A1.targets.length) return setFb(fb,'hint','🔤','خبير الكلمات لم يُكمل معاني الكلمات بعد.');
    if(!words(sum).length) return setFb(fb,'hint','✍️','اكتب التلخيص أولًا.');
    if(isCopy(sum,A1.para)){ st1.copy++; return setFb(fb,'bad','✋',A1.copyMsg); }
    if(words(jus).length<4) return setFb(fb,'hint','🤝','اكتبوا تبريرًا جماعيًا واضحًا (٤ كلمات على الأقل) يستند إلى النص.');
    t1.stop(); $('.role-tab[data-p="2"]',s1).classList.add('done');
    log.acts.push({n:1,time:t1.used,over:t1.over,hints:st1.hints,matchErr:st1.matchErr,copy:st1.copy,summary:sum.trim(),words:words(sum).length,just:jus.trim(),
      roles:ROLES.map((r,i)=>r.t+': '+roleName(i,0)).join(' | ')});
    setFb(fb,'ok','🎉','تم التسليم! أحسنتم… استعدوا للنشاط الموجّه (2) مع تبادل الأدوار.'); confetti(40);
    setTimeout(()=>go(2),1600); };

  /* ===== نشاط 2 ===== */
  const s2=h(`<div class="screen">
    <div class="ws-top"><span class="pill orange">${A2.title}</span><h3 class="fun" style="margin:0;font-size:clamp(16px,2.6vh,20px);color:var(--teal-dark)">${A2.sub}</h3><span class="pill blue">🔄 تبادلوا الأدوار</span><span class="sp"></span>
      <button class="b b-hint b-sm hint">💡 تلميح</button><span class="tm"></span></div>
    <div class="ws">
      <div class="para tap"><span class="pill">📖 اضغط الكلمات الصعبة (Clunks) في الفقرة</span><p class="pt">${A2.para.split(' ').map(w=>`<span class="w">${w}</span>`).join(' ')}</p>
        <div class="fb hintbox"><span class="e">💡</span><span class="m"></span></div></div>
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="roles">${[['🧩','الـ Clunks'],['💎','الـ Gist'],['📌','الدليل والتسليم']].map((r,i)=>`<button class="role-tab ${i?'':'on'}" data-p="${i}"><span class="ri">${r[0]}</span>${r[1]}<small class="rn"></small></button>`).join('')}</div>
        <div class="pane on" data-p="0"><p class="task"><b>حددوا الـ Clunks:</b> اضغطوا على الكلمات الصعبة في الفقرة، واستنتجوا معنى كل كلمة من السياق.</p>
          <div class="clunk-list"><p class="muted empty" style="margin:0;font-size:13px">لم تحددوا أي كلمة بعد… 👈 اضغطوا على كلمة في الفقرة.</p></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div></div>
        <div class="pane" data-p="1"><p class="task"><b>لخّصوا الفقرة في Gist واحد</b> بأسلوبكم (جملة واحدة تجمع الفكرة الأهم).</p>
          <textarea class="field gist" rows="3" placeholder="الكاتب يحذّر من أن…"></textarea>
          <div class="row"><span class="wc">٠ كلمة</span><span class="sp"></span><button class="b b-ghost b-sm chk">تحقّق ✔</button></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div></div>
        <div class="pane" data-p="2"><p class="task"><b>اكتبوا دليلًا واحدًا من النص</b> يدعم تلخيصكم — يمكنكم الضغط على اقتباس لإدراجه.</p>
          <div class="quote-chips">${A2.quotes.map(q=>`<button>«${q}»</button>`).join('')}</div>
          <textarea class="field evid grow" rows="2" placeholder="الدليل من النص: «…»"></textarea>
          <div class="fb"><span class="e"></span><span class="m"></span></div>
          <div class="row"><span class="sp"></span><button class="b b-green sub">تسليم النشاط 📤</button></div></div>
      </div>
    </div></div>`);
  body.appendChild(s2);
  const st2={hints:0, copy:0, near:0, gistOk:false, clunks:new Map()};
  wireRoles(s2);
  const t2=Timer($('.tm',s2),A2.seconds,{onEnd:()=>toast('⏰ انتهى الوقت! أكملوا التسليم بسرعة')});
  $('.hint',s2).onclick=()=>{ st2.hints++; const hb=$('.hintbox',s2); hb.classList.add('on'); $('.m',hb).innerHTML=A2.hint; runFit(); };
  const list=$('.clunk-list',s2);
  function paintClunks(){ list.innerHTML=''; if(!st2.clunks.size){ list.innerHTML='<p class="muted" style="margin:0;font-size:13px">لم تحددوا أي كلمة بعد… 👈 اضغطوا على كلمة في الفقرة.</p>'; return; }
    st2.clunks.forEach((v,k)=>{ const it=h(`<div class="clunk-item"><b>${esc(k)}</b><input class="field" placeholder="معناها من السياق…" value="${esc(v)}"><button class="b b-ghost b-sm" title="حذف">✕</button></div>`);
      $('input',it).oninput=e=>{ st2.clunks.set(k,e.target.value); }; $('button',it).onclick=()=>{ st2.clunks.delete(k); $$('.w',s2).forEach(w=>{ if(w.textContent.replace(/[؛،.]/g,'')===k) w.classList.remove('clunk'); }); paintClunks(); };
      list.appendChild(it); }); runFit(); }
  $$('.w',s2).forEach(w=>w.onclick=()=>{ const k=w.textContent.replace(/[؛،.]/g,''); if(st2.clunks.has(k)){ st2.clunks.delete(k); w.classList.remove('clunk'); }
    else { if(st2.clunks.size>=5) return toast('يكفي ٥ كلمات صعبة كحد أقصى'); st2.clunks.set(k,''); w.classList.add('clunk'); }
    activate(s2,0); paintClunks(); });
  const gist=$('.gist',s2), wc2=$('.wc',s2);
  gist.oninput=()=>{ wc2.textContent=AR(words(gist.value).length)+' كلمة'; };
  const checkGist=fb=>{ const v=gist.value;
    if(!words(v).length){ setFb(fb,'info','✏️','اكتبوا الـ Gist أولًا.'); return false; }
    if(isCopy(v,A2.para)){ st2.copy++; setFb(fb,'bad','✋',A2.copyMsg); return false; }
    if(!A2.mustHave.some(m=>norm(v).includes(m))){ st2.near++; setFb(fb,'hint','🎯',A2.nearMsg); return false; }
    st2.gistOk=true; setFb(fb,'ok','💎','Gist ممتاز! ذكرتم الفكرة والنتيجة بأسلوبكم.'); $('.role-tab[data-p="1"]',s2).classList.add('done'); return true; };
  $('.chk',s2).onclick=()=>{ checkGist($('.fb',gist.closest('.pane'))); runFit(); };
  $$('.quote-chips button',s2).forEach(b=>b.onclick=()=>{ const e=$('.evid',s2); e.value=(e.value.trim()?e.value.trim()+' ':'')+b.textContent; });
  $('.sub',s2).onclick=()=>{ const fb=$('.fb',$('.sub',s2).closest('.pane'));
    const filled=[...st2.clunks.entries()].filter(([k,v])=>words(v).length);
    if(!filled.length){ activate(s2,0); return setFb($('.fb',$('.pane[data-p="0"]',s2)),'hint','🧩','حددوا كلمة صعبة واحدة على الأقل واكتبوا معناها.'); }
    if(!st2.gistOk){ activate(s2,1); if(!checkGist($('.fb',gist.closest('.pane')))) return; }
    const ev=$('.evid',s2).value; if(words(ev).length<3) return setFb(fb,'hint','📌','اكتبوا دليلًا واحدًا من النص (أو اضغطوا اقتباسًا).');
    t2.stop(); $('.role-tab[data-p="2"]',s2).classList.add('done'); $('.role-tab[data-p="0"]',s2).classList.add('done');
    log.acts.push({n:2,time:t2.used,over:t2.over,hints:st2.hints,copy:st2.copy,near:st2.near,clunks:filled.map(([k,v])=>k+' = '+v).join(' | '),summary:gist.value.trim(),evidence:ev.trim(),
      roles:ROLES.map((r,i)=>r.t+': '+roleName(i,1)).join(' | ')});
    confetti(); finish(); };

  /* ===== الإنجاز ===== */
  const s3=h(`<div class="screen"><div class="finale"><span class="medal">🏅</span><h3>أنجزتم الأنشطة الموجّهة!</h3><p class="muted who"></p>
    <div class="stat-row"></div>
    <div class="wa-box"><p>📲 الخطوة الأخيرة: أرسلوا نشاطكم للباحثة</p>${WA_BTN}<span class="wa-ok">✅ اضغطوا «إرسال» في النافذة التي فُتحت لإتمام التسليم</span></div>
    <div class="row" style="flex-wrap:wrap;justify-content:center"><button class="b b-ghost dl">📥 تحميل إجابات المجموعة</button><a class="b b-main" style="text-decoration:none" href="${next('selftest')}">إلى التقويم الختامي ←</a></div></div></div>`);
  body.appendChild(s3);
  function finish(){
    const tot=log.acts.reduce((a,b)=>a+b.time,0), hints=log.acts.reduce((a,b)=>a+b.hints,0), copies=log.acts.reduce((a,b)=>a+b.copy,0);
    $('.who',s3).textContent='مجموعة «'+group.name+'» — '+group.members.map(m=>m.name).join('، ');
    $('.stat-row',s3).innerHTML=`<div class="stat"><b>${AR(log.acts.length)}/٢</b><span>أنشطة مسلّمة</span></div><div class="stat"><b>${AR(Math.round(tot/60))} د</b><span>زمن الإنجاز</span></div><div class="stat"><b>${AR(hints)}</b><span>تلميحات مستخدمة</span></div><div class="stat"><b>${AR(copies)}</b><span>محاولات نقل حرفي</span></div>`;
    const a1=log.acts[0]||{}, a2=log.acts[1]||{};
    const wa=$('.wa',s3); wa.href=waLink(['📚 بيئة التعلم المعكوس — نمط الأنشطة الموجّهة','📖 الدرس: '+L.title+' ('+L.module+' — '+L.order+')','👥 المجموعة: '+group.name,
      '🙋 الأعضاء: '+group.members.map(m=>m.name+' ('+m.role+')').join('، '),'🕒 '+stamp(),'',
      '━━ النشاط الموجّه (1) ━━','🎭 الأدوار: '+(a1.roles||''),'💎 التلخيص: '+(a1.summary||''),'🔢 عدد الكلمات: '+(a1.words||''),'🤝 التبرير الجماعي: '+(a1.just||''),
      '⏱ الزمن: '+mmss(a1?.time)+(a1.over?' (تجاوز الوقت)':'')+' | 💡 تلميحات: '+(a1.hints||0)+' | ✋ نقل حرفي: '+(a1.copy||0)+' | أخطاء المعاني: '+(a1.matchErr||0),'',
      '━━ النشاط الموجّه (2) ━━','🎭 الأدوار: '+(a2.roles||''),'🧩 الكلمات الصعبة: '+(a2.clunks||''),'💎 الـ Gist: '+(a2.summary||''),'📌 الدليل من النص: '+(a2.evidence||''),
      '⏱ الزمن: '+mmss(a2?.time)+(a2.over?' (تجاوز الوقت)':'')+' | 💡 تلميحات: '+(a2.hints||0)+' | ✋ نقل حرفي: '+(a2.copy||0)+' | 🎯 بدون النتيجة: '+(a2.near||0)]);
    wa.onclick=()=>{ $('.wa-ok',s3).classList.add('on'); };
    addRecord({type:'guided',L:L.id,at:stamp(),group,acts:log.acts}); markDone('activity'); go(3);
  }
  $('.dl',s3).onclick=()=>{ const rows=[['النمط','الدرس','التاريخ','المجموعة','الأعضاء','النشاط','الأدوار','الزمن (ث)','تجاوز الوقت','التلميحات','أخطاء المطابقة','نقل حرفي','قريب (بدون النتيجة)','الكلمات الصعبة','التلخيص/الـ Gist','عدد كلمات التلخيص','التبرير/الدليل']];
    log.acts.forEach(a=>rows.push(['موجّه',L.title,stamp(),group.name,group.members.map(m=>m.name+' ('+m.role+')').join(' | '),a.n,a.roles,a.time,a.over?'نعم':'لا',a.hints,a.matchErr??'',a.copy,a.near??'',a.clunks??'',a.summary,a.words??words(a.summary).length,a.just??a.evidence]));
    downloadCSV('نشاط_موجه_'+group.name,rows); };

  function go(n){ $$('.screen',body).forEach((s,j)=>s.classList.toggle('on',j===n));
    if((n===1||n===2) && matchMedia('(max-width:720px)').matches){ const ws=$('.ws',n===1?s1:s2); ws.classList.add('sp-on'); }
    if(n===1){ $$('.rn',s1).forEach((e,i)=>e.textContent=roleName(i,0)); t1.start(); }
    if(n===2){ $$('.rn',s2).forEach((e,i)=>e.textContent=roleName(i,1)); t2.start(); }
    runFit(); }
}

/* ---------- 4ب) النشاط الحر ---------- */
function pFree({L,body,markDone,next}){
  const ROLES=[{t:'خبير الكلمات'},{t:'صائغ الجوهر'},{t:'المقرر'},{t:'الباحث عن الدليل'}];
  const F1=L.free[0], F2=L.free[1];
  let group=null; const log={acts:[]};
  body.appendChild(setupScreen({ title:'الأنشطة الحرة', icon:'🎨', roles:ROLES, free:true,
    intro:'تعملون بحرية على المنصة: أنتم تختارون المعلومة والفقرة وطريقة العمل… والمنصة <b>تسجّل كل شيء</b>: مين شارك، مين التزم بدوره، ومين كتب التبرير.',
    steps:['🎨 الحرية في الاختيار… والمهارة ثابتة','📲 المنصة تسجل المشاركة والأدوار','🔄 مجموعة أخرى تقيّم عملكم'],
    onStart:g=>{ group=g; go(1); } }));
  const memOpts=()=>group.members.map(m=>`<option>${esc(m.name)}</option>`).join('');
  const pplBox=()=>group.members.map(m=>`<label><input type="checkbox" value="${esc(m.name)}">✋ ${esc(m.name)} <small style="font-weight:400;color:var(--ink-soft)">(${esc(m.role)})</small></label>`).join('');

  /* ===== حر 1 ===== */
  const s1=h(`<div class="screen">
    <div class="ws-top"><span class="pill orange">${F1.title}</span><h3 class="fun" style="margin:0;font-size:clamp(16px,2.6vh,20px);color:var(--teal-dark)">${F1.sub}</h3><span class="sp"></span>
      ${F1.skills.map(s=>`<span class="pill green">${s}</span>`).join('')}<span class="tm"></span></div>
    <div class="ws">
      <div class="para" style="background:linear-gradient(160deg,#F5EEFF,#FFF0F7);border-color:#E3D6FF">
        <span class="pill pink">🎯 المهمة</span><p class="task" style="font-size:clamp(14px,2.2vh,17px);line-height:1.9">${F1.task}</p>
        <div class="fb info on"><span class="e">🕊️</span><span class="m">${F1.note}</span></div>
        <p class="lbl" style="margin-top:auto">📱 من أي منصة؟</p>
        <div class="platforms">${['فيسبوك','تيك توك','يوتيوب','إنستجرام','واتساب','X (تويتر)','أخرى'].map(p=>`<label><input type="radio" name="plat" value="${p}">${p}</label>`).join('')}</div>
      </div>
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="roles">${[['📰','المعلومة'],['💎','التلخيص والحكم'],['🤝','التبرير والمشاركة']].map((r,i)=>`<button class="role-tab ${i?'':'on'}" data-p="${i}"><span class="ri">${r[0]}</span>${r[1]}</button>`).join('')}</div>
        <div class="pane on" data-p="0"><p class="lbl">📰 اكتبوا المعلومة كما قرأتموها</p><textarea class="field infotx grow" placeholder="انسخوا أو اكتبوا المعلومة التي قرأتموها هذا الأسبوع…"></textarea>
          <div class="row"><span class="sp"></span><button class="b b-ghost b-sm" data-go="1">التالي ←</button></div></div>
        <div class="pane" data-p="1"><p class="lbl">💎 لخّصوها في جملة واحدة</p><textarea class="field sum" rows="2" placeholder="الخلاصة في جملة واحدة…"></textarea>
          <p class="lbl">⚖️ هي غث أم سمين؟</p>
          <div class="verdict"><label class="g"><input type="radio" name="ver" value="غث"><span class="vi">🥀</span>غث (رديئة / غير موثوقة)</label><label class="s"><input type="radio" name="ver" value="سمين"><span class="vi">🍎</span>سمين (مفيدة / موثوقة)</label></div>
          <div class="row" style="margin-top:auto"><span class="sp"></span><button class="b b-ghost b-sm" data-go="2">التالي ←</button></div></div>
        <div class="pane" data-p="2"><p class="lbl">🤝 لماذا؟ (التبرير الجماعي)</p><textarea class="field jus" rows="2" placeholder="حكمنا عليها بأنها… لأن…"></textarea>
          <div class="row"><p class="lbl" style="margin:0">✍️ من كتب التبرير؟</p><select class="field writer" style="width:auto;flex:1"><option value="">اختر…</option>${''}</select></div>
          <p class="lbl">✋ من شارك في هذا النشاط؟</p><div class="ppl"></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div>
          <div class="row" style="margin-top:auto"><span class="sp"></span><button class="b b-green sub">تسليم النشاط 📤</button></div></div>
      </div>
    </div></div>`);
  body.appendChild(s1); wireRoles(s1);
  $$('[data-go]',s1).forEach(b=>b.onclick=()=>activate(s1,+b.dataset.go));
  const sw1=Timer($('.tm',s1),0);
  $('.sub',s1).onclick=()=>{ const fb=$('.fb',$('.sub',s1).closest('.pane'));
    const info=$('.infotx',s1).value.trim(), sum=$('.sum',s1).value.trim(), ver=$('input[name=ver]:checked',s1)?.value, jus=$('.jus',s1).value.trim(), wr=$('.writer',s1).value, plat=$('input[name=plat]:checked',s1)?.value||'';
    const ppl=$$('.ppl input:checked',s1).map(i=>i.value);
    if(!info){ activate(s1,0); return toast('📰 اكتبوا المعلومة أولًا'); }
    if(!sum||!ver){ activate(s1,1); return toast('💎 اكتبوا التلخيص واختاروا: غث أم سمين'); }
    if(words(jus).length<3) return setFb(fb,'hint','🤝','اكتبوا التبرير: لماذا حكمتم عليها بذلك؟');
    if(!wr) return setFb(fb,'hint','✍️','اختاروا من كتب التبرير.');
    if(!ppl.length) return setFb(fb,'hint','✋','حدّدوا من شارك في النشاط.');
    sw1.stop(); log.acts.push({n:1,time:sw1.used,platform:plat,info,summary:sum,verdict:ver,just:jus,writer:wr,participants:ppl,copy:isCopy(sum,info)});
    setFb(fb,'ok','📲','تم تسجيل عملكم على المنصة! انطلقوا إلى النشاط الحر (2).'); confetti(40); setTimeout(()=>go(2),1400); };

  /* ===== حر 2 ===== */
  const s2=h(`<div class="screen">
    <div class="ws-top"><span class="pill orange">${F2.title}</span><h3 class="fun" style="margin:0;font-size:clamp(16px,2.6vh,20px);color:var(--teal-dark)">${F2.sub}</h3><span class="sp"></span><span class="tm"></span></div>
    <div class="ws">
      <div class="para" style="background:#fff;border-color:var(--border-strong)">
        <p class="task">${F2.task}</p>
        <div class="para-pick">${F2.paras.map(pi=>`<label><input type="radio" name="pp" value="${pi}"><b>${L.pages[pi].head}</b>${L.pages[pi].text.replace(/<[^>]+>/g,'').split(' ').slice(0,13).join(' ')}…</label>`).join('')}</div>
      </div>
      <div style="display:flex;flex-direction:column;min-height:0">
        <div class="roles">${[['❓','سؤال الـ Gist'],['🤝','المشاركة'],['🔄','تقييم الزملاء']].map((r,i)=>`<button class="role-tab ${i?'':'on'}" data-p="${i}"><span class="ri">${r[0]}</span>${r[1]}</button>`).join('')}</div>
        <div class="pane on" data-p="0"><p class="lbl">❓ سؤال Gist واحد من صياغتكم</p><textarea class="field q" rows="2" placeholder="ما الفكرة الأهم التي يريد الكاتب أن يوصلها في هذه الفقرة؟ …"></textarea>
          <p class="lbl">💎 تلخيصكم للفقرة (إجابتكم النموذجية)</p><textarea class="field mysum grow" rows="2" placeholder="الفقرة باختصار…"></textarea>
          <div class="row"><span class="sp"></span><button class="b b-ghost b-sm" data-go="1">التالي ←</button></div></div>
        <div class="pane" data-p="1"><p class="lbl">✋ من شارك في صياغة السؤال؟</p><div class="ppl"></div>
          <div class="row"><p class="lbl" style="margin:0">✍️ من كتب السؤال؟</p><select class="field writer" style="width:auto;flex:1"><option value="">اختر…</option></select></div>
          <div class="fb"><span class="e"></span><span class="m"></span></div>
          <div class="row" style="margin-top:auto"><span class="sp"></span><button class="b b-main handoff">🔄 سلّموا الجهاز لمجموعة أخرى</button></div></div>
        <div class="pane" data-p="2"><div class="fb info on"><span class="e">👋</span><span class="m">أهلًا بالمجموعة الزميلة! أجيبوا عن السؤال، ثم قيّموا تلخيص أصحابه.</span></div>
          <div class="row"><p class="lbl" style="margin:0">اسم مجموعتكم</p><input class="field pg" style="flex:1"></div>
          <div class="fb info on" style="font-weight:400"><span class="e">❓</span><span class="m pq"></span></div>
          <textarea class="field pans" rows="2" placeholder="إجابتكم عن السؤال…"></textarea>
          <div class="row"><p class="lbl" style="margin:0">⭐ قيّموا تلخيصهم:</p><span class="sp"></span><div class="stars">${[1,2,3,4,5].map(n=>`<button data-n="${n}">⭐</button>`).join('')}</div></div>
          <p class="muted psum" style="margin:0;font-size:13px;font-family:'Amiri',serif"></p>
          <div class="fb"><span class="e"></span><span class="m"></span></div>
          <div class="row" style="margin-top:auto"><span class="sp"></span><button class="b b-green sub">إرسال التقييم ✅</button></div></div>
      </div>
    </div></div>`);
  body.appendChild(s2); wireRoles(s2);
  $$('[data-go]',s2).forEach(b=>b.onclick=()=>activate(s2,+b.dataset.go));
  const sw2=Timer($('.tm',s2),0); let stars=0, handed=false;
  $('.role-tab[data-p="2"]',s2).addEventListener('click',e=>{ if(!handed){ e.stopImmediatePropagation(); toast('🔄 سلّموا الجهاز أولًا من تبويب «المشاركة»'); } },true);
  $$('.stars button',s2).forEach(b=>b.onclick=()=>{ stars=+b.dataset.n; $$('.stars button',s2).forEach(x=>x.classList.toggle('on',+x.dataset.n<=stars)); });
  $('.handoff',s2).onclick=()=>{ const fb=$('.fb',$('.handoff',s2).closest('.pane'));
    const pp=$('input[name=pp]:checked',s2), q=$('.q',s2).value.trim(), my=$('.mysum',s2).value.trim(), wr=$('.writer',s2).value, ppl=$$('.ppl input:checked',s2);
    if(!pp) return setFb(fb,'hint','📖','اختاروا فقرة من الفقرات المعروضة.');
    if(words(q).length<3){ activate(s2,0); return toast('❓ اكتبوا سؤال الـ Gist'); }
    if(!my){ activate(s2,0); return toast('💎 اكتبوا تلخيصكم للفقرة'); }
    if(!ppl.length) return setFb(fb,'hint','✋','حدّدوا من شارك.'); if(!wr) return setFb(fb,'hint','✍️','اختاروا من كتب السؤال.');
    handed=true; $('.pq',s2).innerHTML='<b>سؤالهم:</b> '+esc(q); $('.psum',s2).innerHTML='<b style="font-family:Tajawal">تلخيصهم:</b> '+esc(my);
    $('.role-tab[data-p="0"]',s2).classList.add('done'); $('.role-tab[data-p="1"]',s2).classList.add('done'); activate(s2,2); toast('🔄 الجهاز الآن مع المجموعة الزميلة'); };
  $('.sub',s2).onclick=()=>{ const fb=$('.fb',$('.sub',s2).closest('.pane')); const pg=$('.pg',s2).value.trim(), pans=$('.pans',s2).value.trim();
    if(!pg) return setFb(fb,'hint','👥','اكتبوا اسم مجموعتكم.'); if(!words(pans).length) return setFb(fb,'hint','✍️','أجيبوا عن السؤال أولًا.'); if(!stars) return setFb(fb,'hint','⭐','قيّموا التلخيص بالنجوم.');
    sw2.stop(); const pi=+$('input[name=pp]:checked',s2).value;
    log.acts.push({n:2,time:sw2.used,para:L.pages[pi].head+' (صفحة '+(pi+1)+' من النص)',question:$('.q',s2).value.trim(),summary:$('.mysum',s2).value.trim(),writer:$('.writer',s2).value,participants:$$('.ppl input:checked',s2).map(i=>i.value),peer:pg,peerAnswer:pans,stars});
    confetti(); finish(); };

  const s3=h(`<div class="screen"><div class="finale"><span class="medal">🏆</span><h3>أنجزتم الأنشطة الحرة!</h3><p class="muted who"></p><div class="stat-row"></div>
    <div class="wa-box"><p>📲 الخطوة الأخيرة: أرسلوا نشاطكم للباحثة</p>${WA_BTN}<span class="wa-ok">✅ اضغطوا «إرسال» في النافذة التي فُتحت لإتمام التسليم</span></div>
    <div class="row" style="flex-wrap:wrap;justify-content:center"><button class="b b-ghost dl">📥 تحميل سجل المجموعة</button><a class="b b-main" style="text-decoration:none" href="${next('selftest')}">إلى التقويم الختامي ←</a></div></div></div>`);
  body.appendChild(s3);
  function finish(){ const a1=log.acts[0], a2=log.acts[1]; const all=new Set([...(a1?.participants||[]),...(a2?.participants||[])]);
    $('.who',s3).textContent='مجموعة «'+group.name+'» — '+group.members.map(m=>m.name+' ('+m.role+')').join('، ');
    $('.stat-row',s3).innerHTML=`<div class="stat"><b>${AR(all.size)}/${AR(group.members.length)}</b><span>أعضاء شاركوا</span></div><div class="stat"><b>${AR(Math.round(((a1?.time||0)+(a2?.time||0))/60))} د</b><span>زمن العمل</span></div><div class="stat"><b>${a1?.verdict==='سمين'?'🍎':'🥀'} ${a1?.verdict||''}</b><span>حكمكم على المعلومة</span></div><div class="stat"><b>${'⭐'.repeat(a2?.stars||0)}</b><span>تقييم الزملاء</span></div>`;
    const names=group.members.map(m=>m.name), miss=p=>names.filter(n=>!(p||[]).includes(n)).join('، ')||'لا أحد';
    const wa=$('.wa',s3); wa.href=waLink(['📚 بيئة التعلم المعكوس — نمط الأنشطة الحرة','📖 الدرس: '+L.title+' ('+L.module+' — '+L.order+')','👥 المجموعة: '+group.name,
      '🙋 الأعضاء والأدوار: '+group.members.map(m=>m.name+' ('+m.role+')').join('، '),'🕒 '+stamp(),'',
      '━━ النشاط الحر (1): معلومة من السوشيال ميديا ━━','📱 المنصة: '+(a1?.platform||'غير محددة'),'📰 المعلومة: '+(a1?.info||''),'💎 التلخيص: '+(a1?.summary||''),
      '⚖️ الحكم: '+(a1?.verdict||''),'🤝 التبرير: '+(a1?.just||''),'✍️ كتب التبرير: '+(a1?.writer||''),'✋ شارك: '+(a1?.participants||[]).join('، ')+' | لم يشارك: '+miss(a1?.participants),
      '⏱ الزمن: '+mmss(a1?.time),'',
      '━━ النشاط الحر (2): سؤال Gist ━━','📖 الفقرة: '+(a2?.para||''),'❓ السؤال: '+(a2?.question||''),'💎 تلخيص المجموعة: '+(a2?.summary||''),'✍️ كتب السؤال: '+(a2?.writer||''),
      '✋ شارك: '+(a2?.participants||[]).join('، ')+' | لم يشارك: '+miss(a2?.participants),'🔄 المجموعة المقيِّمة: '+(a2?.peer||''),'💬 إجابة الزملاء: '+(a2?.peerAnswer||''),
      '⭐ تقييم الزملاء: '+(a2?.stars||0)+' من 5','⏱ الزمن: '+mmss(a2?.time)]);
    wa.onclick=()=>{ $('.wa-ok',s3).classList.add('on'); };
    addRecord({type:'free',L:L.id,at:stamp(),group,acts:log.acts}); markDone('activity'); go(3); }
  $('.dl',s3).onclick=()=>{ const head=['النمط','الدرس','التاريخ','المجموعة','الأعضاء والأدوار','النشاط','الزمن (ث)','من شارك','لم يشارك','من كتب التبرير/السؤال','المنصة/الفقرة','المعلومة/السؤال','التلخيص','الحكم','التبرير','مجموعة التقييم','إجابة الزملاء','تقييم الزملاء'];
    const rows=[head]; const names=group.members.map(m=>m.name);
    log.acts.forEach(a=>rows.push(['حر',L.title,stamp(),group.name,group.members.map(m=>m.name+' ('+m.role+')').join(' | '),a.n,a.time,a.participants.join(' | '),names.filter(n=>!a.participants.includes(n)).join(' | '),a.writer,a.platform??a.para,a.info??a.question,a.summary,a.verdict??'',a.just??'',a.peer??'',a.peerAnswer??'',a.stars??'']));
    downloadCSV('نشاط_حر_'+group.name,rows); };
  function go(n){ $$('.screen',body).forEach((s,j)=>s.classList.toggle('on',j===n));
    if(n===1||n===2){ const sc=n===1?s1:s2; $$('.ppl',sc).forEach(p=>p.innerHTML=pplBox()); $$('.writer',sc).forEach(s=>s.innerHTML='<option value="">اختر…</option>'+memOpts()); (n===1?sw1:sw2).start(); }
    runFit(); }
}

/* ---------- helpers for workspaces ---------- */
function wireRoles(sc){ $$('.role-tab',sc).forEach(t=>t.addEventListener('click',()=>activate(sc,+t.dataset.p))); }
function activate(sc,p){ $$('.role-tab',sc).forEach(t=>t.classList.toggle('on',+t.dataset.p===p)); $$('.pane',sc).forEach(x=>x.classList.toggle('on',+x.dataset.p===p)); runFit(); }
const FBT={ok:'أحسنت! ✔',bad:'انتبه ✖',hint:'حاول مرة أخرى 💪',info:'ملاحظة'};
function setFb(fb,cls,e,m,title){ fb.className='fb on '+cls; $('.e',fb).textContent=e; const t=title===undefined?FBT[cls]:title; $('.m',fb).innerHTML=(t?`<b class="fbt">${t}</b>`:'')+m; runFit(); }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function markPara(text,targets,key){
  const tg=new Set(targets.map(norm)); const ks=new Set((key||[]).map(norm));
  return text.split(' ').map(w=>{ const n=norm(w); const clean=w; if(tg.has(n)) return `<span class="tw">${clean}</span>`; if(ks.has(n)) return `<span class="key">${clean}</span>`; return clean; }).join(' ');
}

/* ---------- 5) التقويم الختامي (تكويني بدعم) ---------- */
function pFormative({L,body,markDone,next}){
  const Q=L.formative, SEC=L.formativeSeconds||90; const G=groupStore();
  const res=Q.map(()=>({tries:0,ok:false,pts:0,choice:null,just:'',time:0}));
  const start=h(`<div class="screen on"><div class="start-card"><span class="big">📝</span><h3>التقويم الختامي</h3>
    <p>${AR(Q.length)} أسئلة اختيار من متعدد. لكل سؤال <b>وقت محدد</b>، و<b>تبرير جماعي إجباري</b> مدعوم بدليل من النص. لو أخطأتم ستحصلون على <b>دعم</b> وفرصة ثانية.</p>
    <div class="rules"><span class="pill">⏱ ${AR(SEC)} ثانية لكل سؤال</span><span class="pill orange">✍️ تبرير جماعي إجباري</span><span class="pill green">💡 دعم عند الخطأ</span></div>
    <input class="field gname" placeholder="اسم المجموعة" value="${esc(G.name)}">
    <button class="b b-main go">ابدأ التقويم 🚀</button></div></div>`);
  body.appendChild(start);
  const sc=h(`<div class="screen"><div class="qz">
    <div class="qz-top"><div class="dots">${Q.map((_,i)=>`<i>${AR(i+1)}</i>`).join('')}</div><span class="sp"></span><span class="pill pink goal"></span><span class="tm"></span></div>
    <div class="qz-card"><p class="qz-q"></p><div class="qz-opts"></div>
      <div class="just"><p class="lbl">🤝 التبرير الجماعي <small style="font-weight:400;color:var(--ink-soft)">(إجباري — ادعموه بدليل من النص)</small></p><textarea class="field jt" rows="2" placeholder="اخترنا هذه الإجابة لأن النص قال: «…»"></textarea></div>
      <div class="fb"><span class="e"></span><span class="m"></span></div></div>
    <div class="qz-foot"><span class="muted cnt" style="font-size:13px;font-weight:700"></span><span class="sp"></span><button class="b b-main cfm">تأكيد الإجابة ✔</button><button class="b b-main nx" style="display:none">السؤال التالي ←</button></div>
  </div></div>`);
  body.appendChild(sc);
  const end=h(`<div class="screen"><div class="finale"><span class="medal">🎖️</span><h3>أنهيتم التقويم الختامي</h3><p class="muted who"></p><div class="stat-row"></div><p class="msg" style="font-weight:700;color:var(--teal-dark)"></p>
    <div class="row" style="flex-wrap:wrap;justify-content:center"><button class="b b-ghost dl">📥 تحميل النتيجة</button><a class="b b-main" style="text-decoration:none" href="${next('posttest')}">إلى الاختبار البعدي ←</a></div></div></div>`);
  body.appendChild(end);
  let gname='', i=0, sel=null, timer=null;
  $('.go',start).onclick=()=>{ gname=$('.gname',start).value.trim(); if(!gname) return toast('👥 اكتبوا اسم المجموعة'); store.set(KEY('group'),{...G,name:gname}); show(0); };
  const dots=$$('.dots i',sc), fb=$('.fb',sc), jt=$('.jt',sc);
  timer=Timer($('.tm',sc),SEC,{onEnd:()=>{ const q=Q[i]; if(!res[i].ok) setFb(fb,'hint','⏰','انتهى الوقت! إليكم دعمًا سريعًا: '+q.help); }});
  function show(n){ i=n; sel=null; const q=Q[i];
    $$('.screen',body).forEach(s=>s.classList.toggle('on',s===sc));
    dots.forEach((d,j)=>{ d.className= j===i?'cur': (j<i ? (res[j].pts===1?'ok':res[j].pts?'half':'no') : ''); });
    $('.goal',sc).textContent='🎯 '+q.goal; $('.cnt',sc).textContent='السؤال '+AR(i+1)+' من '+AR(Q.length);
    $('.qz-q',sc).innerHTML=`<span class="qn">${AR(i+1)}</span>${q.q}`;
    $('.qz-opts',sc).innerHTML=q.o.map((o,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${o}</button>`).join('');
    $$('.qz-opts .choice',sc).forEach(b=>b.onclick=()=>{ if(res[i].ok||res[i].tries>=2) return; $$('.qz-opts .choice',sc).forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); sel=+b.dataset.k; });
    jt.value=''; jt.disabled=false; fb.className='fb'; $('.cfm',sc).style.display=''; $('.nx',sc).style.display='none';
    timer.reset(SEC).start(); runFit(); }
  $('.cfm',sc).onclick=()=>{ const q=Q[i], r=res[i];
    if(sel===null) return setFb(fb,'info','👆','اختاروا إجابة أولًا.');
    if(words(jt.value).length<4) { jt.classList.add('shake'); setTimeout(()=>jt.classList.remove('shake'),450); return setFb(fb,'info','✍️','التبرير الجماعي إجباري: اكتبوا ٤ كلمات على الأقل، وادعموه بدليل من النص.'); }
    r.tries++; r.choice=sel; r.just=jt.value.trim();
    const btn=$(`.qz-opts .choice[data-k="${sel}"]`,sc);
    if(sel===q.c){ r.ok=true; r.pts=r.tries===1?1:.5; btn.classList.add('right'); btn.classList.remove('sel');
      setFb(fb,'ok',r.tries===1?'🌟':'👏',(r.tries===1?'إجابة صحيحة من أول محاولة! ':'أحسنتم، صححتم الإجابة! ')+q.why); done(); }
    else if(r.tries===1){ btn.classList.add('wrong','shake'); btn.classList.remove('sel'); btn.disabled=true; sel=null;
      setFb(fb,'hint','💡','<b>دعم:</b> '+q.help+' جرّبوا مرة أخرى وعدّلوا تبريركم.','إجابة غير صحيحة — إليكم مساعدة 💡'); }
    else { btn.classList.add('wrong'); btn.classList.remove('sel'); $(`.qz-opts .choice[data-k="${q.c}"]`,sc).classList.add('right');
      setFb(fb,'bad','📌','الإجابة الصحيحة هي ('+LET[q.c]+'). '+q.why,'الإجابة غير صحيحة ✖'); done(); }
  };
  function done(){ const r=res[i]; r.time=timer.used; timer.stop(); jt.disabled=true; $$('.qz-opts .choice',sc).forEach(b=>b.disabled=true);
    dots[i].className=r.pts===1?'ok':r.pts?'half':'no'; $('.cfm',sc).style.display='none'; const nx=$('.nx',sc); nx.style.display='';
    nx.textContent= i===Q.length-1?'عرض النتيجة 🏁':'السؤال التالي ←'; runFit(); }
  $('.nx',sc).onclick=()=>{ if(i<Q.length-1) show(i+1); else finish(); };
  function finish(){ const pts=res.reduce((a,r)=>a+r.pts,0), first=res.filter(r=>r.pts===1).length, second=res.filter(r=>r.pts===.5).length;
    $$('.screen',body).forEach(s=>s.classList.toggle('on',s===end));
    $('.who',end).textContent='مجموعة «'+gname+'»';
    $('.stat-row',end).innerHTML=`<div class="stat"><b>${AR(pts)}/${AR(Q.length)}</b><span>الدرجة</span></div><div class="stat"><b>${AR(first)}</b><span>صحيحة من أول محاولة</span></div><div class="stat"><b>${AR(second)}</b><span>صحيحة بعد الدعم</span></div><div class="stat"><b>${AR(Q.length-first-second)}</b><span>تحتاج مراجعة</span></div>`;
    const pct=pts/Q.length; $('.msg',end).textContent= pct>=.85?'🌟 ممتاز! تحقق هدف الدرس: أنتم قراء واعون تميزون الغث من السمين.':pct>=.6?'👏 جيد جدًا! راجعوا الأسئلة الحمراء في نص الدرس.':'💡 ارجعوا لنص الدرس والفيديو، ثم أعيدوا المحاولة.';
    if(pct>=.6) confetti();
    addRecord({type:'formative',L:L.id,at:stamp(),group:gname,res,pts}); markDone('selftest');
    $('.dl',end).onclick=()=>{ const rows=[['النمط','الدرس','التاريخ','المجموعة','رقم السؤال','الهدف المقاس','الاختيار','صحيح','عدد المحاولات','الدرجة','الزمن (ث)','التبرير الجماعي']];
      res.forEach((r,k)=>rows.push([MODE==='guided'?'موجّه':'حر',L.title,stamp(),gname,k+1,Q[k].goal,r.choice!=null?LET[r.choice]:'',LET[Q[k].c],r.tries,r.pts,r.time,r.just]));
      rows.push(['','','','','المجموع','','','','',pts]); downloadCSV('تقويم_ختامي_'+gname,rows); };
    runFit(); }
}

/* ---------- 6) الاختبار البعدي (بدون مساعدة) ---------- */
function pPost({L,body,markDone,next}){
  const Q=L.posttest; const G=groupStore(); const ans=Q.map(()=>null);
  const start=h(`<div class="screen on"><div class="start-card"><span class="big">🏁</span><h3>الاختبار البعدي</h3>
    <p>هذا هو <b>القياس النهائي</b> للدرس: ${AR(Q.length)} أسئلة، <b>بدون تلميح وبدون مساعدة</b>. أجب بتركيز، ويمكنك التنقل بين الأسئلة قبل التسليم.</p>
    <div class="rules"><span class="pill">🚫 لا تلميحات</span><span class="pill orange">🔒 لا تظهر الإجابات الصحيحة</span><span class="pill blue">✍️ السؤال الأخير مقالي</span></div>
    <div class="row" style="width:100%;max-width:520px"><input class="field sname" placeholder="اسم الطالب"><input class="field gname" placeholder="اسم المجموعة" value="${esc(G.name)}"></div>
    <button class="b b-main go">ابدأ الاختبار</button></div></div>`);
  body.appendChild(start);
  const sc=h(`<div class="screen"><div class="qz">
    <div class="qz-top"><div class="dots click">${Q.map((_,i)=>`<i data-i="${i}">${AR(i+1)}</i>`).join('')}</div><span class="sp"></span><span class="pill blue">🔒 اختبار بدون مساعدة</span></div>
    <div class="qz-card"><p class="qz-q"></p><div class="qz-opts"></div><div class="essay" style="display:none;flex:1;min-height:0;flex-direction:column;gap:6px">
      <textarea class="field et grow" placeholder="اكتب إجابتك في سطرين، وادعمها بدليل من النص…"></textarea></div></div>
    <div class="qz-foot"><button class="b b-ghost pv">→ السابق</button><span class="muted cnt" style="font-size:13px;font-weight:700"></span><span class="sp"></span><button class="b b-main nx">التالي ←</button><button class="b b-green fin">تسليم الاختبار ✅</button></div>
  </div></div>`);
  body.appendChild(sc);
  const end=h(`<div class="screen"><div class="finale"><span class="medal">🎓</span><h3>تم تسليم الاختبار البعدي</h3><p class="muted who"></p><div class="stat-row"></div>
    <div class="fb info on" style="max-width:640px"><span class="e">📋</span><span class="m"></span></div>
    <div class="row" style="flex-wrap:wrap;justify-content:center"><button class="b b-ghost dl">📥 تحميل ورقة الإجابة</button><button class="b b-main again">طالب جديد 👤</button></div></div></div>`);
  body.appendChild(end);
  let who={}, i=0;
  $('.go',start).onclick=()=>{ const s=$('.sname',start).value.trim(), g=$('.gname',start).value.trim(); if(!s) return toast('👤 اكتب اسمك أولًا'); who={s,g,t0:Date.now()}; show(0); };
  const dots=$$('.dots i',sc), et=$('.et',sc);
  dots.forEach(d=>d.onclick=()=>show(+d.dataset.i));
  et.oninput=()=>{ ans[i]=et.value.trim()||null; paint(); };
  function paint(){ dots.forEach((d,j)=>d.className= j===i?'cur':(ans[j]!=null?'ans':'')); }
  function show(n){ i=n; const q=Q[i]; $$('.screen',body).forEach(s=>s.classList.toggle('on',s===sc));
    $('.qz-q',sc).innerHTML=`<span class="qn">${AR(i+1)}</span>${q.q}`; $('.cnt',sc).textContent='السؤال '+AR(i+1)+' من '+AR(Q.length);
    const op=$('.qz-opts',sc), es=$('.essay',sc);
    if(q.essay){ op.style.display='none'; es.style.display='flex'; et.value=ans[i]||''; }
    else { es.style.display='none'; op.style.display=''; op.innerHTML=q.o.map((o,k)=>`<button class="choice ${ans[i]===k?'sel':''}" data-k="${k}"><span class="k">${LET[k]}</span>${o}</button>`).join('');
      $$('.choice',op).forEach(b=>b.onclick=()=>{ ans[i]=+b.dataset.k; $$('.choice',op).forEach(x=>x.classList.toggle('sel',x===b)); paint(); if(i<Q.length-1) setTimeout(()=>show(i+1),350); }); }
    $('.pv',sc).disabled=i===0; $('.nx',sc).style.display=i===Q.length-1?'none':''; paint(); runFit(); }
  $('.pv',sc).onclick=()=>show(i-1); $('.nx',sc).onclick=()=>show(i+1);
  $('.fin',sc).onclick=()=>{ const miss=ans.map((a,k)=>a==null?k:-1).filter(k=>k>=0);
    if(miss.length){ toast('باقي '+AR(miss.length)+' '+(miss.length>2?'أسئلة':'سؤال')+' بدون إجابة'); return show(miss[0]); }
    const mcq=Q.filter(q=>!q.essay), score=Q.reduce((a,q,k)=>a+(!q.essay&&ans[k]===q.c?1:0),0), mins=Math.round((Date.now()-who.t0)/60000);
    $$('.screen',body).forEach(s=>s.classList.toggle('on',s===end));
    $('.who',end).textContent=who.s+(who.g?' — مجموعة «'+who.g+'»':'');
    $('.stat-row',end).innerHTML=`<div class="stat"><b>${AR(score)}/${AR(mcq.length)}</b><span>درجة الاختيار من متعدد</span></div><div class="stat"><b>${AR(mins)} د</b><span>زمن الاختبار</span></div><div class="stat"><b>✍️</b><span>السؤال المقالي: يصححه المعلم</span></div>`;
    const es=Q.find(q=>q.essay); $('.m',end).innerHTML='<b>معيار تصحيح السؤال المقالي:</b> '+(es?es.rubric:'');
    addRecord({type:'post',L:L.id,at:stamp(),student:who.s,group:who.g,ans,score}); markDone('posttest');
    $('.dl',end).onclick=()=>{ const rows=[['النمط','الدرس','التاريخ','الطالب','المجموعة','رقم السؤال','إجابة الطالب','الإجابة الصحيحة','صحيح؟']];
      Q.forEach((q,k)=>rows.push([MODE==='guided'?'موجّه':'حر',L.title,stamp(),who.s,who.g,k+1,q.essay?ans[k]:LET[ans[k]],q.essay?'يصحح بالمعيار':LET[q.c],q.essay?'':(ans[k]===q.c?'نعم':'لا')]));
      rows.push(['','','','','','الدرجة (اختيار من متعدد)',score+' / '+mcq.length]); downloadCSV('اختبار_بعدي_'+who.s,rows); };
    runFit(); };
  $('.again',end).onclick=()=>location.reload();
}

/* =========================================================
   LEGACY PAGES (الدروس الأخرى): عرض سؤال واحد في كل مرة
   ========================================================= */
function legacyPager(){
  const form=$('#quizForm'); if(!form) return;
  const cards=$$('.quiz-card',form); if(cards.length<1) return;
  const body=form.closest('.lesson-body'); const wrap=h('<div class="qp-wrap"></div>');
  form.parentNode.insertBefore(wrap,form); wrap.appendChild(form);
  const rc=$('#resultCard'); if(rc){ wrap.appendChild(rc); }
  const grade=$('.btn-grade',form);
  const nav=h(`<div class="qp-nav"><button type="button" class="b b-ghost b-sm pv">→ السابق</button><div class="qp-dots">${cards.map(()=>'<i></i>').join('')}</div><button type="button" class="b b-main b-sm nx">التالي ←</button></div>`);
  form.appendChild(nav); nav.appendChild(grade);
  let i=0; const dots=$$('.qp-dots i',nav);
  function show(n){ i=n; cards.forEach((c,j)=>c.classList.toggle('on',j===i)); dots.forEach((d,j)=>{ d.classList.toggle('on',j===i); d.classList.toggle('ans',!!$('input:checked',cards[j])); });
    $('.pv',nav).disabled=i===0; $('.nx',nav).style.display=i===cards.length-1?'none':''; grade.style.display=i===cards.length-1?'':'none'; fit(); }
  $('.pv',nav).onclick=()=>show(i-1); $('.nx',nav).onclick=()=>show(i+1);
  cards.forEach(c=>c.addEventListener('change',()=>show(i)));
  dots.forEach((d,j)=>{ d.style.cursor='pointer'; d.onclick=()=>show(j); });
  grade.addEventListener('click',()=>setTimeout(()=>{ fit(); },30));
  const fit=()=>requestAnimationFrame(()=>fitZoom(body));
  window.addEventListener('resize',fit); show(0);
}
// any other lesson page: guard against overflow
function legacyNav(){
  // صفحات الدروس الأخرى
  const mm=location.pathname.match(/Lesson(\d+)_(\w+)\.html/);
  if(mm && !app){ const id=+mm[1], cur=mm[2]; const hd=$('.lesson-header'); const lay=$('.lesson-layout');
    const mn=$('main'); if(mn){ mn.classList.remove('wrap'); mn.classList.add('lesson-main'); }
    $$('.lesson-tabs a').forEach(a=>{ [...a.childNodes].forEach(n=>{ if(n.nodeType===3&&n.textContent.trim()){ const sp=document.createElement('span'); sp.className='lbl-t'; sp.textContent=n.textContent.trim(); n.replaceWith(sp); } }); });
    if(hd){ hd.insertAdjacentHTML('beforeend',lessonNavHTML(id)+'<div class="prog-slim"><span></span><em><i></i></em></div>'); wireLessonNav(hd,id); }
    const dk=KEY('done_L'+id), dn=new Set(store.get(dk,[])); if(/[?&]reset/.test(location.search)) dn.clear();
    const LT=[{k:'aims',t:'أهداف الدرس'},{k:'content',t:'محتوى الدرس'},{k:'activity',t:'النشاط التعليمي'},{k:'selftest',t:'التقويم الذاتي'}];
    const LG=guardSteps({id,steps:LT,isDone:k=>dn.has(k),cur,keyOf:k=>'l_'+k});
    if(!LG.blocked) dn.add(cur); store.set(dk,[...dn]); setTimeout(LG.paint,0);
    const tb=$('.lesson-tabs'); if(tb){ tb.insertAdjacentHTML('afterbegin',progHTML(4));
      $$('a',tb).forEach(a=>{ const k=(a.getAttribute('href')||'').match(/_(\w+)\.html/); if(k&&dn.has(k[1])) a.classList.add('done'); }); }
    paintProg(document,['aims','content','activity','selftest'].filter(k=>dn.has(k)).length,4);
    const T=[{k:'aims',t:'أهداف الدرس'},{k:'content',t:'محتوى الدرس'},{k:'activity',t:'النشاط التعليمي'},{k:'selftest',t:'التقويم الذاتي'}];
    if(lay){ lay.insertAdjacentHTML('afterend',footHTML(T,cur,id)); const nl=$('.lesson-foot .nl'); if(nl) nl.onclick=e=>{ e.preventDefault(); $('.lnav .ln').click(); }; }
  }
  // صفحات الوحدات
  const mo=location.pathname.match(/module(\d)\.html/);
  if(mo){ const n=+mo[1]; const g=$('.grid3'); if(g){
    g.insertAdjacentHTML('afterend',`<div class="mnav"><button class="mp" ${n<=1?'disabled':''}>→ الموديول السابق</button><a class="mid" href="content.html">🏠 كل الوحدات</a><button class="mn" ${n>=3?'disabled':''}>الموديول التالي ←</button></div>`);
    ses.set('M'+n);
    const go=t=>askPw('الموديول '+['','الأول','الثاني','الثالث'][t]+': '+MODS[t],PW_M[t],'M'+t,`module${t}.html`);
    $('.mnav .mp').onclick=()=>go(n-1); $('.mnav .mn').onclick=()=>go(n+1); } }
}
if(!app && !$('.lesson-body')){ const m=$('main'); if(m){ const f=()=>fitZoom(m); window.addEventListener('resize',f); requestAnimationFrame(f); } }
if(!app){ const lb=$('.lesson-body'); if(lb && !$('#quizForm')){ const f=()=>fitZoom(lb); window.addEventListener('resize',f); requestAnimationFrame(f); } }
})();
