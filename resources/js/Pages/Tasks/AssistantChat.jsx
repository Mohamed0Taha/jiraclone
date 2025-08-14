// resources/js/Pages/Tasks/AssistantChat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { alpha, Box, Portal, useTheme } from "@mui/material";
import { keyframes } from "@emotion/react";
import OriginalAssistantChat from "@/Components/AssistantChat";

/* ---------------- Keyframes (No changes needed here) ---------------- */
const kfBounceDot = keyframes`0% { transform: translateY(0); opacity: 0.25; } 50% { transform: translateY(-6px); opacity: 1; } 100% { transform: translateY(0); opacity: 0.25; }`;
const kfShimmer = keyframes`0% { transform: translateX(-120%); } 100% { transform: translateX(220%); }`;
const kfFloatUp = keyframes`0% { transform: translateY(8px); opacity: 0; } 25% { opacity: 0.6; } 100% { transform: translateY(-20px); opacity: 0; }`;
const kfRing = keyframes`0% { transform: scale(0.6); opacity: 0.95; } 100% { transform: scale(1.25); opacity: 0; }`;
const kfRay = keyframes`0% { transform: scale(0.4); opacity: 0.95; } 100% { transform: scale(1.6); opacity: 0; }`;


/**
 * Drop-in wrapper that keeps your ORIGINAL chat UI untouched.
 * It overlays a colorful, cute robot-typing bubble INSIDE the chat box while the assistant is responding,
 * and plays a bubbly "pop" sound with a confetti burst when the response completes.
 *
 * HOW IT WORKS:
 * - This component is now controlled by a simple boolean prop: `isTyping`.
 * - The parent component is responsible for setting `isTyping={true}` when a request starts
 * and `isTyping={false}` when it completes.
 * - This removes all complex, brittle, and unnecessary API patching and DOM scanning.
 */
export default function AssistantChat({ open, isTyping, robotGifUrl, ...rest }) {
  const [showPopBurst, setShowPopBurst] = useState(false);
  const [popBurstKey, setPopBurstKey] = useState(0);
  const { play: playBubbleSound } = useBubbleAudio();
  const prevIsTypingRef = useRef(false);

  const [chatContentEl, setChatContentEl] = useState(null);

  // When the dialog opens, find the scrollable content area once.
  // This is a much simpler way to find the container for the pop effect.
  useEffect(() => {
    if (open) {
      // Use a timeout to ensure the dialog has rendered
      const timer = setTimeout(() => {
        const content = document.querySelector('.MuiDialogContent-root');
        if (content) setChatContentEl(content);
      }, 150);
      return () => clearTimeout(timer);
    } else {
        setChatContentEl(null); // Clean up when closed
    }
  }, [open]);


  /* ---- When `isTyping` toggles off, play sound + burst ---- */
  useEffect(() => {
    if (prevIsTypingRef.current && !isTyping) {
      playBubbleSound();
      setPopBurstKey((k) => k + 1);
      setShowPopBurst(true);
      const timer = setTimeout(() => setShowPopBurst(false), 750);
      return () => clearTimeout(timer);
    }
    prevIsTypingRef.current = isTyping;
  }, [isTyping, playBubbleSound]);

  return (
    <>
      {/* The original chat component is rendered directly. */}
      {/* The parent component passes all necessary props through. */}
      <OriginalAssistantChat open={open} {...rest} />

      {/* The entire animation logic is now clean and self-contained. */}
      {open && (
        <Box sx={{ pointerEvents: "none" }}>
          {/* Typing bubble appears when `isTyping` is true */}
          {isTyping && (
             <>
                {/* Hide default spinner in actions to make the robot the star */}
                <style>{`.MuiDialog-root .MuiDialogActions-root .MuiCircularProgress-root{visibility:hidden!important;}`}</style>
                <Box
                    sx={{
                        position: 'fixed', // Use fixed position to overlay on the dialog
                        right: 24,
                        bottom: 80, // Adjust position as needed
                        zIndex: 1301, // Higher than dialog z-index
                    }}
                    aria-hidden
                    >
                    <ColorfulTypingBubble robotGifUrl={robotGifUrl} />
                </Box>
            </>
          )}

          {/* Pop burst effect appears when a response finishes */}
          {chatContentEl && showPopBurst && (
            <Portal key={popBurstKey} container={chatContentEl}>
              <Box
                sx={{
                  position: "absolute",
                  right: 26,
                  bottom: 120, // Position relative to the chat content area
                  zIndex: 11,
                  width: 168,
                  height: 168,
                }}
                aria-hidden
              >
                <PopBurst />
              </Box>
            </Portal>
          )}
        </Box>
      )}
    </>
  );
}


/* ---------------- Presentational Components (Largely Unchanged) ---------------- */

function ColorfulTypingBubble({ robotGifUrl }) {
  const theme = useTheme();
  const gradientFrom = theme.palette.mode === "light" ? alpha(theme.palette.primary.light, 0.9) : alpha(theme.palette.primary.dark, 0.9);
  const gradientTo = theme.palette.mode === "light" ? alpha(theme.palette.secondary.light, 0.9) : alpha(theme.palette.secondary.dark, 0.9);
  const glass = theme.palette.mode === "light" ? alpha("#ffffff", 0.92) : alpha("#0b0f17", 0.88);

  const defaultGif = robotGifUrl || "https://media.giphy.com/media/6brH8dM3zeMyA/giphy.gif";

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        pl: 1.1,
        pr: 1.25,
        borderRadius: 24,
        background: glass,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.35)}`,
        boxShadow: "0 12px 40px rgba(0,0,0,.25)",
        backdropFilter: "blur(10px) saturate(1.2)",
        overflow: "visible",
      }}
    >
      {/* Rainbow shimmer outline */}
      <Box sx={{ position: "absolute", inset: 0, borderRadius: 24, p: "1px", background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`, mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
      <Box sx={{ position: "absolute", left: "-35%", top: 0, bottom: 0, width: "38%", background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.4)}, transparent)`, filter: "blur(5px)", animation: `${kfShimmer} 3s ease-in-out infinite` }} />

      {/* Robot GIF */}
      <Box component="img" src={defaultGif} alt="Assistant is typing" sx={{ width: 72, height: 72, objectFit: "cover", borderRadius: "50%", boxShadow: `0 8px 24px ${alpha(theme.palette.secondary.main, 0.5)}`, border: `2px solid ${alpha(theme.palette.secondary.main, 0.45)}` }} />

      {/* Animated dots */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mr: 0.25 }}>
        <TypingDot delay="0s" />
        <TypingDot delay=".16s" />
        <TypingDot delay=".32s" />
      </Box>

      {/* Decorative elements */}
      <FloatingBubbles count={12} />
      <Sparkles count={10} />
    </Box>
  );
}

function TypingDot({ delay = "0s" }) {
  const theme = useTheme();
  return (
    <Box sx={{ width: 10, height: 10, borderRadius: "50%", background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.95)}, ${alpha(theme.palette.secondary.main, 0.95)})`, animation: `${kfBounceDot} 1.06s ease-in-out infinite`, animationDelay: delay, boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.18)}` }} />
  );
}

function FloatingBubbles({ count = 10 }) {
  const theme = useTheme();
  const bubbles = useMemo(() => Array.from({ length: count }, () => ({
    delay: (Math.random() * 1.8).toFixed(2) + "s",
    duration: (2.8 + Math.random() * 2.0).toFixed(2) + "s",
    left: (Math.random() * 100).toFixed(2) + "%",
    size: 4 + Math.round(Math.random() * 7),
    blur: Math.random() > 0.6 ? 1 : 0,
  })), [count]);

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {bubbles.map((b, i) => (
        <Box key={i} sx={{ position: "absolute", bottom: -6, left: b.left, width: b.size, height: b.size, borderRadius: "50%", background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.45)}, ${alpha(theme.palette.secondary.main, 0.45)})`, boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.15)}`, filter: b.blur ? "blur(0.6px)" : "none", animation: `${kfFloatUp} ${b.duration} ease-in infinite`, animationDelay: b.delay }} />
      ))}
    </Box>
  );
}

function Sparkles({ count = 8 }) {
    const theme = useTheme();
    const points = useMemo(() => Array.from({ length: count }, () => ({
        left: `${(Math.random() * 100).toFixed(2)}%`,
        top: `${(Math.random() * 100).toFixed(2)}%`,
        size: 2 + Math.round(Math.random() * 3),
        delay: `${(Math.random() * 1.8).toFixed(2)}s`,
        duration: `${(0.9 + Math.random() * 1.2).toFixed(2)}s`,
    })), [count]);

    return (
        <Box sx={{ position: "absolute", inset: 0 }}>
            {points.map((p, i) => (
                <Box key={i} sx={{ position: "absolute", left: p.left, top: p.top, width: p.size, height: p.size, borderRadius: "50%", background: `radial-gradient(circle, ${alpha("#fff", 0.95)} 0%, ${alpha(theme.palette.secondary.main, 0.7)} 60%, transparent 70%)`, animation: `${kfFloatUp} ${p.duration} ease-in-out infinite`, animationDelay: p.delay }} />
            ))}
        </Box>
    );
}

function PopBurst() {
  const theme = useTheme();
  return (
    <Box component="svg" viewBox="0 0 200 200" width="100%" height="100%">
      <defs>
        <radialGradient id="burstGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={alpha(theme.palette.secondary.main, 0.9)} />
          <stop offset="50%" stopColor={alpha(theme.palette.primary.main, 0.75)} />
          <stop offset="100%" stopColor={alpha(theme.palette.primary.main, 0.0)} />
        </radialGradient>
      </defs>
      <Box component="circle" cx="100" cy="100" r="36" sx={{ fill: "url(#burstGrad)", transformOrigin: "100px 100px", animation: `${kfRing} 0.65s ease-out forwards` }} />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = i * 30;
        return (
          <Box key={i} component="line" x1="100" y1="100" x2="100" y2="100" sx={{ stroke: i % 2 === 0 ? theme.palette.secondary.main : theme.palette.primary.main, strokeWidth: 4, strokeLinecap: "round", transformOrigin: "100px 100px", animation: `${kfRay} 0.65s ease-out forwards`, transform: `rotate(${angle}deg) translate(18px) scaleX(0.22)`, transformBox: 'fill-box' }} />
        );
      })}
    </Box>
  );
}


/* ---------------- WebAudio bubble sound (Unchanged) ---------------- */
function useBubbleAudio() {
  const audioCtxRef = useRef(null);
  const isUnlockedRef = useRef(false);

  const ensure = React.useCallback(() => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = typeof window !== "undefined" ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!Ctx) return null;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    return ctx;
  }, []);

  const unlockAudio = React.useCallback(() => {
      const ctx = ensure();
      if (ctx && ctx.state !== 'running' && !isUnlockedRef.current) {
          ctx.resume().then(() => { isUnlockedRef.current = true; });
      }
  }, [ensure]);

  // Add a one-time event listener to unlock audio on the first user interaction
  useEffect(() => {
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      return () => {
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
      };
  }, [unlockAudio]);

  const play = React.useCallback(() => {
    const ctx = ensure();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const createOsc = (type, freqStart, freqEnd, freqRampDur, gainStart, gainRampUpDur, gainRampDownDur, startTime, stopTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;

        osc.frequency.setValueAtTime(freqStart, now);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + freqRampDur);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gainStart, now + gainRampUpDur);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + gainRampDownDur);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now + startTime);
        osc.stop(now + stopTime);
    };

    // Main "bubble pop" rising tone
    createOsc("sine", 180, 520, 0.08, 0.45, 0.02, 0.18, 0, 0.22);
    // Little sparkle overtone
    createOsc("triangle", 320, 880, 0.06, 0.25, 0.015, 0.12, 0.02, 0.16);

  }, [ensure]);

  return { play };
}