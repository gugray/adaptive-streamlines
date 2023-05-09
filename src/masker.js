class Masker {
  constructor({width, height, density, minDist, maxDist}, debugCanvas) {
    this.w = width;
    this.h = height;
    // Point blocked if value is 255; free otherwise
    // For [0, 254]: Minimum required distance from nearest point here is:
    //   minDist + distRange * val / 254
    this.distRange = maxDist - minDist;
    this.minDist = minDist;
    this.maxDist = maxDist;
    this.data = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; ++y) {
      for (let x = 0; x < this.w; ++x) {
        let val = Math.min(1, Math.max(0, density({x, y})));
        this.data[y * this.w + x] = Math.round(val * 255);
      }
    }

    this.debugCanvas = debugCanvas;
    if (debugCanvas) this.initDebug();
  }

  initDebug() {
    const dpr = window.devicePixelRatio;
    this.elm = document.createElement("canvas");
    this.elm.width = this.w;
    this.elm.height = this.h;
    this.elm.id = "startCanv";
    this.elm.style.width = (this.w / dpr) + "px";
    this.elm.style.height = (this.h / dpr) + "px";
    this.elm.style.display = "block";
    document.body.appendChild(this.elm);
  }

  isFree(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    const ix = y * this.w + x;
    return this.data[ix] != 255;
  }

  horizLine(x1, x2, y, center) {
    for (let x = x1; x <= x2; ++x) {
      const ix = y * this.w + x;
      let limit = this.data[ix];
      if (limit == 255) continue;
      limit = this.minDist + limit / 254 * this.distRange;
      const dist = Math.sqrt((x - center.x) * (x - center.x) + (y- center.y) * (y - center.y));
      if (limit < dist) continue;
      this.data[ix] = 255;
    }
  }

  circle(pt, rad) {
    pt.x = Math.floor(pt.x);
    pt.y = Math.floor(pt.y);
    rad = Math.round(rad);
    let x = rad - 1;
    let y = 0;
    let dx = 1;
    let dy = 1;
    let err = dx - (rad << 1);

    while (x >= y) {
      this.horizLine(pt.x - x, pt.x + x, pt.y + y, pt);
      this.horizLine(pt.x - x, pt.x + x, pt.y - y, pt);
      this.horizLine(pt.x - y, pt.x + y, pt.y + x, pt);
      this.horizLine(pt.x - y, pt.x + y, pt.y - x, pt);
      if (err <= 0) {
        y++;
        err += dy;
        dy += 2;
      }
      if (err > 0) {
        x--;
        dx += 2;
        err += dx - (rad << 1);
      }
    }
    // if (this.debugCanvas)
    //   this.debugFlush();
  }

  debugFlush() {

    if (!this.debugCanvas) return;

    const setPixel = (imgd, x, y, r, g, b) => {
      const w = imgd.width;
      y = this.h - y - 1;
      imgd.data[(y * this.w + x) * 4] = Math.round(r);
      imgd.data[(y * this.w + x) * 4 + 1] = Math.round(g);
      imgd.data[(y * this.w + x) * 4 + 2] = Math.round(b);
      imgd.data[(y * this.w + x) * 4 + 3] = 128;
    };

    const ctx = this.elm.getContext("2d");
    const imgd = ctx.getImageData(0, 0, this.w, this.h);
    for (let x = 0; x < this.w; ++x) {
      for (let y = 0; y < this.h; ++y) {
        if (!this.isFree(x, y))
          setPixel(imgd, x, y, 255, 24, 24);
      }
    }
    ctx.putImageData(imgd, 0, 0);
  }

  isUsable(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return false;
    return this.isFree(x, y);
  }
}

export {Masker}
