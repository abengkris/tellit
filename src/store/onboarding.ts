import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OnboardingStep = 
  | 'welcome'
  | 'identity'
  | 'profile-image'
  | 'interests'
  | 'recommendations'
  | 'muting'
  | 'security'
  | 'complete';

interface OnboardingState {
  currentStep: OnboardingStep;
  data: {
    name: string;
    display_name: string;
    picture: string;
    interests: string[];
    mutedKeywords: string[];
    followedPubkeys: string[];
  };
  setStep: (step: OnboardingStep) => void;
  updateData: (data: Partial<OnboardingState['data']>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 'welcome',
      data: {
        name: '',
        display_name: '',
        picture: '',
        interests: [],
        mutedKeywords: [],
        followedPubkeys: [],
      },
      setStep: (step) => set({ currentStep: step }),
      updateData: (newData) => set((state) => ({ 
        data: { ...state.data, ...newData } 
      })),
      reset: () => set({
        currentStep: 'welcome',
        data: {
          name: '',
          display_name: '',
          picture: '',
          interests: [],
          mutedKeywords: [],
          followedPubkeys: [],
        }
      }),
    }),
    {
      name: "tellit-onboarding",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
