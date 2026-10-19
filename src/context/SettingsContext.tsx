import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

interface HospitalSettings {
  hospital_name: string;
  hospital_reg_no: string;
  hospital_address: string;
  hospital_phone: string;
  hospital_email: string;
  hospital_logo_url: string;
}

interface SettingsContextType {
  settings: HospitalSettings;
  refreshSettings: () => Promise<void>;
  updateLogo: (dataUri: string) => Promise<void>;
  currentTime: string;
}

const defaultSettings: HospitalSettings = {
  hospital_name: 'MediPlus Hospital & Healthcare Center',
  hospital_reg_no: 'PV-LK-2026/0491',
  hospital_address: '124/B Galle Road, Colombo 03, Sri Lanka',
  hospital_phone: '+94 11 234 5678',
  hospital_email: 'care@mediplus.lk',
  hospital_logo_url: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<HospitalSettings>(defaultSettings);
  const [currentTime, setCurrentTime] = useState<string>('');

  const refreshSettings = async () => {
    try {
      const data = await apiRequest<{ success: boolean; settings: Record<string, string> }>('/api/admin/settings');
      if (data.success && data.settings) {
        setSettings({
          hospital_name: data.settings.hospital_name || defaultSettings.hospital_name,
          hospital_reg_no: data.settings.hospital_reg_no || defaultSettings.hospital_reg_no,
          hospital_address: data.settings.hospital_address || defaultSettings.hospital_address,
          hospital_phone: data.settings.hospital_phone || defaultSettings.hospital_phone,
          hospital_email: data.settings.hospital_email || defaultSettings.hospital_email,
          hospital_logo_url: data.settings.hospital_logo_url || '',
        });
      }
    } catch (err) {
      // Use defaults
    }
  };

  const updateLogo = async (logoDataUri: string) => {
    await apiRequest('/api/admin/logo', {
      method: 'POST',
      body: JSON.stringify({ logoDataUri }),
    });
    setSettings((prev) => ({ ...prev, hospital_logo_url: logoDataUri }));
  };

  // Clock in Sri Lankan Timezone
  useEffect(() => {
    refreshSettings();

    const updateClock = () => {
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Colombo',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date());
      setCurrentTime(formatted);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        refreshSettings,
        updateLogo,
        currentTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
