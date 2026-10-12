export * from "./types";
export * from "./access";

/**
 * Task 40E.7 — the progress repository is an INTERNAL implementation detail.
 *
 * Only the factory is part of the public progress API, and only
 * `lib/student/readProgress.ts` consumes it (the read boundary). The concrete
 * repositories, their interfaces and their cursor/source types are deliberately
 * NOT re-exported here:
 *
 *  - `progressFactsSupabaseRepository` / `progressFactsLocalRepository` — the
 *    two implementations; choosing between them is `access.ts`'s job (identity)
 *    and `readProgress.ts`'s job (reads), not an application's.
 *  - `localProgressRepository` / `createEmptyStudentProgress` — reset + demo
 *    internals, reachable only from `access.ts` via a direct `./repository`
 *    import.
 *  - `ProgressFactsRepository`, `ProgressRepository`, `ActivityCursor`,
 *    `ProgressRepositorySource` — repository contracts. The factory's return
 *    type is inferred at every call site, so no consumer needs to name them.
 *
 * This prevents application/UI code from coupling to a local store it must
 * never reach, while direct `./repository` imports inside `lib/progress` and
 * `scripts/` remain valid and unchanged.
 */
export { createProgressFactsRepository } from "./repository";