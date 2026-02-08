import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const getAllTrackReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // Get branchId, page, and limit from query or body
  // Using query params is standard for GET/Fetch requests
  const { page = 1, limit = 5 } = req.body;

  // Calculate pagination values
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    // 1. Fetch data and count total records simultaneously (Performance optimization)
    const [reports, totalCount] = await prisma.$transaction([
      prisma.baristar_report.findMany({
        include: {
          baristar_images_report: true,
          bakery_detail: {
            select: {
              name: true,
              image: true,
            },
          },
          branch: true,
        },
        orderBy: {
          id: "desc", // Show newest reports first
        },
        skip: skip,
        take: take,
      }),
      prisma.baristar_report.count(),
    ]);

    return res.status(200).json({
      data: reports,
      pagination: {
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / take),
        currentPage: Number(page),
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const checkUnreadyReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { staffId } = req.body;
  if (!staffId) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const checkReport = await prisma.baristar_report.findMany({
      where: {
        baristar_report_notification: {
          none: {
            staff_officeId: Number(staffId),
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });
    return res.status(200).json(checkReport);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const markReportAsRead = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { staffId, reportId } = req.body;

  try {
    // Create the notification record
    await prisma.baristar_report_notification.create({
      data: {
        staff_officeId: Number(staffId),
        baristar_reportId: Number(reportId),
        reacd_at: new Date(),
      },
    });

    return res.status(200).json({ message: "Marked as read" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const getReportDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const report = await prisma.baristar_report.findUnique({
      where: { id: Number(id) },
      include: {
        baristar_images_report: true, // Get the images
        branch: true, // Get branch info
      },
    });
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching detail" });
  }
};

export const updateStatusReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {id} =req.params
  const {status} = req.body
  if(!id || status === undefined) {
    return res.status(400).json({ message: `emty value`})
  }
  try {
    const ress = await prisma.baristar_report.update({
      where: {
        id: Number(id)
      },data: {
        status: status
      }
    })
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
