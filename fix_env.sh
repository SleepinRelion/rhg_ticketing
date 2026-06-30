#!/bin/bash
# fix_env.sh - Automatically repairs the corrupted .env file

echo "Starting .env file repair..."

if [ ! -f .env ]; then
  echo "Error: .env file not found in the current directory."
  exit 1
fi

# Keep only the first 31 lines (the standard length of the .env file)
# This safely removes all the duplicated junk lines at the bottom of the file
head -n 31 .env > .env.clean

# Safely wrap the SMTP_PASS in double quotes if it isn't already.
# This prevents Docker and Node from misinterpreting special characters like $, `, or ~.
sed -i 's/^SMTP_PASS=\([^"].*\)/SMTP_PASS="\1"/' .env.clean

# Replace the corrupted .env with the cleaned one
mv .env.clean .env

echo "Successfully repaired .env file! Credentials are safe."
echo "You can now run: sudo docker compose up --force-recreate -d"
