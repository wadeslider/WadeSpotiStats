(() => {
const W=window.Wade,$=id=>document.getElementById(id);
$('exportBtn').addEventListener('click',W.exportBackup);
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{await W.importBackup(file);alert('Backup importado correctamente.');location.reload()}catch(err){alert('No se pudo importar: '+err.message)}});
function renderSyncStatus(){const info=W.getDailySyncInfo();$('dailySyncStatus').textContent=info?`${new Date(info.at).toLocaleString('es-MX')} · ${info.success} correctas / ${info.failed} pendientes`:'Aún no se ha ejecutado'}
renderSyncStatus();window.addEventListener('wade:sync-complete',renderSyncStatus);
$('storageCount').textContent=`${W.artists.length} artistas · ${W.songs.length} canciones · ${W.playlists.length} playlists`;
$('clearDataBtn').addEventListener('click',()=>{if(!confirm('Esto eliminará artistas, canciones e historial. ¿Continuar?'))return;if(!confirm('Última confirmación: ¿ya tienes un backup?'))return;[W.KEYS.artists,W.KEYS.songs,W.KEYS.playlists,W.KEYS.lastSync,W.KEYS.dailySyncDate,W.KEYS.dailySyncInfo,W.KEYS.version].forEach(k=>localStorage.removeItem(k));alert('Biblioteca local eliminada.');location.href='index.html'});
})();