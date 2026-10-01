export interface StoredFileMetadata {
  storagePath: string;
  sizeBytes: number;
  originalName: string;
  mimeType: string;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File): Promise<StoredFileMetadata>;
  deleteFile(storagePath: string): Promise<void>;
  getFileBuffer(storagePath: string): Promise<Buffer>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
