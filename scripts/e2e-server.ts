import net from "node:net";

const processes: Bun.Subprocess[] = [];

function spawn(command: string[], cwd: string, env: Record<string, string> = {}): void {
  const child = Bun.spawn(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });
  processes.push(child);
}

function canOpenPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(1_000);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await canOpenPort(port)) return;
    await Bun.sleep(1_000);
  }
  throw new Error(`El puerto ${port} no estuvo disponible antes del timeout.`);
}

async function ensureLocalMongo(): Promise<void> {
  if (await canOpenPort(27017)) return;

  const configuredMongoUri = process.env.E2E_MONGO_URI;
  const usesRemoteMongo = configuredMongoUri && !configuredMongoUri.includes("localhost") && !configuredMongoUri.includes("127.0.0.1");
  if (usesRemoteMongo) return;

  const dockerInfo = Bun.spawnSync(["docker", "info"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (dockerInfo.exitCode !== 0) {
    throw new Error("MongoDB no esta activo en 27017 y Docker no esta disponible para levantar mongo:7.");
  }

  const containerName = `tembleques-e2e-mongo-${Date.now()}`;
  spawn(["docker", "run", "--rm", "--name", containerName, "-p", "27017:27017", "mongo:7"], ".");
  await waitForPort(27017, 60_000);
}

function shutdown(): void {
  for (const child of processes) {
    child.kill();
  }
}

async function main(): Promise<void> {
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);

  await ensureLocalMongo();

  const fallbackMongoUri = `mongodb://localhost:27017/tembleques_camila_e2e_${Date.now()}`;
  const mongoUri = process.env.E2E_MONGO_URI ?? fallbackMongoUri;
  const seedProfile = process.env.E2E_SEED_PROFILE ?? "ci";
  const seedMode = process.env.E2E_SEED_MODE ?? "reset";

  spawn(["bun", "run", "dev"], "backend", {
    APP_ENV: "ci",
    AUTH_MOCKS_ENABLED: "true",
    MONGO_URI: mongoUri,
    SEED_ENABLED: "true",
    SEED_PROFILE: seedProfile,
    SEED_MODE: seedMode,
    STRIPE_SECRET_KEY: process.env.E2E_STRIPE_SECRET_KEY ?? "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET: process.env.E2E_STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder",
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_placeholder",
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET ?? "whsec_placeholder",
    PORT: "3000",
  });

  spawn(["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"], "frontend", {
    VITE_API_URL: process.env.VITE_API_URL ?? "http://localhost:3000",
    VITE_PROXY_TARGET: process.env.VITE_PROXY_TARGET ?? "http://localhost:3000",
    VITE_CLERK_PUBLISHABLE_KEY: process.env.VITE_CLERK_PUBLISHABLE_KEY ?? "pk_test_your_clerk_publishable_key",
  });

  await new Promise(() => undefined);
}

void main();
