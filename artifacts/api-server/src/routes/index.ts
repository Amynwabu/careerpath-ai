import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import cvImportRouter from "./cv-import";
import workExperiencesRouter from "./work-experiences";
import educationRouter from "./education";
import skillsRouter from "./skills";
import certificationsRouter from "./certifications";
import careerGoalRouter from "./career-goal";
import analysisRouter from "./analysis";
import roadmapRouter from "./roadmap";
import milestonesRouter from "./milestones";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(cvImportRouter);
router.use(workExperiencesRouter);
router.use(educationRouter);
router.use(skillsRouter);
router.use(certificationsRouter);
router.use(careerGoalRouter);
router.use(analysisRouter);
router.use(roadmapRouter);
router.use(milestonesRouter);
router.use(dashboardRouter);

export default router;
