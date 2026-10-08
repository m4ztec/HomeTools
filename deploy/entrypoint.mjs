import { spawn } from "node:child_process";

const processes = [
  ["API", "dotnet", ["HomeTools.API.dll"]],
  ["frontend", "node", [".output/server/index.mjs"]],
].map(([name, command, args]) => {
  const child = spawn(command, args, { stdio: "inherit" });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}:`, error);
    stop("SIGTERM", 1);
  });

  child.on("exit", (code, signal) => {
    if (stopping) return;

    console.error(
      `${name} exited unexpectedly (${signal ? `signal ${signal}` : `code ${code}`}).`,
    );
    stop("SIGTERM", code && code !== 0 ? code : 1);
  });

  return child;
});

let stopping = false;

function stop(signal, exitCode) {
  if (stopping) return;

  stopping = true;
  process.exitCode = exitCode;

  for (const child of processes) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => stop("SIGINT", 0));
process.on("SIGTERM", () => stop("SIGTERM", 0));
