<?php

namespace App\Support;

/**
 * Provides a library of varied project scenario presets.
 * Temporary: 50 presets with differing domains, budgets, requirements.
 */
class ProjectPresets
{
    protected static array $presets = [
        ['title' => 'E-Commerce MVP', 'description' => 'Launch storefront with auth, catalog, checkout in limited time', 'budget' => 18000, 'requirements' => 'Auth, product catalog, cart, checkout, order emails'],
        ['title' => 'SaaS Billing Portal', 'description' => 'Self-service billing and subscription management', 'budget' => 22000, 'requirements' => 'Stripe integration, subscription plans, usage tracking, invoices'],
        ['title' => 'Analytics Dashboard', 'description' => 'Interactive BI dashboard for marketing KPIs', 'budget' => 20000, 'requirements' => 'User auth, role-based access, chart widgets, export CSV, filters'],
        ['title' => 'Mobile API Backend', 'description' => 'Backend for mobile app: users, messaging, notifications', 'budget' => 17000, 'requirements' => 'REST API, JWT auth, push notifications, message threads'],
        ['title' => 'Content Publishing Platform', 'description' => 'CMS-lite for articles and media assets', 'budget' => 15000, 'requirements' => 'Rich text editor, media library, tagging, search, SEO meta'],
        ['title' => 'Customer Support Portal', 'description' => 'Ticketing portal with SLA tracking', 'budget' => 16500, 'requirements' => 'Tickets, SLA timers, email ingest, status workflows, reports'],
        ['title' => 'IoT Device Monitor', 'description' => 'Monitor + control dashboard for IoT sensors', 'budget' => 23000, 'requirements' => 'Device registry, telemetry ingestion, real-time charts, alerts'],
        ['title' => 'Learning Management Mini', 'description' => 'Lightweight LMS for internal training', 'budget' => 14000, 'requirements' => 'Course catalog, enrollment, progress tracking, quizzes'],
        ['title' => 'HR Onboarding Tracker', 'description' => 'Automate employee onboarding tasks', 'budget' => 16000, 'requirements' => 'Task templates, role-based checklists, document e-sign, reminders'],
        ['title' => 'Event Registration App', 'description' => 'Manage event sessions & attendee registration', 'budget' => 15000, 'requirements' => 'Sessions CRUD, ticket types, payment, QR check-in'],
        ['title' => 'Travel Booking Engine', 'description' => 'MVP for lodging + flight search aggregation', 'budget' => 26000, 'requirements' => 'Search aggregation, caching, booking cart, payment, itinerary emails'],
        ['title' => 'Inventory Management Tool', 'description' => 'Warehouse inventory tracking & reorder alerts', 'budget' => 19000, 'requirements' => 'SKU management, stock levels, reorder thresholds, supplier export'],
        ['title' => 'Marketing Automation Core', 'description' => 'Email campaign scheduling & segmentation', 'budget' => 24000, 'requirements' => 'Audience segments, campaign builder, send scheduler, metrics'],
        ['title' => 'Social Microblog MVP', 'description' => 'Short post feed with reactions and follows', 'budget' => 13000, 'requirements' => 'User profiles, follow graph, timeline feed, reactions, moderation'],
        ['title' => 'Video Processing Pipeline', 'description' => 'Upload + transcode service with watch pages', 'budget' => 27000, 'requirements' => 'Upload, queue transcode jobs, adaptive streams, thumbnail gen'],
        ['title' => 'Document E-Sign Service', 'description' => 'Upload docs, define signers, track status', 'budget' => 25000, 'requirements' => 'PDF templates, signature fields, audit trail, notifications'],
        ['title' => 'Fitness Coaching Portal', 'description' => 'Workout plan delivery + progress tracking', 'budget' => 15500, 'requirements' => 'Plan assignments, exercise library, progress logs, chat'],
        ['title' => 'Real Estate Listings', 'description' => 'Property listing + search with saved alerts', 'budget' => 18500, 'requirements' => 'Listings CRUD, search filters, map integration, saved alerts'],
        ['title' => 'Bug Tracking System', 'description' => 'Issue tracker for internal teams', 'budget' => 14500, 'requirements' => 'Projects, issues, labels, comments, notifications, reports'],
        ['title' => 'Workflow Automation Rules', 'description' => 'If-this-then-that internal rule engine', 'budget' => 21000, 'requirements' => 'Triggers, conditions, actions, execution logs, rate limits'],
        ['title' => 'Knowledge Base Hub', 'description' => 'Public help docs with search + feedback', 'budget' => 12000, 'requirements' => 'Markdown articles, search, feedback votes, categories'],
        ['title' => 'Subscription Reporting', 'description' => 'MRR / churn / cohort reporting suite', 'budget' => 20000, 'requirements' => 'Data import, metrics calc, cohort tables, charts, export'],
        ['title' => 'Email Template Builder', 'description' => 'Drag-and-drop responsive email builder', 'budget' => 22500, 'requirements' => 'Blocks, drag-drop UI, preview, export HTML, versioning'],
        ['title' => 'Gamified Learning Quests', 'description' => 'Quest-based skill progression system', 'budget' => 18000, 'requirements' => 'Quests, XP, leveling, badges, progress dashboard'],
        ['title' => 'Security Audit Tracker', 'description' => 'Track remediation of security findings', 'budget' => 17000, 'requirements' => 'Findings import, risk scoring, remediation tasks, dashboards'],
        ['title' => 'Sales Lead Scoring', 'description' => 'Lead ingestion + scoring & assignment', 'budget' => 21000, 'requirements' => 'Lead import, score rules, assignment, pipeline stages'],
        ['title' => 'OKR Alignment Tool', 'description' => 'Objectives & key result tracking', 'budget' => 16000, 'requirements' => 'Objectives, key results, progress updates, alignment tree'],
        ['title' => 'Data Import Wizard', 'description' => 'Multi-source CSV import validation tool', 'budget' => 15000, 'requirements' => 'Mapping UI, validation rules, preview, error reporting'],
        ['title' => 'Customer Feedback Portal', 'description' => 'Collect & triage product feedback', 'budget' => 14000, 'requirements' => 'Submission forms, categorization, voting, roadmap linkage'],
        ['title' => 'API Developer Portal', 'description' => 'Docs + API key management + usage stats', 'budget' => 20000, 'requirements' => 'API keys, docs pages, usage analytics, rate limits'],
        ['title' => 'Fleet Maintenance Logs', 'description' => 'Vehicle service scheduling & logs', 'budget' => 17500, 'requirements' => 'Vehicles, maintenance tasks, schedule reminders, cost reports'],
        ['title' => 'Internal Chat Rooms', 'description' => 'Lightweight team chat + channels', 'budget' => 12500, 'requirements' => 'Channels, messages, presence, basic search, notifications'],
        ['title' => 'Procurement Request Flow', 'description' => 'Purchase request & approval workflow', 'budget' => 16500, 'requirements' => 'Requests, multi-step approvals, budget caps, audit trail'],
        ['title' => 'A/B Testing Console', 'description' => 'Experiment definition & results stats', 'budget' => 23000, 'requirements' => 'Variant config, randomization, metric tracking, significance calc'],
        ['title' => 'Customer Journey Mapper', 'description' => 'Visual journey stages + touchpoints', 'budget' => 19500, 'requirements' => 'Canvas editor, stage definitions, export PNG, annotations'],
        ['title' => 'Subscription Paywall', 'description' => 'Content paywall + entitlement checks', 'budget' => 15000, 'requirements' => 'Plans, entitlements, metered rules, content gating'],
        ['title' => 'Invoice Reconciliation', 'description' => 'Match bank payouts to invoices', 'budget' => 21000, 'requirements' => 'Import payouts, match heuristics, exception queue, reports'],
        ['title' => 'Data Quality Monitor', 'description' => 'Track data anomalies across pipelines', 'budget' => 22000, 'requirements' => 'Metrics ingestion, thresholds, alerts, anomaly history'],
        ['title' => 'Gamified Wellness App', 'description' => 'Daily health habit tracking with rewards', 'budget' => 17500, 'requirements' => 'Habits, streaks, rewards store, push notifications'],
        ['title' => 'GraphQL Gateway Layer', 'description' => 'Unified graph across microservices', 'budget' => 24000, 'requirements' => 'Schema stitching, auth, caching, metrics, playground'],
        ['title' => 'Machine Learning Labeler', 'description' => 'Labeling UI for image classification', 'budget' => 25000, 'requirements' => 'Dataset upload, labeling workspace, consensus metrics'],
        ['title' => 'Inventory Forecasting', 'description' => 'Predict stockouts & reorder timing', 'budget' => 26000, 'requirements' => 'Historical import, forecast models, dashboards, alerts'],
        ['title' => 'Customer Churn Predictor', 'description' => 'Predict churn risk segments', 'budget' => 25500, 'requirements' => 'Data prep, model training job, scoring API, segment UI'],
        ['title' => 'Light CRM Core', 'description' => 'Contact management + deal pipeline', 'budget' => 17000, 'requirements' => 'Contacts, deals, stages, notes, simple reports'],
        ['title' => 'On-call Rotation Tool', 'description' => 'Pager rotation & incident timeline', 'budget' => 18500, 'requirements' => 'Rotations, escalation rules, incident log, timelines'],
        ['title' => 'Marketing Landing Generator', 'description' => 'Dynamic landing page builder', 'budget' => 20000, 'requirements' => 'Template library, WYSIWYG, AB tests, publish flow'],
        ['title' => 'Contract Lifecycle', 'description' => 'Contract drafting & approval tracking', 'budget' => 24500, 'requirements' => 'Templates, versioning, approvals, e-sign hooks'],
        ['title' => 'Time Tracking Mini', 'description' => 'Employee time & project allocation', 'budget' => 14000, 'requirements' => 'Timesheets, project codes, approval, export CSV'],
        ['title' => 'Data Export Service', 'description' => 'Async large dataset export jobs', 'budget' => 19000, 'requirements' => 'Job queue, progress tracking, file delivery, retention'],
        ['title' => 'Recruiting Kanban', 'description' => 'Hiring pipeline visualization', 'budget' => 15000, 'requirements' => 'Candidates, stages, notes, resume upload, drag-drop'],
        ['title' => 'Lightweight ERP Seed', 'description' => 'Core modules: finance, inventory, orders', 'budget' => 30000, 'requirements' => 'Chart of accounts, postings, stock moves, order flow'],
    ];

    public static function all(): array
    {
        return self::$presets;
    }

    public static function random(): array
    {
        return self::$presets[array_rand(self::$presets)];
    }
}
