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

//bakery detail

export const createBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, price, sell_price, category } = req.body;
    if (!name || !price || !sell_price || !category) {
      return res.status(400).json({ message: `emty data.` });
    }
    const file = req.file as any;
    const imageUrl = file ? file.location : null;

    await prisma.bakery_detail.create({
      data: {
        name,
        price: Number(price),
        sell_price: Number(sell_price),
        image: imageUrl,
        bakeryCategory: { connect: { id: Number(category) } },
      },
    });
    return res.status(200).json({ message: `Add bakery success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "server error." });
  }
};

export const updateBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name, price, sell_price, bakeryCategoryId, supplyer_bakeryId } = req.body;
    const { id } = req.params;

    if (!id || !name || !price || !sell_price || !bakeryCategoryId) {
      return res.status(400).json({ message: `emty value.` });
    }

    const file = req.file as any;
    const imageURL = file ? file.location : null;

    const check = await prisma.bakery_detail.findUnique({
      where: {
        id: Number(id),
      },
    });

    const updateData: any = {
      name,
      price: Number(price),
      sell_price: Number(sell_price),
      bakery_categoryId: Number(bakeryCategoryId),
      supplyer_bakeryId: Number(supplyer_bakeryId) ?? ""
    };

    if (file && file.location) {
      if (check?.image) {
        const urlParts = check.image.split(".amazonaws.com/");
        const key = urlParts.length > 1 ? urlParts[1] : check.image;
        const params = {
          Bucket: process.env.AWS_BUCKET_BAKERY,
          Key: key,
        };
        const command = new DeleteObjectCommand(params);
        const deletImageS3 = await s3.send(command);
        console.log("Deleted old image:", check.image);
      }
      updateData.image = imageURL;
    }
    await prisma.bakery_detail.update({
      where: {
        id: Number(id),
      },
      data: updateData,
    });

    return res.status(200).json();
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const getAllBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const bakeries = await prisma.bakery_detail.findMany({
      include: {
        bakeryCategory: true,
        supplyer_bakery: true
      },
    });

    return res.status(200).json(bakeries);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
};

export const deleteBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400);
    }
    const check = await prisma.bakery_detail.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (check?.image) {
      const urlParts = check.image.split(".amazonaws.com/");
      const key = urlParts.length > 1 ? urlParts[1] : check.image;
      const params = {
        Bucket: process.env.AWS_BUCKET_BAKERY,
        Key: key,
      };
      const command = new DeleteObjectCommand(params);
      await s3.send(command);
      console.log("Deleted old image:", check.image);
    }
    await prisma.bakery_detail.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete bakery success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    console.log(req.body);
    console.log(id);

    if (!id || !status) {
      return res.status(400).json({ message: `emty value.` });
    }

    await prisma.bakery_detail.update({
      where: {
        id: Number(id),
      },
      data: {
        status: status,
      },
    });

    return res.status(200).json({ message: `update status success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const updateStatusSellBranches = async (req: Request, res: Response) => {
  try {
    const { bakeryId, activeBranchIds } = req.body as {
      bakeryId: number;
      activeBranchIds: number[];
    };

    if (!bakeryId) {
      return res.status(400).json({ message: "Bakery ID is required" });
    }

    // Use a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // 1. Wipe out all current branch connections for this bakery
      await tx.available_bakery_branch.deleteMany({
        where: { bakery_detailId: bakeryId },
      });

      // 2. Only create new rows if there are active branches selected
      if (activeBranchIds.length > 0) {
        const dataToInsert = activeBranchIds.map((id) => ({
          bakery_detailId: bakeryId,
          branchId: id,
          // Note: status is removed from schema as discussed
        }));

        await tx.available_bakery_branch.createMany({
          data: dataToInsert,
        });
      }
    });

    return res.status(200).json({
      message: "ແກ້ໄຂສະຖານະການຂາຍສຳເລັດ",
      count: activeBranchIds.length,
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ message: "Server error occurred" });
  }
};

export const checkBakeryAvailableBranch = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: `emty value.` });
    }

    const branches = await prisma.branch.findMany({
      include: {
        available_bakery_branch: {
          where: {
            bakery_detailId: Number(id),
          },
        },
      },
    });

    const result = branches.map((b) => ({
      id: b.id,
      name: b.name,
      province: b.province,
      status: b.available_bakery_branch.length > 0,
    }));

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

// category detail

export const createCategoryBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { name } = req.body;
    console.log();
    if (!name) {
      return res.status(400);
    }
    await prisma.bakery_category.create({
      data: {
        name: name,
      },
    });
    return res.status(200).json({ message: `create success.` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error.` });
  }
};

export const getAllCaterogory = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const ress = await prisma.bakery_category.findMany();
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500);
  }
};

export const deleteCategoryBakery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400);
    }
    await prisma.bakery_category.delete({
      where: {
        id: Number(id),
      },
    });
    return res.status(200).json({ message: `delete success` });
  } catch (err) {
    console.log(err);
    return res.status(500);
  }
};
