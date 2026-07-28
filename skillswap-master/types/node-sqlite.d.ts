// Minimal ambient types for Node's built-in `node:sqlite` module.
// (@types/node ^20 predates it, so we declare the subset we use.)
declare module "node:sqlite" {
  export interface StatementSync {
    run(
      ...params: unknown[]
    ): { changes: number; lastInsertRowid: number | bigint };
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
  }

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
