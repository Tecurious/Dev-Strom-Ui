import type { Analysis } from "../api/types";

export type DependencyRole =
  | "Web & API"
  | "Frontend"
  | "Database & ORM"
  | "Auth & security"
  | "Messaging & jobs"
  | "AI & LLM"
  | "Observability"
  | "Config & validation"
  | "HTTP clients"
  | "Email & templates"
  | "Testing & tooling"
  | "Other";

export type GroupedDependency = { name: string; version: string | null; source: string };
export type DependencyGroups = { groups: { role: DependencyRole; deps: GroupedDependency[] }[]; hidden: number };

const ROLE_ORDER: DependencyRole[] = [
  "Web & API", "Frontend", "Database & ORM", "Auth & security", "Messaging & jobs", "AI & LLM",
  "Observability", "Config & validation", "HTTP clients", "Email & templates", "Testing & tooling", "Other",
];

// Normalized package/import name → role. Names normalize to lower case with
// "-" and "." as "_", and scoped npm packages match on their scope too.
const ROLES: Record<DependencyRole, string[]> = {
  "Web & API": ["fastapi", "starlette", "flask", "django", "djangorestframework", "uvicorn", "gunicorn", "express",
    "koa", "hono", "@nestjs", "fastify", "aiohttp_server", "tornado", "sanic", "litestar", "graphql", "strawberry"],
  "Frontend": ["react", "react_dom", "next", "vue", "nuxt", "svelte", "@sveltejs", "angular", "@angular", "vite",
    "tailwindcss", "@tanstack", "react_router", "react_router_dom", "@chakra_ui", "@mui", "@radix_ui", "solid_js"],
  "Database & ORM": ["sqlalchemy", "sqlmodel", "alembic", "psycopg", "psycopg2", "asyncpg", "pymongo", "motor",
    "redis", "prisma", "@prisma", "drizzle_orm", "mongoose", "pg", "mysql2", "sqlite3", "supabase", "@supabase",
    "typeorm", "sequelize", "knex", "peewee", "tortoise", "neo4j", "pgvector", "elasticsearch"],
  "Auth & security": ["jwt", "pyjwt", "jose", "python_jose", "passlib", "pwdlib", "bcrypt", "authlib", "oauthlib",
    "jsonwebtoken", "next_auth", "@clerk", "@auth0", "cryptography", "itsdangerous", "argon2"],
  "Messaging & jobs": ["celery", "rq", "kafka", "kafka_python", "confluent_kafka", "aiokafka", "pika", "bullmq",
    "amqplib", "dramatiq", "apscheduler", "kombu", "nats", "arq"],
  "AI & LLM": ["openai", "anthropic", "langchain", "langchain_core", "langchain_openai", "langgraph", "llama_index",
    "transformers", "torch", "tensorflow", "tiktoken", "ai", "@ai_sdk", "sentence_transformers", "litellm", "tavily"],
  "Observability": ["sentry_sdk", "@sentry", "opentelemetry", "@opentelemetry", "prometheus_client", "structlog",
    "loguru", "datadog", "ddtrace", "newrelic", "pino", "winston", "langsmith"],
  "Config & validation": ["pydantic", "pydantic_settings", "zod", "python_dotenv", "dotenv", "marshmallow", "yup",
    "joi", "attrs", "dynaconf"],
  "HTTP clients": ["httpx", "requests", "aiohttp", "axios", "ky", "urllib3", "node_fetch"],
  "Email & templates": ["emails", "jinja2", "nodemailer", "sendgrid", "@sendgrid", "mjml", "resend"],
  "Testing & tooling": ["pytest", "pytest_asyncio", "hypothesis", "coverage", "mypy", "ruff", "black", "typer",
    "click", "vitest", "jest", "playwright", "@playwright", "eslint", "prettier", "typescript", "oxlint"],
  "Other": [],
};
const ROLE_OF = new Map(Object.entries(ROLES).flatMap(([role, names]) => names.map((n) => [n, role as DependencyRole])));

// Imports that are part of the language, not dependencies of the project.
const STANDARD_LIBRARY = new Set([
  "abc", "argparse", "ast", "asyncio", "base64", "bisect", "collections", "contextlib", "copy", "csv", "dataclasses",
  "datetime", "decimal", "email", "enum", "functools", "getpass", "glob", "hashlib", "heapq", "hmac", "html", "http",
  "importlib", "inspect", "io", "itertools", "json", "logging", "math", "multiprocessing", "operator", "os",
  "pathlib", "pickle", "platform", "queue", "random", "re", "secrets", "shutil", "signal", "socket", "statistics",
  "string", "subprocess", "sys", "tempfile", "textwrap", "threading", "time", "traceback", "types", "typing",
  "unittest", "urllib", "uuid", "warnings", "weakref", "xml", "zoneinfo",
  "assert", "buffer", "child_process", "crypto", "events", "fs", "https", "net", "path", "process", "stream", "url",
  "util", "worker_threads", "zlib",
]);

const normalize = (name: string) => {
  const n = name.toLowerCase().replace(/^node:/, "").replace(/[-.]/g, "_");
  return n.startsWith("@") ? n : n.split("/")[0];
};
const roleOf = (key: string): DependencyRole =>
  ROLE_OF.get(key) ?? ROLE_OF.get(key.split("/")[0]) ?? "Other";

/**
 * The analysis' dependencies grouped by what they do. Merges manifest
 * dependencies (with versions) and libraries seen in imports; drops
 * standard-library and in-repo imports, counting them in `hidden`.
 */
export function groupDependencies(analysis: Analysis): DependencyGroups {
  const nodes = analysis.graph?.nodes ?? [];
  const local = new Set(
    nodes.flatMap((n) => [
      ...(n.path?.split("/").slice(0, -1) ?? []),
      ...(n.type === "service" || n.type === "module" || n.type === "package" ? [n.label] : []),
    ]).map(normalize),
  );
  const byKey = new Map<string, GroupedDependency>();
  const hidden = new Set<string>();
  const add = (name: string, version: string | null, source: string) => {
    const key = normalize(name);
    if (STANDARD_LIBRARY.has(key) || local.has(key)) {
      hidden.add(key);
      return;
    }
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { name, version, source });
    else if (!existing.version && version) byKey.set(key, { ...existing, version });
  };
  for (const d of analysis.repository.dependencies) add(d.name, d.version, d.source);
  for (const n of nodes) if (n.type === "external_dep") add(n.label, null, "import");

  const grouped = new Map<DependencyRole, GroupedDependency[]>();
  for (const [key, dep] of byKey) grouped.set(roleOf(key), [...(grouped.get(roleOf(key)) ?? []), dep]);
  return {
    groups: ROLE_ORDER.filter((role) => grouped.has(role)).map((role) => ({
      role,
      deps: grouped.get(role)!.sort((a, b) => a.name.localeCompare(b.name)),
    })),
    hidden: hidden.size,
  };
}
