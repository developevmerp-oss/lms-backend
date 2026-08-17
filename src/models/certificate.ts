import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user';
import Course from './course';

export interface CertificateAttributes {
  id: string;
  title: string;
  certificateUrl: string;
  studentId: string;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CertificateCreationAttributes extends Optional<CertificateAttributes, 'id'> {}


interface Certificate extends CertificateAttributes {
  id: string;
  title: string;
  certificateUrl: string;
  studentId: string;
  courseId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Certificate extends Model<CertificateAttributes, CertificateCreationAttributes> implements CertificateAttributes {
}

Certificate.init(
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
    certificateUrl: {
      type: DataTypes.STRING,
      allowNull: false,
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
    modelName: 'Certificate',
    tableName: 'Certificates',
  }
);

// Associations
User.hasMany(Certificate, { foreignKey: 'studentId', as: 'certificates' });
Certificate.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

Course.hasMany(Certificate, { foreignKey: 'courseId', as: 'certificates' });
Certificate.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

export default Certificate;
