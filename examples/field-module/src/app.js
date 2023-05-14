import {createStreamlineGenerator, Vector} from "adaptive-streamlines";
import {Noise} from "./perlinNoise3D.js";

const noiseRange = 2.2;
const noiseFreq = 6;
const noise = new Noise();
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
    ctx2D.strokeStyle = "#624fde";
    ctx2D.lineWidth = 3;
    ctx2D.beginPath();
    for (const pts of flowLines) {
      ctx2D.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; ++i) {
        ctx2D.lineTo(pts[i].x, pts[i].y);
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


