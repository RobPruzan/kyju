import { exec } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

exec("pnpm build:css", { cwd: __dirname + "/.." }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running build:css: ${error.message}`);
    process.exit(1);
  }
  if (stderr) {
    console.error(stderr);
  }
  if (stdout) {
    console.log(stdout);
  }
});
