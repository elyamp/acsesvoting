import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { serializeBallot } from "../src/lib/ballot-integrity";
import { voterClasses } from "../src/lib/voter-classes";

const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

const demoPassword = "Vote1234!";
const firstNames = [
  "Ama", "Kofi", "Abena", "Yaw", "Akosua", "Kojo", "Efua", "Kwame",
  "Adwoa", "Nana", "Esi", "Kwesi", "Akua", "Kweku", "Afia", "Fiifi",
];
const surnames = [
  "Mensah", "Owusu", "Asante", "Boateng", "Osei", "Agyeman", "Appiah",
  "Tetteh", "Nyarko", "Bediako", "Darko", "Annan", "Frimpong", "Quaye",
  "Amponsah", "Addo",
];
const requestedNames = new Map<string, string[]>([
  ["CY_3", ["Ely Amp", "Christabel", "Jnr Del"]],
]);
const emailPrefixes: Record<string, string> = {
  CE: "ce",
  CY: "cy",
  IS: "is",
  ROBOTICS: "rb",
};

function departmentFor(value: string) {
  return value.startsWith("ROBOTICS") ? "ROBOTICS" : value.split("_")[0];
}

function levelFor(value: string) {
  return Number(value.slice(value.lastIndexOf("_") + 1));
}

function makeDemoRows() {
  let rowNumber = 0;
  return voterClasses.flatMap((studentClass, classIndex) => {
    const classNames = requestedNames.get(studentClass.value) ?? Array.from(
      { length: 3 },
      (_, memberIndex) => {
        const nameIndex = classIndex * 3 + memberIndex;
        return `Demo ${firstNames[nameIndex % firstNames.length]} ${surnames[Math.floor(nameIndex / firstNames.length)]}`;
      },
    );

    return classNames.map((name, memberIndex) => {
      rowNumber += 1;
      const department = departmentFor(studentClass.value);
      const level = levelFor(studentClass.value);
      const emailName = name.toLowerCase().replace(/[^a-z]+/g, "");
      const username = studentClass.value === "CY_3"
        ? `cy-${emailName}${3000 + memberIndex + 1}`
        : `${emailPrefixes[department]}-demo${String(rowNumber).padStart(4, "0")}`;

      return {
        classGroup: studentClass.value,
        name,
        indexNumber: `FCM.26.${String(100 + classIndex).padStart(3, "0")}.${String(memberIndex + 1).padStart(3, "0")}.${String(level).padStart(2, "0")}`,
        email: `${username}@st.umat.edu.gh`,
        voted: memberIndex === 0,
        classIndex,
      };
    });
  });
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to replace voter data in production.");
  }
  if (process.env.DATABASE_URL !== "file:./dev.db") {
    throw new Error("This demo reset only runs against DATABASE_URL=file:./dev.db.");
  }
  if (process.env.AUTH_SECRET === undefined || process.env.AUTH_SECRET.length < 16) {
    throw new Error("Set a strong AUTH_SECRET before creating signed demo ballots.");
  }

  const demoRows = makeDemoRows();
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const demoElection = await prisma.election.findMany({
    include: {
      positions: {
        orderBy: { order: "asc" },
        include: { candidates: { orderBy: { name: "asc" } } },
      },
    },
  });

  if (demoElection.length !== 1) {
    throw new Error(`Expected exactly one local demo election; found ${demoElection.length}.`);
  }
  const election = demoElection[0];
  if (election.positions.length === 0 || election.positions.some((position) => position.candidates.length === 0)) {
    throw new Error("Every demo election position must have at least one candidate before demo ballots are generated.");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.vote.deleteMany();
    await tx.ballotRecord.deleteMany();
    await tx.otpCode.deleteMany();
    await tx.voter.deleteMany();

    let registered = 0;
    let ballots = 0;
    let selections = 0;

    for (const demoRow of demoRows) {
      await tx.voter.create({
        data: {
          name: demoRow.name,
          indexNumber: demoRow.indexNumber,
          email: demoRow.email,
          classGroup: demoRow.classGroup,
          passwordHash,
          activatedAt: new Date(),
          hasVoted: demoRow.voted,
        },
      });
      registered += 1;

      if (!demoRow.voted) continue;

      const ballotSelections = election.positions.map((position, positionIndex) => ({
        positionId: position.id,
        candidateId: position.candidates[(demoRow.classIndex + positionIndex) % position.candidates.length].id,
      }));
      const ballotId = randomUUID();
      const signedBallot = serializeBallot(ballotId, election.id, ballotSelections);

      await tx.ballotRecord.create({
        data: {
          id: ballotId,
          electionId: election.id,
          payload: signedBallot.payload,
          signature: signedBallot.signature,
        },
      });
      await tx.vote.createMany({
        data: ballotSelections.map((selection) => ({
          electionId: election.id,
          ...selection,
        })),
      });
      ballots += 1;
      selections += ballotSelections.length;
    }

    return { registered, ballots, selections };
  }, { timeout: 60_000 });

  console.log(`Replaced the local voter register with ${result.registered} demo voters across ${voterClasses.length} classes.`);
  console.log(`Created ${result.ballots} signed demo ballots (${result.selections} selections), one per class.`);
  console.log(`All demo accounts use password: ${demoPassword}`);
  console.log("CY 3 demo voters: Ely Amp, Christabel, Jnr Del.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
