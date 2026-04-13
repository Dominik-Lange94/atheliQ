import { Router, Response } from "express";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";
import AiChatMessage from "../models/AiChatMessage";
import { buildAthleteAiContext } from "../ai/buildAthleteContext";
import { generateSPAQText } from "../ai/provider";

const router = Router();
router.use(authenticate, requireRole("athlete"));

const SYSTEM_PROMPT = `
Du bist SPAQ Bot, ein intelligenter Fitness- und Fortschrittsassistent.
Du bist motivierend, ehrlich, konkret und freundlich.
Du erfindest keine Daten.
Wenn Daten fehlen, sagst du das offen.
Du nutzt sowohl Profilkontext als auch Stats/Trends.
Du gibst keine medizinischen Diagnosen.
Du antwortest auf Deutsch.
Passe den Ton möglichst an "profile.aiTone" an:
- supportive = warm, motivierend, positiv
- direct = klar, knapp, ehrlich
- coach_like = strukturiert, sachlich, führend
Halte Antworten meistens kompakt, aber hilfreich.
Wenn sinnvoll, gib klare nächste Schritte in 2-4 Punkten.
`.trim();

router.get("/thread", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;

    const messages = await AiChatMessage.find({ athleteId })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    const lastMessage = messages[messages.length - 1];

    const unreadCount = messages.filter(
      (m) => m.role === "assistant" && !m.readAt
    ).length;

    res.json({
      success: true,
      data: {
        thread: {
          _id: "SPAQ-bot",
          type: "assistant",
          title: "SPAQ Bot",
          lastMessage:
            lastMessage?.text ||
            "Frag mich nach Motivation, Trends oder Verbesserungen.",
          lastMessageAt: lastMessage?.createdAt || new Date(),
          unreadCount,
        },
        messages: messages.map((m) => ({
          _id: String(m._id),
          threadId: "SPAQ-bot",
          senderId: m.role === "assistant" ? "SPAQ-bot" : athleteId,
          receiverId: m.role === "assistant" ? athleteId : "SPAQ-bot",
          text: m.text,
          createdAt: m.createdAt,
          readAt: m.readAt ?? null,
          meta: {
            type: m.role === "assistant" ? "assistant" : "user",
            provider: m.meta?.provider || "ollama",
            model: m.meta?.model || "",
            kind: m.meta?.kind || "chat",
            isOnboardingWelcome: Boolean(m.meta?.isOnboardingWelcome),
          },
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/ai/thread error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.post("/thread/read", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;

    await AiChatMessage.updateMany(
      {
        athleteId,
        role: "assistant",
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("POST /api/ai/thread/read error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/motivation", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const context = await buildAthleteAiContext(athleteId, date);

    const prompt = `
Erstelle eine kurze, persönliche Motivation für den heutigen Athleten.
Nutze NUR die vorhandenen Daten.

Kontext:
${JSON.stringify(context, null, 2)}

Regeln:
- beziehe wenn möglich Ziel, Hürden, Aktivitätsniveau oder Schlaf ein
- beziehe wenn möglich 1 echten Datenpunkt oder Trend ein
- wenn Datenlage dünn ist, sage das offen und gib einen einfachen Startfokus
- maximal 90 Wörter

Antwortformat:
1 kurze motivierende Einleitung
1 konkreter Datenbezug
1 kurzer nächster Fokus
`.trim();

    const result = await generateSPAQText({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
    });

    res.json({
      success: true,
      data: {
        text: result.text,
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    console.error("GET /api/ai/motivation error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI motivation failed",
    });
  }
});

router.get("/insights", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const context = await buildAthleteAiContext(athleteId, date);

    const prompt = `
Analysiere den Athletenkontext datenbasiert.

Kontext:
${JSON.stringify(context, null, 2)}

Gib JSON zurück mit genau dieser Struktur:
{
  "summary": "kurze Zusammenfassung",
  "strengths": ["..."],
  "risks": ["..."],
  "nextSteps": ["..."],
  "focusMetricIds": ["optional cardId"]
}

Regeln:
- nichts erfinden
- wenn Daten fehlen, ehrlich benennen
- strengths/risks/nextSteps jeweils 0-4 Einträge
- keine medizinischen Diagnosen
`.trim();

    const result = await generateSPAQText({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.4,
    });

    res.json({
      success: true,
      data: {
        raw: result.text,
        provider: result.provider,
        model: result.model,
      },
    });
  } catch (error) {
    console.error("GET /api/ai/insights error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI insights failed",
    });
  }
});

router.post("/thread/messages", async (req: AuthRequest, res: Response) => {
  try {
    const athleteId = req.user!.userId;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const date =
      typeof req.body?.selectedDate === "string"
        ? req.body.selectedDate
        : undefined;

    if (!text) {
      res.status(400).json({ success: false, error: "Text is required" });
      return;
    }

    const userMessage = await AiChatMessage.create({
      athleteId,
      role: "user",
      text,
      readAt: new Date(),
      meta: {
        provider: "client",
        model: "",
        kind: "chat",
      },
    });

    const history = await AiChatMessage.find({ athleteId })
      .sort({ createdAt: 1 })
      .limit(12)
      .lean();

    const context = await buildAthleteAiContext(athleteId, date);

    const prompt = `
Athletenkontext:
${JSON.stringify(context, null, 2)}

Letzte Konversation:
${history.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n")}

Aufgabe:
- beantworte die letzte User-Nachricht hilfreich und datenbasiert
- nutze Profil + Stats + Trends
- bei Verbesserung: konkrete nächste Schritte
- bei Motivation: individuell auf Ziel/Hürden/Ton eingehen
- bei fehlenden Daten: offen sagen, was noch fehlt
`.trim();

    const result = await generateSPAQText({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.6,
    });

    const assistantMessage = await AiChatMessage.create({
      athleteId,
      role: "assistant",
      text: result.text,
      readAt: null,
      meta: {
        provider: result.provider,
        model: result.model,
        kind: "chat",
      },
    });

    res.json({
      success: true,
      data: {
        userMessage: {
          _id: String(userMessage._id),
          threadId: "SPAQ-bot",
          senderId: athleteId,
          receiverId: "SPAQ-bot",
          text: userMessage.text,
          createdAt: userMessage.createdAt,
          readAt: userMessage.readAt,
          meta: {
            type: "user",
            provider: "client",
            model: "",
            kind: "chat",
          },
        },
        assistantMessage: {
          _id: String(assistantMessage._id),
          threadId: "SPAQ-bot",
          senderId: "SPAQ-bot",
          receiverId: athleteId,
          text: assistantMessage.text,
          createdAt: assistantMessage.createdAt,
          readAt: assistantMessage.readAt,
          meta: {
            type: "assistant",
            provider: result.provider,
            model: result.model,
            kind: "chat",
          },
        },
      },
    });
  } catch (error) {
    console.error("POST /api/ai/thread/messages error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "AI chat failed",
    });
  }
});

export default router;
