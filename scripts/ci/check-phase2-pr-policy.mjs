import fs from "node:fs";
import https from "node:https";
import path from "node:path";

const allowNonPr = process.argv.includes("--allow-non-pr");
const eventName = process.env.GITHUB_EVENT_NAME || "";
const eventPath = process.env.GITHUB_EVENT_PATH || "";
const reportPath =
  process.env.PHASE2_PR_POLICY_REPORT_PATH ||
  path.join("tmp", "ci", "phase2-pr-policy-report.json");

const requiredIssueLabels = ["phase2:accepted", "phase2:invited-pr"];
const trustedAssociations = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

fs.mkdirSync(path.dirname(reportPath), { recursive: true });

function writeReport(report) {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

function normalizeLabelNames(labels) {
  return labels
    .map((label) => (typeof label === "string" ? label : label?.name))
    .filter(Boolean);
}

function extractClosingIssueNumbers(body, repositoryFullName) {
  const escapedRepository = repositoryFullName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const closingPattern = new RegExp(
    String.raw`\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s*:?\s+(?:(?:https:\/\/github\.com\/${escapedRepository}\/issues\/)|#)(\d+)\b`,
    "gi"
  );
  const issueNumbers = new Set();
  let match = closingPattern.exec(body);

  while (match) {
    issueNumbers.add(Number.parseInt(match[1], 10));
    match = closingPattern.exec(body);
  }

  return [...issueNumbers].filter(Number.isInteger);
}

function requestJson({ repositoryFullName, issueNumber, token }) {
  const [owner, repo] = repositoryFullName.split("/");
  const requestOptions = {
    hostname: "api.github.com",
    path: `/repos/${owner}/${repo}/issues/${issueNumber}`,
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "hushh-phase2-pr-policy",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(requestOptions, (response) => {
      let responseBody = "";
      response.on("data", (chunk) => {
        responseBody += chunk;
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(
            new Error(
              `GitHub issue lookup failed for #${issueNumber}: HTTP ${response.statusCode} ${responseBody}`
            )
          );
          return;
        }

        resolve(JSON.parse(responseBody));
      });
    });

    request.on("error", reject);
    request.end();
  });
}

async function getIssueLabels(repositoryFullName, issueNumber) {
  const offlineIssueJson = process.env.PHASE2_PR_POLICY_ISSUES_JSON;
  if (offlineIssueJson) {
    const offlineIssues = JSON.parse(offlineIssueJson);
    return normalizeLabelNames(offlineIssues[String(issueNumber)] || []);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required to validate linked Phase 2 issue labels.");
  }

  const issue = await requestJson({ repositoryFullName, issueNumber, token });
  return normalizeLabelNames(issue.labels || []);
}

if (!["pull_request", "pull_request_target"].includes(eventName)) {
  if (allowNonPr) {
    writeReport({
      skipped: true,
      reason: `event ${eventName || "unknown"} does not provide pull request metadata`,
    });
    process.exit(0);
  }

  console.error("Phase 2 PR policy check only supports pull_request or pull_request_target events.");
  process.exit(1);
}

if (!eventPath || !fs.existsSync(eventPath)) {
  console.error("GITHUB_EVENT_PATH is required for Phase 2 PR policy validation.");
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const pullRequest = payload.pull_request || {};
const repositoryFullName = payload.repository?.full_name;
const authorAssociation = String(pullRequest.author_association || "").toUpperCase();
const authorType = pullRequest.user?.type || "";
const body = String(pullRequest.body || "");
const warnings = [];
const errors = [];

if (!repositoryFullName) {
  errors.push("Repository full name is missing from the GitHub event payload.");
}

const trustedActor = trustedAssociations.has(authorAssociation) || authorType === "Bot";

if (trustedActor) {
  writeReport({
    valid: true,
    skipped: true,
    reason: `trusted PR author association ${authorAssociation || authorType}`,
    authorAssociation,
    authorType,
    warnings,
    errors,
  });
  process.exit(0);
}

const linkedIssueNumbers = repositoryFullName
  ? extractClosingIssueNumbers(body, repositoryFullName)
  : [];

if (linkedIssueNumbers.length === 0) {
  errors.push(
    "External Phase 2 PRs must link an accepted bug issue with a closing keyword such as Fixes #123, Closes #123, or Resolves #123."
  );
}

const issueResults = [];

for (const issueNumber of linkedIssueNumbers) {
  try {
    const labels = await getIssueLabels(repositoryFullName, issueNumber);
    const missingLabels = requiredIssueLabels.filter((label) => !labels.includes(label));
    issueResults.push({ issueNumber, labels, missingLabels });

    if (missingLabels.length > 0) {
      errors.push(
        `Linked issue #${issueNumber} is missing required Phase 2 labels: ${missingLabels.join(", ")}.`
      );
    }
  } catch (error) {
    errors.push(error.message);
  }
}

const report = {
  valid: errors.length === 0,
  authorAssociation,
  authorType,
  linkedIssueNumbers,
  requiredIssueLabels,
  issueResults,
  warnings,
  errors,
};

writeReport(report);

for (const warning of warnings) {
  console.warn(`warning: ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
