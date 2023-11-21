import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

//TO ACCEPT CONNECTIONS FROM FRONTEND, MAKE AN app OBJECT
const app = express();

//TO BE ABLE TO SET ACCEPTABLE FRONTEND CONNECTION ORIGINS AND CHECKING CREDENTIALS
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

//TO BE ABLE TO PARSE REQUEST BODY
app.use(express.json({ limit: "16kb" }));

//TO BE ABLE TO PARSE URL ENCODED REQUEST BODY
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//TO BE ABLE TO USE STATIC FILES
app.use(express.static("public"));

//TO BE ABLE TO PARSE COOKIES
app.use(cookieParser());

//IMPORTING ROUTES
import userRouter from "./routes/user.route.js";

//USING ROUTES (ie. SENDING REQUESTS TO THEIR CORRECT ROUTER.)
app.use("/api/v1/users", userRouter);

export { app };
