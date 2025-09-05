<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id','full_name','first_name','last_name','title','company','location','linkedin_profile_url','search_hash','status','meta'
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    public function messages()
    {
        return $this->hasMany(LeadMessage::class);
    }
}
