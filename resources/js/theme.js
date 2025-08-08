import { createTheme } from "@mui/material/styles";
import { red } from "@mui/material/colors";

const rainbow = [
    "#f44336", // Red
    "#ff9800", // Orange
    "#ffeb3b", // Yellow
    "#4caf50", // Green
    "#009688", // Teal
    "#2196f3", // Blue
    "#3f51b5", // Indigo
    "#9c27b0", // Purple
];

export default createTheme({
    palette: {
        mode: "light",
        primary: { main: rainbow[5], contrastText: "#fff" },
        secondary: { main: rainbow[1], contrastText: "#fff" },
        error: { main: red.A400 },
        background: { default: "#fafafa", paper: "#fff" },
        rainbow,
    },
});
