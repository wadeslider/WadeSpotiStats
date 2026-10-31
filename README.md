# 🎵 WadeSpotiStats - Kenia Os

**WadeSpotiStats** es una aplicación web minimalista y moderna diseñada para el seguimiento preciso en tiempo real de las reproducciones (streams) de canciones en Spotify, inspirada estéticamente en la interfaz limpia de una playlist oficial de la plataforma. 

Este proyecto está optimizado para funcionar mediante almacenamiento local (`localStorage`), permitiendo sincronizar contadores reales, visualizar el comportamiento histórico en gráficas horarias y administrar catálogos musicales de manera eficiente.

---

## ✨ Características Principales

* **🎨 Interfaz Estilo Spotify:** Vista de lista vertical con carátulas cuadradas alineadas, tipografías limpias y contadores de reproducciones en color verde característico.
* **🔄 Sincronización en Vivo:** Conexión directa mediante ID de pista para consultar contadores reales y públicos de reproducciones.
* **⚠️ Detección de Enlaces Erróneos:** Al sincronizar, la aplicación identifica automáticamente las canciones con enlaces de Spotify inválidos o rotos y genera un reporte de atención.
* **📈 Historial Deslizante (Base de Datos Secundaria):** Sistema optimizado de registro de evolución horaria limitado estrictamente a un máximo de las últimas **5 horas**, borrando automáticamente los registros más antiguos para evitar saturar el almacenamiento.
* **✨ Autocompletado con iTunes:** Sección integrada para buscar y rellenar automáticamente metadatos (título, artista, álbum, fecha de lanzamiento y portadas en HD) utilizando la API de iTunes.
* **📱 Menú Contextual Táctil (Long Press y 3 Puntos):** Permite editar o eliminar canciones fácilmente tanto en dispositivos móviles (manteniendo presionado el renglón) como en PC (mediante el botón de opciones `⋮`).
* **💾 Respaldo y Carga de Datos:** Funciones nativas para exportar todo tu catálogo a un archivo JSON (`Backup`) y cargarlo de vuelta cuando lo necesites.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 / CSS3:** Estructura semántica y diseño visual responsivo inspirado en la interfaz de Spotify.
* **JavaScript (Vanilla ES6+):** Lógica del cliente, manipulación del DOM, control de eventos táctiles/clics y peticiones asíncronas (`async/await`).
* **Chart.js:** Librería ligera para renderizar las gráficas de evolución temporal de streams.
* **FontAwesome:** Iconografía moderna para botones, menús y controles.
* **LocalStorage:** Base de datos del navegador para la persistencia local de canciones e historiales.

---

## 🚀 Guía de Instalación y Uso

Al tratarse de una aplicación web estática basada en cliente, no requiere servidores complejos de backend para funcionar:

1. Clona este repositorio o descarga los archivos fuente en tu equipo:
   ```bash
   git clone [https://github.com/tu-usuario/WadeSpotiStats.git](https://github.com/tu-usuario/WadeSpotiStats.git)
