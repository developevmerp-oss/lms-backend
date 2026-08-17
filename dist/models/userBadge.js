"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class UserBadge extends sequelize_1.Model {
}
UserBadge.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    badgeId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    awardedAt: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
    }
}, {
    sequelize: database_1.sequelize,
    modelName: 'UserBadge',
    tableName: 'UserBadges',
});
exports.default = UserBadge;
