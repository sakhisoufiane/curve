import { Card, CardContent, CardHeader, CardTitle } from '@curveroyaltysystems/react-ui-library';
import { Logout } from '../../components/AppLayout/Header/Logout';
import LogoLight from '@/components/Branding/LogoLight';

export const MaintenanceSplashPage = () => {
  return (
    <div className="w-screen h-screen p-8 flex items-center justify-center bg-[var(--color-curve-master-lightest)]">
      <div className="flex flex-col items-center justify-center space-y-8 max-w-4xl">
        <LogoLight />
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-foreground mb-4">
              Curve is currently offline for essential maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-lg text-foreground">
              Please accept our apologies for any inconvenience, we're carrying out some essential maintenance - normal
              service will be resumed as soon as possible.
            </p>
            <p className="text-lg text-foreground">
              If you have made changes which have not yet been saved, please wait for the app to come back online and
              your work will not be lost. As long as you do not refresh or leave this page, the app will come back
              online automatically without requiring any action.
            </p>
          </CardContent>
        </Card>
        <Logout size={16} />
      </div>
    </div>
  );
};
