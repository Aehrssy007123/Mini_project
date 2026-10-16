"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
class S3StorageService {
    name = 's3';
    s3Client;
    bucketName;
    constructor(config) {
        this.bucketName = config.bucketName;
        const clientConfig = {
            region: config.region || 'us-east-1',
        };
        if (config.accessKeyId && config.secretAccessKey) {
            clientConfig.credentials = {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
                sessionToken: config.sessionToken,
            };
        }
        this.s3Client = new client_s3_1.S3Client(clientConfig);
    }
    async streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
    async putBlock(storageKey, data, contentType = 'application/octet-stream') {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
            Body: data,
            ContentType: contentType,
            // Ensure server-side encryption with AWS-managed key (SSE-S3 or SSE-KMS) in addition to client encryption
            ServerSideEncryption: 'AES256',
        });
        await this.s3Client.send(command);
    }
    async getBlock(storageKey) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
        });
        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw new Error(`Empty response body from S3 for key: ${storageKey}`);
        }
        return this.streamToBuffer(response.Body);
    }
    async putManifest(storageKey, manifest) {
        const body = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
            Body: body,
            ContentType: 'application/json',
            ServerSideEncryption: 'AES256',
        });
        await this.s3Client.send(command);
    }
    async getManifest(storageKey) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
        });
        const response = await this.s3Client.send(command);
        if (!response.Body) {
            throw new Error(`Empty manifest response from S3 for key: ${storageKey}`);
        }
        const buffer = await this.streamToBuffer(response.Body);
        return JSON.parse(buffer.toString('utf-8'));
    }
    async deleteFile(fileId, userId) {
        const prefix = `secure-files/${userId}/${fileId}/`;
        // 1. List all objects with prefix
        const listCommand = new client_s3_1.ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
        });
        const listOutput = await this.s3Client.send(listCommand);
        if (!listOutput.Contents || listOutput.Contents.length === 0) {
            return;
        }
        // 2. Batch delete objects
        const objectsToDelete = listOutput.Contents.map((obj) => ({ Key: obj.Key }));
        const deleteCommand = new client_s3_1.DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
                Objects: objectsToDelete,
                Quiet: true,
            },
        });
        await this.s3Client.send(deleteCommand);
    }
    async checkHealth() {
        try {
            const command = new client_s3_1.HeadBucketCommand({
                Bucket: this.bucketName,
            });
            await this.s3Client.send(command);
            return {
                status: true,
                message: `Amazon S3 Bucket '${this.bucketName}' accessible and active`,
                details: { bucket: this.bucketName },
            };
        }
        catch (err) {
            return {
                status: false,
                message: `AWS S3 Connection Error: ${err.message || 'Access Denied or Bucket Not Found'}`,
                details: { code: err.name, statusCode: err.$metadata?.httpStatusCode },
            };
        }
    }
}
exports.S3StorageService = S3StorageService;
