import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'student';
  points: number; // Legacy points, transitioning to xpPoints
  streak: number;
  
  // North Star Dash Additions
  membershipLevel?: 'GENERAL' | 'L0' | 'L1' | 'L2' | 'L3' | string;
  rank?: string;
  xpPoints?: number;
  city?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  lastRoutineDate?: string;
  lastLoginAt?: Date | null;
  activeDaysHistory?: string[];
  membershipExpiresAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'points' | 'streak'> {}

interface User extends UserAttributes {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {}

User.init(
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
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'student',
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    streak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    membershipLevel: {
      type: DataTypes.STRING,
      defaultValue: 'GENERAL',
    },
    rank: {
      type: DataTypes.STRING,
      defaultValue: 'General Member',
    },
    xpPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastRoutineDate: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    activeDaysHistory: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    membershipExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
  }
);

export default User;
