#!/usr/bin/env bash
set -euo pipefail

owner="${GITHUB_OWNER:-hushh-labs}"
title="${PROJECT_TITLE:-Rustic Phase 2 Bug Impact Ledger}"

require_gh() {
  if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI is required." >&2
    exit 1
  fi
}

project_number_for_title() {
  gh project list \
    --owner "$owner" \
    --limit 100 \
    --format json \
    --jq ".projects[] | select(.title == \"$title\") | .number" |
    head -n 1
}

field_exists() {
  local project_number="$1"
  local field_name="$2"

  gh project field-list "$project_number" \
    --owner "$owner" \
    --limit 100 \
    --format json \
    --jq ".fields[] | select(.name == \"$field_name\") | .name" |
    grep -Fx "$field_name" >/dev/null 2>&1
}

field_id() {
  local project_number="$1"
  local field_name="$2"

  gh project field-list "$project_number" \
    --owner "$owner" \
    --limit 100 \
    --format json \
    --jq ".fields[] | select(.name == \"$field_name\") | .id" |
    head -n 1
}

update_status_options() {
  local project_number="$1"
  local status_field_id

  status_field_id="$(field_id "$project_number" "Status")"

  if [ -z "$status_field_id" ]; then
    create_field_if_missing "$project_number" "Status" "SINGLE_SELECT" "New,Needs triage,Needs info,Accepted,In fix,Resolved pending award,Points awarded,Closed no points"
    return
  fi

  node - "$status_field_id" <<'NODE' | gh api graphql --input -
const field = process.argv[2];
const options = [
  ["New", "GRAY", "New Phase 2 item"],
  ["Needs triage", "YELLOW", "Waiting for maintainer triage"],
  ["Needs info", "ORANGE", "Reporter must add required details"],
  ["Accepted", "GREEN", "Accepted for Phase 2 tracking"],
  ["In fix", "BLUE", "Fix is in progress"],
  ["Resolved pending award", "PURPLE", "Resolved and waiting for points review"],
  ["Points awarded", "PINK", "Impact points recorded"],
  ["Closed no points", "RED", "Closed without impact points"],
].map(([name, color, description]) => ({ name, color, description }));

process.stdout.write(JSON.stringify({
  query: `mutation($field:ID!, $options:[ProjectV2SingleSelectFieldOptionInput!]!) {
    updateProjectV2Field(input:{fieldId:$field, singleSelectOptions:$options}) {
      projectV2Field {
        ... on ProjectV2SingleSelectField {
          id
          name
          options {
            id
            name
          }
        }
      }
    }
  }`,
  variables: { field, options },
}));
NODE
}

create_field_if_missing() {
  local project_number="$1"
  local field_name="$2"
  local data_type="$3"
  local options="${4:-}"

  if field_exists "$project_number" "$field_name"; then
    echo "Field already exists: $field_name"
    return
  fi

  if [ "$data_type" = "SINGLE_SELECT" ]; then
    gh project field-create "$project_number" \
      --owner "$owner" \
      --name "$field_name" \
      --data-type "$data_type" \
      --single-select-options "$options"
  else
    gh project field-create "$project_number" \
      --owner "$owner" \
      --name "$field_name" \
      --data-type "$data_type"
  fi
}

require_gh

if ! gh auth status >/dev/null 2>&1; then
  echo "Authenticate first with: gh auth login" >&2
  exit 1
fi

project_number="$(project_number_for_title || true)"

if [ -z "$project_number" ]; then
  project_number="$(
    gh project create \
      --owner "$owner" \
      --title "$title" \
      --format json \
      --jq ".number"
  )"
  echo "Created project #$project_number: $title"
else
  echo "Using existing project #$project_number: $title"
fi

update_status_options "$project_number"
create_field_if_missing "$project_number" "Severity" "SINGLE_SELECT" "P0,P1,P2,P3"
create_field_if_missing "$project_number" "Report Quality" "NUMBER"
create_field_if_missing "$project_number" "Impact Points" "NUMBER"
create_field_if_missing "$project_number" "Award Reason" "TEXT"
create_field_if_missing "$project_number" "Resolved By PR" "TEXT"
create_field_if_missing "$project_number" "Reporter" "TEXT"
create_field_if_missing "$project_number" "Awarded On" "DATE"

echo "Rustic Phase 2 project setup complete."
