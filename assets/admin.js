/* لوحة المشرف — متابعة الطلاب والردود */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DB=window.FLDB, MODE=(window.SITE||{}).mode||'guided';
const LESSONS={14:'الاختبار النهائي',13:'رحلة قطار الهولوجرام',12:'مشروع الوحدة الثالثة',11:'مشروع الوحدة الثانية',10:'مشروع الوحدة الأولى',1:'آداب التعامل مع الوالدين',2:'أغلى من الذهب',3:'الصداقة',4:'ثمرة القراءة',5:'أفضل النعم',6:'خير جليس',7:'بناء المستقبل في عصر الآلة',8:'حرفتك بين يديك',9:'مستقبل مصر في الزراعة'};
const PAT={free:'🎨 حر',guided:'🧭 موجّه'};
const STEP={'warmup-vote':'تصويت التهيئة','video-stop':'وقفة الفيديو','video-hint':'تلميح الفيديو','video-done':'إنهاء الفيديو','box':'صندوق الفهم','box-open':'فتح الصندوق','box-try':'محاولة الصندوق','box-link-open':'فتح رابط',
  activity:'نشاط','activity-try':'محاولة نشاط','sos-open':'كارت المساعدة',exit:'تذكرة الخروج',harvest:'ثمرة قراءتي',comment:'تعليق',guided:'نشاط موجّه (ثمرة القراءة)',free:'نشاط حر (ثمرة القراءة)',formative:'التقويم الختامي',post:'الاختبار البعدي',video:'الفيديو (ثمرة القراءة)'};
const fmtT=t=>t?new Date(t).toLocaleString('ar-EG'):'';
function toast(m){ let t=$('.toast'); if(!t){ t=document.createElement('div'); t.className='toast'; document.body.appendChild(t); } t.textContent=m; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),2600); }
function csv(name,rows){ const s='﻿'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""').replace(/\r?\n/g,' ')+'"').join(',')).join('\r\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([s],{type:'text/csv;charset=utf-8'})); a.download=name+'.csv'; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),300); }
function summarize(d){ if(!d) return ''; if(typeof d!=='object') return String(d);
  if(d.answer!=null) return (d.q?('س: '+d.q.replace(/<[^>]+>/g,'')+' — '):'')+'ج: '+d.answer+(d.tries?` (محاولات ${d.tries})`:'');
  if(d.answers) return d.answers.map(a=>typeof a==='string'?a:((a.q?a.q.slice(0,40)+'… ':'')+'← '+(a.a??'')+(a.note?' / '+a.note:''))).join(' ‖ ');
  if(d.text) return d.text; if(d.fields) return d.fields.map(f=>f.label+': '+f.value).join(' ‖ ')+(d.files&&d.files.length?` [📎 ${d.files.length} ملف]`:'');
  if(d.rows) return d.rows.map(r=>r.join(' | ')).join(' ‖ '); if(d.placed) return d.placed.map(p=>p.card+' → '+(p.to||p.bin)).join(' ‖ ')+(d.score!=null?` (صحيح ${d.score})`:'');
  if(d.card) return d.card+' — '+d.reason; if(d.label) return d.label;
  return JSON.stringify(d).slice(0,300); }
function files(d){ const f=(d&&d.files)||[]; return f.map(x=>x.url?`<a href="${x.url}" target="_blank">📎 ${esc(x.kind||'ملف')}</a>`:`<span title="${esc(x.name||'')}">${x.via==='whatsapp'?'📲 واتساب':'📎'} ${esc({video:'فيديو',photo:'صورة',audio:'تسجيل'}[x.kind]||'ملف')}${x.via==='whatsapp'&&!x.sent?' (لم يُرسل)':''}</span>`).join('<br>'); }

let S={students:[],responses:[],progress:[],comments:[],highlights:[],harvest:[],votes:[]};
const app=$('#adm');
async function start(){ if(window.FLAUTH) try{ FLAUTH.paintChip(); }catch(e){}
  await DB.ready(); const u=DB.user();
  if(!u||u.role!=='admin'){ if(u) await DB.logout(); renderLogin(); return; }
  renderShell(u); await loadAll(); show('students');
}
function renderLogin(){
  app.innerHTML=`<div class="adm-login"><div class="auth-card"><div class="auth-head"><span class="auth-ic">🛡️</span><div><h3>لوحة المشرف</h3><p>متابعة الطلاب والردود والتعليقات</p></div></div>
    <label class="auth-l">${DB.live?'البريد الإلكتروني':'اسم المستخدم'}<input class="field au" dir="ltr" placeholder="${DB.live?'admin@example.com':'admin'}"></label>
    <label class="auth-l">كلمة المرور<input class="field ap" type="password" dir="ltr"></label><p class="auth-err"></p>
    <button class="b b-main go" style="justify-content:center">دخول ←</button>
    ${DB.live?'':'<p class="auth-demo">🧪 وضع تجريبي (بدون قاعدة بيانات): admin / admin — البيانات تُحفظ على هذا الجهاز فقط. اضبط ملف assets/firebase-config.js لتفعيل قاعدة البيانات.</p>'}
    <a class="auth-back" href="index.html">→ الرجوع للصفحة الرئيسية</a></div></div>`;
  const go=async()=>{ try{ await DB.loginAdmin($('.au').value,$('.ap').value); start(); }catch(e){ $('.auth-err').textContent=e.message; } };
  $('.go').onclick=go; $('.ap').addEventListener('keydown',e=>{ if(e.key==='Enter') go(); });
}
function renderShell(u){
  app.innerHTML=`<div class="adm">
    <aside class="adm-side"><div class="adm-brand">🛡️ لوحة المشرف<small>${DB.live?'🟢 متصل بقاعدة البيانات':'🧪 وضع تجريبي (محلي)'}</small></div>
      ${[['students','👥 الطلاب'],['progress','📈 التقدّم'],['responses','📥 الردود والأنشطة'],['comments','💬 التعليقات'],['highlights','🖍️ التظليل'],['harvest','🍎 ثمرة قراءتي'],['votes','🗳️ التصويت'],['exam','📝 الاختبار النهائي'],['museum','🏛️ المتحف الرقمي']].map(([k,t])=>`<button data-t="${k}">${t}</button>`).join('')}
      <span class="sp"></span><button class="rf">🔄 تحديث البيانات</button><button class="out">🚪 خروج (${esc(u.name||u.email||'')})</button></aside>
    <section class="adm-main"><div class="adm-bar"><select class="field fl-pat"><option value="">كل المجموعات</option><option value="free">🎨 المجموعة الحرة</option><option value="guided">🧭 المجموعة الموجهة</option></select>
      <select class="field fl-les"><option value="">كل الدروس</option>${Object.entries(LESSONS).map(([k,v])=>`<option value="${k}">الدرس ${k}: ${v}</option>`).join('')}</select>
      <input class="field fl-q" placeholder="🔎 بحث باسم الطالب…"><span class="sp"></span><button class="b b-ghost b-sm exp">⬇️ تصدير CSV</button></div>
      <div class="adm-view"></div></section></div>`;
  $$('.adm-side [data-t]').forEach(b=>b.onclick=()=>show(b.dataset.t));
  $('.rf').onclick=async()=>{ await loadAll(); show(cur); toast('تم التحديث'); };
  $('.out').onclick=async()=>{ await DB.logout(); start(); };
  ['.fl-pat','.fl-les','.fl-q'].forEach(s=>$(s).addEventListener('input',()=>show(cur)));
}
async function loadAll(){ const safe=async f=>{ try{ return await f(); }catch(e){ console.warn(e); toast('⚠️ '+(e.message||e)); return []; } };
  [S.students,S.responses,S.progress,S.comments,S.highlights,S.harvest,S.votes]=await Promise.all([safe(DB.listStudents),safe(DB.listResponses),safe(DB.allProgress),safe(DB.allComments),safe(DB.allHighlights),safe(DB.allHarvest),safe(DB.allVotes)]); }
let cur='students', lastRows=null, lastName='';
const F=()=>({pat:$('.fl-pat').value,les:$('.fl-les').value,q:$('.fl-q').value.trim()});
const keep=(x)=>{ const f=F(); return (!f.pat||x.pattern===f.pat)&&(!f.les||String(x.lesson)===f.les)&&(!f.q||String(x.name||'').includes(f.q)||String(x.username||'').includes(f.q)); };
function table(cols,rows){ return `<div class="adm-tbl"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="empty">لا توجد بيانات بعد</td></tr>`}</tbody></table></div>`; }
function show(t){ cur=t; $$('.adm-side [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t)); const v=$('.adm-view'); const f=F();
  $('.fl-les').style.display=t==='students'?'none':'';
  if(t==='students'){
    const list=S.students.filter(s=>(!f.pat||s.pattern===f.pat)&&(!f.q||String(s.name).includes(f.q)||String(s.username).includes(f.q)));
    v.innerHTML=`<div class="adm-forms"><div class="adm-card"><h4>➕ إضافة طالب</h4><div class="adm-row"><input class="field s-n" placeholder="اسم الطالب"><input class="field s-u" dir="ltr" placeholder="اسم المستخدم (إنجليزي)"><input class="field s-p" dir="ltr" placeholder="كلمة المرور (6+)"><input class="field s-g" placeholder="المجموعة/الفصل (اختياري)">
        <select class="field s-pat"><option value="free" ${MODE==='free'?'selected':''}>🎨 المجموعة الحرة</option><option value="guided" ${MODE==='guided'?'selected':''}>🧭 المجموعة الموجهة</option></select><button class="b b-main add">إضافة</button></div></div>
      <div class="adm-card"><h4>📋 إضافة مجموعة طلاب دفعة واحدة</h4><p class="muted">كل سطر: الاسم، اسم المستخدم، كلمة المرور، الفصل — وتُضاف إلى المجموعة المختارة بالأعلى</p><div class="adm-row"><textarea class="field s-bulk" rows="2" placeholder="أحمد علي، ahmed.ali، 123456، 3/1"></textarea><button class="b b-ghost bulk">إضافة الكل</button></div><p class="bulk-st muted"></p></div></div>
      ${table(['الاسم','اسم المستخدم','المجموعة','الفصل','تاريخ الإضافة','الحالة'],list.map(s=>[esc(s.name),`<code>${esc(s.username)}</code>`,PAT[s.pattern]||'',esc(s.group||''),fmtT(s.createdAt),`<button class="b b-sm ${s.disabled?'b-green':'b-ghost'} tg" data-u="${s.uid}">${s.disabled?'تفعيل':'إيقاف'}</button>`]))}`;
    lastRows=[['الاسم','اسم المستخدم','المجموعة','الفصل','تاريخ الإضافة','موقوف']].concat(list.map(s=>[s.name,s.username,s.pattern,s.group,fmtT(s.createdAt),s.disabled?'نعم':'لا'])); lastName='الطلاب';
    $('.add',v).onclick=async()=>{ try{ await DB.createStudent({name:$('.s-n',v).value.trim(),username:$('.s-u',v).value,password:$('.s-p',v).value,group:$('.s-g',v).value.trim(),pattern:$('.s-pat',v).value}); toast('✅ تمت إضافة الطالب'); await loadAll(); show('students'); }catch(e){ toast('⚠️ '+e.message); } };
    $('.bulk',v).onclick=async()=>{ const lines=$('.s-bulk',v).value.split('\n').map(l=>l.split(/[,،\t]/).map(x=>x.trim())).filter(l=>l[0]&&l[1]&&l[2]); let ok=0,bad=[];
      for(const l of lines){ $('.bulk-st',v).textContent='جارٍ الإضافة… '+(ok+bad.length+1)+'/'+lines.length; try{ await DB.createStudent({name:l[0],username:l[1],password:l[2],group:l[3]||'',pattern:$('.s-pat',v).value}); ok++; }catch(e){ bad.push(l[1]+': '+e.message); } }
      await loadAll(); show('students'); $('.bulk-st',$('.adm-view')).textContent=`✅ أضيف ${ok}`+(bad.length?` — ⚠️ لم يُضف: ${bad.join('، ')}`:''); };
    $$('.tg',v).forEach(b=>b.onclick=async()=>{ const s=S.students.find(x=>x.uid===b.dataset.u); await DB.updateStudent(s.uid,{disabled:!s.disabled}); await loadAll(); show('students'); });
  }
  if(t==='progress'){
    const steps=['aims','warmup','content','box','activity','selftest','posttest','exit','harvest']; const SN={aims:'الأهداف',warmup:'التهيئة',content:'الفيديو',box:'الصندوق',activity:'الأنشطة',selftest:'التقويم',posttest:'البعدي',exit:'الخروج',harvest:'الثمرة'};
    const rows=[]; S.progress.filter(p=>(!f.pat||p.pattern===f.pat)&&(!f.q||String(p.name).includes(f.q))).forEach(p=>Object.keys(p).filter(k=>/^L\d+$/.test(k)).forEach(k=>{ const n=+k.slice(1); if(f.les&&String(n)!==f.les) return; rows.push([p.name,PAT[p.pattern]||'','الدرس '+n+': '+LESSONS[n],p[k]]); }));
    v.innerHTML=table(['الطالب','المجموعة','الدرس','الخطوات المنجزة'],rows.map(r=>[esc(r[0]),r[1],r[2],r[3].map(s=>`<span class="stp">✓ ${SN[s]||s}</span>`).join(' ')]));
    lastRows=[['الطالب','المجموعة','الدرس','الخطوات المنجزة']].concat(rows.map(r=>[r[0],r[1],r[2],r[3].map(s=>SN[s]||s).join('، ')])); lastName='التقدم';
  }
  if(t==='responses'){
    const list=S.responses.filter(keep);
    v.innerHTML=table(['الوقت','الطالب','المجموعة','الدرس','النوع','الإجابة / المحتوى','ملفات'],list.map(r=>[fmtT(r.at),esc(r.name),PAT[r.pattern]||'',r.lesson,STEP[r.step]||r.step,`<div class="ans">${esc(summarize(r.data))}</div>`,files(r.data)]));
    lastRows=[['الوقت','الطالب','اسم المستخدم','الفصل','المجموعة','الدرس','النوع','الإجابة','البيانات الكاملة']].concat(list.map(r=>[fmtT(r.at),r.name,r.username,r.group,r.pattern,r.lesson,STEP[r.step]||r.step,summarize(r.data),JSON.stringify(r.data)])); lastName='الردود';
  }
  if(t==='comments'){
    const list=S.comments.filter(keep);
    v.innerHTML=table(['الوقت','الطالب','المجموعة','الدرس','الفقرة','الاقتباس','التعليق','رد؟',''],list.map(c=>[fmtT(c.at),esc(c.name),PAT[c.pattern]||'',c.lesson,(c.page??0)+1,c.quote?`«${esc(c.quote)}»`:'',esc(c.text),c.parentId?'↩ رد':'',`<button class="b b-sm b-ghost del" data-id="${c.id}">🗑</button>`]));
    $$('.del',v).forEach(b=>b.onclick=async()=>{ await DB.deleteComment(b.dataset.id); await loadAll(); show('comments'); });
    lastRows=[['الوقت','الطالب','المجموعة','الدرس','الفقرة','الاقتباس','التعليق','رد']].concat(list.map(c=>[fmtT(c.at),c.name,c.pattern,c.lesson,(c.page??0)+1,c.quote||'',c.text,c.parentId?'نعم':''])); lastName='التعليقات';
  }
  if(t==='highlights'){
    const C={y:'🟡 فكرة مهمة',r:'🔴 لم أفهمها',g:'🟢 أعجبتني'}; const rows=[];
    S.highlights.filter(keep).forEach(hh=>(hh.items||[]).forEach(it=>rows.push([hh.name,hh.pattern,hh.lesson,(it.page??0)+1,C[it.color]||it.color,it.text||'',fmtT(it.at)])));
    v.innerHTML=table(['الطالب','المجموعة','الدرس','الفقرة','اللون','الجملة المظللة','الوقت'],rows.map(r=>[esc(r[0]),PAT[r[1]]||'',r[2],r[3],r[4],esc(r[5]),r[6]]));
    lastRows=[['الطالب','المجموعة','الدرس','الفقرة','اللون','الجملة','الوقت']].concat(rows); lastName='التظليل';
  }
  if(t==='harvest'){
    const list=S.harvest.filter(keep);
    v.innerHTML=table(['الطالب','المجموعة','الدرس','ثمرة قراءتي','الوقت'],list.map(x=>[esc(x.name),PAT[x.pattern]||'',x.lesson+': '+(LESSONS[x.lesson]||''),`<div class="ans">${esc(x.text)}</div>`,fmtT(x.at)]));
    lastRows=[['الطالب','المجموعة','الدرس','ثمرة قراءتي','الوقت']].concat(list.map(x=>[x.name,x.pattern,x.lesson,x.text,fmtT(x.at)])); lastName='ثمرة_قراءتي';
  }
  if(t==='votes'){
    const agg={}; S.votes.filter(keep).forEach(x=>{ const k=x.lesson+'|'+x.pattern; agg[k]=agg[k]||{lesson:x.lesson,pattern:x.pattern,c:{}}; agg[k].c[x.choice]=(agg[k].c[x.choice]||0)+1; });
    const rows=Object.values(agg).map(a=>[a.lesson+': '+(LESSONS[a.lesson]||''),PAT[a.pattern]||'',Object.entries(a.c).map(([k,n])=>`الاختيار ${+k+1}: ${n}`).join(' — ')]);
    v.innerHTML=table(['الدرس','المجموعة','نتيجة التصويت'],rows); lastRows=[['الدرس','المجموعة','النتيجة']].concat(rows); lastName='التصويت';
  }
  if(t==='exam'){
    const latest={}; S.responses.filter(r=>r.step==='exam'&&r.data&&r.data.total).filter(r=>{ const f=F(); return (!f.pat||r.pattern===f.pat)&&(!f.q||String(r.name||'').includes(f.q)); })
      .forEach(r=>{ const k=r.uid||r.name; if(!latest[k]||latest[k].at>r.at) latest[k]=r; });
    const list=Object.values(latest).sort((a,b)=>(a.pattern||'').localeCompare(b.pattern||'')||(b.data.score-a.data.score));
    const avg=pat=>{ const xs=list.filter(r=>r.pattern===pat).map(r=>r.data.score); return xs.length?(xs.reduce((a,b)=>a+b,0)/xs.length).toFixed(1)+' ('+xs.length+' طالب)':'—'; };
    v.innerHTML=`<div class="adm-stats"><div>🧭 متوسط المجموعة الموجهة: <b>${avg('guided')}</b></div><div>🎨 متوسط المجموعة الحرة: <b>${avg('free')}</b></div><div class="muted">الدرجة من ٦٠ • التصدير يحتوي إجابة كل طالب في كل سؤال (١ = صحيح)</div></div>`+
      table(['الطالب','المجموعة','الدرجة / ٦٠','النسبة','النص الأول / ٣٠','النص الثاني / ٣٠','الزمن (دقيقة)','وقت التسليم'],list.map(r=>{ const d=r.data; return [esc(r.name),PAT[r.pattern]||'',`<b>${d.score}</b>`,Math.round(d.score/d.total*100)+'%',d.s1,d.s2,d.mins,fmtT(r.at)]; }));
    const N=60; lastRows=[['الطالب','المجموعة','الدرجة','النص الأول','النص الثاني','الزمن بالدقائق','وقت التسليم'].concat(Array.from({length:N},(_,i)=>'س'+(i+1)),Array.from({length:N},(_,i)=>'صحة س'+(i+1)))]
      .concat(list.map(r=>{ const d=r.data; return [r.name,r.pattern==='free'?'حرة':'موجهة',d.score,d.s1,d.s2,d.mins,fmtT(r.at)].concat(d.answers||[],d.correct||[]); })); lastName='الاختبار_النهائي';
  }
  if(t==='museum'){ const M=museumData();
    v.innerHTML=`<div class="adm-stats"><div>🏛️ متحف «كيف أفكر سليمًا؟» — مشروع الوحدة الثانية (المجموعة الحرة)</div><span class="sp"></span><button class="b b-main b-sm mus-open">🖼️ فتح صفحة المتحف</button><button class="b b-ghost b-sm mus-dl">⬇️ تنزيل صفحة المتحف (للملاحق)</button></div>`+
      table(['الطالب','🖼️ جناح الثمرة (فكرة الإنفوجرافيك)','🎙️ جناح النعمة','📚 جناح الجليس (المصدر)'],M.map(x=>[esc(x.name),esc(x.w1||'—')+(x.f1?' <span class="muted">📲 الصورة على واتساب</span>':''),esc(x.w2||'—')+(x.f2?' <span class="muted">📲 التسجيل على واتساب</span>':''),x.url?`<a href="${esc(x.url)}" target="_blank">${esc(x.url)}</a><br>${esc(x.why||'')}`:'—']));
    lastRows=[['الطالب','جناح الثمرة','جناح النعمة','رابط جناح الجليس','لماذا اخترته']].concat(M.map(x=>[x.name,x.w1,x.w2,x.url,x.why])); lastName='المتحف_الرقمي';
    $('.mus-open').onclick=()=>{ const w=window.open('','_blank'); if(!w) return toast('اسمح بالنوافذ المنبثقة'); w.document.write(museumHTML(M)); w.document.close(); };
    $('.mus-dl').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([museumHTML(M)],{type:'text/html;charset=utf-8'})); a.download='المتحف-الرقمي-كيف-أفكر-سليما.html'; document.body.appendChild(a); a.click(); setTimeout(()=>a.remove(),300); };
  }
}
function museumData(){ const by={};
  const get=r=>by[r.uid||r.name]=by[r.uid||r.name]||{name:r.name};
  S.responses.filter(r=>+r.lesson===11&&r.step==='activity'&&r.data&&r.pattern==='free').sort((a,b)=>a.at-b.at).forEach(r=>{ const d=r.data, x=get(r), v=(d.fields||[]).map(f=>f.value).filter(Boolean).join(' — ');
    if(d.n===1){ x.w1=v; x.f1=(d.files||[]).length>0; } if(d.n===2){ x.w2=v; x.f2=(d.files||[]).length>0; } });
  S.comments.filter(c=>+c.lesson===11&&c.kind==='post'&&c.page==='wall2').forEach(c=>{ const x=get(c); const f=c.fields||[]; x.url=(f.find(z=>/رابط/.test(z.label))||{}).value||''; x.why=(f.find(z=>/لماذا/.test(z.label))||{}).value||''; });
  return Object.values(by); }
function museumHTML(M){ const e=esc; return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>المتحف الرقمي: كيف أفكر سليمًا؟</title>
<style>body{margin:0;font-family:Tahoma,Arial,sans-serif;background:#F6F2FF;color:#2E2757}.w{max-width:1100px;margin:auto;padding:22px 16px}
.hd{background:linear-gradient(135deg,#7C3AED,#EC4899);color:#fff;border-radius:24px;padding:22px 26px;margin-bottom:18px}.hd h1{margin:0 0 6px;font-size:28px}.hd p{margin:0;font-weight:700;opacity:.92}
.wings{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.wings span{background:rgba(255,255,255,.2);border-radius:99px;padding:4px 14px;font-weight:700}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}.c{background:#fff;border-radius:20px;padding:14px 16px;box-shadow:0 8px 22px rgba(124,58,237,.1);break-inside:avoid}
.c h3{margin:0 0 8px;color:#5B21B6}.r{border-inline-start:4px solid #C4B5FD;padding:4px 10px;margin:8px 0;line-height:1.8}.r b{display:block;color:#7C3AED;font-size:13px}.m{color:#888;font-size:12px}a{color:#7C3AED;word-break:break-all}
.ft{text-align:center;color:#7C6FA8;margin-top:18px;font-size:13px}</style></head><body><div class="w"><div class="hd"><h1>🏛️ المتحف الرقمي: كيف أفكر سليمًا؟</h1><p>مشروع الوحدة الثانية — المجموعة الحرة • بيئة التعلم المعكوس • الصف الثالث الإعدادي</p>
<div class="wings"><span>🖼️ جناح الثمرة</span><span>🎙️ جناح النعمة</span><span>📚 جناح الجليس</span><span>👥 عدد الطلاب: ${M.length}</span></div></div>
<div class="g">${M.map(x=>`<div class="c"><h3>👤 ${e(x.name)}</h3><div class="r"><b>🖼️ جناح الثمرة — فكرة الإنفوجرافيك</b>${e(x.w1||'—')}${x.f1?'<div class="m">📲 الإنفوجرافيك أُرسل للباحثة على واتساب</div>':''}</div>
<div class="r"><b>🎙️ جناح النعمة — كيف تشحذ القراءة العقل؟</b>${e(x.w2||'—')}${x.f2?'<div class="m">📲 التسجيل الصوتي أُرسل للباحثة على واتساب</div>':''}</div>
<div class="r"><b>📚 جناح الجليس — المصدر الإثرائي</b>${x.url?`<a href="${e(x.url)}" target="_blank">${e(x.url)}</a><br>${e(x.why||'')}`:'—'}</div></div>`).join('')||'<p>لا توجد أعمال بعد.</p>'}</div>
<p class="ft">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')} — ملحق دليل الأداء</p></div></body></html>`; }
document.addEventListener('click',e=>{ if(e.target.closest('.exp')&&lastRows) csv(lastName,lastRows); });
start();
})();
