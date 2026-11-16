# MediaLog móvil (v1.19.0)

Versión para el teléfono de MediaLog: se instala desde Chrome como una app, sin tienda ni APK.
Permite **ver** tu biblioteca, las fichas y las estadísticas, y **añadir, editar y eliminar** registros, con portadas elegidas de la galería y personajes. Los cambios se guardan en el teléfono al instante y se suben a GitHub solos (o al pulsar el botón de arriba); sin conexión quedan pendientes, con un punto naranja en ese botón.
Este repositorio solo contiene el código de la app: **no contiene ningún dato personal**. Tus datos se leen de tu repositorio privado MediaLog.

## Puesta en marcha (una sola vez)
1. En GitHub crea un repositorio **público** llamado `MediaLog-app` (Add a README no hace falta).
2. Pulsa "uploading an existing file", arrastra todo el contenido de esta carpeta (incluidas las carpetas `icons` y `vendor` y el archivo `.nojekyll`) y pulsa Commit changes.
3. En el repositorio ve a Settings, Pages, elige "Deploy from a branch", rama `main` carpeta `/ (root)` y Save. A los 1-2 minutos la app estará en `https://mintcharlie24.github.io/MediaLog-app/`.
4. Crea un token nuevo para el móvil: GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens. Nombre `MediaLog móvil`, Only select repositories, `MediaLog`, permiso Contents en **Read and write** (necesario para guardar cambios).
5. En el móvil abre la dirección con **Chrome**, menú de tres puntos, "Instalar aplicación" o "Añadir a la pantalla de inicio".
6. Abre MediaLog desde el icono, ve a Ajustes, pega el token y pulsa "Guardar y descargar".

Antes de esto, sincroniza una vez desde el ordenador para que los datos estén en GitHub.

## Cambiar de móvil
Instala la app de nuevo con los pasos 5 y 6 en el móvil nuevo, con un token nuevo. Después borra el token antiguo en GitHub. No hay nada que copiar del móvil viejo.

## Actualizar la app (de la 1.18 a la 1.19)
Sube todos los archivos del zip al repositorio `MediaLog-app` (Add file, Upload files) y confirma; los antiguos se sustituyen y hay dos nuevos, `sync.js` y `edit.js`. La app se actualiza sola: ábrela, ciérrala del todo y vuelve a abrirla. En Ajustes comprueba que pone Versión 1.19.0.

## Si algo falla
En Ajustes, al final, aparece la versión, si Chart.js está cargado y el último error. Si las estadísticas no salen, mándame ese texto o una captura.

## Límites de esta versión
Las listas (géneros, plataformas...), los criterios de nota y la wishlist se gestionan desde el ordenador. En el móvil las portadas se eligen de la galería.
