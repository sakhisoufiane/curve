import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { TerritoriesPicker, TerritoriesPickerSkeleton } from '../custom-components/TerritoriesPicker';

const meta: Meta<typeof TerritoriesPicker> = {
  title: 'Custom/TerritoriesPicker',
  component: TerritoriesPicker,
  parameters: { layout: 'padded' },
  args: {
    cisacOnly: false,
    disabled: false,
  },
};

export default meta;
type Story = StoryObj<typeof TerritoriesPicker>;

function Controlled(props: Omit<React.ComponentProps<typeof TerritoriesPicker>, 'value' | 'onChange'>) {
  const [value, setValue] = React.useState<string[]>([]);
  return <TerritoriesPicker {...props} value={value} onChange={setValue} />;
}

function ControlledWith(
  initial: string[],
  props?: Omit<React.ComponentProps<typeof TerritoriesPicker>, 'value' | 'onChange'>,
) {
  return function Story() {
    const [value, setValue] = React.useState<string[]>(initial);
    return <TerritoriesPicker {...props} value={value} onChange={setValue} />;
  };
}

export const Empty: Story = {
  render: () => <Controlled />,
};

export const WithSelections: Story = {
  name: 'With selections',
  render: ControlledWith(['GB', 'US', 'CA', 'AU', 'NZ', 'NL', 'DE', 'FR', 'SE', 'NO', 'DK']),
};

export const CisacOnly: Story = {
  name: 'CISAC only',
  render: () => <Controlled cisacOnly />,
};

export const ReadOnly: Story = {
  name: 'Read-only',
  render: ControlledWith(['GB', 'US', 'CA', 'AU', 'NZ', 'DE', 'FR', 'SE', 'NO', 'JP', 'SG', 'ZA'], {
    disabled: true,
  }),
};

export const Loading: Story = {
  name: 'Loading skeleton',
  render: () => <TerritoriesPickerSkeleton />,
};

export const EuropeSelected: Story = {
  name: 'Europe selected',
  render: ControlledWith([
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE',
    'GR', 'VA', 'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL',
    'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB',
  ]),
};
