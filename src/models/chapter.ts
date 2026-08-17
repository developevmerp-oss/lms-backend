import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import Course from './course';

export interface ChapterAttributes {
  id: string;
  title: string;
  videoUrl?: string;
  pdfUrl?: string;
  courseId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChapterCreationAttributes extends Optional<ChapterAttributes, 'id'> {}


interface Chapter extends ChapterAttributes {
  id: string;
  title: string;
  videoUrl: string;
  pdfUrl: string;
  courseId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Chapter extends Model<ChapterAttributes, ChapterCreationAttributes> implements ChapterAttributes {
}

Chapter.init(
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
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pdfUrl: {
      type: DataTypes.STRING,
      allowNull: true,
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
    modelName: 'Chapter',
    tableName: 'Chapters',
  }
);

// Define Association
Course.hasMany(Chapter, { foreignKey: 'courseId', as: 'chapters' });
Chapter.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

export default Chapter;
