import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser);

//SECURED ROUTES
router.route("/logout").post(verifyJWT, logoutUser);

//EXPORTING THE ROUTER
export default router;
