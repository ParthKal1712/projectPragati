import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

//CREATE A NEW ROUTER
const router = Router();

//ROUTING THE REQUEST TO THE CONTROLLER
router.route("/register").post(registerUser);

//EXPORTING THE ROUTER
export default router;
