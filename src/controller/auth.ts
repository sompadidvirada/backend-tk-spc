import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { phoen_number, password } = req.body; // Check if this matches your frontend "phone_number"

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

    // Aligned with your Zustand Staff_Deatil interface
    const payload = {
      id: checkStaff.id, 
      name: checkStaff.name,
      branchId: checkStaff.branchId,
      branch_name: checkStaff.branch?.name || null,
      phone_number: checkStaff.phonenumber, // Fixed typo from phoen_number
      role: checkStaff.role,
      image: checkStaff.image,
      birthdate: checkStaff.birthdate, 
    };


    const token = jwt.sign(payload, process.env.SECRET!, { expiresIn: "20h" });
    
    return res.status(200).json({ 
        token, 
        user: payload 
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
