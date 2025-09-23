<?php

namespace App\Filament\Admin\Resources\Blog\Schemas;

use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Schema;

class BlogInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextEntry::make('title')
                    ->size('lg')
                    ->weight('bold'),
                TextEntry::make('slug')
                    ->copyable(),
                TextEntry::make('excerpt')
                    ->limit(100),
                TextEntry::make('author.name')
                    ->label('Author'),
                IconEntry::make('is_published')
                    ->label('Published')
                    ->boolean(),
                TextEntry::make('views')
                    ->label('Total Views')
                    ->formatStateUsing(function ($state): string {
                        if ($state >= 1000000) {
                            return number_format($state / 1000000, 1) . 'M views';
                        } elseif ($state >= 1000) {
                            return number_format($state / 1000, 1) . 'K views';
                        }
                        return number_format($state) . ' views';
                    })
                    ->badge()
                    ->color('success'),
                TextEntry::make('published_at')
                    ->label('Published Date')
                    ->dateTime('M j, Y g:i A'),
                TextEntry::make('meta_title')
                    ->label('SEO Title'),
                TextEntry::make('meta_description')
                    ->label('SEO Description')
                    ->limit(100),
                TextEntry::make('created_at')
                    ->dateTime('M j, Y g:i A'),
                TextEntry::make('updated_at')
                    ->dateTime('M j, Y g:i A'),
            ]);
    }
}
