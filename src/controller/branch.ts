import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const createBranch = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, province, lat, lng } = req.body;

    await prisma.$executeRaw`
      INSERT INTO "branch" (name, province, location)
      VALUES (
        ${name},
        ${province},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
      )
    `;

    return res.status(200).json({ message: "create branch success" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "server error" });
  }
};

export const getAllBranch = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const branches = await prisma.$queryRaw<
      {
        id: number;
        name: string;
        province: string;
        lat: number;
        lng: number;
      }[]
    >`
      SELECT
        id,
        name,
        province,
        ST_Y(location::geometry) AS lat,
        ST_X(location::geometry) AS lng
      FROM "branch";
    `;

    return res.status(200).json(branches);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "server error" });
  }
};

export const addPhonNumberBranch = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { phone } = req.body;
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.branch.update({
      where: {
        id: Number(id),
      },
      data: {
        phonenumber: phone ?? null,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateBranch = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { location, name, province } = req.body;

  if (!id || !location || !name || !province) {
    return res.status(400).json({ message: "ຂໍ້ມູນບໍ່ຄົບຖ້ວນ." });
  }

  try {
    const { lat, lng } = location;

    // Use a transaction to ensure both the PostGIS point and text data stay in sync
    await prisma.$transaction([
      prisma.$executeRaw`
        UPDATE "branch" 
        SET 
          name = ${name},
          province = ${province},
          location = ST_SetSRID(ST_MakePoint(${parseFloat(lng)}, ${parseFloat(lat)}), 4326)
        WHERE id = ${Number(id)}
      `
    ]);

    return res.status(200).json({ message: "ແກ້ໄຂສຳເລັດ" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};
