import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface LevelTierAttributes {
  id: string;
  code: string; // e.g. 'L0', 'L1', 'L2', 'L3', 'L3+'
  name: string; // e.g. 'Fast Track', 'Silver Member', 'Gold Member', 'Diamond Club', 'Masters Club'
  price?: string; // e.g. '₹499', '₹4,999', '₹19,999', '₹59,999'
  minPoints?: number;
  maxPoints?: number | null;
  icon: string; // e.g. '⚡', '🥈', '🏆', '💎', '👑'
  badgeColor: string; // e.g. 'emerald', 'slate', 'amber', 'cyan', 'purple'
  order: number;
  description?: string;
  category?: string; // e.g. 'Starter', 'Intermediate', 'Advanced', 'Business Scaling'
  validityDays?: number | null; // 0 = Lifetime
  isPublished?: boolean;
  discountType?: 'percentage' | 'flat' | string | null;
  discountValue?: number | null;
  offerStartDate?: Date | string | null;
  offerEndDate?: Date | string | null;
  offerActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LevelTierCreationAttributes extends Optional<LevelTierAttributes, 'id' | 'maxPoints' | 'description' | 'price' | 'minPoints'> {}

class LevelTier extends Model<LevelTierAttributes, LevelTierCreationAttributes> implements LevelTierAttributes {
  public id!: string;
  public code!: string;
  public name!: string;
  public price?: string;
  public minPoints?: number;
  public maxPoints?: number | null;
  public icon!: string;
  public badgeColor!: string;
  public order!: number;
  public description?: string;
  public category?: string;
  public validityDays?: number | null;
  public isPublished?: boolean;
  public discountType?: string | null;
  public discountValue?: number | null;
  public offerStartDate?: Date | null;
  public offerEndDate?: Date | null;
  public offerActive?: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LevelTier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '₹499',
    },
    minPoints: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    maxPoints: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '⚡',
    },
    badgeColor: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'emerald',
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'General',
    },
    validityDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0, // 0 = Lifetime
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    discountType: {
      type: DataTypes.STRING,
      allowNull: true, // 'percentage' | 'flat'
    },
    discountValue: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0,
    },
    offerStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    offerEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    offerActive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'LevelTier',
    tableName: 'LevelTiers',
  }
);

export default LevelTier;
