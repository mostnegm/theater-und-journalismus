let video;
let revealVideo;
let started = false;
let pg; // Graphics buffer for blob effect
let brightnessThreshold = 10; // Adjustable threshold for blob edges
let processWidth = 1280;
let processHeight = 720;
let displayWidth;
let displayHeight;
let gridSpacing = 8; // Distance between grid points

// Cursor reveal settings
let cursorRadius = 100;
let snappedRadius;
let mouseXPos = -1000;
let mouseYPos = -1000;

function setup() {
  let container = select('#p5-container');
  calculateCanvasSize(container);
  let canvas = createCanvas(displayWidth, displayHeight);
  canvas.parent('p5-container');
  
  // Load main video for effect
  video = createVideo('assets/hero-video.mp4', videoReady);
  video.hide();
  video.size(processWidth, processHeight);
  
  // Load reveal video
  revealVideo = createVideo('assets/reveal-video.mp4');
  revealVideo.hide();
  revealVideo.size(processWidth, processHeight);
  revealVideo.loop();
  
  pg = createGraphics(processWidth, processHeight);
  
  noCursor();
}

function calculateCanvasSize(container) {
  let containerWidth = container.width;
  let containerHeight = container.height;
  let aspectRatio = 16 / 9;
  
  // Always fit height, let width overflow if needed
  displayHeight = containerHeight;
  displayWidth = displayHeight * aspectRatio;
  
  // If calculated width is smaller than container, use container width instead
  if (displayWidth < containerWidth) {
    displayWidth = containerWidth;
    displayHeight = displayWidth / aspectRatio;
  }
}

function windowResized() {
  let container = select('#p5-container');
  calculateCanvasSize(container);
  resizeCanvas(displayWidth, displayHeight);
}

function videoReady() {
  video.loop();
  started = true;
}

function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

function draw() {
  background(255);
  if (started) {
    // Load pixels once at the start
    video.loadPixels();
    
    // Draw circles to off-screen buffer
    pg.background(0);
    pg.noStroke();
    pg.fill(255);
    
    let videoPixels = video.pixels; // Cache pixel array
    
    for (let x = 0; x < processWidth; x += gridSpacing) {
      for (let y = 0; y < processHeight; y += gridSpacing) {
        let index = (x + y * processWidth) * 4;
        let r = videoPixels[index];
        let g = videoPixels[index + 1];
        let b = videoPixels[index + 2];
        let bright = (r + g + b) / 3;
        
        // Skip very dark areas
        if (bright < 30) {
          continue;
        }
        
        let weight = 1 - bright / 255;
        let radius = map(weight, 0, 1, 0.1, 5, true);
        
        pg.circle(x, y, radius * 2);
      }
    }
    
    // Apply blur to create blob merging effect
    // pg.filter(BLUR, 2);
    
    // Apply threshold and color replacement in single pass
    pg.loadPixels();
    let pgPixels = pg.pixels; // Cache pixel array
    
    for (let i = 0; i < pgPixels.length; i += 4) {
      let brightness = pgPixels[i];
      
      if (brightness < brightnessThreshold) {
        // Blacks
        pgPixels[i] = 35;
        pgPixels[i + 1] = 31;
        pgPixels[i + 2] = 32;
      } else {
        // Whites
        pgPixels[i] = 255;
        pgPixels[i + 1] = 255;
        pgPixels[i + 2] = 255;
      }
    }
    pg.updatePixels();
    
    // Display the processed graphics
    image(pg, 0, 0, displayWidth, displayHeight);
    
    // Reveal original video in circle around cursor
    if (mouseXPos > 0 && mouseYPos > 0 && mouseXPos < width && mouseYPos < height) {
      // Snap radius to grid
      let displayGridSpacing = gridSpacing * (displayWidth / processWidth);
      snappedRadius = Math.round(cursorRadius / displayGridSpacing) * displayGridSpacing;
      
      push();
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.arc(mouseXPos, mouseYPos, snappedRadius, 0, TWO_PI);
      drawingContext.clip();
      
      image(revealVideo, 0, 0, displayWidth, displayHeight);
      
      drawingContext.restore();
      pop();
      
      // Draw dotted circle outline with reveal video
      noFill();
      noStroke();
      
      let circumference = TWO_PI * snappedRadius;
      let numDots = floor(circumference / displayGridSpacing);
      
      for (let i = 0; i < numDots; i++) {
        let angle = map(i, 0, numDots, 0, TWO_PI);
        let x = mouseXPos + cos(angle) * snappedRadius;
        let y = mouseYPos + sin(angle) * snappedRadius;
        
        // Draw small circles showing reveal video
        push();
        drawingContext.save();
        drawingContext.beginPath();
        drawingContext.arc(x, y, 5, 0, TWO_PI);
        drawingContext.clip();
        
        image(revealVideo, 0, 0, displayWidth, displayHeight);
        
        drawingContext.restore();
        pop();
      }
    }
  }
}

function mouseMoved() {
  let displayGridSpacing = gridSpacing * (displayWidth / processWidth);
  mouseXPos = snapToGrid(mouseX, displayGridSpacing);
  mouseYPos = snapToGrid(mouseY, displayGridSpacing);
  return false;
}

function mouseOut() {
  mouseXPos = -1000;
  mouseYPos = -1000;
}