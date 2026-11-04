/* =========================================================
   القراءة التشاركية: تظليل بـ 3 ألوان + نقاش تحت كل فقرة
   (يُحفظ التظليل في حساب الطالب، والتعليقات يراها زملاء نفس المجموعة)
   ========================================================= */
(function(){
'use strict';
const F=window.FL; if(!F) return;
const {h,$,$$,esc,AR,toast,runFit}=F;
const DB=()=>window.FLDB;
const COLORS=[{k:'y',e:'🟡',t:'فكرة مهمة'},{k:'r',e:'🔴',t:'لم أفهمها'},{k:'g',e:'🟢',t:'أعجبتني'}];
const ago=t=>{ const s=Math.floor((Date.now()-t)/1000); if(s<60) return 'الآن'; const m=Math.floor(s/60); if(m<60) return 'منذ '+AR(m)+' د'; const hh=Math.floor(m/60); if(hh<24) return 'منذ '+AR(hh)+' س'; return new Date(t).toLocaleDateString('ar-EG'); };

F.R.reader=function(sc,ctx){ const {L}=ctx;
  const pages=$$('.page',sc); if(!pages.length) return;
  const book=$('.book',sc); book.classList.add('rd');
  let HL=[], CM=[], me=DB()&&DB().user();
  // ---- plain text + keyword ranges from original HTML ----
  const base=pages.map(pg=>{ const t=$('.p-text',pg); const tmp=document.createElement('div'); tmp.innerHTML=t.innerHTML.replace(/<br\s*\/?>/g,' ');
    let txt='', kw=[]; (function walk(n){ n.childNodes.forEach(c=>{ if(c.nodeType===3) txt+=c.nodeValue; else if(c.nodeType===1){ const s=txt.length; walk(c); if(c.tagName==='MARK') kw.push([s,txt.length]); } }); })(tmp);
    return {txt,kw}; });
  // ---- per page UI ----
  pages.forEach((pg,pi)=>{
    const bar=h(`<div class="rd-bar"><button class="rd-cm">💬 نقاش الفقرة <b>${AR(0)}</b></button><span class="sp"></span>
      <span class="rd-leg">${COLORS.map(c=>`<span class="lg lg-${c.k}" title="${c.t}">${c.e} ${c.t} <b>${AR(0)}</b></span>`).join('')}</span></div>`);
    pg.appendChild(bar); $('.rd-cm',bar).onclick=()=>openDrawer(pi);
    render(pi);
  });
  const tip=h(`<div class="rd-tip">${COLORS.map(c=>`<button data-c="${c.k}" title="${c.t}">${c.e}</button>`).join('')}<button data-c="x" title="مسح التظليل">🧽</button><button data-c="cm" class="tcm">💬 علّق</button></div>`);
  document.body.appendChild(tip);
  const drawer=h(`<div class="rd-dr"><div class="dr-h"><b class="dr-t"></b><span class="sp"></span><button class="b b-ghost b-sm dr-x">✕</button></div>
    <div class="dr-list"></div>
    <div class="dr-new"><div class="dr-q" style="display:none"></div><textarea class="field" rows="2" maxlength="400" placeholder="اكتب تعليقك على الفقرة… احترم زملاءك 🌷"></textarea><div class="row"><button class="b b-ghost b-sm dr-cq" style="display:none">✕ بدون اقتباس</button><span class="sp"></span><button class="b b-main b-sm dr-send">إرسال ➤</button></div></div></div>`);
  book.appendChild(drawer);
  let selInfo=null, drPage=-1, quote=null, replyTo=null;

  function render(pi){ const {txt,kw}=base[pi]; const t=$('.p-text',pages[pi]);
    const marks=[]; kw.forEach(([s,e])=>marks.push({s,e,c:'kw'}));
    HL.filter(x=>x.page===pi).forEach(x=>marks.push({s:x.start,e:x.end,c:'hl-'+x.color}));
    CM.filter(c=>c.page===pi&&c.start!=null&&!c.parentId).forEach(c=>marks.push({s:c.start,e:c.end,c:'cmr',id:c.id}));
    const pts=new Set([0,txt.length]); marks.forEach(m=>{ pts.add(Math.max(0,m.s)); pts.add(Math.min(txt.length,m.e)); });
    const P=[...pts].sort((a,b)=>a-b); let html='';
    for(let k=0;k<P.length-1;k++){ const a=P[k], b=P[k+1]; if(b<=a) continue; const seg=esc(txt.slice(a,b));
      const on=marks.filter(m=>m.s<=a&&m.e>=b); if(!on.length){ html+=seg; continue; }
      const cls=on.map(m=>m.c).join(' '); const ids=on.filter(m=>m.id).map(m=>m.id).join(',');
      html+=`<span class="${cls}"${ids?` data-cm="${ids}"`:''}>${seg}</span>`; }
    t.innerHTML=html;
    $$('[data-cm]',t).forEach(s=>s.onclick=()=>{ openDrawer(pi); setTimeout(()=>{ const el=$(`.cmt[data-id="${s.dataset.cm.split(',')[0]}"]`,drawer); if(el){ el.scrollIntoView({block:'nearest'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1200); } },80); });
    const bar=$('.rd-bar',pages[pi]);
    COLORS.forEach(c=>$(`.lg-${c.k} b`,bar).textContent=AR(HL.filter(x=>x.page===pi&&x.color===c.k).length));
    $('.rd-cm b',bar).textContent=AR(CM.filter(c=>c.page===pi).length);
  }
  const renderAll=()=>{ pages.forEach((_,i)=>render(i)); runFit(); };
  // ---- selection ----
  function offsetIn(root,node,off){ let n=0; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); while(w.nextNode()){ if(w.currentNode===node) return n+off; n+=w.currentNode.nodeValue.length; } return n; }
  function readSel(){ const s=window.getSelection(); if(!s||s.isCollapsed||!s.rangeCount) return null; const r=s.getRangeAt(0);
    const pi=pages.findIndex(pg=>$('.p-text',pg).contains(r.commonAncestorContainer)); if(pi<0) return null;
    const t=$('.p-text',pages[pi]); let a=offsetIn(t,r.startContainer,r.startOffset), b=offsetIn(t,r.endContainer,r.endOffset); if(a>b) [a,b]=[b,a];
    const txt=base[pi].txt; while(a<b&&/\s/.test(txt[a])) a++; while(b>a&&/\s/.test(txt[b-1])) b--; if(b-a<2) return null;
    return {pi,a,b,text:txt.slice(a,b),rect:r.getBoundingClientRect()}; }
  function showTip(){ selInfo=readSel(); if(!selInfo){ tip.classList.remove('on'); return; }
    const r=selInfo.rect; tip.classList.add('on'); const w=tip.offsetWidth;
    tip.style.top=Math.max(8,r.top-tip.offsetHeight-10)+'px'; tip.style.left=Math.min(innerWidth-w-8,Math.max(8,r.left+r.width/2-w/2))+'px'; }
  let st; document.addEventListener('selectionchange',()=>{ clearTimeout(st); st=setTimeout(showTip,180); });
  document.addEventListener('mousedown',e=>{ if(!tip.contains(e.target)) tip.classList.remove('on'); });
  tip.addEventListener('mousedown',e=>e.preventDefault());
  $$('button',tip).forEach(b=>b.onclick=async()=>{ if(!selInfo) return; const {pi,a,b:e}=selInfo; const c=b.dataset.c;
    tip.classList.remove('on'); window.getSelection().removeAllRanges();
    if(c==='cm'){ quote={start:a,end:e,text:selInfo.text}; openDrawer(pi); return; }
    // subtract range from existing highlights on this page
    const rest=[]; HL.forEach(x=>{ if(x.page!==pi||x.end<=a||x.start>=e){ rest.push(x); return; }
      if(x.start<a) rest.push(Object.assign({},x,{end:a})); if(x.end>e) rest.push(Object.assign({},x,{start:e})); });
    HL=rest; if(c!=='x') HL.push({page:pi,start:a,end:e,color:c,text:selInfo.text,at:Date.now()});
    render(pi); runFit(); try{ await DB().setHighlights(L.id,HL); }catch(err){ toast('⚠️ تعذّر حفظ التظليل'); }
    if(c!=='x') toast(COLORS.find(x=>x.k===c).e+' تم التظليل وحفظه في حسابك',1600); });
  // ---- drawer ----
  function openDrawer(pi){ drPage=pi; drawer.classList.add('on'); $('.dr-t',drawer).textContent='💬 نقاش الفقرة '+AR(pi+1); replyTo=null;
    const dq=$('.dr-q',drawer); if(quote){ dq.style.display='block'; dq.textContent='«'+quote.text+'»'; $('.dr-cq',drawer).style.display=''; } else { dq.style.display='none'; $('.dr-cq',drawer).style.display='none'; }
    paintList(); setTimeout(()=>$('textarea',drawer).focus(),60);
    const ev=new CustomEvent('reader:show',{detail:pi}); sc.dispatchEvent(ev); }
  $('.dr-x',drawer).onclick=()=>{ drawer.classList.remove('on'); quote=null; };
  $('.dr-cq',drawer).onclick=()=>{ quote=null; $('.dr-q',drawer).style.display='none'; $('.dr-cq',drawer).style.display='none'; };
  function paintList(){ if(drPage<0) return; const list=$('.dr-list',drawer); me=DB()&&DB().user();
    const roots=CM.filter(c=>c.page===drPage&&!c.parentId);
    if(!roots.length){ list.innerHTML='<p class="dr-empty">لا توجد تعليقات بعد… كن أول من يبدأ النقاش! 🌱<br><small>ظلّل جملة واضغط «💬 علّق» لتقتبسها</small></p>'; return; }
    list.innerHTML=roots.map(c=>cmHTML(c)+`<div class="cm-reps">${CM.filter(r=>r.parentId===c.id).map(r=>cmHTML(r,true)).join('')}</div>`).join('');
    $$('.cm-rep',list).forEach(b=>b.onclick=()=>{ replyTo=b.dataset.id; const n=CM.find(x=>x.id===replyTo); const ta=$('textarea',drawer); ta.placeholder='↩ ردك على '+(n?n.name:'زميلك')+'…'; ta.focus(); });
    $$('.cm-del',list).forEach(b=>b.onclick=async()=>{ if(!confirmDel()) return; try{ await DB().deleteComment(b.dataset.id); }catch(e){ toast('⚠️ '+e.message); } });
    $$('.cm-q',list).forEach(q=>q.onclick=()=>{ const c=CM.find(x=>x.id===q.dataset.id); if(!c) return; const sp=$(`[data-cm*="${c.id}"]`,pages[c.page]); if(sp){ sp.classList.add('flash'); setTimeout(()=>sp.classList.remove('flash'),1200); } });
  }
  const confirmDel=()=>true;
  function cmHTML(c,rep){ const mine=me&&c.uid===me.uid;
    return `<div class="cmt ${rep?'rep':''} ${mine?'mine':''}" data-id="${c.id}"><span class="av">${esc((c.name||'?').trim()[0]||'?')}</span><div class="cb">
      <div class="cm-h"><b>${esc(c.name||'')}</b><small>${ago(c.at)}</small></div>
      ${c.quote?`<button class="cm-q" data-id="${c.id}">«${esc(c.quote)}»</button>`:''}<p>${esc(c.text)}</p>
      <div class="cm-a">${rep?'':`<button class="cm-rep" data-id="${c.id}">↩ رد</button>`}${mine?`<button class="cm-del" data-id="${c.id}">🗑 حذف</button>`:''}</div></div></div>`; }
  $('.dr-send',drawer).onclick=async()=>{ const ta=$('textarea',drawer), t=ta.value.trim(); if(t.length<2) return toast('✍️ اكتب تعليقك أولًا');
    const c={lesson:+L.id,page:drPage,text:t,parentId:replyTo||null};
    if(quote&&!replyTo) Object.assign(c,{start:quote.start,end:quote.end,quote:quote.text});
    const b=$('.dr-send',drawer); b.disabled=true;
    try{ await DB().addComment(c); ta.value=''; quote=null; replyTo=null; ta.placeholder='اكتب تعليقك على الفقرة… احترم زملاءك 🌷'; $('.dr-q',drawer).style.display='none'; $('.dr-cq',drawer).style.display='none';
      F.addRecord&&0; DB().saveResponse(L.id,'comment',{page:c.page+1,text:t,quote:c.quote||'',reply:!!c.parentId}); }
    catch(e){ toast('⚠️ '+e.message); }
    b.disabled=false; };
  // ---- load data ----
  (async()=>{ try{ HL=await DB().getHighlights(L.id)||[]; }catch(e){ HL=[]; } renderAll();
    try{ DB().listComments(L.id,list=>{ CM=list; renderAll(); paintList(); }); }catch(e){} })();
};
})();
