import { Request, Response } from 'express';
import db from '../models';

const { Course, Chapter, Assignment } = db;

// Get all courses
export const getCourses = async (req: Request, res: Response): Promise<any> => {
  try {
    const courses = await Course.findAll({
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
