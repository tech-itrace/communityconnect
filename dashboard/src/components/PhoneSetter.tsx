import { useState, useEffect } from 'react';
import { getUserPhone, setUserPhone, clearUserPhone, formatPhone } from '../lib/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { X, User, AlertCircle } from 'lucide-react';

interface PhoneSetterProps {
    onPhoneSet?: (phone: string) => void;
}

/**
 * Development component to set phone number for testing
 * This will be replaced with proper login page in Week 4
 */
export function PhoneSetter({ onPhoneSet }: PhoneSetterProps) {
    const [phone, setPhone] = useState('');
    const [currentPhone, setCurrentPhone] = useState<string | null>(null);
    const [showInput, setShowInput] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const storedPhone = getUserPhone();
        setCurrentPhone(storedPhone);

        // If no phone is set, show input automatically
        if (!storedPhone) {
            setShowInput(true);
        }
    }, []);

    const handleSetPhone = () => {
        setError('');

        // Basic validation
        if (!phone) {
            setError('Please enter a phone number');
            return;
        }

        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10 && cleaned.length !== 12) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        // Normalize to 10 digits
        const normalized = cleaned.length === 12 ? cleaned.slice(2) : cleaned;

        setUserPhone(normalized);
        setCurrentPhone(normalized);
        setShowInput(false);
        setPhone('');

        if (onPhoneSet) {
            onPhoneSet(normalized);
        }
    };

    const handleClear = () => {
        clearUserPhone();
        setCurrentPhone(null);
        setShowInput(true);
    };

    if (!showInput && currentPhone) {
        return (
            <div className="fixed top-4 right-4 z-50">
                <Card className="p-3 bg-blue-50 border-blue-200 shadow-lg">
                    <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-blue-600" />
                        <div className="text-sm">
                            <div className="text-gray-600">Testing as:</div>
                            <div className="font-medium text-gray-900">
                                {formatPhone(currentPhone)}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 bg-white">
                <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">
                            Set Phone Number for Testing
                        </h2>
                        <p className="text-sm text-gray-600">
                            Enter a phone number that exists in the database with admin role.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="9876543210"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                setError('');
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleSetPhone();
                                }
                            }}
                            className={error ? 'border-red-300' : ''}
                        />
                        {error && (
                            <p className="text-sm text-red-600 mt-1">{error}</p>
                        )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> This is for development testing only.
                            A proper login page will be implemented in Week 4.
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-xs text-blue-800 space-y-1">
                            <div><strong>Quick test:</strong></div>
                            <div>• Use phone number from your database</div>
                            <div>• Must have 'admin' or 'super_admin' role</div>
                            <div>• Default: {import.meta.env.VITE_TEST_PHONE_NUMBER || '9876543210'}</div>
                        </p>
                    </div>

                    <Button
                        onClick={handleSetPhone}
                        className="w-full"
                    >
                        Set Phone Number
                    </Button>

                    {currentPhone && (
                        <Button
                            onClick={() => setShowInput(false)}
                            variant="outline"
                            className="w-full"
                        >
                            Cancel
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
