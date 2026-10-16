"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const file_controller_1 = require("../controllers/file.controller");
const cloud_controller_1 = require("../controllers/cloud.controller");
const cdn_controller_1 = require("../controllers/cdn.controller");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per block limit
    },
});
const router = (0, express_1.Router)();
// Health Check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'SecureVault Cloud API',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});
// Cloud Status
router.get('/cloud/status', cloud_controller_1.CloudController.getStatus);
// File Operations
router.post('/files/initiate', file_controller_1.FileController.initiateUpload);
router.put('/files/:fileId/blocks/:blockIndex', upload.single('block'), file_controller_1.FileController.uploadBlock);
router.post('/files/:fileId/complete', file_controller_1.FileController.completeUpload);
router.get('/files', file_controller_1.FileController.listFiles);
router.get('/files/:fileId/manifest', file_controller_1.FileController.getManifest);
router.get('/files/:fileId/blocks/:blockIndex', file_controller_1.FileController.getBlock);
router.delete('/files/:fileId', file_controller_1.FileController.deleteFile);
// CDN Benchmark Endpoint
router.get('/cdn/benchmark', cdn_controller_1.CdnController.benchmark);
exports.default = router;
