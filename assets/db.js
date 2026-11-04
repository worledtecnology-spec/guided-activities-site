/* =========================================================
   طبقة البيانات + تسجيل الدخول
   Firebase (Auth + Firestore + Storage) عند ضبط firebase-config.js
   وإلا «وضع تجريبي» محلي بنفس الواجهة لاختبار المنصة
   ========================================================= */
(function(){
'use strict';
const CFG=window.FIREBASE_CONFIG||{}, SET=window.FL_SETTINGS||{};
const LIVE=!!(CFG.apiKey&&CFG.projectId);
const MODE=(window.SITE||{}).mode||'guided';
const DOMAIN=SET.studentEmailDomain||'students.flipped-learning.app';
const ADMINS=(SET.adminEmails||[]).map(e=>String(e).toLowerCase());
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const PATTERN_NAME={free:'الأنشطة الحرة',guided:'الأنشطة الموجهة'};
const ls={ get(k,d){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} } };
const uid8=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const now=()=>Date.now();
const loadScript=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('تعذّر تحميل '+src)); document.head.appendChild(s); });
const cleanUser=u=>String(u||'').trim().toLowerCase().replace(/\s+/g,'');
const AR_ERR={ 'auth/invalid-credential':'اسم المستخدم أو كلمة المرور غير صحيحة','auth/wrong-password':'كلمة المرور غير صحيحة','auth/user-not-found':'هذا الحساب غير موجود',
  'auth/invalid-email':'اسم المستخدم غير صالح (حروف إنجليزية وأرقام فقط)','auth/email-already-in-use':'اسم المستخدم مستخدم من قبل','auth/weak-password':'كلمة المرور قصيرة (6 أحرف على الأقل)',
  'auth/network-request-failed':'تحقق من اتصال الإنترنت','auth/too-many-requests':'محاولات كثيرة… انتظر قليلًا ثم أعد المحاولة','permission-denied':'لا تملك صلاحية لهذا الإجراء' };
const err=e=>new Error(AR_ERR[e&&e.code]||(e&&e.message)||String(e));

/* ================= Firebase backend ================= */
const FB={
  app:null, auth:null, fs:null, st:null, profile:null,
  async init(){
    await loadScript(SDK+'firebase-app-compat.js');
    await Promise.all(['auth','firestore','storage'].map(m=>loadScript(SDK+`firebase-${m}-compat.js`)));
    this.app=firebase.apps.length?firebase.app():firebase.initializeApp(CFG);
    this.auth=firebase.auth(); this.fs=firebase.firestore(); try{ this.st=firebase.storage(); }catch(e){}
    await new Promise(res=>{ const off=this.auth.onAuthStateChanged(async u=>{ off(); if(u) await this.loadProfile(u); res(); }); });
  },
  async loadProfile(u){
    const isAdmin=ADMINS.includes(String(u.email||'').toLowerCase());
    let d=null; try{ const s=await this.fs.collection('users').doc(u.uid).get(); d=s.exists?s.data():null; }catch(e){}
    this.profile=Object.assign({uid:u.uid,email:u.email,role:isAdmin?'admin':'student',name:(d&&d.name)||u.email,pattern:(d&&d.pattern)||''},d||{},isAdmin?{role:'admin'}:{});
    return this.profile;
  },
  user(){ return this.profile; },
  async loginStudent(username,password){
    try{ const c=await this.auth.signInWithEmailAndPassword(cleanUser(username)+'@'+DOMAIN,password); const p=await this.loadProfile(c.user); return p; }
    catch(e){ throw err(e); } },
  async loginAdmin(email,password){
    email=String(email).trim(); if(!email.includes('@')&&ADMINS[0]) email=ADMINS[0];
    try{ const c=await this.auth.signInWithEmailAndPassword(email,password); const p=await this.loadProfile(c.user);
      if(p.role!=='admin'){ await this.auth.signOut(); this.profile=null; throw new Error('هذا الحساب ليس حساب مشرف'); } return p; }
    catch(e){ throw e.code?err(e):e; } },
  async logout(){ await this.auth.signOut(); this.profile=null; },
  async createStudent({name,username,password,pattern,group}){
    username=cleanUser(username); if(!/^[a-z0-9._-]{3,}$/.test(username)) throw new Error('اسم المستخدم: 3 أحرف إنجليزية/أرقام على الأقل');
    const sec=firebase.apps.find(a=>a.name==='secondary')||firebase.initializeApp(CFG,'secondary');
    try{ const c=await sec.auth().createUserWithEmailAndPassword(username+'@'+DOMAIN,password);
      const doc={name,username,pattern,group:group||'',role:'student',createdAt:now()};
      await this.fs.collection('users').doc(c.user.uid).set(doc); await sec.auth().signOut(); return Object.assign({uid:c.user.uid},doc); }
    catch(e){ throw err(e); } },
  async listStudents(){ const s=await this.fs.collection('users').where('role','==','student').get(); return s.docs.map(d=>Object.assign({uid:d.id},d.data())); },
  async updateStudent(uid,data){ await this.fs.collection('users').doc(uid).set(data,{merge:true}); },
  async saveResponse(lesson,step,data){ const p=this.profile; if(!p) return;
    try{ await this.fs.collection('responses').add({uid:p.uid,name:p.name||'',username:p.username||'',group:p.group||'',pattern:MODE,lesson:+lesson,step,data:JSON.parse(JSON.stringify(data||{})),at:now()}); }catch(e){ console.warn(e); } },
  async listResponses(){ const s=await this.fs.collection('responses').orderBy('at','desc').limit(5000).get(); return s.docs.map(d=>Object.assign({id:d.id},d.data())); },
  async getProgress(lesson){ const p=this.profile; if(!p) return []; try{ const s=await this.fs.collection('progress').doc(p.uid).get(); return (s.exists&&s.data()['L'+lesson])||[]; }catch(e){ return []; } },
  async setProgress(lesson,done){ const p=this.profile; if(!p) return; try{ await this.fs.collection('progress').doc(p.uid).set({['L'+lesson]:done,name:p.name||'',pattern:MODE,at:now()},{merge:true}); }catch(e){} },
  async allProgress(){ const s=await this.fs.collection('progress').get(); return s.docs.map(d=>Object.assign({uid:d.id},d.data())); },
  async getHighlights(lesson){ const p=this.profile; if(!p) return []; try{ const s=await this.fs.collection('highlights').doc(p.uid+'_L'+lesson).get(); return s.exists?(s.data().items||[]):[]; }catch(e){ return []; } },
  async setHighlights(lesson,items){ const p=this.profile; if(!p) return; try{ await this.fs.collection('highlights').doc(p.uid+'_L'+lesson).set({uid:p.uid,name:p.name||'',pattern:MODE,lesson:+lesson,items,at:now()}); }catch(e){ console.warn(e); } },
  async allHighlights(){ const s=await this.fs.collection('highlights').get(); return s.docs.map(d=>Object.assign({id:d.id},d.data())); },
  listComments(lesson,cb){ return this.fs.collection('comments').where('lesson','==',+lesson).where('pattern','==',MODE)
      .onSnapshot(s=>cb(s.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>a.at-b.at)),e=>{ console.warn(e); cb([]); }); },
  async addComment(c){ const p=this.profile; await this.fs.collection('comments').add(Object.assign({uid:p.uid,name:p.name||'',pattern:MODE,at:now()},c)); },
  async deleteComment(id){ await this.fs.collection('comments').doc(id).delete(); },
  async allComments(){ const s=await this.fs.collection('comments').get(); return s.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>b.at-a.at); },
  async getHarvest(lesson){ const p=this.profile; if(!p) return null; try{ const s=await this.fs.collection('harvest').doc(p.uid+'_L'+lesson).get(); return s.exists?s.data():null; }catch(e){ return null; } },
  async saveHarvest(lesson,text){ const p=this.profile; await this.fs.collection('harvest').doc(p.uid+'_L'+lesson).set({uid:p.uid,name:p.name||'',pattern:MODE,lesson:+lesson,text,at:now()}); },
  async allHarvest(){ const s=await this.fs.collection('harvest').get(); return s.docs.map(d=>Object.assign({id:d.id},d.data())); },
  async vote(lesson,choice){ const p=this.profile; if(!p) return; await this.fs.collection('votes').doc(p.uid+'_L'+lesson).set({uid:p.uid,name:p.name||'',pattern:MODE,lesson:+lesson,choice,at:now()}); },
  async voteCounts(lesson){ try{ const s=await this.fs.collection('votes').where('lesson','==',+lesson).where('pattern','==',MODE).get();
      const c={}; s.docs.forEach(d=>{ const k=d.data().choice; c[k]=(c[k]||0)+1; }); return c; }catch(e){ return {}; } },
  async allVotes(){ const s=await this.fs.collection('votes').get(); return s.docs.map(d=>d.data()); },
  async upload(file,folder){ const p=this.profile; if(!p) throw new Error('سجّل الدخول أولًا');
    const ext=(file.name&&file.name.split('.').pop())||(file.type.split('/')[1]||'bin').split(';')[0];
    const name=file.name||('recording.'+ext);
    if(this.st){ try{ const ref=this.st.ref().child(`uploads/${p.uid}/${folder}/${Date.now()}.${ext}`);
      await Promise.race([ref.put(file,{contentType:file.type}),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),60000))]);
      const url=await ref.getDownloadURL(); return {url,name,size:file.size,type:file.type}; }catch(e){ console.warn('Storage upload failed, fallback',e); } }
    // بديل بدون Storage: الملفات الصغيرة تُحفظ داخل قاعدة البيانات نفسها
    if(file.size<=700*1024){ const url=await new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); return {url,name,size:file.size,type:file.type,inline:true}; }
    throw new Error('الملف كبير (أكثر من 700 كيلوبايت) ورفع الملفات الكبيرة غير مفعّل — صغّر الملف أو أرسله عبر زر إرسال النشاط'); }
};

/* ================= Local (demo) backend ================= */
const LO={
  K:k=>'fl_demo_'+k,
  profile:null,
  async init(){ const s=ls.get(this.K('session'),null); if(s){ const u=(ls.get(this.K('users'),[])).find(x=>x.uid===s)||(s==='admin'?{uid:'admin',name:'المشرف – تجريبي',role:'admin'}:null); this.profile=u||null; } },
  user(){ return this.profile; },
  async loginStudent(username,password){ username=cleanUser(username);
    const u=(ls.get(this.K('users'),[])).find(x=>x.username===username);
    if(!u||u.password!==password) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
    if(u.disabled) throw new Error('هذا الحساب موقوف'); this.profile=u; ls.set(this.K('session'),u.uid); return u; },
  async loginAdmin(email,password){ if(!((email==='admin'||ADMINS.includes(String(email).toLowerCase()))&&password==='admin')) throw new Error('في الوضع التجريبي: اسم المستخدم admin وكلمة المرور admin');
    this.profile={uid:'admin',name:'المشرف – تجريبي',role:'admin'}; ls.set(this.K('session'),'admin'); return this.profile; },
  async logout(){ this.profile=null; ls.set(this.K('session'),null); },
  async createStudent({name,username,password,pattern,group}){ username=cleanUser(username);
    if(!/^[a-z0-9._-]{3,}$/.test(username)) throw new Error('اسم المستخدم: 3 أحرف إنجليزية/أرقام على الأقل');
    if(String(password).length<6) throw new Error('كلمة المرور قصيرة (6 أحرف على الأقل)');
    const all=ls.get(this.K('users'),[]); if(all.some(x=>x.username===username)) throw new Error('اسم المستخدم مستخدم من قبل');
    const u={uid:'u_'+uid8(),name,username,password,pattern,group:group||'',role:'student',createdAt:now()}; all.push(u); ls.set(this.K('users'),all); return u; },
  async listStudents(){ return ls.get(this.K('users'),[]); },
  async updateStudent(uid,data){ const all=ls.get(this.K('users'),[]); const u=all.find(x=>x.uid===uid); if(u) Object.assign(u,data); ls.set(this.K('users'),all); },
  _push(k,o){ const a=ls.get(this.K(k),[]); a.push(o); ls.set(this.K(k),a); },
  async saveResponse(lesson,step,data){ const p=this.profile; if(!p) return; this._push('responses',{id:uid8(),uid:p.uid,name:p.name,username:p.username||'',group:p.group||'',pattern:MODE,lesson:+lesson,step,data:JSON.parse(JSON.stringify(data||{})),at:now()}); },
  async listResponses(){ return ls.get(this.K('responses'),[]).slice().reverse(); },
  async getProgress(lesson){ const p=this.profile; if(!p) return []; return (ls.get(this.K('progress'),{})[p.uid]||{})['L'+lesson]||[]; },
  async setProgress(lesson,done){ const p=this.profile; if(!p) return; const all=ls.get(this.K('progress'),{}); all[p.uid]=Object.assign(all[p.uid]||{},{['L'+lesson]:done,name:p.name,pattern:MODE,at:now()}); ls.set(this.K('progress'),all); },
  async allProgress(){ const all=ls.get(this.K('progress'),{}); return Object.keys(all).map(k=>Object.assign({uid:k},all[k])); },
  async getHighlights(lesson){ const p=this.profile; if(!p) return []; return (ls.get(this.K('highlights'),{})[p.uid+'_L'+lesson]||{}).items||[]; },
  async setHighlights(lesson,items){ const p=this.profile; if(!p) return; const all=ls.get(this.K('highlights'),{}); all[p.uid+'_L'+lesson]={uid:p.uid,name:p.name,pattern:MODE,lesson:+lesson,items,at:now()}; ls.set(this.K('highlights'),all); },
  async allHighlights(){ const all=ls.get(this.K('highlights'),{}); return Object.keys(all).map(k=>Object.assign({id:k},all[k])); },
  listComments(lesson,cb){ const emit=()=>cb(ls.get(this.K('comments'),[]).filter(c=>c.lesson===+lesson&&c.pattern===MODE).sort((a,b)=>a.at-b.at));
    emit(); const h=e=>{ if(e.key===this.K('comments')) emit(); }; window.addEventListener('storage',h); this._emit=emit; return ()=>window.removeEventListener('storage',h); },
  async addComment(c){ const p=this.profile; this._push('comments',Object.assign({id:uid8(),uid:p.uid,name:p.name,pattern:MODE,at:now()},c)); if(this._emit) this._emit(); },
  async deleteComment(id){ ls.set(this.K('comments'),ls.get(this.K('comments'),[]).filter(c=>c.id!==id&&c.parentId!==id)); if(this._emit) this._emit(); },
  async allComments(){ return ls.get(this.K('comments'),[]).slice().sort((a,b)=>b.at-a.at); },
  async getHarvest(lesson){ const p=this.profile; if(!p) return null; return ls.get(this.K('harvest'),{})[p.uid+'_L'+lesson]||null; },
  async saveHarvest(lesson,text){ const p=this.profile; const all=ls.get(this.K('harvest'),{}); all[p.uid+'_L'+lesson]={uid:p.uid,name:p.name,pattern:MODE,lesson:+lesson,text,at:now()}; ls.set(this.K('harvest'),all); },
  async allHarvest(){ const all=ls.get(this.K('harvest'),{}); return Object.keys(all).map(k=>all[k]); },
  async vote(lesson,choice){ const p=this.profile; if(!p) return; const all=ls.get(this.K('votes'),{}); all[p.uid+'_L'+lesson]={uid:p.uid,name:p.name,pattern:MODE,lesson:+lesson,choice,at:now()}; ls.set(this.K('votes'),all); },
  async voteCounts(lesson){ const c={}; Object.values(ls.get(this.K('votes'),{})).filter(v=>v.lesson===+lesson&&v.pattern===MODE).forEach(v=>c[v.choice]=(c[v.choice]||0)+1); return c; },
  async allVotes(){ return Object.values(ls.get(this.K('votes'),{})); },
  async upload(file,folder){ const keep=file.size<=1.5e6;
    const url=keep?await new Promise(r=>{ const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(file); }):'';
    return {url,name:file.name||'recording',size:file.size,type:file.type,local:true}; }
};

const B=LIVE?FB:LO;
let readyP=null;
const DB={
  live:LIVE, mode:MODE, patternName:PATTERN_NAME,
  ready(){ if(!readyP) readyP=B.init().catch(e=>{ console.error(e); }); return readyP; },
  user:()=>B.user(),
  loginStudent:async(u,p)=>{ const r=await B.loginStudent(u,p);
    if(r.role!=='student'&&r.role!=='admin') throw new Error('حساب غير صالح');
    if(r.disabled){ await B.logout(); throw new Error('هذا الحساب موقوف، راجع المعلم'); }
    if(r.role==='student'&&r.pattern&&r.pattern!==MODE){ await B.logout(); throw new Error('حسابك مسجّل في مجموعة «'+PATTERN_NAME[r.pattern]+'»، ادخل من موقعها'); }
    return r; },
  loginAdmin:(e,p)=>B.loginAdmin(e,p), logout:()=>B.logout(),
  createStudent:d=>B.createStudent(d), listStudents:()=>B.listStudents(), updateStudent:(u,d)=>B.updateStudent(u,d),
  saveResponse:(l,s,d)=>B.saveResponse(l,s,d), listResponses:()=>B.listResponses(),
  getProgress:l=>B.getProgress(l), setProgress:(l,d)=>B.setProgress(l,d), allProgress:()=>B.allProgress(),
  getHighlights:l=>B.getHighlights(l), setHighlights:(l,i)=>B.setHighlights(l,i), allHighlights:()=>B.allHighlights(),
  listComments:(l,cb)=>B.listComments(l,cb), addComment:c=>B.addComment(c), deleteComment:id=>B.deleteComment(id), allComments:()=>B.allComments(),
  getHarvest:l=>B.getHarvest(l), saveHarvest:(l,t)=>B.saveHarvest(l,t), allHarvest:()=>B.allHarvest(),
  vote:(l,c)=>B.vote(l,c), voteCounts:l=>B.voteCounts(l), allVotes:()=>B.allVotes(),
  upload:(f,folder)=>B.upload(f,folder)
};
window.FLDB=DB;

/* ================= واجهة تسجيل الدخول ================= */
const $=(s,r=document)=>r.querySelector(s);
function h(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function loginModal({admin=false,block=false}={}){
  return new Promise(resolve=>{
    $$rm();
    const m=h(`<div class="auth-pop ${block?'block':''}"><div class="auth-card">
      <div class="auth-head"><span class="auth-ic">${admin?'🛡️':'👋'}</span><div><h3>${admin?'دخول المشرف':'دخول الطالب'}</h3><p>${admin?'لوحة متابعة الطلاب والردود':'ادخل باسم المستخدم وكلمة المرور اللي أعطاها لك المعلم'}</p></div></div>
      <label class="auth-l">${admin?(LIVE?'البريد الإلكتروني أو admin':'اسم المستخدم'):'اسم المستخدم'}<input class="field au" dir="ltr" autocomplete="username" placeholder="${admin?'admin':'ahmed.ali'}"></label>
      <label class="auth-l">كلمة المرور<input class="field ap" type="password" dir="ltr" autocomplete="current-password"></label>
      <p class="auth-err"></p>
      <div class="row"><button class="b b-main go" style="flex:1;justify-content:center">دخول ←</button>${block?'':'<button class="b b-ghost x">إلغاء</button>'}</div>
      ${LIVE?'':`<p class="auth-demo">🧪 وضع تجريبي (بدون قاعدة بيانات): ${admin?'ادخل بـ admin / admin':'أنشئ حساب طالب من «لوحة المشرف» أولًا (admin / admin)'}</p>`}
      ${block?`<button class="auth-back sw">${admin?'👤 أنا طالب — دخول الطالب':'🛡️ أنا المشرف — دخول المشرف'}</button>`:''}
    </div></div>`);
    document.body.appendChild(m);
    const u=$('.au',m), p=$('.ap',m), e=$('.auth-err',m), go=$('.go',m);
    setTimeout(()=>u.focus(),50);
    const submit=async()=>{ e.textContent=''; go.disabled=true; go.textContent='جارٍ الدخول…';
      try{ const r=admin?await DB.loginAdmin(u.value,p.value):await DB.loginStudent(u.value,p.value); m.remove(); paintChip(); resolve(r); }
      catch(x){ e.textContent=x.message; m.querySelector('.auth-card').classList.add('shake'); setTimeout(()=>m.querySelector('.auth-card').classList.remove('shake'),450); }
      go.disabled=false; go.textContent='دخول ←'; };
    go.onclick=submit; [u,p].forEach(i=>i.addEventListener('keydown',ev=>{ if(ev.key==='Enter') submit(); }));
    const x=$('.x',m); if(x) x.onclick=()=>{ m.remove(); resolve(null); };
    const sw=$('.sw',m); if(sw) sw.onclick=()=>{ loginModal({admin:!admin,block:true}).then(resolve); };
  });
}
function $$rm(){ document.querySelectorAll('.auth-pop').forEach(x=>x.remove()); }
function paintChip(){
  const links=$('nav .links'); if(!links) return; let c=$('.user-chip',links.parentElement);
  if(!c){ c=h('<div class="user-chip"></div>'); links.parentElement.appendChild(c); }
  const up=location.pathname.includes('/lessons/')?'../':'';
  const u=DB.user();
  if(u){ const isA=u.role==='admin'; const nm=isA?(u.name&&!u.name.includes('@')?u.name:'المشرف'):(u.name||u.username||'');
    c.innerHTML=`${isA?`<a class="uc-who" href="${up}admin.html" title="لوحة المشرف">`:'<span class="uc-who">'}<span class="uc-av">${isA?'🛡️':((nm.trim()[0])||'?')}</span><span class="uc-n">${nm}</span>${isA?'</a>':'</span>'}<button class="uc-out" title="تسجيل الخروج">⎋ تسجيل الخروج</button>`;
    c.querySelector('.uc-out').onclick=async()=>{ await DB.logout(); location.href=up+'index.html'; }; }
  else { c.innerHTML=`<button class="uc-in">👤 دخول الطالب</button><button class="uc-in uc-adm">🛡️ دخول المشرف</button>`;
    c.querySelector('.uc-in').onclick=()=>loginModal({});
    c.querySelector('.uc-adm').onclick=()=>{ if(document.body.classList.contains('admin-page')) { const f=document.querySelector('.au'); if(f) f.focus(); return; } location.href=up+'admin.html'; }; }
}
window.FLAUTH={
  loginModal, paintChip,
  async requireStudent(){ await DB.ready(); paintChip(); let u=DB.user();
    if(!(u && (u.role==='admin' || !u.pattern || u.pattern===MODE))){ if(u) await DB.logout(); u=await loginModal({block:true}); }
    document.documentElement.classList.remove('gated'); paintChip(); return u; }
};
document.addEventListener('DOMContentLoaded',()=>{ if(document.body.classList.contains('admin-page')) DB.ready().then(paintChip); });
})();
