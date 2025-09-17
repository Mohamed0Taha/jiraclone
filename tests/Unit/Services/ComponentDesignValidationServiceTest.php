<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ComponentDesignValidationService;
use App\Services\ComponentLibraryService;
use Illuminate\Support\Facades\Log;

class ComponentDesignValidationServiceTest extends TestCase
{
    private ComponentDesignValidationService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        $componentLibraryService = new ComponentLibraryService();
        $this->service = new ComponentDesignValidationService($componentLibraryService);
    }

    public function test_validates_calculator_request()
    {
        $result = $this->service->validateComponentRequest('create a calculator for basic math operations');
        
        $this->assertTrue($result['has_standard_components']);
        $this->assertContains('calculator', $result['detected_components']);
        $this->assertTrue($result['should_validate_output']);
        $this->assertNotEmpty($result['recommendations']);
    }

    public function test_validates_form_request()
    {
        $result = $this->service->validateComponentRequest('I need a form to collect user feedback');
        
        $this->assertTrue($result['has_standard_components']);
        $this->assertContains('form', $result['detected_components']);
        $this->assertTrue($result['should_validate_output']);
    }

    public function test_validates_table_request()
    {
        $result = $this->service->validateComponentRequest('build a data table to display user information');
        
        $this->assertTrue($result['has_standard_components']);
        $this->assertContains('data_table', $result['detected_components']);
        $this->assertTrue($result['should_validate_output']);
    }

    public function test_detects_synonyms()
    {
        $result = $this->service->validateComponentRequest('create a calc tool for computations');
        
        $this->assertTrue($result['has_standard_components']);
        $this->assertContains('calculator', $result['detected_components']);
    }

    public function test_validates_standard_calculator_component()
    {
        $calculatorComponent = '
        import React, { useState } from "react";
        
        export default function Calculator() {
            const [display, setDisplay] = useState("0");
            
            const inputNumber = (num) => {
                setDisplay(display === "0" ? String(num) : display + num);
            };
            
            const clear = () => {
                setDisplay("0");
            };
            
            const calculate = () => {
                try {
                    const result = eval(display);
                    setDisplay(String(result));
                } catch (error) {
                    setDisplay("Error");
                }
            };
            
            return (
                <div className="calculator">
                    <input type="text" value={display} readOnly />
                    <div className="calculator-buttons">
                        <button onClick={clear}>C</button>
                        <button onClick={() => inputNumber(7)}>7</button>
                        <button onClick={() => inputNumber(8)}>8</button>
                        <button onClick={() => inputNumber(9)}>9</button>
                        <button onClick={() => setDisplay(display + "/")}>÷</button>
                        <button onClick={() => inputNumber(4)}>4</button>
                        <button onClick={() => inputNumber(5)}>5</button>
                        <button onClick={() => inputNumber(6)}>6</button>
                        <button onClick={() => setDisplay(display + "*")}>×</button>
                        <button onClick={() => inputNumber(1)}>1</button>
                        <button onClick={() => inputNumber(2)}>2</button>
                        <button onClick={() => inputNumber(3)}>3</button>
                        <button onClick={() => setDisplay(display + "-")}>-</button>
                        <button onClick={() => inputNumber(0)}>0</button>
                        <button onClick={() => setDisplay(display + ".")}>.</button>
                        <button onClick={calculate}>=</button>
                        <button onClick={() => setDisplay(display + "+")}>+</button>
                    </div>
                </div>
            );
        }';

        $result = $this->service->validateGeneratedComponent($calculatorComponent, ['calculator']);
        
        $this->assertTrue($result['validation_passed']);
        $this->assertGreaterThan(70, $result['overall_score']);
        $this->assertArrayHasKey('calculator', $result['component_results']);
        
        $calculatorResult = $result['component_results']['calculator'];
        $this->assertContains('display_area', $calculatorResult['present_features']);
        $this->assertContains('number_buttons', $calculatorResult['present_features']);
        $this->assertContains('operation_buttons', $calculatorResult['present_features']);
    }

    public function test_validates_poor_calculator_component()
    {
        $poorCalculatorComponent = '
        import React from "react";
        
        export default function Calculator() {
            return (
                <div>
                    <h1>Calculator</h1>
                    <p>This is a basic calculator</p>
                    <button>Click me</button>
                </div>
            );
        }';

        $result = $this->service->validateGeneratedComponent($poorCalculatorComponent, ['calculator']);
        
        $this->assertFalse($result['validation_passed']);
        $this->assertLessThan(50, $result['overall_score']);
        $this->assertNotEmpty($result['issues']);
        $this->assertNotEmpty($result['suggestions']);
    }

    public function test_gets_standard_component_designs()
    {
        $designs = $this->service->getStandardComponentDesigns();
        
        $this->assertArrayHasKey('calculator', $designs);
        $this->assertArrayHasKey('form', $designs);
        $this->assertArrayHasKey('data_table', $designs);
        $this->assertArrayHasKey('dashboard', $designs);
        
        $calculatorDesign = $designs['calculator'];
        $this->assertArrayHasKey('name', $calculatorDesign);
        $this->assertArrayHasKey('description', $calculatorDesign);
        $this->assertArrayHasKey('requirements', $calculatorDesign);
        $this->assertArrayHasKey('expected_features', $calculatorDesign);
    }

    public function test_gets_standard_calculator_template()
    {
        $template = $this->service->getStandardComponentTemplate('calculator');
        
        $this->assertNotNull($template);
        $this->assertStringContainsString('import React', $template);
        $this->assertStringContainsString('export default', $template);
        $this->assertStringContainsString('calculator', strtolower($template));
        $this->assertStringContainsString('display', $template);
        $this->assertStringContainsString('button', $template);
    }

    public function test_returns_null_for_unknown_template()
    {
        $template = $this->service->getStandardComponentTemplate('unknown_component');
        
        $this->assertNull($template);
    }

    public function test_no_validation_for_non_standard_components()
    {
        $result = $this->service->validateComponentRequest('create a custom widget for my application');
        
        $this->assertFalse($result['has_standard_components']);
        $this->assertEmpty($result['detected_components']);
        $this->assertFalse($result['should_validate_output']);
    }
}