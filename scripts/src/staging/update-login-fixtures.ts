import { pool } from "@workspace/db";
import { updateLoginFixtureCredentials } from "./login-fixture-credentials";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const results = await updateLoginFixtureCredentials(client, process.env);
    await client.query("commit");
    process.stdout.write(`${JSON.stringify({ synthetic: true, results })}\n`);
  } catch (error) {
    await client.query("rollback");
    const message = error instanceof Error ? error.message : "unknown_failure";
    process.stderr.write(`${JSON.stringify({ error: message })}\n`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
