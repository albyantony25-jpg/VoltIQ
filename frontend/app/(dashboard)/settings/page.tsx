"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@/lib/supabase-browser"
import { fetchApi } from "@/lib/api"
import { toast } from "sonner"
import { Save, User, Home, Bell, Info, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
    const supabase = createBrowserClient()
    const queryClient = useQueryClient()
    const router = useRouter()

    const [userEmail, setUserEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [budgetAlert, setBudgetAlert] = useState("")

    // Profile Queries
    const { data: userProfile, isLoading: isProfileLoading } = useQuery({
        queryKey: ['user_profile'],
        queryFn: () => fetchApi('/users/me')
    })

    useEffect(() => {
        const getSession = async () => {
            const { data } = await supabase.auth.getSession()
            if (data.session?.user) {
                setUserEmail(data.session.user.email || "")
            }
        }
        getSession()
    }, [supabase])

    useEffect(() => {
        if (userProfile?.full_name) {
            setFullName(userProfile.full_name)
        }
    }, [userProfile])

    const updateProfileMutation = useMutation({
        mutationFn: (name: string) => fetchApi('/users/me', {
            method: 'PATCH',
            body: JSON.stringify({ full_name: name })
        }),
        onSuccess: () => {
            toast.success("Profile updated successfully")
            queryClient.invalidateQueries({ queryKey: ['user_profile'] })
        },
        onError: () => toast.error("Failed to update profile")
    })

    // Home Queries
    const { data: homes = [], isLoading: isHomesLoading } = useQuery({
        queryKey: ['homes'],
        queryFn: () => fetchApi('/homes/')
    })

    const home = homes[0] || {}

    const [homeData, setHomeData] = useState({
        name: "",
        city: "",
        bedrooms: 1,
        occupants: 1,
        area_sqft: 1000,
        home_type: ""
    })

    useEffect(() => {
        if (home.id) {
            setHomeData({
                name: home.name || "",
                city: home.city || "",
                bedrooms: home.bedrooms || 1,
                occupants: home.occupants || 1,
                area_sqft: home.area_sqft || 1000,
                home_type: home.home_type || ""
            })
        }
    }, [home])

    const updateHomeMutation = useMutation({
        mutationFn: (data: any) => fetchApi(`/homes/${home.id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        onSuccess: () => {
            toast.success("Home settings updated successfully")
            queryClient.invalidateQueries({ queryKey: ['homes'] })
            queryClient.invalidateQueries({ queryKey: ['home_dashboard'] })
        },
        onError: () => toast.error("Failed to update home settings")
    })

    // Budget Alerts
    useEffect(() => {
        const saved = localStorage.getItem("voltiq_budget_alert")
        if (saved) setBudgetAlert(saved)
    }, [])

    const handleSaveBudget = () => {
        localStorage.setItem("voltiq_budget_alert", budgetAlert)
        toast.success("Budget alert saved")
    }

    if (isProfileLoading || isHomesLoading) {
        return <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-black text-white">Settings</h1>
                <p className="text-neutral-500 mt-1">Manage your account, home profile, and preferences.</p>
            </div>

            {/* Profile Section */}
            <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#1e1e1e] flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <User className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Profile</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input 
                            type="text" 
                            disabled 
                            value={userEmail} 
                            className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-neutral-500 cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Display Name</label>
                        <input 
                            type="text" 
                            value={fullName} 
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="pt-2 flex justify-end">
                        <button 
                            onClick={() => updateProfileMutation.mutate(fullName)}
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10"
                        >
                            <Save className="w-4 h-4" />
                            {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                </div>
            </section>

            {/* Home Settings Section */}
            {home.id && (
                <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-[#1e1e1e] flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                            <Home className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Home Profile</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Home Name</label>
                                <input 
                                    type="text" 
                                    value={homeData.name} 
                                    onChange={(e) => setHomeData({...homeData, name: e.target.value})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">City / Location</label>
                                <input 
                                    type="text" 
                                    value={homeData.city} 
                                    onChange={(e) => setHomeData({...homeData, city: e.target.value})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Home Type</label>
                                <select 
                                    value={homeData.home_type} 
                                    onChange={(e) => setHomeData({...homeData, home_type: e.target.value})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
                                >
                                    <option value="">Select Type</option>
                                    <option value="Apartment">Apartment</option>
                                    <option value="House">Independent House</option>
                                    <option value="Villa">Villa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Area (Sq. Ft)</label>
                                <input 
                                    type="number" 
                                    value={homeData.area_sqft} 
                                    onChange={(e) => setHomeData({...homeData, area_sqft: parseInt(e.target.value) || 0})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Bedrooms</label>
                                <input 
                                    type="number" 
                                    value={homeData.bedrooms} 
                                    onChange={(e) => setHomeData({...homeData, bedrooms: parseInt(e.target.value) || 1})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Occupants</label>
                                <input 
                                    type="number" 
                                    value={homeData.occupants} 
                                    onChange={(e) => setHomeData({...homeData, occupants: parseInt(e.target.value) || 1})}
                                    className="w-full bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-between items-center border-t border-[#1e1e1e] pt-6">
                            <button 
                                onClick={() => router.push('/setup')}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                            >
                                Switch Electricity Provider <ArrowRight className="w-4 h-4" />
                            </button>

                            <button 
                                onClick={() => updateHomeMutation.mutate(homeData)}
                                disabled={updateHomeMutation.isPending}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 w-full sm:w-auto justify-center"
                            >
                                <Save className="w-4 h-4" />
                                {updateHomeMutation.isPending ? "Saving..." : "Save Home Profile"}
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Budget Alerts Section */}
            <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#1e1e1e] flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                        <Bell className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">Budget Alerts</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Monthly Bill Threshold (₹)</label>
                        <div className="flex gap-4">
                            <input 
                                type="number" 
                                value={budgetAlert} 
                                onChange={(e) => setBudgetAlert(e.target.value)}
                                className="flex-1 bg-[#080808] border border-[#1e1e1e] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                placeholder="e.g. 5000"
                            />
                            <button 
                                onClick={handleSaveBudget}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors border border-white/10 shrink-0"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-neutral-500 flex items-center gap-2 bg-[#080808] p-3 rounded-lg border border-[#1e1e1e]">
                        <Info className="w-4 h-4 text-emerald-500 shrink-0" />
                        We'll highlight your billing page when this threshold is crossed.
                    </p>
                </div>
            </section>

            {/* About Section */}
            <section className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-[#1e1e1e] flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                        <Info className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-white">About VoltIQ</h2>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-white mb-1">VoltIQ <span className="text-sm font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded ml-2">v1.0.0</span></h3>
                            <p className="text-neutral-400 text-sm mb-4">AI-powered home energy intelligence for Indian households.</p>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {["Next.js 14", "FastAPI", "PostgreSQL", "Supabase", "OpenAI"].map(tech => (
                                    <span key={tech} className="px-2.5 py-1 bg-[#080808] border border-[#1e1e1e] text-xs text-neutral-300 rounded-md">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                        
                        <a 
                            href="https://github.com/albyantony25-jpg/VoltIQ" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-6 py-3 bg-[#080808] hover:bg-[#1a1a1a] border border-[#1e1e1e] hover:border-neutral-700 text-white rounded-xl transition-all font-semibold text-sm shrink-0"
                        >
                            View on GitHub
                        </a>
                    </div>
                </div>
            </section>
        </div>
    )
}
