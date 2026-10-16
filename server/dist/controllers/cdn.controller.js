"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdnController = void 0;
class CdnController {
    /**
     * Endpoint for CDN and Origin latency testing and cache verification
     */
    static async benchmark(req, res) {
        const timestamp = Date.now();
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        res.setHeader('X-Origin-Server', 'SecureVault-Origin-Node');
        res.setHeader('X-Benchmark-Time', timestamp.toString());
        res.status(200).json({
            status: 'ok',
            type: 'origin',
            message: 'SecureVault Origin Benchmark Response',
            timestamp,
            payload: 'Secure cloud file distribution latency measurement sample data.',
        });
    }
}
exports.CdnController = CdnController;
