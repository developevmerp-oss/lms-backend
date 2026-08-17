"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbUrl = process.env.DATABASE_URL || 'postgres://root:rootpassword@localhost:5432/art_lms_db';
const isProduction = process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech'));
exports.sequelize = new sequelize_1.Sequelize(dbUrl, Object.assign({ dialect: 'postgres', logging: false }, (isProduction ? {
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
} : {})));
