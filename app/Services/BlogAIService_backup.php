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
        $prompt = $this->buildBlogPrompt($topic, $targetAudience, $tone);
        
        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];
        
        $response = $this->openAIService->chatJson($messages, 0.7);
        $blogData = $this->parseBlogResponse($response);

        // Generate featured image with retry logic
        $maxRetries = 2;
        $retryCount = 0;
        
        while ($retryCount < $maxRetries) {
            try {
                $imagePrompt = $this->buildImagePrompt($topic, $blogData['title'], $blogData['excerpt']);
                Log::info('Generating blog image', ['prompt' => $imagePrompt, 'attempt' => $retryCount + 1]);
                
                $imageData = $this->openAIService->generateImage($imagePrompt, '1792x1024', 'hd');
                Log::info('OpenAI image generated', ['url' => $imageData['url']]);
                
                // Save the generated image to ImageKit
                $fileName = 'blog-featured-' . Str::slug($blogData['title']) . '-' . time() . '.png';
                $savedImage = $this->imageKitService->uploadFromUrl($imageData['url'], 'blog-featured', $fileName);
                Log::info('Image saved to ImageKit', ['saved_url' => $savedImage['url']]);
                
                $blogData['featured_image'] = $savedImage['url'];
                $blogData['image_file_id'] = $savedImage['file_id'];
                $blogData['image_prompt'] = $imageData['revised_prompt'];
                break; // Success, exit retry loop
                
            } catch (\Exception $e) {
                $retryCount++;
                Log::warning('Blog image generation attempt failed', [
                    'topic' => $topic,
                    'title' => $blogData['title'] ?? 'Unknown',
                    'attempt' => $retryCount,
                    'error' => $e->getMessage(),
                ]);
                
                if ($retryCount >= $maxRetries) {
                    Log::error('Blog image generation failed after all retries', [
                        'topic' => $topic,
                        'title' => $blogData['title'] ?? 'Unknown',
                        'total_attempts' => $retryCount,
                        'final_error' => $e->getMessage(),
                    ]);
                    
                    // Final failure, continue without image
                    $blogData['featured_image'] = null;
                    $blogData['image_error'] = 'Image generation failed after ' . $maxRetries . ' attempts: ' . $e->getMessage();
                } else {
                    // Wait a bit before retrying
                    sleep(2);
                }
            }
        }

        return $blogData;
    }

    /**
     * Generate blog ideas based on keywords
     */
    public function generateBlogIdeas($keywords, $count = 5)
    {
        $taskPilotContext = $this->getTaskPilotFeatureContext();
        
        $prompt = "Generate {$count} high-quality, how-to style blog post ideas for TaskPilot, an AI-powered project management platform. 

TASKPILOT PLATFORM CONTEXT:
{$taskPilotContext}

Keywords to target: {$keywords}

CONTENT STYLE REQUIREMENTS:
- **WikiHow/HubSpot Style**: Step-by-step guides with clear instructions
- **Feature-Specific**: Each idea should focus on 2-3 specific TaskPilot features
- **How-To Format**: Titles should be actionable and solution-oriented
- **Professional Audience**: Target project managers, team leads, business owners

Each idea should:
- Be formatted as a clear how-to guide (\"How to [Achieve Specific Goal] with [TaskPilot Feature]\")
- Address real pain points in project management that TaskPilot solves
- Highlight specific TaskPilot features by name (AI Task Generation, Project Dashboard, etc.)
- Include step-by-step methodology that can be taught
- Appeal to different industries (construction, marketing, software, healthcare, etc.)
- Show measurable benefits and ROI potential
- Be practical and immediately actionable

TITLE FORMATS TO USE:
- \"How to [Solve Specific Problem] Using TaskPilot's [Feature Name]\"
- \"Step-by-Step Guide to [Achieving Goal] with [TaskPilot Features]\"
- \"The Complete Guide to [Process] Using TaskPilot [Specific Tools]\"
- \"How [Industry] Professionals Use TaskPilot to [Specific Outcome]\"
- \"Master [Skill/Process] in [Timeframe] with TaskPilot's [Features]\"

FOCUS AREAS FOR IDEAS:
- **AI-Powered Workflows**: How to set up automation rules and AI task generation
- **Project Setup & Templates**: Using TaskPilot's industry-specific templates
- **Team Collaboration**: Managing team members, permissions, and communication
- **Document Intelligence**: Uploading and extracting tasks from project documents
- **Reporting & Analytics**: Creating professional reports and tracking metrics
- **Multi-Project Management**: Managing multiple projects from the dashboard
- **Integration Workflows**: Connecting TaskPilot with other business tools
- **Industry-Specific Use Cases**: Construction, marketing, software development, etc.

FORMAT REQUIREMENTS:
Each idea must specify:
- **Primary TaskPilot Features**: Which specific features will be demonstrated (AI Task Generation, Document Analysis, Automation Rules, etc.)
- **Step Count**: How many main steps the tutorial will have (5-8 steps ideal)
- **Industry Focus**: Which industry or role this guide serves best
- **Measurable Outcome**: What specific result readers will achieve

Format as JSON array with objects containing:
- title: How-to style title (60 chars max for SEO, include \"How to\" or \"Step-by-Step\")
- excerpt: Brief description focusing on the solution and outcome (150-160 chars) 
- target_keywords: Array of 3-5 SEO keywords (include how-to and TaskPilot feature keywords)
- estimated_word_count: Suggested word count (2000-2500 for detailed guides)
- target_audience: Primary audience (e.g. 'Construction Project Managers', 'Marketing Team Leads')
- pain_points: Array of 2-3 specific pain points this guide addresses
- taskpilot_features: Array of specific TaskPilot features to demonstrate (use exact feature names)
- step_count: Number of main steps in the tutorial (5-8 recommended)
- measurable_outcome: Specific, quantifiable result readers will achieve
- industry_focus: Primary industry or business type this serves

EXAMPLE STRUCTURE:
{
  \"title\": \"How to Cut Project Planning Time by 75% with AI Task Generation\",
  \"excerpt\": \"Learn the step-by-step process to use TaskPilot's AI Task Generation to automatically create detailed project plans in minutes instead of hours.\",
  \"target_keywords\": [\"AI task generation\", \"project planning automation\", \"TaskPilot tutorial\", \"project management efficiency\"],
  \"taskpilot_features\": [\"AI Task Generation\", \"Project Templates\", \"Task Automation\", \"Project Dashboard\"],
  \"step_count\": 6,
  \"measurable_outcome\": \"Reduce project planning time from 4 hours to 1 hour\",
  \"industry_focus\": \"Software Development Teams\"
}

Generate ideas that will create comprehensive, actionable tutorials that showcase TaskPilot's specific capabilities while solving real business problems.";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.8);

        return $response ?? [];
    }

    /**
     * Optimize existing content for SEO
     */
    public function optimizeForSEO($title, $content, $targetKeywords = [])
    {
        $keywordString = implode(', ', $targetKeywords);
        $taskPilotContext = $this->getTaskPilotFeatureContext();
        
        $prompt = "Perform comprehensive SEO optimization for this TaskPilot blog post:

Title: {$title}
Content: {$content}
Target Keywords: {$keywordString}

TASKPILOT PLATFORM CONTEXT:
{$taskPilotContext}

SEO OPTIMIZATION REQUIREMENTS:

1. **Keyword Optimization**:
   - Identify primary keyword from title/content
   - Add 5-8 LSI (Latent Semantic Indexing) keywords
   - Ensure 1-2% keyword density (natural placement)
   - Include primary keyword in first 100 words
   - Use keyword variations in headings (H2, H3)

2. **Content Structure Optimization**:
   - Optimize for featured snippets (clear answers, lists)
   - Create compelling meta description with primary keyword
   - Add FAQ section targeting \"People Also Ask\" queries
   - Structure content for voice search optimization
   - Include semantic keywords and entities

3. **Internal Linking Strategy** (CRITICAL):
   - Add 8-10 strategic TaskPilot backlinks throughout content
   - Use varied, natural anchor text
   - Link to relevant TaskPilot features and pages
   - Include call-to-action links to trial/pricing pages
   - Distribute links evenly throughout content

4. **Technical SEO Elements**:
   - Optimize title tag (under 60 characters, include primary keyword)
   - Create compelling meta description (150-160 chars, include CTA)
   - Suggest schema markup for how-to content
   - Optimize for Core Web Vitals (content structure)
   - Include semantic HTML elements

REQUIRED TASKPILOT BACKLINKS (integrate naturally):

**Must Include These Links**:
1. [TaskPilot project management platform](https://taskpilot.com) - Main product reference
2. [TaskPilot's AI-powered features](https://taskpilot.com/features) - Feature overview
3. [TaskPilot pricing plans](https://taskpilot.com/pricing) - Pricing mention
4. [Start your free TaskPilot trial](https://taskpilot.com/register) - CTA link
5. [TaskPilot's AI task generation](https://taskpilot.com/features/ai-task-generation) - Specific feature
6. [TaskPilot automation features](https://taskpilot.com/features/automation) - Automation benefits
7. [TaskPilot project templates](https://taskpilot.com/templates) - Template references
8. [Try TaskPilot for free](https://taskpilot.com/register) - Trial CTA

**Additional Strategic Links** (choose 2-3 based on content):
- [TaskPilot for construction](https://taskpilot.com/industries/construction)
- [TaskPilot team collaboration](https://taskpilot.com/features/collaboration)
- [TaskPilot reporting features](https://taskpilot.com/features/reporting)
- [TaskPilot document analysis](https://taskpilot.com/features/document-analysis)

CONTENT ENHANCEMENTS:

1. **Add FAQ Section** (target PAA queries):
   - \"What is [primary keyword]?\"
   - \"How does TaskPilot help with [main topic]?\"
   - \"What are the benefits of [main topic] with AI?\"
   - \"How much does TaskPilot cost for [use case]?\"

2. **Improve Introduction**:
   - Include primary keyword in first sentence
   - Add compelling statistics or data
   - Preview article benefits clearly
   - Include TaskPilot positioning statement

3. **Enhance Conclusion**:
   - Summarize key takeaways with keywords
   - Strong call-to-action with urgency
   - Multiple TaskPilot links with different anchor text
   - Next steps for readers

4. **Add Value-Added Sections**:
   - \"Common Mistakes to Avoid\"
   - \"Pro Tips from TaskPilot Users\"
   - \"Advanced Strategies\"
   - \"ROI Calculator/Benefits\"

OPTIMIZATION CHECKLIST:
✓ Primary keyword in title, H1, first paragraph, conclusion
✓ LSI keywords distributed naturally throughout
✓ 8+ TaskPilot backlinks with varied anchor text
✓ Meta description with keyword + compelling CTA
✓ Content optimized for featured snippets
✓ FAQ section targeting PAA queries
✓ Schema markup suggestions
✓ Internal link distribution throughout content
✓ Call-to-action optimization

Please provide:
1. **Fully optimized content** with all backlinks integrated naturally
2. **SEO-optimized title** (under 60 chars, primary keyword included)
3. **Compelling meta description** (150-160 chars, keyword + CTA)
4. **Primary and LSI keywords** used in optimization
5. **Schema markup suggestions** for the content type
6. **FAQ section** targeting relevant PAA queries
7. **Internal links summary** with anchor text used
8. **SEO improvements made** and optimization score

FOCUS ON:
- Natural keyword integration (avoid stuffing)
- Strategic TaskPilot link placement for maximum SEO value
- Content that answers search intent completely
- Technical SEO best practices
- Conversion optimization alongside SEO
- Mobile-first content structure
- Voice search optimization

Format as JSON with keys: 
- optimized_title: SEO title with primary keyword
- meta_description: Compelling meta description with CTA
- optimized_content: Fully optimized content with backlinks
- primary_keyword: Main keyword targeted
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
        $taskPilotContext = $this->getTaskPilotFeatureContext();
        
        return "You are an expert SEO content marketer writing for TaskPilot, creating high-quality, SEO-optimized, how-to style blog posts similar to WikiHow and HubSpot. 

Create a comprehensive, step-by-step guide about: {$topic}

Target Audience: {$targetAudience}
Tone: {$tone}

TASKPILOT PLATFORM OVERVIEW:
{$taskPilotContext}

SEO OPTIMIZATION REQUIREMENTS:
1. **Primary Keyword Strategy**:
   - Identify 1 primary keyword (based on topic)
   - Include primary keyword in title, first paragraph, and naturally throughout content
   - Target long-tail variations of primary keyword
   - Use LSI (Latent Semantic Indexing) keywords naturally

2. **Content Structure for SEO**:
   - Include primary keyword in H1 (title)
   - Use secondary keywords in H2 and H3 headings
   - Write compelling meta description with primary keyword
   - Include keyword variations in first 100 words
   - Maintain keyword density of 1-2% (natural placement)

3. **Internal Linking Strategy** (CRITICAL):
   - Include 5-8 strategic backlinks to TaskPilot throughout content
   - Link to TaskPilot features using exact match anchor text
   - Link to TaskPilot pricing pages when mentioning plans
   - Include \"Try TaskPilot\" links with compelling anchor text
   - Use varied anchor text but keep it natural and relevant

CONTENT STYLE REQUIREMENTS:
1. **WikiHow/HubSpot Style Structure**:
   - Clear step-by-step instructions with numbered sections
   - Detailed explanations for each step
   - Actionable tips and best practices
   - Troubleshooting sections where relevant
   - Pro tips and advanced techniques

2. **Rich Content Formatting**:
   - Use **bold text** for important points and TaskPilot features
   - Use *italic text* for emphasis and key concepts
   - Include numbered steps (1., 2., 3., etc.)
   - Use bullet points (-) for lists and sub-points
   - Create clear section headers (## Main Sections, ### Sub-sections)

3. **Specific TaskPilot Integration with SEO Links**:
   - Reference exact TaskPilot features by name (AI Task Generation, Project Dashboard, Automation Rules, etc.)
   - Provide step-by-step instructions on how to use specific TaskPilot features
   - Include exact navigation paths (\"Go to Projects > Create New > Select Template\")
   - Mention specific buttons, menus, and interface elements
   - **CRITICAL**: Include backlinks to TaskPilot pages using natural anchor text

4. **Content Requirements**:
   - 2000-2500 words of detailed, valuable content
   - Include specific examples and use cases
   - Address common challenges and solutions
   - Provide clear action items the reader can implement
   - Include troubleshooting tips and common mistakes to avoid

TASKPILOT BACKLINK STRATEGY (MUST INCLUDE):

**Required Internal Links** (include naturally in content):
1. **Main Product Link**: [TaskPilot project management platform](https://taskpilot.com)
2. **Features Page**: [TaskPilot's AI-powered features](https://taskpilot.com/features)
3. **Pricing Page**: [TaskPilot pricing plans](https://taskpilot.com/pricing)
4. **Free Trial**: [Start your free TaskPilot trial](https://taskpilot.com/register)
5. **AI Features**: [TaskPilot's AI task generation](https://taskpilot.com/features/ai-task-generation)
6. **Automation**: [TaskPilot automation features](https://taskpilot.com/features/automation)
7. **Templates**: [TaskPilot project templates](https://taskpilot.com/templates)
8. **Industries**: [TaskPilot for [specific industry]](https://taskpilot.com/industries)

**Anchor Text Variations** (use naturally):
- \"TaskPilot project management platform\"
- \"Try TaskPilot for free\"
- \"TaskPilot's AI-powered automation\"
- \"Get started with TaskPilot\"
- \"TaskPilot's advanced features\"
- \"Sign up for TaskPilot today\"
- \"TaskPilot's free trial\"
- \"Learn more about TaskPilot\"

ARTICLE STRUCTURE WITH SEO:

**SEO-Optimized Introduction (200-250 words)**:
- Hook with primary keyword in first sentence
- Include problem statement with LSI keywords
- Preview what the reader will learn (include secondary keywords)
- Mention how [TaskPilot project management platform](https://taskpilot.com) specifically solves this challenge
- Include primary keyword 2-3 times naturally

**Step-by-Step Guide with Internal Links (Main Content)**:
Create 5-7 detailed steps, each 300-400 words:

### Step 1: [Action Title with Secondary Keyword]
- Clear explanation of what to do (include LSI keywords)
- **Specific TaskPilot instructions**: \"Navigate to [exact location] and click [specific button]\"
- Why this step matters (include keyword variations)
- Link to relevant TaskPilot feature: [TaskPilot's AI task generation](https://taskpilot.com/features/ai-task-generation)
- Pro tip using TaskPilot's advanced features

### Step 2: [Action Title with Secondary Keyword]
- Detailed how-to instructions (natural keyword placement)
- **TaskPilot Feature Integration**: How to use [specific feature] for this step
- Common challenges and how [TaskPilot's automation features](https://taskpilot.com/features/automation) solve them
- *Best practice tip with keyword variation*

[Continue pattern for all steps...]

**Advanced Tips Section with Backlinks (400-500 words)**:
- Power user techniques using [TaskPilot's advanced features](https://taskpilot.com/features)
- Automation possibilities with [TaskPilot automation](https://taskpilot.com/features/automation)
- Integration with other tools (mention TaskPilot compatibility)
- Scaling strategies using [TaskPilot project templates](https://taskpilot.com/templates)

**Troubleshooting Section (250-300 words)**:
- Common problems and TaskPilot-specific solutions
- When to use different [TaskPilot pricing plans](https://taskpilot.com/pricing)
- Support resources and help options
- Link to [TaskPilot's free trial](https://taskpilot.com/register) for testing solutions

**SEO-Optimized Conclusion & Next Steps (200-250 words)**:
- Recap key benefits (include primary keyword)
- Emphasize ROI and time savings (use LSI keywords)
- Strong call-to-action: [Start your free TaskPilot trial today](https://taskpilot.com/register)
- Mention specific TaskPilot features that will help most
- Include final keyword variations naturally

SEO TECHNICAL REQUIREMENTS:
- Title: Include primary keyword, under 60 characters
- Meta description: Include primary keyword and compelling CTA, 150-160 characters
- Use schema markup concepts (how-to structure)
- Include keyword in URL slug
- Optimize for featured snippets (clear step format)
- Target \"People Also Ask\" questions
- Include semantic keywords and entities
- Maintain readability score above 60

TASKPILOT FEATURE INTEGRATION REQUIREMENTS:
- Mention at least 8 specific TaskPilot features by name
- Provide exact instructions for using each feature
- Include realistic examples and use cases
- Show how TaskPilot's AI capabilities enhance each step
- Reference specific templates, automation rules, or workflows
- Mention relevant pricing plans and trial options with links

Return as JSON with these keys:
- title: SEO-optimized how-to title (60 chars max, include primary keyword)
- excerpt: Compelling summary focusing on the solution (150-160 chars, include keyword)
- content: Full step-by-step guide (formatted text with markdown-style formatting and internal links)
- meta_title: SEO title optimized for search engines
- meta_description: SEO meta description with primary keyword and CTA
- target_keywords: Array of primary and secondary SEO keywords
- primary_keyword: Main keyword to optimize for
- lsi_keywords: Array of LSI and semantic keywords used
- internal_links_used: Array of TaskPilot links included in content
- schema_data: Suggested schema markup elements
- cta_text: Call-to-action button text (action-oriented)
- cta_url: Call-to-action URL (/register or /free-trial)

Make this a comprehensive, SEO-optimized guide that ranks well in search engines while positioning TaskPilot as the essential solution through strategic backlinks and keyword optimization.";
   - Pro tips and advanced techniques

2. **Rich Content Formatting**:
   - Use **bold text** for important points and TaskPilot features
   - Use *italic text* for emphasis and key concepts
   - Include numbered steps (1., 2., 3., etc.)
   - Use bullet points (-) for lists and sub-points
   - Create clear section headers (## Main Sections, ### Sub-sections)

3. **Specific TaskPilot Integration**:
   - Reference exact TaskPilot features by name (AI Task Generation, Project Dashboard, Automation Rules, etc.)
   - Provide step-by-step instructions on how to use specific TaskPilot features
   - Include exact navigation paths (\"Go to Projects > Create New > Select Template\")
   - Mention specific buttons, menus, and interface elements
   - Provide realistic examples using TaskPilot's actual capabilities

4. **Content Requirements**:
   - 2000-2500 words of detailed, valuable content
   - Include specific examples and use cases
   - Address common challenges and solutions
   - Provide clear action items the reader can implement
   - Include troubleshooting tips and common mistakes to avoid

ARTICLE STRUCTURE:

**Introduction (150-200 words)**:
- Hook with a relatable problem
- Preview what the reader will learn
- Mention how TaskPilot specifically solves this challenge

**Step-by-Step Guide (Main Content)**:
Create 5-7 detailed steps, each 200-300 words:

### Step 1: [Action Title]
- Clear explanation of what to do
- **Specific TaskPilot instructions**: \"Navigate to [exact location] and click [specific button]\"
- Why this step matters
- Pro tip using TaskPilot's advanced features

### Step 2: [Action Title]
- Detailed how-to instructions
- **TaskPilot Feature Integration**: How to use [specific feature] for this step
- Common challenges and how TaskPilot solves them
- *Best practice tip*

[Continue pattern for all steps...]

**Advanced Tips Section (300-400 words)**:
- Power user techniques using TaskPilot's advanced features
- Automation possibilities
- Integration with other tools
- Scaling strategies

**Troubleshooting Section (200-250 words)**:
- Common problems and TaskPilot-specific solutions
- When to use different TaskPilot features
- Support resources and help options

**Conclusion & Next Steps (150-200 words)**:
- Recap key benefits
- Clear call-to-action to try TaskPilot
- Specific TaskPilot features that will help most

TASKPILOT FEATURE INTEGRATION REQUIREMENTS:
- Mention at least 5 specific TaskPilot features by name
- Provide exact instructions for using each feature
- Include realistic examples and use cases
- Show how TaskPilot's AI capabilities enhance each step
- Reference specific templates, automation rules, or workflows
- Mention relevant pricing plans and trial options

FORMATTING GUIDELINES:
- Use **bold** for TaskPilot feature names and important actions
- Use *italics* for emphasis and key concepts
- Create clear visual hierarchy with headers
- Include specific UI element names (buttons, menus, tabs)
- Use numbered lists for sequential steps
- Use bullet points for options or benefits

Return as JSON with these keys:
- title: SEO-optimized how-to title (60 chars max, include \"How to\")
- excerpt: Compelling summary focusing on the solution (150-160 chars)
- content: Full step-by-step guide (formatted text with markdown-style formatting)
- meta_title: SEO title optimized for how-to searches
- meta_description: SEO meta description highlighting the step-by-step nature
- target_keywords: Array of primary SEO keywords (include how-to keywords)
- cta_text: Call-to-action button text (action-oriented)
- cta_url: Call-to-action URL (/register or /free-trial)

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
            $tempImageUrl = $imageData['url'];
            
            if (!$tempImageUrl) {
                throw new \Exception('No image URL returned from DALL-E');
            }
            
            // Download and save to ImageKit
            $fileName = 'blog-featured-' . Str::slug($title) . '-' . time() . '.png';
            $savedImage = $this->imageKitService->uploadFromUrl($tempImageUrl, 'blog-featured', $fileName);
            
            return [
                'success' => true,
                'url' => $savedImage['url'],
                'file_id' => $savedImage['file_id'],
                'thumbnail_url' => $savedImage['thumbnail_url'],
                'revised_prompt' => $imageData['revised_prompt'],
                'ai_cost' => $imageData['cost'],
            ];
        } catch (\Exception $e) {
            Log::error('Blog featured image generation failed', [
                'error' => $e->getMessage(),
                'title' => $title,
                'excerpt' => $excerpt,
                'topic' => $topic,
            ]);
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Build image generation prompt for blog featured image
     */
    protected function buildImagePrompt($topic, $title, $excerpt)
    {
        return "Create a high-quality, photorealistic featured image for a professional project management blog post.

Blog Topic: {$topic}
Blog Title: {$title}
Blog Excerpt: {$excerpt}

PHOTOGRAPHY REQUIREMENTS:
- **PHOTOREALISTIC ONLY** - No illustrations, clipart, or cartoon-style graphics
- **HD CAMERA QUALITY** - Sharp, crisp, professional photography aesthetic
- High resolution, studio-quality lighting and composition
- Realistic business environment with authentic-looking people and settings
- Professional commercial photography style (think corporate websites, business magazines)

VISUAL STYLE:
- Modern business photography with natural lighting
- Clean, uncluttered composition with depth of field
- Professional color grading (warm, inviting tones)
- Authentic workplace or business environment
- Contemporary office spaces or modern business settings

REALISTIC ELEMENTS TO INCLUDE:
- Real people in professional business attire working collaboratively
- Modern office environments with natural lighting
- Authentic technology use (laptops, tablets, smartphones in realistic contexts)
- Professional meeting spaces or contemporary workplaces
- Real business scenarios: team meetings, planning sessions, workspace collaboration

PHOTOGRAPHIC COMPOSITION:
- Professional depth of field with sharp focus on key subjects
- Natural lighting with soft shadows and highlights
- Balanced composition following photography best practices
- Authentic expressions and natural body language
- Real-world business environments, not staged studio setups

VISUAL THEMES (PHOTOREALISTIC):
- Team collaboration in modern office spaces
- Project planning sessions with real people
- Technology integration in authentic work environments
- Professional achievement and business success scenarios
- Modern workplace productivity and efficiency

TECHNICAL SPECIFICATIONS:
- Studio-quality lighting and exposure
- Professional color balance and saturation
- Sharp focus with appropriate depth of field
- Realistic textures and materials
- Natural skin tones and authentic expressions

AVOID:
- Any cartoon, illustration, or graphic design elements
- Clipart or vector-style graphics
- Overly saturated or artificial colors
- Staged or obviously fake scenarios
- Low-quality or amateur photography aesthetics

The final image should look like it was shot by a professional photographer for a high-end business publication or corporate website, with authentic people in real workplace environments.";
    }

    /**
     * Get comprehensive TaskPilot feature context for blog content
     */
    protected function getTaskPilotFeatureContext()
    {
        return "
CORE FEATURES:
• AI-Powered Task Generation - Automatically create detailed, professional tasks based on project requirements
• Intelligent Project Assistant - AI chat that provides insights, suggestions, and project guidance
• Advanced Automation System - Create workflows that trigger actions based on project events and conditions
• Professional Report Generation - Generate comprehensive project reports with analytics and forecasting
• Document Analysis & Extraction - Upload project documents and extract actionable tasks and requirements
• Team Collaboration & Member Management - Invite team members with role-based permissions
• Project Timeline & Milestone Tracking - Visual timelines with Gantt-style views and milestone management
• Task Management with Priorities - Comprehensive task boards with status tracking and priority management
• Real-time Comments & Attachments - Collaborative discussion threads and file sharing on tasks
• Multi-project Dashboard - Manage multiple projects from a centralized view

ADVANCED CAPABILITIES:
• Project Type Specialization - Tailored for Construction, Marketing, Sales, HR, Finance, Legal, Operations, etc.
• Industry Domain Expertise - Healthcare, Education, Finance, Retail, SaaS, Manufacturing, and more
• AI Chat Integration - Get instant answers and suggestions for project challenges
• Smart Automation Rules - If/then workflows for task assignments, notifications, and status updates  
• Professional PDF Reports - Detailed analytics with charts, forecasting, and strategic recommendations
• Document Intelligence - Upload requirements docs and auto-generate project plans
• Usage Tracking & Analytics - Monitor team productivity and project progress with detailed metrics

PRICING & PLANS:
• Free Plan - 5 AI task generations, basic features for individual use
• Basic Plan ($19/month) - 25 AI generations, unlimited reports, email support, 7-day free trial
• Pro Plan ($39/month) - 50 AI generations, priority support, advanced features, 14-day free trial  
• Business Plan ($79/month) - 200 AI generations, team collaboration, priority support, 14-day free trial
• Enterprise/AppSumo - Lifetime access options for power users

COMPETITIVE ADVANTAGES:
• AI-first approach vs traditional project management tools
• Instant setup vs complex configuration required by enterprise tools
• Intelligent automation vs manual process management
• Professional reporting vs basic task tracking
• Document intelligence vs manual data entry
• Free trial access vs immediate payment requirements";
    }

    /**
     * Parse and validate AI response
     */
    protected function parseBlogResponse($response)
    {
        // The chatJson method returns an array directly
        $data = is_array($response) ? $response : json_decode($response, true);
        
        if (!$data) {
            throw new \Exception('Invalid AI response format');
        }

        // Validate required fields
        $required = ['title', 'excerpt', 'content', 'meta_title', 'meta_description'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new \Exception("Missing required field: {$field}");
            }
        }

        // Generate slug from title
        $data['slug'] = Str::slug($data['title']);

        // Ensure arrays exist
        $data['target_keywords'] = $data['target_keywords'] ?? [];
        $data['cta_text'] = $data['cta_text'] ?? 'Start Your Free Trial';
        $data['cta_url'] = $data['cta_url'] ?? '/register';

        // Clean and format content
        $data['content'] = $this->formatBlogContent($data['content']);

        return $data;
    }

    /**
     * Format blog content with TaskPilot-specific enhancements and rich styling
     */
    public function formatBlogContent($content)
    {
        // If content already has HTML tags, clean it first
        if (strpos($content, '<') !== false) {
            // Remove any existing wrapper tags that might cause duplication
            $content = preg_replace('/<\/?p[^>]*>/i', '', $content);
            $content = trim($content);
        }

        // Convert plain text formatting to rich HTML
        $lines = explode("\n", $content);
        $formatted = [];
        $inList = false;
        $inNumberedList = false;
        $stepCounter = 1;
        
        foreach ($lines as $line) {
            $line = trim($line);
            
            if (empty($line)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                continue;
            }
            
            // Handle main headings (##)
            if (preg_match('/^## (.+)$/', $line, $matches)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                $formatted[] = '<div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500 my-8">';
                $formatted[] = '<h2 class="text-2xl font-bold text-gray-900 mb-2 text-blue-900">' . $matches[1] . '</h2>';
                $formatted[] = '</div>';
            } 
            // Handle sub-headings (###)
            elseif (preg_match('/^### (.+)$/', $line, $matches)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                $formatted[] = '<div class="bg-gray-50 p-4 rounded-lg border-l-3 border-indigo-400 my-6">';
                $formatted[] = '<h3 class="text-xl font-semibold text-gray-900 mb-2 text-indigo-800">' . $matches[1] . '</h3>';
                $formatted[] = '</div>';
            }
            // Handle step headings (Step X:)
            elseif (preg_match('/^(Step \d+:|Step \d+ -|Step \d+\.|### Step \d+:) (.+)$/', $line, $matches)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                $formatted[] = '<div class="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 my-8 shadow-sm">';
                $formatted[] = '<div class="flex items-center mb-3">';
                $formatted[] = '<span class="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">' . $stepCounter . '</span>';
                $formatted[] = '<h3 class="text-xl font-bold text-green-900">Step ' . $stepCounter . ': ' . $matches[2] . '</h3>';
                $formatted[] = '</div>';
                $stepCounter++;
            }
            // Handle numbered list items (1., 2., etc.)
            elseif (preg_match('/^(\d+)\.\s+(.+)$/', $line, $matches)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if (!$inNumberedList) {
                    $formatted[] = '<ol class="list-decimal ml-6 mb-4 space-y-2">';
                    $inNumberedList = true;
                }
                $content = $this->formatInlineText($matches[2]);
                $formatted[] = '<li class="text-gray-700 leading-relaxed"><strong class="text-gray-900">' . $content . '</strong></li>';
            }
            // Handle bullet points
            elseif (preg_match('/^- (.+)$/', $line, $matches)) {
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                if (!$inList) {
                    $formatted[] = '<ul class="list-disc ml-6 mb-4 space-y-1">';
                    $inList = true;
                }
                $content = $this->formatInlineText($matches[1]);
                $formatted[] = '<li class="text-gray-700 leading-relaxed">' . $content . '</li>';
            }
            // Handle pro tips and special callouts
            elseif (preg_match('/^(Pro Tip|💡 Pro Tip|Tip|Best Practice|Important|Note):/i', $line)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                $content = $this->formatInlineText($line);
                $formatted[] = '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4 rounded-r-lg">';
                $formatted[] = '<div class="flex items-start">';
                $formatted[] = '<div class="text-yellow-600 mr-3">💡</div>';
                $formatted[] = '<p class="text-yellow-800 font-medium">' . $content . '</p>';
                $formatted[] = '</div>';
                $formatted[] = '</div>';
            }
            // Handle TaskPilot feature callouts
            elseif (preg_match('/TaskPilot/i', $line) && preg_match('/\*\*(.+?)\*\*/', $line)) {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                $content = $this->formatInlineText($line);
                $formatted[] = '<div class="bg-blue-50 border border-blue-200 p-4 my-4 rounded-lg">';
                $formatted[] = '<div class="flex items-start">';
                $formatted[] = '<div class="text-blue-600 mr-3">🚀</div>';
                $formatted[] = '<p class="text-blue-900 leading-relaxed">' . $content . '</p>';
                $formatted[] = '</div>';
                $formatted[] = '</div>';
            }
            // Handle regular paragraphs
            else {
                if ($inList) {
                    $formatted[] = '</ul>';
                    $inList = false;
                }
                if ($inNumberedList) {
                    $formatted[] = '</ol>';
                    $inNumberedList = false;
                }
                
                $content = $this->formatInlineText($line);
                
                // Close any open step div
                if (strpos($content, '</div>') === false && isset($formatted[count($formatted) - 1]) && 
                    strpos($formatted[count($formatted) - 1], 'bg-gradient-to-r from-green-50') !== false) {
                    $formatted[] = '<p class="text-gray-700 leading-relaxed mt-3">' . $content . '</p>';
                    $formatted[] = '</div>'; // Close step div
                } else {
                    $formatted[] = '<p class="text-gray-700 mb-4 leading-relaxed text-lg">' . $content . '</p>';
                }
            }
        }
        
        // Close any open lists or divs
        if ($inList) {
            $formatted[] = '</ul>';
        }
        if ($inNumberedList) {
            $formatted[] = '</ol>';
        }

        return implode("\n", $formatted);
    }

    /**
     * Format inline text with rich styling and SEO-optimized links
     */
    private function formatInlineText($text)
    {
        // Convert **bold** to styled strong tags
        $text = preg_replace('/\*\*(.+?)\*\*/', '<strong class="text-gray-900 font-semibold bg-yellow-100 px-1 rounded">$1</strong>', $text);
        
        // Convert *italic* to styled em tags
        $text = preg_replace('/\*(.+?)\*/', '<em class="text-indigo-700 font-medium">$1</em>', $text);
        
        // Highlight TaskPilot feature names
        $text = preg_replace('/(AI Task Generation|Project Dashboard|Automation Rules|Document Analysis|Team Collaboration|Project Timeline|Task Management|AI Chat|Report Generation|Project Assistant)/i', 
            '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium">$1</span>', $text);
        
        // Handle TaskPilot backlinks with SEO-optimized styling
        $taskpilotLinkPatterns = [
            '/\[TaskPilot project management platform\]\(https:\/\/taskpilot\.com\)/' => '<a href="https://taskpilot.com" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot project management platform</a>',
            '/\[TaskPilot\'s AI-powered features\]\(https:\/\/taskpilot\.com\/features\)/' => '<a href="https://taskpilot.com/features" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot\'s AI-powered features</a>',
            '/\[TaskPilot pricing plans\]\(https:\/\/taskpilot\.com\/pricing\)/' => '<a href="https://taskpilot.com/pricing" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot pricing plans</a>',
            '/\[Start your free TaskPilot trial\]\(https:\/\/taskpilot\.com\/register\)/' => '<a href="https://taskpilot.com/register" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold inline-block transition-colors" rel="noopener" target="_blank">Start your free TaskPilot trial</a>',
            '/\[TaskPilot\'s AI task generation\]\(https:\/\/taskpilot\.com\/features\/ai-task-generation\)/' => '<a href="https://taskpilot.com/features/ai-task-generation" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot\'s AI task generation</a>',
            '/\[TaskPilot automation features\]\(https:\/\/taskpilot\.com\/features\/automation\)/' => '<a href="https://taskpilot.com/features/automation" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot automation features</a>',
            '/\[TaskPilot project templates\]\(https:\/\/taskpilot\.com\/templates\)/' => '<a href="https://taskpilot.com/templates" class="text-blue-600 hover:text-blue-800 font-semibold underline decoration-2 decoration-blue-400" rel="noopener" target="_blank">TaskPilot project templates</a>',
            '/\[Try TaskPilot for free\]\(https:\/\/taskpilot\.com\/register\)/' => '<a href="https://taskpilot.com/register" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded font-semibold inline-block transition-colors" rel="noopener" target="_blank">Try TaskPilot for free</a>',
        ];
        
        foreach ($taskpilotLinkPatterns as $pattern => $replacement) {
            $text = preg_replace($pattern, $replacement, $text);
        }
        
        // Convert remaining [link text](url) to styled links
        $text = preg_replace('/\[([^\]]+)\]\(([^\)]+)\)/', 
            '<a href="$2" class="text-blue-600 hover:text-blue-800 underline font-medium decoration-2" rel="noopener" target="_blank">$1</a>', $text);
        
        // Highlight UI elements in quotes
        $text = preg_replace('/"([^"]+)"/', '<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">$1</code>', $text);
        
        return $text;
    }

    /**
     * Generate meta keywords for SEO
     */
    public function generateSEOKeywords($title, $content, $maxKeywords = 10)
    {
        $prompt = "Extract the most relevant SEO keywords from this blog post for TaskPilot, an AI-powered project management platform:

Title: {$title}
Content: " . Str::limit(strip_tags($content), 1000) . "

Focus on keywords that combine:
- Project management terms (project planning, task management, team collaboration)
- AI and automation keywords (AI project assistant, automated workflows, intelligent task generation)
- Business process terms (productivity, efficiency, project reporting, team management)
- Industry-specific terms (construction project management, software project planning, etc.)
- Problem-solution keywords (project delays, team coordination, project visibility)
- Tool comparison terms (vs Asana, vs Monday.com, project management software)
- Conversion terms (project management tool, free trial, project management platform)

Prioritize:
1. High-volume, medium competition keywords
2. Long-tail keywords that indicate buying intent
3. Keywords that highlight TaskPilot's unique AI features
4. Industry-specific project management terms
5. Problem-solving keywords that TaskPilot addresses

Return as comma-separated list of {$maxKeywords} keywords, ordered by SEO potential and relevance to TaskPilot's features.";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatText($messages, 0.3);

        return array_map('trim', explode(',', $response));
    }

    /**
     * Generate comprehensive SEO audit and recommendations
     */
    public function generateSEOAudit($title, $content, $targetKeywords = [])
    {
        $prompt = "Perform a comprehensive SEO audit for this TaskPilot blog post and provide specific optimization recommendations:

Title: {$title}
Content: " . Str::limit(strip_tags($content), 2000) . "
Target Keywords: " . implode(', ', $targetKeywords) . "

AUDIT CHECKLIST:

1. **Keyword Analysis**:
   - Primary keyword identification and placement
   - Keyword density analysis (target 1-2%)
   - LSI keyword opportunities
   - Keyword stuffing check
   - Long-tail keyword suggestions

2. **Content Structure**:
   - Title tag optimization (under 60 chars)
   - Meta description optimization (150-160 chars)
   - Header structure (H1, H2, H3 hierarchy)
   - Content length and depth
   - Readability score estimation

3. **Internal Linking**:
   - TaskPilot backlink opportunities
   - Anchor text variety and optimization
   - Link distribution throughout content
   - Strategic CTA link placement

4. **Technical SEO**:
   - Schema markup opportunities
   - Featured snippet optimization
   - People Also Ask targeting
   - Voice search optimization
   - Mobile-first content structure

5. **Competitive Analysis**:
   - Content gap identification
   - Unique value proposition clarity
   - TaskPilot differentiation opportunities
   - Industry-specific optimization

PROVIDE SPECIFIC RECOMMENDATIONS:
- Exact keyword placement suggestions
- Missing TaskPilot backlinks to add
- Content sections to enhance
- Technical improvements needed
- Conversion optimization opportunities

Format as JSON with keys:
- audit_score: Overall SEO score (1-100)
- keyword_optimization: Keyword analysis and recommendations
- content_structure: Structure improvements needed
- internal_linking: TaskPilot backlink recommendations
- technical_seo: Technical improvements
- competitive_gaps: Content gaps to address
- priority_fixes: Top 5 most important improvements
- estimated_impact: Expected traffic/ranking improvement";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.4);

        return $response ?? [];
    }

    /**
     * Generate schema markup for blog posts
     */
    public function generateSchemaMarkup($title, $content, $author = 'TaskPilot Team')
    {
        $steps = [];
        $stepCounter = 1;
        
        // Extract steps from content
        if (preg_match_all('/(?:Step \d+:|###\s*Step \d+:)\s*(.+?)(?=(?:Step \d+:|###\s*Step \d+:|\z))/s', $content, $matches)) {
            foreach ($matches[1] as $stepContent) {
                $stepContent = strip_tags($stepContent);
                $stepContent = trim(preg_replace('/\s+/', ' ', $stepContent));
                if (strlen($stepContent) > 50) {
                    $steps[] = [
                        '@type' => 'HowToStep',
                        'name' => 'Step ' . $stepCounter,
                        'text' => Str::limit($stepContent, 200),
                        'position' => $stepCounter
                    ];
                    $stepCounter++;
                }
            }
        }

        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'HowTo',
            'name' => $title,
            'description' => strip_tags(Str::limit($content, 300)),
            'author' => [
                '@type' => 'Organization',
                'name' => $author,
                'url' => 'https://taskpilot.com'
            ],
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'TaskPilot',
                'url' => 'https://taskpilot.com',
                'logo' => [
                    '@type' => 'ImageObject',
                    'url' => 'https://taskpilot.com/logo.png'
                ]
            ],
            'mainEntityOfPage' => [
                '@type' => 'WebPage',
                '@id' => 'https://taskpilot.com/blog/' . Str::slug($title)
            ],
            'step' => $steps,
            'totalTime' => 'PT' . (count($steps) * 5) . 'M',
            'supply' => [
                [
                    '@type' => 'HowToSupply',
                    'name' => 'TaskPilot Account'
                ]
            ],
            'tool' => [
                [
                    '@type' => 'HowToTool',
                    'name' => 'TaskPilot Project Management Platform',
                    'url' => 'https://taskpilot.com'
                ]
            ]
        ];

        return $schema;
    }

    /**
     * Generate compelling blog titles based on topic
     */
    public function generateBlogTitles($topic, $count = 5)
    {
        $prompt = "Generate {$count} compelling, SEO-optimized blog post titles for TaskPilot (AI-powered project management platform) about: {$topic}

Requirements:
- 60 characters or less for SEO optimization
- Include power words (boost, master, ultimate, proven, revolutionize, streamline, etc.)
- Appeal to project managers, team leads, and business professionals
- Promise clear value/solution that TaskPilot provides
- Be click-worthy but authentic (no clickbait)
- Include relevant keywords naturally

TITLE APPROACHES:
1. Problem-solution format: 'How [TaskPilot Feature] Solves [Common Problem]'
2. Benefit-focused: '[Number] Ways AI Project Management Boosts [Outcome]'
3. Comparison: 'Why AI-Powered PM Beats Traditional [Tool/Method]'
4. Guide format: 'Complete Guide to [Process] with AI Automation'
5. Industry-specific: '[Industry] Project Management: AI vs Manual'

INCORPORATE TASKPILOT'S KEY DIFFERENTIATORS:
- AI-powered task generation
- Intelligent automation
- Professional reporting
- Document intelligence
- Multi-industry expertise
- Free trial availability

Examples of strong formats:
- 'How AI Task Generation Cuts Project Planning Time by 75%'
- 'Ultimate Guide to Automated Project Management in 2024'
- 'Why Smart Teams Choose AI Over Traditional PM Tools'

Return as JSON array of strings, ordered by click-through potential.";

        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];

        $response = $this->openAIService->chatJson($messages, 0.8);

        return $response ?? [];
    }

    /**
     * Generate conversion-focused content sections
     */
    public function generateConversionContent($topic, $sectionType = 'cta')
    {
        $taskPilotContext = $this->getTaskPilotFeatureContext();
        
        $prompts = [
            'cta' => "Create a compelling call-to-action section for a blog post about '{$topic}' that converts readers to TaskPilot users. 

            TASKPILOT CONTEXT: {$taskPilotContext}

            Include:
            - Specific benefits relevant to the topic
            - Urgency around trying TaskPilot's free trial
            - Clear value proposition vs competitors
            - How TaskPilot's AI features solve their problems
            - Multiple CTA options (free trial, demo, pricing)
            - Risk-free trial messaging
            Make it compelling but not pushy.",

            'intro' => "Write an engaging introduction for a blog post about '{$topic}' that hooks project managers and team leads while positioning TaskPilot as the AI-powered solution.

            TASKPILOT CONTEXT: {$taskPilotContext}

            The intro should:
            - Start with a relatable pain point or scenario
            - Capture attention with compelling statistics or questions
            - Introduce the topic's importance
            - Subtly hint at TaskPilot's unique approach
            - Promise valuable insights ahead
            - Be 2-3 paragraphs maximum",

            'conclusion' => "Write a strong conclusion for a blog post about '{$topic}' that summarizes key points and drives readers to try TaskPilot.

            TASKPILOT CONTEXT: {$taskPilotContext}

            The conclusion should:
            - Recap the main insights and takeaways
            - Reinforce how TaskPilot addresses the topic's challenges
            - Create urgency around taking action
            - Highlight the free trial opportunity
            - Include a clear next step
            - End with confidence and momentum"
        ];

        $prompt = $prompts[$sectionType] ?? $prompts['cta'];
        
        $messages = [
            ['role' => 'user', 'content' => $prompt]
        ];
        
        $response = $this->openAIService->chatText($messages, 0.7);

        return $response;
    }
}
