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
import { DemoLoginButton } from '@/components/shared/DemoLoginButton';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { VQLogo } from '@/components/shared/VQLogo';

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createBrowserClient();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '' },
    });

    const onSubmit = async (data: LoginFormValues) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                toast.error(error.message);
                return;
            }

            toast.success("Welcome back to VoltIQ!");
            router.push('/overview');
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        try {
            await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/auth/callback` }
            });
        } catch (err) {
            toast.error("Error initiating Google sign-in");
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background text-foreground transition-colors duration-300 relative">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <ThemeToggle />
            </div>
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
                    Welcome back
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                    Sign in to your VoltIQ account
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
                            <label className="block text-sm font-medium leading-6 mb-2">Email address</label>
                            <div className="relative">
                                <input
                                    {...form.register("email")}
                                    type="email"
                                    tabIndex={1}
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
                                    tabIndex={2}
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
                            tabIndex={3}
                            disabled={isLoading}
                            className="flex w-full justify-center rounded-lg bg-primary hover:bg-primary/90 px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-50 transition-colors duration-200"
                        >
                            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign in"}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={signInWithGoogle}
                                type="button"
                                className="flex w-full justify-center items-center gap-3 rounded-lg bg-background px-3 py-2.5 text-sm font-semibold shadow-sm border border-border hover:bg-muted transition-colors"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>
                        </div>
                        <DemoLoginButton
                            onDemoSelect={(email, pass) => {
                                form.setValue('email', email);
                                form.setValue('password', pass);
                                onSubmit({ email, password: pass });
                            }}
                        />
                    </div>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/register" className="font-semibold text-primary hover:underline">
                            Create one
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
