import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MarketingTrackingSettingAttributes {
  id: string;
  platform: string; // 'META', 'GOOGLE_ANALYTICS', 'GOOGLE_ADS', 'TIKTOK', 'LINKEDIN'
  pixelId?: string;
  enabled: boolean;
  trackPageView: boolean;
  trackViewContent: boolean;
  trackLead: boolean;
  trackRegistration: boolean;
  trackContact: boolean;
  trackBooking: boolean;
  trackCheckout: boolean;
  trackPurchase: boolean;
  customData?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MarketingTrackingSettingCreationAttributes
  extends Optional<MarketingTrackingSettingAttributes, 'id' | 'pixelId' | 'customData'> {}

export class MarketingTrackingSetting
  extends Model<MarketingTrackingSettingAttributes, MarketingTrackingSettingCreationAttributes>
  implements MarketingTrackingSettingAttributes
{
  public id!: string;
  public platform!: string;
  public pixelId?: string;
  public enabled!: boolean;
  public trackPageView!: boolean;
  public trackViewContent!: boolean;
  public trackLead!: boolean;
  public trackRegistration!: boolean;
  public trackContact!: boolean;
  public trackBooking!: boolean;
  public trackCheckout!: boolean;
  public trackPurchase!: boolean;
  public customData?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MarketingTrackingSetting.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      defaultValue: 'META',
    },
    pixelId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: '',
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    trackPageView: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackViewContent: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackLead: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackRegistration: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackContact: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackBooking: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackCheckout: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    trackPurchase: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    customData: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    sequelize,
    tableName: 'marketing_tracking_settings',
    timestamps: true,
  }
);

export default MarketingTrackingSetting;
