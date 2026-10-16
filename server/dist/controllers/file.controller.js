"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileController = void 0;
const storage_factory_1 = require("../services/storage.factory");
const db_service_1 = require("../services/db.service");
const types_1 = require("../types");
class FileController {
    /**
     * Initiate file upload session and validate manifest structure
     */
    static async initiateUpload(req, res) {
        try {
            const validation = types_1.FileManifestSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    error: 'Invalid file manifest format',
                    details: validation.error.format(),
                });
                return;
            }
            const manifest = validation.data;
            const userId = req.headers['x-user-id'] || manifest.userId || 'user-default';
            // Ensure manifest userId matches
            manifest.userId = userId;
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            // Register initial file record
            const fileRecord = {
                fileId: manifest.fileId,
                userId: manifest.userId,
                fileName: manifest.fileName,
                fileType: manifest.fileType,
                originalSize: manifest.originalSize,
                blockSize: manifest.blockSize,
                totalBlocks: manifest.totalBlocks,
                originalSha256: manifest.originalSha256,
                createdAt: manifest.createdAt || new Date().toISOString(),
                encryptionAlgorithm: manifest.encryption.algorithm,
                storageProvider: storageProvider.name,
                cloudStatus: 'uploading',
                integrityStatus: 'unverified',
            };
            await db_service_1.DbService.saveFileRecord(fileRecord);
            res.status(200).json({
                message: 'Upload session initialized successfully',
                fileId: manifest.fileId,
                totalBlocks: manifest.totalBlocks,
                storageProvider: storageProvider.name,
            });
        }
        catch (err) {
            console.error('Error initiating upload:', err);
            res.status(500).json({ error: 'Failed to initiate upload', details: err.message });
        }
    }
    /**
     * Upload an individual encrypted block
     */
    static async uploadBlock(req, res) {
        try {
            const fileId = String(req.params.fileId);
            const blockIndex = String(req.params.blockIndex);
            const indexNum = parseInt(blockIndex, 10);
            const userId = req.headers['x-user-id'] || 'user-default';
            if (isNaN(indexNum) || indexNum < 0) {
                res.status(400).json({ error: 'Invalid block index' });
                return;
            }
            // Check if file record exists
            const fileRecord = await db_service_1.DbService.getFileRecord(fileId);
            if (!fileRecord) {
                res.status(404).json({ error: 'Upload session not found for fileId' });
                return;
            }
            // Ensure block buffer is provided
            let blockData;
            if (req.file && req.file.buffer) {
                blockData = req.file.buffer;
            }
            else if (Buffer.isBuffer(req.body)) {
                blockData = req.body;
            }
            else {
                res.status(400).json({ error: 'No binary block payload provided' });
                return;
            }
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            const storageKey = `secure-files/${userId}/${fileId}/blocks/${indexNum.toString().padStart(6, '0')}.enc`;
            await storageProvider.putBlock(storageKey, blockData);
            res.status(200).json({
                message: `Block ${indexNum} stored successfully`,
                fileId,
                blockIndex: indexNum,
                bytesReceived: blockData.length,
            });
        }
        catch (err) {
            console.error(`Error uploading block:`, err);
            res.status(500).json({ error: 'Failed to store encrypted block', details: err.message });
        }
    }
    /**
     * Complete file upload by storing the authenticated manifest
     */
    static async completeUpload(req, res) {
        try {
            const fileId = String(req.params.fileId);
            const userId = req.headers['x-user-id'] || 'user-default';
            const validation = types_1.FileManifestSchema.safeParse(req.body);
            if (!validation.success) {
                res.status(400).json({
                    error: 'Invalid manifest on completion',
                    details: validation.error.format(),
                });
                return;
            }
            const manifest = validation.data;
            if (manifest.fileId !== fileId) {
                res.status(400).json({ error: 'File ID in URL does not match manifest' });
                return;
            }
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            const manifestStorageKey = `secure-files/${userId}/${fileId}/manifest.json`;
            // Persist authenticated manifest in storage
            await storageProvider.putManifest(manifestStorageKey, manifest);
            // Update file record to 'stored' and 'verified'
            const fileRecord = {
                fileId: manifest.fileId,
                userId: manifest.userId,
                fileName: manifest.fileName,
                fileType: manifest.fileType,
                originalSize: manifest.originalSize,
                blockSize: manifest.blockSize,
                totalBlocks: manifest.totalBlocks,
                originalSha256: manifest.originalSha256,
                createdAt: manifest.createdAt,
                encryptionAlgorithm: manifest.encryption.algorithm,
                storageProvider: storageProvider.name,
                cloudStatus: 'stored',
                integrityStatus: 'verified',
            };
            await db_service_1.DbService.saveFileRecord(fileRecord);
            res.status(200).json({
                message: 'File upload and manifest verification completed successfully',
                fileRecord,
            });
        }
        catch (err) {
            console.error('Error completing upload:', err);
            res.status(500).json({ error: 'Failed to finalize file upload', details: err.message });
        }
    }
    /**
     * List files for current user
     */
    static async listFiles(req, res) {
        try {
            const userId = req.headers['x-user-id'] || 'user-default';
            const files = await db_service_1.DbService.listFiles(userId);
            res.status(200).json({
                count: files.length,
                files: files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
            });
        }
        catch (err) {
            console.error('Error listing files:', err);
            res.status(500).json({ error: 'Failed to retrieve file list', details: err.message });
        }
    }
    /**
     * Get file manifest for download/decryption
     */
    static async getManifest(req, res) {
        try {
            const fileId = String(req.params.fileId);
            const userId = req.headers['x-user-id'] || 'user-default';
            const fileRecord = await db_service_1.DbService.getFileRecord(fileId);
            if (!fileRecord) {
                res.status(404).json({ error: 'File not found' });
                return;
            }
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            const manifestStorageKey = `secure-files/${userId}/${fileId}/manifest.json`;
            const manifest = await storageProvider.getManifest(manifestStorageKey);
            res.status(200).json(manifest);
        }
        catch (err) {
            console.error('Error fetching manifest:', err);
            res.status(404).json({ error: 'Manifest not found or inaccessible', details: err.message });
        }
    }
    /**
     * Download a single encrypted block binary
     */
    static async getBlock(req, res) {
        try {
            const fileId = String(req.params.fileId);
            const blockIndex = String(req.params.blockIndex);
            const indexNum = parseInt(blockIndex, 10);
            const userId = req.headers['x-user-id'] || 'user-default';
            if (isNaN(indexNum) || indexNum < 0) {
                res.status(400).json({ error: 'Invalid block index' });
                return;
            }
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            const storageKey = `secure-files/${userId}/${fileId}/blocks/${indexNum.toString().padStart(6, '0')}.enc`;
            const blockBuffer = await storageProvider.getBlock(storageKey);
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileId}_block_${indexNum}.enc"`);
            res.setHeader('Content-Length', blockBuffer.length);
            res.status(200).send(blockBuffer);
        }
        catch (err) {
            console.error('Error fetching block:', err);
            res.status(404).json({ error: 'Encrypted block not found', details: err.message });
        }
    }
    /**
     * Delete an encrypted file and all its blocks
     */
    static async deleteFile(req, res) {
        try {
            const fileId = String(req.params.fileId);
            const userId = req.headers['x-user-id'] || 'user-default';
            const fileRecord = await db_service_1.DbService.getFileRecord(fileId);
            if (!fileRecord) {
                res.status(404).json({ error: 'File record not found' });
                return;
            }
            const storageProvider = storage_factory_1.StorageFactory.getStorageProvider();
            await storageProvider.deleteFile(fileId, userId, fileRecord.totalBlocks);
            await db_service_1.DbService.deleteFileRecord(fileId);
            res.status(200).json({
                message: 'File and all encrypted blocks deleted successfully',
                fileId,
            });
        }
        catch (err) {
            console.error('Error deleting file:', err);
            res.status(500).json({ error: 'Failed to delete file', details: err.message });
        }
    }
}
exports.FileController = FileController;
