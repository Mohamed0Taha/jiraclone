<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\GenerativeUIService;
use App\Services\OpenAIService;
use App\Services\GoogleImageService;
use App\Models\Project;
use App\Models\User;
use Mockery;

class GenerativeUIServiceEnhancedWorkflowTest extends TestCase
{
    public function test_detects_spa_request()
    {
        $openAIService = Mockery::mock(OpenAIService::class);
        $googleImageService = Mockery::mock(GoogleImageService::class);
        
        $service = new GenerativeUIService($openAIService, $googleImageService);
        
        // Use reflection to test the private method
        $reflection = new \ReflectionClass($service);
        $method = $reflection->getMethod('detectsSpaRequest');
        $method->setAccessible(true);
        
        // Test cases that should be detected as SPA requests
        $this->assertTrue($method->invoke($service, 'I want a basic calculator'));
        $this->assertTrue($method->invoke($service, 'Create a dashboard for tracking'));
        $this->assertTrue($method->invoke($service, 'Build a widget for monitoring'));
        $this->assertTrue($method->invoke($service, 'I need an app for managing tasks'));
        
        // Test cases that should NOT be detected as SPA requests
        $this->assertFalse($method->invoke($service, 'Update the color scheme'));
        $this->assertFalse($method->invoke($service, 'Fix the layout'));
        $this->assertFalse($method->invoke($service, 'Change the font size'));
    }
    
    public function test_google_image_service_placeholder_fallback()
    {
        $service = new GoogleImageService();
        
        $images = $service->searchImages('calculator design', 2);
        
        $this->assertCount(2, $images);
        $this->assertArrayHasKey('url', $images[0]);
        $this->assertArrayHasKey('thumbnail', $images[0]);
        $this->assertArrayHasKey('title', $images[0]);
        $this->assertArrayHasKey('source', $images[0]);
        $this->assertEquals('placeholder', $images[0]['source']);
    }
    
    public function test_best_image_selection()
    {
        $service = new GoogleImageService();
        
        $images = [
            ['width' => 800, 'height' => 600, 'url' => 'image1.jpg'],
            ['width' => 1200, 'height' => 900, 'url' => 'image2.jpg'],
            ['width' => 400, 'height' => 300, 'url' => 'image3.jpg']
        ];
        
        $bestImage = $service->getBestImage($images);
        
        $this->assertNotNull($bestImage);
        $this->assertArrayHasKey('url', $bestImage);
        // Should prefer larger, well-proportioned images
        $this->assertEquals('image2.jpg', $bestImage['url']);
    }
    
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}