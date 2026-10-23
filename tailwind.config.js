/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Ant Design (admin) có reset riêng; tắt preflight để hai bộ style không đè nhau.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2474E5', dark: '#1B5BB8', light: '#E8F1FD' },
        cta: { DEFAULT: '#FFC700', dark: '#E6B300' },
        success: '#27AE60',
        danger: '#EB5757',
        bg: '#F2F4F7',
        ink: '#141414',
        muted: '#707070',
        line: '#E0E0E0',
      },
      fontFamily: { sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '8px', input: '6px' },
    },
  },
  plugins: [],
};
