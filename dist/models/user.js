"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class User extends sequelize_1.Model {
}
User.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('admin', 'student'),
        defaultValue: 'student',
        allowNull: false,
    },
    points: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    streak: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    membershipLevel: {
        type: sequelize_1.DataTypes.ENUM('L0', 'L1', 'L2', 'L3'),
        defaultValue: 'L0',
    },
    rank: {
        type: sequelize_1.DataTypes.STRING,
        defaultValue: 'Beginner',
    },
    xpPoints: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    city: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    bio: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    avatarUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'User',
    tableName: 'Users',
});
exports.default = User;
