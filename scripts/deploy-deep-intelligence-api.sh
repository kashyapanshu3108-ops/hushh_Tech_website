#!/usr/bin/env bash

set -euo pipefail

SERVICE_NAME="hushh-deep-intelligence-api"
REGION="us-central1"
PROJECT_ID=""
SERVICE_ACCOUNT=""
SOURCE_DIR="cloud-run/deep-intelligence-api"
MEMORY="512Mi"
CPU="1"
MIN_INSTANCES="1"
MAX_INSTANCES="1"
CONCURRENCY="4"
TIMEOUT="3600s"
DEEP_INTELLIGENCE_MODEL="deep-research-max-preview-04-2026"
DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS="3"
DEEP_INTELLIGENCE_RETENTION_HOURS="24"
DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD="10000"
DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD="7"
GEMINI_API_KEY_SECRET=""
INTERNAL_API_KEY_SECRET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --region) REGION="$2"; shift 2 ;;
    --service) SERVICE_NAME="$2"; shift 2 ;;
    --service-account) SERVICE_ACCOUNT="$2"; shift 2 ;;
    --source-dir) SOURCE_DIR="$2"; shift 2 ;;
    --memory) MEMORY="$2"; shift 2 ;;
    --cpu) CPU="$2"; shift 2 ;;
    --min-instances) MIN_INSTANCES="$2"; shift 2 ;;
    --max-instances) MAX_INSTANCES="$2"; shift 2 ;;
    --concurrency) CONCURRENCY="$2"; shift 2 ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --model) DEEP_INTELLIGENCE_MODEL="$2"; shift 2 ;;
    --max-active-jobs) DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS="$2"; shift 2 ;;
    --retention-hours) DEEP_INTELLIGENCE_RETENTION_HOURS="$2"; shift 2 ;;
    --monthly-budget-usd) DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD="$2"; shift 2 ;;
    --estimated-job-cost-usd) DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD="$2"; shift 2 ;;
    --gemini-api-key-secret) GEMINI_API_KEY_SECRET="$2"; shift 2 ;;
    --internal-api-key-secret) INTERNAL_API_KEY_SECRET="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: $0 --gemini-api-key-secret SECRET --internal-api-key-secret SECRET [--project PROJECT_ID]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "No GCP project configured. Use --project or run: gcloud config set project PROJECT_ID"
  exit 1
fi

if [[ -z "$GEMINI_API_KEY_SECRET" || -z "$INTERNAL_API_KEY_SECRET" ]]; then
  echo "Both --gemini-api-key-secret and --internal-api-key-secret are required."
  exit 1
fi

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR"
  exit 1
fi

echo "Deploying Hushh Deep Intelligence API"
echo "  Project:        $PROJECT_ID"
echo "  Service:        $SERVICE_NAME"
echo "  Region:         $REGION"
echo "  Source:         $SOURCE_DIR"
echo "  Model:          $DEEP_INTELLIGENCE_MODEL"
echo "  Max jobs:       $DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS"
echo "  Retention:      ${DEEP_INTELLIGENCE_RETENTION_HOURS}h"
echo "  Monthly budget: $DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD USD estimated"
echo "  Max instances:  $MAX_INSTANCES"

gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  --project="$PROJECT_ID" >/dev/null

ENV_VARS="NODE_ENV=production,DEEP_INTELLIGENCE_MODEL=${DEEP_INTELLIGENCE_MODEL},DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS=${DEEP_INTELLIGENCE_MAX_ACTIVE_JOBS},DEEP_INTELLIGENCE_RETENTION_HOURS=${DEEP_INTELLIGENCE_RETENTION_HOURS},DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD=${DEEP_INTELLIGENCE_MONTHLY_BUDGET_USD},DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD=${DEEP_INTELLIGENCE_ESTIMATED_JOB_COST_USD}"

DEPLOY_ARGS=(
  run deploy "$SERVICE_NAME"
  --source "$SOURCE_DIR"
  --project "$PROJECT_ID"
  --region "$REGION"
  --platform managed
  # Keep the service publicly reachable so the HushhTech web runtime can call it
  # without Google-issued ID tokens; /v1 routes still require the internal API key.
  --allow-unauthenticated
  --memory "$MEMORY"
  --cpu "$CPU"
  --min-instances "$MIN_INSTANCES"
  --max-instances "$MAX_INSTANCES"
  --concurrency "$CONCURRENCY"
  --cpu-boost
  --timeout "$TIMEOUT"
  --set-env-vars "$ENV_VARS"
  --set-secrets "GEMINI_API_KEY=${GEMINI_API_KEY_SECRET}:latest,DEEP_INTELLIGENCE_API_KEY=${INTERNAL_API_KEY_SECRET}:latest"
  --quiet
)

if [[ -n "$SERVICE_ACCOUNT" ]]; then
  DEPLOY_ARGS+=(--service-account "$SERVICE_ACCOUNT")
fi

gcloud "${DEPLOY_ARGS[@]}"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"

echo "Deployment complete"
echo "Service URL: $SERVICE_URL"
