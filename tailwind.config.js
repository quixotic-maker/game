/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDF9F3',
          100: '#F5EFE8',
          200: '#EDE3D5',
        },
        plum: {
          500: '#E6336B',
          600: '#C72859',
          700: '#A61D47',
        },
        grape: {
          800: '#2A1B3D',
          900: '#1F142E',
        },
        sunny: '#FFD84D',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(31, 20, 46, 0.08)',
        pop: '0 12px 32px rgba(230, 51, 107, 0.18)',
      },
    },
  },
  plugins: [],
};
