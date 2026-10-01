import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Role, DocumentStatus } from '@school-copilot/shared';
import { generateSamplePdfs } from './pdf-generator';
import { SchoolClassSchema, SchoolClass } from '../schemas/school-class.schema';
import { UserSchema, User } from '../schemas/user.schema';
import { StudentSchema, Student } from '../schemas/student.schema';
import { AppDocumentSchema, AppDocument } from '../schemas/document.schema';
import { DocumentChunkSchema, DocumentChunk } from '../schemas/document-chunk.schema';
import { SemanticChunkerService } from '../ingestion/chunker/semantic-chunker.service';
import { OpenAiEmbeddingProvider } from '../llm/openai-embedding.provider';
import { ConfigService } from '@nestjs/config';
import { PdfParserService } from '../ingestion/parser/pdf-parser.service';

export interface SeedResult {
  classes: Record<string, string>;
  users: Record<string, string>;
  students: Record<string, string>;
  documents: Record<string, string>;
}

export async function seedDatabase(mongoUri?: string): Promise<SeedResult> {
  const uri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/school_erp_copilot';
  console.log(`[Seed] Connecting to MongoDB: ${uri}`);

  const conn = await mongoose.createConnection(uri).asPromise();
  console.log('[Seed] Connected successfully.');

  const ClassModel = conn.model<SchoolClass>('SchoolClass', SchoolClassSchema);
  const UserModel = conn.model<User>('User', UserSchema);
  const StudentModel = conn.model<Student>('Student', StudentSchema);
  const DocModel = conn.model<AppDocument>('AppDocument', AppDocumentSchema);
  const ChunkModel = conn.model<DocumentChunk>('DocumentChunk', DocumentChunkSchema);

  // 1. Upsert Classes
  console.log('[Seed] Upserting Classes...');
  const classNames = ['Class 6-A', 'Class 8-A', 'Class 10-A'];
  const classMap: Record<string, Types.ObjectId> = {};

  for (const name of classNames) {
    const cls = await ClassModel.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, new: true },
    );
    classMap[name] = cls._id as Types.ObjectId;
  }

  // 2. Upsert Users
  console.log('[Seed] Upserting Users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData: Array<{
    email: string;
    name: string;
    role: Role;
    classIds: Types.ObjectId[];
  }> = [
    {
      email: 'admin@school.local',
      name: 'School Admin',
      role: Role.ADMIN,
      classIds: [],
    },
    {
      email: 'teacher.math@school.local',
      name: 'Math Teacher',
      role: Role.TEACHER,
      classIds: [classMap['Class 8-A']!, classMap['Class 10-A']!],
    },
    {
      email: 'teacher.english@school.local',
      name: 'English Teacher',
      role: Role.TEACHER,
      classIds: [classMap['Class 6-A']!],
    },
    {
      email: 'parent.smith@school.local',
      name: 'Parent Smith',
      role: Role.PARENT,
      classIds: [],
    },
    {
      email: 'parent.doe@school.local',
      name: 'Parent Doe',
      role: Role.PARENT,
      classIds: [],
    },
    {
      email: 'parent.khan@school.local',
      name: 'Parent Khan',
      role: Role.PARENT,
      classIds: [],
    },
  ];

  const userMap: Record<string, Types.ObjectId> = {};
  for (const u of usersData) {
    const user = await UserModel.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          name: u.name,
          role: u.role,
          passwordHash,
          classIds: u.classIds,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
    userMap[u.email] = user._id as Types.ObjectId;
  }

  // 3. Upsert Students
  console.log('[Seed] Upserting Students...');
  const studentsData: Array<{
    name: string;
    classId: Types.ObjectId;
    parentUserId: Types.ObjectId;
  }> = [
    {
      name: 'Alice Smith',
      classId: classMap['Class 8-A']!,
      parentUserId: userMap['parent.smith@school.local']!,
    },
    {
      name: 'Bob Doe',
      classId: classMap['Class 6-A']!,
      parentUserId: userMap['parent.doe@school.local']!,
    },
    {
      name: 'Tariq Khan',
      classId: classMap['Class 10-A']!,
      parentUserId: userMap['parent.khan@school.local']!,
    },
  ];

  const studentMap: Record<string, string> = {};
  for (const s of studentsData) {
    const student = await StudentModel.findOneAndUpdate(
      { name: s.name, parentUserId: s.parentUserId },
      { $set: { classId: s.classId } },
      { upsert: true, new: true },
    );
    studentMap[s.name] = (student._id as Types.ObjectId).toString();
  }

  // 4. Generate & Ingest Sample PDFs
  console.log('[Seed] Generating Sample PDF Fixtures...');
  const fixtures = await generateSamplePdfs();

  const uploadDir = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Services for ingestion
  const pdfParser = new PdfParserService();
  const chunker = new SemanticChunkerService();
  const configService = new ConfigService();
  const embeddingProvider = new OpenAiEmbeddingProvider(configService);

  const adminId = userMap['admin@school.local']!;
  const docMap: Record<string, string> = {};

  for (const fixture of fixtures) {
    console.log(`[Seed] Processing Document: ${fixture.title}...`);
    const filePath = path.join(uploadDir, fixture.filename);
    fs.writeFileSync(filePath, fixture.buffer);

    let audienceRoles: Role[] = [Role.TEACHER, Role.PARENT];
    let classScope: string[] = ['ALL'];

    if (fixture.title === 'Staff Handbook') {
      audienceRoles = [Role.TEACHER];
      classScope = ['ALL'];
    } else if (fixture.title === 'Class 8 Exam Circular') {
      audienceRoles = [Role.TEACHER, Role.PARENT];
      classScope = [classMap['Class 8-A']!.toString()];
    } else if (fixture.title === 'Holiday Calendar') {
      audienceRoles = [Role.ADMIN, Role.TEACHER, Role.PARENT];
      classScope = ['ALL'];
    } else if (fixture.title === 'Fee Structure') {
      audienceRoles = [Role.PARENT, Role.TEACHER];
      classScope = ['ALL'];
    } else if (fixture.title === 'Leave Policy') {
      audienceRoles = [Role.TEACHER, Role.PARENT];
      classScope = ['ALL'];
    }

    const doc = await DocModel.findOneAndUpdate(
      { title: fixture.title },
      {
        $set: {
          originalName: fixture.filename,
          storagePath: filePath,
          mimeType: 'application/pdf',
          sizeBytes: fixture.buffer.length,
          status: DocumentStatus.PROCESSING,
          pageCount: fixture.pageCount,
          audienceRoles,
          classScope,
          uploadedBy: adminId,
          version: 1,
        },
      },
      { upsert: true, new: true },
    );

    const docId = doc._id as Types.ObjectId;
    docMap[fixture.title] = docId.toString();

    // Parse and extract chunks
    const pages = fixture.pagesContent
      ? fixture.pagesContent.map((lines, i) => ({
          pageNumber: i + 1,
          text: lines.join('\n'),
        }))
      : (await pdfParser.parsePdfBuffer(fixture.buffer)).pages;

    const chunkInputs = chunker.chunkPages(doc.title, pages);

    console.log(`[Seed] Embedding ${chunkInputs.length} chunks for ${fixture.title}...`);
    const chunkTexts = chunkInputs.map((c) => c.embeddedText);
    const embeddings = await embeddingProvider.embedChunks(chunkTexts);

    // Delete existing chunks for this doc
    await ChunkModel.deleteMany({ documentId: docId });

    // Insert chunks with denormalized permissions
    const chunkDocs = chunkInputs.map((c, idx) => ({
      documentId: docId,
      version: 1,
      chunkIndex: c.chunkIndex,
      page: c.page,
      documentTitle: doc.title,
      text: c.text,
      tokenCount: Math.ceil(c.text.length / 4),
      embedding: embeddings[idx] ?? [],
      allowedRoles: audienceRoles,
      classScope,
    }));

    await ChunkModel.insertMany(chunkDocs);

    doc.status = DocumentStatus.READY;
    await doc.save();
    console.log(`[Seed] Ingested ${chunkDocs.length} chunks for ${fixture.title}. Status: READY`);
  }

  console.log('[Seed] Seeding completed successfully!');
  await conn.close();

  return {
    classes: Object.fromEntries(Object.entries(classMap).map(([k, v]) => [k, v.toString()])),
    users: Object.fromEntries(Object.entries(userMap).map(([k, v]) => [k, v.toString()])),
    students: studentMap,
    documents: docMap,
  };
}

if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seed execution finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed execution failed:', err);
      process.exit(1);
    });
}
