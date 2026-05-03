#!/usr/bin/env -S bun run
import { Command } from "commander";
import { doctor } from "./doctor.ts";
import { pair } from "./pair.ts";
import { start } from "./start.ts";

const program = new Command();
program
  .name("coco-agent")
  .description("Local agent daemon — pair with the coco web app and run prompts.")
  .version("0.0.0");

program
  .command("pair")
  .description("Pair this device with your coco account.")
  .option("--server <url>", "coco web server URL (defaults to COCO_SERVER env)")
  .option("--name <name>", "Device name to display in the web app")
  .action(async (opts) => {
    await pair({ serverUrl: opts.server, deviceName: opts.name });
  });

program
  .command("doctor")
  .description(
    "Diagnose pairing/queue: show this device, its workspaces, and queued runs.",
  )
  .action(async () => {
    await doctor();
  });

program
  .command("start", { isDefault: true })
  .description("Start the daemon: handle prompt runs from the web app.")
  .action(async () => {
    await start();
  });

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
