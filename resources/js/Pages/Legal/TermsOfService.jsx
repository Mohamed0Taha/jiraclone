import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';

export default function TermsOfService() {
    return (
        <GuestLayout>
            <Head title="Terms of Service - TaskPilot" />

            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white shadow-lg rounded-lg p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
                            <p className="text-gray-600">Last updated: September 4, 2025</p>
                        </div>

                        <div className="prose prose-lg max-w-none">
                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                                <p className="text-gray-700 mb-4">
                                    By accessing and using TaskPilot ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
                                <p className="text-gray-700 mb-4">
                                    TaskPilot is a project management platform that helps individuals and teams organize, track, and complete their projects and tasks. The Service includes web-based tools for project planning, task management, team collaboration, and productivity enhancement.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
                                <p className="text-gray-700 mb-4">
                                    To use certain features of the Service, you must register for an account. You agree to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Provide accurate and complete information during registration</li>
                                    <li>Maintain the security of your password and account</li>
                                    <li>Notify us immediately of any unauthorized use of your account</li>
                                    <li>Be responsible for all activities that occur under your account</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
                                <p className="text-gray-700 mb-4">
                                    You agree not to use the Service to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Violate any applicable laws or regulations</li>
                                    <li>Infringe upon the rights of others</li>
                                    <li>Upload harmful, offensive, or inappropriate content</li>
                                    <li>Attempt to gain unauthorized access to our systems</li>
                                    <li>Interfere with or disrupt the Service</li>
                                    <li>Use the Service for any illegal or unauthorized purpose</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Subscription and Payment</h2>
                                <p className="text-gray-700 mb-4">
                                    Some features of the Service require a paid subscription. By subscribing, you agree to:
                                </p>
                                <ul className="list-disc list-inside text-gray-700 space-y-2">
                                    <li>Pay all applicable fees and taxes</li>
                                    <li>Automatic renewal unless cancelled</li>
                                    <li>Our refund policy as stated separately</li>
                                    <li>Price changes with 30 days notice</li>
                                </ul>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                                <p className="text-gray-700 mb-4">
                                    The Service and its original content, features, and functionality are owned by TaskPilot and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                                </p>
                                <p className="text-gray-700 mb-4">
                                    You retain ownership of any content you create using the Service, but grant us a limited license to use, store, and process your content to provide the Service.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Privacy</h2>
                                <p className="text-gray-700 mb-4">
                                    Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Termination</h2>
                                <p className="text-gray-700 mb-4">
                                    We may terminate or suspend your account and access to the Service at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
                                </p>
                                <p className="text-gray-700 mb-4">
                                    You may terminate your account at any time by contacting us or using the account deletion feature in your profile settings.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
                                <p className="text-gray-700 mb-4">
                                    The Service is provided "as is" and "as available" without any warranties of any kind. We disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
                                <p className="text-gray-700 mb-4">
                                    In no event shall TaskPilot be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the Service.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
                                <p className="text-gray-700 mb-4">
                                    These Terms shall be interpreted and governed by the laws of the jurisdiction in which TaskPilot operates, without regard to conflict of law provisions.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to Terms</h2>
                                <p className="text-gray-700 mb-4">
                                    We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
                                <p className="text-gray-700 mb-4">
                                    If you have any questions about these Terms, please contact us:
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
