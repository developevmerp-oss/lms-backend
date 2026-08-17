"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class CommunityWin extends sequelize_1.Model {
}
CommunityWin.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    studentName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    achievement: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    likes: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    comments: {
        type: sequelize_1.DataTypes.JSON,
        defaultValue: [],
    },
    timeAgo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'CommunityWin',
    tableName: 'CommunityWins',
});
exports.default = CommunityWin;
