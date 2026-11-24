import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { EditableList } from '../custom-components/EditableList';

const meta = {
  title: 'Forms/EditableList',
  component: EditableList,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text', description: 'Section heading displayed above the list.' },
    description: { control: 'text', description: 'Helper text shown below the title.' },
    itemLabel: {
      control: 'text',
      description: 'Label used in the add button and input placeholder.',
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder. Defaults to "Enter {itemLabel} name".',
    },
    disabled: { control: 'boolean', description: 'Disables all interactions.' },
  },
} satisfies Meta<typeof EditableList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Half-width wrapper to better simulate the component in real page context
function StoryContainer({ children }: { children: React.ReactNode }) {
  return <div className="w-[480px]">{children}</div>;
}

// Wrapper to provide controlled state for stories
function Controlled(props: React.ComponentProps<typeof EditableList>) {
  const [value, setValue] = useState<string[]>(props.value ?? []);
  return (
    <StoryContainer>
      <EditableList {...props} value={value} onChange={setValue} />
    </StoryContainer>
  );
}

export const Default: Story = {
  args: {
    title: 'Aliases',
    description:
      "Set any mappings from outside of societies, such as a sub-publisher's own identifiers, which will be used to map income against the work.",
    itemLabel: 'Alias',
  },
  render: (args) => <Controlled {...args} value={[]} />,
};

export const WithPreloadedItems: Story = {
  args: {
    title: 'Aliases',
    description:
      "Set any mappings from outside of societies, such as a sub-publisher's own identifiers, which will be used to map income against the work.",
    itemLabel: 'Alias',
  },
  render: (args) => (
    <Controlled {...args} value={['BMI-12345678', 'ASCAP-9876', 'SESAC-000042']} />
  ),
};

export const CustomLabel: Story = {
  args: {
    title: 'Identifiers',
    description: 'Add any external identifiers associated with this record.',
    itemLabel: 'Identifier',
  },
  render: (args) => <Controlled {...args} value={['ID-001']} />,
};

export const NoDescription: Story = {
  args: {
    title: 'Tags',
    itemLabel: 'Tag',
  },
  render: (args) => <Controlled {...args} value={[]} />,
};

export const Disabled: Story = {
  args: {
    title: 'Aliases',
    description: 'These aliases are read-only in this context.',
    itemLabel: 'Alias',
    disabled: true,
  },
  render: (args) => <Controlled {...args} value={['BMI-12345678', 'ASCAP-9876']} />,
};
