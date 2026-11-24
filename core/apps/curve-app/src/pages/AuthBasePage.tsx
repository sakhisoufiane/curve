import { useBrandingManager } from '@/hooks/branding/useBrandingManager';

export const AuthBasePage = ({ children }: { children: React.ReactNode }) => {
  const { currentBranding } = useBrandingManager();

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 items-center">
        <img src={currentBranding.darkLogo} alt="Logo" className="h-16 w-auto" />
        {children}
      </div>
    </div>
  );
};
