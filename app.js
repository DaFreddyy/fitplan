'use strict';
/* ===================== FitPlan – App-Logik ===================== */
const $=id=>document.getElementById(id);
const DAY_MS=86400000;
const DOW=['So','Mo','Di','Mi','Do','Fr','Sa'];
const MONTHS=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const SLOTS=[['fr','Frühstück'],['mi','Mittagessen'],['ab','Abendessen'],['sn','Snack']];
const REST_SEC=45;
const RMAP={};RECIPES.forEach(r=>RMAP[r.id]=r);
function allRecipes(){return RECIPES.concat((S&&S.myRecipes)||[]);}
function getRecipe(id){return RMAP[id]||((S&&S.myRecipes)||[]).find(r=>r.id===id);}
const TPMAP={};TRAINING_PLANS.forEach(p=>TPMAP[p.id]=p);
const MPMAP={};MEAL_PLANS.forEach(p=>MPMAP[p.id]=p);

/* ---------- helpers ---------- */
function midnight(x){const d=new Date(x);d.setHours(0,0,0,0);return d;}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function parseYmd(s){return midnight(new Date(s+'T00:00:00'));}
function fmtDate(d){return d.getDate()+'.'+(d.getMonth()+1)+'.';}
function todayMid(){return midnight(new Date());}
function isToday(d){return ymd(d)===ymd(todayMid());}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmtNum(n){let v=Number(n);v=v>=10?Math.round(v):Math.round(v*10)/10;return String(v).replace('.',',');}
function uid(){return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function metaOf(it){if(it.note)return it.note;if(it.dur)return it.sets+'×'+it.dur+' Sek';return it.sets+'×'+it.reps+' Wdh';}
function planIdxFor(d){return (d.getDay()+6)%7;} // Mo=0 .. So=6
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2000);}
function speak(text){try{if('speechSynthesis'in window){const u=new SpeechSynthesisUtterance(text);u.lang='de-DE';u.rate=1;speechSynthesis.cancel();speechSynthesis.speak(u);}}catch(e){}}

/* ---------- Auth + State (Supabase) ---------- */
let sb=null, USER=null, S=null, saveTimer=null, syncState='—';
function initSupabase(){try{if(window.supabase&&window.SUPABASE_URL&&window.SUPABASE_KEY){sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}}catch(e){sb=null;}return sb;}
function defaultProfile(){return {trainingPlanId:'ganzkoerper',mealPlanId:'ausgewogen',startDate:'2026-06-07',exclusions:[],mealOv:{},workoutOv:{},exOv:{},done:{},shopDays:7,shopChecked:{},myRecipes:[],cooked:{}};}
function ukey(){return 'fitplan_u_'+(USER?USER.id:'anon');}
function loadLocalState(){try{const r=localStorage.getItem(ukey());if(r)return JSON.parse(r);}catch(e){}return null;}
function saveLocalState(){try{localStorage.setItem(ukey(),JSON.stringify(S));}catch(e){}}
async function loadState(){
  let remote=null, hasRemote=false;
  if(sb&&USER&&USER.id!=='local'){try{const {data,error}=await sb.from('user_state').select('data').eq('user_id',USER.id).maybeSingle();if(error){syncState='Lese-Fehler: '+error.message;}else if(data&&data.data){remote=data.data;hasRemote=true;}}catch(e){syncState='Lese-Fehler: '+(e&&e.message||e);}}
  const local=loadLocalState();
  if(hasRemote){S=Object.assign(defaultProfile(),remote);syncState='aus Cloud geladen';}
  else if(local){S=Object.assign(defaultProfile(),local);cloudPush();} // erste Cloud-Speicherung der lokalen Daten
  else {S=defaultProfile();}
  saveLocalState();
}
function cloudPush(cb){
  if(!(sb&&USER&&USER.id!=='local')){cb&&cb(null);return;}
  try{
    sb.from('user_state').upsert({user_id:USER.id,data:S,updated_at:new Date().toISOString()}).then(res=>{
      if(res&&res.error){syncState='Fehler: '+res.error.message;}
      else{syncState='synchronisiert · '+new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});}
      if(curView==='profile')renderProfile();
      cb&&cb(res?res.error:null);
    },err=>{syncState='Fehler: '+(err&&err.message||err);if(curView==='profile')renderProfile();cb&&cb(err);});
  }catch(e){syncState='Fehler: '+(e&&e.message||e);cb&&cb(e);}
}
function saveS(){saveLocalState();if(sb&&USER&&USER.id!=='local'){clearTimeout(saveTimer);saveTimer=setTimeout(()=>cloudPush(),600);}}
function syncNow(){toast('Synchronisiere…');cloudPush(err=>{toast(err?('Sync-Fehler: '+(err.message||err)):'Synchronisiert ✓');renderProfile();});}
function activeProfileName(){if(!USER)return 'Gast';const n=(USER.email||'').split('@')[0];return n||'Konto';}

/* ---------- Auth-Oberfläche ---------- */
function showApp(){$('auth').classList.remove('open');document.body.style.overflow='';go('plan');}
function showAuth(){closeOverlay();$('auth').classList.add('open');document.body.style.overflow='hidden';renderAuth('login');}
function renderAuth(mode,msg,type){
  const isReg=mode==='register', isRec=mode==='recovery';
  $('auth').innerHTML=`
    <div class="authcard">
      <div class="brand"><div class="logo">🏋️</div><h1>FitPlan</h1><p>Training · Ernährung · Einkauf</p></div>
      <h2>${isRec?'Neues Passwort setzen':isReg?'Konto erstellen':'Anmelden'}</h2>
      ${msg?`<div class="${type==='ok'?'ok':'err'}">${esc(msg)}</div>`:''}
      ${isRec?`
        <label class="fld"><span>Neues Passwort</span><input class="inp" id="auPass" type="password" autocomplete="new-password" placeholder="mind. 6 Zeichen"></label>
        <button class="btn block" onclick="authSetNew()">Passwort speichern</button>`:`
        ${isReg?'<label class="fld"><span>Benutzername (für Freunde)</span><input class="inp" id="auName" autocomplete="username" placeholder="z. B. max_fit"></label>':''}
        <label class="fld"><span>E-Mail</span><input class="inp" id="auEmail" type="email" autocomplete="email" inputmode="email" placeholder="du@beispiel.de"></label>
        <label class="fld"><span>Passwort</span><input class="inp" id="auPass" type="password" autocomplete="${isReg?'new-password':'current-password'}" placeholder="${isReg?'mind. 6 Zeichen':'Passwort'}"></label>
        ${isReg?'':'<div class="forgot"><a onclick="authForgot()">Passwort vergessen?</a></div>'}
        <button class="btn block" onclick="${isReg?'authRegister()':'authLogin()'}">${isReg?'Registrieren':'Anmelden'}</button>
        <div class="swlink">${isReg?'Schon ein Konto? <a onclick="renderAuth(&quot;login&quot;)">Anmelden</a>':'Noch kein Konto? <a onclick="renderAuth(&quot;register&quot;)">Registrieren</a>'}</div>`}
      <div class="legal">Geschützt durch Anmeldung &amp; Datenbank-Sicherheitsregeln (RLS) – jede:r sieht nur die eigenen Daten.</div>
    </div>`;
}
function auEmail(){return ($('auEmail')?$('auEmail').value:'').trim();}
function auPass(){return $('auPass')?$('auPass').value:'';}
async function authLogin(){if(!sb){renderAuth('login','Keine Verbindung – bitte online anmelden.');return;}const email=auEmail(),password=auPass();if(!email||!password){renderAuth('login','Bitte E-Mail und Passwort eingeben.');return;}
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error){renderAuth('login',/confirm/i.test(error.message||'')?'Bitte bestätige zuerst deine E-Mail (Link im Postfach).':'Anmeldung fehlgeschlagen: '+error.message);}
}
async function authRegister(){if(!sb){renderAuth('register','Keine Verbindung – bitte online registrieren.');return;}const email=auEmail(),password=auPass();if(!email||password.length<6){renderAuth('register','Bitte E-Mail und Passwort (mind. 6 Zeichen).');return;}
  const uname=($('auName')?$('auName').value:'').trim();
  if(uname){if(!validName(uname)){renderAuth('register','Benutzername: 3–20 Zeichen (Buchstaben, Zahlen, _ .)');return;}try{localStorage.setItem('fitplan_wantname',uname);}catch(e){}}
  const {error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.href.split('#')[0]}});
  if(error){renderAuth('register','Registrierung fehlgeschlagen: '+error.message);return;}
  renderAuth('login','Fast geschafft! Wir haben dir eine Bestätigungs-Mail geschickt. Bestätige den Link und melde dich dann an.','ok');
}
async function authForgot(){if(!sb)return;const email=auEmail();if(!email){renderAuth('login','Gib oben deine E-Mail ein – dann sende ich dir einen Reset-Link.');return;}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});
  renderAuth('login',error?('Fehler: '+error.message):'Reset-Link gesendet – schau in dein Postfach.',error?'err':'ok');
}
async function authSetNew(){if(!sb)return;const password=auPass();if(password.length<6){renderAuth('recovery','Passwort braucht mind. 6 Zeichen.');return;}
  const {error}=await sb.auth.updateUser({password});
  if(error){renderAuth('recovery','Fehler: '+error.message);return;}
  toast('Passwort aktualisiert');showApp();
}
async function authLogout(){if(sb){try{await sb.auth.signOut();}catch(e){}}USER=null;MY.username=null;showAuth();}
async function handleSession(session){if(session&&session.user){USER=session.user;await loadState();showApp();ensureUsername();}else{USER=null;MY.username=null;showAuth();}}
async function boot(){
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.v));
  initSupabase();
  if(!sb){USER={id:'local',email:'lokal'};await loadState();showApp();toast('Offline-Modus (lokal)');return;}
  sb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){USER=session?session.user:null;$('auth').classList.add('open');document.body.style.overflow='hidden';renderAuth('recovery','Bitte vergib ein neues Passwort.');return;}
    if(event==='SIGNED_IN'||event==='SIGNED_OUT')handleSession(session);
  });
  try{const {data}=await sb.auth.getSession();await handleSession(data?data.session:null);}catch(e){showAuth();}
}

/* ---------- meals ---------- */
function startD(){return parseYmd(S.startDate||'2026-06-07');}
function mealOffset(d){return Math.floor((midnight(d).getTime()-startD().getTime())/DAY_MS);}
function pickDaily(pool,off){if(!pool.length)return '';return pool[((off%pool.length)+pool.length)%pool.length].id;}
function pickBatch(pool,off){ // Meal-Prep: Gericht bleibt über seine Portionszahl (max 3) mehrere Tage
  if(!pool.length)return '';
  const spans=pool.map(r=>Math.max(1,Math.min(3,r.servings||1)));
  const cyc=spans.reduce((a,b)=>a+b,0);let p=((off%cyc)+cyc)%cyc;
  for(let i=0;i<pool.length;i++){if(p<spans[i])return pool[i].id;p-=spans[i];}
  return pool[0].id;
}
function excluded(r){
  if(!S.exclusions.length)return false;
  const hay=(r.title+' '+r.ings.map(i=>i.n).join(' ')).toLowerCase();
  return S.exclusions.some(x=>x&&hay.includes(x.toLowerCase()));
}
function poolFor(cat){
  const mp=MPMAP[S.mealPlanId]||MEAL_PLANS[0];
  let pool=allRecipes().filter(r=>r.cat===cat&&mp.filter(r)&&!excluded(r));
  if(!pool.length)pool=allRecipes().filter(r=>r.cat===cat&&!excluded(r));
  if(!pool.length)pool=allRecipes().filter(r=>r.cat===cat);
  return pool;
}
const MEAL_CATS={fr:'Frühstück',mi:'Mittagessen',ab:'Abendessen',sn:'Snack'};
function autoMeal(d,slot){const pool=poolFor(MEAL_CATS[slot]);const off=mealOffset(d);
  if(slot==='mi')return pickBatch(pool,off);
  if(slot==='ab')return pickBatch(pool,off+7);
  if(slot==='sn')return pickDaily(pool,off+2);
  return pickDaily(pool,off);
}
function effMeals(d){
  const ov=(S.mealOv[ymd(d)])||{};const o={};
  SLOTS.forEach(s=>{o[s[0]]=ov[s[0]]!==undefined?ov[s[0]]:autoMeal(d,s[0]);});
  return o;
}
function isLeftover(d,slot){if(slot!=='mi'&&slot!=='ab')return false;const id=effMeals(d)[slot];if(!id)return false;const prev=effMeals(new Date(midnight(d).getTime()-DAY_MS))[slot];return prev===id;}
function setMeal(dStr,slot,id){const k=dStr;const ov=S.mealOv[k]||(S.mealOv[k]={});ov[slot]=id;saveS();}

/* ---------- workouts ---------- */
function baseWorkout(d){
  const ov=S.workoutOv[ymd(d)];
  let planId,dayIdx;
  if(ov){if(ov.rest)return {t:'rest',name:'Ruhetag',items:[],planId:null,dayIdx:-1};planId=ov.planId;dayIdx=ov.dayIdx;}
  else {planId=S.trainingPlanId;dayIdx=((mealOffset(d)%7)+7)%7;}
  const plan=TPMAP[planId]||TPMAP[S.trainingPlanId]||TRAINING_PLANS[0];
  const day=plan.days[dayIdx]||{t:'rest',name:'Ruhetag',items:[]};
  return Object.assign({},day,{planId:plan.id,dayIdx});
}
function applyExOv(w){
  if(w.isRest||w.t==='rest')return w;
  const items=(w.items||[]).map(it=>{
    const k=w.planId+'#'+w.dayIdx+'#'+it.ex;const nv=S.exOv[k];
    return nv?Object.assign({},it,{ex:nv}):it;
  });
  return Object.assign({},w,{items});
}
function effWorkout(d){return applyExOv(baseWorkout(d));}
function wIcon(w){return w.t==='rest'?'😴':w.t==='cardio'?'🔥':w.t==='mobility'?'🧘':'💪';}

/* ===================== NAV ===================== */
let curView='plan';
function go(v){curView=v;
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  $('v-'+v).classList.add('active');
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  render();window.scrollTo(0,0);
}
function render(){
  if(curView==='plan')renderPlan();
  else if(curView==='training')renderTraining();
  else if(curView==='recipes')renderRecipes();
  else if(curView==='shop')renderShop();
  else if(curView==='friends')renderFriends();
  else if(curView==='profile')renderProfile();
  $('profName').textContent=activeProfileName();
  $('profAv').textContent=(activeProfileName()[0]||'?').toUpperCase();
}

/* ===================== PLAN (Kalender) ===================== */
let calView='week', calCursor=todayMid();
function renderPlan(){
  const v=$('v-plan');
  v.innerHTML=`
    <div class="calnav">
      <button class="navbtn" onclick="calStep(-1)">‹</button>
      <div id="calLabel"></div>
      <button class="navbtn" onclick="calStep(1)">›</button>
      <button class="today-btn" onclick="calToday()">Heute</button>
      <div id="calViews"><button data-cv="week" class="${calView==='week'?'active':''}" onclick="setCalView('week')">Woche</button><button data-cv="month" class="${calView==='month'?'active':''}" onclick="setCalView('month')">Monat</button></div>
    </div>
    <div id="calBody"></div>`;
  drawCal();
}
function setCalView(x){calView=x;renderPlan();}
function calToday(){calCursor=todayMid();drawCal();renderPlan();}
function calStep(dir){
  if(calView==='month')calCursor=new Date(calCursor.getFullYear(),calCursor.getMonth()+dir,1);
  else calCursor=midnight(new Date(calCursor.getTime()+dir*7*DAY_MS));
  drawCal();
}
function drawCal(){
  const body=$('calBody'),label=$('calLabel');if(!body)return;
  if(calView==='month'){
    const y=calCursor.getFullYear(),m=calCursor.getMonth();label.textContent=MONTHS[m]+' '+y;
    const first=new Date(y,m,1);const start=new Date(y,m,1-((first.getDay()+6)%7));
    let h='<div class="calhead">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<span>${x}</span>`).join('')+'</div><div class="calgrid">';
    for(let i=0;i<42;i++){const d=new Date(start.getTime()+i*DAY_MS);const w=effWorkout(d);const done=!!S.done[ymd(d)]&&w.t!=='rest';
      const cls='dcell'+(w.t==='rest'?' rest':'')+(done?' done':'')+(isToday(d)?' today':'')+(d.getMonth()!==m?' faded':'');
      h+=`<div class="${cls}" onclick="openDay('${ymd(d)}')"><span class="dn">${d.getDate()}</span><span class="wic">${done?'✓':wIcon(w)}</span></div>`;}
    h+='</div>';body.innerHTML=h;
  } else {
    const ws=midnight(calCursor);ws.setDate(ws.getDate()-((ws.getDay()+6)%7)); // Montag
    const we=new Date(ws.getTime()+6*DAY_MS);label.textContent=fmtDate(ws)+' – '+fmtDate(we);
    let h='<div class="weekrow">';
    for(let i=0;i<7;i++){const d=new Date(ws.getTime()+i*DAY_MS);const w=effWorkout(d);const m=effMeals(d);
      const done=!!S.done[ymd(d)]&&w.t!=='rest';
      const chips=SLOTS.map(s=>{const r=getRecipe(m[s[0]]);return r?`<span>${r.emoji} ${esc(r.title)}</span>`:'';}).join('');
      h+=`<div class="wkr${isToday(d)?' today':''}" onclick="openDay('${ymd(d)}')">
        <div class="l"><b>${DOW[d.getDay()]}</b><small>${fmtDate(d)}</small></div>
        <div class="m"><div class="wtitle">${done?'✓ ':''}${wIcon(w)} ${esc(w.name)}</div><div class="meals">${chips}</div></div>
      </div>`;}
    h+='</div>';body.innerHTML=h;
  }
}

/* ---------- Tagesdetail ---------- */
function openOverlay(html){$('panel').innerHTML=html;$('overlay').classList.add('open');document.body.style.overflow='hidden';}
function closeOverlay(){$('overlay').classList.remove('open');document.body.style.overflow='';}
$('overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closeOverlay();});

function openDay(dStr){
  const d=parseYmd(dStr);const w=effWorkout(d);const m=effMeals(d);
  const done=!!S.done[dStr]&&w.t!=='rest';
  const exHtml=(w.items||[]).map(it=>{const ex=EXERCISES[it.ex];if(!ex)return '';
    return `<div class="exitem"><div class="x" onclick="openExercise('${it.ex}','day','${dStr}')"><b>${esc(ex.name)}</b><small>${metaOf(it)} · ${esc(ex.muscles)}</small></div></div>`;}).join('');
  const meals=SLOTS.map(s=>{const r=getRecipe(m[s[0]]);const lo=isLeftover(d,s[0]);
    if(!r)return `<button class="lrow" onclick="openSwap('${dStr}','${s[0]}')"><span class="em">➕</span><span class="info"><span class="rcat">${s[1]}</span><b>Gericht wählen</b></span><span class="go">›</span></button>`;
    const ck=!!(S.cooked&&S.cooked[dStr+'-'+s[0]]);
    return `<div style="display:flex;gap:7px;margin-bottom:8px">
      <button class="lrow" style="margin-bottom:0;flex:1;min-width:0" onclick="openSwap('${dStr}','${s[0]}')"><span class="em">${r.emoji}</span><span class="info"><span class="rcat">${s[1]}${lo?' · ♻ Meal Prep':''} · tauschen</span><b>${esc(r.title)}</b><small>${r.ings.length} Zutaten</small></span></button>
      <button class="lrow" style="margin-bottom:0;flex:0 0 50px;justify-content:center;font-size:1.2rem" title="${ck?'gekocht ✓':'als gekocht markieren'}" onclick="toggleCooked('${dStr}','${s[0]}','${r.id}')">${ck?'✅':'🍳'}</button>
      <button class="lrow" style="margin-bottom:0;flex:0 0 48px;justify-content:center" onclick="openRecipe('${r.id}')">🔍</button>
    </div>`;}).join('');
  openOverlay(`
    <div class="phead"><span class="emoji">${wIcon(w)}</span><div><h2>${DOW[d.getDay()]}</h2><div class="pcat">${d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <div class="sec-title">Training · ${esc(w.name)}</div>
    <button class="btn ghost block" onclick="openWorkoutSwap('${dStr}')" style="margin-bottom:10px">🔁 Training tauschen</button>
    ${w.t==='rest'?'<p class="muted">Heute ist Ruhetag – Erholung &amp; leichte Bewegung.</p>':exHtml+`
      <div class="actions"><button class="btn" onclick="startWorkout('${dStr}')">▶ Workout starten</button>${done?`<button class="btn ghost" onclick="toggleDone('${dStr}')">✓ erledigt</button>`:`<button class="btn ghost" onclick="toggleDone('${dStr}')">Als erledigt</button>`}</div>`}
    <div class="sec-title">Essen</div>${meals}`);
}
function toggleDone(dStr){const turnOn=!S.done[dStr];if(turnOn){S.done[dStr]=true;recordActivity(effWorkout(parseYmd(dStr)).name,dStr);}else delete S.done[dStr];saveS();openDay(dStr);drawCal();}
function toggleCooked(dStr,slot,rid){const ck=dStr+'-'+slot;S.cooked=S.cooked||{};const on=!S.cooked[ck];if(on){S.cooked[ck]=true;const r=getRecipe(rid);recordActivity(r?r.title:'Gericht',dStr,'meal');toast(MY&&MY.username?'Gekocht ✓ – im Feed gepostet':'Gekocht ✓');}else delete S.cooked[ck];saveS();openDay(dStr);}
function cookNow(id){const r=getRecipe(id);if(!r)return;const t=ymd(todayMid());S.cooked=S.cooked||{};recordActivity(r.title,t,'meal');toast(MY&&MY.username?'Gekocht ✓ – im Feed gepostet':'Gekocht ✓');closeOverlay();}

function openSwap(dStr,slot){
  const cat=MEAL_CATS[slot];const label=SLOTS.find(s=>s[0]===slot)[1];
  const cur=effMeals(parseYmd(dStr))[slot];
  const rows=allRecipes().filter(r=>r.cat===cat).map(r=>`<button class="lrow ${r.id===cur?'cur':''}" onclick="setMeal('${dStr}','${slot}','${r.id}');toast('Getauscht');openDay('${dStr}')"><span class="em">${r.emoji}</span><span class="info"><b>${esc(r.title)}</b><small>${r.ings.length} Zutaten · ${r.servings} Port.${excluded(r)?' · ⚠ ausgeschlossen':''}</small></span>${r.id===cur?'<span class="go">✓</span>':'<span class="go">›</span>'}</button>`).join('');
  openOverlay(`<div class="phead"><span class="emoji">🍽️</span><div><h2>${label} wählen</h2><div class="pcat">${parseYmd(dStr).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <button class="btn ghost block" style="margin-bottom:10px" onclick="openDay('${dStr}')">‹ Zurück</button>${rows}`);
}
function openWorkoutSwap(dStr){
  const opts=[];
  TRAINING_PLANS.forEach(p=>p.days.forEach((day,i)=>{if(day.t!=='rest')opts.push({planId:p.id,dayIdx:i,name:day.name,plan:p.name,t:day.t});}));
  const rows=opts.map(o=>`<button class="lrow" onclick="setWorkout('${dStr}',{planId:'${o.planId}',dayIdx:${o.dayIdx}});openDay('${dStr}')"><span class="em">${o.t==='cardio'?'🔥':o.t==='mobility'?'🧘':'💪'}</span><span class="info"><span class="rcat">${esc(o.plan)}</span><b>${esc(o.name)}</b></span><span class="go">›</span></button>`).join('');
  openOverlay(`<div class="phead"><span class="emoji">🔁</span><div><h2>Training tauschen</h2><div class="pcat">${parseYmd(dStr).toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'})}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <button class="btn ghost block" style="margin-bottom:10px" onclick="openDay('${dStr}')">‹ Zurück</button>
    <button class="lrow" onclick="setWorkout('${dStr}',{rest:true});openDay('${dStr}')"><span class="em">😴</span><span class="info"><b>Ruhetag</b></span><span class="go">›</span></button>
    <button class="lrow" onclick="setWorkout('${dStr}',null);openDay('${dStr}')"><span class="em">↩️</span><span class="info"><b>Standard (Plan)</b><small>Override entfernen</small></span><span class="go">›</span></button>
    <div class="sec-title">Workouts</div>${rows}`);
}
function setWorkout(dStr,val){if(val===null)delete S.workoutOv[dStr];else S.workoutOv[dStr]=val;saveS();drawCal();toast('Training getauscht');}

/* ---------- Übung (mit YouTube) ---------- */
function ytEmbed(q){return 'https://www.youtube-nocookie.com/embed?listType=search&list='+encodeURIComponent(q);}
function ytSearch(q){return 'https://www.youtube.com/results?search_query='+encodeURIComponent(q);}
function openExercise(exId,from,ctx){
  const ex=EXERCISES[exId];if(!ex)return;
  const steps=ex.steps.map(s=>`<li>${esc(s)}</li>`).join('');
  const tips=(ex.tips||[]).map(s=>`<li>${esc(s)}</li>`).join('');
  const back=from==='day'?`<button class="btn ghost block" style="margin-bottom:10px" onclick="openDay('${ctx}')">‹ Zurück zum Tag</button>`
    :from==='ex'?`<button class="btn ghost block" style="margin-bottom:10px" onclick="renderTraining();closeOverlay()">‹ Schließen</button>`:'';
  openOverlay(`<div class="phead"><span class="emoji">🏋️</span><div><h2>${esc(ex.name)}</h2><div class="pcat">${esc(ex.muscles)}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    ${back}
    <div class="ytwrap"><iframe src="${ytEmbed(ex.yt)}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
    <a class="yt-link" href="${ytSearch(ex.yt)}" target="_blank" rel="noopener">▶ Video auf YouTube öffnen</a>
    <div class="sec-title">Ausführung</div><ol class="steps">${steps}</ol>
    ${tips?`<div class="sec-title">Tipps</div><ul class="dlist">${tips}</ul>`:''}`);
}

/* ---------- Rezept ---------- */
let recDetailServ={};
function openRecipe(id){
  const r=getRecipe(id);if(!r)return;const cur=recDetailServ[id]||r.servings;const f=cur/r.servings;
  const ings=r.ings.map(i=>`<li><span class="amt">${i.a?fmtNum(i.a*f)+' '+i.u:''}</span><span>${esc(i.n)}</span></li>`).join('');
  const steps=r.steps.map(s=>`<li>${esc(s)}</li>`).join('');
  openOverlay(`<div class="phead"><span class="emoji">${r.emoji}</span><div><h2>${esc(r.title)}</h2><div class="pcat">${r.cat}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <div class="lrow" style="cursor:default"><span class="info"><b>Portionen</b><small>Mengen passen sich an</small></span><span style="display:flex;gap:6px;align-items:center"><button class="navbtn" onclick="recServ('${id}',-1)">−</button><b style="min-width:24px;text-align:center">${cur}</b><button class="navbtn" onclick="recServ('${id}',1)">+</button></span></div>
    <div class="sec-title">Zutaten</div><ul class="ings" style="list-style:none">${ings}</ul>
    <div class="sec-title">Zubereitung</div><ol class="steps">${steps}</ol>
    ${r.notes?`<div class="notes">💡 ${esc(r.notes)}</div>`:''}
    <div class="actions"><button class="btn" onclick="cookNow('${id}')">🍳 Heute gekocht</button>${isOwn(id)?`<button class="btn ghost" onclick="openRecipeForm('${id}')">✎ Bearbeiten</button>`:''}</div>`);
}
function recServ(id,dir){const r=getRecipe(id);const cur=recDetailServ[id]||r.servings;recDetailServ[id]=Math.max(1,Math.min(20,cur+dir));openRecipe(id);}

/* ===================== TRAINING ===================== */
function renderTraining(){
  const v=$('v-training');const plan=TPMAP[S.trainingPlanId]||TRAINING_PLANS[0];
  const startW=startD().getDay(); // Wochentag des Programm-Starts (0=So)
  // Mo..So zeigen, aber je Wochentag den Plan-Tag nehmen, der laut Startdatum darauf faellt – identisch zum Kalender
  const days=[1,2,3,4,5,6,0].map(wd=>{
    const i=(((wd-startW)%7)+7)%7;const day=plan.days[i]||{t:'rest',name:'Ruhetag',items:[]};
    const w=applyExOv(Object.assign({},day,{planId:plan.id,dayIdx:i}));
    const exs=(w.items||[]).map(it=>{const ex=EXERCISES[it.ex];if(!ex)return '';
      return `<div class="exitem"><div class="x" onclick="openExercise('${it.ex}','ex')"><b>${esc(ex.name)}</b><small>${metaOf(it)}</small></div><button class="swp" onclick="openExSwap('${plan.id}',${i},'${it.ex}')">tauschen</button></div>`;}).join('');
    return `<div class="card" style="cursor:default;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:${w.t==='rest'?'0':'8px'}"><b style="font-size:.78rem;color:var(--faint);width:26px">${DOW[wd]}</b><span style="font-size:1.2rem">${w.t==='cardio'?'🔥':w.t==='mobility'?'🧘':w.t==='rest'?'😴':'💪'}</span><b style="flex:1">${esc(w.name)}</b>${w.t!=='rest'?`<button class="swp" onclick="startWorkoutPlan('${plan.id}',${i})">▶ Start</button>`:''}</div>
      ${exs}</div>`;
  }).join('');
  v.innerHTML=`
    <div class="sec-title">Aktueller Trainingsplan</div>
    <div class="card" style="cursor:default;display:flex;align-items:center;gap:12px;margin-bottom:6px"><span style="font-size:1.8rem">${plan.icon}</span><div style="flex:1"><b>${esc(plan.name)}</b><div class="muted" style="font-size:.82rem">${esc(plan.desc)}</div></div></div>
    <button class="btn ghost block" onclick="openPlanPicker()">Trainingsplan wechseln</button>
    <div class="sec-title">Wochenübersicht</div>${days}
    <p class="faint" style="font-size:.78rem;margin-top:8px">Tipp: Einzelne Übungen mit „tauschen" ersetzen, oder im Plan-Tab pro Tag das ganze Training austauschen.</p>`;
}
function openExSwap(planId,dayIdx,exId){
  const ex=EXERCISES[exId];const alts=Object.values(EXERCISES).filter(e=>e.cat===ex.cat);
  const rows=alts.map(e=>`<button class="lrow ${e.id===exId?'cur':''}" onclick="setExOv('${planId}',${dayIdx},'${exId}','${e.id}')"><span class="em">🏋️</span><span class="info"><b>${esc(e.name)}</b><small>${esc(e.muscles)}</small></span>${e.id===exId?'<span class="go">✓</span>':'<span class="go">›</span>'}</button>`).join('');
  openOverlay(`<div class="phead"><span class="emoji">🔁</span><div><h2>Übung tauschen</h2><div class="pcat">${esc(ex.cat)}</div></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <button class="btn ghost block" style="margin-bottom:10px" onclick="closeOverlay();renderTraining()">‹ Zurück</button>
    <button class="lrow" onclick="clearExOv('${planId}',${dayIdx},'${exId}')"><span class="em">↩️</span><span class="info"><b>Standard wiederherstellen</b></span><span class="go">›</span></button>
    ${rows}`);
}
function setExOv(planId,dayIdx,origEx,newEx){S.exOv[planId+'#'+dayIdx+'#'+origEx]=newEx;saveS();closeOverlay();renderTraining();toast('Übung getauscht');}
function clearExOv(planId,dayIdx,origEx){delete S.exOv[planId+'#'+dayIdx+'#'+origEx];saveS();closeOverlay();renderTraining();toast('Zurückgesetzt');}
function openPlanPicker(){
  const rows=TRAINING_PLANS.map(p=>`<div class="planopt ${p.id===S.trainingPlanId?'sel':''}" onclick="pickTrainingPlan('${p.id}')"><span class="pi">${p.icon}</span><div class="pt"><b>${esc(p.name)}</b><small>${esc(p.goal)}</small></div>${p.id===S.trainingPlanId?'<span style="margin-left:auto;color:var(--coral)">✓</span>':''}</div>`).join('');
  openOverlay(`<div class="phead"><span class="emoji">🏋️</span><div><h2>Trainingsplan</h2><div class="pcat">5 Ziele zur Auswahl</div></div><button class="close" onclick="closeOverlay()">✕</button></div>${rows}`);
}
function pickTrainingPlan(id){S.trainingPlanId=id;saveS();closeOverlay();renderTraining();drawCal();toast('Plan gewechselt');}

/* ===================== WORKOUT-PLAYER ===================== */
let PL=null;
function buildSteps(w){const steps=[];(w.items||[]).forEach(it=>{const ex=EXERCISES[it.ex];if(ex)steps.push({ex,it});});return steps;}
function startWorkout(dStr){const w=effWorkout(parseYmd(dStr));if(w.t==='rest'||!(w.items||[]).length){toast('Kein Training');return;}startPlayer(buildSteps(w),w.name,dStr);}
function startWorkoutPlan(planId,dayIdx){const plan=TPMAP[planId];const w=applyExOv(Object.assign({},plan.days[dayIdx],{planId,dayIdx}));startPlayer(buildSteps(w),w.name,null);}
function startPlayer(steps,name,dStr){
  if(!steps.length){toast('Kein Training');return;}
  PL={steps,name,dStr,idx:0,phase:'ex',remaining:0,timer:null};
  closeOverlay();$('player').classList.add('open');document.body.style.overflow='hidden';renderPlayer();
}
function plClose(){if(PL&&PL.timer)clearInterval(PL.timer);speechSynthesis&&speechSynthesis.cancel&&speechSynthesis.cancel();$('player').classList.remove('open');document.body.style.overflow='';PL=null;render();}
function renderPlayer(){
  const p=$('player');const total=PL.steps.length;const cur=PL.steps[PL.idx];const ex=cur.ex,it=cur.it;
  const meta=it.note?it.note:(it.dur?(it.sets+' Sätze × '+it.dur+' Sek'):(it.sets+' Sätze × '+it.reps+' Wdh'));
  const prog=Math.round(((PL.idx)/total)*100);
  if(PL.phase==='ex'){
    p.innerHTML=`
      <div class="ptop"><button class="pclose" onclick="plClose()">✕</button><div class="prog"><i style="width:${prog}%"></i></div><span class="faint" style="font-size:.8rem">${PL.idx+1}/${total}</span></div>
      <div class="pbody">
        <div class="pstep">${esc(PL.name)} · Übung ${PL.idx+1}/${total}</div>
        <div class="pname">${esc(ex.name)}</div>
        <div class="pmeta">${meta}</div>
        <div class="pinstr"><ol>${ex.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
          <a class="yt-link" href="${ytSearch(ex.yt)}" target="_blank" rel="noopener">▶ Video auf YouTube</a></div>
      </div>
      <div class="pctrl">
        <button class="btn ghost" onclick="plPrev()">‹ Zurück</button>
        <button class="btn" onclick="plNext()">${PL.idx+1<total?'Weiter ›':'Fertig ✓'}</button>
      </div>`;
  } else {
    const c=PL.remaining;
    p.innerHTML=`
      <div class="ptop"><button class="pclose" onclick="plClose()">✕</button><div class="prog"><i style="width:${prog}%"></i></div><span class="faint" style="font-size:.8rem">${PL.idx+1}/${total}</span></div>
      <div class="pbody">
        <div class="pstep">Pause</div>
        ${c<=5?`<div class="timer-count" id="tcount">${c}</div><div class="pmeta">Gleich geht's weiter…</div>`:`<div class="timer-num">${c}</div><div class="pmeta">Pause – nächste Übung: <b>${esc(PL.steps[PL.idx+1]?PL.steps[PL.idx+1].ex.name:'–')}</b></div>`}
      </div>
      <div class="pctrl">
        <button class="btn ghost" onclick="plSkip()">Pause überspringen ⏭</button>
        <button class="btn" onclick="plAdd10()">+10 Sek</button>
      </div>
      <div class="pmini"><button onclick="plPrev()">‹ vorherige Übung</button></div>`;
  }
}
function plNext(){
  if(PL.idx+1>=PL.steps.length){ // letzte Übung fertig
    if(PL.dStr){S.done[PL.dStr]=true;saveS();recordActivity(PL.name,PL.dStr);drawCal();}
    plClose();toast('Workout abgeschlossen 💪');return;
  }
  PL.phase='rest';PL.remaining=REST_SEC;renderPlayer();startTick();
}
function plPrev(){if(PL.timer)clearInterval(PL.timer);if(PL.phase==='rest'){PL.phase='ex';renderPlayer();return;}if(PL.idx>0){PL.idx--;}PL.phase='ex';renderPlayer();}
function plSkip(){if(PL.remaining>5)PL.remaining=5;renderPlayer();}
function plAdd10(){PL.remaining+=10;renderPlayer();}
function startTick(){
  if(PL.timer)clearInterval(PL.timer);
  PL.timer=setInterval(()=>{
    PL.remaining--;
    if(PL.remaining<=5&&PL.remaining>=1)speak(String(PL.remaining));
    if(PL.remaining<=0){clearInterval(PL.timer);PL.timer=null;speak('Los!');PL.idx++;PL.phase='ex';renderPlayer();return;}
    renderPlayer();
  },1000);
}

/* ===================== REZEPTE ===================== */
let recFilter='Alle',recSearch='';
function renderRecipes(){
  const v=$('v-recipes');const cats=['Alle','Frühstück','Mittagessen','Abendessen','Snack'];
  let list=allRecipes().filter(r=>recFilter==='Alle'||r.cat===recFilter);
  if(recSearch){const s=recSearch.toLowerCase();list=list.filter(r=>r.title.toLowerCase().includes(s)||r.ings.some(i=>i.n.toLowerCase().includes(s)));}
  const cards=list.map(r=>`<div class="card rcard" onclick="openRecipe('${r.id}')"><span class="tag">${r.cat}</span><span class="emoji">${r.emoji}</span><h3>${esc(r.title)}</h3><div class="meta">🍽 ${r.servings} Port. · ${r.ings.length} Zutaten${(r.id&&r.id[0]==='u')?(r.owner?' · ✏️ eigen':' · 🌐'):''}</div></div>`).join('');
  v.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:4px"><button class="btn" style="flex:1" onclick="openRecipeForm(null)">＋ Eigenes Rezept</button><button class="btn ghost" onclick="openCommunity()">🌐 Community</button></div>
    <div class="search"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="recSearch" placeholder="Rezept oder Zutat suchen…" value="${esc(recSearch)}"></div>
    <div class="chips">${cats.map(c=>`<button class="chip ${c===recFilter?'active':''}" onclick="setRecFilter('${c}')">${c}</button>`).join('')}</div>
    <div class="grid">${cards||'<div class="empty">Keine Rezepte gefunden.</div>'}</div>`;
  const si=$('recSearch');si.oninput=e=>{recSearch=e.target.value;const cards2=document.querySelector('#v-recipes .grid');renderRecipes();$('recSearch').focus();$('recSearch').setSelectionRange(recSearch.length,recSearch.length);};
}
function setRecFilter(c){recFilter=c;renderRecipes();}

/* ===================== EINKAUF ===================== */
function normIng(n){let s=n.toLowerCase().replace(/\(.*?\)/g,'').split(',')[0].replace(/\s+/g,' ').trim();
  if(/linsen/.test(s))return 'Linsen';if(/spinat/.test(s))return 'Spinat';
  return s.charAt(0).toUpperCase()+s.slice(1);}
function deptOf(name){const s=name.toLowerCase();for(const[dept,kws]of DEPT_RULES){if(kws.some(k=>s.includes(k)))return dept;}return 'Sonstiges';}
function renderShop(){
  const v=$('v-shop');
  v.innerHTML=`
    <div class="sec-title">Einkauf planen</div>
    <label class="fld"><span>Für wie viele Tage? (ab heute, laut Essensplan)</span>
      <div style="display:flex;gap:8px;align-items:center"><input class="inp" id="shInp" type="number" min="1" max="60" value="${S.shopDays}" style="max-width:90px"><button class="btn" onclick="genShop()">Liste erstellen</button></div></label>
    <div id="shResult"></div>`;
  $('shInp').onchange=()=>{S.shopDays=Math.max(1,Math.min(60,parseInt($('shInp').value)||7));saveS();};
  genShop();
}
function genShop(){
  S.shopDays=Math.max(1,Math.min(60,parseInt($('shInp').value)||7));saveS();
  const days=S.shopDays;const today=todayMid();
  const portions={};
  for(let i=0;i<days;i++){const d=new Date(today.getTime()+i*DAY_MS);const m=effMeals(d);
    SLOTS.forEach(s=>{const id=m[s[0]];if(id)portions[id]=(portions[id]||0)+1;});}
  const agg={}; // name|unit -> {name,unit,amount,dept}
  Object.keys(portions).forEach(id=>{const r=getRecipe(id);if(!r)return;const cooks=Math.ceil(portions[id]/r.servings);
    r.ings.forEach(ing=>{if(ing.a===''||ing.a==null||isNaN(Number(ing.a)))return;const nm=normIng(ing.n);const key=nm.toLowerCase()+'|'+(ing.u||'');
      if(!agg[key])agg[key]={name:nm,unit:ing.u||'',amount:0,dept:deptOf(ing.n)};agg[key].amount+=Number(ing.a)*cooks;});});
  const byDept={};Object.keys(agg).forEach(k=>{const a=agg[k];(byDept[a.dept]=byDept[a.dept]||[]).push(Object.assign({key:k},a));});
  let total=0,h='';
  DEPARTMENTS.forEach(dept=>{const items=byDept[dept];if(!items||!items.length)return;items.sort((a,b)=>a.name.localeCompare(b.name,'de'));
    h+=`<div class="deptblock"><h4>${deptIcon(dept)} ${dept}</h4>`+items.map(it=>{total++;const ck=!!S.shopChecked[it.key];
      return `<label class="shitem ${ck?'checked':''}"><input type="checkbox" ${ck?'checked':''} onchange="toggleShop('${it.key}',this.checked)"><span class="nm">${esc(it.name)}</span><span class="amt">${fmtNum(it.amount)} ${esc(it.unit)}</span></label>`;}).join('')+`</div>`;});
  $('shResult').innerHTML=total?`<div class="muted" style="font-size:.85rem;margin-bottom:8px">${total} Zutaten für ${days} Tag${days>1?'e':''}, sortiert nach Abteilungen.</div>${h}<button class="btn ghost block" style="margin-top:10px" onclick="resetShopChecks()">Häkchen zurücksetzen</button>`:'<div class="empty">Keine Zutaten – ist ein Essensplan gewählt?</div>';
}
function deptIcon(d){return {'Obst & Gemüse':'🥦','Tiefkühl':'🧊','Kühlregal':'🧀','Konserven & Gläser':'🥫','Trockenwaren':'🌾','Backwaren':'🍞','Gewürze & Öle':'🧂','Sonstiges':'🛒'}[d]||'🛒';}
function toggleShop(key,on){if(on)S.shopChecked[key]=true;else delete S.shopChecked[key];saveS();
  const el=event.target.closest('.shitem');if(el)el.classList.toggle('checked',on);}
function resetShopChecks(){S.shopChecked={};saveS();genShop();}

/* ===================== PROFIL / EINSTELLUNGEN ===================== */
function renderProfile(){
  const v=$('v-profile');
  const mp=MPMAP[S.mealPlanId]||MEAL_PLANS[0];
  v.innerHTML=`
    <div class="sec-title">Konto</div>
    <div class="card" style="cursor:default;display:flex;align-items:center;gap:12px;margin-bottom:8px"><span style="font-size:1.6rem">👤</span><div style="flex:1;min-width:0"><b style="word-break:break-all">${esc(USER?USER.email:'lokal')}</b><div class="muted" style="font-size:.8rem">Angemeldet · Daten werden sicher in deinem Konto gespeichert</div></div></div>
    <div class="muted" style="font-size:.8rem;margin:10px 0 6px">☁️ Cloud-Sync: <b style="color:${/Fehler/.test(syncState)?'var(--coral)':'var(--green)'}">${esc(syncState)}</b></div>
    <button class="btn ghost block" onclick="syncNow()">🔄 Jetzt synchronisieren</button>
    <button class="btn danger block" style="margin-top:8px" onclick="authLogout()">Abmelden</button>
    <div class="sec-title">Ernährungsplan</div>
    ${MEAL_PLANS.map(p=>`<div class="planopt ${p.id===S.mealPlanId?'sel':''}" onclick="pickMealPlan('${p.id}')"><span class="pi">${p.icon}</span><div class="pt"><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></div>${p.id===S.mealPlanId?'<span style="margin-left:auto;color:var(--coral)">✓</span>':''}</div>`).join('')}
    <div class="sec-title">Allergien &amp; Ausschlüsse</div>
    <p class="muted" style="font-size:.85rem;margin-bottom:8px">Zutaten/Lebensmittel, die du wegen <b>Allergien oder Vorlieben</b> meiden willst – komma-getrennt. Rezepte mit diesen Begriffen (Titel oder Zutat) werden nicht vorgeschlagen, z. B. <i>Tofu, Fisch, Ei, Nüsse, Laktose</i>.</p>
    <textarea class="inp" id="exclInp" rows="2" placeholder="z. B. Thunfisch, Makrele, Tofu">${esc(S.exclusions.join(', '))}</textarea>
    <button class="btn block" style="margin-top:10px" onclick="saveExcl()">Ausschlüsse speichern</button>
    <div class="sec-title">Trainingsplan</div>
    <button class="btn ghost block" onclick="openPlanPicker()">${esc((TPMAP[S.trainingPlanId]||{}).name||'wählen')} – ändern</button>
    <label class="fld" style="margin-top:10px"><span>Programm-Start (Tag 1 = erstes Workout)</span><input class="inp" id="startInp" type="date" value="${S.startDate||'2026-06-07'}" onchange="setStart(this.value)"></label>
    <div class="sec-title">App teilen &amp; installieren</div>
    <p class="muted" style="font-size:.85rem">Auf dem Handy: Teilen-Symbol → „Zum Home-Bildschirm". Dann startet FitPlan wie eine echte App. Den Link kannst du an Freunde schicken – jede:r <b>registriert ein eigenes Konto</b> und sieht nur die eigenen Daten (durch Anmeldung &amp; Datenbank-Sicherheitsregeln geschützt).</p>`;
}
function pickMealPlan(id){S.mealPlanId=id;saveS();renderProfile();drawCal();toast('Ernährungsplan gewählt');}
function saveExcl(){const t=$('exclInp').value;S.exclusions=t.split(',').map(x=>x.trim()).filter(Boolean);saveS();drawCal();toast('Ausschlüsse gespeichert');}
function setStart(v){if(v){S.startDate=v;saveS();drawCal();toast('Startdatum gesetzt');}}

/* ===================== BENUTZERNAME + SOCIAL ===================== */
let MY={username:null};
async function loadMyProfile(){MY.username=null;if(!(sb&&USER&&USER.id!=='local'))return;try{const {data}=await sb.from('profiles').select('username').eq('user_id',USER.id).maybeSingle();if(data&&data.username)MY.username=data.username;}catch(e){}}
function validName(n){return /^[a-zA-Z0-9_.]{3,20}$/.test(n||'');}
async function setUsername(name){name=(name||'').trim();if(!validName(name)){toast('3–20 Zeichen: Buchstaben, Zahlen, _ .');return false;}
  try{const {error}=await sb.from('profiles').upsert({user_id:USER.id,username:name});
    if(error){toast(/duplicate|unique/i.test(error.message||'')?'Name schon vergeben':'Fehler: '+error.message);return false;}
    MY.username=name;try{localStorage.removeItem('fitplan_wantname');}catch(e){}toast('Benutzername: '+name);return true;}
  catch(e){toast('Fehler: '+(e.message||e));return false;}}
async function ensureUsername(){await loadMyProfile();if(MY.username)return;let want=null;try{want=localStorage.getItem('fitplan_wantname');}catch(e){}
  if(want){if(await setUsername(want))return;}
  openUsernamePrompt();}
function openUsernamePrompt(){
  let pre='';try{pre=localStorage.getItem('fitplan_wantname')||'';}catch(e){}
  openOverlay(`<div class="phead"><span class="emoji">🏷️</span><div><h2>Benutzername wählen</h2><div class="pcat">damit Freunde dich finden &amp; adden können</div></div></div>
    <label class="fld"><span>Benutzername</span><input class="inp" id="unInp" placeholder="z. B. max_fit" value="${esc(pre)}"></label>
    <div class="actions"><button class="btn" onclick="saveUsernamePrompt()">Speichern</button><button class="btn ghost" onclick="closeOverlay()">Später</button></div>
    <p class="faint" style="font-size:.78rem;margin-top:10px">3–20 Zeichen: Buchstaben, Zahlen, Unterstrich, Punkt.</p>`);}
async function saveUsernamePrompt(){if(await setUsername($('unInp').value)){closeOverlay();render();if(curView==='friends')renderFriends();}}

async function loadFriends(){
  const out={accepted:[],incoming:[],outgoing:[]};
  if(!(sb&&USER&&USER.id!=='local'))return out;
  let fr=[];try{const {data}=await sb.from('friendships').select('*').or('requester.eq.'+USER.id+',addressee.eq.'+USER.id);fr=data||[];}catch(e){return out;}
  const otherIds=[...new Set(fr.map(f=>f.requester===USER.id?f.addressee:f.requester))];
  const names={};if(otherIds.length){try{const {data}=await sb.from('profiles').select('user_id,username').in('user_id',otherIds);(data||[]).forEach(p=>names[p.user_id]=p.username);}catch(e){}}
  fr.forEach(f=>{const other=f.requester===USER.id?f.addressee:f.requester;const rec={id:f.id,otherId:other,username:names[other]||'unbekannt'};
    if(f.status==='accepted')out.accepted.push(rec);else if(f.addressee===USER.id)out.incoming.push(rec);else out.outgoing.push(rec);});
  return out;}
async function addFriend(){const name=($('addNameInp').value||'').trim();if(!name)return;
  if(name===MY.username){toast('Das bist du selbst 🙂');return;}
  let p=null;try{const r=await sb.from('profiles').select('user_id,username').eq('username',name).maybeSingle();p=r.data;}catch(e){}
  if(!p){toast('Kein Nutzer „'+name+'"');return;}
  const f=await loadFriends();
  if(f.accepted.find(x=>x.otherId===p.user_id)){toast('Ihr seid schon Freunde');return;}
  const inc=f.incoming.find(x=>x.otherId===p.user_id);if(inc){await acceptRequest(inc.id);return;}
  if(f.outgoing.find(x=>x.otherId===p.user_id)){toast('Anfrage läuft bereits');return;}
  try{const {error}=await sb.from('friendships').insert({requester:USER.id,addressee:p.user_id,status:'pending'});if(error){toast('Fehler: '+error.message);return;}toast('Anfrage gesendet an '+name);$('addNameInp').value='';renderFriends();}catch(e){toast('Fehler: '+(e.message||e));}}
async function acceptRequest(id){try{await sb.from('friendships').update({status:'accepted'}).eq('id',id);toast('Freund hinzugefügt');renderFriends();}catch(e){toast('Fehler');}}
async function declineRequest(id){try{await sb.from('friendships').delete().eq('id',id);renderFriends();}catch(e){}}
async function removeFriend(id){if(!confirm('Freund entfernen?'))return;try{await sb.from('friendships').delete().eq('id',id);renderFriends();}catch(e){}}

async function loadFeed(friendIds){
  const ids=[USER.id,...friendIds];const res={acts:[],names:{},likeCount:{},myLikes:{},comments:{}};
  let acts=[];try{const {data}=await sb.from('activities').select('*').in('user_id',ids).order('created_at',{ascending:false}).limit(40);acts=data||[];}catch(e){return res;}
  res.acts=acts;if(!acts.length)return res;
  const aids=acts.map(a=>a.id);const uids=[...new Set(acts.map(a=>a.user_id))];
  try{const {data}=await sb.from('profiles').select('user_id,username').in('user_id',uids);(data||[]).forEach(p=>res.names[p.user_id]=p.username);}catch(e){}
  try{const {data}=await sb.from('likes').select('activity_id,user_id').in('activity_id',aids);(data||[]).forEach(l=>{res.likeCount[l.activity_id]=(res.likeCount[l.activity_id]||0)+1;if(l.user_id===USER.id)res.myLikes[l.activity_id]=true;});}catch(e){}
  try{const {data}=await sb.from('comments').select('*').in('activity_id',aids).order('created_at',{ascending:true});const cu=[];(data||[]).forEach(c=>{(res.comments[c.activity_id]=res.comments[c.activity_id]||[]).push(c);if(!res.names[c.user_id])cu.push(c.user_id);});
    const need=[...new Set(cu)];if(need.length){const {data:cp}=await sb.from('profiles').select('user_id,username').in('user_id',need);(cp||[]).forEach(p=>res.names[p.user_id]=p.username);}}catch(e){}
  return res;}
async function toggleLike(aid,on){try{if(on)await sb.from('likes').insert({activity_id:aid,user_id:USER.id});else await sb.from('likes').delete().eq('activity_id',aid).eq('user_id',USER.id);}catch(e){}renderFriends();}
async function addComment(aid){const inp=document.getElementById('cmt_'+aid);const t=(inp.value||'').trim();if(!t)return;try{await sb.from('comments').insert({activity_id:aid,user_id:USER.id,text:t});inp.value='';}catch(e){toast('Fehler');}renderFriends();}
async function recordActivity(title,dayStr,kind){if(!(sb&&USER&&USER.id!=='local'&&MY&&MY.username))return;try{await sb.from('activities').insert({user_id:USER.id,title:title,day:dayStr,kind:kind||'workout'});}catch(e){}}

function av(name){return (name||'?').slice(0,1).toUpperCase();}
function timeAgo(iso){const d=new Date(iso),s=(Date.now()-d.getTime())/1000;if(s<60)return 'gerade eben';if(s<3600)return Math.floor(s/60)+' min';if(s<86400)return Math.floor(s/3600)+' Std';return d.toLocaleDateString('de-DE',{day:'numeric',month:'short'});}

async function renderFriends(){
  const v=$('v-friends');
  if(!(sb&&USER&&USER.id!=='local')){v.innerHTML='<div class="empty">Im Offline-Modus nicht verfügbar.</div>';return;}
  if(!MY.username){
    v.innerHTML=`<div class="sec-title">Benutzername</div>
      <div class="card" style="cursor:default"><p class="muted" style="margin-bottom:10px">Lege einen Benutzernamen fest, damit Freunde dich finden und adden können.</p>
      <label class="fld"><span>Benutzername</span><input class="inp" id="unInp2" placeholder="z. B. max_fit"></label>
      <button class="btn block" onclick="(async()=>{if(await setUsername($('unInp2').value))renderFriends();})()">Speichern</button></div>`;return;}
  v.innerHTML='<div class="empty">Lade…</div>';
  const f=await loadFriends();const feed=await loadFeed(f.accepted.map(x=>x.otherId));
  const inc=f.incoming.map(r=>`<div class="reqrow"><span class="fav">${av(r.username)}</span><span class="nm">${esc(r.username)}</span><button class="ok" onclick="acceptRequest('${r.id}')">Annehmen</button><button class="no" onclick="declineRequest('${r.id}')">✕</button></div>`).join('');
  const fr=f.accepted.map(r=>`<div class="reqrow"><span class="fav">${av(r.username)}</span><span class="nm">${esc(r.username)}</span><button class="no" onclick="removeFriend('${r.id}')">entfernen</button></div>`).join('');
  const outg=f.outgoing.map(r=>`<div class="reqrow"><span class="fav">${av(r.username)}</span><span class="nm">${esc(r.username)}</span><span class="faint" style="font-size:.78rem">angefragt</span></div>`).join('');
  const feedHtml=feed.acts.length?feed.acts.map(a=>{
    const nm=feed.names[a.user_id]||'?';const liked=!!feed.myLikes[a.id];const lc=feed.likeCount[a.id]||0;const cs=feed.comments[a.id]||[];
    const cmts=cs.map(c=>`<div class="cmt"><b>${esc(feed.names[c.user_id]||'?')}</b> ${esc(c.text)}</div>`).join('');
    return `<div class="feeditem">
      <div class="fh"><span class="fav">${av(nm)}</span><div><div class="fn">${esc(nm)}${a.user_id===USER.id?' <span class="faint">(du)</span>':''}</div><div class="ft">${timeAgo(a.created_at)}</div></div></div>
      <div class="fbody">${a.kind==='meal'?'🍽 Gekocht':'💪 Workout erledigt'}: <b>${esc(a.title)}</b></div>
      <div class="fact"><button class="${liked?'liked':''}" onclick="toggleLike('${a.id}',${liked?'false':'true'})">${liked?'❤️':'🤍'} ${lc>0?lc:''} Like</button><span class="faint" style="font-size:.82rem">${cs.length} Kommentar${cs.length===1?'':'e'}</span></div>
      ${cmts?`<div class="cmtlist">${cmts}</div>`:''}
      <div class="cmtbox"><input class="inp" id="cmt_${a.id}" placeholder="Kommentieren…"><button class="btn" onclick="addComment('${a.id}')">Senden</button></div>
    </div>`;}).join(''):'<div class="empty">Noch keine Aktivitäten. Schließe ein Workout ab oder adde Freunde!</div>';
  v.innerHTML=`
    <div class="sec-title">Mein Profil</div>
    <div class="card" style="cursor:default;display:flex;align-items:center;gap:11px"><span class="fav" style="width:40px;height:40px;font-size:1.1rem">${av(MY.username)}</span><div><b>@${esc(MY.username)}</b><div class="muted" style="font-size:.8rem">Diesen Namen geben Freunde beim Adden ein</div></div></div>
    <div class="sec-title">Freund hinzufügen</div>
    <div style="display:flex;gap:8px"><input class="inp" id="addNameInp" placeholder="Benutzername eingeben"><button class="btn" onclick="addFriend()">Adden</button></div>
    ${inc?`<div class="sec-title">Anfragen <span class="badge">${f.incoming.length}</span></div>${inc}`:''}
    ${fr?`<div class="sec-title">Freunde <span class="secount">${f.accepted.length}</span></div>${fr}`:''}
    ${outg?`<div class="sec-title">Gesendet</div>${outg}`:''}
    <div class="sec-title">Aktivitäten</div>${feedHtml}`;}

/* ===================== EIGENE & COMMUNITY-REZEPTE ===================== */
let COMM=[];
function isOwn(id){return !!(id&&id[0]==='u'&&(S.myRecipes||[]).some(r=>r.id===id));}
function parseIng(line){line=(line||'').trim();if(!line)return null;
  let m=line.match(/^(\d+(?:[.,]\d+)?)\s+([^\s\d][^\s]*)\s+(.+)$/);
  if(m)return {a:parseFloat(m[1].replace(',','.')),u:m[2],n:m[3].trim()};
  m=line.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if(m)return {a:parseFloat(m[1].replace(',','.')),u:'',n:m[2].trim()};
  return {a:'',u:'',n:line};}
function openRecipeForm(id){
  const r=id?getRecipe(id):null;const cats=['Frühstück','Mittagessen','Abendessen','Snack'];
  const ingText=r?r.ings.map(i=>((i.a!==''&&i.a!=null)?fmtNum(i.a)+' '+(i.u?i.u+' ':''):'')+i.n).join('\n'):'';
  openOverlay(`<div class="phead"><span class="emoji">📝</span><div><h2>${r?'Rezept bearbeiten':'Eigenes Rezept'}</h2></div><button class="close" onclick="closeOverlay()">✕</button></div>
    <div style="display:flex;gap:8px"><label class="fld" style="flex:0 0 72px"><span>Emoji</span><input class="inp" id="rf_emoji" maxlength="3" value="${r?esc(r.emoji||'🍽️'):'🍽️'}"></label>
    <label class="fld" style="flex:1"><span>Titel</span><input class="inp" id="rf_title" value="${r?esc(r.title):''}" placeholder="z. B. Linsensuppe"></label></div>
    <div style="display:flex;gap:8px"><label class="fld" style="flex:1"><span>Kategorie</span><select class="inp" id="rf_cat">${cats.map(c=>`<option ${r&&r.cat===c?'selected':''}>${c}</option>`).join('')}</select></label>
    <label class="fld" style="flex:0 0 92px"><span>Portionen</span><input class="inp" id="rf_serv" type="number" min="1" max="20" value="${r?r.servings:2}"></label></div>
    <label class="fld"><span>Zutaten – eine pro Zeile (z. B. „200 g Linsen")</span><textarea class="inp" id="rf_ings" rows="5" placeholder="200 g Linsen&#10;1 Stück Zwiebel&#10;Salz">${esc(ingText)}</textarea></label>
    <label class="fld"><span>Zubereitung – ein Schritt pro Zeile</span><textarea class="inp" id="rf_steps" rows="4">${r?esc(r.steps.join('\n')):''}</textarea></label>
    <label class="fld"><span>Notiz (optional)</span><input class="inp" id="rf_notes" value="${r?esc(r.notes||''):''}"></label>
    <label style="display:flex;align-items:center;gap:9px;margin:4px 0 12px;font-size:.9rem"><input type="checkbox" id="rf_share" ${r&&r.shared?'checked':''} style="width:20px;height:20px;flex-shrink:0;accent-color:#ff5e7a"><span>🌐 Mit der Community teilen – andere können es hinzufügen</span></label>
    <div class="actions"><button class="btn" onclick="saveRecipeForm(${id?`'${id}'`:'null'})">Speichern</button>${id&&isOwn(id)?`<button class="btn danger" onclick="deleteMyRecipe('${id}')">Löschen</button>`:''}</div>`);
}
async function saveRecipeForm(id){
  const title=$('rf_title').value.trim();if(!title){toast('Bitte Titel eingeben');return;}
  const ings=$('rf_ings').value.split('\n').map(parseIng).filter(Boolean);
  const steps=$('rf_steps').value.split('\n').map(s=>s.trim()).filter(Boolean);
  S.myRecipes=S.myRecipes||[];
  const ex=id?S.myRecipes.find(x=>x.id===id):null;
  const rec=ex?Object.assign({},ex):{id:'u'+uid(),owner:true};
  rec.emoji=$('rf_emoji').value.trim()||'🍽️';rec.cat=$('rf_cat').value;rec.title=title;
  rec.servings=Math.max(1,parseInt($('rf_serv').value)||1);rec.ings=ings;rec.steps=steps;rec.notes=$('rf_notes').value.trim();
  rec.tags=rec.tags||['eigen'];const wantShare=$('rf_share').checked;
  const idx=S.myRecipes.findIndex(x=>x.id===rec.id);if(idx>=0)S.myRecipes[idx]=rec;else S.myRecipes.push(rec);
  if(wantShare){rec.shared=true;await shareRecipe(rec);}
  else {if(ex&&ex.communityId)await unshareRecipe(rec);rec.shared=false;}
  saveS();closeOverlay();renderRecipes();toast('Rezept gespeichert');
}
function deleteMyRecipe(id){if(!confirm('Rezept löschen?'))return;const r=(S.myRecipes||[]).find(x=>x.id===id);S.myRecipes=(S.myRecipes||[]).filter(x=>x.id!==id);if(r&&r.communityId)unshareRecipe(r);saveS();closeOverlay();renderRecipes();toast('Gelöscht');}
async function shareRecipe(rec){if(!(sb&&USER&&USER.id!=='local')){toast('Teilen nur online möglich');return;}
  const payload={user_id:USER.id,emoji:rec.emoji,cat:rec.cat,title:rec.title,servings:rec.servings,ings:rec.ings,steps:rec.steps,notes:rec.notes||'',shared:true};
  if(rec.communityId)payload.id=rec.communityId;
  try{const {data,error}=await sb.from('recipes').upsert(payload).select('id').maybeSingle();if(error){toast('Teilen-Fehler: '+error.message);return;}if(data&&data.id){rec.communityId=data.id;saveS();}toast('Geteilt 🌐');}catch(e){toast('Teilen-Fehler');}}
async function unshareRecipe(rec){if(!(sb&&USER&&rec.communityId))return;try{await sb.from('recipes').delete().eq('id',rec.communityId);rec.communityId=null;saveS();}catch(e){}}
async function openCommunity(){
  if(!(sb&&USER&&USER.id!=='local')){toast('Community nur online verfügbar');return;}
  openOverlay(`<div class="phead"><span class="emoji">🌐</span><div><h2>Community-Rezepte</h2><div class="pcat">von anderen geteilt</div></div><button class="close" onclick="closeOverlay()">✕</button></div><div class="empty">Lade…</div>`);
  let rows=[];try{const {data}=await sb.from('recipes').select('*').eq('shared',true).order('created_at',{ascending:false}).limit(100);rows=data||[];}catch(e){}
  COMM=rows;const uids=[...new Set(rows.map(r=>r.user_id))];const names={};
  if(uids.length){try{const {data}=await sb.from('profiles').select('user_id,username').in('user_id',uids);(data||[]).forEach(p=>names[p.user_id]=p.username);}catch(e){}}
  const have=new Set((S.myRecipes||[]).map(r=>r.communityId).filter(Boolean));
  const list=rows.filter(r=>r.user_id!==USER.id).map(r=>`<div class="lrow" style="cursor:default"><span class="em">${r.emoji||'🍽️'}</span><span class="info"><span class="rcat">${esc(r.cat||'')} · @${esc(names[r.user_id]||'?')}</span><b>${esc(r.title)}</b><small>${(r.ings||[]).length} Zutaten · ${r.servings} Port.</small></span>${have.has(r.id)?'<span class="go" style="color:var(--green)">✓ dabei</span>':`<button class="btn" style="padding:8px 12px;flex-shrink:0" onclick="addCommunityRecipe('${r.id}')">+ Add</button>`}</div>`).join('');
  $('panel').innerHTML=`<div class="phead"><span class="emoji">🌐</span><div><h2>Community-Rezepte</h2><div class="pcat">${rows.length} geteilt</div></div><button class="close" onclick="closeOverlay()">✕</button></div>${list||'<div class="empty">Noch keine geteilten Rezepte. Teile selbst eins über „＋ Eigenes Rezept" → „Mit der Community teilen".</div>'}`;
}
function addCommunityRecipe(cid){const r=COMM.find(x=>x.id===cid);if(!r)return;
  if((S.myRecipes||[]).some(x=>x.communityId===cid)){toast('Schon hinzugefügt');return;}
  S.myRecipes=S.myRecipes||[];
  S.myRecipes.push({id:'u'+uid(),emoji:r.emoji||'🍽️',cat:r.cat,title:r.title,servings:r.servings||2,ings:r.ings||[],steps:r.steps||[],notes:r.notes||'',tags:['community'],owner:false,shared:false,communityId:cid});
  saveS();toast('Hinzugefügt: '+r.title);openCommunity();}

/* ===================== BOOT ===================== */
boot();
