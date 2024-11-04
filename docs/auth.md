# Authentication

## Lucia
The authentication system is based on [Lucia v3](https://lucia-auth.com), using custom adapters (= database integration) to integrate it with Convex (one when running actions and one when running queries/mutations).

There are two login flows:
* The **Google** login flow, which uses Google SSO with OAuth. This login flow can be restricted to a specific Google workspace (e.g. `stanford.edu` for the Stanford deployment).
* The **Tequila** login flow, which uses Tequila (the login system of EPFL), used on the EPFL instances. This login flow depends on Next.js API routes to avoid sending identifiable user data to Convex (see [identifiers.md]([identifiers.md]) for more details).

## Access control
There are four levels of users on Explique:

* **Students**: the default role, can access the exercises and do them.
* **TAs**: like students, but can also view exercises before their release date.
* **Admins**: can control fully the contents of a course, including modifying the exercises, viewing the scores of the users, managing users…
* **Superadmins**: this is the only role whose scope is the entire instance (all the other roles apply to a specific course). Superadmins can see the list of all the courses and create new ones.
