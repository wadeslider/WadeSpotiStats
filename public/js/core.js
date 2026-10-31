(() => {
const KEYS={songs:'wadespotistats_songs',artists:'wadespotistats_artists',playlists:'wadespotistats_playlists',lastSync:'wadespotistats_last_real_update',dailySyncDate:'wadespotistats_daily_sync_date',dailySyncInfo:'wadespotistats_daily_sync_info',version:'wadespotistats_version'};
const read=(key,fallback=[])=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}};
const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const uid=(prefix)=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const clean=(value='')=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v)=>Math.max(0,Number(v)||0);
const fmt=(v)=>num(v).toLocaleString('es-MX');
const artists=read(KEYS.artists),songs=read(KEYS.songs),playlists=read(KEYS.playlists);
function normalizeArtistName(name){return String(name||'').trim().replace(/\s+/g,' ')}
function ensureArtist(name){name=normalizeArtistName(name);if(!name)return null;let found=artists.find(a=>a.name.toLowerCase()===name.toLowerCase());if(!found){found={id:uid('artist'),name,image:'',description:'',createdAt:new Date().toISOString()};artists.push(found);write(KEYS.artists,artists)}return found.id}
function migrate(){
 let changed=false;
 songs.forEach(s=>{
  if(!s.id){s.id=uid('song');changed=true}
  if(!Array.isArray(s.artistIds)){
   const names=String(s.artist||s.artistName||'').split(/\s*(?:,|&| feat\.? | ft\.? )\s*/i).filter(Boolean);
   s.artistIds=names.map(ensureArtist).filter(Boolean);changed=true;
  }
  if(!Array.isArray(s.history)){s.history=[];if(s.streams)s.history.push({at:new Date().toISOString(),streams:num(s.streams)});changed=true}
  if(!s.createdAt){s.createdAt=new Date().toISOString();changed=true}
  s.streams=num(s.streams);
 });
 if(changed)write(KEYS.songs,songs);
 if(!localStorage.getItem(KEYS.version)){localStorage.setItem(KEYS.version,'2.0.0');write(KEYS.artists,artists)}
}
migrate();
function saveSongs(){write(KEYS.songs,songs)}
function saveArtists(){write(KEYS.artists,artists)}
function savePlaylists(){write(KEYS.playlists,playlists)}
function getArtistNames(song){return (song.artistIds||[]).map(id=>artists.find(a=>a.id===id)?.name).filter(Boolean).join(', ')||song.artist||'Artista desconocido'}
function getSongById(id){return songs.find(s=>String(s.id)===String(id))}
function getPlaylistSongs(playlist){
 let result;
 if(playlist.type==='smart'){
  result=songs.filter(s=>{
   const names=getArtistNames(s).toLowerCase();
   const artistOk=!playlist.rules?.artist||names.includes(playlist.rules.artist.toLowerCase());
   return artistOk&&num(s.streams)>=num(playlist.rules?.minStreams);
  });
  const key=playlist.rules?.sortBy||'streams',direction=playlist.rules?.order==='asc'?1:-1;
  result.sort((a,b)=>{let av=key==='growth'?getGrowth(a):key==='date'?(a.date||''):key==='title'?String(a.title||'').toLowerCase():num(a.streams);let bv=key==='growth'?getGrowth(b):key==='date'?(b.date||''):key==='title'?String(b.title||'').toLowerCase():num(b.streams);return (av>bv?1:av<bv?-1:0)*direction});
  return result.slice(0,Math.max(1,Number(playlist.rules?.limit)||20));
 }
 return (playlist.songIds||[]).map(getSongById).filter(Boolean);
}
function getGrowth(song){const h=song.history||[];if(h.length<2)return 0;return num(h[h.length-1].streams)-num(h[0].streams)}
function extractSpotifyTrackId(url){const m=String(url||'').match(/track\/([a-zA-Z0-9]{22})/);return m?m[1]:null}
function localDateKey(date=new Date()){
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
async function fetchMyStreamCount(song){
 const id=extractSpotifyTrackId(song.link);if(!id)return {ok:false,reason:'Falta un enlace válido de Spotify'};
 try{
  const target=`https://www.mystreamcount.com/track/${id}`;
  const response=await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(target)}`,{cache:'no-store'});
  if(!response.ok)throw new Error('El servicio de consulta no está disponible');
  const data=await response.json();if(!data.contents)throw new Error('MyStreamCount no respondió');
  const matches=[...data.contents.matchAll(/>([\d,]{5,})</g)].map(m=>Number(m[1].replace(/,/g,''))).filter(n=>Number.isFinite(n)&&n>10000);
  if(!matches.length)throw new Error('No se encontró el contador de streams');
  const value=matches[0],now=new Date(),iso=now.toISOString(),day=localDateKey(now);
  song.streams=value;
  song.history=Array.isArray(song.history)?song.history:[];
  const last=song.history.at(-1);
  if(last&&localDateKey(new Date(last.at||last.timestamp||0))===day){last.streams=value;last.at=iso;last.timestamp=now.getTime()}
  else song.history.push({at:iso,timestamp:now.getTime(),streams:value});
  song.lastSyncedAt=iso;
  return {ok:true,value};
 }catch(error){return {ok:false,reason:error.message||'Error de consulta'}}
}
const syncingSongs=new Set();
async function syncSong(song){
 if(!song)return {ok:false,reason:'Canción no encontrada'};
 if(syncingSongs.has(song.id))return {ok:false,reason:'Esta canción ya se está sincronizando'};
 syncingSongs.add(song.id);
 try{
  const result=await fetchMyStreamCount(song);
  if(result.ok){saveSongs();localStorage.setItem(KEYS.lastSync,Date.now().toString())}
  return result;
 }finally{syncingSongs.delete(song.id)}
}
async function syncAll(onProgress){
 let success=0,failed=0;
 for(let i=0;i<songs.length;i++){
  const result=await syncSong(songs[i]);
  result.ok?success++:failed++;
  onProgress?.(i+1,songs.length,result,songs[i]);
 }
 return {success,failed};
}
let dailySyncRunning=false;
async function runDailySyncIfDue(){
 if(dailySyncRunning||!songs.length)return null;
 const now=new Date(),today=localDateKey(now),due=now.getHours()>9||(now.getHours()===9);
 if(!due||localStorage.getItem(KEYS.dailySyncDate)===today)return null;
 // Marca el intento antes de empezar para evitar duplicados entre pestañas.
 localStorage.setItem(KEYS.dailySyncDate,today);
 dailySyncRunning=true;
 const startedAt=new Date().toISOString();
 try{
  const result=await syncAll();
  const info={date:today,at:startedAt,success:result.success,failed:result.failed};
  localStorage.setItem(KEYS.dailySyncInfo,JSON.stringify(info));
  window.dispatchEvent(new CustomEvent('wade:sync-complete',{detail:{...result,daily:true}}));
  return result;
 }catch(error){
  localStorage.setItem(KEYS.dailySyncInfo,JSON.stringify({date:today,at:startedAt,success:0,failed:songs.length,error:error.message}));
  return {success:0,failed:songs.length};
 }finally{dailySyncRunning=false}
}
function scheduleDailySync(){
 const now=new Date(),next=new Date(now);
 next.setHours(9,0,0,0);
 if(now>=next)runDailySyncIfDue();
 else setTimeout(runDailySyncIfDue,next.getTime()-now.getTime());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)runDailySyncIfDue()});
 window.addEventListener('focus',runDailySyncIfDue);
}
function getDailySyncInfo(){try{return JSON.parse(localStorage.getItem(KEYS.dailySyncInfo)||'null')}catch{return null}}
function exportBackup(){const payload={app:'WadeSpotiStats',version:'2.0.0',exportedAt:new Date().toISOString(),artists,songs,playlists};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`WadeSpotiStats-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
function importBackup(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!Array.isArray(data.songs))throw new Error('El archivo no contiene una biblioteca válida');songs.splice(0,songs.length,...data.songs);if(Array.isArray(data.artists))artists.splice(0,artists.length,...data.artists);else{artists.splice(0);songs.forEach(s=>(s.artistIds||[]).forEach(id=>{if(!artists.some(a=>a.id===id))artists.push({id,name:'Artista importado',image:'',description:''})}))}if(Array.isArray(data.playlists))playlists.splice(0,playlists.length,...data.playlists);saveSongs();saveArtists();savePlaylists();resolve(true)}catch(e){reject(e)}};reader.onerror=()=>reject(new Error('No se pudo leer el archivo'));reader.readAsText(file)})}
function escapeAttr(s){return clean(s)}
function coverOf(song){return song.cover||song.artworkUrl100||''}
function songRow(song,actions=true){const cover=coverOf(song);return `<div class="track-row"><img class="track-cover" src="${escapeAttr(cover)}" alt="" onerror="this.style.visibility='hidden'"><div class="track-meta"><strong>${clean(song.title||song.trackName||'Sin título')}</strong><small>${clean(getArtistNames(song))}${song.album?' · '+clean(song.album):''}</small></div><div class="track-streams">${fmt(song.streams)} <small>streams</small></div>${actions?`<div class="row-actions"><button data-detail="${clean(song.id)}">Ver</button><button data-edit="${clean(song.id)}">Editar</button></div>`:''}</div>`}
function bindMobileMenu(){const b=document.getElementById('menuToggle'),s=document.getElementById('sidebar');b?.addEventListener('click',()=>s.classList.toggle('open'))}
document.addEventListener('click',e=>{const close=e.target.closest('[data-close]');if(close)close.closest('.modal-backdrop')?.classList.remove('open')});
window.Wade={KEYS,artists,songs,playlists,uid,clean,num,fmt,write,saveSongs,saveArtists,savePlaylists,ensureArtist,getArtistNames,getSongById,getPlaylistSongs,getGrowth,fetchMyStreamCount,syncSong,syncAll,getDailySyncInfo,exportBackup,importBackup,coverOf,songRow,bindMobileMenu,extractSpotifyTrackId};
bindMobileMenu();
scheduleDailySync();
})();