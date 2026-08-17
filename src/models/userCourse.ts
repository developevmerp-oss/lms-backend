import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserCourseAttributes {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status: 'locked' | 'enrolled' | 'completed';
}

export interface UserCourseCreationAttributes extends Optional<UserCourseAttributes, 'id' | 'progress' | 'status'> {}

interface UserCourse extends UserCourseAttributes {}
class UserCourse extends Model<UserCourseAttributes, UserCourseCreationAttributes> implements UserCourseAttributes {}

UserCourse.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('locked', 'enrolled', 'completed'),
      defaultValue: 'locked',
    },
  },
  {
    sequelize,
    modelName: 'UserCourse',
    tableName: 'UserCourses',
  }
);

export default UserCourse;
