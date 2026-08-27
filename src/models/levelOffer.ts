import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface LevelOfferAttributes {
  id: string;
  title: string;
  levelCode: string; // 'L0' | 'L1' | 'L2' | 'L3' | 'all'
  discountType: 'percentage' | 'flat' | string;
  discountValue: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive: boolean;
  bannerText?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LevelOfferCreationAttributes extends Optional<LevelOfferAttributes, 'id' | 'startDate' | 'endDate' | 'bannerText' | 'isActive'> {}

class LevelOffer extends Model<LevelOfferAttributes, LevelOfferCreationAttributes> implements LevelOfferAttributes {
  public id!: string;
  public title!: string;
  public levelCode!: string;
  public discountType!: string;
  public discountValue!: number;
  public startDate?: Date | null;
  public endDate?: Date | null;
  public isActive!: boolean;
  public bannerText?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LevelOffer.init(
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
    levelCode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'L1',
    },
    discountType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'percentage',
    },
    discountValue: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    bannerText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LevelOffer',
    tableName: 'LevelOffers',
  }
);

export default LevelOffer;
