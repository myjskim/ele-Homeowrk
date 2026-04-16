import React, { useState } from 'react';
import { Settings, X, Key, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-ink/20 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="w-full max-w-md bg-white border-3 border-brand-ink shadow-[12px_12px_0px_theme(colors.brand-ink)] relative"
          >
            <div className="p-8 border-b-3 border-brand-ink flex items-center justify-between bg-brand-bg">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-brand-primary" />
                <h2 className="text-2xl font-black text-brand-ink tracking-tight uppercase">SETTINGS</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-brand-ink hover:text-white border-2 border-brand-ink transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-black text-brand-ink uppercase tracking-wider">
                  <Key className="w-4 h-4 text-brand-primary" />
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                  placeholder="API 키를 입력하세요"
                  className="w-full px-5 py-4 bg-brand-bg border-2 border-brand-border focus:border-brand-ink outline-none transition-all font-bold"
                />
                <p className="text-[12px] text-gray-500 font-medium">
                  * 입력하신 API 키는 브라우저에만 저장됩니다.
                </p>
              </div>

              <div className="p-6 bg-brand-bg border-2 border-brand-border rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-brand-ink font-black text-sm uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-brand-primary" />
                  AI 최적화 모드 작동 중
                </div>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                  학년, 과목, 단원의 난이도에 따라 가장 적합한 모델(Flash 또는 Pro)을 시스템이 자동으로 선택하여 최적의 문제를 생성합니다.
                </p>
              </div>
            </div>

            <div className="p-8 border-t-3 border-brand-ink flex gap-4 bg-brand-bg">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-4 bg-white border-2 border-brand-ink text-brand-ink font-black hover:bg-gray-100 transition-all uppercase tracking-wider"
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-4 bg-brand-primary text-white font-black border-2 border-brand-ink shadow-[4px_4px_0px_rgba(0,0,0,0.1)] hover:brightness-110 transition-all active:scale-95 uppercase tracking-wider"
              >
                SAVE
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
