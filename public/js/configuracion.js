(() => {
const W=window.Wade,$=id=>document.getElementById(id);
$('exportBtn').addEventListener('click',W.exportBackup);
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{await W.importBackup(file);alert('Backup importado correctamente.');location.reload()}catch(err){alert('No se pudo importar: '+err.message)}});
$('syncSettingsBtn').addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Sincronizando…';const r=await W.syncAll();b.disabled=false;b.textContent='↻ Sincronizar canciones';alert(`Correctas: ${r.success}\nNo disponibles: ${r.failed}`)});
$('storageCount').textContent=`${W.artists.length} artistas · ${W.songs.length} canciones · ${W.playlists.length} playlists`;
$('clearDataBtn').addEventListener('click',()=>{if(!confirm('Esto eliminará artistas, canciones e historial. ¿Continuar?'))return;if(!confirm('Última confirmación: ¿ya tienes un backup?'))return;[W.KEYS.artists,W.KEYS.songs,W.KEYS.playlists,W.KEYS.lastSync,W.KEYS.version].forEach(k=>localStorage.removeItem(k));alert('Biblioteca local eliminada.');location.href='index.html'});
})();