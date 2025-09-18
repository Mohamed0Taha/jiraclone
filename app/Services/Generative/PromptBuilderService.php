<?php

namespace App\Services\Generative;

class PromptBuilderService
{
    public function buildCreatePrompt(
        string $userMessage,
        string $contextData,
        array $uiAnalysis,
        string $designInspiration,
        string $designGuidance,
        string $designReferences
    ): string {
        $blueprint = strtolower((string)($uiAnalysis['blueprint_source'] ?? ''));

        $canonicalContract = '';
        if ($blueprint === 'calculator') {
            $canonicalContract = "\n\nCANONICAL LAYOUT CONTRACT (CALCULATOR):\n- Replicate Google Calculator layout exactly.\n- Use a 4x5 keypad grid: rows [7 8 9 ÷], [4 5 6 ×], [1 2 3 −], [0 spans bottom-left two cells, ., =], operators in the right-most column.\n- Two-zone display: small expression line above, large right-aligned result below.\n- Provide AC, C, backspace, percent, +/- controls in a distinct utility row.\n- Use `Grid` or `Stack` to achieve the grid; DO NOT render digits in a single row.\n- Include keyboard input support for digits and operators.\n- Style operators with accent buttons (Primary/Success variants).";
        } elseif ($blueprint === 'calendar') {
            $canonicalContract = "\n\nCANONICAL LAYOUT CONTRACT (CALENDAR):\n- Mirror Google Calendar (desktop) month view.\n- MUST use Templates.Calendar (AI SDK) and ensure the template loads react-big-calendar via useExternalFactory('react-big-calendar'); never build a custom grid.\n- Render a 7 x 6 month grid with weekday headers; Monday start.\n- Include Day/Week/Month segmented controls and a Today button.\n- Populate realistic sample events (chips) using Google color palette.\n- Add a right-hand agenda panel with upcoming events.\n- Ensure keyboard navigation between days and proper aria attributes.";
        }

        return "You are an expert React developer creating a high-quality {$userMessage} component.\n\nENHANCED DESIGN REQUIREMENTS:\nUse this analysis to create a professional, well-designed component:\n\nUI ELEMENTS TO INCLUDE:\n" . implode("\n- ", $uiAnalysis['ui_elements']) . "\n\nLAYOUT SUGGESTIONS:\n" . implode("\n- ", $uiAnalysis['layout_suggestions']) . "\n\nDESIGN STYLE: {$uiAnalysis['design_style']}\n\n{$designInspiration}\n\n{$designGuidance}{$canonicalContract}\n\nDESIGN VERIFICATION REFERENCES:\n{$designReferences}\n\nCRITICAL REQUIREMENTS:\n1. **NEVER import StyledComponents, MuiMaterial, or MuiIcons - they are automatically available**\n2. **ONLY import React hooks: import React, { useState, useEffect } from 'react';**\n3. **Use Material-UI components for professional appearance**\n4. **Include ALL UI elements from the analysis above**\n5. **Create a polished, production-ready interface**\n6. **Use useEmbeddedData hook for ALL persistent data**\n7. **Include full CRUD operations (Create, Read, Update, Delete)**\n8. **Focus 87% on data display, 13% on input controls**\n9. **Use ContentContainer, BeautifulCard, SectionHeader from StyledComponents**\n10. **Track current user for all operations**\n\nAVAILABLE COMPONENTS (no imports needed):\n- Material-UI: Button, TextField, Select, Card, Typography, Grid, Stack, etc.\n- Icons: AddIcon, EditIcon, DeleteIcon, SaveIcon, etc.\n- StyledComponents: ContentContainer, BeautifulCard, SectionHeader, PrimaryButton, etc.\n- Charts: BarChart, LineChart, PieChart from Recharts\n\nPROJECT CONTEXT:\n{$contextData}\n\nUSER REQUEST: \"{$userMessage}\"\n\nCreate a complete, functional React component that implements the requested functionality with professional design and all the UI elements identified in the analysis. Make it look like a production-ready application, not a minimal demo.\n\nBefore writing JSX, mentally validate the layout against the checklist and the CANONICAL LAYOUT CONTRACT above. If a required element is missing, adjust the plan so the final UI reflects common real-world implementations.\n\nReturn ONLY the complete React component code - no explanations, no markdown formatting.";
    }

    public function buildUpdatePrompt(
        string $userRequest,
        string $currentComponentCode,
        string $contextData,
        string $designGuidance
    ): string {
        $lower = strtolower($userRequest);
        $canonicalContract = '';
        if (str_contains($lower, 'calculator')) {
            $canonicalContract = "\n\nSTRICT LAYOUT CONTRACT (CALCULATOR):\n- Enforce a 4x5 keypad grid with operators in a dedicated right column.\n- Two-line display area (expression + result), right-aligned digits.\n- Utility row with AC, C, backspace, percent, +/- controls.\n- Do NOT render digits as a single horizontal strip.";
        } elseif (str_contains($lower, 'calendar')) {
            $canonicalContract = "\n\nSTRICT LAYOUT CONTRACT (CALENDAR):\n- Use Templates.Calendar (AI SDK) and rely on its built-in useExternalFactory('react-big-calendar').\n- Month view with 7x6 grid, weekday headers, Monday start.\n- Include Today button, Day/Week/Month segmented control, right-side agenda panel.";
        }

        return "You are an expert React developer specializing in updating and modifying existing data-focused micro-applications.\n\nMODIFICATION TASK:\nThe user wants to modify an EXISTING React component. Your job is to update the current component according to their request while preserving working functionality.\n\nCRITICAL REQUIREMENTS FOR UPDATES:\n1. PRESERVE existing component structure and working features unless explicitly asked to change them\n2. MAINTAIN all current state management and data initialization patterns\n3. **CONTINUE to use the provided REAL DATA - never switch to API calls or hardcoded arrays**\n4. Keep the same data-focused design principles (87% display, 13% controls)\n5. Only modify the specific aspects mentioned in the user's request\n6. Ensure backward compatibility with existing data flow\n7. Maintain responsive design and existing styling patterns\n8. Uphold the enterprise design system: keep using StyledComponents helpers (ContentContainer, BeautifulCard, SectionHeader, PrimaryButton/SuccessButton/DangerButton) or upgrade raw elements to them as part of the change\n9. Replace any plain HTML controls (button, input, select) introduced by the request with the polished Material UI or StyledComponents equivalents so the surface stays professional\n10. Use useExternalFactory('<name>') when introducing calendar, sticky notes, or other advanced libraries so the AI SDK factory handles loading — never import npm packages directly\n\n{$designGuidance}{$canonicalContract}\n\nCURRENT COMPONENT CODE:\n```jsx\n{$currentComponentCode}\n```\n\nPROJECT CONTEXT (for reference):\n{$contextData}\n\nUSER MODIFICATION REQUEST: \"{$userRequest}\"\n\nRESPONSE FORMAT:\nProvide ONLY the UPDATED complete React component code (TSX/JSX) that:\n- Incorporates the user's requested changes\n- Preserves all working functionality not mentioned in the request\n- Continues to use the REAL DATA from project context\n- Maintains the same data initialization patterns\n- Exports a default component via `export default function Name() { ... }`\n- Persists user data changes using the provided helpers: `saveViewData(key, data)` and `loadViewData(key)`\n- No explanations, no markdown - just the working JSX component ready for immediate use\n\nRemember: This is an UPDATE, not a complete rewrite. Preserve what works, modify only what's requested.";
    }
}
