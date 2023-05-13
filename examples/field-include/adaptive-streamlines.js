(() => {
  // src/vector.js
  var Vector = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    equals(other) {
      return this.x === other.x && this.y === other.y;
    }
    add(other) {
      return new Vector(this.x + other.x, this.y + other.y);
    }
    mulScalar(scalar) {
      return new Vector(this.x * scalar, this.y * scalar);
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    distanceTo(other) {
      const dx = other.x - this.x;
      const dy = other.y - this.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  };

  // src/masker.js
  var Masker = class {
    constructor({ width, height, density, minDist, maxDist }, debugCanvas) {
      this.w = width;
      this.h = height;
      this.distRange = maxDist - minDist;
      this.minDist = minDist;
      this.maxDist = maxDist;
      this.data = new Uint8Array(this.w * this.h);
      for (let y = 0; y < this.h; ++y) {
        for (let x = 0; x < this.w; ++x) {
          let val = Math.min(1, Math.max(0, density({ x, y })));
          this.data[y * this.w + x] = Math.round(val * 255);
        }
      }
      this.debugCanvas = debugCanvas;
      if (debugCanvas)
        this.initDebug();
    }
    initDebug() {
      const dpr = window.devicePixelRatio;
      this.elm = document.createElement("canvas");
      this.elm.width = this.w;
      this.elm.height = this.h;
      this.elm.id = "startCanv";
      this.elm.style.width = this.w / dpr + "px";
      this.elm.style.height = this.h / dpr + "px";
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
        if (limit == 255)
          continue;
        limit = this.minDist + limit / 254 * this.distRange;
        const dist = Math.sqrt((x - center.x) * (x - center.x) + (y - center.y) * (y - center.y));
        if (limit < dist)
          continue;
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
    }
    debugFlush() {
      if (!this.debugCanvas)
        return;
      const setPixel = (imgd2, x, y, r, g, b) => {
        const w = imgd2.width;
        y = this.h - y - 1;
        imgd2.data[(y * this.w + x) * 4] = Math.round(r);
        imgd2.data[(y * this.w + x) * 4 + 1] = Math.round(g);
        imgd2.data[(y * this.w + x) * 4 + 2] = Math.round(b);
        imgd2.data[(y * this.w + x) * 4 + 3] = 128;
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
      if (x < 0 || x >= this.w || y < 0 || y >= this.h)
        return false;
      return this.isFree(x, y);
    }
  };

  // src/lookup-grid.js
  var LookupGrid = class {
    constructor(width, height, sep) {
      this.width = width;
      this.height = height;
      this.sep = sep;
      this.bboxSize = Math.max(width, height);
      this.cellsCount = Math.ceil(this.bboxSize / sep);
      this.cells = /* @__PURE__ */ new Map();
    }
    getCellByCoordinates(x, y) {
      const rowCoordinate = this.gridX(x);
      let row = this.cells.get(rowCoordinate);
      if (!row) {
        row = /* @__PURE__ */ new Map();
        this.cells.set(rowCoordinate, row);
      }
      const colCoordinate = this.gridY(y);
      let cell = row.get(colCoordinate);
      if (!cell) {
        cell = new Cell();
        row.set(colCoordinate, cell);
      }
      return cell;
    }
    gridX(x) {
      return Math.floor(this.cellsCount * x / this.bboxSize);
    }
    gridY(y) {
      return Math.floor(this.cellsCount * y / this.bboxSize);
    }
    findNearest(x, y) {
      const cx = this.gridX(x);
      const cy = this.gridY(y);
      let minDistance = Infinity;
      for (let col = -1; col < 2; ++col) {
        const currentCellX = cx + col;
        if (currentCellX < 0 || currentCellX >= this.cellsCount)
          continue;
        const cellRow = this.cells.get(currentCellX);
        if (!cellRow)
          continue;
        for (let row = -1; row < 2; ++row) {
          const currentCellY = cy + row;
          if (currentCellY < 0 || currentCellY >= this.cellsCount)
            continue;
          const cellCol = cellRow.get(currentCellY);
          if (!cellCol)
            continue;
          let d = cellCol.getMinDistance(x, y);
          if (d < minDistance)
            minDistance = d;
        }
      }
      return minDistance;
    }
    isOutside(x, y) {
      if (x < 0 || x >= this.width || y < 0 || y >= this.height)
        return true;
      return false;
    }
    occupyCoordinates(point) {
      const x = point.x, y = point.y;
      this.getCellByCoordinates(x, y).occupy(point);
    }
    hasCloserThan(x, y, limit) {
      if (!this.cells)
        return false;
      const cx = this.gridX(x);
      const cy = this.gridY(y);
      for (let col = -1; col < 2; ++col) {
        const currentCellX = cx + col;
        if (currentCellX < 0 || currentCellX >= this.cellsCount)
          continue;
        const cellRow = this.cells.get(currentCellX);
        if (!cellRow)
          continue;
        for (let row = -1; row < 2; ++row) {
          const currentCellY = cy + row;
          if (currentCellY < 0 || currentCellY >= this.cellsCount)
            continue;
          const cellCol = cellRow.get(currentCellY);
          if (!cellCol)
            continue;
          if (cellCol.hasCloserThan(x, y, limit))
            return true;
        }
      }
      return false;
    }
  };
  var Cell = class {
    constructor() {
      this.children = null;
    }
    occupy(point) {
      if (!this.children)
        this.children = [];
      this.children.push(point);
    }
    hasCloserThan(x, y, limit) {
      if (!this.children)
        return false;
      for (let i = 0; i < this.children.length; ++i) {
        const p = this.children[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < limit)
          return true;
      }
      return false;
    }
    getMinDistance(x, y) {
      let minDistance = Infinity;
      if (!this.children)
        return minDistance;
      for (let i = 0; i < this.children.length; ++i) {
        const p = this.children[i];
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance)
          minDistance = dist;
      }
      return minDistance;
    }
  };

  // src/integrator.js
  var FORWARD = 1;
  var BACKWARD = 2;
  var DONE = 3;
  var Integrator = class {
    constructor(startPt, startMask, stopMask, config) {
      this.startPt = startPt;
      this.startMask = startMask;
      this.stopMask = stopMask;
      this.config = config;
      this.points = [startPt];
      this.currPt = startPt;
      this.state = FORWARD;
      this.lastCheckedSeed = -1;
      this.ownGrid = new LookupGrid(config.width, config.height, config.stepLength * 0.9);
      const vec = this.readField(startPt);
      if (vec && vec.depth)
        startPt.depth = vec.depth;
    }
    getNextValidSeed() {
      while (this.lastCheckedSeed < this.points.length - 1) {
        this.lastCheckedSeed += 1;
        let pt = this.points[this.lastCheckedSeed];
        let dir = this.readField(pt);
        if (!dir)
          continue;
        const den = Math.min(1, Math.max(0, this.config.density(pt)));
        const dist = this.config.minStartDist + den * (this.config.maxStartDist - this.config.minStartDist);
        let cx = pt.x - dir.y * dist;
        let cy = pt.y + dir.x * dist;
        if (this.startMask.isUsable(cx, cy)) {
          this.lastCheckedSeed -= 1;
          return new Vector(cx, cy);
        }
        let ox = pt.x + dir.y * dist;
        let oy = pt.y - dir.x * dist;
        if (this.startMask.isUsable(ox, oy)) {
          return new Vector(ox, oy);
        }
      }
    }
    next() {
      while (true) {
        if (this.state === FORWARD) {
          let point = this.getNextPoint(true);
          if (point) {
            this.points.push(point);
            this.ownGrid.occupyCoordinates(point);
            this.currPt = point;
          } else {
            this.currPt = this.startPt;
            this.state = BACKWARD;
          }
        }
        if (this.state === BACKWARD) {
          let point = this.getNextPoint(false);
          if (point) {
            this.points.unshift(point);
            this.currPt = point;
            this.ownGrid.occupyCoordinates(point);
          } else {
            this.state = DONE;
          }
        }
        if (this.state === DONE) {
          for (const pt of this.points) {
            const den = Math.min(1, Math.max(0, this.config.density(pt)));
            const distStart = this.config.minStartDist + den * (this.config.maxStartDist - this.config.minStartDist);
            const distEnd = distStart * this.config.endRatio;
            this.startMask.circle(pt, distStart - 1);
            this.stopMask.circle(pt, distEnd);
          }
          this.startMask.debugFlush();
          return true;
        }
      }
      return false;
    }
    getNextPoint(forward) {
      let dir = this.rk4(this.currPt);
      if (!dir)
        return null;
      if (!forward)
        dir = dir.mulScalar(-1);
      const nextPt = this.currPt.add(dir);
      if (!this.stopMask.isUsable(nextPt.x, nextPt.y))
        return null;
      if (this.ownGrid.hasCloserThan(nextPt.x, nextPt.y, this.config.stepLength * 0.9))
        return null;
      const vec = this.readField(nextPt);
      if (vec && vec.depth)
        nextPt.depth = vec.depth;
      if (this.points.length >= 2) {
        const lastPt = forward ? this.points[this.points.length - 1] : this.points[0];
        const prevPt = forward ? this.points[this.points.length - 2] : this.points[1];
        const prevDepthDelta = Math.abs(lastPt.depth - prevPt.depth);
        const newDepthDelta = Math.abs(nextPt.depth - lastPt.depth);
        if (newDepthDelta > prevDepthDelta * 3 && newDepthDelta > 1)
          return null;
      }
      return nextPt;
    }
    readField(pt) {
      const dir = this.config.field(pt);
      if (!dir)
        return null;
      if (Number.isNaN(dir.x) || Number.isNaN(dir.y))
        return null;
      let l = dir.x * dir.x + dir.y * dir.y;
      if (l == 0)
        return null;
      const norm = dir.mulScalar(1 / l);
      norm.depth = dir.depth;
      return norm;
    }
    rk4(point) {
      const stepLen = this.config.stepLength;
      const k1 = this.readField(point);
      if (!k1)
        return null;
      const k2 = this.readField(point.add(k1.mulScalar(stepLen * 0.5)));
      if (!k2)
        return null;
      const k3 = this.readField(point.add(k2.mulScalar(stepLen * 0.5)));
      if (!k3)
        return null;
      const k4 = this.readField(point.add(k3.mulScalar(stepLen)));
      if (!k4)
        return null;
      const res = k1.mulScalar(stepLen / 6).add(k2.mulScalar(stepLen / 3)).add(k3.mulScalar(stepLen / 3)).add(k4.mulScalar(stepLen / 6));
      return res;
    }
  };

  // src/index.js
  var STATE_INIT = 0;
  var STATE_STREAMLINE = 1;
  var STATE_PROCESS_QUEUE = 2;
  var STATE_DONE = 3;
  var STATE_SEED_STREAMLINE = 4;
  function createStreamlineGenerator({
    field,
    density,
    width,
    height,
    seed,
    minStartDist = 8,
    maxStartDist = 36,
    endRatio = 0.4,
    minPointsPerLine = 5,
    stepLength = 2,
    stepsPerIteration = 8,
    maxMsecPerIteration = 500,
    onStreamlineAdded
  }) {
    if (minStartDist < 2 || minStartDist > 254)
      throw "2 <= minStartDist <= 254 expected";
    if (maxStartDist < 2 || maxStartDist > 254)
      throw "2 <= maxStartDist <= 254 expected";
    if (endRatio < 0.1 || endRatio >= 1)
      throw "0.1 <= endRatio < 1 expected";
    if (!seed) {
      seed = new Vector(
        Math.random() * width,
        Math.random() * height
      );
    }
    const startMask = new Masker({
      width,
      height,
      density,
      minDist: minStartDist,
      maxDist: maxStartDist
    }, false);
    const stopMask = new Masker({
      width,
      height,
      density,
      minDist: minStartDist * endRatio,
      maxDist: maxStartDist * endRatio
    }, false);
    let resolve = null;
    let isCancelled = false;
    let isAsync = false;
    let state = STATE_INIT;
    let finishedStreamlineIntegrators = [];
    const icfg = {
      field,
      density,
      width,
      height,
      minStartDist,
      maxStartDist,
      endRatio,
      stepLength
    };
    let integrator = new Integrator(seed, startMask, stopMask, icfg);
    return {
      run,
      runAsync,
      cancel
    };
    function run() {
      isAsync = false;
      doWork();
    }
    async function runAsync() {
      isAsync = true;
      setTimeout(() => doWork());
      return new Promise((r) => resolve = r);
    }
    function cancel() {
      isCancelled = true;
    }
    function doWork() {
      let start = window.performance.now();
      for (let i = 0; !isAsync || i < stepsPerIteration; ++i) {
        if (state === STATE_INIT)
          initProcessing();
        else if (state === STATE_STREAMLINE)
          continueStreamline();
        else if (state === STATE_PROCESS_QUEUE)
          processQueue();
        else if (state === STATE_SEED_STREAMLINE)
          seedStreamline();
        if (isAsync && window.performance.now() - start > maxMsecPerIteration)
          break;
        if (isCancelled || state === STATE_DONE) {
          if (isAsync && resolve)
            resolve();
          return;
        }
      }
      if (isAsync)
        setTimeout(() => doWork());
    }
    function initProcessing() {
      if (!integrator.next()) {
        state = STATE_DONE;
        return;
      }
      addStreamLineToQueue();
      state = STATE_PROCESS_QUEUE;
    }
    function seedStreamline() {
      let currentStreamLine = finishedStreamlineIntegrators[0];
      let nextSeed = currentStreamLine.getNextValidSeed();
      if (nextSeed) {
        integrator = new Integrator(nextSeed, startMask, stopMask, icfg);
        state = STATE_STREAMLINE;
      } else {
        finishedStreamlineIntegrators.shift();
        state = STATE_PROCESS_QUEUE;
      }
    }
    function processQueue() {
      if (finishedStreamlineIntegrators.length == 0)
        state = STATE_DONE;
      else
        state = STATE_SEED_STREAMLINE;
    }
    function continueStreamline() {
      if (integrator.next()) {
        addStreamLineToQueue();
        state = STATE_SEED_STREAMLINE;
      }
    }
    function addStreamLineToQueue() {
      let points = integrator.points;
      if (points.length > 1 && (minPointsPerLine <= 0 || points.length >= minPointsPerLine)) {
        finishedStreamlineIntegrators.push(integrator);
        if (onStreamlineAdded)
          onStreamlineAdded(points);
      }
    }
  }

  // src/bundle.js
  window.Vector = Vector;
  window.createStreamlineGenerator = createStreamlineGenerator;
})();
//# sourceMappingURL=adaptive-streamlines.js.map
