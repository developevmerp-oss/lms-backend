"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const course_1 = __importDefault(require("./course"));
class Chapter extends sequelize_1.Model {
}
Chapter.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    videoUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    pdfUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    courseId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Courses',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'Chapter',
    tableName: 'Chapters',
});
// Define Association
course_1.default.hasMany(Chapter, { foreignKey: 'courseId', as: 'chapters' });
Chapter.belongsTo(course_1.default, { foreignKey: 'courseId', as: 'course' });
exports.default = Chapter;
