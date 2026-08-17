import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserBadgeAttributes {
  id: string;
  userId: string;
  badgeId: string;
  awardedAt?: Date;
}

export interface UserBadgeCreationAttributes extends Optional<UserBadgeAttributes, 'id' | 'awardedAt'> {}

interface UserBadge extends UserBadgeAttributes {}
class UserBadge extends Model<UserBadgeAttributes, UserBadgeCreationAttributes> implements UserBadgeAttributes {}

UserBadge.init(
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
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    awardedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    }
  },
  {
    sequelize,
    modelName: 'UserBadge',
    tableName: 'UserBadges',
  }
);

export default UserBadge;
