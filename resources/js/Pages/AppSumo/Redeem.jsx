import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Gift, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function Redeem({ flash }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        name: '',
        email: '',
    });

    const [step, setStep] = useState(1);

    const handleCodeSubmit = (e) => {
        e.preventDefault();
        
        // First validate the code
        post(route('appsumo.redeem.process'), {
            preserveScroll: true,
            onSuccess: (response) => {
                if (response.props?.codeValid) {
                    setStep(2);
                }
            },
            onError: () => {
                reset('code');
            }
        });
    };

    const handleAccountSubmit = (e) => {
        e.preventDefault();
        
        post(route('appsumo.redeem.process'), {
            preserveScroll: true,
            onSuccess: () => {
                // Will redirect to success page
            }
        });
    };

    return (
        <>
            <Head title="Redeem AppSumo Code - TaskPilot" />
            
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                            <Gift className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Redeem Your AppSumo Code
                        </h1>
                        <p className="text-gray-600">
                            Get lifetime access to TaskPilot with your AppSumo purchase
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {step === 1 ? (
                                    <>
                                        <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-medium">1</span>
                                        Enter Your Code
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        Code Verified
                                    </>
                                )}
                            </CardTitle>
                            <CardDescription>
                                {step === 1 
                                    ? "Enter the redemption code from your AppSumo purchase"
                                    : "Create your account to complete the redemption"
                                }
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            {flash?.message && (
                                <Alert className="mb-4">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>{flash.message}</AlertDescription>
                                </Alert>
                            )}
                            
                            {flash?.error && (
                                <Alert variant="destructive" className="mb-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{flash.error}</AlertDescription>
                                </Alert>
                            )}

                            {step === 1 ? (
                                <form onSubmit={handleCodeSubmit} className="space-y-4">
                                    <div>
                                        <Input
                                            type="text"
                                            placeholder="Enter your AppSumo code"
                                            value={data.code}
                                            onChange={e => setData('code', e.target.value.toUpperCase())}
                                            className={`text-center font-mono text-lg tracking-wider ${errors.code ? 'border-red-500' : ''}`}
                                            maxLength={12}
                                            disabled={processing}
                                        />
                                        {errors.code && (
                                            <p className="text-sm text-red-600 mt-1">{errors.code}</p>
                                        )}
                                    </div>
                                    
                                    <Button 
                                        type="submit" 
                                        className="w-full"
                                        disabled={!data.code || processing}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Validating...
                                            </>
                                        ) : (
                                            'Validate Code'
                                        )}
                                    </Button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                        <div className="flex items-center gap-2 text-green-800">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="font-medium">Code verified successfully!</span>
                                        </div>
                                        <p className="text-sm text-green-700 mt-1">
                                            Code: <span className="font-mono font-bold">{data.code}</span>
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                            <span className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-sm font-medium">2</span>
                                            Create Your Account
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            Enter your details to create your lifetime TaskPilot account
                                        </p>
                                    </div>

                                    <form onSubmit={handleAccountSubmit} className="space-y-4">
                                        <div>
                                            <Input
                                                type="text"
                                                placeholder="Your full name"
                                                value={data.name}
                                                onChange={e => setData('name', e.target.value)}
                                                className={errors.name ? 'border-red-500' : ''}
                                                disabled={processing}
                                                required
                                            />
                                            {errors.name && (
                                                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                                            )}
                                        </div>
                                        
                                        <div>
                                            <Input
                                                type="email"
                                                placeholder="Your email address"
                                                value={data.email}
                                                onChange={e => setData('email', e.target.value)}
                                                className={errors.email ? 'border-red-500' : ''}
                                                disabled={processing}
                                                required
                                            />
                                            {errors.email && (
                                                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                                            )}
                                        </div>
                                        
                                        <Button 
                                            type="submit" 
                                            className="w-full"
                                            disabled={!data.name || !data.email || processing}
                                        >
                                            {processing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Creating Account...
                                                </>
                                            ) : (
                                                'Complete Redemption'
                                            )}
                                        </Button>
                                    </form>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Need help? Contact us at{' '}
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
