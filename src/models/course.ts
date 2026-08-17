import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CourseAttributes {
  id: string;
  title: string;
  description: string;
  image?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CourseCreationAttributes extends Optional<CourseAttributes, 'id'> {}


interface Course extends CourseAttributes {
  id: string;
  title: string;
  description: string;
  image: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {
}

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
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Course',
    tableName: 'Courses',
  }
);

export default Course;
