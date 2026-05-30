import { Controller, Get, Header, Post, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { R2StorageService } from './r2-storage.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly storage: R2StorageService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.storage.uploadFile(file);
  }

  @Get('object')
  @Header('Cache-Control', 'private, max-age=300')
  async getObject(@Query('key') key: string, @Res() res: Response) {
    const object = await this.storage.getObject(key);
    res.setHeader('Content-Type', object.contentType);
    if (object.contentLength !== undefined) {
      res.setHeader('Content-Length', String(object.contentLength));
    }
    object.body.pipe(res);
  }
}
