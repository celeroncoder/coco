import { CocoApi } from "./api.ts";
import {
  defaultDeviceName,
  detectPlatform,
  resolveServerUrl,
  writeConfig,
} from "./config.ts";

export async function pair(opts: { serverUrl?: string; deviceName?: string }) {
  const serverUrl = resolveServerUrl(opts.serverUrl);
  const deviceName = opts.deviceName ?? defaultDeviceName();
  const api = new CocoApi(serverUrl);

  const { code, expiresAt } = await api.pairCreate({
    deviceName,
    platform: detectPlatform(),
  });

  console.log("");
  console.log("  Pairing code: \x1b[1m" + code + "\x1b[0m");
  console.log(
    `  Expires:      ${new Date(expiresAt).toLocaleTimeString()} (10 min)`,
  );
  console.log(`  Open ${serverUrl} and enter this code to pair this device.`);
  console.log("");
  process.stdout.write("  Waiting for pairing... ");

  while (Date.now() < expiresAt) {
    const res = await api.pairPoll(code);
    if (res.status === "claimed") {
      await writeConfig({
        serverUrl,
        deviceId: res.deviceId,
        deviceToken: res.deviceToken,
      });
      console.log("done.");
      console.log(`  Paired as device ${res.deviceId}.`);
      console.log(
        "  Run \x1b[1mcoco-agent start\x1b[0m to begin handling prompts.",
      );
      return;
    }
    if (res.status === "expired" || res.status === "not_found") {
      throw new Error("Pairing code expired");
    }
  }
  throw new Error("Pairing code expired");
}
