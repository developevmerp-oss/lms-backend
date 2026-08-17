"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const models_1 = __importDefault(require("./models"));
dotenv_1.default.config();
const { Reward } = models_1.default;
const seedRewards = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield database_1.sequelize.authenticate();
        yield database_1.sequelize.sync({ alter: true });
        // Clear existing rewards
        yield Reward.destroy({ where: {} });
        yield Reward.bulkCreate([
            {
                title: 'Digital Resin Formula Guide',
                description: 'Exclusive 20-page PDF on mastering colours and pigments.',
                pointCost: 500,
                imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop'
            },
            {
                title: '1-on-1 Portfolio Review',
                description: '30-minute private session with a lead mentor to review your art.',
                pointCost: 2000,
                imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop'
            },
            {
                title: '10% Discount Coupon',
                description: 'Get 10% off on your next resin supply purchase from our partner store.',
                pointCost: 1000,
                imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop'
            },
            {
                title: 'Branded Success Kit',
                description: 'Physical kit including affirmation mug, journal, pen, and published book.',
                pointCost: 5000,
                imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=2574&auto=format&fit=crop'
            }
        ]);
        console.log('Rewards seeded successfully!');
        process.exit(0);
    }
    catch (error) {
        console.error('Error seeding rewards:', error);
        process.exit(1);
    }
});
seedRewards();
