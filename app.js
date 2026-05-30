/**
 * SSD1306 OLED C++ Code Generator - Core Engine
 * Handles image processing, dithering, GIF parsing, and C++ formatting.
 */

(function () {
  // DOM Elements
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-btn');
  const displayPreset = document.getElementById('display-preset');
  const customDimsWrapper = document.getElementById('custom-dims-wrapper');
  const targetWidthInput = document.getElementById('target-width');
  const targetHeightInput = document.getElementById('target-height');
  const scaleMode = document.getElementById('scale-mode');
  const invertColors = document.getElementById('invert-colors');
  const ditherAlgorithm = document.getElementById('dither-algorithm');
  const brightnessSlider = document.getElementById('brightness-slider');
  const brightnessVal = document.getElementById('brightness-val');
  const contrastSlider = document.getElementById('contrast-slider');
  const contrastVal = document.getElementById('contrast-val');
  const thresholdSlider = document.getElementById('threshold-slider');
  const thresholdVal = document.getElementById('threshold-val');
  const thresholdWrapper = document.getElementById('threshold-slider-wrapper');
  const sharpnessSlider = document.getElementById('contrast-sharpness');
  const sharpnessVal = document.getElementById('sharpness-val');
  const gifConfig = document.getElementById('gif-config');
  const gifDelayOverride = document.getElementById('gif-delay-override');
  const useOriginalDelay = document.getElementById('use-original-delay');
  
  // Video Elements
  const videoConfig = document.getElementById('video-config');
  const videoFpsSelect = document.getElementById('video-fps');
  const videoLimitInput = document.getElementById('video-limit');
  const videoStartInput = document.getElementById('video-start');
  const videoEndInput = document.getElementById('video-end');
  const extractVideoBtn = document.getElementById('extract-video-btn');
  const oledProgressLoader = document.getElementById('oled-progress-loader');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressText = document.getElementById('progress-text');
  
  const arrayNameInput = document.getElementById('array-name');
  
  const tabOled = document.getElementById('tab-oled');
  const tabComparison = document.getElementById('tab-comparison');
  const contentOled = document.getElementById('content-oled');
  const contentComparison = document.getElementById('content-comparison');
  
  const oledCanvas = document.getElementById('oled-canvas');
  const oledPlaceholder = document.getElementById('oled-placeholder');
  const playbackControls = document.getElementById('playback-controls');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevFrameBtn = document.getElementById('prev-frame-btn');
  const nextFrameBtn = document.getElementById('next-frame-btn');
  const frameScrubber = document.getElementById('frame-scrubber');
  const frameCounter = document.getElementById('frame-counter');
  const frameDelayLbl = document.getElementById('frame-delay-lbl');
  
  const sourcePreview = document.getElementById('source-preview');
  const sourcePlaceholder = document.getElementById('source-placeholder');
  const monoPreviewCanvas = document.getElementById('mono-preview-canvas');
  const cppCodeOutput = document.getElementById('cpp-code-output');
  const cppFilename = document.getElementById('cpp-filename');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const downloadCodeBtn = document.getElementById('download-code-btn');
  
  const compositeCanvas = document.getElementById('composite-canvas');
  const scaleCanvas = document.getElementById('scale-canvas');
  
  // App State
  let selectedFile = null;
  let isGif = false;
  let isVideo = false;
  let gifReader = null;
  let staticImage = null;
  let videoElement = null;
  
  // Composited original frames (full size of uploaded GIF/Image)
  let sourceFrames = []; // Array of { canvas, delay }
  
  // Processed frames ready for display/generation (target display size, dithered)
  let processedFrames = []; // Array of { binaryData: Uint8Array(0/255), width, height, delay }
  
  let currentFrameIndex = 0;
  let isPlaying = false;
  let playbackTimeout = null;

  // OLED Glow Theme Colors
  const OLED_ON_COLOR = { r: 0, g: 210, b: 255, a: 255 }; // Electric Cyan
  const OLED_OFF_COLOR = { r: 8, g: 12, b: 24, a: 255 };  // Dark Space Blue

  // Initialize
  initEvents();

  function initEvents() {
    // File inputs
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect();
      }
    });

    // Sidebar Parameter Changes
    displayPreset.addEventListener('change', () => {
      if (displayPreset.value === 'custom') {
        customDimsWrapper.style.display = 'flex';
      } else {
        customDimsWrapper.style.display = 'none';
        const [w, h] = displayPreset.value.split('x').map(Number);
        targetWidthInput.value = w;
        targetHeightInput.value = h;
      }
      processAndRender();
    });
    
    [targetWidthInput, targetHeightInput].forEach(input => {
      input.addEventListener('change', () => {
        // Enforce multiples of 8 for SSD1306 layouts
        let val = Number(input.value);
        val = Math.max(8, Math.round(val / 8) * 8);
        input.value = val;
        processAndRender();
      });
    });

    scaleMode.addEventListener('change', processAndRender);
    invertColors.addEventListener('change', processAndRender);
    
    ditherAlgorithm.addEventListener('change', () => {
      // Hide/Show threshold slider depending on algorithm
      if (ditherAlgorithm.value === 'threshold' || ditherAlgorithm.value.startsWith('bayer')) {
        thresholdWrapper.style.display = 'flex';
      } else {
        thresholdWrapper.style.display = 'none';
      }
      processAndRender();
    });

    // Sliders
    brightnessSlider.addEventListener('input', () => {
      brightnessVal.textContent = (brightnessSlider.value > 0 ? '+' : '') + brightnessSlider.value;
      processAndRenderDebounced();
    });
    
    contrastSlider.addEventListener('input', () => {
      contrastVal.textContent = (contrastSlider.value > 0 ? '+' : '') + contrastSlider.value;
      processAndRenderDebounced();
    });
    
    thresholdSlider.addEventListener('input', () => {
      thresholdVal.textContent = thresholdSlider.value;
      processAndRenderDebounced();
    });

    sharpnessSlider.addEventListener('input', () => {
      sharpnessVal.textContent = sharpnessSlider.value + '%';
      processAndRenderDebounced();
    });

    gifDelayOverride.addEventListener('input', () => {
      if (!useOriginalDelay.checked) {
        processAndRenderDebounced();
      }
    });

    useOriginalDelay.addEventListener('change', () => {
      gifDelayOverride.disabled = useOriginalDelay.checked;
      processAndRender();
    });

    arrayNameInput.addEventListener('input', () => {
      // Sanitize variable names (replace invalid chars)
      arrayNameInput.value = arrayNameInput.value.replace(/[^a-zA-Z0-9_]/g, '');
      generateCode();
    });

    // Tab Switching
    tabOled.addEventListener('click', () => switchTab('oled'));
    tabComparison.addEventListener('click', () => switchTab('comparison'));

    // Playback control actions
    playPauseBtn.addEventListener('click', togglePlayback);
    prevFrameBtn.addEventListener('click', () => stepFrame(-1));
    nextFrameBtn.addEventListener('click', () => stepFrame(1));
    frameScrubber.addEventListener('input', () => {
      showFrame(Number(frameScrubber.value));
    });

    // Code actions
    copyCodeBtn.addEventListener('click', copyCodeToClipboard);
    downloadCodeBtn.addEventListener('click', downloadHeaderFile);
    
    // Video actions
    extractVideoBtn.addEventListener('click', extractVideoFrames);
  }

  // Debouncing for slider adjustments to ensure high performance
  let debounceTimeout = null;
  function processAndRenderDebounced() {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(processAndRender, 40);
  }

  function switchTab(tab) {
    if (tab === 'oled') {
      tabOled.classList.add('active');
      tabComparison.classList.remove('active');
      contentOled.classList.add('active');
      contentComparison.classList.remove('active');
    } else {
      tabOled.classList.remove('active');
      tabComparison.classList.add('active');
      contentOled.classList.remove('active');
      contentComparison.classList.add('active');
    }
  }

  /* ==========================================
     FILE LOADING & INITIAL COMPOSITION
     ========================================== */
  function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;

    selectedFile = file;
    stopPlayback();
    
    // Reset state
    sourceFrames = [];
    processedFrames = [];
    currentFrameIndex = 0;
    isGif = false;
    isVideo = false;
    
    // Hide progress loader overlay
    oledProgressLoader.style.display = 'none';

    if (videoElement) {
      videoElement.src = '';
      videoElement = null;
    }

    if (file.type.startsWith('video/')) {
      isVideo = true;
      gifConfig.style.display = 'none';
      videoConfig.style.display = 'block';
      playbackControls.classList.add('disabled');

      // Display loader status
      oledPlaceholder.querySelector('span').textContent = 'VIDEO CONNECTED';
      oledPlaceholder.querySelector('small').textContent = 'Specify segment settings and click "Process Video Segment"';
      oledPlaceholder.style.display = 'flex';
      oledCanvas.style.display = 'none';

      // Load video metadata
      const url = URL.createObjectURL(file);
      videoElement = document.createElement('video');
      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.preload = 'auto';

      videoElement.onloadedmetadata = function () {
        const duration = videoElement.duration;
        videoStartInput.value = '0';
        videoStartInput.max = duration.toFixed(1);
        videoEndInput.value = Math.min(5, duration).toFixed(1);
        videoEndInput.max = duration.toFixed(1);
        
        // Seek to start frame
        videoElement.currentTime = 0;
      };

      videoElement.onseeked = function () {
        // Draw the seeked frame as comparison preview
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0);
        
        sourcePreview.src = canvas.toDataURL();
        sourcePreview.style.display = 'block';
        sourcePlaceholder.style.display = 'none';
        
        // Remove this temporary handler
        videoElement.onseeked = null;
      };

      videoElement.src = url;
      return;
    }

    // Default: Image or GIF
    gifConfig.style.display = 'block';
    videoConfig.style.display = 'none';

    // Display loader
    oledPlaceholder.querySelector('span').textContent = 'DECODING FILE...';
    oledPlaceholder.querySelector('small').textContent = 'Please wait while we parse frame structures';
    oledPlaceholder.style.display = 'flex';
    oledCanvas.style.display = 'none';

    const reader = new FileReader();
    reader.onload = function (e) {
      const buffer = e.target.result;
      const uint8 = new Uint8Array(buffer);
      
      // Magic bytes check for GIF: "GIF" in ASCII is 0x47 0x49 0x46
      isGif = uint8[0] === 0x47 && uint8[1] === 0x49 && uint8[2] === 0x46;

      if (isGif) {
        gifConfig.style.opacity = '1';
        gifConfig.style.pointerEvents = 'auto';
        playbackControls.classList.remove('disabled');
        
        try {
          gifReader = new window.GifReader(uint8);
          compositeGifFrames();
        } catch (err) {
          alert('Error parsing GIF file: ' + err.message);
          resetUI();
        }
      } else {
        gifConfig.style.opacity = '0.5';
        gifConfig.style.pointerEvents = 'none';
        playbackControls.classList.add('disabled');
        
        // Static Image
        const blob = new Blob([buffer]);
        const url = URL.createObjectURL(blob);
        
        staticImage = new Image();
        staticImage.onload = function () {
          // Draw image to standard canvas for cropping/fitting
          const canvas = document.createElement('canvas');
          canvas.width = staticImage.width;
          canvas.height = staticImage.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(staticImage, 0, 0);
          
          sourceFrames.push({
            canvas: canvas,
            delay: 100 // dummy delay
          });
          
          // Set source preview for comparison tab
          sourcePreview.src = url;
          sourcePreview.style.display = 'block';
          sourcePlaceholder.style.display = 'none';
          
          processAndRender();
        };
        staticImage.src = url;
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function resetUI() {
    oledPlaceholder.querySelector('span').textContent = 'OLED DISPLAY OFFLINE';
    oledPlaceholder.querySelector('small').textContent = 'Please upload an image, GIF, or video to start emulator';
    oledPlaceholder.style.display = 'flex';
    oledCanvas.style.display = 'none';
    playbackControls.classList.add('disabled');
    sourcePreview.style.display = 'none';
    sourcePlaceholder.style.display = 'flex';
    oledProgressLoader.style.display = 'none';
  }

  /**
   * GIF frames are often encoded as transparency patches offset from the top-left.
   * To get the actual frames, we sequentialize the patches on a persistent canvas
   * respecting GIF disposal methods (0, 1, 2, 3).
   */
  function compositeGifFrames() {
    const w = gifReader.width;
    const h = gifReader.height;
    
    compositeCanvas.width = w;
    compositeCanvas.height = h;
    const compCtx = compositeCanvas.getContext('2d');
    compCtx.clearRect(0, 0, w, h);

    const numFrames = gifReader.numFrames();
    
    // Keep a buffer of the previous canvas state for disposal mode 3 (restore previous)
    let previousStateCanvas = document.createElement('canvas');
    previousStateCanvas.width = w;
    previousStateCanvas.height = h;
    const prevCtx = previousStateCanvas.getContext('2d');

    // Create an offscreen canvas to put frame patches
    const patchCanvas = document.createElement('canvas');
    const patchCtx = patchCanvas.getContext('2d');

    for (let i = 0; i < numFrames; i++) {
      const info = gifReader.frameInfo(i);
      
      // Backup state if disposal is 3 (restore to previous)
      if (info.disposal === 3) {
        prevCtx.clearRect(0, 0, w, h);
        prevCtx.drawImage(compositeCanvas, 0, 0);
      }

      // Decode frame pixels RGBA
      const patchData = compCtx.createImageData(info.width, info.height);
      gifReader.decodeAndBlitFrameRGBA(i, patchData.data);
      
      // Draw patch onto patchCanvas
      patchCanvas.width = info.width;
      patchCanvas.height = info.height;
      patchCtx.putImageData(patchData, 0, 0);
      
      // Draw patchCanvas on top of compositeCanvas (preserves alpha blending)
      compCtx.drawImage(patchCanvas, info.x, info.y);

      // Save a snapshot of the fully composited frame
      const frameSnapshot = document.createElement('canvas');
      frameSnapshot.width = w;
      frameSnapshot.height = h;
      const snapCtx = frameSnapshot.getContext('2d');
      snapCtx.drawImage(compositeCanvas, 0, 0);

      sourceFrames.push({
        canvas: frameSnapshot,
        delay: info.delay * 10 // GIF delay is in hundredths of a second
      });

      // Handle Disposal after drawing snapshot
      if (info.disposal === 2) {
        // Restore to background (clear the patch region)
        compCtx.clearRect(info.x, info.y, info.width, info.height);
      } else if (info.disposal === 3) {
        // Restore to previous canvas state
        compCtx.clearRect(0, 0, w, h);
        compCtx.drawImage(previousStateCanvas, 0, 0);
      }
    }

    // Set first frame as source preview in comparison tab
    sourcePreview.src = sourceFrames[0].canvas.toDataURL();
    sourcePreview.style.display = 'block';
    sourcePlaceholder.style.display = 'none';

    processAndRender();
  }

  async function extractVideoFrames() {
    if (!videoElement) return;

    const startTime = parseFloat(videoStartInput.value) || 0;
    const endTime = parseFloat(videoEndInput.value) || videoElement.duration;
    const fps = parseInt(videoFpsSelect.value) || 10;
    const limit = parseInt(videoLimitInput.value) || 150;

    if (startTime < 0 || endTime <= startTime) {
      alert("Invalid start or end time.");
      return;
    }

    // Reset frames and state
    sourceFrames = [];
    processedFrames = [];
    currentFrameIndex = 0;
    stopPlayback();

    // Setup visual progress
    oledPlaceholder.style.display = 'none';
    oledCanvas.style.display = 'none';
    oledProgressLoader.style.display = 'flex';
    progressBarFill.style.width = '0%';
    progressText.textContent = '0%';

    // Disable extract button
    extractVideoBtn.disabled = true;
    const originalText = extractVideoBtn.textContent;
    extractVideoBtn.textContent = '⚙️ Processing Video...';

    const duration = endTime - startTime;
    const timeStep = 1 / fps;
    const estimatedFrames = Math.min(limit, Math.ceil(duration / timeStep) + 1);

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');

    const seekToTime = (time) => {
      return new Promise((resolve, reject) => {
        const onSeeked = () => {
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          resolve();
        };
        const onError = (e) => {
          videoElement.removeEventListener('seeked', onSeeked);
          videoElement.removeEventListener('error', onError);
          reject(e);
        };
        videoElement.addEventListener('seeked', onSeeked);
        videoElement.addEventListener('error', onError);
        videoElement.currentTime = time;
      });
    };

    let currentTime = startTime;
    let framesProcessed = 0;

    try {
      while (currentTime <= endTime && framesProcessed < limit) {
        await seekToTime(currentTime);

        // Capture canvas frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = canvas.width;
        frameCanvas.height = canvas.height;
        const frameCtx = frameCanvas.getContext('2d');
        frameCtx.drawImage(canvas, 0, 0);

        sourceFrames.push({
          canvas: frameCanvas,
          delay: Math.round(1000 / fps)
        });

        framesProcessed++;
        const percent = Math.round((framesProcessed / estimatedFrames) * 100);
        progressBarFill.style.width = `${Math.min(100, percent)}%`;
        progressText.textContent = `${Math.min(100, percent)}%`;

        currentTime += timeStep;
      }
    } catch (err) {
      console.error('Error during video extraction: ', err);
      alert('Failed to extract video frames: ' + err.message);
    } finally {
      extractVideoBtn.disabled = false;
      extractVideoBtn.textContent = originalText;
      oledProgressLoader.style.display = 'none';
    }

    if (sourceFrames.length > 0) {
      // Set preview frame (first frame)
      sourcePreview.src = sourceFrames[0].canvas.toDataURL();
      sourcePreview.style.display = 'block';
      sourcePlaceholder.style.display = 'none';

      oledCanvas.style.display = 'block';
      oledPlaceholder.style.display = 'none';
      playbackControls.classList.remove('disabled');

      processAndRender();
    } else {
      resetUI();
    }
  }

  /* ==========================================
     IMAGE RESIZING & MONOCHROMATIC CONVERSION
     ========================================== */
  function processAndRender() {
    if (sourceFrames.length === 0) return;

    const targetW = Number(targetWidthInput.value);
    const targetH = Number(targetHeightInput.value);
    
    const brightness = Number(brightnessSlider.value);
    const contrast = Number(contrastSlider.value);
    const threshold = Number(thresholdSlider.value);
    const sharpness = Number(sharpnessSlider.value) / 100;
    const invert = invertColors.checked;
    const ditherAlgo = ditherAlgorithm.value;

    processedFrames = [];

    // Scale canvas setup
    scaleCanvas.width = targetW;
    scaleCanvas.height = targetH;
    const sCtx = scaleCanvas.getContext('2d');

    for (let f = 0; f < sourceFrames.length; f++) {
      const srcFrame = sourceFrames[f];
      sCtx.fillStyle = '#000000';
      sCtx.fillRect(0, 0, targetW, targetH);

      const mode = scaleMode.value;
      const sw = srcFrame.canvas.width;
      const sh = srcFrame.canvas.height;

      if (mode === 'stretch') {
        sCtx.drawImage(srcFrame.canvas, 0, 0, targetW, targetH);
      } else {
        const aspectSrc = sw / sh;
        const aspectDest = targetW / targetH;
        
        let dx, dy, dw, dh;
        
        if (mode === 'fit') {
          if (aspectSrc > aspectDest) {
            dw = targetW;
            dh = targetW / aspectSrc;
            dx = 0;
            dy = (targetH - dh) / 2;
          } else {
            dh = targetH;
            dw = targetH * aspectSrc;
            dx = (targetW - dw) / 2;
            dy = 0;
          }
        } else { // crop
          if (aspectSrc > aspectDest) {
            dh = targetH;
            dw = targetH * aspectSrc;
            dx = (targetW - dw) / 2;
            dy = 0;
          } else {
            dw = targetW;
            dh = targetW / aspectSrc;
            dx = 0;
            dy = (targetH - dh) / 2;
          }
        }
        sCtx.drawImage(srcFrame.canvas, dx, dy, dw, dh);
      }

      // Apply Filter adjustments
      const imgData = sCtx.getImageData(0, 0, targetW, targetH);
      const d = imgData.data;

      // 1. Grayscale, Brightness and Contrast
      const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        
        // Grayscale conversion
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Brightness
        gray += brightness;
        
        // Contrast
        gray = (gray - 128) * contrastFactor + 128;
        
        // Clamp and re-write to RGB
        const clampedVal = clamp(gray);
        d[i] = d[i + 1] = d[i + 2] = clampedVal;
      }

      // 2. Sharpness Filter (Laplacian High-Pass convolution)
      if (sharpness > 0) {
        applySharpenFilter(imgData, targetW, targetH, sharpness);
      }

      // 3. Dithering
      applyDithering(imgData, targetW, targetH, ditherAlgo, threshold);

      // Save processed frame binary mapping (0 for Black, 255 for White)
      const binaryMap = new Uint8Array(targetW * targetH);
      for (let i = 0; i < d.length; i += 4) {
        binaryMap[i / 4] = d[i] === 255 ? 255 : 0;
      }

      // Determine Frame Delay
      let delay = srcFrame.delay;
      if (!useOriginalDelay.checked) {
        delay = Number(gifDelayOverride.value);
      }

      processedFrames.push({
        binaryMap: binaryMap,
        width: targetW,
        height: targetH,
        delay: delay
      });
    }

    // Set scrubber attributes
    if (isGif || isVideo) {
      frameScrubber.max = processedFrames.length - 1;
      frameCounter.textContent = `1 / ${processedFrames.length}`;
    } else {
      frameScrubber.max = 0;
      frameCounter.textContent = `1 / 1`;
    }

    // Hide placeholder, display main OLED preview canvas
    oledPlaceholder.style.display = 'none';
    oledCanvas.style.display = 'block';

    // Show current frame on the emulator screen
    showFrame(currentFrameIndex);

    // Auto-play GIF after loading
    if ((isGif || isVideo) && !isPlaying) {
      startPlayback();
    }

    // Output code structures
    generateCode();
  }

  function clamp(val) {
    return Math.min(255, Math.max(0, val));
  }

  /* ==========================================
     SHARPNESS & CONVOLUTION FILTERS
     ========================================== */
  function applySharpenFilter(pixels, w, h, mix) {
    const src = pixels.data;
    const output = new Uint8ClampedArray(src.length);
    
    // Laplacian 3x3 kernel:
    //  0  -1   0
    // -1   5  -1
    //  0  -1   0
    const weights = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dstOff = (y * w + x) * 4;
        let sum = 0;
        
        for (let cy = 0; cy < 3; cy++) {
          for (let cx = 0; cx < 3; cx++) {
            const scy = clampRange(y + cy - 1, 0, h - 1);
            const scx = clampRange(x + cx - 1, 0, w - 1);
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * 3 + cx];
            sum += src[srcOff] * wt;
          }
        }
        
        const origVal = src[dstOff];
        output[dstOff] = output[dstOff + 1] = output[dstOff + 2] = clamp(origVal + (sum - origVal) * mix);
        output[dstOff + 3] = src[dstOff + 3];
      }
    }
    
    // Write back to pixels array
    for (let i = 0; i < src.length; i++) {
      src[i] = output[i];
    }
  }

  function clampRange(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /* ==========================================
     DITHERING ENGINE
     ========================================== */
  function applyDithering(imgData, w, h, algorithm, threshold) {
    const d = imgData.data;

    switch (algorithm) {
      case 'floyd-steinberg':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 7 / 16 },
          { dx: -1, dy: 1, w: 3 / 16 },
          { dx: 0, dy: 1, w: 5 / 16 },
          { dx: 1, dy: 1, w: 1 / 16 }
        ]);
        break;
        
      case 'atkinson':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 1 / 8 },
          { dx: 2, dy: 0, w: 1 / 8 },
          { dx: -1, dy: 1, w: 1 / 8 },
          { dx: 0, dy: 1, w: 1 / 8 },
          { dx: 1, dy: 1, w: 1 / 8 },
          { dx: 0, dy: 2, w: 1 / 8 }
        ]);
        break;

      case 'stucki':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 8 / 42 },
          { dx: 2, dy: 0, w: 4 / 42 },
          { dx: -2, dy: 1, w: 2 / 42 },
          { dx: -1, dy: 1, w: 4 / 42 },
          { dx: 0, dy: 1, w: 8 / 42 },
          { dx: 1, dy: 1, w: 4 / 42 },
          { dx: 2, dy: 1, w: 2 / 42 },
          { dx: -2, dy: 2, w: 1 / 42 },
          { dx: -1, dy: 2, w: 2 / 42 },
          { dx: 0, dy: 2, w: 4 / 42 },
          { dx: 1, dy: 2, w: 2 / 42 },
          { dx: 2, dy: 2, w: 1 / 42 }
        ]);
        break;

      case 'burkes':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 8 / 32 },
          { dx: 2, dy: 0, w: 4 / 32 },
          { dx: -2, dy: 1, w: 2 / 32 },
          { dx: -1, dy: 1, w: 4 / 32 },
          { dx: 0, dy: 1, w: 8 / 32 },
          { dx: 1, dy: 1, w: 4 / 32 },
          { dx: 2, dy: 1, w: 2 / 32 }
        ]);
        break;

      case 'sierra-3':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 5 / 32 },
          { dx: 2, dy: 0, w: 3 / 32 },
          { dx: -2, dy: 1, w: 2 / 32 },
          { dx: -1, dy: 1, w: 4 / 32 },
          { dx: 0, dy: 1, w: 5 / 32 },
          { dx: 1, dy: 1, w: 4 / 32 },
          { dx: 2, dy: 1, w: 2 / 32 },
          { dx: -1, dy: 2, w: 2 / 32 },
          { dx: 0, dy: 2, w: 3 / 32 },
          { dx: 1, dy: 2, w: 2 / 32 }
        ]);
        break;

      case 'sierra-2':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 4 / 16 },
          { dx: 2, dy: 0, w: 3 / 16 },
          { dx: -2, dy: 1, w: 1 / 16 },
          { dx: -1, dy: 1, w: 2 / 16 },
          { dx: 0, dy: 1, w: 3 / 16 },
          { dx: 1, dy: 1, w: 2 / 16 },
          { dx: 2, dy: 1, w: 1 / 16 }
        ]);
        break;

      case 'sierra-lite':
        ditherErrorDiffusion(d, w, h, threshold, [
          { dx: 1, dy: 0, w: 2 / 4 },
          { dx: -1, dy: 1, w: 1 / 4 },
          { dx: 0, dy: 1, w: 1 / 4 }
        ]);
        break;
        
      case 'bayer-4x4':
        ditherOrderedBayer(d, w, h, threshold, [
          [ 0,  8,  2, 10],
          [12,  4, 14,  6],
          [ 3, 11,  1,  9],
          [15,  7, 13,  5]
        ], 16);
        break;
        
      case 'bayer-8x8':
        ditherOrderedBayer(d, w, h, threshold, [
          [ 0, 48, 12, 60,  3, 51, 15, 63],
          [32, 16, 44, 28, 35, 19, 47, 31],
          [ 8, 56,  4, 52, 11, 59,  7, 55],
          [40, 24, 36, 20, 43, 27, 39, 23],
          [ 2, 50, 14, 62,  1, 49, 13, 61],
          [34, 18, 46, 30, 33, 17, 45, 29],
          [10, 58,  6, 54,  9, 57,  5, 53],
          [42, 26, 38, 22, 41, 25, 37, 21]
        ], 64);
        break;
        
      case 'threshold':
      default:
        for (let i = 0; i < d.length; i += 4) {
          const val = d[i];
          const bVal = val >= threshold ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = bVal;
        }
        break;
    }
  }

  /**
   * Generic error diffusion routine
   */
  function ditherErrorDiffusion(data, w, h, threshold, matrix) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const oldVal = data[idx];
        const newVal = oldVal >= threshold ? 255 : 0;
        
        data[idx] = data[idx + 1] = data[idx + 2] = newVal;
        const err = oldVal - newVal;

        // Distribute error
        for (let m = 0; m < matrix.length; m++) {
          const nx = x + matrix[m].dx;
          const ny = y + matrix[m].dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const nidx = (ny * w + nx) * 4;
            data[nidx] = clamp(data[nidx] + err * matrix[m].w);
          }
        }
      }
    }
  }

  /**
   * Generic Bayer ordered dithering
   */
  function ditherOrderedBayer(data, w, h, userThreshold, matrix, size) {
    const scale = 255 / size;
    const bias = userThreshold - 128; // Adjust matrix limits dynamically

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const val = data[idx];
        
        const mRow = y % matrix.length;
        const mCol = x % matrix[0].length;
        const limit = (matrix[mRow][mCol] + 0.5) * scale + bias;
        
        const bVal = val >= limit ? 255 : 0;
        data[idx] = data[idx + 1] = data[idx + 2] = bVal;
      }
    }
  }

  /* ==========================================
     EMULATOR PLAYBACK & FRAME PREVIEWS
     ========================================== */
  function showFrame(index) {
    if (processedFrames.length === 0 || index >= processedFrames.length) return;
    
    currentFrameIndex = index;
    const frame = processedFrames[index];
    
    // Draw OLED Simulated glow screen
    drawOledSimulatedScreen(frame);

    // Draw standard comparison screen in Tab 2
    drawMonoComparisonScreen(frame);

    // Update scrubber controls
    frameScrubber.value = index;
    frameCounter.textContent = `${index + 1} / ${processedFrames.length}`;
    frameDelayLbl.textContent = `${frame.delay} ms`;
  }

  function drawOledSimulatedScreen(frame) {
    const w = frame.width;
    const h = frame.height;
    
    // Size the canvas to targets
    oledCanvas.width = w;
    oledCanvas.height = h;
    const ctx = oledCanvas.getContext('2d');
    
    const oledImgData = ctx.createImageData(w, h);
    const od = oledImgData.data;
    
    for (let i = 0; i < frame.binaryMap.length; i++) {
      const isPixelOn = frame.binaryMap[i] === 255;
      
      const odIdx = i * 4;
      
      // Determine colors based on pixel state (Simulated blue OLED pixel glow)
      if (isPixelOn) {
        od[odIdx] = OLED_ON_COLOR.r;
        od[odIdx + 1] = OLED_ON_COLOR.g;
        od[odIdx + 2] = OLED_ON_COLOR.b;
        od[odIdx + 3] = OLED_ON_COLOR.a;
      } else {
        od[odIdx] = OLED_OFF_COLOR.r;
        od[odIdx + 1] = OLED_OFF_COLOR.g;
        od[odIdx + 2] = OLED_OFF_COLOR.b;
        od[odIdx + 3] = OLED_OFF_COLOR.a;
      }
    }
    
    ctx.putImageData(oledImgData, 0, 0);
  }

  function drawMonoComparisonScreen(frame) {
    const w = frame.width;
    const h = frame.height;
    
    monoPreviewCanvas.width = w;
    monoPreviewCanvas.height = h;
    const ctx = monoPreviewCanvas.getContext('2d');
    
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;
    
    for (let i = 0; i < frame.binaryMap.length; i++) {
      const val = frame.binaryMap[i]; // 0 or 255
      const idx = i * 4;
      d[idx] = d[idx + 1] = d[idx + 2] = val;
      d[idx + 3] = 255; // Alpha
    }
    
    ctx.putImageData(imgData, 0, 0);
  }

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    if (processedFrames.length <= 1) return;
    isPlaying = true;
    playPauseBtn.textContent = '⏸️';
    runAnimationLoop();
  }

  function stopPlayback() {
    isPlaying = false;
    playPauseBtn.textContent = '▶️';
    clearTimeout(playbackTimeout);
  }

  function runAnimationLoop() {
    if (!isPlaying) return;
    
    const frame = processedFrames[currentFrameIndex];
    showFrame(currentFrameIndex);

    // Queue next frame
    currentFrameIndex = (currentFrameIndex + 1) % processedFrames.length;
    playbackTimeout = setTimeout(runAnimationLoop, frame.delay);
  }

  function stepFrame(dir) {
    stopPlayback();
    if (processedFrames.length === 0) return;
    
    let targetIndex = currentFrameIndex + dir;
    if (targetIndex < 0) targetIndex = processedFrames.length - 1;
    if (targetIndex >= processedFrames.length) targetIndex = 0;
    
    showFrame(targetIndex);
  }

  /* ==========================================
     C++ CODE GENERATION SKETCHES
     ========================================== */
  function generateCode() {
    if (processedFrames.length === 0) return;
    
    const prefix = arrayNameInput.value.trim() || 'epd_bitmap';
    const targetW = Number(targetWidthInput.value);
    const targetH = Number(targetHeightInput.value);
    const invert = invertColors.checked;
    const totalFrames = processedFrames.length;

    let code = `// SSD1306 OLED Frame Buffers - Monochromatic Bitmaps\n`;
    code += `// Target Display: ${targetW}x${targetH} pixels\n`;
    code += `// Total Animation Frames: ${totalFrames}\n`;
    code += `// Generated on: ${new Date().toLocaleString()}\n`;
    code += `// Inverted: ${invert ? 'Yes (Black is ON, White is OFF)' : 'No (White is ON, Black is OFF)'}\n\n`;
    
    code += `#ifndef ANIMATION_FRAMES_H\n`;
    code += `#define ANIMATION_FRAMES_H\n\n`;
    
    if (typeof window !== 'undefined') {
      code += `#include <Arduino.h>\n`;
    }
    
    // Add PROGMEM definition header
    code += `#ifdef __AVR__\n`;
    code += `  #include <avr/pgmspace.h>\n`;
    code += `#elif defined(ESP8266) || defined(ESP32)\n`;
    code += `  #define PROGMEM\n`; // ESP devices ignore PROGMEM or define it empty
    code += `#endif\n\n`;

    const bytesPerRow = targetW / 8;

    // Generate each frame's array
    for (let f = 0; f < totalFrames; f++) {
      const frame = processedFrames[f];
      const binaryMap = frame.binaryMap;
      
      const frameName = `${prefix}_frame_${String(f).padStart(3, '0')}_delay_${frame.delay}`;
      code += `// '${frameName}', ${targetW}x${targetH}px\n`;
      code += `const unsigned char ${frameName}[] PROGMEM = {\n`;

      let lineBytes = [];
      for (let y = 0; y < targetH; y++) {
        let rowLine = '\t';
        for (let bIdx = 0; bIdx < bytesPerRow; bIdx++) {
          let byteVal = 0;
          for (let bit = 0; bit < 8; bit++) {
            const x = bIdx * 8 + bit;
            const pIdx = y * targetW + x;
            
            // Extract monochrome pixel (0/255)
            const isWhite = binaryMap[pIdx] === 255;
            
            // Map to bit values based on color inversion settings
            let isBitSet = 0;
            if (invert) {
              isBitSet = isWhite ? 0 : 1; // Black is ON, White is OFF
            } else {
              isBitSet = isWhite ? 1 : 0; // White is ON, Black is OFF
            }
            
            if (isBitSet) {
              byteVal |= (1 << (7 - bit));
            }
          }
          rowLine += '0x' + String(byteVal.toString(16)).padStart(2, '0').toLowerCase() + ', ';
        }
        
        // Remove trailing space and format row
        rowLine = rowLine.trimEnd();
        if (y === targetH - 1) {
          rowLine = rowLine.substring(0, rowLine.length - 1); // remove last comma
        }
        code += rowLine + '\n';
      }
      
      code += `};\n\n`;
    }

    // Generate Array Pointer table
    code += `// Pointer array wrapping all animation frames\n`;
    code += `const unsigned char* ${prefix}_allArray[${totalFrames}] = {\n`;
    for (let f = 0; f < totalFrames; f++) {
      const frame = processedFrames[f];
      const frameName = `${prefix}_frame_${String(f).padStart(3, '0')}_delay_${frame.delay}`;
      code += `\t${frameName}${f === totalFrames - 1 ? '' : ','}\n`;
    }
    code += `};\n\n`;

    // Convenience sketch templates for Arduino
    code += `/* =========================================================================\n`;
    code += `   Arduino SSD1306 Display Helper Template sketch\n`;
    code += `   =========================================================================\n`;
    code += `   #include <Wire.h>\n`;
    code += `   #include <Adafruit_GFX.h>\n`;
    code += `   #include <Adafruit_SSD1306.h>\n\n`;
    code += `   #define SCREEN_WIDTH ${targetW}\n`;
    code += `   #define SCREEN_HEIGHT ${targetH}\n`;
    code += `   #define OLED_RESET -1\n`;
    code += `   #define SCREEN_ADDRESS 0x3C\n\n`;
    code += `   Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);\n\n`;
    code += `   void setup() {\n`;
    code += `     Wire.begin(20, 21); // Set pins relative to ESP32-C3\n`;
    code += `     if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) { for(;;); }\n`;
    code += `     display.clearDisplay();\n`;
    code += `     display.display();\n`;
    code += `   }\n\n`;
    code += `   void loop() {\n`;
    code += `     // Iterate through all frames and print\n`;
    code += `     for(int i = 0; i < ${totalFrames}; i++) {\n`;
    code += `       display.clearDisplay();\n`;
    code += `       display.drawBitmap(0, 0, ${prefix}_allArray[i], SCREEN_WIDTH, SCREEN_HEIGHT, 1);\n`;
    code += `       display.display();\n`;
    code += `       delay(${processedFrames[0].delay}); // Animation delay in ms\n`;
    code += `     }\n`;
    code += `   }\n`;
    code += `   ========================================================================= */\n\n`;

    code += `#endif // ANIMATION_FRAMES_H\n`;

    // Render highlighted C++ onto screen
    cppCodeOutput.innerHTML = highlightCpp(code);

    // Update filename display
    cppFilename.textContent = `animation_frames.h`;
  }

  /**
   * Custom syntax highlighter for Arduino / C++ code
   */
  function highlightCpp(code) {
    // Escape HTML tags
    let html = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Regex highlighting maps
    html = html.replace(/(\/\/.*)/g, '<span class="cpp-comment">$1</span>');
    html = html.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="cpp-comment">$1</span>');
    html = html.replace(/(#[a-zA-Z_]+)/g, '<span class="cpp-directive">$1</span>');
    
    // C++ keywords
    const keywords = ['const', 'unsigned', 'char', 'PROGMEM', 'ifndef', 'define', 'endif', 'ifdef', 'elif', 'include', 'void', 'int', 'for', 'delay', 'setup', 'loop', 'if', 'else', 'return'];
    keywords.forEach(keyword => {
      const reg = new RegExp(`\\b(${keyword})\\b`, 'g');
      html = html.replace(reg, '<span class="cpp-keyword">$1</span>');
    });

    // Numbers (Hex and Decimal)
    html = html.replace(/\b(0x[0-9a-fA-F]+)\b/g, '<span class="cpp-number">$1</span>');
    html = html.replace(/\b([0-9]+)\b/g, '<span class="cpp-number">$1</span>');
    
    // Braces & Symbols
    html = html.replace(/([\{\}\[\]\(\)])/g, '<span class="cpp-literal">$1</span>');

    return html;
  }

  /* ==========================================
     CLIPBOARD & EXPORT BUTTON HANDLERS
     ========================================== */
  function copyCodeToClipboard() {
    if (processedFrames.length === 0) return;

    // Get unhighlighted text content from the output code container
    const rawText = cppCodeOutput.textContent;

    navigator.clipboard.writeText(rawText).then(() => {
      const originalText = copyCodeBtn.textContent;
      copyCodeBtn.textContent = '✅ Copied!';
      copyCodeBtn.classList.add('btn-primary');
      setTimeout(() => {
        copyCodeBtn.textContent = originalText;
        copyCodeBtn.classList.remove('btn-primary');
      }, 1500);
    }).catch(err => {
      alert('Failed to copy code: ' + err);
    });
  }

  function downloadHeaderFile() {
    if (processedFrames.length === 0) return;

    const rawText = cppCodeOutput.textContent;
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'animation_frames.h';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

})();
