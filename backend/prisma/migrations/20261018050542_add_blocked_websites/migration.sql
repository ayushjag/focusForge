-- CreateTable
CREATE TABLE "BlockedWebsite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedWebsite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlockedWebsite_userId_enabled_idx" ON "BlockedWebsite"("userId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedWebsite_userId_domain_key" ON "BlockedWebsite"("userId", "domain");

-- AddForeignKey
ALTER TABLE "BlockedWebsite" ADD CONSTRAINT "BlockedWebsite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
