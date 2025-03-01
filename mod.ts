/**
 * Available log levels, in ascending order from least to most severe.
 */
export const LOG_LEVELS: string[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
];

/**
 * The available log levels.
 */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Configuration for a Logger instance.
 */
export interface LoggerConfiguration {
  /**
   * The minimum log level to require before printing to stdout.  If none is
   * provided, it will default to "trace" - the lowest level.  For production
   * systems, a good value is either "info" or "warn", depending on how you
   * are otherwise instrumenting your applications.
   *
   * For suggestions on how to use the log levels, see the README.
   */
  minLogLevel?: LogLevel;
  /**
   * Whether or not to include a timestamp.  Defaults to true, and will provide
   * a ISO 8601 format timestamp. If teams wish to use their own
   * custom timestamp format, they should set this value to false and append
   * their own value by overriding formatLog.  This option is provided as
   * some log parsers add their own timestamp.
   */
  includeTimestamp?: boolean;
  /**
   * If desired, provide your own custom log formatter.  By default, this will
   * use {@link Logger.defaultFormatLog} - which will take the log object
   * and call JSON.stringify with it, passing the defined jsonValueSerializer
   * as the replacer.
   */
  formatLog?: (
    l: LogObject,
    jsonValueSerializer: (_k: string, v: unknown) => unknown,
  ) => string;
  /**
   * The replacer that is passed to JSON.stringify.  This is passed as a
   * reference to formatLog so that applications may choose to ignore it if
   * they wish.
   *
   * If not provided, defaults to {@link Logger.defaultJsonValueSerializer}
   */
  jsonValueSerializer?: (_k: string, v: unknown) => unknown;
}

/**
 * This is the minimum guaranteed payload to stringify when outputing a log.
 */
export interface LogObject {
  level: LogLevel;
  level_n: number;
  timestamp?: string;
  namespace: string;
  message: string;
  context: Record<string, unknown>;
}

/**
 * Determine if a given value has a toString() method.
 */
function hastoString(value: unknown): value is { toString(): string } {
  if ((value as { toString(): string }).toString) {
    return true;
  }
  return false;
}

/**
 * Get a string representation of a function that can be used in log context.
 */
// deno-lint-ignore ban-types
function stringifyFunction(value: Function): string {
  const fnString = value.toString();

  // For named functions, return the name and simplified signature
  if (value.name) {
    return `${value.name}(${fnString.toString().split("(")[1].split(")")[0]})`;
  }

  // For anonymous functions, return a simplified signature
  // This regex extracts just the parameter portion
  const paramMatch = fnString.match(/function\s*\(([^)]*)\)/);
  if (paramMatch) {
    return `function(${paramMatch[1]})`;
  }

  // For arrow functions
  const arrowMatch = fnString.match(/\(([^)]*)\)\s*=>/);
  if (arrowMatch) {
    return `(${arrowMatch[1]}) =>`;
  }

  // Worse case scenario - return shortened function string
  return fnString.length > 50 ? fnString.substring(0, 47) + "..." : fnString;
}

/**
 * A simple Log utility class. Meant to be initialized and used as a singleton.
 */
export class Logger {
  #supportedLogLevels: LogLevel[];
  #includeTimestamp: boolean;
  #formatLog: (
    l: LogObject,
    jsonValueSerializer: (_k: string, v: unknown) => unknown,
  ) => string;
  #jsonValueSerializer: (_k: string, v: unknown) => unknown;

  constructor(configuration: LoggerConfiguration = {}) {
    this.#supportedLogLevels = LOG_LEVELS.filter((_, i: number) => {
      // If the minLogLevel is not a valid log level, we will include all levels
      // as -1 is less than all valid log level indices.
      return i >= LOG_LEVELS.indexOf(configuration.minLogLevel ?? "trace");
    });
    this.#includeTimestamp = configuration.includeTimestamp ?? true;
    this.#formatLog = configuration.formatLog ?? Logger.defaultFormatLog;
    this.#jsonValueSerializer = configuration.jsonValueSerializer ??
      Logger.defaultJsonValueSerializer;
  }

  /**
   * Method passed to JSON.stringify to serialize data.  For Errors, they
   * will be converted into an object with a message, name, and stack.
   * Otherwise, it will stringify anything that cannot be handled natively by
   * JSON.stringify.
   *
   * This method's guarantees are that it makes a "best effort" towards
   * getting data into JSON loggable format.  To that end, there may
   * be changes to this method that changes how data shows up in logs as
   * feature releases.
   *
   * This method can be overridden in LoggerConfiguration.
   */
  static defaultJsonValueSerializer(_k: string, v: unknown): unknown {
    if (v instanceof Error) {
      return {
        message: v.message,
        name: v.name,
        stack: v.stack,
      };
    }

    if (v instanceof Int8Array) {
      return `Int8Array(${v.length})`;
    }
    if (v instanceof Uint8Array) {
      return `Uint8Array(${v.length})`;
    }
    if (v instanceof Uint8ClampedArray) {
      return `Uint8ClampedArray(${v.length})`;
    }
    if (v instanceof Int16Array) {
      return `Int16Array(${v.length})`;
    }
    if (v instanceof Uint16Array) {
      return `Uint16Array(${v.length})`;
    }
    if (v instanceof Int32Array) {
      return `Int32Array(${v.length})`;
    }
    if (v instanceof Uint32Array) {
      return `Uint32Array(${v.length})`;
    }
    if (v instanceof Float32Array) {
      return `Float32Array(${v.length})`;
    }
    if (v instanceof Float64Array) {
      return `Float64Array(${v.length})`;
    }
    if (v instanceof BigInt64Array) {
      return `BigInt64Array(${v.length})`;
    }
    if (v instanceof BigUint64Array) {
      return `BigUint64Array(${v.length})`;
    }

    if (
      v instanceof ArrayBuffer ||
      v instanceof SharedArrayBuffer
    ) {
      return `ArrayBuffer`;
    }

    if (v instanceof Date) {
      return v.toISOString();
    }

    // Types that we can just stringify.
    if (v instanceof RegExp) {
      return v.toString();
    }

    if (v instanceof Map) {
      return Object.fromEntries(v);
    }

    if (v instanceof Set) {
      return [...v];
    }

    if (v instanceof WeakMap) {
      return `WeakMap`;
    }

    if (v instanceof WeakSet) {
      return `WeakSet`;
    }

    if (v instanceof Promise) {
      return `Promise`;
    }

    if (v instanceof DataView) {
      return `DataView`;
    }

    if (typeof v === "function") {
      return stringifyFunction(v);
    }

    if (
      ["bigint", "symbol"].includes(typeof v)
    ) {
      if (hastoString(v)) {
        return v.toString();
      }

      // This case basically can't happen
      return `${typeof v}(cannot stringify)`;
    }

    return v;
  }

  /**
   * Format a log for output.  Formats a given LogObject into JSON using the
   * configured jsonValueSerializer.
   */
  static defaultFormatLog(
    l: LogObject,
    jsonValueSerializer: (_k: string, v: unknown) => unknown,
  ): string {
    return JSON.stringify(l, jsonValueSerializer);
  }

  /**
   * Ship a single log item if the given level is configured to be included.
   */
  #handleLog(
    level: LogLevel,
    namespace: string,
    message: string,
    context: Record<string, unknown> = {},
  ): void {
    if (this.#supportedLogLevels.includes(level)) {
      const logObject: LogObject = {
        level,
        level_n: LOG_LEVELS.indexOf(level),
        namespace,
        message,
        context,
      };
      if (this.#includeTimestamp) {
        logObject.timestamp = (new Date()).toISOString();
      }
      console.log(this.#formatLog(logObject, this.#jsonValueSerializer));
    }
  }

  /**
   * Print a log message with the trace level.  Will only print if the minimum
   * configured log level is trace or higher.
   */
  trace(namespace: string, message: string, context = {}): void {
    this.#handleLog("trace", namespace, message, context);
  }

  /**
   * Print a log message with the debug level.  Will only print if the minimum
   * configured log level is debug or higher.
   */
  debug(namespace: string, message: string, context = {}): void {
    this.#handleLog("debug", namespace, message, context);
  }

  /**
   * Print a log message with the debug level.  Will only print if the minimum
   * configured log level is info or higher.
   */
  info(namespace: string, message: string, context = {}): void {
    this.#handleLog("info", namespace, message, context);
  }

  /**
   * Print a log message with the debug level.  Will only print if the minimum
   * configured log level is warn or higher.
   */
  warn(namespace: string, message: string, context = {}): void {
    this.#handleLog("warn", namespace, message, context);
  }

  /**
   * Print a log message with the debug level.  Will only print if the minimum
   * configured log level is error or higher.
   */
  error(namespace: string, message: string, context = {}): void {
    this.#handleLog("error", namespace, message, context);
  }

  /**
   * Print a log message with the debug level.  Will only print if the minimum
   * configured log level is fatal or higher.
   */
  fatal(namespace: string, message: string, context = {}): void {
    this.#handleLog("fatal", namespace, message, context);
  }
}
