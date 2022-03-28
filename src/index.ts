import { parse } from "https://deno.land/std@0.132.0/flags/mod.ts";

const cliArgs = parse(Deno.args);

if (cliArgs["version"] === true) {
    console.log("Version is 0.0.0");
}