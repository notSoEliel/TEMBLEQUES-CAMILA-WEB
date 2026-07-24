# Respaldos y recuperación

## Historias cubiertas

- **H57 — Respaldos automáticos — issue #43**.
- **H58 — Restauración verificada — issue #84**.
- **Apoyo — MongoDB M0/staging — issue #60**.

## Diseño

El script `backend/scripts/backup.ts` exporta las colecciones de MongoDB y cifra el contenido con AES-256-GCM. La clave se recibe exclusivamente mediante `BACKUP_ENCRYPTION_KEY`, en hexadecimal de 32 bytes. El archivo generado contiene versión, fecha, IV, etiqueta de autenticación y payload cifrado; no contiene datos legibles en texto plano.

El backend puede ejecutar el respaldo dentro de la red privada de Railway mediante `BACKUP_ENABLED=true`. El scheduler corre diariamente a las 03:00 UTC, escribe en `BACKUP_OUTPUT_DIR` y elimina archivos cifrados con más de `BACKUP_RETENTION_DAYS` días. En staging, `BACKUP_OUTPUT_DIR=/data/backups` debe estar respaldado por un volumen persistente de Railway.

El workflow `.github/workflows/mongodb-backup.yml` se conserva como verificador manual o programado del código de staging. No debe intentar conectarse directamente a una URI `mongodb.railway.internal` desde GitHub Actions, porque ese hostname solo existe dentro de la red privada de Railway. Ningún secreto se guarda en el repositorio, issues o logs.

En producción, `BACKUP_ENCRYPTION_KEY` es obligatorio al iniciar y el scheduler debe utilizar un volumen y secretos propios de producción. El respaldo de producción exige `BACKUP_ALLOW_PRODUCTION=true` cuando se usa el script manual; el scheduler no habilita respaldos fuera de `staging` o `production`.

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

Para el staging académico actual se deben configurar en Railway:

- `BACKUP_ENABLED=true`.
- `BACKUP_OUTPUT_DIR=/data/backups`.
- `BACKUP_RETENTION_DAYS=30`.
- `BACKUP_ENCRYPTION_KEY` como secreto hexadecimal de 32 bytes.

El volumen no debe compartirse con MongoDB ni con producción. La evidencia de H57 debe incluir el evento `backup.created`, el nombre del archivo cifrado, la retención configurada y la existencia del archivo en el volumen, sin publicar su contenido ni la clave.
