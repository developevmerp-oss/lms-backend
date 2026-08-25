import { Request, Response } from 'express';
import db from '../models';
import { sequelize } from '../config/database';

const { Course, Chapter, Assignment } = db;

export const DEFAULT_CURRICULUM_COURSES = [
  // L0 - Fast Track (Offer Price: ₹499)
  {
    levelCode: 'L0',
    order: 1,
    title: '1. Resin Fundamentals',
    description: 'Introduction to epoxy resin, safety protocols, PPE, curing times, and essential toolkit setup.'
  },
  {
    levelCode: 'L0',
    order: 2,
    title: '2. The Right Approach to Resin Art',
    description: 'Core pouring principles, avoiding bubbles, humidity control, and foundational finishing techniques.'
  },
  {
    levelCode: 'L0',
    order: 3,
    title: '3. Student Success Stories & Their Roadmap Ahead',
    description: 'Real case studies of successful artist journeys, career paths, and milestone roadmaps.'
  },

  // L1 - Silver Member (Offer Price: ₹4,999)
  {
    levelCode: 'L1',
    order: 1,
    title: '1. Coasters, Fridge Magnets, Keychains',
    description: 'Small format cast pouring, glitter suspension, silicone molding, and hardware attachment.'
  },
  {
    levelCode: 'L1',
    order: 2,
    title: '2. Marbling Technique',
    description: 'Creating organic marble veins, alcohol ink blending, and contrasting color swirl patterns.'
  },
  {
    levelCode: 'L1',
    order: 3,
    title: '3. Evil Eye / Iris',
    description: 'Concentric color ring manipulation, pigment saturation, and high-gloss protective topcoats.'
  },
  {
    levelCode: 'L1',
    order: 4,
    title: '4. Lotus Pond',
    description: 'Multi-layer 3D depth effects, floating flora embedment, and crystalline water simulation.'
  },
  {
    levelCode: 'L1',
    order: 5,
    title: '5. Beach Theme',
    description: 'Cell lacing, heat gun wave manipulation, realistic sand texture, and ocean gradients.'
  },

  // L2 - Gold Member (Offer Price: ₹19,999)
  {
    levelCode: 'L2',
    order: 1,
    title: '1. Geode Art',
    description: 'Crystal cluster integration, metallic gilding line work, and multi-tone geode structures.'
  },
  {
    levelCode: 'L2',
    order: 2,
    title: '2. Vein Effect',
    description: 'Fine-line pigment dispersal, natural stone simulation, and high-gloss depth layering.'
  },
  {
    levelCode: 'L2',
    order: 3,
    title: '3. Tree of Life Clock',
    description: 'Wood base preparation, clock mechanism installation, wire tree embedment, and gold leaf accents.'
  },
  {
    levelCode: 'L2',
    order: 4,
    title: '4. Beach Theme in Depth with 3D Ripples and Waves',
    description: 'Advanced multi-layer resin sea spray, 3D shoreline ripples, and realistic foam dynamics.'
  },

  // L3 - Diamond Club (Offer Price: ₹59,999)
  {
    levelCode: 'L3',
    order: 1,
    title: '1. 3D Photo Resin Art',
    description: 'Preserving heirloom photographs, sealing against ink bleeding, and crystal dome encapsulation.'
  },
  {
    levelCode: 'L3',
    order: 2,
    title: '2. Wood and Resin Tables',
    description: 'Live edge slab woodworking, leak-proof barrier molds, deep pour resin casting, and flat surfacing.'
  },
  {
    levelCode: 'L3',
    order: 3,
    title: '3. Resin Jewellery',
    description: 'UV resin curing, bezel fabrication, micro-botanical preservation, and commercial jewelry finishing.'
  },
  {
    levelCode: 'L3',
    order: 4,
    title: '4. Chiffon Technique',
    description: 'Flowing fabric-like resin drapery, ultra-thin color layering, and delicate translucent folds.'
  },
  {
    levelCode: 'L3',
    order: 5,
    title: '5. Pebble Effect',
    description: 'Natural stone mosaic embedding, underwater optical illusion, and high-impact textural pours.'
  },
  {
    levelCode: 'L3',
    order: 6,
    title: '6. Varmala Preservation',
    description: 'Preserving wedding garlands, silica gel flower drying, anti-yellowing resin chemistry, and custom block casting.'
  },
  {
    levelCode: 'L3',
    order: 7,
    title: '7. Labradorite',
    description: 'Iridescent optical flash simulation, mineral pigment layering, and dark crystal matrix effects.'
  },
  {
    levelCode: 'L3',
    order: 8,
    title: '8. Galaxy Theme',
    description: 'Deep cosmic nebula swirls, holographic micro-glitters, and starry dimensional layers.'
  },
  {
    levelCode: 'L3',
    order: 9,
    title: '9. Concrete and Resin Candles',
    description: 'Two-part composite casting, thermal-safe concrete bases, and translucent resin tea-light vessels.'
  },
  {
    levelCode: 'L3',
    order: 10,
    title: '10. Texture Art',
    description: 'Heavy body modeling paste, palette knife sculpting, and mixed-media resin gloss glazing.'
  },
  {
    levelCode: 'L3',
    order: 11,
    title: '11. Geode (Normal and Druzy Geode)',
    description: 'Raw quartz embedding, crushed glass refraction, metallic mica borders, and luxury framing.'
  },
  {
    levelCode: 'L3',
    order: 12,
    title: '12. Tree of Life Clock (Advanced)',
    description: 'Large format luxury wall timepieces with custom numerals, heavy resin flood coats, and silent sweep motors.'
  },
  {
    levelCode: 'L3',
    order: 13,
    title: '13. Aarti Thali',
    description: 'Festive devotional plates, heat-resistant epoxy coats, mirror work, and traditional motifs.'
  },
  {
    levelCode: 'L3',
    order: 14,
    title: '14. Ripples and Droplet Effect',
    description: 'Hyper-realistic surface water droplets, 3D rain splash physics, and crystal drop placement.'
  },
  {
    levelCode: 'L3',
    order: 15,
    title: '15. Reels Mastery',
    description: 'Viral Instagram Reels filming techniques, transitions, audio selection, and visual storytelling for resin artists.'
  },
  {
    levelCode: 'L3',
    order: 16,
    title: '16. Photography Mastery',
    description: 'Studio lighting, eliminating resin glare, product staging, and professional editing on mobile.'
  },
  {
    levelCode: 'L3',
    order: 17,
    title: '17. YouTube Set Up',
    description: 'Channel branding, long-form tutorial production, mic/camera setups, and organic subscriber growth.'
  },
  {
    levelCode: 'L3',
    order: 18,
    title: '18. Journaling',
    description: 'Creative entrepreneur mindset, tracking commissions, daily creative reflection, and goal alignment.'
  }
];

// Seed or update all 30 courses in database
export const seedDefaultCurriculum = async () => {
  try {
    // Ensure columns exist first
    try {
      await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "levelCode" VARCHAR(255) DEFAULT 'L0';`);
      await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`);
    } catch (_) {}

    console.log('Ensuring all 30 level-wise courses exist in database...');
    for (const item of DEFAULT_CURRICULUM_COURSES) {
      let [course, created] = await Course.findOrCreate({
        where: { title: item.title },
        defaults: {
          title: item.title,
          description: item.description,
          levelCode: item.levelCode,
          order: item.order,
        }
      });

      if (!created) {
        await course.update({
          levelCode: item.levelCode,
          order: item.order,
          description: item.description,
        });
      }

      const chapterCount = await Chapter.count({ where: { courseId: course.id } });
      if (chapterCount === 0) {
        await Chapter.create({
          title: `Lesson 1: ${item.title.replace(/^\d+\.\s*/, '')} Overview & Demonstration`,
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          courseId: course.id,
        });
      }
    }
    console.log('Level-wise courses synced successfully!');
  } catch (err) {
    console.error('Error auto-seeding curriculum courses:', err);
  }
};

// Auto-run seeder on module load
seedDefaultCurriculum();

// Explicit Seed Endpoint for Admin
export const triggerSeedCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    await seedDefaultCurriculum();
    const courses = await Course.findAll({
      order: [
        ['levelCode', 'ASC'],
        ['order', 'ASC'],
        ['createdAt', 'ASC']
      ],
      include: [
        { model: Chapter, as: 'chapters', order: [['createdAt', 'ASC']] }
      ]
    });
    res.status(200).json({ message: 'All 30 level-wise courses synced to database successfully!', courses });
  } catch (error: any) {
    console.error('Error seeding courses:', error);
    res.status(500).json({ message: 'Failed to seed courses', error: error?.message });
  }
};

// Get all courses with Level-wise ordering
export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    try {
      const courses = await Course.findAll({
        order: [
          ['levelCode', 'ASC'],
          ['order', 'ASC'],
          ['createdAt', 'ASC']
        ],
        include: [
          { model: Chapter, as: 'chapters', order: [['createdAt', 'ASC']] },
          { model: Assignment, as: 'assignments' }
        ]
      });
      return res.status(200).json(courses);
    } catch (dbErr: any) {
      // Column might not exist yet; run quick patch
      try {
        await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "levelCode" VARCHAR(255) DEFAULT 'L0';`);
        await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`);
      } catch (_) {}

      const fallbackCourses = await Course.findAll({
        order: [['createdAt', 'ASC']],
        include: [
          { model: Chapter, as: 'chapters', order: [['createdAt', 'ASC']] },
          { model: Assignment, as: 'assignments' }
        ]
      });
      return res.status(200).json(fallbackCourses);
    }
  } catch (error: any) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, image, levelCode, order } = req.body;
    try {
      await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "levelCode" VARCHAR(255) DEFAULT 'L0';`);
      await sequelize.query(`ALTER TABLE "Courses" ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;`);
    } catch (_) {}

    const course = await Course.create({
      title,
      description,
      image,
      levelCode: levelCode || 'L0',
      order: parseInt(order) || 0
    });
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error: any) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { title, description, image, levelCode, order } = req.body;
    const course = await Course.findByPk(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    await course.update({
      title,
      description,
      image,
      levelCode: levelCode || course.levelCode,
      order: order !== undefined ? parseInt(order) : course.order
    });
    res.status(200).json({ message: 'Course updated successfully', course });
  } catch (error: any) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Delete a course
export const deleteCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    await Chapter.destroy({ where: { courseId: id } });
    await course.destroy();
    res.status(200).json({ message: 'Course and chapters deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Add a chapter to a course
export const addChapter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { courseId } = req.params;
    const { title, videoUrl, pdfUrl } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const chapter = await Chapter.create({ title, videoUrl, pdfUrl, courseId });
    res.status(201).json({ message: 'Chapter added successfully', chapter });
  } catch (error: any) {
    console.error('Error adding chapter:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Update a chapter
export const updateChapter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { chapterId } = req.params;
    const { title, videoUrl, pdfUrl } = req.body;

    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    await chapter.update({ title, videoUrl, pdfUrl });
    res.status(200).json({ message: 'Chapter updated successfully', chapter });
  } catch (error: any) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};

// Delete a chapter
export const deleteChapter = async (req: Request, res: Response): Promise<any> => {
  try {
    const { chapterId } = req.params;
    const chapter = await Chapter.findByPk(chapterId);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    await chapter.destroy();
    res.status(200).json({ message: 'Chapter deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};
