import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface LiveClassAttributes {
  id: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl?: string;
  recordingUrl?: string;
  targetLevel: string; // 'All' | 'L0' | 'L1' | 'L2' | 'L3'
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  instructor: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LiveClassCreationAttributes
  extends Optional<
    LiveClassAttributes,
    'id' | 'description' | 'durationMinutes' | 'meetingUrl' | 'recordingUrl' | 'targetLevel' | 'status' | 'instructor'
  > {}

class LiveClass extends Model<LiveClassAttributes, LiveClassCreationAttributes> implements LiveClassAttributes {
  public id!: string;
  public title!: string;
  public description?: string;
  public scheduledAt!: Date;
  public durationMinutes!: number;
  public meetingUrl?: string;
  public recordingUrl?: string;
  public targetLevel!: string;
  public status!: 'upcoming' | 'live' | 'completed' | 'cancelled';
  public instructor!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LiveClass.init(
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
      defaultValue: 'Weekly Resin Masterclass & Live Q&A',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
    },
    meetingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recordingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetLevel: {
      type: DataTypes.STRING,
      defaultValue: 'All',
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'upcoming',
    },
    instructor: {
      type: DataTypes.STRING,
      defaultValue: 'Vrajangna Patel',
    },
  },
  {
    sequelize,
    modelName: 'LiveClass',
    tableName: 'LiveClasses',
  }
);

export default LiveClass;
