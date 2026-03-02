import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1772434975396 implements MigrationInterface {
    name = 'Migration1772434975396'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."task_priority_enum" AS ENUM('high', 'normal', 'low')`);
        await queryRunner.query(`CREATE TYPE "public"."task_status_enum" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "task" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "priority" "public"."task_priority_enum" NOT NULL DEFAULT 'normal', "payload" jsonb NOT NULL DEFAULT '{}', "status" "public"."task_status_enum" NOT NULL DEFAULT 'PENDING', "idempotencyKey" character varying NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "lastError" text, "scheduledAt" TIMESTAMP WITH TIME ZONE, "startedAt" TIMESTAMP WITH TIME ZONE, "completedAt" TIMESTAMP WITH TIME ZONE, "userId" uuid, CONSTRAINT "UQ_e14d86e97c138884775c5658c83" UNIQUE ("idempotencyKey"), CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f316d3fe53497d4d8a2957db8b" ON "task" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_8a87314e6b7ebcc13e967c064a" ON "task" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_2fe7a278e6f08d2be55740a939" ON "task" ("status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e14d86e97c138884775c5658c8" ON "task" ("idempotencyKey") `);
        await queryRunner.query(`CREATE INDEX "IDX_52620fadbedbf9b13165a8f500" ON "task" ("scheduledAt") `);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."user_role_enum" NOT NULL DEFAULT 'user', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "task" ADD CONSTRAINT "FK_f316d3fe53497d4d8a2957db8b9" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task" DROP CONSTRAINT "FK_f316d3fe53497d4d8a2957db8b9"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52620fadbedbf9b13165a8f500"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e14d86e97c138884775c5658c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2fe7a278e6f08d2be55740a939"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8a87314e6b7ebcc13e967c064a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f316d3fe53497d4d8a2957db8b"`);
        await queryRunner.query(`DROP TABLE "task"`);
        await queryRunner.query(`DROP TYPE "public"."task_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."task_priority_enum"`);
    }

}
