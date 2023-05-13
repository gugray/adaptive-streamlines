buildBundle();

async function buildBundle() {

  const esbuild = require("esbuild");

  esbuild.build({
    entryPoints: ["src/index.js"],
    outfile: "dist/adaptive-streamlines.js",
    bundle: true,
    sourcemap: true,
    minify: false,
  }).catch(err => {
    console.error("Unexpected error; quitting.");
    if (err) console.error(err);
    process.exit(1);
  });
}
