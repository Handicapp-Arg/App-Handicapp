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
    // Espacios laterales = padding visual dentro de la "pill"
    const text = encodeURIComponent(`  ${authorName} · ${date}  `);
    return cloudinary.url(publicId, {
      transformation: [
        { width: 800, crop: 'limit', quality: 'auto' },
        {
          // Sans moderna (Google Font vía Cloudinary) con tracking sutil
          overlay: {
            font_family: 'Montserrat',
            font_size: 22,
            font_weight: 'semibold',
            letter_spacing: 1,
            text,
          },
          gravity: 'south_east',
          x: 16, y: 16,
          color: '#FFFFFF',
          // Pill negra translúcida + esquinas redondeadas = look prolijo
          background: 'rgb:00000099',
          radius: 20,
        },
      ],
      secure: true,
    });
  }
}
