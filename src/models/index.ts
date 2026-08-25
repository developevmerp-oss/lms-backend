import { Sequelize } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user';
import Course from './course';
import Chapter from './chapter';
import Assignment from './assignment';
import Submission from './submission';
import Reward from './reward';
import Certificate from './certificate';

// New Gamification & Tracking Models
import Skill from './skill';
import Badge from './badge';
import UserBadge from './userBadge';
import UserCourse from './userCourse';
import Portfolio from './portfolio';
import Milestone from './milestone';
import SalesRecord from './salesRecord';
import Notification from './notification';
import CommunityWin from './communityWin';
import LevelTier from './levelTier';
import WebinarRegistration from './webinarRegistration';
import WebinarEvent from './webinarEvent';
import LiveClass from './liveClass';
import ClassAttendance from './classAttendance';

const db: any = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Add models to db object
db.User = User;
db.Course = Course;
db.Chapter = Chapter;
db.Assignment = Assignment;
db.Submission = Submission;
db.Reward = Reward;
db.Certificate = Certificate;

db.Skill = Skill;
db.Badge = Badge;
db.UserBadge = UserBadge;
db.UserCourse = UserCourse;
db.Portfolio = Portfolio;
db.Milestone = Milestone;
db.SalesRecord = SalesRecord;
db.Notification = Notification;
db.CommunityWin = CommunityWin;
db.LevelTier = LevelTier;
db.WebinarRegistration = WebinarRegistration;
db.WebinarEvent = WebinarEvent;
db.LiveClass = LiveClass;
db.ClassAttendance = ClassAttendance;

// Setup manual associations
User.hasOne(Skill, { foreignKey: 'userId', as: 'skills' });
Skill.belongsTo(User, { foreignKey: 'userId' });

User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'userId', as: 'badges' });
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badgeId', as: 'users' });

User.belongsToMany(Course, { through: UserCourse, foreignKey: 'userId', as: 'courses' });
Course.belongsToMany(User, { through: UserCourse, foreignKey: 'courseId', as: 'users' });

User.hasMany(Portfolio, { foreignKey: 'userId', as: 'portfolios' });
Portfolio.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Milestone, { foreignKey: 'userId', as: 'milestones' });
Milestone.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(SalesRecord, { foreignKey: 'userId', as: 'salesRecords' });
SalesRecord.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Webinar associations
WebinarEvent.hasMany(WebinarRegistration, { foreignKey: 'webinarEventId', as: 'registrations' });
WebinarRegistration.belongsTo(WebinarEvent, { foreignKey: 'webinarEventId', as: 'webinarEvent' });

// Live Class & Attendance associations
LiveClass.hasMany(ClassAttendance, { foreignKey: 'classId', as: 'attendances' });
ClassAttendance.belongsTo(LiveClass, { foreignKey: 'classId', as: 'class' });

User.hasMany(ClassAttendance, { foreignKey: 'userId', as: 'classAttendances' });
ClassAttendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Setup associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

export default db;
