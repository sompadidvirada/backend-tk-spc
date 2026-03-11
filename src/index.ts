import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import http from "http"; // 1. Import http
import { Server } from "socket.io"; // 2. Import Socket.io

//routes import
import branch from "./routes/branch.js";
import staff from "./routes/staff_office.js";
import bakery from "./routes/bakery.js";
import auth from "./routes/auth.js";
import tracking from "./routes/tracking_bakery.js";
import cookieParser from "cookie-parser";
import reportbakery from "./routes/reportbakery.js";
import dashboard from "./routes/dashboard.js";
import order_bake from "./routes/order_bakery.js";
import baristar from "./routes/baristar.js";
import image_track from "./routes/image_tracking.js";
import supplyer from "./routes/supplyer.js";
import track_report from "./routes/track_report_bakery.js";
import material from "./routes/material.js";
import material_variant from "./routes/material_requisition.js";
import calendar_order from "./routes/calendar_order.js";
import rateLimit from "express-rate-limit";
/** ROUTE IMPORT */

/** COFIGURATIONS */

dotenv.config();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 80,                   // allow only 5 attempts
  message: "Too many login attempts. Please try again later.",
});

const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json({ limit: `50mb` }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cors({
    origin: [
      "https://treekoff.store",
      "https://www.treekoff.store",
      "http://192.168.1.40:3000"
    ],
    credentials: true,
  }),
);
app.use(cookieParser());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

app.set("io", io);


app.use("/branchs", branch);
app.use("/managestaff", staff);
app.use("/managebakery", bakery);
app.use("/authentication",loginLimiter, auth);
app.use("/managetracking", tracking);
app.use("/managereportbakery", reportbakery);
app.use("/dashboard", dashboard);
app.use("/orderbakery", order_bake);
app.use("/baristar", baristar);
app.use("/imagetrack", image_track);
app.use("/supplyer", supplyer);
app.use("/trackreportbaristar", track_report);
app.use("/material", material);
app.use("/materialrequisition", material_variant);
app.use("/calendarorder", calendar_order);
/** SERVER */

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`Server and Socket.io running on port ${port}`);
});
