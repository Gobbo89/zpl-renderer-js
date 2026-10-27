const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// Shared by bundled/default and custom external-WASM verification.
async function verifyReleaseRendering(render, readPng, darkBounds) {
  let rowHeight;
  for (const [by, width] of [["", 274], ["^BY0", 137], ["^BY-1", 137],
    ["^BY1", 137], ["^BY2", 274], ["^BY3", 411], ["^BY10", 1370], ["^BY11", 1507]]) {
    const barcode = darkBounds(await render(
      `^XA${by}^FO10,10^B7N,8,5,4^FDPDF417 MODULE WIDTH TEST 0001^FS^XZ`, 200, 40, 8));
    assert.equal(barcode.left, 10, `${by || "omitted BY"}: origin`);
    assert.equal(barcode.top, 10, `${by || "omitted BY"}: top`);
    assert.equal(barcode.width, width, `${by || "omitted BY"}: PDF417 width`);
    rowHeight ??= barcode.height;
    assert.equal(barcode.height, rowHeight, `${by || "omitted BY"}: unchanged row height`);
  }

  for (const rotation of ["r", "i"]) {
    for (const layout of ["spacing", "underfilled", "single_line"]) {
      const name = `text_fb_fo_${rotation}_${layout}`;
      const fixture = path.join(__dirname, "fixtures", "v1.41.0", name);
      const actual = await render(fs.readFileSync(`${fixture}.zpl`, "utf8"), 799 / 8, 288 / 8, 8);
      const expected = readPng(fs.readFileSync(`${fixture}.png`).toString("base64"));
      assert.equal(actual.width, 799, name);
      assert.equal(actual.height, 288, name);
      // Compare every pixel's ink mask, independent of PNG encoding/color channels.
      for (let y = 0; y < expected.height; y += 1) {
        const ink = (png) => Buffer.from(Array.from({ length: png.width },
          (_, x) => Number(png.rows[y][x * png.channels] < 128)));
        assert.deepEqual(ink(actual), ink(expected), `${name}: row ${y}`);
      }
    }
  }
}

module.exports = { verifyReleaseRendering };
