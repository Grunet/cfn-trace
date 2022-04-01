import { invoke } from "./index.ts";

import { assertEquals } from "https://deno.land/std@0.132.0/testing/asserts.ts";

Deno.test("Passing --version logs the version to the console", () => {
  //ARRANGE
  const parsedCliArgs = {
    version: true,
  };

  const mockLogger = (function () {
    const interceptedLogs: {
      info: string[];
    } = {
      info: [],
    };

    return {
      getInterceptedLogs() {
        return interceptedLogs;
      },
      info: (message: string): void => {
        interceptedLogs.info.push(message);
      },
    };
  })();

  const mockVersionData = {
    version: "theVersion",
  };

  //ACT
  invoke({
    cliArgs: parsedCliArgs,
    logger: mockLogger,
    versionData: mockVersionData,
  });

  //ASSERT
  assertEquals(mockLogger.getInterceptedLogs()["info"][0], "theVersion");
});
