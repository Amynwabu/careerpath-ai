import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Express } from "express";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-with-more-than-32-characters";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://careerpath@localhost:5433/careerpath_ai_test";
process.env.COOKIE_SECURE = "false";

const CSRF_HEADER = "x-csrf-token";
const TABLES = [
  "activity_log",
  "milestones",
  "career_analyses",
  "career_goals",
  "certifications",
  "skills",
  "education",
  "work_experiences",
  "profiles",
  "users",
];

let app: Express;
let pool: { query: (sql: string) => Promise<{ rows: Array<Record<string, unknown>> }>; end: () => Promise<void> };
let buildReadinessSubScores: typeof import("./routes/analysis").buildReadinessSubScores;
let buildRoadmapPhases: typeof import("./routes/analysis").buildRoadmapPhases;
let signActionToken: typeof import("./middlewares/auth").signActionToken;

beforeAll(async () => {
  const appModule = await import("./app");
  const dbModule = await import("@workspace/db");
  const analysisModule = await import("./routes/analysis");
  const authModule = await import("./middlewares/auth");

  app = appModule.default;
  pool = dbModule.pool;
  buildReadinessSubScores = analysisModule.buildReadinessSubScores;
  buildRoadmapPhases = analysisModule.buildRoadmapPhases;
  signActionToken = authModule.signActionToken;
});

beforeEach(async () => {
  await pool.query(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});

function cookieHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join(";") : value ?? "";
}

async function csrf(agent: ReturnType<typeof request.agent>) {
  const response = await agent.get("/api/auth/csrf").expect(200);
  expect(response.body.csrfToken).toEqual(expect.any(String));
  return response.body.csrfToken as string;
}

async function register(agent: ReturnType<typeof request.agent>, email = "test@example.com") {
  const token = await csrf(agent);
  const response = await agent
    .post("/api/auth/register")
    .set(CSRF_HEADER, token)
    .send({ name: "Test User", email, password: "correct-password" })
    .expect(201);

  expect(cookieHeader(response.headers["set-cookie"])).toContain("careerpath_session=");
  expect(response.body.csrfToken).toEqual(expect.any(String));
  return response.body.csrfToken as string;
}

async function activityTypesForUser(userId = 1): Promise<string[]> {
  const result = await pool.query(`SELECT type FROM activity_log WHERE user_id = ${userId} ORDER BY id`);
  return result.rows.map((row) => String(row.type));
}

async function createKnownPdf() {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.text("Jane Candidate");
    doc.text("Senior Data Analyst");
    doc.text("jane@example.com +44 7700 900123 https://linkedin.com/in/jane-candidate");
    doc.text("Professional Summary");
    doc.text("Data leader with 8 years of experience delivering SQL, Python, Tableau, and stakeholder management outcomes.");
    doc.text("Experience");
    doc.text("Senior Data Analyst at Example Analytics");
    doc.text("Jan 2020 - Present");
    doc.text("Education");
    doc.text("MSc Data Science 2017");
    doc.text("Skills");
    doc.text("SQL, Python, Tableau, Stakeholder Management");
    doc.end();
  });
}

describe("auth integration", () => {
  it("registers, authenticates, logs out, and rejects the cleared session", async () => {
    const agent = request.agent(app);
    const token = await register(agent);

    await agent.get("/api/auth/me").expect(200).expect((response) => {
      expect(response.body.email).toBe("test@example.com");
    });

    const logout = await agent.post("/api/auth/logout").set(CSRF_HEADER, token).expect(200);
    const cookies = cookieHeader(logout.headers["set-cookie"]);
    expect(cookies).toContain("careerpath_session=");
    expect(cookies).toContain("careerpath_csrf=");

    await agent.get("/api/auth/me").expect(401);
  });

  it("logs known-user failed login attempts and failed CSRF checks", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "audit@example.com");

    const loginAgent = request.agent(app);
    const loginCsrf = await csrf(loginAgent);
    await loginAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER, loginCsrf)
      .send({ email: "audit@example.com", password: "wrong-password" })
      .expect(401);

    await agent.post("/api/auth/logout").set(CSRF_HEADER, `${token}-bad`).expect(403);

    await expect(activityTypesForUser()).resolves.toEqual(expect.arrayContaining([
      "auth.login_failed",
      "security.csrf_failed",
    ]));
  });

  it("verifies email with a signed verification token", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "verify@example.com");
    const verificationToken = signActionToken({
      purpose: "email-verification",
      userId: 1,
      email: "verify@example.com",
      tokenVersion: 0,
    }, "1h");

    await agent
      .post("/api/auth/verify-email")
      .set(CSRF_HEADER, token)
      .send({ token: verificationToken })
      .expect(200)
      .expect((response) => {
        expect(response.body.user.emailVerified).toBe(true);
      });
  });

  it("resets a password and invalidates the existing session", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "reset@example.com");
    const resetToken = signActionToken({
      purpose: "password-reset",
      userId: 1,
      email: "reset@example.com",
      tokenVersion: 0,
    }, "1h");

    await agent
      .post("/api/auth/reset-password")
      .set(CSRF_HEADER, token)
      .send({ token: resetToken, password: "new-correct-password" })
      .expect(200);

    await expect(activityTypesForUser()).resolves.toContain("auth.password_reset");
    await agent.get("/api/auth/me").expect(401);

    const loginAgent = request.agent(app);
    const loginCsrf = await csrf(loginAgent);
    await loginAgent
      .post("/api/auth/login")
      .set(CSRF_HEADER, loginCsrf)
      .send({ email: "reset@example.com", password: "new-correct-password" })
      .expect(200);
  });
});

describe("analysis integration", () => {
  it("creates structured analysis output and analysis-linked milestones", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "analysis@example.com");

    await agent
      .patch("/api/profile")
      .set(CSRF_HEADER, token)
      .send({
        currentRole: "Data Analyst",
        totalExperienceMonths: 72,
        industry: "Technology",
        professionalSummary: "Analytics professional with strong delivery and stakeholder experience.",
        careerLevel: "Mid-level",
        weeklyLearningMinutes: 300,
      })
      .expect(200);

    await agent
      .post("/api/work-experiences")
      .set(CSRF_HEADER, token)
      .send({
        company: "Example Analytics",
        title: "Data Analyst",
        startDate: "2020-01-01",
        isCurrent: true,
        description: "Built dashboards and led insight delivery.",
      })
      .expect(201);

    await agent
      .post("/api/education")
      .set(CSRF_HEADER, token)
      .send({
        institution: "Cranfield University",
        degree: "MSc",
        fieldOfStudy: "Data Science",
        startDate: "2018-01-01",
        isCurrent: false,
      })
      .expect(201);

    await agent.post("/api/skills").set(CSRF_HEADER, token).send({ name: "SQL", category: "Analytical", proficiencyLevel: "Advanced" }).expect(201);
    await agent.post("/api/skills").set(CSRF_HEADER, token).send({ name: "Python", category: "Technical", proficiencyLevel: "Intermediate" }).expect(201);
    await agent.post("/api/certifications").set(CSRF_HEADER, token).send({ name: "Google Data Analytics Certificate", issuingOrganization: "Google" }).expect(201);

    await agent
      .put("/api/career-goal")
      .set(CSRF_HEADER, token)
      .send({ targetRole: "AI Product Manager", targetMonths: 12 })
      .expect(200);

    const analysis = await agent
      .post("/api/analysis")
      .set(CSRF_HEADER, token)
      .set("Idempotency-Key", "analysis-happy-path")
      .expect(201);

    expect(analysis.body.readinessScore).toBeGreaterThan(0);
    expect(analysis.body.readinessSubScores).toMatchObject({
      profile: expect.any(Number),
      skills: expect.any(Number),
      experience: expect.any(Number),
    });
    expect(analysis.body.skillGapsStructured).toEqual(expect.arrayContaining([expect.objectContaining({ title: expect.any(String) })]));
    expect(analysis.body.roadmapPhases).toHaveLength(4);
    expect(analysis.body.learningRecommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceType: "skill-gap",
        courses: expect.arrayContaining([
          expect.objectContaining({
            provider: expect.any(String),
            url: expect.stringMatching(/^https:\/\//),
          }),
        ]),
      }),
    ]));
    expect(analysis.body.profileSnapshot.skills).toEqual(expect.arrayContaining(["SQL", "Python"]));

    const milestones = await agent.get("/api/milestones").expect(200);
    expect(milestones.body.length).toBeGreaterThan(0);
    expect(milestones.body.every((milestone: { analysisId: number }) => milestone.analysisId === analysis.body.id)).toBe(true);
  });
});

describe("CV import integration", () => {
  it("returns editable suggestions for a known PDF", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "cv@example.com");
    const pdf = await createKnownPdf();

    const response = await agent
      .post("/api/profile/import-cv")
      .set(CSRF_HEADER, token)
      .attach("file", pdf, { filename: "candidate.pdf", contentType: "application/pdf" })
      .expect(200);

    expect(response.body.fileName).toBe("candidate.pdf");
    expect(response.body.profile.currentRole).toEqual(expect.stringContaining("Data"));
    expect(response.body.skills.map((skill: { name: string }) => skill.name.toLowerCase())).toEqual(expect.arrayContaining(["sql", "python"]));
    expect(response.body.warnings).toEqual(expect.any(Array));
  });

  it("rejects unsupported multipart uploads", async () => {
    const agent = request.agent(app);
    const token = await register(agent, "invalid-cv@example.com");

    await agent
      .post("/api/profile/import-cv")
      .set(CSRF_HEADER, token)
      .attach("file", Buffer.from("plain text"), { filename: "candidate.txt", contentType: "text/plain" })
      .expect(400);
  });
});

describe("analysis engine unit coverage", () => {
  it("scores empty and complete profiles predictably", () => {
    const empty = buildReadinessSubScores({
      profile: {},
      skills: [],
      workExp: [],
      education: [],
      certifications: [],
    });
    expect(empty).toEqual({
      profile: 20,
      skills: 20,
      experience: 15,
      education: 35,
      certifications: 25,
    });

    const complete = buildReadinessSubScores({
      profile: {
        currentRole: "Senior Analyst",
        totalExperienceMonths: 120,
        industry: "Technology",
        professionalSummary: "Strong professional summary",
        careerLevel: "Senior",
        weeklyLearningMinutes: 300,
      },
      skills: Array.from({ length: 12 }, (_, index) => ({ name: `Skill ${index}`, category: "Technical", proficiencyLevel: "Advanced" })),
      workExp: [{ company: "Example", title: "Senior Analyst" }, { company: "Example 2", title: "Analyst" }],
      education: [{ degree: "MSc", institution: "Cranfield" }],
      certifications: [{ name: "PMP", issuingOrganization: "PMI" }, { name: "AWS", issuingOrganization: "Amazon" }],
    });

    expect(complete.profile).toBe(100);
    expect(complete.skills).toBe(100);
    expect(complete.experience).toBe(100);
    expect(complete.education).toBeGreaterThan(empty.education);
    expect(complete.certifications).toBeGreaterThan(empty.certifications);
  });

  it("builds valid roadmap phase ranges at boundary target durations", () => {
    const oneMonth = buildRoadmapPhases("AI Product Manager", 1, 300);
    expect(oneMonth).toHaveLength(4);
    expect(oneMonth.map((phase) => phase.timeframe)).toEqual([
      "0-30 days",
      "Months 1-1",
      "Months 1-1",
      "Months 1-1",
    ]);

    const fiveYears = buildRoadmapPhases("AI Product Manager", 60, 300);
    expect(fiveYears.map((phase) => phase.timeframe)).toEqual([
      "0-30 days",
      "Months 1-3",
      "Months 4-36",
      "Months 37-60",
    ]);
  });
});
