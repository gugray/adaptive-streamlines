import {LookupGrid} from "./lookup-grid.js";
import {Vector} from "./vector.js";

const FORWARD = 1;
const BACKWARD = 2;
const DONE = 3;

class Integrator {

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

    // Retrieve depth at our first point
    const vec = this.readField(startPt);
    if (vec && vec.depth) startPt.depth = vec.depth;
  }

  getNextValidSeed() {

    while (this.lastCheckedSeed < this.points.length - 1) {
      this.lastCheckedSeed += 1;

      let pt = this.points[this.lastCheckedSeed];
      let dir = this.readField(pt);
      if (!dir) continue;

      const den = Math.min(1, Math.max(0, this.config.density(pt)));
      const dist = this.config.minStartDist + den * (this.config.maxStartDist - this.config.minStartDist);

      // Check one normal. We just set c = p + n, where n is orthogonal to v.
      // Since v is unit vector we can multiply it by scaler to get to the
      // right point. It is also easy to find normal in 2d: normal to (x, y) is just (-y, x).
      // You can get it by applying 2d rotation matrix.)
      let cx = pt.x - dir.y * dist;
      let cy = pt.y + dir.x * dist;

      if (this.startMask.isUsable(cx, cy)) {
        // this will let us check the other side. When we get back
        // into this method, the point `cx, cy` will be taken (by construction of another streamline)
        // And we will throw through to the next orthogonal check.
        this.lastCheckedSeed -= 1;
        return new Vector(cx, cy);
      }

      // Check orthogonal coordinates on the other side (o = p - n).
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
          // Reset position to start, and grow backwards:
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
    if (!dir) return null;
    if (!forward) dir = dir.mulScalar(-1);
    const nextPt = this.currPt.add(dir);

    // Would get too close to existing streamline
    if (!this.stopMask.isUsable(nextPt.x, nextPt.y)) return null;
    // Would curl back onto ourselves
    if (this.ownGrid.hasCloserThan(nextPt.x, nextPt.y, this.config.stepLength * 0.9)) return null;

    // Get depth at new location. Is there a depth discontinuity?
    const vec = this.readField(nextPt);
    if (vec && vec.depth) nextPt.depth = vec.depth;
    if (this.points.length >= 2) {
      const lastPt = forward ? this.points[this.points.length - 1] : this.points[0];
      const prevPt = forward ? this.points[this.points.length - 2] : this.points[1];
      const prevDepthDelta = Math.abs(lastPt.depth - prevPt.depth);
      const newDepthDelta = Math.abs(nextPt.depth - lastPt.depth);
      if (newDepthDelta > prevDepthDelta * 3 && newDepthDelta > 1)
        return null;
    }

    // This is a good next point.
    return nextPt;
  }

  readField(pt) {

    const dir = this.config.field(pt);

    // Singularity, or field not defined here
    if (!dir) return null;
    if (Number.isNaN(dir.x) || Number.isNaN(dir.y)) return null;

    // Normalize
    let l = dir.x * dir.x + dir.y * dir.y;
    if (l == 0) return null;
    const norm = dir.mulScalar(1 / l);
    norm.depth = dir.depth;
    return norm;
  }

  rk4(point) {
    const stepLen = this.config.stepLength;
    const k1 = this.readField(point);
    if (!k1) return null;
    const k2 = this.readField(point.add(k1.mulScalar(stepLen * 0.5)));
    if (!k2) return null;
    const k3 = this.readField(point.add(k2.mulScalar(stepLen * 0.5)));
    if (!k3) return null;
    const k4 = this.readField(point.add(k3.mulScalar(stepLen)));
    if (!k4) return null;
    const res = k1.mulScalar(stepLen / 6)
      .add(k2.mulScalar(stepLen / 3))
      .add(k3.mulScalar(stepLen / 3))
      .add(k4.mulScalar(stepLen / 6));
    return res;
  }
}

export {Integrator}
