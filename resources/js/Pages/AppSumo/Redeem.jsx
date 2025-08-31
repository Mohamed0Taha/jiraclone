import { Head, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function Redeem({ flash, prefilledCode }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        code: prefilledCode || '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const isGmailAccount = data.email.toLowerCase().includes('@gmail.com');
    const needsPassword = data.email && !isGmailAccount;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        post(route('appsumo.redeem.process'), {
            preserveScroll: true,
            onSuccess: () => {
                // Will redirect to success page or dashboard
            }
        });
    };

    const isFormValid = () => {
        const basicFieldsValid = data.code && data.first_name && data.last_name && data.email;
        
        if (!basicFieldsValid) return false;
        
        // If it's a non-Gmail account, also check password fields
        if (needsPassword) {
            return data.password && data.password_confirmation && data.password.length >= 8;
        }
        
        return true;
    };

    return (
        <>
            <Head title="Redeem AppSumo Code - TaskPilot" />
            
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center mb-4">
                            <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-6 py-3 rounded-lg font-bold text-xl tracking-wider shadow-lg">
                                AppSumo
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Redeem Your AppSumo Code
                        </h1>
                        <p className="text-gray-600">
                            Get lifetime access to TaskPilot with your AppSumo purchase
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                Create Your Lifetime Account
                            </h2>
                            <p className="text-gray-600 text-sm">
                                Enter your details and AppSumo code to activate your lifetime access
                            </p>
                        </div>
                        
                        {flash?.message && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-800">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {flash.message}
                                </div>
                            </div>
                        )}
                        
                        {flash?.error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-800">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    {flash.error}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="code" value="AppSumo Code" />
                                <TextInput
                                    id="code"
                                    type="text"
                                    className="mt-1 block w-full text-center font-mono text-lg tracking-wider"
                                    placeholder="Enter your AppSumo code"
                                    value={data.code}
                                    onChange={e => setData('code', e.target.value.toUpperCase())}
                                    maxLength={12}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.code} className="mt-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="first_name" value="First Name" />
                                    <TextInput
                                        id="first_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        placeholder="First name"
                                        value={data.first_name}
                                        onChange={e => setData('first_name', e.target.value)}
                                        disabled={processing}
                                        required
                                    />
                                    <InputError message={errors.first_name} className="mt-2" />
                                </div>
                                
                                <div>
                                    <InputLabel htmlFor="last_name" value="Last Name" />
                                    <TextInput
                                        id="last_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        placeholder="Last name"
                                        value={data.last_name}
                                        onChange={e => setData('last_name', e.target.value)}
                                        disabled={processing}
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-2" />
                                </div>
                            </div>
                            
                            <div>
                                <InputLabel htmlFor="email" value="Email Address" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    placeholder="Your email address"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.email} className="mt-2" />
                                {isGmailAccount && (
                                    <p className="mt-1 text-xs text-green-600">
                                        ✓ Gmail account detected - You'll sign in with Google OAuth (no password needed)
                                    </p>
                                )}
                                {needsPassword && (
                                    <p className="mt-1 text-xs text-blue-600">
                                        ℹ️ Non-Gmail account - Please create a password below
                                    </p>
                                )}
                            </div>
                            
                            {/* Password fields for non-Gmail accounts */}
                            {needsPassword && (
                                <>
                                    <div>
                                        <InputLabel htmlFor="password" value="Password" />
                                        <TextInput
                                            id="password"
                                            type="password"
                                            className="mt-1 block w-full"
                                            placeholder="Create a password (min 8 characters)"
                                            value={data.password}
                                            onChange={e => setData('password', e.target.value)}
                                            disabled={processing}
                                            required
                                            minLength={8}
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>
                                    
                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                                        <TextInput
                                            id="password_confirmation"
                                            type="password"
                                            className="mt-1 block w-full"
                                            placeholder="Confirm your password"
                                            value={data.password_confirmation}
                                            onChange={e => setData('password_confirmation', e.target.value)}
                                            disabled={processing}
                                            required
                                            minLength={8}
                                        />
                                        <InputError message={errors.password_confirmation} className="mt-2" />
                                    </div>
                                </>
                            )}
                            
                            <PrimaryButton 
                                className="w-full justify-center"
                                disabled={!isFormValid() || processing}
                            >
                                {processing ? 'Activating Your Account...' : 'Redeem Code & Create Account'}
                            </PrimaryButton>
                        </form>
                        
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-xs text-blue-800">
                                    <p className="font-medium mb-1">Account Types:</p>
                                    <p><strong>Gmail accounts:</strong> Sign in with Google OAuth (no password needed)</p>
                                    <p><strong>Other emails:</strong> Create a password for direct login</p>
                                </div>
                            </div>
                        </div>
                    </div>

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
