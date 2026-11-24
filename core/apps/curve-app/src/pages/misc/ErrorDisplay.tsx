import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Badge,
  Flex,
} from '@curveroyaltysystems/react-ui-library';
import { Icon } from '@curveroyaltysystems/react-ui-library';
import type { ErrorInfo } from 'react';
import LogoLight from '@/components/Branding/LogoLight';
import { AppRoutes } from '@/routing/routes';

interface ErrorDisplayProps {
  error?: Error;
  errorInfo?: ErrorInfo;
}

export function ErrorDisplay({ error, errorInfo }: ErrorDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Flex
      direction="col"
      align="center"
      justify="center"
      className="w-screen h-screen p-8 bg-gradient-to-br from-muted to-background"
    >
      <Flex direction="col" align="center" justify="center" gap="xl" className="max-w-2xl w-full">
        {/* Curve Logo */}
        <Flex align="center" justify="center" className="mb-4">
          <LogoLight />
        </Flex>

        {/* Error Card */}
        <Card className="w-full shadow-lg">
          <CardHeader className="text-center pb-4">
            <Flex align="center" justify="center" className="mb-4">
              <div className="rounded-full bg-[var(--color-curve-danger)]/10 p-3">
                <Icon.AlertCircle className="h-12 w-12 text-[var(--color-curve-danger)]" />
              </div>
            </Flex>
            <CardTitle className="text-3xl font-bold text-foreground mb-2">We've encountered an error</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-lg text-muted-foreground">
              Something went wrong while loading this page. Please try refreshing or return to the home page.
            </p>

            <Flex direction="col" align="center" justify="center" gap="md" responsive="mobile-stack">
              <Button onClick={() => (window.location.href = AppRoutes.Dashboard)} variant="default" className="min-w-[160px]">
                <Icon.Home className="h-4 w-4" />
                Return to Home
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="min-w-[160px]">
                Refresh Page
              </Button>
            </Flex>

            {/* Error Details Toggle */}
            {(error || errorInfo) && (
              <Collapsible
                open={isOpen}
                onOpenChange={setIsOpen}
                className="pt-4 border-t border-border group/collapsible"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <Icon.ChevronDown className="mr-2 h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                    {isOpen ? 'Hide Error Details' : 'Show Error Details'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="bg-muted rounded-lg p-4 border border-border max-h-96 overflow-auto space-y-4">
                    {error && (
                      <div>
                        <Flex align="center" gap="sm" className="mb-2">
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                          <p className="text-sm font-semibold text-foreground">Error Message:</p>
                        </Flex>
                        <pre className="text-xs font-mono text-[var(--color-curve-danger)] whitespace-pre-wrap break-words bg-card p-3 rounded border border-[var(--color-curve-danger)]/20">
                          {error.toString()}
                        </pre>
                      </div>
                    )}
                    {errorInfo && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-foreground">Stack Trace:</p>
                        <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words bg-card p-3 rounded border border-border">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          If this problem persists, please contact support for assistance.
        </p>
      </Flex>
    </Flex>
  );
}
