'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, Video, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/', label: 'Settings Setup', icon: Settings },
    { href: '/generate', label: 'Video Generator', icon: Video },
    { href: '/metadata', label: 'Metadata Helper', icon: FileText },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-52 shrink-0 border-r bg-white flex flex-col">
            {/* Logo */}
            <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                        <Video className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-sm font-bold leading-none text-foreground">STUDIOAI</div>
                        <div className="text-[10px] text-muted-foreground tracking-widest">NEURAL STUDIO</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3">
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground mb-2 px-2 pt-2">COMMAND</p>
                <ul className="space-y-1">
                    {navItems.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href;
                        return (
                            <li key={href}>
                                <Link
                                    href={href}
                                    className={cn(
                                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        active
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
