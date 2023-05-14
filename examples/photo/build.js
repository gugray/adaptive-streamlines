const esbuild = require("esbuild");
const livereload = require("livereload");
const StaticServer = require('static-server');

build();

async function build() {

  let watch = false;

  const args = (argList => {
    let res = {};
    let opt, thisOpt, curOpt;
    for (let i = 0; i < argList.length; i++) {
      thisOpt = argList[i].trim();
      opt = thisOpt.replace(/^\-+/, '');
      if (opt === thisOpt) {
        // argument value
        if (curOpt) res[curOpt] = opt;
        curOpt = null;
      }
      else {
        // argument name
        curOpt = opt;
        res[curOpt] = true;
      }
    }
    //console.log(res);
    return res;
  })(process.argv);

  if (args.watch) {
    watch = {
      onRebuild(error) {
        var dstr = "[" + new Date().toLocaleTimeString() + "] ";
        if (error) {
          console.error(dstr + 'Change detected; rebuild failed:', error);
          return;
        }
        console.log(dstr + 'Change detected; rebuild OK');
      },
    };
  }

  esbuild.build({
    entryPoints: ["src/app.js"],
    outfile: "public/app.js",
    bundle: true,
    sourcemap: true,
    minify: false,
    watch: watch,
  }).catch(err => {
    console.error("Unexpected error; quitting.");
    if (err) console.error(err);
    process.exit(1);
  }).then(() => {
    console.log("Build finished.");
    if (args.watch) {
      livereload.createServer().watch("./public");
      console.log("Watching changes, with livereload...");
      var server = new StaticServer({
        rootPath: './public',
        port: 8080,
        index: 'index.html',
      });
      server.start(function () {
        console.log('Server listening at ' + server.port);
      });
    }
  });
}
