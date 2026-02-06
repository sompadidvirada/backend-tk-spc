import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const insertMaterialRequisition = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {
    material_variantId,
    quantity,
    base_quantity,
    price_kip,
    sell_price_kip,
    price_bath,
    sell_price_bath,
    date,
    branchId,
  } = req.body;

  console.log(req.body);

  const requiredFields = { material_variantId, quantity, date, branchId };
  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === undefined || value === null || value === "") {
      return res.status(400).json({ message: `Field ${key} is required.` });
    }
  }
  const normalizeDate = new Date(date);
  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.stock_requisition.create({
      data: {
        material_variantId: Number(material_variantId),
        quantity: Number(quantity),
        base_quantity: Number(base_quantity) * Number(quantity),
        price_kip: price_kip ? parseFloat(price_kip) : 0,
        sell_price_kip: sell_price_kip ? parseFloat(sell_price_kip) : 0,
        price_bath: price_bath ? parseFloat(price_bath) : 0,
        sell_price_bath: sell_price_bath ? parseFloat(sell_price_bath) : 0,
        date: normalizeDate,
        branchId: Number(branchId),
      },
      select: {
        id: true,
        quantity: true,
        branchId: true,
        material_variantId: true,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllRequisition = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { date } = req.body;
  if (!date) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizeDate = new Date(date);
  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    const ress = await prisma.stock_requisition.findMany({
      where: {
        date: normalizeDate,
      },
      select: {
        id: true,
        quantity: true,
        branchId: true,
        material_variantId: true,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `sever error.` });
  }
};

export const updateStocRequisiton = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { quantity, base_quantity } = req.body;
  if (!id || !quantity || !base_quantity) {
    return res.status(400).json({ message: `emty value` });
  }
  try {
    const ress = await prisma.stock_requisition.update({
      where: {
        id: Number(id),
      },
      data: {
        quantity: Number(quantity),
        base_quantity: Number(quantity) * Number(base_quantity),
      },
      select: {
        id: true,
        quantity: true,
        branchId: true,
        material_variantId: true,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const deleteStockRequisition = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: `emty value.` });
  }
  try {
    await prisma.stock_requisition.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const uploadStockRequisition = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const requisitions = req.body;

    if (!requisitions || !Array.isArray(requisitions)) {
      return res.status(400).json({ message: "Invalid data format" });
    }
    const result = await prisma.$transaction(
      requisitions.map((item: any) =>
        prisma.stock_requisition.upsert({
          where: {
            material_variantId_date_branchId: {
              material_variantId: item.material_variantId,
              date: new Date(item.date),
              branchId: item.branchId,
            },
          },
          update: {
            quantity: item.quantity,
            base_quantity: item.base_quantity,
            price_kip: item.price_kip,
            sell_price_kip: item.sell_price_kip,
          },
          create: {
            material_variantId: item.material_variantId,
            quantity: item.quantity,
            base_quantity: item.base_quantity,
            price_kip: item.price_kip,
            sell_price_kip: item.sell_price_kip,
            price_bath: item.price_bath,
            sell_price_bath: item.sell_price_bath,
            date: new Date(item.date),
            branchId: item.branchId,
          },
        }),
      ),
    );

    return res.status(200).json({
      message: "Data synced successfully",
      count: result.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getStockRequisitionReport = async (
  req: Request,
  res: Response,
) => {
  try {
    const { startDate, endDate, branchId } = req.body; // e.g., 2024-05-20, 3
    console.log(req.body);

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    // 1. Fetch all materials, their variants, and the requisition records
    // associated with those variants for the specific date/branch.
    const materials = await prisma.material.findMany({
      include: {
        material_variant: {
          include: {
            stock_requisition: {
              where: {
                date: {
                  gte: start,
                  lte: end,
                },
                ...(branchId !== "all" && { branchId: Number(branchId) }),
              },
            },
          },
        },
        supplierSpc: true,
        category_material: {
          select: {
            name: true,
          },
        },
      },
    });

    const response = materials.map((m) => {
      // 2. Calculate the "Total Base Quantity" for the entire Material
      // This sums up base_quantity from all variants of this material
      const totalBaseQuantity = m.material_variant.reduce((sum, variant) => {
        const variantSum = variant.stock_requisition.reduce(
          (s, req) => s + (req.base_quantity || 0),
          0,
        );
        return sum + variantSum;
      }, 0);

      return {
        id: m.id,
        material_name: m.name,
        description: m.descriptions || "",
        category_materialId: m.category_materialId,
        category_name: m.category_material.name,
        supplyer: m.supplierSpc,
        min_order: m.min_order,
        image: m.image,
        all_stockrequisition: m.material_variant.map((v) => {
          const variantQuantity = totalBaseQuantity / (v.conver_to_base || 1);

          return {
            id: v.id,
            variant_name: v.variant_name,
            total_price_kip: (v.price_kip || 0) * variantQuantity,
            total_price_bath: (v.price_bath || 0) * variantQuantity,
            barcode: v.barcode,
            // As per your requirement: this is the total base_quantity
            // of every variant in this material
            quantity_requisition: variantQuantity,
          };
        }),
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAllStockRequisition = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { date, branchId } = req.body;
  if (!date || !branchId) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizeDate = new Date(date);
  normalizeDate.setUTCHours(0, 0, 0, 0);
  try {
    await prisma.stock_requisition.deleteMany({
      where: {
        date: normalizeDate,
        branchId: Number(branchId),
      },
    });
    return res.status(200).json({ message: `delete success` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

//STOCK REMAIN

export const insertManyStockRemain = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { stockData } = req.body; // Expecting an array: [{ variantId, count, baseFactor }, ...]

  if (!Array.isArray(stockData) || stockData.length === 0) {
    return res.status(400).json({ message: "Invalid or empty data array." });
  }

  try {
    const result = await prisma.$transaction(
      stockData.map((item) =>
        prisma.stock_remain.create({
          data: {
            material_variantId: item.variantId,
            count: item.count,
            base_count: item.count * item.baseFactor,
          },
        }),
      ),
    );

    return res.status(200).json({
      message: "Successfully updated stock.",
      count: result.length,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Server error during bulk insert." });
  }
};

export const getStockRemain = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const materials = await prisma.material.findMany({
      include: {
        material_variant: {
          include: {
            stock_remain: true,
          },
        },
      },
    });
    if (!materials.length) return res.status(200).json([]);
    const response = materials.map((m) => {
      // 1. Calculate Total Base Stock for the entire Material
      // This sums up the base_count from all variants
      const totalBaseStock = m.material_variant.reduce((sum, variant) => {
        const variantStockSum = variant.stock_remain.reduce(
          (s, sr) => s + (sr.base_count || 0),
          0,
        );
        return sum + variantStockSum;
      }, 0);

      return {
        id: m.id,
        material_name: m.name,
        image: m.image,
        all_stock: m.material_variant.map((v) => {
          return {
            id: v.id,
            stock_id: m.id,
            conver_to_base: v.conver_to_base,
            variant_name: v.variant_name,
            barcode: v.barcode,
            stock_remain: totalBaseStock / (v.conver_to_base || 1),
          };
        }),
      };
    });

    return res.status(200).json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const deleteAllStockRemain = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    await prisma.stock_remain.deleteMany();
    return res.status(200).json({ message: `delete all success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateStockRemain = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { count, base_count_variant, material_variantId } = req.body;
  if (!id || !count || !base_count_variant || !material_variantId) {
    return res.status(400).json({ message: `emty value.` });
  }

  console.log(req.body);

  try {
    await prisma.stock_remain.deleteMany({
      where: {
        material_variant: {
          materialId: Number(id),
        },
      },
    });
    const neww = await prisma.stock_remain.create({
      data: {
        count: count,
        material_variantId: Number(material_variantId),
        base_count: count * base_count_variant,
      },
    });
    return res.status(200).json(neww);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};
