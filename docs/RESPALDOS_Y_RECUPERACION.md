# Respaldos y recuperación

## Historias cubiertas

- **H57 — Respaldos automáticos — issue #43**.
- **H58 — Restauración verificada — issue #84**.
- **Apoyo — MongoDB M0/staging — issue #60**.

## Diseño

El script `backend/scripts/backup.ts` exporta las colecciones de MongoDB y cifra el contenido con AES-256-GCM. La clave se recibe exclusivamente mediante `BACKUP_ENCRYPTION_KEY`, en hexadecimal de 32 bytes. El archivo generado contiene versión, fecha, IV, etiqueta de autenticación y payload cifrado; no contiene datos legibles en texto plano.

El workflow `.github/workflows/mongodb-backup.yml` ejecuta el respaldo una vez al día a las 03:00 UTC y también permite ejecución manual. En el proyecto académico actual utiliza el entorno de GitHub `staging`, que apunta únicamente a la base de staging. El artefacto se conserva 30 días. La futura producción deberá usar otro entorno y otros secretos; ningún secreto se guarda en el repositorio, issues o logs.

En producción, `BACKUP_ENCRYPTION_KEY` es obligatorio al iniciar. El respaldo de producción exige `BACKUP_ALLOW_PRODUCTION=true`, que solo está definido dentro del workflow autorizado.

## Restauración segura

`backend/scripts/restore.ts` solo restaura cuando `RESTORE_CONFIRMATION=isolated`. También bloquea producción por defecto. La restauración prevista se realiza sobre una base aislada, se valida que las colecciones esperadas existan y luego se ejecutan pruebas de salud, autenticación, seed/demo y un smoke de reserva.

La restauración no se considera verificada por el mero hecho de descifrar un archivo. Para cerrar H58 se debe conservar evidencia de:

1. archivo generado por el workflow;
2. descifrado exitoso en una base aislada;
3. conteos de colecciones y documentos esperados;
4. health check del backend;
5. smoke E2E crítico posterior.

## Separación de entornos

Local, CI, staging y producción usan URI y secretos separados. El respaldo es portable entre despliegues porque trabaja con exportación de colecciones; por eso no es necesario migrar de inmediato la base actual a MongoDB Atlas M0. Atlas M0 puede evaluarse como alternativa futura para staging/costos, pero cualquier migración debe ser una decisión explícita con prueba de restauración y rollback.
