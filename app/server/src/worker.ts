import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { Resend } from "resend";
import { connection } from "./queue.js";
import axios from "axios";

const prisma = new PrismaClient();

type WorkflowNode = {
  id: string;
  type: string;
  data: Record<string, any>;
};

type WorkflowEdge = {
  source: string;
  target: string;
};

async function runNode(node: WorkflowNode, ctx: Record<string, any>) {
  console.log(`[Worker] Executing Node ID: ${node.id}`);
  console.log(`[Worker] Node Type: ${node.type}`);
  console.log(`[Worker] Node Data Received:`, JSON.stringify(node.data, null, 2));
  console.log(`[Worker] Current Context:`, JSON.stringify(ctx, null, 2));

  if (node.type === "action:email" || node.type === "sendEmail") {
    if (!node.data.to || !node.data.subject || !node.data.text) {
        throw new Error(`Email node ${node.id} is missing required data (to, subject, or text).`);
    }
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const result = await resend.emails.send({
        from: env.SMTP_FROM || "automation@resend.dev",
        to: node.data.to,
        subject: node.data.subject,
        html: `<p>${node.data.text}</p>`,
      });
      console.log(`[Worker] Resend API response for node ${node.id}:`, result);
    } catch (error) {
      console.error(`[Worker] Resend failed for node ${node.id}:`, error);
      throw error;
    }
  }

  if (node.type === "action:slack" || node.type === "sendSlack") {
    if (!env.SLACK_WEBHOOK_URL) {
      throw new Error("SLACK_WEBHOOK_URL is not configured.");
    }
    if (!node.data.text) {
      throw new Error(`Slack node ${node.id} is missing 'text' data.`);
    }
    try {
      await axios.post(env.SLACK_WEBHOOK_URL, { text: node.data.text });
      console.log(`[Worker] Slack notification sent successfully from node ${node.id}`);
    } catch (error: any) {
        let errorMessage = `Slack API request failed for node ${node.id}.`;
        if (axios.isAxiosError(error) && error.response) {
          errorMessage += ` Status: ${error.response.status}. Data: ${JSON.stringify(error.response.data)}`;
        } else {
          errorMessage += ` Message: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
  }

  return ctx; // Return the context to be passed to the next node
}

export const worker = new Worker(
  "workflow-jobs",
  async (job: Job) => {
    // --- THIS JOB HANDLER IS NOW UPDATED ---
    const { workflowId, payload } = job.data as { workflowId: string, payload?: any };
    console.log(`[Worker] Starting job ${job.id} for workflow ${workflowId}`);
    
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf) throw new Error("Workflow not found");

    const exec = await prisma.execution.create({
      data: { workflowId: wf.id, status: "running", logs: [] },
    });

    try {
      const nodes = wf.nodes as WorkflowNode[];
      const edges = wf.edges as WorkflowEdge[];
      const nodesMap = new Map(nodes.map(node => [node.id, node]));
      const nodeIdsWithTargets = new Set(edges.map(edge => edge.target));
      let currentNode = nodes.find(node => !nodeIdsWithTargets.has(node.id));

      if (!currentNode) {
        throw new Error("Could not find a starting (trigger) node.");
      }

      // Use the payload from the form submission as the initial context
      let ctx: Record<string, any> = payload || {};

      while (currentNode) {
        ctx = await runNode(currentNode, ctx);
        const nextEdge = edges.find(edge => edge.source === currentNode!.id);
        if (nextEdge) {
          currentNode = nodesMap.get(nextEdge.target);
        } else {
          currentNode = undefined;
        }
      }

      await prisma.execution.update({
        where: { id: exec.id },
        data: {
          status: "success",
          finishedAt: new Date(),
          logs: [{ ts: new Date().toISOString(), level: "info", msg: "Workflow completed successfully." }] as any,
        },
      });
    } catch (err: any) {
      console.error(`[Worker] Workflow failed: ${err.message}`);
      await prisma.execution.update({
        where: { id: exec.id },
        data: {
          status: "error",
          finishedAt: new Date(),
          logs: [{ ts: new Date().toISOString(), level: "error", msg: err.message }] as any,
        },
      });
      throw err;
    }
  },
  { connection }
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed successfully.`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed with error: ${err.message}`));
