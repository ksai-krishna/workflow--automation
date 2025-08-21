import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { jobQueue } from "./queue.js";
import { customAlphabet } from "nanoid";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

// Helper to generate a unique 5-character ID
const generateFormId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 5);

await app.register(cors, { origin: true });


// --- NEW ENDPOINT TO SERVE THE PUBLIC FORM ---
app.get("/forms/:formId", async (req, reply) => {
  const { formId } = req.params as any;

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { formId },
    });

    if (!workflow) {
      return reply.status(404).send("Form not found.");
    }

    // This is the webhook URL the form will submit to
    const webhookUrl = `${env.API_URL}/workflows/${workflow.id}/execute`;

    // Dynamically generate the HTML, injecting the correct webhook URL
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Submit to Workflow</title>
          <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f2f5; }
              .container { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); width: 100%; max-width: 500px; }
              h1 { margin-top: 0; }
              label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
              input, textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; margin-bottom: 1rem; }
              button { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background-color: #007bff; color: white; font-size: 1rem; cursor: pointer; }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>${workflow.name}</h1>
              <form action="${webhookUrl}" method="POST">
                  <div><label for="name">Name:</label><input type="text" id="name" name="name" required></div>
                  <div><label for="email">Email:</label><input type="email" id="email" name="email" required></div>
                  <div><label for="message">Message:</label><textarea id="message" name="message" rows="4" required></textarea></div>
                  <button type="submit">Submit</button>
              </form>
          </div>
      </body>
      </html>
    `;

    reply.type("text/html").send(html);
  } catch (error) {
    console.error(error);
    reply.status(500).send("Internal Server Error");
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

  const wf = await prisma.workflow.create({
    data: { 
      name: body.name, 
      nodes: body.nodes, 
      edges: body.edges,
      formId: formId,
      schedule: schedule, // Save the schedule to the DB
    }
  });

  // --- MANAGE REPEATABLE JOB IN BULLMQ ---
  const jobName = "execute-workflow";
  const jobId = `schedule:${wf.id}`; // A unique, predictable ID for this workflow's schedule

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
        pattern: schedule, // The CRON string from the node
      },
      jobId: jobId, // Use the unique ID
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
