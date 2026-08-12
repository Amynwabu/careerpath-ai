import type { Pool } from "pg";

export type DatabaseRoleSecurity = {
  secure: boolean;
  login: boolean;
  privilegedMemberships: number;
  ownedSchemas: number;
  ownedTables: number;
};

type RoleSecurityRow = {
  rolsuper: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolreplication: boolean;
  rolbypassrls: boolean;
  rolcanlogin: boolean;
  privileged_memberships: string | number;
  owned_schemas: string | number;
  owned_tables: string | number;
};

export function evaluateDatabaseRoleSecurity(row: RoleSecurityRow): DatabaseRoleSecurity {
  const privilegedMemberships = Number(row.privileged_memberships);
  const ownedSchemas = Number(row.owned_schemas);
  const ownedTables = Number(row.owned_tables);
  return {
    secure: row.rolcanlogin &&
      !row.rolsuper && !row.rolcreatedb && !row.rolcreaterole &&
      !row.rolreplication && !row.rolbypassrls &&
      privilegedMemberships === 0 && ownedSchemas === 0 && ownedTables === 0,
    login: row.rolcanlogin,
    privilegedMemberships,
    ownedSchemas,
    ownedTables,
  };
}

export async function inspectDatabaseRoleSecurity(pool: Pool): Promise<DatabaseRoleSecurity> {
  const result = await pool.query<RoleSecurityRow>(`
    select current_role_data.*,
      (select count(*) from pg_roles inherited
       where inherited.oid <> current_role_data.oid
         and pg_has_role(current_user, inherited.oid, 'member')
         and (inherited.rolsuper or inherited.rolcreatedb or inherited.rolcreaterole
           or inherited.rolreplication or inherited.rolbypassrls)) as privileged_memberships,
      (select count(*) from pg_namespace where nspowner=current_role_data.oid) as owned_schemas,
      (select count(*) from pg_class where relowner=current_role_data.oid
        and relkind in ('r','p','v','m','S','f')) as owned_tables
    from pg_roles current_role_data where current_role_data.rolname=current_user
  `);
  const row = result.rows[0];
  if (!row) throw new Error("Database role security inspection failed.");
  return evaluateDatabaseRoleSecurity(row);
}
