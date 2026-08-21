import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface WebinarRegistrationAttributes {
  id: string;
  name: string;
  email: string;
  phone: string;
  challenge?: string;
  source?: string;
  attended?: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebinarRegistrationCreationAttributes
  extends Optional<WebinarRegistrationAttributes, 'id' | 'challenge' | 'source' | 'attended' | 'notes'> {}

interface WebinarRegistration extends WebinarRegistrationAttributes {}
class WebinarRegistration
  extends Model<WebinarRegistrationAttributes, WebinarRegistrationCreationAttributes>
  implements WebinarRegistrationAttributes {}

WebinarRegistration.init(
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
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    challenge: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING,
      defaultValue: 'organic',
    },
    attended: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'WebinarRegistration',
    tableName: 'WebinarRegistrations',
  }
);

export default WebinarRegistration;
