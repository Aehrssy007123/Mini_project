"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const api_routes_1 = __importDefault(require("./routes/api.routes"));
// Load environment variables from root or server folder
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Security Headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Let frontend handle CSP or adjust for development
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or dev proxy)
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            callback(null, true);
        }
        else {
            callback(null, true);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
}));
// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('dev'));
}
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);
// Body Parsers
app.use(express_1.default.json({ limit: '15mb' }));
app.use(express_1.default.raw({ type: 'application/octet-stream', limit: '15mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '15mb' }));
// API Routes
app.use('/api', api_routes_1.default);
// Root Welcome Route
app.get('/', (req, res) => {
    res.json({
        name: 'SecureVault Cloud API',
        version: '1.0.0',
        description: 'Secure Cloud File Storage & Distribution Engine',
        documentation: '/api/health',
    });
});
// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});
// Central Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Error]:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
});
// Start Server
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(` SecureVault Cloud API Server Running`);
        console.log(` Port: ${PORT}`);
        console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(` Storage Provider: ${process.env.STORAGE_PROVIDER || 'local'}`);
        console.log(` AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
        console.log(` Frontend URL: ${FRONTEND_URL}`);
        console.log(`=======================================================`);
    });
}
exports.default = app;
