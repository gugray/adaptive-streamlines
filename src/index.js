import {Vector} from "./vector.js";
import {Masker} from "./masker.js";
import {LookupGrid} from "./lookup-grid.js";
import {Integrator} from "./integrator.js";
import {shuffle} from "./shuffle.js";

const STATE_INIT = 0;
const STATE_STREAMLINE = 1;
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
                                     rand,
                                     minStartDist = 8,
                                     maxStartDist = 36,
                                     endRatio = 0.4,
                                     minPointsPerLine = 5,
                                     stepLength = 2,
                                     stepsPerIteration = 8,
                                     maxMsecPerIteration = 500,
                                     onStreamlineAdded
                                   }) {
  if (minStartDist < 2 || minStartDist > 254) throw "2 <= minStartDist <= 254 expected";
  if (maxStartDist < 2 || maxStartDist > 254) throw "2 <= maxStartDist <= 254 expected";
  if (endRatio < 0.1 || endRatio >= 1) throw "0.1 <= endRatio < 1 expected";

  if (!rand) rand = Math.random;

  if (!seed) seed = new Vector(rand() * width, rand() * height);

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
  let isCancelled = false;
  let isAsync = false;
  let state = STATE_INIT;
  let finishedStreamlineIntegrators = [];

  const icfg = {
    field, density, width, height,
    minStartDist, maxStartDist, endRatio, stepLength,
  };
  let integrator = new Integrator(seed, startMask, stopMask, icfg);

  return {
    run,
    runAsync,
    cancel,
  };

  function run() {
    isAsync = false;
    doWork();
  }

  async function runAsync() {
    isAsync = true;
    setTimeout(() => doWork());
    return new Promise(r => resolve = r);
  }
  
  function cancel() {
    isCancelled = true;
  }

  function doWork() {

    let start = window.performance.now();

    for (let i = 0; !isAsync || i < stepsPerIteration; ++i) {

      if (state === STATE_INIT) initProcessing();
      else if (state === STATE_STREAMLINE) continueStreamline();
      else if (state === STATE_SEED_STREAMLINE) seedStreamline();

      if (isAsync && window.performance.now() - start > maxMsecPerIteration)
        break;

      if (isCancelled || state === STATE_DONE) {
        if (isAsync && resolve) resolve();
        return;
      }
    }

    if (isAsync) setTimeout(() => doWork());
  }

  function initProcessing() {
    if (!integrator.next()) {
      state = STATE_DONE;
      return;
    }
    addStreamLineToQueue();
    state = STATE_STREAMLINE;
  }

  function seedStreamline() {
    while (finishedStreamlineIntegrators.length > 0) {
      let currentStreamLine = finishedStreamlineIntegrators[0];
      let nextSeed = currentStreamLine.getNextValidSeed();
      if (nextSeed) {
        integrator = new Integrator(nextSeed, startMask, stopMask, icfg);
        state = STATE_STREAMLINE;
        return;
      }
      finishedStreamlineIntegrators.shift();
      continue;
    }
    // Find new random seed
    const allFreeCoords = startMask.getFreeCoords();
    // None left
    if (allFreeCoords.length == 0) {
      state = STATE_DONE;
      return;
    }
    shuffle(allFreeCoords, rand);
    const randomSeed = new Vector(allFreeCoords[0][0], allFreeCoords[0][1]);
    integrator = new Integrator(randomSeed, startMask, stopMask, icfg);
    state = STATE_STREAMLINE;
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
