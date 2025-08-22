// src/worker.ts
import { Worker, Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";
import { Resend } from "resend";
import { connection } from "./queue.js";
import axios from "axios";
import Papa from "papaparse";
import stream from "stream";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const s3 = new S3Client({ region: "us-east-1" });

type WorkflowNode = {
    id: string;
    type: string;
    data: Record<string, any>;
};

type WorkflowEdge = {
    source: string;
    target: string;
};

const streamToString = async (readableStream: stream.Readable) => {
    const chunks: Uint8Array[] = [];
    for await (const chunk of readableStream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
};

async function runParseCsvNode(node: WorkflowNode, ctx: Record<string, any>) {
    if (!node.data.s3Link) {
        throw new Error("Parse CSV node is missing a valid s3Link.");
    }
    try {
        const s3Link = node.data.s3Link;
        const match = s3Link.match(/^s3:\/\/([^\/]+)\/(.+)$/);
        if (!match) throw new Error("Invalid S3 link format in Parse CSV node.");
        const [, Bucket, Key] = match;
        const command = new GetObjectCommand({ Bucket, Key });
        const response = await s3.send(command);
        const csvText = await streamToString(response.Body as stream.Readable);
        const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        console.log(`[Worker] Parsed CSV data for node ${node.id}:`, parsed.data);
        ctx.csvData = parsed.data;
        return ctx;
    } catch (err: any) {
        console.error(`[Worker] CSV parse failed for node ${node.id}:`, err);
        throw new Error(`CSV parse failed for node ${node.id}: ${err.message}`);
    }
}

async function runEnrichNode(node: WorkflowNode, ctx: Record<string, any>) {
    const inputRows = ctx.csvData;
    console.log(`[Worker:Enrich] Input data for enrichment:`, inputRows);
    if (!inputRows || inputRows.length === 0) {
        throw new Error("Enrich Data node received no input rows to enrich.");
    }
    try {
        const API_URL = env.LOCAL_API_URL;
        const res = await axios.post(`${API_URL}/enrich`, { rows: inputRows });
        const enrichedRows = res.data.rows;
        console.log(`[Worker] Enriched data for node ${node.id}:`, enrichedRows);
        ctx.enrichedData = enrichedRows;
        return ctx;
    } catch (err: any) {
        console.error(`[Worker] Enrichment failed for node ${node.id}:`, err);
        throw new Error(`Enrichment failed for node ${node.id}: ${err.message}`);
    }
}

async function runAirtableNode(node: WorkflowNode, ctx: Record<string, any>) {
    const inputRows = ctx.enrichedData;
    const { tableName } = node.data;
    console.log(`[Worker:Airtable] Data received for upload:`, inputRows);
    console.log(`[Worker:Airtable] Target table name: ${tableName}`);
    if (!inputRows || inputRows.length === 0) {
        console.error("[Worker:Airtable] No input data to send.");
        throw new Error("Airtable node received no input rows to send.");
    }
    if (!tableName) {
        console.error("[Worker:Airtable] Table name is missing.");
        throw new Error("Airtable node is missing the table name.");
    }
    try {
        const API_URL = env.LOCAL_API_URL;
        const res = await axios.post(`${API_URL}/send-to-airtable`, {
            tableName,
            rows: inputRows,
        });
        console.log(`[Worker:Airtable] Successfully sent data to Airtable API. Response:`, res.data);
        return ctx;
    } catch (err: any) {
        console.error(`[Worker:Airtable] Airtable upload failed for node ${node.id}:`, err);
        throw new Error(`Airtable upload failed: ${err.message}`);
    }
}

async function runPostgresNode(node: WorkflowNode, ctx: Record<string, any>) {
    const inputRows = ctx.enrichedData;
    const { tableName } = node.data;
    console.log(`[Worker:Postgres] Data received for upload:`, inputRows);
    console.log(`[Worker:Postgres] Target table name: ${tableName}`);
    if (!inputRows || inputRows.length === 0) {
        throw new Error("PostgreSQL node received no input rows to send.");
    }
    if (!tableName) {
        throw new Error("PostgreSQL node is missing the table name.");
    }
    try {
        const API_URL = env.LOCAL_API_URL;
        const res = await axios.post(`${API_URL}/send-to-postgres`, {
            tableName,
            rows: inputRows,
        });
        console.log(`[Worker:Postgres] Successfully sent data to Postgres API. Response:`, res.data);
        return ctx;
    } catch (err: any) {
        console.error(`[Worker:Postgres] PostgreSQL upload failed for node ${node.id}:`, err);
        throw new Error(`PostgreSQL upload failed: ${err.message}`);
    }
}

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
    } else if (node.type === "action:slack" || node.type === "sendSlack" || node.type === "Send Slack Message") {
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
    } else if (node.type === "parseCSV") {
        console.log(`[Worker] Processing Parse CSV node ${node.id}`);
        ctx = await runParseCsvNode(node, ctx);
    } else if (node.type === "EnrichData") {
        console.log(`[Worker] Processing Enrich Data node ${node.id}`);
        ctx = await runEnrichNode(node, ctx);
    } else if (node.type === "AirtableNode" || node.type === "Push To Airtable" || node.type === "Send to Airtable") {
        console.log(`[Worker] Processing Airtable node ${node.id}`);
        ctx = await runAirtableNode(node, ctx);
    } else if (node.type === "PostgresNode") {
        console.log(`[Worker] Processing Postgres node ${node.id}`);
        ctx = await runPostgresNode(node, ctx);
    } else if (node.type === "webhookingTrigger" || node.type === "formTrigger" || node.type === "schedulerTrigger") {
        console.log(`[Worker] Processing trigger node ${node.id} of type ${node.type}`);
    }
    return ctx;
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
            const nodeIdsWithIncoming = new Set(edges.map(edge => edge.target));
            const triggerNodes = nodes.filter(node => !nodeIdsWithIncoming.has(node.id));
            console.log(`[Worker] Found ${triggerNodes.length} trigger nodes:`, triggerNodes.map(n => `${n.id}(${n.type})`));
            if (triggerNodes.length === 0) {
                throw new Error("Could not find any trigger nodes (nodes with no incoming connections).");
            }
            let ctx: Record<string, any> = payload || {};
            for (const triggerNode of triggerNodes) {
                console.log(`[Worker] Starting from trigger node: ${triggerNode.id} (${triggerNode.type})`);
                ctx = await runNode(triggerNode, ctx);
                let currentNode = triggerNode;
                const visitedNodes = new Set<string>();
                while (currentNode) {
                    if (visitedNodes.has(currentNode.id)) {
                        console.log(`[Worker] Detected cycle at node ${currentNode.id}, stopping path`);
                        break;
                    }
                    visitedNodes.add(currentNode.id);
                    const outgoingEdges = edges.filter(edge => edge.source === currentNode.id);
                    console.log(`[Worker] Node ${currentNode.id} has ${outgoingEdges.length} outgoing edges`);
                    if (outgoingEdges.length === 0) {
                        console.log(`[Worker] End of path reached at node ${currentNode.id}`);
                        break;
                    }
                    const nextEdge = outgoingEdges[0];
                    const nextNode = nodesMap.get(nextEdge.target);
                    if (!nextNode) {
                        console.log(`[Worker] Next node ${nextEdge.target} not found`);
                        break;
                    }
                    console.log(`[Worker] Moving to next node: ${nextNode.id} (${nextNode.type})`);
                    ctx = await runNode(nextNode, ctx);
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