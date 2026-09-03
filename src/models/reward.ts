import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RewardAttributes {
  id: string;
  title: string;
  description: string;
  pointCost: number;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RewardCreationAttributes extends Optional<RewardAttributes, 'id'> {}

interface Reward extends RewardAttributes {
  id: string;
  title: string;
  description: string;
  pointCost: number;
  imageUrl: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class Reward extends Model<RewardAttributes, RewardCreationAttributes> implements RewardAttributes {}

Reward.init(
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
    pointCost: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Reward',
    tableName: 'Rewards',
  }
);

export default Reward;
