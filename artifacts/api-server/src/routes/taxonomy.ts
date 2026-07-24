import { Router, type IRouter } from "express";
import { taxonomyCatalogue } from "../lib/taxonomy-catalogue";

const router: IRouter = Router();

router.get("/taxonomy/versions", async (_req, res, next) => {
  try {
    res.json(await taxonomyCatalogue.versions());
  } catch (error) {
    next(error);
  }
});

router.get("/taxonomy/occupations", async (req, res, next) => {
  try {
    const items = await taxonomyCatalogue.occupations(version(req.query.version));
    res.json(items);
  } catch (error) {
    next(error);
  }
});

router.get("/taxonomy/skills", async (req, res, next) => {
  try {
    res.json(await taxonomyCatalogue.skills(version(req.query.version)));
  } catch (error) {
    next(error);
  }
});

router.get("/taxonomy/search", async (req, res, next) => {
  try {
    res.json(
      await taxonomyCatalogue.search(
        typeof req.query.q === "string" ? req.query.q : "",
        version(req.query.version),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/taxonomy/transitions", async (req, res, next) => {
  try {
    res.json(await taxonomyCatalogue.transitions(version(req.query.version)));
  } catch (error) {
    next(error);
  }
});

router.get("/taxonomy/readiness", async (req, res, next) => {
  try {
    const code = typeof req.query.occupationCode === "string"
      ? req.query.occupationCode
      : "";
    const result = await taxonomyCatalogue.readiness(
      code,
      version(req.query.version),
    );
    if (!result) {
      res.status(404).json({ error: "Occupation not found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

function version(value: unknown) {
  return typeof value === "string" && /^\d{4}\.\d+$/.test(value)
    ? value
    : "2026.1";
}

export default router;
