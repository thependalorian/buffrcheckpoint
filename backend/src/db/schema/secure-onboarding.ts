import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organisations } from "./organisations";
import { applicationUsers } from "./rbac";
import { typeDefinition } from "./type-definitions";

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_email_verification_tokens_hash").on(t.tokenHash),
    index("idx_email_verification_tokens_org_user").on(t.organisationId, t.userId),
  ],
);

export const mfaRecoveryCodes = pgTable(
  "mfa_recovery_codes",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    codeHash: text("code_hash").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("idx_mfa_recovery_codes_org_user").on(t.organisationId, t.userId)],
);

export const mfaChallengeTokens = pgTable(
  "mfa_challenge_tokens",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => applicationUsers.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_mfa_challenge_tokens_hash").on(t.tokenHash),
    index("idx_mfa_challenge_tokens_org_user").on(t.organisationId, t.userId),
  ],
);

export const organisationOnboardingStates = pgTable(
  "organisation_onboarding_states",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    statusCode: uuid("status_code")
      .notNull()
      .references(() => typeDefinition.id),
    currentStepCode: uuid("current_step_code").references(() => typeDefinition.id),
    completedStepCodes: jsonb("completed_step_codes").$type<string[]>().notNull().default([]),
    goliveApprovedAt: timestamp("golive_approved_at", { withTimezone: true }),
    goliveApprovedBy: uuid("golive_approved_by").references(() => applicationUsers.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("idx_organisation_onboarding_states_org_active").on(t.organisationId)],
);

export const organisationOnboardingStatusLog = pgTable(
  "organisation_onboarding_status_log",
  {
    id: uuid("id").primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    stateId: uuid("state_id")
      .notNull()
      .references(() => organisationOnboardingStates.id),
    fromStatusCode: uuid("from_status_code").references(() => typeDefinition.id),
    toStatusCode: uuid("to_status_code")
      .notNull()
      .references(() => typeDefinition.id),
    stepCode: uuid("step_code").references(() => typeDefinition.id),
    actorId: uuid("actor_id"),
    reason: text("reason"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("idx_organisation_onboarding_status_log_org").on(t.organisationId, t.occurredAt)],
);
