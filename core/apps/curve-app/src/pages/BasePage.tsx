import React from 'react';
import { Flex } from '@curveroyaltysystems/react-ui-library';

interface BasePageProps {
  children: React.JSX.Element | React.JSX.Element[];
  showCard?: boolean;
  breadcrumbItems?: CurveBreadcrumbItem[];
}

interface CurveBreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

export const BasePage: React.FC<BasePageProps> = ({ children }) => {
  return (
    <Flex direction="col" className="min-h-screen bg-background w-full max-w-6xl mx-auto py-4 px-6 sm:py-6 sm:px-8 md:px-16 lg:px-30">
      {children}
    </Flex>
  );
};
