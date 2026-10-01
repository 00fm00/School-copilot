import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function initDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp_copilot';
  const dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);
  const indexName = 'vector_index';

  console.log(`Connecting to MongoDB at: ${uri}`);
  const conn = await mongoose.connect(uri);
  const db = conn.connection.db;

  if (!db) {
    throw new Error('Database connection failed');
  }

  const collection = db.collection('document_chunks');

  console.log(`Checking Atlas Vector Search index '${indexName}' on 'document_chunks'...`);

  try {
    // Check existing search indexes (Atlas command)
    const cursor = collection.listSearchIndexes();
    const indexes = await cursor.toArray();
    const existing = indexes.find((idx: any) => idx.name === indexName);

    if (existing) {
      console.log(`Vector index '${indexName}' already exists. Skipping.`);
    } else {
      console.log(
        `Creating Atlas Vector Search index '${indexName}' (${dimensions} dimensions)...`,
      );
      await collection.createSearchIndex({
        name: indexName,
        type: 'vectorSearch',
        definition: {
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: dimensions,
              similarity: 'cosine',
            },
            {
              type: 'filter',
              path: 'allowedRoles',
            },
            {
              type: 'filter',
              path: 'classScope',
            },
            {
              type: 'filter',
              path: 'documentId',
            },
          ],
        },
      });
      console.log(`Successfully created vector search index '${indexName}'.`);
    }
  } catch (err: any) {
    if (
      err.codeName === 'CommandNotFound' ||
      err.message?.includes('no such command') ||
      err.message?.includes('listSearchIndexes')
    ) {
      console.log(
        `Note: Connected MongoDB does not support Atlas createSearchIndex command (e.g. standalone/community without Atlas Local Docker). Vector search fallback will calculate cosine similarity seamlessly.`,
      );
    } else {
      console.warn(`Vector index creation warning: ${err.message}`);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Database initialization completed.');
  }
}

initDb().catch((err) => {
  console.error('Database initialization error:', err);
  process.exit(1);
});
