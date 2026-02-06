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

export const createMaterial = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { name, min_order, category_materialId, descriptions } = req.body;
  const variants = JSON.parse(req.body.variants);
  const file = req.file as any;
  const imageUrl = file ? file.location : null;

  if (!name || !category_materialId || !min_order || !imageUrl) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Main Material
      const newMaterial = await tx.material.create({
        data: {
          name,
          descriptions,
          category_materialId: Number(category_materialId),
          min_order: Number(min_order),
          image: imageUrl, // S3 Location URL
        },
      });

      // 2. Map to store [Frontend Index] -> [Real DB ID]
      const idMapping: Record<number, number> = {};

      // 3. Create variants in sequence to maintain the tree hierarchy
      const createdVariants = [];

      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];

        // Check if this variant has a parent from the frontend logic
        // v.parent_variant_idx is the index of the parent in the 'variants' array
        const realParentId =
          v.parent_variant_idx !== null
            ? (idMapping[v.parent_variant_idx] ?? null)
            : null;

        const newVariant = await tx.materialVariant.create({
          data: {
            variant_name: v.variant_name,
            materialId: newMaterial.id,
            barcode: v.barcode,
            price_kip: v.price_kip,
            sell_price_kip: v.sell_price_kip,
            price_bath: v.price_bath,
            sell_price_bath: v.sell_price_bath,
            quantity_in_parent: v.quantity_in_parent,
            conver_to_base: v.conver_to_base,
            parent_variantId: realParentId, // Link to the REAL DB ID of the parent
          },
        });

        // Store the newly created ID in our map so its children can use it
        idMapping[i] = newVariant.id;
        createdVariants.push(newVariant);
      }

      return { newMaterial, createdVariants };
    });

    return res.status(201).json({
      message: "ສ້າງວັດຖຸດິບສຳເລັດ",
      data: result,
    });
  } catch (err) {
    console.error("Transaction Error:", err);
    // Note: If you reach here, Prisma has automatically rolled back all changes
    return res.status(500).json({ message: "Server error during creation." });
  }
};

export const createCategoryMaterial = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    const ress = await prisma.category_material.create({
      data: {
        name,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllCategoryMaterial = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const ress = await prisma.category_material.findMany();
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllMaterial = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        category_material: true,
        // Sort variants so the smallest unit (conver_to_base: 1) is always first
        material_variant: {
          orderBy: {
            conver_to_base: "asc",
          },
        },
        supplierSpc: true
      },
      orderBy: {
        id: "desc", // Show newest materials at the top
      },
    });
    return res.status(200).json(materials);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const creatematerialVaraint = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { materialId } = req.body;

    const newVariant = await prisma.materialVariant.create({
      data: {
        materialId: Number(materialId),
        variant_name: "ຊື່ຫົວໜ່ວຍໃໝ່", // Default placeholder name
        price_kip: 0,
        sell_price_kip: 0,
        price_bath: 0,
        barcode: null,
        sell_price_bath: 0,
        conver_to_base: 1,
        parent_variantId: null,
      },
    });
    return res.status(200).json(newVariant);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateRelationMaterialVariant = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { variants } = req.body;

    if (!variants || !Array.isArray(variants)) {
      return res.status(400).json({ message: "Invalid data format." });
    }

    await prisma.$transaction(
      variants.map((v: any) =>
        prisma.materialVariant.update({
          where: { id: Number(v.id) },
          data: {
            variant_name: v.variant_name,
            parent_variantId: v.parent_variantId
              ? Number(v.parent_variantId)
              : null,

            quantity_in_parent: v.quantity_in_parent
              ? Number(v.quantity_in_parent)
              : null,
            conver_to_base: Number(v.conver_to_base) || 1,
            price_kip: Number(v.price_kip) || 0,
            sell_price_kip: Number(v.sell_price_kip) || 0,
            price_bath: Number(v.price_bath) || 0,
            sell_price_bath: Number(v.sell_price_bath) || 0,
            barcode: v.barcode,
          },
        }),
      ),
    );

    return res.status(200).json({ message: "Relations updated successfully!" });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ message: "Server error during update." });
  }
};

export const deleteMaterialVariant = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value` });
  }

  try {
    const ress = await prisma.materialVariant.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateMaterial = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.body;
  const { name, category_materialId, min_order, descriptions,supplier_spcId } = req.body;
  const file = req.file as any;
  const imageUrl = file ? file.location : null;

  const updateForm: any = {
    name,
    category_materialId: Number(category_materialId),
    min_order:Number(min_order),
    descriptions,
    supplier_spcId
  };

  try {
    const check = await prisma.material.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (imageUrl) {
      if (check?.image) {
        const urlParts = check.image.split(".amazonaws.com/");
        const key = urlParts.length > 1 ? urlParts[1] : check.image;
        const params = {
          Bucket: process.env.AWS_BUCKET_BAKERY,
          Key: key,
        };
        const command = new DeleteObjectCommand(params);
        await s3.send(command);
      }
      updateForm.image = imageUrl;
    }

    const ress = await prisma.material.update({
      where: {
        id: Number(id),
      },
      data: updateForm,
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
