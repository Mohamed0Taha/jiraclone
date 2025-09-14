import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

export default function Redeem({ flash, prefilledCode }) {
    const { t } = useTranslation();
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
            },
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
            <Head title={t('appsumo.redeemTitle')} />

            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center mb-4">
                            <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white px-6 py-3 rounded-lg font-bold text-xl tracking-wider shadow-lg">
                                AppSumo
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {t('appsumo.redeemHeading')}
                        </h1>
                        <p className="text-gray-600">
                            {t('appsumo.redeemSubheading')}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                {t('appsumo.createLifetime')}
                            </h2>
                            <p className="text-gray-600 text-sm">
                                {t('appsumo.createLifetimeDesc')}
                            </p>
                        </div>

                        {flash?.message && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-800">
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {flash.message}
                                </div>
                            </div>
                        )}

                        {flash?.error && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-center gap-2 text-red-800">
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                                        />
                                    </svg>
                                    {flash.error}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <InputLabel htmlFor="code" value={t('appsumo.codeLabel')} />
                                <TextInput
                                    id="code"
                                    type="text"
                                    className="mt-1 block w-full text-center font-mono text-lg tracking-wider"
                                    placeholder={t('appsumo.codePlaceholder')}
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    maxLength={12}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.code} className="mt-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="first_name" value={t('common.firstName')} />
                                    <TextInput
                                        id="first_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        placeholder={t('appsumo.firstNamePlaceholder')}
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', e.target.value)}
                                        disabled={processing}
                                        required
                                    />
                                    <InputError message={errors.first_name} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="last_name" value={t('common.lastName')} />
                                    <TextInput
                                        id="last_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        placeholder={t('appsumo.lastNamePlaceholder')}
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        disabled={processing}
                                        required
                                    />
                                    <InputError message={errors.last_name} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <InputLabel htmlFor="email" value={t('common.emailAddress')} />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    placeholder={t('appsumo.emailPlaceholder')}
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    disabled={processing}
                                    required
                                />
                                <InputError message={errors.email} className="mt-2" />
                                {isGmailAccount && (
                                    <p className="mt-1 text-xs text-green-600">
                                        ✓ {t('appsumo.gmailDetected')}
                                    </p>
                                )}
                                {needsPassword && (
                                    <p className="mt-1 text-xs text-blue-600">
                                        ℹ️ {t('appsumo.nonGmailAccount')}
                                    </p>
                                )}
                            </div>

                            {/* Password fields for non-Gmail accounts */}
                            {needsPassword && (
                                <>
                                    <div>
                                        <InputLabel htmlFor="password" value={t('common.password')} />
                                        <TextInput
                                            id="password"
                                            type="password"
                                            className="mt-1 block w-full"
                                            placeholder={t('appsumo.passwordPlaceholder')}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            disabled={processing}
                                            required
                                            minLength={8}
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel
                                            htmlFor="password_confirmation"
                                            value={t('common.confirmPassword')}
                                        />
                                        <TextInput
                                            id="password_confirmation"
                                            type="password"
                                            className="mt-1 block w-full"
                                            placeholder={t('appsumo.confirmPasswordPlaceholder')}
                                            value={data.password_confirmation}
                                            onChange={(e) =>
                                                setData('password_confirmation', e.target.value)
                                            }
                                            disabled={processing}
                                            required
                                            minLength={8}
                                        />
                                        <InputError
                                            message={errors.password_confirmation}
                                            className="mt-2"
                                        />
                                    </div>
                                </>
                            )}

                            <PrimaryButton
                                className="w-full justify-center"
                                disabled={!isFormValid() || processing}
                            >
                                {processing
                                    ? t('appsumo.activatingAccount')
                                    : t('appsumo.redeemButton')}
                            </PrimaryButton>
                        </form>

                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <svg
                                    className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <div className="text-xs text-blue-800">
                                    <p className="font-medium mb-1">{t('appsumo.accountTypes')}</p>
                                    <p>
                                        <strong>{t('appsumo.gmailAccounts')}</strong> {t('appsumo.gmailDescription')}
                                    </p>
                                    <p>
                                        <strong>{t('appsumo.otherEmails')}</strong> {t('appsumo.otherEmailsDescription')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            {t('appsumo.needHelp')}{' '}
                            <a
                                href="mailto:support@taskpilot.app"
                                className="text-blue-600 hover:underline"
                            >
                                support@taskpilot.app
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
