import { describe, expect, it } from "vitest";
import { evaluateDatabaseRoleSecurity } from "./database-role-security";

const restricted = {
  rolsuper: false, rolcreatedb: false, rolcreaterole: false,
  rolreplication: false, rolbypassrls: false, rolcanlogin: true,
  privileged_memberships: "0", owned_schemas: "0", owned_tables: "0",
};

describe("database role security", () => {
  it("accepts a restricted login role", () => {
    expect(evaluateDatabaseRoleSecurity(restricted).secure).toBe(true);
  });

  it.each(["rolsuper", "rolcreatedb", "rolcreaterole", "rolreplication", "rolbypassrls"] as const)(
    "rejects %s",
    (privilege) => expect(evaluateDatabaseRoleSecurity({ ...restricted, [privilege]: true }).secure).toBe(false),
  );

  it("rejects non-login, inherited privilege, and ownership", () => {
    expect(evaluateDatabaseRoleSecurity({ ...restricted, rolcanlogin: false }).secure).toBe(false);
    expect(evaluateDatabaseRoleSecurity({ ...restricted, privileged_memberships: "1" }).secure).toBe(false);
    expect(evaluateDatabaseRoleSecurity({ ...restricted, owned_schemas: "1" }).secure).toBe(false);
    expect(evaluateDatabaseRoleSecurity({ ...restricted, owned_tables: "1" }).secure).toBe(false);
  });
});
