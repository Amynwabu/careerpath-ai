import { pool } from "@workspace/db";
import { describe, expect, it } from "vitest";
import { withActorClient } from "./database-actor-context";

const run = process.env.POOL_IDENTITY_INTEGRATION === "1" ? describe : describe.skip;

run("shared transaction-local database actor context", () => {
  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid actor identity %s",
    async (actorUserId) => {
      await expect(withActorClient(actorUserId, async () => undefined))
        .rejects.toMatchObject({ code: "invalid_actor_context" });
    },
  );

  it("keeps actor identity available for every statement in its transaction", async () => {
    await withActorClient(91001, async (client) => {
      for (let index = 0; index < 3; index += 1) {
        const result = await client.query("select career_data_actor_user_id() actor");
        expect(result.rows[0]?.actor).toBe(91001);
      }
    });
  });

  it("clears actor identity after commit and rollback", async () => {
    await withActorClient(91001, async () => undefined);
    await expect(withActorClient(91003, async () => { throw new Error("fixture_rollback"); }))
      .rejects.toThrow("fixture_rollback");
    const result = await pool.query("select career_data_actor_user_id() actor");
    expect(result.rows[0]?.actor).toBeNull();
  });

  it("does not leak advisor and client context across pooled operations", async () => {
    const advisor = await withActorClient(91003, (client) => client.query(
      "select advisor_user_id from career_data_advisor_profiles order by advisor_user_id",
    ));
    expect(advisor.rows.map((row) => row.advisor_user_id)).toEqual([91003]);
    const client = await withActorClient(91001, (connection) => connection.query(
      "select advisor_user_id from career_data_advisor_profiles order by advisor_user_id",
    ));
    expect(client.rows).toEqual([]);
  });
});
