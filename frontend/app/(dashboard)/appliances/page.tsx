"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { ApplianceCard } from '@/components/appliances/ApplianceCard';
import { AddApplianceDialog } from '@/components/appliances/AddApplianceDialog';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function AppliancesPage() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const queryClient = useQueryClient();
    const prefersReducedMotion = useReducedMotion();

    // Fetch user's homes to get a valid home_id
    const { data: homes = [], isLoading: loadingHomes } = useQuery({
        queryKey: ['homes'],
        queryFn: () => fetchApi('/homes/')
    });

    const activeHome = homes[0]; // For MVP, assume 1 home

    const { data: appliances = [], isLoading: loadingAppliances } = useQuery({
        queryKey: ['appliances', activeHome?.id],
        queryFn: () => fetchApi(`/appliances/?home_id=${activeHome.id}`),
        enabled: !!activeHome?.id
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchApi(`/appliances/${id}`, { method: 'DELETE' }),
        onMutate: async (deletedId) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['appliances', activeHome?.id] });
            const previous = queryClient.getQueryData(['appliances', activeHome?.id]);
            queryClient.setQueryData(['appliances', activeHome?.id], (old: any) =>
                old ? old.filter((app: any) => app.id !== deletedId) : []
            );
            return { previous };
        },
        onError: (err, newTodo, context: any) => {
            queryClient.setQueryData(['appliances', activeHome?.id], context.previous);
            toast.error('Failed to delete appliance');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['appliances', activeHome?.id] });
            toast.success('Appliance removed');
        }
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to remove this appliance?')) {
            deleteMutation.mutate(id);
        }
    };

    const isLoading = loadingHomes || loadingAppliances;

    if (loadingHomes) {
        return (
            <div className="flex items-center justify-center p-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (homes.length === 0) {
        return (
            <div className="p-8 text-center max-w-md mx-auto mt-20 border rounded-xl bg-card border-dashed">
                <h2 className="text-xl font-semibold mb-2">No Home Found</h2>
                <p className="text-muted-foreground mb-4">You need to set up a home profile before adding appliances.</p>
                <Button>Go to Home Setup</Button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Appliance Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage electrical appliances in <b>{activeHome.name}</b>
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="shrink-0 gap-2">
                    <Plus className="w-4 h-4" /> Add Appliance
                </Button>
            </div>

            {loadingAppliances ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="rounded-xl border p-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[120px]" />
                                    <Skeleton className="h-3 w-[80px]" />
                                </div>
                            </div>
                            <Skeleton className="h-[60px] w-full" />
                        </div>
                    ))}
                </div>
            ) : appliances.length === 0 ? (
                <motion.div
                    initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center p-16 md:p-24 border rounded-2xl bg-gradient-to-b from-slate-900/50 to-slate-950/80 border-slate-800 shadow-xl overflow-hidden relative"
                >
                    {/* SVG Empty State Component */}
                    <div className="relative mb-8 z-10">
                        {/* Soft background glow */}
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                        <svg width="180" height="180" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative drop-shadow-2xl">
                            {/* Abstract house structure */}
                            <path d="M40 120L120 40L200 120V200C200 205.523 195.523 210 190 210H50C44.4772 210 40 205.523 40 200V120Z" fill="url(#paint0_linear)" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M40 120L120 40L200 120" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Smart Plug motif */}
                            <rect x="90" y="110" width="60" height="60" rx="16" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                            <circle cx="105" cy="130" r="4" fill="#60a5fa" />
                            <circle cx="135" cy="130" r="4" fill="#60a5fa" />
                            <path d="M120 150V140" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />

                            {/* Energy/Wireless Waves */}
                            <path d="M150 80C160 70 170 70 180 80" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" className={prefersReducedMotion ? "" : "animate-[pulse_2s_infinite]"} />
                            <path d="M160 60C175 45 195 45 210 60" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" opacity="0.5" className={prefersReducedMotion ? "" : "animate-[pulse_2s_infinite_200ms]"} />

                            <defs>
                                <linearGradient id="paint0_linear" x1="120" y1="40" x2="120" y2="210" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#3b82f6" stopOpacity="0.8" />
                                    <stop offset="1" stopColor="#1e293b" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    <h3 className="text-2xl font-bold tracking-tight text-white mb-2 relative z-10">Connect your First Appliance</h3>
                    <p className="text-slate-400 max-w-sm text-center text-base mb-8 relative z-10 leading-relaxed">
                        Add ACs, Refrigerators, and TVs to track itemized consumption, simulate energy costs, and get AI insights.
                    </p>
                    <div className="relative z-10">
                        <Button onClick={() => setIsAddOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95">
                            <Plus className="w-5 h-5 mr-2" /> Add Appliance
                        </Button>
                    </div>

                    {/* Decorative bottom grid */}
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:linear-gradient(transparent,white)] opacity-20 pointer-events-none"></div>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
                    {appliances.map((app: any) => (
                        <ApplianceCard
                            key={app.id}
                            appliance={app}
                            onDelete={handleDelete}
                        // onEdit={() => {}} // Skipping edit for MVP since add/edit sharing dialog is complex
                        />
                    ))}
                </div>
            )}

            {isAddOpen && (
                <AddApplianceDialog
                    open={isAddOpen}
                    onOpenChange={setIsAddOpen}
                    homeId={activeHome.id}
                    onAdded={() => {
                        queryClient.invalidateQueries({ queryKey: ['appliances', activeHome.id] });
                    }}
                />
            )}
        </div>
    );
}
