import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

type StorageProvider = 'r2' | 'firebase' | 'none';

@Injectable()
export class StorageService {
  private readonly logger   = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  // R2
  private s3: AWS.S3;
  private bucket: string;
  private publicUrl: string;

  // Firebase
  private firebaseStorage: any;
  private firebaseBucket: any;

  constructor(private readonly config: ConfigService) {
    // ── Cloudflare R2 prüfen ────────────────────────────────────────────────
    const r2Key      = config.get<string>('AWS_ACCESS_KEY_ID', '');
    const r2Secret   = config.get<string>('AWS_SECRET_ACCESS_KEY', '');
    const r2Endpoint = config.get<string>('AWS_ENDPOINT', '');
    const r2Active   = !!(r2Key && r2Secret && r2Endpoint &&
                         !r2Key.includes('DEIN') && !r2Key.includes('KEY'));

    // ── Firebase prüfen ─────────────────────────────────────────────────────
    const fbProjectId    = config.get<string>('FIREBASE_PROJECT_ID', '');
    const fbClientEmail  = config.get<string>('FIREBASE_CLIENT_EMAIL', '');
    const fbPrivateKey   = config.get<string>('FIREBASE_PRIVATE_KEY', '');
    const fbBucketName   = config.get<string>('FIREBASE_STORAGE_BUCKET', '');
    const fbActive       = !!(fbProjectId && fbClientEmail && fbPrivateKey && fbBucketName);

    if (r2Active) {
      this.provider  = 'r2';
      this.bucket    = config.get('AWS_S3_BUCKET', 'my-dressa-images');
      this.publicUrl = config.get('AWS_ENDPOINT_PUBLIC', '').replace(/\/$/, '');
      this.s3 = new AWS.S3({
        accessKeyId:      r2Key,
        secretAccessKey:  r2Secret,
        endpoint:         r2Endpoint,
        region:           config.get('AWS_REGION', 'auto'),
        signatureVersion: 'v4',
        s3ForcePathStyle: true,
      });
      this.logger.log('✅ Cloudflare R2 Storage aktiv');
    } else if (fbActive) {
      this.provider = 'firebase';
      try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId:   fbProjectId,
              clientEmail: fbClientEmail,
              privateKey:  fbPrivateKey.replace(/\\n/g, '\n'),
            }),
            storageBucket: fbBucketName,
          });
        }
        this.firebaseStorage = admin.storage();
        this.firebaseBucket  = this.firebaseStorage.bucket();
        this.logger.log('✅ Firebase Storage aktiv');
      } catch (e) {
        this.logger.error('❌ Firebase Storage Fehler — npm install firebase-admin ausführen!');
      }
    } else {
      this.provider = 'none';
      this.logger.warn('⚠️  Kein Storage konfiguriert — Bilder werden nicht gespeichert');
    }
  }

  isEnabled(): boolean {
    return this.provider !== 'none';
  }

  async uploadProductImage(file: Express.Multer.File, merchantId: string): Promise<string> {
    const ext      = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const filename = `products/${merchantId}/${uuidv4()}.${ext}`;

    if (this.provider === 'r2') {
      return this.uploadToR2(file, filename);
    } else if (this.provider === 'firebase') {
      return this.uploadToFirebase(file, filename);
    } else {
      this.logger.warn('Upload übersprungen: kein Storage konfiguriert');
      return `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80`;
    }
  }

  // ── Cloudflare R2 ──────────────────────────────────────────────────────────
  private async uploadToR2(file: Express.Multer.File, filename: string): Promise<string> {
    await this.s3.upload({
      Bucket:      this.bucket,
      Key:         filename,
      Body:        file.buffer,
      ContentType: file.mimetype,
    }).promise();
    return `${this.publicUrl}/${filename}`;
  }

  // ── Firebase Storage ───────────────────────────────────────────────────────
  private async uploadToFirebase(file: Express.Multer.File, filename: string): Promise<string> {
    const fileRef = this.firebaseBucket.file(filename);
    await fileRef.save(file.buffer, {
      metadata: { contentType: file.mimetype },
      public: true,
    });
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const bucket    = this.config.get<string>('FIREBASE_STORAGE_BUCKET');
    const encoded   = encodeURIComponent(filename);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encoded}?alt=media`;
  }

  async deleteFile(url: string): Promise<void> {
    if (!url || url.includes('unsplash')) return;

    try {
      if (this.provider === 'r2') {
        const key = url.replace(`${this.publicUrl}/`, '');
        await this.s3.deleteObject({ Bucket: this.bucket, Key: key }).promise();
      } else if (this.provider === 'firebase') {
        const match = url.match(/\/o\/(.+?)\?/);
        if (match) {
          const filename = decodeURIComponent(match[1]);
          await this.firebaseBucket.file(filename).delete();
        }
      }
    } catch (e) {
      this.logger.warn(`Datei konnte nicht gelöscht werden: ${url}`);
    }
  }
}
