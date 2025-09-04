import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';

export default function PrivacyPolicy() {
    return (
        <GuestLayout>
            <Head title="Privacy Policy - TaskPilot" />

            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow-lg rounded-lg p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                            <p className="text-gray-600">Last updated: September 4, 2025</p>
                        </div>

                        <div className="prose prose-lg max-w-none">
                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                                <p className="text-gray-700 mb-4">
                                    Welcome to TaskPilot ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our project management platform.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
                                
                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
                                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                                    <li>Name and email address (when you register)</li>
                                    <li>Payment information (processed securely through Stripe)</li>
                                    <li>Profile information you choose to provide</li>
                                    <li>Communication preferences</li>
                                </ul>

                                <h3 className="text-xl font-semibold text-gray-800 mb-3">Usage Information</h3>
                                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                                    <li>Projects and tasks you create</li>
                                    <li>Comments and collaboration data</li>
                                    <li>Usage analytics and performance data</li>
                                    <li>Device information and IP address</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Provide and maintain our service</li>
                                    <li>Process payments and manage subscriptions</li>
                                    <li>Send important service notifications</li>
                                    <li>Improve our platform and user experience</li>
                                    <li>Provide customer support</li>
                                    <li>Comply with legal obligations</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing</h2>
                                <p className="text-gray-700 mb-4">
                                    We do not sell, rent, or trade your personal information. We may share your information only in these limited circumstances:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>With service providers who help us operate our platform (like Stripe for payments)</li>
                                    <li>When required by law or to protect our rights</li>
                                    <li>With your explicit consent</li>
                                    <li>In connection with a business transfer or merger</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
                                <p className="text-gray-700 mb-4">
                                    We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Encryption of data in transit and at rest</li>
                                    <li>Regular security assessments</li>
                                    <li>Access controls and authentication</li>
                                    <li>Secure payment processing through Stripe</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
                                <p className="text-gray-700 mb-4">
                                    Depending on your location, you may have the following rights regarding your personal data:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Access your personal data</li>
                                    <li>Correct inaccurate data</li>
                                    <li>Delete your data</li>
                                    <li>Restrict processing</li>
                                    <li>Data portability</li>
                                    <li>Object to processing</li>
                                </ul>
                                <p className="text-gray-700 mt-4">
                                    To exercise these rights, please contact us at support@taskpilot.us
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Cookies and Tracking</h2>
                                <p className="text-gray-700 mb-4">
                                    We use cookies and similar technologies to enhance your experience on our platform. You can manage your cookie preferences through your browser settings or our cookie consent banner.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Data Retention</h2>
                                <p className="text-gray-700 mb-4">
                                    We retain your personal data only for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal data within 30 days.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Transfers</h2>
                                <p className="text-gray-700 mb-4">
                                    Your data may be transferred to and processed in countries other than your own. We ensure that such transfers are conducted in accordance with applicable data protection laws and provide appropriate safeguards.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
                                <p className="text-gray-700 mb-4">
                                    Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Policy</h2>
                                <p className="text-gray-700 mb-4">
                                    We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
                                <p className="text-gray-700 mb-4">
                                    If you have any questions about this privacy policy or our data practices, please contact us:
                                </p>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-700">
                                        <strong>Email:</strong> support@taskpilot.us<br />
                                        <strong>Website:</strong> https://taskpilot.us
                                    </p>
                                </div>
                            </section>
                        </div>

                        <div className="text-center mt-8 pt-8 border-t border-gray-200">
                            <a 
                                href="/" 
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                ← Back to TaskPilot
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </GuestLayout>
    );
}
