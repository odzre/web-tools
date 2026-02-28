'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/admin/website'); }, [router]);
    return (
        <div className="flex items-center justify-center h-64">
            <div className="spinner w-8 h-8" />
        </div>
    );
}
