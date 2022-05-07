import { invoke } from "./invoke.ts";

import { assertEquals } from "https://deno.land/std@0.132.0/testing/asserts.ts";

Deno.test("Passing --version logs the version to the console", async () => {
  //ARRANGE
  const parsedCliArgs = {
    version: true,
  };

  const mockConsoleWriter = (function () {
    const interceptedOutput: {
      messages: string[];
    } = {
      messages: [],
    };

    return {
      getInterceptedOutput() {
        return interceptedOutput;
      },
      write: (message: string): void => {
        interceptedOutput.messages.push(message);
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
    cloudformationClientAdapterFactory: () => ({
      getEventsFromMostRecentDeploy() {
        return Promise.resolve({ stackEvents: [] });
      },
    }),
    transformStackEventDataIntoTracingData: () => {
      return Promise.resolve({
        spanDataByConstructedId: new Map(),
        rootConstructedId: "",
      });
    },
    telemetrySenderFactory: () => ({
      sendTracingData() {
        return Promise.resolve();
      },
    }),
    consoleWriter: mockConsoleWriter,
  });

  //ASSERT
  assertEquals(
    mockConsoleWriter.getInterceptedOutput().messages[0],
    "theVersion",
  );
});
