import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { Assignment, Submission, User, Course } = db;

// Get all assignments
export const getAssignments = async (req: Request, res: Response): Promise<any> => {
  try {
    const assignments = await Assignment.findAll({
      include: [
        { model: Course, as: 'course' },
        { model: Submission, as: 'submissions', include: [{ model: User, as: 'student' }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all submissions for review
export const getAllSubmissions = async (req: Request, res: Response): Promise<any> => {
  try {
    const submissions = await Submission.findAll({
      include: [
        { model: User, as: 'student' },
        { model: Assignment, as: 'assignment' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create assignment
export const createAssignment = async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, description, points, dueDate, courseId } = req.body;
    const assignment = await Assignment.create({ title, description, points, dueDate, courseId });
    res.status(201).json({ message: 'Assignment created', assignment });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Student submits an assignment
export const submitAssignment = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { assignmentId } = req.params;
    const { fileUrl } = req.body;
    const studentId = req.user?.id;

    const submission = await Submission.create({ fileUrl, assignmentId, studentId });
    res.status(201).json({ message: 'Assignment submitted', submission });
  } catch (error) {
    console.error('Error submitting assignment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Admin reviews and awards points
export const reviewSubmission = async (req: Request, res: Response): Promise<any> => {
  try {
    const { submissionId } = req.params;
    const { status, pointsAwarded } = req.body; // status: 'approved' | 'rejected'

    const submission = await Submission.findByPk(submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    submission.status = status;
    submission.pointsAwarded = pointsAwarded;
    await submission.save();

    // If approved, update student points and streak
    if (status === 'approved') {
      const student = await User.findByPk(submission.studentId);
      if (student) {
        student.points += pointsAwarded;
        student.streak += 1;
        await student.save();
      }
    }

    res.status(200).json({ message: 'Submission reviewed', submission });
  } catch (error) {
    console.error('Error reviewing submission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
