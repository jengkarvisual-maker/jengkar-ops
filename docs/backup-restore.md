# Backup and Restore

Dokumen ini disiapkan untuk backup aman aplikasi OPS tanpa menyimpan credential sensitif ke repository.

## Persiapan

Export kredensial database di shell VPS sebelum menjalankan script:

```bash
set -a
source /root/ops-secrets.env
set +a
```

Jika `DIRECT_URL` belum diexport dari secrets file, Anda juga bisa export manual:

```bash
export DIRECT_URL="postgresql://..."
```

## Backup database harian

```bash
cd /var/www/ops-app
BACKUP_DIR=/var/backups/ops ./scripts/backup-db.sh
```

Output akan berupa file timestamped:

```text
/var/backups/ops/jengkar-ops_db_YYYYMMDD_HHMMSS.dump
```

Format backup memakai `pg_dump --format=custom` agar restore lebih fleksibel.

## Backup project mingguan

```bash
cd /var/www/ops-app
BACKUP_DIR=/var/backups/ops ./scripts/backup-project.sh
```

Script ini membuat arsip project tanpa `.git`, `node_modules`, `.next`, dan folder backup lokal.

## Restore database

Gunakan database target yang baru atau disposable terlebih dahulu.

```bash
export TARGET_DATABASE_URL="postgresql://..."
cd /var/www/ops-app
./scripts/restore-db.sh /var/backups/ops/jengkar-ops_db_YYYYMMDD_HHMMSS.dump
```

## Rekomendasi jadwal

- Daily: backup database
- Weekly: backup project/config
- Before deploy besar atau migration: backup database + project

## Contoh cron

```cron
0 2 * * * cd /var/www/ops-app && set -a && . /root/ops-secrets.env && set +a && BACKUP_DIR=/var/backups/ops ./scripts/backup-db.sh >> /var/log/ops-backup.log 2>&1
0 3 * * 0 cd /var/www/ops-app && BACKUP_DIR=/var/backups/ops ./scripts/backup-project.sh >> /var/log/ops-backup.log 2>&1
```
