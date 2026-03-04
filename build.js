"use strict";

const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");

const SRC = path.join(__dirname, "src");
const DIST = path.join(__dirname, "dist");

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  copyRecursive(SRC, DIST);

  const cssPath = path.join(DIST, "style.css");
  const css = fs.readFileSync(cssPath, "utf8");
  const minCss = new CleanCSS({ level: 2 }).minify(css).styles;
  fs.writeFileSync(cssPath, minCss, "utf8");
  console.log("Minified style.css");

  const jsPath = path.join(DIST, "app.js");
  const js = fs.readFileSync(jsPath, "utf8");
  const minJs = (await minify(js, { format: { comments: false } })).code;
  fs.writeFileSync(jsPath, minJs, "utf8");
  console.log("Minified app.js");

  console.log("Build complete: dist/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
