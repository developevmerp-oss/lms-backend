"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const user_1 = __importDefault(require("./user"));
const course_1 = __importDefault(require("./course"));
class Certificate extends sequelize_1.Model {
}
Certificate.init({
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
    certificateUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    studentId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        },
        onDelete: 'CASCADE'
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
    modelName: 'Certificate',
    tableName: 'Certificates',
});
// Associations
user_1.default.hasMany(Certificate, { foreignKey: 'studentId', as: 'certificates' });
Certificate.belongsTo(user_1.default, { foreignKey: 'studentId', as: 'student' });
course_1.default.hasMany(Certificate, { foreignKey: 'courseId', as: 'certificates' });
Certificate.belongsTo(course_1.default, { foreignKey: 'courseId', as: 'course' });
exports.default = Certificate;
