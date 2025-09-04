import { Head } from '@inertiajs/react';
import { Paper } from '@mui/material';

export default function TermsOfService() {
    return (
        <>
            <Head title="Terms of Service - TaskPilot" />
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
                                Terms of Service
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
                                    1. Acceptance of Terms
                                </h2>
                                <p>By accessing and using TaskPilot ("the Service"), you accept and agree to be bound by these Terms. If you do not agree to abide by them, do not use the Service.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    2. Description of Service
                                </h2>
                                <p>TaskPilot is a project management platform that helps individuals and teams organize, track, and complete projects and tasks. The Service includes tools for planning, collaboration, automation, and productivity.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    3. User Accounts
                                </h2>
                                <p style={{ marginBottom: '12px' }}>To use certain features, you must register for an account. You agree to:</p>
                                <ul style={{ 
                                    listStyleType: 'disc', 
                                    paddingLeft: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <li>Provide accurate and complete information</li>
                                    <li>Maintain the security of your password and account</li>
                                    <li>Notify us of any unauthorized use</li>
                                    <li>Be responsible for all activities under your account</li>
                                </ul>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    4. Acceptable Use
                                </h2>
                                <p style={{ marginBottom: '12px' }}>You agree not to use the Service to:</p>
                                <ul style={{ 
                                    listStyleType: 'disc', 
                                    paddingLeft: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <li>Violate laws or regulations</li>
                                    <li>Infringe intellectual property or privacy rights</li>
                                    <li>Upload harmful, abusive, or illegal content</li>
                                    <li>Attempt unauthorized access to systems</li>
                                    <li>Interfere with or disrupt the Service</li>
                                    <li>Use the Service for unlawful purposes</li>
                                </ul>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    5. Subscription and Payment
                                </h2>
                                <p style={{ marginBottom: '12px' }}>Some features require a paid subscription. By subscribing you agree to:</p>
                                <ul style={{ 
                                    listStyleType: 'disc', 
                                    paddingLeft: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <li>Pay applicable fees and taxes</li>
                                    <li>Automatic renewal unless you cancel</li>
                                    <li>Our refund policy (where applicable)</li>
                                    <li>Potential price changes with notice</li>
                                </ul>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    6. Intellectual Property
                                </h2>
                                <p style={{ marginBottom: '12px' }}>The Service and its original content, features, and functionality are owned by TaskPilot and protected by intellectual property laws.</p>
                                <p>You retain ownership of content you create, granting us a limited license to store and process it to provide the Service.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    7. Privacy
                                </h2>
                                <p>Your privacy is important to us. Your use of the Service is also governed by our Privacy Policy.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    8. Termination
                                </h2>
                                <p style={{ marginBottom: '12px' }}>We may suspend or terminate your access for violation of these Terms or harmful conduct.</p>
                                <p>You may terminate your account at any time via settings or by contacting support.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    9. Disclaimers
                                </h2>
                                <p>The Service is provided "as is" without warranties of any kind, express or implied.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    10. Limitation of Liability
                                </h2>
                                <p>TaskPilot shall not be liable for indirect, incidental, special, consequential, or punitive damages, or loss of profits, data, or goodwill.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    11. Governing Law
                                </h2>
                                <p>These Terms are governed by the laws applicable in our primary operating jurisdiction, without regard to conflict of law principles.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    12. Changes to Terms
                                </h2>
                                <p>We may update these Terms. Material changes will be communicated, and continued use constitutes acceptance.</p>
                            </section>

                            <section>
                                <h2 style={{ 
                                    fontSize: '1.5rem', 
                                    fontWeight: '600', 
                                    color: '#111827', 
                                    marginBottom: '16px' 
                                }}>
                                    13. Contact
                                </h2>
                                <p style={{ marginBottom: '12px' }}>Questions about these Terms?</p>
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
