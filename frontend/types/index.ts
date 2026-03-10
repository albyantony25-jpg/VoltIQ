export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface Home {
  id: string;
  userId: string;
  name: string;
  region: string;
  sizeSqFt?: number;
  occupants?: number;
  homeType?: string;
  createdAt: string;
}

export interface Appliance {
  id: string;
  homeId: string;
  name: string;
  type: string;
  category: string;
  wattage: number;
  quantity: number;
  hoursPerDay: number;
  daysPerWeek: number;
  room?: string;
  createdAt: string;
}

export interface UsageLog {
  id: string;
  applianceId: string;
  homeId: string;
  date: string;
  kwhUsed: number;
}

export interface Tariff {
  id: string;
  region: string;
  planName: string;
  baseCharge: number;
  ratePerKwh: number;
}

export interface Bill {
  id: string;
  homeId: string;
  month: string;
  totalKwh: number;
  totalAmount: number;
  currency: string;
  status: 'estimated' | 'actual';
}

export interface AIInsight {
  id: string;
  homeId: string;
  type: 'hog' | 'behavioral' | 'seasonal' | 'upgrade' | 'peer';
  title: string;
  description: string;
  potentialSavings?: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  homeId: string;
  type: 'spike' | 'overuse' | 'budget';
  message: string;
  isRead: boolean;
  createdAt: string;
}
