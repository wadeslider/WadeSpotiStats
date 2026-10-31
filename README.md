# WadeSpotiStats 2.0

Aplicación estática multipágina para organizar canciones, artistas y playlists. Diseñada para GitHub Pages, sin backend ni frameworks.

## Estructura
- `index.html` + `public/css/index.css` + `public/js/index.js`: dashboard.
- `artistas.html` + `public/css/artistas.css` + `public/js/artistas.js`: artistas.
- `track.html` + `public/css/track.css` + `public/js/track.js`: canciones, búsqueda iTunes y consulta MyStreamCount y sincronización automática diaria.
- `playlists.html` + `public/css/playlists.css` + `public/js/playlists.js`: playlists manuales e inteligentes.
- `configuracion.html` + `public/css/configuracion.css` + `public/js/configuracion.js`: backups y mantenimiento.
- `public/css/core.css` y `public/js/core.js`: estilos y datos compartidos.

## Publicar en GitHub Pages
1. Sube el contenido de esta carpeta a la raíz de tu repositorio (donde está `index.html`).
2. En Settings → Pages, selecciona Deploy from a branch.
3. Selecciona la rama y carpeta `/ (root)`.
4. Abre la URL publicada. Usa rutas relativas, no rutas absolutas desde `/`.

## Datos y privacidad
Los datos viven en `localStorage` del navegador. Exporta backups JSON con regularidad. Importar un backup reemplaza los datos actuales, así que exporta primero si necesitas conservarlos.

## Integraciones
- iTunes Search API: búsqueda de metadatos vía JSONP.
- MyStreamCount: lectura del HTML público a través de AllOrigins. Depende de la disponibilidad y estructura del sitio y del proxy; puede dejar de funcionar si cambian.
- Sincronización automática: al guardar una canción nueva o editada se consulta inmediatamente. La biblioteca completa se revisa diariamente a las 9:00 a. m. según la hora local del dispositivo. Como GitHub Pages es estático, la revisión de las 9:00 se ejecuta si la app está abierta a esa hora o cuando se vuelve a abrir después. No hay tareas en segundo plano con la web cerrada.
- No existe botón manual de sincronización: el proceso es automático en el dashboard, canciones y configuración. Si una consulta falla, se conserva el último conteo válido.
- Spotify Web API no se usa para streams, porque no proporciona el contador público de reproducciones por track.

## Migración
Al iniciar, `core.js` lee la clave anterior `wadespotistats_songs`, crea IDs para canciones antiguas y genera perfiles de artista a partir del campo `artist` cuando faltan `artistIds`. No borra la clave anterior.
