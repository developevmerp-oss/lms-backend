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
    const mapped = certificates.map((c: any) => {
      const plain = c.toJSON();
      if (!plain.pdfUrl && plain.certificateUrl) {
        plain.pdfUrl = plain.certificateUrl;
      }
      return plain;
    });
    res.status(200).json(mapped);
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
    const mapped = certificates.map((c: any) => {
      const plain = c.toJSON();
      if (!plain.pdfUrl && plain.certificateUrl) {
        plain.pdfUrl = plain.certificateUrl;
      }
      return plain;
    });
    res.status(200).json(mapped);
  } catch (error) {
    console.error('Error fetching my certificates:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Award a certificate (Admin)
export const awardCertificate = async (req: Request, res: Response): Promise<any> => {
  try {
    const { studentId, courseId, pdfUrl, certificateUrl, title } = req.body;
    
    if (!studentId || !courseId) {
      return res.status(400).json({ message: 'studentId and courseId are required' });
    }

    const course = await Course.findByPk(courseId);
    const certTitle = title || (course ? `${course.title} Completion Certificate` : 'Course Completion Certificate');
    const finalUrl = pdfUrl || certificateUrl || 'https://res.cloudinary.com/dummy/certificates/default.pdf';

    // Create the certificate with required title and certificateUrl
    const certificate = await Certificate.create({
      studentId,
      courseId,
      title: certTitle,
      certificateUrl: finalUrl,
    });
    
    res.status(201).json({ message: 'Certificate awarded', certificate });
  } catch (error: any) {
    console.error('Error awarding certificate:', error);
    res.status(500).json({ message: 'Internal server error', error: error?.message });
  }
};
