import { LOG_LEVELS, Logger } from "../mod.ts";

const logger = new Logger();

let i = 0;
do {
  const level = LOG_LEVELS[i++ % LOG_LEVELS.length];
  const context = {
    ...Object.fromEntries(
      Array.from({ length: 10 }, () => [
        crypto.randomUUID(),
        crypto.randomUUID(),
      ]),
    ),
  };
  if (level === "trace") {
    logger.trace(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  } else if (level === "debug") {
    logger.debug(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  } else if (level === "info") {
    logger.info(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  } else if (level === "warn") {
    logger.warn(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  } else if (level === "error") {
    logger.error(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  } else if (level === "fatal") {
    logger.fatal(
      "my-app.test-logs",
      `Test message ${crypto.randomUUID()}`,
      context,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
} while (true);
