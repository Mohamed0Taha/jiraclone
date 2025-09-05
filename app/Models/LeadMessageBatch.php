<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeadMessageBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id','template_hash','template_raw','total','sent','failed'
    ];

    public function messages()
    {
        return $this->hasMany(LeadMessage::class, 'batch_id');
    }
}
