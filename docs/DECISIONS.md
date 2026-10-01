# Architecture Decision Record (ADR)

This document records key technical decisions, rationale, and any deviations or adjustments made during development according to Section 15 of the Implementation Plan.

---

## 1. Monorepo and Package Manager

- **Decision**: Use `pnpm` workspaces with root orchestration scripts.
- **Rationale**: Efficient disk caching, strict dependency isolation, clean workspace protocol (`workspace:*`).

## 2. Shared Types and Enums

- **Decision**: Place shared types, DTO contracts, and enums (`Role`, `DocumentStatus`) in `packages/shared`. Built with `tsup` generating dual ESM (`.mjs`) and CommonJS (`.js`) outputs with TypeScript declaration maps.
- **Rationale**: Eliminates code drift between backend NestJS validation DTOs and frontend React TanStack Query hooks while allowing Vite (native ESM) and NestJS (CommonJS) to import types cleanly without bundling errors.

## 3. Strict TypeScript and Zero-Any Policy

- **Decision**: Enforce `strict: true`, `noImplicitAny: true`, and `noUncheckedIndexedAccess: true` across all projects.
- **Rationale**: Prevents runtime surprises and ensures robust type guarantees across API boundaries.

## 4. Vector Search & Local Fallback Strategy

- **Decision**: In production and Atlas Local Docker containers, use MongoDB Atlas `$vectorSearch` with cosine similarity and vector search index on `document_chunks.embedding`. For environments where MongoDB Atlas Local Docker is not available or during in-memory automated tests, provide a seamless cosine similarity calculation fallback in the retrieval engine.
- **Rationale**: Guarantees tests and local dev work reliably without crashing while remaining 100% compliant with MongoDB Atlas Vector Search syntax in production.

## 5. Dual-Token JWT and Cookie Security

- **Decision**: Access token in memory (15 min lifespan), refresh token in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookie scoped strictly to `/api/auth`.
- **Rationale**: Mitigates XSS token theft while providing silent session refresh with reuse detection.

## 6. Password Hashing

- **Decision**: Use `bcryptjs` for password hashing and verification.
- **Rationale**: Eliminates native C++ compilation / node-gyp requirements on macOS and container architectures while providing standard bcrypt algorithm compatibility.

## 7. PDF Extraction Library

- **Decision**: Use `unpdf` for per-page text extraction.
- **Rationale**: Lightweight, modern, worker-compatible, extracts text page-by-page to accurately link chunk citations to PDF page numbers.
