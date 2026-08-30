import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import farmersRouter from "./farmers";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import marketRouter from "./market";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(farmersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(marketRouter);

export default router;
