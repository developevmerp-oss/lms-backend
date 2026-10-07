import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface StudentInstallmentPlanAttributes {
  id: string;
  userId: string;
  tierCode: string;
  tierName?: string;
  planId?: string;
  planName: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | '2months' | '3months' | '6months' | string;
  installmentAmount: number;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  lastPaidDate?: Date;
  nextDueDate?: Date | null;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  lastReminderSentAt?: Date | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StudentInstallmentPlanCreationAttributes
  extends Optional<
    StudentInstallmentPlanAttributes,
    'id' | 'planId' | 'tierName' | 'paidInstallments' | 'lastPaidDate' | 'nextDueDate' | 'status' | 'lastReminderSentAt' | 'notes'
  > {}

class StudentInstallmentPlan
  extends Model<StudentInstallmentPlanAttributes, StudentInstallmentPlanCreationAttributes>
  implements StudentInstallmentPlanAttributes
{
  public id!: string;
  public userId!: string;
  public tierCode!: string;
  public tierName?: string;
  public planId?: string;
  public planName!: string;
  public frequency!: string;
  public installmentAmount!: number;
  public totalAmount!: number;
  public totalInstallments!: number;
  public paidInstallments!: number;
  public lastPaidDate?: Date;
  public nextDueDate?: Date | null;
  public status!: 'active' | 'completed' | 'overdue' | 'cancelled';
  public lastReminderSentAt?: Date | null;
  public notes?: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentInstallmentPlan.init(
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
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    tierCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'L3',
    },
    tierName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Renaissance Certification',
    },
    planId: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    planName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    frequency: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'monthly',
    },
    installmentAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    totalInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    paidInstallments: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    lastPaidDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    nextDueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
    },
    lastReminderSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'StudentInstallmentPlan',
    tableName: 'StudentInstallmentPlans',
  }
);

export default StudentInstallmentPlan;
