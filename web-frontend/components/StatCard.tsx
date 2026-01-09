'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'gray';
    trend?: {
        value: number;
        isPositive: boolean;
    };
    subtitle?: string;
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    subtitle
}: StatCardProps) {
    const colorClasses = {
        blue: 'text-blue-600 bg-blue-100',
        green: 'text-green-600 bg-green-100',
        purple: 'text-purple-600 bg-purple-100',
        red: 'text-red-600 bg-red-100',
        orange: 'text-orange-600 bg-orange-100',
        gray: 'text-gray-600 bg-gray-100',
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                        <span>{trend.isPositive ? '↑' : '↓'}</span>
                        <span>{Math.abs(trend.value)}%</span>
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm text-gray-600 mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
