<?php

namespace App\Filament\Resources\Users\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required(),
                Toggle::make('is_admin')
                    ->required(),
                TextInput::make('google_id'),
                TextInput::make('google_avatar'),
                DateTimePicker::make('email_verified_at'),
                TextInput::make('password')
                    ->password()
                    ->required(),
                Toggle::make('trial_used')
                    ->required(),
                TextInput::make('trial_plan'),
                TextInput::make('ai_tasks_used')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('ai_chat_used')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('reports_generated')
                    ->required()
                    ->numeric()
                    ->default(0),
                DatePicker::make('usage_reset_date'),
                TextInput::make('current_month')
                    ->numeric(),
                TextInput::make('current_year')
                    ->numeric(),
                TextInput::make('stripe_id'),
                TextInput::make('pm_type'),
                TextInput::make('pm_last_four'),
                DateTimePicker::make('trial_ends_at'),
            ]);
    }
}
