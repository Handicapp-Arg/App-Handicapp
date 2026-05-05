import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async upload(
    file: Express.Multer.File,
    folder = 'handicapp/horses',
    opts: { isPdf?: boolean } = {},
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOpts: Record<string, unknown> = { folder };

      if (opts.isPdf) {
        uploadOpts.resource_type = 'raw';
      } else {
        uploadOpts.transformation = [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' },
        ];
      }

      const upload = cloudinary.uploader.upload_stream(
        uploadOpts,
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        },
      );

      const stream = new Readable();
      stream.push(file.buffer);
      stream.push(null);
      stream.pipe(upload);
    });
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
