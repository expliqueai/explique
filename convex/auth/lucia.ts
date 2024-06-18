import { Adapter, Lucia, RegisteredDatabaseUserAttributes } from "lucia";
import { Id } from "../_generated/dataModel";

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseSessionAttributes {
  _id: Id<"sessions">;
  _creationTime: number;
}

interface DatabaseUserAttributes {
  _id: Id<"users">;
  _creationTime: number;
  email: string | null;
  name: string | null;
  extraTime?: true;
  identifier?: string;
}

export function initializeLucia(adapter: Adapter) {
  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        secure: process.env.LUCIA_ENVIRONMENT === "PROD",
      },
      expires: false,
    },

    getUserAttributes(
      databaseUserAttributes: RegisteredDatabaseUserAttributes,
    ) {
      return {
        _id: databaseUserAttributes._id,
        _creationTime: databaseUserAttributes._creationTime,
        email: databaseUserAttributes.email,
        name: databaseUserAttributes.name,
        extraTime: databaseUserAttributes.extraTime,
        identifier: databaseUserAttributes.identifier,
      };
    },
  });
}
