import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Paper,
  Typography,
  IconButton,
  Button,
  Divider,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  AppBar,
  Toolbar,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import PanoramaFishEyeIcon from '@mui/icons-material/PanoramaFishEye';
import RemoveIcon from '@mui/icons-material/Remove';
import ImageIcon from '@mui/icons-material/Image';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BringToFrontIcon from '@mui/icons-material/FlipToFront';
import SendToBackIcon from '@mui/icons-material/FlipToBack';
import ViewSidebarIcon from '@mui/icons-material/ViewSidebar';
import TuneIcon from '@mui/icons-material/Tune';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import FitScreenIcon from '@mui/icons-material/FitScreen';

import * as FabricNS from 'fabric';
import InputModal from '../../components/InputModal';

// Normalize fabric import to support different bundling styles (ESM/CJS)
const fabric = (FabricNS && (FabricNS.fabric || FabricNS.default)) ? (FabricNS.fabric || FabricNS.default) : FabricNS;

// Basic font list (web-safe). More fonts require loading font-face in your app's CSS.
const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Courier New', 'Trebuchet MS', 'Impact'
];

const DEFAULT_SLIDE = () => ({
  id: Date.now(),
  name: 'Slide',
  width: 1280,
  height: 720,
  background: '#ffffff',
  json: null,
  thumb: null,
});

export default function SlidesEditor({ state, setState }) {
  const slides = state?.slides || [];
  const activeIndex = Math.min(state?.activeIndex || 0, Math.max(0, slides.length - 1));
  const activeSlide = slides[activeIndex] || null;

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fabricRef = useRef(null);

  const [selection, setSelection] = useState(null); // active object
  const [isPresenting, setIsPresenting] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [showSlidesPanel, setShowSlidesPanel] = useState(true);
  const [showPropsPanel, setShowPropsPanel] = useState(true);
  const [zoomMode, setZoomMode] = useState('fit'); // 'fit' | 'manual'
  const [zoom, setZoom] = useState(1);

  // Undo/redo stacks per slide id
  const historyRef = useRef({}); // { [slideId]: { undo: [], redo: [] } }

  // Ensure at least one slide exists
  useEffect(() => {
    if (!slides.length) {
      const first = DEFAULT_SLIDE();
      setState({ ...state, slides: [first], activeIndex: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Migrate old slides data (from legacy simple slides) to new schema
  useEffect(() => {
    if (!slides?.length) return;
    let changed = false;
    const fixed = slides.map((s, idx) => {
      const ns = { ...s };
      if (ns.width == null || isNaN(parseInt(ns.width))) { ns.width = 1280; changed = true; }
      if (ns.height == null || isNaN(parseInt(ns.height))) { ns.height = 720; changed = true; }
      if (!ns.background) { ns.background = '#ffffff'; changed = true; }
      if (ns.name == null && ns.title != null) { ns.name = String(ns.title); changed = true; }
      if (ns.json === undefined) { ns.json = null; changed = true; }
      if (ns.thumb === undefined) { ns.thumb = null; changed = true; }
      if (ns.id == null) { ns.id = Date.now() + idx; changed = true; }
      return ns;
    });
    if (changed) {
      setState({ ...state, slides: fixed, activeIndex: Math.min(activeIndex, fixed.length - 1) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  // Render current slide in presentation dialog (top-level effect)
  useEffect(() => {
    let presentCanvas = null;
    let disposed = false;
    const render = async () => {
      if (!isPresenting) return;
      const el = document.getElementById('present-canvas');
      const s = slides[activeIndex];
      if (!el || !s) return;
      // Reset canvas element size
      el.width = s.width;
      el.height = s.height;
      el.style.maxWidth = '90vw';
      el.style.maxHeight = '80vh';
      el.style.width = '100%';
      el.style.height = 'auto';

      presentCanvas = new fabric.StaticCanvas(el, { width: s.width, height: s.height });
      if (s.background) { presentCanvas.backgroundColor = s.background; presentCanvas.renderAll(); }
      if (s.json) {
        await new Promise((res) => presentCanvas.loadFromJSON(s.json, () => { presentCanvas.renderAll(); res(); }));
      } else {
        presentCanvas.clear();
        presentCanvas.backgroundColor = s.background || '#fff';
        presentCanvas.renderAll();
      }
    };
    render();
    return () => {
      if (!disposed && presentCanvas) {
        presentCanvas.dispose();
      }
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresenting, activeIndex, slides]);

  // Initialize Fabric canvas (after the canvas element exists)
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return;
    const canvas = new fabric.Canvas(canvasRef.current, {
      preserveObjectStacking: true,
      selection: true,
    });
    fabricRef.current = canvas;

    const onChange = () => {
      // Save to history and persist
      queueSave('change');
      setSelection(canvas.getActiveObject() || null);
    };

    canvas.on('object:added', onChange);
    canvas.on('object:modified', onChange);
    canvas.on('object:removed', onChange);
    canvas.on('selection:created', () => setSelection(canvas.getActiveObject() || null));
    canvas.on('selection:updated', () => setSelection(canvas.getActiveObject() || null));
    canvas.on('selection:cleared', () => setSelection(null));

    const handleKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (!fabricRef.current) return;
      const c = fabricRef.current;
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          historyUndo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          historyRedo();
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = c.getActiveObject();
        if (active) {
          c.remove(active);
          c.discardActiveObject();
          c.requestRenderAll();
        }
      }
      if (isPresenting) {
        if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') setIsPresenting(false);
      }
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('keydown', handleKey);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [activeSlide?.id]);

  // Load slide into canvas on slide change
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !activeSlide) return;
    // Resize canvas container
    canvas.setWidth(activeSlide.width);
    canvas.setHeight(activeSlide.height);
    canvas.backgroundColor = activeSlide.background;
    if (canvasRef.current) canvasRef.current.style.backgroundColor = activeSlide.background;
    canvas.renderAll();

    if (activeSlide.json) {
      canvas.loadFromJSON(activeSlide.json, () => {
        canvas.renderAll();
        queueSave('load');
        fitCanvasToContainer();
      });
    } else {
      canvas.clear();
      canvas.backgroundColor = activeSlide.background;
      if (canvasRef.current) canvasRef.current.style.backgroundColor = activeSlide.background;
      canvas.renderAll();
      // Add a helpful placeholder text
      const itext = new fabric.IText('Double-click to edit', {
        left: activeSlide.width / 2,
        top: activeSlide.height / 2,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Arial',
        fontSize: 48,
        fill: '#333',
      });
      canvas.add(itext);
      canvas.setActiveObject(itext);
      canvas.renderAll();
      queueSave('init');
      fitCanvasToContainer();
    }

    ensureHistory(activeSlide.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, activeSlide?.id]);

  // Fit canvas to available area by adjusting viewport transform (zoom and center)
  const fitCanvasToContainer = () => {
    const canvas = fabricRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !activeSlide) return;
    const rect = container.getBoundingClientRect();
    const pad = 24; // padding inside container
    const availW = Math.max(100, rect.width - pad * 2);
    const availH = Math.max(100, rect.height - pad * 2);
    const scaleFit = Math.min(availW / activeSlide.width, availH / activeSlide.height);
    const z = zoomMode === 'fit' ? (isFinite(scaleFit) && scaleFit > 0 ? scaleFit : 1) : zoom;
    // Use zero translation and center via flexbox; constrain DOM size to avoid overlay
    canvas.setViewportTransform([z, 0, 0, z, 0, 0]);
    if (canvasRef.current) {
      canvasRef.current.style.width = `${Math.max(1, Math.floor(activeSlide.width * z))}px`;
      canvasRef.current.style.height = `${Math.max(1, Math.floor(activeSlide.height * z))}px`;
    }
    canvas.requestRenderAll();
  };

  // Re-compute fit on zoom changes
  useEffect(() => { fitCanvasToContainer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, zoomMode]);

  const setZoomClamped = (val) => setZoom(Math.max(0.1, Math.min(4, val)));
  const handleZoomIn = () => { setZoomMode('manual'); setZoomClamped(zoom * 1.2); };
  const handleZoomOut = () => { setZoomMode('manual'); setZoomClamped(zoom / 1.2); };
  const handleFit = () => { setZoomMode('fit'); };

  // Refit on container resize and when slide size changes
  useEffect(() => {
    fitCanvasToContainer();
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => fitCanvasToContainer());
    ro.observe(containerRef.current);
    window.addEventListener('resize', fitCanvasToContainer);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fitCanvasToContainer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlide?.width, activeSlide?.height, activeIndex]);

  // Debounced persistence
  const saveTimer = useRef(null);
  const queueSave = (reason = '') => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistCanvasToState(reason), 150);
  };

  const persistCanvasToState = (reason = '') => {
    const canvas = fabricRef.current;
    if (!canvas || !activeSlide) return;
    const json = canvas.toJSON(['name']);
    const thumb = canvas.toDataURL({ format: 'png', multiplier: 0.2 });
    const updatedSlide = { ...activeSlide, json, thumb };
    const newSlides = [...slides];
    newSlides[activeIndex] = updatedSlide;

    // Push to undo stack
    pushHistory(activeSlide.id, json);

    setState({ ...state, slides: newSlides });
  };

  const ensureHistory = (slideId) => {
    if (!historyRef.current[slideId]) {
      historyRef.current[slideId] = { undo: [], redo: [] };
    }
  };
  const pushHistory = (slideId, json) => {
    ensureHistory(slideId);
    const entry = JSON.stringify(json);
    const stacks = historyRef.current[slideId];
    if (!stacks.undo.length || stacks.undo[stacks.undo.length - 1] !== entry) {
      stacks.undo.push(entry);
      stacks.redo = [];
    }
  };
  const historyUndo = () => {
    const canvas = fabricRef.current;
    if (!canvas || !activeSlide) return;
    const stacks = historyRef.current[activeSlide.id];
    if (!stacks || stacks.undo.length < 2) return; // keep at least current
    // Pop current
    const current = stacks.undo.pop();
    stacks.redo.push(current);
    const prev = stacks.undo[stacks.undo.length - 1];
    canvas.loadFromJSON(JSON.parse(prev), () => canvas.renderAll());
    queueSave('undo');
  };
  const historyRedo = () => {
    const canvas = fabricRef.current;
    if (!canvas || !activeSlide) return;
    const stacks = historyRef.current[activeSlide.id];
    if (!stacks || !stacks.redo.length) return;
    const next = stacks.redo.pop();
    stacks.undo.push(next);
    canvas.loadFromJSON(JSON.parse(next), () => canvas.renderAll());
    queueSave('redo');
  };

  // Slide actions
  const addSlide = () => {
    const s = DEFAULT_SLIDE();
    const newSlides = [...slides];
    newSlides.splice(activeIndex + 1, 0, s);
    setState({ ...state, slides: newSlides, activeIndex: activeIndex + 1 });
  };
  const deleteSlide = (index) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, i) => i !== index);
    const newActive = Math.max(0, Math.min(index, newSlides.length - 1));
    setState({ ...state, slides: newSlides, activeIndex: newActive });
  };
  const duplicateSlide = (index) => {
    const src = slides[index];
    const copy = { ...DEFAULT_SLIDE(), name: src.name + ' Copy', width: src.width, height: src.height, background: src.background, json: src.json };
    const newSlides = [...slides];
    newSlides.splice(index + 1, 0, copy);
    setState({ ...state, slides: newSlides, activeIndex: index + 1 });
  };
  const moveSlideUp = (index) => {
    if (index <= 0) return;
    const newSlides = [...slides];
    const [removed] = newSlides.splice(index, 1);
    newSlides.splice(index - 1, 0, removed);
    setState({ ...state, slides: newSlides, activeIndex: index - 1 });
  };
  const moveSlideDown = (index) => {
    if (index >= slides.length - 1) return;
    const newSlides = [...slides];
    const [removed] = newSlides.splice(index, 1);
    newSlides.splice(index + 1, 0, removed);
    setState({ ...state, slides: newSlides, activeIndex: index + 1 });
  };

  const setActiveIndex = (i) => setState({ ...state, activeIndex: i });

  // Object creation
  const addText = () => {
    const c = fabricRef.current; if (!c || !activeSlide) return;
    const obj = new fabric.IText('Text', {
      left: activeSlide.width / 2 - 100,
      top: activeSlide.height / 2 - 20,
      fontFamily: 'Arial',
      fontSize: 28,
      fill: '#222',
    });
    c.add(obj); c.setActiveObject(obj); obj.enterEditing(); obj.hiddenTextarea && obj.hiddenTextarea.focus();
    c.requestRenderAll(); queueSave('addText');
  };
  const addRect = () => {
    const c = fabricRef.current; if (!c || !activeSlide) return;
    const obj = new fabric.Rect({ left: 100, top: 100, width: 220, height: 120, rx: 8, ry: 8, fill: '#1976d2', stroke: '#0d47a1', strokeWidth: 2, strokeUniform: true });
    c.add(obj); c.setActiveObject(obj); c.requestRenderAll(); queueSave('addRect');
  };
  const addCircle = () => {
    const c = fabricRef.current; if (!c || !activeSlide) return;
    const obj = new fabric.Circle({ left: 200, top: 160, radius: 60, fill: '#43a047', stroke: '#1b5e20', strokeWidth: 2, strokeUniform: true });
    c.add(obj); c.setActiveObject(obj); c.requestRenderAll(); queueSave('addCircle');
  };
  const addLine = () => {
    const c = fabricRef.current; if (!c || !activeSlide) return;
    const obj = new fabric.Line([100, 100, 320, 160], { stroke: '#e64a19', strokeWidth: 4, strokeUniform: true });
    c.add(obj); c.setActiveObject(obj); c.requestRenderAll(); queueSave('addLine');
  };
  const addImageByUrl = (url) => {
    const c = fabricRef.current; if (!c || !activeSlide) return;
    fabric.Image.fromURL(url, (img) => {
      const maxW = activeSlide.width * 0.7;
      const maxH = activeSlide.height * 0.7;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      img.set({ left: 100, top: 100, scaleX: scale, scaleY: scale });
      c.add(img); c.setActiveObject(img); c.requestRenderAll(); queueSave('addImage');
    }, { crossOrigin: 'anonymous' });
  };

  // Properties update helpers
  const updateActiveProp = (prop, value) => {
    const c = fabricRef.current; if (!c) return;
    const obj = c.getActiveObject(); if (!obj) return;
    obj.set(prop, value);
    obj.setCoords();
    c.requestRenderAll();
    queueSave('propChange');
  };

  const deleteActive = () => {
    const c = fabricRef.current; if (!c) return;
    const obj = c.getActiveObject(); if (!obj) return;
    c.remove(obj); c.discardActiveObject(); c.requestRenderAll(); queueSave('delete');
  };
  const bringToFront = () => { const c = fabricRef.current; const o = c?.getActiveObject(); if (o) { o.bringToFront(); c.requestRenderAll(); queueSave('front'); } };
  const sendToBack = () => { const c = fabricRef.current; const o = c?.getActiveObject(); if (o) { o.sendToBack(); c.requestRenderAll(); queueSave('back'); } };

  // Presentation
  const nextSlide = () => setState({ ...state, activeIndex: Math.min(activeIndex + 1, slides.length - 1) });
  const prevSlide = () => setState({ ...state, activeIndex: Math.max(activeIndex - 1, 0) });

  // Export
  const exportPNG = () => {
    const c = fabricRef.current; if (!c) return;
    const data = c.toDataURL({ format: 'png', multiplier: 2 });
    const a = document.createElement('a');
    a.href = data; a.download = `slide-${activeIndex + 1}.png`;
    a.click();
  };

  // PPTX export removed by request

  // UI helpers
  const sel = selection;
  const isText = sel && sel.type === 'i-text';

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 100px)', gap: 2, p: 2 }}>
      {/* Slides sidebar */}
      {showSlidesPanel && (
      <Paper sx={{ width: 200, p: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>Slides</Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Add slide"><IconButton size="small" onClick={addSlide}><AddIcon /></IconButton></Tooltip>
          </Stack>
        </Stack>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={1} sx={{ overflowY: 'auto', flex: 1 }}>
          {slides.map((s, i) => (
            <Paper key={s.id} variant={i === activeIndex ? 'elevation' : 'outlined'}
              onClick={() => setActiveIndex(i)}
              sx={{ p: 1, cursor: 'pointer', border: i === activeIndex ? '2px solid #1976d2' : '1px solid #e0e0e0' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" sx={{ minWidth: 18 }}>{i + 1}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" noWrap>{s.name || `Slide ${i + 1}`}</Typography>
                  <Box sx={{ mt: 0.5, height: 4, background: '#eee', borderRadius: 2 }} />
                </Box>
                <Stack direction="column" spacing={0}>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveSlideUp(i); }} disabled={i === 0}><ArrowUpwardIcon fontSize="inherit" /></IconButton>
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); moveSlideDown(i); }} disabled={i === slides.length - 1}><ArrowDownwardIcon fontSize="inherit" /></IconButton>
                </Stack>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); duplicateSlide(i); }}><ContentCopyIcon fontSize="inherit" /></IconButton>
                <IconButton size="small" disabled={slides.length <= 1} onClick={(e) => { e.stopPropagation(); deleteSlide(i); }}><DeleteIcon fontSize="inherit" /></IconButton>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
      )}

      {/* Editor area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <Paper sx={{ p: 1, mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Tooltip title="Add text"><Button size="small" variant="outlined" startIcon={<TextFieldsIcon />} onClick={addText}>Text</Button></Tooltip>
            <Tooltip title="Add rectangle"><IconButton onClick={addRect}><CropSquareIcon /></IconButton></Tooltip>
            <Tooltip title="Add circle"><IconButton onClick={addCircle}><PanoramaFishEyeIcon /></IconButton></Tooltip>
            <Tooltip title="Add line"><IconButton onClick={addLine}><RemoveIcon /></IconButton></Tooltip>
            <Tooltip title="Add image from URL"><IconButton onClick={() => setImageModalOpen(true)}><ImageIcon /></IconButton></Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="Undo"><span><IconButton onClick={historyUndo}><UndoIcon /></IconButton></span></Tooltip>
            <Tooltip title="Redo"><span><IconButton onClick={historyRedo}><RedoIcon /></IconButton></span></Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="Bring to front"><IconButton onClick={bringToFront}><BringToFrontIcon /></IconButton></Tooltip>
            <Tooltip title="Send to back"><IconButton onClick={sendToBack}><SendToBackIcon /></IconButton></Tooltip>
            <Tooltip title="Delete selected"><IconButton color="error" onClick={deleteActive}><DeleteIcon /></IconButton></Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="Present"><Button variant="contained" size="small" startIcon={<SlideshowIcon />} onClick={() => setIsPresenting(true)}>Present</Button></Tooltip>
            <Tooltip title="Export PNG"><Button size="small" startIcon={<SaveAltIcon />} onClick={exportPNG}>PNG</Button></Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title="Zoom out"><span><IconButton onClick={handleZoomOut}><ZoomOutIcon /></IconButton></span></Tooltip>
            <Tooltip title="Fit to screen"><span><IconButton onClick={handleFit}><FitScreenIcon /></IconButton></span></Tooltip>
            <Tooltip title="Zoom in"><span><IconButton onClick={handleZoomIn}><ZoomInIcon /></IconButton></span></Tooltip>
            <Typography variant="caption" sx={{ ml: 0.5 }}>{zoomMode === 'fit' ? 'Fit' : `${Math.round(zoom * 100)}%`}</Typography>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
            <Tooltip title={showSlidesPanel ? 'Hide slides panel' : 'Show slides panel'}>
              <IconButton onClick={() => { setShowSlidesPanel(v => !v); setTimeout(fitCanvasToContainer, 0); }}>
                <ViewSidebarIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={showPropsPanel ? 'Hide properties panel' : 'Show properties panel'}>
              <IconButton onClick={() => { setShowPropsPanel(v => !v); setTimeout(fitCanvasToContainer, 0); }}>
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Paper>

        {/* Canvas area */}
        <Paper sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, position: 'relative', minWidth: 0 }} ref={containerRef}>
          {activeSlide && (
            <canvas ref={canvasRef} style={{ border: '1px solid #e0e0e0', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', backgroundColor: activeSlide.background || '#ffffff' }} />
          )}
        </Paper>
      </Box>

      {/* Properties panel */}
      {showPropsPanel && (
      <Paper sx={{ width: 260, p: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Properties</Typography>
        <Divider sx={{ mb: 1 }} />

        {!sel && activeSlide && (
          <Stack spacing={1.5}>
            <TextField size="small" label="Slide name" value={activeSlide.name || ''}
              onChange={(e) => {
                const newSlides = [...slides];
                newSlides[activeIndex] = { ...activeSlide, name: e.target.value };
                setState({ ...state, slides: newSlides });
              }}
            />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Width" type="number" value={activeSlide.width} InputLabelProps={{ shrink: true }}
                onChange={(e) => {
                  const w = Math.max(320, parseInt(e.target.value || '0', 10));
                  const newSlides = [...slides];
                  newSlides[activeIndex] = { ...activeSlide, width: w };
                  setState({ ...state, slides: newSlides });
                  fitCanvasToContainer();
                }}
              />
              <TextField size="small" label="Height" type="number" value={activeSlide.height} InputLabelProps={{ shrink: true }}
                onChange={(e) => {
                  const h = Math.max(240, parseInt(e.target.value || '0', 10));
                  const newSlides = [...slides];
                  newSlides[activeIndex] = { ...activeSlide, height: h };
                  setState({ ...state, slides: newSlides });
                  fitCanvasToContainer();
                }}
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 90 }}>Background</Typography>
              <input type="color" value={activeSlide.background}
                onChange={(e) => {
                  const color = e.target.value;
                  const newSlides = [...slides];
                  newSlides[activeIndex] = { ...activeSlide, background: color };
                  setState({ ...state, slides: newSlides });
                  const c = fabricRef.current; if (c) { c.backgroundColor = color; c.renderAll(); }
                  if (canvasRef.current) canvasRef.current.style.backgroundColor = color;
                  queueSave('bg');
                }}
              />
            </Stack>
          </Stack>
        )}

        {!!sel && (
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">Selected: {sel.type}</Typography>
            {/* Position & Size */}
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="X" type="number" value={Math.round(sel.left || 0)} onChange={(e) => updateActiveProp('left', parseFloat(e.target.value || '0'))} />
              <TextField size="small" label="Y" type="number" value={Math.round(sel.top || 0)} onChange={(e) => updateActiveProp('top', parseFloat(e.target.value || '0'))} />
            </Stack>
            {'width' in sel && 'height' in sel && (
              <Stack direction="row" spacing={1}>
                <TextField size="small" label="W" type="number" value={Math.round(sel.width * (sel.scaleX || 1))}
                  onChange={(e) => {
                    const w = Math.max(1, parseFloat(e.target.value || '1'));
                    const base = sel.width || 1; updateActiveProp('scaleX', w / base);
                  }}
                />
                <TextField size="small" label="H" type="number" value={Math.round(sel.height * (sel.scaleY || 1))}
                  onChange={(e) => {
                    const h = Math.max(1, parseFloat(e.target.value || '1'));
                    const base = sel.height || 1; updateActiveProp('scaleY', h / base);
                  }}
                />
              </Stack>
            )}
            <TextField size="small" label="Rotate" type="number" value={Math.round(sel.angle || 0)} onChange={(e) => updateActiveProp('angle', parseFloat(e.target.value || '0'))} />

            {/* Fill / Stroke */}
            {'fill' in sel && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ minWidth: 90 }}>Fill</Typography>
                <input type="color" value={sel.fill || '#000000'} onChange={(e) => updateActiveProp('fill', e.target.value)} />
              </Stack>
            )}
            {'stroke' in sel && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ minWidth: 90 }}>Stroke</Typography>
                <input type="color" value={sel.stroke || '#000000'} onChange={(e) => updateActiveProp('stroke', e.target.value)} />
                <TextField size="small" label="W" type="number" value={sel.strokeWidth || 0} onChange={(e) => updateActiveProp('strokeWidth', parseFloat(e.target.value || '0'))} sx={{ width: 80 }} />
              </Stack>
            )}

            {/* Text props */}
            {isText && (
              <>
                <FormControl size="small" fullWidth>
                  <InputLabel>Font</InputLabel>
                  <Select label="Font" value={sel.fontFamily || 'Arial'} onChange={(e) => updateActiveProp('fontFamily', e.target.value)}>
                    {FONT_FAMILIES.map(f => <MenuItem key={f} value={f} style={{ fontFamily: f }}>{f}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Font size" type="number" value={sel.fontSize || 24} onChange={(e) => updateActiveProp('fontSize', parseFloat(e.target.value || '12'))} />
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant={sel.fontWeight === 'bold' ? 'contained' : 'outlined'} onClick={() => updateActiveProp('fontWeight', sel.fontWeight === 'bold' ? 'normal' : 'bold')}>B</Button>
                  <Button size="small" variant={sel.fontStyle === 'italic' ? 'contained' : 'outlined'} onClick={() => updateActiveProp('fontStyle', sel.fontStyle === 'italic' ? 'normal' : 'italic')}>I</Button>
                  <Button size="small" variant={sel.underline ? 'contained' : 'outlined'} onClick={() => updateActiveProp('underline', !sel.underline)}>U</Button>
                </Stack>
                <FormControl size="small" fullWidth>
                  <InputLabel>Align</InputLabel>
                  <Select label="Align" value={sel.textAlign || 'left'} onChange={(e) => updateActiveProp('textAlign', e.target.value)}>
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                    <MenuItem value="justify">Justify</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        )}
      </Paper>
      )}

      {/* Image URL Modal */}
      <InputModal
        open={imageModalOpen}
        title="Add Image"
        onClose={() => setImageModalOpen(false)}
        fields={[{ name: 'url', label: 'Image URL', type: 'text', required: true }]}
        onSubmit={({ url }) => { setImageModalOpen(false); if (url) addImageByUrl(url); }}
      />

      {/* Presentation Mode */}
      <Dialog fullScreen open={isPresenting} onClose={() => setIsPresenting(false)}>
        <AppBar sx={{ position: 'relative' }}>
          <Toolbar>
            <Typography sx={{ flex: 1 }} variant="h6" component="div">
              Presenting — Slide {activeIndex + 1} / {slides.length}
            </Typography>
            <IconButton edge="start" color="inherit" onClick={() => setIsPresenting(false)} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
          <canvas id="present-canvas" />
        </Box>
        <Stack direction="row" spacing={1} sx={{ position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
          <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={prevSlide} disabled={activeIndex === 0}>Prev</Button>
          <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={nextSlide} disabled={activeIndex === slides.length - 1}>Next</Button>
        </Stack>
      </Dialog>
    </Box>
  );
}
