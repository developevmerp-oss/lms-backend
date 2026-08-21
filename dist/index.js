"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const keepAlive_1 = require("./config/keepAlive");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// ── Robust CORS configuration ──
// Browsers block credentials: true with wildcard '*'. We dynamically allow the request origin.
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, server-to-server) or any matching domain
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 204
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
// ── Health endpoint (must be before auth middleware) ──
app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'LMS Backend is running', ts: Date.now() });
});
app.use('/api', routes_1.default);
const autoMigrate_1 = require("./config/autoMigrate");
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    // Start HTTP listener immediately so server is instantly ready
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        (0, keepAlive_1.startKeepAlive)();
    });
    try {
        yield database_1.sequelize.authenticate();
        console.log('✅ Database connected');
        // Run safe auto-migrations for missing columns and large data types
        yield (0, autoMigrate_1.runAutoMigrations)(database_1.sequelize);
        console.log('✅ Ready to serve requests');
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});
startServer();
