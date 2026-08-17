import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Course from './course';

export interface AssignmentAttributes {
  id: string;
  title: string;
  description: string;
  points: number;
  dueDate: Date;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AssignmentCreationAttributes extends Optional<AssignmentAttributes, 'id'> {}


interface Assignment extends AssignmentAttributes {
  id: string;
  title: string;
  description: string;
  points: number;
  dueDate: Date;
  courseId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Assignment extends Model<AssignmentAttributes, AssignmentCreationAttributes> implements AssignmentAttributes {
}

Assignment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
  },
  {
    sequelize,
    modelName: 'Assignment',
    tableName: 'Assignments',
  }
);

// Define Association
Course.hasMany(Assignment, { foreignKey: 'courseId', as: 'assignments' });
Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

export default Assignment;
