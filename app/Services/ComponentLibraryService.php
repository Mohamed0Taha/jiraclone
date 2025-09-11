<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ComponentLibraryService
{
    /**
     * Get available component types
     */
    public function getAvailableComponents(): array
    {
        return [
            'forms' => [
                'basic_form' => 'Basic Form with Input Fields',
                'contact_form' => 'Contact/Feedback Form',
                'search_form' => 'Search/Filter Form',
                'login_form' => 'Login/Authentication Form',
                'survey_form' => 'Survey/Questionnaire Form',
                'registration_form' => 'User Registration Form',
                'booking_form' => 'Booking/Reservation Form',
                'payment_form' => 'Payment/Checkout Form',
                'multi_step_form' => 'Multi-Step Wizard Form',
                'feedback_form' => 'Feedback/Review Form',
                'application_form' => 'Job/Application Form',
                'order_form' => 'Order/Request Form',
                'subscription_form' => 'Newsletter/Subscription Form',
                'event_form' => 'Event Registration Form',
                'profile_form' => 'Profile/Settings Form'
            ],
            'data_display' => [
                'data_table' => 'Interactive Data Table',
                'card_list' => 'Card-based List Display',
                'dashboard_grid' => 'Dashboard with Stats Grid',
                'timeline' => 'Timeline/Activity Feed',
                'kanban_board' => 'Kanban-style Board',
                'grid_view' => 'Grid/Masonry Layout',
                'list_view' => 'Simple List View',
                'tree_view' => 'Hierarchical Tree View',
                'calendar_view' => 'Calendar/Schedule View',
                'comparison_table' => 'Comparison/Feature Table',
                'invoice_display' => 'Invoice/Receipt Display',
                'product_catalog' => 'Product/Service Catalog',
                'directory_listing' => 'Directory/Contact Listing',
                'portfolio_display' => 'Portfolio/Gallery Display',
                'pricing_table' => 'Pricing/Plan Comparison',
                'news_feed' => 'News/Article Feed',
                'testimonial_display' => 'Testimonial/Review Display',
                'team_display' => 'Team/Staff Display',
                'event_listing' => 'Event/Schedule Listing',
                'faq_display' => 'FAQ/Help Display'
            ],
            'charts' => [
                'bar_chart' => 'Bar/Column Chart',
                'line_chart' => 'Line/Area Chart',
                'pie_chart' => 'Pie/Doughnut Chart',
                'progress_chart' => 'Progress/Gauge Chart',
                'scatter_chart' => 'Scatter/Bubble Chart',
                'histogram' => 'Histogram/Distribution Chart',
                'heatmap' => 'Heatmap/Matrix Chart',
                'gantt_chart' => 'Gantt/Project Timeline Chart',
                'funnel_chart' => 'Funnel/Conversion Chart',
                'radar_chart' => 'Radar/Spider Chart',
                'sankey_diagram' => 'Sankey/Flow Diagram',
                'treemap' => 'Treemap/Nested Chart',
                'candlestick_chart' => 'Candlestick/Financial Chart',
                'waterfall_chart' => 'Waterfall/Bridge Chart',
                'network_diagram' => 'Network/Relationship Diagram'
            ],
            'interactive' => [
                'calculator' => 'Calculator/Computation Tool',
                'counter' => 'Counter/Tracker',
                'timer' => 'Timer/Stopwatch',
                'file_uploader' => 'File Upload Manager',
                'image_gallery' => 'Image Gallery/Viewer',
                'drawing_canvas' => 'Drawing/Sketch Canvas',
                'code_editor' => 'Code/Text Editor',
                'color_picker' => 'Color/Palette Picker',
                'date_picker' => 'Date/Time Picker',
                'rating_system' => 'Rating/Review System',
                'quiz_engine' => 'Quiz/Assessment Engine',
                'poll_widget' => 'Poll/Voting Widget',
                'chat_interface' => 'Chat/Messaging Interface',
                'video_player' => 'Video/Media Player',
                'audio_player' => 'Audio/Music Player',
                'map_viewer' => 'Map/Location Viewer',
                'qr_generator' => 'QR Code Generator',
                'barcode_scanner' => 'Barcode Scanner',
                'signature_pad' => 'Digital Signature Pad',
                'drag_drop_builder' => 'Drag & Drop Builder'
            ],
            'navigation' => [
                'tabs' => 'Tabbed Interface',
                'sidebar' => 'Sidebar Navigation',
                'breadcrumbs' => 'Breadcrumb Navigation',
                'pagination' => 'Pagination Controls',
                'mega_menu' => 'Mega/Dropdown Menu',
                'mobile_menu' => 'Mobile/Hamburger Menu',
                'footer_nav' => 'Footer Navigation',
                'floating_nav' => 'Floating/Sticky Navigation',
                'wizard_steps' => 'Step/Progress Navigation',
                'accordion_nav' => 'Accordion/Collapsible Navigation'
            ],
            'business' => [
                'crm_dashboard' => 'CRM/Customer Dashboard',
                'sales_tracker' => 'Sales/Revenue Tracker',
                'inventory_manager' => 'Inventory/Stock Manager',
                'expense_tracker' => 'Expense/Budget Tracker',
                'project_manager' => 'Project/Task Manager',
                'time_tracker' => 'Time/Productivity Tracker',
                'employee_directory' => 'Employee/Staff Directory',
                'meeting_scheduler' => 'Meeting/Appointment Scheduler',
                'document_manager' => 'Document/File Manager',
                'knowledge_base' => 'Knowledge Base/Wiki',
                'help_desk' => 'Help Desk/Support System',
                'booking_system' => 'Booking/Reservation System',
                'pos_system' => 'Point of Sale System',
                'warehouse_manager' => 'Warehouse/Logistics Manager',
                'hr_dashboard' => 'HR/Personnel Dashboard'
            ],
            'ecommerce' => [
                'product_browser' => 'Product Browser/Catalog',
                'shopping_cart' => 'Shopping Cart/Basket',
                'checkout_process' => 'Checkout/Payment Process',
                'order_tracker' => 'Order/Shipment Tracker',
                'wishlist_manager' => 'Wishlist/Favorites Manager',
                'review_system' => 'Product Review System',
                'coupon_manager' => 'Coupon/Discount Manager',
                'loyalty_program' => 'Loyalty/Points Program',
                'vendor_portal' => 'Vendor/Seller Portal',
                'analytics_dashboard' => 'Sales Analytics Dashboard'
            ],
            'utilities' => [
                'search_engine' => 'Search/Filter Engine',
                'notification_center' => 'Notification/Alert Center',
                'settings_panel' => 'Settings/Configuration Panel',
                'backup_manager' => 'Backup/Export Manager',
                'import_wizard' => 'Data Import Wizard',
                'audit_log' => 'Audit/Activity Log',
                'performance_monitor' => 'Performance/System Monitor',
                'error_tracker' => 'Error/Issue Tracker',
                'version_control' => 'Version/Change Control',
                'api_tester' => 'API/Service Tester'
            ]
        ];
    }

    /**
     * Analyze user request to determine required components
     */
    public function analyzeRequest(string $userRequest): array
    {
        $request = strtolower($userRequest);
        $requiredComponents = [];
        $inputTypes = [];
        $outputTypes = [];

        // Analyze for business components
        if (preg_match('/\b(crm|customer|client|lead)\b/', $request)) {
            $requiredComponents[] = 'crm_dashboard';
            $inputTypes[] = 'form_validation';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(sales|revenue|profit|income)\b/', $request)) {
            $requiredComponents[] = 'sales_tracker';
            $requiredComponents[] = 'bar_chart';
            $outputTypes[] = 'chart_visualization';
        }
        
        if (preg_match('/\b(inventory|stock|warehouse|product)\b/', $request)) {
            $requiredComponents[] = 'inventory_manager';
            $requiredComponents[] = 'data_table';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(expense|budget|cost|spending|financial)\b/', $request)) {
            $requiredComponents[] = 'expense_tracker';
            $requiredComponents[] = 'pie_chart';
            $outputTypes[] = 'chart_visualization';
        }
        
        if (preg_match('/\b(project|task|todo|assignment)\b/', $request)) {
            $requiredComponents[] = 'project_manager';
            $requiredComponents[] = 'kanban_board';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(time|productivity|hour|timesheet)\b/', $request)) {
            $requiredComponents[] = 'time_tracker';
            $requiredComponents[] = 'timer';
            $outputTypes[] = 'time_display';
        }
        
        if (preg_match('/\b(employee|staff|personnel|team)\b/', $request)) {
            $requiredComponents[] = 'employee_directory';
            $requiredComponents[] = 'team_display';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(meeting|appointment|schedule|calendar)\b/', $request)) {
            $requiredComponents[] = 'meeting_scheduler';
            $requiredComponents[] = 'calendar_view';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(document|file|folder|storage)\b/', $request)) {
            $requiredComponents[] = 'document_manager';
            $requiredComponents[] = 'file_uploader';
            $inputTypes[] = 'file_input';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(knowledge|wiki|help|faq)\b/', $request)) {
            $requiredComponents[] = 'knowledge_base';
            $requiredComponents[] = 'faq_display';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(support|helpdesk|ticket|issue)\b/', $request)) {
            $requiredComponents[] = 'help_desk';
            $requiredComponents[] = 'error_tracker';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(booking|reservation|appointment)\b/', $request)) {
            $requiredComponents[] = 'booking_system';
            $requiredComponents[] = 'booking_form';
            $inputTypes[] = 'form_validation';
        }

        // Analyze for ecommerce components
        if (preg_match('/\b(shop|store|ecommerce|product|catalog)\b/', $request)) {
            $requiredComponents[] = 'product_browser';
            $requiredComponents[] = 'product_catalog';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(cart|basket|checkout|purchase)\b/', $request)) {
            $requiredComponents[] = 'shopping_cart';
            $requiredComponents[] = 'checkout_process';
            $inputTypes[] = 'form_validation';
        }
        
        if (preg_match('/\b(order|shipment|delivery|tracking)\b/', $request)) {
            $requiredComponents[] = 'order_tracker';
            $requiredComponents[] = 'timeline';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(wishlist|favorite|bookmark|save)\b/', $request)) {
            $requiredComponents[] = 'wishlist_manager';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(review|rating|feedback|testimonial)\b/', $request)) {
            $requiredComponents[] = 'review_system';
            $requiredComponents[] = 'rating_system';
            $requiredComponents[] = 'testimonial_display';
            $inputTypes[] = 'form_validation';
        }

        // Analyze for form components
        if (preg_match('/\b(form|input|submit|enter|add|create|register|login)\b/', $request)) {
            if (preg_match('/\b(contact|feedback|message)\b/', $request)) {
                $requiredComponents[] = 'contact_form';
            } elseif (preg_match('/\b(search|filter|find)\b/', $request)) {
                $requiredComponents[] = 'search_form';
            } elseif (preg_match('/\b(login|auth|sign)\b/', $request)) {
                $requiredComponents[] = 'login_form';
            } elseif (preg_match('/\b(survey|quiz|question)\b/', $request)) {
                $requiredComponents[] = 'survey_form';
            } elseif (preg_match('/\b(registration|signup|join)\b/', $request)) {
                $requiredComponents[] = 'registration_form';
            } elseif (preg_match('/\b(payment|checkout|billing)\b/', $request)) {
                $requiredComponents[] = 'payment_form';
            } elseif (preg_match('/\b(application|job|apply)\b/', $request)) {
                $requiredComponents[] = 'application_form';
            } elseif (preg_match('/\b(multi|step|wizard)\b/', $request)) {
                $requiredComponents[] = 'multi_step_form';
            } else {
                $requiredComponents[] = 'basic_form';
            }
            $inputTypes[] = 'text_input';
            $inputTypes[] = 'form_validation';
        }

        // Analyze for data display components
        if (preg_match('/\b(table|list|data|display|show|view)\b/', $request)) {
            if (preg_match('/\b(card|grid)\b/', $request)) {
                $requiredComponents[] = 'card_list';
            } elseif (preg_match('/\b(dashboard|stats|metrics)\b/', $request)) {
                $requiredComponents[] = 'dashboard_grid';
            } elseif (preg_match('/\b(timeline|activity|history)\b/', $request)) {
                $requiredComponents[] = 'timeline';
            } elseif (preg_match('/\b(kanban|board|column)\b/', $request)) {
                $requiredComponents[] = 'kanban_board';
            } elseif (preg_match('/\b(tree|hierarchy|nested)\b/', $request)) {
                $requiredComponents[] = 'tree_view';
            } elseif (preg_match('/\b(calendar|schedule|date)\b/', $request)) {
                $requiredComponents[] = 'calendar_view';
            } elseif (preg_match('/\b(comparison|compare|vs)\b/', $request)) {
                $requiredComponents[] = 'comparison_table';
            } elseif (preg_match('/\b(invoice|receipt|bill)\b/', $request)) {
                $requiredComponents[] = 'invoice_display';
            } elseif (preg_match('/\b(directory|contact|phonebook)\b/', $request)) {
                $requiredComponents[] = 'directory_listing';
            } elseif (preg_match('/\b(portfolio|gallery|showcase)\b/', $request)) {
                $requiredComponents[] = 'portfolio_display';
            } elseif (preg_match('/\b(pricing|price|plan|subscription)\b/', $request)) {
                $requiredComponents[] = 'pricing_table';
            } elseif (preg_match('/\b(news|article|blog|feed)\b/', $request)) {
                $requiredComponents[] = 'news_feed';
            } elseif (preg_match('/\b(event|schedule|listing)\b/', $request)) {
                $requiredComponents[] = 'event_listing';
            } else {
                $requiredComponents[] = 'data_table';
            }
            $outputTypes[] = 'data_display';
            $inputTypes[] = 'data_filtering';
        }

        // Analyze for chart components
        if (preg_match('/\b(chart|graph|plot|visual|analytics)\b/', $request)) {
            if (preg_match('/\b(bar|column)\b/', $request)) {
                $requiredComponents[] = 'bar_chart';
            } elseif (preg_match('/\b(line|trend|time)\b/', $request)) {
                $requiredComponents[] = 'line_chart';
            } elseif (preg_match('/\b(pie|donut|percentage)\b/', $request)) {
                $requiredComponents[] = 'pie_chart';
            } elseif (preg_match('/\b(progress|gauge|meter)\b/', $request)) {
                $requiredComponents[] = 'progress_chart';
            } elseif (preg_match('/\b(scatter|bubble|correlation)\b/', $request)) {
                $requiredComponents[] = 'scatter_chart';
            } elseif (preg_match('/\b(histogram|distribution|frequency)\b/', $request)) {
                $requiredComponents[] = 'histogram';
            } elseif (preg_match('/\b(heatmap|matrix|grid)\b/', $request)) {
                $requiredComponents[] = 'heatmap';
            } elseif (preg_match('/\b(gantt|project|timeline)\b/', $request)) {
                $requiredComponents[] = 'gantt_chart';
            } elseif (preg_match('/\b(funnel|conversion|sales)\b/', $request)) {
                $requiredComponents[] = 'funnel_chart';
            } elseif (preg_match('/\b(radar|spider|multi)\b/', $request)) {
                $requiredComponents[] = 'radar_chart';
            } elseif (preg_match('/\b(flow|sankey|stream)\b/', $request)) {
                $requiredComponents[] = 'sankey_diagram';
            } elseif (preg_match('/\b(treemap|nested|hierarchical)\b/', $request)) {
                $requiredComponents[] = 'treemap';
            } elseif (preg_match('/\b(financial|stock|candlestick)\b/', $request)) {
                $requiredComponents[] = 'candlestick_chart';
            } elseif (preg_match('/\b(waterfall|bridge|step)\b/', $request)) {
                $requiredComponents[] = 'waterfall_chart';
            } elseif (preg_match('/\b(network|relationship|connection)\b/', $request)) {
                $requiredComponents[] = 'network_diagram';
            } else {
                $requiredComponents[] = 'bar_chart'; // Default chart type
            }
            $outputTypes[] = 'chart_visualization';
        }

        // Analyze for interactive components
        if (preg_match('/\b(calculator|calculate|compute)\b/', $request)) {
            $requiredComponents[] = 'calculator';
            $inputTypes[] = 'numeric_input';
            $outputTypes[] = 'computed_result';
        }

        if (preg_match('/\b(counter|count|track|increment)\b/', $request)) {
            $requiredComponents[] = 'counter';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'numeric_display';
        }

        if (preg_match('/\b(timer|stopwatch|time)\b/', $request)) {
            $requiredComponents[] = 'timer';
            $inputTypes[] = 'time_controls';
            $outputTypes[] = 'time_display';
        }

        if (preg_match('/\b(upload|file|document|image)\b/', $request)) {
            if (preg_match('/\b(gallery|view|display)\b/', $request)) {
                $requiredComponents[] = 'image_gallery';
            } else {
                $requiredComponents[] = 'file_uploader';
            }
            $inputTypes[] = 'file_input';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(draw|sketch|canvas|paint)\b/', $request)) {
            $requiredComponents[] = 'drawing_canvas';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(code|editor|text|programming)\b/', $request)) {
            $requiredComponents[] = 'code_editor';
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(color|palette|picker|theme)\b/', $request)) {
            $requiredComponents[] = 'color_picker';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(date|calendar|picker|schedule)\b/', $request)) {
            $requiredComponents[] = 'date_picker';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(rating|star|review|score)\b/', $request)) {
            $requiredComponents[] = 'rating_system';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'numeric_display';
        }
        
        if (preg_match('/\b(quiz|test|assessment|exam)\b/', $request)) {
            $requiredComponents[] = 'quiz_engine';
            $inputTypes[] = 'form_validation';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(poll|vote|voting|survey)\b/', $request)) {
            $requiredComponents[] = 'poll_widget';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'chart_visualization';
        }
        
        if (preg_match('/\b(chat|message|messaging|communication)\b/', $request)) {
            $requiredComponents[] = 'chat_interface';
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(video|player|media|streaming)\b/', $request)) {
            $requiredComponents[] = 'video_player';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(audio|music|sound|player)\b/', $request)) {
            $requiredComponents[] = 'audio_player';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(map|location|gps|geography)\b/', $request)) {
            $requiredComponents[] = 'map_viewer';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(qr|barcode|code|generator)\b/', $request)) {
            if (preg_match('/\b(scan|scanner|read)\b/', $request)) {
                $requiredComponents[] = 'barcode_scanner';
            } else {
                $requiredComponents[] = 'qr_generator';
            }
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(signature|sign|digital|pad)\b/', $request)) {
            $requiredComponents[] = 'signature_pad';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(drag|drop|builder|visual)\b/', $request)) {
            $requiredComponents[] = 'drag_drop_builder';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'data_display';
        }

        // Analyze for navigation needs
        if (preg_match('/\b(tab|section|page|navigate)\b/', $request)) {
            if (preg_match('/\b(mega|dropdown|menu)\b/', $request)) {
                $requiredComponents[] = 'mega_menu';
            } elseif (preg_match('/\b(mobile|hamburger|responsive)\b/', $request)) {
                $requiredComponents[] = 'mobile_menu';
            } elseif (preg_match('/\b(sidebar|side|left|right)\b/', $request)) {
                $requiredComponents[] = 'sidebar';
            } elseif (preg_match('/\b(breadcrumb|trail|path)\b/', $request)) {
                $requiredComponents[] = 'breadcrumbs';
            } elseif (preg_match('/\b(pagination|page|next|previous)\b/', $request)) {
                $requiredComponents[] = 'pagination';
            } elseif (preg_match('/\b(step|wizard|progress)\b/', $request)) {
                $requiredComponents[] = 'wizard_steps';
            } elseif (preg_match('/\b(accordion|collapsible|expand)\b/', $request)) {
                $requiredComponents[] = 'accordion_nav';
            } elseif (preg_match('/\b(floating|sticky|fixed)\b/', $request)) {
                $requiredComponents[] = 'floating_nav';
            } else {
                $requiredComponents[] = 'tabs';
            }
            $inputTypes[] = 'navigation_clicks';
        }
        
        // Analyze for utility components
        if (preg_match('/\b(search|filter|find|query)\b/', $request)) {
            $requiredComponents[] = 'search_engine';
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(notification|alert|message|popup)\b/', $request)) {
            $requiredComponents[] = 'notification_center';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(settings|config|preferences|options)\b/', $request)) {
            $requiredComponents[] = 'settings_panel';
            $inputTypes[] = 'form_validation';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(backup|export|download|save)\b/', $request)) {
            $requiredComponents[] = 'backup_manager';
            $inputTypes[] = 'click_actions';
            $outputTypes[] = 'file_display';
        }
        
        if (preg_match('/\b(import|upload|load|import)\b/', $request)) {
            $requiredComponents[] = 'import_wizard';
            $inputTypes[] = 'file_input';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(audit|log|activity|history)\b/', $request)) {
            $requiredComponents[] = 'audit_log';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(performance|monitor|metrics|stats)\b/', $request)) {
            $requiredComponents[] = 'performance_monitor';
            $outputTypes[] = 'chart_visualization';
        }
        
        if (preg_match('/\b(error|issue|bug|problem)\b/', $request)) {
            $requiredComponents[] = 'error_tracker';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(version|change|control|git)\b/', $request)) {
            $requiredComponents[] = 'version_control';
            $outputTypes[] = 'data_display';
        }
        
        if (preg_match('/\b(api|service|test|endpoint)\b/', $request)) {
            $requiredComponents[] = 'api_tester';
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }

        // Remove duplicates
        $requiredComponents = array_unique($requiredComponents);
        $inputTypes = array_unique($inputTypes);
        $outputTypes = array_unique($outputTypes);

        // Default fallback
        if (empty($requiredComponents)) {
            $requiredComponents[] = 'basic_form';
            $requiredComponents[] = 'data_table';
            $inputTypes[] = 'text_input';
            $outputTypes[] = 'data_display';
        }

        return [
            'components' => array_unique($requiredComponents),
            'input_types' => array_unique($inputTypes),
            'output_types' => array_unique($outputTypes),
            'analysis' => $this->generateAnalysisDescription($requiredComponents, $inputTypes, $outputTypes)
        ];
    }

    /**
     * Get component template by type
     */
    public function getComponentTemplate(string $componentType): string
    {
        $templates = [
            'basic_form' => $this->getBasicFormTemplate(),
            'contact_form' => $this->getContactFormTemplate(),
            'search_form' => $this->getSearchFormTemplate(),
            'data_table' => $this->getDataTableTemplate(),
            'card_list' => $this->getCardListTemplate(),
            'dashboard_grid' => $this->getDashboardGridTemplate(),
            'calculator' => $this->getCalculatorTemplate(),
            'counter' => $this->getCounterTemplate(),
            'timer' => $this->getTimerTemplate(),
            'bar_chart' => $this->getBarChartTemplate(),
            'tabs' => $this->getTabsTemplate(),
        ];

        return $templates[$componentType] ?? $this->getBasicFormTemplate();
    }

    /**
     * Generate analysis description
     */
    private function generateAnalysisDescription(array $components, array $inputTypes, array $outputTypes): string
    {
        $componentNames = [];
        $availableComponents = $this->getAvailableComponents();
        
        foreach ($components as $component) {
            foreach ($availableComponents as $category => $items) {
                if (isset($items[$component])) {
                    $componentNames[] = $items[$component];
                    break;
                }
            }
        }

        return sprintf(
            "Based on your request, I recommend using these components: %s. This will handle %s and provide %s.",
            implode(', ', $componentNames),
            implode(', ', $inputTypes),
            implode(', ', $outputTypes)
        );
    }

    /**
     * Component templates below
     */
    private function getBasicFormTemplate(): string
    {
        return '
<div class="form-container">
    <h3>{{ FORM_TITLE }}</h3>
    <form id="mainForm" class="modern-form">
        <div class="form-group">
            <label for="input1">{{ FIELD1_LABEL }}</label>
            <input type="text" id="input1" name="input1" required>
        </div>
        <div class="form-group">
            <label for="input2">{{ FIELD2_LABEL }}</label>
            <input type="text" id="input2" name="input2">
        </div>
        <button type="submit" class="btn-primary">{{ SUBMIT_LABEL }}</button>
    </form>
    <div id="result" class="result-area"></div>
</div>

<script>
document.getElementById("mainForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    document.getElementById("result").innerHTML = "<p>Submitted: " + JSON.stringify(data) + "</p>";
    this.reset();
});
</script>';
    }

    private function getContactFormTemplate(): string
    {
        return '
<div class="contact-form-container">
    <h3>{{ FORM_TITLE }}</h3>
    <form id="contactForm" class="contact-form">
        <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" name="name" required>
        </div>
        <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" name="message" rows="4" required></textarea>
        </div>
        <button type="submit" class="btn-primary">Send Message</button>
    </form>
    <div id="contactResult" class="result-area"></div>
</div>

<script>
document.getElementById("contactForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const btn = this.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Sending...";
    
    setTimeout(() => {
        document.getElementById("contactResult").innerHTML = "<p class=\'success\'>Message sent successfully!</p>";
        this.reset();
        btn.disabled = false;
        btn.textContent = "Send Message";
    }, 1000);
});
</script>';
    }

    private function getSearchFormTemplate(): string
    {
        return '
<div class="search-container">
    <h3>{{ SEARCH_TITLE }}</h3>
    <form id="searchForm" class="search-form">
        <div class="search-group">
            <input type="text" id="searchInput" name="search" placeholder="{{ SEARCH_PLACEHOLDER }}">
            <button type="submit" class="btn-search">Search</button>
        </div>
        <div class="filters">
            <select id="categoryFilter" name="category">
                <option value="">All Categories</option>
                <option value="option1">{{ OPTION1 }}</option>
                <option value="option2">{{ OPTION2 }}</option>
            </select>
        </div>
    </form>
    <div id="searchResults" class="search-results"></div>
</div>

<script>
document.getElementById("searchForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const searchTerm = document.getElementById("searchInput").value;
    const category = document.getElementById("categoryFilter").value;
    
    if (searchTerm.trim()) {
        document.getElementById("searchResults").innerHTML = 
            "<p>Searching for: <strong>" + searchTerm + "</strong>" + 
            (category ? " in " + category : "") + "</p>";
    }
});
</script>';
    }

    private function getDataTableTemplate(): string
    {
        return '
<div class="table-container">
    <h3>{{ TABLE_TITLE }}</h3>
    <div class="table-controls">
        <input type="text" id="tableSearch" placeholder="Search table..." class="table-search">
        <button onclick="exportData()" class="btn-secondary">Export CSV</button>
    </div>
    <table id="dataTable" class="data-table">
        <thead>
            <tr>
                <th onclick="sortTable(0)">{{ COLUMN1 }} ↕</th>
                <th onclick="sortTable(1)">{{ COLUMN2 }} ↕</th>
                <th onclick="sortTable(2)">{{ COLUMN3 }} ↕</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="tableBody">
            <!-- Data will be populated here -->
        </tbody>
    </table>
</div>

<script>
let tableData = [
    { col1: "Sample 1", col2: "Value A", col3: "123" },
    { col1: "Sample 2", col2: "Value B", col3: "456" },
];

function renderTable(data = tableData) {
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = data.map((row, index) => `
        <tr>
            <td>${row.col1}</td>
            <td>${row.col2}</td>
            <td>${row.col3}</td>
            <td>
                <button onclick="editRow(${index})" class="btn-small">Edit</button>
                <button onclick="deleteRow(${index})" class="btn-small btn-danger">Delete</button>
            </td>
        </tr>
    `).join("");
}

function sortTable(column) {
    const keys = ["col1", "col2", "col3"];
    tableData.sort((a, b) => a[keys[column]].localeCompare(b[keys[column]]));
    renderTable();
}

function editRow(index) {
    const newValue = prompt("Enter new value:", tableData[index].col1);
    if (newValue) {
        tableData[index].col1 = newValue;
        renderTable();
    }
}

function deleteRow(index) {
    if (confirm("Delete this row?")) {
        tableData.splice(index, 1);
        renderTable();
    }
}

function exportData() {
    const csv = "Col1,Col2,Col3\\n" + tableData.map(row => `${row.col1},${row.col2},${row.col3}`).join("\\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
}

document.getElementById("tableSearch").addEventListener("input", function(e) {
    const term = e.target.value.toLowerCase();
    const filtered = tableData.filter(row => 
        Object.values(row).some(val => val.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

renderTable();
</script>';
    }

    private function getCalculatorTemplate(): string
    {
        return '
<div class="calculator-container">
    <h3>{{ CALCULATOR_TITLE }}</h3>
    <div class="calculator">
        <div class="display">
            <input type="text" id="calcDisplay" readonly>
        </div>
        <div class="buttons">
            <button onclick="clearCalc()" class="btn-calc btn-clear">C</button>
            <button onclick="appendToCalc(\'/\')" class="btn-calc">÷</button>
            <button onclick="appendToCalc(\'*\')" class="btn-calc">×</button>
            <button onclick="backspace()" class="btn-calc">⌫</button>
            
            <button onclick="appendToCalc(\'7\')" class="btn-calc">7</button>
            <button onclick="appendToCalc(\'8\')" class="btn-calc">8</button>
            <button onclick="appendToCalc(\'9\')" class="btn-calc">9</button>
            <button onclick="appendToCalc(\'-\')" class="btn-calc">-</button>
            
            <button onclick="appendToCalc(\'4\')" class="btn-calc">4</button>
            <button onclick="appendToCalc(\'5\')" class="btn-calc">5</button>
            <button onclick="appendToCalc(\'6\')" class="btn-calc">6</button>
            <button onclick="appendToCalc(\'+\')" class="btn-calc">+</button>
            
            <button onclick="appendToCalc(\'1\')" class="btn-calc">1</button>
            <button onclick="appendToCalc(\'2\')" class="btn-calc">2</button>
            <button onclick="appendToCalc(\'3\')" class="btn-calc">3</button>
            <button onclick="calculate()" class="btn-calc btn-equals" rowspan="2">=</button>
            
            <button onclick="appendToCalc(\'0\')" class="btn-calc btn-zero">0</button>
            <button onclick="appendToCalc(\'.\')" class="btn-calc">.</button>
        </div>
    </div>
</div>

<script>
function appendToCalc(value) {
    document.getElementById("calcDisplay").value += value;
}

function clearCalc() {
    document.getElementById("calcDisplay").value = "";
}

function backspace() {
    const display = document.getElementById("calcDisplay");
    display.value = display.value.slice(0, -1);
}

function calculate() {
    try {
        const result = eval(document.getElementById("calcDisplay").value);
        document.getElementById("calcDisplay").value = result;
    } catch (error) {
        document.getElementById("calcDisplay").value = "Error";
    }
}
</script>';
    }

    private function getCounterTemplate(): string
    {
        return '
<div class="counter-container">
    <h3>{{ COUNTER_TITLE }}</h3>
    <div class="counter">
        <div class="counter-display">
            <span id="counterValue">0</span>
        </div>
        <div class="counter-controls">
            <button onclick="decrement()" class="btn-counter btn-minus">-</button>
            <button onclick="reset()" class="btn-counter btn-reset">Reset</button>
            <button onclick="increment()" class="btn-counter btn-plus">+</button>
        </div>
        <div class="counter-presets">
            <button onclick="changeBy(-10)" class="btn-small">-10</button>
            <button onclick="changeBy(-5)" class="btn-small">-5</button>
            <button onclick="changeBy(5)" class="btn-small">+5</button>
            <button onclick="changeBy(10)" class="btn-small">+10</button>
        </div>
    </div>
</div>

<script>
let counterValue = 0;

function updateDisplay() {
    document.getElementById("counterValue").textContent = counterValue;
    localStorage.setItem("counterValue", counterValue);
}

function increment() {
    counterValue++;
    updateDisplay();
}

function decrement() {
    counterValue--;
    updateDisplay();
}

function reset() {
    counterValue = 0;
    updateDisplay();
}

function changeBy(amount) {
    counterValue += amount;
    updateDisplay();
}

// Load saved value
const saved = localStorage.getItem("counterValue");
if (saved !== null) {
    counterValue = parseInt(saved);
    updateDisplay();
}
</script>';
    }

    private function getTimerTemplate(): string
    {
        return '
<div class="timer-container">
    <h3>{{ TIMER_TITLE }}</h3>
    <div class="timer">
        <div class="timer-display">
            <span id="timerDisplay">00:00:00</span>
        </div>
        <div class="timer-controls">
            <button onclick="startTimer()" id="startBtn" class="btn-timer btn-start">Start</button>
            <button onclick="pauseTimer()" id="pauseBtn" class="btn-timer btn-pause">Pause</button>
            <button onclick="resetTimer()" class="btn-timer btn-reset">Reset</button>
        </div>
        <div class="timer-presets">
            <button onclick="setTimer(300)" class="btn-small">5 min</button>
            <button onclick="setTimer(600)" class="btn-small">10 min</button>
            <button onclick="setTimer(1800)" class="btn-small">30 min</button>
            <button onclick="setTimer(3600)" class="btn-small">1 hour</button>
        </div>
    </div>
</div>

<script>
let timerInterval;
let seconds = 0;
let isRunning = false;

function updateTimerDisplay() {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    document.getElementById("timerDisplay").textContent = 
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        timerInterval = setInterval(() => {
            seconds++;
            updateTimerDisplay();
        }, 1000);
    }
}

function pauseTimer() {
    isRunning = false;
    clearInterval(timerInterval);
}

function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    seconds = 0;
    updateTimerDisplay();
}

function setTimer(newSeconds) {
    resetTimer();
    seconds = newSeconds;
    updateTimerDisplay();
}
</script>';
    }

    private function getBarChartTemplate(): string
    {
        return '
<div class="chart-container">
    <h3>{{ CHART_TITLE }}</h3>
    <canvas id="chartCanvas" width="400" height="200"></canvas>
    <div class="chart-controls">
        <button onclick="updateChart()" class="btn-secondary">Update Data</button>
        <button onclick="changeChartType()" class="btn-secondary">Change Type</button>
    </div>
</div>

<script>
const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

let chartData = [30, 45, 60, 25, 80];
let chartLabels = ["Jan", "Feb", "Mar", "Apr", "May"];
let chartType = "bar";

function drawChart() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const maxValue = Math.max(...chartData);
    const barWidth = canvas.width / chartData.length;
    const colors = ["#3498db", "#e74c3c", "#2ecc71", "#f39c12", "#9b59b6"];
    
    chartData.forEach((value, index) => {
        const barHeight = (value / maxValue) * (canvas.height - 40);
        const x = index * barWidth;
        const y = canvas.height - barHeight - 20;
        
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x + 10, y, barWidth - 20, barHeight);
        
        // Labels
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(chartLabels[index], x + barWidth/2, canvas.height - 5);
        ctx.fillText(value, x + barWidth/2, y - 5);
    });
}

function updateChart() {
    chartData = chartData.map(() => Math.floor(Math.random() * 100) + 10);
    drawChart();
}

function changeChartType() {
    // Placeholder for chart type changes
    alert("Chart type functionality can be expanded");
}

drawChart();
</script>';
    }

    private function getTabsTemplate(): string
    {
        return '
<div class="tabs-container">
    <div class="tab-headers">
        <button class="tab-header active" onclick="showTab(0)">{{ TAB1_TITLE }}</button>
        <button class="tab-header" onclick="showTab(1)">{{ TAB2_TITLE }}</button>
        <button class="tab-header" onclick="showTab(2)">{{ TAB3_TITLE }}</button>
    </div>
    <div class="tab-contents">
        <div class="tab-content active" id="tab0">
            <h4>{{ TAB1_TITLE }}</h4>
            <p>{{ TAB1_CONTENT }}</p>
        </div>
        <div class="tab-content" id="tab1">
            <h4>{{ TAB2_TITLE }}</h4>
            <p>{{ TAB2_CONTENT }}</p>
        </div>
        <div class="tab-content" id="tab2">
            <h4>{{ TAB3_TITLE }}</h4>
            <p>{{ TAB3_CONTENT }}</p>
        </div>
    </div>
</div>

<script>
function showTab(index) {
    // Hide all tabs
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.remove("active");
    });
    document.querySelectorAll(".tab-header").forEach(header => {
        header.classList.remove("active");
    });
    
    // Show selected tab
    document.getElementById(`tab${index}`).classList.add("active");
    document.querySelectorAll(".tab-header")[index].classList.add("active");
}
</script>';
    }

    private function getCardListTemplate(): string
    {
        return '
<div class="card-list-container">
    <h3>{{ LIST_TITLE }}</h3>
    <div class="card-controls">
        <input type="text" id="cardSearch" placeholder="Search cards..." class="card-search">
        <button onclick="addCard()" class="btn-primary">Add Item</button>
    </div>
    <div id="cardGrid" class="card-grid">
        <!-- Cards will be populated here -->
    </div>
</div>

<script>
let cardData = [
    { id: 1, title: "Sample Card 1", description: "This is a sample card", status: "active" },
    { id: 2, title: "Sample Card 2", description: "Another sample card", status: "inactive" },
];

function renderCards(data = cardData) {
    const grid = document.getElementById("cardGrid");
    grid.innerHTML = data.map(card => `
        <div class="card ${card.status}">
            <h4>${card.title}</h4>
            <p>${card.description}</p>
            <div class="card-actions">
                <button onclick="editCard(${card.id})" class="btn-small">Edit</button>
                <button onclick="deleteCard(${card.id})" class="btn-small btn-danger">Delete</button>
            </div>
        </div>
    `).join("");
}

function addCard() {
    const title = prompt("Card title:");
    const description = prompt("Card description:");
    if (title && description) {
        const newCard = {
            id: Date.now(),
            title: title,
            description: description,
            status: "active"
        };
        cardData.push(newCard);
        renderCards();
    }
}

function editCard(id) {
    const card = cardData.find(c => c.id === id);
    if (card) {
        const newTitle = prompt("Edit title:", card.title);
        if (newTitle) {
            card.title = newTitle;
            renderCards();
        }
    }
}

function deleteCard(id) {
    if (confirm("Delete this card?")) {
        cardData = cardData.filter(c => c.id !== id);
        renderCards();
    }
}

document.getElementById("cardSearch").addEventListener("input", function(e) {
    const term = e.target.value.toLowerCase();
    const filtered = cardData.filter(card => 
        card.title.toLowerCase().includes(term) || 
        card.description.toLowerCase().includes(term)
    );
    renderCards(filtered);
});

renderCards();
</script>';
    }

    private function getDashboardGridTemplate(): string
    {
        return '
<div class="dashboard-container">
    <h3>{{ DASHBOARD_TITLE }}</h3>
    <div class="dashboard-grid">
        <div class="stat-card">
            <div class="stat-value" id="stat1">0</div>
            <div class="stat-label">{{ STAT1_LABEL }}</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="stat2">0</div>
            <div class="stat-label">{{ STAT2_LABEL }}</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="stat3">0</div>
            <div class="stat-label">{{ STAT3_LABEL }}</div>
        </div>
        <div class="stat-card">
            <div class="stat-value" id="stat4">0</div>
            <div class="stat-label">{{ STAT4_LABEL }}</div>
        </div>
    </div>
    <div class="dashboard-controls">
        <button onclick="refreshStats()" class="btn-secondary">Refresh</button>
        <button onclick="exportStats()" class="btn-secondary">Export</button>
    </div>
</div>

<script>
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current;
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function refreshStats() {
    const stats = [
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 500),
        Math.floor(Math.random() * 100),
        Math.floor(Math.random() * 50)
    ];
    
    stats.forEach((stat, index) => {
        animateValue(`stat${index + 1}`, 0, stat, 1000);
    });
}

function exportStats() {
    const stats = {
        stat1: document.getElementById("stat1").textContent,
        stat2: document.getElementById("stat2").textContent,
        stat3: document.getElementById("stat3").textContent,
        stat4: document.getElementById("stat4").textContent,
        timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(stats, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard-stats.json";
    a.click();
}

// Initialize with random data
refreshStats();
</script>';
    }
}