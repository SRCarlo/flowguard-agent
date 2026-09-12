import { Router } from "express";

import { runIncidentCommander } from "../agents/incidentCommander.js";

const router = Router();

router.post("/ask", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const answer = await runIncidentCommander(message);

    res.json({
      answer,
    });
  } catch (error) {
    console.error("Agent request failed:", error);

    res.status(500).json({
      error: "FlowGuard agent failed to process the request.",
    });
  }
});

export default router;
