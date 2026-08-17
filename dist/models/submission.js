"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const user_1 = __importDefault(require("./user"));
const assignment_1 = __importDefault(require("./assignment"));
class Submission extends sequelize_1.Model {
}
Submission.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    fileUrl: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
    },
    pointsAwarded: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
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
    assignmentId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Assignments',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'Submission',
    tableName: 'Submissions',
});
// Define Associations
user_1.default.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
Submission.belongsTo(user_1.default, { foreignKey: 'studentId', as: 'student' });
assignment_1.default.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(assignment_1.default, { foreignKey: 'assignmentId', as: 'assignment' });
exports.default = Submission;
