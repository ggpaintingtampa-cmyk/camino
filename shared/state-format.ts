/**
 * Stored-format identity. Three counters stay separate: the JSON `schemaVersion` (record
 * shape), SQL `user_version` (storage layout) and `revision` (accepted changes).
 */
export const CURRENT_SCHEMA_VERSION = 2 as const;
/**
 * Schema 2 is frozen for the R1 release after migration/session/plan/outcome checks.
 * Persisted meaning now changes only through a new numbered migration. Old draft
 * fixtures are deliberately rejected and must be recreated; owner data never used them.
 */
export const CURRENT_SCHEMA_DRAFT: number | undefined = undefined;
export const CURRENT_SQL_VERSION = 2;
export const LEGACY_SQL_VERSION = 1;
