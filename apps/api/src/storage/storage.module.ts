import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { CloudinaryStorageService } from './cloudinary-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    CloudinaryStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, LocalStorageService, CloudinaryStorageService],
      useFactory: (
        config: ConfigService,
        localService: LocalStorageService,
        cloudinaryService: CloudinaryStorageService,
      ) => {
        const provider = config.get<string>('STORAGE_PROVIDER', 'local');
        const hasCloudinary =
          Boolean(config.get<string>('CLOUDINARY_URL')) ||
          Boolean(config.get<string>('CLOUDINARY_CLOUD_NAME'));

        if (provider === 'cloudinary' || hasCloudinary) {
          return cloudinaryService;
        }
        return localService;
      },
    },
  ],
  exports: [STORAGE_SERVICE, LocalStorageService, CloudinaryStorageService],
})
export class StorageModule {}
