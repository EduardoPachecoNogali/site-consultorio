-- Add group request fields to Appointment
ALTER TABLE "Appointment" ADD COLUMN "groupRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "groupRequestNote" TEXT;
