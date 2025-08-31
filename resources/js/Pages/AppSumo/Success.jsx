import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { CheckCircle2, Zap, Users, Brain, Sparkles, ArrowRight } from 'lucide-react';

export default function Success({ user, features }) {
    return (
        <>
            <Head title="Welcome to TaskPilot - Lifetime Access Activated!" />
            
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    {/* Success Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 rounded-full mb-6">
                            <CheckCircle2 className="w-10 h-10 text-white" />
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
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                What's Included in Your Lifetime Access
                            </CardTitle>
                            <CardDescription>
                                All premium features, forever. No recurring payments.
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                                    <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">AI Project Assistant</h3>
                                        <p className="text-sm text-gray-600">Smart project insights and recommendations</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                                    <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">AI Task Generation</h3>
                                        <p className="text-sm text-gray-600">Automatically generate project tasks</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                    <Users className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Team Collaboration</h3>
                                        <p className="text-sm text-gray-600">Invite unlimited team members</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5" />
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Smart Automations</h3>
                                        <p className="text-sm text-gray-600">Automate repetitive workflows</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">PM Certification Program</h3>
                                        <p className="text-sm text-blue-100">Get certified as a Project Management Professional</p>
                                    </div>
                                    <CheckCircle2 className="w-8 h-8 text-green-300" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Next Steps */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Get Started</CardTitle>
                            <CardDescription>
                                Here's what you can do right now
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">Create your first project</h3>
                                    <p className="text-sm text-gray-600">Start managing your tasks with AI assistance</p>
                                </div>
                                <Button asChild size="sm">
                                    <Link href="/projects">
                                        Start Now <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-medium text-gray-900">Take the PM Certification</h3>
                                    <p className="text-sm text-gray-600">Get certified and enhance your career</p>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/certification">
                                        Get Certified <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main CTA */}
                    <div className="text-center">
                        <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                            <Link href="/dashboard">
                                Go to Dashboard <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </Button>
                        
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
