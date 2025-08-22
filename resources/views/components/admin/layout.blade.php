<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'TaskPilot Admin' }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    @if(isset($extraHead))
        {!! $extraHead !!}
    @endif
    <meta name="csrf-token" content="{{ csrf_token() }}">
</head>
<body class="bg-gray-100">
    <div class="min-h-screen">
        <!-- Unified Admin Navigation -->
        <nav class="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
            <div class="container mx-auto px-4">
                <div class="flex justify-between items-center h-16">
                    <!-- Left Side - Title and Main Navigation -->
                    <div class="flex items-center space-x-6">
                        <div class="flex items-center">
                            <span class="text-2xl mr-2">🚀</span>
                            <h1 class="text-xl font-bold whitespace-nowrap">TaskPilot Admin</h1>
                            @if(!empty($pageTitle))
                                <span class="sr-only">{{ $pageTitle }}</span>
                            @endif
                        </div>
                        
                        <!-- Main Navigation Links -->
                        <div class="hidden md:flex items-center space-x-4">
                            <a href="{{ route('admin.dashboard') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.dashboard') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                📊 Dashboard
                            </a>
                            <a href="{{ route('admin.users') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.users*') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                👥 Users
                            </a>
                            <a href="{{ route('admin.refunds') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.refunds*') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                💰 Refunds
                            </a>
                            <a href="{{ route('admin.billing') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.billing') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                💳 Billing
                            </a>
                            <a href="{{ route('admin.email-logs') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.email-logs') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                📧 Email Logs
                            </a>
                            <a href="{{ route('admin.openai-requests') }}" 
                               class="px-3 py-2 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('admin.openai-requests') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500 hover:text-white' }}">
                                🤖 AI Logs
                            </a>
                        </div>
                    </div>
                    
                    <!-- Right Side - User Info and Actions -->
                    <div class="flex items-center space-x-4">
                        <!-- Custom Actions Slot -->
                        @if(isset($navActions))
                            <div class="flex items-center space-x-2">
                                {!! $navActions !!}
                            </div>
                        @endif
                        
                        <!-- User Info -->
                        <div class="hidden sm:block text-sm text-blue-100">
                            Welcome, {{ auth()->user()->name }}
                        </div>
                        
                        <!-- Main App Link -->
                        <a href="{{ url('/dashboard') }}" 
                           class="bg-green-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-600 transition-colors">
                            ← Main App
                        </a>
                        
                        <!-- Logout -->
                        <form method="POST" action="{{ route('logout') }}" class="inline">
                            @csrf
                            <button type="submit" 
                                    class="bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600 transition-colors">
                                Logout
                            </button>
                        </form>
                    </div>
                </div>
                
                <!-- Mobile Navigation Menu (Hidden by default) -->
                <div class="md:hidden border-t border-blue-500 pt-2 pb-3">
                    <div class="flex flex-col space-y-1">
                        <a href="{{ route('admin.dashboard') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.dashboard') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">📊 Dashboard</a>
                        <a href="{{ route('admin.users') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.users*') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">👥 Users</a>
                        <a href="{{ route('admin.refunds') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.refunds*') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">💰 Refunds</a>
                        <a href="{{ route('admin.billing') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.billing') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">💳 Billing</a>
                        <a href="{{ route('admin.email-logs') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.email-logs') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">📧 Email Logs</a>
                        <a href="{{ route('admin.openai-requests') }}" class="block px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('admin.openai-requests') ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500' }}">🤖 AI Logs</a>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Main Content -->
        <main class="container mx-auto py-6 px-4">
            <!-- Success/Error Messages -->
            @if(session('success'))
                <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                    <div class="flex items-center">
                        <span class="mr-2">✅</span>
                        {{ session('success') }}
                    </div>
                </div>
            @endif

            @if(session('error'))
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                    <div class="flex items-center">
                        <span class="mr-2">❌</span>
                        {{ session('error') }}
                    </div>
                </div>
            @endif

            @if($errors->any())
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 shadow-sm">
                    <div class="flex items-center mb-2">
                        <span class="mr-2">❌</span>
                        <strong>Please fix the following errors:</strong>
                    </div>
                    <ul class="list-disc ml-6">
                        @foreach($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif
            
            <!-- Page Content -->
            {{ $slot }}
        </main>
    </div>
    
    <!-- Scripts -->
    @if(isset($scripts))
        {!! $scripts !!}
    @endif
</body>
</html>
