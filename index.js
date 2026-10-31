let songs = JSON.parse(localStorage.getItem('wadespotistats_songs')) || [];
let currentView = 'grid';

function saveToStorage() {
  localStorage.setItem('wadespotistats_songs', JSON.stringify(songs));
  updateStats();
}

function formatNumber(num) {
  return Number(num).toLocaleString('es-MX');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
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

function searchITunes() {
  const query = document.getElementById('itunesQuery').value;
  if (!query) return;
  const resultsDiv = document.getElementById('itunesResults');
  resultsDiv.innerHTML = '<p style="font-size:0.75rem; color:var(--text-sub);">Buscando en iTunes...</p>';

  const oldScript = document.getElementById('itunesJsonp');
  if (oldScript) oldScript.remove();

  const script = document.createElement('script');
  script.id = 'itunesJsonp';
  script.src = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5&callback=handleITunesResponse`;
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
      <img src="${item.artworkUrl60}" alt="">
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
      resultsDiv.innerHTML = '<p style="font-size:0.75rem; color:var(--green-spotify);">¡Datos aplicados! (Agrega tu link de Spotify)</p>';
    };
    resultsDiv.appendChild(el);
  });
}

function saveSong(e) {
  e.preventDefault();
  const idVal = document.getElementById('songId').value;
  
  const songData = {
    id: idVal ? Number(idVal) : Date.now(),
    title: document.getElementById('titleInput').value,
    artist: document.getElementById('artistInput').value || 'Kenia Os',
    album: document.getElementById('albumInput').value || 'Sin Álbum',
    type: document.getElementById('typeInput').value,
    streams: parseInt(document.getElementById('streamsInput').value) || 0,
    date: document.getElementById('dateInput').value || '',
    cover: document.getElementById('coverInput').value || 'https://via.placeholder.com/300/181822/ffffff?text=Portada',
    link: document.getElementById('linkInput').value || '#'
  };

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
        // Aseguramos formato correcto y IDs limpios
        songs = imported.map(s => ({
          id: s.id ? Number(s.id) : Date.now() + Math.random(),
          title: s.title || 'Sin Título',
          artist: s.artist || 'Kenia Os',
          album: s.album || 'Sin Álbum',
          type: s.type || 'Sencillo',
          streams: Number(s.streams) || 0,
          date: s.date ? s.date.split('T')[0] : '',
          cover: s.cover || '',
          link: s.link || '#'
        }));
        saveToStorage();
        renderSongs();
        alert('¡Datos y respaldo cargados con éxito!');
      } else {
        alert('El archivo JSON no tiene el formato de lista correcto.');
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
        <div class="img-container">
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
        <div class="img-container">
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
                    <img class="table-thumb" src="${s.cover}" onerror="this.src='https://via.placeholder.com/300/181822/ffffff?text=Portada'">
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
}

updateStats();
renderSongs();
