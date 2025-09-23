<?php

namespace App\Filament\Admin\Resources\Blog\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class BlogForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Blog Content')
                    ->schema([
                        TextInput::make('title')
                            ->required()
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $context, $state, callable $set) {
                                if ($context !== 'create') {
                                    return;
                                }
                                $set('slug', \Illuminate\Support\Str::slug($state));
                            }),
                        TextInput::make('slug')
                            ->required()
                            ->unique(ignoreRecord: true),
                        Textarea::make('excerpt')
                            ->rows(3)
                            ->columnSpanFull(),
                        RichEditor::make('content')
                            ->required()
                            ->columnSpanFull(),
                        FileUpload::make('featured_image')
                            ->label('Featured Image')
                            ->image()
                            ->directory('blog-images')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                
                Section::make('SEO & Metadata')
                    ->schema([
                        TextInput::make('meta_title')
                            ->label('SEO Title'),
                        Textarea::make('meta_description')
                            ->label('SEO Description')
                            ->rows(3)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                
                Section::make('Publishing')
                    ->schema([
                        Select::make('author_id')
                            ->label('Author')
                            ->relationship('author', 'name')
                            ->required()
                            ->default(auth()->id()),
                        Toggle::make('is_published')
                            ->label('Published')
                            ->default(false),
                        DateTimePicker::make('published_at')
                            ->label('Publish Date'),
                        TextInput::make('views')
                            ->label('Views')
                            ->numeric()
                            ->disabled()
                            ->dehydrated(false)
                            ->formatStateUsing(function ($state): string {
                                if (!$state) return '0';
                                if ($state >= 1000000) {
                                    return number_format($state / 1000000, 1) . 'M';
                                } elseif ($state >= 1000) {
                                    return number_format($state / 1000, 1) . 'K';
                                }
                                return number_format($state);
                            })
                            ->helperText('This field is automatically updated when users view the blog post.'),
                    ])
                    ->columns(2),
            ]);
    }
}
