import React, { useMemo, useRef, useState } from "react";
import { alpha, Box, LinearProgress, Tooltip, Typography } from "@mui/material";

// helper: accept Date or ISO string
const toDate = (d) => (d instanceof Date ? d : d ? new Date(`${String(d)}T00:00:00`) : null);

export default function GanttRow({
  task,
  pxPerDay,
  rowHeight = 44,
  accent = "#4F46E5",
  scale,                // (date) => px from left
  onChangeDates,        // (id, newStartDate, newEndDate)
}) {
  const start = useMemo(
    () => toDate(task.start_date || task.end_date || new Date()),
    [task.start_date, task.end_date]
  );
  const end = useMemo(
    () => toDate(task.end_date || task.start_date || new Date()),
    [task.end_date, task.start_date]
  );

  const minWidth = Math.max(pxPerDay * 0.9, 12);
  const [drag, setDrag] = useState(null); // {mode:'move'|'left'|'right', x0, s0, e0, previewS, previewE}
  const barRef = useRef(null);

  const pxLeft = scale(start);
  const pxRight = scale(end);
  const pxWidth = Math.max(minWidth, pxRight - pxLeft || minWidth);

  const beginDrag = (mode, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ mode, x0: e.clientX, s0: start, e0: end });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  const onMove = (e) => {
    setDrag((st) => {
      if (!st) return st;
      const dxDays = Math.round((e.clientX - st.x0) / pxPerDay);
      let s = st.s0;
      let nd = st.e0;
      if (st.mode === "move") {
        s = new Date(st.s0); s.setDate(s.getDate() + dxDays);
        nd = new Date(st.e0); nd.setDate(nd.getDate() + dxDays);
      } else if (st.mode === "left") {
        s = new Date(st.s0); s.setDate(s.getDate() + dxDays);
        if (nd < s) nd = new Date(s);
      } else {
        nd = new Date(st.e0); nd.setDate(nd.getDate() + dxDays);
        if (nd < s) s = new Date(nd);
      }
      return { ...st, previewS: s, previewE: nd };
    });
  };

  const onUp = () => {
    window.removeEventListener("mousemove", onMove);
    setDrag((st) => {
      if (!st) return null;
      const s = st.previewS || st.s0;
      const e = st.previewE || st.e0;
      onChangeDates?.(task.id, s, e);
      return null;
    });
  };

  const pS = drag?.previewS || start;
  const pE = drag?.previewE || end;

  const xLeft = scale(pS);
  const xRight = scale(pE);
  const w = Math.max(minWidth, xRight - xLeft || minWidth);

  const isMilestone = !!task.milestone;

  return (
    <Box sx={{ position: "relative", height: rowHeight }}>
      {!isMilestone ? (
        <Tooltip
          title={
            <Box sx={{ p: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {task.title}
              </Typography>
              <Typography variant="caption" display="block">
                {pS.toLocaleDateString()} — {pE.toLocaleDateString()}
              </Typography>
            </Box>
          }
        >
          <Box
            ref={barRef}
            onMouseDown={(e) => beginDrag("move", e)}
            sx={{
              position: "absolute",
              top: (rowHeight - 22) / 2,
              left: xLeft,
              width: w,
              height: 22,
              borderRadius: 11,
              background: `linear-gradient(145deg, ${alpha(accent, 0.85)}, ${accent})`,
              boxShadow: `0 10px 24px -12px ${alpha(accent, 0.65)}`,
              cursor: "grab",
              overflow: "hidden",
            }}
          >
            {typeof task.progress === "number" && (
              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, Number(task.progress)))}
                sx={{
                  height: "100%",
                  background: alpha("#000", 0.12),
                  "& .MuiLinearProgress-bar": {
                    background: "#fff",
                    opacity: 0.45,
                  },
                }}
              />
            )}

            {/* label */}
            {pxPerDay >= 20 && (
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontWeight: 700,
                  color: "rgba(0,0,0,0.75)",
                  textShadow: "0 1px 2px rgba(255,255,255,.7)",
                  whiteSpace: "nowrap",
                  maxWidth: "90%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {task.title}
              </Typography>
            )}

            {/* resize handles */}
            <Box
              onMouseDown={(e) => beginDrag("left", e)}
              sx={{
                position: "absolute",
                left: -6,
                top: -2,
                width: 8,
                height: 26,
                borderRadius: 2,
                background: alpha("#000", 0.18),
                cursor: "ew-resize",
              }}
            />
            <Box
              onMouseDown={(e) => beginDrag("right", e)}
              sx={{
                position: "absolute",
                right: -6,
                top: -2,
                width: 8,
                height: 26,
                borderRadius: 2,
                background: alpha("#000", 0.18),
                cursor: "ew-resize",
              }}
            />
          </Box>
        </Tooltip>
      ) : (
        <Tooltip title={task.title}>
          <Box
            sx={{
              position: "absolute",
              top: (rowHeight - 14) / 2,
              left: scale(pE || pS) + pxPerDay / 2 - 7,
              width: 14,
              height: 14,
              transform: "rotate(45deg)",
              background: `linear-gradient(145deg, ${alpha(accent, 0.9)}, ${accent})`,
              boxShadow: "0 2px 6px rgba(0,0,0,.25)",
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
