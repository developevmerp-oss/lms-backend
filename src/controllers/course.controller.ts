import { Request, Response } from 'express';
import db from '../models';

const { Course, Chapter, Assignment } = db;

// Get all courses
export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const courses = await Course.findAll({
      order: [['createdAt', 'ASC']],
      include: [
        { model: Chapter, as: 'chapters' },
        { model: Assignment, as: 'assignments' }
      ]
    });
    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, image } = req.body;
    const course = await Course.create({ title, description, image });
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { title, description, image } = req.body;
    const course = await Course.findByPk(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    await course.update({ title, description, image });
    res.status(200).json({ message: 'Course updated successfully', course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  } catch (error) {
    console.error('Error adding chapter:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  } catch (error) {
    console.error('Error updating chapter:', error);
    res.status(500).json({ message: 'Internal server error' });
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
  } catch (error) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
