import { Pool, type PoolClient } from "pg";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.POOL_IDENTITY_INTEGRATION === "1" ? describe : describe.skip;
const connectionString = process.env.DATABASE_URL;
const single = new Pool({ connectionString, max: 1 });
const concurrent = new Pool({ connectionString, max: 2 });

async function visibleOwners(client: PoolClient, userId?: number, rollback = false) {
  await client.query("begin");
  try {
    if (userId !== undefined)
      await client.query("select set_config('app.user_id',$1,true)", [String(userId)]);
    const result = await client.query<{ owner_user_id: number }>(
      "select owner_user_id from career_data_profiles order by owner_user_id",
    );
    await client.query(rollback ? "rollback" : "commit");
    return result.rows.map((row) => row.owner_user_id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

run("pooled transaction-local identity isolation", () => {
  afterAll(async () => {
    await Promise.all([single.end(), concurrent.end()]);
  });

  it("runs through a non-owner role that cannot bypass RLS", async () => {
    const result = await single.query<{
      rolsuper: boolean; rolbypassrls: boolean;
      owns_profiles: boolean;
    }>(
      `select r.rolsuper,r.rolbypassrls,
        pg_get_userbyid(c.relowner)=current_user as owns_profiles
       from pg_roles r
       cross join pg_class c
       where r.rolname=current_user and c.relname='career_data_profiles'`,
    );
    expect(result.rows[0]).toEqual({
      rolsuper: false, rolbypassrls: false, owns_profiles: false,
    });
  });

  it("does not leak client A identity into client B on the same connection", async () => {
    const client = await single.connect();
    try {
      expect(await visibleOwners(client, 91001)).toEqual([91001]);
      expect(await visibleOwners(client, 91007)).toEqual([91007]);
    } finally {
      client.release();
    }
  });

  it("clears identity after commit and denies a missing identity", async () => {
    const client = await single.connect();
    try {
      expect(await visibleOwners(client, 91001)).toEqual([91001]);
      expect(await visibleOwners(client)).toEqual([]);
    } finally {
      client.release();
    }
  });

  it("clears identity after rollback", async () => {
    const client = await single.connect();
    try {
      expect(await visibleOwners(client, 91001, true)).toEqual([91001]);
      expect(await visibleOwners(client)).toEqual([]);
    } finally {
      client.release();
    }
  });

  it("keeps failed cross-owner authorization transaction-local", async () => {
    const client = await single.connect();
    try {
      expect(await visibleOwners(client, 91002)).toEqual([]);
      expect(await visibleOwners(client, 91001)).toEqual([91001]);
    } finally {
      client.release();
    }
  });

  it("isolates concurrent requests", async () => {
    const [first, second] = await Promise.all([
      concurrent.connect(), concurrent.connect(),
    ]);
    try {
      const [ownersA, ownersB] = await Promise.all([
        visibleOwners(first, 91001), visibleOwners(second, 91007),
      ]);
      expect(ownersA).toEqual([91001]);
      expect(ownersB).toEqual([91007]);
    } finally {
      first.release();
      second.release();
    }
  });

  it("survives repeated pool reuse without leakage", async () => {
    for (let index = 0; index < 20; index += 1) {
      const client = await single.connect();
      try {
        const userId = index % 2 === 0 ? 91001 : 91007;
        expect(await visibleOwners(client, userId)).toEqual([userId]);
      } finally {
        client.release();
      }
    }
  }, 15_000);
});
