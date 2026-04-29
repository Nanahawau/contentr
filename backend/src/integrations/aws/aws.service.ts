import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigType } from '@nestjs/config';
import awsConfig from '../../config/aws.config';

@Injectable()
export class AwsService {
  private readonly logger = new Logger(AwsService.name);
  private readonly client: S3Client;
  private readonly bucketName: string;
  constructor(@Inject(awsConfig.KEY) config: ConfigType<typeof awsConfig>) {
    this.bucketName = config.bucket;
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint && {
        endpoint: config.endpoint,
        forcePathStyle: true,
      }),
      credentials: {
        accessKeyId: config.accessKeyID,
        secretAccessKey: config.secretKeyID,
      },
    });
  }

  async uploadToS3(data: { file: Express.Multer.File; key: string }) {
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
          originalName: String(file.originalname ?? '').trim(),
        },
      });

      // TODO: check what is in upload response and build response body
      const uploadResponse = await this.client.send(command);
      this.logger.log({ uploadResponse });
      const requestId = uploadResponse['$metadata']['requestId'] ?? null;

      return {
        success: true,
        request_id: requestId,
      };
    } catch (error) {
      this.logger.error(error);
      return {
        success: false,
        request_id: null,
      };
    }
  }

  async fetchFromS3(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.client.send(command);

    // response.Body is a stream, so you need to convert it to a Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
