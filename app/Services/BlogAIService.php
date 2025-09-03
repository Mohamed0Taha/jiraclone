<?php

namespace App\Services;

use App\Services\OpenAIService;
use App\Services\ImageKitService;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class BlogAIService
{
    protected $openAIService;
    protected $imageKitService;

    public function __construct(OpenAIService $openAIService, ImageKitService $imageKitService)
    {
        $this->openAIService = $openAIService;
        $this->imageKitService = $imageKitService;
    }

    /**
     * Generate a complete blog post with AI (including featured image)
     */
    public function generateBlogPost($topic, $targetAudience = 'project managers and teams', $tone = 'professional and engaging')
    {
        try {
            // Generate the blog content
            $prompt = $this->buildBlogPrompt($topic, $targetAudience, $tone);
            $messages = [
                ['role' => 'user', 'content' => $prompt]
            ];

            $response = $this->openAIService->chatJson($messages, 0.6);
            
            if (!$response) {
                throw new \Exception('Failed to generate blog content');
            }

            $parsedResponse = $this->parseBlogResponse($response);
            
            // Generate featured image with timeout protection
            $featuredImageUrl = null;
            if (!empty($parsedResponse['title'])) {
                try {
                    $featuredImageUrl = $this->generateFeaturedImage(
                        $parsedResponse['title'], 
                        $parsedResponse['excerpt'] ?? '', 
                        $topic
                    );
                } catch (\Exception $imageError) {
                    // Log image error but don't fail the entire blog generation
                    Log::warning('Image generation failed, continuing with blog content', [
                        'error' => $imageError->getMessage(),
                        'title' => $parsedResponse['title']
                    ]);
                    $parsedResponse['image_error'] = 'Image generation timed out or failed';
                }
            }

            // Add the featured image URL to the response
            if ($featuredImageUrl) {
                $parsedResponse['featured_image'] = $featuredImageUrl;
            }

            return $parsedResponse;

        } catch (\Exception $e) {
            Log::error('BlogAIService generateBlogPost error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Generate blog ideas based on keywords
     */
    public function generateBlogIdeas($keywords, $count = 5)
    {
        $prompt = "Generate {$count} creative, SEO-friendly blog post ideas for TaskPilot (a project management and task automation platform) based on these keywords: {$keywords}

Each idea should:
- Be compelling and click-worthy
- Include specific TaskPilot features or use cases
- Target project managers, team leads, and business owners
- Be actionable and provide clear value
- Be optimized for search engines

Return as JSON array with this structure:
[
  {
    \"title\": \"How-to title under 70 characters\",
    \"topic\": \"Brief topic description\",
    \"target_audience\": \"Specific audience\",
    \"keywords\": [\"primary\", \"secondary\", \"keywords\"],
    \"estimated_difficulty\": \"Easy/Medium/Hard\",
    \"content_type\": \"How-to Guide/Tutorial/Best Practices/Case Study\"
  }
]

Focus on actionable, valuable content that positions TaskPilot as the solution.";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.6);

        return $response ?? [];
    }

    /**
     * Optimize existing content for SEO
     */
    public function optimizeForSEO($title, $content, $targetKeywords = [])
    {
        $keywordsList = implode(', ', $targetKeywords);
        
        $prompt = "Optimize this blog content for SEO while maintaining readability and value:

TITLE: {$title}
CONTENT: {$content}
TARGET KEYWORDS: {$keywordsList}

SEO OPTIMIZATION TASKS:
1. **Keyword Optimization**:
   - Naturally integrate target keywords throughout content
   - Optimize title for primary keyword (under 60 characters)
   - Create compelling meta description with keywords (150-160 characters)
   - Suggest LSI and semantic keywords

2. **Content Structure**:
   - Improve heading structure (H1, H2, H3) with keywords
   - Enhance readability with better formatting
   - Add bullet points and numbered lists where appropriate
   - Suggest internal linking opportunities

3. **SEO Enhancements**:
   - Add FAQ section targeting \"People Also Ask\" queries
   - Suggest schema markup opportunities
   - Recommend featured snippet optimization
   - Include call-to-action optimization

4. **TaskPilot Integration**:
   - Add strategic backlinks to TaskPilot pages
   - Include TaskPilot feature mentions where relevant
   - Add conversion-focused content

Return as JSON with these keys:
- optimized_title: SEO-optimized title
- meta_description: SEO meta description
- optimized_content: Fully optimized content with better structure
- target_keywords: Array of primary and secondary keywords
- lsi_keywords: Array of LSI keywords used
- internal_links_used: Array of TaskPilot links with anchor text
- schema_suggestions: Recommended schema markup
- faq_section: FAQ content for PAA targeting
- seo_improvements: List of optimizations made
- optimization_score: Estimated SEO score (1-100)";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.6);

        return $response ?? [];
    }

    /**
     * Build comprehensive blog generation prompt
     */
    protected function buildBlogPrompt($topic, $targetAudience, $tone)
    {
        return "Create a TaskPilot SEO blog post about: {$topic}

Target: {$targetAudience} | Tone: {$tone}

REQUIREMENTS:
- WikiHow/HubSpot style with step-by-step instructions
- Include TaskPilot features and benefits naturally
- Use **bold** and *italic* formatting (NO color codes)
- Include backlinks to taskpilot.us naturally in content
- 1500-2000 words, SEO optimized

TASKPILOT LINKS TO INCLUDE:
- [TaskPilot platform](https://taskpilot.us)
- [TaskPilot features](https://taskpilot.us/features)
- [Start free trial](https://taskpilot.us/register)

STRUCTURE:
1. Introduction with problem/solution
2. Step-by-step guide (5-7 steps)
3. Advanced tips
4. Conclusion with CTA

Return as JSON with these keys:
- title: SEO title (60 chars max)
- excerpt: Summary (150-160 chars) 
- content: Full formatted content
- meta_title: SEO meta title (60 chars max)
- meta_description: Meta description (150-160 chars)
- target_keywords: Array of SEO keywords
- primary_keyword: Main keyword
- cta_text: CTA button text
- cta_url: CTA URL (/register or /free-trial)

Make this a comprehensive, actionable guide that positions TaskPilot as the essential tool for implementing these strategies successfully.";
    }

    /**
     * Generate a featured image for an existing blog post
     */
    public function generateFeaturedImage($title, $excerpt = '', $topic = '')
    {
        $imagePrompt = $this->buildImagePrompt($topic ?: $title, $title, $excerpt);
        
        try {
            // Generate image with DALL-E
            $imageData = $this->openAIService->generateImage($imagePrompt, '1792x1024', 'hd');
            
            if (!$imageData || !isset($imageData['url'])) {
                throw new \Exception('Failed to generate image with DALL-E');
            }

            // Upload to ImageKit for permanent storage
            $fileName = 'blog-' . Str::slug($title) . '-' . time() . '.png';
            $imageKitResponse = $this->imageKitService->uploadFromUrl(
                $imageData['url'],
                '', // Empty string for root folder
                $fileName
            );

            if (!$imageKitResponse || !isset($imageKitResponse['url'])) {
                throw new \Exception('Failed to upload image to ImageKit');
            }

            return $imageKitResponse['url'];

        } catch (\Exception $e) {
            Log::error('BlogAIService generateFeaturedImage error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Build image generation prompt
     */
    protected function buildImagePrompt($topic, $title, $excerpt)
    {
        return "Create a professional business stock photo for: {$title}

Style: High-quality professional stock photography
Setting: Modern office environment with business professionals
Elements: Real people, authentic workspace, natural lighting
Quality: Commercial-grade, realistic, suitable for business blog

Professional business scene related to project management and productivity.";
    }

    /**
     * Get TaskPilot feature context for prompts
     */
    protected function getTaskPilotFeatureContext()
    {
        return "TaskPilot is a comprehensive AI-powered project management and task automation platform designed for modern teams and businesses. 

KEY FEATURES:
- **AI Task Generation**: Automatically create detailed task lists, subtasks, and project plans using artificial intelligence
- **Smart Project Dashboard**: Real-time overview of all projects with AI-powered insights and progress tracking
- **Automation Rules**: Set up custom workflow automation to streamline repetitive tasks and processes
- **Template Library**: Extensive collection of project templates for different industries and use cases
- **Real-time Collaboration**: Team messaging, file sharing, and collaborative editing tools
- **Progress Tracking**: Advanced analytics and reporting with AI-generated insights
- **Resource Management**: Optimize team allocation and workload distribution
- **Integration Hub**: Connect with 100+ popular business tools and applications
- **Mobile Apps**: Full-featured iOS and Android apps for on-the-go project management
- **AI-Powered Insights**: Predictive analytics and recommendations for project optimization

PRICING PLANS:
- **Free Trial**: 14-day full access to all features
- **Starter Plan**: $9/month per user - Essential features for small teams
- **Pro Plan**: $19/month per user - Advanced automation and AI features
- **Enterprise Plan**: Custom pricing - Full platform with advanced security and customization

UNIQUE VALUE PROPOSITIONS:
- AI-first approach to project management
- Dramatic reduction in manual task creation and project planning
- Intelligent automation that learns from team patterns
- Seamless integration with existing business workflows
- Industry-specific templates and best practices built-in";
    }

    /**
     * Parse and validate blog response
     */
    protected function parseBlogResponse($response)
    {
        $defaults = [
            'title' => 'Untitled Blog Post',
            'excerpt' => 'A comprehensive guide to improving your workflow.',
            'content' => 'Content generation failed. Please try again.',
            'meta_title' => '',
            'meta_description' => '',
            'target_keywords' => [],
            'primary_keyword' => '',
            'lsi_keywords' => [],
            'internal_links_used' => [],
            'schema_data' => [],
            'cta_text' => 'Get Started with TaskPilot',
            'cta_url' => '/register'
        ];

        if (!is_array($response)) {
            return $defaults;
        }

        $parsed = array_merge($defaults, $response);
        
        // Ensure meta_title doesn't exceed 60 characters
        if (!empty($parsed['meta_title']) && strlen($parsed['meta_title']) > 60) {
            $parsed['meta_title'] = substr($parsed['meta_title'], 0, 57) . '...';
        }
        
        // If meta_title is empty, use title (truncated)
        if (empty($parsed['meta_title']) && !empty($parsed['title'])) {
            $parsed['meta_title'] = strlen($parsed['title']) > 60 
                ? substr($parsed['title'], 0, 57) . '...'
                : $parsed['title'];
        }

        return $parsed;
    }

    /**
     * Format blog content with rich styling
     */
    public function formatBlogContent($content)
    {
        if (empty($content)) {
            return $content;
        }

        // Strip any color formatting that might have been generated
        $content = $this->stripColorFormatting($content);

        // Convert markdown-style formatting to HTML
        $content = $this->formatInlineText($content);
        
        // Process sections and headers
        $content = preg_replace('/^### (.+)$/m', '<h3 class="text-lg font-semibold text-gray-800 mt-6 mb-3">$1</h3>', $content);
        $content = preg_replace('/^## (.+)$/m', '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>', $content);
        $content = preg_replace('/^# (.+)$/m', '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>', $content);
        
        // Process numbered lists
        $content = preg_replace('/^\d+\.\s+(.+)$/m', '<div class="numbered-item mb-3"><span class="font-semibold text-blue-600">$0</span></div>', $content);
        
        // Process bullet points
        $content = preg_replace('/^[-•]\s+(.+)$/m', '<div class="bullet-item mb-2 ml-4"><span class="text-blue-500 mr-2">•</span>$1</div>', $content);
        
        // Process paragraphs
        $paragraphs = explode("\n\n", $content);
        $formattedParagraphs = [];
        
        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if (!empty($paragraph) && !preg_match('/^<[^>]+>/', $paragraph)) {
                $paragraph = '<p class="mb-4 text-gray-700 leading-relaxed">' . $paragraph . '</p>';
            }
            $formattedParagraphs[] = $paragraph;
        }
        
        return implode("\n\n", $formattedParagraphs);
    }

    /**
     * Format inline text with styling
     */
    private function formatInlineText($text)
    {
        // Bold text
        $text = preg_replace('/\*\*(.+?)\*\*/', '<strong class="font-semibold text-gray-900">$1</strong>', $text);
        
        // Italic text
        $text = preg_replace('/\*(.+?)\*/', '<em class="italic text-gray-800">$1</em>', $text);
        
        // Links with TaskPilot styling
        $text = preg_replace(
            '/\[([^\]]+)\]\(([^)]+)\)/',
            '<a href="$2" class="text-blue-600 hover:text-blue-800 font-medium underline decoration-blue-300 hover:decoration-blue-500 transition-colors duration-200">$1</a>',
            $text
        );
        
        // Code/feature mentions
        $text = preg_replace('/`([^`]+)`/', '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded font-mono text-sm">$1</code>', $text);
        
        return $text;
    }

    /**
     * Generate SEO keywords from content
     */
    public function generateSEOKeywords($title, $content, $maxKeywords = 10)
    {
        $prompt = "Analyze this blog content and generate SEO keywords:

TITLE: {$title}
CONTENT: {$content}

Generate {$maxKeywords} relevant SEO keywords including:
1. Primary keyword (main focus)
2. Secondary keywords (supporting topics)
3. Long-tail keywords (specific phrases)
4. LSI keywords (semantically related)

Return as JSON:
{
  \"primary_keyword\": \"main keyword\",
  \"secondary_keywords\": [\"keyword1\", \"keyword2\"],
  \"long_tail_keywords\": [\"how to keyword phrase\"],
  \"lsi_keywords\": [\"related term1\", \"related term2\"]
}";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.3);
        return $response ?? [];
    }

    /**
     * Generate SEO audit and recommendations
     */
    public function generateSEOAudit($title, $content, $targetKeywords = [])
    {
        $keywordsList = implode(', ', $targetKeywords);
        
        $prompt = "Perform an SEO audit of this blog content:

TITLE: {$title}
CONTENT: {$content}
TARGET KEYWORDS: {$keywordsList}

AUDIT AREAS:
1. **Keyword Optimization**: Density, placement, natural usage
2. **Content Structure**: Headers, readability, length
3. **Technical SEO**: Title length, meta description needs
4. **User Experience**: Readability, engagement factors
5. **Internal Linking**: Opportunities and improvements

Return detailed audit as JSON:
{
  \"overall_score\": 85,
  \"keyword_optimization\": {
    \"score\": 80,
    \"issues\": [\"Low keyword density in headers\"],
    \"recommendations\": [\"Add primary keyword to H2 tags\"]
  },
  \"content_structure\": {
    \"score\": 90,
    \"issues\": [],
    \"recommendations\": [\"Add more bullet points\"]
  },
  \"readability\": {
    \"score\": 88,
    \"grade_level\": \"8th grade\",
    \"avg_sentence_length\": 15
  },
  \"improvements\": [\"Specific actionable improvements\"],
  \"priority_fixes\": [\"High-impact changes\"]
}";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.4);
        return $response ?? [];
    }

    /**
     * Generate schema markup for blog post
     */
    public function generateSchemaMarkup($title, $content, $author = 'TaskPilot Team')
    {
        $prompt = "Generate JSON-LD schema markup for this blog post:

TITLE: {$title}
CONTENT: {$content}
AUTHOR: {$author}

Create appropriate schema markup including:
- Article schema
- How-to schema (if applicable)
- FAQ schema (if FAQ section exists)
- Organization schema for TaskPilot

Return as JSON with schema objects:
{
  \"article_schema\": {...},
  \"howto_schema\": {...},
  \"faq_schema\": {...},
  \"organization_schema\": {...}
}";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.3);
        return $response ?? [];
    }

    /**
     * Generate blog title variations
     */
    public function generateBlogTitles($topic, $count = 5)
    {
        $prompt = "Generate {$count} compelling blog post titles for the topic: {$topic}

Each title should:
- Be under 60 characters for SEO
- Include power words and emotional triggers
- Be specific and actionable
- Target project managers and business professionals
- Incorporate TaskPilot value proposition where natural

Return as JSON array:
[
  {
    \"title\": \"How to [Action] in [Time] with [Benefit]\",
    \"character_count\": 45,
    \"keywords\": [\"primary\", \"secondary\"],
    \"appeal_type\": \"How-to/List/Guide/Case Study\"
  }
]";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.7);
        return $response ?? [];
    }

    /**
     * Generate conversion-focused content sections
     */
    public function generateConversionContent($topic, $sectionType = 'cta')
    {
        $prompt = "Generate a high-converting {$sectionType} section for a blog post about: {$topic}

SECTION TYPES:
- cta: Call-to-action section
- lead_magnet: Lead generation offer
- testimonial: Customer success story
- comparison: TaskPilot vs alternatives
- demo: Product demonstration content

Requirements:
- Focus on TaskPilot benefits and value proposition
- Include compelling copy that drives action
- Be specific about outcomes and benefits
- Include social proof where appropriate
- Use persuasive but natural language

Return as JSON:
{
  \"section_type\": \"{$sectionType}\",
  \"headline\": \"Compelling headline\",
  \"content\": \"Full section content with formatting\",
  \"cta_text\": \"Action button text\",
  \"cta_url\": \"/target-page\",
  \"supporting_elements\": [\"Additional elements like stats, quotes\"]
}";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.6);
        return $response ?? [];
    }

    /**
     * Strip any color formatting from content
     */
    private function stripColorFormatting($content)
    {
        // Remove inline style color attributes
        $content = preg_replace('/style\s*=\s*["\'][^"\']*color\s*:[^"\']*["\']/', '', $content);
        
        // Remove color CSS classes that might have been generated
        $content = preg_replace('/<span[^>]*style\s*=\s*["\'][^"\']*color[^"\']*["\'][^>]*>(.*?)<\/span>/i', '$1', $content);
        
        // Remove any remaining color references
        $content = preg_replace('/color\s*:\s*[^;"\'\s]+[;"\']?/', '', $content);
        
        // Remove font color HTML tags
        $content = preg_replace('/<font[^>]*color[^>]*>(.*?)<\/font>/i', '$1', $content);
        
        return $content;
    }
}
