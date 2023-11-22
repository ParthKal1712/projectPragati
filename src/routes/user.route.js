import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

//CREATE A NEW ROUTER
const router = Router();

//ROUTING THE REQUEST TO THE CONTROLLER
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

//EXPORTING THE ROUTER
export default router;
