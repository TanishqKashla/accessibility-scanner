import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connection";
import { verifyAuth } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";
import mongoose from "mongoose";

// GET /api/scans/:scanId/progress — SSE endpoint for live scan updates
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  const user = await verifyAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { scanId } = await params;

  await connectDB();
  const Scan = mongoose.models.Scan;

  // Verify scan belongs to user's org
  const scan = await Scan.findOne({ _id: scanId, orgId: user.orgId });
  if (!scan) {
    return new Response("Scan not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Poll for updates every 2 seconds
      const interval = setInterval(async () => {
        try {
          const currentScan = await Scan.findById(scanId).lean();
          if (!currentScan) {
            sendEvent({ type: "error", message: "Scan not found" });
            clearInterval(interval);
            controller.close();
            return;
          }

          const scanData = currentScan as Record<string, unknown>;
          const progress = scanData.progress as Record<string, unknown> | undefined;

          sendEvent({
            type: "progress",
            status: scanData.status,
            progress: progress || {},
          });

          // Close stream when scan is done
          if (scanData.status === "completed" || scanData.status === "failed") {
            sendEvent({ type: "done", status: scanData.status });
            clearInterval(interval);
            controller.close();
          }
        } catch (error) {
          logger.error({ err: error }, "SSE polling error");
        }
      }, 2000);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
