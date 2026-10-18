ALTER TABLE "Voter"
ADD COLUMN "classGroup" TEXT NOT NULL DEFAULT 'UNASSIGNED';

CREATE INDEX "Voter_classGroup_indexNumber_idx"
ON "Voter"("classGroup", "indexNumber");

CREATE TABLE "BallotRecord" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BallotRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BallotRecord_electionId_createdAt_idx"
ON "BallotRecord"("electionId", "createdAt");

ALTER TABLE "BallotRecord"
ADD CONSTRAINT "BallotRecord_electionId_fkey"
FOREIGN KEY ("electionId") REFERENCES "Election"("id")
ON DELETE CASCADE ON UPDATE CASCADE;