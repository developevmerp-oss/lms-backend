import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PaymentTransactionAttributes {
  id: string;
  orderId: string;
  paymentId?: string | null;
  signature?: string | null;
  userId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  tierCode: string;
  tierName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  failureReason?: string | null;
  paymentMethod?: string | null;
  paidAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PaymentTransactionCreationAttributes
  extends Optional<
    PaymentTransactionAttributes,
    | 'id'
    | 'paymentId'
    | 'signature'
    | 'userId'
    | 'customerName'
    | 'customerEmail'
    | 'customerPhone'
    | 'failureReason'
    | 'paymentMethod'
    | 'paidAt'
    | 'createdAt'
    | 'updatedAt'
  > {}

class PaymentTransaction
  extends Model<PaymentTransactionAttributes, PaymentTransactionCreationAttributes>
  implements PaymentTransactionAttributes {
  public id!: string;
  public orderId!: string;
  public paymentId!: string | null;
  public signature!: string | null;
  public userId!: string | null;
  public customerName!: string | null;
  public customerEmail!: string | null;
  public customerPhone!: string | null;
  public tierCode!: string;
  public tierName!: string;
  public amount!: number;
  public currency!: string;
  public status!: 'pending' | 'completed' | 'failed' | 'cancelled';
  public failureReason!: string | null;
  public paymentMethod!: string | null;
  public paidAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PaymentTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tierCode: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    tierName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'INR',
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PaymentTransaction',
    tableName: 'PaymentTransactions',
    timestamps: true,
  }
);

export default PaymentTransaction;
