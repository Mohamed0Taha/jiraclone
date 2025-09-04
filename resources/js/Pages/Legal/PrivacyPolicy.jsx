import { Head } from '@inertiajs/react';
import { Paper } from '@mui/material';

export default function PrivacyPolicy() {
    return (
        <>
            <Head title="Privacy Policy - TaskPilot" />
            <div style={{ 
                minHeight: '100vh', 
                backgroundColor: '#9333EA', 
                padding: '40px 20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
            }}>
                <Paper 
                    elevation={3} 
                    sx={{ 
                        backgroundColor: 'white',
                        padding: { xs: 3, md: 6, lg: 8 },
                        maxWidth: '1200px',
                        width: '100%',
                        borderRadius: 2
                    }}
                >
                    <div style={{ width: '100%' }}>
                    <header style={{ marginBottom: '48px' }}>
                        <h1 style={{ 
                            fontSize: '3rem', 
                            fontWeight: 'bold', 
                            letterSpacing: '-0.025em',
                            color: '#111827',
                            marginBottom: '12px',
                            lineHeight: '1.1'
                        }}>
                            Privacy Policy
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: '1.125rem' }}>
                            Last updated: September 4, 2025
                        </p>
                    </header>

                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '56px',
                        color: '#374151',
                        lineHeight: '1.7',
                        fontSize: '17px'
                    }}>
                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                1. Introduction
                            </h2>
                            <p>
                                Welcome to TaskPilot ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our project management platform.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                2. Information We Collect
                            </h2>
                            <h3 style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '600', 
                                color: '#1F2937', 
                                marginTop: '8px', 
                                marginBottom: '12px' 
                            }}>
                                Personal Information
                            </h3>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>Name and email address (when you register)</li>
                                <li>Payment information (processed securely through Stripe)</li>
                                <li>Profile information you choose to provide</li>
                                <li>Communication preferences</li>
                            </ul>
                            <h3 style={{ 
                                fontSize: '1.25rem', 
                                fontWeight: '600', 
                                color: '#1F2937', 
                                marginTop: '24px', 
                                marginBottom: '12px' 
                            }}>
                                Usage Information
                            </h3>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>Projects and tasks you create</li>
                                <li>Comments and collaboration data</li>
                                <li>Usage analytics and performance data</li>
                                <li>Device information and IP address</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                3. How We Use Your Information
                            </h2>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>Provide and maintain our service</li>
                                <li>Process payments and manage subscriptions</li>
                                <li>Send important service notifications</li>
                                <li>Improve our platform and user experience</li>
                                <li>Provide customer support</li>
                                <li>Comply with legal obligations</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                4. Information Sharing
                            </h2>
                            <p style={{ marginBottom: '12px' }}>
                                We do not sell, rent, or trade your personal information. We may share your information only in these limited circumstances:
                            </p>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>With service providers who help us operate our platform (like Stripe for payments)</li>
                                <li>When required by law or to protect our rights</li>
                                <li>With your explicit consent</li>
                                <li>In connection with a business transfer or merger</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                5. Data Security
                            </h2>
                            <p style={{ marginBottom: '12px' }}>
                                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. This includes:
                            </p>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>Encryption of data in transit and at rest</li>
                                <li>Regular security assessments</li>
                                <li>Access controls and authentication</li>
                                <li>Secure payment processing through Stripe</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                6. Your Rights
                            </h2>
                            <p style={{ marginBottom: '12px' }}>
                                Depending on your location, you may have the following rights regarding your personal data:
                            </p>
                            <ul style={{ 
                                listStyleType: 'disc', 
                                paddingLeft: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <li>Access your personal data</li>
                                <li>Correct inaccurate data</li>
                                <li>Delete your data</li>
                                <li>Restrict processing</li>
                                <li>Data portability</li>
                                <li>Object to processing</li>
                            </ul>
                            <p style={{ marginTop: '16px' }}>
                                To exercise these rights, please contact us at <span style={{ fontWeight: '500' }}>support@taskpilot.us</span>.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                7. Cookies and Tracking
                            </h2>
                            <p>
                                We use cookies and similar technologies to enhance your experience on our platform. You can manage your cookie preferences through your browser settings or our cookie consent banner.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                8. Data Retention
                            </h2>
                            <p>
                                We retain your personal data only for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal data within 30 days.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                9. International Transfers
                            </h2>
                            <p>
                                Your data may be transferred to and processed in countries other than your own. We ensure that such transfers are conducted in accordance with applicable data protection laws and provide appropriate safeguards.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                10. Children's Privacy
                            </h2>
                            <p>
                                Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                11. Changes to This Policy
                            </h2>
                            <p>
                                We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ 
                                fontSize: '1.5rem', 
                                fontWeight: '600', 
                                color: '#111827', 
                                marginBottom: '16px' 
                            }}>
                                12. Contact Us
                            </h2>
                            <p style={{ marginBottom: '12px' }}>
                                If you have any questions about this privacy policy or our data practices, please contact us:
                            </p>
                            <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                border: '1px solid #E5E7EB', 
                                borderRadius: '6px', 
                                padding: '16px' 
                            }}>
                                <p>
                                    <strong>Email:</strong> support@taskpilot.us<br />
                                    <strong>Website:</strong> https://taskpilot.us
                                </p>
                            </div>
                        </section>
                    </div>

                    <footer style={{ 
                        marginTop: '64px', 
                        paddingTop: '32px', 
                        borderTop: '1px solid #E5E7EB', 
                        fontSize: '0.875rem', 
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <span>© {new Date().getFullYear()} TaskPilot. All rights reserved.</span>
                        <a 
                            href="/" 
                            style={{ 
                                color: '#2563EB', 
                                fontWeight: '500',
                                textDecoration: 'none'
                            }}
                            onMouseOver={(e) => e.target.style.color = '#1D4ED8'}
                            onMouseOut={(e) => e.target.style.color = '#2563EB'}
                        >
                            ← Back to TaskPilot
                        </a>
                    </footer>
                    </div>
                </Paper>
            </div>
        </>
    );
}
