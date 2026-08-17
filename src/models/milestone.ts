import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MilestoneAttributes {
  id: string;
  userId: string;
  name: string;
  completed: boolean;
  completedAt?: Date;
  order: number;
}

export interface MilestoneCreationAttributes extends Optional<MilestoneAttributes, 'id' | 'completed' | 'completedAt' | 'order'> {}

interface Milestone extends MilestoneAttributes {}
class Milestone extends Model<MilestoneAttributes, MilestoneCreationAttributes> implements MilestoneAttributes {}

Milestone.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
  },
  {
    sequelize,
    modelName: 'Milestone',
    tableName: 'Milestones',
  }
);

export default Milestone;
