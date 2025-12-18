
import { Account } from '../types';

export const ACCOUNTS: Account[] = [
    {
        id: 'Stahl',
        name: 'Stahl',
        logoUrl: 'https://stahlkitchens.com/cdn/shop/files/Mobile_Version-09_11e24f4e-e339-4645-adb7-290a7f122252_120x@2x.png?v=1659696880'
    },
    { id: 'Samsonite India', name: 'Samsonite India' },
    { id: 'Continental Coffee', name: 'Continental Coffee' },
    { id: 'Tata Retail', name: 'Tata Retail' },
];

export const MOCK_USER = {
    id: 'usr_mock',
    email: 'demo@hiveminds.in',
    name: 'Demo User',
    allowedAccounts: ['Stahl', 'Samsonite India']
};
