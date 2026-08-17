"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
class UserCourse extends sequelize_1.Model {
}
UserCourse.init({
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
    courseId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    progress: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('locked', 'enrolled', 'completed'),
        defaultValue: 'locked',
    },
}, {
    sequelize: database_1.sequelize,
    modelName: 'UserCourse',
    tableName: 'UserCourses',
});
exports.default = UserCourse;
