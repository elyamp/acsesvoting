import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const superEmail = process.env.SUPERADMIN_EMAIL || "superadmin@acses.org";
  const superPassword = process.env.SUPERADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email: superEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: superEmail,
        name: "Super Administrator",
        role: "SUPERADMIN",
        passwordHash: await bcrypt.hash(superPassword, 12),
      },
    });
    console.log(`Seeded superadmin: ${superEmail} / ${superPassword}`);
  } else {
    console.log(`Superadmin already exists: ${superEmail}`);
  }

  // Demo data (safe to delete in production)
  if (process.env.SEED_DEMO === "true") {
    const voterCount = await prisma.voter.count();
    if (voterCount === 0) {
      const passwordHash = await bcrypt.hash("Vote1234!", 12);
      const demoVoters = [
        { indexNumber: "FCM.21.101.203.01", email: "cs-amina1001@st.umat.edu.gh", name: "Amina Bello" },
        { indexNumber: "FCM.21.101.203.02", email: "cs-chidi1002@st.umat.edu.gh", name: "Chidi Okeke" },
        { indexNumber: "FCM.22.102.305.01", email: "cs-fatima2001@st.umat.edu.gh", name: "Fatima Yusuf" },
        { indexNumber: "FCM.22.102.305.02", email: "cs-tunde2002@st.umat.edu.gh", name: "Tunde Bakare" },
      ];
      for (const v of demoVoters) {
        await prisma.voter.create({
          data: { ...v, passwordHash, activatedAt: new Date() },
        });
      }

      const election = await prisma.election.create({
        data: {
          title: "ACSES 2026 Executive Elections",
          description: "Annual election of ACSES departmental executives.",
          status: "OPEN",
          startsAt: new Date(Date.now() - 86400000),
          endsAt: new Date(Date.now() + 7 * 86400000),
          positions: {
            create: [
              {
                name: "President",
                order: 1,
                candidates: {
                  create: [
                    { name: "Amina Bello", bio: "400 level CSE. Former PRO." },
                    { name: "Chidi Okeke", bio: "400 level SE. Debate club chair." },
                  ],
                },
              },
              {
                name: "Secretary",
                order: 2,
                candidates: {
                  create: [
                    { name: "Fatima Yusuf", bio: "300 level CSE." },
                    { name: "Tunde Bakare", bio: "300 level SE." },
                  ],
                },
              },
              {
                name: "Financial Secretary",
                order: 3,
                candidates: {
                  create: [
                    { name: "Grace Adamu", bio: "300 level CSE. Treasurer, NACS chapter." },
                  ],
                },
              },
              {
                name: "Women's Commissioner",
                order: 4,
                candidates: {
                  create: [
                    { name: "Halima Sani", bio: "200 level CSE." },
                    { name: "Ngozi Eze", bio: "200 level SE." },
                  ],
                },
              },
            ],
          },
        },
      });
      console.log(`Seeded demo election "${election.title}" with 4 voters (password: Vote1234!)`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
