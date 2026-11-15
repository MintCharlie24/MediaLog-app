# MediaLog móvil (v1.18.0)

Versión para el teléfono de MediaLog: se instala desde Chrome como una app, sin tienda ni APK.
Esta versión permite **ver** tu biblioteca, las fichas y las estadísticas. Añadir y editar llega en la 1.19.
Este repositorio solo contiene el código de la app: **no contiene ningún dato personal**. Tus datos se leen de tu repositorio privado MediaLog.

## Puesta en marcha (una sola vez)
1. En GitHub crea un repositorio **público** llamado `MediaLog-app` (Add a README no hace falta).
2. Pulsa "uploading an existing file", arrastra todo el contenido de esta carpeta (incluidas las carpetas `icons` y `vendor` y el archivo `.nojekyll`) y pulsa Commit changes.
3. En el repositorio ve a Settings, Pages, elige "Deploy from a branch", rama `main` carpeta `/ (root)` y Save. A los 1-2 minutos la app estará en `https://mintcharlie24.github.io/MediaLog-app/`.
4. Crea un token nuevo para el móvil: GitHub, Settings, Developer settings, Personal access tokens, Fine-grained tokens. Nombre `MediaLog móvil`, Only select repositories, `MediaLog`, permiso Contents en Read and write.
5. En el móvil abre la dirección con **Chrome**, menú de tres puntos, "Instalar aplicación" o "Añadir a la pantalla de inicio".
6. Abre MediaLog desde el icono, ve a Ajustes, pega el token y pulsa "Guardar y descargar".

Antes de esto, sincroniza una vez desde el ordenador para que los datos estén en GitHub.

## Cambiar de móvil
Instala la app de nuevo con los pasos 5 y 6 en el móvil nuevo, con un token nuevo. Después borra el token antiguo en GitHub. No hay nada que copiar del móvil viejo.

## Actualizar la app
Sube los archivos nuevos al repositorio sustituyendo los antiguos. La app se actualiza sola la siguiente vez que la abras.
