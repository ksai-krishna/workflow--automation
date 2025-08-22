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

function renderTemplate(template: string, payload: Record<string, any>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return payload[key] ?? "";
  });
}

export async function runNode(node: WorkflowNode, ctx: Record<string, any>) {
  console.log(`[Worker] Executing Node ID: ${node.id}`);
  console.log(`[Worker] Node Type: ${node.type}`);
  console.log(`[Worker] Node Data Received:`, JSON.stringify(node.data, null, 2));
  console.log(`[Worker] Current Context:`, JSON.stringify(ctx, null, 2));

  // Handle email nodes
  if (node.type === "action:email" || node.type === "sendEmail") {
    if (!node.data.to || !node.data.subject || !node.data.text) {
        throw new Error(`Email node ${node.id} is missing required data (to, subject, or text).`);
    }
    const resend = new Resend(env.RESEND_API_KEY);
    try {
      const renderedSubject = renderTemplate(node.data.subject, ctx);
      const renderedText = renderTemplate(node.data.text, ctx);
      
      const result = await resend.emails.send({
        from: env.SMTP_FROM || "automation@resend.dev",
        to: node.data.to,
        subject: renderedSubject,
        html: `<p>${renderedText}</p>`,
      });
      console.log(`[Worker] Resend API response for node ${node.id}:`, result);
    } catch (error) {
      console.error(`[Worker] Resend failed for node ${node.id}:`, error);
      throw error;
    }
  }

  // Handle slack nodes - support both naming conventions
  if (node.type === "action:slack" || node.type === "sendSlack" || node.type === "Send Slack Message") {
    if (!env.SLACK_WEBHOOK_URL) {
      throw new Error("SLACK_WEBHOOK_URL is not configured.");
    }
    if (!node.data.text) {
      throw new Error(`Slack node ${node.id} is missing 'text' data.`);
    }
    const renderedText = renderTemplate(node.data.text, ctx);
    try {
      await axios.post(env.SLACK_WEBHOOK_URL, { text: renderedText });
      console.log(`[Worker] Slack notification sent successfully from node ${node.id}: "${renderedText}"`);
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

  // Handle trigger nodes (they just pass through context)
  if (node.type === "webhookingTrigger" || node.type === "formTrigger" || node.type === "schedulerTrigger") {
    console.log(`[Worker] Processing trigger node ${node.id} of type ${node.type}`);
    // Triggers don't execute actions, they just provide context
  }

  return ctx; // Return the context to be passed to the next node
}

export const worker = new Worker(
  "workflow-jobs",
  async (job: Job) => {
    const { workflowId, payload } = job.data as { workflowId: string, payload?: any };
    console.log(`[Worker] Starting job ${job.id} for workflow ${workflowId}`);
    console.log(`[Worker] Job payload:`, JSON.stringify(payload, null, 2));
    
    const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!wf) throw new Error("Workflow not found");

    const exec = await prisma.execution.create({
      data: { workflowId: wf.id, status: "running", logs: [] },
    });

    try {
      const nodes = wf.nodes as WorkflowNode[];
      const edges = wf.edges as WorkflowEdge[];
      console.log(`[Worker] Processing ${nodes.length} nodes and ${edges.length} edges`);
      
      const nodesMap = new Map(nodes.map(node => [node.id, node]));
      
      // Find trigger nodes (nodes with no incoming edges)
      const nodeIdsWithIncoming = new Set(edges.map(edge => edge.target));
      const triggerNodes = nodes.filter(node => !nodeIdsWithIncoming.has(node.id));
      
      console.log(`[Worker] Found ${triggerNodes.length} trigger nodes:`, triggerNodes.map(n => `${n.id}(${n.type})`));

      if (triggerNodes.length === 0) {
        throw new Error("Could not find any trigger nodes (nodes with no incoming connections).");
      }

      // Use the payload from the trigger as the initial context
      let ctx: Record<string, any> = payload || {};

      // Process each trigger node and follow its path
      for (const triggerNode of triggerNodes) {
        console.log(`[Worker] Starting from trigger node: ${triggerNode.id} (${triggerNode.type})`);
        
        // Execute the trigger node (mainly for logging)
        await runNode(triggerNode, ctx);
        
        // Follow the path from this trigger
        let currentNode = triggerNode;
        const visitedNodes = new Set<string>();
        
        while (currentNode) {
          // Prevent infinite loops
          if (visitedNodes.has(currentNode.id)) {
            console.log(`[Worker] Detected cycle at node ${currentNode.id}, stopping path`);
            break;
          }
          visitedNodes.add(currentNode.id);
          
          // Find the next node(s) connected to current node
          const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
          console.log(`[Worker] Node ${currentNode.id} has ${outgoingEdges.length} outgoing edges`);
          
          if (outgoingEdges.length === 0) {
            console.log(`[Worker] End of path reached at node ${currentNode.id}`);
            break;
          }
          
          // For now, just follow the first edge (you can enhance this for conditional logic later)
          const nextEdge = outgoingEdges[0];
          const nextNode = nodesMap.get(nextEdge.target);
          
          if (!nextNode) {
            console.log(`[Worker] Next node ${nextEdge.target} not found`);
            break;
          }
          
          console.log(`[Worker] Moving to next node: ${nextNode.id} (${nextNode.type})`);
          
          // Execute the next node if it's not a trigger
          if (!nextNode.type.includes('Trigger') && !nextNode.type.includes('trigger')) {
            ctx = await runNode(nextNode, ctx);
          }
          
          currentNode = nextNode;
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
      
      console.log(`[Worker] Workflow ${workflowId} completed successfully`);
      
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