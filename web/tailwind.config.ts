import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimp: {
          50: '#fff7f0',
          100: '#ffe4cc',
          300: '#ffab66',
          500: '#ff7a1f',
          700: '#c24a00',
          900: '#6b2a00',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
