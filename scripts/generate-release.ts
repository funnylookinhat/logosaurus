import {
  format,
  greaterThan,
  increment,
  parse,
  type ReleaseType,
} from "jsr:@std/semver";
import conventionalChangelog from "npm:conventional-changelog";
import { Bumper } from "npm:conventional-recommended-bump";
import { resolve } from "jsr:@std/path/resolve";
import { Octokit } from "@octokit/rest";
import { parseArgs } from "jsr:@std/cli/parse-args";

interface DenoConfig {
  version: string;
  [key: string]: unknown;
}

interface ParsedDenoCommandOutput {
  stdout: string;
  stderr: string;
}

interface RunCommandOptions {
  dryRun?: boolean;
}

/**
 * Log critical errors and then exit.
 * @param messages - One or more string messages to log before exiting.
 */
function logAndExit(...messages: string[]): never {
  for (const m of messages) {
    console.log(m);
  }
  Deno.exit(1);
}

/**
 * Convenience method to run a command and get the output back synchronously.
 * @param cmd - The command to run (e.g. binary or path to invoke)
 * @param args - Optional arguments to pass along.
 * @param options - Optional options.
 * @returns - Deno.CommandOutput result
 */
function runCmd(
  cmd: string,
  args?: string[],
  options?: RunCommandOptions,
): Deno.CommandOutput {
  // For local testing purposes only.
  if (options?.dryRun === true) {
    console.log(`Dry Run Command: ${cmd} ${args?.join(" ")}`);
    return {
      success: true,
      code: 0,
      signal: null,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
    };
  }
  console.log(`Run: ${cmd} ${args?.join(" ")}`);
  return new Deno.Command(cmd, {
    args: args,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
}

/**
 * Convenience method to decode Deno.CommandOutput to strings.
 * @param c - The Deno.CommandOutput to parse to strings.
 * @returns An object with both stdout and stderr strings.
 */
function parseCommandOutput(c: Deno.CommandOutput): ParsedDenoCommandOutput {
  const stdout = (new TextDecoder().decode(c.stdout)).trim();
  const stderr = (new TextDecoder().decode(c.stderr)).trim();

  return {
    stdout,
    stderr,
  };
}

/**
 * Typeguard for Error
 * @param e - Value to check for Error
 */
function isError(e: unknown): asserts e is Error {
  if (!(e instanceof Error)) {
    throw new Error(`Expected type to be Error. Got (${typeof e})`);
  }
}

/**
 * Typeguard for ReleaseType.
 *
 * @param v - The value to check.
 * @returns {value is ReleaseType} - `true` if `value` is a `ReleaseType`, otherwise `false`.
 */
function isReleaseType(v: unknown): asserts v is ReleaseType {
  // Adjust the list below to match all release types supported by your semver import
  const validReleaseTypes: ReleaseType[] = [
    "major",
    "premajor",
    "minor",
    "preminor",
    "patch",
    "prepatch",
    "prerelease",
  ];

  if (typeof v !== "string" || !validReleaseTypes.includes(v as ReleaseType)) {
    throw new Error(`Expected type to be ReleaseType.  Got (${v})`);
  }
}

function isDenoConfig(v: unknown): asserts v is DenoConfig {
  if (typeof v !== "object" || typeof (v as DenoConfig).version !== "string") {
    throw new Error(`Expected type to be DenoConfig.  Missing version.`);
  }
}

if (import.meta.dirname === undefined) {
  logAndExit(
    "Could not determine current working path - import.meta.dirname is undefined",
  );
}

// Begin Work
const flags = parseArgs(Deno.args, {
  string: ["version"],
});

const forcedNewVersion = flags.version;

// Ensure we are in project root.
Deno.chdir(resolve(import.meta.dirname, ".."));

// Ensure we have a GITHUB_TOKEN provided.
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
if (GITHUB_TOKEN === undefined || GITHUB_TOKEN.length === 0) {
  logAndExit("Missing GITHUB_TOKEN environment variable.");
}

const GITHUB_REPOSITORY = Deno.env.get("GITHUB_REPOSITORY");
if (GITHUB_REPOSITORY === undefined || GITHUB_REPOSITORY.length === 0) {
  logAndExit("Missing GITHUB_REPOSITORY environment variable.");
}

// Ensure working tree is clean.
const gitStatusOutput = runCmd("git", ["status", "--porcelain"]);

if (
  gitStatusOutput.stdout.length !== 0 &&
  // This is provided mostly for testing purposes.  There may be cases where
  // useful in extraordinary settings.  I'm leaving it undocumented for that
  // reason.
  Deno.env.get("ALLOW_UNCLEAN_TREE") !== "ENABLED"
) {
  const gitDiffOutput = runCmd("git", ["--no-pager", "diff"]);

  const gitDiffParsedOutput = parseCommandOutput(gitDiffOutput);

  const { stdout } = parseCommandOutput(gitStatusOutput);
  logAndExit(
    `Working tree is not clean.  Commit or stash changes before running.`,
    stdout,
    gitDiffParsedOutput.stdout,
    gitDiffParsedOutput.stderr,
  );
}

const gitConfigUserNameOutput = runCmd("git", ["config", "user.name"]);
const userNameOutput = parseCommandOutput(gitConfigUserNameOutput);

if (userNameOutput.stdout.length === 0) {
  runCmd("git", [
    "config",
    "--global",
    "user.name",
    `"github-actions[bot]"`,
  ]);
}

const gitConfigUserEmailOutput = runCmd("git", ["config", "user.email"]);
const userEmailOutput = parseCommandOutput(gitConfigUserEmailOutput);

if (userEmailOutput.stdout.length === 0) {
  runCmd("git", [
    "config",
    "--global",
    "user.name",
    `"github-actions[bot]@users.noreply.github.com"`,
  ]);
}

// TODO - Determine if this is necessary.
// Ideally we check before we set it so that this could be run from the
// local commandline.

// // Configure Origin to use GITHUB_REPOSITORY and GITHUB_TOKEN
// runCmd("git", [
//   "remote",
//   "set-url",
//   "origin",
//   `https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git`,
// ], { dryRun: true });

// Get next release version.
const bumper = new Bumper(Deno.cwd()).loadPreset("angular");
const bump = await bumper.bump();

try {
  isReleaseType(bump.releaseType);
} catch (error) {
  isError(error);
  logAndExit(
    `Unexpected release type.  Expected major, minor, or patch.  Got (${bump.releaseType})`,
    error.message,
  );
}

// TODO - What happens if there is no commit log with new versions?
// What does releaseType look like?
// Do we want to exit 1 or 0?

console.log(`New release type: ${bump.releaseType}`);
// We should never get an "unknown" reason at this point - bump.reason is
// usually only undefined if Bumper fails to determine a releaseType.
console.log(`New release reason: ${bump.reason ?? "unknown!"}`);

let currentVersion: string;
let newVersion: string;
let denoJson: DenoConfig;

try {
  const denoJsonText = await Deno.readTextFile(
    resolve(import.meta.dirname, "../", "deno.json"),
  );
  denoJson = JSON.parse(denoJsonText);
  isDenoConfig(denoJson);
  currentVersion = denoJson.version;
} catch (error) {
  isError(error);
  logAndExit(
    "Could not read existing deno.json to determine current version!",
    error.message,
  );
}

try {
  if (forcedNewVersion !== undefined) {
    const parsedCurrentVersion = parse(currentVersion);
    const parsedForcedNewVersion = parse(forcedNewVersion);
    if (!greaterThan(parsedForcedNewVersion, parsedCurrentVersion)) {
      throw new Error(
        `Provided version (${
          format(parsedForcedNewVersion)
        }) is less than current one (${format(parsedCurrentVersion)})`,
      );
    }
    newVersion = format(parsedForcedNewVersion);
  } else {
    newVersion = format(increment(parse(currentVersion), bump.releaseType));
  }
} catch (error) {
  isError(error);
  logAndExit(
    `Could not determine next version.  Current version (${currentVersion})`,
    error.message,
  );
}

console.log(`Current Version: ${currentVersion}`);
console.log(`New Version: ${newVersion}`);

// Get Changelog since last release
let changelog: string;
try {
  changelog = await new Promise<string>((resolve, reject) => {
    let data = "";
    conventionalChangelog({
      preset: "angular",
      pkg: {
        path: "./deno.json",
      },
      releaseCount: 1,
    }, { version: newVersion }).on("data", (chunk: string) => {
      data += chunk;
    }).on("end", () => {
      resolve(data);
    }).on("error", (err: Error) => {
      reject(err);
    });
  });
} catch (error) {
  isError(error);
  logAndExit("Could not generate changelog.", error.message);
}

console.log(`Generated changelog:\n${changelog}`);

// Update deno.json

Deno.writeTextFile(
  resolve(import.meta.dirname, "../", "deno.json"),
  JSON.stringify(
    {
      ...denoJson,
      version: newVersion,
    },
    null,
    2,
  ),
);

const denoFmtOutput = runCmd("deno", ["fmt", "deno.json"]);

if (!denoFmtOutput.success) {
  const { stdout, stderr } = parseCommandOutput(denoFmtOutput);
  logAndExit(`Could format deno.json`, stdout, stderr);
}

console.log(`Updated deno.json version to ${newVersion}.`);

// Add deno.json to git commit
const gitAddOutput = runCmd("git", ["add", "deno.json"]);

if (!gitAddOutput.success) {
  const { stdout, stderr } = parseCommandOutput(gitAddOutput);
  logAndExit(`Could not add deno.json to git`, stdout, stderr);
}

// Commit changes
const gitCommitOutput = runCmd("git", [
  "commit",
  "-m",
  `chore: Release Version ${newVersion}`,
]);

if (!gitCommitOutput.success) {
  const { stdout, stderr } = parseCommandOutput(gitCommitOutput);
  logAndExit(`Could not commit to git`, stdout, stderr);
}

// Create Tag
const gitTagOutput = runCmd("git", [
  "tag",
  "-a",
  `${newVersion}`,
  "-m",
  // Remove leading header with link to changes.  We'll save that for the
  // release where it's more meaningful.
  changelog.split("\n").slice(1).join("\n"),
]);

if (!gitTagOutput.success) {
  const { stdout, stderr } = parseCommandOutput(gitTagOutput);
  logAndExit(`Could not add tag to git`, stdout, stderr);
}

// Push changes to git
const gitPushOutput = runCmd("git", ["push", "--follow-tags"]);

if (!gitPushOutput.success) {
  const { stdout, stderr } = parseCommandOutput(gitPushOutput);
  logAndExit(`Could not push changes to git`, stdout, stderr);
}

// Generate Release
const octokit = new Octokit({ auth: GITHUB_TOKEN });

const [owner, repo] = GITHUB_REPOSITORY.split("/");

try {
  const { data } = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: newVersion,
    name: `Release Version ${newVersion}`,
    body: changelog,
    draft: false,
  });
  console.log(`Generated Release: ${data.html_url}`);
} catch (error) {
  isError(error);
  logAndExit(`Could not create release!`, error.message);
}

Deno.exit(0);
