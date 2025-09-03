<?php

namespace App\Console\Commands;

use App\Models\Blog;
use App\Models\User;
use App\Services\BlogAIService;
use Illuminate\Console\Command;

class GenerateAIBlogPost extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'blog:generate {topic} {--audience=project managers and teams} {--publish}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate an AI-powered blog post for TaskPilot';

    /**
     * Execute the console command.
     */
    public function handle(BlogAIService $blogAI)
    {
        $topic = $this->argument('topic');
        $audience = $this->option('audience');
        $publish = $this->option('publish');

        $this->info("Generating AI blog post about: {$topic}");
        $this->info("Target audience: {$audience}");

        try {
            // Generate blog content
            $blogData = $blogAI->generateBlogPost($topic, $audience);
            
            // Get admin user
            $admin = User::where('is_admin', true)->first();
            if (!$admin) {
                $this->error('No admin user found. Please create an admin user first.');
                return 1;
            }

            // Create blog post
            $blog = Blog::create([
                'title' => $blogData['title'],
                'slug' => $blogData['slug'],
                'excerpt' => $blogData['excerpt'],
                'content' => $blogData['content'],
                'meta_title' => $blogData['meta_title'],
                'meta_description' => $blogData['meta_description'],
                'is_published' => $publish,
                'published_at' => $publish ? now() : null,
                'author_id' => $admin->id
            ]);

            $this->newLine();
            $this->info('✅ Blog post created successfully!');
            $this->table(
                ['Field', 'Value'],
                [
                    ['ID', $blog->id],
                    ['Title', $blog->title],
                    ['Slug', $blog->slug],
                    ['Status', $blog->is_published ? 'Published' : 'Draft'],
                    ['URL', $blog->is_published ? url("/blog/{$blog->slug}") : 'Not published'],
                    ['Admin URL', url("/admin/blogs/{$blog->id}")],
                ]
            );

            if ($publish) {
                $this->info("🌐 Public URL: " . url("/blog/{$blog->slug}"));
            } else {
                $this->warn("📝 Blog post saved as draft. Publish it from the admin panel.");
            }

            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to generate blog post: ' . $e->getMessage());
            return 1;
        }
    }
}
