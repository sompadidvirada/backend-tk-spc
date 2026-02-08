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

export const createSupplyer = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { name, order_range } = req.body;
  const file = req.file as any;
  const imageUrl = file ? file.location : null;

  if (!name || !order_range) {
    return res.status(400).json({ message: `emty value` });
  }
  try {
    const ress = await prisma.supplyer_bakery.create({
      data: {
        name,
        order_range: Number(order_range),
        image: imageUrl,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllSupplyer = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const ress = await prisma.supplyer_bakery.findMany();
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const editSupplyer = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { name, order_range } = req.body;
  const file = req.file as any;
  const imageUrl = file ? file.location : null;

  if (!id || !name || !order_range) {
    return res.status(400).json({ message: `emty value.` });
  }

  const checkSupplyer = await prisma.supplyer_bakery.findUnique({
    where: {
      id: Number(id),
    },
  });

  const updateData = {
    name,
    order_range: Number(order_range),
  } as any;

  if (imageUrl) {
    if (checkSupplyer?.image) {
      const urlParts = checkSupplyer.image.split(".amazonaws.com/");
      const key = urlParts.length > 1 ? urlParts[1] : checkSupplyer.image;
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
    const ress = await prisma.supplyer_bakery.update({
      where: {
        id: Number(id),
      },
      data: updateData,
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const deleteSupplyer = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty vlue` });
  }
  try {
    const ress = await prisma.supplyer_bakery.delete({
      where: {
        id: Number(id),
      },
    });

    if (ress?.image) {
      const urlParts = ress.image.split(".amazonaws.com/");
      const key = urlParts.length > 1 ? urlParts[1] : ress.image;
      const params = {
        Bucket: process.env.AWS_BUCKET_STAFF,
        Key: key,
      };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }

    return res.status(200).json({ message: `delete success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

// supplyer for spc

export const createSupplyerSpc = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, contact_name, phone, address, category } = req.body;

    const file = req.file as any;
    const imageUrl = file ? file.location : null; // S3 location or local path

    // 1. Basic Validation
    if (!name) {
      return res.status(400).json({ message: "ກະລຸນາລະບຸຊື່ຜູ້ສະໜອງ." });
    }

    // 2. Check if supplier name already exists (since it's @unique)
    const existingSupplier = await prisma.supplier_spc.findUnique({
      where: { name },
    });

    if (existingSupplier) {
      return res.status(400).json({ message: "ມີຊື່ຜູ້ສະໜອງນີ້ໃນລະບົບແລ້ວ." });
    }

    // 3. Create the record in the database
    const newSupplier = await prisma.supplier_spc.create({
      data: {
        name,
        contact_name,
        phone,
        address,
        category,
        image: imageUrl,
      },
    });

    return res.status(201).json({
      message: "ບັນທຶກຜູ້ສະໜອງສຳເລັດ.",
      data: newSupplier,
    });
  } catch (err: any) {
    console.error("Prisma Error:", err);
    return res.status(500).json({
      message: "ເກີດຂໍ້ຜິດພາດໃນລະບົບ.",
      error: err.message,
    });
  }
};

export const getAllSupplyerSpc = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const ress = await prisma.supplier_spc.findMany();
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateSupllyerSpc = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: `emty value` });
  const file = req.file as any;
  const imageUrl = file ? file.location : null;
  const { name, contact_name, phone, address, category } = req.body;

  const updateData: any = {
    name,
    contact_name,
    phone,
    address,
    category,
  };

  const check = await prisma.supplier_spc.findFirst({
    where: {
      id: id,
    },
  });

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
    const updated = await prisma.supplier_spc.update({
      where: { id },
      data: updateData,
    });
    return res.status(200).json(updated);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
