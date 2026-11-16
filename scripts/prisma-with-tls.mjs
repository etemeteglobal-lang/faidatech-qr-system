import { spawnSync } from "node:child_process";

const configuredUrl = process.env.POSTGRES_URL;
if (!configuredUrl) {
  console.error("POSTGRES_URL is not configured; migration command was not run.");
  process.exit(1);
}

let secureUrl;
try {
  const url = new URL(configuredUrl);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("not a PostgreSQL URL");
  }
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  const caCertificatePath = `${process.cwd().replace(/\\/g, "/")}/prisma/supabase-ca.crt`;
  url.searchParams.set("sslcert", caCertificatePath);
  secureUrl = url.toString();
} catch {
  console.error("POSTGRES_URL must be a valid PostgreSQL connection URL; migration command was not run.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] !== "migrate" || !["dev", "deploy", "status"].includes(args[1])) {
  console.error("Usage: node scripts/prisma-with-tls.mjs migrate <dev|deploy|status> [Prisma options]");
  process.exit(2);
}

const schemaArgs = args.some((argument) => argument === "--schema" || argument.startsWith("--schema="))
  ? []
  : ["--schema", "prisma/schema.prisma"];
const prismaCli = `${process.cwd().replace(/\\/g, "/")}/node_modules/prisma/build/index.js`;
const result = spawnSync(process.execPath, [prismaCli, ...args, ...schemaArgs], {
  cwd: process.cwd(),
  env: { ...process.env, POSTGRES_URL: secureUrl },
  stdio: "inherit",
});

if (result.error) {
  console.error("Unable to start the Prisma CLI; migration command was not run.");
  process.exit(1);
}
process.exit(result.status ?? 1);
