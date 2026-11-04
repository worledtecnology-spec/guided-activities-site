/* =========================================================
   مكوّنات الدروس الجديدة (الإصدار 2)
   أهداف + إنفوجرافيك، تصويت التهيئة، فيديو بصوت المعلمة ووقفات،
   صندوق مراقبة الفهم، الأنشطة (موجهة/حرة)، تذكرة الخروج، ثمرة قراءتي
   ========================================================= */
(function(){
'use strict';
const F=window.FL; if(!F) return;
const {h,$,$$,esc,AR,LET,toast,confetti,setFb,store,KEY,MODE,runFit,R}=F;
const DB=()=>window.FLDB;
const save=(L,step,data)=>{ try{ DB()&&DB().saveResponse(L.id,step,data); }catch(e){} };
const isG=MODE==='guided';
const nextBtn=(ctx,label)=>ctx.nextStep?`<a class="b b-main nxs" style="text-decoration:none" href="${ctx.nextStep.href}">${label||('التالي: '+ctx.nextStep.t)} ←</a>`:'';
const goNext=ctx=>{ if(ctx.nextStep) location.href=ctx.nextStep.href+'#p='+store.get(KEY('done_L'+ctx.L.id),[]).join('.'); };
const pick=v=>(v&&typeof v==='object'&&('free' in v||'guided' in v))?v[MODE]:v;

/* ---------- عناصر مشتركة ---------- */
function lightbox(src,cap){
  const m=h(`<div class="lb"><div class="lb-in"><img src="${src}" alt=""><button class="lb-x" title="إغلاق">✕</button><a class="lb-dl" href="${src}" download title="تحميل الصورة">⬇️ تحميل</a>${cap?`<p>${cap}</p>`:''}</div></div>`);
  document.body.appendChild(m); const img=$('img',m);
  img.onclick=e=>{ e.stopPropagation(); m.classList.toggle('zoom'); };
  m.onclick=e=>{ if(e.target===m||e.target.classList.contains('lb-x')) m.remove(); };
}
F.lightbox=lightbox;
function sosModal(sos){
  const m=h(`<div class="sos-pop"><div class="sos-card"><div class="sos-h"><span class="sos-badge">SOS</span><h3>${sos.title||'كارت المساعدة'}</h3><button class="b b-ghost b-sm x">✕</button></div>
    ${sos.img?`<img class="sos-img" src="${sos.img}" alt="">`:''}<div class="sos-list">${sos.items.map(it=>`<div class="sos-it"><b>${it.t}</b><span>${it.d}</span></div>`).join('')}</div></div></div>`);
  document.body.appendChild(m); $('.x',m).onclick=()=>m.remove(); m.onclick=e=>{ if(e.target===m) m.remove(); };
}
function sosBtn(L){ const s=L.sos&&L.sos[MODE]; return s?'<button class="b b-sos sosb">🆘 كارت المساعدة</button>':''; }
function wireSos(el,L){ const b=$('.sosb',el); if(b) b.onclick=()=>{ sosModal(L.sos[MODE]); save(L,'sos-open',{at:Date.now()}); }; }

/* ---------- مسجّل صوت + ملفات (تُرسل للباحثة عبر واتساب بدل رفعها) ---------- */
const WA_NUM=(window.SITE&&window.SITE.whatsapp)||'201032688516';
function mediaBox(att,folder,onChange,meta){
  const box=h(`<div class="att"></div>`); const files=[]; let sent=false;
  const all=()=>files.flat().filter(Boolean);
  const sendRow=h(`<div class="att-send" style="display:none"><button class="b b-wa b-sm snd">📤 إرسال الملفات</button><span class="att-st muted"></span></div>`);
  const paint=()=>{ sendRow.style.display=all().length?'flex':'none'; $('.att-st',sendRow).textContent=sent?'✅ تم فتح واتساب للإرسال':'لم تُرسل بعد'; onChange&&onChange(files); };
  const caption=()=>{ const u=(window.FLDB&&FLDB.user&&FLDB.user())||{}; return ['📚 بيئة التعلم المعكوس — '+(MODE==='free'?'الأنشطة الحرة':'الأنشطة الموجهة'),
    '👤 الطالب: '+(u.name||'')+(u.username?' ('+u.username+')':''),(meta&&meta())||'','📎 الملفات: '+all().map(f=>f.name).join('، ')].filter(Boolean).join('\n'); };
  const dl=f=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(f.file); a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1500); };
  $('.snd',sendRow).onclick=async()=>{ const list=all(); if(!list.length) return; const fs=list.map(f=>f.file); const text=caption();
    try{ if(navigator.canShare&&navigator.canShare({files:fs})){ await navigator.share({files:fs,text,title:'نشاط الطالب'}); sent=true; paint(); toast('✅ اختر واتساب ثم محادثة الباحثة'); return; } }
    catch(e){ if(e&&e.name==='AbortError') return; }
    // الكمبيوتر: تنزيل الملفات ثم فتح محادثة الباحثة لإرفاقها
    list.forEach(dl); window.open('https://wa.me/'+WA_NUM+'?text='+encodeURIComponent(text+'\n(الملفات مرفقة 👇)'),'_blank');
    sent=true; paint(); toast('⬇️ تم تنزيل الملفات… أرفقها في محادثة واتساب التي فُتحت',5000); };
  att.forEach((a,ai)=>{
    if(a.kind==='audio'){
      const r=h(`<div class="att-row rec"><span class="att-l">🎙️ ${a.label||'سجّل صوتك'}</span><button class="b b-sm b-rec">● تسجيل</button><span class="rec-t">${AR(0)}/${AR(a.max||45)} ث</span><span class="att-ok"></span></div>`);
      box.appendChild(r); let mr=null,chunks=[],t=0,iv=null;
      const btn=$('.b-rec',r), tt=$('.rec-t',r), ok=$('.att-ok',r);
      const stop=()=>{ if(mr&&mr.state!=='inactive') mr.stop(); clearInterval(iv); btn.textContent='● تسجيل من جديد'; btn.classList.remove('on'); };
      btn.onclick=async()=>{
        if(mr&&mr.state==='recording'){ stop(); return; }
        if(!navigator.mediaDevices||!window.MediaRecorder){ toast('المتصفح لا يدعم التسجيل… سجّل على واتساب مباشرة'); return; }
        try{ const st=await navigator.mediaDevices.getUserMedia({audio:true}); chunks=[]; mr=new MediaRecorder(st);
          mr.ondataavailable=e=>chunks.push(e.data);
          mr.onstop=()=>{ st.getTracks().forEach(x=>x.stop()); const type=mr.mimeType||'audio/webm'; const ext=type.includes('mp4')?'m4a':type.includes('ogg')?'ogg':'webm';
            const blob=new Blob(chunks,{type}); const name='تسجيل_'+(folder||'')+'.'+ext;
            files[ai]={kind:'audio',sec:t,name,size:blob.size,type,file:new File([blob],name,{type})}; sent=false;
            ok.innerHTML=`✅ <audio controls src="${URL.createObjectURL(blob)}"></audio>`; paint(); };
          mr.start(); t=0; btn.textContent='■ إيقاف'; btn.classList.add('on');
          iv=setInterval(()=>{ t++; tt.textContent=AR(t)+'/'+AR(a.max||45)+' ث'; if(t>=(a.max||45)) stop(); },1000); }
        catch(e){ toast('اسمح للمتصفح باستخدام الميكروفون 🎙️'); }
      };
    } else {
      const acc=a.kind==='photo'?'image/*':a.kind==='video'?'video/*':'image/*,video/*,audio/*';
      const r=h(`<div class="att-row"><span class="att-l">${a.kind==='video'?'🎥':'📷'} ${a.label}</span><label class="b b-sm b-ghost">📎 اختيار ${a.kind==='video'?'فيديو':'صورة'}<input type="file" accept="${acc}" ${a.n>1?'multiple':''} hidden></label><span class="att-ok"></span></div>`);
      box.appendChild(r); const inp=$('input',r), ok=$('.att-ok',r);
      inp.onchange=()=>{ const fl=[...inp.files].slice(0,a.n||1); if(!fl.length) return;
        files[ai]=fl.map(f=>({kind:a.kind,name:f.name,size:f.size,type:f.type,file:f})); sent=false;
        ok.innerHTML='✅ '+fl.map(f=>f.type.startsWith('image')?`<img src="${URL.createObjectURL(f)}">`:'🎞️ '+esc(f.name)).join(' '); paint(); };
    }
  });
  if(att.length){ box.appendChild(sendRow); box.appendChild(h(`<p class="muted att-note">📌 الصور والفيديوهات والتسجيلات تُرسل للباحثة على واتساب ولا تُرفع على المنصة.</p>`)); }
  box.getFiles=()=>all().map(f=>({kind:f.kind,name:f.name,size:f.size,type:f.type,sec:f.sec,via:'whatsapp',sent}));
  box.isSent=()=>sent||!all().length;
  return box;
}


/* ---------- قارئ المقالات الإثرائية ---------- */
const artUrl=L=>new URL('../articles/L'+L.id+'.html',location.href).href;
function qrImg(u){ try{ const q=qrcode(0,'M'); q.addData(u); q.make(); return `<img class="qr-img" src="${q.createDataURL(4,6)}" alt="QR">`; }catch(e){ return ''; } }
function articleModal(L,A){
  const m=h(`<div class="sos-pop art-pop"><div class="sos-card art-card"><div class="sos-h"><span class="xp-ic">📰</span><h3>${A.title}</h3><button class="b b-ghost b-sm x">✕</button></div>
    <div class="art-body">${A.html}${A.poll?`<div class="art-poll"><h4>${A.pollTitle||"🏆 سؤال تحدي"}</h4>${A.poll.map((q,k)=>`<div class="apq" data-k="${k}"><p class="apq-q">${q.q}</p>${q.o.map((o,j)=>`<button class="choice" data-j="${j}">${o}</button>`).join('')}</div>`).join('')}${A.pollNote?`<p class="art-sum apn" style="display:none">${A.pollNote}</p>`:''}</div>`:''}${A.tasks?`<div class="art-poll art-tasks">${A.tasks.map((q,k)=>`<div class="apq" data-t="${k}"><p class="apq-q">${q.q}</p><textarea class="field" rows="3" placeholder="اكتب إجابتك هنا…"></textarea></div>`).join('')}<button class="b b-green ats">💾 حفظ إجاباتي</button></div>`:''}</div>
    <div class="art-foot">${qrImg(artUrl(L))}<span class="muted">📱 امسح الكود لقراءة المقال على موبايلك</span><span class="sp"></span>${A.url?`<a class="b b-ghost b-sm" href="${A.url}" target="_blank" rel="noopener" style="text-decoration:none">🔗 المصدر الأصلي</a>`:''}<a class="b b-main b-sm" href="${artUrl(L)}" target="_blank" rel="noopener" style="text-decoration:none">↗️ افتح في صفحة مستقلة</a></div></div></div>`);
  document.body.appendChild(m); const close=()=>m.remove(); $('.x',m).onclick=close; m.onclick=e=>{ if(e.target===m) close(); };
  save(L,'article-open',{title:A.title});
  const PK=KEY('artpoll_L'+L.id+'_'+A.title.length), prev=store.get(PK,{});
  if(A.tasks){ const TK=KEY('arttask_L'+L.id), tv=store.get(TK,[]); $$('.art-tasks textarea',m).forEach((t,k)=>t.value=tv[k]||'');
    $('.ats',m).onclick=()=>{ const v=$$('.art-tasks textarea',m).map(t=>t.value.trim()); if(v.some(x=>!x)) return toast('✍️ أجب عن كل الأسئلة');
      store.set(TK,v); save(L,'article-tasks',{article:A.title,answers:A.tasks.map((q,k)=>({q:q.q,a:v[k]}))}); toast('✅ تم حفظ إجاباتك'); confetti(30); }; }
  const showNote=()=>{ const n=$('.apn',m); if(n&&A.poll.every((q,k)=>q.c!=null||prev[k]!=null)) n.style.display=''; };
  $$('.apq[data-k]',m).forEach(qe=>{ const k=+qe.dataset.k; const mark=j=>$$('.choice',qe).forEach((b,i)=>b.classList.toggle('sel',i===j));
    if(prev[k]!=null) mark(prev[k]);
    const fb=h('<div class="fb"><span class="e"></span><span class="m"></span></div>'); qe.appendChild(fb); const Q=A.poll[k];
    const judge=j=>{ if(Q.c==null) return; $$('.choice',qe).forEach((b,i)=>{ b.classList.toggle('right',i===Q.c&&j===Q.c); b.classList.toggle('wrong',i===j&&j!==Q.c); });
      setFb(fb,j===Q.c?'ok':'hint',j===Q.c?'🌟':'💡',j===Q.c?(Q.ok||'أحسنت!'):(Q.no||'حاول مرة أخرى'),j===Q.c?'إجابة صحيحة ✔':'فكّر مرة أخرى'); };
    if(prev[k]!=null) judge(prev[k]);
    showNote();
    $$('.choice',qe).forEach(b=>b.onclick=()=>{ const j=+b.dataset.j; mark(j); prev[k]=j; store.set(PK,prev); judge(j); showNote(); save(L,'article-poll',{article:A.title,q:Q.q,answer:Q.o[j],correct:Q.c==null?undefined:j===Q.c}); if(Q.c==null) toast('✅ تم حفظ إجابتك'); }); });
}
/* ---------- شرح المعلمة الصوتي ---------- */
function explainModal(L,src){
  const m=h(`<div class="sos-pop xp-pop"><div class="sos-card xp-card"><div class="sos-h"><span class="xp-ic">👩‍🏫</span><h3>شرح المعلمة لدرس «${L.title}»</h3><button class="b b-ghost b-sm x">✕</button></div>
    <p class="muted" style="margin:0 0 8px;font-weight:700">استمع لشرح المعلمة للدرس: شفت… فهمت… طبّقت 🎧</p>
    <audio controls preload="metadata" src="${src}" style="width:100%"></audio>
    <div class="row" style="margin-top:10px"><a class="b b-ghost b-sm" href="${src}" download style="text-decoration:none">⬇️ تحميل الشرح للاستماع بدون إنترنت</a></div></div></div>`);
  document.body.appendChild(m); const au=$('audio',m); au.play().catch(()=>{});
  const close=()=>{ au.pause(); m.remove(); }; $('.x',m).onclick=close; m.onclick=e=>{ if(e.target===m) close(); };
  save(L,'explain-open',{at:Date.now()});
}
/* ---------- مجموعات اختيار (رقائق) داخل النشاط ---------- */
function picksHTML(a){ return (a.picks||[]).map((g,gi)=>`<div class="pkg" data-g="${gi}"><span class="fl-l">${g.label}</span><div class="pkg-o">${g.o.map((o,j)=>`<button class="pkc" data-j="${j}">${o}</button>`).join('')}</div></div>`).join(''); }
function wirePicks(bd,a){ $$('.pkg',bd).forEach(g=>$$('.pkc',g).forEach(b=>b.onclick=()=>{ $$('.pkc',g).forEach(x=>x.classList.toggle('on',x===b)); })); }
function readPicks(bd,a){ return (a.picks||[]).map((g,gi)=>{ const on=$(`.pkg[data-g="${gi}"] .pkc.on`,bd); return {label:g.label,value:on?g.o[+on.dataset.j]:''}; }); }

/* ---------- سحب/اختيار البطاقات إلى خانات ---------- */
function sorter({cards,targets,multi,onPlace}){
  // targets: [{key,label,cls}] ; cards: [{t,key}]
  const el=h(`<div class="srt ${multi?'bins':'slots'}"><div class="srt-bank"></div><div class="srt-targets">${targets.map((t,i)=>`<div class="srt-t ${t.cls||''}" data-k="${i}"><span class="srt-tl">${t.label}</span><div class="srt-drop"></div></div>`).join('')}</div></div>`);
  const bank=$('.srt-bank',el); let sel=null;
  const cardsEl=F.shuffle(cards.map((c,i)=>({...c,i}))).map(c=>{ const b=h(`<button class="srt-c" draggable="true" data-i="${c.i}">${c.t}</button>`); bank.appendChild(b); return b; });
  const place=(cardEl,ti)=>{ const drop=$(`.srt-t[data-k="${ti}"] .srt-drop`,el);
    if(!multi){ const ex=drop.querySelector('.srt-c'); if(ex&&ex!==cardEl) bank.appendChild(ex); }
    drop.appendChild(cardEl); cardEl.classList.remove('sel','ok','no'); sel=null; onPlace&&onPlace(); };
  cardsEl.forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); if(b.parentElement!==bank&&!b.classList.contains('sel')&&sel==null){ /* pick from target back */ }
      $$('.srt-c.sel',el).forEach(x=>x.classList.remove('sel')); if(sel===b){ sel=null; return; } sel=b; b.classList.add('sel'); };
    b.addEventListener('dragstart',e=>{ e.dataTransfer.setData('text/plain',b.dataset.i); sel=b; }); });
  $$('.srt-t',el).forEach(t=>{ t.onclick=()=>{ if(sel) place(sel,+t.dataset.k); else toast('👆 اضغط البطاقة أولًا ثم اضغط مكانها'); };
    t.addEventListener('dragover',e=>{ e.preventDefault(); t.classList.add('over'); }); t.addEventListener('dragleave',()=>t.classList.remove('over'));
    t.addEventListener('drop',e=>{ e.preventDefault(); t.classList.remove('over'); const c=cardsEl.find(x=>x.dataset.i===e.dataTransfer.getData('text/plain')); if(c) place(c,+t.dataset.k); }); });
  bank.onclick=()=>{ if(sel&&sel.parentElement!==bank){ bank.appendChild(sel); sel.classList.remove('sel'); sel=null; onPlace&&onPlace(); } };
  el.state=()=>cards.map((c,i)=>{ const b=cardsEl.find(x=>+x.dataset.i===i); const t=b.closest('.srt-t'); return t?+t.dataset.k:-1; });
  el.allPlaced=()=>el.state().every(x=>x>=0);
  el.mark=(answers)=>{ let ok=0; cards.forEach((c,i)=>{ const b=cardsEl.find(x=>+x.dataset.i===i); const st=el.state()[i];
      const good=targets[st]&&targets[st].key===c.key; b.classList.toggle('ok',good); b.classList.toggle('no',!good&&st>=0); if(good) ok++; }); return ok; };
  el.cardsEl=cardsEl;
  return el;
}

/* =========================================================
   1) الأهداف + الإنفوجرافيك
   ========================================================= */
R.aims=function(ctx){ const {L,body,markDone,TABS,next}=ctx;
  const G=L.gallery||[];
  body.appendChild(h(`<div class="screen on"><div class="aims2">
    <div class="a2-main">
      <div class="main-aim"><span class="big">${L.icon||'🎯'}</span><div><b style="color:#fff;font-size:1.05em">في هذا الدرس</b><ul class="a2-sum">${(L.summary||[]).map(x=>`<li>${x}</li>`).join('')}</ul></div></div>
      <p class="a2-h">🧠 مهارات القراءة التشاركية المستهدفة</p>
      <div class="a2-skills">${(L.skills||[]).map((s,i)=>`<div class="aim"><span class="ai">${s.i||['🔍','🧩','🎯','⚖️'][i%4]}</span><b>${s.t}</b>${s.d?`<span>${s.d}</span>`:''}</div>`).join('')}</div>
    </div>
    ${G.length?`<div class="a2-gal"><div class="a2-tabs">${G.map((g,i)=>`<button class="${i?'':'on'}" data-i="${i}">${g.label}</button>`).join('')}</div>
      <div class="a2-view">${G.map((g,i)=>g.article?`<figure class="art-cover ${i?'':'on'}" data-i="${i}"><span class="ac-ic">${g.icon||'📰'}</span><span class="ac-k">${g.article.kicker||'مقال إثرائي'}</span><b class="ac-t">${g.article.title}</b><span class="b b-main ac-go">📖 اقرأ المقال</span><span class="ac-qrw">${qrImg(artUrl(L))}<small>📱 امسح الكود لقراءة المقال على الموبايل</small></span></figure>`
        :`<figure class="${i?'':'on'}" data-i="${i}"><img src="${g.src}" alt="${esc(g.label)}"><figcaption>🔍 اضغط للتكبير</figcaption></figure>`).join('')}</div></div>`:''}
  </div>
  <div class="journey">${TABS.filter(t=>t.k!=='aims').map((t,i)=>`${i?'<span class="arr">←</span>':''}<a class="j" href="${next(t.k)}"><span class="c">${t.i}</span>${t.t}</a>`).join('')}
    ${nextBtn(ctx,'ابدأ')}</div></div>`));
  const sc=$('.screen',body);
  $$('.a2-tabs button',sc).forEach(b=>b.onclick=()=>{ $$('.a2-tabs button',sc).forEach(x=>x.classList.toggle('on',x===b)); $$('.a2-view figure',sc).forEach(f=>f.classList.toggle('on',f.dataset.i===b.dataset.i)); });
  $$('.a2-view figure',sc).forEach(f=>f.onclick=()=>{ const g=G[+f.dataset.i]; if(g.article) articleModal(L,g.article); else lightbox(g.src,g.label); });
  markDone('aims');
};

/* =========================================================
   2) التهيئة: صورة + تصويت/توقع ونتائج الفصل
   ========================================================= */
R.warmup=function(ctx){ const {L,body,markDone}=ctx; const V=L.vote;
  const voted=store.get(KEY('vote_L'+L.id),null);
  const imgOpts=V.type==='images';
  body.appendChild(h(`<div class="screen on"><div class="wu ${imgOpts?'wu-img2':''}">
    ${imgOpts?'':`<div class="wu-img"><img src="${V.img}" alt=""><span class="stage-tag">💡 التهيئة</span></div>`}
    <div class="wu-side">
      <span class="pill orange">${V.tag||'🗳️ صوّت على المنصة'}</span>
      ${V.intro?`<p class="wu-sub" style="font-weight:600">${V.intro}</p>`:''}
      <p class="wu-q">${V.q}</p>
      ${imgOpts?`<div class="vote-imgs">${V.options.map((o,k)=>`<button class="vimg" data-k="${k}"><img src="${o.img}" alt="">${o.big?`<span class="vbig">${o.big}</span>`:''}<span class="vh">${o.e||'❤️'} ${o.t}</span><span class="vbar"><i></i><b></b></span></button>`).join('')}</div>`
        :`<div class="vote-opts">${V.options.map((o,k)=>`<button class="choice vopt" data-k="${k}"><span class="k">${o.e||LET[k]}</span><span class="vt">${o.t}</span><span class="vbar"><i></i><b></b></span></button>`).join('')}</div>`}
      <div class="fb"><span class="e"></span><span class="m"></span></div>
      <div class="reveal2" style="display:none"><span class="pill green">🎉 ${V.revealLabel||'عنوان درسنا اليوم'}</span><p class="reveal-title">${L.title}</p>${V.reveal?`<p class="wu-sub">${V.reveal}</p>`:''}</div>
      <div class="wu-nav"><span class="muted vc" style="font-size:13px;font-weight:700"></span><span class="sp"></span>${nextBtn(ctx,'شاهد الفيديو')}</div>
    </div></div></div>`));
  const sc=$('.screen',body), nb=$('.nxs',sc); if(nb) nb.style.display='none';
  const btns=$$('[data-k]',sc);
  async function showResults(choice){
    btns.forEach(b=>{ b.disabled=true; b.classList.toggle('sel',+b.dataset.k===choice); });
    let c={}; try{ c=await DB().voteCounts(L.id); }catch(e){}
    if(!Object.keys(c).length) c={[choice]:1};
    const tot=Object.values(c).reduce((a,b)=>a+b,0)||1;
    btns.forEach(b=>{ const k=+b.dataset.k, n=c[k]||0, pct=Math.round(n/tot*100); b.classList.add('res'); $('.vbar i',b).style.width=pct+'%'; $('.vbar b',b).textContent=AR(pct)+'٪'; });
    $('.vc',sc).textContent='🗳️ صوّت '+AR(tot)+' من زملائك';
    if(V.correct!=null){ const ok=choice===V.correct; btns.forEach(b=>{ if(+b.dataset.k===V.correct) b.classList.add('right'); });
      setFb($('.fb',sc),ok?'ok':'info',ok?'🌟':'💡',ok?(V.ok||'توقع صحيح!'):(V.no||''),ok?'توقعك صحيح ✔':'فكرة جميلة… تعالَ نكتشف'); }
    else if(V.after) setFb($('.fb',sc),'info','💭',V.after,'');
    $('.reveal2',sc).style.display='flex'; if(nb) nb.style.display='inline-flex'; markDone('warmup'); runFit();
  }
  btns.forEach(b=>b.onclick=async()=>{ const k=+b.dataset.k; store.set(KEY('vote_L'+L.id),k);
    try{ await DB().vote(L.id,k); }catch(e){} save(L,'warmup-vote',{choice:k,label:V.options[k].t}); confetti(40); showResults(k); });
  if(voted!=null) showResults(voted);
};

/* =========================================================
   3) الفيديو التفاعلي بصوت المعلمة + الوقفات
   ========================================================= */
R.video2=function(root,ctx){ const {L,markDone}=ctx; const V=L.video2, S=V.segments;
  const all=S.reduce((a,s)=>a+s.dur,0);
  const resKey=KEY('vstop_L'+L.id); const res=store.get(resKey,{});
  let reached=Math.min(S.length-1,Object.keys(res).length);
  root.innerHTML=`
   <div class="iv-frame">
     <div class="iv-bg"><img alt="" src="${V.bg}" class="in pan-r"></div><div class="iv-shade"></div>
     <div class="iv-top"><span class="iv-chip seg-n"></span><span class="iv-chip ttl">${L.title}</span><span class="sp"></span><span class="iv-chip">🎙️ بصوت المعلمة</span></div>
     <div class="iv-cap"><p></p></div>
     <div class="iv-ov start on"><div class="iv-card center"><div class="iv-big">▶</div><h3>الفيديو التفاعلي: ${L.title}</h3>
        <p>استمع للنص بصوت المعلمة… سيتوقف الفيديو <b>${AR(S.filter(s=>s.stop).length)} مرات</b> لتجيب عن سؤال، ثم يكمل.</p><button class="b b-main go">ابدأ المشاهدة ▶</button></div></div>
     <div class="iv-ov quiz"><div class="iv-card"><div class="row"><span class="pill orange">⏸ وقفة</span><span class="pill qn"></span><span class="sp"></span></div>
        <p class="iv-q"></p><div class="iv-body"></div><div class="fb"><span class="e"></span><span class="m"></span></div>
        <div class="row"><button class="b b-ghost b-sm rep">↺ أعد المقطع</button><span class="sp"></span><button class="b b-hint b-sm hintb" style="display:none">💡 تلميح</button><button class="b b-main cont">أكمل المشاهدة ▶</button></div></div></div>
     <div class="iv-ov end"><div class="iv-card center"><div class="iv-big">🎉</div><h3>أنهيت الفيديو التفاعلي!</h3><p class="cd"></p>
        <div class="row" style="justify-content:center;flex-wrap:wrap"><button class="b b-ghost again">↺ شاهد من البداية</button>${ctx.nextStep?`<a class="b b-main" style="text-decoration:none" href="${ctx.nextStep.href}">${ctx.nextStep.t} ←</a>`:''}</div></div></div>
   </div>
   <div class="iv-bar"><button class="iv-btn pp">▶</button>
     <div class="iv-tl">${S.map((s,i)=>`<div class="iv-seg" style="flex:${s.dur}" data-i="${i}"><i></i>${s.stop?'<span class="mk">⏸</span>':''}</div>`).join('')}</div>
     <span class="iv-time"></span><button class="iv-btn mute">🔊</button></div>`;
  const Fr=$('.iv-frame',root), cap=$('.iv-cap p',Fr), pp=$('.pp',root), au=new Audio(); au.preload='auto';
  let si=0, playing=false, started=false, lastCue=-1, cdT=null;
  const fmt=x=>{ x=Math.round(x); return AR(Math.floor(x/60))+':'+AR(String(x%60).padStart(2,'0')); };
  const before=i=>S.slice(0,i).reduce((a,s)=>a+s.dur,0);
  function paint(){ const t=au.currentTime||0;
    $$('.iv-seg',root).forEach((el,i)=>{ $('i',el).style.width=(i<si?100:i>si?0:Math.min(100,t/S[i].dur*100))+'%'; el.classList.toggle('cur',i===si); el.classList.toggle('ans',!!res[i]); });
    $('.iv-time',root).textContent=fmt(before(si)+t)+' / '+fmt(all);
    const cues=S[si].cues; const ci=cues.findIndex(c=>t>=c.s&&t<c.e+0.15);
    if(ci!==lastCue){ lastCue=ci; if(ci<0){ cap.innerHTML=''; } else { const c=cues[ci], ws=c.t.split(' '), d=Math.max(.8,c.e-c.s-.3);
      cap.innerHTML=ws.map((w,k)=>`<span style="animation-delay:${(k*d/ws.length).toFixed(2)}s">${esc(w)}</span>`).join(' ');
      cap.parentElement.classList.remove('pop'); void cap.offsetWidth; cap.parentElement.classList.add('pop'); } } }
  function load(i,auto){ si=i; lastCue=-1; au.src=S[i].src; au.currentTime=0; $('.seg-n',Fr).textContent='المقطع '+AR(i+1)+' من '+AR(S.length); hide(); paint(); if(auto) play(); }
  function play(){ playing=true; pp.textContent='⏸'; Fr.classList.remove('paused'); au.play().catch(()=>{ toast('اضغط ▶ للتشغيل'); playing=false; pp.textContent='▶'; }); }
  function pause(){ playing=false; pp.textContent='▶'; au.pause(); Fr.classList.add('paused'); }
  const hide=()=>$$('.iv-ov',Fr).forEach(o=>o.classList.remove('on')); const ov=n=>{ hide(); $('.iv-ov.'+n,Fr).classList.add('on'); };
  au.ontimeupdate=paint; window.__iv={au,get si(){return si;}};
  au.onended=()=>{ pause(); const st=S[si].stop; if(st) openStop(); else if(si<S.length-1) load(si+1,true); else finish(); };
  function openStop(){ const st=pick(S[si].stop); const box=$('.iv-ov.quiz',Fr); ov('quiz'); const body=$('.iv-body',box), fb=$('.fb',box), cont=$('.cont',box), hb=$('.hintb',box);
    fb.className='fb'; $('.qn',box).textContent='الوقفة '+AR(S.slice(0,si+1).filter(s=>s.stop).length)+' من '+AR(S.filter(s=>s.stop).length);
    $('.iv-q',box).innerHTML=st.q+(st.img?`<img class="iv-qimg" src="${st.img}" alt="">`:''); hb.style.display=st.hint&&st.type!=='mcq'?'':'none'; hb.onclick=()=>{ setFb(fb,'hint','💡',st.hint,'تلميح'); save(L,'video-hint',{stop:si}); };
    let tries=0, answer=null, done=false;
    const finishStop=(extra)=>{ res[si]=Object.assign({answer,tries},extra||{}); store.set(resKey,res); reached=Math.max(reached,si+1);
      save(L,'video-stop',{stop:si+1,q:st.q,answer,tries,...(extra||{})}); };
    if(st.type==='mcq'){
      body.innerHTML=`<div class="iv-opts">${st.o.map((o,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${o}</button>`).join('')}</div>`;
      cont.style.display='none';
      $$('.choice',body).forEach(b=>b.onclick=()=>{ if(done) return; const k=+b.dataset.k; tries++; answer=st.o[k];
        if(k===st.c){ done=true; b.classList.add('right'); $$('.choice',body).forEach(x=>x.disabled=true); setFb(fb,'ok',tries===1?'🌟':'👏',st.ok||'أحسنت!',tries===1?'إجابة صحيحة ✔':'أحسنت… صححت إجابتك ✔'); finishStop({correct:true}); cont.style.display=''; }
        else { b.classList.add('wrong','shake'); b.disabled=true; setTimeout(()=>b.classList.remove('shake'),450); setFb(fb,'hint','💡',(st.hint?'<b>تلميح:</b> '+st.hint:'')+(st.no?' '+st.no:' حاول مرة أخرى.'),'إجابة غير صحيحة ✖'); } });
    } else {
      const max=st.max||(isG?200:100);
      body.innerHTML=`${st.support?`<div class="sup">🧩 كلمات تساعدك: ${st.support.map(w=>`<button class="supw">${w}</button>`).join('')}</div>`:''}
        <textarea class="field ans" rows="2" maxlength="${max}" placeholder="اكتب إجابتك هنا…"></textarea><span class="cnt muted">${AR(0)}/${AR(max)}</span>`;
      const ta=$('.ans',body), cnt=$('.cnt',body); ta.oninput=()=>cnt.textContent=AR(ta.value.length)+'/'+AR(max);
      $$('.supw',body).forEach(w=>w.onclick=()=>{ ta.value=(ta.value+' '+w.textContent).trim(); ta.oninput(); });
      if(st.ok){ cont.textContent='إرسال ✔'; cont.style.display=''; cont.dataset.mode='send'; }
      else { cont.textContent=si<S.length-1?'أكمل المشاهدة ▶':'إنهاء ▶'; cont.dataset.mode=''; }
      ta.value=(res[si]&&res[si].answer)||''; ta.oninput();
    }
    cont.onclick=()=>{
      if(st.type!=='mcq'){ const ta=$('.ans',body); answer=ta.value.trim();
        if(cont.dataset.mode==='send'){ setFb(fb,'ok','🌟',st.ok,'أحسنت ✔'); finishStop({}); cont.dataset.mode=''; cont.textContent=si<S.length-1?'أكمل المشاهدة ▶':'إنهاء ▶'; ta.disabled=true; return; }
        if(!res[si]) finishStop({}); }
      if(si<S.length-1) load(si+1,true); else finish(); };
    $('.rep',box).onclick=()=>load(si,true);
  }
  function finish(){ pause(); ov('end'); markDone('content'); save(L,'video-done',{stops:Object.keys(res).length}); confetti(80);
    if(ctx.nextStep){ let n=10; const cd=$('.cd',Fr); clearInterval(cdT);
      const tick=()=>{ cd.innerHTML=`سننتقل إلى <b>${ctx.nextStep.t}</b> تلقائيًا خلال <b>${AR(n)}</b> ثوانٍ…`; if(n--<=0){ clearInterval(cdT); goNext(ctx); } }; tick(); cdT=setInterval(tick,1000); } }
  $('.iv-ov.end .again',Fr).onclick=()=>{ clearInterval(cdT); load(0,true); };
  $('.iv-ov.start .go',Fr).onclick=()=>{ started=true; load(0,true); };
  pp.onclick=()=>{ if(!started){ $('.iv-ov.start .go',Fr).click(); return; } if($('.iv-ov.on',Fr)) return; playing?pause():play(); };
  $('.mute',root).onclick=()=>{ au.muted=!au.muted; $('.mute',root).textContent=au.muted?'🔇':'🔊'; };
  $$('.iv-seg',root).forEach(el=>el.onclick=()=>{ if(!started) return; const i=+el.dataset.i; if(i<=reached){ clearInterval(cdT); load(i,true); } else toast('⏸ أجب عن سؤال الوقفة أولًا'); });
  Fr.addEventListener('click',e=>{ if(e.target.closest('.iv-ov,.iv-top')) return; if(started) pp.click(); });
  document.addEventListener('ivid:pause',()=>{ if(playing) pause(); });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden&&playing) pause(); });
  $('.seg-n',Fr).textContent='المقطع '+AR(1)+' من '+AR(S.length); $('.iv-time',root).textContent=fmt(0)+' / '+fmt(all);
};

/* =========================================================
   4) صندوق مراقبة الفهم
   ========================================================= */
R.box=function(ctx){ const {L,body,markDone}=ctx; const B=L.box, V=pick(B.v)||{};
  const sc=h(`<div class="screen on"><div class="bx">
    <div class="bx-head"><span class="pill blue">🔍 صندوق مراقبة الفهم</span><h3 class="fun">${V.title||B.title||'صندوق مراقبة الفهم'}</h3><span class="sp"></span>${(L.explain||V.teacherAudio)?'<button class="b b-ghost b-sm tch">🎧 شرح المعلمة</button>':''}</div>
    <div class="bx-stage"><button class="giftbox ${V.giftImg?'env':''}">${V.lid===''?'':`<span class="lid">${V.lid||'🎀'}</span>`}${V.giftImg?`<img class="gb gbi" src="${V.giftImg}" alt="">`:`<span class="gb">${V.gift||'🎁'}</span>`}<b>${V.cta||'اضغط لفتح الصندوق'}</b></button><div class="bx-in" style="display:none"></div></div>
  </div></div>`);
  body.appendChild(sc);
  const inn=$('.bx-in',sc), gift=$('.giftbox',sc);
  gift.onclick=()=>{ gift.classList.add('open'); setTimeout(()=>{ gift.style.display='none'; inn.style.display='flex'; render(); runFit(); },550); save(L,'box-open',{}); };
  const done=(data)=>{ save(L,'box',data); markDone('box'); const nx=$('.bx-next',sc); if(nx) nx.style.display='inline-flex'; confetti(50);
    const t=$('.tch',sc); if(t){ t.classList.add('pulse'); t.textContent='🎧 اسمع شرح المعلمة للدرس'; toast('🎧 اسمع شرح المعلمة للدرس قبل ما تكمل',3500); } };
  const foot=`<div class="fb"><span class="e"></span><span class="m"></span></div><div class="row bx-foot"><span class="sp"></span><button class="b b-main sv">حفظ ✔</button>${ctx.nextStep?`<a class="b b-green bx-next" style="display:none;text-decoration:none" href="${ctx.nextStep.href}">${ctx.nextStep.t} ←</a>`:''}</div>`;
  function render(){
    if(B.type==='reveal'){
      inn.innerHTML=`<div class="bx-quote">${V.quote}</div><p class="bx-q">${V.q}</p>${V.o?`<div class="qz-opts">${V.o.map((o,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${o}</button>`).join('')}</div>`
        :`<textarea class="field ans" rows="2" maxlength="${V.max||100}" placeholder="${V.ph||'اكتب هنا… (يمكنك تركها فارغة)'}"></textarea>`}${foot}`;
      const fb=$('.fb',inn), sv=$('.sv',inn);
      if(V.o){ sv.style.display='none'; let tries=0;
        $$('.choice',inn).forEach(b=>b.onclick=()=>{ const k=+b.dataset.k; tries++;
          if(k===V.c){ b.classList.add('right'); $$('.choice',inn).forEach(x=>x.disabled=true); setFb(fb,'ok','🌟',V.ok,'إجابة صحيحة ✔'); done({answer:V.o[k],tries}); }
          else { b.classList.add('wrong','shake'); b.disabled=true; setFb(fb,'hint','💡',(V.hint?'<b>تلميح:</b> '+V.hint+' ':'')+(V.no||''),'إجابة غير صحيحة ✖'); } }); }
      else sv.onclick=()=>{ done({answer:$('.ans',inn).value.trim()}); setFb(fb,'ok','📝','تم حفظ إجابتك','شكرًا لك'); sv.disabled=true; };
    }
    if(B.type==='image'){
      inn.innerHTML=`<div class="bx-split"><figure class="bx-img"><img src="${V.img}" alt=""><figcaption>🔍 اضغط للتكبير</figcaption></figure>
        <div class="bx-side"><p class="bx-q">${V.q}</p>${V.hint?`<div class="fb hint on"><span class="e">💡</span><span class="m"><b class="fbt">تلميح</b>${V.hint}</span></div>`:''}
        <textarea class="field ans grow" maxlength="300" placeholder="${V.ph||'اكتب الخطأ الذي اكتشفته…'}"></textarea>${foot}</div></div>`;
      $('.bx-img',inn).onclick=()=>lightbox(V.img);
      $('.sv',inn).onclick=()=>{ const a=$('.ans',inn).value.trim(); if(!a) return toast('✍️ اكتب الخطأ الذي اكتشفته'); done({answer:a}); setFb($('.fb:not(.hint)',inn)||$('.fb',inn),'ok','🕵️',V.ok||'أحسنت يا محقق! تم حفظ إجابتك.','تم الحفظ ✔'); $('.sv',inn).disabled=true; };
    }
    if(B.type==='links'){
      inn.innerHTML=`<p class="bx-q">${V.q}</p><div class="bx-links">${V.links.map((l,i)=>`<div class="bx-link"><a class="b b-ghost" href="${l.url}" target="_blank" rel="noopener">🔗 ${l.label}</a><input class="field" data-i="${i}" placeholder="عن ماذا تتحدث ${l.kind||'المقالة'}؟ اكتب اسم الموضوع"></div>`).join('')}</div>${foot}`;
      $$('.bx-link a',inn).forEach((a,i)=>a.addEventListener('click',()=>save(L,'box-link-open',{link:i})));
      $('.sv',inn).onclick=()=>{ const ans=$$('.bx-link input',inn).map(x=>x.value.trim()); if(ans.some(x=>!x)) return toast('✍️ اكتب موضوع كل رابط بعد فتحه');
        done({answers:ans}); setFb($('.fb',inn),'ok','📚','تم حفظ إجاباتك… باحث ممتاز!','أحسنت ✔'); $('.sv',inn).disabled=true; };
    }
    if(B.type==='multi'){
      const VI=V.items||[];
      inn.innerHTML=`${V.q?`<p class="bx-q">${V.q}</p>`:''}<div class="bx-multi">${B.items.map((it,k)=>{ const vi=VI[k]||{}; return `<div class="bxm" data-k="${k}">
          <div class="bxm-h">${it.icon?`<span class="bxm-ic">${it.icon}</span>`:''}<b>${it.title}</b></div>
          <div class="bxm-body">${it.img?`<img class="bxm-img" src="${it.img}" alt="" title="اضغط للتكبير">`:''}${it.text?`<p class="bxm-x">${it.text}</p>`:''}</div>
          <p class="bxm-q">${vi.q||''}</p>
          ${vi.o?`<div class="bxm-o">${vi.o.map((o,j)=>`<button class="choice" data-j="${j}"><span class="k">${LET[j]}</span>${o}</button>`).join('')}</div>`:`<textarea class="field" rows="2" maxlength="${vi.max||250}" placeholder="${vi.ph||'اكتب هنا…'}"></textarea>`}
          <div class="fb"><span class="e"></span><span class="m"></span></div></div>`; }).join('')}</div>${foot}`;
      const ans=B.items.map(()=>null), ok=B.items.map(()=>false);
      $$('.bxm',inn).forEach((card,k)=>{ const vi=VI[k]||{}, fbk=$('.fb',card); const im=$('.bxm-img',card); if(im) im.onclick=()=>lightbox(B.items[k].img);
        $$('.choice',card).forEach(b=>b.onclick=()=>{ const j=+b.dataset.j; ans[k]=vi.o[j]; $$('.choice',card).forEach(x=>x.classList.toggle('sel',x===b));
          if(isG&&vi.c!=null){ if(j===vi.c){ ok[k]=true; b.classList.add('right'); $$('.choice',card).forEach(x=>x.disabled=true); setFb(fbk,'ok','🌟',vi.ok||'أحسنت!','صحيح ✔'); }
            else { b.classList.add('wrong','shake'); setFb(fbk,'hint','💡',vi.hint||'فكّر مرة أخرى','حاول مرة أخرى'); } } else ok[k]=true; });
        const ta=$('textarea',card); if(ta) ta.oninput=()=>{ ans[k]=ta.value.trim(); ok[k]=ans[k].length>1; }; });
      $('.sv',inn).onclick=()=>{ const miss=ok.findIndex(x=>!x); if(miss>=0) return toast(isG?'☝️ أجب عن كل البطاقات إجابة صحيحة':'✍️ أكمل كل البطاقات');
        done({answers:B.items.map((it,k)=>({item:it.title,answer:ans[k]}))}); setFb($('.bx-foot',inn).previousElementSibling,'ok','🧩',V.ok||'أحسنت!','اكتشفت السر ✔'); $('.sv',inn).disabled=true;
        if(B.wall){ const host=h('<div class="bw-host"></div>'); const multi=$('.bx-multi',inn); multi.replaceWith(host);
          const W=boxWall(L,host,V.wallTitle||'جدار كشف الألغام التشاركي'); W.post(B.items.map((it,k)=>({label:it.title,value:String(ans[k]||'')}))); }
        runFit(); };
    }
    if(B.type==='sort'){
      inn.innerHTML=`<p class="bx-q">${V.q}</p><div class="bx-sort"></div>${foot}`;
      const so=sorter({cards:B.cards,targets:B.bins,multi:true}); $('.bx-sort',inn).appendChild(so);
      $('.sv',inn).onclick=()=>{ if(!so.allPlaced()) return toast('📦 ضع كل البطاقات في مكانها');
        const st=so.state(); const data={placed:B.cards.map((c,i)=>({card:c.t,bin:B.bins[st[i]].label}))};
        if(isG){ const ok=so.mark(); data.correct=ok; if(ok<B.cards.length){ setFb($('.fb',inn),'hint','💡',(V.hint||'راجع البطاقات الحمراء: هل يمكن إثباتها من مصدر موثوق؟'),'أصبت '+AR(ok)+' من '+AR(B.cards.length)); data.final=false; save(L,'box-try',data); return; }
          setFb($('.fb',inn),'ok','🧠',V.ok||'عقلك فلتر ممتاز!','كل البطاقات في مكانها ✔'); }
        else setFb($('.fb',inn),'ok','📝','تم حفظ تصنيفك','شكرًا ✔');
        done(data); $('.sv',inn).disabled=true; };
    }
    { const t=$('.tch',sc); if(t) t.onclick=()=>explainModal(L,L.explain||V.teacherAudio); }
  }
  if(store.get(KEY('done_L'+L.id),[]).includes('box')){ const nx=$('.bx-next',sc); }
};

/* =========================================================
   5) الأنشطة (3 موجهة بمساعدة / 3 حرة)
   ========================================================= */

/* =========================================================
   الاختبار النهائي (٦٠ سؤالًا على نصين) — بدون تغذية فورية، تسليم مرة واحدة
   ========================================================= */
const examKey=X=>{ let r=20261104; return X.k.split('').map(ch=>{ r=(Math.imul(r,1103515245)+12345)>>>0; r=r%2147483648; return ((+ch-((r>>>16)%4))%4+4)%4; }); };
R.exam=function(ctx){ const {L,body,markDone}=ctx; const X=L.exam, N=X.q.length, LT='أبجد';
  const SK=KEY('exam_state'), RK=KEY('exam_result'); const me=(window.FLDB&&FLDB.user&&FLDB.user())||{};
  let st=store.get(SK,null);
  if(!st){ const seed=[...String(me.uid||'x')].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);
    let r=seed||1; const rnd=()=>{ r=(Math.imul(r,1664525)+1013904223)>>>0; return r/4294967296; };
    st={ord:X.q.map(()=>{ const a=[0,1,2,3]; for(let i=3;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }),ans:Array(N).fill(null),i:0,t0:0,el:0}; }
  const persist=()=>store.set(SK,st);
  const sc=h(`<div class="screen on ex2"></div>`); body.appendChild(sc);
  const done=()=>st.ans.filter(x=>x!=null).length;
  function intro(){ sc.innerHTML=`<div class="ex2-intro"><span class="medal">📝</span><h2>${L.title}</h2>
      <div class="ex2-rules"><p>📖 الاختبار على <b>نصين قرائيين</b>: «مجموعات القراءة» و«القراءة والتكنولوجيا».</p><p>❓ عدد الأسئلة <b>${AR(N)}</b> سؤالًا، لكل سؤال أربعة اختيارات وإجابة واحدة صحيحة.</p>
      <p>👀 النص يظهر بجانب السؤال دائمًا… ارجع إليه كلما احتجت.</p><p>💾 إجاباتك تُحفظ تلقائيًا، وتقدر تتنقل بين الأسئلة بحرية.</p><p>✅ التسليم <b>مرة واحدة فقط</b>، فراجع إجاباتك قبل التسليم.</p></div>
      <button class="b b-main go">${done()?'أكمل الاختبار ←':'ابدأ الاختبار ←'}</button></div>`;
    $('.go',sc).onclick=()=>{ if(!st.t0) st.t0=Date.now(); persist(); save(L,'exam-start',{}); test(); }; runFit(); }
  function test(){ const i=st.i, q=X.q[i], T=X.texts[i<X.split?0:1];
    sc.innerHTML=`<div class="ex2-wrap"><div class="ex2-text"><div class="ex2-th"><b>${T.title}</b><button class="b b-ghost b-sm im">🖼️ الصورة</button></div>
        <div class="ex2-tb">${T.paras.map(x=>`<p>${esc(x)}</p>`).join('')}</div></div>
      <div class="ex2-q"><div class="ex2-top"><span class="pill blue">السؤال ${AR(i+1)} من ${AR(N)}</span><span class="sp"></span><span class="muted ex2-c">أجبت عن ${AR(done())} من ${AR(N)}</span><button class="b b-ghost b-sm gridb">🔢 كل الأسئلة</button></div>
        <div class="ex2-bar"><i style="width:${done()/N*100}%"></i></div>
        <p class="ex2-qt">${esc(q.q)}</p>${/الصورة \(\d\)/.test(q.q)?`<img class="ex2-qi" src="${T.img}" alt="">`:''}
        <div class="ex2-opts">${st.ord[i].map((oi,k)=>`<button class="choice ${st.ans[i]===oi?'sel':''}" data-o="${oi}"><span class="k">${LT[k]}</span>${esc(q.o[oi])}</button>`).join('')}</div>
        <div class="ex2-foot"><button class="b b-ghost pv" ${i?'':'disabled'}>→ السابق</button><span class="sp"></span>${i<N-1?'<button class="b b-main nx">التالي ←</button>':''}<button class="b b-green fin">تسليم الاختبار ✅</button></div>
        <div class="ex2-grid" style="display:none">${X.q.map((_,j)=>`<button class="${j===i?'cur':''} ${st.ans[j]!=null?'ok':''}" data-j="${j}">${AR(j+1)}</button>`).join('')}</div></div></div>`;
    const go=j=>{ st.i=Math.max(0,Math.min(N-1,j)); persist(); test(); };
    $$('.ex2-opts .choice',sc).forEach(b=>b.onclick=()=>{ st.ans[i]=+b.dataset.o; persist(); $$('.ex2-opts .choice',sc).forEach(x=>x.classList.toggle('sel',x===b));
      $('.ex2-c',sc).textContent='أجبت عن '+AR(done())+' من '+AR(N); $('.ex2-bar i',sc).style.width=done()/N*100+'%'; if(i<N-1) setTimeout(()=>go(i+1),350); });
    $('.pv',sc).onclick=()=>go(i-1); const nx=$('.nx',sc); if(nx) nx.onclick=()=>go(i+1);
    $('.gridb',sc).onclick=()=>{ const g=$('.ex2-grid',sc); g.style.display=g.style.display==='none'?'grid':'none'; runFit(); };
    $$('.ex2-grid button',sc).forEach(b=>b.onclick=()=>go(+b.dataset.j));
    $('.im',sc).onclick=()=>lightbox(T.img,T.title); const qi=$('.ex2-qi',sc); if(qi) qi.onclick=()=>lightbox(T.img);
    $('.fin',sc).onclick=()=>{ const miss=st.ans.map((x,j)=>x==null?j:-1).filter(j=>j>=0);
      const m=h(`<div class="sos-pop"><div class="sos-card xp-card"><div class="sos-h"><span class="xp-ic">✅</span><h3>تسليم الاختبار؟</h3></div>
        <p style="font-weight:700;line-height:1.8">${miss.length?`⚠️ لم تجب عن <b>${AR(miss.length)}</b> سؤالًا: ${miss.slice(0,12).map(j=>AR(j+1)).join('، ')}${miss.length>12?'…':''}<br>`:''}بعد التسليم لا يمكن تعديل الإجابات.</p>
        <div class="row"><button class="b b-ghost back">↩️ أرجع أراجع</button><span class="sp"></span><button class="b b-green ok">نعم، سلّم الاختبار</button></div></div></div>`);
      document.body.appendChild(m); $('.back',m).onclick=()=>{ m.remove(); if(miss.length) go(miss[0]); }; $('.ok',m).onclick=()=>{ m.remove(); submit(); }; };
    const tb=$('.ex2-tb',sc); const sk=KEY('exam_scroll_'+(i<X.split?0:1)); tb.scrollTop=store.get(sk,0); tb.onscroll=()=>store.set(sk,tb.scrollTop);
    runFit(); }
  function submit(){ const K=examKey(X); const ok=st.ans.map((a,j)=>a!=null&&a===K[j]); const score=ok.filter(Boolean).length;
    const s1=ok.slice(0,X.split).filter(Boolean).length, s2=score-s1, mins=Math.round((Date.now()-(st.t0||Date.now()))/60000);
    const res={score,total:N,s1,s2,mins,at:Date.now(),answers:st.ans.map(a=>a==null?'':LT[a]),correct:ok.map(x=>x?1:0)};
    store.set(RK,res); save(L,'exam',res); markDone('exam'); confetti(140); result(res); }
  function result(r){ const pct=Math.round(r.score/r.total*100); const msg=pct>=85?'🏆 ممتاز! قارئ تشاركي ناقد':pct>=65?'🌟 أداء جيد جدًا':pct>=50?'👍 أداء جيد… استمر':'💪 لا بأس… القراءة رحلة تتحسن بالممارسة';
    sc.innerHTML=`<div class="ex2-intro"><span class="medal">🎓</span><h2>تم تسليم الاختبار</h2>
      <div class="ex2-score"><b>${AR(r.score)}</b><span>من ${AR(r.total)}</span></div><p class="ex2-msg">${msg}</p>
      <div class="ex2-parts"><div><span>📖 النص الأول</span><b>${AR(r.s1)} / ${AR(X.split)}</b></div><div><span>💻 النص الثاني</span><b>${AR(r.s2)} / ${AR(r.total-X.split)}</b></div></div>
      <p class="muted">شكرًا لك… تم حفظ نتيجتك وإرسالها للمعلمة.</p><a class="b b-ghost" href="../content.html" style="text-decoration:none">📚 الرجوع للمحتوى</a></div>`; runFit(); }
  const isDoneL=async id=>{ const loc=store.get(KEY('done_L'+id),[]); if(loc.includes('harvest')) return true; try{ const r=await DB().getProgress(id); return !!(r&&r.includes&&r.includes('harvest')); }catch(e){ return false; } };
  (async()=>{ const prev=store.get(RK,null); if(prev) return result(prev);
    try{ const pr=await DB().getProgress(L.id); if(pr&&pr.includes&&pr.includes('exam')){ sc.innerHTML=`<div class="ex2-intro"><span class="medal">🎓</span><h2>سلّمت الاختبار من قبل</h2><p class="muted">نتيجتك محفوظة عند المعلمة. الاختبار يُسلَّم مرة واحدة فقط.</p><a class="b b-ghost" href="../content.html" style="text-decoration:none">📚 الرجوع للمحتوى</a></div>`; runFit(); return; } }catch(e){}
    const need=L.needs||[]; const okL=me.role==='admin'?need.map(()=>true):await Promise.all(need.map(isDoneL));
    if(!okL.every(Boolean)){ const T=L.needTitles||{}; sc.innerHTML=`<div class="finale proj-lock"><span class="medal">🔒</span><h3>الاختبار النهائي يُفتح بعد إنهاء الدروس التسعة</h3>
      <p class="muted">أكمل كل الدروس حتى «ثمرة قراءتي» ثم ارجع هنا 💪</p><div class="pl-list jr-ll">${need.map((id,k)=>`<a class="pl-it ${okL[k]?'ok':''}" href="Lesson${id}_aims.html"><span>${okL[k]?'✅':'⏳'}</span>${T[id]||id}</a>`).join('')}</div></div>`; runFit(); return; }
    intro(); })();
};

/* ---------- جدار الردود تحت صندوق الفهم (مثل «جدار كشف الألغام») ---------- */
function boxWall(L,host,title,items){ const me=(window.FLDB&&FLDB.user&&FLDB.user())||{}; const EM=['❤️','👏','🌟','💡','💪']; let P=[],RX=[];
  host.innerHTML=`<div class="bw"><p class="wall-h">🧱 ${title} <span class="muted">— ردود زملائك في مجموعتك… تفاعل بإيموجي</span></p><div class="wl"><p class="muted wl-empty">⏳ جارٍ تحميل الجدار…</p></div></div>`;
  const paint=()=>{ const wl=$('.wl',host); const ps=P.slice().reverse(); if(!ps.length){ wl.innerHTML='<p class="muted wl-empty">كن أول من ينشر ردّه ✨</p>'; return; }
    wl.innerHTML=ps.map(p=>{ const rs=RX.filter(r=>r.parentId===p.id); return `<div class="wp ${p.uid===me.uid?'mine':''}" data-id="${p.id}"><div class="wp-h"><span class="uc-av">${(p.name||'?').trim()[0]||'?'}</span><b>${esc(p.name||'')}</b>${p.uid===me.uid?'<span class="pill green" style="font-size:11px">ردّي</span>':''}</div>
      <div class="wp-b">${(p.fields||[]).map(x=>`<p><b>${esc(x.label)}:</b> ${esc(x.value)}</p>`).join('')}</div>
      <div class="wp-r">${EM.map(e=>{ const n=rs.filter(r=>r.text===e).length, mine=rs.some(r=>r.text===e&&r.uid===me.uid); return `<button class="rx ${mine?'on':''}" data-e="${e}">${e}${n?` <i>${AR(n)}</i>`:''}</button>`; }).join('')}</div></div>`; }).join('');
    $$('.wp',wl).forEach(w=>$$('.rx',w).forEach(b=>b.onclick=async()=>{ const id=w.dataset.id,e=b.dataset.e, mine=RX.find(r=>r.parentId===id&&r.text===e&&r.uid===me.uid);
      try{ if(mine) await DB().deleteComment(mine.id); else await DB().addComment({lesson:L.id,page:'boxwall',kind:'react',parentId:id,text:e}); }catch(x){ toast('تعذّر التفاعل الآن'); } })); };
  try{ DB().listComments(L.id,list=>{ P=list.filter(c=>c.kind==='post'&&c.page==='boxwall'); RX=list.filter(c=>c.kind==='react'&&c.page==='boxwall'); paint(); }); }catch(x){}
  return { post:async fields=>{ if(P.some(p=>p.uid===me.uid)) return; try{ await DB().addComment({lesson:L.id,page:'boxwall',kind:'post',text:fields.map(f=>f.label+': '+f.value).join(' | '),fields}); }catch(x){ toast('تعذّر النشر على الجدار'); } } };
}

/* =========================================================
   النشاط الختامي: رحلة قطار الهولوجرام
   ========================================================= */
R.journey=function(ctx){ const {L,body,markDone}=ctx; const J=L.journey;
  const isDoneL=async id=>{ const loc=store.get(KEY('done_L'+id),[]); if(loc.includes('harvest')) return true; try{ const r=await DB().getProgress(id); return !!(r&&r.includes&&r.includes('harvest')); }catch(e){ return false; } };
  const SK=KEY('journey'), st=store.get(SK,{agreed:[]}); const agreed=new Set(st.agreed||[]);
  const ALL=[]; J.wagons.forEach((w,wi)=>(w.cards||[w]).forEach((c,ci)=>ALL.push({wi,ci,key:wi+'_'+ci})));
  const persist=()=>store.set(SK,{agreed:[...agreed]});
  const sc=h(`<div class="screen on jr"></div>`); body.appendChild(sc);

  function player(A,host,onEnd){ // صوت المعلمة + الجملة الحالية + النص كامل
    host.innerHTML=`<div class="jp"><button class="jp-pp">▶</button><div class="jp-mid"><div class="jp-cap"><span class="muted">اضغط ▶ لتسمع صوت المعلمة</span></div>
      <div class="jp-bar"><i></i></div></div><span class="jp-t muted"></span><button class="b b-ghost b-sm jp-txt">📜 النص</button></div>`;
    const au=new Audio(A.src); au.preload='metadata'; const pp=$('.jp-pp',host), cap=$('.jp-cap',host), bar=$('.jp-bar i',host), tt=$('.jp-t',host); let last=-1;
    const fmt=x=>{ x=Math.round(x||0); return AR(Math.floor(x/60))+':'+AR(String(x%60).padStart(2,'0')); };
    au.ontimeupdate=()=>{ const t=au.currentTime; bar.style.width=(t/(au.duration||A.dur)*100)+'%'; tt.textContent=fmt(t)+' / '+fmt(au.duration||A.dur);
      const ci=A.cues.findIndex(c=>t>=c.s&&t<c.e+0.1); if(ci>=0&&ci!==last){ last=ci; cap.innerHTML=`<p class="pop">${esc(A.cues[ci].t)}</p>`;
        const tx=document.querySelector('.jt-body'); if(tx){ $$('.jt-body span',document).forEach((x,i)=>x.classList.toggle('on',i===ci)); const on=$('.jt-body span.on',document); if(on) on.scrollIntoView({block:'center',behavior:'smooth'}); } } };
    au.onplay=()=>pp.textContent='⏸'; au.onpause=()=>pp.textContent='▶'; au.onended=()=>{ pp.textContent='↺'; onEnd&&onEnd(); };
    pp.onclick=()=>au.paused?au.play().catch(()=>toast('اضغط مرة أخرى للتشغيل')):au.pause();
    $('.jp-bar',host).onclick=e=>{ const r=e.currentTarget.getBoundingClientRect(); const f=(r.right-e.clientX)/r.width; au.currentTime=Math.max(0,Math.min(1,f))*(au.duration||A.dur); };
    $('.jp-txt',host).onclick=()=>{ const m=h(`<div class="sos-pop"><div class="sos-card art-card"><div class="sos-h"><span class="xp-ic">📜</span><h3>${A.title}</h3><button class="b b-ghost b-sm x">✕</button></div>
      <div class="art-body jt-body">${A.cues.map((c,i)=>`<span data-i="${i}">${esc(c.t)} </span>`).join('')}</div></div></div>`); document.body.appendChild(m);
      $('.x',m).onclick=()=>m.remove(); m.onclick=e=>{ if(e.target===m) m.remove(); };
      $$('.jt-body span',m).forEach(x=>x.onclick=()=>{ au.currentTime=A.cues[+x.dataset.i].s+0.01; au.play(); }); };
    return au;
  }
  let cur=null; const stop=()=>{ if(cur){ cur.pause(); cur=null; } };

  function start(){ stop();
    sc.innerHTML=`<div class="jr-start"><div class="jr-hero" style="background-image:url(${J.trainImg})"><div class="jr-hero-in"><span class="pill orange">🚂 النشاط الختامي</span><h2>${L.title}</h2><p>من الفصل… إلى المستقبل</p></div></div>
      <div class="jr-side"><p class="jr-h">🎧 استمع لحكاية الرحلة بصوت المعلمة</p><div class="jr-pl"></div>
        <div class="jr-wag"><img src="${J.wagonsImg}" alt=""></div>
        <div class="row"><span class="muted" style="font-size:13px;font-weight:700">١٠ عربات • في كل عربة قطعة من خريطة مصر</span><span class="sp"></span><button class="b b-main go">🚂 اركب القطار ←</button></div></div></div>`;
    cur=player(J.audio.trip,$('.jr-pl',sc)); $('.jr-wag img',sc).onclick=()=>lightbox(J.wagonsImg); $('.go',sc).onclick=()=>wagons(firstOpen()); runFit(); }
  const firstOpen=()=>{ const i=J.wagons.findIndex((w,wi)=>(w.cards||[w]).some((_,ci)=>!agreed.has(wi+'_'+ci))); return i<0?J.wagons.length-1:i; };

  function mapHTML(){ const n=agreed.size, T=ALL.length, tiles=16, show=Math.round(tiles*n/T);
    return `<div class="jr-map"><img src="${J.egyptImg}" alt=""><div class="jr-tiles">${Array.from({length:tiles},(_,i)=>`<i class="${J.tileOrder[i]<show?'off':''}"></i>`).join('')}</div></div>
      <p class="jr-cnt">🧩 جمعت <b>${AR(n)}</b> من <b>${AR(T)}</b> قطعة من خريطة مصر</p><div class="jr-prog"><i style="width:${n/T*100}%"></i></div>`; }

  function wagons(wi,ci=0){ stop(); const W=J.wagons[wi], cards=W.cards||[W], C=cards[ci], key=wi+'_'+ci, done=agreed.has(key);
    sc.innerHTML=`<div class="jr-train">${J.wagons.map((w,i)=>{ const ok=(w.cards||[w]).every((_,k)=>agreed.has(i+'_'+k)); return `<button class="jw ${i===wi?'on':''} ${ok?'ok':''}" data-i="${i}"><span class="jw-n">${ok?'✅':'🚃'} ${AR(i+1)}</span><span class="jw-t">${w.short}</span></button>`; }).join('')}</div>
      <div class="jr-body"><div class="jr-card"><div class="jr-ch"><span class="pill blue">العربة ${AR(wi+1)}</span><b>${W.title}</b>${cards.length>1?`<span class="sp"></span><div class="jr-sub">${cards.map((c,k)=>`<button class="${k===ci?'on':''} ${agreed.has(wi+'_'+k)?'ok':''}" data-k="${k}">${agreed.has(wi+'_'+k)?'✓ ':''}${c.label}</button>`).join('')}</div>`:''}</div>
          <figure class="jr-img"><img src="${C.img}" alt=""><figcaption>🔍 اضغط لتكبير البطاقة واقرأ المواقف</figcaption></figure></div>
        <div class="jr-aside">${mapHTML()}
          <div class="jr-q"><p>${C.q||'هل توافق على استكمال قطار التعلم المعكوس مع الحصول على جزء من خريطة مصر؟'}</p>
            <button class="b ${done?'b-ghost':'b-green'} agree" ${done?'disabled':''}>${done?'✅ وافقت… حصلت على القطعة':'✅ '+(C.yes||'نعم، أوافق على استكمال الرحلة وجمع الخريطة')}</button></div>
          <div class="row"><button class="b b-ghost b-sm back">← حكاية الرحلة</button><span class="sp"></span>${agreed.size===ALL.length?'<button class="b b-main fin">🗺️ الخريطتان ورسالة المعلمة ←</button>':''}</div></div></div>`;
    $$('.jw',sc).forEach(b=>b.onclick=()=>wagons(+b.dataset.i)); $$('.jr-sub button',sc).forEach(b=>b.onclick=()=>wagons(wi,+b.dataset.k));
    $('.jr-img',sc).onclick=()=>lightbox(C.img,W.title+(cards.length>1?' — '+C.label:''));
    $('.back',sc).onclick=start; const f=$('.fin',sc); if(f) f.onclick=end;
    $('.agree',sc).onclick=()=>{ if(agreed.has(key)) return; agreed.add(key); persist(); save(L,'journey-agree',{wagon:wi+1,title:W.title,card:C.label||'',pieces:agreed.size});
      confetti(45); toast('🧩 حصلت على قطعة جديدة من خريطة مصر!',2200);
      setTimeout(()=>{ if(agreed.size===ALL.length) return end(); const nk=cards.findIndex((_,k)=>!agreed.has(wi+'_'+k)); if(nk>=0) wagons(wi,nk); else wagons(firstOpen()); },1100); };
    runFit(); }

  function end(){ stop(); markDone('journey');
    sc.innerHTML=`<div class="jr-end"><div class="jr-maps"><figure data-i="0"><img src="${J.skillsImg}" alt=""><figcaption>🧠 خريطة مهارات القراءة التشاركية</figcaption></figure>
        <figure data-i="1"><img src="${J.egyptImg}" alt=""><figcaption>🇪🇬 خريطة مصر… اكتمل البازل بكم!</figcaption></figure></div>
      <div class="jr-letter"><img class="jr-stu" src="${J.studentsImg}" alt=""><div class="jr-lt"><span class="pill pink">💌 رسالة الوداع</span><h3>يا سفراء الرحلة… رسالة من معلمتكم</h3><div class="jr-pl2"></div>
        <div class="row"><button class="b b-ghost b-sm again">🚃 العربات</button><span class="sp"></span><button class="b b-green yes" ${store.get(KEY('journey_yes'),0)?'disabled':''}>🚂 نعم… أوافق على سير القطار لتكملة الرحلة</button></div></div></div></div>`;
    const ims=[J.skillsImg,J.egyptImg]; $$('.jr-maps figure',sc).forEach(f=>f.onclick=()=>lightbox(ims[+f.dataset.i]));
    cur=player(J.audio.letter,$('.jr-pl2',sc)); $('.again',sc).onclick=()=>wagons(0);
    $('.yes',sc).onclick=e=>{ store.set(KEY('journey_yes'),1); save(L,'journey-final',{agree:true}); e.target.disabled=true; e.target.textContent='🎉 دمتم سفرائي… ودامت رحلتنا'; confetti(160); };
    confetti(120); runFit(); }

  (async()=>{ const need=L.needs||[]; const okL=await Promise.all(need.map(isDoneL));
    if(!okL.every(Boolean)){ const T=L.needTitles||{}; sc.innerHTML=`<div class="finale proj-lock"><span class="medal">🔒</span><h3>قطار الهولوجرام يتحرك بعد إنهاء الدروس التسعة</h3>
      <p class="muted">أكمل كل الدروس حتى «ثمرة قراءتي» ثم اركب القطار 🚂</p><div class="pl-list jr-ll">${need.map((id,k)=>`<a class="pl-it ${okL[k]?'ok':''}" href="Lesson${id}_aims.html"><span>${okL[k]?'✅':'⏳'}</span>${T[id]||id}</a>`).join('')}</div></div>`; runFit(); return; }
    agreed.size===ALL.length&&store.get(KEY('journey_yes'),0)?end():start(); })();
};

R.project=function(ctx){ const {L,body}=ctx; const need=L.needs||[];
  const isDone=async id=>{ const loc=store.get(KEY('done_L'+id),[]); if(loc.includes('harvest')) return true; try{ const r=await DB().getProgress(id); return !!(r&&r.includes&&r.includes('harvest')); }catch(e){ return false; } };
  const T=L.needTitles||{};
  (async()=>{ const st=await Promise.all(need.map(isDone));
    if(st.every(Boolean)) return R.activity(Object.assign({},ctx,{markDone:()=>ctx.markDone('project')}));
    body.appendChild(h(`<div class="screen on"><div class="finale proj-lock"><span class="medal">🔒</span><h3>مشروع الوحدة يُفتح بعد إنهاء دروسها الثلاثة</h3>
      <p class="muted">أكمل كل خطوات الدروس حتى «ثمرة قراءتي» ثم ارجع هنا 💪</p>
      <div class="pl-list">${need.map((id,k)=>`<a class="pl-it ${st[k]?'ok':''}" href="Lesson${id}_aims.html"><span>${st[k]?'✅':'⏳'}</span>${T[id]||('الدرس '+AR(id))}</a>`).join('')}</div></div></div>`)); runFit(); })();
};
R.activity=function(ctx){ const {L,body,markDone}=ctx; const A=(L.activities||{})[MODE]||[];
  const doneKey=KEY('acts_L'+L.id); const saved=store.get(doneKey,{});
  const sc=h(`<div class="screen on"><div class="ac">
    <div class="ac-tabs">${A.map((a,i)=>`<button data-i="${i}" class="${saved[i]?'ok':''}"><span class="n">${AR(i+1)}</span><span class="t">${a.title}</span></button>`).join('')}<span class="sp"></span>${sosBtn(L)}</div>
    <div class="ac-panes"></div></div></div>`);
  body.appendChild(sc); wireSos(sc,L);
  const panes=$('.ac-panes',sc);
  A.forEach((a,i)=>panes.appendChild(buildAct(a,i)));
  const fin=h(`<div class="ac-pane finale" data-i="done"><span class="medal">🏅</span><h3>أنجزت ${isG?'الأنشطة الموجّهة':'الأنشطة الحرة'}!</h3><p class="muted">تم حفظ أعمالك في ملف إنجازك على المنصة</p>
    <div class="row" style="flex-wrap:wrap;justify-content:center">${nextBtn(ctx)}</div></div>`);
  panes.appendChild(fin);
  function show(i){ $$('.ac-tabs button',sc).forEach(b=>b.classList.toggle('on',b.dataset.i==String(i))); $$('.ac-pane',panes).forEach(p=>p.classList.toggle('on',p.dataset.i==String(i))); runFit(); }
  $$('.ac-tabs button',sc).forEach(b=>b.onclick=()=>show(+b.dataset.i));
  const first=A.findIndex((_,i)=>!saved[i]); show(first<0?(A.length?'done':0):first);
  function complete(i,data){ saved[i]=true; store.set(doneKey,saved); save(L,'activity',Object.assign({n:i+1,title:A[i].title,type:A[i].type},data));
    $(`.ac-tabs button[data-i="${i}"]`,sc).classList.add('ok'); confetti(40);
    const nx=A.findIndex((_,j)=>!saved[j]); if(nx<0){ markDone('activity'); setTimeout(()=>show('done'),900); } else setTimeout(()=>show(nx),900); }
  function buildAct(a,i){
    const p=h(`<div class="ac-pane" data-i="${i}"><div class="ac-h"><span class="pill orange">${isG?'نشاط موجّه':'نشاط حر'} ${AR(i+1)}</span><h3 class="fun">${a.title}</h3>${a.skill?`<span class="pill green">🎯 ${a.skill}</span>`:''}</div>
      <p class="task ac-task">${a.task}</p><div class="ac-body"></div><div class="fb"><span class="e"></span><span class="m"></span></div>
      <div class="row ac-foot"><span class="sp"></span>${a.hint?'<button class="b b-hint b-sm ah">💡 تلميح</button>':''}<button class="b b-main sv">💾 حفظ النشاط</button></div></div>`);
    const bd=$('.ac-body',p), fb=$('.fb',p); let get=()=>({}), valid=()=>true, check=null;
    if(a.hint) $('.ah',p).onclick=()=>setFb(fb,'hint','💡',a.hint,'تلميح');
    if(a.type==='order'||a.type==='bins'){
      const so=sorter({cards:a.cards,targets:a.targets,multi:a.type==='bins'}); bd.appendChild(so); p.classList.add('has-'+a.type);
      if(a.why) bd.appendChild(h(`<label class="fld why-f"><span class="fl-l">${a.why}</span><textarea class="field" rows="2" data-why="1" placeholder="اكتب هنا…"></textarea></label>`));
      const whyV=()=>a.why?$('textarea[data-why]',bd).value.trim():undefined;
      valid=()=>{ if(!so.allPlaced()) return toast('📦 ضع كل البطاقات في أماكنها'),false; if(a.why&&!whyV()) return toast('✍️ اكتب تبريرك'),false; return true; };
      get=()=>({placed:a.cards.map((c,k)=>({card:c.t,to:a.targets[so.state()[k]]&&String(a.targets[so.state()[k]].label).replace(/<[^>]+>/g,'').trim()})),why:whyV()});
      if(a.check!==false&&a.cards[0].key!=null) check=()=>{ const ok=so.mark(); if(ok<a.cards.length){ setFb(fb,'hint','💡',(a.no||'راجع البطاقات الحمراء وحاول مرة أخرى'),'أصبت '+AR(ok)+' من '+AR(a.cards.length)); return {ok:false,score:ok}; }
        setFb(fb,'ok','🌟',a.ok||'ممتاز! كل البطاقات في مكانها الصحيح.','إجابة صحيحة ✔'); return {ok:true,score:ok}; };
    }
    if(a.type==='table'){
      bd.innerHTML=`<div class="tbl" style="--cols:${a.cols.length}"><div class="tr th">${a.cols.map(c=>`<span>${c}</span>`).join('')}</div>
        ${a.example?`<div class="tr ex">${a.example.map(c=>`<span>${c}</span>`).join('')}</div>`:''}
        ${Array.from({length:a.rows},(_,r)=>`<div class="tr">${a.cols.map((c,k)=>k===0&&a.rowLabels?`<span class="tl">${a.rowLabels[r]}</span>`:`<input class="field" data-r="${r}" data-k="${k}" placeholder="${k===0?(a.ph0||'الموقف')+' '+AR(r+1):'…'}">`).join('')}</div>`).join('')}</div>
        ${a.after?`<label class="fld tbl-after"><span class="fl-l">${a.after}</span><textarea class="field" rows="2" data-after="1" placeholder="اكتب هنا…"></textarea></label>`:''}`;
      const cell=(r,k)=>k===0&&a.rowLabels?a.rowLabels[r].replace(/<[^>]+>/g,' ').trim():$(`input[data-r="${r}"][data-k="${k}"]`,bd).value.trim();
      get=()=>({rows:Array.from({length:a.rows},(_,r)=>a.cols.map((c,k)=>cell(r,k))),after:a.after?$('textarea[data-after]',bd).value.trim():undefined});
      valid=()=>{ const filled=get().rows.filter(r=>r.every(x=>x)).length; if(filled<(a.min||2)) return toast('✍️ أكمل '+AR(a.min||2)+' صفوف على الأقل'),false;
        if(a.after&&!get().after) return toast('✍️ أجب عن السؤال أسفل الجدول'),false; return true; };
    }
    if(a.type==='fields'){
      bd.innerHTML=`<div class="flds ${a.layout||'stack'}">${a.fields.map((f,k)=>`<label class="fld"><span class="fl-l">${f.icon||''} ${f.label}</span>${f.hint?`<small>${f.hint}</small>`:''}<textarea class="field" rows="${f.rows||2}" data-k="${k}" placeholder="${f.ph||'اكتب هنا…'}"></textarea></label>`).join(a.layout==='chain'?'<span class="chain-ar">←</span>':'')}</div>`;
      get=()=>({fields:a.fields.map((f,k)=>({label:f.label,value:$(`textarea[data-k="${k}"]`,bd).value.trim()}))});
      valid=()=>get().fields.every(f=>f.value)||(toast('✍️ أكمل كل الخانات'),false);
      if(a.keys&&isG) check=()=>{ const vals=get().fields.map(f=>F.norm(f.value)); const miss=a.keys.filter(k=>!k.any.some(w=>vals[k.field].includes(F.norm(w))));
        if(miss.length){ setFb(fb,'hint','💡',miss.map(m=>m.no).join(' '),'قريب… راجع إجابتك'); return {ok:false}; } setFb(fb,'ok','🌟',a.ok||'أحسنت!','إجابة موفقة ✔'); return {ok:true}; };
    }
    if(a.type==='mcq'){
      bd.innerHTML=`<p class="ac-q">${a.q}</p><div class="qz-opts ac-mcq">${a.o.map((o,k)=>`<button class="choice" data-k="${k}"><span class="k">${LET[k]}</span>${o}</button>`).join('')}</div>${a.why?`<label class="fld"><span class="fl-l">${a.why}</span><textarea class="field" rows="2" placeholder="اكتب هنا…"></textarea></label>`:''}`;
      let chosen=-1, tries=0; $$('.choice',bd).forEach(b=>b.onclick=()=>{ if(b.disabled) return; chosen=+b.dataset.k; $$('.choice',bd).forEach(x=>x.classList.toggle('sel',x===b));
        if(isG&&a.c!=null){ tries++; if(chosen===a.c){ b.classList.add('right'); $$('.choice',bd).forEach(x=>x.disabled=true); setFb(fb,'ok','🌟',a.ok||'أحسنت!','إجابة صحيحة ✔'); }
          else { b.classList.add('wrong','shake'); b.disabled=true; setFb(fb,'hint','💡',a.hint||'فكّر مرة أخرى','إجابة غير صحيحة ✖'); } } });
      get=()=>({answer:a.o[chosen],tries,why:a.why?$('textarea',bd).value.trim():undefined});
      valid=()=>{ if(chosen<0) return toast('☝️ اختر إجابة أولًا'),false; if(isG&&a.c!=null&&chosen!==a.c) return toast('💡 جرّب إجابة أخرى'),false; if(a.why&&!$('textarea',bd).value.trim()) return toast('✍️ اكتب سطرًا'),false; return true; };
    }
    if(a.type==='wall'){
      const me=(window.FLDB&&FLDB.user&&FLDB.user())||{}; const tag='wall'+i; let posted=false, POSTS=[], REACTS=[];
      const EM=a.emojis||['❤️','👏','🌟','😍','💪'];
      bd.innerHTML=`<div class="wall-grid"><div class="wall-form">${a.sheet?`<button class="b b-ghost b-sm wsheet">🖼️ ${a.sheetLabel||'شاهد الورقة'}</button>`:''}
          ${picksHTML(a)}<div class="fw">${(a.fields||[]).map((f,k)=>`<label class="fld"><span class="fl-l">${f.label}</span><textarea class="field" rows="${f.rows||2}" data-k="${k}" placeholder="${f.ph||''}"></textarea></label>`).join('')}</div>
          <button class="b b-green wpost">📌 ${a.postLabel||'انشر على جدار المجموعة'}</button></div>
        <div class="wall-side"><p class="wall-h">🧱 ${a.wallTitle||'جدار المجموعة'} <span class="muted">— شاهد أعمال زملائك وتفاعل بإيموجي</span></p><div class="wl"><p class="muted wl-empty">لا توجد منشورات بعد… كن أول من ينشر! ✨</p></div></div></div>`;
      wirePicks(bd,a); if(a.sheet) $('.wsheet',bd).onclick=()=>lightbox(a.sheet);
      const vals=()=>(a.fields||[]).map((f,k)=>({label:f.label,value:$(`textarea[data-k="${k}"]`,bd).value.trim()}));
      const paint=()=>{ const wl=$('.wl',bd); const ps=POSTS.slice().reverse(); if(!ps.length) return;
        wl.innerHTML=ps.map(p=>{ const rs=REACTS.filter(r=>r.parentId===p.id); return `<div class="wp ${p.uid===me.uid?'mine':''}" data-id="${p.id}"><div class="wp-h"><span class="uc-av">${(p.name||'?').trim()[0]||'?'}</span><b>${esc(p.name||'')}</b>${p.uid===me.uid?'<span class="pill green" style="font-size:11px">منشوري</span>':''}</div>
          <div class="wp-b">${(p.fields||[]).filter(x=>x.value).map(x=>`<p><b>${esc(x.label.replace(/<[^>]+>/g,''))}:</b> ${esc(x.value).replace(/(https?:\/\/\S+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>')}</p>`).join('')}</div>
          <div class="wp-r">${EM.map(e=>{ const n=rs.filter(r=>r.text===e).length, mine=rs.some(r=>r.text===e&&r.uid===me.uid); return `<button class="rx ${mine?'on':''}" data-e="${e}">${e}${n?` <i>${AR(n)}</i>`:''}</button>`; }).join('')}</div></div>`; }).join('');
        $$('.wp',wl).forEach(w=>$$('.rx',w).forEach(b=>b.onclick=async()=>{ const id=w.dataset.id, e=b.dataset.e; const mine=REACTS.find(r=>r.parentId===id&&r.text===e&&r.uid===me.uid);
          try{ if(mine) await DB().deleteComment(mine.id); else { await DB().addComment({lesson:L.id,page:tag,kind:'react',parentId:id,text:e}); save(L,'wall-react',{post:id,emoji:e}); } }catch(x){ toast('تعذّر التفاعل الآن'); } })); };
      try{ DB().listComments(L.id,list=>{ POSTS=list.filter(c=>c.kind==='post'&&c.page===tag); REACTS=list.filter(c=>c.kind==='react'&&c.page===tag); posted=posted||POSTS.some(x=>x.uid===me.uid); paint(); }); }catch(x){}
      $('.wpost',bd).onclick=async()=>{ const g=readPicks(bd,a), v=vals(); if(g.some(x=>!x.value)) return toast('☝️ اختر من كل مجموعة'); if(v.some(x=>!x.value)) return toast('✍️ أكمل كل الخانات قبل النشر');
        if((a.fields||[]).some((f,k)=>f.url&&!/^https?:\/\/\S+\.\S+/.test(v[k].value))) return toast('🔗 اكتب رابطًا صحيحًا يبدأ بـ https://');
        const b=$('.wpost',bd); b.disabled=true; b.textContent='⏳ جارٍ النشر…';
        try{ await DB().addComment({lesson:L.id,page:tag,kind:'post',text:v.map(x=>x.label.replace(/<[^>]+>/g,'')+': '+x.value).join(' | '),fields:g.concat(v)}); posted=true;
          setFb(fb,'ok','📌','تم نشر عملك على جدار المجموعة… تفاعل مع أعمال زملائك بالإيموجي!','نُشر ✔'); confetti(40); }
        catch(x){ toast('تعذّر النشر: '+x.message); } b.disabled=false; b.textContent='📌 '+(a.postLabel||'انشر مرة أخرى'); };
      get=()=>({picks:readPicks(bd,a),fields:vals(),posted});
      valid=()=>posted||(toast('📌 انشر عملك على جدار المجموعة أولًا'),false);
    }
    if(a.type==='pick'){
      bd.innerHTML=`<div class="pick">${a.cards.map((c,k)=>`<button class="pk ${c.cls||''}" data-k="${k}"><span class="pk-e">${c.e||'🃏'}</span>${c.t}</button>`).join('')}</div>
        <label class="fld"><span class="fl-l">${a.prompt||'دافع عن اختيارك بجملة من النص'}</span><textarea class="field" rows="3" placeholder="${a.ph||'أختار هذه البطاقة لأن النص قال: «…»'}"></textarea></label>`;
      let chosen=-1; $$('.pk',bd).forEach(b=>b.onclick=()=>{ chosen=+b.dataset.k; $$('.pk',bd).forEach(x=>x.classList.toggle('on',x===b)); });
      get=()=>({card:a.cards[chosen]&&a.cards[chosen].t,reason:$('textarea',bd).value.trim()});
      valid=()=>chosen>=0&&get().reason.length>5||(toast(chosen<0?'🃏 اختر بطاقة أولًا':'✍️ اكتب مبررك'),false);
    }
    if(a.type==='field'){
      bd.innerHTML=picksHTML(a)+(a.checks?`<div class="chks">${a.checks.map((c,k)=>`<label class="chk"><input type="checkbox" data-c="${k}"><span>${c}</span></label>`).join('')}</div>`:'')+`<div class="fw">${(a.fields||[]).map((f,k)=>`<label class="fld"><span class="fl-l">${f.label}</span><textarea class="field" rows="${f.rows||2}" data-k="${k}" placeholder="${f.ph||''}"></textarea></label>`).join('')}</div>`;
      const mb=mediaBox(a.attach||[],'L'+L.id+'_act'+(i+1),null,()=>'📖 الدرس: '+L.title+' — النشاط '+AR(i+1)+': '+(a.title||'')); bd.appendChild(mb);
      wirePicks(bd,a);
      get=()=>({picks:readPicks(bd,a),fields:(a.fields||[]).map((f,k)=>({label:f.label,value:$(`textarea[data-k="${k}"]`,bd).value.trim()})),files:mb.getFiles()});
      valid=()=>{ const g=get(); if(a.picks&&g.picks.some(x=>!x.value)) return toast('☝️ اختر من كل مجموعة'),false;
        if(isG&&a.picks&&a.picks.some(x=>x.c!=null)){ const bad=a.picks.map((pk,gi)=>pk.c!=null&&g.picks[gi].value!==pk.o[pk.c]?gi:-1).filter(x=>x>=0);
          $$('.pkg',bd).forEach((el,gi)=>{ el.classList.toggle('bad',bad.includes(gi)); el.classList.toggle('good',a.picks[gi].c!=null&&!bad.includes(gi)); });
          if(bad.length){ setFb(fb,'hint','💡',bad.map(gi=>a.picks[gi].hint||'').filter(Boolean).join(' ')||'راجع الاختيار المحدد باللون الأحمر','قريب… راجع اختيارك'); return false; }
          setFb(fb,'ok','🌟',a.ok||'أحسنت! اختياراتك صحيحة.','إجابة صحيحة ✔'); }
        if(a.needFile&&!g.files.length) return toast('📷 أضف '+(a.needFile===true?'الصورة':a.needFile)+' أولًا'),false;
        if(!(g.fields.some(f=>f.value)||g.files.length||(a.picks&&!(a.fields||[]).length))) return toast('✍️ اكتب إجابتك أو أضف ملفًا'),false;
        if(a.needFields&&g.fields.some(f=>!f.value)) return toast('✍️ أكمل كل الخانات'),false;
        if(a.checks&&$$('.chk input',bd).some(x=>!x.checked)) return toast('☑️ تأكد من كل الشروط وعلّم عليها'),false;
        { const bad=(a.fields||[]).findIndex((f,k)=>f.url&&g.fields[k].value&&!/^https?:\/\/\S+\.\S+/.test(g.fields[k].value)); if(bad>=0) return toast('🔗 اكتب رابطًا صحيحًا يبدأ بـ https://'),false; }
        if(!mb.isSent()) return toast('📤 اضغط «إرسال الملفات» أولًا'),false; return true; };
    }
    if(a.img&&a.type==='wall'){ const f=$('.wall-form',bd); if(f) f.insertBefore(h(`<button class="b b-ghost b-sm wimg">🖼️ شاهد لوحة النشاط</button>`),f.firstChild); $('.wimg',bd).onclick=()=>lightbox(a.img); }
    else if(a.img){ const sp=h(`<div class="ac-split"><figure class="ac-img"><img src="${a.img}" alt=""><figcaption>🔍 اضغط للتكبير</figcaption></figure><div class="ac-main"></div></div>`);
      const mn=$('.ac-main',sp); while(bd.firstChild) mn.appendChild(bd.firstChild); bd.appendChild(sp); $('.ac-img',sp).onclick=()=>lightbox(a.img); }
    $('.sv',p).onclick=()=>{ if(!valid()) return; let r={}; if(check){ r=check(); if(!r.ok){ save(L,'activity-try',Object.assign({n:i+1},get(),r)); return; } }
      complete(i,Object.assign(get(),r)); if(!check) setFb(fb,'ok','💾','تم حفظ نشاطك على المنصة','أحسنت ✔'); };
    return p;
  }
};

/* =========================================================
   6) تذكرة الخروج
   ========================================================= */
R.exit=function(ctx){ const {L,body,markDone}=ctx; const Q=(L.exit||{})[MODE]||[]; const ans=Q.map(()=>null);
  const prev=store.get(KEY('exit_L'+L.id),null);
  const sc=h(`<div class="screen on"><div class="qz">
    <div class="qz-top"><span class="pill pink">🎟️ تذكرة الخروج</span><div class="dots click">${Q.map((_,i)=>`<i data-i="${i}">${AR(i+1)}</i>`).join('')}</div><span class="sp"></span><span class="pill">${isG?'🧭 المسار الموجّه':'🎨 المسار الحر'}</span></div>
    <div class="qz-card ex-card"></div>
    <div class="qz-foot"><button class="b b-ghost pv">→ السابق</button><span class="muted cnt" style="font-size:13px;font-weight:700"></span><span class="sp"></span><button class="b b-main nx">التالي ←</button><button class="b b-green fin">تسليم التذكرة ✅</button></div>
  </div></div>`);
  body.appendChild(sc);
  const card=$('.ex-card',sc), dots=$$('.dots i',sc); let i=0;
  dots.forEach(d=>d.onclick=()=>show(+d.dataset.i));
  function paintDots(){ dots.forEach((d,j)=>d.className=j===i?'cur':(ans[j]!=null&&ans[j]!==''?'ans':'')); }
  function show(n){ i=n; const q=Q[i]; card.innerHTML=`<p class="qz-q"><span class="qn">${AR(i+1)}</span>${q.q}</p>${q.quote?`<div class="bx-quote">${q.quote}</div>`:''}`;
    const fb=h('<div class="fb"><span class="e"></span><span class="m"></span></div>');
    if(q.type==='choice'||q.type==='scale'||q.type==='yesno'){
      const opts=q.o||(q.type==='yesno'?['نعم','لا']:[]);
      const w=h(`<div class="ex-opts t-${q.type}">${opts.map((o,k)=>`<button class="choice ${ans[i]===o?'sel':''}" data-k="${k}"><span class="k">${q.type==='scale'?['😣','🙁','😐','🙂','😄'][k]||'•':LET[k]}</span>${o}</button>`).join('')}</div>`);
      card.appendChild(w);
      $$('.choice',w).forEach(b=>b.onclick=()=>{ const k=+b.dataset.k; ans[i]=opts[k]; $$('.choice',w).forEach(x=>x.classList.toggle('sel',x===b)); paintDots();
        if(isG&&q.c!=null){ if(k===q.c){ b.classList.add('right'); setFb(fb,'ok','🌟',q.ok||'أحسنت!','إجابة صحيحة ✔'); } else { b.classList.add('wrong'); setFb(fb,'hint','💡',q.hint||'فكّر مرة أخرى','تلميح'); } } });
      if(q.text){ const t=h(`<textarea class="field" rows="2" placeholder="${q.text}"></textarea>`); card.appendChild(t); t.value=(ans[i+'_t']||''); t.oninput=()=>ans[i+'_t']=t.value; }
    } else {
      if(q.type==='emoji'){ const em=h(`<div class="emo">${['😍','😄','🙂','😐','😕','😢','🤩','💪','🙏','❤️'].map(e=>`<button>${e}</button>`).join('')}</div>`); card.appendChild(em);
        $$('button',em).forEach(b=>b.onclick=()=>{ const t=$('textarea',card); t.value=(t.value+' '+b.textContent).trim(); t.oninput(); }); }
      const parts=q.parts||[{ph:q.ph||'اكتب إجابتك…'}];
      parts.forEach((pt,k)=>{ const t=h(`<label class="fld"><span class="fl-l">${pt.label||''}</span><textarea class="field" rows="${pt.rows||2}" maxlength="${pt.max||400}" placeholder="${pt.ph||''}"></textarea></label>`); card.appendChild(t);
        const ta=$('textarea',t); const key=parts.length>1?i+'_'+k:i; ta.value=ans[key]||''; ta.oninput=()=>{ ans[key]=ta.value; if(parts.length>1) ans[i]=parts.map((_,kk)=>ans[i+'_'+kk]||'').join(' | '); paintDots(); }; });
      if(q.hint&&isG){ const hb=h('<button class="b b-hint b-sm" style="align-self:flex-start">💡 تلميح</button>'); card.appendChild(hb); hb.onclick=()=>setFb(fb,'hint','💡',q.hint,'تلميح'); }
    }
    card.appendChild(fb);
    $('.cnt',sc).textContent='السؤال '+AR(i+1)+' من '+AR(Q.length); $('.pv',sc).disabled=i===0; $('.nx',sc).style.display=i===Q.length-1?'none':''; paintDots(); runFit(); }
  $('.pv',sc).onclick=()=>show(i-1); $('.nx',sc).onclick=()=>show(i+1);
  $('.fin',sc).onclick=()=>{ const miss=Q.map((q,k)=>(ans[k]==null||ans[k]==='')&&!q.optional?k:-1).filter(k=>k>=0);
    if(miss.length){ toast('باقي '+AR(miss.length)+' سؤال بدون إجابة'); return show(miss[0]); }
    const out=Q.map((q,k)=>({q:q.q.replace(/<[^>]+>/g,''),a:ans[k],note:ans[k+'_t']||''}));
    store.set(KEY('exit_L'+L.id),out); save(L,'exit',{answers:out}); markDone('exit'); confetti(70);
    sc.innerHTML=`<div class="finale"><span class="medal">🎟️</span><h3>تم تسليم تذكرة الخروج</h3><p class="muted">شكرًا لمشاركتك! رأيك يهمنا لتطوير تجربتك.</p><div class="row" style="justify-content:center">${nextBtn(ctx)}</div></div>`; runFit(); };
  if(prev){ sc.innerHTML=`<div class="finale"><span class="medal">✅</span><h3>سلّمت تذكرة الخروج من قبل</h3><p class="muted">يمكنك المتابعة للخطوة التالية.</p><div class="row" style="justify-content:center"><button class="b b-ghost again">✏️ تعديل إجاباتي</button>${nextBtn(ctx)}</div></div>`;
    $('.again',sc).onclick=()=>{ store.set(KEY('exit_L'+L.id),null); location.reload(); }; }
  else show(0);
};

/* =========================================================
   7) ثمرة قراءتي
   ========================================================= */
R.harvest=function(ctx){ const {L,body,markDone}=ctx;
  const sc=h(`<div class="screen on"><div class="hv">
    <div class="hv-tree"><span class="hv-t">🌳</span><span class="hv-a a1">🍎</span><span class="hv-a a2">🍎</span><span class="hv-a a3">🍏</span></div>
    <div class="hv-card"><span class="pill green">🍎 في آخر الدرس</span><h3 class="fun">ايه ثمرة قراءتك في سطرين؟</h3>
      <p class="muted">اكتب أهم ما خرجت به من درس «${L.title}» بأسلوبك، في سطرين فقط.</p>
      <textarea class="field hv-ta" rows="2" maxlength="220" placeholder="ثمرة قراءتي في هذا الدرس أن…"></textarea>
      <div class="row"><span class="muted cnt" style="font-size:12.5px;font-weight:700"></span><span class="sp"></span><span class="hv-saved muted" style="font-size:12.5px"></span><button class="b b-green sv">💾 حفظ</button></div>
      <div class="fb"><span class="e"></span><span class="m"></span></div>
      <div class="row hv-next" style="display:none"><a class="b b-ghost" style="text-decoration:none" href="../module${Math.ceil(L.id/3)}.html">📚 دروس الوحدة</a><span class="sp"></span></div>
    </div></div></div>`);
  body.appendChild(sc);
  const ta=$('.hv-ta',sc), cnt=$('.cnt',sc);
  const lines=()=>ta.value.split('\n').length;
  ta.oninput=()=>{ if(lines()>2) ta.value=ta.value.split('\n').slice(0,2).join('\n'); cnt.textContent=AR(ta.value.length)+'/'+AR(220)+' حرف • '+AR(Math.min(2,lines()))+' من ٢ سطر'; };
  (async()=>{ try{ const hv=await DB().getHarvest(L.id); if(hv&&hv.text){ ta.value=hv.text; $('.hv-saved',sc).textContent='آخر حفظ: '+new Date(hv.at).toLocaleString('ar-EG'); } }catch(e){} ta.oninput(); })();
  $('.sv',sc).onclick=async()=>{ const t=ta.value.trim(); if(t.length<8) return toast('✍️ اكتب سطرًا على الأقل');
    const b=$('.sv',sc); b.disabled=true; b.textContent='⏳ جارٍ الحفظ…';
    try{ await DB().saveHarvest(L.id,t); save(L,'harvest',{text:t}); markDone('harvest'); setFb($('.fb',sc),'ok','🍎','تم حفظ ثمرة قراءتك في حسابك.','أحسنت ✔'); confetti(90);
      $('.hv-saved',sc).textContent='آخر حفظ: '+new Date().toLocaleString('ar-EG'); $('.hv-next',sc).style.display='flex'; }
    catch(e){ setFb($('.fb',sc),'bad','⚠️',e.message,'تعذّر الحفظ'); }
    b.disabled=false; b.textContent='💾 حفظ'; };
};
})();
