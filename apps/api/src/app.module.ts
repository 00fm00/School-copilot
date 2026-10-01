import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.schema';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { ClassesModule } from './classes/classes.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { LlmModule } from './llm/llm.module';
import { ChatModule } from './chat/chat.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env', '../.env'],
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/school_erp_copilot',
        ),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    AuthModule,
    ClassesModule,
    DocumentsModule,
    StorageModule,
    IngestionModule,
    RetrievalModule,
    LlmModule,
    ChatModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
