import type { Response } from "express";

export function initSSE(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}
export function sendToken(res: Response, text: string): void {
  res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
}
export function sendDone(res: Response): void {
  res.write(`event: done\ndata: {}\n\n`);
  res.end();
}
export function sendError(res: Response, message: string): void {
  res.write(`event: error\ndata: ${JSON.stringify({ message })}\n\n`);
  res.end();
}
