# School ERP Copilot Architecture

A role-aware RAG assistant embedded in a School ERP system.

## System Overview

```mermaid
flowchart TD
    subgraph Client ["Frontend (apps/web)"]
        UI["React 18 + Tailwind CSS"]
        Router["TanStack Router (file-based)"]
        Query["TanStack Query + Axios"]
        AuthStore["In-Memory Auth Store"]
    end

    subgraph API ["Backend (apps/api - NestJS)"]
        Guards["JwtAuthGuard & RolesGuard"]
        AuthMod["Auth Module (Argon2 / Refresh Tokens)"]
        DocMod["Documents Controller & StorageService"]
        QueueMod["BullMQ Ingestion Producer & Processor"]
        RetrievalMod["Retrieval Engine + buildChunkFilter(user)"]
        LLMMod["OpenAI LLM & Embedding Providers"]
        ChatMod["Chat Sessions & Citation Pipeline"]
    end

    subgraph Storage ["Databases & Queues"]
        Mongo[("MongoDB Atlas ($vectorSearch)")]
        RedisQueue[("Redis (BullMQ Jobs)")]
        DiskStorage[("Local Disk (storage/uploads/)")]
    end

    UI --> Router
    Router --> Query
    Query -->|"/api/* with Bearer + httpOnly Cookie"| Guards
    Guards --> AuthMod
    Guards --> DocMod
    Guards --> ChatMod

    DocMod -->|Save PDF| DiskStorage
    DocMod -->|Enqueue Job| RedisQueue
    RedisQueue -->|Process PDF| QueueMod
    QueueMod -->|Extract Text & Chunk| QueueMod
    QueueMod -->|Embed Chunks| LLMMod
    QueueMod -->|Upsert Chunks & Metadata| Mongo

    ChatMod -->|Embed Question| LLMMod
    ChatMod -->|Permission-filtered Vector Search| RetrievalMod
    RetrievalMod -->|$vectorSearch + buildChunkFilter| Mongo
    ChatMod -->|Generate Grounded Answer & Citations| LLMMod
```

## Security & Permission Model

The access rule is strictly enforced at retrieval time via `buildChunkFilter(user)`:

- **ADMIN**: Accesses all document chunks (`{}`).
- **TEACHER**: Accesses chunks where `allowedRoles: TEACHER` and `classScope` matches assigned classes or `'ALL'`.
- **PARENT**: Accesses chunks where `allowedRoles: PARENT` and `classScope` matches the child's classes or `'ALL'`.

Permission filters are injected directly into the `$vectorSearch` filter parameter, guaranteeing that unauthorized chunks are never sent to the LLM prompt.
