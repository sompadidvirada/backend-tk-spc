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

export const createStaffOffice = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, phonenumber, birthdate, role } = req.body;
    const file = req.file as any;
    const imageUrl = file ? file.location : null;

    if (!name || !phonenumber || !role) {
      return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ" });
    }

    const checkPhone = await prisma.staff_office.findUnique({
      where: {
        phonenumber: phonenumber,
      },
    });
    if (checkPhone)
      return res
        .status(501)
        .json({ message: "this phonenumber already exit." });

    await prisma.staff_office.create({
      data: {
        name,
        phonenumber: phonenumber,
        birthdate,
        image: imageUrl,
        role: role,
      },
    });
    return res.status(200).json({ message: "ສ້າງພະນັກງານສຳເລັດ" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const createStaffBaristar = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, phonenumber, birthdate, branchId } = req.body;
    const file = req.file as any;
    const imageUrl = file ? file.location : null;
    if (!name || !phonenumber || !branchId) {
      return res.status(400).json({ message: `emty data to create` });
    }
    const normalizeDate = birthdate ? new Date(birthdate) : null;
    normalizeDate?.setUTCHours(0, 0, 0, 0);

    const checkPhone = await prisma.staff_office.findUnique({
      where: {
        phonenumber: phonenumber,
      },
    });
    if (checkPhone)
      return res
        .status(501)
        .json({ message: "this phonenumber already exit." });
    await prisma.staff_office.create({
      data: {
        name,
        phonenumber,
        role: "BARISTAR",
        birthdate: normalizeDate,
        image: imageUrl,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json({ message: `create baristar success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateStaffOffice = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { name, phone_number, birthdate } = req.body;

    // STEP 1: Check if the user exists
    const checkUser = await prisma.staff_office.findUnique({
      where: { id: Number(id) },
    });

    if (!checkUser) {
      return res.status(404).json({ message: "ບໍ່ພົບຂໍ້ມູນຜູ້ໃຊ້ນີ້." }); // 404 is better than 400 here
    }

    // STEP 2: Check if the phone number is already taken by ANOTHER user
    const existingPhone = await prisma.staff_office.findFirst({
      where: {
        phonenumber: phone_number,
        NOT: { id: Number(id) }, // This is crucial
      },
    });

    if (existingPhone) {
      return res.status(400).json({ message: "ເບີໂທລະສັບນີ້ມີໃນລະບົບແລ້ວ." });
    }

    // STEP 3: Perform the update
    const updatedUser = await prisma.staff_office.update({
      where: { id: Number(id) },
      data: {
        name,
        phonenumber: phone_number,
        birthdate: birthdate ? birthdate : checkUser.birthdate,
      },
    });

    return res.status(200).json({
      message: "ແກ້ໄຂຂໍ້ມູນສຳເລັດ",
      data: updatedUser,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const updateSTaffRole = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!id || !role) {
      return res.status(200).json({ message: `emty data to update.` });
    }

    await prisma.staff_office.update({
      where: {
        id: Number(id),
      },
      data: {
        role,
      },
    });
    return res.status(200).json({ message: `update role succes.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllStaff = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const staff = await prisma.staff_office.findMany({
      orderBy: { id: "asc" },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    return res.status(200).json(staff);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateBranchStaff = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { branchId } = req.body;
  const { id } = req.params;

  if (!id || !branchId) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.staff_office.update({
      where: {
        id: Number(id),
      },
      data: {
        branchId: Number(branchId),
      },
    });
    return res.status(200).json({ message: `Update branch staff success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateAvailableStaff = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { available } = req.body;

  if (!id || available === undefined) {
    return res.status(400).json({ message: `emty value to update` });
  }
  try {
    await prisma.staff_office.update({
      where: {
        id: Number(id),
      },
      data: {
        available: available,
      },
    });
    return res.status(200).json({ message: `update available staff success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const checkStaffPassword = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: `emty value to check` });
    }
    const ress = await prisma.staff_office.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        id: true,
        name: true,
        password: true,
      },
    });

    return res.status(200).json({ data: ress });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "server error." });
  }
};

export const deleteStaff = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: `emty value to delete.` });
    }

    const checkStaff = await prisma.staff_office.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        id: true,
        image: true,
      },
    });

    if (checkStaff?.image) {
      try {
        const imageKey = checkStaff.image.split("/").slice(-2).join("/");
        const params = {
          Bucket: process.env.AWS_BUCKET_STAFF,
          Key: imageKey,
        };
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
      } catch (err: any) {
        console.error("Error deleting old image:", err?.message);
      }
    }
    await prisma.staff_office.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete staff success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateStaffPassword = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { old_password, new_password } = req.body;
  if (!id || !old_password || !new_password) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const check = await prisma.staff_office.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (check?.password !== old_password) {
      return res.status(404).json({ message: `ລະຫັດຜ່ານເກົ່າບໍ່ຖືກຕ້ອງ.` });
    }
    const ress = await prisma.staff_office.update({
      where: {
        id: Number(id),
      },
      data: {
        password: new_password,
      },
    });
    return res.status(200).json({ message: `ແກ້ໄຂລະຫັດຜ່ານສຳເລັດ.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

// EDIT PROFILE FOR USER SELF EIDT

export const updateUserProfile = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, birthdate } = req.body;
    const { id } = req.params;
    const file = req.file as any;
    const imageURL = file ? file.location : null;

    if (!name || !birthdate || !id) {
      return res.status(400).json({ message: `emty value` });
    }
    const checkStaff = await prisma.staff_office.findUnique({
      where: {
        id: Number(id),
      },
    });
    const normalizeDate = new Date(birthdate);
    normalizeDate.setUTCHours(0, 0, 0, 0);
    const updateForm: any = {
      name,
      birthdate: normalizeDate,
    };
    if (imageURL) {
      if (checkStaff?.image) {
        const urlParts = checkStaff.image.split(".amazonaws.com/");
        const key = urlParts.length > 1 ? urlParts[1] : checkStaff.image;
        const params = {
          Bucket: process.env.AWS_BUCKET_STAFF,
          Key: key,
        };
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
      }
      updateForm.image = imageURL;
    }

    const ress = await prisma.staff_office.update({
      where: {
        id: Number(id),
      },
      data: updateForm,
      include: {
        branch: true,
      },
    });

    const payload = {
      id: ress.id,
      name: ress.name,
      branchId: ress.branchId,
      branch_name: ress.branch?.name,
      phone_number: ress.phonenumber,
      role: ress.role,
      image: ress.image,
      birth_date: ress.birthdate,
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
      message: "ອັບເດດໂປຮໄຟລ໌ສຳເລັດ!",
      user: payload,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
