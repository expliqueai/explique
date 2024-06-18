import { Adapter, DatabaseSession, DatabaseUser, UserId } from "lucia";
import { Doc } from "../../_generated/dataModel";
import { DatabaseWriter } from "../../_generated/server";

export function mapDbSession(rawSession: Doc<"sessions">): DatabaseSession {
  return {
    userId: rawSession.userId,
    expiresAt: new Date(rawSession.expiresAt),
    id: rawSession.id,
    attributes: {
      _id: rawSession._id,
      _creationTime: rawSession._creationTime,
    },
  };
}

export function mapDbUser(rawUser: Doc<"users">): DatabaseUser {
  const { id, ...attributes } = rawUser;
  return { id, attributes };
}

export class ConvexMutationAdapter implements Adapter {
  constructor(private db: DatabaseWriter) {}

  async getSessionAndUser(
    sessionId: string,
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const rawSession = await this.db
      .query("sessions")
      .withIndex("by_lucia_id", (q) => q.eq("id", sessionId))
      .first();
    if (rawSession === null) {
      return [null, null];
    }

    const rawUser = await this.db
      .query("users")
      .withIndex("by_lucia_id", (q) => q.eq("id", rawSession.userId))
      .first();
    if (rawUser === null) {
      return [null, null];
    }

    return [mapDbSession(rawSession), mapDbUser(rawUser)];
  }

  async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
    const sessions = await this.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    return sessions.map(mapDbSession);
  }

  async setSession(session: DatabaseSession): Promise<void> {
    await this.db.insert("sessions", {
      userId: session.userId,
      id: session.id,
      expiresAt: +session.expiresAt,
    });
  }

  async updateSessionExpiration(
    sessionId: string,
    expiresAt: Date,
  ): Promise<void> {
    const rawSession = await this.db
      .query("sessions")
      .withIndex("by_lucia_id", (q) => q.eq("id", sessionId))
      .first();

    if (rawSession === null) {
      throw new Error("Session not found");
    }

    await this.db.patch(rawSession._id, {
      expiresAt: +expiresAt,
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const rawSession = await this.db
      .query("sessions")
      .withIndex("by_lucia_id", (q) => q.eq("id", sessionId))
      .first();

    if (rawSession !== null) {
      await this.db.delete(rawSession._id);
    }
  }

  async deleteUserSessions(userId: UserId): Promise<void> {
    const sessions = await this.db
      .query("sessions")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();

    for (const session of sessions) {
      await this.db.delete(session._id);
    }
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = Date.now();

    const sessions = await this.db
      .query("sessions")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .collect();

    for (const session of sessions) {
      await this.db.delete(session._id);
    }
  }
}
