import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import {
  createCalendarOrder,
  deleteCalendarOrderSpc,
  getAllCalendarOrderSpc,
  updateCalendarDelivery,
  updateCalendarOrderDate,
  updateCalendarPayment,
  updateCalendarStatus,
} from "../controller/calendar_order.js";
const router = Router();

router.post(
  "/createcalendarorder",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  createCalendarOrder,
);
router.get(
  "/getallcalendarorderspc",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  getAllCalendarOrderSpc,
);

router.patch(
  "/updatecalendarorderspc/:id",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  updateCalendarOrderDate,
);
router.delete(
  "/deleteorderspc/:id",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  deleteCalendarOrderSpc,
);
router.patch(
  "/updatestatuscalendarorderspc/:id",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  updateCalendarStatus,
);

router.patch(
  "/updatepaymentdate/:id",
  verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),
  updateCalendarPayment,
);
router.patch(
  "/updatedeliverydate/:id",
  verifyTokenAndRole(["ADMIN", "SATFF_SPC", "STAFF"]),
  updateCalendarDelivery,
);

export default router;
