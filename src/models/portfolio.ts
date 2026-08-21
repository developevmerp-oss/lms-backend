import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PortfolioAttributes {
  id: string;
  userId: string;
  title: string;
  technique: string;
  imageUrl: string;
  feedback?: string;
  mentorName?: string;
  createdAt?: Date;
}

export interface PortfolioCreationAttributes extends Optional<PortfolioAttributes, 'id' | 'createdAt'> {}

interface Portfolio extends PortfolioAttributes {
  readonly createdAt: Date;
}
class Portfolio extends Model<PortfolioAttributes, PortfolioCreationAttributes> implements PortfolioAttributes {}

Portfolio.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    technique: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mentorName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Portfolio',
    tableName: 'Portfolios',
  }
);

export default Portfolio;
