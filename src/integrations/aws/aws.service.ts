import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigType } from '@nestjs/config';
import awsConfig from '../../config/aws.config';

@Injectable()
export class AwsService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  constructor(config: ConfigType<typeof awsConfig>) {
    this.bucketName = config.bucket;
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyID,
        secretAccessKey: config.secretKeyID,
      },
    });
  }

  async uploadToS3(data: { file: any; key: string }) {
    try {
      const { file, key } = data;
      // upload file
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private',
        Metadata: {
          originalName: file.originalname,
        },
      });

      // TODO: check what is in upload response and build response body
      const uploadResponse = await this.client.send(command);
      const requestId = uploadResponse['$metadata']['requestId'] ?? null;

      return {
        success: true,
        request_id: requestId,
      };
    } catch (e) {
      // TODO: log error
      return {
        success: false,
        request_id: null,
      };
    }
  }
}
