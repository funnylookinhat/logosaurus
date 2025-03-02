import type { LogObject } from "../mod.ts";
import { iterateReader } from "@std/io/iterate-reader";
import {
  blue,
  cyan,
  gray,
  green,
  magenta,
  red,
  white,
  yellow,
} from "@std/fmt/colors";

// Write a method to assert that an object is a LogObject
function isLogObject(obj: unknown): obj is LogObject {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "level" in obj &&
    "level_n" in obj &&
    "namespace" in obj &&
    "message" in obj &&
    "context" in obj &&
    (typeof obj.level === "string") &&
    (typeof obj.level_n === "number") &&
    (typeof obj.namespace === "string") &&
    (typeof obj.message === "string") &&
    (typeof obj.context === "object" && obj.context !== null)
  );
}

/**
 * Given a line of text, attempt to parse it as a JSON LogObject and pretty
 * print it.  If it is not valid JSON, just print the line as-is.
 */
function prettyPrintLogObject(line: string) {
  try {
    const json = JSON.parse(line);
    if (isLogObject(json)) {
      let message: string = "";
      switch (json.level) {
        case "trace":
          message += gray("TRACE > ");
          break;
        case "debug":
          message += blue("DEBUG > ");
          break;
        case "info":
          message += green(" INFO > ");
          break;
        case "warn":
          message += yellow(" WARN > ");
          break;
        case "error":
          message += red("ERROR > ");
          break;
        case "fatal":
          message += magenta("FATAL > ");
          break;
      }

      message += `[${cyan(json.namespace)}] ${white(json.message)}`;
      message += "\n";
      message += gray(JSON.stringify(json.context, null, 2));
      console.log(message);
    } else {
      throw new Error(`Invalid LogObject`);
    }
  } catch (_error) {
    // If it's not valid JSON, just print the line as-is.
    // We could print errors, but that's just going to add noise to the output.
    console.log(gray(line));
  }
}

async function main() {
  const decoder = new TextDecoder();
  // Hold whatever part of the buffer hasn't seen a newline yet
  let partial = "";
  for await (const chunk of iterateReader(Deno.stdin)) {
    const text = decoder.decode(chunk);
    partial += text;

    const lines = partial.split("\n");
    partial = lines.pop() ?? "";

    for (const line of lines) {
      prettyPrintLogObject(line);
    }
  }
}

await main();
