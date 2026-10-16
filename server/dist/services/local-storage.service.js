"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class LocalStorageService {
    name = 'local';
    baseDir;
    constructor(customBaseDir) {
        this.baseDir = customBaseDir || path_1.default.resolve(process.cwd(), '.storage', 's3-bucket');
    }
    getFilePath(storageKey) {
        // Sanitize storage key to avoid directory traversal
        const safeKey = storageKey.replace(/^(\.\.(\/|\\|$))+/, '');
        return path_1.default.join(this.baseDir, safeKey);
    }
    async putBlock(storageKey, data) {
        const fullPath = this.getFilePath(storageKey);
        await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
        await promises_1.default.writeFile(fullPath, data);
    }
    async getBlock(storageKey) {
        const fullPath = this.getFilePath(storageKey);
        try {
            return await promises_1.default.readFile(fullPath);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw new Error(`Block not found at key: ${storageKey}`);
            }
            throw err;
        }
    }
    async putManifest(storageKey, manifest) {
        const fullPath = this.getFilePath(storageKey);
        await promises_1.default.mkdir(path_1.default.dirname(fullPath), { recursive: true });
        await promises_1.default.writeFile(fullPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
    async getManifest(storageKey) {
        const fullPath = this.getFilePath(storageKey);
        try {
            const data = await promises_1.default.readFile(fullPath, 'utf-8');
            return JSON.parse(data);
        }
        catch (err) {
            if (err.code === 'ENOENT') {
                throw new Error(`Manifest not found at key: ${storageKey}`);
            }
            throw err;
        }
    }
    async deleteFile(fileId, userId) {
        const fileDir = path_1.default.join(this.baseDir, 'secure-files', userId, fileId);
        try {
            await promises_1.default.rm(fileDir, { recursive: true, force: true });
        }
        catch (err) {
            // Ignore directory not found on delete
        }
    }
    async checkHealth() {
        try {
            await promises_1.default.mkdir(this.baseDir, { recursive: true });
            return {
                status: true,
                message: 'Local Object Storage Adapter ready (.storage/s3-bucket)',
                details: { directory: this.baseDir },
            };
        }
        catch (err) {
            return {
                status: false,
                message: `Local Object Storage directory error: ${err.message}`,
            };
        }
    }
}
exports.LocalStorageService = LocalStorageService;
