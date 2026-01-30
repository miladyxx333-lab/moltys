# 🚀 Despliegue en Google Cloud Run

## Prerequisitos
- Google Cloud SDK instalado (`gcloud`)
- Docker instalado
- Proyecto de Google Cloud con facturación habilitada

## Paso 1: Autenticarse en Google Cloud
```bash
gcloud auth login
gcloud config set project TU_PROYECTO_ID
```

## Paso 2: Habilitar APIs necesarias
```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Paso 3: Construir y subir imagen de Lobpoop
```bash
cd /path/to/lobpoop

# Construir imagen
docker build -t gcr.io/TU_PROYECTO_ID/lobpoop:latest .

# Subir a Google Container Registry
docker push gcr.io/TU_PROYECTO_ID/lobpoop:latest
```

## Paso 4: Desplegar en Cloud Run
```bash
gcloud run deploy lobpoop \
  --image gcr.io/TU_PROYECTO_ID/lobpoop:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "MASTER_RECOVERY_KEY=TU_KEY_SECRETA" \
  --set-env-vars "MOLTBOOK_API_KEY=TU_MOLTBOOK_KEY" \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10
```

## Paso 5: Construir y desplegar Moltbot
```bash
cd /path/to/moltbot

# Construir imagen
docker build -t gcr.io/TU_PROYECTO_ID/moltbot:latest .

# Subir a Google Container Registry
docker push gcr.io/TU_PROYECTO_ID/moltbot:latest

# Desplegar
gcloud run deploy moltbot \
  --image gcr.io/TU_PROYECTO_ID/moltbot:latest \
  --platform managed \
  --region us-central1 \
  --set-env-vars "LOBPOOP_ENDPOINT=https://lobpoop-XXXXX.run.app" \
  --memory 1Gi \
  --min-instances 1 \
  --max-instances 5
```

## Paso 6: Verificar despliegue
```bash
# Obtener URLs
gcloud run services list

# Probar Lobpoop
curl https://lobpoop-XXXXX.run.app

# Probar Moltbot
curl https://moltbot-XXXXX.run.app/health
```

---

## Costos Estimados (Google Cloud Run)
- **Lobpoop:** ~$5-10/mes (bajo tráfico)
- **Moltbot:** ~$15-30/mes (instancia siempre activa)
- **Total:** ~$20-40/mes

## Alternativa: Docker Compose Local
Si prefieres ejecutar todo localmente con Docker:
```bash
docker-compose up -d
```

Esto levantará ambos servicios en tu máquina conectados entre sí.
