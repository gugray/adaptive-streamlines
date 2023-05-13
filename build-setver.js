const packageFileName = "package.json";

setver();

async function setver() {

  if (process.argv.length < 3) {
    console.error("Expected version argument");
    process.exit(1);
  }
  const verTag = process.argv[2];
  const reVerTag = new RegExp("^v(\\d+\\.\\d+\\.\\d+)$");
  const m = reVerTag.exec(verTag);
  if (!m) {
    console.error("Expected version in v1.2.3 format; got " + verTag);
    process.exit(1);
  }
  const verStr = m[1];

  const fs = require("fs");
  const packageJson = await fs.promises.readFile(packageFileName, "utf8");
  const obj = JSON.parse(packageJson);
  obj.version = verStr;
  const updatedJson = JSON.stringify(obj, null, 2);
  await fs.promises.writeFile(packageFileName, updatedJson);
}

