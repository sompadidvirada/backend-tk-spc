import { prisma } from "../config/prisma.js";
import type { Request, Response } from "express";

export const createCalendarOrder = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const {
      title,
      supplier_spcId,
      description,
      po_link,
      plan_date,
      payment_date,
      delivery_date,
      staff_officeId,
    } = req.body;

    // 1. Basic Validation
    if (!title || !supplier_spcId || !plan_date || !staff_officeId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const plan = new Date(plan_date);
    const pay = new Date(payment_date);
    const deli = new Date(delivery_date);

    plan.setUTCHours(0, 0, 0, 0);
    pay.setUTCHours(0, 0, 0, 0);
    deli.setUTCHours(0, 0, 0, 0);

    // 2. Create the record in Prisma
    const newOrder = await prisma.calendar_order.create({
      data: {
        title,
        description,
        po_link,
        supplier_spcId,
        plan_date: plan,
        payment_date: pay,
        delivery_date: deli,
        staff_officeId: Number(staff_officeId),
      },
      include: {
        supplier_spc: true,
      },
    });

    return res.status(201).json(newOrder);
  } catch (err: any) {
    console.error("Create Calendar Order Error:", err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
};

export const getAllCalendarOrderSpc = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const start = req.query.start as string;
    const end = req.query.end as string;
    const role = req.query.role as string;
    const staffId = req.query.id as string;

    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    const whereCondition: any = {
      plan_date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (role !== "ADMIN") {
      whereCondition.staff_officeId = Number(staffId);
    }

    const orders = await prisma.calendar_order.findMany({
      where: whereCondition,
      include: {
        supplier_spc: {
          select: {
            name: true,
            image: true,
          },
        },
        staff_office: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        plan_date: "asc",
      },
    });

    return res.status(200).json(orders);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const updateCalendarOrderDate = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { plan_date } = req.body;

    const date = new Date(plan_date);
    date.setUTCHours(0, 0, 0, 0);

    if (!id || !plan_date) {
      return res.status(400).json({ message: "Missing ID or Date" });
    }

    const updatedOrder = await prisma.calendar_order.update({
      where: { id: id },
      data: {
        plan_date: date,
      },
    });

    return res.status(200).json(updatedOrder);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error updating date" });
  }
};

export const deleteCalendarOrderSpc = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;

    await prisma.calendar_order.delete({
      where: { id: id as string },
    });

    return res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error during deletion" });
  }
};

export const updateCalendarStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { statusType, statusValue } = req.body;
    // statusType will be "payment_status" or "delivery_status"

    const updated = await prisma.calendar_order.update({
      where: { id: id as string },
      data: {
        [statusType]: statusValue,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error updating status" });
  }
};

export const updateCalendarPayment = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { payment_date } = req.body;

  if (!id || !payment_date) {
    return res.status(400).json({ message: `emty value` });
  }
  const normalizeDate = new Date(payment_date);
  normalizeDate.setUTCHours(0, 0, 0, 0);

  try {
    const ress = await prisma.calendar_order.update({
      where: {
        id: String(id),
      },
      data: {
        payment_date: normalizeDate,
      },
    });
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};

export const updateCalendarDelivery = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {id} =req.params
  const {delivery_date} = req.body
  if(!id || !delivery_date) {
    return res.status(400).json({ message: `emty value`})
  }
  const normalizeDate = new Date(delivery_date)
  normalizeDate.setUTCHours(0,0,0,0)
  try {
    const ress = await prisma.calendar_order.update({
      where: {
        id: String(id)
      }, data: {
        delivery_date: normalizeDate
      }
    })
    return res.status(200).json(ress);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: `server error` });
  }
};
