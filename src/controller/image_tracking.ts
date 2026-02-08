import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

if (
  !process.env.AWS_REGION ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY
) {
  throw new Error("Missing AWS Configuration Environment Variables");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const insertImageTracking = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, track_date } = req.body;
  const files = req.files as Express.MulterS3.File[];

  if (!branchId || !files || files.length === 0 || !track_date) {
    return res.status(400).json({ message: "Missing required data or images" });
  }

  const normalizeDate = new Date(track_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  const uploadedImages = files.map((file) => ({
    image_name: file.location, // or file.location if you want the full URL
    branchId: parseInt(branchId),
    track_date: normalizeDate,
  }));

  try {
    await prisma.track_image_bakery.createMany({
      data: uploadedImages,
      skipDuplicates: true, // Optional: prevents errors on duplicate entries
    });

    return res.status(200).json({
      message: "Upload successful",
      data: uploadedImages,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const getImageTracking = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId, track_date } = req.body;
  if (!branchId || !track_date) {
    return res.status(400).json({ message: `emty value.` });
  }
  const normalizeDate = new Date(track_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    const ress = await prisma.track_image_bakery.findMany({
      where: {
        track_date: normalizeDate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteImageTrack = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const check = await prisma.track_image_bakery.delete({
      where: {
        id: Number(id),
      },
    });
    const urlParts = check?.image_name.split(".amazonaws.com/") || "";
    const key = urlParts.length > 1 ? urlParts[1] : check?.image_name;
    const params = {
      Bucket: process.env.AWS_BUCKET_IMAGE_TRACK,
      Key: key,
    };
    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    return res.status(200).json(check);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const getAllBranchImageTrack = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { track_date } = req.body;
  if (!track_date) {
    return res.status(400).json({ message: "emty value" });
  }
  const normalizeDate = new Date(track_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.branch.findMany({
      include: {
        track_image_bakery: {
          where: {
            track_date: normalizeDate,
          },
          select: {
            id: true,
            image_name: true,
          },
        },
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};
