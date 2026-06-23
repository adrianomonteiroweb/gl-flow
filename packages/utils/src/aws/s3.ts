import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import { getAWSCredentials } from './credentials';

const s3 = new S3Client({
  ...getAWSCredentials(),
  requestChecksumCalculation: 'WHEN_REQUIRED',
});

export class S3 {
  static async upload(bucketName: string, key: string, filePath: string) {
    try {
      const fileStream = createReadStream(filePath);
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
      };

      const command = new PutObjectCommand(uploadParams);
      const response = await s3.send(command);
      return response;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  static async uploadBuffer(bucketName: string, key: string, buffer: Buffer, contentType?: string) {
    try {
      const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      };

      const command = new PutObjectCommand(uploadParams);
      const response = await s3.send(command);
      return response;
    } catch (error) {
      console.error('Error uploading buffer:', error);
      throw error;
    }
  }

  static async download(bucketName: string, key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  static async getFileAsBase64(bucketName: string, key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const response = await s3.send(command);

      if (!response.Body) {
        throw new Error('File body is empty');
      }

      // Convert the stream to buffer and then to base64
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      return buffer.toString('base64');
    } catch (error) {
      console.error('Error getting file as base64:', error);
      throw error;
    }
  }

  static async delete(bucketName: string, key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      await s3.send(command);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  static async getPresignedUploadUrl(bucketName: string, key: string, contentType: string, expiresIn: number = 3600) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      const url = await getSignedUrl(s3, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      throw error;
    }
  }
}

export default S3;
