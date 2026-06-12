import { Router, type IRouter } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth";
import { extractText, parseCvText } from "../lib/cv-parser";

const router: IRouter = Router();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Only PDF and DOCX files are supported."));
      return;
    }
    cb(null, true);
  },
});

router.post("/profile/import-cv", requireAuth, upload.single("file"), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "CV file is required." });
      return;
    }

    const text = await extractText(req.file.buffer, req.file.mimetype);
    const suggestion = parseCvText(text);

    res.json({
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      ...suggestion,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to parse CV.";
    const status = message.includes("supported") ? 400 : message.includes("timed out") ? 408 : 422;
    res.status(status).json({ error: message });
  }
});

export default router;
