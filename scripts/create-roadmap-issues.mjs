#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CARD_HEADING = /^### (T\d+\.\d+) — (.+)$/;
const ISSUE_MARKER_PREFIX = "<!-- tabby-roadmap-card:";

export function parseRoadmap(markdown) {
  const lines = markdown.split(/\r?\n/);
  const cards = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = CARD_HEADING.exec(lines[index]);
    if (!heading) continue;
    const body = [];
    for (index += 1; index < lines.length && !/^#{2,3} /.test(lines[index]); index += 1) body.push(lines[index]);
    index -= 1;
    const content = body.join("\n").trim();
    cards.push({
      id: heading[1],
      name: heading[2],
      owner: metadata(content, "Owner") ?? "unassigned",
      status: metadata(content, "Status") ?? "ready",
      body: content,
    });
  }
  return cards;
}

export function issueBody(card) {
  return `${ISSUE_MARKER_PREFIX}${card.id} -->\n\n_Source: [\`roadmap.md\`](../blob/main/roadmap.md) · Status and scope remain authoritative in the roadmap._\n\n${card.body}\n`;
}

function metadata(content, key) {
  const match = new RegExp("^\\*\\*" + key + ":\\*\\*\\s+`([^`]+)`", "m").exec(content);
  return match?.[1];
}

function parseArguments(argv) {
  const options = { apply: false, includeDone: false, cards: new Set(), assignments: new Map() };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--include-done") options.includeDone = true;
    else if (argument === "--repo") options.repo = requiredValue(argv, ++index, argument);
    else if (argument === "--roadmap") options.roadmap = requiredValue(argv, ++index, argument);
    else if (argument === "--card") options.cards.add(requiredValue(argv, ++index, argument));
    else if (argument === "--assign") {
      const [owner, login, ...extra] = requiredValue(argv, ++index, argument).split("=");
      if (!owner || !login || extra.length) throw new Error("--assign must use owner=github-login.");
      options.assignments.set(owner.replace(/^@/, ""), login.replace(/^@/, ""));
    } else if (argument === "--help") options.help = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function requiredValue(argv, index, flag) {
  if (!argv[index] || argv[index].startsWith("--")) throw new Error(`${flag} requires a value.`);
  return argv[index];
}

function gh(arguments_, { allowFailure = false } = {}) {
  const result = spawnSync("gh", arguments_, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error) throw new Error(`Could not run GitHub CLI: ${result.error.message}`);
  if (result.status !== 0 && !allowFailure) throw new Error(result.stderr.trim() || `gh exited with status ${result.status}.`);
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log("Usage: node scripts/create-roadmap-issues.mjs [--apply] [--repo owner/name] [--card T1.1] [--include-done] [--assign tommy=login]\n\nDry-run is the default. --apply creates missing issues and detects existing cards by a stable body marker.");
    return;
  }
  const roadmapPath = options.roadmap ?? new URL("../roadmap.md", import.meta.url);
  const parsedCards = parseRoadmap(await readFile(roadmapPath, "utf8"));
  const knownIds = new Set(parsedCards.map(({ id }) => id));
  const unknownIds = [...options.cards].filter((id) => !knownIds.has(id));
  if (unknownIds.length) throw new Error(`Unknown roadmap card(s): ${unknownIds.join(", ")}`);
  const cards = parsedCards.filter(
    (card) => (options.includeDone || card.status !== "done") && (!options.cards.size || options.cards.has(card.id)),
  );
  if (!options.apply) {
    console.log(JSON.stringify(cards.map(({ id, name, owner, status }) => ({ id, title: `[${id}] ${name}`, owner, status })), null, 2));
    console.error(`Dry run: ${cards.length} issue(s) selected. Re-run with --apply to create missing issues.`);
    return;
  }

  gh(["auth", "status"]);
  const listArguments = ["issue", "list", "--state", "all", "--limit", "1000", "--json", "body,number"];
  if (options.repo) listArguments.push("--repo", options.repo);
  const existing = JSON.parse(gh(listArguments).stdout);
  const existingMarkers = new Set(existing.flatMap((issue) => [...(issue.body ?? "").matchAll(/<!-- tabby-roadmap-card:(T\d+\.\d+) -->/g)].map((match) => match[1])));

  for (const card of cards) {
    if (existingMarkers.has(card.id)) {
      console.log(`skip ${card.id}: issue already exists`);
      continue;
    }
    const createArguments = ["issue", "create", "--title", `[${card.id}] ${card.name}`, "--body", issueBody(card)];
    if (options.repo) createArguments.push("--repo", options.repo);
    const mappedAssignee = options.assignments.get(card.owner.replace(/^@/, ""));
    if (mappedAssignee) createArguments.push("--assignee", mappedAssignee);
    const result = gh(createArguments);
    console.log(result.stdout.trim());
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
