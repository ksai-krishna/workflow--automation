# Workflow-Automation

A node-based workflow automation platform inspired by n8n.

## Features

### Triggers

* Webhook Trigger
* Scheduler Trigger
* Manual Trigger

### Actions

* Send Email (SMTP/Nodemailer)
* Send Slack Message (Incoming Webhook)
* HTTP Request (GET/POST)

### Logic & Storage

* Branching: if/else, loops
* Database nodes: PostgreSQL, Firebase, Redis

## Tech Stack

**Frontend:** React, TailwindCSS, Zustand, React Flow
**Backend:** Node.js, Fastify, PostgreSQL
**Workflow Engine:** BullMQ (Redis-based)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to access the editor.