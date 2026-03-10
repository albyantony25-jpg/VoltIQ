"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2 } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_STYLES, ApplianceCard, EFFICIENCY_COLORS } from './ApplianceCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner'; // assume sonner for toasts or add it

const applianceFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    brand: z.string().optional(),
    category: z.string(),
    rated_watts: z.coerce.number().min(1, "Must be > 0"),
    standby_watts: z.coerce.number().min(0),
    efficiency_class: z.string().optional(),
    age_years: z.coerce.number().min(0).max(100),
    usage_hours: z.coerce.number().min(0).max(24),
});

type ApplianceFormValues = z.infer<typeof applianceFormSchema>;

interface AddApplianceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    homeId: string;
    onAdded: () => void;
}

export function AddApplianceDialog({ open, onOpenChange, homeId, onAdded }: AddApplianceDialogProps) {
    const [activeTab, setActiveTab] = useState('library');
    const [search, setSearch] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ApplianceFormValues>({
        resolver: zodResolver(applianceFormSchema) as any,
        defaultValues: {
            name: '',
            brand: '',
            category: 'other',
            rated_watts: 0,
            standby_watts: 0,
            efficiency_class: '',
            age_years: 0,
            usage_hours: 0,
        },
    });

    const { data: library = [], isLoading: isLoadingLibrary } = useQuery({
        queryKey: ['appliance-library'],
        queryFn: () => fetchApi('/appliances/library'),
        enabled: open && activeTab === 'library',
    });

    const filteredLibrary = library.filter((app: any) =>
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectTemplate = (template: any) => {
        form.reset({
            name: template.name,
            category: template.category,
            rated_watts: template.rated_watts,
            standby_watts: template.standby_watts,
            efficiency_class: template.efficiency_class,
            usage_hours: template.usage_hours,
            age_years: 0,
            brand: '',
        });
        setActiveTab('custom');
    };

    const onSubmit = async (data: ApplianceFormValues) => {
        setIsSubmitting(true);
        try {
            await fetchApi('/appliances/', {
                method: 'POST',
                body: JSON.stringify({
                    ...data,
                    home_id: homeId,
                    is_active: true
                }),
            });
            toast.success('Appliance added successfully');
            onAdded();
            form.reset();
            onOpenChange(false);
        } catch (error: any) {
            toast.error('Failed to add appliance', { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Add Appliance</DialogTitle>
                    <DialogDescription>
                        Choose from our pre-built library or create a custom appliance.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="library">Choose from Library</TabsTrigger>
                        <TabsTrigger value="custom">Add Custom Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="library" className="flex-1 overflow-hidden flex flex-col m-0 data-[state=inactive]:hidden">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <ScrollArea className="flex-1 pr-4">
                            {isLoadingLibrary ? (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                                    {filteredLibrary.map((template: any) => {
                                        const style = CATEGORY_STYLES[template.category] || CATEGORY_STYLES.other;
                                        const Icon = style.icon;
                                        return (
                                            <div
                                                key={template.id}
                                                onClick={() => handleSelectTemplate(template)}
                                                className="flex items-center p-3 border rounded-lg cursor-pointer hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <div className={`p-2 rounded-lg ${style.bg} mr-3 shrink-0`}>
                                                    <Icon className={`w-4 h-4 ${style.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm truncate">{template.name}</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {template.rated_watts}W • {template.usage_hours}h/day
                                                    </p>
                                                </div>
                                                {template.efficiency_class && (
                                                    <Badge variant="outline" className={`ml-2 text-[10px] px-1 py-0 h-4 ${EFFICIENCY_COLORS[template.efficiency_class] ? 'text-white border-transparent ' + EFFICIENCY_COLORS[template.efficiency_class] : ''}`}>
                                                        {template.efficiency_class}
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {filteredLibrary.length === 0 && (
                                        <div className="col-span-1 border-dashed sm:col-span-2 text-center p-8 text-muted-foreground border rounded-lg">
                                            No templates found matching "{search}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="custom" className="flex-1 overflow-y-auto m-0 data-[state=inactive]:hidden px-1">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Appliance Name *</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Living Room AC" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category *</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {Object.keys(CATEGORY_STYLES).map(cat => (
                                                            <SelectItem key={cat} value={cat}>
                                                                <span className="capitalize">{cat}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="rated_watts"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Rated Power (Watts) *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="usage_hours"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Daily Usage (Hours) *</FormLabel>
                                                <FormControl>
                                                    <Input type="number" step="0.1" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="standby_watts"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Standby Power (Watts)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="efficiency_class"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Efficiency Class</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="None" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        {Object.keys(EFFICIENCY_COLORS).map(ec => (
                                                            <SelectItem key={ec} value={ec}>{ec}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="brand"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Brand</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Samsung" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="age_years"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Age (Years)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Appliance
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
