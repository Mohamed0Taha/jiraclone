import { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { 
    Gift, 
    Plus, 
    Download, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Loader2,
    Copy,
    Eye,
    EyeOff
} from 'lucide-react';

export default function AppSumoDashboard({ codes, stats, flash }) {
    const [showCodes, setShowCodes] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        count: 100,
    });

    const handleGenerateCodes = (e) => {
        e.preventDefault();
        post(route('admin.appsumo.generate'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            }
        });
    };

    const handleExportCodes = () => {
        window.location.href = route('admin.appsumo.export');
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusBadge = (status) => {
        const variants = {
            'active': 'default',
            'redeemed': 'secondary',
            'expired': 'destructive',
        };
        
        const icons = {
            'active': <Clock className="w-3 h-3" />,
            'redeemed': <CheckCircle2 className="w-3 h-3" />,
            'expired': <XCircle className="w-3 h-3" />,
        };

        return (
            <Badge variant={variants[status]} className="flex items-center gap-1">
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    return (
        <AdminLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                        AppSumo Code Management
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => setShowCodes(!showCodes)}
                            variant="outline"
                            size="sm"
                        >
                            {showCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showCodes ? 'Hide Codes' : 'Show Codes'}
                        </Button>
                        <Button 
                            onClick={handleExportCodes}
                            variant="outline"
                            size="sm"
                            disabled={!codes?.length}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                        </Button>
                    </div>
                </div>
            }
        >
            <Head title="AppSumo Management - Admin" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    {flash?.message && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertDescription>{flash.message}</AlertDescription>
                        </Alert>
                    )}

                    {flash?.error && (
                        <Alert variant="destructive">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{flash.error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
                                <Gift className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
                                <Clock className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{stats?.active || 0}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Redeemed</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats?.redeemed || 0}</div>
                                {stats?.total > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {((stats?.redeemed || 0) / stats.total * 100).toFixed(1)}% conversion
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expired</CardTitle>
                                <XCircle className="h-4 w-4 text-red-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{stats?.expired || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Generate Codes */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                Generate New Codes
                            </CardTitle>
                            <CardDescription>
                                Create new AppSumo redemption codes for distribution
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            <form onSubmit={handleGenerateCodes} className="flex items-end gap-4">
                                <div className="flex-1">
                                    <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
                                        Number of codes to generate
                                    </label>
                                    <Input
                                        id="count"
                                        type="number"
                                        min="1"
                                        max="10000"
                                        value={data.count}
                                        onChange={e => setData('count', parseInt(e.target.value))}
                                        className={errors.count ? 'border-red-500' : ''}
                                        disabled={processing}
                                    />
                                    {errors.count && (
                                        <p className="text-sm text-red-600 mt-1">{errors.count}</p>
                                    )}
                                </div>
                                
                                <Button 
                                    type="submit" 
                                    disabled={!data.count || processing}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Codes List */}
                    <Card>
                        <CardHeader>
                            <CardTitle>AppSumo Codes</CardTitle>
                            <CardDescription>
                                All generated codes and their redemption status
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent>
                            {codes && codes.length > 0 ? (
                                <div className="space-y-4">
                                    {/* Search/Filter could go here */}
                                    
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 font-medium text-sm">
                                            <div>Code</div>
                                            <div>Status</div>
                                            <div>Redeemed By</div>
                                            <div>Redeemed At</div>
                                            <div>Actions</div>
                                        </div>
                                        
                                        <div className="divide-y">
                                            {codes.map((code) => (
                                                <div key={code.id} className="grid grid-cols-5 gap-4 p-4 items-center">
                                                    <div className="font-mono">
                                                        {showCodes ? (
                                                            <div className="flex items-center gap-2">
                                                                <span>{code.code}</span>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm"
                                                                    onClick={() => copyToClipboard(code.code)}
                                                                    className="h-6 w-6 p-0"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">••••••••••••</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div>
                                                        {getStatusBadge(code.status)}
                                                    </div>
                                                    
                                                    <div>
                                                        {code.redeemed_by_user ? (
                                                            <div>
                                                                <div className="font-medium">{code.redeemed_by_user.name}</div>
                                                                <div className="text-sm text-gray-500">{code.redeemed_by_user.email}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-sm text-gray-600">
                                                        {code.redeemed_at ? (
                                                            new Date(code.redeemed_at).toLocaleDateString()
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                    
                                                    <div>
                                                        {code.status === 'active' && showCodes && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm"
                                                                onClick={() => copyToClipboard(`${window.location.origin}/appsumo/redeem?code=${code.code}`)}
                                                            >
                                                                Copy Link
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">No codes generated yet</h3>
                                    <p className="text-gray-600">Generate your first batch of AppSumo codes to get started.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Integration Instructions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>AppSumo Integration</CardTitle>
                            <CardDescription>
                                URLs to provide to AppSumo for your listing
                            </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Static Redemption URL
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        readOnly 
                                        value={`${window.location.origin}/appsumo/redeem`}
                                        className="font-mono text-sm"
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => copyToClipboard(`${window.location.origin}/appsumo/redeem`)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Users will enter their code on this page
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Dynamic Link (configurable)
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        readOnly 
                                        value={`${window.location.origin}/appsumo`}
                                        className="font-mono text-sm"
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => copyToClipboard(`${window.location.origin}/appsumo`)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Can redirect to any URL you configure
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
