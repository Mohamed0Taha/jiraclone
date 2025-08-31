import { Head, Link } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

export default function Success({ user, features }) {
    return (
        <>
            <Head title="Welcome to TaskPilot - Lifetime Access Activated!" />
            
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-3">
                            Welcome to TaskPilot!
                        </h1>
                        <p className="text-xl text-gray-600 mb-2">
                            🎉 Your lifetime access has been activated
                        </p>
                        <p className="text-gray-500">
                            Hi {user?.name || 'there'}! Your account is ready to go.
                        </p>
                    </div>

                    {/* Features Card */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                What's Included in Your Lifetime Access
                            </h2>
                            <p className="text-gray-600">
                                All premium features, forever. No recurring payments.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-gray-900">AI Project Assistant</h3>
                                    <p className="text-sm text-gray-600">Smart project insights and recommendations</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                                <svg className="w-5 h-5 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-gray-900">AI Task Generation</h3>
                                    <p className="text-sm text-gray-600">Automatically generate project tasks</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Team Collaboration</h3>
                                    <p className="text-sm text-gray-600">Invite unlimited team members</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                                <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Smart Automations</h3>
                                    <p className="text-sm text-gray-600">Automate repetitive workflows</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">PM Certification Program</h3>
                                    <p className="text-sm text-blue-100">Get certified as a Project Management Professional</p>
                                </div>
                                <svg className="w-8 h-8 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Get Started</h2>
                        <p className="text-gray-600 mb-4">Here's what you can do right now</p>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">Create your first project</h3>
                                    <p className="text-sm text-gray-600">Start managing your tasks with AI assistance</p>
                                </div>
                                <Link href="/projects">
                                    <PrimaryButton className="flex items-center gap-1">
                                        Start Now 
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </PrimaryButton>
                                </Link>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">Take the PM Certification</h3>
                                    <p className="text-sm text-gray-600">Get certified and enhance your career</p>
                                </div>
                                <Link href="/certification">
                                    <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150 gap-1">
                                        Get Certified 
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Main CTA */}
                    <div className="text-center">
                        <Link href="/dashboard">
                            <PrimaryButton className="text-lg px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex items-center gap-2 mx-auto">
                                Go to Dashboard 
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </PrimaryButton>
                        </Link>
                        
                        <p className="mt-4 text-sm text-gray-500">
                            Questions? Reach out to us at{' '}
                            <a href="mailto:support@taskpilot.app" className="text-blue-600 hover:underline">
                                support@taskpilot.app
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
