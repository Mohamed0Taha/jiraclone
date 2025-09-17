<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/**
 * ComponentDesignValidationService - Validates generated components against standard design patterns
 * Ensures components follow established UI conventions and user expectations
 */
class ComponentDesignValidationService
{
    private ComponentLibraryService $componentLibraryService;

    public function __construct(ComponentLibraryService $componentLibraryService)
    {
        $this->componentLibraryService = $componentLibraryService;
    }

    /**
     * Get standard component designs and templates
     */
    public function getStandardComponentDesigns(): array
    {
        return [
            'calculator' => [
                'name' => 'Standard Calculator',
                'description' => 'Calculator with proper button layout, display area, and standard operations',
                'requirements' => [
                    'display_area' => 'Read-only input field for showing numbers and results',
                    'number_buttons' => 'Buttons 0-9 in standard 3x4 grid layout',
                    'operation_buttons' => 'Basic operations: +, -, *, / (÷)',
                    'function_buttons' => 'Clear (C), Equals (=), Decimal (.)',
                    'additional_buttons' => 'Backspace (⌫) for correction',
                    'layout' => 'Grid layout with display at top and buttons below',
                    'styling' => 'Professional button styling with hover effects'
                ],
                'expected_features' => [
                    'number_input',
                    'basic_arithmetic',
                    'clear_function',
                    'decimal_support',
                    'error_handling',
                    'keyboard_support'
                ],
                'ui_patterns' => [
                    'display_readonly',
                    'button_grid',
                    'responsive_layout',
                    'visual_feedback'
                ]
            ],
            'form' => [
                'name' => 'Standard Form',
                'description' => 'Form with proper validation, labels, and user feedback',
                'requirements' => [
                    'form_labels' => 'Clear labels for all input fields',
                    'validation' => 'Client-side and server-side validation',
                    'error_display' => 'Clear error messages near relevant fields',
                    'submit_button' => 'Primary action button for form submission',
                    'reset_option' => 'Option to clear/reset form data',
                    'loading_states' => 'Visual feedback during submission'
                ],
                'expected_features' => [
                    'input_validation',
                    'error_handling',
                    'form_submission',
                    'user_feedback',
                    'accessibility'
                ],
                'ui_patterns' => [
                    'label_input_pairs',
                    'error_messages',
                    'submit_buttons',
                    'loading_indicators'
                ]
            ],
            'data_table' => [
                'name' => 'Standard Data Table',
                'description' => 'Data table with sorting, filtering, and pagination',
                'requirements' => [
                    'table_headers' => 'Clear column headers with sorting indicators',
                    'row_data' => 'Properly formatted data in rows',
                    'sorting' => 'Click headers to sort columns',
                    'filtering' => 'Search/filter functionality',
                    'pagination' => 'Navigation for large datasets',
                    'actions' => 'Edit/delete actions for rows'
                ],
                'expected_features' => [
                    'data_display',
                    'sorting',
                    'filtering',
                    'pagination',
                    'row_actions',
                    'responsive_design'
                ],
                'ui_patterns' => [
                    'table_structure',
                    'interactive_headers',
                    'action_buttons',
                    'pagination_controls'
                ]
            ],
            'dashboard' => [
                'name' => 'Standard Dashboard',
                'description' => 'Dashboard with metrics, charts, and key information',
                'requirements' => [
                    'key_metrics' => 'Important numbers displayed prominently',
                    'charts_graphs' => 'Visual representation of data trends',
                    'grid_layout' => 'Organized grid of information cards',
                    'refresh_option' => 'Ability to update data',
                    'responsive_design' => 'Works on different screen sizes'
                ],
                'expected_features' => [
                    'metric_display',
                    'data_visualization',
                    'real_time_updates',
                    'responsive_layout',
                    'navigation'
                ],
                'ui_patterns' => [
                    'card_layout',
                    'chart_components',
                    'metric_widgets',
                    'grid_system'
                ]
            ]
        ];
    }

    /**
     * Validate a user request against standard component patterns
     */
    public function validateComponentRequest(string $userRequest): array
    {
        $userRequest = strtolower($userRequest);
        $standardDesigns = $this->getStandardComponentDesigns();
        $detectedComponents = [];
        $recommendations = [];

        Log::info('ComponentDesignValidation: Analyzing user request', [
            'request' => $userRequest,
            'length' => strlen($userRequest)
        ]);

        // Detect standard components in the request
        foreach ($standardDesigns as $componentType => $design) {
            if (preg_match('/\b' . preg_quote($componentType, '/') . '\b/', $userRequest)) {
                $detectedComponents[] = $componentType;
                $recommendations[] = [
                    'component_type' => $componentType,
                    'standard_design' => $design,
                    'should_use_standard' => true,
                    'reason' => "Detected '{$componentType}' - this has well-established design patterns"
                ];
                
                Log::info('ComponentDesignValidation: Standard component detected', [
                    'component_type' => $componentType,
                    'component_name' => $design['name']
                ]);
            }
        }

        // Special case handling for common synonyms
        $synonyms = [
            'calc' => 'calculator',
            'computation' => 'calculator', 
            'compute' => 'calculator',
            'table' => 'data_table',
            'list' => 'data_table',
            'grid' => 'data_table',
            'dashboard' => 'dashboard',
            'metrics' => 'dashboard',
            'stats' => 'dashboard'
        ];

        foreach ($synonyms as $synonym => $standardType) {
            if (preg_match('/\b' . preg_quote($synonym, '/') . '\b/', $userRequest) && 
                !in_array($standardType, $detectedComponents)) {
                
                $detectedComponents[] = $standardType;
                $recommendations[] = [
                    'component_type' => $standardType,
                    'standard_design' => $standardDesigns[$standardType],
                    'should_use_standard' => true,
                    'reason' => "Detected '{$synonym}' which maps to standard '{$standardType}' component"
                ];

                Log::info('ComponentDesignValidation: Synonym detected', [
                    'synonym' => $synonym,
                    'maps_to' => $standardType
                ]);
            }
        }

        return [
            'has_standard_components' => !empty($detectedComponents),
            'detected_components' => $detectedComponents,
            'recommendations' => $recommendations,
            'should_validate_output' => !empty($detectedComponents)
        ];
    }

    /**
     * Validate generated component code against standard design requirements
     */
    public function validateGeneratedComponent(string $componentCode, array $detectedComponents): array
    {
        $validationResults = [];
        $overallScore = 100;
        $issues = [];
        $suggestions = [];

        Log::info('ComponentDesignValidation: Validating generated component', [
            'code_length' => strlen($componentCode),
            'detected_components' => $detectedComponents
        ]);

        foreach ($detectedComponents as $componentType) {
            $standardDesign = $this->getStandardComponentDesigns()[$componentType] ?? null;
            if (!$standardDesign) continue;

            $componentValidation = $this->validateSpecificComponent($componentCode, $componentType, $standardDesign);
            $validationResults[$componentType] = $componentValidation;

            // Reduce overall score based on missing requirements
            $missingCount = count($componentValidation['missing_requirements']);
            $requirementCount = count($standardDesign['requirements']);
            $componentScore = $requirementCount > 0 ? 
                (($requirementCount - $missingCount) / $requirementCount) * 100 : 100;
            
            $overallScore = min($overallScore, $componentScore);

            // Collect issues and suggestions
            $issues = array_merge($issues, $componentValidation['issues']);
            $suggestions = array_merge($suggestions, $componentValidation['suggestions']);
        }

        $validationPassed = $overallScore >= 70; // 70% threshold for passing

        Log::info('ComponentDesignValidation: Validation completed', [
            'overall_score' => $overallScore,
            'validation_passed' => $validationPassed,
            'issues_count' => count($issues),
            'suggestions_count' => count($suggestions)
        ]);

        return [
            'validation_passed' => $validationPassed,
            'overall_score' => $overallScore,
            'component_results' => $validationResults,
            'issues' => $issues,
            'suggestions' => $suggestions,
            'summary' => $this->generateValidationSummary($overallScore, $issues, $suggestions)
        ];
    }

    /**
     * Validate a specific component type within the generated code
     */
    private function validateSpecificComponent(string $componentCode, string $componentType, array $standardDesign): array
    {
        $issues = [];
        $suggestions = [];
        $missingRequirements = [];
        $presentFeatures = [];

        switch ($componentType) {
            case 'calculator':
                return $this->validateCalculatorComponent($componentCode, $standardDesign);
            case 'form':
                return $this->validateFormComponent($componentCode, $standardDesign);
            case 'data_table':
                return $this->validateDataTableComponent($componentCode, $standardDesign);
            case 'dashboard':
                return $this->validateDashboardComponent($componentCode, $standardDesign);
            default:
                return $this->validateGenericComponent($componentCode, $standardDesign);
        }
    }

    /**
     * Validate calculator-specific requirements
     */
    private function validateCalculatorComponent(string $componentCode, array $standardDesign): array
    {
        $issues = [];
        $suggestions = [];
        $missingRequirements = [];
        $presentFeatures = [];

        // Check for display area
        if (!preg_match('/input[^>]*readonly|display|screen/i', $componentCode)) {
            $missingRequirements[] = 'display_area';
            $issues[] = 'Calculator missing read-only display area for showing numbers and results';
            $suggestions[] = 'Add a read-only input field or display element for calculator output';
        } else {
            $presentFeatures[] = 'display_area';
        }

        // Check for number buttons (0-9)
        $numberButtonCount = preg_match_all('/(?:onClick|onclick)[^>]*["\'].*?[0-9].*?["\']|button[^>]*>[^<]*[0-9]/i', $componentCode);
        if ($numberButtonCount < 10) {
            $missingRequirements[] = 'number_buttons';
            $issues[] = 'Calculator missing complete set of number buttons (0-9)';
            $suggestions[] = 'Add buttons for all digits 0-9 in a standard grid layout';
        } else {
            $presentFeatures[] = 'number_buttons';
        }

        // Check for operation buttons
        $hasAddition = preg_match('/\+/', $componentCode);
        $hasSubtraction = preg_match('/\-/', $componentCode);
        $hasMultiplication = preg_match('/[\*×]/', $componentCode);
        $hasDivision = preg_match('/[\/÷]/', $componentCode);

        if (!($hasAddition && $hasSubtraction && $hasMultiplication && $hasDivision)) {
            $missingRequirements[] = 'operation_buttons';
            $issues[] = 'Calculator missing one or more basic operations (+, -, *, /)';
            $suggestions[] = 'Include all four basic arithmetic operation buttons';
        } else {
            $presentFeatures[] = 'operation_buttons';
        }

        // Check for function buttons
        $hasClear = preg_match('/clear|C["\']|reset/i', $componentCode);
        $hasEquals = preg_match('/equals|=/', $componentCode);
        
        if (!$hasClear) {
            $missingRequirements[] = 'clear_function';
            $issues[] = 'Calculator missing clear/reset functionality';
            $suggestions[] = 'Add a clear (C) button to reset the calculator';
        }

        if (!$hasEquals) {
            $missingRequirements[] = 'equals_function';
            $issues[] = 'Calculator missing equals button for computing results';
            $suggestions[] = 'Add an equals (=) button to calculate and display results';
        }

        if ($hasClear && $hasEquals) {
            $presentFeatures[] = 'function_buttons';
        }

        // Check for decimal support
        if (!preg_match('/\.|\bdecimal\b/', $componentCode)) {
            $missingRequirements[] = 'decimal_support';
            $suggestions[] = 'Consider adding decimal point (.) button for non-integer calculations';
        } else {
            $presentFeatures[] = 'decimal_support';
        }

        // Check for proper layout structure
        if (!preg_match('/grid|table|calculator-buttons|button-grid/i', $componentCode)) {
            $missingRequirements[] = 'proper_layout';
            $issues[] = 'Calculator buttons should be arranged in a proper grid layout';
            $suggestions[] = 'Use CSS Grid or similar to arrange buttons in a standard calculator layout';
        } else {
            $presentFeatures[] = 'layout';
        }

        return [
            'issues' => $issues,
            'suggestions' => $suggestions,
            'missing_requirements' => $missingRequirements,
            'present_features' => $presentFeatures,
            'component_score' => $this->calculateComponentScore(count($standardDesign['requirements']), count($missingRequirements))
        ];
    }

    /**
     * Validate form component requirements
     */
    private function validateFormComponent(string $componentCode, array $standardDesign): array
    {
        $issues = [];
        $suggestions = [];
        $missingRequirements = [];
        $presentFeatures = [];

        // Check for form element
        if (!preg_match('/<form[^>]*>/', $componentCode)) {
            $missingRequirements[] = 'form_element';
            $issues[] = 'Missing proper form element structure';
            $suggestions[] = 'Wrap form inputs in a <form> element for proper semantics';
        } else {
            $presentFeatures[] = 'form_element';
        }

        // Check for labels
        if (!preg_match('/<label[^>]*>|label.*for=/', $componentCode)) {
            $missingRequirements[] = 'form_labels';
            $issues[] = 'Form inputs should have associated labels for accessibility';
            $suggestions[] = 'Add <label> elements for all form inputs';
        } else {
            $presentFeatures[] = 'form_labels';
        }

        // Check for validation
        if (!preg_match('/required|validation|error/i', $componentCode)) {
            $missingRequirements[] = 'validation';
            $suggestions[] = 'Consider adding form validation for better user experience';
        } else {
            $presentFeatures[] = 'validation';
        }

        // Check for submit button
        if (!preg_match('/type=["\']submit["\']|submit.*button/i', $componentCode)) {
            $missingRequirements[] = 'submit_button';
            $issues[] = 'Form should have a clear submit button';
            $suggestions[] = 'Add a submit button to allow form submission';
        } else {
            $presentFeatures[] = 'submit_button';
        }

        return [
            'issues' => $issues,
            'suggestions' => $suggestions,
            'missing_requirements' => $missingRequirements,
            'present_features' => $presentFeatures,
            'component_score' => $this->calculateComponentScore(count($standardDesign['requirements']), count($missingRequirements))
        ];
    }

    /**
     * Validate data table component requirements
     */
    private function validateDataTableComponent(string $componentCode, array $standardDesign): array
    {
        $issues = [];
        $suggestions = [];
        $missingRequirements = [];
        $presentFeatures = [];

        // Check for table structure
        if (!preg_match('/<table[^>]*>.*<thead.*<tbody/s', $componentCode)) {
            $missingRequirements[] = 'table_structure';
            $issues[] = 'Data table should have proper table, thead, and tbody structure';
            $suggestions[] = 'Use semantic HTML table elements with thead and tbody';
        } else {
            $presentFeatures[] = 'table_structure';
        }

        // Check for sorting functionality
        if (!preg_match('/sort|onclick.*sort|sortBy/i', $componentCode)) {
            $missingRequirements[] = 'sorting';
            $suggestions[] = 'Consider adding column sorting functionality';
        } else {
            $presentFeatures[] = 'sorting';
        }

        // Check for search/filtering
        if (!preg_match('/search|filter|input.*search/i', $componentCode)) {
            $missingRequirements[] = 'filtering';
            $suggestions[] = 'Add search/filter functionality for better data navigation';
        } else {
            $presentFeatures[] = 'filtering';
        }

        // Check for pagination
        if (!preg_match('/pagination|page|next|previous/i', $componentCode)) {
            $missingRequirements[] = 'pagination';
            $suggestions[] = 'Consider adding pagination for large datasets';
        } else {
            $presentFeatures[] = 'pagination';
        }

        return [
            'issues' => $issues,
            'suggestions' => $suggestions,
            'missing_requirements' => $missingRequirements,
            'present_features' => $presentFeatures,
            'component_score' => $this->calculateComponentScore(count($standardDesign['requirements']), count($missingRequirements))
        ];
    }

    /**
     * Validate dashboard component requirements
     */
    private function validateDashboardComponent(string $componentCode, array $standardDesign): array
    {
        $issues = [];
        $suggestions = [];
        $missingRequirements = [];
        $presentFeatures = [];

        // Check for metrics display
        if (!preg_match('/metric|stat|count|value/i', $componentCode)) {
            $missingRequirements[] = 'key_metrics';
            $suggestions[] = 'Add key metrics or statistics to the dashboard';
        } else {
            $presentFeatures[] = 'key_metrics';
        }

        // Check for charts/graphs
        if (!preg_match('/chart|graph|canvas|svg|Chart/i', $componentCode)) {
            $missingRequirements[] = 'charts_graphs';
            $suggestions[] = 'Consider adding charts or graphs for data visualization';
        } else {
            $presentFeatures[] = 'charts_graphs';
        }

        // Check for grid layout
        if (!preg_match('/grid|Grid|dashboard.*grid|card.*grid/i', $componentCode)) {
            $missingRequirements[] = 'grid_layout';
            $suggestions[] = 'Use a grid layout to organize dashboard components';
        } else {
            $presentFeatures[] = 'grid_layout';
        }

        return [
            'issues' => $issues,
            'suggestions' => $suggestions,
            'missing_requirements' => $missingRequirements,
            'present_features' => $presentFeatures,
            'component_score' => $this->calculateComponentScore(count($standardDesign['requirements']), count($missingRequirements))
        ];
    }

    /**
     * Generic component validation for non-specific types
     */
    private function validateGenericComponent(string $componentCode, array $standardDesign): array
    {
        return [
            'issues' => [],
            'suggestions' => ['Component does not match known standard patterns - validation skipped'],
            'missing_requirements' => [],
            'present_features' => [],
            'component_score' => 85 // Neutral score for unknown components
        ];
    }

    /**
     * Calculate component score based on requirements fulfilled
     */
    private function calculateComponentScore(int $totalRequirements, int $missingRequirements): float
    {
        if ($totalRequirements === 0) return 100;
        return (($totalRequirements - $missingRequirements) / $totalRequirements) * 100;
    }

    /**
     * Generate a human-readable validation summary
     */
    private function generateValidationSummary(float $score, array $issues, array $suggestions): string
    {
        if ($score >= 90) {
            $grade = 'Excellent';
            $message = 'Component follows standard design patterns very well.';
        } elseif ($score >= 70) {
            $grade = 'Good';
            $message = 'Component mostly follows standard patterns with minor improvements needed.';
        } elseif ($score >= 50) {
            $grade = 'Fair';
            $message = 'Component has some standard elements but needs significant improvements.';
        } else {
            $grade = 'Poor';
            $message = 'Component does not follow standard design patterns and needs major revisions.';
        }

        $summary = "{$grade} (Score: {$score}%) - {$message}";
        
        if (!empty($issues)) {
            $summary .= " Issues found: " . count($issues);
        }
        
        if (!empty($suggestions)) {
            $summary .= " Suggestions available: " . count($suggestions);
        }

        return $summary;
    }

    /**
     * Get enhanced component template with standard design patterns
     */
    public function getStandardComponentTemplate(string $componentType): ?string
    {
        switch ($componentType) {
            case 'calculator':
                return $this->getStandardCalculatorTemplate();
            case 'form':
                return $this->getStandardFormTemplate();
            case 'data_table':
                return $this->getStandardDataTableTemplate();
            case 'dashboard':
                return $this->getStandardDashboardTemplate();
            default:
                return null;
        }
    }

    /**
     * Enhanced standard calculator template with proper design patterns
     */
    private function getStandardCalculatorTemplate(): string
    {
        return '
import React, { useState } from \'react\';

export default function StandardCalculator() {
    const { ContentContainer, BeautifulCard, SectionHeader } = StyledComponents;
    const [display, setDisplay] = useState("0");
    const [previousValue, setPreviousValue] = useState(null);
    const [operation, setOperation] = useState(null);
    const [waitingForOperand, setWaitingForOperand] = useState(false);

    const inputNumber = (num) => {
        if (waitingForOperand) {
            setDisplay(String(num));
            setWaitingForOperand(false);
        } else {
            setDisplay(display === "0" ? String(num) : display + num);
        }
    };

    const inputDecimal = () => {
        if (waitingForOperand) {
            setDisplay("0.");
            setWaitingForOperand(false);
        } else if (display.indexOf(".") === -1) {
            setDisplay(display + ".");
        }
    };

    const clear = () => {
        setDisplay("0");
        setPreviousValue(null);
        setOperation(null);
        setWaitingForOperand(false);
    };

    const performOperation = (nextOperation) => {
        const inputValue = parseFloat(display);

        if (previousValue === null) {
            setPreviousValue(inputValue);
        } else if (operation) {
            const currentValue = previousValue || 0;
            const result = calculate(currentValue, inputValue, operation);

            setDisplay(String(result));
            setPreviousValue(result);
        }

        setWaitingForOperand(true);
        setOperation(nextOperation);
    };

    const calculate = (firstValue, secondValue, operation) => {
        switch (operation) {
            case "+": return firstValue + secondValue;
            case "-": return firstValue - secondValue;
            case "×": return firstValue * secondValue;
            case "÷": return firstValue / secondValue;
            case "=": return secondValue;
            default: return secondValue;
        }
    };

    const handleKeyPress = (event) => {
        const { key } = event;
        if (key >= "0" && key <= "9") {
            inputNumber(parseInt(key));
        } else if (key === ".") {
            inputDecimal();
        } else if (key === "+") {
            performOperation("+");
        } else if (key === "-") {
            performOperation("-");
        } else if (key === "*") {
            performOperation("×");
        } else if (key === "/") {
            event.preventDefault();
            performOperation("÷");
        } else if (key === "Enter" || key === "=") {
            performOperation("=");
        } else if (key === "Escape" || key === "c" || key === "C") {
            clear();
        } else if (key === "Backspace") {
            if (display.length > 1) {
                setDisplay(display.slice(0, -1));
            } else {
                setDisplay("0");
            }
        }
    };

    // Add keyboard event listener
    React.useEffect(() => {
        document.addEventListener("keydown", handleKeyPress);
        return () => document.removeEventListener("keydown", handleKeyPress);
    }, [display, operation, previousValue, waitingForOperand]);

    return (
        <ContentContainer maxWidth="sm" sx={{ py: designTokens.spacing.xl }}>
            <BeautifulCard sx={{ padding: designTokens.spacing.xl }}>
                <SectionHeader>Standard Calculator</SectionHeader>
                
                {/* Calculator Display */}
                <Box sx={{ 
                    mb: designTokens.spacing.lg,
                    p: designTokens.spacing.md,
                    background: designTokens.colors.neutral[900],
                    borderRadius: designTokens.borderRadius.md,
                    border: `2px solid ${designTokens.colors.neutral[300]}`
                }}>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            color: designTokens.colors.neutral[50],
                            textAlign: "right",
                            fontFamily: "monospace",
                            minHeight: "40px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            wordBreak: "break-all"
                        }}
                    >
                        {display}
                    </Typography>
                </Box>

                {/* Calculator Button Grid */}
                <Box sx={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(4, 1fr)", 
                    gap: designTokens.spacing.sm,
                    "& button": {
                        height: "60px",
                        fontSize: "1.2rem",
                        fontWeight: 600,
                        borderRadius: designTokens.borderRadius.md,
                        border: `1px solid ${designTokens.colors.neutral[300]}`,
                        transition: "all 0.2s ease",
                        "&:hover": {
                            transform: "translateY(-1px)",
                            boxShadow: designTokens.shadows.md
                        },
                        "&:active": {
                            transform: "translateY(0)"
                        }
                    }
                }}>
                    {/* Row 1: Clear, Backspace, Operations */}
                    <Button 
                        variant="contained" 
                        color="error" 
                        onClick={clear}
                        sx={{ gridColumn: "span 2" }}
                    >
                        Clear
                    </Button>
                    <Button 
                        variant="outlined" 
                        onClick={() => {
                            if (display.length > 1) {
                                setDisplay(display.slice(0, -1));
                            } else {
                                setDisplay("0");
                            }
                        }}
                    >
                        ⌫
                    </Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => performOperation("÷")}
                    >
                        ÷
                    </Button>

                    {/* Row 2: 7, 8, 9, × */}
                    <Button variant="outlined" onClick={() => inputNumber(7)}>7</Button>
                    <Button variant="outlined" onClick={() => inputNumber(8)}>8</Button>
                    <Button variant="outlined" onClick={() => inputNumber(9)}>9</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => performOperation("×")}
                    >
                        ×
                    </Button>

                    {/* Row 3: 4, 5, 6, - */}
                    <Button variant="outlined" onClick={() => inputNumber(4)}>4</Button>
                    <Button variant="outlined" onClick={() => inputNumber(5)}>5</Button>
                    <Button variant="outlined" onClick={() => inputNumber(6)}>6</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => performOperation("-")}
                    >
                        -
                    </Button>

                    {/* Row 4: 1, 2, 3, + */}
                    <Button variant="outlined" onClick={() => inputNumber(1)}>1</Button>
                    <Button variant="outlined" onClick={() => inputNumber(2)}>2</Button>
                    <Button variant="outlined" onClick={() => inputNumber(3)}>3</Button>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={() => performOperation("+")}
                        sx={{ gridRow: "span 2" }}
                    >
                        +
                    </Button>

                    {/* Row 5: 0, ., = */}
                    <Button 
                        variant="outlined" 
                        onClick={() => inputNumber(0)}
                        sx={{ gridColumn: "span 2" }}
                    >
                        0
                    </Button>
                    <Button variant="outlined" onClick={inputDecimal}>.</Button>
                    
                    {/* Equals button */}
                    <Button 
                        variant="contained" 
                        color="success" 
                        onClick={() => performOperation("=")}
                        sx={{ 
                            gridColumn: "4",
                            gridRow: "6"
                        }}
                    >
                        =
                    </Button>
                </Box>

                {/* Keyboard Support Notice */}
                <Typography 
                    variant="caption" 
                    sx={{ 
                        mt: designTokens.spacing.md,
                        textAlign: "center",
                        color: designTokens.colors.neutral[600],
                        display: "block"
                    }}
                >
                    Keyboard supported: Numbers, +, -, *, /, Enter, Escape, Backspace
                </Typography>
            </BeautifulCard>
        </ContentContainer>
    );
}';
    }

    /**
     * Other standard templates would go here...
     */
    private function getStandardFormTemplate(): string
    {
        // Return standard form template
        return $this->componentLibraryService->getComponentTemplate('basic_form');
    }

    private function getStandardDataTableTemplate(): string
    {
        // Return standard data table template  
        return $this->componentLibraryService->getComponentTemplate('data_table');
    }

    private function getStandardDashboardTemplate(): string
    {
        // Return standard dashboard template
        return $this->componentLibraryService->getComponentTemplate('dashboard_grid');
    }
}