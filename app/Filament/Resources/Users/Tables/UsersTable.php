<?php

namespace App\Filament\Resources\Users\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class UsersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->searchable(),
                TextColumn::make('email')
                    ->label('Email address')
                    ->searchable(),
                IconColumn::make('is_admin')
                    ->boolean(),
                TextColumn::make('google_id')
                    ->searchable(),
                TextColumn::make('google_avatar')
                    ->searchable(),
                TextColumn::make('email_verified_at')
                    ->dateTime()
                    ->sortable(),
                IconColumn::make('trial_used')
                    ->boolean(),
                TextColumn::make('trial_plan')
                    ->searchable(),
                TextColumn::make('ai_tasks_used')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('ai_chat_used')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('reports_generated')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('usage_reset_date')
                    ->date()
                    ->sortable(),
                TextColumn::make('current_month')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('current_year')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('stripe_id')
                    ->searchable(),
                TextColumn::make('pm_type')
                    ->searchable(),
                TextColumn::make('pm_last_four')
                    ->searchable(),
                TextColumn::make('trial_ends_at')
                    ->dateTime()
                    ->sortable(),
            ])
            ->filters([
                //
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
