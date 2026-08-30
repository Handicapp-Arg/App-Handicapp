import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly configurado: boolean;

  constructor() {
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    this.configurado = Boolean(cloud_name && api_key && api_secret);

    if (!this.configurado) {
      // Sin estas variables, cualquier subida devolvía un 500 opaco y la app se
      // lo tragaba en silencio: el usuario veía "guardado" y la foto nunca subía.
      this.logger.error(
        'Cloudinary sin configurar: faltan CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET. ' +
          'Toda subida de imágenes y documentos va a fallar.',
      );
      return;
    }

    cloudinary.config({ cloud_name, api_key, api_secret });
  }

  async upload(
    file: Express.Multer.File,
    folder = 'handicapp/horses',
    opts: { isPdf?: boolean } = {},
  ): Promise<UploadApiResponse> {
    if (!this.configurado) {
      throw new ServiceUnavailableException(
        'El servicio de imágenes no está configurado en el servidor.',
      );
    }

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
    if (!this.configurado) {
      throw new ServiceUnavailableException(
        'El servicio de imágenes no está configurado en el servidor.',
      );
    }

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
