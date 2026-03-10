"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building, Home as HomeIcon, LayoutPanelLeft, Box,
    CheckCircle2, Loader2, ArrowRight, ArrowLeft
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { toast } from 'sonner';

const homeSchema = z.object({
    name: z.string().min(2, "Home name must be at least 2 characters"),
    home_type: z.enum(['apartment', 'villa', 'bungalow', 'row_house']),
    bedrooms: z.number().min(1).max(20),
    occupants: z.number().min(1).max(30),
    city: z.string().min(2, "City name is required"),
    area_sqft: z.number().min(100, "Area must be at least 100 sq ft").max(20000),
    tariff_id: z.string().uuid("Please select a tariff plan"),
});

type HomeFormValues = z.infer<typeof homeSchema>;

export default function HomeSetupWizard({ onComplete, user }: { onComplete: () => void, user: any }) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const supabase = createBrowserClient();

    const form = useForm<HomeFormValues>({
        resolver: zodResolver(homeSchema),
        defaultValues: {
            name: 'My Dashboard Home',
            home_type: 'apartment',
            bedrooms: 2,
            occupants: 2,
            city: '',
            area_sqft: 1200,
            tariff_id: '',
        },
        mode: "onChange"
    });

    useEffect(() => {
        // Fetch tariffs for Step 3
        const fetchTariffs = async () => {
            const { data, error } = await supabase.from('tariffs').select('*');
            if (data && !error) {
                setTariffs(data);
                if (data.length > 0) {
                    form.setValue('tariff_id', data[0].id);
                }
            }
        };
        fetchTariffs();
    }, [supabase, form]);

    const nextStep = async () => {
        let isValid = false;
        if (step === 1) isValid = await form.trigger(['name', 'home_type']);
        if (step === 2) isValid = await form.trigger(['bedrooms', 'occupants', 'city']);
        if (step === 3) isValid = await form.trigger(['area_sqft', 'tariff_id']);

        if (isValid) setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const onSubmit = async (data: HomeFormValues) => {
        setIsSubmitting(true);
        try {
            // If this is the local dev bypass user, don't try to insert into the real Supabase DB
            if (user?.id === '00000000-0000-0000-0000-000000000000') {
                toast.success("Home configuration saved locally!");
                onComplete();
                return;
            }

            const { error } = await supabase.from('homes').insert({
                user_id: user.id,
                name: data.name,
                bedrooms: data.bedrooms,
                occupants: data.occupants,
                city: data.city,
                home_type: data.home_type,
                area_sqft: data.area_sqft,
                tariff_id: data.tariff_id || null,
            });

            if (error) throw error;

            toast.success("Home configuration saved!");
            onComplete();
        } catch (err: any) {
            toast.error(err.message || "Failed to setup home");
        } finally {
            setIsSubmitting(false);
        }
    };

    const { formState: { errors } } = form;

    const homeTypes = [
        { id: 'apartment', label: 'Apartment', icon: Building },
        { id: 'villa', label: 'Villa', icon: HomeIcon },
        { id: 'bungalow', label: 'Bungalow', icon: Box },
        { id: 'row_house', label: 'Row House', icon: LayoutPanelLeft },
    ];

    return (
        <div className="bg-card rounded-2xl shadow-2xl border border-border p-8 max-w-2xl w-full mx-auto relative overflow-hidden">
            {/* Progress Bar */}
            <div className="flex justify-between mb-8 items-center relative">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full"></div>
                <div
                    className="absolute left-0 top-1/2 h-1 bg-accent -z-10 -translate-y-1/2 rounded-full transition-all duration-300"
                    style={{ width: `${(step - 1) * 33.33}%` }}
                ></div>

                {[1, 2, 3, 4].map(num => (
                    <div
                        key={num}
                        className={`flex items-center justify-center h-8 w-8 rounded-full border-2 text-sm font-bold bg-card transition-colors ${step >= num
                            ? 'border-accent text-accent'
                            : 'border-muted text-muted-foreground'
                            }`}
                    >
                        {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
                    </div>
                ))}
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <AnimatePresence mode="wait">

                    {/* STEP 1 */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-2xl font-bold">Welcome to VoltIQ</h2>
                                <p className="text-muted-foreground mt-1">First, let's give your home a name and type.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Home Name</label>
                                <div className="relative">
                                    <input
                                        {...form.register("name")}
                                        className={`w-full rounded-lg border bg-background px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${form.formState.touchedFields.name && !errors.name
                                                ? 'border-emerald-500 pr-10'
                                                : errors.name
                                                    ? 'border-destructive pr-10'
                                                    : 'border-input'
                                            }`}
                                        placeholder="e.g. My Smart Apartment"
                                    />
                                    {form.formState.touchedFields.name && !errors.name && (
                                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                    )}
                                </div>
                                {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium mb-3">What type of home is it?</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {homeTypes.map(type => {
                                        const isSelected = form.watch('home_type') === type.id;
                                        return (
                                            <div
                                                key={type.id}
                                                onClick={() => form.setValue('home_type', type.id as any, { shouldValidate: true })}
                                                className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center gap-2 transition-all ${isSelected
                                                    ? 'border-accent bg-accent/10 text-accent font-semibold'
                                                    : 'border-border bg-background hover:border-accent/50 hover:bg-accent/5 text-muted-foreground hover:text-foreground'
                                                    }`}
                                            >
                                                <type.icon className="h-8 w-8" />
                                                <span className="font-medium text-sm">{type.label}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                                {errors.home_type && <p className="text-destructive text-sm mt-1">{errors.home_type.message}</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-2xl font-bold">Home Details</h2>
                                <p className="text-muted-foreground mt-1">Fill in details for personalized AI recommendations.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">City</label>
                                <div className="relative">
                                    <input
                                        {...form.register("city")}
                                        className={`w-full rounded-lg border bg-background px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${form.formState.touchedFields.city && !errors.city
                                                ? 'border-emerald-500 pr-10'
                                                : errors.city
                                                    ? 'border-destructive pr-10'
                                                    : 'border-input'
                                            }`}
                                        placeholder="e.g. Bengaluru"
                                    />
                                    {form.formState.touchedFields.city && !errors.city && (
                                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                    )}
                                </div>
                                {errors.city && <p className="text-destructive text-sm mt-1">{errors.city.message}</p>}
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Bedrooms</label>
                                    <span className="text-accent font-bold">{form.watch('bedrooms')}</span>
                                </div>
                                <input
                                    type="range" min="1" max="10" step="1"
                                    {...form.register("bedrooms", { valueAsNumber: true })}
                                    className="w-full accent-accent h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-medium">Occupants</label>
                                    <span className="text-accent font-bold">{form.watch('occupants')}</span>
                                </div>
                                <input
                                    type="range" min="1" max="20" step="1"
                                    {...form.register("occupants", { valueAsNumber: true })}
                                    className="w-full accent-accent h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-2xl font-bold">Size & Tariff</h2>
                                <p className="text-muted-foreground mt-1">This helps us calculate bills and efficiency scores.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Home Area (Sq Ft)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...form.register("area_sqft", { valueAsNumber: true })}
                                        className={`w-full rounded-lg border bg-background px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-colors ${form.formState.touchedFields.area_sqft && !errors.area_sqft
                                                ? 'border-emerald-500 pr-10'
                                                : errors.area_sqft
                                                    ? 'border-destructive pr-10'
                                                    : 'border-input'
                                            }`}
                                        placeholder="e.g. 1500"
                                    />
                                    {form.formState.touchedFields.area_sqft && !errors.area_sqft && (
                                        <CheckCircle2 className="absolute right-8 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                                    )}
                                </div>
                                {errors.area_sqft && <p className="text-destructive text-sm mt-1">{errors.area_sqft.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Applicable Tariff Plan</label>
                                {tariffs.length === 0 ? (
                                    <p className="text-sm text-amber-600 p-3 bg-amber-500/10 rounded-lg">Loading tariffs or no tariffs available.</p>
                                ) : (
                                    <div className="relative">
                                        <select
                                            {...form.register("tariff_id")}
                                            className={`w-full rounded-lg border bg-background px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none transition-colors appearance-none ${form.formState.touchedFields.tariff_id && !errors.tariff_id
                                                    ? 'border-emerald-500 pr-10'
                                                    : errors.tariff_id
                                                        ? 'border-destructive pr-10'
                                                        : 'border-input'
                                                }`}
                                        >
                                            {tariffs.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} • {t.state}</option>
                                            ))}
                                        </select>
                                        {form.formState.touchedFields.tariff_id && !errors.tariff_id && (
                                            <CheckCircle2 className="absolute right-10 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500 pointer-events-none" />
                                        )}
                                    </div>
                                )}
                                {errors.tariff_id && <p className="text-destructive text-sm mt-1">{errors.tariff_id.message}</p>}
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                        <motion.div
                            key="step4"
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6 text-center"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="h-20 w-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold">You're all set!</h2>
                                <p className="text-muted-foreground mt-2">Your interactive energy twin is ready.</p>
                            </div>

                            <div className="bg-muted/50 rounded-xl p-6 text-left border border-border mt-6">
                                <h3 className="font-semibold text-lg mb-4">{form.getValues('name')}</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Type</span>
                                        <span className="font-medium capitalize">{form.getValues('home_type').replace('_', ' ')}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">City</span>
                                        <span className="font-medium capitalize">{form.getValues('city')}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Size</span>
                                        <span className="font-medium">{form.getValues('bedrooms')} Bed • {form.getValues('occupants')} Ppl</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Area</span>
                                        <span className="font-medium">{form.getValues('area_sqft')} sq ft</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={step === 1 || isSubmitting}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${step === 1 ? 'opacity-0 cursor-default pointer-events-none' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>

                    {step < 4 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center gap-2 px-6 py-2.5 bg-foreground text-background font-semibold rounded-lg hover:bg-muted-foreground transition-colors shadow-sm"
                        >
                            Continue <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center justify-center gap-2 px-8 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition-colors shadow-sm w-32"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Finish"}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
