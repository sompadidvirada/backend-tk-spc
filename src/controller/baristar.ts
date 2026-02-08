import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

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

export const updateBaristarProfile = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log(req.body);
  const { name } = req.body;
  const { id } = req.params;
  const file = req.file as any;
  const imageUrl = file ? file.location : null;

  if (!name) {
    return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ" });
  }

  const check = await prisma.staff_office.findUnique({
    where: {
      id: Number(id),
    },
  });

  const updateData: any = {
    name,
  };

  if (file && file.location) {
    if (check?.image) {
      const urlParts = check.image.split(".amazonaws.com/");
      const key = urlParts.length > 1 ? urlParts[1] : check.image;
      const params = {
        Bucket: process.env.AWS_BUCKET_STAFF,
        Key: key,
      };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }
    updateData.image = imageUrl;
  }
  try {
    const updatedStaff = await prisma.staff_office.update({
      where: { id: Number(id) },
      data: updateData,
      include: { branch: true }, // Include branch to maintain payload structure
    });

    // Create a NEW payload with the fresh data
    const payload = {
      userId: updatedStaff.id,
      name: updatedStaff.name,
      branchId: updatedStaff.branchId,
      branch_name: updatedStaff.branch?.name,
      phoen_number: updatedStaff.phonenumber,
      role: updatedStaff.role,
      image: updatedStaff.image, // NEW IMAGE URL
      birth_date: updatedStaff.birthdate,
    };

    const token = jwt.sign(payload, process.env.SECRET!, { expiresIn: "20h" });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("session", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 20 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Update success",
      user: updatedStaff,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const {old_password, new_password} = req.body
  if (!id || !old_password || !new_password) {
    return res.status(400).json({ message: `emty value` });
  }
  try {
    const check = await prisma.staff_office.findUnique({
      where: {
        id: Number(id)
      }
    })
    if(check?.password !== old_password) {
      return res.status(404).json({ message: `ລະຫັດຜ່ານເກົ່າບໍ່ຖືກຕ້ອງ`})
    }
    const ress = await prisma.staff_office.update({
      where: {
        id: Number(id)
      }, data: {
        password: new_password
      }
    })
    return res.status(200).json({ message: 'update password success.'});
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const insertBakeryReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {
    report_date,
    title,
    descriptoion,
    bakery_detailId,
    branchId,
    staff_officeId,
  } = req.body;
  const files = req.files as Express.MulterS3.File[];
  if (
    !report_date ||
    !title ||
    !descriptoion ||
    !bakery_detailId ||
    !branchId ||
    !staff_officeId ||
    files.length === 0
  ) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizeDate = new Date(report_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    const reportCreate = await prisma.baristar_report.create({
      data: {
        report_date: normalizeDate,
        title,
        descriptoion,
        bakery_detailId: Number(bakery_detailId),
        branchId: Number(branchId),
        staff_officeId: Number(staff_officeId),
      },
      include: {
        branch: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!reportCreate) {
      return res
        .status(500)
        .json({ message: `Can't create report. try again later` });
    }
    const uploadedImages = files.map((file) => ({
      image: file.location, // or file.location if you want the full URL
      baristar_reportId: Number(reportCreate.id),
    }));
    await prisma.baristar_images_report.createMany({
      data: uploadedImages,
      skipDuplicates: true,
    });
    const io = req.app.get("io");
    if (io) {
      io.emit("new_report_notification", {
        id: reportCreate.id,
        title: reportCreate.title,
        descriptoion: reportCreate.descriptoion,
        report_date: reportCreate.report_date,
        branch_name: reportCreate.branch?.name,
      });
    }
    return res.status(200).json({
      message: "Upload successful",
      data: uploadedImages,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getHistoryReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // Get branchId, page, and limit from query or body
  // Using query params is standard for GET/Fetch requests
  const { branchId, page = 1, limit = 5 } = req.body;

  if (!branchId) {
    return res.status(400).json({ message: "ກະລຸນາລະບຸສາຂາ (branchId)" });
  }

  // Calculate pagination values
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    // 1. Fetch data and count total records simultaneously (Performance optimization)
    const [reports, totalCount] = await prisma.$transaction([
      prisma.baristar_report.findMany({
        where: {
          branchId: Number(branchId),
        },
        include: {
          // Include the images array
          baristar_images_report: true,
          // Include bakery detail to show the name/image of the bread
          bakery_detail: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          id: "desc", // Show newest reports first
        },
        skip: skip,
        take: take,
      }),
      prisma.baristar_report.count({
        where: { branchId: Number(branchId) },
      }),
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
    return res.status(500).json({ message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ" });
  }
};
