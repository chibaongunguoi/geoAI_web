import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { R2StorageService } from './r2-storage.service';

describe('UploadController', () => {
  let controller: UploadController;
  const storage = {
    uploadFile: jest.fn(),
    getObject: jest.fn(),
  };

  beforeEach(async () => {
    storage.uploadFile.mockReset();
    storage.getObject.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: R2StorageService, useValue: storage }],
    }).compile();

    controller = module.get<UploadController>(UploadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns R2 upload metadata for report and dossier uploads', async () => {
    storage.uploadFile.mockResolvedValueOnce({
      imageUrl: '/upload/object?key=uploads%2Ffile.png',
      objectKey: 'uploads/file.png',
    });

    await expect(controller.uploadFile({ originalname: 'file.png' } as Express.Multer.File)).resolves.toEqual({
      imageUrl: '/upload/object?key=uploads%2Ffile.png',
      objectKey: 'uploads/file.png',
    });
  });
});
