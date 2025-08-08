# Identifiers/Identities

The definition of the `users` table in `convex/schema.ts` can be confusing:

```ts
export default defineSchema({
  // …other tables

  users: defineTable({
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
    identifier: v.optional(v.string()),

    // …other fields removed for brevity
  }),
});
```

Why are `email` and `name` sometimes `null`? What is `identifier`? You will find the answers in this document.

The goal of this mechanism is to avoid storing identifiable personal data on Convex for the Explique deployments for EPFL. On these deployments, `email` and `name` are set to `null`[^1].

## How does the login flow work?

The login flow through [Tequila](https://tequila.epfl.ch) (the EPFL login system) redirects the EPFL to a Next.js route. This route is handled by the Next.js server running on a server on the EPFL infrastructure. It then generates a hash from the email address which is then used as the identifier. Since a user will always get the same hash, this is what allows us to identify them in the Convex database. This hash is salted, which prevents someone with access to the Convex database from linking it to an email address (the salt is an environment variable of the Next.js server). The way the identity of the user is sent to the Convex server is via a [JWT](https://jwt.io) (which is cryptographically signed, ensuring that these tokens aren’t forged).

[^1]: In some rare cases, it is possible that some users on EPFL instances have a name or email address in the Convex database. That happens when they log in through the Google login (e.g. https://cs250.epfl.ch/login?external). We provide this option through a hidden URL to provide a way for non-EPFL users to log in if necessary. This was used for instance to allow a student taking CS-250 as an auditor to log in.

## How can the user see their own identity?

When the Next.js server authenticates the user through Tequila, it sends the name and email address of the user along with the JWT. This information is stored in the user’s browser local storage, which is used to display the user’s name and email in the navbar of the app without sending this information to Convex.

## How can admin features use the student identities?

Some features of the admin panel (e.g. the users page) work with the student’s identities. To avoid sending this information to Convex, we provide two APIs on the Next.js side:

- `/api/admin/identities`, which returns the mapping between every identifier and the matching email address. This is accessible through the `useIdentities` React hook. To make this endpoint work, we store the identities of every user that has logged in to the app (or been added to a course) in a SQLite database, accessed through the Drizzle ORM from the Next.js API routes.
- `/api/admin/computeIdentifiers`, which computes the hashes for given email addresses. This allows admins to add users to a course from their email addresses without sending the email addresses to Convex.

Both of these API endpoints are available only to admins. To ensure this, we generate JWTs from Convex that are used when using these APIs.
