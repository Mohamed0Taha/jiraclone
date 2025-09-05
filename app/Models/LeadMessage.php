<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Lead;
use App\Models\LeadMessageBatch;

class LeadMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id','batch_id','user_id','rendered_message','status','error'
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function batch()
    {
        return $this->belongsTo(LeadMessageBatch::class, 'batch_id');
    }
}
