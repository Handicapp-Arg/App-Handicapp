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

  async uploadVideo(
    file: Express.Multer.File,
    folder = 'handicapp/feed',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'video' },
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

  async delete(publicId: string, resourceType: 'image' | 'raw' = 'image'): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  }

  addTimestampOverlay(publicId: string, authorName: string, takenAt: Date): string {
    const date = takenAt.toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const text = encodeURIComponent(`${authorName} • ${date}`);
    return cloudinary.url(publicId, {
      transformation: [
        { width: 800, crop: 'limit', quality: 'auto' },
        {
          overlay: { font_family: 'Arial', font_size: 20, font_weight: 'bold', text },
          gravity: 'south_east',
          x: 10, y: 10,
          color: '#ffffff',
        },
        {
          overlay: { font_family: 'Arial', font_size: 20, font_weight: 'bold', text },
          gravity: 'south_east',
          x: 12, y: 12,
          color: '#000000',
          opacity: 50,
        },
      ],
      secure: true,
    });
  }
}
