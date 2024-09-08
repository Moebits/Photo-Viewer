import React, { PureComponent } from "react";
import PropTypes from "prop-types";
import { LazyBrush } from "lazy-brush";
import { Catenary } from "catenary-curve";

import ResizeObserver from "resize-observer-polyfill";

function drawImage({ctx, img, x, y, w, h, offsetX, offsetY} = {}) {
  // Defaults
  if (typeof x !== "number") x = 0;
  if (typeof y !== "number") y = 0;
  if (typeof w !== "number") w = ctx.canvas.width;
  if (typeof h !== "number") h = ctx.canvas.height;
  if (typeof offsetX !== "number") offsetX = 0.5;
  if (typeof offsetY !== "number") offsetY = 0.5;

  // keep bounds [0.0, 1.0]
  if (offsetX < 0) offsetX = 0;
  if (offsetY < 0) offsetY = 0;
  if (offsetX > 1) offsetX = 1;
  if (offsetY > 1) offsetY = 1;

  var iw = img.width,
    ih = img.height,
    r = Math.min(w / iw, h / ih),
    nw = iw * r, // new prop. width
    nh = ih * r, // new prop. height
    cx,
    cy,
    cw,
    ch,
    ar = 1;

  // decide which gap to fill
  if (nw < w) ar = w / nw;
  if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; // updated
  nw *= ar;
  nh *= ar;

  // calc source rectangle
  cw = iw / (nw / w);
  ch = ih / (nh / h);

  cx = (iw - cw) * offsetX;
  cy = (ih - ch) * offsetY;

  // make sure source rectangle is valid
  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cw > iw) cw = iw;
  if (ch > ih) ch = ih;

  // fill image in dest. rectangle
  ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
}


function midPointBtw(p1, p2) {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2
  };
}

const canvasStyle = {
  display: "block",
  position: "absolute"
};

const canvasTypes = [
  {
    name: "interface",
    zIndex: 15
  },
  {
    name: "drawing",
    zIndex: 11
  },
  {
    name: "temp",
    zIndex: 12
  },
  {
    name: "grid",
    zIndex: 10
  }
];

const dimensionsPropTypes = PropTypes.oneOfType([
  PropTypes.number,
  PropTypes.string
]);

export default class extends PureComponent {
  static propTypes = {
    onChange: PropTypes.func,
    loadTimeOffset: PropTypes.number,
    lazyRadius: PropTypes.number,
    brushRadius: PropTypes.number,
    brushColor: PropTypes.string,
    catenaryColor: PropTypes.string,
    gridColor: PropTypes.string,
    backgroundColor: PropTypes.string,
    hideGrid: PropTypes.bool,
    canvasWidth: dimensionsPropTypes,
    canvasHeight: dimensionsPropTypes,
    disabled: PropTypes.bool,
    imgSrc: PropTypes.string,
    saveData: PropTypes.string,
    immediateLoading: PropTypes.bool,
    hideInterface: PropTypes.bool,
    erase: PropTypes.bool,
    eraseColor: PropTypes.string,
  };

  static defaultProps = {
    onChange: null,
    loadTimeOffset: 5,
    lazyRadius: 12,
    brushRadius: 10,
    brushColor: "#444",
    catenaryColor: "#0a0302",
    gridColor: "rgba(150,150,150,0.17)",
    backgroundColor: "#FFF",
    hideGrid: false,
    canvasWidth: 400,
    canvasHeight: 400,
    disabled: false,
    imgSrc: "",
    saveData: "",
    immediateLoading: false,
    hideInterface: false,
    erase: false,
    eraseColor: "#000000"
  };

  constructor(props) {
    super(props);

    this.canvas = {};
    this.ctx = {};

    this.catenary = new Catenary();

    this.points = [];
    this.lines = [];

    this.mouseHasMoved = true;
    this.valuesChanged = true;
    this.isDrawing = false;
    this.isPressing = false;
  }

  componentDidMount() {
    this.lazy = new LazyBrush({
      radius: this.props.lazyRadius * window.devicePixelRatio,
      enabled: true,
      initialPoint: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      }
    });
    this.chainLength = this.props.lazyRadius * window.devicePixelRatio;

    this.canvasObserver = new ResizeObserver((entries, observer) =>
      this.handleCanvasResize(entries, observer)
    );
    this.canvasObserver.observe(this.canvasContainer);

    this.drawImage();
    this.loop();

    window.setTimeout(() => {
      const initX = window.innerWidth / 2;
      const initY = window.innerHeight / 2;
      this.lazy.update(
        { x: initX - this.chainLength / 4, y: initY },
        { both: true }
      );
      this.lazy.update(
        { x: initX + this.chainLength / 4, y: initY },
        { both: false }
      );
      this.mouseHasMoved = true;
      this.valuesChanged = true;
      this.clear();

      // Load saveData from prop if it exists
      if (this.props.saveData) {
        this.loadSaveData(this.props.saveData);
      }
    }, 100);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.lazyRadius !== this.props.lazyRadius) {
      // Set new lazyRadius values
      this.chainLength = this.props.lazyRadius * window.devicePixelRatio;
      this.lazy.setRadius(this.props.lazyRadius * window.devicePixelRatio);
    }

    if (prevProps.saveData !== this.props.saveData) {
      this.loadSaveData(this.props.saveData);
    }

    if (JSON.stringify(prevProps) !== JSON.stringify(this.props)) {
      // Signal this.loop function that values changed
      this.valuesChanged = true;
    }

    if (prevProps.imgSrc !== this.props.imgSrc) {
      this.drawImage();
    }
  }

  componentWillUnmount = () => {
    this.canvasObserver.unobserve(this.canvasContainer);
  };

  drawImage = () => {
    if (!this.props.imgSrc) return;

    // Load the image
    this.image = new Image();

    // Prevent SecurityError "Tainted canvases may not be exported." #70
    this.image.crossOrigin = "anonymous";

    // Draw the image once loaded
    this.image.onload = this.redrawImage;
    this.image.src = this.props.imgSrc;
  };

  redrawImage = () => {
    this.image &&
      this.image.complete &&
      drawImage({ ctx: this.ctx.grid, img: this.image });
  };

  undo = () => {
    const lines = this.lines.slice(0, -1);
    this.clear();
    this.simulateDrawingLines({ lines, immediate: true });
    this.triggerOnChange();
  };

  getSaveData = () => {
    // Construct and return the stringified saveData object
    return JSON.stringify({
      lines: this.lines,
      width: this.props.canvasWidth,
      height: this.props.canvasHeight
    });
  };

  getDataURL = (fileType, useBgImage, backgroundColour) => {
    // Get a reference to the "drawing" layer of the canvas
    let canvasToExport = this.canvas.drawing;

    let context = canvasToExport.getContext("2d");

    //cache height and width
    let width = canvasToExport.width;
    let height = canvasToExport.height;

    //get the current ImageData for the canvas
    let storedImageData = context.getImageData(0, 0, width, height);

    //store the current globalCompositeOperation
    var compositeOperation = context.globalCompositeOperation;

    //set to draw behind current content
    context.globalCompositeOperation = "destination-over";

    // If "useBgImage" has been set to true, this takes precedence over the background colour parameter
    if (useBgImage) {
      if (!this.props.imgSrc) return "Background image source not set";

      // Write the background image
      this.drawImage();
    } else if (backgroundColour != null) {
      //set background color
      context.fillStyle = backgroundColour;

      //fill entire canvas with background colour
      context.fillRect(0, 0, width, height);
    }

    // If the file type has not been specified, default to PNG
    if (!fileType) fileType = "png";

    // Export the canvas to data URL
    let imageData = canvasToExport.toDataURL(`image/${fileType}`);

    //clear the canvas
    context.clearRect(0, 0, width, height);

    //restore it with original / cached ImageData
    context.putImageData(storedImageData, 0, 0);

    //reset the globalCompositeOperation to what it was
    context.globalCompositeOperation = compositeOperation;

    return imageData;
  }

  loadSaveData = (saveData, immediate = this.props.immediateLoading) => {
    if (typeof saveData !== "string") {
      throw new Error("saveData needs to be of type string!");
    }

    const { lines, width, height } = JSON.parse(saveData);

    if (!lines || typeof lines.push !== "function") {
      throw new Error("saveData.lines needs to be an array!");
    }

    this.clear();

    if (
      width === this.props.canvasWidth &&
      height === this.props.canvasHeight
    ) {
      this.simulateDrawingLines({
        lines,
        immediate
      });
    } else {
      // we need to rescale the lines based on saved & current dimensions
      const scaleX = this.props.canvasWidth / width;
      const scaleY = this.props.canvasHeight / height;
      const scaleAvg = (scaleX + scaleY) / 2;

      this.simulateDrawingLines({
        lines: lines.map(line => ({
          ...line,
          points: line.points.map(p => ({
            x: p.x * scaleX,
            y: p.y * scaleY
          })),
          brushRadius: line.brushRadius * scaleAvg
        })),
        immediate
      });
    }
  };

  simulateDrawingLines = ({ lines, immediate }) => {
    // Simulate live-drawing of the loaded lines
    // TODO use a generator
    let curTime = 0;
    let timeoutGap = immediate ? 0 : this.props.loadTimeOffset;

    lines.forEach(line => {
      const { points, brushColor, brushRadius } = line;

      // Draw all at once if immediate flag is set, instead of using setTimeout
      if (immediate) {
        // Draw the points
        this.drawPoints({
          points,
          brushColor,
          brushRadius
        });

        // Save line with the drawn points
        this.points = points;
        this.saveLine({ brushColor, brushRadius });
        return;
      }

      // Use timeout to draw
      for (let i = 1; i < points.length; i++) {
        curTime += timeoutGap;
        window.setTimeout(() => {
          this.drawPoints({
            points: points.slice(0, i + 1),
            brushColor,
            brushRadius
          });
        }, curTime);
      }

      curTime += timeoutGap;
      window.setTimeout(() => {
        // Save this line with its props instead of this.props
        this.points = points;
        this.saveLine({ brushColor, brushRadius });
      }, curTime);
    });
  };

  handleDrawStart = e => {
    e.preventDefault();

    // Start drawing
    this.isPressing = true;

    const { x, y } = this.getPointerPos(e);

    if (e.touches && e.touches.length > 0) {
      // on touch, set catenary position to touch pos
      this.lazy.update({ x, y }, { both: true });
    }

    // Ensure the initial down position gets added to our line
    this.handlePointerMove(x, y);
  };

  handleDrawMove = e => {
    e.preventDefault();

    const { x, y } = this.getPointerPos(e);
    this.handlePointerMove(x, y);
  };

  handleDrawEnd = e => {
    e.preventDefault();

    // Draw to this end pos
    this.handleDrawMove(e);

    // Stop drawing & save the drawn line
    this.isDrawing = false;
    this.isPressing = false;
    this.saveLine();
  };

  handleCanvasResize = (entries, observer) => {
    const saveData = this.getSaveData();
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      this.setCanvasSize(this.canvas.interface, width, height);
      this.setCanvasSize(this.canvas.drawing, width, height);
      this.setCanvasSize(this.canvas.temp, width, height);
      this.setCanvasSize(this.canvas.grid, width, height);

      this.drawImage()
      this.drawGrid(this.ctx.grid);
      this.loop({ once: true });
    }
    this.loadSaveData(saveData, true);
  };

  setCanvasSize = (canvas, width, height) => {
    if (width < this.props.canvasWidth || height < this.props.canvasHeight) {
      // return;
    }
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  };

  getPointerPos = e => {
    const rect = this.canvas.interface.getBoundingClientRect();

    // use cursor pos as default
    let clientX = e.clientX;
    let clientY = e.clientY;

    // use first touch if available
    if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    // return mouse/touch position inside canvas
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  handlePointerMove = (x, y) => {
    if (this.props.disabled) return;

    this.lazy.update({ x, y });
    const isDisabled = !this.lazy.isEnabled();

    // Add erase key to the first point in eraser lines
    const point = this.props.erase ? { ...this.lazy.brush.toObject(), erase: true } : this.lazy.brush.toObject();

    if (
      (this.isPressing && !this.isDrawing) ||
      (isDisabled && this.isPressing)
    ) {
      // Start drawing and add point
      this.isDrawing = true;
      this.points.push(point);
    }

    if (this.isDrawing) {
      // Add new point
      this.points.push(this.lazy.brush.toObject());

      // Draw current points
      this.drawPoints({
        points: this.points,
        brushColor: point.erase ? "erase" : this.props.brushColor,
        brushRadius: this.props.brushRadius
      });
    }

    this.mouseHasMoved = true;
  };

  drawPoints = ({ points, brushColor, brushRadius }) => {
    this.ctx.temp.lineJoin = "round";
    this.ctx.temp.lineCap = "round";
    this.ctx.temp.strokeStyle = brushColor === "erase" ? this.props.eraseColor : brushColor;
    this.ctx.drawing.globalCompositeOperation = brushColor === "erase" ? "destination-out" : "source-over";

    this.ctx.temp.clearRect(
      0,
      0,
      this.ctx.temp.canvas.width,
      this.ctx.temp.canvas.height
    );
    this.ctx.temp.lineWidth = brushRadius * 2;

    let p1 = points[0];
    let p2 = points[1];

    this.ctx.temp.moveTo(p2.x, p2.y);
    this.ctx.temp.beginPath();

    for (var i = 1, len = points.length; i < len; i++) {
      // we pick the point between pi+1 & pi+2 as the
      // end point and p1 as our control point
      var midPoint = midPointBtw(p1, p2);
      this.ctx.temp.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      p1 = points[i];
      p2 = points[i + 1];
    }
    // Draw last line as a straight line while
    // we wait for the next point to be able to calculate
    // the bezier control point
    this.ctx.temp.lineTo(p1.x, p1.y);
    this.ctx.temp.stroke();
  };

  saveLine = ({ brushColor, brushRadius } = {}) => {
    if (this.points.length < 2) return;

    if (this.points[0].erase) {
      brushColor = "erase";
    }

    // Save as new line
    this.lines.push({
      points: [...this.points],
      brushColor: brushColor || this.props.brushColor,
      brushRadius: brushRadius || this.props.brushRadius
    });

    // Reset points array
    this.points.length = 0;

    const width = this.canvas.temp.width;
    const height = this.canvas.temp.height;

    // Copy the line to the drawing canvas
    this.ctx.drawing.drawImage(this.canvas.temp, 0, 0, width, height);

    // Clear the temporary line-drawing canvas
    this.ctx.temp.clearRect(0, 0, width, height);

    this.triggerOnChange();
  };

  triggerOnChange = () => {
    this.props.onChange && this.props.onChange(this);
  };

  clear = () => {
    this.lines = [];
    this.valuesChanged = true;
    this.ctx.drawing.clearRect(
      0,
      0,
      this.canvas.drawing.width,
      this.canvas.drawing.height
    );
    this.ctx.temp.clearRect(
      0,
      0,
      this.canvas.temp.width,
      this.canvas.temp.height
    );
  };

  loop = ({ once = false } = {}) => {
    if (this.mouseHasMoved || this.valuesChanged) {
      const pointer = this.lazy.getPointerCoordinates();
      const brush = this.lazy.getBrushCoordinates();

      this.drawInterface(this.ctx.interface, pointer, brush);
      this.mouseHasMoved = false;
      this.valuesChanged = false;
    }

    if (!once) {
      window.requestAnimationFrame(() => {
        this.loop();
      });
    }
  };

  drawGrid = ctx => {
    if (this.props.hideGrid) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.beginPath();
    ctx.setLineDash([5, 1]);
    ctx.setLineDash([]);
    ctx.strokeStyle = this.props.gridColor;
    ctx.lineWidth = 0.5;

    const gridSize = 25;

    let countX = 0;
    while (countX < ctx.canvas.width) {
      countX += gridSize;
      ctx.moveTo(countX, 0);
      ctx.lineTo(countX, ctx.canvas.height);
    }
    ctx.stroke();

    let countY = 0;
    while (countY < ctx.canvas.height) {
      countY += gridSize;
      ctx.moveTo(0, countY);
      ctx.lineTo(ctx.canvas.width, countY);
    }
    ctx.stroke();
  };

  drawInterface = (ctx, pointer, brush) => {
    if (this.props.hideInterface) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Color brush preview according to erase prop
    const brushColor = this.props.erase ? this.props.eraseColor : this.props.brushColor;

    // Draw brush preview
    ctx.beginPath();
    ctx.fillStyle = brushColor;
    ctx.arc(brush.x, brush.y, this.props.brushRadius, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw mouse point (the one directly at the cursor)
    ctx.beginPath();
    ctx.fillStyle = this.props.catenaryColor;
    ctx.arc(pointer.x, pointer.y, 4, 0, Math.PI * 2, true);
    ctx.fill();

    // Draw catenary
    if (this.lazy.isEnabled()) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = this.props.catenaryColor;
      this.catenary.drawToCanvas(
        this.ctx.interface,
        brush,
        pointer,
        this.chainLength
      );
      ctx.stroke();
    }

    // Draw brush point (the one in the middle of the brush preview)
    ctx.beginPath();
    ctx.fillStyle = this.props.catenaryColor;
    ctx.arc(brush.x, brush.y, 2, 0, Math.PI * 2, true);
    ctx.fill();
  };

  render() {
    return (
      <div
        className={this.props.className}
        style={{
          display: "block",
          background: this.props.backgroundColor,
          touchAction: "none",
          width: this.props.canvasWidth,
          height: this.props.canvasHeight,
          ...this.props.style
        }}
        ref={container => {
          if (container) {
            this.canvasContainer = container;
          }
        }}
      >
        {canvasTypes.map(({ name, zIndex }) => {
          const isInterface = name === "interface";
          return (
            <canvas
              key={name}
              ref={canvas => {
                if (canvas) {
                  this.canvas[name] = canvas;
                  this.ctx[name] = canvas.getContext("2d");
                }
              }}
              style={{ ...canvasStyle, zIndex }}
              onMouseDown={isInterface ? this.handleDrawStart : undefined}
              onMouseMove={isInterface ? this.handleDrawMove : undefined}
              onMouseUp={isInterface ? this.handleDrawEnd : undefined}
              onMouseOut={isInterface ? this.handleDrawEnd : undefined}
              onTouchStart={isInterface ? this.handleDrawStart : undefined}
              onTouchMove={isInterface ? this.handleDrawMove : undefined}
              onTouchEnd={isInterface ? this.handleDrawEnd : undefined}
              onTouchCancel={isInterface ? this.handleDrawEnd : undefined}
            />
          );
        })}
      </div>
    );
  }
}
