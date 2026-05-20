import { DynamicSettings } from './db';

export type EventStatus = 'Opening Soon' | 'Live' | 'Closed';

export interface EventStatusDetails {
  status: EventStatus;
  badgeText: string;
  badgeClass: string;
  isLive: boolean;
  message: string;
}

export function calculateEventStatus(settings: DynamicSettings): EventStatusDetails {
  const now = new Date();
  
  const parseSettingDate = (d: string, defaultTime: string) => {
    if (!d) return new Date(NaN);
    return d.includes('T') ? new Date(d) : new Date(d + defaultTime);
  };
  
  const start = parseSettingDate(settings.regStartDate, 'T00:00:00');
  const end = parseSettingDate(settings.regEndDate, 'T23:59:59');

  if (now < start) {
    return {
      status: 'Opening Soon',
      badgeText: '🟡 Opening Soon',
      badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      isLive: false,
      message: 'Registrations Opening Soon 🌿'
    };
  } else if (now >= start && now <= end) {
    return {
      status: 'Live',
      badgeText: '🟢 Live',
      badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      isLive: true,
      message: 'Registrations Live 🚀'
    };
  } else {
    return {
      status: 'Closed',
      badgeText: '🔴 Closed',
      badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      isLive: false,
      message: 'Registrations Closed 🌱'
    };
  }
}
