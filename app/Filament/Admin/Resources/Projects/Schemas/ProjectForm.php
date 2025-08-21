<?php

namespace App\Filament\Admin\Resources\Projects\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Schema;

class ProjectForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('user_id')
                    ->required()
                    ->numeric(),
                TextInput::make('name')
                    ->required(),
                TextInput::make('key'),
                Textarea::make('description')
                    ->columnSpanFull(),
                TextInput::make('meta'),
                DatePicker::make('start_date'),
                DatePicker::make('end_date'),
            ]);
    }
}
