import {createStreamlineGenerator, Vector} from "adaptive-streamlines";
import {Noise} from "./perlinNoise3D.js";

const imgUrl = "photo.jpg";
const noiseRange = 2.2;
const densPower = 5;

let w, h;
let img, imgData;
const noise = new Noise();
noise.noiseSeed(65536 * Math.random());

document.addEventListener("DOMContentLoaded", async () => {

  img = await loadImage(imgUrl);
  [w, h] = [img.width, img.height];
  imgData = getImageData(img);

  const elm = document.getElementById("cnv");
  elm.width = w;
  elm.height = h;
  elm.style.width = (w / devicePixelRatio) + "px";
  elm.style.height = (h / devicePixelRatio) + "px";
  elm.style.visibility = "visible";
  const ctx2D = elm.getContext("2d");

  const flowLines = [];

  const renderFlowlines = () => {
    ctx2D.fillStyle = "#fdfaf7";
    ctx2D.fillRect(0, 0, w, h);
    ctx2D.fill();
    ctx2D.strokeStyle = "#4e2e0e";
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
    minStartDist: 4,
    maxStartDist: 192,
    endRatio: 0.9,
    minPointsPerLine: 3,
    stepLength: 2,
    onStreamlineAdded: lineAdded,
  });

  await slGen.runAsync();

  renderFlowlines();
});

async function loadImage(imageUrl) {
  let img;
  const imageLoadPromise = new Promise(resolve => {
    img = new Image();
    img.onload = resolve;
    img.src = imageUrl;
  });
  await imageLoadPromise;
  return img;
}

function getImageData(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const context = canvas.getContext('2d');
  context.drawImage(img, 0, 0);
  return context.getImageData(0, 0, img.width, img.height).data;
}

function flowFun(pt) {
  const normX = pt.x / w;
  const normY = pt.y / h;

  let res = new Vector(
    1 - 2 * noise.get(normX * noiseRange / 2, normY * noiseRange / 2, 0),
    1 - 2 * noise.get(normX * noiseRange / 2, normY * noiseRange / 2, 0.5));
  res = res.mulScalar(1 / res.length());
  return res;
}

function densityFun(pt) {

  let x = Math.floor(pt.x);
  let y = Math.floor(pt.y);
  x = Math.max(0, Math.min(w, x));
  y = Math.max(0, Math.min(h, y));
  let ofs = (img.width * y + x) * 4;
  let r = imgData[ofs] / 255;
  let g = imgData[ofs+1] / 255;
  let b = imgData[ofs+2] / 255;
  let val = (r+g+b) / 3;

  val = Math.max(0, Math.min(1, val));
  return Math.pow(val, densPower);
}

