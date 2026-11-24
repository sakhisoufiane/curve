import { useEffect, useMemo } from 'react';
import { useGetWhiteLabelData } from './useGetWhiteLabelData';
import { isWhiteLabelledDomain } from '../../api/authenticate';
import { useShallow } from 'zustand/react/shallow';
import { useClientStore } from '../../stores/client.store';

export interface WhiteLabelConfig {
  darkLogo: string;
  lightLogo: string;
  favicon: string;
  pageTitle: string;
}

const updateFavicon = (iconUrl: string) => {
  document.querySelectorAll("link[rel*='icon']").forEach((link) => link.remove());
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/x-icon';
  link.href = iconUrl;
  document.head.appendChild(link);
};

const DEFAULT_WHITE_LABEL_CONFIG: WhiteLabelConfig = {
  darkLogo: '/images/Logo-Default.png',
  lightLogo: '/images/Logo-Light.png',
  favicon: '/images/favicon.ico',
  pageTitle: 'Curve',
};

export const useBrandingManager = () => {
  // Use Zustand selectors to prevent unnecessary re-renders
  const { darkLogo, lightLogo } = useClientStore(
    useShallow((state) => ({
      darkLogo: state.darkLogo,
      lightLogo: state.lightLogo,
    }))
  );
  const { data: whiteLabelData, isLoading } = useGetWhiteLabelData();

  const currentBranding = useMemo(() => {
    let logos: WhiteLabelConfig = { ...DEFAULT_WHITE_LABEL_CONFIG };

    if (whiteLabelData && isWhiteLabelledDomain(whiteLabelData)) {
      logos = {
        darkLogo: whiteLabelData.darkLogo ?? logos.darkLogo,
        lightLogo: whiteLabelData.lightLogo ?? logos.lightLogo,
        favicon: whiteLabelData.favicon ?? logos.favicon,
        pageTitle: whiteLabelData.pageTitle ?? logos.pageTitle,
      };
    }
    if (darkLogo || lightLogo) {
      logos = {
        ...logos,
        darkLogo: darkLogo ?? logos.darkLogo,
        lightLogo: lightLogo ?? logos.lightLogo,
      };
    }

    return logos;
  }, [darkLogo, lightLogo, whiteLabelData]);

  useEffect(() => {
    if (currentBranding.favicon) {
      updateFavicon(currentBranding.favicon);
    }
  }, [currentBranding.favicon]);

  return { currentBranding, isLoading };
};
