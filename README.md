# explique.ai

## Getting Started

Please make sure you have [Node.js](https://nodejs.org/en/) installed on your machine.

### Install the dependencies <small>(only the first time)</small>

The first time you install the project, install the dependencies using:

```bash
npm install
```

### Link to a Convex project <small>(only the first time)</small>

Then, run `npm run dev:server` to connect your local repository to a Convex database. When asked to, connect with your personal GitHub account. You can choose any name you want for the project.

You can then stop the server with <kbd>Ctrl+C</kbd>.

> [!NOTE]  
> You don’t need to run `npm run dev:server` during regular development. Instead, you can use `npm run dev` which starts both the Convex development tool and the Next.js server.

### Seed your development database <small>(only the first time)</small>
To have some sample data you can use for development, you can run the following command:

```bash
npm run seed
```

This script automatically creates some admin accounts. Don’t hestitate to add your own email address before running it (in `convex/internal/seed.ts`) so that you’re an admin too.

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Set up the environment variables

You can set up the environment variables of the deployment on the Convex dashboard (run `npx convex dashboard` to open it).

#### OpenAI API key

Set the environment variable `OPENAI_API_KEY` to an OpenAI API key. (You can ask Ola to generate one for you if necessary.)

#### Google client

This project uses the Google APIs to implement authentication.

Follow [this tutorial](https://support.google.com/cloud/answer/6158849?hl=en#zippy=%2Cuser-consent%2Cauthorized-domains%2Cpublic-and-internal-applications) to create a client ID.

When prompted for authorized redirect URIs, add `{BASE_URL}/authRedirect`, where `{BASE_URL}` is the address users access the website from (e.g. `http://localhost:3000` for a local development instance).

Copy the resulting client ID and secret in the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables in the Convex dashboard.
