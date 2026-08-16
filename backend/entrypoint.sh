#!/bin/sh
# Container start-up: apply migrations, optionally load demo data, then serve.
set -e

echo "==> Applying migrations"
python manage.py migrate --noinput

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Loading demo data"
  python manage.py seed
fi

echo "==> Starting gunicorn on :8000"
exec gunicorn nava.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --access-logfile - \
  --error-logfile -
