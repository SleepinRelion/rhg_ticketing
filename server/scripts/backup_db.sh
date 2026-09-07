#!/bin/bash

# Configuration
DB_USER="postgres"
DB_NAME="hotel_tickets"
# You might not need DB_PASS if you use a .pgpass file, or you can supply it here:
export PGPASSWORD="your_actual_db_password"

# Directory where local backups will be stored temporarily
BACKUP_DIR="/home/user1/backups/hotel_tickets"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup for $DB_NAME..."

# Step 1: Create the database dump and compress it
pg_dump -U "$DB_USER" -d "$DB_NAME" -h localhost | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Backup successfully created at $BACKUP_FILE"
else
  echo "Error during database backup!"
  exit 1
fi

# Step 2: Upload to off-site storage
# Choose ONE of the following methods and uncomment it:

# --- OPTION A: Using SCP (Copy to another remote Linux server) ---
# REMOTE_USER="username"
# REMOTE_HOST="remote-server.com"
# REMOTE_DIR="/path/to/remote/backups/"
# scp "$BACKUP_FILE" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

# --- OPTION B: Using AWS CLI (Copy to Amazon S3) ---
# S3_BUCKET="s3://your-backup-bucket-name/database-backups/"
# aws s3 cp "$BACKUP_FILE" "$S3_BUCKET"

# --- OPTION C: Using rclone (Copy to Google Drive, Dropbox, etc.) ---
# Ensure you have run 'rclone config' first to setup a remote named 'gdrive'
# rclone copy "$BACKUP_FILE" "gdrive:Hotel_Ticketing_Backups/"

# Step 3: Cleanup old local backups (keep last 7 days)
find "$BACKUP_DIR" -type f -name "db_backup_*.sql.gz" -mtime +7 -exec rm {} \;

echo "Backup process completed."
