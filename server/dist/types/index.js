"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManifestSchema = exports.BlockMetadataSchema = void 0;
const zod_1 = require("zod");
exports.BlockMetadataSchema = zod_1.z.object({
    index: zod_1.z.number().int().nonnegative(),
    originalSize: zod_1.z.number().int().nonnegative(),
    ciphertextSize: zod_1.z.number().int().nonnegative(),
    nonce: zod_1.z.string().min(1),
    tag: zod_1.z.string().min(1),
    sha256Plaintext: zod_1.z.string().optional(),
    storageKey: zod_1.z.string().min(1),
});
exports.FileManifestSchema = zod_1.z.object({
    version: zod_1.z.literal('1.0.0'),
    fileId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
    fileType: zod_1.z.string(),
    originalSize: zod_1.z.number().int().nonnegative(),
    originalSha256: zod_1.z.string().length(64),
    blockSize: zod_1.z.number().int().positive(),
    totalBlocks: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.string(),
    encryption: zod_1.z.object({
        algorithm: zod_1.z.literal('AES-256-GCM'),
        tagLength: zod_1.z.literal(128),
        kdf: zod_1.z.object({
            name: zod_1.z.literal('PBKDF2'),
            hash: zod_1.z.literal('SHA-256'),
            iterations: zod_1.z.number().int().positive(),
            salt: zod_1.z.string().min(1),
        }),
    }),
    blocks: zod_1.z.array(exports.BlockMetadataSchema),
    manifestHash: zod_1.z.string().min(1),
});
