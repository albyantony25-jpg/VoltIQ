"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { VQLogo } from '@/components/shared/VQLogo';

const registerSchema = z.object({
    fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createBrowserClient();

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: { fullName: '', email: '', password: '' },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                    }
                }
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success("Account created! You can now log in.");
            router.push('/login');
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-300">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-2xl shadow-amber-500/20 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <VQLogo className="h-12 w-12" />
                    </div>
                </div>
                <h2 className="mt-8 text-center text-3xl font-bold tracking-tight">
                    Create an account
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Join VoltIQ today
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
            >
                <div className="bg-card py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-border">
                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(onSubmit)(e); }}>

                        <div>
                            <label className="block text-sm font-medium leading-6 mb-2">Full Name</label>
                            <div className="relative">
                                <input
                                    {...form.register("fullName")}
                                    type="text"
                                    tabIndex={1}
                                    className={`block w-full rounded-lg border py-2.5 px-3 bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all sm:text-sm ${form.formState.touchedFields.fullName && !form.formState.errors.fullName
                                        ? 'border-emerald-500 pr-10'
                                        : form.formState.errors.fullName
                                            ? 'border-destructive pr-10'
                                            : 'border-input focus:border-primary'
                                        }`}
                                />
                                {form.formState.touchedFields.fullName && !form.formState.errors.fullName && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                )}
                            </div>
                            {form.formState.errors.fullName && (
                                <p className="mt-2 text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium leading-6 mb-2">Email address</label>
                            <div className="relative">
                                <input
                                    {...form.register("email")}
                                    type="email"
                                    tabIndex={2}
                                    className={`block w-full rounded-lg border py-2.5 px-3 bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all sm:text-sm ${form.formState.touchedFields.email && !form.formState.errors.email
                                        ? 'border-emerald-500 pr-10'
                                        : form.formState.errors.email
                                            ? 'border-destructive pr-10'
                                            : 'border-input focus:border-primary'
                                        }`}
                                />
                                {form.formState.touchedFields.email && !form.formState.errors.email && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                )}
                            </div>
                            {form.formState.errors.email && (
                                <p className="mt-2 text-sm text-destructive">{form.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium leading-6 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    {...form.register("password")}
                                    type="password"
                                    tabIndex={3}
                                    className={`block w-full rounded-lg border py-2.5 px-3 bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary focus:outline-none transition-all sm:text-sm ${form.formState.touchedFields.password && !form.formState.errors.password
                                        ? 'border-emerald-500 pr-10'
                                        : form.formState.errors.password
                                            ? 'border-destructive pr-10'
                                            : 'border-input focus:border-primary'
                                        }`}
                                />
                                {form.formState.touchedFields.password && !form.formState.errors.password && (
                                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                )}
                            </div>
                            {form.formState.errors.password && (
                                <p className="mt-2 text-sm text-destructive">{form.formState.errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            tabIndex={4}
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-primary hover:bg-primary/90 px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50 transition-colors duration-200"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign up"}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
