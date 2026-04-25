// Generates the full HTML document for the p5.js art iframe.
// The sketch listens for postMessage({ type:'PARAMS', params }) from the parent.

export function generateSketch(): string {
    return `<!DOCTYPE html>
<html>
<head>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
<style>
  * { margin:0; padding:0; }
  body { background:#060a0e; overflow:hidden; width:100vw; height:100vh; }
  canvas { display:block; }
</style>
</head>
<body>
<script>
// === PARAMS (updated via postMessage) ===
let P = {
  mode:0, speed:50, count:50, size:50,
  hue:200, saturation:80, symmetry:0,
  turbulence:40, trail:70, pulse:30
};

window.addEventListener('message', e => {
  if (e.data && e.data.type === 'PARAMS') {
    Object.assign(P, e.data.params);
  }
});

// === PARTICLE SYSTEM ===
let particles = [];
class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x = random(width);
    this.y = random(height);
    this.vx = 0; this.vy = 0;
    this.life = random(100, 400);
    this.age = 0;
    this.sz = random(1, 5);
  }
  update() {
    let sp = P.speed * 0.04;
    let turb = P.turbulence * 0.01;
    let noiseScale = 0.003 + turb * 0.01;
    let angle = noise(this.x * noiseScale, this.y * noiseScale, frameCount * 0.005 * sp) * TWO_PI * 2;
    this.vx = cos(angle) * sp * 2;
    this.vy = sin(angle) * sp * 2;
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.age > this.life || this.x < -20 || this.x > width+20 || this.y < -20 || this.y > height+20) this.reset();
  }
  draw() {
    let alpha = map(this.age, 0, this.life, 255, 0);
    let h = (P.hue + this.age * 0.3) % 360;
    let s = P.saturation;
    let sz = this.sz * (P.size * 0.03) * (1 + sin(frameCount * 0.05 * P.pulse * 0.02) * P.pulse * 0.005);
    fill(h, s, 90, alpha * 0.8);
    noStroke();
    circle(this.x, this.y, sz);
  }
}

// === FLOW FIELD ===
function drawFlowField() {
  let sp = P.speed * 0.03;
  let res = map(P.count, 0, 100, 30, 8);
  let turb = P.turbulence * 0.015;
  let cols = floor(width / res);
  let rows = floor(height / res);
  strokeWeight(map(P.size, 0, 100, 0.5, 4));
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * res + res / 2;
      let y = j * res + res / 2;
      let angle = noise(i * 0.1 * (1 + turb), j * 0.1 * (1 + turb), frameCount * 0.008 * sp) * TWO_PI * 2;
      let len = res * 0.6;
      let h = (P.hue + angle * 30 + frameCount * 0.3) % 360;
      stroke(h, P.saturation, 80, 150);
      let x2 = x + cos(angle) * len;
      let y2 = y + sin(angle) * len;
      line(x, y, x2, y2);
      fill(h, P.saturation, 100, 200);
      noStroke();
      circle(x2, y2, map(P.size, 0, 100, 1, 4));
      strokeWeight(map(P.size, 0, 100, 0.5, 4));
    }
  }
}

// === GEOMETRY ===
function drawGeometry() {
  let sp = P.speed * 0.02;
  let t = frameCount * sp * 0.1;
  let n = floor(map(P.count, 0, 100, 3, 20));
  let maxR = min(width, height) * 0.35 * (P.size * 0.015 + 0.25);
  let pulseFactor = 1 + sin(t * P.pulse * 0.1) * P.pulse * 0.003;
  noFill();
  for (let ring = 0; ring < n; ring++) {
    let r = maxR * ((ring + 1) / n) * pulseFactor;
    let sides = floor(map(ring, 0, n, 3, 12));
    let h = (P.hue + ring * (360 / n) + t * 20) % 360;
    stroke(h, P.saturation, 85, map(ring, 0, n, 255, 80));
    strokeWeight(map(P.size, 0, 100, 0.5, 3));
    let rot = t * (ring % 2 === 0 ? 1 : -1) + ring * 0.2;
    let turb = sin(t + ring) * P.turbulence * 0.3;
    beginShape();
    for (let i = 0; i <= sides; i++) {
      let a = (TWO_PI / sides) * i + rot;
      let rr = r + sin(a * 3 + t * 2) * turb;
      vertex(width/2 + cos(a) * rr, height/2 + sin(a) * rr);
    }
    endShape(CLOSE);
  }
}

// === WAVES ===
function drawWaves() {
  let sp = P.speed * 0.03;
  let t = frameCount * sp * 0.05;
  let nWaves = floor(map(P.count, 0, 100, 3, 25));
  noFill();
  for (let w = 0; w < nWaves; w++) {
    let yOff = height * ((w + 1) / (nWaves + 1));
    let h = (P.hue + w * (360 / nWaves) + t * 50) % 360;
    stroke(h, P.saturation, 80, map(w, 0, nWaves, 200, 60));
    strokeWeight(map(P.size, 0, 100, 0.5, 4));
    beginShape();
    for (let x = 0; x <= width; x += 3) {
      let turb = noise(x * 0.005 * (1 + P.turbulence * 0.01), w * 0.3, t) * P.turbulence * 1.5;
      let amp = 30 * (P.size * 0.02) * (1 + sin(t * P.pulse * 0.2 + w) * P.pulse * 0.005);
      let y = yOff + sin(x * 0.01 * (w + 1) + t * (w + 1) * 0.5) * amp + turb;
      vertex(x, y);
    }
    endShape();
  }
}

// === NEBULA ===
let nebulaParticles = [];
class NebulaP {
  constructor() { this.reset(); }
  reset() {
    let angle = random(TWO_PI);
    let dist = random(50, min(width,height)*0.45);
    this.x = width/2 + cos(angle)*dist;
    this.y = height/2 + sin(angle)*dist;
    this.angle = angle;
    this.dist = dist;
    this.speed = random(0.002, 0.01);
    this.sz = random(2, 12);
    this.hOff = random(-40, 40);
  }
  update() {
    let sp = P.speed * 0.02;
    this.angle += this.speed * sp;
    let turb = noise(this.x*0.005, this.y*0.005, frameCount*0.003) * P.turbulence * 0.5;
    let r = this.dist + sin(this.angle*3 + frameCount*0.01)*turb;
    let pulseFactor = 1 + sin(frameCount*0.02*P.pulse*0.03)*P.pulse*0.005;
    this.x = width/2 + cos(this.angle)*r*pulseFactor;
    this.y = height/2 + sin(this.angle)*r*pulseFactor;
  }
  draw() {
    let h = (P.hue + this.hOff + this.angle*20)%360;
    let sz = this.sz * (P.size*0.025+0.2);
    fill(h, P.saturation*0.8, 70, 60);
    noStroke();
    circle(this.x, this.y, sz);
    fill(h, P.saturation*0.5, 95, 25);
    circle(this.x, this.y, sz*2.5);
  }
}

// === SETUP ===
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  for (let i = 0; i < 500; i++) particles.push(new Particle());
  for (let i = 0; i < 300; i++) nebulaParticles.push(new NebulaP());
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// === DRAW ===
function draw() {
  // Trail effect
  let trailAlpha = map(P.trail, 0, 100, 255, 5);
  background(6, 10, 14, trailAlpha);

  // Apply symmetry
  let symCount = [1, 2, 4, 8][P.symmetry] || 1;

  for (let s = 0; s < symCount; s++) {
    push();
    translate(width/2, height/2);
    rotate((TWO_PI / symCount) * s);
    translate(-width/2, -height/2);

    switch (P.mode) {
      case 0: // Particles
        let pCount = floor(map(P.count, 0, 100, 50, 500));
        while (particles.length < pCount) particles.push(new Particle());
        for (let i = 0; i < min(pCount, particles.length); i++) {
          particles[i].update();
          particles[i].draw();
        }
        break;
      case 1: drawFlowField(); break;
      case 2: drawGeometry(); break;
      case 3: drawWaves(); break;
      case 4: // Nebula
        let nCount = floor(map(P.count, 0, 100, 30, 300));
        while (nebulaParticles.length < nCount) nebulaParticles.push(new NebulaP());
        for (let i = 0; i < min(nCount, nebulaParticles.length); i++) {
          nebulaParticles[i].update();
          nebulaParticles[i].draw();
        }
        break;
    }
    pop();
  }

  // Subtle vignette
  drawVignette();
}

function drawVignette() {
  noStroke();
  let cx = width/2, cy = height/2;
  let maxR = dist(0,0,cx,cy);
  for (let r = maxR; r > maxR*0.5; r -= maxR*0.05) {
    let a = map(r, maxR*0.5, maxR, 0, 80);
    fill(0, 0, 0, a);
    ellipse(cx, cy, r*2, r*2);
  }
}
</script>
</body>
</html>`;
}
