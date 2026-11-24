import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Button } from '../components/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/card';
import { Input } from '../components/input';
import { Badge } from '../components/badge';
import { Separator } from '../components/separator';

type ThemeArgs = { radius: string };

const meta: Meta<ThemeArgs> = {
  title: 'Examples/Theme Showcase',
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    radius: {
      name: 'Border radius',
      description: 'Base radius value (--radius). All components scale relative to this.',
      control: { type: 'select' },
      options: ['0rem', '0.25rem', '0.375rem', '0.5rem', '0.625rem', '0.75rem', '1rem', '1.5rem', '9999px'],
    },
  },
  args: {
    radius: '0.625rem',
  },
};

export default meta;
type Story = StoryObj<ThemeArgs>;

export const ComponentShowcase: Story = {
  render: ({ radius }) => (
    <div style={{ '--radius': radius } as React.CSSProperties} className="space-y-8 max-w-4xl mx-auto p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Theme Showcase</h1>
        <p className="text-muted-foreground">
          Use the theme toggle in the toolbar to switch between light and dark modes. Use the{' '}
          <strong>Border radius</strong> control below to preview different corner radii.
        </p>
      </div>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Elements</h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input id="name" placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Welcome</CardTitle>
              <CardDescription>Get started with your account</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card demonstrates the theme-aware styling with proper contrast in both light and dark modes.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Get Started</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>You have 3 unread messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">New message</span>
                <Badge variant="secondary">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Updates</span>
                <Badge variant="secondary">1</Badge>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View All
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  ),
};
