import { db, pool } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

export type ActorTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function validateActorUserId(actorUserId: number): number {
  if (!Number.isSafeInteger(actorUserId) || actorUserId <= 0)
    throw Object.assign(new Error("invalid_actor_context"), { code: "invalid_actor_context" });
  return actorUserId;
}

export async function withActorTransaction<T>(
  actorUserId: number,
  operation: (tx: ActorTransaction) => Promise<T>,
): Promise<T> {
  const actor = validateActorUserId(actorUserId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${String(actor)}, true)`);
    return operation(tx);
  });
}

export async function withActorClient<T>(
  actorUserId: number,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const actor = validateActorUserId(actorUserId);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id',$1,true)", [String(actor)]);
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export function actorQuery<T extends QueryResultRow = QueryResultRow>(
  actorUserId: number,
  query: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return withActorClient(actorUserId, (client) => client.query<T>(query, values));
}
