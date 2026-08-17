import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SalesRecordAttributes {
  id: string;
  userId: string;
  amount: number;
  productName: string;
  date: Date;
}

export interface SalesRecordCreationAttributes extends Optional<SalesRecordAttributes, 'id'> {}

interface SalesRecord extends SalesRecordAttributes {}
class SalesRecord extends Model<SalesRecordAttributes, SalesRecordCreationAttributes> implements SalesRecordAttributes {}

SalesRecord.init(
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
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'SalesRecord',
    tableName: 'SalesRecords',
  }
);

export default SalesRecord;
