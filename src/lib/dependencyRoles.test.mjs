import { test } from "node:test";
import assert from "node:assert/strict";

const { groupDependencies } = await import("./dependencyRoles.ts");

// Imports from a real analysis of fastapi/full-stack-fastapi-template.
const IMPORTS = ("os logging alembic sqlalchemy app sqlmodel fastapi uuid typing datetime pydantic warnings " +
  "pydantic_settings jwt pwdlib pathlib sentry_sdk starlette dataclasses emails jinja2 tests unittest collections " +
  "pytest random string re sys typer").split(" ");

const analysis = (dependencies = []) => ({
  repository: { dependencies },
  graph: {
    nodes: [
      { id: "m1", type: "module", label: "main", path: "backend/app/main.py", meta: {} },
      { id: "m2", type: "module", label: "test_users", path: "backend/tests/api/test_users.py", meta: {} },
      ...IMPORTS.map((label) => ({ id: `ext:${label}`, type: "external_dep", label, meta: {} })),
    ],
  },
});

const roles = (result) => Object.fromEntries(result.groups.map((g) => [g.role, g.deps.map((d) => d.name)]));

test("groups third-party libraries by role", () => {
  assert.deepEqual(roles(groupDependencies(analysis())), {
    "Web & API": ["fastapi", "starlette"],
    "Database & ORM": ["alembic", "sqlalchemy", "sqlmodel"],
    "Auth & security": ["jwt", "pwdlib"],
    "Observability": ["sentry_sdk"],
    "Config & validation": ["pydantic", "pydantic_settings"],
    "Email & templates": ["emails", "jinja2"],
    "Testing & tooling": ["pytest", "typer"],
  });
});

test("hides standard-library and in-repo imports, counting each once", () => {
  const result = groupDependencies(analysis([{ name: "os", version: null, ecosystem: "pypi", source: "x" }]));
  const shown = result.groups.flatMap((g) => g.deps.map((d) => d.name));
  for (const name of ["os", "typing", "uuid", "app", "tests"]) assert.ok(!shown.includes(name), name);
  assert.equal(result.hidden, IMPORTS.length - shown.length);
});

test("merges manifest entries with imports and keeps their version", () => {
  const result = groupDependencies(analysis([
    { name: "FastAPI", version: "0.115.0", ecosystem: "pypi", source: "pyproject.toml" },
    { name: "pydantic-settings", version: "2.5", ecosystem: "pypi", source: "pyproject.toml" },
    { name: "left-pad", version: "1.3.0", ecosystem: "npm", source: "package.json" },
  ]));
  const web = result.groups.find((g) => g.role === "Web & API").deps;
  assert.deepEqual(web.find((d) => d.name === "FastAPI"), { name: "FastAPI", version: "0.115.0", source: "pyproject.toml" });
  assert.equal(web.filter((d) => d.name.toLowerCase() === "fastapi").length, 1);
  const config = result.groups.find((g) => g.role === "Config & validation").deps.map((d) => d.name);
  assert.deepEqual(config, ["pydantic", "pydantic-settings"]);
  assert.deepEqual(result.groups.at(-1), { role: "Other", deps: [{ name: "left-pad", version: "1.3.0", source: "package.json" }] });
});

test("scoped npm packages match on their scope", () => {
  const result = groupDependencies({
    repository: { dependencies: [
      { name: "@nestjs/core", version: "10", ecosystem: "npm", source: "package.json" },
      { name: "@radix-ui/react-dialog", version: "1", ecosystem: "npm", source: "package.json" },
      { name: "node:fs", version: null, ecosystem: "npm", source: "import" },
    ] },
    graph: null,
  });
  assert.deepEqual(roles(result), { "Web & API": ["@nestjs/core"], "Frontend": ["@radix-ui/react-dialog"] });
  assert.equal(result.hidden, 1);
});
