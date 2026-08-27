import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface NotificationAttributes {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string; // 'info' | 'alert' | 'offer' | 'event' | 'webinar'
  link?: string;
  targetAudience?: string; // 'all' | 'L0' | 'L1' | 'L2' | 'L3' | 'webinar'
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | 'isRead'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
  public id!: string;
  public userId!: string;
  public title!: string;
  public message!: string;
  public isRead!: boolean;
  public type!: string;
  public link!: string;
  public targetAudience!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Notification.init(
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
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'info',
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetAudience: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'all',
    },
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'Notifications',
  }
);

export default Notification;
