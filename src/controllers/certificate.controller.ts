import { Request, Response } from 'express';
import db from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const { Certificate, User, Course } = db;

// Get all certificates (Admin)
export const getAllCertificates = async (req: Request, res: Response): Promise<any> => {
  try {
    const certificates = await Certificate.findAll({
      include: [
        { model: User, as: 'student' },
        { model: Course, as: 'course' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(certificates);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get a student's certificates (Student)
export const getMyCertificates = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const studentId = req.user?.id;
    const certificates = await Certificate.findAll({
      where: { studentId },
      include: [
        { model: Course, as: 'course' }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json(certificates);
  } catch (error) {
    console.error('Error fetching my certificates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Award a certificate (Admin)
export const awardCertificate = async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId, courseId, pdfUrl } = req.body;
    
    // Create the certificate
    const certificate = await Certificate.create({ studentId, courseId, pdfUrl });
    
    res.status(201).json({ message: 'Certificate awarded', certificate });
  } catch (error) {
    console.error('Error awarding certificate:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
