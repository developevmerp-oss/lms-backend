import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CourseAttributes {
  id: string;
  title: string;
  description: string;
  image?: string;
  levelCode?: string; // 'L0' | 'L1' | 'L2' | 'L3' | 'L3+'
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CourseCreationAttributes extends Optional<CourseAttributes, 'id'> {}

interface Course extends CourseAttributes {
  id: string;
  title: string;
  description: string;
  image: string;
  levelCode: string;
  order: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {}

Course.init(
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
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    levelCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'L0',
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Course',
    tableName: 'Courses',
  }
);

export default Course;
