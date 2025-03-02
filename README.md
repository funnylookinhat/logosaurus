# Logosaurus (A Simple Logger)

JSON formatted logging for Deno (and others!).

## Overview

Logosaurus is a simple stdout logger that forces a minimum amount of convention
while otherwise leaving applications to determine how to best use logs.

### Why build another log tool?

The discussion on the future of @std/log and what logging looks like in Deno is
interesting and can be found here:
[github.com/denoland/std/issues/6124](https://github.com/denoland/std/issues/6124)
For this project, I wanted to experiment with what a minimal logger might look
like for the Deno community.

For my part, I needed a logger (that wouldn't be soon deprecated!) that provided
the ability to print JSON-formatted logs with a relatively ergonomic API. To me,
that means exposing `debug()` or `error()` types of methods, along with enough
bolts-included formatting so that I don't have to worry about the data I am
sending to it.

Based on my work experience, I find that enforcing at least some minimal amount
of standards on logs are necessary for them to be useful. There are a surprising
amount of rabbit trails to be found when teams are left to establish their own
logging standards.

Also, I can't believe this name wasn't already taken. :-P

## Getting Started

### Overview

Logosaurus focuses on three main required fields for every log:

- **Level** - e.g. `debug`, `info`, or `error`.
  - This is used to communicate how important the message is, or, in the case of
    an Error, the severity.
- **Namespace** - e.g. `controller.users`, `my-app.worker.compress` or
  `my-app.sql`.
  - These can be standardized however the codebase finds it most appropriate,
    but it is suggested that you use reverse domain name notation.
  - This field is intended to be used for filtering logs, especially as teams
    are trying to debug a problem.
- **Message** - e.g. `failed to parse request body` or `running query`
  - Should be human readable, and should not include fields or variables.
  - A message should not include variables; those should be included as context.

Additionally, log messages may include **Context**: a rich set of data with
meaningful values for interpretting or enriching the log.

- Teams should seek to standardize on how they name and format the shape of
  fields attached in context.
- Use Context to attach meaningful variables to messages.
  - e.g. a log message intended to print SQL queries that are running would
    include a parameterized query along with the parameters.
- Be sure to exclude values from logs that are sensitive: passwords, keys, etc.

### Quick Start

Import the `Logger` class and create an instance of it.

```typescript
import { Logger } from "@funnylookinhat/logosaurus";

const logger = new Logger();

logger.info("my-app.startup", "Application starting up", {
  version: "1.0.0",
  configuration: {
    port: 8080,
  },
});
```

By default, the minimum log level is _trace_ - this is likely more verbose than
desired for most deployed environments. As an example, you can exclude logs
below a given level.

```typescript
import { Logger } from "@funnylookinhat/logosaurus";

const logger = new Logger({
  // Will hide "trace" and "debug" logs, but include "info", "warn", "error",
  // and "fatal".
  minLogLevel: "info",
});
```

Consider using environment variables to configure your logger.

```typescript
import { LOG_LEVELS, Logger, type LogLevel } from "@funnylookinhat/logosaurus";

// Type guard to check if the environment provides a valid LogLevel
const configuredMinLogLevel = ((): LogLevel => {
  const level = Deno.env.get("LOG_LEVEL");
  if (level && LOG_LEVELS.includes(level)) {
    return level;
  }
  return "info"; // Default to info if not set or invalid
})();

const logger = new Logger({
  minLogLevel: configuredMinLogLevel,
});
```

### Configuration

See the **LoggerConfiguration** type for full documentation.

Accepted configuration includes:

- **minLogLevel** - The minimum level of logs to output.
  - Default: `"trace"`
  - Suggested configuration for deployments: `info`
- **includeTimestamp** - Whether or not to append a ISO8601 timestamp value to
  logs.
  - Default: `true`
  - Suggested configuration: `true`
  - Note: if applications wish to have their own timestamp format, they should
    set this to `false` and add their own value by providing their own
    `formatLog` method.
- **formatLog** - A method to format logs for output.
  - Default: Will serialize with the provided `jsonValueSerializer` and output
    as a single line of JSON.
  - Suggestion: do not override unless necessary.
- **jsonValueSerializer** - A method to serialize values for JSON.stringify.
  - Default: Will do a best-guess conversion of all non-native JSON types to
    strings.
  - Suggestion: do not override unless necessary.

In almost all cases, applications will need to only provide a `minLogLevel`
value.

### Suggested Levels

Here are suggested use cases for each log level:

- **trace** - Very detailed information, useful for debugging specific issues.
  These should be rarely required to be enabled.
  - Function entry/exit points
  - Network request/response details
  - SQL queries
  - Example: `logger.trace("my-app.sql", "Executing query", { sql, params })`

- **debug** - Diagnostic information that is more coarse than trace. In most
  cases, this should provide enough information to understand why an application
  is behaving unexpectedly.
  - Cache hits/misses
  - Service requests
  - State changes
  - Example: `logger.debug("my-app.cache", "Cache miss for key", { key })`

- **info** - Normal application behavior and milestones. These are things that
  would not be overly verbose if logged in production.
  - Application startup/shutdown
  - Configuration values at startup
  - Scheduled task execution
  - Example:
    `logger.info("my-app.lifecycle", "Application started successfully", { version })`

- **warn** - Non-ideal situations that the application can handle.
  - Resource usage approaching limits
  - Retrying operations
  - Errors from dependent services that can be handled.
  - Example:
    `logger.warn("my-app.service.catalog", "Could not fetch item from catalog service", { id })`

- **error** - Issues that need attention but don't stop the application.
  - Failed operations that have fallbacks
  - Periodic tasks that are failing to run.
  - Queues backing up.
  - Validation failures
  - Example:
    `logger.error("my-app.widget-processor", "Queue is unable to be processed", { queueDepth, error })`

- **fatal** - Severe issues that prevent normal operation. These likely indicate
  that the application is unable to work in any capacity. It may be failing to
  startup at all, or is exiting immediately.
  - Database connection issues
  - Critical configuration missing
  - Port binding failures
  - Out of memory conditions
  - Example:
    `logger.fatal("my-app.db", "Could not connect to database", { error })`
  - Example:
    `logger.fatal("my-app.lifecycle", "Invalid configuration - missing port", { config })`

### Parsing Logs for Local Development

Logosaurus inccludes include a tool to parse the logs it outputs into a more
human-readable format for local development.

To use it - you can pipe your command to the `pretty-print` tool.

```bash
deno task your-app | deno run jsr:@funnylookinhat/logosaurus/cli/pretty-print.ts
```

Additionally, you can install the `pretty-print` tool globally.

```bash
deno install -n logosaurus-pretty-print jsr:@funnylookinhat/logosaurus/cli/pretty-print.ts
```

And then you can use it like this:

```bash
deno task your-app | logosaurus-pretty-print
```
