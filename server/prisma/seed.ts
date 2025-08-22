import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const wf = await prisma.workflow.create({
    data: {
      name: "Email Test Workflow",
      nodes: [
        {
          type: "action:email",
          data: {
            to: "your-email@example.com",   // 👈 change to your email
            subject: "Workflow test",
            text: "This is a test email from automation-app 🎉"
          }
        }
      ],
      edges: []
    }
  });

  console.log("Seeded workflow:", wf.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
