import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { R2StorageService } from './r2-storage.service';

@Module({
  controllers: [UploadController],
  providers: [R2StorageService]
})
export class UploadModule {}
