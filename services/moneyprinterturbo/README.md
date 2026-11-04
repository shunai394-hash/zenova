# MoneyPrinterTurbo service for Zenova

This folder runs the actual MoneyPrinterTurbo v1.3.9 FastAPI engine as a separate service. Zenova's Next.js server calls its API; the browser never receives the MPT API key.

## What this includes

- Pinned upstream MoneyPrinterTurbo v1.3.9 source, installed into the service image at build time.
- The upstream FastAPI app (app.asgi:app), not the Streamlit demo UI.
- FFmpeg and Japanese subtitle fonts.
- Required API-key authentication using the upstream x-api-key header.
- MPT task creation, task polling, and generated-file serving.

## Local run with Docker

From the Zenova repository root:

    $env:MPT_API_KEY = "create-a-long-random-secret"
    docker build -f services/moneyprinterturbo/Dockerfile -t zenova-moneyprinterturbo .
    docker run --rm -p 8080:8080 -e MPT_API_KEY=$env:MPT_API_KEY -v mpt-data:/data zenova-moneyprinterturbo

Check http://localhost:8080/ping. The response should be pong.

## Connect Zenova

Set these server-side environment variables in the Zenova deployment:

- MPT_API_URL: the base URL of this service, without a trailing slash.
- MPT_API_KEY: the same secret used by the MPT container.
- MPT_VIDEO_SOURCE: an explicitly selected upstream MPT material provider.
- MPT_VIDEO_SOURCE_IS_FREE=true only if the selected provider is genuinely free under its current terms. Leave unset otherwise; Zenova fails closed.

Do not put the MPT key in a NEXT_PUBLIC_* variable.

## Deploy to Cloud Run with Cloud Build

One-time setup (run in PowerShell; replace PROJECT_ID with the Google Cloud project ID):

    gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
    gcloud artifacts repositories create zenova --repository-format=docker --location=asia-northeast1
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $MPT_API_KEY = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
    Set-Content -NoNewline -Path .\mpt-api-key.txt -Value $MPT_API_KEY
    gcloud secrets create MPT_API_KEY --data-file=.\mpt-api-key.txt
    Remove-Item .\mpt-api-key.txt

Grant the Cloud Run runtime service account Secret Manager Secret Accessor. Grant the Cloud Build service account Artifact Registry Writer, Cloud Run Admin, and Service Account User permissions.

Then, from the Zenova repository root:

    gcloud builds submit --config services/moneyprinterturbo/cloudbuild.yaml .

The build deploys a service named zenova-moneyprinterturbo in asia-northeast1. Copy its HTTPS service URL into Zenova's server-side MPT_API_URL. Set the same MPT_API_KEY in Zenova's server-side environment variables, then set MPT_VIDEO_SOURCE=local and MPT_VIDEO_SOURCE_IS_FREE=true for the no-external-provider workflow.

## Google Cloud Run notes

Build from the repository root and point Cloud Build at this Dockerfile. Deploy the resulting image to Cloud Run with:

- Region: asia-northeast1
- Port: 8080
- CPU: 2
- Memory: at least 4 GiB
- Request timeout: 3600 seconds
- Maximum instances: 1 until a shared Redis queue and persistent artifact storage are configured
- Minimum instances: 1 and CPU always allocated while MPT's in-process background render tasks are running
- Secret Manager: map MPT_API_KEY to the container environment

MPT v1.3.9 uses an in-process task queue by default. Do not scale this service to zero or multiple instances for production rendering: a background task and its task state live in the serving process. Configure Redis plus persistent storage before increasing instance count.

## Important: free AI video generation

MoneyPrinterTurbo is the workflow and video assembly engine. It does not contain a free text-to-video foundation model. Its text-to-video integrations (including Metaso MiniMax H3, WaveSpeed, Seedance, OFox, and MuAPI) call external providers and may charge per clip. Pexels/Pixabay/Coverr are stock-footage sources, not generated AI video.

The service is integrated without enabling any paid provider by default. A real free AI-video model/API must be separately supplied and verified before enabling generation. Do not set the free flag merely to bypass the safety check.
