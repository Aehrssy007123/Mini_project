"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class DbService {
    static dbPath = path_1.default.resolve(process.cwd(), '.storage', 'metadata_db.json');
    static cache = new Map();
    static isLoaded = false;
    static async ensureLoaded() {
        if (this.isLoaded)
            return;
        try {
            await promises_1.default.mkdir(path_1.default.dirname(this.dbPath), { recursive: true });
            const raw = await promises_1.default.readFile(this.dbPath, 'utf-8');
            const records = JSON.parse(raw);
            records.forEach((r) => this.cache.set(r.fileId, r));
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                console.error('Error loading metadata DB:', err);
            }
            this.cache.clear();
        }
        this.isLoaded = true;
    }
    static async persist() {
        try {
            await promises_1.default.mkdir(path_1.default.dirname(this.dbPath), { recursive: true });
            const records = Array.from(this.cache.values());
            await promises_1.default.writeFile(this.dbPath, JSON.stringify(records, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Error persisting metadata DB:', err);
        }
    }
    static async saveFileRecord(record) {
        await this.ensureLoaded();
        this.cache.set(record.fileId, record);
        await this.persist();
    }
    static async getFileRecord(fileId) {
        await this.ensureLoaded();
        return this.cache.get(fileId);
    }
    static async listFiles(userId) {
        await this.ensureLoaded();
        const list = Array.from(this.cache.values());
        if (userId) {
            return list.filter((f) => f.userId === userId);
        }
        return list;
    }
    static async deleteFileRecord(fileId) {
        await this.ensureLoaded();
        const deleted = this.cache.delete(fileId);
        if (deleted) {
            await this.persist();
        }
        return deleted;
    }
}
exports.DbService = DbService;
