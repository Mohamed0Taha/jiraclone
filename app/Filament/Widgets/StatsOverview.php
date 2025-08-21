<?php

namespace App\Filament\Widgets;

use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Total Users', \App\Models\User::count())
                ->description('Registered users')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),
                
            Stat::make('Total Projects', \App\Models\Project::count())
                ->description('All projects')
                ->descriptionIcon('heroicon-m-folder')
                ->color('info'),
                
            Stat::make('Total Tasks', \App\Models\Task::count())
                ->description('All tasks')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('warning'),
                
            Stat::make('Active Subscriptions', \App\Models\User::whereNotNull('stripe_id')->count())
                ->description('Paying customers')
                ->descriptionIcon('heroicon-m-credit-card')
                ->color('success'),
        ];
    }
}
