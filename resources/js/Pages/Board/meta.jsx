import React from "react";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import DesignServicesOutlinedIcon from "@mui/icons-material/DesignServicesOutlined";
import BuildCircleOutlinedIcon from "@mui/icons-material/BuildCircleOutlined";

// === Methodologies enum ===
export const METHODOLOGIES = {
  KANBAN: "kanban",
  SCRUM: "scrum",
  AGILE: "agile",
  WATERFALL: "waterfall",
  LEAN: "lean",
};

export const DEFAULT_METHOD = METHODOLOGIES.KANBAN;

// === Preserve your original Kanban visuals ===
const KANBAN_STATUS_META = {
  todo: {
    title: "To Do",
    base: "#FFF4E0",
    accent: "#FFA432",
    gradient: "linear-gradient(135deg,#FFF8EC 0%,#FFE2BC 100%)",
    iconBg: "linear-gradient(145deg,#FFD088,#FFAE45)",
    iconEl: <LightbulbOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  inprogress: {
    title: "In Progress",
    base: "#E4F2FF",
    accent: "#2C8DFF",
    gradient: "linear-gradient(135deg,#F1F8FF 0%,#CFE5FF 100%)",
    iconBg: "linear-gradient(145deg,#77B6FF,#3B8DFF)",
    iconEl: <RocketLaunchRoundedIcon sx={{ fontSize: 18 }} />,
  },
  review: {
    title: "Review",
    base: "#F4E9FF",
    accent: "#9C4DFF",
    gradient: "linear-gradient(135deg,#F9F3FF 0%,#E3D2FF 100%)",
    iconBg: "linear-gradient(145deg,#C39BFF,#9C4DFF)",
    iconEl: <RateReviewRoundedIcon sx={{ fontSize: 18 }} />,
  },
  done: {
    title: "Done",
    base: "#E9F9ED",
    accent: "#22B36B",
    gradient: "linear-gradient(135deg,#F2FFF5 0%,#CDEFD8 100%)",
    iconBg: "linear-gradient(145deg,#5FD598,#22B36B)",
    iconEl: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />,
  },
};

const KANBAN_STATUS_ORDER = ["todo", "inprogress", "review", "done"];

// === Alternate methodologies ===
const SCRUM_STATUS_META = {
  backlog: {
    title: "Product Backlog",
    base: "#F5F5F5",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg,#FAFAFA 0%,#EAEAEA 100%)",
    iconBg: "linear-gradient(145deg,#A1A1AA,#71717A)",
    iconEl: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  todo: KANBAN_STATUS_META.todo,
  inprogress: KANBAN_STATUS_META.inprogress,
  testing: {
    title: "QA",
    base: "#E6FBFF",
    accent: "#06B6D4",
    gradient: "linear-gradient(135deg,#F2FDFF 0%,#CBF7FF 100%)",
    iconBg: "linear-gradient(145deg,#67E8F9,#06B6D4)",
    iconEl: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  review: { ...KANBAN_STATUS_META.review, title: "Sprint Review" },
  done: { ...KANBAN_STATUS_META.done, title: "Done (Increment)" },
};
const SCRUM_STATUS_ORDER = [
  "backlog",
  "todo",
  "inprogress",
  "testing",
  "review",
  "done",
];

const AGILE_STATUS_META = {
  backlog: {
    title: "Backlog",
    base: "#F5F5F5",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg,#FAFAFA 0%,#EAEAEA 100%)",
    iconBg: "linear-gradient(145deg,#A1A1AA,#71717A)",
    iconEl: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  todo: { ...KANBAN_STATUS_META.todo, title: "Ready" },
  inprogress: { ...KANBAN_STATUS_META.inprogress, title: "Doing" },
  testing: {
    title: "QA",
    base: "#E6FBFF",
    accent: "#06B6D4",
    gradient: "linear-gradient(135deg,#F2FDFF 0%,#CBF7FF 100%)",
    iconBg: "linear-gradient(145deg,#67E8F9,#06B6D4)",
    iconEl: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  review: { ...KANBAN_STATUS_META.review, title: "Demo" },
  done: KANBAN_STATUS_META.done,
};
const AGILE_STATUS_ORDER = [
  "backlog",
  "todo",
  "inprogress",
  "testing",
  "review",
  "done",
];

const WATERFALL_STATUS_META = {
  requirements: {
    title: "Requirements",
    base: "#E0F2FE",
    accent: "#0EA5E9",
    gradient: "linear-gradient(135deg,#F0F9FF 0%,#BAE6FD 100%)",
    iconBg: "linear-gradient(145deg,#7DD3FC,#0EA5E9)",
    iconEl: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  design: {
    title: "Design",
    base: "#F3E8FF",
    accent: "#A78BFA",
    gradient: "linear-gradient(135deg,#F7F1FF 0%,#E9D5FF 100%)",
    iconBg: "linear-gradient(145deg,#C4B5FD,#A78BFA)",
    iconEl: <DesignServicesOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  implementation: {
    title: "Implementation",
    base: "#FEF3C7",
    accent: "#F59E0B",
    gradient: "linear-gradient(135deg,#FEF9C3 0%,#FDE68A 100%)",
    iconBg: "linear-gradient(145deg,#FBBF24,#F59E0B)",
    iconEl: <BuildCircleOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  verification: {
    title: "Verification",
    base: "#E6FBFF",
    accent: "#06B6D4",
    gradient: "linear-gradient(135deg,#F2FDFF 0%,#CBF7FF 100%)",
    iconBg: "linear-gradient(145deg,#67E8F9,#06B6D4)",
    iconEl: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  maintenance: {
    title: "Maintenance",
    base: "#E9F9ED",
    accent: "#22B36B",
    gradient: "linear-gradient(135deg,#F2FFF5 0%,#CDEFD8 100%)",
    iconBg: "linear-gradient(145deg,#5FD598,#22B36B)",
    iconEl: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />,
  },
};
const WATERFALL_STATUS_ORDER = [
  "requirements",
  "design",
  "implementation",
  "verification",
  "maintenance",
];

const LEAN_STATUS_META = {
  backlog: {
    title: "Ideas",
    base: "#F5F5F5",
    accent: "#6B7280",
    gradient: "linear-gradient(135deg,#FAFAFA 0%,#EAEAEA 100%)",
    iconBg: "linear-gradient(145deg,#A1A1AA,#71717A)",
    iconEl: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  todo: { ...KANBAN_STATUS_META.todo, title: "Build" },
  testing: {
    title: "Measure",
    base: "#E6FBFF",
    accent: "#06B6D4",
    gradient: "linear-gradient(135deg,#F2FDFF 0%,#CBF7FF 100%)",
    iconBg: "linear-gradient(145deg,#67E8F9,#06B6D4)",
    iconEl: <ScienceOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  review: { ...KANBAN_STATUS_META.review, title: "Learn" },
  done: { ...KANBAN_STATUS_META.done, title: "Validated" },
};
const LEAN_STATUS_ORDER = ["backlog", "todo", "testing", "review", "done"];

// === Public API (keeps your original named exports for backwards-compat) ===
export const STATUS_META_BY_METHOD = {
  [METHODOLOGIES.KANBAN]: KANBAN_STATUS_META,
  [METHODOLOGIES.SCRUM]: SCRUM_STATUS_META,
  [METHODOLOGIES.AGILE]: AGILE_STATUS_META,
  [METHODOLOGIES.WATERFALL]: WATERFALL_STATUS_META,
  [METHODOLOGIES.LEAN]: LEAN_STATUS_META,
};

export const STATUS_ORDER_BY_METHOD = {
  [METHODOLOGIES.KANBAN]: KANBAN_STATUS_ORDER,
  [METHODOLOGIES.SCRUM]: SCRUM_STATUS_ORDER,
  [METHODOLOGIES.AGILE]: AGILE_STATUS_ORDER,
  [METHODOLOGIES.WATERFALL]: WATERFALL_STATUS_ORDER,
  [METHODOLOGIES.LEAN]: LEAN_STATUS_ORDER,
};

export function getStatusMeta(methodology) {
  return STATUS_META_BY_METHOD[methodology] || STATUS_META_BY_METHOD[DEFAULT_METHOD];
}

export function getStatusOrder(methodology) {
  return STATUS_ORDER_BY_METHOD[methodology] || STATUS_ORDER_BY_METHOD[DEFAULT_METHOD];
}

export function normalizeTasksForMethod(tasksByStatus, methodology) {
  const order = getStatusOrder(methodology);
  const shape = {};
  order.forEach((k) => (shape[k] = Array.isArray(tasksByStatus?.[k]) ? tasksByStatus[k] : []));
  return shape;
}

export function mapLegacyStatusToMethod(status, methodology) {
  const order = getStatusOrder(methodology);
  if (order.includes(status)) return status;
  const map = {
    todo: order[0] || status,
    backlog: order[0] || status,
    inprogress: order[1] || status,
    review: order[order.length - 2] || status,
    done: order[order.length - 1] || status,
  };
  return map[status] || order[0] || status;
}

// Backwards-compat default exports for your existing imports
export const STATUS_META = KANBAN_STATUS_META;
export const BOARD_STATUS_ORDER = KANBAN_STATUS_ORDER;
