import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phoen_number, password } = req.body;

    const checkStaff = await prisma.staff_office.findUnique({
      where: { phonenumber: phoen_number },
      include: {
        branch: { select: { name: true } },
      },
    });

    if (!checkStaff || checkStaff.password !== password) {
      return res.status(401).json({ message: "ເບີໂທ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ" });
    }

    if (!checkStaff.available) {
      return res.status(403).json({ message: "ບັນຊີນີ້ຖືກລະງັບການໃຊ້ງານແລ້ວ" });
    }

    const payload = {
      id: checkStaff.id,
      name: checkStaff.name,
      branchId: checkStaff.branchId,
      branch_name: checkStaff.branch?.name || null,
      phone_number: checkStaff.phonenumber,
      role: checkStaff.role,
      image: checkStaff.image,
      birthdate: checkStaff.birthdate,
    };

    const token = jwt.sign(payload, process.env.SECRET!, { expiresIn: "20h" });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("session", token, {
      httpOnly: true,
      // If we are in production (HTTPS), use Secure/None.
      // If local (HTTP), use false/Lax.
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 20 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Login successful",
      user: payload,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
