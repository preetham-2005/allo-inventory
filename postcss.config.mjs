const config = {
  plugins: {
    "@tailwindcss/postcss": {
      content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}",
      ],
      darkMode: 'selector',
      theme: {
        extend: {},
      },
    },
  },
};

export default config;
