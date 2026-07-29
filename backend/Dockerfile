# Django/DRF backend image.
# Binary wheels are used for psycopg and Pillow, so no compiler toolchain is
# needed — this keeps the image small and the build fast.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so this layer is cached across code changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh && mkdir -p media

EXPOSE 8000
CMD ["./entrypoint.sh"]
