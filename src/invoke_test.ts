import { invoke } from "./invoke.ts";

import { assertEquals } from "https://deno.land/std@0.132.0/testing/asserts.ts";

Deno.test("Passing --version logs the version to the console", async () => {
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
  await invoke({
    cliArgs: parsedCliArgs,
    versionData: mockVersionData,
    cloudformationClientAdapter: {
      getEventsFromMostRecentDeploy() {
        return Promise.resolve({ stackEvents: [] });
      },
    },
    logger: mockLogger,
  });

  //ASSERT
  assertEquals(mockLogger.getInterceptedLogs()["info"][0], "theVersion");
});
