import { jsonResponse } from '../../_utils/auth.js';

// Berlin's Workshop simulation rules. Official Classic SEA notes confirm guaranteed
// success through +6, no failures below +9 once an item is at +9+, and Magic Jelly
// protection against destruction. The percentage table for +7..+15 is the documented
// legacy SEA table; it is clearly identified in the UI because current official notes
// do not publish the complete table.
const MAX_LEVEL = 15;
const SUCCESS_RATES = { 1:100, 2:100, 3:100, 4:100, 5:100, 6:100, 7:45, 8:40, 9:35, 10:30, 11:25, 12:20, 13:15, 14:5, 15:1 };
const BREAK_CHANCE = 25;
const MAX_HISTORY = 60;

async function ensureTable(env) {
  await env.PANTHEON_DB.prepare(`CREATE TABLE IF NOT EXISTS berlin_game_profiles (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL DEFAULT '',
    profile_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`).run();
  await env.PANTHEON_DB.prepare('CREATE INDEX IF NOT EXISTS idx_berlin_profiles_updated ON berlin_game_profiles(updated_at DESC)').run();
}

function rand() { const n = new Uint32Array(1); crypto.getRandomValues(n); return n[0] / 4294967296; }
function pick(items) { return items[Math.floor(rand() * items.length)]; }
function nowIso() { return new Date().toISOString(); }
function gameDayKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Manila', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const v = Object.fromEntries(parts.map(p => [p.type,p.value]));
  const base = new Date(Date.UTC(Number(v.year), Number(v.month)-1, Number(v.day)));
  if (Number(v.hour) < 9) base.setUTCDate(base.getUTCDate()-1);
  return base.toISOString().slice(0,10);
}
function safeString(value,max=80){return String(value||'').trim().slice(0,max);}
function makeId(){return crypto.randomUUID().replaceAll('-','');}
function newEquipment(grade='Epic',slot='Main Weapon',name='Berlin’s Training Sword') {
  return { id:makeId(), name:safeString(name,60), grade, slot, level:0, broken:false, createdAt:Date.now() };
}
function newProfile(session) {
  const username = safeString(session.label || session.username || 'Pantheon member',60);
  return {
    username, gold:8000, stones:8, jellies:2,
    equipment:[newEquipment('Epic','Main Weapon','Berlin’s Training Sword'),newEquipment('Epic','Armor','Novice Armor')],
    lastCheckinKey:'', lastCheckinAt:0, attempts:0, successes:0, failures:0, destructions:0, currentStreak:0, bestStreak:0,
    history:[], createdAt:Date.now(), updatedAt:Date.now()
  };
}
function normalizeProfile(raw,session) {
  const base = raw && typeof raw==='object' ? raw : newProfile(session);
  base.username = safeString(base.username || session.label || session.username || 'Pantheon member',60);
  base.gold = Math.max(0,Math.floor(Number(base.gold)||0));
  base.stones = Math.max(0,Math.floor(Number(base.stones)||0));
  base.jellies = Math.max(0,Math.floor(Number(base.jellies)||0));
  base.equipment = (Array.isArray(base.equipment)?base.equipment:[]).slice(-250).map(item=>({
    id:safeString(item.id,80)||makeId(), name:safeString(item.name,60)||'Unknown Equipment',
    grade:['Epic','Unique','Legend'].includes(item.grade)?item.grade:'Epic',
    slot:['Main Weapon','Secondary Weapon','Armor'].includes(item.slot)?item.slot:'Main Weapon',
    level:Math.max(0,Math.min(MAX_LEVEL,Math.floor(Number(item.level)||0))), broken:item.broken===true, createdAt:Number(item.createdAt)||Date.now()
  }));
  for (const k of ['attempts','successes','failures','destructions','currentStreak','bestStreak']) base[k]=Math.max(0,Math.floor(Number(base[k])||0));
  base.lastCheckinKey=safeString(base.lastCheckinKey,10);base.lastCheckinAt=Number(base.lastCheckinAt)||0;
  base.history=(Array.isArray(base.history)?base.history:[]).slice(0,MAX_HISTORY).map(entry=>({...entry}));
  base.createdAt=Number(base.createdAt)||Date.now();base.updatedAt=Number(base.updatedAt)||Date.now();
  return base;
}
function addHistory(profile,entry){profile.history.unshift({id:makeId(),when:nowIso(),...entry});profile.history=profile.history.slice(0,MAX_HISTORY);}
function rewardEquipment(){
  const roll=rand(); const grade=roll<0.02?'Legend':roll<0.18?'Unique':'Epic';
  const slot=pick(['Main Weapon','Secondary Weapon','Armor']);
  const names=slot==='Main Weapon'?['Adventurer’s Blade','Geraint’s Echo Sword','Saint Haven Longbow']:slot==='Secondary Weapon'?['Apprentice Quiver','Berlin’s Focus','Ironbound Off-hand']:['Adventurer’s Chestguard','Saint Haven Armor','Reinforced Guard'];
  const prefix=grade==='Legend'?'Dragon Legend':grade==='Unique'?'Nest Champion':'Lagendia';
  return newEquipment(grade,slot,`${prefix} ${pick(names)}`);
}
function buildLeaderboard(rows){
  return rows.map(row=>{let p;try{p=JSON.parse(row.profile_json)}catch(_){return null;}if(!p||typeof p!=='object')return null;const equipment=Array.isArray(p.equipment)?p.equipment:[];const live=equipment.filter(x=>!x.broken);return {label:safeString(p.username||row.username||'Adventurer',60),bestLevel:live.reduce((m,x)=>Math.max(m,Number(x.level)||0),0),successes:Number(p.successes)||0,destructions:Number(p.destructions)||0,bestStreak:Number(p.bestStreak)||0,attempts:Number(p.attempts)||0};}).filter(Boolean).sort((a,b)=>b.bestLevel-a.bestLevel||b.bestStreak-a.bestStreak||b.successes-a.successes||b.destructions-a.destructions).slice(0,25);
}
async function loadUserRow(env,discordId){return env.PANTHEON_DB.prepare('SELECT discord_id, username, profile_json, version, created_at, updated_at FROM berlin_game_profiles WHERE discord_id = ? LIMIT 1').bind(discordId).first();}
async function loadLeaderboard(env){const rows=await env.PANTHEON_DB.prepare('SELECT username, profile_json FROM berlin_game_profiles ORDER BY updated_at DESC LIMIT 500').all();return buildLeaderboard(rows.results||[]);}
function jsonFromRow(row,session){if(!row)return {profile:newProfile(session),version:0,persisted:false};try{return {profile:normalizeProfile(JSON.parse(row.profile_json),session),version:Number(row.version)||1,persisted:true};}catch(_){return {profile:newProfile(session),version:0,persisted:false};}}
async function saveProfile(env,session,row,profile) {
  const now=Date.now();profile.username=safeString(session.label||session.username||profile.username||'Pantheon member',60);profile.updatedAt=now;const text=JSON.stringify(profile);
  if(text.length>250000)return {ok:false};
  if(row){const result=await env.PANTHEON_DB.prepare('UPDATE berlin_game_profiles SET username = ?, profile_json = ?, version = version + 1, updated_at = ? WHERE discord_id = ? AND version = ?').bind(profile.username,text,now,session.discordId,Number(row.version)||1).run();return {ok:Number(result.meta?.changes||0)===1,version:(Number(row.version)||1)+1};}
  const result=await env.PANTHEON_DB.prepare('INSERT OR IGNORE INTO berlin_game_profiles (discord_id, username, profile_json, version, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)').bind(session.discordId,profile.username,text,now,now).run();return {ok:Number(result.meta?.changes||0)===1,version:1};
}
function responseFor(profile,version,persisted,dayKey,hasClaimedToday,leaderboard,result){return jsonResponse({profile,version,persisted,gameDayKey:dayKey,hasClaimedToday,leaderboard,rates:SUCCESS_RATES,result:result||null});}

export async function onRequestGet({env,data}) {
  const session=data?.session;if(!session)return jsonResponse({message:'Sign in with Discord first.'},401);
  try {await ensureTable(env);const row=await loadUserRow(env,session.discordId);const stored=jsonFromRow(row,session);const dayKey=gameDayKey();return responseFor(stored.profile,stored.version,stored.persisted,dayKey,stored.profile.lastCheckinKey===dayKey,await loadLeaderboard(env));}
  catch(error){return jsonResponse({message:`Workshop database error: ${String(error?.message||error).slice(0,200)}`},500);}
}
export async function onRequestPost({request,env,data}) {
  const session=data?.session;if(!session)return jsonResponse({message:'Sign in with Discord first.'},401);
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return jsonResponse({message:'Cross-origin workshop requests are not allowed.'},403);
  let body;try{body=await request.json()}catch(_){return jsonResponse({message:'Invalid request body.'},400)}
  const action=safeString(body.action,24);if(!['checkin','enhance'].includes(action))return jsonResponse({message:'Unknown workshop action.'},400);
  try {
    await ensureTable(env);
    const row=await loadUserRow(env,session.discordId);const stored=jsonFromRow(row,session);const profile=stored.profile;const today=gameDayKey();let resultMessage='',outcome=null;
    if(action==='checkin'){
      if(profile.lastCheckinKey===today)return jsonResponse({message:'You already claimed today’s supplies. Come back after the 9:00 AM Manila reset.'},409);
      profile.gold+=5000;profile.stones+=3;profile.jellies+=1;
      const gear=rewardEquipment();profile.equipment.unshift(gear);profile.equipment=profile.equipment.slice(0,250);
      profile.lastCheckinKey=today;profile.lastCheckinAt=Date.now();
      const extra=rand()<0.12?{kind:'bonus',text:'Bonus forge cache',value:1}:null;
      if(extra){profile.stones+=2;profile.gold+=2500;}
      addHistory(profile,{kind:'checkin',title:'Daily supply crate claimed',detail:`+5,000 simulation gold · +3 stones · +1 jelly · ${gear.grade} ${gear.slot}${extra?' · bonus cache +2 stones and +2,500 gold':''}`,outcome:'success'});
      resultMessage=`Check-in claimed! +5,000 simulation gold, +3 stones, +1 jelly, and a ${gear.grade} ${gear.slot}${extra?' plus a bonus cache':''}.`;
    } else {
      if(!row)return jsonResponse({message:'Claim your daily supplies first to initialize your workshop profile.'},409);
      const itemId=safeString(body.itemId,80);const item=profile.equipment.find(x=>x.id===itemId&&!x.broken);
      if(!item)return jsonResponse({message:'That equipment is unavailable or has been destroyed.'},404);
      if(item.level>=MAX_LEVEL)return jsonResponse({message:'This equipment is already at the +15 cap.'},409);
      const target=item.level+1;const rate=target<=6?100:Number(SUCCESS_RATES[target]||0);const cost=100*target*target;const stones=target<=6?1:target<=9?2:target<=12?3:4;
      const useJelly=body.useJelly===true&&target>=7;
      if(useJelly&&profile.jellies<1)return jsonResponse({message:'You do not have an Item Protection Magic Jelly.'},409);
      if(profile.gold<cost||profile.stones<stones)return jsonResponse({message:`Not enough resources. This attempt needs ${cost.toLocaleString()} simulation gold and ${stones} enhancement stone(s).`},409);
      profile.gold-=cost;profile.stones-=stones;if(useJelly)profile.jellies--;
      profile.attempts++;
      // Success and breakage are separate entries in the documented legacy table.
      // The residual probability is an ordinary failed attempt; jelly converts a break
      // result into an ordinary failure instead of destroying the equipment.
      const roll=rand()*100;const success=roll<rate;const wouldBreak=target>=7&&roll>=rate&&roll<rate+BREAK_CHANCE;
      if(success){item.level=target;profile.successes++;profile.currentStreak++;profile.bestStreak=Math.max(profile.bestStreak,profile.currentStreak);outcome='success';resultMessage=`SUCCESS! ${item.name} is now +${item.level}. Berlin approves.`;addHistory(profile,{kind:'enhance',title:`${item.name} +${target}`,detail:`Success at ${rate}% · Cost ${cost.toLocaleString()} gold and ${stones} stone(s)${useJelly?' · jelly consumed':''}`,outcome:'success'});}
      else {
        profile.failures++;profile.currentStreak=0;
        if(!useJelly&&wouldBreak){item.broken=true;profile.destructions++;outcome='destroyed';resultMessage=`DESTROYED. ${item.name} vanished in Berlin’s forge. The workshop log will remember.`;}
        else {outcome='failure';if(target>=12){const maxDrop=target>=14?3:2;const drop=1+Math.floor(rand()*maxDrop);const floor=item.level>=9?9:0;item.level=Math.max(floor,item.level-drop);}else if(item.level>=9){item.level=Math.max(9,item.level-1);}resultMessage=`FAILED. ${item.name} remains at +${item.level}${useJelly?' · jelly prevented destruction':''}.`;}
        addHistory(profile,{kind:'enhance',title:`${item.name} → +${target}`,detail:`Failure at ${rate}%${wouldBreak&&!useJelly?' · item destroyed':''} · Cost ${cost.toLocaleString()} gold and ${stones} stone(s)${useJelly?' · jelly consumed':''}`,outcome});
      }
    }
    profile.updatedAt=Date.now();
    const saved=await saveProfile(env,session,row,profile);
    if(!saved.ok)return jsonResponse({message:'Your workshop changed in another session. Refresh the workshop and try again.'},409);
    const leaderboard=await loadLeaderboard(env);const dayKey=gameDayKey();return responseFor(profile,saved.version,true,dayKey,profile.lastCheckinKey===dayKey,leaderboard,{message:resultMessage,outcome,action});
  } catch(error) {return jsonResponse({message:`Workshop update failed: ${String(error?.message||error).slice(0,220)}`},500);}
}
