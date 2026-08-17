import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BadgeAttributes {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  pointsRequired?: number;
}

export interface BadgeCreationAttributes extends Optional<BadgeAttributes, 'id'> {}

interface Badge extends BadgeAttributes {}
class Badge extends Model<BadgeAttributes, BadgeCreationAttributes> implements BadgeAttributes {}

Badge.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pointsRequired: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Badge',
    tableName: 'Badges',
  }
);

export default Badge;
