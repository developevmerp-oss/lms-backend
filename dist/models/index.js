"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
const user_1 = __importDefault(require("./user"));
const course_1 = __importDefault(require("./course"));
const chapter_1 = __importDefault(require("./chapter"));
const assignment_1 = __importDefault(require("./assignment"));
const submission_1 = __importDefault(require("./submission"));
const reward_1 = __importDefault(require("./reward"));
const certificate_1 = __importDefault(require("./certificate"));
// New Gamification & Tracking Models
const skill_1 = __importDefault(require("./skill"));
const badge_1 = __importDefault(require("./badge"));
const userBadge_1 = __importDefault(require("./userBadge"));
const userCourse_1 = __importDefault(require("./userCourse"));
const portfolio_1 = __importDefault(require("./portfolio"));
const milestone_1 = __importDefault(require("./milestone"));
const salesRecord_1 = __importDefault(require("./salesRecord"));
const notification_1 = __importDefault(require("./notification"));
const communityWin_1 = __importDefault(require("./communityWin"));
const levelTier_1 = __importDefault(require("./levelTier"));
const db = {};
db.Sequelize = sequelize_1.Sequelize;
db.sequelize = database_1.sequelize;
// Add models to db object
db.User = user_1.default;
db.Course = course_1.default;
db.Chapter = chapter_1.default;
db.Assignment = assignment_1.default;
db.Submission = submission_1.default;
db.Reward = reward_1.default;
db.Certificate = certificate_1.default;
db.Skill = skill_1.default;
db.Badge = badge_1.default;
db.UserBadge = userBadge_1.default;
db.UserCourse = userCourse_1.default;
db.Portfolio = portfolio_1.default;
db.Milestone = milestone_1.default;
db.SalesRecord = salesRecord_1.default;
db.Notification = notification_1.default;
db.CommunityWin = communityWin_1.default;
db.LevelTier = levelTier_1.default;
// Setup manual associations that aren't defined in the classes
user_1.default.hasOne(skill_1.default, { foreignKey: 'userId', as: 'skills' });
skill_1.default.belongsTo(user_1.default, { foreignKey: 'userId' });
user_1.default.belongsToMany(badge_1.default, { through: userBadge_1.default, foreignKey: 'userId', as: 'badges' });
badge_1.default.belongsToMany(user_1.default, { through: userBadge_1.default, foreignKey: 'badgeId', as: 'users' });
user_1.default.belongsToMany(course_1.default, { through: userCourse_1.default, foreignKey: 'userId', as: 'courses' });
course_1.default.belongsToMany(user_1.default, { through: userCourse_1.default, foreignKey: 'courseId', as: 'users' });
user_1.default.hasMany(portfolio_1.default, { foreignKey: 'userId', as: 'portfolios' });
portfolio_1.default.belongsTo(user_1.default, { foreignKey: 'userId' });
user_1.default.hasMany(milestone_1.default, { foreignKey: 'userId', as: 'milestones' });
milestone_1.default.belongsTo(user_1.default, { foreignKey: 'userId' });
user_1.default.hasMany(salesRecord_1.default, { foreignKey: 'userId', as: 'salesRecords' });
salesRecord_1.default.belongsTo(user_1.default, { foreignKey: 'userId' });
user_1.default.hasMany(notification_1.default, { foreignKey: 'userId', as: 'notifications' });
notification_1.default.belongsTo(user_1.default, { foreignKey: 'userId', as: 'user' });
// Setup associations
Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
        db[modelName].associate(db);
    }
});
exports.default = db;
