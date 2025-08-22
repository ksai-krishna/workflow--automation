// server/index.ts

import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { jobQueue } from "./queue.js";
import { customAlphabet } from "nanoid";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from 'url'
import { runNode } from "./worker.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// Helper to generate a unique 5-character ID
const generateFormId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 5);

await app.register(cors, { origin: ["http://localhost:5173", "http://192.168.1.5:5173"],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});


app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'), // Path to your frontend's build output (e.g., 'dist')
  prefix: '/', // Serve at the root URL
  wildcard: false, // Ensure Fastify handles routes not matching static files
});

app.get('/*', async (req, reply) => {
  try {
    const indexPath = path.join(__dirname, '..', 'public', 'index.html');
    reply.sendFile('index.html', path.join(__dirname, '..', 'public'));
  } catch (error) {
    console.error("Error serving frontend index.html:", error);
    reply.status(500).send("Internal Server Error");
  }
});





// --- Serve the form ---
app.get("/forms/:formId", async (req, reply) => {
  const { formId } = req.params as any;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { formId },
    });

    if (!workflow) {
      return reply.status(404).send("Form not found.");
    }

    // New submit endpoint (instead of /workflows/:id/execute)
    const submitUrl = `${env.LOCAL_API_URL}/forms/${formId}/submit`;

    const html = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${workflow.name} Form</title>
    <style>
        body {
            font-family: sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 500px;
        }
        h1 { margin-top: 0; }
        label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
        input, textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-sizing: border-box;
            margin-bottom: 1rem;
        }
        button {
            width: 100%;
            padding: 0.75rem;
            border: none;
            border-radius: 6px;
            background-color: #007bff;
            color: white;
            font-size: 1rem;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${workflow.name}</h1>
        <form id="workflow-form">
            <div>
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div>
                <label for="email">Email:</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div>
                <label for="message">Message:</label>
                <textarea id="message" name="message" rows="4" required></textarea>
            </div>
            <button type="submit">Submit</button>
        </form>
    </div>

    <script>
        const form = document.getElementById("workflow-form");
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = Object.fromEntries(new FormData(form).entries());

            try {
                const res = await fetch("${submitUrl}", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });

                if (res.ok) {
                    alert("Form submitted successfully!");
                } else {
                    const error = await res.json();
                    alert("Error: " + error.message);
                }
            } catch (err) {
                console.error("Form submission failed", err);
                alert("Error: Could not submit form");
            }
        });
    </script>
</body>
</html>

    `;

    reply.type("text/html").send(html);
  } catch (error) {
    console.error(error);
    reply.status(500).send("Internal Server Error");
  }
});


// --- Handle form submission ---
app.post("/forms/:formId/submit", async (req, reply) => {
  try {
    const { formId } = req.params as { formId: string };
    const formData = req.body as Record<string, any>;

    const workflow = await prisma.workflow.findUnique({ where: { formId } });
    if (!workflow) {
      return reply.status(404).send({ error: "Workflow not found" });
    }

    // Take name just for message templates (not stored in DB)
    const submitterName = formData.name || "Anonymous";

    // Strip out sensitive fields (like "name") before saving payload
    const { name, ...safeFormData } = formData;

    // Payload used by workflow actions (no sensitive info unless needed)
    const payload = {
      ...safeFormData,  
      name: submitterName,        // kept only in-memory for actions/templates
      workflowName: workflow.name,
    };

    await jobQueue.add("execute-workflow", {
      workflowId: workflow.id,
      payload,
      name: `${submitterName} - ${workflow.name}`, // job label (not stored in Prisma)
    });

    return reply.send({ success: true, message: "Form submitted" });
  } catch (err) {
    console.error("Form submission failed:", err);
    return reply.status(500).send({ error: "Form submission failed" });
  }
});


app.post("/request/:webhookId", async (req, reply) => {
  try {
    const { webhookId } = req.params as { webhookId: string };
    const requestData = req.body as Record<string, any>;

    console.log(`[WEBHOOK] Received request for webhook ID: ${webhookId}`);
    console.log(`[WEBHOOK] Request data:`, requestData);

    // Find workflow that contains a webhookingTrigger node with this webhookId
    const workflows = await prisma.workflow.findMany();
    console.log(`[WEBHOOK] Checking ${workflows.length} workflows`);
    
    let targetWorkflow = null;
    for (const workflow of workflows) {
      const nodes = workflow.nodes as any[];
      console.log(`[WEBHOOK] Checking workflow ${workflow.name} (${workflow.id}) with ${nodes.length} nodes`);
      
      const webhookNode = nodes.find(n => {
        const isWebhookType = n.type === "webhookingTrigger";
        const hasMatchingId = n.data?.webhookId === webhookId;
        console.log(`[WEBHOOK] Node ${n.id}: type=${n.type}, webhookId=${n.data?.webhookId}, matches=${isWebhookType && hasMatchingId}`);
        return isWebhookType && hasMatchingId;
      });
      
      if (webhookNode) {
        console.log(`[WEBHOOK] Found matching webhook node in workflow ${workflow.name}`);
        targetWorkflow = workflow;
        break;
      }
    }

    if (!targetWorkflow) {
      console.log(`[WEBHOOK] No workflow found with webhook ID: ${webhookId}`);
      return reply.status(404).send({ 
        error: "Webhook not found",
        webhookId,
        availableWebhooks: workflows.map(w => {
          const nodes = w.nodes as any[];
          return nodes
            .filter(n => n.type === "webhookingTrigger")
            .map(n => ({ workflowName: w.name, webhookId: n.data?.webhookId }));
        }).flat()
      });
    }

    console.log(`[WEBHOOK] Found workflow: ${targetWorkflow.name} (ID: ${targetWorkflow.id})`);

    // Build payload context
    const payload = {
      ...requestData,
      workflowName: targetWorkflow.name,
      webhookId: webhookId,
      timestamp: new Date().toISOString(),
    };

    console.log(`[WEBHOOK] Adding job to queue with payload:`, payload);

    // Add to job queue for proper workflow execution
    await jobQueue.add("execute-workflow", {
      workflowId: targetWorkflow.id,
      payload: payload,
      name: `Webhook ${webhookId} - ${targetWorkflow.name}`,
    });

    console.log(`[WEBHOOK] Successfully queued workflow execution for: ${targetWorkflow.name}`);

    return reply.send({ 
      success: true, 
      message: `Webhook triggered workflow: ${targetWorkflow.name}`,
      workflowId: targetWorkflow.id,
      payload: payload
    });

  } catch (err) {
    console.error("[WEBHOOK] Trigger failed:", err);
    return reply.status(500).send({ 
      error: "Webhook trigger failed", 
      details: err instanceof Error ? err.message : String(err)
    });
  }
});


app.post("/workflows", async (req, reply) => {
  const body = req.body as any;
  let formId: string | undefined = undefined;
  let schedule: string | undefined = undefined;

  const formTriggerNode = body.nodes.find((node: any) => node.type === 'formTrigger');
  if (formTriggerNode) {
    formId = generateFormId();
  }

  // Find the scheduler node in the workflow
  const schedulerNode = body.nodes.find((node: any) => node.type === 'schedulerTrigger');
  if (schedulerNode && schedulerNode.data.cron) {
    schedule = schedulerNode.data.cron;
  }

  // Update webhook nodes to ensure they have proper URLs after save
  const updatedNodes = body.nodes.map((node: any) => {
    if (node.type === 'webhookingTrigger' && node.data?.webhookId) {
      return {
        ...node,
        data: {
          ...node.data,
          webhookUrl: `${env.LOCAL_API_URL}/request/${node.data.webhookId}`
        }
      };
    }
    return node;
  });

  const wf = await prisma.workflow.create({
    data: { 
      name: body.name || "Untitled Workflow", 
      nodes: updatedNodes, // Use updated nodes with proper webhook URLs
      edges: body.edges,
      formId: formId,
      schedule: schedule,
    }
  });

  // --- MANAGE REPEATABLE JOB IN BULLMQ ---
  const jobName = "execute-workflow";
  const jobId = `schedule:${wf.id}`;

  // 1. Remove any old schedule for this workflow to prevent duplicates
  const repeatableJobs = await jobQueue.getRepeatableJobs();
  const existingJob = repeatableJobs.find(job => job.id === jobId);
  if (existingJob) {
    await jobQueue.removeRepeatableByKey(existingJob.key);
  }

  // 2. If a new schedule is provided, add it
  if (schedule) {
    await jobQueue.add(jobName, { workflowId: wf.id }, {
      repeat: {
        pattern: schedule,
      },
      jobId: jobId,
    });
    console.log(`[API] Scheduled workflow ${wf.id} with pattern: ${schedule}`);
  }

  return reply.send(wf);
});

app.get("/health", async () => {
  return { ok: true, time: new Date() };
});

app.get("/workflows", async (request, reply) => {
  try {
    const workflows = await prisma.workflow.findMany({
      include: { executions: true }, // also fetch executions if you want
    });
    return workflows;
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Failed to fetch workflows" });
  }
});

app.post("/workflows/:id/execute", async (req, reply) => {
  const { id } = req.params as any;
  const payload = req.body; 

  await jobQueue.add("execute-workflow", { workflowId: id, payload: payload });
  
  return reply.send({ queued: true });
});

app.get("/workflows/:id/executions", async (req, reply) => {
  const { id } = req.params as any;

  try {
    const executions = await prisma.execution.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: "desc" },
    });
    return executions;
  } catch (err) {
    console.error(err);
    reply.status(500).send({ error: "Failed to fetch executions" });
  }
});

app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`server listening on :${env.PORT}`);
  });
