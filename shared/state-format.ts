/**
 * Stored-format identity. Three counters stay separate: the JSON `schemaVersion` (record
 * shape), SQL `user_version` (storage layout) and `revision` (accepted changes).
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;
/**
 * Present while format 2 is provisional. Increment it with every stored-shape change and
 * recreate disposable fixtures. Remove it, and `schemaDraft`, when the format is frozen.
 */
export const CURRENT_SCHEMA_DRAFT: number | undefined = 1;
export const CURRENT_SQL_VERSION = 2;
export const LEGACY_SQL_VERSION = 1;
