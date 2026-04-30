CREATE TABLE "AssetDisplayUserConfig" (
    "userId" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDisplayUserConfig_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "AssetDisplayUserConfig"
ADD CONSTRAINT "AssetDisplayUserConfig_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
