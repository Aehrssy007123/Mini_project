"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageFactory = void 0;
const local_storage_service_1 = require("./local-storage.service");
const s3_storage_service_1 = require("./s3-storage.service");
class StorageFactory {
    static instance;
    static getStorageProvider() {
        if (this.instance) {
            return this.instance;
        }
        const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
        const hasAwsConfig = !!(process.env.AWS_REGION && process.env.S3_BUCKET_NAME);
        if (providerType === 's3' && hasAwsConfig) {
            console.log(`[StorageFactory] Initializing Amazon S3 Storage Adapter (Bucket: ${process.env.S3_BUCKET_NAME}, Region: ${process.env.AWS_REGION})`);
            this.instance = new s3_storage_service_1.S3StorageService({
                region: process.env.AWS_REGION || 'us-east-1',
                bucketName: process.env.S3_BUCKET_NAME,
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                sessionToken: process.env.AWS_SESSION_TOKEN,
            });
        }
        else {
            console.log('[StorageFactory] Initializing Local Object Storage Adapter (.storage/s3-bucket)');
            this.instance = new local_storage_service_1.LocalStorageService();
        }
        return this.instance;
    }
}
exports.StorageFactory = StorageFactory;
