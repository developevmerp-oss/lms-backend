import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SkillAttributes {
  id: string;
  userId: string;
  resinBasics: number;
  mixing: number;
  colourTheory: number;
  finishing: number;
  creativity: number;
  professionalQuality: number;
}

export interface SkillCreationAttributes extends Optional<SkillAttributes, 'id'> {}

interface Skill extends SkillAttributes {}

class Skill extends Model<SkillAttributes, SkillCreationAttributes> implements SkillAttributes {}

Skill.init(
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
    resinBasics: { type: DataTypes.INTEGER, defaultValue: 0 },
    mixing: { type: DataTypes.INTEGER, defaultValue: 0 },
    colourTheory: { type: DataTypes.INTEGER, defaultValue: 0 },
    finishing: { type: DataTypes.INTEGER, defaultValue: 0 },
    creativity: { type: DataTypes.INTEGER, defaultValue: 0 },
    professionalQuality: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    sequelize,
    modelName: 'Skill',
    tableName: 'Skills',
  }
);

export default Skill;
