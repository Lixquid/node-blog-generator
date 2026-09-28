import { buildCommand, devCommand, serveCommand } from "./commands.ts";
import { run } from "./lib/util.ts";

/**
 * Runs a shell command, inheriting stdio, and exits the process on failure.
 */
async function runOrExit(command: string, args: string[]): Promise<void> {
    try {
        await run(command, args);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

interface Args {
    command: string;
    slug?: string;
    production: boolean;
}

const usage = `Usage: tsx src/index.ts <command> [args]

Commands:
    build [post]    Build the entire site, or a single post if its slug is
                    given. If --production is passed, a production build with
                    Vite is also performed into out/dist.
    watch           Build the site, then watch for changes: changes to a
                    single post's assets rebuild just that post; changes to
                    site-wide assets rebuild everything.
    serve           Serve the out directory at http://localhost:8080.

Options:
    --production    With the build command: also perform a minified Vite
                    production build into out/dist.
`;

/** Runs the build command, optionally followed by a Vite production build. */
async function buildOrExit(
    slug: string | undefined,
    production: boolean,
): Promise<void> {
    try {
        await buildCommand(slug);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
    if (production) {
        await runOrExit("npx", ["vite", "build"]);
    }
}

function parseArgs(args: string[]): Args {
    const result: Args = { command: "", production: false };
    const positional: string[] = [];

    for (const arg of args) {
        if (arg === "--production") {
            result.production = true;
        } else if (arg.startsWith("-")) {
            console.error(`Unknown option: ${arg}`);
            console.error(usage);
            process.exit(1);
        } else {
            positional.push(arg);
        }
    }

    result.command = positional.shift() ?? "";
    result.slug = positional.shift();
    if (positional.length > 0) {
        console.error(`Too many arguments: ${positional.join(" ")}`);
        console.error(usage);
        process.exit(1);
    }

    return result;
}

const args = parseArgs(process.argv.slice(2));

switch (args.command) {
    case "build":
        await buildOrExit(args.slug, args.production);
        break;
    case "watch":
    case "dev":
        await devCommand();
        break;
    case "serve":
        await serveCommand();
        break;
    default:
        console.error(`Unknown command: ${args.command}`);
        console.error(usage);
        process.exit(1);
}
