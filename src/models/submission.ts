import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user';
import Assignment from './assignment';

export interface SubmissionAttributes {
  id: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  studentId: string;
  assignmentId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubmissionCreationAttributes extends Optional<SubmissionAttributes, 'id' | 'status' | 'pointsAwarded'> {}


interface Submission extends SubmissionAttributes {
  id: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  pointsAwarded: number;
  studentId: string;
  assignmentId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Submission extends Model<SubmissionAttributes, SubmissionCreationAttributes> implements SubmissionAttributes {
}

Submission.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
    },
    pointsAwarded: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    assignmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Assignments',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
  },
  {
    sequelize,
    modelName: 'Submission',
    tableName: 'Submissions',
  }
);

// Define Associations
User.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

export default Submission;
