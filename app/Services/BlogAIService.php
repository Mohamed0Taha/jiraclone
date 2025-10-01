<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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
     * Make a request with retry logic for transient failures
     */
    private function makeRequestWithRetry(callable $request, int $maxRetries = 2)
    {
        $attempt = 0;
        $lastException = null;

        while ($attempt <= $maxRetries) {
            try {
                return $request();
            } catch (\Exception $e) {
                $lastException = $e;
                $attempt++;
                
                // Only retry on timeout or server errors
                $message = $e->getMessage();
                $shouldRetry = (
                    strpos($message, 'timeout') !== false ||
                    strpos($message, 'cURL error 28') !== false ||
                    strpos($message, '500') !== false ||
                    strpos($message, '502') !== false ||
                    strpos($message, '503') !== false
                );
                
                if (!$shouldRetry || $attempt > $maxRetries) {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                $waitTime = min(pow(2, $attempt - 1), 5); // Max 5 seconds
                Log::info("Request failed, retrying in {$waitTime}s", [
                    'attempt' => $attempt,
                    'error' => $message
                ]);
                sleep($waitTime);
            }
        }

        throw $lastException;
    }

    /**
     * Generate a complete blog post with AI (including featured image)
     */
    public function generateBlogPost($topic, $targetAudience = 'project managers and teams', $tone = 'professional and engaging')
    {
        try {
            // Check if OpenAI API key is configured
            if (empty(config('openai.api_key'))) {
                throw new \Exception('OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.');
            }

            $overallStart = microtime(true);
            Log::info('Starting blog generation', ['topic' => $topic, 'audience' => $targetAudience]);
            
            // Generate the blog content with retry logic
            $prompt = $this->buildBlogPrompt($topic, $targetAudience, $tone);
            $messages = [
                ['role' => 'user', 'content' => $prompt],
            ];

            $response = $this->makeRequestWithRetry(function() use ($messages) {
                return $this->openAIService->chatJson($messages, 0.6);
            }, 2); // Retry up to 2 times
            
            if (! is_array($response)) {
                throw new \Exception('Unexpected AI response format');
            }

            if (! $response) {
                throw new \Exception('Failed to generate blog content - empty response from AI');
            }

            $parsedResponse = $this->parseBlogResponse($response);

            // Conditional, time‑boxed image generation to avoid Heroku 30s timeout
            $autoImage = (bool) config('blog_ai.auto_image');
            if ($autoImage && ! empty($parsedResponse['title'])) {
                $maxSync = (int) config('blog_ai.max_sync_seconds', 23);
                $elapsed = microtime(true) - $overallStart;
                if ($elapsed < $maxSync - 3) { // leave buffer for response serialization
                    $imageStart = microtime(true);
                    try {
                        Log::info('BlogAIService: starting image generation', [
                            'elapsed_before_image' => $elapsed,
                            'max_sync' => $maxSync,
                            'title' => $parsedResponse['title'] ?? null,
                        ]);
                        $size = config('blog_ai.image_size', '1024x1024');
                        $quality = config('blog_ai.image_quality', 'standard');
                        $featuredImageUrl = $this->generateFeaturedImage(
                            $parsedResponse['title'],
                            $parsedResponse['excerpt'] ?? '',
                            $topic
                        );
                        if ($featuredImageUrl) {
                            $parsedResponse['featured_image'] = $featuredImageUrl;
                        }
                        $parsedResponse['image_generation_ms'] = (int) ((microtime(true) - $imageStart) * 1000);
                        Log::info('BlogAIService: image generation finished', [
                            'image_generation_ms' => $parsedResponse['image_generation_ms'] ?? null,
                        ]);
                    } catch (\Throwable $e) {
                        Log::warning('Featured image generation failed (non-fatal)', [
                            'error' => $e->getMessage(),
                            'title' => $parsedResponse['title'] ?? null,
                        ]);
                        $parsedResponse['image_error'] = $e->getMessage();
                    }
                } else {
                    Log::info('BlogAIService: skipping image due to time budget (queueing async job)', [
                        'elapsed' => $elapsed,
                        'max_sync' => $maxSync,
                    ]);
                    $parsedResponse['image_skipped'] = true;
                    $parsedResponse['image_error'] = 'Queued for async generation';
                    // If a draft blog record exists later controller may dispatch job; here we just mark intention.
                }
            } else {
                $parsedResponse['image_skipped'] = true;
            }

            return $parsedResponse;

        } catch (\Exception $e) {
            Log::error('BlogAIService generateBlogPost error', [
                'error' => $e->getMessage(),
                'topic' => $topic,
                'audience' => $targetAudience,
                'trace' => $e->getTraceAsString()
            ]);
            
            // Provide more user-friendly error messages
            $message = $e->getMessage();
            if (strpos($message, 'cURL error 28') !== false || strpos($message, 'timeout') !== false) {
                throw new \Exception('Request timed out. The AI service is taking longer than expected. Please try again with a simpler topic or try again later.');
            } elseif (strpos($message, 'API key') !== false) {
                throw new \Exception('OpenAI API configuration error. Please contact the administrator.');
            } elseif (strpos($message, '401') !== false) {
                throw new \Exception('Authentication failed with OpenAI API. Please check the API key configuration.');
            } elseif (strpos($message, '429') !== false) {
                throw new \Exception('Rate limit exceeded. Please wait a moment and try again.');
            } elseif (strpos($message, '500') !== false || strpos($message, '502') !== false || strpos($message, '503') !== false) {
                throw new \Exception('OpenAI service is temporarily unavailable. Please try again in a few minutes.');
            }
            
            throw new \Exception('Failed to generate blog post: ' . $message);
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
            ['role' => 'user', 'content' => $prompt],
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
            ['role' => 'user', 'content' => $prompt],
        ];

        $response = $this->openAIService->chatJson($messages, 0.6);

        return $response ?? [];
    }

    /**
     * Build comprehensive blog generation prompt
     */
    protected function buildBlogPrompt($topic, $targetAudience, $tone)
    {
        return "Write a professional blog post about: {$topic}

Target: {$targetAudience}
Tone: {$tone}

Create a step-by-step guide (1500-2000 words) that:
1. Addresses the topic with actionable advice
2. Includes TaskPilot project management platform features
3. Uses clear headings and bullet points
4. Provides practical examples

TaskPilot Features to mention:
- AI Task Generation
- Project Dashboard
- Automation Rules
- Template Library
- Real-time Collaboration

Include these links naturally:
- [TaskPilot platform](https://taskpilot.us)
- [TaskPilot features](https://taskpilot.us/features)
- [Start free trial](https://taskpilot.us/register)

Return JSON with:
- title: SEO title (under 60 chars)
- excerpt: Brief summary (150 chars)
- content: Full article with markdown formatting
- meta_title: SEO meta title (60 chars max)
- meta_description: Meta description (160 chars max)
- target_keywords: Array of main keywords
- primary_keyword: Main SEO keyword
- cta_text: Call-to-action text
- cta_url: CTA URL (/register)

Focus on practical value and clear instructions.";
    }

    /**
     * Generate a featured image for an existing blog post
     */
    public function generateFeaturedImage($title, $excerpt = '', $topic = '')
    {
        $imagePrompt = $this->buildImagePrompt($topic ?: $title, $title, $excerpt);
        $primarySize = config('blog_ai.image_size', '1024x1024');
        $primaryQuality = config('blog_ai.image_quality', 'standard');
        $fallbackSize = config('blog_ai.fallback_image_size', '512x512');
        $fallbackQuality = config('blog_ai.fallback_image_quality', 'standard');

        $attempts = [
            ['size' => $primarySize, 'quality' => $primaryQuality],
            ['size' => $fallbackSize, 'quality' => $fallbackQuality],
        ];

        foreach ($attempts as $idx => $opts) {
            try {
                $provider = config('blog_ai.provider', 'openai');
                if ($provider === 'wavespeed') {
                    $wave = app(WaveSpeedImageService::class);
                    $imageData = $wave->generate($imagePrompt, $opts['size']);
                } else {
                    $imageData = $this->openAIService->generateImage($imagePrompt, $opts['size'], $opts['quality']);
                }
                if (! $imageData || ! isset($imageData['url'])) {
                    throw new \Exception('Image provider returned no URL');
                }
                $fileName = 'blog-'.Str::slug($title).'-'.time().($idx === 0 ? '' : '-fb').'.png';
                $imageKitResponse = $this->imageKitService->uploadFromUrl(
                    $imageData['url'],
                    '',
                    $fileName
                );
                if (! $imageKitResponse || ! isset($imageKitResponse['url'])) {
                    throw new \Exception('ImageKit upload failed');
                }
                Log::info('BlogAIService: featured image generated', [
                    'attempt' => $idx + 1,
                    'size' => $opts['size'],
                    'quality' => $opts['quality'],
                ]);

                return [
                    'success' => true,
                    'url' => $imageKitResponse['url'],
                    'file_id' => $imageKitResponse['fileId'] ?? null,
                    'thumbnail_url' => $imageKitResponse['thumbnailUrl'] ?? null,
                ];
            } catch (\Throwable $e) {
                Log::warning('BlogAIService: image attempt failed', [
                    'attempt' => $idx + 1,
                    'size' => $opts['size'],
                    'quality' => $opts['quality'],
                    'error' => $e->getMessage(),
                ]);
                // continue to next attempt
            }
        }

        // Final placeholder fallback
        if (config('blog_ai.use_placeholder_on_fail')) {
            $query = Str::slug($topic ?: $title) ?: 'project-management';
            $placeholderBase = rtrim(config('blog_ai.placeholder_base', 'https://source.unsplash.com/featured/?'), '/?');
            $url = $placeholderBase.'/'.$query;
            Log::notice('BlogAIService: using placeholder image', ['url' => $url]);

            return [
                'success' => true,
                'url' => $url,
                'file_id' => null,
                'thumbnail_url' => null,
                'placeholder' => true
            ]; // Not uploaded to ImageKit; external link
        }

        return [
            'success' => false,
            'error' => 'All image generation attempts failed',
            'url' => null,
            'file_id' => null,
            'thumbnail_url' => null,
        ];
    }

    /**
     * Build image generation prompt
     */
    protected function buildImagePrompt($topic, $title, $excerpt)
    {
        // Extract key themes from the topic and title to create variety
        $topicLower = strtolower($topic . ' ' . $title . ' ' . $excerpt);
        
        // Determine the visual style - use different approaches for variety
        $visualStyles = [
            'abstract' => $this->buildAbstractPrompt($title, $topic, $topicLower),
            'metaphor' => $this->buildMetaphorPrompt($title, $topic, $topicLower),
            'illustration' => $this->buildIllustrationPrompt($title, $topic, $topicLower),
            'interface' => $this->buildInterfacePrompt($title, $topic, $topicLower),
            'conceptual' => $this->buildConceptualPrompt($title, $topic, $topicLower),
        ];
        
        // Rotate through styles based on title hash for consistency but variety
        $styleKeys = array_keys($visualStyles);
        $styleIndex = hexdec(substr(md5($title), 0, 2)) % count($styleKeys);
        $selectedStyle = $styleKeys[$styleIndex];
        
        return $visualStyles[$selectedStyle];
    }
    
    /**
     * Build abstract/geometric style prompt
     */
    private function buildAbstractPrompt($title, $topic, $content)
    {
        $colors = $this->extractColorScheme($content);
        $shapes = ['interconnected nodes', 'flowing lines', 'geometric patterns', 'layered shapes', 'gradient waves'];
        $shape = $shapes[array_rand($shapes)];
        
        return "Create a modern abstract geometric illustration for: \"{$title}\"

Style: Clean, minimal abstract design with {$shape}
Colors: {$colors}
Composition: {$shape} representing {$topic}
Elements: Abstract shapes, gradients, modern geometric forms
Mood: Professional, contemporary, tech-forward
Format: Wide banner (1792x1024), high contrast, bold composition

NO people, NO laptops, NO office scenes. Pure abstract visual representation.";
    }
    
    /**
     * Build visual metaphor prompt
     */
    private function buildMetaphorPrompt($title, $topic, $content)
    {
        $metaphors = [
            'automation|ai' => 'interconnected gears and circuits flowing with energy',
            'team|collaboration' => 'puzzle pieces connecting together in perfect harmony',
            'growth|scale' => 'ascending staircase made of building blocks reaching skyward',
            'planning|strategy' => 'chess pieces on a strategic board with glowing paths',
            'productivity|efficiency' => 'streamlined arrows flowing through organized channels',
            'timeline|schedule' => 'flowing river with milestone markers along the banks',
            'dashboard|analytics' => 'glowing data streams forming patterns in space',
            'communication' => 'network of glowing connection points spreading outward',
            'innovation|creative' => 'lightbulb exploding with colorful creative energy',
            'success|achieve' => 'mountain peak with flag at summit, golden light',
        ];
        
        $metaphor = 'interconnected pathways leading to a bright destination';
        foreach ($metaphors as $pattern => $visual) {
            if (preg_match("/$pattern/i", $content)) {
                $metaphor = $visual;
                break;
            }
        }
        
        return "Create a powerful visual metaphor for: \"{$title}\"

Central Metaphor: {$metaphor}
Style: Conceptual photography or 3D render
Lighting: Dramatic, focused lighting highlighting the metaphor
Colors: Bold, saturated colors that pop
Composition: The metaphor is the hero element, centered and prominent
Mood: Inspiring, aspirational, forward-thinking

NO generic office workers, NO people at laptops. Focus entirely on the metaphorical representation.";
    }
    
    /**
     * Build illustration style prompt
     */
    private function buildIllustrationPrompt($title, $topic, $content)
    {
        $styles = ['flat design', 'isometric', 'line art', 'gradient mesh', 'duotone'];
        $style = $styles[array_rand($styles)];
        
        $elements = $this->extractVisualKeywords($title, '');
        
        return "Create a modern {$style} illustration for: \"{$title}\"

Illustration Style: {$style} with clean lines and bold shapes
Subject: Visual representation of {$topic}
Elements: {$elements} shown as illustrated icons/graphics
Color Palette: Vibrant, modern color scheme with 3-4 main colors
Composition: Balanced layout with clear visual hierarchy
Details: Icons, symbols, and graphics that represent {$topic}

NO photorealistic people, NO stock photos. Pure illustration/graphic design approach.";
    }
    
    /**
     * Build interface/dashboard style prompt
     */
    private function buildInterfacePrompt($title, $topic, $content)
    {
        $interfaceTypes = [
            'dashboard' => 'modern analytics dashboard with charts and metrics',
            'kanban' => 'kanban board with colorful cards and columns',
            'timeline' => 'project timeline with milestones and progress bars',
            'calendar' => 'calendar interface with events and schedules',
            'analytics' => 'data visualization with graphs and statistics',
        ];
        
        $interface = 'sleek project management interface';
        foreach ($interfaceTypes as $pattern => $visual) {
            if (preg_match("/$pattern/i", $content)) {
                $interface = $visual;
                break;
            }
        }
        
        return "Create a clean UI/interface screenshot for: \"{$title}\"

Interface Type: {$interface}
Style: Modern, minimal UI design with glassmorphism effects
Colors: Professional color scheme with accent colors
Elements: Charts, cards, progress indicators, data visualizations
Layout: Clean grid layout with clear information hierarchy
Details: Realistic UI elements, buttons, icons, typography
Lighting: Soft glow effects, subtle shadows

Show the INTERFACE/SCREEN only. NO people, NO hands, NO office environment.";
    }
    
    /**
     * Build conceptual/artistic prompt
     */
    private function buildConceptualPrompt($title, $topic, $content)
    {
        $concepts = [
            'automation' => 'robotic arms assembling glowing digital elements',
            'collaboration' => 'hands from different directions connecting puzzle pieces',
            'planning' => 'architect\'s hands drawing glowing blueprint in the air',
            'productivity' => 'clock gears interwoven with growing plants',
            'analytics' => 'floating holographic data charts in dark space',
            'communication' => 'speech bubbles transforming into connected nodes',
            'innovation' => 'hands holding glowing sphere of creative energy',
            'strategy' => 'chess board with pieces casting long strategic shadows',
        ];
        
        $concept = 'hands arranging glowing elements into organized patterns';
        foreach ($concepts as $pattern => $visual) {
            if (preg_match("/$pattern/i", $content)) {
                $concept = $visual;
                break;
            }
        }
        
        return "Create a conceptual artistic image for: \"{$title}\"

Concept: {$concept}
Style: Artistic, slightly surreal, professional photography
Lighting: Dramatic lighting with strong contrasts and glows
Colors: Rich, saturated colors with dramatic shadows
Composition: Close-up, focused on the conceptual element
Mood: Inspiring, thought-provoking, visually striking
Details: Sharp focus on main element, artistic blur on background

Focus on HANDS and OBJECTS only. NO faces, NO full people, NO office scenes.";
    }
    
    /**
     * Extract color scheme based on content
     */
    private function extractColorScheme($content)
    {
        $schemes = [
            'technology|digital|ai' => 'electric blue, cyan, and purple gradients',
            'creative|innovation|design' => 'vibrant orange, pink, and yellow',
            'growth|success|achieve' => 'emerald green, gold, and teal',
            'analytics|data|metrics' => 'deep blue, turquoise, and white',
            'team|collaboration|social' => 'warm coral, orange, and yellow',
            'productivity|efficiency' => 'mint green, blue, and white',
            'strategy|planning' => 'navy blue, gold, and gray',
            'automation|workflow' => 'purple, blue, and electric cyan',
        ];
        
        foreach ($schemes as $pattern => $colors) {
            if (preg_match("/$pattern/i", $content)) {
                return $colors;
            }
        }
        
        return 'professional blue, teal, and white';
    }

    /**
     * Extract specific visual keywords from title and excerpt for unique image generation
     */
    private function extractVisualKeywords($title, $excerpt)
    {
        $text = strtolower($title . ' ' . $excerpt);
        $visualElements = [];
        
        // Extract action verbs and activities
        $actions = [
            'automate|automation' => 'automation workflows and systems',
            'collaborate|collaboration' => 'team collaboration and interaction',
            'plan|planning' => 'planning boards and roadmaps',
            'track|tracking' => 'progress tracking dashboards',
            'manage|management' => 'management activities and oversight',
            'organize|organizing' => 'organized systems and structures',
            'communicate|communication' => 'communication tools and interactions',
            'analyze|analytics' => 'data analysis and charts',
            'report|reporting' => 'reports and documentation',
            'schedule|scheduling' => 'calendars and timelines',
            'delegate|delegating' => 'task assignment and distribution',
            'prioritize|priority' => 'priority indicators and sorting',
            'optimize|optimization' => 'optimization processes and improvements',
            'integrate|integration' => 'connected systems and integrations',
            'monitor|monitoring' => 'monitoring screens and alerts',
        ];
        
        foreach ($actions as $pattern => $visual) {
            if (preg_match("/$pattern/i", $text)) {
                $visualElements[] = $visual;
            }
        }
        
        // Extract specific tools and objects
        $objects = [
            'dashboard' => 'digital dashboards with metrics',
            'kanban' => 'kanban boards with cards',
            'gantt' => 'gantt charts and timelines',
            'calendar' => 'calendars and schedules',
            'checklist' => 'checklists and task lists',
            'timeline' => 'project timelines',
            'chart|graph' => 'charts and graphs',
            'spreadsheet' => 'spreadsheets and data',
            'document' => 'documents and files',
            'email' => 'email interfaces',
            'chat|message' => 'chat and messaging',
            'video|meeting' => 'video conferencing',
            'mobile|app' => 'mobile devices and apps',
            'laptop|computer' => 'laptops and computers',
            'whiteboard' => 'whiteboards with diagrams',
            'sticky note|post-it' => 'sticky notes and planning',
            'clock|time' => 'clocks and time management',
            'notification|alert' => 'notifications and alerts',
        ];
        
        foreach ($objects as $pattern => $visual) {
            if (preg_match("/$pattern/i", $text)) {
                $visualElements[] = $visual;
            }
        }
        
        // Extract people and roles
        $roles = [
            'team|teams' => 'diverse team members',
            'manager|managers' => 'managers and leaders',
            'developer|developers' => 'developers at work',
            'designer|designers' => 'designers creating',
            'executive|ceo|cto' => 'executives in discussion',
            'freelancer|contractor' => 'independent professionals',
            'remote|distributed' => 'remote workers',
            'client|customer' => 'client interactions',
        ];
        
        foreach ($roles as $pattern => $visual) {
            if (preg_match("/$pattern/i", $text)) {
                $visualElements[] = $visual;
            }
        }
        
        // Extract concepts and metaphors
        $concepts = [
            'agile|scrum|sprint' => 'agile methodology artifacts',
            'deadline|due date' => 'deadline pressure and urgency',
            'milestone' => 'milestone celebrations',
            'bottleneck|blocker' => 'workflow obstacles',
            'efficiency|productive' => 'efficient workflows',
            'growth|scale' => 'growth indicators and expansion',
            'success|achieve' => 'success celebrations',
            'challenge|problem' => 'problem-solving activities',
            'innovation|creative' => 'creative brainstorming',
            'strategy|strategic' => 'strategic planning sessions',
        ];
        
        foreach ($concepts as $pattern => $visual) {
            if (preg_match("/$pattern/i", $text)) {
                $visualElements[] = $visual;
            }
        }
        
        // Extract numbers and timeframes for visual emphasis
        if (preg_match('/(\d+)\s*(step|way|tip|method|strategy|hour|day|week|minute)/i', $text, $matches)) {
            $visualElements[] = $matches[1] . ' distinct visual elements';
        }
        
        // If no specific elements found, extract key nouns from title
        if (empty($visualElements)) {
            // Remove common words and extract meaningful terms
            $words = preg_split('/\s+/', $title);
            $stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'how', 'what', 'why', 'when', 'where'];
            $keywords = array_filter($words, function($word) use ($stopWords) {
                return strlen($word) > 3 && !in_array(strtolower($word), $stopWords);
            });
            
            if (!empty($keywords)) {
                $visualElements[] = 'visual representation of ' . implode(', ', array_slice($keywords, 0, 3));
            } else {
                $visualElements[] = 'project management scenario';
            }
        }
        
        // Limit to top 3-4 most relevant elements to keep prompt focused
        $visualElements = array_slice(array_unique($visualElements), 0, 4);
        
        return implode(', ', $visualElements);
    }

    /**
     * Determine visual theme based on blog content
     */
    private function determineVisualTheme($content)
    {
        $themes = [
            'collaboration|team|meeting|communication' => 'Team collaboration and communication',
            'automation|ai|technology|digital|software' => 'Technology and automation in action',
            'planning|strategy|roadmap|goals' => 'Strategic planning and goal setting',
            'productivity|efficiency|workflow|process' => 'Productivity and workflow optimization',
            'leadership|management|decision' => 'Leadership and management',
            'analytics|data|metrics|reporting' => 'Data analytics and insights',
            'remote|distributed|virtual|hybrid' => 'Remote and distributed work',
            'agile|scrum|sprint|kanban' => 'Agile methodology and frameworks',
            'innovation|creative|brainstorm' => 'Innovation and creative thinking',
            'growth|scale|expansion' => 'Business growth and scaling',
        ];

        foreach ($themes as $pattern => $theme) {
            if (preg_match("/$pattern/i", $content)) {
                return $theme;
            }
        }

        return 'Professional business environment';
    }

    /**
     * Determine color palette based on blog content
     */
    private function determineColorPalette($content)
    {
        $palettes = [
            'technology|digital|ai|automation' => 'Cool blues and teals with modern tech aesthetics',
            'creative|innovation|design' => 'Vibrant colors with creative energy',
            'productivity|efficiency|focus' => 'Clean whites and organized neutrals with accent colors',
            'leadership|executive|strategy' => 'Professional grays and navy blues',
            'growth|success|achievement' => 'Warm greens and golds suggesting growth',
            'collaboration|team|social' => 'Warm oranges and friendly tones',
            'analytics|data|metrics' => 'Cool blues with data visualization elements',
            'remote|flexible|modern' => 'Bright, airy spaces with natural light',
        ];

        foreach ($palettes as $pattern => $palette) {
            if (preg_match("/$pattern/i", $content)) {
                return $palette;
            }
        }

        return 'Professional business colors with balanced warmth';
    }

    /**
     * Determine scene type based on blog content
     */
    private function determineSceneType($content)
    {
        $scenes = [
            'meeting|collaboration|discussion' => 'Team meeting or collaborative workspace',
            'individual|focus|productivity|solo' => 'Individual focused work environment',
            'presentation|demo|training' => 'Presentation or training scenario',
            'brainstorm|creative|innovation' => 'Creative brainstorming session',
            'remote|virtual|video|online' => 'Remote work setup with video conferencing',
            'planning|strategy|roadmap' => 'Strategic planning session with visual aids',
            'analytics|dashboard|data' => 'Data analysis with screens and charts',
            'mobile|app|device' => 'Mobile device usage in professional setting',
            'workshop|training|learning' => 'Workshop or training environment',
        ];

        foreach ($scenes as $pattern => $scene) {
            if (preg_match("/$pattern/i", $content)) {
                return $scene;
            }
        }

        return 'Modern professional workspace';
    }

    /**
     * Determine mood based on blog content
     */
    private function determineMood($content)
    {
        $moods = [
            'success|achievement|win|celebrate' => 'Energetic and celebratory',
            'challenge|problem|solve|overcome' => 'Focused and determined',
            'innovation|future|transform' => 'Forward-thinking and inspiring',
            'calm|balance|zen|mindful' => 'Calm and balanced',
            'urgent|fast|quick|speed' => 'Dynamic and fast-paced',
            'learn|education|training|skill' => 'Engaged and learning-focused',
            'confident|professional|expert' => 'Confident and professional',
        ];

        foreach ($moods as $pattern => $mood) {
            if (preg_match("/$pattern/i", $content)) {
                return $mood;
            }
        }

        return 'Professional and approachable';
    }

    /**
     * Get TaskPilot feature context for prompts
     */
    protected function getTaskPilotFeatureContext()
    {
        return 'TaskPilot is a comprehensive AI-powered project management and task automation platform designed for modern teams and businesses. 

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
- Industry-specific templates and best practices built-in';
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
            'cta_url' => '/register',
        ];

        if (! is_array($response)) {
            return $defaults;
        }

        $parsed = array_merge($defaults, $response);

        // Ensure meta_title doesn't exceed 60 characters
        if (! empty($parsed['meta_title']) && strlen($parsed['meta_title']) > 60) {
            $parsed['meta_title'] = substr($parsed['meta_title'], 0, 57).'...';
        }

        // If meta_title is empty, use title (truncated)
        if (empty($parsed['meta_title']) && ! empty($parsed['title'])) {
            $parsed['meta_title'] = strlen($parsed['title']) > 60
                ? substr($parsed['title'], 0, 57).'...'
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
            if (! empty($paragraph) && ! preg_match('/^<[^>]+>/', $paragraph)) {
                $paragraph = '<p class="mb-4 text-gray-700 leading-relaxed">'.$paragraph.'</p>';
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
            ['role' => 'user', 'content' => $prompt],
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
            ['role' => 'user', 'content' => $prompt],
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
            ['role' => 'user', 'content' => $prompt],
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
            ['role' => 'user', 'content' => $prompt],
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
            ['role' => 'user', 'content' => $prompt],
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
