let songs = JSON.parse(localStorage.getItem('wadespotistats_songs')) || [];
let currentView = 'playlist'; // Vista inicial por defecto para evitar fallos de renderizado
let activeChart = null;

// SEGUNDA BASE DE DATOS (HISTORIAL DESLIZANTE DE MÁXIMO 5 HORAS)
function initSongHistory(song) {
  if (!song.history || !Array.isArray(song.history) || song.history.length === 0) {
    const baseStreams = parseInt(song.streams) || 0;
    const nowString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    song.history = [{ time: nowString, streams: baseStreams }];
  } else {
    // Asegurar que nunca exceda de 5 registros (borrando los más antiguos automáticamente)
    while (song.history.length > 5) {
      song.history.shift();
    }
  }
}

songs.forEach(initSongHistory);

function saveToStorage() {
  localStorage.setItem('wadespotistats_songs', JSON.stringify(songs));
  updateStats();
}

// EXTRAER ID DE SPOTIFY
function extractSpotifyTrackId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/track\/([a-zA-Z0-9]{22})/);
  return match ? match[1] : null;
}

// CONSULTA DIRECTA DE REPRODUCCIONES DESDE MYSTREAMCOUNT
async function fetchRealStreamsForSong(song) {
  try {
    const trackId = extractSpotifyTrackId(song.link);
    if (!trackId) return;

    const targetUrl = `https://www.mystreamcount.com/track/${trackId}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.contents) {
        const htmlContent = data.contents;
        let extractedStreams = null;

        const matches = htmlContent.match(/>([0-9]{1,3}(?:,[0-9]{3}){2,3})</g);
        if (matches && matches.length > 0) {
          for (let m of matches) {
            const cleanNum = m.replace(/>|</g, '').replace(/,/g, '');
            const numVal = parseInt(cleanNum, 10);
            if (numVal > 10000) {
              extractedStreams = numVal;
              break;
            }
          }
        }

        if (extractedStreams && extractedStreams > 0) {
          song.streams = extractedStreams;
          
          const nowString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const lastEntry = song.history[song.history.length - 1];

          if (lastEntry && lastEntry.time === nowString) {
            lastEntry.streams = extractedStreams;
          } else {
            // Agregar nuevo registro de hora
            song.history.push({ time: nowString, streams: extractedStreams });
            // REGLA DE 5 HORAS: Si supera 5 registros, se borra el primero (el más viejo)
            if (song.history.length > 5) {
              song.history.shift();
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ No se pudo conectar con MyStreamCount para "${song.title}". Se mantiene tu valor actual.`, error);
  }
}

// SINCRONIZACIÓN MANUAL (CONECTADA AL BOTÓN)
async function manualSyncAllSongs() {
  const btn = document.getElementById('syncBtn');
  if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...';

  for (let song of songs) {
    await fetchRealStreamsForSong(song);
  }

  saveToStorage();
  renderSongs();

  if (btn) btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Sincronizar';
  alert('¡Sincronización finalizada con MyStreamCount!');
}

// SINCRONIZACIÓN AUTOMÁTICA HORARIA
async function updateRealStreamsAutomatically() {
  const lastUpdate = localStorage.getItem('wadespotistats_last_real_update');
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (!lastUpdate || (now - parseInt(lastUpdate)) >= ONE_HOUR) {
    for (let song of songs) {
      await fetchRealStreamsForSong(song);
    }
    localStorage.setItem('wadespotistats_last_real_update', now.toString());
    saveToStorage();
    renderSongs();
  }
}

updateRealStreamsAutomatically();
setInterval(updateRealStreamsAutomatically, 60 * 1000);

function formatNumber(num) {
  return Number(num).toLocaleString('es-MX');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return cleanDate;
}

function updateStats() {
  document.getElementById('statCount').innerText = songs.length;
  const totalStreams = songs.reduce((sum, s) => sum + (parseInt(s.streams) || 0), 0);
  document.getElementById('statTotalStreams').innerText = formatNumber(totalStreams);

  if(songs.length > 0) {
    const topSong = [...songs].sort((a,b) => b.streams - a.streams)[0];
    document.getElementById('statTop').innerText = topSong.title;
  } else {
    document.getElementById('statTop').innerText = '-';
  }
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  if(view === 'grid') document.getElementById('btnGrid').classList.add('active');
  if(view === 'horizontal') document.getElementById('btnHorizontal').classList.add('active');
  if(view === 'list') document.getElementById('btnList').classList.add('active');
  if(view === 'playlist') document.getElementById('btnPlaylist').classList.add('active');
  renderSongs();
}

function openModal(id = null) {
  const modal = document.getElementById('modalOverlay');
  const form = document.getElementById('songForm');
  document.getElementById('itunesResults').innerHTML = '';
  document.getElementById('itunesQuery').value = '';
  modal.style.display = 'flex';

  if (id !== null && id !== '' && id !== undefined) {
    document.getElementById('modalTitle').innerText = 'Editar Canción';
    const song = songs.find(s => Number(s.id) === Number(id));
    if (song) {
      document.getElementById('songId').value = song.id;
      document.getElementById('titleInput').value = song.title || '';
      document.getElementById('artistInput').value = song.artist || 'Kenia Os';
      document.getElementById('albumInput').value = song.album || '';
      document.getElementById('typeInput').value = song.type || 'Sencillo';
      document.getElementById('streamsInput').value = song.streams || 0;
      
      if (song.date) {
        document.getElementById('dateInput').value = song.date.split('T')[0];
      } else {
        document.getElementById('dateInput').value = '';
      }

      document.getElementById('coverInput').value = song.cover || '';
      document.getElementById('linkInput').value = (song.link && song.link !== '#') ? song.link : '';
    }
  } else {
    document.getElementById('modalTitle').innerText = 'Agregar Canción';
    form.reset();
    document.getElementById('songId').value = '';
    document.getElementById('artistInput').value = 'Kenia Os';
    document.getElementById('linkInput').value = '';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').style.display = 'none';
}

async function openDetailModal(id) {
  const song = songs.find(s => Number(s.id) === Number(id));
  if (!song) return;

  await fetchRealStreamsForSong(song);
  saveToStorage();
  initSongHistory(song);

  document.getElementById('detailCover').src = song.cover || 'https://via.placeholder.com/300/181822/ffffff?text=Portada';
  document.getElementById('detailSongTitle').innerText = song.title;
  document.getElementById('detailSongArtist').innerText = `${song.artist} • ${song.album || 'Álbum'} (${song.type})`;
  document.getElementById('detailSongStreams').innerText = `${formatNumber(song.streams)} streams reales`;
  document.getElementById('detailSpotifyLink').href = (song.link && song.link !== '#') ? song.link : 'https://open.spotify.com';

  document.getElementById('detailModalOverlay').style.display = 'flex';

  const ctx = document.getElementById('streamsChart').getContext('2d');
  if (activeChart) {
    activeChart.destroy();
  }

  const labels = song.history.map(h => h.time);
  const dataPoints = song.history.map(h => h.streams);

  activeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Streams (Últimas 5h)',
        data: dataPoints,
        borderColor: '#00a8ff',
        backgroundColor: 'rgba(0, 168, 255, 0.15)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1db954',
        pointBorderColor: '#ffffff',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a0a0b0', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#a0a0b0', font: { size: 10 } }
        }
      }
    }
  });
}

function closeDetailModal() {
  document.getElementById('detailModalOverlay').style.display = 'none';
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}

function searchITunes() {
  let query = document.getElementById('itunesQuery').value.trim();
  if (!query) return;
  const resultsDiv = document.getElementById('itunesResults');
  resultsDiv.innerHTML = '<p style="font-size:0.75rem; color:var(--text-sub);">Buscando en iTunes...</p>';

  const oldScript = document.getElementById('itunesJsonp');
  if (oldScript) oldScript.remove();

  let requestUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5&callback=handleITunesResponse`;

  const script = document.createElement('script');
  script.id = 'itunesJsonp';
  script.src = requestUrl;
  document.body.appendChild(script);
}

function handleITunesResponse(data) {
  const resultsDiv = document.getElementById('itunesResults');
  resultsDiv.innerHTML = '';
  if (!data.results || data.results.length === 0) {
    resultsDiv.innerHTML = '<p style="font-size:0.75rem; color:var(--text-sub);">Sin resultados.</p>';
    return;
  }

  data.results.forEach(item => {
    const coverHd = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '1000x1000bb') : '';
    const releaseDate = item.releaseDate ? item.releaseDate.split('T')[0] : '';

    const el = document.createElement('div');
    el.className = 'itunes-item';
    el.innerHTML = `
      <img src="${item.artworkUrl60 || 'https://via.placeholder.com/60'}" alt="">
      <div class="itunes-item-info">
        <div class="itunes-item-title">${item.trackName}</div>
        <div class="itunes-item-sub">${item.artistName} • ${item.collectionName || 'Sencillo'}</div>
      </div>
    `;
    el.onclick = () => {
      document.getElementById('titleInput').value = item.trackName;
      document.getElementById('artistInput').value = item.artistName;
      document.getElementById('albumInput').value = item.collectionName || '';
      document.getElementById('coverInput').value = coverHd;
      if (releaseDate) document.getElementById('dateInput').value = releaseDate;
      resultsDiv.innerHTML = '<p style="font-size:0.75rem; color:var(--green-spotify);">¡Datos aplicados! (No olvides poner tu enlace de Spotify)</p>';
    };
    resultsDiv.appendChild(el);
  });
}

async function saveSong(e) {
  e.preventDefault();
  const idVal = document.getElementById('songId').value;
  const initialStreams = parseInt(document.getElementById('streamsInput').value) || 0;
  
  let existingSong = null;
  if (idVal !== "") {
    existingSong = songs.find(s => Number(s.id) === Number(idVal));
  }

  const songData = {
    id: idVal ? Number(idVal) : Date.now(),
    title: document.getElementById('titleInput').value,
    artist: document.getElementById('artistInput').value || 'Kenia Os',
    album: document.getElementById('albumInput').value || 'Sin Álbum',
    type: document.getElementById('typeInput').value,
    streams: initialStreams,
    date: document.getElementById('dateInput').value || '',
    cover: document.getElementById('coverInput').value || 'https://via.placeholder.com/300/181822/ffffff?text=Portada',
    link: document.getElementById('linkInput').value || '#',
    history: existingSong ? existingSong.history : null
  };

  initSongHistory(songData);

  if (idVal !== "" && idVal !== null && idVal !== undefined) {
    const index = songs.findIndex(s => Number(s.id) === Number(idVal));
    if (index !== -1) {
      songs[index] = songData;
    } else {
      songs.push(songData);
    }
  } else {
    songs.push(songData);
  }

  saveToStorage();
  closeModal();
  renderSongs();

  await fetchRealStreamsForSong(songData);
  saveToStorage();
  renderSongs();
}

function deleteSong(id) {
  if (confirm('¿Eliminar esta canción de tu lista?')) {
    songs = songs.filter(s => Number(s.id) !== Number(id));
    saveToStorage();
    renderSongs();
  }
}

function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(songs, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "WadeSpotiStats_Backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        songs = imported.map(s => {
          const mapped = {
            id: s.id ? Number(s.id) : Date.now() + Math.random(),
            title: s.title || 'Sin Título',
            artist: s.artist || 'Kenia Os',
            album: s.album || 'Sin Álbum',
            type: s.type || 'Sencillo',
            streams: Number(s.streams) || 0,
            date: s.date ? s.date.split('T')[0] : '',
            cover: s.cover || '',
            link: s.link || '#',
            history: s.history || null
          };
          initSongHistory(mapped);
          return mapped;
        });
        saveToStorage();
        renderSongs();
        alert('¡Datos y respaldo cargados con éxito!');
      } else {
        alert('El archivo JSON no tiene el formato correcto.');
      }
    } catch (err) {
      alert('Error al leer o parsear el archivo JSON.');
    }
  };
  reader.readAsText(file);
}

function getFilteredAndSortedSongs() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;

  let filtered = songs.filter(s => 
    s.title.toLowerCase().includes(query) ||
    s.artist.toLowerCase().includes(query) ||
    s.album.toLowerCase().includes(query)
  );

  return filtered.sort((a, b) => {
    if (sort === 'streams-desc') return b.streams - a.streams;
    if (sort === 'streams-asc') return a.streams - b.streams;
    if (sort === 'date-desc') return new Date(b.date || 0) - new Date(a.date || 0);
    if (sort === 'date-asc') return new Date(a.date || 0) - new Date(b.date || 0);
    if (sort === 'alpha-asc') return a.title.localeCompare(b.title);
    if (sort === 'alpha-desc') return b.title.localeCompare(a.title);
  });
}

function renderSongs() {
  const container = document.getElementById('songsContainer');
  const list = getFilteredAndSortedSongs();

  if (list.length === 0) {
    container.innerHTML = `<p style="text-align:center; color: var(--text-sub); padding: 50px 0;">No hay canciones en tu catálogo.<br>Presiona "+ Nueva" para agregar la primera o carga un backup.</p>`;
    return;
  }

  if (currentView === 'grid') {
    container.className = 'grid-view';
    container.innerHTML = list.map(s => `
      <div class="song-card">
        <div class="card-actions">
          <button class="action-btn edit-btn" data-id="${s.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete-btn" data-id="${s.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div class="img-container img-detail-trigger" data-id="${s.id}" title="Ver menú y gráfica de evolución">
          <img src="${s.cover}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/300/181822/ffffff?text=Portada'">
        </div>
        <div class="card-title"><a href="${s.link}" target="_blank">${s.title}</a></div>
        <div class="card-artist">${s.artist}</div>
        <div class="card-meta-small">${s.date ? '📅 ' + formatDate(s.date) : ''}</div>
        <div class="card-info">
          <span>${s.type}</span>
          <span class="streams-text">${formatNumber(s.streams)}</span>
        </div>
      </div>
    `).join('');
  } else if (currentView === 'horizontal') {
    container.className = 'horizontal-view';
    container.innerHTML = list.map(s => `
      <div class="h-card">
        <div class="img-container img-detail-trigger" data-id="${s.id}" title="Ver menú y gráfica de evolución">
          <img src="${s.cover}" alt="${s.title}" onerror="this.src='https://via.placeholder.com/300/181822/ffffff?text=Portada'">
        </div>
        <div class="h-details">
          <div class="h-title"><a href="${s.link}" target="_blank">${s.title}</a></div>
          <div class="h-artist">${s.artist}</div>
          <div class="h-meta">${s.album} • ${s.type} ${s.date ? '• ' + formatDate(s.date) : ''}</div>
        </div>
        <div style="text-align:right;">
          <div class="streams-text">${formatNumber(s.streams)}</div>
        </div>
        <div class="h-actions">
          <button class="action-btn edit-btn" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete-btn" data-id="${s.id}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } else if (currentView === 'playlist') {
    container.className = 'playlist-view';
    container.innerHTML = list.map((s, i) => `
      <div class="playlist-row">
        <div class="playlist-index">${i + 1}</div>
        <img class="playlist-thumb img-detail-trigger" data-id="${s.id}" src="${s.cover}" title="Ver menú y gráfica de evolución" onerror="this.src='https://via.placeholder.com/300/181822/ffffff?text=Portada'">
        <div class="playlist-info">
          <div class="playlist-song-title"><a href="${s.link}" target="_blank">${s.title}</a></div>
          <div class="playlist-song-artist">${s.artist}</div>
        </div>
        <div class="playlist-album">${s.album || 'Álbum'}</div>
        <div class="playlist-streams-box">
          <span class="streams-text">${formatNumber(s.streams)}</span>
          <span style="font-size:0.68rem; color:var(--text-sub);">${s.type}</span>
        </div>
        <div class="playlist-actions">
          <button class="action-btn edit-btn" data-id="${s.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete-btn" data-id="${s.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } else {
    container.className = '';
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="list-view-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Título / Artista</th>
              <th>Álbum</th>
              <th>Lanzamiento</th>
              <th>Reproducciones exactas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((s, i) => `
              <tr>
                <td style="color:var(--text-sub); width: 25px;">${i + 1}</td>
                <td>
                  <div class="table-song-cell">
                    <img class="table-thumb img-detail-trigger" data-id="${s.id}" src="${s.cover}" title="Ver menú y gráfica de evolución" onerror="this.src='https://via.placeholder.com/300/181822/ffffff?text=Portada'">
                    <div>
                      <div style="font-weight:bold;"><a href="${s.link}" target="_blank" style="color:white; text-decoration:none;">${s.title}</a></div>
                      <div style="color:var(--text-sub); font-size:0.75rem;">${s.artist}</div>
                    </div>
                  </div>
                </td>
                <td style="color:var(--text-sub);">${s.album}</td>
                <td style="color:var(--text-sub); font-size:0.8rem;">${formatDate(s.date) || '-'}</td>
                <td><span class="streams-text">${formatNumber(s.streams)}</span></td>
                <td>
                  <button class="action-btn edit-btn" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button>
                  <button class="action-btn delete-btn" data-id="${s.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => openModal(btn.getAttribute('data-id'));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => deleteSong(btn.getAttribute('data-id'));
  });
  document.querySelectorAll('.img-detail-trigger').forEach(el => {
    el.onclick = () => openDetailModal(el.getAttribute('data-id'));
  });
}

// Renderizado inmediato al cargar la página
updateStats();
renderSongs();
