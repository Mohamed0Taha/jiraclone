<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Consolidate duplicates across users for the same project+name
        // Keep the most recently updated record and delete the rest
        $duplicates = DB::table('custom_views')
            ->select('project_id', 'name', DB::raw('COUNT(*) as c'))
            ->groupBy('project_id', 'name')
            ->having('c', '>', 1)
            ->get();

        foreach ($duplicates as $dup) {
            $rows = DB::table('custom_views')
                ->where('project_id', $dup->project_id)
                ->where('name', $dup->name)
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->get();

            $keep = $rows->first();
            $toDelete = $rows->slice(1)->pluck('id')->all();

            if (!empty($toDelete)) {
                DB::table('custom_views')->whereIn('id', $toDelete)->delete();
            }

            // Ensure the kept record remains active
            if ($keep && property_exists($keep, 'is_active')) {
                DB::table('custom_views')->where('id', $keep->id)->update([
                    'is_active' => true,
                ]);
            }
        }

        // Ensure single-column indexes exist for FKs so we can drop the composite unique index safely
        Schema::table('custom_views', function (Blueprint $table) {
            // These will no-op if they already exist (on most drivers it will error), so wrap in try/catch
            try { $table->index('project_id', 'custom_views_project_id_index'); } catch (\Throwable $e) {}
            try { $table->index('user_id', 'custom_views_user_id_index'); } catch (\Throwable $e) {}
        });

        // Switch uniqueness to project_id + name (shared across all project members)
        Schema::table('custom_views', function (Blueprint $table) {
            // Drop old unique index if it exists (project_id, user_id, name)
            try {
                $table->dropUnique('custom_views_project_id_user_id_name_unique');
            } catch (\Throwable $e) {
                // Fallback: try dropping by column signature (works with default index names)
                try { $table->dropUnique(['project_id', 'user_id', 'name']); } catch (\Throwable $e2) {}
            }

            // Add new unique index for shared views
            try { $table->unique(['project_id', 'name'], 'custom_views_project_id_name_unique'); } catch (\Throwable $e) {}
        });
    }

    public function down(): void
    {
        Schema::table('custom_views', function (Blueprint $table) {
            // Revert to previous uniqueness if needed
            try {
                $table->dropUnique('custom_views_project_id_name_unique');
            } catch (\Throwable $e) {
                try { $table->dropUnique(['project_id', 'name']); } catch (\Throwable $e2) {}
            }

            // Restore original unique constraint
            try { $table->unique(['project_id', 'user_id', 'name'], 'custom_views_project_id_user_id_name_unique'); } catch (\Throwable $e) {}

            // Optional: drop extra single-column indexes if you want a clean revert
            try { $table->dropIndex('custom_views_project_id_index'); } catch (\Throwable $e) {}
            try { $table->dropIndex('custom_views_user_id_index'); } catch (\Throwable $e) {}
        });
    }
};
