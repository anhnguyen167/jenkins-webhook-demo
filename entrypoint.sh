#!/bin/bash
set -e

REPO_URL=${REPO_URL:-"https://github.com/anhnguyen167/jenkins-webhook-demo"}
RUNNER_NAME=${RUNNER_NAME:-"docker-runner-$(hostname)"}
RUNNER_LABELS=${RUNNER_LABELS:-"self-hosted,docker"}
RUNNER_WORKDIR=${RUNNER_WORKDIR:-"_work"}

if [ -z "$RUNNER_TOKEN" ]; then
  echo "Loi: bien moi truong RUNNER_TOKEN chua duoc set." >&2
  echo "Lay token tai: $REPO_URL/settings/actions/runners/new" >&2
  exit 1
fi

./config.sh --unattended \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --work "$RUNNER_WORKDIR" \
  --replace

cleanup() {
  echo "Dang go dang ky runner..."
  ./config.sh remove --token "$RUNNER_TOKEN"
}
trap cleanup EXIT

./run.sh
