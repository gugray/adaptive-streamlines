import {Vector} from "./vector.js";
import {Masker} from "./masker.js";
import {LookupGrid} from "./lookup-grid.js";
import {Integrator} from "./integrator.js";

const STATE_INIT = 0;
const STATE_STREAMLINE = 1;
const STATE_PROCESS_QUEUE = 2;
const STATE_DONE = 3;
const STATE_SEED_STREAMLINE = 4;

/**
 * Creates a new streamline generator.
 *
 * @param {Object} options - Options for the streamline generator.
 * @param {function} field The flow field function that returns a normalized 2d vector for every part of the domain
 */
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
                                     maxTimePerIteration = 500,
                                     onStreamlineAdded
                                   }) {
  if (minStartDist < 2 || minStartDist > 254) throw "2 <= minStartDist <= 254 expected";
  if (maxStartDist < 2 || maxStartDist > 254) throw "2 <= maxStartDist <= 254 expected";
  if (endRatio < 0.1 || endRatio >= 1) throw "0.1 <= endRatio < 1 expected";

  if (!seed) {
    seed = new Vector(
      Math.random() * width,
      Math.random() * height
    );
  }

  const startMask = new Masker({
    width: width,
    height: height,
    density: density,
    minDist: minStartDist,
    maxDist: maxStartDist,
  }, false);

  const stopMask = new Masker({
    width: width,
    height: height,
    density: density,
    minDist: minStartDist * endRatio,
    maxDist: maxStartDist * endRatio,
  }, false);

  let resolve = null;
  let state = STATE_INIT;
  let finishedStreamlineIntegrators = [];

  const icfg = {
    field, density, width, height,
    minStartDist, maxStartDist, endRatio, stepLength,
  };
  let integrator = new Integrator(seed, startMask, stopMask, icfg);
  let running = false;

  return {
    run,
    isRunning: () => running,
  };


  function run() {
    if (running) return;
    running = true;
    setTimeout(() => nextStep(), 0);
    return new Promise(r => resolve = r);
  }

  function nextStep() {
    let start = window.performance.now();

    for (let i = 0; i < stepsPerIteration; ++i) {
      if (state === STATE_INIT) initProcessing();
      if (state === STATE_STREAMLINE) continueStreamline();
      if (state === STATE_PROCESS_QUEUE) processQueue();
      if (state === STATE_SEED_STREAMLINE) seedStreamline();
      if (window.performance.now() - start > maxTimePerIteration) break;

      if (state === STATE_DONE) {
        resolve();
        running = false;
        return;
      }
    }
    setTimeout(() => nextStep(), 0);
  }

  function initProcessing() {
    if (!integrator.next())
      return;
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
    else state = STATE_SEED_STREAMLINE;
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

export {createStreamlineGenerator, Vector}
