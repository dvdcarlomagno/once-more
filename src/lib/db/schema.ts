import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  uuid,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

/* ---------- Auth.js (drizzle adapter) tables ---------- */

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/* ---------- once-more domain tables ---------- */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ambassadorId: text("ambassador_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    coverUrl: text("cover_url"),
    lumaUrl: text("luma_url"),
    shotsPerPerson: integer("shots_per_person").notNull().default(5),
    filmFilter: boolean("film_filter").notNull().default(true),
    watermarkUrl: text("watermark_url"),
    revealed: boolean("revealed").notNull().default(false),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
  },
  (t) => [index("events_ambassador_idx").on(t.ambassadorId)]
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    token: uuid("token").notNull().unique().defaultRandom(),
  },
  (t) => [index("participants_event_idx").on(t.eventId)]
);

export const photos = pgTable(
  "photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    originalUrl: text("original_url").notNull(),
    blurredUrl: text("blurred_url").notNull(),
    revealedUrl: text("revealed_url"),
  },
  (t) => [
    index("photos_event_idx").on(t.eventId, t.createdAt),
    index("photos_participant_idx").on(t.participantId),
  ]
);

export type Event = typeof events.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Photo = typeof photos.$inferSelect;
