module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // tsconfig.json 의 paths(`@/* → ./src/*`) 를 metro/jest 에서도 해석 가능하게.
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
      },
    ],
  ],
};
