ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9_-]', '-', 'g')
WHERE "username" IS NULL;

UPDATE "User"
SET "username" = concat('user-', "id")
WHERE "username" IS NULL OR "username" = '';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
