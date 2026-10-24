# Rule: Professional Engineering & Git Workflow Standards

## 1. Git Responsibility & Scope
- **Read-Only Git Access for Agent**:
  - The agent must NEVER execute `git push`, create branches (`git branch`, `git checkout -b`), or merge branches (`git merge`).
  - Branch lifecycle management, staging, committing, pushing to remote repositories, and merging branches are strictly the **User's** responsibility.
  - The agent may ONLY run read-only inspection commands (e.g., `git status`, `git log`, `git diff`, `git branch`).

## 2. Professional Code Standards & Zero Emoji Policy
- **Zero Emojis in Code, Logs, and Scripts**:
  - Never use emojis anywhere in codebase files, including log statements (`logger.info`, `console.log`), comments, error messages, seed scripts, or test outputs.
  - No rocket ships (`🚀`), pointers (`👉`), checkmarks (`✅`), crosses (`❌`), alerts (`🚨`), seeds (`🌱`), or decorative unicode icons.
- **Enterprise-Grade Logging & Formatting**:
  - Log statements must be professional, concise, structured, and informative.
  - Standard format: `[LEVEL] [TIMESTAMP] [Module/Service] Message...`
  - Examples:
    - Correct: `[INFO] [Server] HTTP server listening on port 3000 [development]`
    - Correct: `[INFO] [HealthCheck] Endpoint active at /health`
    - Incorrect: `🚀 Server running on port 3000`
- **Professional Engineering Demeanor**:
  - Maintain rigorous, senior-level software engineering conventions, clean architectures, and disciplined code aesthetics at all times.

## 3. Strict Type Safety & No Magic Strings Policy (Enums & Constants)
- **Elimination of Raw String Literals**:
  - Never use loose strings or magic string literals for domain concepts, user roles, permission checks, HTTP header names, status codes, resource categories, or simulated credentials.
  - Repeating raw strings across controllers, services, middleware, seeds, or tests is strictly prohibited.
- **Mandatory TypeScript Enums**:
  - Define and centralize platform enums in `src/common/enums.ts` (e.g., `UserRole`, `HttpHeader`, `DisasterStatus`, `ResourceType`, `ResourceStatus`, `CacheStatus`, `RealtimeEvent`, `SeedApiKey`, `MockAuthToken`).
  - All layers—controllers, middlewares, routes, services, schemas, and tests—must import and reference these enums directly.
- **Strongly-Typed Lookups & Type Guards**:
  - Never perform ad-hoc array inclusion checks against string arrays (e.g., `['ADMIN', 'CONTRIBUTOR'].includes(role)` is prohibited).
  - Use strongly typed enums (`[UserRole.ADMIN, UserRole.CONTRIBUTOR].includes(user.role)`), enum-backed type guards (`isValidUserRole()`, `toUserRole()`), or immutable `ReadonlyMap` / typed dictionary lookups.
- **Schema Validation Integration**:
  - When validating domain inputs with validation libraries (such as Zod), bind directly to enums via `z.nativeEnum(MyEnum)` or type-safe schema transforms instead of loose string arrays (`z.enum(['admin', 'contributor'])`).
- **HTTP Header Access**:
  - Use standard header accessor methods (e.g. `req.header(HttpHeader.X_USER_ROLE)`) using `HttpHeader` enum values rather than manual case-sensitivity handling or raw header string index access.

