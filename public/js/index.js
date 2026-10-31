(() => {
const W=window.Wade;if(!W)return;
const $=id=>document.getElementById(id);
function render(){
 $('statSongs').textContent=W.songs.length;$('statArtists').textContent=W.artists.length;
 const total=W.songs.reduce((a,s)=>a+W.num(s.streams),0);$('statStreams').textContent=W.fmt(total);
 const top=[...W.songs].sort((a,b)=>W.num(b.streams)-W.num(a.streams))[0];$('statTop').textContent=top?.title||'Sin datos';
 const artists=[...W.artists].sort((a,b)=>sum(b.id)-sum(a.id)).slice(0,5);
 $('artistPreview').innerHTML=artists.map(a=>`<div class="mini-artist">${a.image?`<img src="${W.clean(a.image)}" alt="">`:`<div class="avatar-fallback">${W.clean(a.name[0]||'?')}</div>`}<div><strong>${W.clean(a.name)}</strong><small>${W.songs.filter(s=>(s.artistIds||[]).includes(a.id)).length} canciones</small></div><b>${W.fmt(sum(a.id))}</b></div>`).join('');
 const recent=[...W.songs].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6);$('recentTracks').innerHTML=recent.map(s=>W.songRow(s)).join('')||'<div class="empty-state">Todavía no hay canciones. Añade la primera desde Canciones.</div>';
 const topSongs=[...W.songs].sort((a,b)=>W.num(b.streams)-W.num(a.streams)).slice(0,7);
 $('chartEmpty').style.display=topSongs.length?'none':'block';
 if(window.Chart){if(window._topChart)window._topChart.destroy();window._topChart=new Chart($('topChart'),{type:'bar',data:{labels:topSongs.map(s=>s.title),datasets:[{data:topSongs.map(s=>W.num(s.streams)),backgroundColor:'#398bd8',borderRadius:7,maxBarThickness:25}]},options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#7892ae',callback:v=>W.fmt(v)},grid:{color:'#1c2d40'}},y:{ticks:{color:'#b7cce1'},grid:{display:false}}}}})}
}
function sum(id){return W.songs.filter(s=>(s.artistIds||[]).includes(id)).reduce((n,s)=>n+W.num(s.streams),0)}
$('backupBtn').addEventListener('click',W.exportBackup);
$('syncBtn').addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Sincronizando…';const r=await W.syncAll();b.disabled=false;b.textContent='↻ Sincronizar';render();alert(`Sincronización terminada.\nCorrectas: ${r.success}\nNo disponibles: ${r.failed}`)});
document.addEventListener('click',e=>{const d=e.target.closest('[data-detail]'),ed=e.target.closest('[data-edit]');if(d)location.href=`track.html?id=${encodeURIComponent(d.dataset.detail)}`;if(ed)location.href=`track.html?edit=${encodeURIComponent(ed.dataset.edit)}`});
render();
})();