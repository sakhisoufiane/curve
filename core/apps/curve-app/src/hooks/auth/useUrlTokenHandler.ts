import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCookies } from 'react-cookie';
import { CurveCookies } from '@/constants/cookies';
import { AppRoutes } from '@/routing/routes';
import { getAuthCookieOptions } from '@/utils/cookieOptions';

interface UseUrlTokenHandlerReturn {
  isProcessingToken: boolean;
}

/**
 * Custom hook to handle token extraction from URL parameters
 */
export const useUrlTokenHandler = (): UseUrlTokenHandlerReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [, setCookie] = useCookies([CurveCookies.AuthToken]);
  const [isProcessingToken, setIsProcessingToken] = useState(false);

  useEffect(() => {
    const curveToken = searchParams.get(CurveCookies.AuthToken);

    if (curveToken) {
      setIsProcessingToken(true);

      try {
        setCookie(CurveCookies.AuthToken, curveToken, getAuthCookieOptions());

        navigate(AppRoutes.Dashboard, { replace: true });
      } catch (error) {
        console.error('Error processing token from URL:', error);
        setIsProcessingToken(false);
      }
    }
  }, [searchParams, setCookie, navigate, setSearchParams]);

  return {
    isProcessingToken,
  };
};
