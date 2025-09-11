/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 또는 'media'
  content: [
    './templates/**/*.html', // frontend/templates/ 아래의 모든 html
    '../accounts/templates/**/*.html',
    './static/frontend/js/**/*.js', // JS에서 동적으로 클래스 생성 시 필요
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

