import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface WebinarEventAttributes {
  id: string;
  title: string;
  description?: string;
  scheduledAt: Date;
  durationMinutes: number;
  zoomJoinUrl?: string;
  whatsappGroupUrl?: string;
  prepVideoUrl?: string;
  totalSeats: number;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebinarEventCreationAttributes
  extends Optional<
    WebinarEventAttributes,
    'id' | 'description' | 'durationMinutes' | 'zoomJoinUrl' | 'whatsappGroupUrl' | 'prepVideoUrl' | 'totalSeats' | 'status' | 'isActive'
  > {}

interface WebinarEvent extends WebinarEventAttributes {}
class WebinarEvent
  extends Model<WebinarEventAttributes, WebinarEventCreationAttributes>
  implements WebinarEventAttributes {}

WebinarEvent.init(
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
      defaultValue: 'Resin Mastery Masterclass — Live with Vrajangna Patel',
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
      defaultValue: 90,
    },
    zoomJoinUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    whatsappGroupUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    prepVideoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    totalSeats: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'upcoming',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: 'WebinarEvent',
    tableName: 'WebinarEvents',
  }
);

export default WebinarEvent;
