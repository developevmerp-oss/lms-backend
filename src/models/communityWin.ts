import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CommunityWinAttributes {
  id: string;
  studentName: string;
  achievement: string;
  likes: number;
  comments?: Array<{ author: string; text: string }>;
  timeAgo: string; // e.g., '2h ago' (could be computed from createdAt, but storing string is easier for UI initially)
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CommunityWinCreationAttributes extends Optional<CommunityWinAttributes, 'id' | 'likes' | 'comments'> {}

class CommunityWin extends Model<CommunityWinAttributes, CommunityWinCreationAttributes> implements CommunityWinAttributes {
  public id!: string;
  public studentName!: string;
  public achievement!: string;
  public likes!: number;
  public comments!: Array<{ author: string; text: string }>;
  public timeAgo!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CommunityWin.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    studentName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    achievement: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    comments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    timeAgo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'CommunityWin',
    tableName: 'CommunityWins',
  }
);

export default CommunityWin;
