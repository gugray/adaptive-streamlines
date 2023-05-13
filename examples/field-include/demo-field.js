const noiseRange = 2.2;
const noiseFreq = 6;
const noise = new (perlinNoise3D())();
noise.noiseSeed(65536 * Math.random());

let w, h;

document.addEventListener("DOMContentLoaded", async () => {

  const elm = document.getElementById("cnv");
  w = elm.width = elm.clientWidth * devicePixelRatio;
  h = elm.height = elm.clientHeight * devicePixelRatio;
  const ctx2D = elm.getContext("2d");

  const flowLines = [];

  const renderFlowlines = () => {
    ctx2D.fillStyle = "#323232";
    ctx2D.fillRect(0, 0, w, h);
    ctx2D.fill();
    ctx2D.strokeStyle = "#c73800";
    ctx2D.lineWidth = 3;
    ctx2D.beginPath();
    for (const pts of flowLines) {
      ctx2D.moveTo(pts[0].x, h - pts[0].y);
      for (let i = 1; i < pts.length; ++i) {
        ctx2D.lineTo(pts[i].x, h - pts[i].y);
      }
    }
    ctx2D.stroke();
  }

  const lineAdded = points => {
    flowLines.push(points);
    if ((flowLines.length % 10) != 0) return;
    renderFlowlines();
  };

  const slGen = createStreamlineGenerator({
    field: flowFun,
    density: densityFun,
    width: w,
    height: h,
    minStartDist: 6,
    maxStartDist: 196,
    endRatio: 0.4,
    minPointsPerLine: 5,
    stepLength: 2,
    onStreamlineAdded: lineAdded,
  });
  await slGen.runAsync();

  renderFlowlines();
});

function flowFun(pt) {
  const normX = pt.x / w;
  const normY = pt.y / h;
  const angle = noiseFreq * 2 * Math.PI * noise.get(normX * noiseRange / 2, normY * noiseRange / 2);
  const res = new Vector(Math.cos(angle), Math.sin(angle));
  return res;
}

function densityFun(pt) {
  const normX = pt.x / w;
  const normY = pt.y / h;
  let clr = Math.sqrt((normX - 0.5) ** 2 + (normY - 0.5) ** 2);
  clr = 0.5 * (1 - Math.sin(clr * Math.PI * 2));
  return Math.pow(clr, 0.8);
}

// Code from https://github.com/alterebro/perlin-noise-3d
function perlinNoise3D() {

  // Based on http://mrl.nyu.edu/~perlin/noise/
  // Adapting from runemadsen/rune.noise.js
  // Which was adapted from P5.js
  // Which was adapted from PApplet.java
  // which was adapted from toxi
  // which was adapted from the german demo group farbrausch as used in their demo "art": http://www.farb-rausch.de/fr010src.zip

  let PERLIN_YWRAPB = 4;
  let PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
  let PERLIN_ZWRAPB = 8;
  let PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
  let PERLIN_SIZE = 4095;

  let SINCOS_PRECISION = 0.5;
  let SINCOS_LENGTH = Math.floor(360 / SINCOS_PRECISION);
  let sinLUT = new Array(SINCOS_LENGTH);
  let cosLUT = new Array(SINCOS_LENGTH);
  let DEG_TO_RAD = Math.PI / 180.0;
  for (let i = 0; i < SINCOS_LENGTH; i++) {
    sinLUT[i] = Math.sin(i * DEG_TO_RAD * SINCOS_PRECISION);
    cosLUT[i] = Math.cos(i * DEG_TO_RAD * SINCOS_PRECISION);
  }

  let perlin_PI = SINCOS_LENGTH;
  perlin_PI >>= 1;

  let Noise = function () {
    this.perlin_octaves = 4; // default to medium smooth
    this.perlin_amp_falloff = 0.5; // 50% reduction/octave
    this.perlin = null;
  }

  Noise.prototype = {

    noiseSeed: function (seed) {

      // Linear Congruential Generator
      // Variant of a Lehman Generator
      let lcg = (function () {
        // Set to values from http://en.wikipedia.org/wiki/Numerical_Recipes
        // m is basically chosen to be large (as it is the max period)
        // and for its relationships to a and c
        let m = 4294967296,
          // a - 1 should be divisible by m's prime factors
          a = 1664525,
          // c and m should be co-prime
          c = 1013904223,
          seed, z;
        return {
          setSeed: function (val) {
            // pick a random seed if val is undefined or null
            // the >>> 0 casts the seed to an unsigned 32-bit integer
            z = seed = (val == null ? Math.random() * m : val) >>> 0;
          },
          getSeed: function () {
            return seed;
          },
          rand: function () {
            // define the recurrence relationship
            z = (a * z + c) % m;
            // return a float in [0, 1)
            // if z = m then z / m = 0 therefore (z % m) / m < 1 always
            return z / m;
          }
        };
      }());

      lcg.setSeed(seed);
      this.perlin = new Array(PERLIN_SIZE + 1);
      for (let i = 0; i < PERLIN_SIZE + 1; i++) {
        this.perlin[i] = lcg.rand();
      }
      return this;
    },

    get: function (x, y, z) {

      y = y || 0;
      z = z || 0;

      if (this.perlin == null) {
        this.perlin = new Array(PERLIN_SIZE + 1);
        for (let i = 0; i < PERLIN_SIZE + 1; i++) {
          this.perlin[i] = Math.random();
        }
      }

      if (x < 0) { x = -x; }
      if (y < 0) { y = -y; }
      if (z < 0) { z = -z; }

      let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      let xf = x - xi;
      let yf = y - yi;
      let zf = z - zi;
      let rxf, ryf;

      let r = 0;
      let ampl = 0.5;

      let n1, n2, n3;

      let noise_fsc = function (i) {
        // using cosine lookup table
        return 0.5 * (1.0 - cosLUT[Math.floor(i * perlin_PI) % SINCOS_LENGTH]);
      };

      for (let o = 0; o < this.perlin_octaves; o++) {
        let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);

        rxf = noise_fsc(xf);
        ryf = noise_fsc(yf);

        n1 = this.perlin[of & PERLIN_SIZE];
        n1 += rxf * (this.perlin[(of + 1) & PERLIN_SIZE] - n1);
        n2 = this.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
        n2 += rxf * (this.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
        n1 += ryf * (n2 - n1);

        of += PERLIN_ZWRAP;
        n2 = this.perlin[of & PERLIN_SIZE];
        n2 += rxf * (this.perlin[(of + 1) & PERLIN_SIZE] - n2);
        n3 = this.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
        n3 += rxf * (this.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
        n2 += ryf * (n3 - n2);

        n1 += noise_fsc(zf) * (n2 - n1);

        r += n1 * ampl;
        ampl *= this.perlin_amp_falloff;
        xi <<= 1;
        xf *= 2;
        yi <<= 1;
        yf *= 2;
        zi <<= 1;
        zf *= 2;

        if (xf >= 1.0) { xi++; xf--; }
        if (yf >= 1.0) { yi++; yf--; }
        if (zf >= 1.0) { zi++; zf--; }
      }
      return r;
    }

  }

  return Noise;

};


