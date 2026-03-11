module.exports = {
  include: ['src/**/*.tsx', '**/*.tsx'],
  rules: {
    elements: {
      button: { use: 'Button', from: '@/components/ui/button' },
      input: { use: 'Input', from: '@/components/ui/input' },
      a: { use: 'Link', from: '@/components/ui/link' },
    },
    tokens: {
      '#63g5fh': 'text-secondary',
      '#ffffff': 'bg-background',
    }
  }
};