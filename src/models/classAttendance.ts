import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface ClassAttendanceAttributes {
  id: string;
  classId: string;
  userId: string;
  joinedAt: Date;
  attended: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClassAttendanceCreationAttributes
  extends Optional<ClassAttendanceAttributes, 'id' | 'joinedAt' | 'attended' | 'notes'> {}

class ClassAttendance
  extends Model<ClassAttendanceAttributes, ClassAttendanceCreationAttributes>
  implements ClassAttendanceAttributes {
  public id!: string;
  public classId!: string;
  public userId!: string;
  public joinedAt!: Date;
  public attended!: boolean;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ClassAttendance.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    classId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'ClassAttendance',
    tableName: 'ClassAttendances',
  }
);

export default ClassAttendance;
