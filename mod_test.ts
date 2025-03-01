import { type MethodSpy, spy } from "@std/testing/mock";
import {
  assertEquals,
  assertExists,
  assertGreaterOrEqual,
  assertLessOrEqual,
} from "@std/assert";
import { Logger, type LogObject } from "./mod.ts";

function setupTest(): {
  consoleLogSpy: MethodSpy<Console, any[], void>;
  getNextConsoleMessage: () => string | undefined;
} {
  const consoleLogSpy = spy(console, "log");

  function getNextConsoleMessage(): string | undefined {
    const nextCall = consoleLogSpy.calls.shift();

    if (nextCall === undefined) {
      return undefined;
    }

    if (!nextCall.args?.length) {
      return undefined;
    }

    return nextCall.args[0];
  }

  return { consoleLogSpy, getNextConsoleMessage };
}

function cleanupTest(consoleLogSpy: MethodSpy<Console, string[], void>) {
  consoleLogSpy.restore();
}

Deno.test("default log configuration", async (t) => {
  const { consoleLogSpy, getNextConsoleMessage } = setupTest();
  const logger = new Logger();

  await t.step("should log a trace message", () => {
    logger.trace("test.default", "test trace message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "trace",
      level_n: 0,
      namespace: "test.default",
      message: "test trace message",
      context: {},
    });
  });

  await t.step("should log a debug message", () => {
    logger.debug("test.default", "test debug message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "debug",
      level_n: 1,
      namespace: "test.default",
      message: "test debug message",
      context: {},
    });
  });

  await t.step("should log an info message", () => {
    logger.info("test.default", "test info message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "info",
      level_n: 2,
      namespace: "test.default",
      message: "test info message",
      context: {},
    });
  });

  await t.step("should log a warn message", () => {
    logger.warn("test.default", "test warn message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "warn",
      level_n: 3,
      namespace: "test.default",
      message: "test warn message",
      context: {},
    });
  });

  await t.step("should log an error message", () => {
    logger.error("test.default", "test error message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "error",
      level_n: 4,
      namespace: "test.default",
      message: "test error message",
      context: {},
    });
  });

  await t.step("should log a fatal message", () => {
    logger.fatal("test.default", "test fatal message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "fatal",
      level_n: 5,
      namespace: "test.default",
      message: "test fatal message",
      context: {},
    });
  });

  await t.step("should log a custom namespace", () => {
    logger.trace("test.new.namespace", "test trace message");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "trace",
      level_n: 0,
      namespace: "test.new.namespace",
      message: "test trace message",
      context: {},
    });
  });

  await t.step("should log context data", () => {
    logger.trace("test.default", "test trace message", {
      foo: "bar",
      baz: {
        qux: [1, 2, 3],
      },
    });
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertExists(loggedJSON.timestamp);
    delete loggedJSON.timestamp;

    assertEquals(loggedJSON, {
      level: "trace",
      level_n: 0,
      namespace: "test.default",
      message: "test trace message",
      context: {
        foo: "bar",
        baz: {
          qux: [1, 2, 3],
        },
      },
    });
  });

  cleanupTest(consoleLogSpy);
});

Deno.test("log configuration minimum levels", async (t) => {
  await t.step("minLogLevel trace should include all logs", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "trace" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    for (
      const expectedLevel of [
        "trace",
        "debug",
        "info",
        "warn",
        "error",
        "fatal",
      ]
    ) {
      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.level, expectedLevel);
    }

    cleanupTest(consoleLogSpy);
  });

  await t.step("minLogLevel debug should exclude logs below debug", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "debug" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    for (const expectedLevel of ["debug", "info", "warn", "error", "fatal"]) {
      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.level, expectedLevel);
    }

    cleanupTest(consoleLogSpy);
  });

  await t.step("minLogLevel info should exclude logs below info", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "info" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    for (const expectedLevel of ["info", "warn", "error", "fatal"]) {
      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.level, expectedLevel);
    }

    cleanupTest(consoleLogSpy);
  });

  await t.step("minLogLevel warn should exclude logs below warn", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "warn" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    for (const expectedLevel of ["warn", "error", "fatal"]) {
      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.level, expectedLevel);
    }

    cleanupTest(consoleLogSpy);
  });

  await t.step("minLogLevel error should exclude logs below error", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "error" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    for (const expectedLevel of ["error", "fatal"]) {
      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.level, expectedLevel);
    }

    cleanupTest(consoleLogSpy);
  });

  await t.step("minLogLevel fatal should exclude logs below fatal", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ minLogLevel: "fatal" });

    logger.trace("test.default", "trace message");
    logger.debug("test.default", "debug message");
    logger.info("test.default", "info message");
    logger.warn("test.default", "warn message");
    logger.error("test.default", "error message");
    logger.fatal("test.default", "fatal message");

    const expectedLevel = "fatal";
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.level, expectedLevel);

    cleanupTest(consoleLogSpy);
  });
});

Deno.test("timestamp log configuration", async (t) => {
  await t.step("timestamp should be included and accurate", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const beforeDate = new Date();
    logger.info("test.default", "test info message with timestamp");
    const afterDate = new Date();
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    const loggedTimestamp = new Date(loggedJSON.timestamp);
    assertLessOrEqual(loggedTimestamp.valueOf(), afterDate.valueOf());
    assertGreaterOrEqual(loggedTimestamp.valueOf(), beforeDate.valueOf());

    cleanupTest(consoleLogSpy);
  });

  await t.step("timestamp should be excluded", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({ includeTimestamp: false }); // Assuming Logger accepts an option to exclude timestamps

    logger.info("test.default", "test info message without timestamp");
    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    // Test passes if timestamp is not present.
    assertEquals(loggedJSON, {
      level: "info",
      level_n: 2,
      namespace: "test.default",
      message: "test info message without timestamp",
      context: {},
    });

    cleanupTest(consoleLogSpy);
  });
});

Deno.test("default context value serialization", async (t) => {
  await t.step("default json serialization should support Error", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const e = new Error("test error");

    logger.error("test.default", "test error message", {
      some_error: e,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.some_error.message, e.message);
    assertEquals(loggedJSON.context.some_error.name, "Error");
    assertEquals(loggedJSON.context.some_error.stack, e.stack);

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Int8Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const i8a = new Int8Array(10);
    logger.info("test.default", "test info message", {
      i8a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.i8a, "Int8Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Uint8Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const u8a = new Uint8Array(10);
    logger.info("test.default", "test info message", {
      u8a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.u8a, "Uint8Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step(
    "default json serialization should support Uint8ClampedArray",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const u8ca = new Uint8ClampedArray(10);
      logger.info("test.default", "test info message", {
        u8ca,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.u8ca, "Uint8ClampedArray(10)");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step("default json serialization should support Int16Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const i16a = new Int16Array(10);
    logger.info("test.default", "test info message", {
      i16a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.i16a, "Int16Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Uint16Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const u16a = new Uint16Array(10);
    logger.info("test.default", "test info message", {
      u16a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.u16a, "Uint16Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Int32Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const i32a = new Int32Array(10);
    logger.info("test.default", "test info message", {
      i32a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.i32a, "Int32Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Uint32Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const u32a = new Uint32Array(10);
    logger.info("test.default", "test info message", {
      u32a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.u32a, "Uint32Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Float32Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const f32a = new Float32Array(10);
    logger.info("test.default", "test info message", {
      f32a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.f32a, "Float32Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Float64Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const f64a = new Float64Array(10);
    logger.info("test.default", "test info message", {
      f64a,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.f64a, "Float64Array(10)");

    cleanupTest(consoleLogSpy);
  });

  await t.step(
    "default json serialization should support BigInt64Array",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const bi64a = new BigInt64Array(10);
      logger.info("test.default", "test info message", {
        bi64a,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.bi64a, "BigInt64Array(10)");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step(
    "default json serialization should support BigUint64Array",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const bui64a = new BigUint64Array(10);
      logger.info("test.default", "test info message", {
        bui64a,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.bui64a, "BigUint64Array(10)");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step("default json serialization should support ArrayBuffer", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const ab = new ArrayBuffer(10);
    logger.info("test.default", "test info message", {
      ab,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.ab, "ArrayBuffer");

    cleanupTest(consoleLogSpy);
  });

  await t.step(
    "default json serialization should support SharedArrayBuffer",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const sab = new SharedArrayBuffer(10);
      logger.info("test.default", "test info message", {
        sab,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.sab, "ArrayBuffer");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step("default json serialization should support Date", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const date = new Date("2023-01-01T00:00:00.000Z");
    logger.info("test.default", "test info message", {
      date,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.date, "2023-01-01T00:00:00.000Z");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support RegExp", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const regex = /test/;
    logger.info("test.default", "test info message", {
      regex,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.regex, "/test/");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Map", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const map = new Map([["key", "value"]]);
    logger.info("test.default", "test info message", {
      map,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.map, { key: "value" });

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Set", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const set = new Set(["value"]);
    logger.info("test.default", "test info message", {
      set,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.set, ["value"]);

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support WeakMap", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const weakMap = new WeakMap();
    logger.info("test.default", "test info message", {
      weakMap,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.weakMap, "WeakMap");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support WeakSet", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const weakSet = new WeakSet();
    logger.info("test.default", "test info message", {
      weakSet,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.weakSet, "WeakSet");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Promise", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const promise = Promise.resolve();
    logger.info("test.default", "test info message", {
      promise,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.promise, "Promise");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support DataView", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const dataView = new DataView(new ArrayBuffer(10));
    logger.info("test.default", "test info message", {
      dataView,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.dataView, "DataView");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support BigInt", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const bigInt = BigInt(123);
    logger.info("test.default", "test info message", {
      bigInt,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.bigInt, "123");

    cleanupTest(consoleLogSpy);
  });

  await t.step(
    "default json serialization should support named functions",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const fn = function test(a: number, b: number) {
        return a + b;
      };
      logger.info("test.default", "test info message", {
        func: fn,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.func, "test(a, b)");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step(
    "default json serialization should arrow functions",
    () => {
      const { consoleLogSpy, getNextConsoleMessage } = setupTest();
      const logger = new Logger();

      const fn = (a: number, b: number) => a + b;

      logger.info("test.default", "test info message", {
        func: fn,
      });

      const loggedString = getNextConsoleMessage();
      assertExists(loggedString);
      const loggedJSON = JSON.parse(loggedString);

      assertEquals(loggedJSON.context.func, "fn(a, b)");

      cleanupTest(consoleLogSpy);
    },
  );

  await t.step("default json serialization should support Symbol", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const sym = Symbol("test");
    logger.info("test.default", "test info message", {
      sym,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.sym, "Symbol(test)");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Object", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const obj = { key: "value" };
    logger.info("test.default", "test info message", {
      obj,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.obj, { key: "value" });

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Array", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const arr = ["value"];
    logger.info("test.default", "test info message", {
      arr,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.arr, ["value"]);

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Boolean", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const bool = true;
    logger.info("test.default", "test info message", {
      bool,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.bool, true);

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support String", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const str = "test";
    logger.info("test.default", "test info message", {
      str,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.str, "test");

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support Number", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const num = 123;
    logger.info("test.default", "test info message", {
      num,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.num, 123);

    cleanupTest(consoleLogSpy);
  });

  await t.step("default json serialization should support null", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger();

    const nullValue = null;
    logger.info("test.default", "test info message", {
      nullValue,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.nullValue, null);

    cleanupTest(consoleLogSpy);
  });
});

Deno.test("custom context value serialization", async (t) => {
  await t.step("custom json serialization should properly serialize", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({
      jsonValueSerializer: (key, value) => {
        if (typeof value === "object") {
          return value;
        }

        // An arbitrary serializer that we can test for a few values.
        return `${key}=${value}`;
      },
    });

    logger.info("test.custom", "test info message", {
      foo: "foo",
      bar: 123,
      baz: true,
    });

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON.context.foo, "foo=foo");
    assertEquals(loggedJSON.context.bar, "bar=123");
    assertEquals(loggedJSON.context.baz, "baz=true");

    cleanupTest(consoleLogSpy);
  });
});

Deno.test("custom log formatter", async (t) => {
  await t.step("custom log formatter should properly format", () => {
    const { consoleLogSpy, getNextConsoleMessage } = setupTest();
    const logger = new Logger({
      includeTimestamp: false,
      formatLog: function (
        l: LogObject,
        serializer: (_k: string, v: unknown) => unknown,
      ): string {
        // Contrived override to ensure we're intercepting properly.
        return JSON.stringify({ log: l }, serializer);
      },
    });

    logger.info("test.custom.formatter", "test info message");

    const loggedString = getNextConsoleMessage();
    assertExists(loggedString);
    const loggedJSON = JSON.parse(loggedString);

    assertEquals(loggedJSON, {
      log: {
        level: "info",
        level_n: 2,
        namespace: "test.custom.formatter",
        message: "test info message",
        context: {},
      },
    });

    cleanupTest(consoleLogSpy);
  });
});
