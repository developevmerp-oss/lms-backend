"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class Skill extends sequelize_1.Model {
}
Skill.init({
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
    resinBasics: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    mixing: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    colourTheory: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    finishing: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    creativity: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    professionalQuality: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
}, {
    sequelize: database_1.sequelize,
    modelName: 'Skill',
    tableName: 'Skills',
});
exports.default = Skill;
