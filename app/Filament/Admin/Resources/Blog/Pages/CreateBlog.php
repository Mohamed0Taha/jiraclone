<?php

namespace App\Filament\Admin\Resources\Blog\Pages;

use App\Filament\Admin\Resources\BlogResource;
use Filament\Resources\Pages\CreateRecord;

class CreateBlog extends CreateRecord
{
    protected static string $resource = BlogResource::class;
}
